import { Response, NextFunction, Request } from 'express';
import { validationResult } from 'express-validator';
import Donor from '../models/Donor';
import { AuthRequest } from '../middleware/auth';
import { CreateDonorRequest, UpdateDonorRequest } from '../types/donor';

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

    res.status(201).json({ success: true, donor });
  } catch (err) {
    next(err);
  }
};

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
    res.json({ success: true, donor });
  } catch (err) {
    next(err);
  }
};

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

    res.json({ success: true, donor });
  } catch (err) {
    next(err);
  }
};

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
    res.json({ success: true, donor });
  } catch (err) {
    next(err);
  }
};
