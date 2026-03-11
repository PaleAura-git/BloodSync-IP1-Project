import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { protect, AuthRequest } from '../middleware/auth';
import { getQuestions, submitQuiz } from '../controllers/quizController';

const router = Router();

const requireDonor = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'DONOR') {
    res.status(403).json({ success: false, message: 'Access restricted to donors only' });
    return;
  }
  next();
};

const submitValidation = [
  body('answers').isObject().withMessage('answers must be an object'),
];

// GET /api/quiz/questions — public, returns question list (no scoring info)
router.get('/questions', getQuestions);

// POST /api/quiz/submit — DONOR only, evaluates and updates eligibility
router.post('/submit', protect, requireDonor, submitValidation, submitQuiz);

export default router;
