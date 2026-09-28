import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiClient,
  getHumanReadableApiErrorMessage,
  getRateLimitInfo,
  RATE_LIMIT_EVENT,
} from '../apiClient';

describe('apiClient error metadata', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps HTTP status and application code while returning safe permission copy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Jejak Delivery access denied' } }),
          {
            status: 403,
            statusText: 'Forbidden',
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    await expect(apiClient('/restricted-delivery-trace')).rejects.toMatchObject({
      message: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('explains bukti QA permanen and deletion blockers without exposing backend detail', () => {
    expect(
      getHumanReadableApiErrorMessage(
        409,
        'CONFLICT',
        'Formal QA evidence is immutable and cannot be deleted. Upload a replacement attachment instead.',
      ),
    ).toMatch(/Bukti QA formal tidak dapat dihapus/i);

    expect(
      getHumanReadableApiErrorMessage(
        409,
        'CONFLICT',
        'Unlink or remove permitted Task records before deletion. Immutable delivery history cannot be deleted.',
      ),
    ).toMatch(/masih memiliki Requirement, dokumen, atau lampiran terkait/i);
  });

  it('does not expose server detail for service failures', () => {
    expect(getHumanReadableApiErrorMessage(500, 'INTERNAL_ERROR', 'database password leaked')).toBe(
      'Terjadi gangguan pada layanan. Coba lagi beberapa saat.',
    );
  });

  it('identifies invalid login credentials instead of calling them an expired session', () => {
    expect(
      getHumanReadableApiErrorMessage(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      ),
    ).toBe('Email atau kata sandi salah. Periksa kembali lalu coba masuk lagi.');
  });

  it('explains Requirement finding scope and triage blockers in natural Indonesian', () => {
    expect(
      getHumanReadableApiErrorMessage(
        409,
        'CONFLICT',
        'A Requirement finding must reference a Requirement linked to this Feature.',
      ),
    ).toMatch(/masih berada dalam cakupan Feature/i);
    expect(
      getHumanReadableApiErrorMessage(
        409,
        'CONFLICT',
        'A current triage decision is required before resolving a Requirement finding.',
      ),
    ).toMatch(/posisi terbaru Product, Development, dan QA/i);
  });

  it('uses the endpoint-specific draft-8 quota when multiple rate limiters add headers', () => {
    const rateLimit = getRateLimitInfo(
      new Headers({
        RateLimit: '"api"; r=99; t=300, "login"; r=0; t=42',
        'RateLimit-Policy': '"api"; q=100; w=300, "login"; q=3; w=300',
        'Retry-After': '42',
      }),
    );

    expect(rateLimit).toMatchObject({ limit: 3, remaining: 0, retryAfterSeconds: 42 });
  });

  it('emits safe quota information when a request is rate limited', async () => {
    const onRateLimit = vi.fn();
    window.addEventListener(RATE_LIMIT_EVENT, onRateLimit);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'RATE_LIMITED' } }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            RateLimit: '"api"; r=0; t=18',
            'RateLimit-Policy': '"api"; q=100; w=300',
            'Retry-After': '18',
          },
        }),
      ),
    );

    await expect(apiClient('/limited')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      rateLimit: { limit: 100, remaining: 0, retryAfterSeconds: 18 },
    });
    expect(onRateLimit).toHaveBeenCalledOnce();
    window.removeEventListener(RATE_LIMIT_EVENT, onRateLimit);
  });
});
