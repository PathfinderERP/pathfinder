# 🚀 QUICK FIX: MongoDB Atlas Connection Issue

## Your Problem
Your network/firewall is blocking DNS queries to MongoDB Atlas servers. This is why you're getting `querySrv ETIMEOUT` errors.

## ✅ SOLUTION: Get Direct Connection String from MongoDB Atlas

Follow these steps **exactly**:

### Step 1: Login to MongoDB Atlas
1. Open your browser and go to: **https://cloud.mongodb.com/**
2. Login with your MongoDB Atlas account

### Step 2: Get the Connection String
1. Click on **"Database"** in the left sidebar
2. Find your cluster (e.g., "Cluster0")
3. Click the **"Connect"** button
4. Choose **"Drivers"** (or "Connect your application")

### Step 3: Get the Standard Connection String
1. Select:
   - **Driver**: Node.js
   - **Version**: 5.5 or later
   
2. You'll see TWO types of connection strings:
   - ❌ **SRV Connection String** (starts with `mongodb+srv://`) - DON'T use this
   - ✅ **Standard Connection String** (starts with `mongodb://`) - USE this one

3. Look for a link that says **"I have a connection string from a different source"** or **"Standard connection string"**

4. Copy the **Standard Connection String** - it should look like:
   ```
   mongodb://USERNAME:PASSWORD@ac-xxxxx-shard-00-00.rhvicvr.mongodb.net:27017,ac-xxxxx-shard-00-01.rhvicvr.mongodb.net:27017,ac-xxxxx-shard-00-02.rhvicvr.mongodb.net:27017/?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
   ```

### Step 4: Update Your .env File

1. Open your `.env` file in the backend folder
2. Replace the current `MONGO_URL` line with the new connection string
3. Make sure to replace `<username>` and `<password>` with your actual credentials:
   - Username: `malay_db_user`
   - Password: `wSBLhhCsHRN1OD20`

Your `.env` should look like:
```env
PORT=5000
MONGO_URL=mongodb://malay_db_user:wSBLhhCsHRN1OD20@ac-xxxxx-shard-00-00.rhvicvr.mongodb.net:27017,ac-xxxxx-shard-00-01.rhvicvr.mongodb.net:27017,ac-xxxxx-shard-00-02.rhvicvr.mongodb.net:27017/?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
JWT_SECRET=QQEVERBYMJKIULOTMNSRBW!@$%^&*&^%$@!12562156126831848715664514bccvbo3nuyxrt976c4b43764tv476
```

### Step 5: Restart Your Server
1. Stop the current nodemon process (Ctrl+C in terminal)
2. Run: `nodemon server.js`

---

## 🎯 Alternative: If You Can't Find Standard Connection String

If MongoDB Atlas doesn't show the standard connection string option, you can construct it manually:

### Get the Shard Hosts:
1. In MongoDB Atlas, go to your cluster
2. Click **"..."** (three dots) → **"Connection String Options"**
3. Look for the shard hosts or node addresses

### Construct the URL:
```
mongodb://malay_db_user:wSBLhhCsHRN1OD20@[HOST1]:27017,[HOST2]:27017,[HOST3]:27017/?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

Replace `[HOST1]`, `[HOST2]`, `[HOST3]` with the actual shard hostnames from Atlas.

---

## 🔍 Why This Works

- **SRV Connection** (`mongodb+srv://`): Requires DNS SRV lookup → Your network blocks this
- **Direct Connection** (`mongodb://`): Uses direct IP/hostname → Bypasses DNS SRV lookup

---

## 📞 Still Not Working?

If the direct connection string still doesn't work, the issue might be:

### 1. **IP Whitelist**
   - Go to MongoDB Atlas → **Network Access**
   - Click **"Add IP Address"**
   - Add your current IP or use `0.0.0.0/0` (allow all) for testing

### 2. **Firewall Blocking MongoDB Port**
   - Your organization's firewall might be blocking port 27017
   - Contact your network administrator

### 3. **Wrong Credentials**
   - Verify username: `malay_db_user`
   - Verify password: `wSBLhhCsHRN1OD20`
   - Make sure the user has proper database permissions

---

## 📸 Need Help?

Take a screenshot of:
1. The connection string page in MongoDB Atlas
2. The error message you're getting

And I can help you further!
