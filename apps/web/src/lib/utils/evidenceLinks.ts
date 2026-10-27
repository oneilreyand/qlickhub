/**
 * Penyedia tautan bukti yang bisa dipratinjau di dalam aplikasi. Cermin aturan backend
 * (`evidenceNormalizer`): hanya penyedia ini yang dihitung sebagai bukti gambar/video.
 */
export function isPreviewableEvidenceUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;
  if (host === 'drive.google.com' || host.endsWith('.drive.google.com')) {
    return /\/file\/d\/[\w-]+/.test(path) || Boolean(parsed.searchParams.get('id'));
  }
  if (host === 'youtu.be') return path.length > 1;
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return (
      (path.startsWith('/watch') && Boolean(parsed.searchParams.get('v'))) ||
      path.startsWith('/embed/') ||
      path.startsWith('/v/')
    );
  }
  if (host === 'loom.com' || host.endsWith('.loom.com')) {
    return /\/(share|embed)\/[a-zA-Z0-9]+/.test(path);
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return /\/\d+/.test(path);
  return false;
}
