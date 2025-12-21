# Quick Start: MongoDB Migration

## 🚀 Fast Setup (5 minutes)

### Step 1: Install MongoDB

**Windows:**
1. Download: https://www.mongodb.com/try/download/community
2. Run installer (use default settings)
3. MongoDB will start automatically as a service

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### Step 2: Install Dependencies

```bash
npm install mongoose dotenv
```

### Step 3: Test MongoDB Connection

```bash
npm run test:db
```

If successful, you'll see: ✅ MongoDB connection successful!

### Step 4: Migrate Your Data

```bash
npm run migrate
```

This transfers all data from `db.json` to MongoDB.

### Step 5: Switch to MongoDB Server

**Windows:**
```bash
ren server.js server-json.js
ren server-mongodb.js server.js
```

**Mac/Linux:**
```bash
mv server.js server-json.js
mv server-mongodb.js server.js
```

### Step 6: Start Server

```bash
npm start
```

Done! Your application now uses MongoDB! 🎉

---

## 🌐 Using MongoDB Atlas (Cloud - Free)

Don't want to install MongoDB locally? Use the cloud!

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Create a free cluster (M0)
4. Get connection string
5. Create `.env` file:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hostel_management
   ```
6. Run migration: `npm run migrate`
7. Start server: `npm start`

---

## 📋 Automated Setup

**Windows:**
```bash
setup-mongodb.bat
```

**Mac/Linux:**
```bash
chmod +x setup-mongodb.sh
./setup-mongodb.sh
```

---

## ✅ Verify Everything Works

1. Open http://localhost:3001
2. Login with existing credentials
3. Check if all data is visible
4. Try creating a new notice or student

---

## 🔄 Rollback to JSON (if needed)

```bash
# Windows
ren server.js server-mongodb.js
ren server-json.js server.js

# Mac/Linux
mv server.js server-mongodb.js
mv server-json.js server.js
```

Your original data is backed up as `db.json.backup.[timestamp]`

---

## 🆘 Troubleshooting

**"MongooseServerSelectionError"**
- MongoDB is not running
- Solution: Start MongoDB service

**"Authentication failed"**
- Wrong credentials in connection string
- Solution: Check username/password in `.env`

**"Port 27017 already in use"**
- Another MongoDB instance is running
- Solution: Stop other instance or use different port

**Need help?**
- Check `MONGODB_SETUP.md` for detailed guide
- Verify MongoDB is running: `mongosh` (should connect)
- Test connection: `npm run test:db`

---

## 📊 Benefits of MongoDB

✅ Better performance with large datasets
✅ Powerful queries and aggregations
✅ Automatic indexing
✅ Scalable (can handle millions of records)
✅ Cloud hosting available (MongoDB Atlas)
✅ Better data integrity
✅ Concurrent access support

---

## 🎯 What Changed?

- ✅ Data now stored in MongoDB instead of `db.json`
- ✅ All API endpoints work the same
- ✅ Frontend code unchanged
- ✅ Better performance and reliability
- ✅ Can scale to handle more users

Your application works exactly the same, just faster and more reliable!
