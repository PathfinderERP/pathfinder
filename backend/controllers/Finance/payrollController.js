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

// @desc    Get Single Employee Details for Payroll (with Salary Structure)
// @route   GET /api/finance/payroll/employee/:id
// @access  Private
export const getPayrollEmployeeDetails = async (req, res) => {
    try {
        const { id } = req.params;

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
        // Currently `salaryStructure` is an array. We take the latest one (index 0 usually if sorted by date desc).
        // The Employee model logic sorts it on save, so [0] should be current.
        // Or we re-sort to be safe.

        if (employee.salaryStructure) {
            employee.salaryStructure.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
        }

        res.status(200).json(employee);

    } catch (error) {
        console.error("Payroll Detail Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
