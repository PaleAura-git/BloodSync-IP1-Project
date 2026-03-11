import { IDonor } from '../models/Donor';
import { SearchCriteria } from '../types/matching';
import { isUniversalDonor } from './bloodCompatibility';

const COOLDOWN_DAYS = 56;

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
  score += donor.eligibilityScore / 10;

  // 5. Universal donor bonus for urgent requests
  if (criteria.urgency === 'URGENT' && isUniversalDonor(donor.bloodType)) {
    score += 10;
  }

  return score;
}
