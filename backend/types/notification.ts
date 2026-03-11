import { BloodType } from './donor';

export type NotificationType = 'GENERAL' | 'URGENT_REQUEST';

export interface SendNotificationBody {
  donorIds: string[];
  message: string;
  notificationType: NotificationType;
  bloodTypeNeeded?: BloodType;
  unitsNeeded?: number;
}

export interface DeliveryChannel {
  sent: number;
  failed: number;
}

export interface DeliveryStatus {
  email: DeliveryChannel;
  sms: DeliveryChannel;
  inApp: DeliveryChannel;
}
