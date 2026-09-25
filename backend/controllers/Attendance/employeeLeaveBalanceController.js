import mongoose from 'mongoose';
import Employee from '../../models/HR/Employee.js';
import LeaveType from '../../models/Attendance/LeaveType.js';
import LeaveRequest from '../../models/Attendance/LeaveRequest.js';
import User from '../../models/User.js';
import '../../models/Master_data/Centre.js';
import '../../models/Master_data/Department.js';
import '../../models/Master_data/Designation.js';
import { getSignedFileUrl } from '../../utils/r2Upload.js';

/**
 * Helper to compute Financial Year date range (April 1 to March 31)
 * Format expected: "YYYY-YYYY" (e.g. "2026-2027")
 */
export const getFinancialYearDates = (fyString) => {
    let startYear, endYear;
    if (fyString && /^\d{4}-\d{4}$/.test(fyString.trim())) {
        const parts = fyString.trim().split('-');
        startYear = parseInt(parts[0], 10);
        endYear = parseInt(parts[1], 10);
    } else {
        // Compute current Financial Year based on today's date
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = today.getMonth(); // 0 = Jan, 3 = April
        if (curMonth >= 3) {
            startYear = curYear;
            endYear = curYear + 1;
        } else {
            startYear = curYear - 1;
            endYear = curYear;
        }
    }

    const startDate = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)); // April 1, 00:00:00 UTC
    const endDate = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)); // March 31, 23:59:59.999 UTC
    const financialYear = `${startYear}-${endYear}`;

    return { startDate, endDate, startYear, endYear, financialYear };
};

/**
 * Helper to find employee record linked to user
 */
const findEmployeeByUser = async (userId) => {
    let employee = await Employee.findOne({ user: userId });
    if (!employee) {
        const user = await User.findById(userId);
        if (user && user.email) {
            employee = await Employee.findOne({ email: user.email });
            if (employee && !employee.user) {
                employee.user = userId;
                await employee.save();
            }
        }
    }
    return employee;
};

/**
 * Helper to get all Part-Time Employee IDs (employees, teachers, and HODs)
 * Considers both Employee.typeOfEmployment and User.teacherType
 */
export const getPartTimeEmployeeIds = async () => {
    const ptUsers = await User.find({ teacherType: new RegExp('part', 'i') }).select('_id').lean();
    const ptUserIds = ptUsers.map(u => u._id);

    const ptEmployees = await Employee.find({
        $or: [
            { typeOfEmployment: new RegExp('part', 'i') },
            { user: { $in: ptUserIds } }
        ]
    }).select('_id').lean();

    return ptEmployees.map(e => e._id);
};

/**
 * GET /api/hr/attendance/employee-leave-balances
 * Fetch leave quota & balance analysis for active employees based on Financial Year.
 * Visibility:
 * - SuperAdmin & HR: See all active employees
 * - Reporting Managers: See their active reportees (same as Team Regularization)
 */
export const getEmployeeLeaveBalances = async (req, res) => {
    try {
        const {
            financialYear: requestedFY,
            month: requestedMonth,
            centre,
            department,
            search,
            page = 1,
            limit = 20
        } = req.query;

        // 1. Calculate FY Date Range
        const { startDate: fyStartDate, endDate: fyEndDate, startYear, endYear, financialYear } = getFinancialYearDates(requestedFY);

        // 2. Month calculation for monthly leaves (Short Leave, Early Leave)
        const today = new Date();
        let targetMonth = requestedMonth !== undefined && requestedMonth !== "" ? parseInt(requestedMonth, 10) : today.getMonth();
        if (isNaN(targetMonth) || targetMonth < 0 || targetMonth > 11) {
            targetMonth = today.getMonth();
        }
        // Determine year corresponding to the chosen month in this financial year
        // Months April (3) - December (11) belong to startYear; January (0) - March (2) belong to endYear.
        const targetMonthYear = targetMonth >= 3 ? startYear : endYear;
        const monthStartDate = new Date(Date.UTC(targetMonthYear, targetMonth, 1, 0, 0, 0, 0));
        const monthEndDate = new Date(Date.UTC(targetMonthYear, targetMonth + 1, 0, 23, 59, 59, 999));

        // 3. Access Control (Role & Reporting Manager filtering)
        const userRole = (req.user?.role || "").toLowerCase().replace(/[\s_]+/g, "");
        const isSuperAdminOrHR = userRole === "superadmin" || userRole === "hr";

        const employeeQuery = { status: "Active" };

        // Exclude all part-time employees, teachers, and HODs from Leave Balances
        const partTimeEmpIds = await getPartTimeEmployeeIds();
        const partTimeIdStrings = new Set(partTimeEmpIds.map(id => id.toString()));

        if (!isSuperAdminOrHR) {
            // Reporting Manager view
            const managerEmp = await findEmployeeByUser(req.user.id);
            if (!managerEmp) {
                return res.status(200).json({
                    employees: [],
                    totalEmployees: 0,
                    totalPages: 0,
                    currentPage: parseInt(page, 10),
                    financialYear,
                    financialYearDates: { startDate: fyStartDate, endDate: fyEndDate },
                    activeMonth: targetMonth,
                    summary: { totalAllocated: 0, totalUsed: 0, totalPending: 0, totalAvailable: 0 },
                    availableFinancialYears: [
                        `${startYear - 1}-${startYear}`,
                        `${startYear}-${endYear}`,
                        `${startYear + 1}-${endYear + 1}`
                    ]
                });
            }

            const reportees = await Employee.find({ manager: managerEmp._id, status: "Active" }).select('_id');
            const reporteeIds = reportees
                .map(r => r._id)
                .filter(id => !partTimeIdStrings.has(id.toString()));

            if (reporteeIds.length === 0) {
                return res.status(200).json({
                    employees: [],
                    totalEmployees: 0,
                    totalPages: 0,
                    currentPage: parseInt(page, 10),
                    financialYear,
                    financialYearDates: { startDate: fyStartDate, endDate: fyEndDate },
                    activeMonth: targetMonth,
                    summary: { totalAllocated: 0, totalUsed: 0, totalPending: 0, totalAvailable: 0 },
                    availableFinancialYears: [
                        `${startYear - 1}-${startYear}`,
                        `${startYear}-${endYear}`,
                        `${startYear + 1}-${endYear + 1}`
                    ]
                });
            }

            employeeQuery._id = { $in: reporteeIds };
        } else {
            employeeQuery._id = { $nin: partTimeEmpIds };
        }

        // 4. Center and Department Filters
        if (centre) {
            if (mongoose.Types.ObjectId.isValid(centre)) {
                employeeQuery.primaryCentre = centre;
            } else {
                employeeQuery.centerArray = centre;
            }
        }

        if (department) {
            if (mongoose.Types.ObjectId.isValid(department)) {
                employeeQuery.department = department;
            }
        }

        // 5. Search Filter (Employee Name or Employee ID)
        if (search && search.trim()) {
            const s = search.trim();
            employeeQuery.$or = [
                { name: { $regex: s, $options: 'i' } },
                { employeeId: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } }
            ];
        }

        // 6. Fetch Leave Types
        const leaveTypes = await LeaveType.find({}).sort({ createdAt: 1 }).lean();

        // 7. Pagination and Employee Fetching
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 20);
        const skip = (pageNum - 1) * limitNum;

        const totalEmployees = await Employee.countDocuments(employeeQuery);

        const employees = await Employee.find(employeeQuery)
            .populate('primaryCentre', 'centreName')
            .populate('department', 'departmentName')
            .populate('designation', 'designation')
            .populate('manager', 'name employeeId')
            .populate('user', 'role')
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        if (employees.length === 0) {
            return res.status(200).json({
                employees: [],
                totalEmployees,
                totalPages: Math.ceil(totalEmployees / limitNum),
                currentPage: pageNum,
                financialYear,
                financialYearDates: { startDate: fyStartDate, endDate: fyEndDate },
                activeMonth: targetMonth,
                summary: { totalAllocated: 0, totalUsed: 0, totalPending: 0, totalAvailable: 0 },
                availableFinancialYears: [
                    `${startYear - 2}-${startYear - 1}`,
                    `${startYear - 1}-${startYear}`,
                    `${startYear}-${endYear}`,
                    `${startYear + 1}-${endYear + 1}`
                ]
            });
        }

        const employeeIds = employees.map(e => e._id);

        // 8. Single-pass Aggregation for Leave Requests
        // Yearly leaves within FY (fyStartDate to fyEndDate)
        // Monthly leaves within selected Month (monthStartDate to monthEndDate)
        const leaveRequests = await LeaveRequest.find({
            employee: { $in: employeeIds },
            status: { $in: ['Approved', 'Pending'] },
            $or: [
                { startDate: { $gte: fyStartDate, $lte: fyEndDate } },
                { endDate: { $gte: fyStartDate, $lte: fyEndDate } }
            ]
        }).lean();

        // Group leave requests by employee and leaveType
        const requestsByEmpAndType = new Map();
        for (const reqItem of leaveRequests) {
            const empKey = reqItem.employee.toString();
            const typeKey = reqItem.leaveType.toString();
            const compoundKey = `${empKey}_${typeKey}`;

            if (!requestsByEmpAndType.has(compoundKey)) {
                requestsByEmpAndType.set(compoundKey, []);
            }
            requestsByEmpAndType.get(compoundKey).push(reqItem);
        }

        // 9. Compute Balances for each Employee
        let overallAllocated = 0;
        let overallUsed = 0;
        let overallPending = 0;
        let overallAvailable = 0;

        const employeeLeaveData = await Promise.all(employees.map(async (emp) => {
            const isTeacher = emp.user?.role === 'teacher';
            const empKey = emp._id.toString();

            const leaveBalances = leaveTypes.map(lt => {
                const isMonthly = /short\s*leave|early\s*leave/i.test(lt.name) || lt.validity === 'monthly';
                const totalQuota = isTeacher && lt.teacherDays != null ? lt.teacherDays : lt.days;

                const compoundKey = `${empKey}_${lt._id.toString()}`;
                const allReqs = requestsByEmpAndType.get(compoundKey) || [];

                // Filter according to cycle
                let relevantReqs = allReqs;
                if (isMonthly) {
                    relevantReqs = allReqs.filter(r => {
                        const rDate = new Date(r.startDate);
                        return rDate >= monthStartDate && rDate <= monthEndDate;
                    });
                } else {
                    relevantReqs = allReqs.filter(r => {
                        const rDate = new Date(r.startDate);
                        return rDate >= fyStartDate && rDate <= fyEndDate;
                    });
                }

                const usedDays = relevantReqs
                    .filter(r => r.status === 'Approved')
                    .reduce((sum, r) => sum + (r.days || 0), 0);

                const pendingDays = relevantReqs
                    .filter(r => r.status === 'Pending')
                    .reduce((sum, r) => sum + (r.days || 0), 0);

                // Applied leaves (Pending) are deducted automatically; Approved leaves remain deducted; Rejected leaves are excluded and thus added back
                const deductedDays = usedDays + pendingDays;
                const availableDays = Math.max(0, totalQuota - deductedDays);

                return {
                    leaveTypeId: lt._id,
                    leaveTypeName: lt.name,
                    cycle: isMonthly ? 'monthly' : 'yearly',
                    totalQuota,
                    usedDays,
                    pendingDays,
                    availableDays
                };
            });

            const empTotalAllocated = leaveBalances.reduce((sum, lb) => sum + lb.totalQuota, 0);
            const empTotalUsed = leaveBalances.reduce((sum, lb) => sum + lb.usedDays, 0);
            const empTotalPending = leaveBalances.reduce((sum, lb) => sum + lb.pendingDays, 0);
            const empTotalAvailable = leaveBalances.reduce((sum, lb) => sum + lb.availableDays, 0);

            overallAllocated += empTotalAllocated;
            overallUsed += empTotalUsed;
            overallPending += empTotalPending;
            overallAvailable += empTotalAvailable;

            let signedProfileImage = null;
            if (emp.profileImage) {
                try {
                    signedProfileImage = await getSignedFileUrl(emp.profileImage);
                } catch (e) {
                    signedProfileImage = emp.profileImage;
                }
            }

            return {
                _id: emp._id,
                employeeId: emp.employeeId,
                name: emp.name,
                email: emp.email,
                phoneNumber: emp.phoneNumber,
                profileImage: signedProfileImage,
                primaryCentre: emp.primaryCentre?.centreName || (emp.centerArray && emp.centerArray[0]) || "N/A",
                department: emp.department?.departmentName || "N/A",
                designation: emp.designation?.designation || "N/A",
                manager: emp.manager ? { name: emp.manager.name, employeeId: emp.manager.employeeId } : null,
                leaveBalances,
                totalAllocated: empTotalAllocated,
                totalUsed: empTotalUsed,
                totalPending: empTotalPending,
                totalAvailable: empTotalAvailable
            };
        }));

        // Financial Year Options
        const availableFinancialYears = [
            `${startYear - 2}-${startYear - 1}`,
            `${startYear - 1}-${startYear}`,
            `${startYear}-${endYear}`,
            `${startYear + 1}-${endYear + 1}`
        ];

        res.status(200).json({
            success: true,
            employees: employeeLeaveData,
            totalEmployees,
            totalPages: Math.ceil(totalEmployees / limitNum),
            currentPage: pageNum,
            itemsPerPage: limitNum,
            financialYear,
            financialYearDates: { startDate: fyStartDate, endDate: fyEndDate },
            activeMonth: targetMonth,
            summary: {
                totalAllocated: overallAllocated,
                totalUsed: overallUsed,
                totalPending: overallPending,
                totalAvailable: overallAvailable
            },
            availableFinancialYears,
            leaveTypes: leaveTypes.map(lt => ({
                _id: lt._id,
                name: lt.name,
                days: lt.days,
                teacherDays: lt.teacherDays,
                cycle: (/short\s*leave|early\s*leave/i.test(lt.name) || lt.validity === 'monthly') ? 'monthly' : 'yearly'
            }))
        });

    } catch (error) {
        console.error("Error in getEmployeeLeaveBalances:", error);
        res.status(500).json({ message: "Server error fetching leave balances", error: error.message });
    }
};

/**
 * GET /api/hr/attendance/employee-leave-balances/:employeeId
 * Get detailed leave history & breakdown for a specific active employee in the chosen FY.
 */
export const getEmployeeLeaveDetails = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { financialYear: requestedFY, month: requestedMonth } = req.query;

        const { startDate: fyStartDate, endDate: fyEndDate, startYear, endYear, financialYear } = getFinancialYearDates(requestedFY);

        const today = new Date();
        let targetMonth = requestedMonth !== undefined && requestedMonth !== "" ? parseInt(requestedMonth, 10) : today.getMonth();
        if (isNaN(targetMonth) || targetMonth < 0 || targetMonth > 11) {
            targetMonth = today.getMonth();
        }
        const targetMonthYear = targetMonth >= 3 ? startYear : endYear;
        const monthStartDate = new Date(Date.UTC(targetMonthYear, targetMonth, 1, 0, 0, 0, 0));
        const monthEndDate = new Date(Date.UTC(targetMonthYear, targetMonth + 1, 0, 23, 59, 59, 999));

        const emp = await Employee.findById(employeeId)
            .populate('primaryCentre', 'centreName')
            .populate('department', 'departmentName')
            .populate('designation', 'designation')
            .populate('manager', 'name employeeId email phoneNumber')
            .populate('user', 'role teacherType')
            .lean();

        if (!emp) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Part-time check: part-time teachers, employees, and HODs leave details should not be viewable
        const isPartTime = (emp.typeOfEmployment && /part-?time/i.test(emp.typeOfEmployment)) ||
                           (emp.user?.teacherType && /part-?time/i.test(emp.user.teacherType));
        if (isPartTime) {
            return res.status(403).json({
                message: "Leave details are not viewable for part-time employees, teachers, or HODs."
            });
        }

        // Manager check
        const userRole = (req.user?.role || "").toLowerCase().replace(/[\s_]+/g, "");
        const isSuperAdminOrHR = userRole === "superadmin" || userRole === "hr";

        if (!isSuperAdminOrHR) {
            const managerEmp = await findEmployeeByUser(req.user.id);
            if (!managerEmp || (emp.manager?._id && emp.manager._id.toString() !== managerEmp._id.toString())) {
                return res.status(403).json({ message: "Access denied. You can only view your direct reportees." });
            }
        }

        const leaveTypes = await LeaveType.find({}).sort({ createdAt: 1 }).lean();

        // Fetch all leave applications in this Financial Year
        const leaveRequests = await LeaveRequest.find({
            employee: employeeId,
            $or: [
                { startDate: { $gte: fyStartDate, $lte: fyEndDate } },
                { endDate: { $gte: fyStartDate, $lte: fyEndDate } }
            ]
        })
            .populate('leaveType', 'name')
            .populate('reviewedBy', 'name')
            .sort({ startDate: -1 })
            .lean();

        const isTeacher = emp.user?.role === 'teacher';

        const leaveBalances = leaveTypes.map(lt => {
            const isMonthly = /short\s*leave|early\s*leave/i.test(lt.name) || lt.validity === 'monthly';
            const totalQuota = isTeacher && lt.teacherDays != null ? lt.teacherDays : lt.days;

            let relevantReqs = leaveRequests.filter(r => r.leaveType?._id?.toString() === lt._id.toString());
            if (isMonthly) {
                relevantReqs = relevantReqs.filter(r => {
                    const rDate = new Date(r.startDate);
                    return rDate >= monthStartDate && rDate <= monthEndDate;
                });
            }

            const usedDays = relevantReqs
                .filter(r => r.status === 'Approved')
                .reduce((sum, r) => sum + (r.days || 0), 0);

            const pendingDays = relevantReqs
                .filter(r => r.status === 'Pending')
                .reduce((sum, r) => sum + (r.days || 0), 0);

            // Applied leaves (Pending) are deducted automatically; Approved leaves remain deducted; Rejected leaves are excluded and thus added back
            const deductedDays = usedDays + pendingDays;
            const availableDays = Math.max(0, totalQuota - deductedDays);

            return {
                leaveTypeId: lt._id,
                leaveTypeName: lt.name,
                cycle: isMonthly ? 'monthly' : 'yearly',
                totalQuota,
                usedDays,
                pendingDays,
                availableDays
            };
        });

        let signedProfileImage = null;
        if (emp.profileImage) {
            try {
                signedProfileImage = await getSignedFileUrl(emp.profileImage);
            } catch (e) {
                signedProfileImage = emp.profileImage;
            }
        }

        res.status(200).json({
            success: true,
            employee: {
                ...emp,
                profileImage: signedProfileImage
            },
            financialYear,
            financialYearDates: { startDate: fyStartDate, endDate: fyEndDate },
            activeMonth: targetMonth,
            leaveBalances,
            leaveRequests
        });

    } catch (error) {
        console.error("Error in getEmployeeLeaveDetails:", error);
        res.status(500).json({ message: "Server error fetching employee leave details", error: error.message });
    }
};
