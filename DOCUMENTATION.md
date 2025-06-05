# AI Search Intelligence Platform - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Installation Guide](#installation-guide)
4. [Configuration](#configuration)
5. [API Documentation](#api-documentation)
6. [Database Schema](#database-schema)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Project Overview

The AI Search Intelligence Platform is a comprehensive solution for analyzing and optimizing content for AI-powered search engines, specifically targeting Google's AI Mode and AI Overviews. The platform uses advanced embedding technologies and competitive intelligence to help content creators and SEO professionals understand how AI search engines select and cite content.

### Key Features
- **Citation Tracking**: Real-time monitoring of AI Mode/AIO citations
- **Embeddings Analysis**: Semantic similarity search using vector embeddings
- **Competitive Intelligence**: Analyze competitor content and identify gaps
- **Performance Prediction**: Test content before publication
- **Keyword Opportunities**: Discover synthetic queries and ranking opportunities
- **Real-time Updates**: WebSocket-based live monitoring

## Architecture

### Technology Stack

#### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ with pgvector extension
- **Cache**: Redis 7+
- **Vector Store**: Pinecone/Weaviate
- **Queue**: Bull (Redis-based)
- **Authentication**: JWT
- **Real-time**: Socket.io

#### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **Data Fetching**: React Query
- **Styling**: Tailwind CSS
- **Charts**: Chart.js, D3.js
- **Forms**: React Hook Form

### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Express API    │────▶│  PostgreSQL     │
│                 │     │                 │     │  + pgvector     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   WebSocket     │     │     Redis       │     │   Pinecone      │
│   (Socket.io)   │     │    (Cache)      │     │ (Vector Store)  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Installation Guide

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ai-search-intelligence.git
cd ai-search-intelligence
```

2. **Run the setup script**

Windows:
```bash
setup.bat
```

Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

3. **Configure environment variables**
- Edit `backend/.env` with your API keys and database credentials
- Edit `frontend/.env` if needed

4. **Set up the database**
```bash
cd backend
npm run db:migrate
npm run db:seed  # Optional: add sample data
```

5. **Start the services**

Backend:
```bash
cd backend
npm run dev
```

Frontend (in a new terminal):
```bash
cd frontend
npm start
```

### Docker Installation

```bash
docker-compose up
```

## Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Yes |
| `COHERE_API_KEY` | Cohere API key (fallback) | Optional |
| `PINECONE_API_KEY` | Pinecone vector store API key | Yes |
| `SERP_API_KEY` | SerpAPI key for search data | Yes |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | http://localhost:5000/api |
| `REACT_APP_SOCKET_URL` | WebSocket URL | http://localhost:5000 |

## API Documentation

### Authentication

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Citations

#### GET /api/citations/domain/:domainId
Get citations for a specific domain.

**Query Parameters:**
- `limit` (number): Maximum results to return
- `offset` (number): Pagination offset
- `startDate` (date): Filter by start date
- `endDate` (date): Filter by end date

#### POST /api/citations
Track a new citation.

**Request Body:**
```json
{
  "domainId": 1,
  "query": "how to optimize for AI search",
  "text": "Citation text...",
  "sourceUrl": "https://example.com",
  "position": 1,
  "aiModeType": "ai_overview"
}
```

### Analysis

#### POST /api/analysis/citation/:citationId
Analyze a specific citation.

#### POST /api/analysis/predict
Predict content performance.

**Request Body:**
```json
{
  "content": "Your content here...",
  "targetQuery": "target search query"
}
```

### Keywords

#### POST /api/keywords/track
Track keyword rankings.

**Request Body:**
```json
{
  "keyword": "AI search optimization"
}
```

#### GET /api/keywords/opportunities/:domainId
Get keyword opportunities for a domain.

#### POST /api/keywords/synthetic
Discover synthetic query variations.

**Request Body:**
```json
{
  "baseQuery": "how to optimize content"
}
```

## Database Schema

### Core Tables

#### users
- `id` (serial, primary key)
- `email` (varchar, unique)
- `password_hash` (varchar)
- `name` (varchar)
- `role` (varchar)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### domains
- `id` (serial, primary key)
- `user_id` (integer, foreign key)
- `domain` (varchar)
- `tracking_enabled` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### citations
- `id` (serial, primary key)
- `domain_id` (integer, foreign key)
- `query` (text)
- `citation_text` (text)
- `source_url` (text)
- `position` (integer)
- `ai_mode_type` (varchar)
- `created_at` (timestamp)

#### embeddings
- `id` (serial, primary key)
- `content_hash` (varchar, unique)
- `content` (text)
- `embedding` (vector)
- `metadata` (jsonb)
- `created_at` (timestamp)

#### keywords
- `id` (serial, primary key)
- `keyword` (varchar, unique)
- `search_volume` (integer)
- `difficulty` (float)
- `cpc` (float)
- `updated_at` (timestamp)

## Deployment

### Production Deployment Checklist

1. **Environment Setup**
   - [ ] Set `NODE_ENV=production`
   - [ ] Configure production database
   - [ ] Set up Redis cluster
   - [ ] Configure production API keys

2. **Security**
   - [ ] Use strong JWT secret
   - [ ] Enable HTTPS
   - [ ] Configure CORS properly
   - [ ] Set up rate limiting
   - [ ] Enable security headers (Helmet)

3. **Performance**
   - [ ] Enable gzip compression
   - [ ] Configure CDN for static assets
   - [ ] Set up database connection pooling
   - [ ] Configure Redis caching strategy

4. **Monitoring**
   - [ ] Set up error tracking (Sentry)
   - [ ] Configure application monitoring
   - [ ] Set up log aggregation
   - [ ] Configure uptime monitoring

### Deployment Options

#### Option 1: Traditional VPS
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build

# Use PM2 for process management
pm2 start dist/index.js --name ai-search-backend
```

#### Option 2: Docker
```bash
docker-compose -f docker-compose.production.yml up -d
```

#### Option 3: Cloud Platforms
- **AWS**: Use EC2 for compute, RDS for PostgreSQL, ElastiCache for Redis
- **Google Cloud**: Use App Engine, Cloud SQL, Memorystore
- **Heroku**: Deploy with Heroku Postgres and Redis add-ons

## Troubleshooting

### Common Issues

#### Database Connection Failed
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure pgvector extension is installed:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

#### Redis Connection Failed
- Check Redis is running
- Verify REDIS_URL is correct
- Check firewall rules

#### Embeddings Generation Failed
- Verify OpenAI API key is valid
- Check API rate limits
- Ensure Cohere API key is set as fallback

#### Frontend Can't Connect to Backend
- Check CORS configuration
- Verify API_URL in frontend .env
- Ensure backend is running on correct port

### Performance Optimization

1. **Database Optimization**
   - Create appropriate indexes
   - Use connection pooling
   - Optimize vector similarity searches

2. **Caching Strategy**
   - Cache embeddings aggressively
   - Use Redis for session management
   - Implement query result caching

3. **Frontend Optimization**
   - Enable React production build
   - Implement code splitting
   - Use React.memo for expensive components

### Getting Help

- Check the [Issues](https://github.com/yourusername/ai-search-intelligence/issues) page
- Join our [Discord](https://discord.gg/aisearchintel) community
- Review the [Wiki](https://github.com/yourusername/ai-search-intelligence/wiki) for detailed guides

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.