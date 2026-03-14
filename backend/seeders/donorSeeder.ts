import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import connectDB from '../config/db';
import User from '../models/User';
import Donor from '../models/Donor';
import { neighborhoods } from '../config/neighborhoods';
import { generateRandomName, nameToEmailSlug } from '../utils/nameGenerator';
import { BloodType, EligibilityStatus } from '../types/donor';

// ─── Blood type distribution ─────────────────────────────────────────────────

interface BloodTypeEntry {
  type: BloodType;
  count: number;
}

const BLOOD_TYPE_DISTRIBUTION: BloodTypeEntry[] = [
  { type: 'O+',  count: 193 },
  { type: 'A+',  count: 154 },
  { type: 'B+',  count: 110 },
  { type: 'O-',  count:  39 },
  { type: 'A-',  count:  33 },
  { type: 'AB+', count:  28 },
  { type: 'B-',  count:  22 },
  { type: 'AB-', count:   6 },
];

const TOTAL = BLOOD_TYPE_DISTRIBUTION.reduce((sum, e) => sum + e.count, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function buildBloodTypePool(): BloodType[] {
  const pool: BloodType[] = [];
  for (const entry of BLOOD_TYPE_DISTRIBUTION) {
    for (let i = 0; i < entry.count; i++) pool.push(entry.type);
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── Donor data builder ───────────────────────────────────────────────────────

interface UserDoc {
  email: string;
  password: string;
  userType: 'DONOR';
  isActive: boolean;
}

interface DonorDoc {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  age: number;
  bloodType: BloodType;
  phone: string;
  email: string;
  neighborhood: string;
  lastDonationDate: Date | null;
  eligibilityStatus: EligibilityStatus;
  eligibilityScore: number;
  availabilityStatus: boolean;
  blockReason: string | null;
  blockExpiryDate: Date | null;
  weight: number;
  medicalHistory: Record<string, unknown>;
  isContactVisible: boolean;
}

const BLOCK_REASONS = [
  'Recent travel',
  'Low hemoglobin',
  'Recent medication',
  'Post-donation cooldown',
  'Chronic condition',
];

function buildDonorDoc(
  userId: mongoose.Types.ObjectId,
  fullName: string,
  email: string,
  bloodType: BloodType,
  neighborhoodIndex: number
): DonorDoc {
  // Eligibility
  const eligibilityRoll = Math.random();
  let eligibilityStatus: EligibilityStatus;
  if (eligibilityRoll < 0.80) {
    eligibilityStatus = 'ELIGIBLE';
  } else if (eligibilityRoll < 0.95) {
    eligibilityStatus = 'TEMPORARILY_BLOCKED';
  } else {
    eligibilityStatus = 'PERMANENTLY_BLOCKED';
  }

  const eligibilityScore =
    eligibilityStatus === 'ELIGIBLE'             ? randInt(70, 100) :
    eligibilityStatus === 'TEMPORARILY_BLOCKED'  ? randInt(40, 70)  : 0;

  // Last donation date
  const donationRoll = Math.random();
  let lastDonationDate: Date | null = null;
  if (donationRoll >= 0.60 && donationRoll < 0.90) {
    lastDonationDate = daysAgo(randInt(90, 365));  // 30% — past cooldown
  } else if (donationRoll >= 0.90) {
    lastDonationDate = daysAgo(randInt(30, 89));   // 10% — in cooldown
  }

  // Block info
  const blockReason = eligibilityStatus !== 'ELIGIBLE'
    ? BLOCK_REASONS[Math.floor(Math.random() * BLOCK_REASONS.length)]
    : null;

  const blockExpiryDate = eligibilityStatus === 'TEMPORARILY_BLOCKED'
    ? daysFromNow(randInt(7, 90))
    : null;

  return {
    userId,
    fullName,
    age: randInt(18, 65),
    bloodType,
    phone: `+9689${randInt(1000000, 9999999)}`,
    email,
    neighborhood: neighborhoods[neighborhoodIndex % neighborhoods.length],
    lastDonationDate,
    eligibilityStatus,
    eligibilityScore,
    availabilityStatus: Math.random() < 0.90,
    blockReason,
    blockExpiryDate,
    weight: randInt(50, 95),
    medicalHistory: {},
    isContactVisible: false,
  };
}

// ─── Main seeder ─────────────────────────────────────────────────────────────

async function seedDonors(): Promise<void> {
  await connectDB();

  const existingCount = await Donor.countDocuments();

  if (existingCount > 0) {
    console.log(`\n⚠️  Found ${existingCount} existing donor(s) in the database.`);
    const answer = await prompt('Clear existing donors and reseed? (yes/no): ');

    if (answer !== 'yes' && answer !== 'y') {
      console.log('Seeding cancelled.');
      await mongoose.disconnect();
      return;
    }

    console.log('Clearing existing donors and their user accounts...');
    const existingDonors = await Donor.find({}, { userId: 1 });
    const userIds = existingDonors.map((d) => d.userId);
    await Donor.deleteMany({});
    await User.deleteMany({ _id: { $in: userIds }, userType: 'DONOR' });
    console.log(`Cleared ${existingCount} donor(s).\n`);
  }

  console.log(`Generating ${TOTAL} donors...\n`);

  // Pre-hash password once — insertMany bypasses pre-save hooks
  const hashedPassword = await bcrypt.hash('password123', 10);

  const bloodTypePool = buildBloodTypePool();

  const userDocs: UserDoc[] = [];
  const donorDocs: DonorDoc[] = [];

  // Track emails for uniqueness
  const usedEmails = new Set<string>();

  for (let i = 0; i < TOTAL; i++) {
    const fullName = generateRandomName();
    const bloodType = bloodTypePool[i];

    // Generate unique email
    let email: string;
    let attempts = 0;
    do {
      const slug = nameToEmailSlug(fullName);
      const suffix = randInt(1, 9999);
      email = `${slug}${suffix}@email.com`;
      attempts++;
      if (attempts > 20) email = `donor${Date.now()}${i}@email.com`; // fallback
    } while (usedEmails.has(email));
    usedEmails.add(email);

    const userId = new mongoose.Types.ObjectId();

    userDocs.push({
      _id: userId,
      email,
      password: hashedPassword,
      userType: 'DONOR',
      isActive: true,
    } as UserDoc & { _id: mongoose.Types.ObjectId });

    donorDocs.push(buildDonorDoc(userId, fullName, email, bloodType, i));

    if ((i + 1) % 50 === 0 || i + 1 === TOTAL) {
      console.log(`  [${i + 1}/${TOTAL}] Generated ${i + 1} donors...`);
    }
  }

  // Batch insert
  console.log('\nInserting users...');
  await User.insertMany(userDocs, { ordered: false });

  console.log('Inserting donor profiles...');
  await Donor.insertMany(donorDocs, { ordered: false });

  // ─── Final report ─────────────────────────────────────────────────────────

  const finalCount = await Donor.countDocuments();

  console.log('\n─────────────────────────────────────────');
  console.log(`✓ Seeding complete — ${finalCount} donors inserted`);
  console.log('─────────────────────────────────────────');
  console.log('\nBlood Type Distribution:');

  for (const entry of BLOOD_TYPE_DISTRIBUTION) {
    const actual = await Donor.countDocuments({ bloodType: entry.type });
    const pct = ((actual / finalCount) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(Number(pct) / 2));
    console.log(`  ${entry.type.padEnd(4)}  ${String(actual).padStart(3)} donors  (${pct}%)  ${bar}`);
  }

  console.log('\nEligibility Status:');
  const eligible   = await Donor.countDocuments({ eligibilityStatus: 'ELIGIBLE' });
  const tempBlock  = await Donor.countDocuments({ eligibilityStatus: 'TEMPORARILY_BLOCKED' });
  const permBlock  = await Donor.countDocuments({ eligibilityStatus: 'PERMANENTLY_BLOCKED' });
  console.log(`  ELIGIBLE:             ${eligible} (${((eligible / finalCount) * 100).toFixed(1)}%)`);
  console.log(`  TEMPORARILY_BLOCKED:  ${tempBlock} (${((tempBlock / finalCount) * 100).toFixed(1)}%)`);
  console.log(`  PERMANENTLY_BLOCKED:  ${permBlock} (${((permBlock / finalCount) * 100).toFixed(1)}%)`);

  console.log('\nNeighborhood spread:');
  for (const hood of neighborhoods) {
    const count = await Donor.countDocuments({ neighborhood: hood });
    console.log(`  ${hood.padEnd(25)} ${count}`);
  }

  console.log('─────────────────────────────────────────\n');
  await mongoose.disconnect();
}

seedDonors().catch((err: Error) => {
  console.error('Seeder failed:', err.message);
  process.exit(1);
});
