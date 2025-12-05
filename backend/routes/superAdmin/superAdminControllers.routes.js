import express from "express";
import { createAccountBySuperAdmin } from "../../auth/admin/superAdmin/createAccount.js";
import { getAllAdminsBySuperAdmin, getAllTeachersBySuperAdmin, getAllUsersBySuperAdmin } from "../../auth/admin/superAdmin/getAdminsTeachers.js";
import { updateUserBySuperAdmin, deleteUserBySuperAdmin } from "../../auth/admin/superAdmin/updateDeleteUser.js";
import adminTeacherLogin from "../../auth/admin/normalAdmin/adminTeacherLogin.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { createStudentByAdmin } from "../../auth/admin/normalAdmin/createStudentByAdmin.js";

const router = express.Router();

// User Management routes - require "User Management" permission (SuperAdmin always has access)
router.post("/createAccountbyAdmin", requirePermission("User Management"), createAccountBySuperAdmin);
router.get("/getAllAdminsBySuperAdmin", requirePermission("User Management"), getAllAdminsBySuperAdmin);
router.get("/getAllTeachersBySuperAdmin", requirePermission("User Management"), getAllTeachersBySuperAdmin);
router.get("/getAllUsers", requirePermission("User Management"), getAllUsersBySuperAdmin);
router.put("/updateUser/:userId", requirePermission("User Management"), updateUserBySuperAdmin);
router.delete("/deleteUser/:userId", requirePermission("User Management"), deleteUserBySuperAdmin);

// Login route - no auth required
router.post("/login", adminTeacherLogin);

export default router;
