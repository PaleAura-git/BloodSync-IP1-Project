import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { protect, AuthRequest } from '../middleware/auth';
import { registerValidation, loginValidation } from '../middleware/validators/authValidator';

const router = Router();

// POST /api/auth/register — create account and receive JWT
router.post('/register', registerValidation, register);

// POST /api/auth/login — authenticate and receive JWT
router.post('/login', loginValidation, login);

// GET /api/auth/me — return own account details (auth required)
router.get('/me', protect, (req, res, next) => getMe(req as AuthRequest, res, next));

export default router;
