import { IDonor } from '../models/Donor';
import { SearchCriteria } from '../types/matching';
import { isUniversalDonor } from './bloodCompatibility';

/**
 * Minimum days between whole-blood donations per international guidelines
 * (WHO / AABB standard). Donors who donated within this window are filtered
 * out upstream before scoring, so they never receive recency points.
 */
const COOLDOWN_DAYS = 56;

/**
 * Scores a single donor against a search request and returns a numeric value
 * used to rank results. Higher scores surface donors who are the best fit for
 * the specific transfusion need.
 *
 * ## Scoring breakdown (100 pts max, plus a potential 10-pt bonus)
 *
 * | Category              | Max pts | Rationale                                      |
 * |-----------------------|---------|------------------------------------------------|
 * | Blood type match      | 40      | Exact match is safest; compatible-but-not-exact still usable |
 * | Geographic proximity  | 30      | Same neighborhood = faster logistics, critical in emergencies |
 * | Donation recency      | 20      | Recently eligible donors are healthier/more motivated |
 * | Eligibility score     | 10      | Higher quiz score indicates fewer medical risk factors |
 * | Universal donor bonus | +10     | O- donors are prioritised for URGENT requests  |
 *
 * ### Blood type (40 pts)
 * - 40 pts: donor's type exactly matches the requested type (ideal compatibility)
 * - 20 pts: donor's type is compatible but not an exact match (safe, but less preferred)
 *
 * ### Geographic proximity (30 pts)
 * - 30 pts: donor is in the same neighborhood as the requesting hospital
 * - 10 pts: different neighborhood (still contactable, lower logistical priority)
 *
 * ### Donation recency (20 pts)
 * Rewards donors who are freshly eligible but not over-solicited:
 * - 20 pts: first-time donor (no prior donation on record — highest priority)
 * - 15 pts: 56–179 days since last donation (recently cleared cooldown)
 * - 10 pts: 180–364 days (moderately recent)
 * -  5 pts: 365+ days (long-lapsed donor)
 * -  0 pts: within 56-day cooldown (filtered out before reaching this function)
 *
 * ### Eligibility score bonus (10 pts max)
 * `donor.eligibilityScore` ranges 0–100; dividing by 10 maps it to 0–10 pts.
 * A donor who answered all quiz questions favourably scores the full 10 pts.
 *
 * ### Universal donor bonus (+10 pts)
 * Applied only when `criteria.urgency === 'URGENT'` and the donor is O-.
 * In time-critical situations O- blood can be transfused without cross-matching,
 * making these donors disproportionately valuable.
 *
 * @param donor - The donor document to score.
 * @param criteria - The search parameters from the hospital's request, including
 *   requested blood type, optional neighborhood, and urgency level.
 * @returns A numeric match score. Used to sort donors descending before the
 *   results are returned to the caller.
 */
export function calculateMatchScore(donor: IDonor, criteria: SearchCriteria): number {
  let score = 0;

  // 1. Blood type match (40 pts)
  if (donor.bloodType === criteria.bloodType) {
    score += 40;
  } else {
    score += 20; // compatible but not perfect
  }

  // 2. Geographic proximity (30 pts)
  if (criteria.neighborhood && donor.neighborhood === criteria.neighborhood) {
    score += 30;
  } else {
    score += 10;
  }

  // 3. Donation recency (20 pts)
  if (!donor.lastDonationDate) {
    score += 20;
  } else {
    const now = Date.now();
    const daysSince = (now - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince >= COOLDOWN_DAYS && daysSince < 180) {
      score += 15;
    } else if (daysSince >= 180 && daysSince < 365) {
      score += 10;
    } else if (daysSince >= 365) {
      score += 5;
    }
    // < COOLDOWN_DAYS: 0 pts (in cooldown — filtered out upstream)
  }

  // 4. Eligibility score bonus (10 pts max)
  // eligibilityScore is 0–100; dividing by 10 scales it to 0–10 pts
  score += donor.eligibilityScore / 10;

  // 5. Universal donor bonus for urgent requests
  // O- can be transfused without pre-screening — more valuable under time pressure
  if (criteria.urgency === 'URGENT' && isUniversalDonor(donor.bloodType)) {
    score += 10;
  }

  return score;
}
