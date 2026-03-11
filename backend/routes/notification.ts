import { Router, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import {
  sendNotification,
  getDonorNotifications,
  getHospitalNotifications,
  markAsRead,
  SendNotificationRequest,
  ReadNotificationRequest,
} from '../controllers/notificationController';

const router = Router();

function hospitalOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals' });
    return;
  }
  next();
}

function donorOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.userType !== 'DONOR') {
    res.status(403).json({ success: false, message: 'Access restricted to donors' });
    return;
  }
  next();
}

// POST /api/notifications/send
router.post(
  '/send',
  protect,
  hospitalOnly,
  (req, res) => sendNotification(req as SendNotificationRequest, res)
);

// GET /api/notifications/donor
router.get(
  '/donor',
  protect,
  donorOnly,
  (req, res) => getDonorNotifications(req as AuthRequest, res)
);

// GET /api/notifications/hospital
router.get(
  '/hospital',
  protect,
  hospitalOnly,
  (req, res) => getHospitalNotifications(req as AuthRequest, res)
);

// PUT /api/notifications/:id/read
router.put(
  '/:id/read',
  protect,
  (req, res) => markAsRead(req as ReadNotificationRequest, res)
);

export default router;
