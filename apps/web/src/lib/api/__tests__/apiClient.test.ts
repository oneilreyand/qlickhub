import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../apiClient';

describe('apiClient error metadata', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves HTTP status and application code for permission-aware UI states', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Delivery Trace access denied' } }),
          {
            status: 403,
            statusText: 'Forbidden',
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    await expect(apiClient('/restricted-delivery-trace')).rejects.toMatchObject({
      message: 'Delivery Trace access denied',
      status: 403,
      code: 'FORBIDDEN',
    });
  });
});
