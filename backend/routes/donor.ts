import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { createDonorValidation, updateDonorValidation } from '../middleware/validators/donorValidator';
import {
  createDonor,
  getDonorProfile,
  updateDonorProfile,
  toggleAvailability,
  getDonorById,
} from '../controllers/donorController';

const router = Router();

const requireDonor = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'DONOR') {
    res.status(403).json({ success: false, message: 'Access restricted to donors only' });
    return;
  }
  next();
};

const requireHospital = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals only' });
    return;
  }
  next();
};

const auth = (
  handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>
) => (req: Request, res: Response, next: NextFunction) => handler(req as AuthRequest, res, next);

// POST /api/donors — create donor profile (DONOR only)
router.post('/', protect, requireDonor, createDonorValidation, auth(createDonor));

// GET /api/donors/profile — get own donor profile (DONOR only)
router.get('/profile', protect, requireDonor, auth(getDonorProfile));

// PUT /api/donors/profile — update own donor profile (DONOR only)
router.put('/profile', protect, requireDonor, updateDonorValidation, auth(updateDonorProfile));

// PATCH /api/donors/availability — toggle availability (DONOR only)
router.patch('/availability', protect, requireDonor, auth(toggleAvailability));

// GET /api/donors/:id — get donor by ID (HOSPITAL only)
router.get('/:id', protect, requireHospital, getDonorById);

export default router;
