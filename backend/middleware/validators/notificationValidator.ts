import { body } from 'express-validator';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

/**
 * Validation rules for POST /api/notifications/send.
 *
 * `donorIds` is validated at two levels:
 * 1. The array itself must be non-empty (at least one recipient required).
 * 2. Each element must be a valid MongoDB ObjectId string — this prevents
 *    NoSQL injection attempts where a crafted string could be interpreted
 *    as a query operator if passed unvalidated to a find() call.
 *
 * `message` is capped at 1000 characters to keep notification payloads
 * manageable in the database and email templates.
 */
export const sendNotificationValidation = [
  body('donorIds')
    .isArray({ min: 1 })
    .withMessage('donorIds must be a non-empty array'),

  // Validate each element of the array — wildcard path syntax supported by express-validator
  body('donorIds.*')
    .isMongoId()
    .withMessage('Each entry in donorIds must be a valid ID'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('message is required')
    .isLength({ max: 1000 })
    .withMessage('message must not exceed 1000 characters'),

  body('notificationType')
    .isIn(['GENERAL', 'URGENT_REQUEST'])
    .withMessage("notificationType must be 'GENERAL' or 'URGENT_REQUEST'"),

  body('bloodTypeNeeded')
    .optional()
    .isIn(BLOOD_TYPES)
    .withMessage(`bloodTypeNeeded must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('unitsNeeded')
    .optional()
    // Must be a positive integer — fractional blood units are not meaningful
    .isInt({ min: 1, max: 100 })
    .withMessage('unitsNeeded must be a whole number between 1 and 100'),
];
