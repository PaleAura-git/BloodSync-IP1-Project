export interface CreateHospitalRequest {
  hospitalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  neighborhood: string;
  operatingHours: string;
  licenseNumber?: string;
}

export interface UpdateHospitalRequest {
  contactPerson?: string;
  phone?: string;
  address?: string;
  operatingHours?: string;
}

export interface HospitalResponse {
  id: string;
  userId: string;
  hospitalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  neighborhood: string;
  operatingHours: string;
  licenseNumber?: string;
  verificationStatus: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicHospitalInfo {
  id: string;
  hospitalName: string;
  address: string;
  neighborhood: string;
  phone: string;
  operatingHours: string;
}
