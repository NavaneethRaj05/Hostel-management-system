# 🏨 Hostel Management System - MongoDB Edition

Complete hostel management system with MongoDB database integration.

## 🎯 What's New?

Your application now uses **MongoDB** instead of JSON files for data storage!

### Benefits
- ⚡ **Faster** - Indexed queries and optimized performance
- 🔒 **Safer** - ACID transactions and data integrity
- 📈 **Scalable** - Handle thousands of students
- 🌐 **Cloud Ready** - Deploy to MongoDB Atlas
- 🔄 **Concurrent** - Multiple users can access simultaneously

## 🚀 Quick Setup (Choose One)

### Option 1: Automated Setup (Easiest)

**Windows:**
```bash
setup-mongodb.bat
```

**Mac/Linux:**
```bash
chmod +x setup-mongodb.sh
./setup-mongodb.sh
```

### Option 2: Manual Setup (5 minutes)

1. **Install MongoDB**
   ```bash
   # Windows: Download from mongodb.com
   # Mac: brew install mongodb-community
   # Linux: sudo apt-get install mongodb
   ```

2. **Install Dependencies**
   ```bash
   npm install mongoose dotenv
   ```

3. **Test Connection**
   ```bash
   npm run test:db
   ```

4. **Migrate Data**
   ```bash
   npm run migrate
   ```

5. **Switch Server**
   ```bash
   # Windows
   ren server.js server-json.js
   ren server-mongodb.js server.js
   
   # Mac/Linux
   mv server.js server-json.js
   mv server-mongodb.js server.js
   ```

6. **Start**
   ```bash
   npm start
   ```

## 📚 Documentation

- **[QUICKSTART_MONGODB.md](QUICKSTART_MONGODB.md)** - 5-minute setup guide
- **[MONGODB_SETUP.md](MONGODB_SETUP.md)** - Detailed setup instructions
- **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** - Technical details

## 🗂️ Project Structure

```
Hostel/
├── models/              # MongoDB schemas
│   ├── User.js
│   ├── Student.js
│   ├── Notice.js
│   ├── Room.js
│   └── Outpass.js
├── config/
│   └── database.js      # MongoDB connection
├── scripts/
│   ├── migrateToMongoDB.js
│   └── testConnection.js
├── server.js            # Original JSON server (backup)
├── server-mongodb.js    # New MongoDB server
├── .env                 # Configuration
└── db.json             # Original data (backup)
```

## 🔧 Available Scripts

```bash
npm start              # Start server
npm run dev           # Start with nodemon (auto-reload)
npm run migrate       # Migrate JSON to MongoDB
npm run test:db       # Test MongoDB connection
```

## 🌐 Using MongoDB Atlas (Cloud)

Don't want to install MongoDB? Use the free cloud version!

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0 - 512MB)
3. Get connection string
4. Update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hostel_management
   ```
5. Run: `npm run migrate`
6. Start: `npm start`

## 📊 Database Collections

- **users** - Authentication (students & wardens)
- **students** - Student profiles & attendance
- **notices** - Notice board posts
- **rooms** - Room configurations
- **outpasses** - Outpass requests

## 🔐 Default Credentials

**Warden:**
- Email: `warden@hostel.org`
- Password: `warden123`

**Student:** (after registration)
- Use your registered email and password

## 🛠️ Features

### For Students
- ✅ Register and login
- ✅ View profile and fees
- ✅ Submit outpass requests
- ✅ View attendance
- ✅ Submit complaints
- ✅ View notices

### For Wardens
- ✅ Manage students
- ✅ Assign rooms
- ✅ Manage fees
- ✅ Approve/reject outpasses
- ✅ Mark attendance
- ✅ Post notices
- ✅ View complaints

## 🔄 Rollback to JSON

If needed, you can go back to JSON storage:

```bash
# Windows
ren server.js server-mongodb.js
ren server-json.js server.js

# Mac/Linux
mv server.js server-mongodb.js
mv server-json.js server.js
```

Your data is backed up as `db.json.backup.[timestamp]`

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port Already in Use
```bash
# Change port in .env
PORT=3002
```

### Migration Failed
```bash
# Clear MongoDB and retry
mongosh
use hostel_management
db.dropDatabase()
exit

npm run migrate
```

## 📈 Performance Tips

1. **Indexes** - Automatically created for email, USN, room number
2. **Pagination** - Use for large student lists
3. **Caching** - Consider Redis for frequently accessed data
4. **Monitoring** - Use MongoDB Compass to monitor performance

## 🔒 Security

- ✅ Passwords hashed with bcrypt
- ✅ Environment variables for sensitive data
- ✅ Input validation
- ✅ SQL injection prevention (NoSQL)
- ✅ CORS enabled

## 📱 API Endpoints

All endpoints remain the same! Your frontend code doesn't need changes.

```
POST   /api/register          - Register student
POST   /api/login             - Login
POST   /api/forgot-password   - Reset password
GET    /api/students          - Get students (paginated)
POST   /api/assign-room       - Assign room
GET    /api/rooms             - Get rooms
GET    /api/notices           - Get notices
POST   /api/notices           - Create notice
GET    /api/outpass           - Get outpasses
POST   /api/outpass           - Create outpass
PUT    /api/outpass/:id       - Update outpass
GET    /api/attendance        - Get attendance
PUT    /api/attendance/:id    - Mark attendance
PUT    /api/fee/:id           - Update fee
```

## 🎓 Learning Resources

- [MongoDB University](https://university.mongodb.com/) - Free courses
- [Mongoose Docs](https://mongoosejs.com/docs/) - ODM documentation
- [MongoDB Compass](https://www.mongodb.com/products/compass) - GUI tool

## 🤝 Support

Need help?
1. Check documentation files
2. Run `npm run test:db` to verify connection
3. Check MongoDB logs
4. Ensure all dependencies are installed

## 📝 License

MIT License - Feel free to use for your projects!

## 🎉 You're All Set!

Your hostel management system is now powered by MongoDB. Enjoy the improved performance and scalability!

---

**Quick Links:**
- [Quick Start Guide](QUICKSTART_MONGODB.md)
- [Detailed Setup](MONGODB_SETUP.md)
- [Migration Details](MIGRATION_SUMMARY.md)
