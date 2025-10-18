import express from 'express';
import { ChatBot } from '../services/chatBot';
import { DocumentIndexer } from '../services/documentIndexer';
import { SecurityMiddleware } from '../middleware/security';

const router = express.Router();
let _documentIndexer: DocumentIndexer | null = null;
let _chatBot: ChatBot | null = null;

function getChatBot(): ChatBot {
  if (!_documentIndexer) {
    _documentIndexer = new DocumentIndexer();
  }
  if (!_chatBot) {
    _chatBot = new ChatBot(_documentIndexer);
  }
  return _chatBot;
}
const security = new SecurityMiddleware();

// Apply security middleware to all chat routes
router.use(security.getRequestLogger());
router.use(security.getContentLengthLimit());
router.use(security.getApiKeyAuth());
router.use(security.getRateLimit());
router.use(security.getSlowDown());

// Send a chat message and get a response enhanced with RAG
router.post('/', security.getChatValidation(), async (req: express.Request, res: express.Response) => {
  try {
    const { message, limit = 5, systemPrompt, history } = req.body;

    const result = await getChatBot().ask(message, {
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


