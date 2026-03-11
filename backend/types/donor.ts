export type BloodType = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
export type EligibilityStatus = 'ELIGIBLE' | 'TEMPORARILY_BLOCKED' | 'PERMANENTLY_BLOCKED';

export interface CreateDonorRequest {
  fullName: string;
  age: number;
  bloodType: BloodType;
  phone: string;
  email: string;
  neighborhood: string;
  weight: number;
  medicalHistory?: Record<string, unknown>;
}

export interface UpdateDonorRequest {
  fullName?: string;
  phone?: string;
  neighborhood?: string;
  availabilityStatus?: boolean;
}

export interface DonorResponse {
  id: string;
  userId: string;
  fullName: string;
  age: number;
  bloodType: BloodType;
  phone: string;
  email: string;
  neighborhood: string;
  lastDonationDate: Date | null;
  eligibilityStatus: EligibilityStatus;
  eligibilityScore: number;
  availabilityStatus: boolean;
  medicalHistory: Record<string, unknown>;
  blockReason: string | null;
  blockExpiryDate: Date | null;
  isContactVisible: boolean;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}
