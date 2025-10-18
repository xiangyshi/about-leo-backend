import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRoutes from '../src/routes/documents';
import chatRoutes from '../src/routes/chat';
import { SecurityMiddleware } from '../src/middleware/security';

dotenv.config();

const app = express();
const security = new SecurityMiddleware();

// Apply security headers globally
app.use(security.getSecurityHeaders());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => {
  res.json({ message: 'About Leo Backend with Vector Search!' });
});

app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

// Export the Express app for Vercel
export default app;
