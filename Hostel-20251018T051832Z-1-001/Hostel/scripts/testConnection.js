const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_management';
    
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', mongoURI.replace(/\/\/.*@/, '//<credentials>@'));
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nExisting collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    await mongoose.connection.close();
    console.log('\nConnection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MongoDB is running');
    console.error('2. Check your connection string in .env file');
    console.error('3. Verify network/firewall settings');
    process.exit(1);
  }
}

testConnection();
