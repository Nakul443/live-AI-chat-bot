import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma/client.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Export prisma instance to be reused across services
// while letting your prisma.config.ts handle the connection under the hood
export const prisma = new PrismaClient({} as any);

// middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit payload size to handle very long messages sensibly

// routes
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Basic query to check if the DB layer is healthy
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'OK', database: 'CONNECTED' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'UNREACHABLE' });
  }
});

// error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err.stack || err.message);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on our end. Please try again later.'
  });
});

// server start
const server = app.listen(PORT, () => {
  console.log(`Spur AI Chat Backend running on http://localhost:${PORT}`);
});

// easy shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Server stopped.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);