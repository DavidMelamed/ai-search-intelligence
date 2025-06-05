import { Router, Request, Response } from 'express';
import { embeddingsService } from '../services/embeddingsService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Generate embeddings
router.post('/generate', authenticate, async (req: Request, res: Response) => {
  try {
    const { text, metadata } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const embeddings = await embeddingsService.generateEmbeddings(text, metadata);
    res.json(embeddings);
  } catch (error) {
    logger.error('Error generating embeddings:', error);
    res.status(500).json({ error: 'Failed to generate embeddings' });
  }
});

// Search similar content
router.post('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, topK = 10, filter } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await embeddingsService.searchSimilar(query, topK, filter);
    res.json(results);
  } catch (error) {
    logger.error('Error searching similar content:', error);
    res.status(500).json({ error: 'Failed to search similar content' });
  }
});

export default router;