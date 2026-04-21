import mongoose, { Document, Schema, Model } from 'mongoose';
import { NotificationType, DeliveryStatus } from '../types/notification';

/**
 * A notification dispatched from a hospital to one or more donors.
 * One document is created per send event, containing the full recipient list
 * and per-channel delivery statistics.
 *
 * Two types exist:
 * - `GENERAL`        — routine outreach (e.g., scheduled blood drive invitation).
 * - `URGENT_REQUEST` — created automatically when a hospital posts an urgent
 *                      request; all compatible donors are included.
 */
export interface INotification extends Document {
  hospitalId: mongoose.Types.ObjectId;
  /** List of donor ObjectIds targeted by this notification. */
  donorIds: mongoose.Types.ObjectId[];
  message: string;
  notificationType: NotificationType;
  /** If set, the specific blood type requested — rendered as a badge in emails. */
  bloodTypeNeeded?: string;
  unitsNeeded?: number;
  /**
   * Read flag for the in-app notification bell. Marked true via PUT
   * /api/notifications/:id/read. Note: this is a single flag shared across all
   * recipients in the current implementation.
   */
  title?: string;
  isRead: boolean;
  sentAt: Date;
  /**
   * Per-channel delivery counters updated at send time.
   * Each channel tracks `sent` (accepted by the delivery service) and
   * `failed` (rejected or errored). SMS is tracked structurally but not
   * currently implemented (always 0/0).
   */
  deliveryStatus: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Sub-schema for a single delivery channel's sent/failed counts. */
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
    title: {
      type: String,
      trim: true,
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

// Compound indexes support the two feed queries: donor inbox and hospital sent-items
notificationSchema.index({ hospitalId: 1, sentAt: -1 });
notificationSchema.index({ donorIds: 1, sentAt: -1 });
notificationSchema.index({ notificationType: 1 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
export default Notification;
