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

/**
 * Minimum rest period between whole-blood donations (56 days = 8 weeks).
 * Donors within this window are excluded from urgent-request notifications.
 */
const COOLDOWN_MS = 56 * 24 * 60 * 60 * 1000;

export interface CreateUrgentRequestRequest extends AuthRequest {
  body: CreateUrgentRequestBody;
}

export interface UrgentRequestParamsRequest extends AuthRequest {
  params: { id: string };
}

/**
 * POST /api/urgent-requests
 *
 * Creates a time-sensitive blood request and immediately notifies all
 * compatible, eligible, available donors via email and in-app notification.
 *
 * ## Flow
 * 1. Creates the UrgentRequest document (expires in 24 hours by default).
 * 2. Queries all donors who are: compatible blood type, eligible, available,
 *    and outside the 56-day donation cooldown.
 * 3. Fires emails to all matching donors concurrently. Individual failures
 *    don't abort the batch.
 * 4. Creates a Notification document recording delivery statistics.
 * 5. Updates `urgentRequest.notifiedDonorCount` with the number reached.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @body `{ bloodType: BloodType, unitsNeeded: number,
 *   urgencyLevel: 'HIGH' | 'CRITICAL', reason?: string }`
 * @returns 201 `{ success, data: IUrgentRequest, notifiedDonors: number }`
 * @returns 400 if required fields are missing.
 * @returns 404 if the hospital profile is not found.
 *
 * Side effects:
 * - Sends emails to all compatible donors (non-blocking on failure).
 * - Persists a Notification document with delivery statistics.
 * - Sets `notifiedDonorCount` on the urgent request document.
 */
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

    // Urgent requests expire after 24 hours to keep the active list current
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

/**
 * GET /api/urgent-requests/active
 *
 * Returns all non-expired active urgent requests, visible to everyone
 * (donors checking the app, public dashboards, etc.).
 *
 * Results are sorted by urgency level ascending then by creation date
 * descending. Because "CRITICAL" < "HIGH" alphabetically, ascending sort
 * places CRITICAL requests first — the most time-sensitive cases surface at
 * the top without a custom sort key.
 *
 * @auth None — public endpoint.
 * @returns 200 `{ success, count: number, data: IUrgentRequest[] }`
 *   Each request includes populated hospital info: hospitalName, address,
 *   neighborhood, phone.
 */
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

/**
 * GET /api/urgent-requests/hospital
 *
 * Returns all urgent requests created by the authenticated hospital,
 * including expired and fulfilled ones, sorted by most recent first.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @returns 200 `{ success, count: number, data: IUrgentRequest[] }`
 * @returns 404 if the hospital profile is not found.
 */
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

/**
 * PUT /api/urgent-requests/:id/fulfill
 *
 * Marks an active urgent request as FULFILLED, indicating the hospital has
 * received sufficient donations. Only the hospital that created the request
 * can fulfill it. The request must currently be ACTIVE.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @param id - MongoDB ObjectId of the urgent request.
 * @returns 200 `{ success, data: IUrgentRequest }` with status `FULFILLED`.
 * @returns 404 if no active request with that ID belongs to this hospital.
 */
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

/**
 * DELETE /api/urgent-requests/:id
 *
 * Permanently deletes an urgent request. Only the hospital that created it
 * can delete it. This is typically used to clean up test data or mistaken
 * submissions; for resolved requests, prefer `fulfillRequest` to preserve
 * the historical record.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @param id - MongoDB ObjectId of the urgent request.
 * @returns 200 `{ success, message: 'Urgent request deleted' }`
 * @returns 404 if no request with that ID belongs to this hospital.
 */
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
