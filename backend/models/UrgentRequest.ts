import mongoose, { Document, Schema, Model } from 'mongoose';
import { UrgencyLevel, UrgentRequestStatus } from '../types/urgentRequest';

export interface IUrgentRequest extends Document {
  hospitalId: mongoose.Types.ObjectId;
  bloodType: string;
  unitsNeeded: number;
  urgencyLevel: UrgencyLevel;
  reason?: string;
  expiresAt: Date;
  status: UrgentRequestStatus;
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

urgentRequestSchema.index({ hospitalId: 1 });
urgentRequestSchema.index({ status: 1 });
urgentRequestSchema.index({ expiresAt: 1 });
urgentRequestSchema.index({ bloodType: 1 });

const UrgentRequest: Model<IUrgentRequest> = mongoose.model<IUrgentRequest>(
  'UrgentRequest',
  urgentRequestSchema
);
export default UrgentRequest;
