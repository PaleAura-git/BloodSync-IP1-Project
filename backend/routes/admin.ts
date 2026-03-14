import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { unblockExpiredDonors, updateCooldownDonors } from '../jobs/unblockDonors';

const router = Router();

// GET /api/admin/run-unblock — manually trigger unblock jobs (dev/ops use)
router.get('/run-unblock', protect, async (req: AuthRequest, res: Response) => {
  const unblocked      = await unblockExpiredDonors();
  const cooldownCleared = await updateCooldownDonors();

  res.json({
    success: true,
    results: {
      expiredBlocksCleared: unblocked,
      cooldownBlocksCleared: cooldownCleared,
      total: unblocked + cooldownCleared,
    },
  });
});

export default router;
