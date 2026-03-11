export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  userType: 'DONOR' | 'HOSPITAL';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    userType: 'DONOR' | 'HOSPITAL';
    isActive: boolean;
    createdAt: Date;
  };
  token: string;
}
