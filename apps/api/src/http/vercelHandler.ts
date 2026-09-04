import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../app.js';

export const createVercelHandler = () => {
  const app = createApp();
  return (req: IncomingMessage, res: ServerResponse) => {
    // Vercel's /v1/:path* rewrite forwards its capture as query metadata.
    // Remove only an unambiguous matching capture; domain query validation stays strict.
    const url = req.url || '';
    const separator = url.indexOf('?');
    if (separator >= 0 && url.startsWith('/v1/')) {
      const pathname = url.slice(0, separator);
      const query = new URLSearchParams(url.slice(separator + 1));
      const captures = query.getAll('path');
      if (captures.length === 1 && captures[0] === pathname.slice('/v1/'.length)) {
        query.delete('path');
        const remaining = query.toString();
        req.url = pathname + (remaining ? `?${remaining}` : '');
      }
    }
    return app(req, res);
  };
};
