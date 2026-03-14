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

const app: Application = express();

// Connect to MongoDB
connectDB();

// Start background jobs
startExpireUrgentRequestsJob();
initializeCronJobs();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BloodSync API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/urgent-requests', urgentRequestRoutes);
app.use('/api/admin', adminRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BloodSync server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

export default app;
