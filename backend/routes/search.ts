import { Router, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { searchDonors, revealContact, SearchDonorsRequest, RevealContactRequest } from '../controllers/searchController';

const router = Router();

function hospitalOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.userType !== 'HOSPITAL') {
    res.status(403).json({ success: false, message: 'Access restricted to hospitals' });
    return;
  }
  next();
}

router.post(
  '/donors',
  protect,
  hospitalOnly,
  (req, res) => searchDonors(req as SearchDonorsRequest, res)
);

router.post(
  '/reveal-contact/:donorId',
  protect,
  hospitalOnly,
  (req, res) => revealContact(req as RevealContactRequest, res)
);

export default router;
