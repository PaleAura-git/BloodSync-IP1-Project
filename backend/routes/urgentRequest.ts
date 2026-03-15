import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import {
  createUrgentRequest,
  getActiveRequests,
  getHospitalRequests,
  fulfillRequest,
  deleteRequest,
  CreateUrgentRequestRequest,
  UrgentRequestParamsRequest,
} from '../controllers/urgentRequestController';
import { createUrgentRequestValidation } from '../middleware/validators/urgentRequestValidator';

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

// GET /api/urgent-requests/active — public feed of open requests
router.get('/active', getActiveRequests);

// POST /api/urgent-requests — create request + broadcast to donors (HOSPITAL only)
router.post(
  '/',
  protect,
  requireHospital,
  createUrgentRequestValidation,
  (req: Request, res: Response, next: NextFunction) =>
    createUrgentRequest(req as CreateUrgentRequestRequest, res, next)
);

// GET /api/urgent-requests/hospital — hospital's own request history (HOSPITAL only)
router.get('/hospital', protect, requireHospital, auth(getHospitalRequests));

// PUT /api/urgent-requests/:id/fulfill — mark as fulfilled (HOSPITAL only)
router.put(
  '/:id/fulfill',
  protect,
  requireHospital,
  (req: Request, res: Response, next: NextFunction) =>
    fulfillRequest(req as UrgentRequestParamsRequest, res, next)
);

// DELETE /api/urgent-requests/:id — permanent delete (HOSPITAL only)
router.delete(
  '/:id',
  protect,
  requireHospital,
  (req: Request, res: Response, next: NextFunction) =>
    deleteRequest(req as UrgentRequestParamsRequest, res, next)
);

export default router;
