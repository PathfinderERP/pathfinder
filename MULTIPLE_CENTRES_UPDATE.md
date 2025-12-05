# Multiple Centres Support Update

## ✅ **Features Implemented**

### 1. **Backend Updates**
- **User Schema**: Changed `centre` (single ObjectId) to `centres` (Array of ObjectIds).
- **Controllers**: Updated all user creation, update, login, and fetch controllers to handle the new `centres` array.
- **Population**: All endpoints now populate the `centres` array with full centre details.

### 2. **Frontend Updates**
- **Add User Modal**: 
  - Replaced single select dropdown with a **multi-select checkbox list** for Centres.
  - Allows SuperAdmin to assign multiple centres to a user.
- **Edit User Modal**:
  - Supports editing multiple centres.
  - Pre-fills existing centres correctly.
- **User Management List**:
  - Displays all assigned centres (comma-separated) in both Grid and Table views.
  - **Excel Export** now includes all assigned centres.
- **Profile Page**:
  - Displays all assigned centres in the user's profile.

## 📋 **How to Use**

1. **Assigning Multiple Centres**:
   - Go to **User Management** -> **Add User**.
   - In the "Centres" section, check all the centres you want to assign to the user.
   - For **Edit User**, simply check/uncheck centres to update assignments.

2. **Viewing Centres**:
   - In the User Management list, you will see all assigned centres listed for each user.
   - In the Excel export, the "Centres" column will contain a comma-separated list of centre names.

## ⚠️ **Note on Existing Data**
- The system handles backward compatibility for display, but it is recommended to update existing users to the new structure by editing them and saving (which will migrate them to the `centres` array).

Everything is ready! 🚀
