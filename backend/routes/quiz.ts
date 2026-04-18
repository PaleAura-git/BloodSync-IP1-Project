import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { protect, AuthRequest } from '../middleware/auth';
import { getQuestions, submitQuiz } from '../controllers/quizController';
import { chatWithGemini, submitAiResult } from '../controllers/quizChatController';
import { upload, uploadDocument } from '../controllers/quizUploadController';

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

// POST /api/quiz/submit — DONOR only, evaluates and updates eligibility (original)
router.post('/submit', protect, requireDonor, submitValidation, submitQuiz);

// POST /api/quiz/chat — DONOR only, proxy to Gemini for AI screening
router.post('/chat', protect, requireDonor, chatWithGemini);

// POST /api/quiz/submit-ai — DONOR only, save AI recommendation to donor profile
router.post('/submit-ai', protect, requireDonor, submitAiResult);

// POST /api/quiz/upload — DONOR only, upload medical document (PDF/image)
router.post('/upload', protect, requireDonor, upload.single('file'), uploadDocument);

export default router;
