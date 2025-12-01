# MongoDB Atlas DNS Fix Guide

## Problem
You're experiencing `querySrv ETIMEOUT` error when connecting to MongoDB Atlas. This is a **DNS resolution issue** where your local DNS server cannot resolve MongoDB Atlas SRV records.

## Quick Fix Options

### Option 1: Change DNS Server (Recommended - Permanent Fix)

1. **Open Network Settings:**
   - Press `Win + R`, type `ncpa.cpl`, press Enter
   - Right-click your active network connection → Properties

2. **Change DNS:**
   - Select "Internet Protocol Version 4 (TCP/IPv4)" → Properties
   - Select "Use the following DNS server addresses"
   - Preferred DNS: `8.8.8.8`
   - Alternate DNS: `8.8.4.4`
   - Click OK

3. **Flush DNS Cache:**
   ```powershell
   ipconfig /flushdns
   ```

4. **Restart your application**

---

### Option 2: Use Direct Connection String (Quick Fix)

Instead of using `mongodb+srv://` (which requires DNS SRV lookup), use a direct connection string.

#### Steps to get Direct Connection String:

1. **Go to MongoDB Atlas Dashboard:**
   - Visit: https://cloud.mongodb.com/
   - Login to your account

2. **Get Connection String:**
   - Click on your cluster (e.g., "Cluster0")
   - Click "Connect" button
   - Choose "Connect your application"
   - **IMPORTANT:** Toggle OFF "Include full driver code example"
   - Select "Driver: Node.js" and "Version: 5.5 or later"
   - You'll see a connection string like:
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

3. **Convert to Direct Connection:**
   - Click on "I have a connection string from a different source"
   - OR manually construct it using the shard hosts

4. **Update your .env file:**
   ```env
   MONGO_URL=mongodb://username:password@host1:27017,host2:27017,host3:27017/?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
   ```

---

### Option 3: Allow MongoDB Through Firewall

Your firewall or antivirus might be blocking DNS queries:

1. **Windows Firewall:**
   - Open Windows Defender Firewall
   - Click "Allow an app through firewall"
   - Add Node.js if not present

2. **Antivirus:**
   - Temporarily disable antivirus and test
   - If it works, add Node.js to antivirus exceptions

---

## Current Connection Configuration

The code has been updated with:
- ✅ Increased timeout from 5s to 30s
- ✅ IPv4 only (faster DNS resolution)
- ✅ Better error messages
- ✅ Automatic detection of SRV vs direct connection

## Testing

After applying any fix, restart your server:
```bash
nodemon server.js
```

You should see:
```
🔄 Connecting to MongoDB...
✅ MongoDB connected successfully
📍 Connected to: cluster0-shard-xxxxx.mongodb.net
```

## Still Having Issues?

If none of the above works:

1. **Check MongoDB Atlas IP Whitelist:**
   - Go to Atlas Dashboard → Network Access
   - Add your current IP or use `0.0.0.0/0` (allow all) for testing

2. **Verify Credentials:**
   - Ensure username and password are correct
   - Special characters in password should be URL-encoded

3. **Check Internet Connection:**
   - Try accessing https://cloud.mongodb.com/ in browser
   - Ping test: `ping 8.8.8.8`

4. **Contact Network Admin:**
   - Your organization's firewall might be blocking MongoDB Atlas
