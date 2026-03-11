import { body } from 'express-validator';

const OMAN_PHONE_REGEX = /^\+968\d{8}$/;

export const createHospitalValidation = [
  body('hospitalName').trim().notEmpty().withMessage('Hospital name is required'),

  body('contactPerson').trim().notEmpty().withMessage('Contact person is required'),

  body('phone')
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in format +968 followed by 8 digits'),

  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),

  body('address').trim().notEmpty().withMessage('Address is required'),

  body('neighborhood').trim().notEmpty().withMessage('Neighborhood is required'),

  body('operatingHours').trim().notEmpty().withMessage('Operating hours are required'),

  body('licenseNumber').optional().trim(),
];

export const updateHospitalValidation = [
  body('contactPerson').optional().trim().notEmpty().withMessage('Contact person cannot be empty'),

  body('phone')
    .optional()
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in format +968 followed by 8 digits'),

  body('address').optional().trim().notEmpty().withMessage('Address cannot be empty'),

  body('operatingHours').optional().trim().notEmpty().withMessage('Operating hours cannot be empty'),
];
