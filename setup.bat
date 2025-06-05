@echo off

echo Setting up AI Search Intelligence Platform...

rem Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd backend
call npm install

echo Installing frontend dependencies...
cd ..\frontend
call npm install

echo Creating environment files...
cd ..
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Update backend\.env with your API keys and database credentials
echo 2. Update frontend\.env with your configuration
echo 3. Run 'npm run db:migrate' in the backend directory to set up the database
echo 4. Start the backend: cd backend ^&^& npm run dev
echo 5. Start the frontend: cd frontend ^&^& npm start
echo.
echo Or use Docker Compose: docker-compose up
echo.
pause