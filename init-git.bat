@echo off

echo Initializing git repository...

cd /d "C:\Users\Owner\OneDrive\Desktop\ai-search-intelligence"

rem Initialize git
git init

rem Add all files
git add .

rem Create initial commit
git commit -m "Initial commit: AI Search Intelligence Platform"

echo.
echo Git repository initialized!
echo.
echo To complete setup:
echo 1. Create a repository on GitHub named 'ai-search-intelligence'
echo 2. Run: git remote add origin https://github.com/YOUR_USERNAME/ai-search-intelligence.git
echo 3. Run: git branch -M main
echo 4. Run: git push -u origin main
echo.
pause