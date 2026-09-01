import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import Expense from "../../models/Finance/Expense.js";
import Employee from "../../models/HR/Employee.js";
import Department from "../../models/Master_data/Department.js";
import EmployeeAttendance from "../../models/Attendance/EmployeeAttendance.js";
import Holiday from "../../models/Attendance/Holiday.js";
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
            status: { $ne: "deactive" },
            centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] }
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
        }).select('user currentSalary accountNumber ifscCode');
        const salaryMap = {};
        employeesInfo.forEach(emp => {
            if (emp.user) {
                salaryMap[emp.user.toString()] = {
                    currentSalary: emp.currentSalary || 0,
                    accountNumber: emp.accountNumber || "—",
                    ifscCode: emp.ifscCode || "—"
                };
            }
        });
        const employeesWithSalary = users
            .filter(u => salaryMap[u._id.toString()] !== undefined)
            .map(u => {
                const userObj = u.toObject();
                userObj.currentSalary = salaryMap[u._id.toString()].currentSalary || 0;
                userObj.accountNumber = salaryMap[u._id.toString()].accountNumber || "—";
                userObj.ifscCode = salaryMap[u._id.toString()].ifscCode || "—";
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
        const { salaryMonth, month, year } = req.query;

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        let targetMonthIndex = -1;
        if (salaryMonth) {
            targetMonthIndex = monthNames.findIndex(m => m.toLowerCase() === String(salaryMonth).toLowerCase());
        }
        if (targetMonthIndex === -1 && month) {
            const parsedM = parseInt(month, 10);
            if (!isNaN(parsedM) && parsedM >= 1 && parsedM <= 12) {
                targetMonthIndex = parsedM - 1;
            }
        }
        const now = new Date();
        const targetMonth = targetMonthIndex !== -1 ? targetMonthIndex + 1 : (now.getMonth() + 1);
        const targetYear = parseInt(year, 10) || now.getFullYear();
        const targetMonthName = monthNames[targetMonth - 1];

        const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

        const allowedCentres = await Centre.find({
            status: { $ne: "deactive" },
            centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] }
        }).select('_id');
        const allowedCentreIds = allowedCentres.map(c => c._id);

        const query = { 
            status: "Active",
            primaryCentre: { $in: allowedCentreIds }
        };
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

        // Filter only active employees (where user account is active and centre is not excluded)
        const activeEmployees = employees.filter(emp => {
            if (!emp.user || !emp.user.isActive) return false;
            const cName = emp.primaryCentre?.centreName || "";
            if (/phsps|franchise|rkm/i.test(cName)) return false;
            return true;
        });

        // Fetch all salary payout expenses for these employees
        const employeeUserIds = activeEmployees.map(emp => emp.user._id);
        const activeEmpDocIds = activeEmployees.map(emp => emp._id);

        const salaryExpenses = await Expense.find({
            expenseType: "Salary",
            employeeId: { $in: employeeUserIds }
        }).select("employeeId months salaryPeriod amount financeStatus");

        // Fetch attendance for these employees in this month range
        const attendanceDocs = await EmployeeAttendance.find({
            $or: [
                { employeeId: { $in: activeEmpDocIds } },
                { user: { $in: employeeUserIds } }
            ],
            date: { $gte: startDate, $lte: endDate }
        }).select("employeeId user date status isHoliday workingHours");

        // Fetch company holidays for this month range
        const companyHolidays = await Holiday.find({
            date: { $gte: startDate, $lte: endDate },
            type: { $ne: "Optional" }
        });

        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

        const toDateKey = (d) => {
            if (!d) return "";
            const dt = new Date(d);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const holidayDateSet = new Set(companyHolidays.map(h => toDateKey(h.date)));

        const isEmployeeWeekOff = (emp, dayIndex, dayName) => {
            const rawWd = emp.workingDays ? (emp.workingDays.toObject ? emp.workingDays.toObject() : emp.workingDays) : null;
            if (rawWd && typeof rawWd === 'object') {
                const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                const hasAnyTrue = days.some(d => rawWd[d] === true);
                if (hasAnyTrue) {
                    return rawWd[dayName.toLowerCase()] === false;
                }
            }
            if (Array.isArray(emp.workingDaysList) && emp.workingDaysList.length > 0) {
                const lowerList = emp.workingDaysList.map(d => String(d).toLowerCase());
                return !lowerList.includes(dayName.toLowerCase());
            }
            // Default: Sunday (dayIndex === 0) is designated Week Off (6-day work week)
            return dayIndex === 0;
        };

        const getEmployeeMonthlyWeekOffsCount = (emp, targetYear, targetMonth, daysInMonth) => {
            let count = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const current = new Date(targetYear, targetMonth - 1, d, 12, 0, 0);
                const dayIndex = current.getDay();
                const dayName = dayNames[dayIndex];
                if (isEmployeeWeekOff(emp, dayIndex, dayName)) {
                    count++;
                }
            }
            return count;
        };

        const enriched = activeEmployees.map(emp => {
            const userObj = emp.user.toObject();
            const empExpenses = salaryExpenses.filter(exp => exp.employeeId.toString() === userObj._id.toString());
            
            // Attendance calculation for the specified month
            const empAtts = attendanceDocs.filter(a => 
                (a.employeeId && a.employeeId.toString() === emp._id.toString()) ||
                (a.user && a.user.toString() === userObj._id.toString())
            );

            let workedDays = 0;
            let leavesCount = 0;
            let holidaysCount = 0;

            const joiningDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
            const dynamicWeekOffs = getEmployeeMonthlyWeekOffsCount(emp, targetYear, targetMonth, daysInMonth);

            for (let d = 1; d <= daysInMonth; d++) {
                const current = new Date(targetYear, targetMonth - 1, d, 12, 0, 0);
                const dateStr = toDateKey(current);

                if (joiningDate && current < joiningDate) {
                    continue;
                }

                const att = empAtts.find(a => toDateKey(a.date) === dateStr);
                const isCompanyHoliday = holidayDateSet.has(dateStr);

                if (isCompanyHoliday || (att && (att.status === "Holiday" || att.isHoliday))) {
                    holidaysCount += 1;
                } else if (att) {
                    if (["Present", "Late", "Overtime", "Early Leave", "Short Leave", "Forgot to Checkout", "On Duty"].includes(att.status)) {
                        workedDays += 1;
                    } else if (att.status === "Half Day") {
                        workedDays += 0.5;
                    } else if (att.status === "Leave") {
                        leavesCount += 1;
                    }
                }
            }

            // Dynamically uses the actual count of week offs in this month (e.g. 5 Sundays in August, 4 in September, 8/9 for 5-day week)
            const weekOffsCount = dynamicWeekOffs;
            const presentDays = workedDays;
            const totalPaidDays = Math.min(daysInMonth, workedDays + leavesCount + holidaysCount + weekOffsCount);
            const grossSalary = emp.currentSalary || (emp.salaryStructure?.[0]?.totalEarnings) || 0;
            
            // If totalPaidDays reaches total days in month (e.g. 24 worked + 5 week offs + 1 holiday = 30), full gross salary when all working days complete
            const calculatedSalary = grossSalary > 0
                ? (totalPaidDays >= daysInMonth ? grossSalary : Math.round((grossSalary / daysInMonth) * totalPaidDays))
                : 0;

            return {
                _id: userObj._id,
                employeeDocId: emp._id,
                employeeId: emp.employeeId || userObj.employeeId || "—",
                name: emp.name || userObj.name,
                email: emp.email || userObj.email,
                mobNum: emp.phoneNumber || userObj.mobNum || "—",
                role: userObj.role,
                departmentName: emp.department?.departmentName || "Other Department",
                currentSalary: grossSalary, // Gross Salary
                grossSalary: grossSalary,
                presentDays: presentDays,
                leavesCount: leavesCount,
                holidaysCount: holidaysCount,
                weekOffsCount: weekOffsCount,
                totalPaidDays: totalPaidDays,
                daysInMonth: daysInMonth,
                calculatedSalary: calculatedSalary,
                accountNumber: emp.accountNumber || "—",
                ifscCode: emp.ifscCode || "—",
                centreId: emp.primaryCentre?._id || null,
                centreName: emp.primaryCentre?.centreName || "Other Centre",
                payouts: empExpenses.map(exp => ({
                    month: exp.months,
                    week: exp.salaryPeriod,
                    amount: exp.amount,
                    status: exp.financeStatus
                }))
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

        res.status(200).json({ 
            success: true, 
            employees: enriched, 
            departments,
            targetMonth: targetMonthName,
            targetYear: targetYear,
            daysInMonth: daysInMonth
        });
    } catch (error) {
        console.error("Error fetching all employees:", error);
        res.status(500).json({ success: false, message: "Server error fetching employees" });
    }
};

// Submit Salary Approval (Directly marks salary as approved for the employee)
export const approveSalary = async (req, res) => {
    try {
        const { employeeId, centerId, salaryMonth, salaryPeriod, amount } = req.body;
        const hrUserId = req.user._id;

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
            amount: Number(amount),
            originalAmount: Number(amount),
            remainingAmount: 0,
            paidAmount: Number(amount),
            accountNumber: employeeRecord?.accountNumber || "—",
            ifscCode: employeeRecord?.ifscCode || "—",
            hrApprovedBy: hrUserId,
            hrApprovedDate: new Date(),
            financeStatus: 'Approved',
            financeApprovedBy: hrUserId,
            financeApprovedDate: new Date(),
            createdBy: hrUserId
        });

        await newExpense.save();

        res.status(201).json({ success: true, message: "Salary approved successfully", expense: newExpense });
    } catch (error) {
        console.error("Error submitting salary approval:", error);
        res.status(500).json({ success: false, message: "Server error submitting salary approval" });
    }
};

// Submit bulk salary approvals (Directly marks salary as approved for multiple employees)
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
                    remainingAmount: 0,
                    paidAmount: parsedAmount,
                    accountNumber: employeeRecord?.accountNumber || "—",
                    ifscCode: employeeRecord?.ifscCode || "—",
                    hrApprovedBy: hrUserId,
                    hrApprovedDate: new Date(),
                    financeStatus: "Approved",
                    financeApprovedBy: hrUserId,
                    financeApprovedDate: new Date(),
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
                failed.push({ employeeId, reason: "Failed to create approval" });
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
