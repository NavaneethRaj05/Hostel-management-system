# 🚀 Hostel Management System - Deployment Guide

## 📋 Prerequisites
- Node.js installed on your system
- Git installed
- A GitHub account (for most deployment methods)

## 🌐 Method 1: Deploy to Vercel (Recommended - FREE)

### Step 1: Prepare Your Code
1. Make sure all files are in your project folder
2. Initialize git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

### Step 2: Push to GitHub
1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/hostel-management.git
   git push -u origin main
   ```

### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect the configuration
6. Click "Deploy"
7. Your site will be live at: `https://your-project-name.vercel.app`

## ☁️ Method 2: Deploy to Netlify (FREE)

### Step 1: Prepare Your Code
Same as Vercel - push to GitHub

### Step 2: Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "New site from Git"
4. Choose your repository
5. Build settings:
   - Build command: `npm install`
   - Publish directory: `.` (root)
6. Click "Deploy site"
7. Your site will be live at: `https://random-name.netlify.app`

## 🐳 Method 3: Deploy to Railway (FREE Tier)

### Step 1: Prepare Your Code
Same as above - push to GitHub

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"
5. Select your repository
6. Railway will automatically deploy
7. Your site will be live at: `https://your-project-name.railway.app`

## ☁️ Method 4: Deploy to Heroku (PAID)

### Step 1: Install Heroku CLI
Download from [heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

### Step 2: Deploy
```bash
# Login to Heroku
heroku login

# Create Heroku app
heroku create your-hostel-app

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Open your app
heroku open
```

## 🖥️ Method 5: Deploy to VPS/Cloud Server

### Using DigitalOcean, AWS, or Google Cloud:

1. **Create a server instance**
2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone your repository:**
   ```bash
   git clone https://github.com/yourusername/hostel-management.git
   cd hostel-management
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   ```

6. **Start the application:**
   ```bash
   npm start
   ```

7. **Set up PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "hostel-management"
   pm2 startup
   pm2 save
   ```

## 🔧 Environment Variables

For production deployment, you may want to set these environment variables:

```bash
NODE_ENV=production
PORT=3000
# Add any other environment-specific variables
```

## 📱 Custom Domain Setup

### For Vercel:
1. Go to your project dashboard
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### For Netlify:
1. Go to Site settings
2. Click "Domain management"
3. Add custom domain
4. Update DNS records

## 🔒 Security Considerations

1. **Change default passwords** in production
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** (automatic on most platforms)
4. **Regular backups** of your database
5. **Monitor logs** for any issues

## 📊 Monitoring and Maintenance

1. **Check application logs** regularly
2. **Monitor performance** metrics
3. **Update dependencies** periodically
4. **Backup data** regularly
5. **Test functionality** after updates

## 🆘 Troubleshooting

### **Before Deployment - Test Locally:**
1. **Start server**: `node server.js`
2. **Test health endpoint**: `http://localhost:3001/api/health`
3. **Test login**: Use warden credentials
4. **Test all features**: Add, edit, delete students
5. **Check browser console**: No JavaScript errors

### **Common Issues:**
1. **Build fails**: Check package.json and dependencies
2. **API not working**: Verify API routes and CORS settings
3. **Static files not loading**: Check file paths and serving configuration
4. **Database issues**: Verify database connection and data persistence
5. **Student deletion error**: ✅ Fixed in latest version

### **Quick Fixes:**
```powershell
# Kill existing processes
taskkill /F /IM node.exe

# Reset database
del db.json

# Restart server
node server.js
```

### **Getting Help:**
- Check `TROUBLESHOOTING.md` for detailed solutions
- Review application logs
- Test locally first
- Use browser developer tools for debugging
- Check platform-specific documentation

## 🎉 Success!

Once deployed, your hostel management system will be accessible worldwide at your chosen URL!

### Default Login Credentials:
- **Warden**: `warden@hostel.org` / `warden123`
- **Student**: `testuser@example.com` / `password123`

**Remember to change these in production!**
