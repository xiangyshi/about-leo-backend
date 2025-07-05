import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRoutes from './routes/documents';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'About Leo Backend with Vector Search!' });
});

app.use('/api/documents', documentRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 