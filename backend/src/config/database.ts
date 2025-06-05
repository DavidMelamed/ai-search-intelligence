import { Pool } from 'pg';
import pgvector from 'pgvector/pg';
import { logger } from '../utils/logger';

let pool: Pool;

export async function connectDatabase(): Promise<Pool> {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Register pgvector extension
    await pgvector.registerTypes(pool);

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    logger.info('Database connected successfully');

    // Create tables if they don't exist
    await createTables();

    return pool;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
}

async function createTables() {
  const client = await pool.connect();
  
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Domains table
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        tracking_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, domain)
      )
    `);

    // Citations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS citations (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        citation_text TEXT NOT NULL,
        source_url TEXT,
        position INTEGER,
        ai_mode_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Embeddings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        content_hash VARCHAR(64) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        embedding vector(3072),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Keywords table
    await client.query(`
      CREATE TABLE IF NOT EXISTS keywords (
        id SERIAL PRIMARY KEY,
        keyword VARCHAR(500) NOT NULL,
        search_volume INTEGER,
        difficulty FLOAT,
        cpc FLOAT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(keyword)
      )
    `);

    // URL Rankings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS url_rankings (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        keyword_id INTEGER REFERENCES keywords(id) ON DELETE CASCADE,
        position INTEGER,
        has_ai_mode BOOLEAN DEFAULT false,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        citation_id INTEGER REFERENCES citations(id) ON DELETE CASCADE,
        similar_chunks JSONB,
        keyword_matches JSONB,
        reasoning_hypothesis TEXT,
        recommendations JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
      ON embeddings USING ivfflat (embedding vector_cosine_ops)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_citations_domain_id 
      ON citations(domain_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_url_rankings_keyword_id 
      ON url_rankings(keyword_id)
    `);

    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}