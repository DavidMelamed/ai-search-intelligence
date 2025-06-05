import { Router, Request, Response } from 'express';
import { getPool } from '../config/database';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get user domains
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const pool = getPool();
    
    const result = await pool.query(
      'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error getting domains:', error);
    res.status(500).json({ error: 'Failed to get domains' });
  }
});

// Add domain
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { domain } = req.body;
    const pool = getPool();

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    const result = await pool.query(
      'INSERT INTO domains (user_id, domain) VALUES ($1, $2) ON CONFLICT (user_id, domain) DO NOTHING RETURNING *',
      [userId, normalizedDomain]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Domain already exists' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding domain:', error);
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

// Update domain
router.put('/:domainId', authenticate, async (req: Request, res: Response) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const { trackingEnabled } = req.body;
    const pool = getPool();

    const result = await pool.query(
      'UPDATE domains SET tracking_enabled = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [domainId, trackingEnabled]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating domain:', error);
    res.status(500).json({ error: 'Failed to update domain' });
  }
});

// Delete domain
router.delete('/:domainId', authenticate, async (req: Request, res: Response) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const userId = (req as any).user.userId;
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM domains WHERE id = $1 AND user_id = $2 RETURNING *',
      [domainId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    logger.error('Error deleting domain:', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// Get domain statistics
router.get('/:domainId/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const pool = getPool();

    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_citations,
        COUNT(DISTINCT c.query) as unique_queries,
        COUNT(DISTINCT DATE(c.created_at)) as active_days,
        MAX(c.created_at) as last_citation_date
      FROM citations c
      WHERE c.domain_id = $1
    `, [domainId]);

    res.json(stats.rows[0]);
  } catch (error) {
    logger.error('Error getting domain stats:', error);
    res.status(500).json({ error: 'Failed to get domain statistics' });
  }
});

export default router;