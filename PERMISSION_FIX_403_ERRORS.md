# Permission-Based Access Control - Fix for 403 Errors

## Problem
Users were getting **403 (Forbidden)** errors when trying to access various pages because the backend routes were using role-based middleware (`requireNormalAdmin`, `requireSuperAdmin`) which only allowed specific roles like `admin` and `superAdmin`. Users with roles like `teacher`, `telecaller`, and `counsellor` were being blocked even if they had the correct permissions.

## Solution
Implemented **permission-based middleware** that checks user permissions instead of just roles. SuperAdmin always has access to everything, while other users need specific permissions assigned to them.

## Changes Made

### 1. New Permission Middleware (`backend/middleware/permissionMiddleware.js`)

Created three new middleware functions:

#### `requireAuth`
- Basic authentication check
- Verifies JWT token
- Loads user from database

#### `requirePermission(permissionName)`
- Checks if user has a specific permission
- SuperAdmin bypasses permission check (has access to everything)
- Returns 403 if user doesn't have the required permission
- Usage: `requirePermission("Admissions & Sales")`

#### `requireAnyPermission([permissions])`
- Checks if user has ANY of the specified permissions
- SuperAdmin bypasses permission check
- Useful for routes that can be accessed by multiple permission types
- Usage: `requireAnyPermission(["Admissions & Sales", "Master Data"])`

### 2. Updated Routes

All routes now use `requirePermission` instead of role-based middleware:

| Route File | Required Permission |
|-----------|-------------------|
| `routes/admin/students.routes.js` | "Admissions & Sales" |
| `routes/examTag/examTag.routes.js` | "Master Data" |
| `routes/department/department.routes.js` | "Master Data" |
| `routes/class/class.routes.js` | "Master Data" |
| `routes/centre/centre.routes.js` | "Master Data" |

### 3. Permission Mapping

Based on the available permissions in the system:

| Permission | Routes/Features |
|-----------|----------------|
| **CEO Control Tower** | Dashboard |
| **Admissions & Sales** | Student management, admissions |
| **Academics** | Academic features |
| **Finance & Fees** | Finance features |
| **HR & Manpower** | HR features |
| **Master Data** | Class, Exam Tag, Department, Centre |
| **Course Management** | Course features |
| **User Management** | User CRUD (SuperAdmin only) |

## How It Works

### For SuperAdmin:
```javascript
// SuperAdmin ALWAYS has access
if (user.role === "superAdmin") {
    return next(); // Allow access
}
```

### For Other Users:
```javascript
// Check if user has the required permission
if (!user.permissions.includes(requiredPermission)) {
    return res.status(403).json({ message: "Access denied" });
}
```

## Demo User Permissions

After running `seedDemoUsers.js`, the following users have these permissions:

| User | Role | Permissions |
|------|------|------------|
| admin@test.com | superAdmin | ALL (no restrictions) |
| john@test.com | admin | CEO Control Tower, Admissions & Sales, Finance & Fees, Master Data |
| sarah@test.com | teacher | Academics, CEO Control Tower |
| mike@test.com | telecaller | Admissions & Sales |
| emma@test.com | counsellor | Admissions & Sales, CEO Control Tower |

## Testing

### ✅ Expected Behavior:

1. **SuperAdmin** (`admin@test.com`):
   - Can access ALL routes
   - No 403 errors

2. **Admin** (`john@test.com`):
   - ✅ Can access: Admissions, Master Data, Finance
   - ❌ Cannot access: Academics (no permission)

3. **Teacher** (`sarah@test.com`):
   - ✅ Can access: Academics, Dashboard
   - ❌ Cannot access: Admissions, Master Data (no permission)

4. **Telecaller** (`mike@test.com`):
   - ✅ Can access: Admissions & Sales
   - ❌ Cannot access: Master Data, Academics (no permission)

5. **Counsellor** (`emma@test.com`):
   - ✅ Can access: Admissions & Sales, Dashboard
   - ❌ Cannot access: Master Data (no permission)

## Error Messages

### Before (Role-based):
```
403 (Forbidden)
"Access denied. Only Admin or SuperAdmin allowed."
```

### After (Permission-based):
```
403 (Forbidden)
"Access denied. Required permission: Master Data"
```

## Benefits

1. **Flexible Access Control**: Users can have any combination of permissions
2. **Role-Independent**: A telecaller can have admin permissions if needed
3. **SuperAdmin Override**: SuperAdmin always has full access
4. **Clear Error Messages**: Users know exactly which permission they're missing
5. **Easy to Extend**: Add new permissions without changing middleware

## Future Enhancements

1. **Permission Groups**: Create permission templates (e.g., "Basic Staff", "Manager")
2. **Dynamic Permissions**: Load permissions from database
3. **Permission Hierarchy**: Parent permissions include child permissions
4. **Audit Logging**: Track who accessed what and when
5. **Time-based Permissions**: Permissions that expire after a certain time

## Troubleshooting

### Still getting 403 errors?

1. **Check user permissions**: Login and verify permissions in User Management
2. **Check route mapping**: Ensure the route uses the correct permission name
3. **Check token**: Logout and login again to refresh the token
4. **Check console**: Look for specific error messages about which permission is required

### Permission not working?

1. **Exact match required**: Permission names must match exactly (case-sensitive)
2. **Update user**: Edit the user and add the missing permission
3. **Refresh page**: After updating permissions, refresh the page

## Conclusion

The 403 errors are now fixed! The system now uses a flexible permission-based access control system that allows fine-grained control over who can access what, while maintaining the SuperAdmin's unrestricted access.
