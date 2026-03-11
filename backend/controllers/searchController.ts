import { Response } from 'express';
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

const COOLDOWN_MS = 56 * 24 * 60 * 60 * 1000;

export const searchDonors = async (
  req: SearchDonorsRequest,
  res: Response
): Promise<void> => {
  const { bloodType, neighborhood, urgency } = req.body;

  if (!bloodType || !urgency) {
    res.status(400).json({ success: false, message: 'bloodType and urgency are required' });
    return;
  }

  const compatibleTypes = getCompatibleBloodTypes(bloodType);
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);

  const donors = await Donor.find({
    bloodType: { $in: compatibleTypes },
    eligibilityStatus: 'ELIGIBLE',
    availabilityStatus: true,
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

  res.json({ success: true, count: scored.length, data: scored });
};

export const revealContact = async (
  req: RevealContactRequest,
  res: Response
): Promise<void> => {
  const donor = await Donor.findById(req.params.donorId);

  if (!donor) {
    res.status(404).json({ success: false, message: 'Donor not found' });
    return;
  }

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
};
