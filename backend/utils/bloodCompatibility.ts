import { BloodType } from '../types/donor';

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

export function getCompatibleBloodTypes(requestedType: BloodType): BloodType[] {
  return compatibilityMap[requestedType];
}

export function isUniversalDonor(bloodType: BloodType): boolean {
  return bloodType === 'O-';
}
