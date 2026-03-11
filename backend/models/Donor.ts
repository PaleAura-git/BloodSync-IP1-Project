import mongoose, { Document, Schema, Model } from 'mongoose';
import { BloodType, EligibilityStatus } from '../types/donor';

export interface IDonor extends Document {
  userId: mongoose.Types.ObjectId;
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

const donorSchema = new Schema<IDonor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Donor must be at least 18 years old'],
      max: [65, 'Donor must be 65 years old or younger'],
    },
    bloodType: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: [true, 'Blood type is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
    },
    neighborhood: {
      type: String,
      required: [true, 'Neighborhood is required'],
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    eligibilityStatus: {
      type: String,
      enum: ['ELIGIBLE', 'TEMPORARILY_BLOCKED', 'PERMANENTLY_BLOCKED'],
      default: 'ELIGIBLE',
    },
    eligibilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    availabilityStatus: {
      type: Boolean,
      default: true,
    },
    medicalHistory: {
      type: Schema.Types.Mixed,
      default: {},
    },
    blockReason: {
      type: String,
      default: null,
    },
    blockExpiryDate: {
      type: Date,
      default: null,
    },
    isContactVisible: {
      type: Boolean,
      default: false,
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [50, 'Donor must weigh at least 50 kg'],
    },
  },
  { timestamps: true }
);


donorSchema.index({ bloodType: 1 });
donorSchema.index({ neighborhood: 1 });
donorSchema.index({ eligibilityStatus: 1 });

const Donor: Model<IDonor> = mongoose.model<IDonor>('Donor', donorSchema);
export default Donor;
