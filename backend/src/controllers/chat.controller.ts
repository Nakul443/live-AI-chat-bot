import { type Request, type Response, type NextFunction } from 'express';
import { prisma } from '../index.js';
import { generateAIResponse } from '../services/llm.service.js';

// POST /chat/message
// if session id is provided, continue the conversation
// else start a new chat
export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Destructure to match the take-home spec (flexible message & optional sessionId)
    const { message, sessionId } = req.body;
    const content = message; 

    if (!content || typeof content !== 'string' || content.trim() === '') {
      res.status(400).json({ error: 'Validation Error: Message content cannot be empty.' });
      return;
    }

    let processedContent = content;
    if (content.length > 4000) {
      processedContent = content.substring(0, 4000) + '... [Truncated due to length]';
    }

    let chatId: number;
    let conversationHistory: any[] = [];

    // Identify or dynamically spin up a new session on the fly if sessionId is missing
    if (sessionId) {
      chatId = Number(sessionId);
      if (isNaN(chatId)) {
        res.status(400).json({ error: 'Validation Error: Invalid sessionId format.' });
        return;
      }

      // verify that the chat session actually exists
      const chatExists = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });

      if (!chatExists) {
        res.status(404).json({ error: 'Chat session not found.' });
        return;
      }

      // Pass along the existing database records to the historical tracker array
      conversationHistory = chatExists.messages;
    } else {
      // Create a display title from the user's first input message, capped at 30 characters
      const dynamicTitle = processedContent.length > 15
        ? processedContent.substring(0, 15) + '...' 
        : processedContent;

      // start a fresh chat session automatically if none was provided
      const newChat = await prisma.chat.create({
        data: {
          title: dynamicTitle,
        },
      });
      chatId = newChat.id;
    }

    // save the User's incoming message to the database
    const userMessage = await prisma.message.create({
      data: {
        chatId,
        content: processedContent,
        sender: 'USER',
      },
    });

    // ai response to be added
    const aiResponse = await generateAIResponse(conversationHistory, userMessage.content);

    // save the AI's response to the database
    const aiMessage = await prisma.message.create({
      data: {
        chatId,
        content: aiResponse,
        sender: 'AI',
      },
    });

    res.status(200).json({
      reply: aiMessage.content,
      sessionId: chatId.toString(),
    });
  } catch (error) {
    next(error);
  }
};

// GET /chat/history/:chatId
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