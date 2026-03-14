import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

/**
 * POST /api/auth/register
 *
 * Creates a new user account and returns a JWT for immediate login.
 * No email verification is required — the token is usable right away.
 *
 * @auth None — public endpoint.
 * @body `{ email: string, password: string, userType: 'DONOR' | 'HOSPITAL' }`
 * @returns 201 `{ success, token, user: { id, email, userType, isActive, createdAt } }`
 * @returns 400 if validation fails or the email is already registered.
 *
 * Note: Password is hashed by the User pre-save hook before being stored.
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    const { email, password, userType } = req.body as {
      email: string;
      password: string;
      userType: 'DONOR' | 'HOSPITAL';
    };

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ success: false, message: 'Email already exists' });
      return;
    }

    const user = await User.create({ email, password, userType });
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 *
 * Authenticates a user by email/password and returns a JWT.
 * Both a non-existent email and a wrong password return 401 with the same
 * generic message to prevent user enumeration.
 *
 * @auth None — public endpoint.
 * @body `{ email: string, password: string }`
 * @returns 200 `{ success, token, user: { id, email, userType, isActive, createdAt } }`
 * @returns 400 if email or password is missing from the request body.
 * @returns 401 if credentials are invalid.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = user.generateAuthToken();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's account record. The user object is
 * attached to the request by the `protect` middleware before this handler runs.
 *
 * @auth Required — Bearer JWT (any user type).
 * @returns 200 `{ success, user: IUser }`
 */
export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};
