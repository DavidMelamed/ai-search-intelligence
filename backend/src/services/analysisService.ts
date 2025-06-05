import OpenAI from 'openai';
import { getPool } from '../config/database';
import { embeddingsService } from './embeddingsService';
import { citationService } from './citationService';
import { keywordService } from './keywordService';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export class AnalysisService {
  /**
   * Analyze a citation and find similar content
   */
  async analyzeCitation(citationId: number): Promise<any> {
    const pool = getPool();

    try {
      // Get citation details
      const citationResult = await pool.query(
        'SELECT * FROM citations WHERE id = $1',
        [citationId]
      );
      
      if (citationResult.rows.length === 0) {
        throw new Error('Citation not found');
      }

      const citation = citationResult.rows[0];

      // Find similar chunks
      const similarChunks = await embeddingsService.searchSimilar(
        citation.citation_text,
        20 // Get top 20 similar chunks
      );

      // Extract URLs from similar chunks
      const urls = [...new Set(similarChunks
        .map(chunk => chunk.metadata?.sourceUrl)
        .filter(Boolean))];

      // Get keywords for those URLs
      const keywordMatches = await keywordService.getKeywordsForUrls(urls);

      // Generate reasoning hypothesis
      const reasoningHypothesis = await this.generateReasoningHypothesis(
        citation,
        similarChunks,
        keywordMatches
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        citation,
        similarChunks,
        keywordMatches,
        reasoningHypothesis
      );

      // Store analysis
      const analysisResult = await pool.query(
        `INSERT INTO analyses (citation_id, similar_chunks, keyword_matches, reasoning_hypothesis, recommendations)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (citation_id) DO UPDATE
         SET similar_chunks = $2, keyword_matches = $3, reasoning_hypothesis = $4, recommendations = $5, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          citationId,
          JSON.stringify(similarChunks),
          JSON.stringify(keywordMatches),
          reasoningHypothesis,
          JSON.stringify(recommendations)
        ]
      );

      return analysisResult.rows[0];
    } catch (error) {
      logger.error('Error analyzing citation:', error);
      throw error;
    }
  }

  /**
   * Generate reasoning hypothesis using AI
   */
  private async generateReasoningHypothesis(
    citation: any,
    similarChunks: any[],
    keywordMatches: any[]
  ): Promise<string> {
    try {
      const prompt = `
        Analyze why this content was selected for the AI search response.
        
        Query: ${citation.query}
        Citation: ${citation.citation_text}
        
        Similar content chunks found:
        ${similarChunks.slice(0, 5).map((chunk, i) => 
          `${i + 1}. ${chunk.content.substring(0, 200)}... (similarity: ${chunk.score})`
        ).join('\n')}
        
        Keywords these similar chunks rank for:
        ${keywordMatches.slice(0, 10).map(km => 
          `- ${km.keyword} (volume: ${km.search_volume}, difficulty: ${km.difficulty})`
        ).join('\n')}
        
        Based on this data, provide a hypothesis for why this specific content was chosen by the AI. Consider:
        1. Topical relevance
        2. Content quality signals
        3. Semantic similarity patterns
        4. Authority indicators
        
        Be specific and actionable.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an AI search optimization expert.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content || 'Unable to generate hypothesis';
    } catch (error) {
      logger.error('Error generating reasoning hypothesis:', error);
      return 'Error generating hypothesis';
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateRecommendations(
    citation: any,
    similarChunks: any[],
    keywordMatches: any[],
    reasoningHypothesis: string
  ): Promise<any[]> {
    try {
      const prompt = `
        Based on the following analysis, provide specific recommendations for optimizing content to increase AI citation probability.
        
        Query: ${citation.query}
        Current Citation: ${citation.citation_text}
        
        Reasoning Hypothesis: ${reasoningHypothesis}
        
        Top Keywords in Similar Content:
        ${keywordMatches.slice(0, 10).map(km => 
          `- ${km.keyword} (volume: ${km.search_volume})`
        ).join('\n')}
        
        Provide 5 specific, actionable recommendations. For each recommendation:
        1. What to do
        2. Why it will help
        3. Expected impact (percentage increase in citation probability)
        4. Priority (high/medium/low)
        
        Format as JSON array.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an AI search optimization expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const content = response.choices[0].message.content || '[]';
      
      try {
        return JSON.parse(content);
      } catch {
        return [{
          action: 'Review AI recommendations',
          reason: 'Manual review needed',
          impact: 'Unknown',
          priority: 'medium'
        }];
      }
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Predict content performance
   */
  async predictContentPerformance(content: string, targetQuery: string): Promise<any> {
    try {
      // Generate embeddings for the content
      const embeddings = await embeddingsService.generateEmbeddings(content);

      // Find similar already-cited content
      const similarCitations = await Promise.all(
        embeddings.map(emb => 
          embeddingsService.searchSimilar(emb.content, 10, {
            hasCitation: true
          })
        )
      );

      // Flatten and deduplicate
      const allSimilar = similarCitations.flat();
      const uniqueSimilar = Array.from(new Map(
        allSimilar.map(item => [item.id, item])
      ).values());

      // Calculate citation probability
      const citedCount = uniqueSimilar.filter(s => s.metadata?.citationId).length;
      const citationProbability = (citedCount / uniqueSimilar.length) * 100;

      // Identify gaps
      const gaps = await this.identifyContentGaps(content, uniqueSimilar, targetQuery);

      // Generate optimization suggestions
      const suggestions = await this.generateOptimizationSuggestions(
        content,
        gaps,
        citationProbability
      );

      return {
        citationProbability,
        similarContentAnalyzed: uniqueSimilar.length,
        gaps,
        suggestions
      };
    } catch (error) {
      logger.error('Error predicting content performance:', error);
      throw error;
    }
  }

  /**
   * Identify content gaps
   */
  private async identifyContentGaps(
    content: string,
    similarContent: any[],
    targetQuery: string
  ): Promise<any[]> {
    // Extract common themes from similar cited content
    const citedContent = similarContent.filter(s => s.metadata?.citationId);
    
    if (citedContent.length === 0) {
      return [];
    }

    try {
      const prompt = `
        Analyze the content gaps between the provided content and similar content that has been cited in AI search results.
        
        Target Query: ${targetQuery}
        
        Provided Content (first 1000 chars):
        ${content.substring(0, 1000)}...
        
        Similar Cited Content Samples:
        ${citedContent.slice(0, 3).map((c, i) => 
          `${i + 1}. ${c.content.substring(0, 300)}...`
        ).join('\n\n')}
        
        Identify 3-5 specific content gaps. For each gap:
        1. What is missing
        2. Why it matters for AI citation
        3. How to address it
        
        Format as JSON array.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an AI content optimization expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 600
      });

      const content = response.choices[0].message.content || '[]';
      
      try {
        return JSON.parse(content);
      } catch {
        return [];
      }
    } catch (error) {
      logger.error('Error identifying content gaps:', error);
      return [];
    }
  }

  /**
   * Generate optimization suggestions
   */
  private async generateOptimizationSuggestions(
    content: string,
    gaps: any[],
    citationProbability: number
  ): Promise<any[]> {
    const suggestions = [];

    // Structure suggestions
    if (content.length > 5000 && !content.includes('## ')) {
      suggestions.push({
        type: 'structure',
        priority: 'high',
        suggestion: 'Break content into clear sections with headers',
        impact: '+15% citation probability'
      });
    }

    // Chunk optimization
    const avgSentenceLength = content.split('.').length / (content.length / 1000);
    if (avgSentenceLength > 3) {
      suggestions.push({
        type: 'readability',
        priority: 'medium',
        suggestion: 'Shorten sentences for better chunk extraction',
        impact: '+10% citation probability'
      });
    }

    // Gap-based suggestions
    gaps.forEach(gap => {
      suggestions.push({
        type: 'content',
        priority: 'high',
        suggestion: gap.how_to_address || 'Address content gap',
        impact: '+20% citation probability'
      });
    });

    // Citation probability based suggestions
    if (citationProbability < 30) {
      suggestions.push({
        type: 'overall',
        priority: 'high',
        suggestion: 'Major content overhaul recommended - current citation probability is low',
        impact: 'Potential 2-3x improvement'
      });
    }

    return suggestions;
  }
}

export const analysisService = new AnalysisService();