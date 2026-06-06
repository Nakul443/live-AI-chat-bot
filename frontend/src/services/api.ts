// file to communicate between react and express backend server

import axios from 'axios';

export interface Message {
  id?: number;
  chatId: number;
  content: string;
  sender: 'USER' | 'AI';
  createdAt?: string;
}

export interface ChatHistoryResponse {
  success: boolean;
  chat: {
    id: number;
    title: string;
    createdAt: string;
  };
  messages: Message[];
}

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sendMessageAPI = async (message: string, sessionId?: string | null): Promise<SendMessageResponse> => {
  const response = await api.post<SendMessageResponse>('/chat/message', {
    message,
    ...(sessionId && { sessionId }),
  });
  return response.data;
};

export const getChatHistoryAPI = async (sessionId: string): Promise<ChatHistoryResponse> => {
  const response = await api.get<ChatHistoryResponse>(`/chat/history/${sessionId}`);
  return response.data;
};