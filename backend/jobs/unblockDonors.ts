import cron from 'node-cron';
import Donor from '../models/Donor';

const TAG = '[unblockDonors]';

// ─── Task 1: Unblock donors whose blockExpiryDate has passed ─────────────────

export async function unblockExpiredDonors(): Promise<number> {
  try {
    const result = await Donor.updateMany(
      {
        eligibilityStatus: 'TEMPORARILY_BLOCKED',
        blockExpiryDate: { $lte: new Date() },
      },
      {
        $set: {
          eligibilityStatus: 'ELIGIBLE',
          eligibilityScore: 70,
          blockReason: null,
          blockExpiryDate: null,
        },
      }
    );

    const count = result.modifiedCount;
    if (count > 0) {
      console.log(`${TAG} Unblocked ${count} donor(s) with expired temporary blocks`);
    }
    return count;
  } catch (err) {
    console.error(`${TAG} unblockExpiredDonors failed:`, err);
    return 0;
  }
}

// ─── Task 2: Remove cooldown block for donors past 90-day donation window ────

export async function updateCooldownDonors(): Promise<number> {
  try {
    const cooldownCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await Donor.updateMany(
      {
        eligibilityStatus: 'TEMPORARILY_BLOCKED',
        lastDonationDate: { $ne: null, $lte: cooldownCutoff },
        blockReason: { $regex: /cooldown|donation/i },
      },
      {
        $set: {
          eligibilityStatus: 'ELIGIBLE',
          eligibilityScore: 70,
          blockReason: null,
          blockExpiryDate: null,
        },
      }
    );

    const count = result.modifiedCount;
    if (count > 0) {
      console.log(`${TAG} Removed cooldown block for ${count} donor(s)`);
    }
    return count;
  } catch (err) {
    console.error(`${TAG} updateCooldownDonors failed:`, err);
    return 0;
  }
}

// ─── Combined daily runner ────────────────────────────────────────────────────

async function runDailyUnblock(): Promise<void> {
  console.log(`${TAG} Running daily unblock job...`);
  const unblocked = await unblockExpiredDonors();
  const cooldownCleared = await updateCooldownDonors();

  if (unblocked === 0 && cooldownCleared === 0) {
    console.log(`${TAG} No donors to unblock today`);
  }
}

// ─── Initializer (called from server.ts) ─────────────────────────────────────

export function initializeCronJobs(): void {
  // Daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await runDailyUnblock();
    } catch (err) {
      console.error(`${TAG} Unexpected error in cron job:`, err);
    }
  });

  console.log('Cron job initialized: Auto-unblock donors daily at midnight');
}
