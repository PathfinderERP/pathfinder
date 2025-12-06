import express from "express";
import { createAccountBySuperAdmin } from "../../auth/admin/superAdmin/createAccount.js";
import { getAllAdminsBySuperAdmin, getAllTeachersBySuperAdmin, getAllUsersBySuperAdmin } from "../../auth/admin/superAdmin/getAdminsTeachers.js";
import { updateUserBySuperAdmin, deleteUserBySuperAdmin } from "../../auth/admin/superAdmin/updateDeleteUser.js";
import adminTeacherLogin from "../../auth/admin/normalAdmin/adminTeacherLogin.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { createStudentByAdmin } from "../../auth/admin/normalAdmin/createStudentByAdmin.js";

const router = express.Router();

// User Management routes
router.post("/createAccountbyAdmin", requireGranularPermission("userManagement", "users", "create"), createAccountBySuperAdmin);
router.get("/getAllAdminsBySuperAdmin", requireAuth, getAllAdminsBySuperAdmin);
router.get("/getAllTeachersBySuperAdmin", requireAuth, getAllTeachersBySuperAdmin);
router.get("/getAllUsers", requireAuth, getAllUsersBySuperAdmin);
router.put("/updateUser/:userId", requireGranularPermission("userManagement", "users", "edit"), updateUserBySuperAdmin);
router.delete("/deleteUser/:userId", requireGranularPermission("userManagement", "users", "delete"), deleteUserBySuperAdmin);

// Login route - no auth required
router.post("/login", adminTeacherLogin);

export default router;
