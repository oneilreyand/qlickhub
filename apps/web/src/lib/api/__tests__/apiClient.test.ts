import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, getHumanReadableApiErrorMessage } from '../apiClient';

describe('apiClient error metadata', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps HTTP status and application code while returning safe permission copy', async () => {
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
      message: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('explains immutable QA evidence and deletion blockers without exposing backend detail', () => {
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
});
