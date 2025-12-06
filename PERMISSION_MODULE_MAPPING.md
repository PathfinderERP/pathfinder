# Permission Module Mapping - IMPORTANT

## The Problem

The permission system has **module names** and **section names** that must match EXACTLY between:

1. The permission configuration (`permissions.js`)
2. The component permission checks
3. The backend route protection

If these don't match, permissions won't work!

## Correct Module/Section Mapping

### CEO Control Tower

- **Module**: `ceoControlTower`
- **Sections**:
  - `dashboard` - Dashboard
  - `analytics` - Analytics
  - `reports` - Reports

### Admissions & Sales

- **Module**: `admissionsSales`
- **Sections**:
  - `allLeads` - All Leads
  - `enrolledStudents` - Enrolled Students
  - `salesDashboard` - Sales Dashboard

### Academics

- **Module**: `academics`
- **Sections**:
  - `courses` - Courses
  - `classes` - Classes
  - `students` - Students
  - `teachers` - Teachers

### Finance & Fees

- **Module**: `financeFees`
- **Sections**:
  - `feeManagement` - Fee Management
  - `billGeneration` - Bill Generation
  - `payments` - Payments
  - `paymentReminders` - Payment Reminders

### HR & Manpower

- **Module**: `hrManpower`
- **Sections**:
  - `employees` - Employees
  - `attendance` - Attendance
  - `payroll` - Payroll

### Operations

- **Module**: `operations`
- **Sections**:
  - `centres` - Centres
  - `inventory` - Inventory
  - `facilities` - Facilities

### Digital Portal

- **Module**: `digitalPortal`
- **Sections**:
  - `studentPortal` - Student Portal
  - `teacherPortal` - Teacher Portal
  - `parentPortal` - Parent Portal

### Marketing & CRM

- **Module**: `marketingCRM`
- **Sections**:
  - `campaigns` - Campaigns
  - `leads` - Leads
  - `communications` - Communications

### Franchise Mgmt

- **Module**: `franchiseMgmt`
- **Sections**:
  - `franchises` - Franchises
  - `agreements` - Agreements
  - `royalties` - Royalties

### Master Data

- **Module**: `masterData`
- **Sections**:
  - `class` - Class
  - `examTag` - Exam Tag
  - `department` - Department
  - `centre` - Centre
  - `subjects` - Subjects

### Course Management

- **Module**: `courseManagement`
- **Sections**:
  - `courses` - Courses ⚠️ **FIXED - was using masterData/course**
  - `curriculum` - Curriculum
  - `materials` - Materials

### User Management

- **Module**: `userManagement`
- **Sections**:
  - `users` - Users
  - `roles` - Roles
  - `permissions` - Permissions

## Component Permission Checks

### ✅ CORRECT Examples:

```javascript
// Course Management (in CourseContent.jsx)
const canCreate = hasPermission(user, "courseManagement", "courses", "create");

// Master Data - Class (in ClassContent.jsx)
const canCreate = hasPermission(user, "masterData", "class", "create");

// Master Data - Centre (in CentreContent.jsx)
const canCreate = hasPermission(user, "masterData", "centre", "create");

// User Management (in UserManagementContent.jsx)
const canCreate = hasPermission(user, "userManagement", "users", "create");
```

### ❌ WRONG Examples:

```javascript
// ❌ WRONG - Course is in courseManagement, not masterData
const canCreate = hasPermission(user, "masterData", "course", "create");

// ❌ WRONG - Section name is 'courses' (plural), not 'course'
const canCreate = hasPermission(user, "courseManagement", "course", "create");

// ❌ WRONG - Module name is 'masterData' (camelCase), not 'Master Data'
const canCreate = hasPermission(user, "Master Data", "class", "create");
```

## Where Courses Are Located

**Course Management** is a SEPARATE module from Master Data!

- **Master Data** contains: Class, Exam Tag, Department, Centre, Subjects
- **Course Management** contains: Courses, Curriculum, Materials

So the Course page should check:

```javascript
hasPermission(user, "courseManagement", "courses", "create");
```

NOT:

```javascript
hasPermission(user, "masterData", "course", "create");
```

## How to Verify Permissions Are Working

1. **Login as SuperAdmin**
2. **Go to User Management → Edit the admin user**
3. **Check the permissions assigned**:
   - Expand "Course Management" module
   - Expand "Courses" section
   - Verify Create/Edit/Delete are enabled (green)
4. **Save the user**
5. **Login as that admin user**
6. **Go to Course Management page**
7. **You should now see the Add/Edit/Delete buttons!**

## Quick Fix Checklist

- [x] Updated `CourseContent.jsx` to use `courseManagement/courses`
- [ ] Verify all other components use correct module/section names
- [ ] Test with admin user after assigning permissions
- [ ] Verify buttons appear correctly

## Testing Steps

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+Shift+R)
3. **Login as SuperAdmin**
4. **Edit the admin user**
5. **Assign Course Management > Courses permissions**
6. **Save**
7. **Logout**
8. **Login as admin**
9. **Go to Course Management**
10. **Verify buttons appear!**
