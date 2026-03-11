import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError
        ? 'Not authorized, token expired'
        : 'Not authorized, token invalid';
    res.status(401).json({ success: false, message });
  }
};
