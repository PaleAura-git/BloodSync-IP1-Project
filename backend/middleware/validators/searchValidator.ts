import { body } from 'express-validator';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

/**
 * Validation rules for POST /api/search/donors.
 *
 * `bloodType` and `urgency` are required to perform a meaningful search:
 * - `bloodType` drives the compatibility expansion (e.g. A+ → O-, O+, A-, A+).
 * - `urgency` affects match scoring — URGENT requests apply the universal
 *   donor bonus to O- donors.
 *
 * `neighborhood` is optional; omitting it means all neighborhoods are
 * considered equally (donors receive the lower 10-pt proximity score instead
 * of the 30-pt same-neighborhood score).
 */
export const searchDonorsValidation = [
  body('bloodType')
    .isIn(BLOOD_TYPES)
    .withMessage(`bloodType must be one of: ${BLOOD_TYPES.join(', ')}`),

  body('urgency')
    .isIn(['URGENT', 'STANDARD'])
    .withMessage("urgency must be either 'URGENT' or 'STANDARD'"),

  body('neighborhood')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('neighborhood must not exceed 100 characters'),
];
