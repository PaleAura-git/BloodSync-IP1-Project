import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import {
  searchDonors,
  revealContact,
  SearchDonorsRequest,
  RevealContactRequest,
} from '../controllers/searchController';
import { searchDonorsValidation } from '../middleware/validators/searchValidator';

const router = Router();

/** Restricts a route to authenticated HOSPITAL accounts. */
function hospitalOnly(req: Request, res: Response, next: NextFunction): void {
  if ((req as AuthRequest).user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals' });
    return;
  }
  next();
}

// POST /api/search/donors — find and rank compatible donors (HOSPITAL only)
router.post(
  '/donors',
  protect,
  hospitalOnly,
  searchDonorsValidation,
  (req: Request, res: Response, next: NextFunction) =>
    searchDonors(req as SearchDonorsRequest, res, next)
);

// POST /api/search/reveal-contact/:donorId — reveal donor contact info (HOSPITAL only)
router.post(
  '/reveal-contact/:donorId',
  protect,
  hospitalOnly,
  (req: Request, res: Response, next: NextFunction) =>
    revealContact(req as RevealContactRequest, res, next)
);

export default router;
