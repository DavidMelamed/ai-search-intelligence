import { Router, Request, Response } from 'express';
import { citationService } from '../services/citationService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get citations for a domain
router.get('/domain/:domainId', authenticate, async (req: Request, res: Response) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const { limit = 50, offset = 0, startDate, endDate } = req.query;

    const citations = await citationService.getCitationsByDomain(domainId, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(citations);
  } catch (error) {
    logger.error('Error getting citations:', error);
    res.status(500).json({ error: 'Failed to get citations' });
  }
});

// Track new citation
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { domainId, query, text, sourceUrl, position, aiModeType } = req.body;

    const citation = await citationService.trackCitation(domainId, {
      query,
      text,
      sourceUrl,
      position,
      aiModeType
    });

    res.status(201).json(citation);
  } catch (error) {
    logger.error('Error tracking citation:', error);
    res.status(500).json({ error: 'Failed to track citation' });
  }
});

// Get citation patterns
router.get('/domain/:domainId/patterns', authenticate, async (req: Request, res: Response) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const patterns = await citationService.analyzeCitationPatterns(domainId);
    res.json(patterns);
  } catch (error) {
    logger.error('Error analyzing citation patterns:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// Monitor AI Mode for citations
router.post('/monitor', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, domain } = req.body;
    const citations = await citationService.monitorAiMode(query, domain);
    res.json(citations);
  } catch (error) {
    logger.error('Error monitoring AI Mode:', error);
    res.status(500).json({ error: 'Failed to monitor AI Mode' });
  }
});

export default router;