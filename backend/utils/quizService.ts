import { questions } from '../config/eligibilityQuiz';
import { QuizAnswers, EligibilityResult } from '../types/quiz';

/**
 * Evaluates a donor's eligibility to donate blood based on their quiz answers
 * and returns a structured result that is persisted to the Donor document.
 *
 * ## Scoring model
 * Every donor starts at 100 points. Each question that triggers a concern
 * (answered `true`) deducts `question.pointsDeduction` from the score. The
 * final score is clamped to a minimum of 0 and stored as `eligibilityScore`
 * on the Donor, where it feeds into the match-scoring algorithm
 * (`eligibilityScore / 10` → up to 10 bonus pts in `calculateMatchScore`).
 *
 * ## Block types and precedence
 * Questions can carry one of three block classifications:
 *
 * - **NONE** — deducts points only; donor remains eligible if no blocking
 *   questions are triggered.
 * - **TEMPORARY** — sets a time-limited deferral. The longest `blockDuration`
 *   (in days) across all triggered temporary questions determines the expiry
 *   date. Examples: recent tattoo (90 days), minor illness (28 days).
 * - **PERMANENT** — irreversible disqualification. Once encountered, it takes
 *   precedence over any temporary blocks. Examples: certain chronic illnesses,
 *   HIV-positive status.
 *
 * Precedence rule: PERMANENT > TEMPORARY > NONE. A permanent block can never
 * be downgraded to temporary even if both are triggered in the same quiz.
 *
 * ## Returned statuses
 * | `status`               | Meaning                                                    |
 * |------------------------|------------------------------------------------------------|
 * | `ELIGIBLE`             | No blocks triggered; donor may be searched and contacted.  |
 * | `TEMPORARILY_BLOCKED`  | Deferred until `expiryDate`; auto-unblocked by cron job.   |
 * | `PERMANENTLY_BLOCKED`  | Never eligible; excluded from all searches.                |
 *
 * @param answers - Map of question IDs to boolean answers from the donor.
 *   A `true` answer means the condition described by the question applies to
 *   the donor (i.e., the "risky" answer that triggers the deduction/block).
 * @returns An `EligibilityResult` containing the resolved status, numeric
 *   score, block type, optional human-readable `blockReason`, and optional
 *   `expiryDate` for temporary deferrals.
 */
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
      // Only capture the first temporary reason; permanent reason takes precedence
      if (!blockReason) blockReason = question.blockReason;
      // Track the longest deferral period across all triggered temporary questions
      const days = question.blockDuration ?? 0;
      if (days > longestBlockDays) longestBlockDays = days;
    }
  }

  // Floor at 0 — negative scores are not meaningful
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
    // Expiry is calculated from "now" using the longest triggered deferral period
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
