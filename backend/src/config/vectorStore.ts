import { DataAPIClient, Table, vector } from '@datastax/astra-db-ts';
import { logger } from '../utils/logger';

let table: Table<any, { id: string }>;

export async function initializeVectorStore(): Promise<void> {
  try {
    const endpoint = process.env.ASTRA_DB_ENDPOINT;
    const token = process.env.ASTRA_DB_TOKEN;
    if (!endpoint || !token) {
      throw new Error('Astra DB credentials are missing');
    }

    const client = new DataAPIClient({ logging: 'error' });
    const db = client.db(endpoint, { token });

    const VectorTableSchema = Table.schema({
      columns: {
        id: 'text',
        values: { type: 'vector', dimension: 3072 },
        metadata: 'json'
      },
      primaryKey: 'id'
    });

    table = await db.createTable('vectors', { definition: VectorTableSchema, ifNotExists: true });
    await table.createVectorIndex('vectors_values_idx', 'values', {
      options: { metric: 'cosine' },
      ifNotExists: true,
    });

    logger.info('Vector store initialized');
  } catch (error) {
    logger.error('Vector store initialization error:', error);
    throw error;
  }
}

export function getVectorTable() {
  if (!table) {
    throw new Error('Vector store not initialized');
  }
  return table;
}

export const vectorStore = {
  async upsert(vectors: any[]): Promise<void> {
    try {
      const docs = vectors.map(v => ({
        id: v.id,
        values: vector(v.values),
        metadata: v.metadata
      }));
      await table.insertMany(docs);
    } catch (error) {
      logger.error('Vector upsert error:', error);
      throw error;
    }
  },

  async query(values: number[], topK: number = 10, filter: any = {}): Promise<any> {
    try {
      const cursor = table
        .find(filter)
        .sort({ values: vector(values) })
        .includeSimilarity(true)
        .limit(topK);

      const matches: any[] = [];
      for await (const result of cursor) {
        matches.push({
          id: result.id,
          score: result.$similarity,
          metadata: result.metadata,
          values: result.values,
        });
      }
      return { matches };
    } catch (error) {
      logger.error('Vector query error:', error);
      throw error;
    }
  },

  async deleteByIds(ids: string[]): Promise<void> {
    try {
      for (const id of ids) {
        await table.deleteOne({ id });
      }
    } catch (error) {
      logger.error('Vector delete error:', error);
      throw error;
    }
  }
};
