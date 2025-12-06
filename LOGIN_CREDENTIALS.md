# 🔐 Pathfinder ERP - Login Credentials

## SuperAdmin Accounts

Your system may have one of these SuperAdmin accounts (or both):

### Option 1: Basic SuperAdmin

```
Email:    admin@pathfinder.com
Password: admin123
```

**Created by**: `seedSuperAdmin.js`

### Option 2: Demo SuperAdmin

```
Email:    admin@test.com
Password: pass123
```

**Created by**: `seedDemoUsers.js`

---

## 🧪 Demo User Accounts (If seeded)

If you ran `seedDemoUsers.js`, you also have these test accounts:

| Role           | Name            | Email          | Password | Permissions                                                                           |
| -------------- | --------------- | -------------- | -------- | ------------------------------------------------------------------------------------- |
| **SuperAdmin** | Super Admin     | admin@test.com | pass123  | Full Access (All Modules)                                                             |
| **Admin**      | John Admin      | john@test.com  | pass123  | CEO Control Tower, Admissions & Sales, Finance & Fees, Master Data, Course Management |
| **Teacher**    | Sarah Teacher   | sarah@test.com | pass123  | Academics, CEO Control Tower                                                          |
| **Telecaller** | Mike Telecaller | mike@test.com  | pass123  | Admissions & Sales                                                                    |
| **Counsellor** | Emma Counsellor | emma@test.com  | pass123  | Admissions & Sales, CEO Control Tower                                                 |

---

## 🚀 Quick Login Test

### Try These in Order:

1. **First, try**: `admin@test.com` / `pass123`
2. **If that doesn't work, try**: `admin@pathfinder.com` / `admin123`

One of these should work!

---

## 🔍 How to Check Which Account Exists

If you're not sure which SuperAdmin exists, you can check by running this command in your backend directory:

```bash
cd backend
node -e "require('dotenv').config(); const mongoose = require('mongoose'); const User = require('./models/User.js').default; mongoose.connect(process.env.MONGO_URI).then(async () => { const users = await User.find({ role: 'superAdmin' }); console.log('SuperAdmin accounts:'); users.forEach(u => console.log('Email:', u.email)); process.exit(0); });"
```

Or check in MongoDB Compass/Atlas:

- Collection: `users`
- Filter: `{ "role": "superAdmin" }`

---

## 🌱 How to Create SuperAdmin (If None Exists)

### Option 1: Basic SuperAdmin Only

```bash
cd backend
node seedSuperAdmin.js
```

Creates: `admin@pathfinder.com` / `admin123`

### Option 2: Full Demo Data (Recommended)

```bash
cd backend
node seedDemoUsers.js
```

Creates:

- SuperAdmin: `admin@test.com` / `pass123`
- Plus 4 other demo users with different roles

---

## ⚠️ Security Warnings

**IMPORTANT - For Production:**

1. ❌ **Never use these credentials in production**
2. 🔒 **Change all passwords immediately after first login**
3. 🗑️ **Delete demo accounts before going live**
4. 🔐 **Use strong, unique passwords**
5. 📧 **Use real email addresses for production**

**For Development/Testing:**

- ✅ These credentials are fine for local development
- ✅ Use them to test the permission system
- ✅ Create additional test users as needed

---

## 📝 What to Do After Login

### As SuperAdmin:

1. **Test the Granular Permission System**

   - Go to User Management
   - Click "Add User"
   - Scroll to "Granular Permissions"
   - Click on modules to expand them
   - Click on sections to see Create/Edit/Delete buttons
   - Assign permissions and save

2. **Create Your First Real User**

   - Fill in actual details
   - Assign appropriate role
   - Configure granular permissions
   - Save and test by logging in as that user

3. **Change SuperAdmin Password**

   - Go to your profile/settings
   - Update password to something secure
   - Save changes

4. **Test Different Permission Levels**
   - Create users with different permission sets
   - Login as those users to verify permissions work
   - Ensure users only see what they should see

---

## 🐛 Troubleshooting

### "Invalid credentials" error

**Try these solutions:**

1. **Check which SuperAdmin exists** (see above)
2. **Verify email is correct** (no typos, correct domain)
3. **Check password** (case-sensitive, no extra spaces)
4. **Run seed script** if no SuperAdmin exists
5. **Check MongoDB connection** in `.env` file

### "User not found" error

**Solution**: Run one of the seed scripts to create a SuperAdmin:

```bash
cd backend
node seedSuperAdmin.js
```

### Database connection error

**Check your `.env` file has:**

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

---

## 📊 Testing the Permission System

After logging in as SuperAdmin, test the new granular permission system:

### Test Case 1: Limited Admin

1. Create a new admin user
2. Give them only "Master Data" module access
3. Within Master Data, give them only "Class" section
4. Within Class, give them only "Create" and "Edit" (not Delete)
5. Login as that user
6. Verify they can only create and edit classes

### Test Case 2: View-Only User

1. Create a new user
2. Give them access to a module and section
3. Don't click any operation buttons (leave all gray)
4. Login as that user
5. Verify they can view but not modify anything

### Test Case 3: Full Module Access

1. Create a new user
2. Give them "Course Management" module
3. Enable all sections with all operations
4. Login as that user
5. Verify they have full access to course management

---

## 🎯 Quick Reference

**Most Common Login (Demo):**

```
Email:    admin@test.com
Password: pass123
```

**Alternative (Basic):**

```
Email:    admin@pathfinder.com
Password: admin123
```

**All Demo Passwords:**

```
pass123
```

**Basic SuperAdmin Password:**

```
admin123
```

---

## 📞 Need Help?

If you're still having trouble logging in:

1. Check the backend console for error messages
2. Verify MongoDB is running and connected
3. Check the `users` collection in MongoDB
4. Run the seed script again (it will skip existing users)
5. Check your `.env` configuration

---

**Last Updated**: December 6, 2025
**System**: Pathfinder ERP
**Version**: With Granular Permissions ✨
