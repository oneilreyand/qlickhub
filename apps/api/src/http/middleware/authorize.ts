import type { Response, NextFunction, RequestHandler } from 'express';
import type { AuthenticatedRequest } from './authenticate.js';

/**
 * Returns middleware that allows only users whose `role` is in `allowedRoles`.
 * Must be placed AFTER the `authenticate` middleware.
 *
 * @example
 * router.post('/admin-action', authenticate, authorize('admin', 'owner'), handler);
 */
export function authorize(...allowedRoles: string[]): RequestHandler {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Forbidden',
        status: 403,
        detail: `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
        code: 'FORBIDDEN',
      });
      return;
    }
    next();
  };
}
