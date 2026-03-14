import mongoose, { Document, Schema, Model } from 'mongoose';
import { UrgencyLevel, UrgentRequestStatus } from '../types/urgentRequest';

/**
 * Represents a time-sensitive blood request broadcast by a hospital.
 *
 * When created, all compatible eligible donors are notified immediately via
 * email and in-app. The request auto-expires after 24 hours and is cleaned up
 * by the scheduled cron job, which transitions status to EXPIRED.
 */
export interface IUrgentRequest extends Document {
  hospitalId: mongoose.Types.ObjectId;
  /** The blood type the hospital needs. Compatible donor types are resolved at query time. */
  bloodType: string;
  unitsNeeded: number;
  /**
   * Triage classification:
   * - `HIGH`     — needed within hours; serious but not immediately life-threatening.
   * - `CRITICAL` — needed immediately; life-threatening situation.
   *
   * In `getActiveRequests`, CRITICAL sorts before HIGH because "C" < "H"
   * alphabetically and the query uses ascending sort on this field.
   */
  urgencyLevel: UrgencyLevel;
  /** Optional clinical context to include in donor notification emails. */
  reason?: string;
  /**
   * Absolute expiry timestamp. Set to 24 hours from creation time.
   * Requests past this date are excluded from `getActiveRequests` and will
   * be transitioned to EXPIRED by the cron job.
   */
  expiresAt: Date;
  /**
   * Lifecycle status:
   * - `ACTIVE`    — open; visible in the public active requests feed.
   * - `FULFILLED` — hospital received sufficient donations; manually set.
   * - `EXPIRED`   — past `expiresAt`; set by the cron job.
   */
  status: UrgentRequestStatus;
  /** Count of donors notified at creation time. Informational only. */
  notifiedDonorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const urgentRequestSchema = new Schema<IUrgentRequest>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    bloodType: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: [true, 'Blood type is required'],
    },
    unitsNeeded: {
      type: Number,
      required: [true, 'Units needed is required'],
      min: [1, 'At least 1 unit required'],
    },
    urgencyLevel: {
      type: String,
      enum: ['HIGH', 'CRITICAL'],
      required: [true, 'Urgency level is required'],
    },
    reason: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'FULFILLED', 'EXPIRED'],
      default: 'ACTIVE',
    },
    notifiedDonorCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// expiresAt index supports the cron job's expiry sweep and the active-requests filter
urgentRequestSchema.index({ hospitalId: 1 });
urgentRequestSchema.index({ status: 1 });
urgentRequestSchema.index({ expiresAt: 1 });
urgentRequestSchema.index({ bloodType: 1 });

const UrgentRequest: Model<IUrgentRequest> = mongoose.model<IUrgentRequest>(
  'UrgentRequest',
  urgentRequestSchema
);
export default UrgentRequest;
