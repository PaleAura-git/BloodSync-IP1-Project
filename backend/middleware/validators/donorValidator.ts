import { body } from 'express-validator';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const OMAN_PHONE_REGEX = /^\+968\d{8}$/;

export const createDonorValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),

  body('age')
    .isInt({ min: 18, max: 65 })
    .withMessage('Age must be between 18 and 65'),

  body('bloodType')
    .isIn(BLOOD_TYPES)
    .withMessage(`Blood type must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('phone')
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in format +968 followed by 8 digits'),

  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),

  body('neighborhood').trim().notEmpty().withMessage('Neighborhood is required'),

  body('weight')
    .isFloat({ min: 50 })
    .withMessage('Weight must be at least 50 kg'),

  body('medicalHistory')
    .optional()
    .isObject()
    .withMessage('Medical history must be an object'),
];

export const updateDonorValidation = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),

  body('phone')
    .optional()
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in format +968 followed by 8 digits'),

  body('neighborhood')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Neighborhood cannot be empty'),

  body('availabilityStatus')
    .optional()
    .isBoolean()
    .withMessage('availabilityStatus must be a boolean'),
];
