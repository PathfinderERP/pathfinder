# Seed Demo Users - Instructions

## Quick Start (SuperAdmin Only)

If you just want to create a SuperAdmin account to get started:

```bash
cd backend
node seedSuperAdmin.js
```

**Login Credentials:**
- Email: `admin@pathfinder.com`
- Password: `admin123`

---

## Full Demo Data (Recommended)

To create multiple demo users with different roles and permissions:

```bash
cd backend
node seedDemoUsers.js
```

**Login Credentials (All passwords: `pass123`):**

| Role | Email | Permissions |
|------|-------|-------------|
| **SuperAdmin** | admin@test.com | Full Access (All Modules) |
| **Admin** | john@test.com | CEO Control Tower, Admissions & Sales, Finance & Fees, Master Data |
| **Teacher** | sarah@test.com | Academics, CEO Control Tower |
| **Telecaller** | mike@test.com | Admissions & Sales |
| **Counsellor** | emma@test.com | Admissions & Sales, CEO Control Tower |

---

## What Gets Created

### SuperAdmin Only Script (`seedSuperAdmin.js`)
- 1 SuperAdmin user
- No centre assignment (SuperAdmin is global)
- Full access to all modules

### Full Demo Script (`seedDemoUsers.js`)
- 1 Demo Centre (Demo Centre - DEMO01)
- 5 Users with different roles and permissions
- All users (except SuperAdmin) assigned to Demo Centre

---

## Testing the Permission System

After seeding, you can test the permission-based access:

1. **Login as SuperAdmin** (`admin@test.com`)
   - You should see ALL menu items in the sidebar
   - You can access User Management to create more users

2. **Login as Admin** (`john@test.com`)
   - You should only see: CEO Control Tower, Admissions & Sales, Finance & Fees, Master Data
   - Other menu items will be hidden

3. **Login as Teacher** (`sarah@test.com`)
   - You should only see: Academics, CEO Control Tower
   - Perfect for testing limited access

4. **Login as Telecaller** (`mike@test.com`)
   - You should only see: Admissions & Sales
   - Most restricted access for testing

5. **Login as Counsellor** (`emma@test.com`)
   - You should see: Admissions & Sales, CEO Control Tower

---

## Important Notes

⚠️ **Security Warning:**
- These are DEMO credentials with simple passwords
- Change all passwords immediately after first login in production
- Never use these credentials in a production environment

🔄 **Re-running Scripts:**
- Scripts check for existing users and skip if they already exist
- To reset, manually delete users from the database first

🗑️ **Cleanup:**
- To remove demo data, delete users manually from MongoDB
- Or use MongoDB Compass/CLI to drop the users collection

---

## Troubleshooting

**Error: "User already exists"**
- The script found an existing user with the same email
- Either use that account or delete it from the database first

**Error: "Cannot connect to database"**
- Check your MongoDB connection string in `.env`
- Ensure MongoDB is running

**Error: "Centre not found"**
- The demo users script creates a centre automatically
- If you see this error, check your Centre model

---

## Next Steps

After seeding:
1. Login with SuperAdmin credentials
2. Navigate to User Management
3. Create additional users with custom permissions
4. Test the permission system by logging in as different users
5. Change all demo passwords for security

---

## Support

If you encounter any issues:
1. Check the console output for detailed error messages
2. Verify your MongoDB connection
3. Ensure all dependencies are installed (`npm install`)
4. Check that your `.env` file is properly configured
