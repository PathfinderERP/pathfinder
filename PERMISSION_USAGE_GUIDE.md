# How to Use the Granular Permission System

## Step-by-Step Guide

### Step 1: Access User Management

1. Login as **SuperAdmin**
2. Navigate to **User Management**
3. Click **"Add User"** or click **Edit** on an existing user

### Step 2: Fill Basic Information

- Name
- Employee ID
- Email
- Mobile Number
- Password
- Role (Admin, Teacher, Telecaller, Counsellor, or SuperAdmin)
- Centres (if not SuperAdmin)

### Step 3: Assign Granular Permissions

#### How It Works Now (FIXED):

**1. Click on a Module Checkbox**

```
☐ Master Data
```

↓ After clicking, it automatically expands:

```
☑ Master Data (0 sections)
  ├─ ☐ Class
  ├─ ☐ Exam Tag
  ├─ ☐ Department
  ├─ ☐ Centre
  └─ ☐ Subjects
```

**2. Click on a Section Checkbox**

```
☑ Master Data (1 sections)
  ├─ ☑ Class
```

↓ After clicking, it automatically expands:

```
☑ Master Data (1 sections)
  ├─ ☑ Class
  │   ├─ [Create] [Edit] [Delete]  ← Click these buttons!
```

**3. Click on Operation Buttons**

- Click **Create** → Button turns GREEN ✅
- Click **Edit** → Button turns ORANGE ✅
- Click **Delete** → Button turns RED ✅
- Click again to deselect (button turns gray)

### Example: Creating an Admin with Limited Permissions

**Scenario**: You want to create an admin who can:

- Add and edit Classes (but not delete)
- Only view Exam Tags (no create/edit/delete)
- Full access to Courses

**Steps**:

1. **Enable Master Data Module**

   - Click the checkbox next to "Master Data"
   - Module expands automatically ✨

2. **Enable Class Section**

   - Click the checkbox next to "Class"
   - Section expands automatically ✨
   - Click **Create** button (turns green)
   - Click **Edit** button (turns orange)
   - Leave **Delete** unchecked (stays gray)

3. **Enable Exam Tag Section** (View Only)

   - Click the checkbox next to "Exam Tag"
   - Section expands automatically ✨
   - Leave all buttons unchecked (Create, Edit, Delete all gray)
   - User can view but not modify

4. **Enable Course Management Module**

   - Click the checkbox next to "Course Management"
   - Module expands automatically ✨

5. **Enable Courses Section with Full Access**

   - Click the checkbox next to "Courses"
   - Section expands automatically ✨
   - Click **Create** button (turns green)
   - Click **Edit** button (turns orange)
   - Click **Delete** button (turns red)

6. **Save the User**
   - Click "Add User" or "Update User" button
   - User is created with the exact permissions you configured!

### Visual Guide

```
☑ Master Data (2 sections)
  │
  ├─ ☑ Class
  │   ├─ ✅ Create (green)
  │   ├─ ✅ Edit (orange)
  │   └─ ❌ Delete (gray - not granted)
  │
  ├─ ☑ Exam Tag
  │   ├─ ❌ Create (gray - not granted)
  │   ├─ ❌ Edit (gray - not granted)
  │   └─ ❌ Delete (gray - not granted)
  │
  └─ ☐ Department (not enabled)

☑ Course Management (1 sections)
  │
  └─ ☑ Courses
      ├─ ✅ Create (green)
      ├─ ✅ Edit (orange)
      └─ ✅ Delete (red)
```

### What the User Will See

When the user logs in:

- They will **ONLY** see the "Add" button for Classes and Courses
- They will **ONLY** see the "Edit" button for Classes and Courses
- They will **ONLY** see the "Delete" button for Courses
- They can **VIEW** Exam Tags but won't see any action buttons
- They **WON'T** see Departments at all

### Tips

✅ **Auto-Expand**: Modules and sections now automatically expand when you enable them
✅ **Color Coding**:

- Green = Create
- Orange = Edit
- Red = Delete
  ✅ **Section Counter**: Shows how many sections are enabled in each module
  ✅ **Collapse/Expand**: Click the chevron icon (▶/▼) to manually collapse/expand
  ✅ **SuperAdmin**: SuperAdmin automatically has ALL permissions - no need to configure

### Troubleshooting

**Q: I clicked the module but don't see sections**
**A:** Make sure the module checkbox is checked (☑). It should auto-expand now.

**Q: I clicked the section but don't see Create/Edit/Delete buttons**
**A:** Make sure the section checkbox is checked (☑). It should auto-expand now.

**Q: The buttons are gray**
**A:** Gray means the permission is NOT granted. Click the button to grant it (it will turn green/orange/red).

**Q: How do I remove a permission?**
**A:** Click the colored button again to turn it gray (disabled).

**Q: How do I remove an entire section?**
**A:** Uncheck the section checkbox. All operations will be removed.

**Q: How do I remove an entire module?**
**A:** Uncheck the module checkbox. All sections and operations will be removed.

### What Changed (Fix Applied)

**Before**:

- Clicking module checkbox didn't show sections
- Had to manually click the chevron to expand
- Confusing UX

**After (NOW)**:

- ✅ Clicking module checkbox automatically expands and shows sections
- ✅ Clicking section checkbox automatically expands and shows operation buttons
- ✅ Smooth, intuitive experience
- ✅ No need to manually expand anything!
