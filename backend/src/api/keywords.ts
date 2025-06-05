import { Router, Request, Response } from 'express';
import { keywordService } from '../services/keywordService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Track keyword rankings
router.post('/track', authenticate, async (req: Request, res: Response) => {
  try {
    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const rankings = await keywordService.trackKeywordRankings(keyword);
    res.json(rankings);
  } catch (error) {
    logger.error('Error tracking keyword rankings:', error);
    res.status(500).json({ error: 'Failed to track keyword rankings' });
  }
});

// Get keyword opportunities
router.get('/opportunities/:domainId', authenticate, async (req: Request, res: Response) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const opportunities = await keywordService.analyzeKeywordOpportunities(domainId);
    res.json(opportunities);
  } catch (error) {
    logger.error('Error analyzing keyword opportunities:', error);
    res.status(500).json({ error: 'Failed to analyze keyword opportunities' });
  }
});

// Get keyword trends
router.post('/trends', authenticate, async (req: Request, res: Response) => {
  try {
    const { keywords } = req.body;

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    const trends = await keywordService.getKeywordTrends(keywords);
    res.json(trends);
  } catch (error) {
    logger.error('Error getting keyword trends:', error);
    res.status(500).json({ error: 'Failed to get keyword trends' });
  }
});

// Discover synthetic queries
router.post('/synthetic', authenticate, async (req: Request, res: Response) => {
  try {
    const { baseQuery } = req.body;

    if (!baseQuery) {
      return res.status(400).json({ error: 'Base query is required' });
    }

    const synthetic = await keywordService.discoverSyntheticQueries(baseQuery);
    res.json(synthetic);
  } catch (error) {
    logger.error('Error discovering synthetic queries:', error);
    res.status(500).json({ error: 'Failed to discover synthetic queries' });
  }
});

export default router;