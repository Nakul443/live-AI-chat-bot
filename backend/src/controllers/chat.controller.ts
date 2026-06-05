import { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../index.js';

// POST /api/chat/start
// start a new session in the database
export const startChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title } = req.body;

    const newChat = await prisma.chat.create({
      data: {
        title: title || 'New Conversation',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Chat session started successfully',
      chat: newChat,
    });
  } catch (error) {
    next(error); // Passes any DB errors to your global error handler in index.ts
  }
};