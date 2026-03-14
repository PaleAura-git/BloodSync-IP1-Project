import { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { questions } from '../config/eligibilityQuiz';
import { calculateEligibility } from '../utils/quizService';
import Donor from '../models/Donor';
import { AuthRequest } from '../middleware/auth';
import { QuizAnswers } from '../types/quiz';

/**
 * GET /api/quiz/questions
 *
 * Returns the list of eligibility screening questions presented to the donor.
 * Scoring metadata (pointsDeduction, blockType, blockDuration, blockReason)
 * is stripped before sending to the client — donors should not be able to
 * see the weight of each answer or game the quiz.
 *
 * @auth None — public endpoint (questions are the same for all donors).
 * @returns 200 `{ success, questions: Array<{ id, question, answerType, options? }> }`
 */
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

/**
 * POST /api/quiz/submit
 *
 * Accepts the donor's answers to all eligibility questions, evaluates them
 * via `calculateEligibility`, and persists the result to their donor profile.
 *
 * All questions must be answered — partial submissions are rejected. This
 * prevents donors from omitting disqualifying answers.
 *
 * @auth Required — Bearer JWT, userType must be DONOR.
 * @body `{ answers: QuizAnswers }` — a map of question ID → boolean answer.
 *   `true` means the condition described by the question applies to the donor.
 * @returns 200 `{ success, result: EligibilityResult }`
 * @returns 400 if validation fails or any question IDs are missing from answers.
 * @returns 404 if the authenticated user has no donor profile yet (must call
 *   POST /api/donors first).
 *
 * Side effects:
 * - Updates `donor.eligibilityStatus`, `eligibilityScore`, `blockReason`,
 *   `blockExpiryDate`, and `medicalHistory` (raw answers stored for audit).
 * - A TEMPORARILY_BLOCKED result will be automatically cleared by the cron
 *   job once `blockExpiryDate` is reached.
 */
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
          // Store raw answers as medicalHistory for auditing and future re-evaluation
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
