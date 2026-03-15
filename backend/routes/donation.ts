import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import {
  scheduleDonation,
  completeDonation,
  cancelDonation,
  getDonorHistory,
  getHospitalDonations,
  CreateDonationRequest,
  DonationParamsRequest,
  CompleteDonationRequest,
} from '../controllers/donationController';
import {
  scheduleDonationValidation,
  completeDonationValidation,
} from '../middleware/validators/donationValidator';

const router = Router();

/** Helper: type-safe bridge from Express Request to AuthRequest for controller calls. */
const auth =
  (handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req as AuthRequest, res, next);
  };

/** Restricts a route to authenticated HOSPITAL accounts. */
const requireHospital = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals' });
    return;
  }
  next();
};

/** Restricts a route to authenticated DONOR accounts. */
const requireDonor = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'DONOR') {
    res.status(403).json({ success: false, message: 'Access restricted to donors' });
    return;
  }
  next();
};

// POST /api/donations — schedule a donation appointment (HOSPITAL only)
router.post(
  '/',
  protect,
  requireHospital,
  scheduleDonationValidation,
  (req: Request, res: Response, next: NextFunction) =>
    scheduleDonation(req as CreateDonationRequest, res, next)
);

// GET /api/donations/my — donor's own history + stats (DONOR only)
router.get('/my', protect, requireDonor, auth(getDonorHistory));

// GET /api/donations/hospital — hospital's donation records (HOSPITAL only)
router.get('/hospital', protect, requireHospital, auth(getHospitalDonations));

// PUT /api/donations/:id/complete — mark complete, triggers 56-day cooldown (HOSPITAL only)
router.put(
  '/:id/complete',
  protect,
  requireHospital,
  completeDonationValidation,
  (req: Request, res: Response, next: NextFunction) =>
    completeDonation(req as CompleteDonationRequest, res, next)
);

// PUT /api/donations/:id/cancel — cancel appointment (HOSPITAL or owning DONOR)
router.put(
  '/:id/cancel',
  protect,
  (req: Request, res: Response, next: NextFunction) =>
    cancelDonation(req as DonationParamsRequest, res, next)
);

export default router;
