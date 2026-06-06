import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
// 1. Import your unified chat routes
import chatRoutes from './routes/chat.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

// middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // limiting payload size to handle very long messages


app.use('/chat', chatRoutes);

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
  console.log(`AI Chat Backend running on http://localhost:${PORT}`);
});

// easy shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Server stopped.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);