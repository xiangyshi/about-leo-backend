import express from 'express';
import { ChatBot } from '../services/chatBot';
import { DocumentIndexer } from '../services/documentIndexer';

const router = express.Router();
const documentIndexer = new DocumentIndexer();
const chatBot = new ChatBot(documentIndexer);

// Send a chat message and get a response enhanced with RAG
router.post('/', async (req, res) => {
  try {
    const { message, limit = 5, systemPrompt, history } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await chatBot.ask(message, {
      limit,
      systemPromptOverride: systemPrompt,
      history,
    });

    res.json({
      answer: result.answer,
      context: result.usedContext,
      sources: result.sources,
    });
  } catch (error) {
    console.error('Error handling chat request:', error);
    res.status(500).json({ error: 'Failed to get chat response' });
  }
});

export default router;


