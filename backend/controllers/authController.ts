import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

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
