# Granular Permission System Documentation

## Overview

The Pathfinder ERP system implements a hierarchical, granular permission system that allows Super Admins to control access at three levels:

1. **Module Level** - Top-level sections like "Master Data", "Course Management", etc.
2. **Section Level** - Subsections within modules like "Class", "Exam Tag", "Department", etc.
3. **Operation Level** - Specific actions like "Create", "Edit", "Delete"

## Permission Structure

### Available Modules

The system includes the following modules:

- **CEO Control Tower** - Dashboard, Analytics, Reports
- **Admissions & Sales** - All Leads, Enrolled Students, Sales Dashboard
- **Academics** - Courses, Classes, Students, Teachers
- **Finance & Fees** - Fee Management, Bill Generation, Payments, Payment Reminders
- **HR & Manpower** - Employees, Attendance, Payroll
- **Operations** - Centres, Inventory, Facilities
- **Digital Portal** - Student Portal, Teacher Portal, Parent Portal
- **Marketing & CRM** - Campaigns, Leads, Communications
- **Franchise Mgmt** - Franchises, Agreements, Royalties
- **Master Data** - Class, Exam Tag, Department, Centre, Subjects
- **Course Management** - Courses, Curriculum, Materials
- **User Management** - Users, Roles, Permissions

### Permission Hierarchy Example

```javascript
{
  "masterData": {
    "class": {
      "create": true,
      "edit": true,
      "delete": false
    },
    "examTag": {
      "create": true,
      "edit": false,
      "delete": false
    },
    "department": {
      "create": false,
      "edit": true,
      "delete": false
    }
  },
  "courseManagement": {
    "courses": {
      "create": true,
      "edit": true,
      "delete": true
    }
  }
}
```

In this example:

- The user has access to the **Master Data** module
- Within Master Data, they can:
  - **Class**: Create and Edit (but not Delete)
  - **Exam Tag**: Only Create
  - **Department**: Only Edit
- They also have full access to **Course Management > Courses**

## How to Assign Permissions

### For Super Admin

Super Admins automatically have **ALL** permissions across all modules, sections, and operations. No manual assignment is needed.

### For Other Users (Admin, Teacher, Telecaller, Counsellor)

1. **Navigate to User Management**
2. **Click "Add User"** or **Edit an existing user**
3. **Expand the Granular Permissions section**
4. **Select a Module** by clicking the checkbox next to it
5. **Expand the Module** to see its sections
6. **Select a Section** by clicking the checkbox next to it
7. **Expand the Section** to see available operations
8. **Click on the operation buttons** (Create, Edit, Delete) to grant specific permissions

### Visual Guide

```
✅ Master Data (Module)
  ├─ ✅ Class (Section)
  │   ├─ ✅ Create (Operation)
  │   ├─ ✅ Edit (Operation)
  │   └─ ❌ Delete (Operation)
  ├─ ✅ Exam Tag (Section)
  │   ├─ ✅ Create (Operation)
  │   ├─ ❌ Edit (Operation)
  │   └─ ❌ Delete (Operation)
  └─ ❌ Department (Section - not selected)
```

## Frontend Implementation

### Checking Permissions in Components

```javascript
import { hasPermission } from "../../config/permissions";

const MyComponent = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Check if user can create in a specific section
  const canCreate = hasPermission(user, "masterData", "class", "create");
  const canEdit = hasPermission(user, "masterData", "class", "edit");
  const canDelete = hasPermission(user, "masterData", "class", "delete");

  return (
    <div>
      {canCreate && <button>Add New</button>}
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
};
```

### Helper Functions

#### `hasPermission(user, module, section, operation)`

Checks if a user has a specific permission. Automatically returns `true` for SuperAdmin.

```javascript
hasPermission(user, "masterData", "class", "create"); // true/false
```

#### `hasModuleAccess(user, module)`

Checks if a user has any permission within a module.

```javascript
hasModuleAccess(user, "masterData"); // true/false
```

#### `getAccessibleModules(user)`

Returns an array of all modules the user has access to.

```javascript
getAccessibleModules(user); // ['masterData', 'courseManagement', ...]
```

## Backend Implementation

### Middleware

The backend uses middleware to protect routes:

```javascript
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

// Protect a route with granular permissions
router.post(
  "/create",
  requireGranularPermission("masterData", "class", "create"),
  createClass
);

router.put(
  "/update/:id",
  requireGranularPermission("masterData", "class", "edit"),
  updateClass
);

router.delete(
  "/delete/:id",
  requireGranularPermission("masterData", "class", "delete"),
  deleteClass
);
```

### SuperAdmin Bypass

The middleware automatically grants access to SuperAdmin users without checking granular permissions:

```javascript
// SuperAdmin has access to everything
if (user.role === "superAdmin") {
  req.user = user;
  return next();
}
```

## Database Schema

The User model includes a `granularPermissions` field:

```javascript
granularPermissions: {
  type: mongoose.Schema.Types.Mixed,
  default: {},
}
```

This field stores the hierarchical permission structure as a nested object.

## Best Practices

### 1. Always Check Permissions

Never assume a user has access. Always check permissions before showing UI elements or allowing actions.

### 2. Use the Full User Object

Pass the full user object to `hasPermission()` instead of just `granularPermissions` to ensure SuperAdmin bypass works correctly.

```javascript
// ✅ Good
const canEdit = hasPermission(user, "masterData", "class", "edit");

// ❌ Avoid (won't work with SuperAdmin bypass)
const canEdit = hasPermission(
  user.granularPermissions,
  "masterData",
  "class",
  "edit"
);
```

### 3. Consistent Naming

Use the exact module and section keys as defined in `permissions.js`:

```javascript
// Module keys: ceoControlTower, admissionsSales, academics, financeFees,
//              hrManpower, operations, digitalPortal, marketingCRM,
//              franchiseMgmt, masterData, courseManagement, userManagement

// Section keys vary by module - check permissions.js for exact names
```

### 4. Backend Protection

Always protect backend routes with the appropriate middleware. Never rely solely on frontend permission checks.

## Example Use Cases

### Use Case 1: Admin with Limited Master Data Access

An admin needs to manage Classes and Exam Tags but should not be able to delete anything:

```javascript
{
  "masterData": {
    "class": {
      "create": true,
      "edit": true,
      "delete": false
    },
    "examTag": {
      "create": true,
      "edit": true,
      "delete": false
    }
  }
}
```

### Use Case 2: Finance Manager

A user who only handles finance-related tasks:

```javascript
{
  "financeFees": {
    "feeManagement": {
      "create": true,
      "edit": true,
      "delete": false
    },
    "billGeneration": {
      "create": true,
      "edit": true,
      "delete": false
    },
    "payments": {
      "create": true,
      "edit": true,
      "delete": false
    }
  }
}
```

### Use Case 3: Course Coordinator

A user who manages courses and curriculum but cannot delete:

```javascript
{
  "courseManagement": {
    "courses": {
      "create": true,
      "edit": true,
      "delete": false
    },
    "curriculum": {
      "create": true,
      "edit": true,
      "delete": false
    },
    "materials": {
      "create": true,
      "edit": true,
      "delete": false
    }
  }
}
```

## Troubleshooting

### Issue: User can't see buttons even with permissions

**Solution**: Ensure you're passing the full user object to `hasPermission()`:

```javascript
// ✅ Correct
const canEdit = hasPermission(user, "masterData", "class", "edit");
```

### Issue: SuperAdmin doesn't have access

**Solution**: Check that the user's role is exactly `"superAdmin"` (case-sensitive) in the database.

### Issue: Backend returns 403 Forbidden

**Solution**: Verify that:

1. The route is protected with the correct middleware
2. The module, section, and operation names match exactly
3. The user has the required permission in their `granularPermissions` field

## Future Enhancements

Potential improvements to the permission system:

1. **Permission Templates** - Pre-defined permission sets for common roles
2. **Permission Inheritance** - Child sections inherit parent permissions
3. **Time-based Permissions** - Permissions that expire after a certain date
4. **IP-based Restrictions** - Limit access based on IP address
5. **Audit Logging** - Track all permission changes and access attempts
