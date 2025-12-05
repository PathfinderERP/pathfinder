import express from "express";
import { createAccountBySuperAdmin } from "../../auth/admin/superAdmin/createAccount.js";
import { getAllAdminsBySuperAdmin, getAllTeachersBySuperAdmin, getAllUsersBySuperAdmin } from "../../auth/admin/superAdmin/getAdminsTeachers.js";
import { updateUserBySuperAdmin, deleteUserBySuperAdmin } from "../../auth/admin/superAdmin/updateDeleteUser.js";
import adminTeacherLogin from "../../auth/admin/normalAdmin/adminTeacherLogin.js";
import { requireSuperAdmin } from "../../middleware/requireSuperAdmin.js";
import { createStudentByAdmin } from "../../auth/admin/normalAdmin/createStudentByAdmin.js";
const router = express.Router();

router.post("/createAccountbyAdmin", createAccountBySuperAdmin);
router.get("/getAllAdminsBySuperAdmin", requireSuperAdmin, getAllAdminsBySuperAdmin);
router.get("/getAllTeachersBySuperAdmin", requireSuperAdmin, getAllTeachersBySuperAdmin);
router.get("/getAllUsers", requireSuperAdmin, getAllUsersBySuperAdmin);
router.put("/updateUser/:userId", requireSuperAdmin, updateUserBySuperAdmin);
router.delete("/deleteUser/:userId", requireSuperAdmin, deleteUserBySuperAdmin);
router.post("/login", adminTeacherLogin);


export default router;
