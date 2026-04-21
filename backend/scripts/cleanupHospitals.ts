import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()

const KEEP_EMAILS = [
  'bloodbank@royalhospital.gov.om',
  'transfusion@sqmc.gov.om',
  'bloodservices@alnahdha.om',
]

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodsync')
  const db = mongoose.connection.db!

  // Delete test hospital users (not in KEEP_EMAILS) and their Hospital docs
  const testUsers = await db.collection('users').find({
    userType: 'HOSPITAL',
    email: { $nin: KEEP_EMAILS },
  }).toArray()

  console.log(`Deleting ${testUsers.length} test hospital user(s):`, testUsers.map(u => u.email))

  for (const u of testUsers) {
    await db.collection('hospitals').deleteMany({ user: u._id })
    await db.collection('users').deleteOne({ _id: u._id })
  }

  // Update passwords for real hospitals
  const hash = await bcrypt.hash('password123', 10)
  const result = await db.collection('users').updateMany(
    { email: { $in: KEEP_EMAILS } },
    { $set: { password: hash } }
  )
  console.log(`Updated password for ${result.modifiedCount} real hospital(s) to "password123"`)

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(e => { console.error(e); process.exit(1) })
