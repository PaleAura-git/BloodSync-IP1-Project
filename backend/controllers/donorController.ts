import { Response, NextFunction, Request } from 'express';
import { validationResult } from 'express-validator';
import Donor from '../models/Donor';
import { AuthRequest } from '../middleware/auth';
import { CreateDonorRequest, UpdateDonorRequest } from '../types/donor';
import { transformDonor } from '../utils/transforms';

/**
 * POST /api/donors
 *
 * Creates the donor profile associated with the authenticated user account.
 * Each user may have at most one donor profile (enforced by a unique index on
 * `userId`). The profile is created with `eligibilityStatus: 'ELIGIBLE'` and
 * must be updated via the quiz endpoint to reflect actual medical eligibility.
 *
 * @auth Required — Bearer JWT, userType must be DONOR.
 * @body `CreateDonorRequest` — fullName, age, bloodType, phone, email,
 *   neighborhood, weight, optional medicalHistory.
 * @returns 201 `{ success, donor: IDonor }`
 * @returns 400 if validation fails or a profile already exists for this user.
 */
export const createDonor = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    const existing = await Donor.findOne({ userId: req.user!._id });
    if (existing) {
      res.status(400).json({ success: false, message: 'Donor profile already exists for this user' });
      return;
    }

    const body = req.body as CreateDonorRequest;

    const donor = await Donor.create({
      userId: req.user!._id,
      fullName: body.fullName,
      age: body.age,
      bloodType: body.bloodType,
      phone: body.phone,
      email: body.email,
      neighborhood: body.neighborhood,
      weight: body.weight,
      medicalHistory: body.medicalHistory ?? {},
    });

    res.status(201).json({ success: true, data: transformDonor(donor) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/donors/me
 *
 * Returns the authenticated donor's own profile, including eligibility
 * status, block details, and last donation date.
 *
 * @auth Required — Bearer JWT, userType must be DONOR.
 * @returns 200 `{ success, donor: IDonor }`
 * @returns 404 if no donor profile exists for the authenticated user.
 */
export const getDonorProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donor = await Donor.findOne({ userId: req.user!._id });
    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor profile not found' });
      return;
    }
    res.json({ success: true, data: transformDonor(donor) });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/donors/me
 *
 * Updates mutable fields on the authenticated donor's profile.
 * Blood type and age cannot be changed after creation (medical/safety reasons).
 * Eligibility fields are updated exclusively through the quiz endpoint.
 *
 * @auth Required — Bearer JWT, userType must be DONOR.
 * @body `UpdateDonorRequest` — any subset of: fullName, phone, neighborhood,
 *   availabilityStatus.
 * @returns 200 `{ success, donor: IDonor }`
 * @returns 404 if the donor profile does not exist.
 */
export const updateDonorProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, message: errors.array()[0].msg });
      return;
    }

    const { fullName, phone, neighborhood, availabilityStatus } = req.body as UpdateDonorRequest;

    // Build the update object from only the provided fields to avoid
    // accidentally overwriting fields with undefined
    const updates: UpdateDonorRequest = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (neighborhood !== undefined) updates.neighborhood = neighborhood;
    if (availabilityStatus !== undefined) updates.availabilityStatus = availabilityStatus;

    const donor = await Donor.findOneAndUpdate(
      { userId: req.user!._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor profile not found' });
      return;
    }

    res.json({ success: true, data: transformDonor(donor) });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/donors/me/availability
 *
 * Toggles the donor's `availabilityStatus` between true and false.
 * Donors marked unavailable (`false`) are excluded from all search results,
 * giving them a simple way to pause without failing the eligibility quiz.
 *
 * @auth Required — Bearer JWT, userType must be DONOR.
 * @returns 200 `{ success, availabilityStatus: boolean }`
 * @returns 404 if the donor profile does not exist.
 *
 * Side effect: persists the new availability value to MongoDB.
 */
export const toggleAvailability = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donor = await Donor.findOne({ userId: req.user!._id });
    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor profile not found' });
      return;
    }

    donor.availabilityStatus = !donor.availabilityStatus;
    await donor.save();

    res.json({ success: true, availabilityStatus: donor.availabilityStatus });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/donors/:id
 *
 * Returns a specific donor's public profile by MongoDB ObjectId.
 * Used by hospital staff to view a donor's details after finding them
 * through the search endpoint.
 *
 * @auth Required — Bearer JWT (any user type).
 * @param id - MongoDB ObjectId of the donor.
 * @returns 200 `{ success, donor: IDonor }`
 * @returns 404 if no donor with that ID exists.
 */
export const getDonorById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) {
      res.status(404).json({ success: false, message: 'Donor not found' });
      return;
    }
    res.json({ success: true, data: transformDonor(donor) });
  } catch (err) {
    next(err);
  }
};
