import { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { questions } from '../config/eligibilityQuiz';
import { calculateEligibility } from '../utils/quizService';
import Donor from '../models/Donor';
import { AuthRequest } from '../middleware/auth';
import { QuizAnswers } from '../types/quiz';

export const getQuestions: RequestHandler = (_req, res) => {
  // Strip scoring fields before sending to client
  const clientQuestions = questions.map(({ id, question, answerType, options }) => ({
    id,
    question,
    answerType,
    ...(options ? { options } : {}),
  }));
  res.json({ success: true, questions: clientQuestions });
};

export const submitQuiz: RequestHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    const authReq = req as AuthRequest;
    const { answers } = req.body as { answers: QuizAnswers };

    // Validate all 15 questions answered
    const missingIds = questions
      .map((q) => q.id)
      .filter((id) => answers[id] === undefined);

    if (missingIds.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing answers for: ${missingIds.join(', ')}`,
      });
      return;
    }

    const result = calculateEligibility(answers);

    const donor = await Donor.findOneAndUpdate(
      { userId: authReq.user!._id },
      {
        $set: {
          eligibilityStatus: result.status,
          eligibilityScore: result.score,
          blockReason: result.blockReason ?? null,
          blockExpiryDate: result.expiryDate ?? null,
          medicalHistory: answers,
        },
      },
      { new: true, runValidators: true }
    );

    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor profile not found. Create a profile first.' });
      return;
    }

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};
