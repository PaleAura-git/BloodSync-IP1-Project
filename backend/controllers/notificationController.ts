import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Notification from '../models/Notification';
import Donor from '../models/Donor';
import Hospital from '../models/Hospital';
import { AuthRequest } from '../middleware/auth';
import { SendNotificationBody } from '../types/notification';
import { sendDonationRequestEmail } from '../services/emailService';

export interface SendNotificationRequest extends AuthRequest {
  body: SendNotificationBody;
}

export interface ReadNotificationRequest extends AuthRequest {
  params: { id: string };
}

/**
 * POST /api/notifications/send
 *
 * Sends a donation request notification to a list of donors simultaneously,
 * via email and in-app channels.
 *
 * ## Flow
 * 1. Resolves the hospital profile for the authenticated user.
 * 2. Fetches all donor documents for the provided `donorIds`.
 * 3. Sends emails concurrently via `sendDonationRequestEmail`. Individual
 *    email failures do not abort the batch — the remaining sends continue.
 * 4. Creates a single Notification document recording the message, delivery
 *    counts per channel, and which donors were targeted.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @body `{ donorIds: string[], message: string, notificationType: 'GENERAL' | 'URGENT_REQUEST',
 *   bloodTypeNeeded?: BloodType, unitsNeeded?: number }`
 * @returns 201 `{ success, data: INotification, summary: { totalDonors, email, inApp } }`
 * @returns 400 if validation fails.
 * @returns 404 if the hospital profile or donors are not found.
 *
 * Side effects:
 * - Sends emails to each donor (failures counted, not thrown).
 * - Persists a Notification document with per-channel delivery statistics.
 */
// POST /api/notifications/send  (HOSPITAL only)
export const sendNotification = async (
  req: SendNotificationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    const { donorIds, message, notificationType, bloodTypeNeeded, unitsNeeded } = req.body;

    // Resolve the hospital profile from the logged-in user
    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const objectIds = donorIds.map((id) => new mongoose.Types.ObjectId(id));
    const donors = await Donor.find({ _id: { $in: objectIds } });

    if (!donors.length) {
      res.status(404).json({ success: false, message: 'No matching donors found' });
      return;
    }

    // Send emails concurrently; individual failures don't abort the whole batch
    const isUrgent = notificationType === 'URGENT_REQUEST';
    const emailResults = await Promise.all(
      donors.map((donor) =>
        sendDonationRequestEmail({
          donorEmail: donor.email,
          hospitalName: hospital.hospitalName,
          message,
          bloodType: bloodTypeNeeded,
          isUrgent,
        })
      )
    );

    const emailSent   = emailResults.filter(Boolean).length;
    const emailFailed = emailResults.length - emailSent;
    const inAppSent   = donors.length; // in-app always succeeds (stored in DB)

    const notification = await Notification.create({
      hospitalId: hospital._id,
      donorIds: donors.map((d) => d._id),
      message,
      notificationType,
      bloodTypeNeeded,
      unitsNeeded,
      sentAt: new Date(),
      deliveryStatus: {
        email: { sent: emailSent, failed: emailFailed },
        sms:   { sent: 0, failed: 0 },
        inApp: { sent: inAppSent, failed: 0 },
      },
    });

    console.log(
      `[INFO] ${new Date().toISOString()} sendNotification — hospitalId=${hospital._id} ` +
      `donors=${donors.length} emailSent=${emailSent} emailFailed=${emailFailed}`
    );

    res.status(201).json({
      success: true,
      data: notification,
      summary: {
        totalDonors: donors.length,
        email: { sent: emailSent, failed: emailFailed },
        inApp: { sent: inAppSent },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/donor
 *
 * Returns all notifications sent to the authenticated donor, sorted by most
 * recent first. Each notification is populated with hospital contact info.
 *
 * @auth Required — Bearer JWT, userType must be DONOR.
 * @returns 200 `{ success, count: number, data: INotification[] }`
 *   Each notification includes populated `hospitalId` with: hospitalName,
 *   address, neighborhood, phone.
 * @returns 404 if the authenticated user has no donor profile.
 */
// GET /api/notifications/donor  (DONOR only)
export const getDonorNotifications = async (
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

    const notifications = await Notification.find({ donorIds: donor._id })
      .populate('hospitalId', 'hospitalName address neighborhood phone')
      .sort({ sentAt: -1 });

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/hospital
 *
 * Returns all notifications sent by the authenticated hospital, sorted by
 * most recent first.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @returns 200 `{ success, count: number, data: INotification[] }`
 * @returns 404 if the authenticated user has no hospital profile.
 */
// GET /api/notifications/hospital  (HOSPITAL only)
export const getHospitalNotifications = async (
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

    const notifications = await Notification.find({ hospitalId: hospital._id })
      .sort({ sentAt: -1 });

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/:id/read
 *
 * Marks a notification as read. Intended to be called by the donor's app
 * when they open a notification, to support unread-count badges in the UI.
 *
 * @auth Required — Bearer JWT.
 * @param id - MongoDB ObjectId of the notification.
 * @returns 200 `{ success, data: INotification }` with `isRead: true`.
 * @returns 404 if no notification with that ID exists.
 */
// PUT /api/notifications/:id/read
export const markAsRead = async (
  req: ReadNotificationRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};
