import { Router } from 'express';
import { sendMessage, getChatHistory } from '../controllers/chat.controller.js';

const router = Router();

// 2. send a message in the chat or start a new chat
router.post('/message', sendMessage);

// 3. get message history for a chat
router.get('/history/:chatId', getChatHistory);

export default router;