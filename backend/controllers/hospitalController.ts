import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import Hospital from '../models/Hospital';
import { AuthRequest } from '../middleware/auth';
import { CreateHospitalRequest, UpdateHospitalRequest } from '../types/hospital';

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
