import mongoose, { Document, Schema, Model } from 'mongoose';
import { DonationStatus } from '../types/donation';

/**
 * Records a single blood donation event from scheduling through completion.
 *
 * Lifecycle: SCHEDULED → COMPLETED (via completeDonation)
 *                      → CANCELLED (via cancelDonation, by hospital or donor)
 *
 * Only COMPLETED donations trigger an update to `donor.lastDonationDate`,
 * which starts the 56-day cooldown. CANCELLED donations have no impact on
 * the donor's eligibility or match score.
 */
export interface IDonation extends Document {
  donorId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  /**
   * Optional link to the Notification that prompted this donation. Enables
   * hospitals to trace which outreach campaign led to a given donation.
   */
  notificationId?: mongoose.Types.ObjectId;
  /** The date the donation is scheduled for (or occurred on if completed). */
  donationDate: Date;
  bloodType: string;
  /** Number of units collected. Defaults to 1 (a standard whole-blood donation). */
  unitsDonated: number;
  /**
   * Donation lifecycle state:
   * - `SCHEDULED`  — appointment booked; donor has not yet donated.
   * - `COMPLETED`  — donation confirmed; triggers cooldown on the donor record.
   * - `CANCELLED`  — cancelled by the hospital or donor before completion.
   */
  status: DonationStatus;
  notes?: string;
  /** Timestamp set when the hospital calls completeDonation. */
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

// Compound indexes for the two primary query patterns: donor history and hospital dashboard
donationSchema.index({ donorId: 1, donationDate: -1 });
donationSchema.index({ hospitalId: 1, donationDate: -1 });
donationSchema.index({ status: 1 });

const Donation: Model<IDonation> = mongoose.model<IDonation>('Donation', donationSchema);
export default Donation;
