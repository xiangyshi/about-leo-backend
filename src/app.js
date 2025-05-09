// app.js
import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import documentsRouter from './routes/documents.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use('/api/documents', documentsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
