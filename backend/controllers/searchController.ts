import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Donor from '../models/Donor';
import { SearchCriteria, MatchScore } from '../types/matching';
import { getCompatibleBloodTypes } from '../utils/bloodCompatibility';
import { calculateMatchScore } from '../utils/matchingScore';
import { AuthRequest } from '../middleware/auth';

export interface SearchDonorsRequest extends AuthRequest {
  body: SearchCriteria;
}

export interface RevealContactRequest extends AuthRequest {
  params: { donorId: string };
}

/**
 * Minimum rest period between whole-blood donations (56 days = 8 weeks).
 * Donors who donated within this window are excluded from search results
 * to protect donor health and ensure blood quality.
 */
const COOLDOWN_MS = 56 * 24 * 60 * 60 * 1000;

/**
 * POST /api/search/donors
 *
 * Finds and ranks eligible donors who can fulfil a blood request.
 *
 * ## Query logic
 * 1. Expands the requested blood type to all compatible donor types using the
 *    ABO/Rh compatibility table (e.g., A+ can receive from O-, O+, A-, A+).
 * 2. Filters to donors who are: eligible, available, and outside the 56-day
 *    cooldown period.
 * 3. Scores each matching donor via `calculateMatchScore` (blood type match,
 *    proximity, recency, eligibility score, universal donor bonus).
 * 4. Returns results sorted by score descending.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @body `{ bloodType: BloodType, urgency: 'URGENT' | 'STANDARD', neighborhood?: string }`
 * @returns 200 `{ success, count: number, data: MatchScore[] }`
 * @returns 400 if validation fails.
 */
export const searchDonors = async (
  req: SearchDonorsRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    const { bloodType, neighborhood, urgency } = req.body;

    const compatibleTypes = getCompatibleBloodTypes(bloodType);
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);

    const donors = await Donor.find({
      bloodType: { $in: compatibleTypes },
      eligibilityStatus: 'ELIGIBLE',
      availabilityStatus: true,
      // Include donors who have never donated OR who are past the cooldown cutoff
      $or: [
        { lastDonationDate: null },
        { lastDonationDate: { $lt: cooldownCutoff } },
      ],
    });

    const scored: MatchScore[] = donors
      .map((donor) => ({
        donor,
        score: calculateMatchScore(donor, { bloodType, neighborhood, urgency }),
      }))
      .sort((a, b) => b.score - a.score);

    console.log(
      `[INFO] ${new Date().toISOString()} searchDonors — bloodType=${bloodType} urgency=${urgency} results=${scored.length}`
    );

    res.json({ success: true, count: scored.length, data: scored });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/search/reveal-contact/:donorId
 *
 * Reveals the full contact details of a specific donor to the requesting
 * hospital. Contact information (phone, email) is hidden in search results
 * by default; hospitals must explicitly request it for a chosen donor.
 *
 * This separation ensures donors are only contacted when a hospital has
 * made a deliberate decision to reach out, rather than having their details
 * exposed in bulk search results.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @param donorId - MongoDB ObjectId of the donor.
 * @returns 200 `{ success, data: { fullName, phone, email, neighborhood, bloodType } }`
 * @returns 404 if no donor with that ID exists.
 */
export const revealContact = async (
  req: RevealContactRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donor = await Donor.findById(req.params.donorId);

    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor not found' });
      return;
    }

    console.log(
      `[INFO] ${new Date().toISOString()} revealContact — donorId=${req.params.donorId} by hospitalUserId=${req.user?._id}`
    );

    res.json({
      success: true,
      data: {
        fullName: donor.fullName,
        phone: donor.phone,
        email: donor.email,
        neighborhood: donor.neighborhood,
        bloodType: donor.bloodType,
      },
    });
  } catch (err) {
    next(err);
  }
};
