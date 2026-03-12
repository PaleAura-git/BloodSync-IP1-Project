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

const router = Router();

const requireHospital = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals' });
    return;
  }
  next();
};

const requireDonor = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'DONOR') {
    res.status(403).json({ success: false, message: 'Access restricted to donors' });
    return;
  }
  next();
};

// POST /api/donations — schedule a donation (HOSPITAL only)
router.post(
  '/',
  protect,
  requireHospital,
  (req, res, next) => scheduleDonation(req as CreateDonationRequest, res, next)
);

// GET /api/donations/my — donor's own history + stats (DONOR only)
router.get(
  '/my',
  protect,
  requireDonor,
  (req, res, next) => getDonorHistory(req as AuthRequest, res, next)
);

// GET /api/donations/hospital — hospital's donation records (HOSPITAL only)
router.get(
  '/hospital',
  protect,
  requireHospital,
  (req, res, next) => getHospitalDonations(req as AuthRequest, res, next)
);

// PUT /api/donations/:id/complete — mark complete, updates donor cooldown (HOSPITAL only)
router.put(
  '/:id/complete',
  protect,
  requireHospital,
  (req, res, next) => completeDonation(req as CompleteDonationRequest, res, next)
);

// PUT /api/donations/:id/cancel — cancel (HOSPITAL or owning DONOR)
router.put(
  '/:id/cancel',
  protect,
  (req, res, next) => cancelDonation(req as DonationParamsRequest, res, next)
);

export default router;
