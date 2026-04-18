export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type UserType = 'DONOR' | 'HOSPITAL'
export type UrgencyLevel = 'normal' | 'urgent' | 'critical'
export type DonationStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type RequestStatus = 'open' | 'fulfilled' | 'expired' | 'cancelled'
export type NotificationType = 'urgent_request' | 'donation_confirmed' | 'cooldown_expired' | 'eligibility_changed' | 'general'

export interface User {
  _id: string
  email: string
  userType: UserType
  createdAt: string
}

export interface DonorProfile {
  _id: string
  user: string | User
  fullName: string
  phone: string
  bloodType: BloodType
  dateOfBirth?: string
  lastDonationDate?: string
  location: {
    area: string
    address: string
  }
  isAvailable: boolean
  isEligible: boolean
  eligibilityReason?: string
  cooldownUntil?: string
  totalDonations: number
  quizCompleted: boolean
}

export interface HospitalProfile {
  _id: string
  user: string | User
  hospitalName: string
  phone: string
  location: {
    area: string
    address: string
  }
  operatingHours?: string
  isVerified: boolean
}

export interface UrgentRequest {
  _id: string
  hospital: string | HospitalProfile
  bloodType: BloodType
  unitsNeeded: number
  urgencyLevel: UrgencyLevel
  notes?: string
  status: RequestStatus
  respondedDonors?: string[]
  createdAt: string
  updatedAt: string
}

export interface Donation {
  _id: string
  donor: string | DonorProfile
  hospital: string | HospitalProfile
  bloodType: BloodType
  units: number
  status: DonationStatus
  scheduledDate: string
  completedDate?: string
  notes?: string
  createdAt: string
}

export interface Notification {
  _id: string
  recipient: string
  recipientType: UserType
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  relatedRequest?: string
  createdAt: string
}

export interface QuizQuestion {
  id: string
  question: string
  type: 'yes_no' | 'multiple_choice' | 'select'
  options?: string[]
}

export interface SearchResult {
  donor: DonorProfile
  matchScore: number
  distance?: number
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
}
