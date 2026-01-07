import express from 'express';
import { requireAuth } from '../../middleware/permissionMiddleware.js';
import { getPayrollEmployees, getPayrollEmployeeDetails } from '../../controllers/Finance/payrollController.js';

const router = express.Router();

router.get('/employees', requireAuth, getPayrollEmployees);
router.get('/employee/:id', requireAuth, getPayrollEmployeeDetails);

export default router;
