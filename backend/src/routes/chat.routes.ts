import { Router } from 'express';
import { startChat, sendMessage } from '../controllers/chat.controller.js';

const router = Router();

// 1. start a new chat session
router.post('/start', startChat);

// 2. send a message in the chat
router.post('/message', sendMessage);



export default router;