import Allocation from "../../models/Inventory/Allocation.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import ClassSchema from "../../models/Master_data/Class.js";
import DepartmentSchema from "../../models/Master_data/Department.js";
import BoardsSchema from "../../models/Master_data/Boards.js";
import SessionSchema from "../../models/Master_data/Session.js";

// Fast Store Overview: aggregates active centres, active student counts, item allocations, master filters & global stats
export const getStoreOverview = async (req, res) => {
    try {
        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        
        let centreQuery = { status: { $ne: "deactive" } };

        // Centre access restriction for non-superAdmins
        if (!isSuperAdmin) {
            const userCentres = req.user.centres || [];
            if (userCentres.length === 0) {
                return res.status(200).json({
                    globalStats: {
                        totalActiveCentres: 0,
                        totalActiveStudents: 0,
                        totalAllottedStudents: 0,
                        totalPendingStudents: 0,
                        totalItemsDispatched: 0
                    },
                    centreWiseSummary: [],
                    masterSessions: [],
                    masterClasses: [],
                    masterDepartments: [],
                    masterBoards: []
                });
            }

            centreQuery.$or = [
                { _id: { $in: userCentres } },
                { centreName: { $in: userCentres } }
            ];
        }

        // Fetch active centres, active sessions, master classes, departments and boards in parallel
        const [centres, activeSessions, masterClasses, masterDepartments, masterBoards] = await Promise.all([
            CentreSchema.find(centreQuery)
                .select("centreName centreCode enterCode location address state status")
                .lean(),
            SessionSchema.find({ isGlobalActive: true })
                .select("sessionName _id")
                .sort({ sessionName: 1 })
                .lean(),
            ClassSchema.find({}).select("name _id").sort({ name: 1 }).lean(),
            DepartmentSchema.find({}).select("departmentName _id").sort({ departmentName: 1 }).lean(),
            BoardsSchema.find({}).select("boardCourse name _id").sort({ boardCourse: 1 }).lean()
        ]);

        if (centres.length === 0) {
            return res.status(200).json({
                globalStats: {
                    totalActiveCentres: 0,
                    totalActiveStudents: 0,
                    totalAllottedStudents: 0,
                    totalPendingStudents: 0,
                    totalItemsDispatched: 0
                },
                centreWiseSummary: [],
                masterSessions: activeSessions.map(s => s.sessionName).filter(Boolean),
                masterClasses,
                masterDepartments,
                masterBoards
            });
        }

        const allowedCentreNamesUpper = centres.map(c => (c.centreName || "").trim().toUpperCase()).filter(Boolean);

        // Aggregate active student counts & allocation status per centre directly in MongoDB
        const studentMetricsAgg = await Student.aggregate([
            {
                $match: {
                    status: { $ne: "Deactivated" }
                }
            },
            {
                $project: {
                    centre: {
                        $toUpper: {
                            $trim: {
                                input: { $ifNull: [{ $arrayElemAt: ["$studentsDetails.centre", 0] }, "UNKNOWN"] }
                            }
                        }
                    },
                    allocatedItems: { $ifNull: ["$allocatedItems", []] },
                    isAllotted: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$allocatedItems", []] } }, 0] },
                            1,
                            0
                        ]
                    },
                    totalItems: {
                        $sum: "$allocatedItems.quantity"
                    }
                }
            },
            {
                $match: {
                    centre: { $in: allowedCentreNamesUpper }
                }
            },
            {
                $group: {
                    _id: "$centre",
                    totalStudents: { $sum: 1 },
                    allottedStudents: { $sum: "$isAllotted" },
                    totalUnits: { $sum: "$totalItems" }
                }
            }
        ]);

        // Aggregate item breakdown per centre
        const itemBreakdownAgg = await Student.aggregate([
            {
                $match: {
                    status: { $ne: "Deactivated" },
                    "allocatedItems.0": { $exists: true }
                }
            },
            {
                $project: {
                    centre: {
                        $toUpper: {
                            $trim: {
                                input: { $ifNull: [{ $arrayElemAt: ["$studentsDetails.centre", 0] }, "UNKNOWN"] }
                            }
                        }
                    },
                    allocatedItems: 1
                }
            },
            {
                $match: {
                    centre: { $in: allowedCentreNamesUpper }
                }
            },
            {
                $unwind: "$allocatedItems"
            },
            {
                $group: {
                    _id: {
                        centre: "$centre",
                        itemName: "$allocatedItems.itemName"
                    },
                    totalQty: { $sum: { $ifNull: ["$allocatedItems.quantity", 1] } }
                }
            }
        ]);

        // Build lookup maps
        const metricsMap = new Map();
        studentMetricsAgg.forEach(m => {
            if (m._id) metricsMap.set(m._id, m);
        });

        const itemMap = new Map();
        itemBreakdownAgg.forEach(ib => {
            const cKey = ib._id?.centre;
            const itemName = ib._id?.itemName || "Item";
            if (!cKey) return;
            if (!itemMap.has(cKey)) itemMap.set(cKey, {});
            itemMap.get(cKey)[itemName] = ib.totalQty;
        });

        let globalActiveStudents = 0;
        let globalAllottedStudents = 0;
        let globalTotalUnits = 0;

        const centreWiseSummary = centres.map(c => {
            const cName = (c.centreName || "").trim();
            const cKey = cName.toUpperCase();
            const metrics = metricsMap.get(cKey) || { totalStudents: 0, allottedStudents: 0, totalUnits: 0 };
            const itemCounts = itemMap.get(cKey) || {};

            const activeCount = metrics.totalStudents;
            const allottedCount = metrics.allottedStudents;
            const notAllottedCount = activeCount - allottedCount;
            const totalUnits = metrics.totalUnits;

            globalActiveStudents += activeCount;
            globalAllottedStudents += allottedCount;
            globalTotalUnits += totalUnits;

            return {
                centreDoc: c,
                centreName: cName,
                centreCode: c.centreCode || c.enterCode || "N/A",
                location: c.location || c.address || c.state || "",
                activeStudentsCount: activeCount,
                allottedCount,
                notAllottedCount,
                totalUnitsAllotted: totalUnits,
                itemCounts
            };
        }).sort((a, b) => b.activeStudentsCount - a.activeStudentsCount);

        res.status(200).json({
            globalStats: {
                totalActiveCentres: centres.length,
                totalActiveStudents: globalActiveStudents,
                totalAllottedStudents: globalAllottedStudents,
                totalPendingStudents: globalActiveStudents - globalAllottedStudents,
                totalItemsDispatched: globalTotalUnits
            },
            centreWiseSummary,
            masterSessions: activeSessions.map(s => s.sessionName).filter(Boolean),
            masterClasses: masterClasses.map(c => c.name).filter(Boolean),
            masterDepartments: masterDepartments.map(d => d.departmentName).filter(Boolean),
            masterBoards: masterBoards.map(b => b.boardCourse || b.name).filter(Boolean)
        });
    } catch (error) {
        console.error("Get Store Overview Error:", error);
        res.status(500).json({ message: "Server error getting store overview", error: error.message });
    }
};

// Fast Centre Students: retrieve active students belonging to a single centre with resolved Session, Class, Dept, Board, Allotment
export const getCentreStudents = async (req, res) => {
    try {
        const { centre } = req.query;
        if (!centre) {
            return res.status(400).json({ message: "Centre name is required" });
        }

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";
        if (!isSuperAdmin) {
            const userCentres = req.user.centres || [];
            const userCentreNames = userCentres.map(c => typeof c === 'string' ? c.toLowerCase() : (c.centreName || '').toLowerCase());
            if (!userCentreNames.includes(centre.trim().toLowerCase())) {
                return res.status(403).json({ message: "You do not have access to this centre" });
            }
        }

        const regexCentre = new RegExp(`^${centre.trim()}$`, "i");

        // Fetch students and centre admissions in parallel using indexed queries
        const [students, normalAdmissions, boardAdmissions] = await Promise.all([
            Student.find({
                status: { $ne: "Deactivated" },
                "studentsDetails.centre": regexCentre
            })
            .select("_id studentsDetails allocatedItems department examSchema sessionExamCourse createdAt")
            .populate("department", "departmentName")
            .lean(),

            Admission.find({
                centre: regexCentre,
                admissionStatus: { $nin: ["INACTIVE", "CANCELLED"] }
            })
            .select("_id student admissionNumber academicSession class department board boardCourseName admissionDate createdAt")
            .populate("class", "name")
            .populate("department", "departmentName")
            .lean(),

            BoardCourseAdmission.find({
                centre: regexCentre,
                enrolledStudentsStatus: { $ne: "INACTIVE" },
                status: { $ne: "CANCELLED" }
            })
            .select("_id studentId admissionNumber academicSession lastClass department boardId boardCourseName admissionDate createdAt")
            .populate("department", "departmentName")
            .populate("boardId", "boardCourse")
            .lean()
        ]);

        if (students.length === 0) {
            return res.status(200).json([]);
        }

        // Map admissions by student ID
        const studentAdmissionsMap = new Map();

        for (const adm of normalAdmissions) {
            const sId = adm.student?.toString();
            if (!sId) continue;
            if (!studentAdmissionsMap.has(sId)) studentAdmissionsMap.set(sId, []);
            studentAdmissionsMap.get(sId).push({
                _id: adm._id,
                admissionNumber: adm.admissionNumber,
                academicSession: adm.academicSession || null,
                className: adm.class?.name || null,
                departmentName: adm.department?.departmentName || null,
                boardName: adm.board || null,
                admissionDate: adm.admissionDate || adm.createdAt
            });
        }

        for (const adm of boardAdmissions) {
            const sId = adm.studentId?.toString();
            if (!sId) continue;
            if (!studentAdmissionsMap.has(sId)) studentAdmissionsMap.set(sId, []);
            studentAdmissionsMap.get(sId).push({
                _id: adm._id,
                admissionNumber: adm.admissionNumber,
                academicSession: adm.academicSession || null,
                className: adm.lastClass || null,
                departmentName: adm.department?.departmentName || null,
                boardName: adm.boardId?.boardCourse || null,
                admissionDate: adm.admissionDate || adm.createdAt
            });
        }

        // Combine into standard student object with resolved Session, Class, Department, Board
        const result = students.map(student => {
            const sId = student._id.toString();
            const admissions = studentAdmissionsMap.get(sId) || [];
            
            let latestAdmission = admissions[0] || null;
            if (admissions.length > 1) {
                latestAdmission = admissions.reduce((latest, curr) => 
                    new Date(curr.admissionDate) > new Date(latest.admissionDate) ? curr : latest
                , admissions[0]);
            }

            const studentDetail = student.studentsDetails?.[0] || {};
            
            // Resolve Session
            const resolvedSession = latestAdmission?.academicSession || student.sessionExamCourse?.[0]?.session || "N/A";

            // Resolve Class
            const resolvedClass = latestAdmission?.className || student.examSchema?.[0]?.class || studentDetail.class || "N/A";
            
            // Resolve Department
            const resolvedDepartment = latestAdmission?.departmentName || student.department?.departmentName || "N/A";
            
            // Resolve Board
            const resolvedBoard = studentDetail.board || latestAdmission?.boardName || "N/A";

            return {
                student: {
                    _id: student._id,
                    studentsDetails: student.studentsDetails,
                    allocatedItems: student.allocatedItems || []
                },
                admissions,
                latestAdmission,
                resolvedSession,
                resolvedClass,
                resolvedDepartment,
                resolvedBoard,
                centre: centre.trim()
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Get Centre Students Error:", error);
        res.status(500).json({ message: "Server error getting centre students", error: error.message });
    }
};

// Create new allocation for single student
export const createAllocation = async (req, res) => {
    try {
        const { studentId, admissionId, items } = req.body;

        if (!studentId || !items || items.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let finalAdmissionId = admissionId;
        if (!finalAdmissionId) {
            const adm = await Admission.findOne({ student: studentId }).sort({ createdAt: -1 }).select('_id');
            finalAdmissionId = adm ? adm._id : null;
        }

        const allocation = await Allocation.create({
            student: studentId,
            admission: finalAdmissionId,
            items: items.map(item => ({
                itemName: item.itemName,
                quantity: Number(item.quantity) || 1,
                status: 'Allocated'
            })),
            allocatedBy: req.user._id
        });

        // Also update student schema with allocated items
        await Student.findByIdAndUpdate(studentId, {
            $push: {
                allocatedItems: {
                    $each: items.map(item => ({
                        itemName: item.itemName,
                        quantity: Number(item.quantity) || 1,
                        allocatedBy: req.user._id,
                        allocationDate: new Date()
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
        const { students, items, centreName, scope } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "No items selected for allocation" });
        }

        const itemsToPush = items.map(item => ({
            itemName: item.itemName,
            quantity: Number(item.quantity) || 1,
            allocatedBy: req.user._id,
            allocationDate: new Date()
        }));

        let studentIdsToUpdate = [];
        let validAllocations = [];

        // Direct centre-wide bulk allotment
        if (centreName && scope) {
            const regexCentre = new RegExp(`^${centreName.trim()}$`, "i");
            const studentMatch = {
                status: { $ne: "Deactivated" },
                "studentsDetails.centre": regexCentre
            };

            if (scope === 'centre_not_allotted') {
                studentMatch["allocatedItems.0"] = { $exists: false };
            }

            const matchedStudents = await Student.find(studentMatch).select("_id").lean();
            studentIdsToUpdate = matchedStudents.map(s => s._id);

            for (const sId of studentIdsToUpdate) {
                validAllocations.push({
                    student: sId,
                    admission: null,
                    items: items.map(item => ({
                        itemName: item.itemName,
                        quantity: Number(item.quantity) || 1,
                        status: 'Allocated'
                    })),
                    allocatedBy: req.user._id,
                    allocationDate: new Date()
                });
            }
        } else if (students && Array.isArray(students) && students.length > 0) {
            for (const s of students) {
                const studentId = typeof s === 'object' ? s.studentId : s;
                let admissionId = typeof s === 'object' ? s.admissionId : null;

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
        }

        if (studentIdsToUpdate.length === 0) {
            return res.status(400).json({ message: "No eligible active students found to allocate" });
        }

        // Insert Allocations in bulk
        if (validAllocations.length > 0) {
            await Allocation.insertMany(validAllocations);
        }

        // Push allocated items to all target students
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
            allocationsCount: validAllocations.length
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
        
        if (req.user.role !== 'superAdmin') {
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
