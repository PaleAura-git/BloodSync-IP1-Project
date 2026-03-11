import { questions } from '../config/eligibilityQuiz';
import { QuizAnswers, EligibilityResult } from '../types/quiz';

export function calculateEligibility(answers: QuizAnswers): EligibilityResult {
  let score = 100;
  let highestBlockType: 'NONE' | 'TEMPORARY' | 'PERMANENT' = 'NONE';
  let blockReason: string | undefined;
  let longestBlockDays = 0;

  for (const question of questions) {
    const answer = answers[question.id];

    // A "yes" (true) answer triggers the block/deduction
    if (answer !== true) continue;

    score -= question.pointsDeduction;

    if (question.blockType === 'PERMANENT') {
      highestBlockType = 'PERMANENT';
      blockReason = question.blockReason;
    } else if (question.blockType === 'TEMPORARY' && highestBlockType !== 'PERMANENT') {
      highestBlockType = 'TEMPORARY';
      if (!blockReason) blockReason = question.blockReason;
      const days = question.blockDuration ?? 0;
      if (days > longestBlockDays) longestBlockDays = days;
    }
  }

  score = Math.max(0, score);

  if (highestBlockType === 'PERMANENT') {
    return {
      status: 'PERMANENTLY_BLOCKED',
      score,
      blockType: 'PERMANENT',
      blockReason,
    };
  }

  if (highestBlockType === 'TEMPORARY') {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + longestBlockDays);
    return {
      status: 'TEMPORARILY_BLOCKED',
      score,
      blockType: 'TEMPORARY',
      blockReason,
      expiryDate,
    };
  }

  return {
    status: 'ELIGIBLE',
    score,
    blockType: 'NONE',
  };
}
