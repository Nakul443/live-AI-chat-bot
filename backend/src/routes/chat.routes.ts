import { Router } from 'express';
import { startChat, sendMessage, getChatHistory } from '../controllers/chat.controller.js';

const router = Router();

// 1. start a new chat session
router.post('/start', startChat);

// 2. send a message in the chat
router.post('/message', sendMessage);

// 3. get message history for a chat
router.post('/history/:chatId', getChatHistory);

export default router;