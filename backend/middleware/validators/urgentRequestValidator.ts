import { body } from 'express-validator';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

/**
 * Validation rules for POST /api/urgent-requests.
 *
 * `unitsNeeded` is capped at 100 — a realistic upper bound for a hospital's
 * blood bank stock level. Values above this likely indicate a data entry error
 * and should not trigger mass notifications to hundreds of donors.
 *
 * `urgencyLevel` only accepts 'HIGH' or 'CRITICAL' — 'LOW' urgency requests
 * should go through the regular notification flow instead, which allows
 * targeted donor selection rather than a broadcast to all compatible donors.
 *
 * `reason` is optional but recommended: it appears verbatim in email
 * notifications so donors can make an informed decision. Capped at 500
 * characters to keep email content concise.
 */
export const createUrgentRequestValidation = [
  body('bloodType')
    .isIn(BLOOD_TYPES)
    .withMessage(`bloodType must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('unitsNeeded')
    .isInt({ min: 1, max: 100 })
    .withMessage('unitsNeeded must be a whole number between 1 and 100'),

  body('urgencyLevel')
    .isIn(['HIGH', 'CRITICAL'])
    .withMessage("urgencyLevel must be 'HIGH' or 'CRITICAL'"),

  body('reason')
    .optional()
    .trim()
    // Reason appears in donor emails — cap length to keep messages readable
    .isLength({ max: 500 })
    .withMessage('reason must not exceed 500 characters'),
];
