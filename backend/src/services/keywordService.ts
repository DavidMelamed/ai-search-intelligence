import axios from 'axios';
import { getPool } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';

export class KeywordService {
  private serpApiKey: string;

  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY || '';
  }

  /**
   * Get keywords for URLs
   */
  async getKeywordsForUrls(urls: string[]): Promise<any[]> {
    const pool = getPool();
    
    try {
      // Get existing keyword data
      const result = await pool.query(`
        SELECT DISTINCT k.*, ur.url, ur.position
        FROM url_rankings ur
        JOIN keywords k ON k.id = ur.keyword_id
        WHERE ur.url = ANY($1)
        ORDER BY k.search_volume DESC
      `, [urls]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting keywords for URLs:', error);
      return [];
    }
  }

  /**
   * Track keyword rankings
   */
  async trackKeywordRankings(keyword: string): Promise<any> {
    try {
      // Check if keyword exists
      const pool = getPool();
      let keywordId: number;

      const existingKeyword = await pool.query(
        'SELECT id FROM keywords WHERE keyword = $1',
        [keyword]
      );

      if (existingKeyword.rows.length > 0) {
        keywordId = existingKeyword.rows[0].id;
      } else {
        // Create new keyword entry
        const keywordResult = await pool.query(
          'INSERT INTO keywords (keyword) VALUES ($1) RETURNING id',
          [keyword]
        );
        keywordId = keywordResult.rows[0].id;
      }

      // Get SERP data
      const serpData = await this.getSerpData(keyword);

      // Store rankings
      const rankings = [];
      for (const result of serpData.organic_results || []) {
        const ranking = await pool.query(
          `INSERT INTO url_rankings (url, keyword_id, position, has_ai_mode)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (url, keyword_id) DO UPDATE
           SET position = $3, has_ai_mode = $4, checked_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [result.link, keywordId, result.position, serpData.ai_overview ? true : false]
        );
        rankings.push(ranking.rows[0]);
      }

      // Update keyword metrics
      if (serpData.search_information) {
        await pool.query(
          `UPDATE keywords 
           SET search_volume = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [keywordId, serpData.search_information.total_results]
        );
      }

      return {
        keyword,
        keywordId,
        rankings,
        hasAiMode: !!serpData.ai_overview
      };
    } catch (error) {
      logger.error('Error tracking keyword rankings:', error);
      throw error;
    }
  }

  /**
   * Get SERP data from API
   */
  private async getSerpData(keyword: string): Promise<any> {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: keyword,
          api_key: this.serpApiKey,
          engine: 'google',
          location: 'United States',
          hl: 'en',
          gl: 'us',
          num: 100 // Get top 100 results
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting SERP data:', error);
      throw error;
    }
  }

  /**
   * Analyze keyword opportunities
   */
  async analyzeKeywordOpportunities(domainId: number): Promise<any> {
    const pool = getPool();

    try {
      // Get domain
      const domainResult = await pool.query(
        'SELECT domain FROM domains WHERE id = $1',
        [domainId]
      );

      if (domainResult.rows.length === 0) {
        throw new Error('Domain not found');
      }

      const domain = domainResult.rows[0].domain;

      // Get keywords where domain doesn't rank but has citations
      const citationKeywords = await pool.query(`
        SELECT DISTINCT c.query as keyword, COUNT(*) as citation_count
        FROM citations c
        WHERE c.domain_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM url_rankings ur
          JOIN keywords k ON k.id = ur.keyword_id
          WHERE k.keyword = c.query
          AND ur.url LIKE '%' || $2 || '%'
        )
        GROUP BY c.query
        ORDER BY citation_count DESC
        LIMIT 20
      `, [domainId, domain]);

      // Get keywords where competitors rank but domain doesn't
      const competitorKeywords = await pool.query(`
        WITH domain_rankings AS (
          SELECT DISTINCT k.keyword, MIN(ur.position) as best_position
          FROM url_rankings ur
          JOIN keywords k ON k.id = ur.keyword_id
          WHERE ur.url LIKE '%' || $1 || '%'
          GROUP BY k.keyword
        ),
        competitor_rankings AS (
          SELECT k.keyword, k.search_volume, k.difficulty, 
                 COUNT(DISTINCT ur.url) as competitor_count,
                 MIN(ur.position) as best_competitor_position
          FROM url_rankings ur
          JOIN keywords k ON k.id = ur.keyword_id
          WHERE ur.url NOT LIKE '%' || $1 || '%'
          AND ur.position <= 10
          AND k.search_volume > 100
          GROUP BY k.keyword, k.search_volume, k.difficulty
        )
        SELECT cr.*, dr.best_position as our_position
        FROM competitor_rankings cr
        LEFT JOIN domain_rankings dr ON dr.keyword = cr.keyword
        WHERE dr.keyword IS NULL OR dr.best_position > 20
        ORDER BY cr.search_volume DESC
        LIMIT 20
      `, [domain]);

      // Get AI Mode presence analysis
      const aiModeAnalysis = await pool.query(`
        SELECT 
          COUNT(DISTINCT k.keyword) as total_keywords,
          COUNT(DISTINCT CASE WHEN ur.has_ai_mode THEN k.keyword END) as keywords_with_ai_mode,
          AVG(CASE WHEN ur.has_ai_mode THEN ur.position END) as avg_position_with_ai_mode,
          AVG(CASE WHEN NOT ur.has_ai_mode THEN ur.position END) as avg_position_without_ai_mode
        FROM url_rankings ur
        JOIN keywords k ON k.id = ur.keyword_id
        WHERE ur.url LIKE '%' || $1 || '%'
      `, [domain]);

      return {
        citationOpportunities: citationKeywords.rows,
        competitorGaps: competitorKeywords.rows,
        aiModeAnalysis: aiModeAnalysis.rows[0]
      };
    } catch (error) {
      logger.error('Error analyzing keyword opportunities:', error);
      throw error;
    }
  }

  /**
   * Get keyword trends
   */
  async getKeywordTrends(keywords: string[]): Promise<any> {
    const pool = getPool();

    try {
      const trends = await Promise.all(keywords.map(async (keyword) => {
        // Get historical data
        const history = await pool.query(`
          SELECT 
            DATE_TRUNC('week', ur.checked_at) as week,
            AVG(ur.position) as avg_position,
            bool_or(ur.has_ai_mode) as has_ai_mode
          FROM url_rankings ur
          JOIN keywords k ON k.id = ur.keyword_id
          WHERE k.keyword = $1
          AND ur.checked_at >= NOW() - INTERVAL '3 months'
          GROUP BY week
          ORDER BY week
        `, [keyword]);

        // Get current metrics
        const current = await pool.query(`
          SELECT k.*, 
                 COUNT(DISTINCT ur.url) as total_results,
                 COUNT(DISTINCT CASE WHEN ur.has_ai_mode THEN ur.url END) as ai_mode_results
          FROM keywords k
          LEFT JOIN url_rankings ur ON ur.keyword_id = k.id
          WHERE k.keyword = $1
          GROUP BY k.id
        `, [keyword]);

        return {
          keyword,
          current: current.rows[0],
          history: history.rows
        };
      }));

      return trends;
    } catch (error) {
      logger.error('Error getting keyword trends:', error);
      throw error;
    }
  }

  /**
   * Discover synthetic queries
   */
  async discoverSyntheticQueries(baseQuery: string): Promise<any> {
    try {
      // Get related searches
      const serpData = await this.getSerpData(baseQuery);
      const relatedSearches = serpData.related_searches?.map((rs: any) => rs.query) || [];

      // Get people also ask
      const peopleAlsoAsk = serpData.related_questions?.map((rq: any) => rq.question) || [];

      // Analyze patterns
      const patterns = this.analyzeSyntheticPatterns(baseQuery, [...relatedSearches, ...peopleAlsoAsk]);

      // Get citation data for variations
      const pool = getPool();
      const citationData = await pool.query(`
        SELECT query, COUNT(*) as citation_count
        FROM citations
        WHERE query = ANY($1)
        GROUP BY query
      `, [[baseQuery, ...relatedSearches, ...peopleAlsoAsk]]);

      return {
        baseQuery,
        relatedSearches,
        peopleAlsoAsk,
        patterns,
        citationData: citationData.rows
      };
    } catch (error) {
      logger.error('Error discovering synthetic queries:', error);
      throw error;
    }
  }

  /**
   * Analyze synthetic query patterns
   */
  private analyzeSyntheticPatterns(baseQuery: string, variations: string[]): any {
    const patterns = {
      prefixes: new Set<string>(),
      suffixes: new Set<string>(),
      templates: [] as string[]
    };

    variations.forEach(variation => {
      // Check for common prefixes
      const commonPrefixes = ['how to', 'what is', 'why', 'when', 'where', 'best', 'top'];
      commonPrefixes.forEach(prefix => {
        if (variation.toLowerCase().startsWith(prefix) && !baseQuery.toLowerCase().startsWith(prefix)) {
          patterns.prefixes.add(prefix);
        }
      });

      // Check for common suffixes
      const commonSuffixes = ['tutorial', 'guide', 'tips', 'examples', 'vs', 'comparison', 'review'];
      commonSuffixes.forEach(suffix => {
        if (variation.toLowerCase().includes(suffix) && !baseQuery.toLowerCase().includes(suffix)) {
          patterns.suffixes.add(suffix);
        }
      });
    });

    // Generate templates
    patterns.prefixes.forEach(prefix => {
      patterns.templates.push(`${prefix} ${baseQuery}`);
    });

    patterns.suffixes.forEach(suffix => {
      patterns.templates.push(`${baseQuery} ${suffix}`);
    });

    return {
      prefixes: Array.from(patterns.prefixes),
      suffixes: Array.from(patterns.suffixes),
      templates: patterns.templates
    };
  }
}

export const keywordService = new KeywordService();