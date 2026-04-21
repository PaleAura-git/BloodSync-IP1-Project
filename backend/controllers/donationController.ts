import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Donation from '../models/Donation';
import Donor from '../models/Donor';
import Hospital from '../models/Hospital';
import { AuthRequest } from '../middleware/auth';
import { CreateDonationBody } from '../types/donation';
import { transformDonation } from '../utils/transforms';

export interface CreateDonationRequest extends AuthRequest {
  body: CreateDonationBody;
}

export interface DonationParamsRequest extends AuthRequest {
  params: { id: string };
}

export interface CompleteDonationRequest extends DonationParamsRequest {
  body: { notes?: string };
}

/**
 * Minimum rest period between whole-blood donations (56 days = 8 weeks).
 * Applied here as a server-side guard before creating a scheduled donation.
 */
const COOLDOWN_MS = 56 * 24 * 60 * 60 * 1000;

/**
 * POST /api/donations
 *
 * Schedules a future donation appointment — the hospital records that a donor
 * has agreed to come in. The donation status starts as SCHEDULED and must be
 * advanced to COMPLETED by calling PUT /api/donations/:id/complete.
 *
 * The endpoint enforces the 56-day cooldown: if the donor's last completed
 * donation is within the cooldown window the request is rejected, and the
 * response includes the calculated `nextEligibleDate` for the frontend to display.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @body `{ donorId: string, donationDate: string (ISO), bloodType: BloodType,
 *   unitsDonated?: number, notificationId?: string, notes?: string }`
 * @returns 201 `{ success, data: IDonation }`
 * @returns 400 if required fields are missing, donor is ineligible, or donor
 *   is within the 56-day cooldown period (includes `nextEligibleDate` in response).
 * @returns 404 if hospital or donor profile is not found.
 */
// POST /api/donations  (HOSPITAL only)
// Schedules a donation — hospital records that a donor is coming in
export const scheduleDonation = async (
  req: CreateDonationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { donorId, donationDate, bloodType, unitsDonated, notificationId, notes } = req.body;

    if (!donorId || !donationDate || !bloodType) {
      res.status(400).json({ success: false, message: 'donorId, donationDate, and bloodType are required' });
      return;
    }

    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const donor = await Donor.findById(donorId);
    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor not found' });
      return;
    }

    // Prevent scheduling if donor is in cooldown or ineligible
    if (donor.eligibilityStatus !== 'ELIGIBLE') {
      res.status(400).json({ success: false, message: `Donor is not eligible: ${donor.eligibilityStatus}` });
      return;
    }

    if (donor.lastDonationDate && Date.now() - donor.lastDonationDate.getTime() < COOLDOWN_MS) {
      const nextEligible = new Date(donor.lastDonationDate.getTime() + COOLDOWN_MS);
      res.status(400).json({
        success: false,
        message: 'Donor is within the 56-day cooldown period',
        nextEligibleDate: nextEligible,
      });
      return;
    }

    const donation = await Donation.create({
      donorId: new mongoose.Types.ObjectId(donorId),
      hospitalId: hospital._id,
      notificationId: notificationId ? new mongoose.Types.ObjectId(notificationId) : undefined,
      donationDate: new Date(donationDate),
      bloodType,
      unitsDonated: unitsDonated ?? 1,
      notes,
    });

    res.status(201).json({ success: true, data: donation });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/donations/:id/complete
 *
 * Marks a scheduled donation as completed and records the confirmation
 * timestamp. This is the critical step that updates `donor.lastDonationDate`,
 * which starts the 56-day cooldown and feeds back into future match scores.
 *
 * Only the hospital that created the donation record can complete it.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @param id - MongoDB ObjectId of the donation.
 * @body `{ notes?: string }` — optional completion notes.
 * @returns 200 `{ success, data: IDonation }` with status `COMPLETED`.
 * @returns 400 if the donation is not in SCHEDULED status.
 * @returns 404 if the donation is not found or belongs to a different hospital.
 *
 * Side effect: Updates `donor.lastDonationDate` to the donation's recorded
 * date, triggering the 56-day cooldown and reducing the donor's match score
 * recency component in future searches.
 */
// PUT /api/donations/:id/complete  (HOSPITAL only)
// Marks donation complete and updates donor's lastDonationDate — triggers cooldown
export const completeDonation = async (
  req: CompleteDonationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const donation = await Donation.findOne({ _id: req.params.id, hospitalId: hospital._id });
    if (!donation) {
      res.status(404).json({ success: false, message: 'Donation not found' });
      return;
    }

    if (donation.status !== 'SCHEDULED') {
      res.status(400).json({ success: false, message: `Cannot complete a donatioin with status: ${donation.status}` });
      return;
    }

    donation.status = 'COMPLETED';
    donation.confirmedAt = new Date();
    if (req.body.notes) donation.notes = req.body.notes;
    await donation.save();

    // Update donor's lastDonationDate and increment total count
    await Donor.findByIdAndUpdate(donation.donorId, {
      lastDonationDate: donation.donationDate,
      $inc: { totalDonations: 1 },
    });

    res.json({ success: true, data: donation });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/donations/:id/cancel
 *
 * Cancels a SCHEDULED donation. Both the hospital that created the record
 * and the donor who was scheduled can cancel. Completed donations cannot
 * be cancelled — they are permanent records.
 *
 * Authorization is enforced by scoping the query: hospitals filter by
 * `hospitalId`, donors filter by `donorId`, so each party can only cancel
 * their own relevant records.
 *
 * @auth Required — Bearer JWT (HOSPITAL or DONOR).
 * @param id - MongoDB ObjectId of the donation.
 * @returns 200 `{ success, data: IDonation }` with status `CANCELLED`.
 * @returns 400 if the donation status is already COMPLETED.
 * @returns 404 if the donation is not found or does not belong to the caller.
 */
// PUT /api/donations/:id/cancel  (HOSPITAL or owning DONOR)
export const cancelDonation = async (
  req: DonationParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userType = req.user!.userType;
    let query: Record<string, unknown> = { _id: req.params.id };

    // Scope query by the caller's profile to prevent cross-user cancellations
    if (userType === 'HOSPITAL') {
      const hospital = await Hospital.findOne({ userId: req.user!._id });
      if (!hospital) {
        res.status(404).json({ success: false, message: 'Hospital profile not found' });
        return;
      }
      query.hospitalId = hospital._id;
    } else {
      const donor = await Donor.findOne({ userId: req.user!._id });
      if (!donor) {
        res.status(404).json({ success: false, message: 'Donor profile not found' });
        return;
      }
      query.donorId = donor._id;
    }

    const donation = await Donation.findOne(query);
    if (!donation) {
      res.status(404).json({ success: false, message: 'Donation not found' });
      return;
    }

    if (donation.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Cannot cancel a completed donation' });
      return;
    }

    donation.status = 'CANCELLED';
    await donation.save();

    res.json({ success: true, data: donation });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/donations/my
 *
 * Returns the authenticated donor's complete donation history with aggregate
 * statistics. Results are sorted by donation date descending (most recent first).
 * Each donation is populated with the hospital's name, address, neighborhood,
 * and phone.
 *
 * @auth Required — Bearer JWT, userType must be DONOR.
 * @returns 200 `{ success, stats, data: IDonation[] }`
 *   `stats` includes: total, completed, scheduled, cancelled counts,
 *   lastDonationDate, and nextEligibleDate (lastDonationDate + 56 days).
 * @returns 404 if the authenticated user has no donor profile.
 */
// GET /api/donations/my  (DONOR only)
export const getDonorHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donor = await Donor.findOne({ userId: req.user!._id });
    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor profile not found' });
      return;
    }

    const donations = await Donation.find({ donorId: donor._id })
      .populate('hospitalId', 'hospitalName address neighborhood phone')
      .sort({ donationDate: -1 });

    const stats = {
      total: donations.length,
      completed: donations.filter((d) => d.status === 'COMPLETED').length,
      scheduled: donations.filter((d) => d.status === 'SCHEDULED').length,
      cancelled: donations.filter((d) => d.status === 'CANCELLED').length,
      lastDonationDate: donor.lastDonationDate,
      // 56 days = standard whole-blood donation cooldown period
      nextEligibleDate: donor.lastDonationDate
        ? new Date(donor.lastDonationDate.getTime() + 56 * 24 * 60 * 60 * 1000)
        : null,
    };

    res.json({ success: true, stats, data: donations.map(transformDonation) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/donations/hospital
 *
 * Returns all donation records for the authenticated hospital, optionally
 * filtered by status. Each donation is populated with the donor's name,
 * blood type, phone, email, and neighborhood.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @query `status` — optional filter: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
 *   (case-insensitive; converted to uppercase before querying).
 * @returns 200 `{ success, count: number, data: IDonation[] }`
 * @returns 404 if the authenticated user has no hospital profile.
 */
// GET /api/donations/hospital  (HOSPITAL only)
export const getHospitalDonations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = { hospitalId: hospital._id };
    if (status) filter.status = status.toUpperCase();

    const donations = await Donation.find(filter)
      .populate('donorId', 'fullName bloodType phone email neighborhood')
      .sort({ donationDate: -1 });

    res.json({ success: true, count: donations.length, data: donations.map(transformDonation) });
  } catch (err) {
    next(err);
  }
};
