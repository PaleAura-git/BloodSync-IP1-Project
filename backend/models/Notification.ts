import mongoose, { Document, Schema, Model } from 'mongoose';
import { NotificationType, DeliveryStatus } from '../types/notification';

export interface INotification extends Document {
  hospitalId: mongoose.Types.ObjectId;
  donorIds: mongoose.Types.ObjectId[];
  message: string;
  notificationType: NotificationType;
  bloodTypeNeeded?: string;
  unitsNeeded?: number;
  isRead: boolean;
  sentAt: Date;
  deliveryStatus: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryChannelSchema = new Schema(
  { sent: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
  { _id: false }
);

const notificationSchema = new Schema<INotification>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    donorIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Donor',
      },
    ],
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    notificationType: {
      type: String,
      enum: ['GENERAL', 'URGENT_REQUEST'],
      required: true,
    },
    bloodTypeNeeded: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    },
    unitsNeeded: {
      type: Number,
      min: 1,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveryStatus: {
      email: { type: deliveryChannelSchema, default: () => ({ sent: 0, failed: 0 }) },
      sms:   { type: deliveryChannelSchema, default: () => ({ sent: 0, failed: 0 }) },
      inApp: { type: deliveryChannelSchema, default: () => ({ sent: 0, failed: 0 }) },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ hospitalId: 1, sentAt: -1 });
notificationSchema.index({ donorIds: 1, sentAt: -1 });
notificationSchema.index({ notificationType: 1 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
export default Notification;
