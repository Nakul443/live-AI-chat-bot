import { Router } from 'express';
import { startChat} from '../controllers/chat.controller.js';

const router = Router();

// 1. start a new chat session
router.post('/start', startChat);

export default router;