export const ROUTE_CHUNK_RELOAD_COOLDOWN_MS = 30_000;

const ROUTE_CHUNK_RELOAD_KEY_PREFIX = 'qlickhub:route-chunk-reload:';
const routeChunkErrorPatterns = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /unable to preload css for/i,
  /loading chunk .+ failed/i,
  /chunkloaderror/i,
];

export interface RouteChunkRecoveryEnvironment {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  reload: () => void;
  now: () => number;
}

const browserEnvironment = (): RouteChunkRecoveryEnvironment => ({
  storage: window.sessionStorage,
  reload: () => window.location.reload(),
  now: () => Date.now(),
});

const recoveryKey = (routeKey: string) => `${ROUTE_CHUNK_RELOAD_KEY_PREFIX}${routeKey}`;

export const isRouteChunkLoadError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const errorText = `${error.name}: ${error.message}`;
  return routeChunkErrorPatterns.some((pattern) => pattern.test(errorText));
};

export async function loadRouteModuleWithRecovery<T>(
  routeKey: string,
  loadModule: () => Promise<T>,
  environment: RouteChunkRecoveryEnvironment = browserEnvironment(),
): Promise<T> {
  const key = recoveryKey(routeKey);

  try {
    const loadedModule = await loadModule();
    try {
      environment.storage.removeItem(key);
    } catch {
      // Storage may be unavailable in restricted browser contexts. A successful import is enough.
    }
    return loadedModule;
  } catch (error) {
    if (isRouteChunkLoadError(error)) {
      try {
        const now = environment.now();
        const previousAttempt = Number(environment.storage.getItem(key));
        const attemptedRecently =
          Number.isFinite(previousAttempt) &&
          previousAttempt > 0 &&
          now - previousAttempt < ROUTE_CHUNK_RELOAD_COOLDOWN_MS;

        if (!attemptedRecently) {
          environment.storage.setItem(key, String(now));
          environment.reload();
        }
      } catch {
        // Keep the original chunk error when guarded recovery is unavailable.
      }
    }

    throw error;
  }
}
