# AI Search Intelligence Platform

A comprehensive platform for analyzing and optimizing content for AI-powered search engines (Google AI Mode, AI Overviews) using embeddings-based competitive intelligence.

## Overview

This platform helps content creators and SEO professionals understand how AI search engines select and cite content by:
- Tracking AI Mode/AIO citations in real-time
- Building semantic embeddings of web content
- Analyzing competitive landscapes through vector similarity
- Reverse-engineering AI selection patterns
- Predicting content performance in AI search

## Features

### Core Capabilities
- **Citation Intelligence**: Track when and how your content is cited in AI responses
- **Semantic Competition Mapping**: Visualize content relationships in embedding space
- **Ranking Correlation**: Analyze relationships between traditional SERP and AI citations
- **Content Optimization**: Get AI-driven recommendations for improving citation probability

### Advanced Features
- **Synthetic Query Discovery**: Identify AI-generated query variations
- **Performance Prediction**: Test content before publication
- **Real-time Monitoring**: Live tracking of AI search behavior
- **API Access**: Integrate with existing SEO workflows

## Architecture

### Backend (Node.js/TypeScript)
- Express.js API server
- PostgreSQL with pgvector for embeddings storage
- Redis for caching and real-time features
- OpenAI/Cohere for embeddings generation
- Pinecone/Weaviate for vector search

### Frontend (React/TypeScript)
- Modern React with TypeScript
- D3.js for data visualization
- Real-time updates via WebSocket
- Responsive dashboard interface

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Python 3.9+ (for data processing scripts)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-search-intelligence.git
cd ai-search-intelligence
```

2. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Configure environment variables:
```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit with your API keys and configuration
```

4. Set up the database:
```bash
cd backend
npm run db:migrate
npm run db:seed
```

5. Start the services:
```bash
# Backend (in one terminal)
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm start
```

## Usage

### Quick Start
1. Access the dashboard at `http://localhost:3000`
2. Add domains to track
3. Configure AI Mode monitoring
4. View citation analytics and recommendations

### API Examples

#### Analyze a citation:
```bash
curl -X POST http://localhost:5000/api/analyze/citation \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "citation": "Your citation text here",
    "query": "Original search query"
  }'
```

#### Get domain insights:
```bash
curl http://localhost:5000/api/track/domain/example.com \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Development

### Project Structure
```
ai-search-intelligence/
├── backend/
│   ├── src/
│   │   ├── api/          # API routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   └── utils/        # Utilities
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API clients
│   │   └── utils/        # Frontend utilities
│   └── package.json
├── scripts/              # Data processing scripts
└── docker-compose.yml    # Container orchestration
```

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Contributing
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Roadmap

### Phase 1 (MVP) - Current
- [x] Basic citation extraction
- [x] Embeddings generation
- [x] Simple similarity search
- [ ] Basic web interface

### Phase 2 (Core Features)
- [ ] Advanced embedding models
- [ ] Competitive analysis
- [ ] API development
- [ ] Performance optimization

### Phase 3 (Advanced Intelligence)
- [ ] AI reasoning simulation
- [ ] Predictive modeling
- [ ] Real-time monitoring
- [ ] Enterprise features

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Documentation: [docs.aisearchintel.com](https://docs.aisearchintel.com)
- Issues: [GitHub Issues](https://github.com/yourusername/ai-search-intelligence/issues)
- Discord: [Join our community](https://discord.gg/aisearchintel)

## Acknowledgments

Built with ❤️ by the AI Search Intelligence team.