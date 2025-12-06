# ✅ ADMISSIONS PERMISSION IMPLEMENTATION GUIDE

## Overview

This guide explains how to implement granular permissions for the Admissions page to control access to different features.

## Permission Structure

### All Leads Section

- **Module**: `admissionsSales`
- **Section**: `allLeads`
- **Operations**:
  - **Create** → Can add new student registration (Walk-in Registration button)
  - **Edit** → Can update student details and lead status (Edit button)
  - **Delete** → Can delete students (Delete button)
  - **No permissions** → Can only view student list

### Enrolled Students Section

- **Module**: `admissionsSales`
- **Section**: `enrolledStudents`
- **Operations**:
  - **Create** → Can enroll students (Admit button)
  - **Edit** → Can update enrolled student details
  - **Delete** → Can delete enrolled students
  - **No permissions** → Can only view enrolled students

## Implementation Steps

### Step 1: Add Permission Checks (Lines 29-41)

Add these permission variables after the state declarations:

```javascript
// Permission checks for All Leads and Enrolled Students
const user = JSON.parse(localStorage.getItem("user") || "{}");
const isSuperAdmin = user.role === "superAdmin";

// All Leads permissions
const canCreateLead = hasPermission(
  user,
  "admissionsSales",
  "allLeads",
  "create"
);
const canEditLead = hasPermission(user, "admissionsSales", "allLeads", "edit");
const canDeleteLead = hasPermission(
  user,
  "admissionsSales",
  "allLeads",
  "delete"
);

// Enrolled Students permissions
const canEnrollStudent = hasPermission(
  user,
  "admissionsSales",
  "enrolledStudents",
  "create"
);
const canEditEnrolled = hasPermission(
  user,
  "admissionsSales",
  "enrolledStudents",
  "edit"
);
const canDeleteEnrolled = hasPermission(
  user,
  "admissionsSales",
  "enrolledStudents",
  "delete"
);
```

### Step 2: Control Walk-in Registration Button (Line ~270)

Wrap the "Walk-in Registration" button with permission check:

```javascript
{/* Quick Actions */}
<div className="grid grid-cols-4 gap-4 mb-8">
    <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
        Counselor Performance
    </button>
    {canCreateLead && (  {/* ADD THIS LINE */}
        <button
            onClick={() => {
                console.log("Navigating to student registration");
                navigate("/student-registration");
            }}
            className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium"
        >
            Walk-in Registration
        </button>
    )}  {/* ADD THIS LINE */}
    <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
        Telecalling Console
    </button>
    <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
        Admission Enrollment
    </button>
</div>
```

### Step 3: Control Action Buttons in Table (Line ~588-624)

Update the action buttons section:

```javascript
<td className="p-4">
    <div className="flex gap-2">
        {/* Admit Button - Controlled by Enrolled Students > Create */}
        {isEnrolled ? (
            <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded text-sm font-semibold border border-green-500/20">
                ✓ Enrolled
            </span>
        ) : (
            canEnrollStudent && (  {/* CHANGE FROM canEdit */}
                <button
                    onClick={() => navigate(`/admission/${student._id}`)}
                    className="px-3 py-1 bg-cyan-500 text-black rounded hover:bg-cyan-400 text-sm font-semibold transition-colors"
                >
                    Admit
                </button>
            )
        )}

        {/* View Button - Always Visible */}
        <button
            onClick={() => handleViewStudent(student)}
            className="p-2 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
            title="View"
        >
            <FaEye />
        </button>

        {/* Edit Button - Controlled by All Leads > Edit */}
        {canEditLead && (  {/* CHANGE FROM canEdit */}
            <button
                onClick={() => handleEditStudent(student)}
                className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit"
            >
                <FaEdit />
            </button>
        )}

        {/* Delete Button - Controlled by All Leads > Delete */}
        {canDeleteLead && (  {/* CHANGE FROM canDelete */}
            <button
                onClick={() => handleDeleteStudent(student._id)}
                className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
            >
                <FaTrash />
            </button>
        )}
    </div>
</td>
```

## Permission Matrix

| Feature                         | Permission Module | Permission Section | Permission Operation |
| ------------------------------- | ----------------- | ------------------ | -------------------- |
| **Walk-in Registration Button** | `admissionsSales` | `allLeads`         | `create`             |
| **Edit Student Details**        | `admissionsSales` | `allLeads`         | `edit`               |
| **Delete Student**              | `admissionsSales` | `allLeads`         | `delete`             |
| **Admit Button (Enroll)**       | `admissionsSales` | `enrolledStudents` | `create`             |
| **View Student**                | Always visible    | -                  | -                    |

## How to Assign Permissions

### For SuperAdmin:

1. Login as SuperAdmin
2. Go to User Management
3. Edit the admin user
4. Expand **"Admissions & Sales"** module
5. Check **"All Leads"** section:
   - ✅ Create → Can add new registrations
   - ✅ Edit → Can update student details
   - ✅ Delete → Can delete students
6. Check **"Enrolled Students"** section:
   - ✅ Create → Can enroll students (Admit button)
   - ✅ Edit → Can update enrolled students
   - ✅ Delete → Can delete enrolled students
7. Save the user

### Result:

- **With All Leads > Create**: See "Walk-in Registration" button
- **With All Leads > Edit**: See Edit button for students
- **With All Leads > Delete**: See Delete button for students
- **With Enrolled Students > Create**: See "Admit" button for non-enrolled students
- **Without permissions**: Can only view student list

## Testing

### Test 1: Create Permission

1. Assign only **All Leads > Create** to admin
2. Login as admin
3. ✅ Should see "Walk-in Registration" button
4. ❌ Should NOT see Edit/Delete buttons
5. ❌ Should NOT see "Admit" button

### Test 2: Edit Permission

1. Assign only **All Leads > Edit** to admin
2. Login as admin
3. ❌ Should NOT see "Walk-in Registration" button
4. ✅ Should see Edit button (eye icon)
5. ❌ Should NOT see Delete button
6. ❌ Should NOT see "Admit" button

### Test 3: Enroll Permission

1. Assign only **Enrolled Students > Create** to admin
2. Login as admin
3. ❌ Should NOT see "Walk-in Registration" button
4. ❌ Should NOT see Edit/Delete buttons
5. ✅ Should see "Admit" button for non-enrolled students

### Test 4: All Permissions

1. Assign ALL permissions to admin
2. Login as admin
3. ✅ Should see ALL buttons

### Test 5: No Permissions

1. Don't assign any permissions to admin
2. Login as admin
3. ✅ Should see student list
4. ✅ Should see View button (eye icon)
5. ❌ Should NOT see any other buttons

## Summary

✅ **Walk-in Registration** → `allLeads/create`
✅ **Edit Student** → `allLeads/edit`
✅ **Delete Student** → `allLeads/delete`
✅ **Admit (Enroll)** → `enrolledStudents/create`
✅ **View** → Always visible

**The permission system gives you fine-grained control over what each user can do in the Admissions section!**
