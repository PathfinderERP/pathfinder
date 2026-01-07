import User from "../../models/User.js";
import PartTimeTeacher from "../../models/Finance/PartTimeTeacher.js";

// @desc    Get all part-time teachers (from User) and their finance details
// @route   GET /api/finance/part-time-teachers
// @access  Private
export const getPartTimeTeachers = async (req, res) => {
    try {
        const {
            search, page = 1, limit = 10,
            subjects, boards, departments, feeTypes, minRate, maxRate
        } = req.query;

        // 1. Build Query for Users (Teachers)
        let userQuery = {
            role: "teacher",
            teacherType: { $regex: /Part Time/i }
        };

        if (search) {
            userQuery.$and = [
                {
                    $or: [
                        { name: { $regex: search, $options: "i" } },
                        { email: { $regex: search, $options: "i" } },
                        { mobNum: { $regex: search, $options: "i" } },
                        { subject: { $regex: search, $options: "i" } }
                    ]
                }
            ];
        }

        // Handle User-level filters (Multi-select)
        if (subjects) {
            userQuery.subject = { $in: subjects.split(",").map(s => new RegExp(s, "i")) };
        }
        if (boards) {
            userQuery.boardType = { $in: boards.split(",").map(b => new RegExp(b, "i")) };
        }
        if (departments) {
            userQuery.teacherDepartment = { $in: departments.split(",").map(d => new RegExp(d, "i")) };
        }

        // 2. Build Query for Finance Records (Fee Type & Rate)
        let financeQuery = {};
        let hasFinanceFilters = false;

        if (feeTypes) {
            financeQuery.feeType = { $in: feeTypes.split(",") };
            hasFinanceFilters = true;
        }
        if (minRate || maxRate) {
            financeQuery.rate = {};
            if (minRate) financeQuery.rate.$gte = Number(minRate);
            if (maxRate) financeQuery.rate.$lte = Number(maxRate);
            hasFinanceFilters = true;
        }

        // 3. Execution Strategy
        let finalTeacherIds = null;

        // If finance filters exist, get matching teacher IDs first
        if (hasFinanceFilters) {
            const financeRecords = await PartTimeTeacher.find(financeQuery).select("teacherId").lean();
            finalTeacherIds = financeRecords.map(r => r.teacherId);

            // If no records match finance filters, return empty early
            if (finalTeacherIds.length === 0) {
                return res.status(200).json({
                    teachers: [],
                    currentPage: 1,
                    totalPages: 0,
                    totalItems: 0
                });
            }

            // Add finance match to user query
            userQuery._id = { $in: finalTeacherIds };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 4. Fetch Teachers
        const total = await User.countDocuments(userQuery);
        const teachers = await User.find(userQuery)
            .select("name email mobNum subject designation teacherDepartment boardType teacherType")
            .sort({ createdAt: -1 })
            .skip(parseInt(limit) === 0 ? 0 : skip) // Allow limit=0 for "all" (export) if needed, but strictly we use standard pagination usually.
            // For export, we might bypass this, but frontend usually requests specific page. 
            // Let's stick to standard behavior.
            .limit(parseInt(limit))
            .lean();

        // 5. Fetch Finance Details for the result set
        const resultTeacherIds = teachers.map(t => t._id);
        const financeRecords = await PartTimeTeacher.find({ teacherId: { $in: resultTeacherIds } }).lean();

        // 6. Merge Data
        const mergedTeachers = teachers.map(teacher => {
            const expenseRec = financeRecords.find(f => f.teacherId.toString() === teacher._id.toString());
            return {
                ...teacher,
                mobile: teacher.mobNum,
                department: teacher.teacherDepartment,
                feeType: expenseRec ? expenseRec.feeType : null,
                rate: expenseRec ? expenseRec.rate : null,
                financeId: expenseRec ? expenseRec._id : null
            };
        });

        res.status(200).json({
            teachers: mergedTeachers,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / (parseInt(limit) || 10)),
            totalItems: total
        });
    } catch (error) {
        console.error("Error fetching part-time teachers:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @desc    Upsert fee structure for a teacher
// @route   POST /api/finance/part-time-teachers
// @access  Private
export const upsertFeeStructure = async (req, res) => {
    try {
        const { teacherId, feeType, rate } = req.body;

        if (!teacherId || !feeType || rate === undefined) {
            return res.status(400).json({ message: "Teacher ID, Fee Type, and Rate are required." });
        }

        const financeRecord = await PartTimeTeacher.findOneAndUpdate(
            { teacherId },
            {
                teacherId,
                feeType,
                rate: Number(rate),
                updatedBy: req.user._id,
                status: "ACTIVE"
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: "Fee structure updated successfully", record: financeRecord });
    } catch (error) {
        console.error("Error updating fee structure:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
