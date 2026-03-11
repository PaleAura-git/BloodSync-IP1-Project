import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db';
import User, { IUser } from '../models/User';
import Hospital, { IHospital } from '../models/Hospital';

interface HospitalSeedEntry {
  user: {
    email: string;
    password: string;
    userType: 'HOSPITAL';
  };
  hospital: Omit<IHospital, keyof mongoose.Document | 'userId' | 'verificationStatus' | 'createdAt' | 'updatedAt'>;
}

const seedData: HospitalSeedEntry[] = [
  {
    user: {
      email: 'bloodbank@royalhospital.gov.om',
      password: 'RoyalHospital2024!',
      userType: 'HOSPITAL',
    },
    hospital: {
      hospitalName: 'Royal Hospital',
      contactPerson: 'Blood Bank Department',
      phone: '+96824543000',
      email: 'bloodbank@royalhospital.gov.om',
      address: 'Al Wutayyah, Muscat',
      neighborhood: 'Bausher',
      operatingHours: '24/7',
      licenseNumber: 'MOH-RH-001',
    },
  },
  {
    user: {
      email: 'transfusion@sqmc.gov.om',
      password: 'SQMC2024Secure!',
      userType: 'HOSPITAL',
    },
    hospital: {
      hospitalName: 'Sultan Qaboos Medical Centre (SQMC)',
      contactPerson: 'Transfusion Medicine Unit',
      phone: '+96824564567',
      email: 'transfusion@sqmc.gov.om',
      address: 'Al Khuwair, Muscat',
      neighborhood: 'Al Khuwair',
      operatingHours: '24/7',
      licenseNumber: 'MOH-SQMC-002',
    },
  },
  {
    user: {
      email: 'bloodservices@alnahdha.om',
      password: 'AlNahdha2024!',
      userType: 'HOSPITAL',
    },
    hospital: {
      hospitalName: 'Al Nahdha Hospital',
      contactPerson: 'Blood Services Department',
      phone: '+96824837800',
      email: 'bloodservices@alnahdha.om',
      address: 'Ruwi, Muscat',
      neighborhood: 'Ruwi',
      operatingHours: '8AM-8PM',
      licenseNumber: 'MOH-ANH-003',
    },
  },
];

async function seedHospitals(): Promise<void> {
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const entry of seedData) {
    const existingUser = await User.findOne({ email: entry.user.email });

    if (existingUser) {
      const existingHospital = await Hospital.findOne({ userId: existingUser._id });
      if (existingHospital) {
        console.log(`  [SKIP] ${entry.hospital.hospitalName} — already exists`);
        skipped++;
        continue;
      }

      // User exists but no hospital profile — create the profile only
      await Hospital.create({ userId: existingUser._id, ...entry.hospital });
      console.log(`  [CREATE] Hospital profile for existing user: ${entry.hospital.hospitalName}`);
      created++;
      continue;
    }

    // Create user and hospital profile together
    const user: IUser = await User.create(entry.user);
    await Hospital.create({ userId: user._id, ...entry.hospital });
    console.log(`  [CREATE] ${entry.hospital.hospitalName}`);
    created++;
  }

  console.log(`\nSeeding complete — created: ${created}, skipped: ${skipped}`);
  await mongoose.disconnect();
}

seedHospitals().catch((err: Error) => {
  console.error('Seeder failed:', err.message);
  process.exit(1);
});
