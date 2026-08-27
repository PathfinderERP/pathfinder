import Allocation from "../../models/Inventory/Allocation.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";

// Create new allocation
export const createAllocation = async (req, res) => {
    try {
        const { studentId, admissionId, items } = req.body;

        if (!studentId || !admissionId || !items || items.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const allocation = await Allocation.create({
            student: studentId,
            admission: admissionId,
            items,
            allocatedBy: req.user._id
        });

        // Also update student schema with allocated items
        await Student.findByIdAndUpdate(studentId, {
            $push: {
                allocatedItems: {
                    $each: items.map(item => ({
                        itemName: item.itemName,
                        quantity: item.quantity || 1,
                        allocatedBy: req.user._id
                    }))
                }
            }
        });

        res.status(201).json({
            message: "Items allocated successfully",
            allocation
        });
    } catch (error) {
        console.error("Create Allocation Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Create bulk allocations for multiple students (centre-level or multi-select)
export const createBulkAllocation = async (req, res) => {
    try {
        const { students, items } = req.body;
        // students: Array of { studentId, admissionId } or string ids
        // items: Array of { itemName, quantity }

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: "No students provided for allocation" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "No items selected for allocation" });
        }

        const validAllocations = [];
        const studentIdsToUpdate = [];

        const itemsToPush = items.map(item => ({
            itemName: item.itemName,
            quantity: Number(item.quantity) || 1,
            allocatedBy: req.user._id,
            allocationDate: new Date()
        }));

        for (const s of students) {
            const studentId = typeof s === 'object' ? s.studentId : s;
            let admissionId = typeof s === 'object' ? s.admissionId : null;

            if (!admissionId) {
                const adm = await Admission.findOne({ student: studentId }).sort({ createdAt: -1 }).select('_id');
                admissionId = adm ? adm._id : null;
            }

            if (studentId) {
                studentIdsToUpdate.push(studentId);
                validAllocations.push({
                    student: studentId,
                    admission: admissionId,
                    items: items.map(item => ({
                        itemName: item.itemName,
                        quantity: Number(item.quantity) || 1,
                        status: 'Allocated'
                    })),
                    allocatedBy: req.user._id,
                    allocationDate: new Date()
                });
            }
        }

        if (validAllocations.length === 0) {
            return res.status(400).json({ message: "No valid students found to allocate" });
        }

        const createdAllocations = await Allocation.insertMany(validAllocations);

        await Student.updateMany(
            { _id: { $in: studentIdsToUpdate } },
            {
                $push: {
                    allocatedItems: {
                        $each: itemsToPush
                    }
                }
            }
        );

        res.status(201).json({
            message: `Successfully allocated items to ${studentIdsToUpdate.length} students`,
            count: studentIdsToUpdate.length,
            allocationsCount: createdAllocations.length
        });
    } catch (error) {
        console.error("Bulk Allocation Error:", error);
        res.status(500).json({ message: "Server error during bulk allocation", error: error.message });
    }
};

// Get allocations for a student
export const getStudentAllocations = async (req, res) => {
    try {
        const { studentId } = req.params;
        const allocations = await Allocation.find({ student: studentId })
            .populate('allocatedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(allocations);
    } catch (error) {
        console.error("Get Allocations Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all allocations (with filters)
export const getAllAllocations = async (req, res) => {
    try {
        const query = {};
        
        // Data isolation based on centre (optional, matching Admissions logic)
        if (req.user.role !== 'superAdmin') {
            // Find admissions in allowed centres first
            const allowedCentres = req.user.centres || [];
            if (allowedCentres.length > 0) {
                const admissions = await Admission.find({ centre: { $in: allowedCentres } }).select('_id');
                query.admission = { $in: admissions.map(a => a._id) };
            }
        }

        const allocations = await Allocation.find(query)
            .populate({
                path: 'student',
                select: 'studentsDetails'
            })
            .populate('allocatedBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(allocations);
    } catch (error) {
        console.error("Get All Allocations Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
