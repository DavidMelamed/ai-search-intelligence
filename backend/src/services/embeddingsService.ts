import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';
import crypto from 'crypto';
import { getPool } from '../config/database';
import { vectorStore } from '../config/vectorStore';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!
});

export class EmbeddingsService {
  private chunkSize: number;
  private chunkOverlap: number;
  private model: string;

  constructor() {
    this.chunkSize = parseInt(process.env.CHUNK_SIZE || '512');
    this.chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '128');
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
  }

  /**
   * Generate embeddings for text content
   */
  async generateEmbeddings(text: string, metadata: any = {}): Promise<any[]> {
    try {
      // Split text into chunks
      const chunks = this.splitIntoChunks(text);
      const embeddings = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const hash = this.generateHash(chunk);

        // Check if embedding already exists
        const cached = await this.getEmbeddingByHash(hash);
        if (cached) {
          embeddings.push(cached);
          continue;
        }

        // Generate new embedding
        const embedding = await this.generateSingleEmbedding(chunk);
        
        // Store in database and vector store
        const stored = await this.storeEmbedding({
          content: chunk,
          embedding,
          hash,
          metadata: {
            ...metadata,
            chunkIndex: i,
            totalChunks: chunks.length
          }
        });

        embeddings.push(stored);
      }

      return embeddings;
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single piece of text
   */
  private async generateSingleEmbedding(text: string): Promise<number[]> {
    try {
      // Try OpenAI first
      const response = await openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.warn('OpenAI embedding failed, trying Cohere:', error);
      
      // Fallback to Cohere
      const response = await cohere.embed({
        texts: [text],
        model: 'embed-english-v3.0',
        inputType: 'search_document'
      });

      return response.embeddings[0];
    }
  }

  /**
   * Split text into overlapping chunks
   */
  private splitIntoChunks(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += this.chunkSize - this.chunkOverlap) {
      const chunk = words.slice(i, i + this.chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Generate hash for content
   */
  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get embedding by content hash
   */
  private async getEmbeddingByHash(hash: string): Promise<any | null> {
    const pool = getPool();
    const cacheKey = `embedding:${hash}`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Check database
    const result = await pool.query(
      'SELECT * FROM embeddings WHERE content_hash = $1',
      [hash]
    );

    if (result.rows.length > 0) {
      const embedding = result.rows[0];
      await cache.set(cacheKey, embedding, 3600); // Cache for 1 hour
      return embedding;
    }

    return null;
  }

  /**
   * Store embedding in database and vector store
   */
  private async storeEmbedding(data: {
    content: string;
    embedding: number[];
    hash: string;
    metadata: any;
  }): Promise<any> {
    const pool = getPool();
    
    try {
      // Store in PostgreSQL
      const result = await pool.query(
        `INSERT INTO embeddings (content_hash, content, embedding, metadata)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (content_hash) DO UPDATE
         SET updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [data.hash, data.content, JSON.stringify(data.embedding), data.metadata]
      );

      const stored = result.rows[0];

      // Store in Pinecone
      await vectorStore.upsert([{
        id: data.hash,
        values: data.embedding,
        metadata: {
          content: data.content,
          ...data.metadata
        }
      }]);

      return stored;
    } catch (error) {
      logger.error('Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Search for similar embeddings
   */
  async searchSimilar(query: string, topK: number = 10, filter?: any): Promise<any[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateSingleEmbedding(query);

      // Search in vector store
      const results = await vectorStore.query(queryEmbedding, topK, filter);

      // Enrich with database data
      const enriched = await Promise.all(
        results.matches.map(async (match: any) => {
          const dbData = await this.getEmbeddingByHash(match.id);
          return {
            ...match,
            content: dbData?.content || match.metadata?.content,
            metadata: {
              ...dbData?.metadata,
              ...match.metadata
            }
          };
        })
      );

      return enriched;
    } catch (error) {
      logger.error('Error searching similar embeddings:', error);
      throw error;
    }
  }
}

export const embeddingsService = new EmbeddingsService();