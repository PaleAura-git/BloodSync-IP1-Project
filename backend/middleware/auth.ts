import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/User';

/**
 * Extends Express's `Request` with the authenticated user record.
 *
 * `user` is typed as optional because the field is only populated after the
 * `protect` middleware runs. Controllers that sit behind `protect` can safely
 * use `req.user!` (non-null assertion) — if `protect` passed, the user exists.
 */
export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * JWT Bearer authentication middleware.
 *
 * Validates the `Authorization: Bearer <token>` header, verifies the token
 * against `JWT_SECRET`, and loads the full user document from the database.
 * The user is attached to `req.user` for downstream middleware and controllers.
 *
 * Responds with 401 and does NOT call `next()` in any failure case, which
 * prevents unauthenticated requests from reaching protected route handlers.
 *
 * ## Failure reasons and messages
 * | Reason                           | Response message                        |
 * |----------------------------------|-----------------------------------------|
 * | No Authorization header          | "No token provided"                     |
 * | Header not in `Bearer …` format  | "No token provided"                     |
 * | Token signature invalid          | "Invalid authentication token"          |
 * | Token past expiry (`exp` claim)  | "Token has expired, please log in again"|
 * | User ID in token not in database | "User account not found"                |
 *
 * @param req - Incoming request; must carry `Authorization: Bearer <jwt>`.
 * @param res - Express response (used only on failure).
 * @param next - Called on success with the user attached to `req.user`.
 */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Reject early if the header is missing or not in "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(
      `[WARN] ${new Date().toISOString()} Unauthenticated request — ${req.method} ${req.path}`
    );
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Always fetch the user from the database rather than trusting only the
    // JWT payload — ensures deactivated accounts are denied immediately
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      // Token was valid but the account was deleted after it was issued
      res.status(401).json({ success: false, message: 'User account not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    // Distinguish expired tokens from tampered/malformed ones so clients can
    // take the right action (silent refresh vs. full re-authentication)
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token has expired, please log in again',
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }
  }
};
