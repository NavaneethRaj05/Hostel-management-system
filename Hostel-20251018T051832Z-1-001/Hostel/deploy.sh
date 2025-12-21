#!/bin/bash

# Hostel Management System - Deployment Script
echo "🚀 Starting deployment process..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Hostel Management System"
fi

# Check if remote origin exists
if ! git remote | grep -q origin; then
    echo "⚠️  No remote origin found. Please add your GitHub repository:"
    echo "git remote add origin https://github.com/yourusername/hostel-management.git"
    echo "git push -u origin main"
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy: $(date)"
git push origin main

echo "✅ Code pushed to GitHub successfully!"
echo ""
echo "🌐 Now you can deploy to:"
echo "1. Vercel: https://vercel.com (Recommended)"
echo "2. Netlify: https://netlify.com"
echo "3. Railway: https://railway.app"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
