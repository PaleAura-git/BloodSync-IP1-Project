import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import Hospital from '../models/Hospital';
import { AuthRequest } from '../middleware/auth';
import { CreateHospitalRequest, UpdateHospitalRequest } from '../types/hospital';

/**
 * POST /api/hospitals
 *
 * Creates the hospital profile associated with the authenticated user account.
 * Each user may have at most one hospital profile (enforced by a unique index
 * on `userId`). Newly created profiles are unverified by default
 * (`verificationStatus: false`) and will not appear in the public directory
 * until an admin verifies them.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @body `CreateHospitalRequest` — hospitalName, contactPerson, phone, email,
 *   address, neighborhood, operatingHours, optional licenseNumber.
 * @returns 201 `{ success, hospital: IHospital }`
 * @returns 400 if validation fails or a profile already exists for this user.
 */
export const createHospital = async (
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

    const existing = await Hospital.findOne({ userId: req.user!._id });
    if (existing) {
      res.status(400).json({ success: false, message: 'Hospital profile already exists for this user' });
      return;
    }

    const body = req.body as CreateHospitalRequest;

    const hospital = await Hospital.create({
      userId: req.user!._id,
      hospitalName: body.hospitalName,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      address: body.address,
      neighborhood: body.neighborhood,
      operatingHours: body.operatingHours,
      ...(body.licenseNumber ? { licenseNumber: body.licenseNumber } : {}),
    });

    res.status(201).json({ success: true, hospital });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospitals/me
 *
 * Returns the authenticated hospital's own full profile, including fields
 * (e.g., verificationStatus) not visible in the public directory.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @returns 200 `{ success, hospital: IHospital }`
 * @returns 404 if no hospital profile exists for the authenticated user.
 */
export const getHospitalProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user!._id });
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }
    res.json({ success: true, hospital });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/hospitals/me
 *
 * Updates mutable operational fields on the authenticated hospital's profile.
 * hospitalName and licenseNumber cannot be changed after creation.
 *
 * @auth Required — Bearer JWT, userType must be HOSPITAL.
 * @body `UpdateHospitalRequest` — any subset of: contactPerson, phone,
 *   address, operatingHours.
 * @returns 200 `{ success, hospital: IHospital }`
 * @returns 404 if the hospital profile does not exist.
 */
export const updateHospitalProfile = async (
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

    const { contactPerson, phone, address, operatingHours } = req.body as UpdateHospitalRequest;

    // Build the update object from only the provided fields
    const updates: UpdateHospitalRequest = {};
    if (contactPerson !== undefined) updates.contactPerson = contactPerson;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (operatingHours !== undefined) updates.operatingHours = operatingHours;

    const hospital = await Hospital.findOneAndUpdate(
      { userId: req.user!._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    res.json({ success: true, hospital });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospitals
 *
 * Returns a list of all verified hospitals for the public directory.
 * Only verified hospitals (`verificationStatus: true`) are included to
 * prevent unreviewed registrations from being contacted by donors.
 * Sensitive fields (userId, licenseNumber) are excluded from the response.
 *
 * @auth None — public endpoint.
 * @returns 200 `{ success, hospitals: Array<{ hospitalName, address, neighborhood, phone, operatingHours }> }`
 */
export const getHospitalDirectory: RequestHandler = async (_req, res, next) => {
  try {
    const hospitals = await Hospital.find({ verificationStatus: true }).select(
      'hospitalName address neighborhood phone operatingHours'
    );
    res.json({ success: true, hospitals });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/hospitals/:id
 *
 * Returns a specific hospital's full profile by MongoDB ObjectId.
 *
 * @auth Required — Bearer JWT (any user type).
 * @param id - MongoDB ObjectId of the hospital.
 * @returns 200 `{ success, hospital: IHospital }`
 * @returns 404 if no hospital with that ID exists.
 */
export const getHospitalById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital not found' });
      return;
    }
    res.json({ success: true, hospital });
  } catch (err) {
    next(err);
  }
};
