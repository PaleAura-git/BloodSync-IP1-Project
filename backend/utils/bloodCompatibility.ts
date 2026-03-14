import { BloodType } from '../types/donor';

/**
 * ABO/Rh compatibility table: maps each recipient blood type to the set of
 * donor blood types that can safely transfuse into it.
 *
 * Rules:
 * - O- (universal donor) is compatible with every recipient.
 * - O+ can donate to all Rh+ recipients.
 * - A/B antigens must be absent in the donor if absent in the recipient.
 * - AB+ (universal recipient) can receive from everyone.
 *
 * Key: recipient blood type → Value: array of compatible donor blood types.
 */
const compatibilityMap: Record<BloodType, BloodType[]> = {
  'O-':  ['O-'],
  'O+':  ['O-', 'O+'],
  'A-':  ['O-', 'A-'],
  'A+':  ['O-', 'O+', 'A-', 'A+'],
  'B-':  ['O-', 'B-'],
  'B+':  ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

/**
 * Returns the list of donor blood types that are safe to transfuse into a
 * recipient with the given blood type.
 *
 * Used by the search and urgent-request flows to broaden donor queries beyond
 * an exact blood-type match (e.g., a patient needing A+ can receive O- or O+).
 *
 * @param requestedType - The recipient's (patient's) blood type.
 * @returns Array of compatible donor blood types, always including at least
 *   the exact type and O- (universal donor).
 */
export function getCompatibleBloodTypes(requestedType: BloodType): BloodType[] {
  return compatibilityMap[requestedType];
}

/**
 * Returns `true` when the given blood type is O-, the universal red-cell donor.
 *
 * O- lacks both A/B antigens and the Rh(D) antigen, so it can be given to any
 * recipient regardless of their blood type — critical in emergencies before
 * cross-matching is possible.
 *
 * Used in `calculateMatchScore` to award a bonus to O- donors when urgency is
 * URGENT, reflecting their higher real-world demand.
 *
 * @param bloodType - The donor's blood type.
 * @returns `true` if the donor is a universal donor, `false` otherwise.
 */
export function isUniversalDonor(bloodType: BloodType): boolean {
  return bloodType === 'O-';
}
