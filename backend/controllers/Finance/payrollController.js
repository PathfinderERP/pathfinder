import Employee from "../../models/HR/Employee.js";

// @desc    Get All Employees for Payroll with Filters
// @route   GET /api/finance/payroll/employees
// @access  Private
export const getPayrollEmployees = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, departments, designations, centres } = req.query;

        let query = {
            status: { $in: ["Active", "Probation"] } // Only active employees
        };

        // Search Logic
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { employeeId: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        // Filters
        if (departments) {
            // Need exact match or lookup? 
            // Departments in Employee are ObjectIds.
            // If frontend sends Names, we need to convert or do aggregation lookup logic.
            // Usually filters send IDs if the dropdowns are populated with IDs. 
            // The frontend PayEmployee.jsx sets options as `d.departmentName`. 
            // So we either Fix frontend to send IDs or do a lookup here.
            // Frontend uses `d.departmentName`? Let's check PayEmployee.jsx fetchOptions...
            // It maps `depts.map(d => d.departmentName)`. So standard names.
            // But Employee model stores `department: ObjectId`.
            // This WILL FAIL without aggregation or fetching IDs first.

            // Strategy: Use Aggregation to join Department/Designation/Centre and match strings.
        }

        // Simpler Strategy for now:
        // Use populate and filter in memory if result set is small OR specific lookup pipeline.
        // Let's go with Lookup Pipeline for correctness.

        const pipeline = [
            { $match: { status: { $in: ["Active", "Probation"] } } }, // Base filter

            // Lookups
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "deptData"
                }
            },
            { $unwind: { path: "$deptData", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "designations",
                    localField: "designation",
                    foreignField: "_id",
                    as: "desigData"
                }
            },
            { $unwind: { path: "$desigData", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "centreschemas",
                    localField: "primaryCentre",
                    foreignField: "_id",
                    as: "centreData"
                }
            },
            { $unwind: { path: "$centreData", preserveNullAndEmptyArrays: true } },

            // Search Match (Early stage filtering)
            ...(search ? [{
                $match: {
                    $or: [
                        { name: { $regex: search, $options: "i" } },
                        { employeeId: { $regex: search, $options: "i" } }
                    ]
                }
            }] : []),

            // String Filter Matching
            ...(departments ? [{
                $match: {
                    "deptData.departmentName": { $in: departments.split(",") }
                }
            }] : []),

            ...(designations ? [{
                $match: {
                    "desigData.name": { $in: designations.split(",") }
                }
            }] : []),

            ...(centres ? [{
                $match: {
                    "centreData.centreName": { $in: centres.split(",") }
                }
            }] : []),
        ];

        // Total Count Pipeline
        const countPipeline = [...pipeline, { $count: "total" }];
        const countRes = await Employee.aggregate(countPipeline);
        const totalItems = countRes[0]?.total || 0;

        // Data Pipeline
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const dataPipeline = [
            ...pipeline,
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $project: {
                    name: 1,
                    employeeId: 1,
                    status: 1,
                    profileImage: 1,
                    department: "$deptData",
                    designation: "$desigData",
                    primaryCentre: "$centreData"
                }
            }
        ];

        const employees = await Employee.aggregate(dataPipeline);

        res.status(200).json({
            employees,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalItems / parseInt(limit)),
            totalItems
        });

    } catch (error) {
        console.error("Payroll List Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

import EmployeeAttendance from "../../models/Attendance/EmployeeAttendance.js";

// @desc    Get Single Employee Details for Payroll (with Salary Structure)
// @route   GET /api/finance/payroll/employee/:id
// @access  Private
// @param   month (query) - 1-12
// @param   year (query) - YYYY
export const getPayrollEmployeeDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;

        const employee = await Employee.findById(id)
            .populate("department", "departmentName")
            .populate("designation", "name")
            .populate("primaryCentre", "centreName")
            .select("-password")
            .lean();

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Calculate/Structure data for frontend
        if (employee.salaryStructure) {
            employee.salaryStructure.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        }

        let attendanceCount = 26; // Default fallback
        let sundaysCount = 4; // Default fallback

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const attendanceDocs = await EmployeeAttendance.find({
                employeeId: id,
                date: {
                    $gte: startDate,
                    $lte: endDate
                },
                status: { $in: ["Present", "Late", "Half Day"] } // Ensure these statuses are tracked
            });

            // Calculate worked days logic: weighted sum
            attendanceCount = attendanceDocs.reduce((acc, doc) => {
                if (doc.status === "Half Day") return acc + 0.5;
                return acc + 1;
            }, 0);

            // Dynamic Sunday Calculation
            sundaysCount = 0;
            const daysInMonth = new Date(year, month, 0).getDate();
            const joiningDate = employee.dateOfJoining ? new Date(employee.dateOfJoining) : null;

            for (let d = 1; d <= daysInMonth; d++) {
                const current = new Date(year, month - 1, d);
                if (current.getDay() === 0) { // 0 is Sunday
                    // Only count if employee had joined by this Sunday
                    if (!joiningDate || current >= joiningDate) {
                        sundaysCount++;
                    }
                }
            }
        }

        res.status(200).json({ ...employee, attendanceCount, sundaysCount });

    } catch (error) {
        console.error("Payroll Detail Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
