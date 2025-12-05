# Course Management 403 Error - Fixed

## Problem
Getting 403 (Forbidden) error when accessing Course Management page.

## Root Cause
The course routes were still using the old `requireNormalOrSuper` middleware instead of the new permission-based middleware.

## Solution Applied

### 1. Updated Course Routes
**File**: `backend/routes/course/course.routes.js`

Changed from:
```javascript
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";
router.get("/", requireNormalOrSuper, getCourses);
```

To:
```javascript
import { requirePermission } from "../../middleware/permissionMiddleware.js";
router.get("/", requirePermission("Course Management"), getCourses);
```

### 2. Updated Admin User Permissions
Added "Course Management" permission to the admin demo user (`john@test.com`).

**Before**:
```javascript
permissions: ["CEO Control Tower", "Admissions & Sales", "Finance & Fees", "Master Data"]
```

**After**:
```javascript
permissions: ["CEO Control Tower", "Admissions & Sales", "Finance & Fees", "Master Data", "Course Management"]
```

## ⚠️ IMPORTANT: Logout and Login Required

After updating permissions, you **MUST logout and login again** to refresh your JWT token with the new permissions.

### Steps to Fix:
1. ✅ Backend routes updated (done automatically)
2. ✅ User permissions updated in database (done automatically)
3. ⚠️ **YOU NEED TO DO THIS**: Logout from the frontend
4. ⚠️ **YOU NEED TO DO THIS**: Login again with `john@test.com` / `pass123`
5. ✅ Navigate to Course Management - should work now!

## Why Logout/Login is Required

Your JWT token contains your user information including permissions. When you login, the token is created with your current permissions. If permissions are updated in the database, the token doesn't automatically update - you need to get a new token by logging in again.

## Verification

After logging in again, you can verify the permissions are loaded:
1. Open browser console (F12)
2. Type: `JSON.parse(localStorage.getItem("user")).permissions`
3. You should see "Course Management" in the list

## All Routes Now Using Permission-Based Middleware

| Route | Required Permission |
|-------|-------------------|
| `/api/normalAdmin/getAllStudents` | "Admissions & Sales" |
| `/api/examTag` | "Master Data" |
| `/api/department` | "Master Data" |
| `/api/class` | "Master Data" |
| `/api/centre` | "Master Data" |
| `/api/course` | "Course Management" ✅ |

## Demo User Permissions (After Update)

| User | Permissions |
|------|------------|
| admin@test.com (SuperAdmin) | ALL |
| john@test.com (Admin) | CEO Control Tower, Admissions & Sales, Finance & Fees, Master Data, **Course Management** ✅ |
| sarah@test.com (Teacher) | Academics, CEO Control Tower |
| mike@test.com (Telecaller) | Admissions & Sales |
| emma@test.com (Counsellor) | Admissions & Sales, CEO Control Tower |

## Quick Fix Command

If you create new users or update permissions in the future, remember:
```bash
# Update permissions in database
node updateAdminPermissions.js

# Then users must logout and login again!
```
