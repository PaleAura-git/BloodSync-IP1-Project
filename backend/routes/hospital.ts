import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { createHospitalValidation, updateHospitalValidation } from '../middleware/validators/hospitalValidator';
import {
  createHospital,
  getHospitalProfile,
  updateHospitalProfile,
  getHospitalDirectory,
  getHospitalById,
} from '../controllers/hospitalController';

const router = Router();

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

// POST /api/hospitals — create hospital profile (HOSPITAL only)
router.post('/', protect, requireHospital, createHospitalValidation, auth(createHospital));

// GET /api/hospitals/profile — own profile (HOSPITAL only)
router.get('/profile', protect, requireHospital, auth(getHospitalProfile));

// PUT /api/hospitals/profile — update own profile (HOSPITAL only)
router.put('/profile', protect, requireHospital, updateHospitalValidation, auth(updateHospitalProfile));

// GET /api/hospitals/directory — public, all verified hospitals
router.get('/directory', getHospitalDirectory);

// GET /api/hospitals/:id — auth required, any user type
router.get('/:id', protect, getHospitalById);

export default router;
