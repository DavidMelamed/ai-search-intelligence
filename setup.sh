#!/bin/bash

echo "Setting up AI Search Intelligence Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install PostgreSQL 15+ with pgvector extension."
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "Redis is not installed. Please install Redis 7+."
    exit 1
fi

echo "Installing backend dependencies..."
cd backend
npm install

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "Creating environment files..."
cd ..
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your API keys and database credentials"
echo "2. Update frontend/.env with your configuration"
echo "3. Run 'npm run db:migrate' in the backend directory to set up the database"
echo "4. Start the backend: cd backend && npm run dev"
echo "5. Start the frontend: cd frontend && npm start"
echo ""
echo "Or use Docker Compose: docker-compose up"