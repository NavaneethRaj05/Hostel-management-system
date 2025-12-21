# 🔧 Hostel Management System - Troubleshooting Guide

## 🚨 Common Issues and Solutions

### **1. Student Deletion Error**

#### **Problem:**
- Error message: "Error deleting student"
- Student deletion fails

#### **Solution:**
✅ **Fixed in latest version!**

**What was wrong:**
- Student ID handling was inconsistent
- Fallback to email when ID was missing
- Missing error logging

**What was fixed:**
- Proper student ID handling
- Better error messages
- Console logging for debugging
- Improved error handling

**How to test:**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try deleting a student
4. Check console for detailed error messages

---

### **2. Server Not Starting**

#### **Problem:**
- `node server.js` fails to start
- Port already in use error

#### **Solution:**
```powershell
# Kill any existing Node.js processes
taskkill /F /IM node.exe

# Start server
node server.js
```

**Alternative ports:**
```powershell
# Use different port
set PORT=3002 && node server.js
```

---

### **3. API Endpoints Not Working**

#### **Problem:**
- 404 errors on API calls
- CORS errors

#### **Solution:**
1. **Check server is running:**
   ```powershell
   # Test health endpoint
   Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET
   ```

2. **Check API routes in server.js**
3. **Verify CORS is enabled**

---

### **4. Database Issues**

#### **Problem:**
- Data not saving
- Students not appearing

#### **Solution:**
1. **Check db.json file exists**
2. **Verify file permissions**
3. **Check console for errors**

**Reset database:**
```powershell
# Delete db.json to reset
del db.json
# Restart server to recreate
node server.js
```

---

### **5. Frontend Not Loading**

#### **Problem:**
- Dashboard not loading
- JavaScript errors

#### **Solution:**
1. **Open browser developer tools (F12)**
2. **Check Console tab for errors**
3. **Check Network tab for failed requests**
4. **Clear browser cache (Ctrl+F5)**

---

### **6. Login Issues**

#### **Problem:**
- Cannot login
- Invalid credentials error

#### **Solution:**
**Default credentials:**
- **Warden**: `warden@hostel.org` / `warden123`
- **Student**: `testuser@example.com` / `password123`

**Create new student:**
1. Go to registration
2. Register as student
3. Use new credentials

---

### **7. Room Assignment Issues**

#### **Problem:**
- Cannot assign rooms
- Room dropdown empty

#### **Solution:**
1. **Check rooms API:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3001/api/rooms" -Method GET
   ```

2. **Verify room data in server.js**
3. **Check browser console for errors**

---

### **8. Fee Management Issues**

#### **Problem:**
- Cannot update fees
- Fee data not saving

#### **Solution:**
1. **Check fee API endpoint**
2. **Verify student ID is correct**
3. **Check database for fee data**

---

## 🔍 Debugging Steps

### **1. Check Server Status**
```powershell
# Test if server is running
Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET
```

### **2. Check Browser Console**
1. Open browser (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

### **3. Check Database**
1. Open `db.json` file
2. Verify data structure
3. Check if students exist

### **4. Test API Endpoints**
```powershell
# Test students endpoint
Invoke-WebRequest -Uri "http://localhost:3001/api/students" -Method GET

# Test login
$body = @{email="warden@hostel.org"; password="warden123"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3001/api/login" -Method POST -Body $body -ContentType "application/json"
```

---

## 🛠️ Advanced Troubleshooting

### **1. Enable Debug Mode**
Add to server.js:
```javascript
// Enable debug logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
```

### **2. Check File Permissions**
```powershell
# Check if files are readable
Get-ChildItem -Path . -Recurse | Get-Acl
```

### **3. Monitor Server Logs**
```powershell
# Run server with verbose logging
node server.js
# Watch console output for errors
```

---

## 📞 Getting Help

### **1. Check Logs**
- Browser console (F12)
- Server console output
- Network tab in browser

### **2. Common Error Messages**

| Error | Cause | Solution |
|-------|-------|----------|
| "Error deleting student" | Student ID issue | ✅ Fixed in latest version |
| "Cannot connect" | Server not running | Start server with `node server.js` |
| "404 Not Found" | Wrong API endpoint | Check server.js routes |
| "CORS error" | Cross-origin issue | CORS is enabled in server.js |

### **3. Reset Everything**
```powershell
# Stop server
taskkill /F /IM node.exe

# Delete database
del db.json

# Restart server
node server.js
```

---

## ✅ Verification Checklist

After fixing issues, verify:

- [ ] Server starts without errors
- [ ] Health endpoint responds: `/api/health`
- [ ] Can login as warden
- [ ] Can view students list
- [ ] Can add new students
- [ ] Can edit students
- [ ] Can delete students
- [ ] Can assign rooms
- [ ] Can manage fees
- [ ] Can create notices
- [ ] Search functionality works
- [ ] Pagination works

---

## 🎯 Quick Fixes

### **Most Common Issues:**

1. **Server not running** → `node server.js`
2. **Port in use** → `taskkill /F /IM node.exe`
3. **Database corrupted** → Delete `db.json` and restart
4. **Browser cache** → Press `Ctrl+F5`
5. **Wrong credentials** → Use default warden/student login

### **Emergency Reset:**
```powershell
# Complete reset
taskkill /F /IM node.exe
del db.json
node server.js
```

**Your system should work perfectly after these fixes!** 🎉
