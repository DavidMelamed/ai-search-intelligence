import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initializeVectorStore } from './config/vectorStore';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './api/auth';
import citationRoutes from './api/citations';
import analysisRoutes from './api/analysis';
import domainRoutes from './api/domains';
import embeddingsRoutes from './api/embeddings';
import keywordsRoutes from './api/keywords';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/citations', citationRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/embeddings', embeddingsRoutes);
app.use('/api/keywords', keywordsRoutes);

// WebSocket handling for real-time features
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:domain', (domain: string) => {
    socket.join(`domain:${domain}`);
    logger.info(`Client ${socket.id} subscribed to domain: ${domain}`);
  });

  socket.on('unsubscribe:domain', (domain: string) => {
    socket.leave(`domain:${domain}`);
    logger.info(`Client ${socket.id} unsubscribed from domain: ${domain}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize connections
    await connectDatabase();
    await connectRedis();
    await initializeVectorStore();

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
});

startServer();

export { app, io };