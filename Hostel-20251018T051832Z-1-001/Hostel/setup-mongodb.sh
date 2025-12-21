#!/bin/bash

echo "========================================"
echo "MongoDB Setup for Hostel Management"
echo "========================================"
echo ""

echo "Step 1: Installing dependencies..."
npm install mongoose dotenv
echo ""

echo "Step 2: Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env file created. Please edit it with your MongoDB connection string."
else
    echo ".env file already exists."
fi
echo ""

echo "Step 3: Checking MongoDB connection..."
echo "Please ensure MongoDB is running before proceeding."
echo ""
read -p "Press Enter to continue..."

echo "Step 4: Running migration..."
npm run migrate
echo ""

echo "Step 5: Switching to MongoDB server..."
if [ -f server.js ]; then
    mv server.js server-json.js
    echo "Backed up original server as server-json.js"
fi
mv server-mongodb.js server.js
echo "MongoDB server is now active."
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "To start the server, run: npm start"
echo ""
echo "For more information, see MONGODB_SETUP.md"
echo ""
