import { Request, Response, NextFunction } from 'express';
import UrgentRequest from '../models/UrgentRequest';
import Hospital from '../models/Hospital';
import Donor from '../models/Donor';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import { CreateUrgentRequestBody } from '../types/urgentRequest';
import { BloodType } from '../types/donor';
import { getCompatibleBloodTypes } from '../utils/bloodCompatibility';
import { sendDonationRequestEmail } from '../services/emailService';

const COOLDOWN_MS = 56 * 24 * 60 * 60 * 1000;

export interface CreateUrgentRequestRequest extends AuthRequest {
  body: CreateUrgentRequestBody;
}

export interface UrgentRequestParamsRequest extends AuthRequest {
  params: { id: string };
}

// POST /api/urgent-requests  (HOSPITAL only)
export const createUrgentRequest = async (
  req: CreateUrgentRequestRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bloodType, unitsNeeded, urgencyLevel, reason } = req.body;

    if (!bloodType || !unitsNeeded || !urgencyLevel) {
      res.status(400).json({ success: false, message: 'bloodType, unitsNeeded, and urgencyLevel are required' });
      return;
    }

    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const urgentRequest = await UrgentRequest.create({
      hospitalId: hospital._id,
      bloodType,
      unitsNeeded,
      urgencyLevel,
      reason,
      expiresAt,
    });

    // Find all compatible, eligible, available donors not in cooldown
    const compatibleTypes = getCompatibleBloodTypes(bloodType as BloodType);
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);

    const donors = await Donor.find({
      bloodType: { $in: compatibleTypes },
      eligibilityStatus: 'ELIGIBLE',
      availabilityStatus: true,
      $or: [
        { lastDonationDate: null },
        { lastDonationDate: { $lt: cooldownCutoff } },
      ],
    });

    if (donors.length > 0) {
      const message = reason
        ? `${hospital.hospitalName} urgently needs ${unitsNeeded} unit(s) of ${bloodType} blood. Reason: ${reason}`
        : `${hospital.hospitalName} urgently needs ${unitsNeeded} unit(s) of ${bloodType} blood.`;

      // Send emails concurrently — failures don't abort the batch
      const emailResults = await Promise.all(
        donors.map((donor) =>
          sendDonationRequestEmail({
            donorEmail: donor.email,
            hospitalName: hospital.hospitalName,
            message,
            bloodType: bloodType as BloodType,
            isUrgent: true,
          })
        )
      );

      const emailSent   = emailResults.filter(Boolean).length;
      const emailFailed = emailResults.length - emailSent;

      await Notification.create({
        hospitalId: hospital._id,
        donorIds: donors.map((d) => d._id),
        message,
        notificationType: 'URGENT_REQUEST',
        bloodTypeNeeded: bloodType,
        unitsNeeded,
        sentAt: new Date(),
        deliveryStatus: {
          email: { sent: emailSent, failed: emailFailed },
          sms:   { sent: 0, failed: 0 },
          inApp: { sent: donors.length, failed: 0 },
        },
      });

      urgentRequest.notifiedDonorCount = donors.length;
      await urgentRequest.save();
    }

    res.status(201).json({
      success: true,
      data: urgentRequest,
      notifiedDonors: donors.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/urgent-requests/active  (public)
export const getActiveRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Sort: CRITICAL first (C < H alphabetically so ascending puts CRITICAL first)
    const requests = await UrgentRequest.find({
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
    })
      .populate('hospitalId', 'hospitalName address neighborhood phone')
      .sort({ urgencyLevel: 1, createdAt: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
};

// GET /api/urgent-requests/hospital  (HOSPITAL only)
export const getHospitalRequests = async (
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

    const requests = await UrgentRequest.find({ hospitalId: hospital._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
};

// PUT /api/urgent-requests/:id/fulfill  (HOSPITAL only)
export const fulfillRequest = async (
  req: UrgentRequestParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const urgentRequest = await UrgentRequest.findOneAndUpdate(
      { _id: req.params.id, hospitalId: hospital._id, status: 'ACTIVE' },
      { status: 'FULFILLED' },
      { new: true }
    );

    if (!urgentRequest) {
      res.status(404).json({ success: false, message: 'Active urgent request not found' });
      return;
    }

    res.json({ success: true, data: urgentRequest });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/urgent-requests/:id  (HOSPITAL only)
export const deleteRequest = async (
  req: UrgentRequestParamsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const urgentRequest = await UrgentRequest.findOneAndDelete({
      _id: req.params.id,
      hospitalId: hospital._id,
    });

    if (!urgentRequest) {
      res.status(404).json({ success: false, message: 'Urgent request not found' });
      return;
    }

    res.json({ success: true, message: 'Urgent request deleted' });
  } catch (err) {
    next(err);
  }
};
