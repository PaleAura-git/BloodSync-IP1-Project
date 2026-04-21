import client from './client'
import type { BloodType, UrgencyLevel } from '../types'

// Auth
export const authApi = {
  register: (data: {
    email: string
    password: string
    userType: 'DONOR' | 'HOSPITAL'
    fullName?: string
    hospitalName?: string
    phone?: string
    bloodType?: BloodType
    location?: { area: string; address: string }
    lastDonationDate?: string
  }) => client.post('/auth/register', data),

  login: (data: { email: string; password: string; userType: 'DONOR' | 'HOSPITAL' }) =>
    client.post('/auth/login', data),

  me: () => client.get('/auth/me'),
}

// Donors
export const donorApi = {
  createProfile: (data: object) => client.post('/donors', data),
  getProfile: () => client.get('/donors/profile'),
  updateProfile: (data: object) => client.put('/donors/profile', data),
  toggleAvailability: () => client.patch('/donors/availability'),
  getById: (id: string) => client.get(`/donors/${id}`),
}

// Hospitals
export const hospitalApi = {
  createProfile: (data: object) => client.post('/hospitals', data),
  getProfile: () => client.get('/hospitals/profile'),
  updateProfile: (data: object) => client.put('/hospitals/profile', data),
}

// Quiz
export const quizApi = {
  getQuestions: () => client.get('/quiz/questions'),
  submit: (answers: Record<string, string>) => client.post('/quiz/submit', { answers }),
  chat: (messages: Array<{ role: 'user' | 'ai'; content: string; files?: Array<{ mimeType: string; data: string }> }>) =>
    client.post('/quiz/chat', { messages }),
  submitAi: (data: { recommendation: string; reason?: string }) =>
    client.post('/quiz/submit-ai', data),
  uploadDocument: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return client.post('/quiz/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// Search
export const searchApi = {
  searchDonors: (data: { bloodType: BloodType; urgency?: 'URGENT' | 'STANDARD'; neighborhood?: string }) =>
    client.post('/search/donors', { urgency: 'STANDARD', ...data }),
  revealContact: (donorId: string) => client.post(`/search/reveal-contact/${donorId}`),
}

// Donations
export const donationApi = {
  getMyHistory: () => client.get('/donations/my'),
  getHospitalDonations: () => client.get('/donations/hospital'),
  schedule: (data: object) => client.post('/donations', data),
  complete: (id: string, data: object) => client.put(`/donations/${id}/complete`, data),
  cancel: (id: string) => client.put(`/donations/${id}/cancel`),
}

// Urgent Requests
export const urgentRequestApi = {
  getActive: () => client.get('/urgent-requests/active'),
  getHospitalRequests: () => client.get('/urgent-requests/hospital'),
  create: (data: {
    bloodType: BloodType
    unitsNeeded: number
    urgencyLevel: UrgencyLevel
    notes?: string
  }) => client.post('/urgent-requests', data),
  fulfill: (id: string) => client.put(`/urgent-requests/${id}/fulfill`),
  delete: (id: string) => client.delete(`/urgent-requests/${id}`),
}

// Notifications
export const notificationApi = {
  getDonorNotifications: () => client.get('/notifications/donor'),
  getHospitalNotifications: () => client.get('/notifications/hospital'),
  markAsRead: (id: string) => client.put(`/notifications/${id}/read`),
}
