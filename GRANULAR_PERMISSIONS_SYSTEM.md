# Granular Permissions System Documentation

## Overview

This document describes the implementation of the **Granular Hierarchical Permissions System** in Pathfinder ERP.

## Permission Hierarchy

The system has **3 levels** of permissions:

```
Module (e.g., Admissions, Master Data)
  └── Section (e.g., Class, Course Management)
      └── Operations (Create, Edit, Delete)
```

### Example Structure:

```javascript
{
  "admissions": {
    "allLeads": {
      "create": true,
      "edit": true,
      "delete": false
    },
    "enrolledStudents": {
      "create": false,
      "edit": true,
      "delete": false
    }
  },
  "masterData": {
    "class": {
      "create": true,
      "edit": true,
      "delete": true
    },
    "course": {
      "create": true,
      "edit": false,
      "delete": false
    }
  }
}
```

## Available Modules and Sections

### 1. **Admissions**

- **All Leads** - Student registration and lead management
  - Operations: Create, Edit, Delete
- **Enrolled Students** - Admitted students management
  - Operations: Create, Edit, Delete

### 2. **Master Data**

- **Class** - Class master data
  - Operations: Create, Edit, Delete
- **Exam Tag** - Exam tag master data
  - Operations: Create, Edit, Delete
- **Department** - Department master data
  - Operations: Create, Edit, Delete
- **Centre** - Centre management
  - Operations: Create, Edit, Delete
- **Course Management** - Course master data
  - Operations: Create, Edit, Delete

### 3. **Finance & Fees**

- **Fee Management** - Fee structure and management
  - Operations: Create, Edit, Delete
- **Bill Generation** - Invoice and bill generation
  - Operations: Create, Edit, Delete

### 4. **Sales**

- **Sales Dashboard** - Sales analytics and reporting
  - Operations: Create, Edit, Delete

### 5. **User Management**

- **User Management** - User CRUD operations
  - Operations: Create, Edit, Delete

## Backend Implementation

### User Model (`backend/models/User.js`)

```javascript
granularPermissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
}
```

### API Endpoints to Update

1. **Create User** - `POST /api/auth/superAdmin/createAccount`

   - Accept `granularPermissions` in request body
   - Save to user document

2. **Update User** - `PUT /api/auth/superAdmin/updateUser/:id`

   - Accept `granularPermissions` in request body
   - Merge with existing permissions

3. **Login** - `POST /api/auth/admin/login`
   - Return `granularPermissions` in response
   - Store in localStorage on frontend

## Frontend Implementation

### Configuration File (`frontend/src/config/permissions.js`)

Defines all modules, sections, and operations:

```javascript
export const PERMISSION_MODULES = {
  admissions: {
    label: "Admissions",
    sections: {
      allLeads: {
        label: "All Leads",
        operations: ["create", "edit", "delete"],
      },
    },
  },
};
```

### Granular Permissions Editor Component

**Location**: `frontend/src/components/UserManagement/GranularPermissionsEditor.jsx`

**Features**:

- Three-level hierarchy display
- Expand/collapse modules and sections
- Color-coded operation buttons:
  - 🟢 **Create** - Green
  - 🟠 **Edit** - Orange
  - 🔴 **Delete** - Red
- Checkbox selection at module and section level
- Real-time permission state management

### Helper Functions

```javascript
// Check if user has specific permission
hasPermission(granularPermissions, "admissions", "allLeads", "create");

// Check if user has any access to a module
hasModuleAccess(granularPermissions, "admissions");

// Get all accessible modules
getAccessibleModules(granularPermissions);
```

## Usage in Components

### Example: Checking Create Permission

```javascript
import { hasPermission } from "../../config/permissions";

const user = JSON.parse(localStorage.getItem("user"));
const canCreate = hasPermission(
  user.granularPermissions,
  "masterData",
  "class",
  "create"
);

// Show/hide "Add Class" button
{
  canCreate && <button>Add Class</button>;
}
```

### Example: Checking Edit Permission

```javascript
const canEdit = hasPermission(
  user.granularPermissions,
  "masterData",
  "class",
  "edit"
);

// Show/hide edit button
{
  canEdit && <button onClick={() => handleEdit(item)}>Edit</button>;
}
```

### Example: Checking Delete Permission

```javascript
const canDelete = hasPermission(
  user.granularPermissions,
  "masterData",
  "class",
  "delete"
);

// Show/hide delete button
{
  canDelete && <button onClick={() => handleDelete(id)}>Delete</button>;
}
```

## Integration Steps

### Step 1: Update Backend

1. ✅ Update User model with `granularPermissions` field
2. ⏳ Update `createAccount` API to accept granularPermissions
3. ⏳ Update `updateUser` API to accept granularPermissions
4. ⏳ Update `login` API to return granularPermissions

### Step 2: Update Frontend - Add/Edit User Modals

1. ⏳ Import `GranularPermissionsEditor` component
2. ⏳ Add state for `granularPermissions`
3. ⏳ Add editor to modal UI
4. ⏳ Send granularPermissions in API calls

### Step 3: Update Frontend - Permission Checks

1. ⏳ Replace hardcoded permission checks with `hasPermission()`
2. ⏳ Update all CRUD buttons to check granular permissions
3. ⏳ Update sidebar to show only accessible modules

### Step 4: Testing

1. ⏳ Create test user with limited permissions
2. ⏳ Verify buttons show/hide correctly
3. ⏳ Verify API calls respect permissions
4. ⏳ Test all modules and sections

## Migration Strategy

### For Existing Users

Option 1: **Manual Migration**

- SuperAdmin manually sets granular permissions for each user

Option 2: **Automatic Migration Script**

```javascript
// Convert old permissions array to granular structure
const migratePermissions = (oldPermissions) => {
  const granular = {};
  oldPermissions.forEach((module) => {
    granular[module] = {};
    // Grant all operations for all sections in the module
  });
  return granular;
};
```

## Security Considerations

1. **Backend Validation**

   - Always verify permissions on the backend
   - Never trust frontend permission checks alone

2. **SuperAdmin Only**

   - Only SuperAdmin can modify granular permissions
   - Regular admins cannot grant permissions

3. **Least Privilege**
   - Default to no permissions
   - Explicitly grant each permission needed

## Benefits

1. **Fine-Grained Control** - Precise permission management
2. **Scalability** - Easy to add new modules/sections
3. **User-Friendly** - Visual hierarchy makes it clear
4. **Flexible** - Can grant/revoke specific operations
5. **Audit Trail** - Clear record of what users can do

## Next Steps

1. Update backend APIs to handle granularPermissions
2. Integrate GranularPermissionsEditor into Add/Edit User modals
3. Update all components to use granular permission checks
4. Test thoroughly with different permission combinations
5. Document permission requirements for each feature

---

**Status**: ✅ Backend Model Updated | ⏳ Frontend Implementation In Progress
**Last Updated**: 2025-12-06
