import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import {
  sendNotification,
  getDonorNotifications,
  getHospitalNotifications,
  markAsRead,
  SendNotificationRequest,
  ReadNotificationRequest,
} from '../controllers/notificationController';
import { sendNotificationValidation } from '../middleware/validators/notificationValidator';

const router = Router();

/** Helper: type-safe bridge from Express Request to AuthRequest for controller calls. */
const auth =
  (handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req as AuthRequest, res, next);
  };

/** Restricts a route to authenticated HOSPITAL accounts. */
function hospitalOnly(req: Request, res: Response, next: NextFunction): void {
  if ((req as AuthRequest).user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals' });
    return;
  }
  next();
}

/** Restricts a route to authenticated DONOR accounts. */
function donorOnly(req: Request, res: Response, next: NextFunction): void {
  if ((req as AuthRequest).user?.userType !== 'DONOR') {
    res.status(403).json({ success: false, message: 'Access restricted to donors' });
    return;
  }
  next();
}

// POST /api/notifications/send — broadcast to donor list (HOSPITAL only)
router.post(
  '/send',
  protect,
  hospitalOnly,
  sendNotificationValidation,
  (req: Request, res: Response, next: NextFunction) =>
    sendNotification(req as SendNotificationRequest, res, next)
);

// GET /api/notifications/donor — donor's own inbox (DONOR only)
router.get('/donor', protect, donorOnly, auth(getDonorNotifications));

// GET /api/notifications/hospital — hospital's sent notifications (HOSPITAL only)
router.get('/hospital', protect, hospitalOnly, auth(getHospitalNotifications));

// PUT /api/notifications/:id/read — mark a notification as read
router.put(
  '/:id/read',
  protect,
  (req: Request, res: Response, next: NextFunction) =>
    markAsRead(req as ReadNotificationRequest, res, next)
);

export default router;
