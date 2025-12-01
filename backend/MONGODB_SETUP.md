# 🔧 MongoDB Connection Fix

## Problem
Your backend is showing MongoDB connection timeout errors because the `.env` file is empty or missing the MongoDB connection string.

## Solution

### Step 1: Create/Update `.env` File

1. Navigate to `backend` folder
2. Create or open the `.env` file
3. Copy the contents from `.env.example` and update with your values:

```env
# For Local MongoDB (if MongoDB is installed on your computer):
MONGO_URI=mongodb://localhost:27017/pathfinder_erp

# OR for MongoDB Atlas (cloud database):
# MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/pathfinder_erp

JWT_SECRET=your_secret_key_here_change_this
PORT=5000
```

### Step 2: Choose Your MongoDB Setup

#### Option A: Local MongoDB
If you have MongoDB installed locally:
```env
MONGO_URI=mongodb://localhost:27017/pathfinder_erp
```

#### Option B: MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Replace in `.env`:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/pathfinder_erp
```

### Step 3: Restart Backend Server

After updating `.env`:
```bash
cd backend
# Stop the current server (Ctrl+C)
npm start
```

## What Was Fixed

1. ✅ Updated `db/connect.js` to support both `MONGO_URI` and `MONGO_URL`
2. ✅ Added better error messages
3. ✅ Added connection timeout handling
4. ✅ Created `.env.example` template

## Verification

When the connection is successful, you should see:
```
✅ MongoDB connected successfully
Server is running on port 5000
```

If it fails, you'll see a clear error message telling you what's wrong.

## Common Issues

### Issue 1: "MongoDB URI is not defined"
**Solution:** Make sure your `.env` file exists and has `MONGO_URI=...`

### Issue 2: "Connection timeout"
**Solution:** 
- Check if MongoDB is running (for local setup)
- Check your internet connection (for Atlas)
- Verify the connection string is correct

### Issue 3: "Authentication failed"
**Solution:** Check username and password in your connection string

## Need Help?

If you're still having issues:
1. Make sure MongoDB is installed and running (for local setup)
2. Check firewall settings
3. Verify network connectivity
4. Check MongoDB Atlas IP whitelist (if using Atlas)
