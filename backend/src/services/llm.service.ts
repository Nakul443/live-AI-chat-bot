import dotenv from 'dotenv';

dotenv.config();
import { GoogleGenAI } from '@google/genai';

// Automatically loads GEMINI_API_KEY from process.env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ChatMessage {
  sender: 'USER' | 'AI';
  content: string;
}

export const generateAIResponse = async (history: ChatMessage[], freshMessage: string): Promise<string> => {
  try {
    // changing chat history to match gemini's structure
    const contents = history.map((msg) => ({
      role: msg.sender === 'USER' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    contents.push({
      role: 'user',
      parts: [{ text: freshMessage }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: `You are a professional, helpful, and courteous live chat customer support agent for "Spur". 
Your goal is to answer user queries cleanly and efficiently. Keep your answers concise, structured, and realistic for a real-time live chat widget environment.`,
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't process that response successfully. Please try again.";
  } catch (error: any) {
    console.error('Gemini API Integration Failure:', error.message || error);
    throw new Error('LLM Service Unavailable: Error contacting the intelligence layer.');
  }
};