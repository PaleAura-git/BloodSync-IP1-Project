import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Donation from '../models/Donation';
import Donor from '../models/Donor';
import Hospital from '../models/Hospital';
import { AuthRequest } from '../middleware/auth';
import { CreateDonationBody } from '../types/donation';

export interface CreateDonationRequest extends AuthRequest {
  body: CreateDonationBody;
}

export interface DonationParamsRequest extends AuthRequest {
  params: { id: string };
}

export interface CompleteDonationRequest extends DonationParamsRequest {
  body: { notes?: string };
}

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

    const COOLDOWN_MS = 56 * 24 * 60 * 60 * 1000;
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
      res.status(400).json({ success: false, message: `Cannot complete a donation with status: ${donation.status}` });
      return;
    }

    donation.status = 'COMPLETED';
    donation.confirmedAt = new Date();
    if (req.body.notes) donation.notes = req.body.notes;
    await donation.save();

    // Update donor's lastDonationDate — this is what feeds back into matching scores
    await Donor.findByIdAndUpdate(donation.donorId, {
      lastDonationDate: donation.donationDate,
    });

    res.json({ success: true, data: donation });
  } catch (err) {
    next(err);
  }
};

// PUT /api/donations/:id/cancel  (HOSPITAL or owning DONOR)
export const cancelDonation = async (
  req: DonationParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userType = req.user!.userType;
    let query: Record<string, unknown> = { _id: req.params.id };

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
      nextEligibleDate: donor.lastDonationDate
        ? new Date(donor.lastDonationDate.getTime() + 56 * 24 * 60 * 60 * 1000)
        : null,
    };

    res.json({ success: true, stats, data: donations });
  } catch (err) {
    next(err);
  }
};

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

    res.json({ success: true, count: donations.length, data: donations });
  } catch (err) {
    next(err);
  }
};
