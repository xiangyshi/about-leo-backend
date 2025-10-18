import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRoutes from '../src/routes/documents';
import chatRoutes from '../src/routes/chat';
import { SecurityMiddleware } from '../src/middleware/security';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const security = new SecurityMiddleware();

// Global middleware
app.use(security.getSecurityHeaders());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Health
app.get('/', (req, res) => {
  res.json({ message: 'About Leo Backend with Vector Search!' });
});

// Mount src routes under /documents and /chat
app.use('/documents', documentRoutes);
app.use('/chat', chatRoutes);

// Export serverless handler, normalizing /api prefix
export default (req: any, res: any) => {
  if (req?.url) {
    req.url = req.url.replace(/^\/api\b/, '') || '/';
  }
  return (app as any)(req, res);
};
