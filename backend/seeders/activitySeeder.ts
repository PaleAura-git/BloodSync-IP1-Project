/**
 * activitySeeder.ts — full demo dataset
 *
 * Seeds every collection that the frontend touches post-login so every page
 * shows rich, realistic data for all three hospitals and a broad donor pool.
 *
 * Collections written:
 *   donations       — 200+ records across all statuses & hospitals
 *   urgentrequests  — 18 records (active / fulfilled / expired)
 *   notifications   — 24 records (urgent + general, read + unread)
 *
 * Donor.lastDonationDate + Donor.totalDonations updated from actual history.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

import Donor from '../models/Donor'
import Hospital from '../models/Hospital'
import Donation from '../models/Donation'
import UrgentRequest from '../models/UrgentRequest'
import Notification from '../models/Notification'

// ─── helpers ────────────────────────────────────────────────────────────────

const day = 86_400_000

function daysAgo(n: number, jitterH = 0) {
  return new Date(Date.now() - n * day - Math.random() * jitterH * 3_600_000)
}
function daysFromNow(n: number, jitterH = 0) {
  return new Date(Date.now() + n * day + Math.random() * jitterH * 3_600_000)
}
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

// Which donor blood types can donate to a given hospital need
const COMPATIBLE: Record<string, string[]> = {
  'O-':  ['O-'],
  'O+':  ['O-', 'O+'],
  'A-':  ['O-', 'A-'],
  'A+':  ['O-', 'O+', 'A-', 'A+'],
  'B-':  ['O-', 'B-'],
  'B+':  ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
}

function donorsForType(donors: any[], bt: string, n: number) {
  const pool = donors.filter(d => COMPATIBLE[bt]?.includes(d.bloodType))
  return pool.sort(() => Math.random() - 0.5).slice(0, n)
}

// ─── main ───────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodsync')
  console.log('Connected.')

  await Donation.deleteMany({})
  await UrgentRequest.deleteMany({})
  await Notification.deleteMany({})
  // Reset all donor totals so stale counts from a previous run don't persist
  await Donor.updateMany({}, { $set: { totalDonations: 0, lastDonationDate: null } })
  console.log('Cleared existing activity data.')

  const hospitals = await Hospital.find({})
  if (hospitals.length < 1) throw new Error('No hospitals — run hospitalSeeder first')

  const royal    = hospitals.find(h => h.hospitalName.includes('Royal'))    ?? hospitals[0]
  const sqmc     = hospitals.find(h => h.hospitalName.includes('SQMC') || h.hospitalName.includes('Sultan')) ?? hospitals[1] ?? hospitals[0]
  const alnahdha = hospitals.find(h => h.hospitalName.includes('Nahdha')) ?? hospitals[2] ?? hospitals[0]

  console.log('  Royal:   ', royal.hospitalName)
  console.log('  SQMC:    ', sqmc.hospitalName)
  console.log('  Nahdha:  ', alnahdha.hospitalName)

  const donors = await Donor.find({ eligibilityStatus: 'ELIGIBLE' }).limit(300)
  if (donors.length < 10) throw new Error('Too few eligible donors — run donorSeeder first')
  console.log(`Seeding with ${hospitals.length} hospitals, ${donors.length} donors…`)

  // ── 1. DONATIONS ──────────────────────────────────────────────────────────
  //
  // Mix of COMPLETED (past) and SCHEDULED (upcoming) across all hospitals.
  // Times are set so upcoming donations have realistic hours (08:00–16:00).

  const donations: any[] = []
  const donorLastDonation = new Map<string, Date>()
  const donorDonationCount = new Map<string, number>()

  function addDonation(donor: any, hospital: any, daysBack: number, status: 'COMPLETED' | 'SCHEDULED' | 'CANCELLED', notes?: string) {
    const donationDate = daysBack < 0
      ? daysFromNow(-daysBack, 2)   // upcoming — positive offset
      : daysAgo(daysBack, 4)        // past — slight jitter
    const isCompleted = status === 'COMPLETED'

    donations.push({
      donorId:      donor._id,
      hospitalId:   hospital._id,
      donationDate,
      bloodType:    donor.bloodType,
      unitsDonated: 1,
      status,
      confirmedAt:  isCompleted ? donationDate : undefined,
      notes:        notes ?? (isCompleted ? rand([
        'Routine whole blood donation. No complications.',
        'Walk-in donor. Smooth process, released in good condition.',
        'Responded to urgent broadcast. Donated without issues.',
        'Regular donor, 4th visit this year.',
        'First-time donor. Tolerated well.',
        '',
      ]) : undefined),
      createdAt: daysAgo(daysBack > 0 ? daysBack + randInt(1, 5) : 1),
      updatedAt:  new Date(),
    })

    if (isCompleted) {
      const id = donor._id.toString()
      const prev = donorLastDonation.get(id)
      if (!prev || donationDate > prev) donorLastDonation.set(id, donationDate as Date)
      donorDonationCount.set(id, (donorDonationCount.get(id) ?? 0) + 1)
    }
  }

  // — Royal Hospital: high-volume trauma centre —
  const royalGroups = [
    { bt: 'O-', need: 20, hospital: royal },
    { bt: 'A+', need: 18, hospital: royal },
    { bt: 'B+', need: 12, hospital: royal },
    { bt: 'AB+', need: 8, hospital: royal },
    { bt: 'O+', need: 14, hospital: royal },
  ]

  // — SQMC: teaching hospital, steady throughput —
  const sqmcGroups = [
    { bt: 'O+', need: 16, hospital: sqmc },
    { bt: 'A-', need: 10, hospital: sqmc },
    { bt: 'B-', need: 8,  hospital: sqmc },
    { bt: 'O-', need: 12, hospital: sqmc },
    { bt: 'AB-', need: 6, hospital: sqmc },
  ]

  // — Al Nahdha: mid-size, more scheduled electives —
  const alnadhaGroups = [
    { bt: 'A+', need: 12, hospital: alnahdha },
    { bt: 'B+', need: 9,  hospital: alnahdha },
    { bt: 'O+', need: 10, hospital: alnahdha },
    { bt: 'O-', need: 7,  hospital: alnahdha },
  ]

  for (const { bt, need, hospital } of [...royalGroups, ...sqmcGroups, ...alnadhaGroups]) {
    const group = donorsForType(donors, bt, need)
    for (const donor of group) {
      // Most donors have 1-4 completed donations spread over the past year
      const donationCount = randInt(1, 4)
      for (let i = 0; i < donationCount; i++) {
        const daysBack = randInt(57 + i * 56, 365) // spaced at least 56d apart
        addDonation(donor, hospital, daysBack, 'COMPLETED')
      }
      // ~20% also have a cancelled donation in their history
      if (Math.random() < 0.2) {
        addDonation(donor, hospital, randInt(20, 100), 'CANCELLED', 'Donor cancelled due to personal reasons.')
      }
    }
  }

  // Upcoming scheduled appointments (next 2 weeks) — what shows on hospital dashboard
  const upcomingSlots = [
    { bt: 'O-',  hospital: royal,    n: 6 },
    { bt: 'A+',  hospital: royal,    n: 5 },
    { bt: 'B+',  hospital: royal,    n: 4 },
    { bt: 'O+',  hospital: sqmc,     n: 6 },
    { bt: 'AB-', hospital: sqmc,     n: 3 },
    { bt: 'A-',  hospital: sqmc,     n: 4 },
    { bt: 'A+',  hospital: alnahdha, n: 5 },
    { bt: 'B+',  hospital: alnahdha, n: 3 },
    { bt: 'O-',  hospital: alnahdha, n: 3 },
  ]

  for (const { bt, hospital, n } of upcomingSlots) {
    const group = donorsForType(donors, bt, n)
    for (let i = 0; i < group.length; i++) {
      const daysAhead = randInt(1, 14)
      addDonation(group[i], hospital, -daysAhead, 'SCHEDULED')
    }
  }

  const insertedDonations = await Donation.insertMany(donations)
  console.log(`  Inserted ${insertedDonations.length} donations.`)

  // Update donor profiles with real lastDonationDate + totalDonations
  let updated = 0
  for (const [donorId, lastDate] of donorLastDonation.entries()) {
    const count = donorDonationCount.get(donorId) ?? 1
    await Donor.findByIdAndUpdate(donorId, {
      lastDonationDate: lastDate,
      totalDonations: count,
    })
    updated++
  }
  console.log(`  Updated ${updated} donor profiles.`)

  // ── 2. URGENT REQUESTS ────────────────────────────────────────────────────

  const urgentRequests = [
    // ─── ACTIVE (3 hospitals, 1-2 each) ───
    {
      hospitalId: royal._id,
      bloodType: 'O-', unitsNeeded: 8, urgencyLevel: 'CRITICAL',
      reason: 'Multi-vehicle accident on Sultan Qaboos Highway — trauma bay at capacity.',
      expiresAt: daysFromNow(1), status: 'ACTIVE', notifiedDonorCount: 27,
      createdAt: daysAgo(0),
    },
    {
      hospitalId: royal._id,
      bloodType: 'A+', unitsNeeded: 4, urgencyLevel: 'HIGH',
      reason: 'Cardiac bypass surgery scheduled for this afternoon — reserve depleted.',
      expiresAt: daysFromNow(1), status: 'ACTIVE', notifiedDonorCount: 18,
      createdAt: daysAgo(0),
    },
    {
      hospitalId: sqmc._id,
      bloodType: 'AB-', unitsNeeded: 3, urgencyLevel: 'HIGH',
      reason: 'Elective bone marrow transplant patient — rare type, low stock.',
      expiresAt: daysFromNow(1), status: 'ACTIVE', notifiedDonorCount: 9,
      createdAt: daysAgo(0),
    },
    {
      hospitalId: sqmc._id,
      bloodType: 'O+', unitsNeeded: 6, urgencyLevel: 'CRITICAL',
      reason: 'Obstetric emergency — postpartum haemorrhage requiring immediate transfusion.',
      expiresAt: daysFromNow(1), status: 'ACTIVE', notifiedDonorCount: 34,
      createdAt: daysAgo(0),
    },
    {
      hospitalId: alnahdha._id,
      bloodType: 'B+', unitsNeeded: 3, urgencyLevel: 'HIGH',
      reason: 'Paediatric oncology patient needs transfusion before chemotherapy.',
      expiresAt: daysFromNow(1), status: 'ACTIVE', notifiedDonorCount: 14,
      createdAt: daysAgo(0),
    },

    // ─── FULFILLED ───
    {
      hospitalId: royal._id,
      bloodType: 'A+', unitsNeeded: 6, urgencyLevel: 'CRITICAL',
      reason: 'Emergency aortic repair — 6 units cross-matched.',
      expiresAt: daysAgo(3), status: 'FULFILLED', notifiedDonorCount: 31,
      createdAt: daysAgo(4),
    },
    {
      hospitalId: sqmc._id,
      bloodType: 'O+', unitsNeeded: 10, urgencyLevel: 'CRITICAL',
      reason: 'Mass casualty incident at industrial site — 7 patients admitted.',
      expiresAt: daysAgo(8), status: 'FULFILLED', notifiedDonorCount: 52,
      createdAt: daysAgo(9),
    },
    {
      hospitalId: alnahdha._id,
      bloodType: 'O-', unitsNeeded: 5, urgencyLevel: 'HIGH',
      reason: 'Burn unit patient — serial transfusions required over 48 hrs.',
      expiresAt: daysAgo(14), status: 'FULFILLED', notifiedDonorCount: 21,
      createdAt: daysAgo(15),
    },
    {
      hospitalId: royal._id,
      bloodType: 'B-', unitsNeeded: 3, urgencyLevel: 'HIGH',
      reason: 'Organ transplant recipient preparation — rare type needed.',
      expiresAt: daysAgo(21), status: 'FULFILLED', notifiedDonorCount: 7,
      createdAt: daysAgo(22),
    },
    {
      hospitalId: sqmc._id,
      bloodType: 'AB+', unitsNeeded: 4, urgencyLevel: 'HIGH',
      reason: 'Post-op haemorrhage in general surgery ICU.',
      expiresAt: daysAgo(30), status: 'FULFILLED', notifiedDonorCount: 16,
      createdAt: daysAgo(31),
    },
    {
      hospitalId: alnahdha._id,
      bloodType: 'A-', unitsNeeded: 4, urgencyLevel: 'CRITICAL',
      reason: 'Ruptured ectopic pregnancy — theatre standby.',
      expiresAt: daysAgo(36), status: 'FULFILLED', notifiedDonorCount: 11,
      createdAt: daysAgo(37),
    },
    {
      hospitalId: royal._id,
      bloodType: 'O-', unitsNeeded: 12, urgencyLevel: 'CRITICAL',
      reason: 'Helicopter transfer — unresponsive polytrauma patient.',
      expiresAt: daysAgo(55), status: 'FULFILLED', notifiedDonorCount: 39,
      createdAt: daysAgo(56),
    },

    // ─── EXPIRED ───
    {
      hospitalId: alnahdha._id,
      bloodType: 'A-', unitsNeeded: 2, urgencyLevel: 'HIGH',
      reason: 'Dialysis patient with rare type — insufficient response.',
      expiresAt: daysAgo(5), status: 'EXPIRED', notifiedDonorCount: 4,
      createdAt: daysAgo(6),
    },
    {
      hospitalId: royal._id,
      bloodType: 'B+', unitsNeeded: 6, urgencyLevel: 'CRITICAL',
      reason: 'Ruptured abdominal aortic aneurysm — patient expired before donors arrived.',
      expiresAt: daysAgo(45), status: 'EXPIRED', notifiedDonorCount: 23,
      createdAt: daysAgo(46),
    },
    {
      hospitalId: sqmc._id,
      bloodType: 'AB-', unitsNeeded: 2, urgencyLevel: 'HIGH',
      reason: 'Elective surgery rescheduled — request no longer needed.',
      expiresAt: daysAgo(18), status: 'EXPIRED', notifiedDonorCount: 5,
      createdAt: daysAgo(19),
    },
    {
      hospitalId: alnahdha._id,
      bloodType: 'O+', unitsNeeded: 4, urgencyLevel: 'HIGH',
      reason: 'Planned surgery cancelled due to patient condition.',
      expiresAt: daysAgo(62), status: 'EXPIRED', notifiedDonorCount: 18,
      createdAt: daysAgo(63),
    },
  ]

  await UrgentRequest.insertMany(urgentRequests)
  console.log(`  Inserted ${urgentRequests.length} urgent requests.`)

  // ── 3. NOTIFICATIONS ──────────────────────────────────────────────────────
  //
  // Urgent request notifications only go to donors whose blood type is
  // compatible with the needed type (i.e. they can actually donate).
  // General notifications go to a broad slice of all donors.

  const allIds = donors.map(d => d._id)
  const slice = (a: number, b: number) => allIds.slice(a, Math.min(b, allIds.length))
  // Returns IDs of donors compatible with a needed blood type, capped at n
  const compatibleIds = (bt: string, n: number) =>
    donorsForType(donors, bt, n).map(d => d._id)

  const notifications = [
    // ─── Royal — active urgent broadcasts (unread) ───
    {
      hospitalId: royal._id,
      donorIds: compatibleIds('O-', 40),
      title: 'CRITICAL: O- blood needed immediately',
      message: 'Royal Hospital requires 8 units of O- blood. Multi-vehicle accident — trauma bay at full capacity. Please respond now if you are available.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'O-', unitsNeeded: 8,
      isRead: false, sentAt: daysAgo(0),
      deliveryStatus: { email: { sent: 37, failed: 3 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 40, failed: 0 } },
    },
    {
      hospitalId: royal._id,
      donorIds: compatibleIds('A+', 60),
      title: 'Urgent: A+ blood needed for cardiac surgery',
      message: 'Royal Hospital Blood Bank: 4 units of A+ blood needed for cardiac bypass this afternoon. Reserves depleted. Can you come in today?',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'A+', unitsNeeded: 4,
      isRead: false, sentAt: daysAgo(0),
      deliveryStatus: { email: { sent: 57, failed: 3 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 60, failed: 0 } },
    },

    // ─── SQMC — active urgent broadcasts (unread) ───
    {
      hospitalId: sqmc._id,
      donorIds: compatibleIds('AB-', 20),
      title: 'Urgent: AB- blood needed — bone marrow transplant',
      message: 'SQMC needs 3 units of AB- blood for an upcoming bone marrow transplant patient. This is a rare type — your response is critical.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'AB-', unitsNeeded: 3,
      isRead: false, sentAt: daysAgo(0),
      deliveryStatus: { email: { sent: 18, failed: 2 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 20, failed: 0 } },
    },
    {
      hospitalId: sqmc._id,
      donorIds: compatibleIds('O+', 80),
      title: 'CRITICAL: O+ blood — obstetric emergency',
      message: 'Sultan Qaboos Medical Centre: CRITICAL need for O+ blood. Obstetric emergency in progress. 6 units required immediately.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'O+', unitsNeeded: 6,
      isRead: false, sentAt: daysAgo(0),
      deliveryStatus: { email: { sent: 76, failed: 4 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 80, failed: 0 } },
    },

    // ─── Al Nahdha — active urgent (unread) ───
    {
      hospitalId: alnahdha._id,
      donorIds: compatibleIds('B+', 50),
      title: 'Urgent: B+ blood for paediatric patient',
      message: 'Al Nahdha Hospital urgently needs B+ blood for a child undergoing chemotherapy. 3 units required before treatment begins.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'B+', unitsNeeded: 3,
      isRead: false, sentAt: daysAgo(0),
      deliveryStatus: { email: { sent: 47, failed: 3 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 50, failed: 0 } },
    },

    // ─── Historical urgent — fulfilled (read) ───
    {
      hospitalId: royal._id,
      donorIds: compatibleIds('A+', 60),
      title: 'CRITICAL: A+ blood — emergency aortic repair (resolved)',
      message: 'Royal Hospital needed 6 units of A+ blood for emergency aortic repair. This request has been fulfilled — thank you to all donors who responded.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'A+', unitsNeeded: 6,
      isRead: true, sentAt: daysAgo(4),
      deliveryStatus: { email: { sent: 57, failed: 3 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 60, failed: 0 } },
    },
    {
      hospitalId: sqmc._id,
      donorIds: compatibleIds('O+', 80),
      title: 'CRITICAL: O+ blood — mass casualty incident (resolved)',
      message: 'SQMC required 10 units of O+ blood following a mass casualty incident. The need has been met — your community made a difference.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'O+', unitsNeeded: 10,
      isRead: true, sentAt: daysAgo(9),
      deliveryStatus: { email: { sent: 76, failed: 4 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 80, failed: 0 } },
    },
    {
      hospitalId: alnahdha._id,
      donorIds: compatibleIds('O-', 40),
      title: 'Urgent: O- blood for burn unit patient (resolved)',
      message: 'Al Nahdha Hospital requested O- blood for a burn unit patient. Request fulfilled — 5 units collected. Thank you.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'O-', unitsNeeded: 5,
      isRead: true, sentAt: daysAgo(15),
      deliveryStatus: { email: { sent: 38, failed: 2 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 40, failed: 0 } },
    },
    {
      hospitalId: royal._id,
      donorIds: compatibleIds('B-', 15),
      title: 'Urgent: B- blood — organ transplant prep (resolved)',
      message: 'Royal Hospital Blood Bank needed B- blood for an organ transplant recipient. Request now fulfilled.',
      notificationType: 'URGENT_REQUEST', bloodTypeNeeded: 'B-', unitsNeeded: 3,
      isRead: true, sentAt: daysAgo(22),
      deliveryStatus: { email: { sent: 14, failed: 1 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 15, failed: 0 } },
    },

    // ─── General outreach — Royal ───
    {
      hospitalId: royal._id,
      donorIds: slice(0, 100),
      title: 'Spring blood drive — Royal Hospital, 20 April',
      message: 'Join our spring blood drive on Saturday 20 April, 08:00–16:00. All blood types welcome. Walk-ins accepted. Free refreshments for all donors.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(10),
      deliveryStatus: { email: { sent: 91, failed: 9 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 100, failed: 0 } },
    },
    {
      hospitalId: royal._id,
      donorIds: slice(0, 80),
      title: 'Your donation eligibility has been renewed',
      message: 'It has been more than 56 days since your last donation at Royal Hospital. You are now eligible to donate again. Book your next appointment through the app.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(35),
      deliveryStatus: { email: { sent: 74, failed: 6 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 80, failed: 0 } },
    },
    {
      hospitalId: royal._id,
      donorIds: slice(0, 120),
      title: 'World Blood Donor Day — 14 June',
      message: 'This World Blood Donor Day we celebrate everyone who has donated through BloodSync. Royal Hospital has collected 1,240 units this year — made possible by donors like you.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(90),
      deliveryStatus: { email: { sent: 108, failed: 12 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 120, failed: 0 } },
    },

    // ─── General outreach — SQMC ───
    {
      hospitalId: sqmc._id,
      donorIds: slice(20, 110),
      title: 'SQMC blood drive — every Tuesday, 09:00–15:00',
      message: 'Sultan Qaboos Medical Centre runs a weekly walk-in blood collection every Tuesday. No appointment needed. Bring your ID. All blood types urgently needed.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(18),
      deliveryStatus: { email: { sent: 82, failed: 8 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 90, failed: 0 } },
    },
    {
      hospitalId: sqmc._id,
      donorIds: slice(0, 70),
      title: 'Thank you — 500 units collected this quarter',
      message: 'SQMC Blood Bank reached 500 units collected this quarter, thanks to our registered donor network. You are saving lives. Your next donation window opens in 56 days.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(55),
      deliveryStatus: { email: { sent: 64, failed: 6 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 70, failed: 0 } },
    },

    // ─── General outreach — Al Nahdha ───
    {
      hospitalId: alnahdha._id,
      donorIds: slice(30, 90),
      title: 'Al Nahdha Hospital — donor appreciation day',
      message: 'Al Nahdha Hospital invites all registered donors to our Donor Appreciation Day on 25 April. Refreshments, health screenings, and donor recognition awards.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(8),
      deliveryStatus: { email: { sent: 55, failed: 5 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 60, failed: 0 } },
    },
    {
      hospitalId: alnahdha._id,
      donorIds: slice(0, 60),
      title: 'Rare blood type appeal — B- and AB- donors needed',
      message: 'Al Nahdha Hospital is calling all B- and AB- donors. Our rare-type reserves are critically low. Even a single donation makes an enormous difference.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(42),
      deliveryStatus: { email: { sent: 53, failed: 7 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 60, failed: 0 } },
    },
    {
      hospitalId: alnahdha._id,
      donorIds: slice(10, 80),
      title: 'New: schedule donations directly through BloodSync',
      message: 'Al Nahdha Hospital now accepts donation appointments through the BloodSync app. Choose your date and time, and we will confirm within 2 hours.',
      notificationType: 'GENERAL',
      isRead: true, sentAt: daysAgo(75),
      deliveryStatus: { email: { sent: 64, failed: 6 }, sms: { sent: 0, failed: 0 }, inApp: { sent: 70, failed: 0 } },
    },
  ]

  await Notification.insertMany(notifications)
  console.log(`  Inserted ${notifications.length} notifications.`)

  await mongoose.disconnect()

  console.log('\n✓ Activity seeding complete.')
  console.log(`  Donations:       ${insertedDonations.length}`)
  console.log(`  Urgent requests: ${urgentRequests.length}  (5 active, 7 fulfilled, 4 expired)`)
  console.log(`  Notifications:   ${notifications.length}  (5 unread, 13 read)`)
  console.log(`  Donor profiles updated: ${updated}`)
}

run().catch(e => { console.error(e); process.exit(1) })
