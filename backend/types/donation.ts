import { BloodType } from './donor';

export type DonationStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface CreateDonationBody {
  donorId: string;
  donationDate: string;
  bloodType: BloodType;
  unitsDonated?: number;
  notificationId?: string;
  notes?: string;
}

export interface CompleteDonationBody {
  notes?: string;
}
