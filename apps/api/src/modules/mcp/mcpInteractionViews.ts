/** SPIKE: minimal server-rendered pages for the OAuth interaction (no inline script). */
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function page(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    title,
  )}</title></head><body style="font-family:Inter,system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#141413">${body}</body></html>`;
}

export function loginPage(uid: string, clientName: string, error?: string): string {
  return page(
    'Masuk ke Qlick Hub',
    `<h1>Masuk ke Qlick Hub</h1>
<p><strong>${escapeHtml(clientName)}</strong> ingin terhubung ke akun Qlick Hub Anda.</p>
${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}
<form method="post" action="/oauth/interaction/${escapeHtml(uid)}/login">
<p><label>Email<br><input name="email" type="email" autocomplete="username" required></label></p>
<p><label>Password<br><input name="password" type="password" autocomplete="current-password" required></label></p>
<p><button type="submit">Masuk</button></p></form>
<form method="post" action="/oauth/interaction/${escapeHtml(uid)}/abort"><button type="submit">Batal</button></form>`,
  );
}

export function continueAsPage(uid: string, clientName: string, userName: string): string {
  return page(
    'Lanjut ke Qlick Hub',
    `<h1>Lanjut sebagai ${escapeHtml(userName)}?</h1>
<p><strong>${escapeHtml(clientName)}</strong> ingin terhubung ke akun Qlick Hub Anda.</p>
<form method="post" action="/oauth/interaction/${escapeHtml(uid)}/continue"><button type="submit">Lanjut</button></form>
<form method="post" action="/oauth/interaction/${escapeHtml(uid)}/abort"><button type="submit">Batal</button></form>`,
  );
}

export function consentPage(uid: string, clientName: string, userName: string): string {
  return page(
    'Izinkan akses',
    `<h1>Izinkan ${escapeHtml(clientName)}?</h1>
<p>Agent ini akan bertindak sebagai <strong>${escapeHtml(userName)}</strong> di Qlick Hub, dengan hak yang sama seperti role Anda di setiap Workspace.</p>
<p>Anda dapat mencabut akses ini kapan saja.</p>
<form method="post" action="/oauth/interaction/${escapeHtml(uid)}/confirm"><button type="submit">Izinkan</button></form>
<form method="post" action="/oauth/interaction/${escapeHtml(uid)}/abort"><button type="submit">Tolak</button></form>`,
  );
}
