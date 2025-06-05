import axios from 'axios';
import * as cheerio from 'cheerio';
import { getPool } from '../config/database';
import { embeddingsService } from './embeddingsService';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { io } from '../index';

interface Citation {
  query: string;
  text: string;
  sourceUrl?: string;
  position?: number;
  aiModeType?: string;
  metadata?: any;
}

export class CitationService {
  private serpApiKey: string;

  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY || '';
  }

  /**
   * Track a new citation
   */
  async trackCitation(domainId: number, citation: Citation): Promise<any> {
    const pool = getPool();
    
    try {
      // Store citation in database
      const result = await pool.query(
        `INSERT INTO citations (domain_id, query, citation_text, source_url, position, ai_mode_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [domainId, citation.query, citation.text, citation.sourceUrl, citation.position, citation.aiModeType]
      );

      const stored = result.rows[0];

      // Generate embeddings for the citation
      await embeddingsService.generateEmbeddings(citation.text, {
        citationId: stored.id,
        domainId,
        query: citation.query
      });

      // Emit real-time update
      const domain = await this.getDomainById(domainId);
      if (domain) {
        io.to(`domain:${domain.domain}`).emit('citation:new', stored);
      }

      // Invalidate cache
      await cache.invalidatePattern(`citations:domain:${domainId}:*`);

      return stored;
    } catch (error) {
      logger.error('Error tracking citation:', error);
      throw error;
    }
  }

  /**
   * Get citations for a domain
   */
  async getCitationsByDomain(domainId: number, options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<any> {
    const pool = getPool();
    const cacheKey = `citations:domain:${domainId}:${JSON.stringify(options)}`;

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    try {
      let query = `
        SELECT c.*, 
               COUNT(*) OVER() as total_count
        FROM citations c
        WHERE c.domain_id = $1
      `;
      const params: any[] = [domainId];
      let paramIndex = 2;

      if (options.startDate) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(options.endDate);
        paramIndex++;
      }

      query += ` ORDER BY c.created_at DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
        paramIndex++;
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
      }

      const result = await pool.query(query, params);

      const response = {
        citations: result.rows,
        total: result.rows[0]?.total_count || 0,
        limit: options.limit || null,
        offset: options.offset || 0
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, response, 300);

      return response;
    } catch (error) {
      logger.error('Error getting citations by domain:', error);
      throw error;
    }
  }

  /**
   * Analyze citation patterns
   */
  async analyzeCitationPatterns(domainId: number): Promise<any> {
    const pool = getPool();

    try {
      // Get citation frequency by query
      const queryFrequency = await pool.query(`
        SELECT query, COUNT(*) as count
        FROM citations
        WHERE domain_id = $1
        GROUP BY query
        ORDER BY count DESC
        LIMIT 20
      `, [domainId]);

      // Get citation frequency by AI mode type
      const typeFrequency = await pool.query(`
        SELECT ai_mode_type, COUNT(*) as count
        FROM citations
        WHERE domain_id = $1 AND ai_mode_type IS NOT NULL
        GROUP BY ai_mode_type
        ORDER BY count DESC
      `, [domainId]);

      // Get temporal patterns
      const temporalPatterns = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as count
        FROM citations
        WHERE domain_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date
      `, [domainId]);

      // Get position distribution
      const positionDistribution = await pool.query(`
        SELECT position, COUNT(*) as count
        FROM citations
        WHERE domain_id = $1 AND position IS NOT NULL
        GROUP BY position
        ORDER BY position
      `, [domainId]);

      return {
        queryFrequency: queryFrequency.rows,
        typeFrequency: typeFrequency.rows,
        temporalPatterns: temporalPatterns.rows,
        positionDistribution: positionDistribution.rows
      };
    } catch (error) {
      logger.error('Error analyzing citation patterns:', error);
      throw error;
    }
  }

  /**
   * Monitor AI Mode for citations
   */
  async monitorAiMode(query: string, domain: string): Promise<any[]> {
    try {
      // Use SerpAPI to get AI Overview results
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.serpApiKey,
          engine: 'google',
          location: 'United States',
          hl: 'en',
          gl: 'us'
        }
      });

      const citations: Citation[] = [];

      // Extract AI Overview/Mode citations
      if (response.data.ai_overview) {
        const aiOverview = response.data.ai_overview;
        
        // Process text blocks and references
        if (aiOverview.text_blocks) {
          for (const block of aiOverview.text_blocks) {
            if (block.snippet && block.snippet.includes(domain)) {
              citations.push({
                query,
                text: block.snippet,
                sourceUrl: this.findSourceUrl(block.reference_indexes, aiOverview.references),
                aiModeType: 'ai_overview',
                metadata: { block }
              });
            }
          }
        }
      }

      return citations;
    } catch (error) {
      logger.error('Error monitoring AI Mode:', error);
      return [];
    }
  }

  /**
   * Extract content from URL
   */
  async extractContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      const content = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();

      return content;
    } catch (error) {
      logger.error('Error extracting content:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async getDomainById(domainId: number): Promise<any> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM domains WHERE id = $1', [domainId]);
    return result.rows[0];
  }

  private findSourceUrl(referenceIndexes: number[], references: any[]): string | undefined {
    if (!referenceIndexes || !references || referenceIndexes.length === 0) {
      return undefined;
    }
    
    const firstIndex = referenceIndexes[0];
    const reference = references[firstIndex];
    return reference?.link;
  }
}

export const citationService = new CitationService();