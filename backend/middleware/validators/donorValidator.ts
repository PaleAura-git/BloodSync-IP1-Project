import { body } from 'express-validator';

/**
 * Valid ABO/Rh blood type strings accepted by the system.
 * These must match the enum defined in the Donor Mongoose schema.
 */
const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

/**
 * Oman national phone number format: country code +968 followed by exactly
 * 8 digits. Omani mobile numbers start with 9; landlines start with 2.
 * Example valid values: +96891234567, +96824123456
 */
const OMAN_PHONE_REGEX = /^\+968\d{8}$/;

/**
 * Allowed characters in a person's full name: letters (including Unicode for
 * Arabic names), spaces, hyphens (compound surnames), and apostrophes
 * (e.g., O'Brien). Digits and special characters are rejected.
 */
const FULL_NAME_REGEX = /^[\p{L}\s'-]+$/u;

/**
 * Validation rules for POST /api/donors (create donor profile).
 *
 * All fields are required at creation time. Blood type and age cannot be
 * changed after creation (medical safety), so they are validated strictly here.
 *
 * Age range 18–65:
 * - Minimum 18: legal consent and physiological maturity requirement.
 * - Maximum 65: WHO guideline; older donors face higher adverse-event risk.
 *
 * Weight minimum 50 kg:
 * - Below this threshold a standard 450 mL whole-blood draw can cause
 *   hypovolaemic reactions (WHO guideline).
 */
export const createDonorValidation = [
  body('fullName')
    .trim()
    // Reject whitespace-only strings (e.g. "   ") that pass notEmpty after trim
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    // Prevent digits or symbols from being submitted as a name
    .matches(FULL_NAME_REGEX)
    .withMessage('Full name may only contain letters, spaces, hyphens, and apostrophes'),

  body('age')
    // Must be a whole number — fractional ages are ambiguous
    .isInt({ min: 18, max: 65 })
    .withMessage('Donor must be between 18 and 65 years old'),

  body('bloodType')
    .isIn(BLOOD_TYPES)
    .withMessage(`Blood type must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('phone')
    // Oman country-code format required for SMS delivery and local contacts
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in Oman format: +968 followed by 8 digits (e.g. +96891234567)'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  body('neighborhood')
    .trim()
    .notEmpty()
    .withMessage('Neighborhood is required')
    .isLength({ max: 100 })
    .withMessage('Neighborhood name must not exceed 100 characters'),

  body('weight')
    // WHO minimum for whole-blood donation; max 300 is a sanity cap
    .isFloat({ min: 50, max: 300 })
    .withMessage('Weight must be at least 50 kg (WHO minimum for blood donation)'),

  body('medicalHistory')
    .optional()
    // medicalHistory stores quiz answers (question ID → boolean) — must be an object
    .isObject()
    .withMessage('medicalHistory must be a key-value object'),
];

/**
 * Validation rules for PUT /api/donors/profile (update donor profile).
 *
 * Only mutable fields can be updated. Blood type, age, and eligibility fields
 * are intentionally excluded — they require controlled flows (quiz for
 * eligibility, medical verification for blood type).
 */
export const updateDonorValidation = [
  body('fullName')
    .optional()
    .trim()
    // Guard against sending an empty string to clear the name
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(FULL_NAME_REGEX)
    .withMessage('Full name may only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional()
    .matches(OMAN_PHONE_REGEX)
    .withMessage('Phone must be in Oman format: +968 followed by 8 digits (e.g. +96891234567)'),

  body('neighborhood')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Neighborhood cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Neighborhood name must not exceed 100 characters'),

  body('availabilityStatus')
    .optional()
    // Must be a strict boolean, not a truthy string — prevents "true" (string) from being accepted
    .isBoolean({ strict: true })
    .withMessage('availabilityStatus must be a boolean (true or false)'),
];
