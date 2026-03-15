import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';
import authRoutes from './routes/auth';
import donorRoutes from './routes/donor';
import quizRoutes from './routes/quiz';
import hospitalRoutes from './routes/hospital';
import searchRoutes from './routes/search';
import notificationRoutes from './routes/notification';
import donationRoutes from './routes/donation';
import urgentRequestRoutes from './routes/urgentRequest';
import { startExpireUrgentRequestsJob } from './jobs/expireUrgentRequests';
import { initializeCronJobs } from './jobs/unblockDonors';
import adminRoutes from './routes/admin';

// ─── Environment validation ───────────────────────────────────────────────────

/**
 * Validates that all required environment variables are present before the
 * server starts. Exits the process immediately with a descriptive message if
 * any critical variable is missing — a partially-configured server will fail
 * in unpredictable ways, so a clean exit is safer than attempting to run.
 *
 * ## Variables checked
 *
 * **Critical (process exits if missing):**
 * - `MONGODB_URI` — database connection string; without it no data can be read or written.
 * - `JWT_SECRET`  — signs and verifies auth tokens; without it security is broken.
 *
 * **Warning (server starts but features are degraded):**
 * - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` —
 *   email delivery for donor notifications; missing values mean emails silently
 *   fail. The `emailService` validates these at send time, but logging a warning
 *   at startup makes misconfiguration visible earlier.
 */
function validateEnv(): void {
  // Critical variables — the server cannot function without these
  const critical: Array<{ key: string; reason: string }> = [
    { key: 'MONGODB_URI', reason: 'Database connection required' },
    { key: 'JWT_SECRET',  reason: 'Authentication security required' },
  ];

  const missing = critical.filter(({ key }) => !process.env[key]);

  if (missing.length > 0) {
    console.error('[ERROR] Missing critical environment variables — cannot start:');
    missing.forEach(({ key, reason }) => {
      console.error(`  ✗ ${key.padEnd(20)} (${reason})`);
    });
    console.error(
      '\nCreate a .env file in the project root with the required variables.\n' +
      'See README or .env.example for the full list.'
    );
    // Exit code 1 signals a configuration error to the process supervisor
    process.exit(1);
  }

  // Non-critical variables — warn but allow startup
  const emailVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
  const missingEmail = emailVars.filter((key) => !process.env[key]);

  if (missingEmail.length > 0) {
    console.warn(
      `[WARN] Missing email configuration: ${missingEmail.join(', ')}. ` +
      'Donor notification emails will fail until these are configured.'
    );
  }
}

// Run env check before anything else — fail fast if misconfigured
validateEnv();

// ─── App setup ────────────────────────────────────────────────────────────────

const app: Application = express();

// Connect to MongoDB — exits process on failure (handled inside connectDB)
connectDB();

// Start background cron jobs after DB is initialised
startExpireUrgentRequestsJob(); // transitions ACTIVE urgent requests to EXPIRED after 24h
initializeCronJobs();           // auto-unblocks donors whose temporary block has expired

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check — used by load balancers and uptime monitors
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'BloodSync API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'development',
  });
});

app.use('/api/auth',            authRoutes);
app.use('/api/donors',          donorRoutes);
app.use('/api/quiz',            quizRoutes);
app.use('/api/hospitals',       hospitalRoutes);
app.use('/api/search',          searchRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/donations',       donationRoutes);
app.use('/api/urgent-requests', urgentRequestRoutes);
app.use('/api/admin',           adminRoutes);

// Global error handler — must be registered last so all route errors flow here
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `[INFO] BloodSync server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`
  );
});

export default app;
