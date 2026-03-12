import { BloodType } from './donor';

export type UrgencyLevel = 'HIGH' | 'CRITICAL';
export type UrgentRequestStatus = 'ACTIVE' | 'FULFILLED' | 'EXPIRED';

export interface CreateUrgentRequestBody {
  bloodType: BloodType;
  unitsNeeded: number;
  urgencyLevel: UrgencyLevel;
  reason?: string;
}
