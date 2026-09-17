import { describe, expect, it, vi } from 'vitest';
import {
  ROUTE_CHUNK_RELOAD_COOLDOWN_MS,
  isRouteChunkLoadError,
  loadRouteModuleWithRecovery,
  type RouteChunkRecoveryEnvironment,
} from '../routeChunkRecovery';

const createEnvironment = (initialAttempt?: number) => {
  const values = new Map<string, string>();
  if (initialAttempt !== undefined) {
    values.set('qlickhub:route-chunk-reload:work-hub', String(initialAttempt));
  }

  const environment: RouteChunkRecoveryEnvironment = {
    storage: {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: vi.fn((key: string) => values.delete(key)),
    },
    reload: vi.fn(),
    now: () => 100_000,
  };

  return { environment, values };
};

describe('routeChunkRecovery', () => {
  it('recognizes browser errors produced by stale dynamic route imports', () => {
    expect(
      isRouteChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://qlickhub.vercel.app/assets/WorkHubPage-old.js',
        ),
      ),
    ).toBe(true);
    expect(isRouteChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(
      isRouteChunkLoadError(
        new TypeError(
          "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of 'text/html'.",
        ),
      ),
    ).toBe(true);
    expect(isRouteChunkLoadError(new Error('Ordinary page render failure'))).toBe(false);
  });

  it('reloads once when a stale route chunk fails and preserves the original rejection', async () => {
    const { environment, values } = createEnvironment();
    const error = new TypeError('Failed to fetch dynamically imported module');

    await expect(
      loadRouteModuleWithRecovery('work-hub', () => Promise.reject(error), environment),
    ).rejects.toBe(error);

    expect(values.get('qlickhub:route-chunk-reload:work-hub')).toBe('100000');
    expect(environment.reload).toHaveBeenCalledTimes(1);
  });

  it('does not enter a reload loop while the previous recovery attempt is still fresh', async () => {
    const { environment } = createEnvironment(100_000 - ROUTE_CHUNK_RELOAD_COOLDOWN_MS + 1);

    await expect(
      loadRouteModuleWithRecovery(
        'work-hub',
        () => Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
        environment,
      ),
    ).rejects.toThrow('Failed to fetch dynamically imported module');

    expect(environment.reload).not.toHaveBeenCalled();
  });

  it('clears the route-specific recovery marker after the chunk loads successfully', async () => {
    const { environment, values } = createEnvironment(99_999);
    const loadedModule = { default: () => null };

    await expect(
      loadRouteModuleWithRecovery('work-hub', () => Promise.resolve(loadedModule), environment),
    ).resolves.toBe(loadedModule);

    expect(values.has('qlickhub:route-chunk-reload:work-hub')).toBe(false);
    expect(environment.reload).not.toHaveBeenCalled();
  });

  it('does not reload for an unrelated render or application error', async () => {
    const { environment, values } = createEnvironment();

    await expect(
      loadRouteModuleWithRecovery(
        'work-hub',
        () => Promise.reject(new Error('Ordinary page render failure')),
        environment,
      ),
    ).rejects.toThrow('Ordinary page render failure');

    expect(values.size).toBe(0);
    expect(environment.reload).not.toHaveBeenCalled();
  });
});
