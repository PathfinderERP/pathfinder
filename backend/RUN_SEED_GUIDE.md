# 🚀 Quick Start - Create SuperAdmin

## Run This Command

Open your terminal in the **backend** directory and run:

```bash
node seedSuperAdmin.js
```

## What This Does

Creates a SuperAdmin account with:

- ✅ Full access to all modules
- ✅ Can create, edit, and delete users
- ✅ Can assign granular permissions
- ✅ Can create other SuperAdmins

## Login Credentials

After running the script, you'll get:

```
📧 Email:        admin@pathfinder.com
🔑 Password:     admin123
👤 Employee ID:  SA001
📱 Mobile:       9999999999
```

## Step-by-Step

### Windows (PowerShell):

```powershell
cd d:\pathfinder\backend
node seedSuperAdmin.js
```

### Mac/Linux:

```bash
cd /path/to/pathfinder/backend
node seedSuperAdmin.js
```

## Expected Output

You should see:

```
🌱 Starting SuperAdmin seed...

✅ SuperAdmin created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 SUPERADMIN ACCOUNT CREATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:        admin@pathfinder.com
🔑 Password:     admin123
👤 Employee ID:  SA001
📱 Mobile:       9999999999
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 Permissions:
   ✅ Full access to ALL modules
   ✅ Can create, edit, and delete users
   ✅ Can assign granular permissions to other users
   ✅ Can create other SuperAdmins

⚠️  IMPORTANT SECURITY NOTES:
   🔒 Change this password after first login!
   🔒 Never use this password in production!
   🔒 This is for development/testing only!

🚀 Next Steps:
   1. Login with the credentials above
   2. Go to User Management
   3. Create additional users with granular permissions
   4. Test the permission system
   5. Change the SuperAdmin password
```

## If SuperAdmin Already Exists

If you already have a SuperAdmin, you'll see:

```
⚠️  SuperAdmin already exists!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:      Super Admin
Email:     admin@pathfinder.com
Employee:  SA001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ You can use this account to login.
📧 Email:     admin@pathfinder.com
🔑 Password: (the one you set when creating it)

💡 If you forgot the password, delete this user from MongoDB and run this script again.
```

## Troubleshooting

### Error: "Cannot connect to database"

**Solution**: Check your `.env` file in the backend directory:

```env
MONGO_URI=your_mongodb_connection_string
```

### Error: "User validation failed"

**Solution**: The User model might have required fields. The script should handle this, but if not, check `models/User.js`

### Error: "Module not found"

**Solution**: Make sure you're in the backend directory:

```bash
cd backend
node seedSuperAdmin.js
```

### Want to Reset SuperAdmin?

1. Delete the existing SuperAdmin from MongoDB
2. Run the script again

**Using MongoDB Compass:**

- Connect to your database
- Go to `users` collection
- Find user with `role: "superAdmin"`
- Delete it
- Run the script again

**Using MongoDB Shell:**

```javascript
use your_database_name
db.users.deleteOne({ role: "superAdmin" })
```

## After Creating SuperAdmin

1. **Login** at your frontend URL (usually `http://localhost:5173`)
2. **Use credentials**: `admin@pathfinder.com` / `admin123`
3. **Go to User Management**
4. **Test the granular permission system**:
   - Click "Add User"
   - Scroll to "Granular Permissions"
   - Click on modules to expand them
   - Click on sections to see Create/Edit/Delete buttons
   - Assign permissions and save
5. **Change your password** for security

## Quick Test Checklist

After logging in as SuperAdmin:

- [ ] Can access all menu items in sidebar
- [ ] Can go to User Management
- [ ] Can click "Add User"
- [ ] Can see Granular Permissions section
- [ ] Modules expand when clicked
- [ ] Sections expand when clicked
- [ ] Can see Create/Edit/Delete buttons
- [ ] Can create a new user with custom permissions
- [ ] Can edit existing users
- [ ] Can delete users

## What's Different from Old Script?

The updated script now includes:

- ✅ `centres: []` (array instead of `centre: null`)
- ✅ `granularPermissions: {}` (new field)
- ✅ `canEditUsers: true` (new field)
- ✅ `canDeleteUsers: true` (new field)
- ✅ Better console output with emojis
- ✅ More helpful error messages
- ✅ Troubleshooting tips

## Ready to Go! 🎉

Just run:

```bash
node seedSuperAdmin.js
```

And you're all set! 🚀
