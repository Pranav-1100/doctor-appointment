const router = require('express').Router();
const ChatService = require('../services/chat.service'); // Changed from { ChatService }
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateChat } = require('../middleware/validate.middleware');

// Get chat categories
router.get('/categories', authenticateToken, (req, res) => {
  res.json(ChatService.CHAT_CATEGORIES);
});

// Get user context/profile for chat
router.get('/context', authenticateToken, async (req, res) => {
  try {
    const context = await ChatService.getUserContext(req.user.id);
    res.json(context);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send a message and get response
router.post('/message', authenticateToken, validateChat, async (req, res) => {
  try {
    const { message, category } = req.body;
    const chat = await ChatService.processChatMessage(req.user.id, message, category);
    res.status(201).json(chat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get chat history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const history = await ChatService.getChatHistory(req.user.id, {
      category,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get specific chat thread
router.get('/thread/:threadId', authenticateToken, async (req, res) => {
  try {
    const thread = await ChatService.getChatThread(req.params.threadId, req.user.id);
    res.json(thread);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
