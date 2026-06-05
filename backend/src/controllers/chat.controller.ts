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

// POST /api/chat/message
export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId, content } = req.body;

    if (!chatId || !content) {
      res.status(400).json({ error: 'Missing required fields: chatId and content are required.' });
      return;
    }

    // verify that the chat session actually exists
    const chatExists = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chatExists) {
      res.status(404).json({ error: 'Chat session not found.' });
      return;
    }

    // save the User's incoming message to the database
    const userMessage = await prisma.message.create({
      data: {
        chatId,
        content,
        sender: 'USER',
      },
    });

    // ai response to be added

    // save the AI's response to the database
    // const aiMessage = await prisma.message.create({
    //   data: {
    //     chatId,
    //     content: mockAiResponse,
    //     sender: 'AI',
    //   },
    // });

    res.status(200).json({
      success: true,
      userMessage,
    //   aiMessage,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/history/:chatId
export const getChatHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chatId = Number(req.params.chatId);

    if (isNaN(chatId)) {
      res.status(400).json({ error: 'chatId parameter is required.' });
      return;
    }

    // get chat details along with all its related messages sorted by creation time
    const chatHistory = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc', // keep conversation continue
          },
        },
      },
    });

    if (!chatHistory) {
      res.status(404).json({ error: 'Chat history not found for the provided ID.' });
      return;
    }

    res.status(200).json({
      success: true,
      chat: {
        id: chatHistory.id,
        title: chatHistory.title,
        createdAt: chatHistory.createdAt,
      },
      messages: chatHistory.messages,
    });
  } catch (error) {
    next(error);
  }
};