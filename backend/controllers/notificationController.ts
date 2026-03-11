import { Response } from 'express';
import mongoose from 'mongoose';
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

// POST /api/notifications/send  (HOSPITAL only)
export const sendNotification = async (
  req: SendNotificationRequest,
  res: Response
): Promise<void> => {
  const { donorIds, message, notificationType, bloodTypeNeeded, unitsNeeded } = req.body;

  if (!donorIds?.length || !message || !notificationType) {
    res.status(400).json({ success: false, message: 'donorIds, message, and notificationType are required' });
    return;
  }

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

  // Send emails concurrently; failures don't abort the whole batch
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

  const emailSent  = emailResults.filter(Boolean).length;
  const emailFailed = emailResults.length - emailSent;
  const inAppSent  = donors.length; // in-app always succeeds (stored in DB)

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

  res.status(201).json({
    success: true,
    data: notification,
    summary: {
      totalDonors: donors.length,
      email: { sent: emailSent, failed: emailFailed },
      inApp: { sent: inAppSent },
    },
  });
};

// GET /api/notifications/donor  (DONOR only)
export const getDonorNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const donor = await Donor.findOne({ userId: req.user!._id });
  if (!donor) {
    res.status(404).json({ success: false, message: 'Donor profile not found' });
    return;
  }

  const notifications = await Notification.find({ donorIds: donor._id })
    .populate('hospitalId', 'hospitalName address neighborhood phone')
    .sort({ sentAt: -1 });

  res.json({ success: true, count: notifications.length, data: notifications });
};

// GET /api/notifications/hospital  (HOSPITAL only)
export const getHospitalNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const hospital = await Hospital.findOne({ userId: req.user!._id });
  if (!hospital) {
    res.status(404).json({ success: false, message: 'Hospital profile not found' });
    return;
  }

  const notifications = await Notification.find({ hospitalId: hospital._id })
    .sort({ sentAt: -1 });

  res.json({ success: true, count: notifications.length, data: notifications });
};

// PUT /api/notifications/:id/read
export const markAsRead = async (
  req: ReadNotificationRequest,
  res: Response
): Promise<void> => {
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
};
