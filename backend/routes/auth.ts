import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers/authController';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('userType').isIn(['DONOR', 'HOSPITAL']).withMessage('userType must be DONOR or HOSPITAL'),
];

router.post('/register', registerValidation, register);
router.post('/login', login);
router.get('/me', protect, (req, res, next) => getMe(req as AuthRequest, res, next));

export default router;
