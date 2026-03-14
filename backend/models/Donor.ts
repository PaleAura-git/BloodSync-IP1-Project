import mongoose, { Document, Schema, Model } from 'mongoose';
import { BloodType, EligibilityStatus } from '../types/donor';

/**
 * Represents a donor profile linked 1-to-1 with a User account.
 *
 * A User must register (creating an auth account) before creating a donor
 * profile. The two documents are joined via `userId`.
 */
export interface IDonor extends Document {
  /** Reference to the owning User account. One-to-one: unique index enforced. */
  userId: mongoose.Types.ObjectId;
  fullName: string;
  /** Valid range: 18–65 (inclusive). Enforced by schema min/max validators. */
  age: number;
  bloodType: BloodType;
  phone: string;
  /** Contact email shown to hospitals after they call revealContact. */
  email: string;
  /** Used for proximity matching in search results (30-pt score component). */
  neighborhood: string;
  /**
   * Date of the most recent completed donation. Set automatically when a
   * hospital calls completeDonation. Drives the 56-day cooldown calculation.
   * Null for first-time donors — they receive the highest recency score (20 pts).
   */
  lastDonationDate: Date | null;
  /**
   * Eligibility status set by the quiz and maintained by the cron job.
   *
   * - `ELIGIBLE`            — passes all quiz criteria; appears in search results.
   * - `TEMPORARILY_BLOCKED` — deferred until `blockExpiryDate`; excluded from
   *                           search. The nightly cron auto-restores to ELIGIBLE
   *                           once the expiry date passes.
   * - `PERMANENTLY_BLOCKED` — irreversible disqualification (e.g., chronic
   *                           illness, HIV-positive). Never restored by cron.
   */
  eligibilityStatus: EligibilityStatus;
  /**
   * Numeric score from 0–100 produced by the eligibility quiz. Starts at 100
   * and decreases with each risky answer. Used as a tiebreaker in match
   * scoring: `score += eligibilityScore / 10` (up to 10 bonus pts).
   */
  eligibilityScore: number;
  /**
   * Whether the donor is currently accepting requests. Donors can toggle this
   * independently of eligibility — useful for temporary personal unavailability
   * without affecting their eligibility status.
   */
  availabilityStatus: boolean;
  /**
   * Raw quiz answers stored after each submission, keyed by question ID.
   * Provides an audit trail and allows re-evaluation if quiz questions change.
   */
  medicalHistory: Record<string, unknown>;
  /**
   * Human-readable reason for the current block.
   * Examples: "Recent tattoo or piercing", "HIV positive status", "Malaria medication"
   * Null when eligibilityStatus is ELIGIBLE.
   */
  blockReason: string | null;
  /**
   * Date after which the temporary block expires and the cron job will restore
   * `eligibilityStatus` to ELIGIBLE. Null for permanent blocks and eligible donors.
   */
  blockExpiryDate: Date | null;
  /**
   * Controls whether phone and email are shown in search results. Currently
   * defaults to false — contact is only revealed via the explicit revealContact
   * endpoint, giving donors privacy until a hospital makes a deliberate request.
   */
  isContactVisible: boolean;
  /** Minimum: 50 kg. Below this threshold, donation can cause adverse reactions. */
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

// Indexes support the most common query patterns in searchDonors and urgentRequestController
donorSchema.index({ bloodType: 1 });
donorSchema.index({ neighborhood: 1 });
donorSchema.index({ eligibilityStatus: 1 });

const Donor: Model<IDonor> = mongoose.model<IDonor>('Donor', donorSchema);
export default Donor;
