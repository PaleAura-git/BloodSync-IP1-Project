import { body } from 'express-validator';

/**
 * Oman national phone number format: country code +968 followed by exactly
 * 8 digits. Must match the same regex used in donorValidator for consistency.
 */
const OMAN_PHONE_REGEX = /^\+968\d{8}$/;

/**
 * Validation rules for POST /api/hospitals (create hospital profile).
 *
 * All required fields must be present and non-empty. `licenseNumber` is
 * optional — some facilities register before receiving their official licence.
 */
export const createHospitalValidation = [
  body('hospitalName')
    .trim()
    .notEmpty()
    .withMessage('Hospital name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Hospital name must be between 2 and 200 characters'),

  body('contactPerson')
    .trim()
    .notEmpty()
    .withMessage('Contact person name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person name must be between 2 and 100 characters'),

  body('phone')
    // Oman country-code format required
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in Oman format: +968 followed by 8 digits (e.g. +96891234567)'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),

  body('neighborhood')
    .trim()
    .notEmpty()
    .withMessage('Neighborhood is required')
    .isLength({ max: 100 })
    .withMessage('Neighborhood must not exceed 100 characters'),

  body('operatingHours')
    .trim()
    .notEmpty()
    .withMessage('Operating hours are required')
    .isLength({ max: 200 })
    .withMessage('Operating hours description must not exceed 200 characters'),

  body('licenseNumber')
    .optional()
    .trim()
    // Licence numbers are alphanumeric; spaces and hyphens common in Omani formats
    .isLength({ max: 50 })
    .withMessage('Licence number must not exceed 50 characters'),
];

/**
 * Validation rules for PUT /api/hospitals/profile (update hospital profile).
 *
 * Only operational fields can be updated. `hospitalName`, `email`, and
 * `licenseNumber` are locked after creation — changes require admin review.
 */
export const updateHospitalValidation = [
  body('contactPerson')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact person cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in Oman format: +968 followed by 8 digits (e.g. +96891234567)'),

  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty')
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),

  body('operatingHours')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Operating hours cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Operating hours description must not exceed 200 characters'),
];
