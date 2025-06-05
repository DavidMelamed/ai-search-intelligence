import { Router, Request, Response } from 'express';
import { analysisService } from '../services/analysisService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Analyze a citation
router.post('/citation/:citationId', authenticate, async (req: Request, res: Response) => {
  try {
    const citationId = parseInt(req.params.citationId);
    const analysis = await analysisService.analyzeCitation(citationId);
    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing citation:', error);
    res.status(500).json({ error: 'Failed to analyze citation' });
  }
});

// Predict content performance
router.post('/predict', authenticate, async (req: Request, res: Response) => {
  try {
    const { content, targetQuery } = req.body;
    
    if (!content || !targetQuery) {
      return res.status(400).json({ error: 'Content and target query are required' });
    }

    const prediction = await analysisService.predictContentPerformance(content, targetQuery);
    res.json(prediction);
  } catch (error) {
    logger.error('Error predicting content performance:', error);
    res.status(500).json({ error: 'Failed to predict performance' });
  }
});

// Get analysis by citation ID
router.get('/citation/:citationId', authenticate, async (req: Request, res: Response) => {
  try {
    const citationId = parseInt(req.params.citationId);
    const pool = (await import('../config/database')).getPool();
    
    const result = await pool.query(
      'SELECT * FROM analyses WHERE citation_id = $1',
      [citationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error getting analysis:', error);
    res.status(500).json({ error: 'Failed to get analysis' });
  }
});

export default router;