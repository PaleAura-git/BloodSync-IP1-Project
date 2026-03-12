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

const router = Router();

const requireHospital = (req: Request, res: Response, next: NextFunction): void => {
  if ((req as AuthRequest).user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals' });
    return;
  }
  next();
};

// GET /api/urgent-requests/active — public
router.get('/active', getActiveRequests);

// POST /api/urgent-requests — create (HOSPITAL only)
router.post(
  '/',
  protect,
  requireHospital,
  (req, res, next) => createUrgentRequest(req as CreateUrgentRequestRequest, res, next)
);

// GET /api/urgent-requests/hospital — hospital's own requests (HOSPITAL only)
router.get(
  '/hospital',
  protect,
  requireHospital,
  (req, res, next) => getHospitalRequests(req as AuthRequest, res, next)
);

// PUT /api/urgent-requests/:id/fulfill (HOSPITAL only)
router.put(
  '/:id/fulfill',
  protect,
  requireHospital,
  (req, res, next) => fulfillRequest(req as UrgentRequestParamsRequest, res, next)
);

// DELETE /api/urgent-requests/:id (HOSPITAL only)
router.delete(
  '/:id',
  protect,
  requireHospital,
  (req, res, next) => deleteRequest(req as UrgentRequestParamsRequest, res, next)
);

export default router;
