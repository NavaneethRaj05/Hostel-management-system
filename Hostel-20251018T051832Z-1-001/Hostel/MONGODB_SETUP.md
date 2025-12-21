# MongoDB Setup Guide

This guide will help you migrate from JSON file storage to MongoDB.

## Prerequisites

1. **Install MongoDB**
   - **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - **Mac**: `brew install mongodb-community`
   - **Linux**: Follow [official guide](https://docs.mongodb.com/manual/administration/install-on-linux/)

2. **Install Node.js dependencies**
   ```bash
   npm install mongoose dotenv
   ```

## Setup Steps

### 1. Start MongoDB

**Windows:**
```bash
# Start MongoDB service
net start MongoDB
```

**Mac/Linux:**
```bash
# Start MongoDB
mongod --dbpath /path/to/data/directory
```

Or use MongoDB as a service:
```bash
brew services start mongodb-community  # Mac
sudo systemctl start mongod            # Linux
```

### 2. Create Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and configure your MongoDB connection:

```env
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/hostel_management

# For MongoDB Atlas (cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hostel_management

PORT=3001
NODE_ENV=development
```

### 3. Migrate Existing Data

Run the migration script to transfer data from `db.json` to MongoDB:

```bash
npm run migrate
```

This will:
- Connect to MongoDB
- Create all collections
- Transfer all data from `db.json`
- Create a backup of your JSON file

### 4. Switch to MongoDB Server

**Option A: Rename files (Recommended)**
```bash
# Backup old server
mv server.js server-json.js

# Use MongoDB server
mv server-mongodb.js server.js
```

**Option B: Update package.json**
```json
{
  "scripts": {
    "start": "node server-mongodb.js",
    "start:json": "node server.js"
  }
}
```

### 5. Start the Server

```bash
npm start
```

## MongoDB Atlas (Cloud) Setup

If you prefer cloud hosting:

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hostel_management
   ```

## Verify Migration

1. Check MongoDB data:
   ```bash
   # Connect to MongoDB shell
   mongosh

   # Switch to database
   use hostel_management

   # Check collections
   show collections

   # Count documents
   db.users.countDocuments()
   db.students.countDocuments()
   db.notices.countDocuments()
   ```

2. Test the application:
   - Login with existing credentials
   - Check if all data is visible
   - Try creating new records

## Database Schema

### Collections

1. **users** - User authentication
2. **students** - Student profiles
3. **notices** - Notice board
4. **rooms** - Room information
5. **outpasses** - Outpass requests

### Indexes

Indexes are automatically created for:
- User email and USN
- Student email, USN, and room number
- Outpass student ID and status

## Troubleshooting

### Connection Issues

**Error: "MongoServerError: Authentication failed"**
- Check username/password in connection string
- Verify database user permissions

**Error: "MongooseServerSelectionError"**
- Ensure MongoDB is running
- Check firewall settings
- Verify connection string

### Migration Issues

**Error: "Duplicate key error"**
- Data already exists in MongoDB
- Clear collections before re-running migration:
  ```bash
  mongosh
  use hostel_management
  db.dropDatabase()
  ```

### Performance

For better performance:
- Ensure indexes are created (automatic)
- Use pagination for large datasets
- Monitor query performance

## Backup and Restore

### Backup
```bash
mongodump --db hostel_management --out ./backup
```

### Restore
```bash
mongorestore --db hostel_management ./backup/hostel_management
```

## Rollback to JSON

If you need to go back to JSON storage:

```bash
# Restore original server
mv server-json.js server.js

# Start server
npm start
```

Your `db.json` backup is saved as `db.json.backup.[timestamp]`

## Support

For issues:
1. Check MongoDB logs
2. Verify connection string
3. Ensure all dependencies are installed
4. Check Node.js version (>=16.0.0)
