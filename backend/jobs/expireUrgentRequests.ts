import cron from 'node-cron';
import UrgentRequest from '../models/UrgentRequest';

// Runs every hour — marks ACTIVE requests past their expiresAt as EXPIRED
export function startExpireUrgentRequestsJob(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await UrgentRequest.updateMany(
        { status: 'ACTIVE', expiresAt: { $lte: new Date() } },
        { status: 'EXPIRED' }
      );

      if (result.modifiedCount > 0) {
        console.log(`[expireUrgentRequests] Expired ${result.modifiedCount} request(s)`);
      }
    } catch (err) {
      console.error('[expireUrgentRequests] Job failed:', err);
    }
  });

  console.log('[expireUrgentRequests] Cron job scheduled — runs hourly');
}
