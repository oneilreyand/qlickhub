import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

/**
 * Test unit tidak boleh menyentuh jaringan sungguhan. Tanpa penjaga ini, `fetch` yang lolos dari
 * mock ke API lokal yang sedang berjalan mendapat 401, lalu `apiClient` mencoba pindah ke /login
 * (tidak didukung jsdom) dan hasil test bergantung pada mesin yang menjalankannya. Test yang
 * memang memakai fetch memasang mock sendiri dan menimpa penjaga ini.
 */
beforeEach(() => {
  if (vi.isMockFunction(globalThis.fetch)) return;
  globalThis.fetch = ((input: RequestInfo | URL) =>
    Promise.reject(
      new TypeError(`fetch tidak di-mock pada test ini: ${String(input)}`),
    )) as typeof fetch;
});
