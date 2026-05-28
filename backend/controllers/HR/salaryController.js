import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import Expense from "../../models/Finance/Expense.js";
import Employee from "../../models/HR/Employee.js";
import Department from "../../models/Master_data/Department.js";
import mongoose from "mongoose";

// Get all centers that have active employees based on primaryCentre
export const getCenters = async (req, res) => {
    try {
        const activeUsers = await User.find({ isActive: true }).distinct('_id');
        const primaryCentres = await Employee.distinct('primaryCentre', { 
            user: { $in: activeUsers }, 
            primaryCentre: { $ne: null },
            status: "Active"
        });

        const centers = await Centre.find({
            _id: { $in: primaryCentres },
            status: { $ne: "deactive" }
        }).select('centreName _id');
        res.status(200).json({ success: true, centers });
    } catch (error) {
        console.error("Error fetching centers:", error);
        res.status(500).json({ success: false, message: "Server error fetching centers" });
    }
};

// Get departments (roles/teacherDepartments) for a specific center
export const getDepartmentsByCenter = async (req, res) => {
    try {
        const { centerId } = req.params;
        
        // Find all distinct roles for users in this center
        const roles = await User.distinct('role', { centres: centerId, isActive: true });
        
        // We'll treat 'role' as the department for non-teachers, and teacherDepartments for teachers
        const departments = roles.map(role => ({ id: role, name: role.charAt(0).toUpperCase() + role.slice(1) }));

        res.status(200).json({ success: true, departments });
    } catch (error) {
        console.error("Error fetching departments:", error);
        res.status(500).json({ success: false, message: "Server error fetching departments" });
    }
};

// Get employees for a specific center and department (role) - legacy
export const getEmployeesByDepartment = async (req, res) => {
    try {
        const { centerId, departmentId } = req.params;
        const users = await User.find({
            centres: centerId,
            role: departmentId,
            isActive: true
        }).select('name email employeeId role teacherType mobNum');

        const userIds = users.map(u => u._id);
        const employeesInfo = await Employee.find({ 
            user: { $in: userIds },
            status: "Active"
        }).select('user currentSalary');
        const salaryMap = {};
        employeesInfo.forEach(emp => {
            if (emp.user) salaryMap[emp.user.toString()] = emp.currentSalary || 0;
        });
        const employeesWithSalary = users
            .filter(u => salaryMap[u._id.toString()] !== undefined)
            .map(u => {
                const userObj = u.toObject();
                userObj.currentSalary = salaryMap[u._id.toString()] || 0;
                return userObj;
            });
        res.status(200).json({ success: true, employees: employeesWithSalary });
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ success: false, message: "Server error fetching employees" });
    }
};

// Get ALL employees for a center (with salary), grouped by department
export const getAllEmployeesByCenter = async (req, res) => {
    try {
        const { centerId } = req.params;

        const query = { status: "Active" };
        if (centerId && centerId !== "all") {
            query.primaryCentre = centerId;
        }

        const employees = await Employee.find(query)
        .populate({
            path: 'user',
            select: 'name email role isActive mobNum employeeId'
        })
        .populate('department', 'departmentName')
        .populate('primaryCentre', 'centreName');

        // Filter only active employees (where user account is active)
        const activeEmployees = employees.filter(emp => emp.user && emp.user.isActive);

        const enriched = activeEmployees.map(emp => {
            const userObj = emp.user.toObject();
            return {
                _id: userObj._id,
                employeeId: emp.employeeId || userObj.employeeId || "—",
                name: emp.name || userObj.name,
                email: emp.email || userObj.email,
                mobNum: emp.phoneNumber || userObj.mobNum || "—",
                role: userObj.role,
                departmentName: emp.department?.departmentName || "Other Department",
                currentSalary: emp.currentSalary || 0,
                centreId: emp.primaryCentre?._id || null,
                centreName: emp.primaryCentre?.centreName || "Other Centre"
            };
        });

        // Get distinct department names for filter options
        const departmentsSet = new Set();
        enriched.forEach(emp => {
            if (emp.departmentName) {
                departmentsSet.add(emp.departmentName);
            }
        });
        const departments = [...departmentsSet].sort();

        res.status(200).json({ success: true, employees: enriched, departments });
    } catch (error) {
        console.error("Error fetching all employees:", error);
        res.status(500).json({ success: false, message: "Server error fetching employees" });
    }
};

// Submit Salary Approval (Creates Pending Expense)
export const approveSalary = async (req, res) => {
    try {
        const { employeeId, centerId, salaryMonth, salaryPeriod, amount } = req.body;
        const hrUserId = req.user._id; // Assuming user is populated by auth middleware

        if (!employeeId || !centerId || !salaryMonth || !salaryPeriod || !amount) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Find the employee record to get their actual department and centre
        const employeeRecord = await Employee.findOne({ user: employeeId });
        const resolvedDeptId = employeeRecord ? employeeRecord.department : null;
        const resolvedCentreId = employeeRecord?.primaryCentre || (centerId !== "all" ? centerId : null);

        if (!resolvedCentreId) {
            return res.status(400).json({ success: false, message: "No center assigned to employee" });
        }

        const newExpense = new Expense({
            expenseType: 'Salary',
            employeeId,
            centreId: resolvedCentreId,
            departmentId: resolvedDeptId,
            months: salaryMonth,
            salaryPeriod,
            amount,
            originalAmount: amount,
            remainingAmount: amount,
            paidAmount: 0,
            hrApprovedBy: hrUserId,
            hrApprovedDate: new Date(),
            financeStatus: 'Pending',
            createdBy: hrUserId
        });

        await newExpense.save();

        res.status(201).json({ success: true, message: "Salary expense submitted for finance approval", expense: newExpense });
    } catch (error) {
        console.error("Error submitting salary approval:", error);
        res.status(500).json({ success: false, message: "Server error submitting salary approval" });
    }
};

// Submit bulk salary approvals (creates pending expenses for multiple employees)
// salaryMonth (body): optional default month when each entry omits salaryMonth
// each entry may include salaryMonth to override (different month per employee)
export const approveSalaryBulk = async (req, res) => {
    try {
        const { centerId, salaryMonth: globalSalaryMonth, salaryPeriod, employees } = req.body;
        const hrUserId = req.user._id;

        if (!centerId || !salaryPeriod) {
            return res.status(400).json({ success: false, message: "Center and payout week are required" });
        }

        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ success: false, message: "Select at least one employee" });
        }

        const created = [];
        const failed = [];

        for (const entry of employees) {
            const { employeeId, amount, salaryMonth: entryMonth } = entry;
            const parsedAmount = Number(amount);
            const resolvedMonth = (entryMonth && String(entryMonth).trim()) || (globalSalaryMonth && String(globalSalaryMonth).trim()) || "";

            if (!employeeId) {
                failed.push({ employeeId: null, reason: "Missing employee ID" });
                continue;
            }
            if (!resolvedMonth) {
                failed.push({ employeeId, reason: "Missing salary month" });
                continue;
            }
            if (!parsedAmount || parsedAmount <= 0) {
                failed.push({ employeeId, reason: "Invalid amount" });
                continue;
            }

            try {
                const employeeRecord = await Employee.findOne({ user: employeeId })
                    .populate("user", "name")
                    .populate("department", "departmentName");

                if (!employeeRecord?.user) {
                    failed.push({ employeeId, reason: "Employee not found" });
                    continue;
                }

                const resolvedCentreId = employeeRecord.primaryCentre || (centerId !== "all" ? centerId : null);
                if (!resolvedCentreId) {
                    failed.push({ employeeId, reason: "No center assigned to employee" });
                    continue;
                }

                const newExpense = new Expense({
                    expenseType: "Salary",
                    employeeId,
                    centreId: resolvedCentreId,
                    departmentId: employeeRecord.department?._id || employeeRecord.department || null,
                    months: resolvedMonth,
                    salaryPeriod,
                    amount: parsedAmount,
                    originalAmount: parsedAmount,
                    remainingAmount: parsedAmount,
                    paidAmount: 0,
                    hrApprovedBy: hrUserId,
                    hrApprovedDate: new Date(),
                    financeStatus: "Pending",
                    createdBy: hrUserId,
                });

                await newExpense.save();
                created.push({
                    employeeId,
                    name: employeeRecord.name || employeeRecord.user?.name,
                    expenseId: newExpense._id,
                });
            } catch (err) {
                console.error(`Bulk salary error for ${employeeId}:`, err);
                failed.push({ employeeId, reason: "Failed to create expense" });
            }
        }

        if (created.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No salary requests were created",
                created: [],
                failed,
            });
        }

        res.status(201).json({
            success: true,
            message: `${created.length} salary request(s) submitted for finance approval`,
            created,
            failed,
        });
    } catch (error) {
        console.error("Error submitting bulk salary approval:", error);
        res.status(500).json({ success: false, message: "Server error submitting bulk salary approval" });
    }
};

// Get salary history for an employee
export const getSalaryHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const history = await Expense.find({
            expenseType: 'Salary',
            employeeId
        })
        .populate('hrApprovedBy', 'name')
        .populate('financeApprovedBy', 'name')
        .sort({ createdAt: -1 });

        res.status(200).json({ success: true, history });
    } catch (error) {
        console.error("Error fetching salary history:", error);
        res.status(500).json({ success: false, message: "Server error fetching salary history" });
    }
};
