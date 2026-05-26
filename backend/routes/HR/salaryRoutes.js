import express from "express";
import { 
    getCenters, 
    getDepartmentsByCenter, 
    getEmployeesByDepartment,
    getAllEmployeesByCenter,
    approveSalary, 
    getSalaryHistory 
} from "../../controllers/HR/salaryController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/centers", getCenters);
router.get("/departments/:centerId", getDepartmentsByCenter);
router.get("/employees/:centerId/:departmentId", getEmployeesByDepartment);
router.get("/all-employees/:centerId", getAllEmployeesByCenter);
router.post("/approve", approveSalary);
router.get("/history/:employeeId", getSalaryHistory);

export default router;
