#!/bin/bash

# Initialize git repository
cd "C:\Users\Owner\OneDrive\Desktop\ai-search-intelligence"

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: AI Search Intelligence Platform"

# Add remote origin (replace with your GitHub username)
# git remote add origin https://github.com/YOUR_USERNAME/ai-search-intelligence.git

# Push to GitHub (uncomment after adding remote)
# git branch -M main
# git push -u origin main

echo "Git repository initialized!"
echo "To complete setup:"
echo "1. Create a repository on GitHub named 'ai-search-intelligence'"
echo "2. Run: git remote add origin https://github.com/YOUR_USERNAME/ai-search-intelligence.git"
echo "3. Run: git branch -M main"
echo "4. Run: git push -u origin main"