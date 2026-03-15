import { body } from 'express-validator';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

/**
 * Validation rules for POST /api/donations (schedule a donation).
 *
 * `donorId` and `notificationId` are validated as MongoDB ObjectIds to
 * prevent injection via malformed ID strings in downstream find() calls.
 *
 * `donationDate` must be a valid ISO 8601 datetime. Scheduling in the past
 * is permitted because hospitals sometimes record donations retroactively
 * after a walk-in; the business-logic cooldown check in the controller
 * uses `lastDonationDate`, not `donationDate`.
 *
 * `unitsDonated` is capped at 10 — a standard whole-blood donation is 1 unit
 * (450 mL); apheresis can yield 2; values above 10 likely indicate data entry
 * errors rather than legitimate multi-unit collections.
 */
export const scheduleDonationValidation = [
  body('donorId')
    .notEmpty()
    .withMessage('donorId is required')
    // Prevent NoSQL injection through malformed ObjectId strings
    .isMongoId()
    .withMessage('donorId must be a valid ID'),

  body('donationDate')
    .notEmpty()
    .withMessage('donationDate is required')
    .isISO8601()
    .withMessage('donationDate must be a valid ISO 8601 date (e.g. 2025-06-15T09:00:00Z)')
    // Convert the validated string to a Date object for the controller
    .toDate(),

  body('bloodType')
    .isIn(BLOOD_TYPES)
    .withMessage(`bloodType must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('unitsDonated')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('unitsDonated must be a whole number between 1 and 10'),

  body('notificationId')
    .optional()
    // Validate format to prevent injecting an arbitrary string into a findById call
    .isMongoId()
    .withMessage('notificationId must be a valid ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('notes must not exceed 500 characters'),
];

/**
 * Validation rules for PUT /api/donations/:id/complete.
 *
 * Only `notes` is accepted in the request body — all other state transitions
 * (status, confirmedAt, lastDonationDate) are set by the controller.
 */
export const completeDonationValidation = [
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('notes must not exceed 500 characters'),
];
