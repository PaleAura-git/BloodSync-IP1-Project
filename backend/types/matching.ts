import { BloodType } from './donor';
import { IDonor } from '../models/Donor';

export type { BloodType };

export type Urgency = 'NORMAL' | 'URGENT';

export interface SearchCriteria {
  bloodType: BloodType;
  neighborhood?: string;
  urgency: Urgency;
}

export interface MatchScore {
  donor: IDonor;
  score: number;
}
