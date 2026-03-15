import { body } from 'express-validator';

/**
 * Validation rules for POST /api/auth/register.
 *
 * All three fields are required — none can be absent or empty.
 * Password length is capped at 128 characters to prevent bcrypt DoS:
 * bcrypt silently truncates inputs over 72 bytes but hashing very long
 * strings is computationally expensive and can be exploited for denial-of-service.
 */
export const registerValidation = [
  body('email')
    .trim()
    // Standard RFC 5322 email format check
    .isEmail()
    .withMessage('A valid email address is required')
    // Normalise to lowercase and remove sub-addressing (e.g. user+tag@gmail.com → user@gmail.com)
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),

  body('userType')
    // Only two valid roles exist — reject anything else at the edge
    .isIn(['DONOR', 'HOSPITAL'])
    .withMessage('userType must be either DONOR or HOSPITAL'),
];

/**
 * Validation rules for POST /api/auth/login.
 *
 * Minimal validation — just presence checks. Detailed credential validation
 * (wrong password, unknown email) is handled by the controller to avoid
 * leaking which part of the credentials is wrong (user enumeration prevention).
 */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];
