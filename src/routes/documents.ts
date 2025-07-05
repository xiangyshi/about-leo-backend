import express from 'express';
import { DocumentIndexer } from '../services/documentIndexer';

const router = express.Router();
const documentIndexer = new DocumentIndexer();

// Index a document
router.post('/index', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }
    
    await documentIndexer.indexDocument(filePath);
    
    res.json({ message: 'Document indexed successfully', filePath });
  } catch (error) {
    console.error('Error indexing document:', error);
    res.status(500).json({ error: 'Failed to index document' });
  }
});

// Search similar content
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
    
    const results = await documentIndexer.searchSimilarContent(query, limit);
    
    res.json({ results });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

export default router; 