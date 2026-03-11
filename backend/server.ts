import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';

const app: Application = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BloodSync API is running', timestamp: new Date().toISOString() });
});

// Routes (add as they are created)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/users', require('./routes/users'));
// app.use('/api/donations', require('./routes/donations'));

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BloodSync server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

export default app;
