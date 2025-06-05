import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../utils/logger';

let pineconeClient: Pinecone;
let index: any;

export async function initializeVectorStore(): Promise<void> {
  try {
    // Initialize Pinecone
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Get or create index
    const indexName = 'ai-search-intelligence';
    const indexList = await pineconeClient.listIndexes();
    
    if (!indexList.indexes?.find(idx => idx.name === indexName)) {
      await pineconeClient.createIndex({
        name: indexName,
        dimension: 3072, // OpenAI text-embedding-3-large
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: process.env.PINECONE_ENVIRONMENT || 'us-east-1'
          }
        }
      });
      
      logger.info('Pinecone index created');
    }

    index = pineconeClient.index(indexName);
    logger.info('Vector store initialized');
  } catch (error) {
    logger.error('Vector store initialization error:', error);
    throw error;
  }
}

export function getVectorIndex() {
  if (!index) {
    throw new Error('Vector store not initialized');
  }
  return index;
}

// Vector operations
export const vectorStore = {
  async upsert(vectors: any[]): Promise<void> {
    try {
      await index.upsert(vectors);
    } catch (error) {
      logger.error('Vector upsert error:', error);
      throw error;
    }
  },

  async query(vector: number[], topK: number = 10, filter?: any): Promise<any> {
    try {
      const results = await index.query({
        vector,
        topK,
        filter,
        includeMetadata: true,
        includeValues: true
      });
      return results;
    } catch (error) {
      logger.error('Vector query error:', error);
      throw error;
    }
  },

  async deleteByIds(ids: string[]): Promise<void> {
    try {
      await index.deleteMany(ids);
    } catch (error) {
      logger.error('Vector delete error:', error);
      throw error;
    }
  }
};