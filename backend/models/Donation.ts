import mongoose, { Document, Schema, Model } from 'mongoose';
import { DonationStatus } from '../types/donation';

export interface IDonation extends Document {
  donorId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  notificationId?: mongoose.Types.ObjectId;
  donationDate: Date;
  bloodType: string;
  unitsDonated: number;
  status: DonationStatus;
  notes?: string;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<IDonation>(
  {
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
    },
    donationDate: {
      type: Date,
      required: [true, 'Donation date is required'],
    },
    bloodType: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
      required: [true, 'Blood type is required'],
    },
    unitsDonated: {
      type: Number,
      default: 1,
      min: [1, 'At least 1 unit required'],
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
    },
    notes: {
      type: String,
      trim: true,
    },
    confirmedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

donationSchema.index({ donorId: 1, donationDate: -1 });
donationSchema.index({ hospitalId: 1, donationDate: -1 });
donationSchema.index({ status: 1 });

const Donation: Model<IDonation> = mongoose.model<IDonation>('Donation', donationSchema);
export default Donation;
