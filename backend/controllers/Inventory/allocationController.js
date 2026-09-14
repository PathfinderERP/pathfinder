import Allocation from "../../models/Inventory/Allocation.js";
import Payment from "../../models/Payment/Payment.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import ClassSchema from "../../models/Master_data/Class.js";
import DepartmentSchema from "../../models/Master_data/Department.js";
import BoardsSchema from "../../models/Master_data/Boards.js";
import SessionSchema from "../../models/Master_data/Session.js";
import ExamTagSchema from "../../models/Master_data/ExamTag.js";
import InventoryMaster from "../../models/Master_data/Inventory.js";
import { generateBillId } from "../../utils/billIdGenerator.js";

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
                    masterBoards: [],
                    masterExamTags: [],
                    masterInventoryItems: []
                });
            }

            centreQuery.centreName = { $in: userCentres };
        }

        // Fetch Master Reference Filters and Active Centres in parallel
        const [
            centres,
            activeSessions,
            masterClasses,
            masterDepartments,
            masterBoards,
            masterExamTags,
            masterInventoryItems
        ] = await Promise.all([
            CentreSchema.find(centreQuery)
                .select("centreName centreCode enterCode location address state status")
                .lean(),
            SessionSchema.find({ isGlobalActive: true })
                .select("sessionName _id")
                .sort({ sessionName: 1 })
                .lean(),
            ClassSchema.find({}).select("name _id").sort({ name: 1 }).lean(),
            DepartmentSchema.find({}).select("departmentName _id").sort({ departmentName: 1 }).lean(),
            BoardsSchema.find({}).select("boardCourse name _id").sort({ boardCourse: 1 }).lean(),
            ExamTagSchema.find({}).select("name _id").sort({ name: 1 }).lean(),
            InventoryMaster.find({ status: { $ne: "Deactive" } }).sort({ name: 1 }).lean()
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
                masterBoards,
                masterExamTags: masterExamTags.map(t => t.name).filter(Boolean),
                masterInventoryItems: masterInventoryItems || []
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
            masterBoards: masterBoards.map(b => b.boardCourse || b.name).filter(Boolean),
            masterExamTags: masterExamTags.map(t => t.name).filter(Boolean),
            masterInventoryItems: masterInventoryItems || []
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
            .select("_id student admissionNumber academicSession class department board boardCourseName examTag admissionDate createdAt")
            .populate("class", "name")
            .populate("department", "departmentName")
            .populate("examTag", "name")
            .lean(),

            BoardCourseAdmission.find({
                centre: regexCentre,
                enrolledStudentsStatus: { $ne: "INACTIVE" },
                status: { $ne: "CANCELLED" }
            })
            .select("_id studentId admissionNumber academicSession lastClass department boardId boardCourseName examTag admissionDate createdAt")
            .populate("department", "departmentName")
            .populate("boardId", "boardCourse")
            .populate("examTag", "name")
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
                examTagName: adm.examTag?.name || null,
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
                examTagName: adm.examTag?.name || null,
                admissionDate: adm.admissionDate || adm.createdAt
            });
        }

        // Combine into standard student object with resolved Session, Class, Department, Board, ExamTag
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

            // Resolve Exam Tag
            const resolvedExamTag = latestAdmission?.examTagName || student.sessionExamCourse?.[0]?.examTag || "N/A";

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
                resolvedExamTag,
                centre: centre.trim()
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Get Centre Students Error:", error);
        res.status(500).json({ message: "Server error getting centre students", error: error.message });
    }
};

// Helper to resolve student's actual Department, Exam Tag, Class, Session, Board & Admission Number
export const resolveStudentAcademicDetails = async (studentId, admissionId = null, clientDetails = {}) => {
    let resolvedDepartment = (clientDetails.department || clientDetails.resolvedDepartment) && !/inventory/i.test(clientDetails.department || clientDetails.resolvedDepartment) && (clientDetails.department || clientDetails.resolvedDepartment) !== "N/A" ? (clientDetails.department || clientDetails.resolvedDepartment) : null;
    let resolvedExamTag = (clientDetails.examTag || clientDetails.resolvedExamTag) && !/inventory/i.test(clientDetails.examTag || clientDetails.resolvedExamTag) && (clientDetails.examTag || clientDetails.resolvedExamTag) !== "N/A" ? (clientDetails.examTag || clientDetails.resolvedExamTag) : null;
    let resolvedClass = (clientDetails.class || clientDetails.resolvedClass) && (clientDetails.class || clientDetails.resolvedClass) !== "N/A" ? (clientDetails.class || clientDetails.resolvedClass) : null;
    let resolvedSession = (clientDetails.session || clientDetails.resolvedSession) && (clientDetails.session || clientDetails.resolvedSession) !== "N/A" ? (clientDetails.session || clientDetails.resolvedSession) : null;
    let resolvedBoard = (clientDetails.board || clientDetails.resolvedBoard) && (clientDetails.board || clientDetails.resolvedBoard) !== "N/A" ? (clientDetails.board || clientDetails.resolvedBoard) : null;
    let admissionNumber = (clientDetails.admissionNumber || clientDetails.admissionNo) && clientDetails.admissionNumber !== "N/A" ? (clientDetails.admissionNumber || clientDetails.admissionNo) : null;
    let finalAdmissionId = admissionId || null;

    // Fetch Student document
    let studentDoc = null;
    if (studentId) {
        studentDoc = await Student.findById(studentId)
            .populate('department', 'departmentName')
            .populate({
                path: 'course',
                select: 'courseName department examTag class courseSession',
                populate: [
                    { path: 'department', select: 'departmentName' },
                    { path: 'examTag', select: 'name' },
                    { path: 'class', select: 'name' }
                ]
            })
            .lean();

        // If studentId wasn't found directly, check if it is an admission ID
        if (!studentDoc) {
            const admCheck = await Admission.findById(studentId).populate('student').lean();
            if (admCheck?.student) {
                finalAdmissionId = admCheck._id;
                studentDoc = admCheck.student;
            } else {
                const badmCheck = await BoardCourseAdmission.findById(studentId).populate('studentId').lean();
                if (badmCheck?.studentId) {
                    finalAdmissionId = badmCheck._id;
                    studentDoc = badmCheck.studentId;
                }
            }
        }
    }

    const studentInfo = studentDoc?.studentsDetails?.[0] || {};

    // Fetch Admission or BoardCourseAdmission
    let admissionDoc = null;
    if (finalAdmissionId) {
        admissionDoc = await Admission.findById(finalAdmissionId)
            .populate({
                path: 'course',
                select: 'courseName department examTag class courseSession',
                populate: [
                    { path: 'department', select: 'departmentName' },
                    { path: 'examTag', select: 'name' },
                    { path: 'class', select: 'name' }
                ]
            })
            .populate('department', 'departmentName')
            .populate('examTag', 'name')
            .populate('class', 'name')
            .populate('board', 'boardCourse name')
            .lean();
        
        if (!admissionDoc) {
            admissionDoc = await BoardCourseAdmission.findById(finalAdmissionId)
                .populate('department', 'departmentName')
                .populate('examTag', 'name')
                .populate('boardId', 'boardCourse name')
                .lean();
        }
    }

    if (!admissionDoc && studentDoc?._id) {
        admissionDoc = await Admission.findOne({ student: studentDoc._id })
            .sort({ createdAt: -1 })
            .populate({
                path: 'course',
                select: 'courseName department examTag class courseSession',
                populate: [
                    { path: 'department', select: 'departmentName' },
                    { path: 'examTag', select: 'name' },
                    { path: 'class', select: 'name' }
                ]
            })
            .populate('department', 'departmentName')
            .populate('examTag', 'name')
            .populate('class', 'name')
            .populate('board', 'boardCourse name')
            .lean();
    }

    if (!admissionDoc && studentDoc?._id) {
        admissionDoc = await BoardCourseAdmission.findOne({ studentId: studentDoc._id })
            .sort({ createdAt: -1 })
            .populate('department', 'departmentName')
            .populate('examTag', 'name')
            .populate('boardId', 'boardCourse name')
            .lean();
    }

    if (admissionDoc?._id) {
        finalAdmissionId = admissionDoc._id;
    }

    // Resolve Session
    if (!resolvedSession || resolvedSession === "N/A") {
        resolvedSession = admissionDoc?.academicSession || 
                          admissionDoc?.course?.courseSession ||
                          studentDoc?.course?.courseSession ||
                          studentDoc?.sessionExamCourse?.[0]?.session || 
                          studentInfo.session || 
                          "N/A";
    }

    // Resolve Class
    if (!resolvedClass || resolvedClass === "N/A") {
        resolvedClass = admissionDoc?.class?.name || 
                        admissionDoc?.class?.className ||
                        admissionDoc?.lastClass || 
                        admissionDoc?.course?.class?.name ||
                        studentDoc?.course?.class?.name ||
                        studentDoc?.examSchema?.[0]?.class || 
                        studentInfo.class || 
                        "N/A";
    }

    // Resolve Department (Ensure it never displays 'STORE / INVENTORY')
    if (!resolvedDepartment || resolvedDepartment === "N/A" || /inventory/i.test(resolvedDepartment)) {
        resolvedDepartment = admissionDoc?.department?.departmentName || 
                             admissionDoc?.department?.name ||
                             admissionDoc?.course?.department?.departmentName ||
                             studentDoc?.department?.departmentName || 
                             studentDoc?.department?.name ||
                             studentDoc?.course?.department?.departmentName ||
                             "N/A";
    }

    // Resolve Exam Tag (Ensure it never displays 'INVENTORY')
    if (!resolvedExamTag || resolvedExamTag === "N/A" || /inventory/i.test(resolvedExamTag)) {
        resolvedExamTag = admissionDoc?.examTag?.name || 
                          admissionDoc?.course?.examTag?.name ||
                          studentDoc?.course?.examTag?.name ||
                          studentDoc?.sessionExamCourse?.[0]?.examTag || 
                          "N/A";
    }

    // Resolve Board
    if (!resolvedBoard || resolvedBoard === "N/A") {
        resolvedBoard = admissionDoc?.board?.boardCourse || 
                        admissionDoc?.board?.name || 
                        admissionDoc?.boardId?.boardCourse || 
                        admissionDoc?.boardId?.name || 
                        studentInfo.board || 
                        "N/A";
    }

    // Resolve Admission Number
    if (!admissionNumber || admissionNumber === "N/A") {
        admissionNumber = admissionDoc?.admissionNumber || 
                          studentInfo.formNo || 
                          studentInfo.rollNo || 
                          studentDoc?.uid ||
                          "N/A";
    }

    return {
        studentDoc,
        studentInfo,
        admissionDoc,
        finalAdmissionId,
        resolvedSession,
        resolvedClass,
        resolvedDepartment,
        resolvedBoard,
        resolvedExamTag,
        admissionNumber
    };
};

// Create new allocation for single student
export const createAllocation = async (req, res) => {
    try {
        const { 
            studentId, 
            admissionId, 
            items, 
            centreName,
            paymentMethod = 'CASH',
            receivedDate = new Date(),
            transactionId = '',
            accountHolderName = '',
            remarks = '',
            discount = 0,
            waiver = 0,
            studentDetails = {}
        } = req.body;

        if (!studentId || !items || items.length === 0) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const profile = await resolveStudentAcademicDetails(studentId, admissionId, studentDetails);
        const targetCentreName = centreName || profile.studentInfo?.centre || 'MAIN';
        const finalAdmissionId = profile.finalAdmissionId;

        const hasPaidItems = items.some(i => i.itemType === 'Paid' || Number(i.price) > 0);
        let billNumber = null;
        let targetCentreCode = null;

        const centreDoc = await CentreSchema.findOne({
            $or: [
                { centreName: new RegExp(`^${targetCentreName.trim()}$`, 'i') },
                { centreCode: new RegExp(`^${targetCentreName.trim()}$`, 'i') },
                { enterCode: new RegExp(`^${targetCentreName.trim()}$`, 'i') }
            ]
        }).select('centreCode enterCode centreName address phoneNumber enterGstNo enterCorporateOfficeAddress enterCorporateOfficePhoneNumber').lean();

        // Standard Pathfinder branch code is enterCode (e.g. BAR, BL, DUR, HZ), NOT numeric centreCode!
        targetCentreCode = (centreDoc?.enterCode || centreDoc?.centreCode || targetCentreName.slice(0, 3)).trim().toUpperCase();

        const grossAmount = items.reduce((acc, curr) => {
            const isPaid = curr.itemType === 'Paid' || Number(curr.price) > 0;
            const price = Number(curr.price) || 0;
            const qty = Number(curr.quantity) || 1;
            return acc + (isPaid ? price * qty : 0);
        }, 0);

        const grossAmountNum = parseFloat(grossAmount.toFixed(2));
        const inputDiscount = discount !== undefined && discount !== null && discount !== '' 
            ? Number(discount) 
            : (waiver !== undefined && waiver !== null && waiver !== '' ? Number(waiver) : 0);
        const discountNum = Math.max(0, Math.min(grossAmountNum, parseFloat((Number(inputDiscount) || 0).toFixed(2))));
        const totalAmountNum = parseFloat(Math.max(0, grossAmountNum - discountNum).toFixed(2));
        const paymentDate = receivedDate ? new Date(receivedDate) : new Date();

        let paymentRecord = null;
        let billData = null;

        if (hasPaidItems && grossAmountNum > 0) {
            billNumber = await generateBillId(targetCentreCode, paymentDate);

            // Calculate GST breakdown (18% inclusive) on net payable amount
            // baseAmount = total / 1.18, without-GST amount saved in courseFee
            const baseAmount = totalAmountNum > 0 ? parseFloat((totalAmountNum / 1.18).toFixed(2)) : 0;
            const gstPool = totalAmountNum > 0 ? parseFloat((totalAmountNum - baseAmount).toFixed(2)) : 0;
            const cgst = parseFloat((gstPool / 2).toFixed(2));
            const sgst = parseFloat((gstPool - cgst).toFixed(2));

            paymentRecord = new Payment({
                admission: finalAdmissionId || studentId,
                installmentNumber: 0,
                amount: totalAmountNum,
                paidAmount: totalAmountNum,
                dueDate: paymentDate,
                paidDate: paymentDate,
                receivedDate: paymentDate,
                status: 'PAID',
                paymentMethod: paymentMethod || 'CASH',
                transactionId: transactionId || '',
                accountHolderName: accountHolderName || '',
                remarks: remarks || (discountNum > 0 
                    ? `Inventory Store Allotment - Gross: Rs. ${grossAmountNum} | Discount: Rs. ${discountNum} | Net: Rs. ${totalAmountNum}` 
                    : `Inventory Store Allotment - ${profile.studentInfo?.studentName || ''}`),
                recordedBy: req.user?.id || req.user?._id,
                cgst,
                sgst,
                courseFee: baseAmount, // Without-GST taxable amount for Daily Collection & Transaction Report
                totalAmount: totalAmountNum,
                billId: billNumber,
                centre: centreDoc?.centreName || targetCentreName,
                boardCourseName: items.map(i => `${i.itemName} (x${i.quantity || 1})`).join(', ')
            });

            await paymentRecord.save();

            billData = {
                billId: billNumber,
                billDate: paymentDate,
                centre: {
                    name: centreDoc?.centreName || targetCentreName,
                    address: centreDoc?.address || 'N/A',
                    phoneNumber: centreDoc?.phoneNumber || 'N/A',
                    gstNumber: centreDoc?.enterGstNo || 'N/A',
                    corporateAddress: centreDoc?.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                    corporatePhone: centreDoc?.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
                },
                student: {
                    id: studentId,
                    name: profile.studentInfo?.studentName || 'N/A',
                    admissionNumber: profile.admissionNumber,
                    phoneNumber: profile.studentInfo?.mobileNum || profile.studentInfo?.whatsappNumber || 'N/A',
                    email: profile.studentInfo?.studentEmail || 'N/A'
                },
                course: {
                    name: items.map(i => `${i.itemName} (x${i.quantity || 1})`).join(', '),
                    department: profile.resolvedDepartment,
                    examTag: profile.resolvedExamTag,
                    class: profile.resolvedClass,
                    session: profile.resolvedSession
                },
                payment: {
                    installmentNumber: 0,
                    paymentMethod: paymentMethod || 'CASH',
                    transactionId: transactionId || '',
                    accountHolderName: accountHolderName || '',
                    paidDate: paymentDate,
                    receivedDate: paymentDate,
                    status: 'PAID',
                    remarks: remarks || `Inventory Store Allotment - Total: Rs. ${totalAmountNum}`
                },
                amounts: {
                    grossFee: grossAmountNum,
                    waiver: discountNum,
                    courseFee: baseAmount,
                    cgst,
                    sgst,
                    totalAmount: totalAmountNum
                },
                items: items
            };
        }

        const mappedItems = items.map(item => ({
            itemName: item.itemName,
            quantity: Number(item.quantity) || 1,
            itemType: (item.itemType === 'Paid' || Number(item.price) > 0) ? 'Paid' : 'Free',
            price: Number(item.price) || 0,
            status: 'Allocated'
        }));

        const allocation = await Allocation.create({
            student: studentId,
            admission: finalAdmissionId || null,
            centre: targetCentreName,
            centreCode: targetCentreCode,
            billNumber,
            hasPaidItems,
            grossAmount: grossAmountNum,
            discount: discountNum,
            totalAmount: totalAmountNum,
            payment: paymentRecord ? paymentRecord._id : null,
            paymentMethod: hasPaidItems ? (paymentMethod || 'CASH') : null,
            session: profile.resolvedSession,
            className: profile.resolvedClass,
            departmentName: profile.resolvedDepartment,
            examTagName: profile.resolvedExamTag,
            boardName: profile.resolvedBoard,
            items: mappedItems,
            allocatedBy: req.user._id,
            allocationDate: paymentDate
        });

        // Update student schema with allocated items
        await Student.findByIdAndUpdate(studentId, {
            $push: {
                allocatedItems: {
                    $each: items.map(item => ({
                        itemName: item.itemName,
                        quantity: Number(item.quantity) || 1,
                        itemType: (item.itemType === 'Paid' || Number(item.price) > 0) ? 'Paid' : 'Free',
                        price: Number(item.price) || 0,
                        billNumber,
                        allocatedBy: req.user._id,
                        allocationDate: paymentDate
                    }))
                }
            }
        });

        res.status(201).json({
            message: "Items allocated successfully",
            allocation,
            billNumber,
            hasPaidItems,
            billData
        });
    } catch (error) {
        console.error("Create Allocation Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Create bulk allocations for multiple students (multi-select)
export const createBulkAllocation = async (req, res) => {
    try {
        const { 
            students, 
            items, 
            centreName,
            paymentMethod = 'CASH',
            receivedDate = new Date(),
            transactionId = '',
            accountHolderName = '',
            remarks = '',
            discount = 0,
            waiver = 0
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "No items selected for allocation" });
        }

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: "No students selected for allocation" });
        }

        const hasPaidItems = items.some(i => i.itemType === 'Paid' || Number(i.price) > 0);
        const perStudentGross = items.reduce((acc, curr) => {
            const isPaid = curr.itemType === 'Paid' || Number(curr.price) > 0;
            const price = Number(curr.price) || 0;
            const qty = Number(curr.quantity) || 1;
            return acc + (isPaid ? price * qty : 0);
        }, 0);
        const perStudentGrossNum = parseFloat(perStudentGross.toFixed(2));
        const paymentDate = receivedDate ? new Date(receivedDate) : new Date();

        const inputDiscount = discount !== undefined && discount !== null && discount !== '' 
            ? Number(discount) 
            : (waiver !== undefined && waiver !== null && waiver !== '' ? Number(waiver) : 0);
        const totalDiscountNum = Math.max(0, Number(inputDiscount) || 0);
        const perStudentDiscount = students.length > 0 ? parseFloat((totalDiscountNum / students.length).toFixed(2)) : 0;

        let defaultCentreCode = null;
        let defaultCentreDoc = null;
        if (centreName) {
            defaultCentreDoc = await CentreSchema.findOne({
                $or: [
                    { centreName: new RegExp(`^${centreName.trim()}$`, 'i') },
                    { centreCode: new RegExp(`^${centreName.trim()}$`, 'i') },
                    { enterCode: new RegExp(`^${centreName.trim()}$`, 'i') }
                ]
            }).select('centreCode enterCode centreName address phoneNumber enterGstNo enterCorporateOfficeAddress enterCorporateOfficePhoneNumber').lean();
            defaultCentreCode = (defaultCentreDoc?.enterCode || defaultCentreDoc?.centreCode || centreName.slice(0, 3)).trim().toUpperCase();
        }

        const studentIds = students.map(s => typeof s === 'object' ? s.studentId : s).filter(Boolean);
        const studentDocs = await Student.find({ _id: { $in: studentIds } }).select('_id studentsDetails').lean();
        const studentMap = new Map();
        studentDocs.forEach(sd => {
            studentMap.set(sd._id.toString(), sd);
        });

        const centreCodeCache = new Map();
        if (defaultCentreCode && centreName) {
            centreCodeCache.set(centreName.trim().toUpperCase(), { code: defaultCentreCode, doc: defaultCentreDoc });
        }

        const studentIdsToUpdate = [];
        const validAllocations = [];
        const studentPushes = [];
        const generatedBillNumbers = [];

        for (const s of students) {
            const studentId = typeof s === 'object' ? s.studentId : s;
            const admissionId = typeof s === 'object' ? s.admissionId : null;
            if (!studentId) continue;

            const profile = await resolveStudentAcademicDetails(studentId, admissionId, typeof s === 'object' ? s : {});
            const studentDoc = profile.studentDoc || studentMap.get(studentId.toString());
            const stCentre = profile.studentInfo?.centre || studentDoc?.studentsDetails?.[0]?.centre || centreName || 'MAIN';
            const cKey = stCentre.trim().toUpperCase();

            let cInfo = centreCodeCache.get(cKey);
            if (!cInfo) {
                const cDoc = await CentreSchema.findOne({
                    $or: [
                        { centreName: new RegExp(`^${stCentre.trim()}$`, 'i') },
                        { centreCode: new RegExp(`^${stCentre.trim()}$`, 'i') },
                        { enterCode: new RegExp(`^${stCentre.trim()}$`, 'i') }
                    ]
                }).select('centreCode enterCode centreName address phoneNumber enterGstNo enterCorporateOfficeAddress enterCorporateOfficePhoneNumber').lean();
                const code = (cDoc?.enterCode || cDoc?.centreCode || stCentre.slice(0, 3)).trim().toUpperCase();
                cInfo = { code, doc: cDoc };
                centreCodeCache.set(cKey, cInfo);
            }

            const cCode = cInfo.code;
            let billNumber = null;
            let paymentRecord = null;

            const studentGrossNum = perStudentGrossNum;
            const studentDiscountNum = Math.min(studentGrossNum, perStudentDiscount);
            const studentNetNum = Math.max(0, parseFloat((studentGrossNum - studentDiscountNum).toFixed(2)));

            const baseAmount = studentNetNum > 0 ? parseFloat((studentNetNum / 1.18).toFixed(2)) : 0;
            const gstPool = studentNetNum > 0 ? parseFloat((studentNetNum - baseAmount).toFixed(2)) : 0;
            const cgst = parseFloat((gstPool / 2).toFixed(2));
            const sgst = parseFloat((gstPool - cgst).toFixed(2));

            if (hasPaidItems && studentGrossNum > 0) {
                billNumber = await generateBillId(cCode, paymentDate);
                generatedBillNumbers.push(billNumber);

                paymentRecord = new Payment({
                    admission: profile.finalAdmissionId || studentId,
                    installmentNumber: 0,
                    amount: studentNetNum,
                    paidAmount: studentNetNum,
                    dueDate: paymentDate,
                    paidDate: paymentDate,
                    receivedDate: paymentDate,
                    status: 'PAID',
                    paymentMethod: paymentMethod || 'CASH',
                    transactionId: transactionId || '',
                    accountHolderName: accountHolderName || '',
                    remarks: remarks || (studentDiscountNum > 0 
                        ? `Bulk Inventory Allotment - Gross: Rs. ${studentGrossNum} | Discount: Rs. ${studentDiscountNum} | Net: Rs. ${studentNetNum}` 
                        : `Bulk Inventory Allotment - ${profile.studentInfo?.studentName || ''}`),
                    recordedBy: req.user?.id || req.user?._id,
                    cgst,
                    sgst,
                    courseFee: baseAmount, // Without-GST for Daily Collection & Transaction Report
                    totalAmount: studentNetNum,
                    billId: billNumber,
                    centre: cInfo.doc?.centreName || stCentre,
                    boardCourseName: items.map(i => `${i.itemName} (x${i.quantity || 1})`).join(', ')
                });

                await paymentRecord.save();
            }

            const mappedItems = items.map(item => ({
                itemName: item.itemName,
                quantity: Number(item.quantity) || 1,
                itemType: (item.itemType === 'Paid' || Number(item.price) > 0) ? 'Paid' : 'Free',
                price: Number(item.price) || 0,
                status: 'Allocated'
            }));

            validAllocations.push({
                student: studentId,
                admission: profile.finalAdmissionId || null,
                centre: stCentre,
                centreCode: cCode,
                billNumber,
                hasPaidItems,
                grossAmount: studentGrossNum,
                discount: studentDiscountNum,
                totalAmount: studentNetNum,
                payment: paymentRecord ? paymentRecord._id : null,
                paymentMethod: hasPaidItems ? (paymentMethod || 'CASH') : null,
                session: profile.resolvedSession,
                className: profile.resolvedClass,
                departmentName: profile.resolvedDepartment,
                examTagName: profile.resolvedExamTag,
                boardName: profile.resolvedBoard,
                items: mappedItems,
                allocatedBy: req.user._id,
                allocationDate: paymentDate
            });

            studentIdsToUpdate.push(studentId);

            studentPushes.push(
                Student.findByIdAndUpdate(studentId, {
                    $push: {
                        allocatedItems: {
                            $each: items.map(item => ({
                                itemName: item.itemName,
                                quantity: Number(item.quantity) || 1,
                                itemType: (item.itemType === 'Paid' || Number(item.price) > 0) ? 'Paid' : 'Free',
                                price: Number(item.price) || 0,
                                billNumber,
                                allocatedBy: req.user._id,
                                allocationDate: paymentDate
                            }))
                        }
                    }
                })
            );
        }

        if (studentIdsToUpdate.length === 0) {
            return res.status(400).json({ message: "No eligible active students found to allocate" });
        }

        // Insert Allocations in bulk
        if (validAllocations.length > 0) {
            await Allocation.insertMany(validAllocations);
        }

        // Run student updates in parallel
        await Promise.all(studentPushes);

        res.status(201).json({
            message: `Successfully allocated items to ${studentIdsToUpdate.length} students`,
            count: studentIdsToUpdate.length,
            allocationsCount: validAllocations.length,
            hasPaidItems,
            billNumbers: generatedBillNumbers
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

// Get Bill Details formatted specifically for BillGenerator PDF receipt
export const getBillDetailsByBillId = async (req, res) => {
    try {
        const billId = req.params.billId || req.query.billId;
        if (!billId) {
            return res.status(400).json({ message: "Bill ID is required" });
        }

        // Find allocation by billNumber
        const allocation = await Allocation.findOne({ billNumber: billId })
            .populate('student')
            .populate('admission')
            .populate('payment')
            .lean();

        // Find payment record
        let payment = allocation?.payment || await Payment.findOne({ billId }).lean();

        if (!payment && !allocation) {
            return res.status(404).json({ message: "Bill not found" });
        }

        const targetCentreName = allocation?.centre || payment?.centre || 'MAIN';
        const centreDoc = await CentreSchema.findOne({
            $or: [
                { centreName: new RegExp(`^${targetCentreName.trim()}$`, 'i') },
                { centreCode: new RegExp(`^${targetCentreName.trim()}$`, 'i') },
                { enterCode: new RegExp(`^${targetCentreName.trim()}$`, 'i') }
            ]
        }).select('centreCode enterCode centreName address phoneNumber enterGstNo enterCorporateOfficeAddress enterCorporateOfficePhoneNumber').lean();

        let studentId = allocation?.student?._id || allocation?.student;
        let admissionId = allocation?.admission?._id || allocation?.admission;
        if (!studentId && payment?.admission) {
            const adm = await Admission.findById(payment.admission).lean();
            if (adm) {
                admissionId = adm._id;
                studentId = adm.student;
            } else {
                const badm = await BoardCourseAdmission.findById(payment.admission).lean();
                if (badm) {
                    admissionId = badm._id;
                    studentId = badm.studentId;
                } else {
                    studentId = payment.admission;
                }
            }
        }

        const profile = await resolveStudentAcademicDetails(studentId, admissionId, {
            department: allocation?.departmentName,
            examTag: allocation?.examTagName,
            class: allocation?.className,
            session: allocation?.session,
            board: allocation?.boardName
        });

        const totalAmountNum = parseFloat(Number(payment?.paidAmount || payment?.totalAmount || allocation?.totalAmount || 0).toFixed(2));
        const grossFee = allocation?.grossAmount !== undefined && allocation?.grossAmount !== null && Number(allocation.grossAmount) > 0
            ? parseFloat(Number(allocation.grossAmount).toFixed(2))
            : totalAmountNum;
        const waiver = allocation?.discount !== undefined && allocation?.discount !== null
            ? parseFloat(Number(allocation.discount).toFixed(2))
            : (grossFee > totalAmountNum ? parseFloat((grossFee - totalAmountNum).toFixed(2)) : 0);

        const courseFee = payment?.courseFee !== undefined && payment.courseFee !== null
            ? parseFloat(Number(payment.courseFee).toFixed(2))
            : (totalAmountNum > 0 ? parseFloat((totalAmountNum / 1.18).toFixed(2)) : 0);
        const cgst = payment?.cgst !== undefined && payment.cgst !== null
            ? parseFloat(Number(payment.cgst).toFixed(2))
            : (totalAmountNum > 0 ? parseFloat(((totalAmountNum - courseFee) / 2).toFixed(2)) : 0);
        const sgst = payment?.sgst !== undefined && payment.sgst !== null
            ? parseFloat(Number(payment.sgst).toFixed(2))
            : (totalAmountNum > 0 ? parseFloat((totalAmountNum - courseFee - cgst).toFixed(2)) : 0);

        const itemNames = allocation?.items?.map(i => `${i.itemName} (x${i.quantity || 1})`).join(', ') || payment?.boardCourseName || 'Inventory Store Items';

        const billData = {
            billId: billId,
            billDate: payment?.paidDate || payment?.receivedDate || allocation?.allocationDate || new Date(),
            centre: {
                name: centreDoc?.centreName || targetCentreName,
                address: centreDoc?.address || 'N/A',
                phoneNumber: centreDoc?.phoneNumber || 'N/A',
                gstNumber: centreDoc?.enterGstNo || 'N/A',
                corporateAddress: centreDoc?.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                corporatePhone: centreDoc?.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
            },
            student: {
                id: studentId,
                name: profile.studentInfo?.studentName || 'N/A',
                admissionNumber: profile.admissionNumber,
                phoneNumber: profile.studentInfo?.mobileNum || profile.studentInfo?.whatsappNumber || 'N/A',
                email: profile.studentInfo?.studentEmail || 'N/A'
            },
            course: {
                name: itemNames,
                department: profile.resolvedDepartment,
                examTag: profile.resolvedExamTag,
                class: profile.resolvedClass,
                session: profile.resolvedSession
            },
            payment: {
                installmentNumber: payment?.installmentNumber || 0,
                paymentMethod: payment?.paymentMethod || allocation?.paymentMethod || 'CASH',
                transactionId: payment?.transactionId || '',
                accountHolderName: payment?.accountHolderName || '',
                paidDate: payment?.paidDate || allocation?.allocationDate,
                receivedDate: payment?.receivedDate || allocation?.allocationDate,
                status: payment?.status || 'PAID',
                remarks: payment?.remarks || `Inventory Store Allotment - Total: Rs. ${totalAmountNum}`
            },
            amounts: {
                grossFee: grossFee > 0 ? grossFee : totalAmountNum,
                waiver,
                courseFee,
                cgst,
                sgst,
                totalAmount: totalAmountNum
            },
            items: allocation?.items || []
        };

        res.status(200).json({
            success: true,
            data: billData
        });
    } catch (error) {
        console.error("Get Bill Details Error:", error);
        res.status(500).json({ message: "Server error getting bill details", error: error.message });
    }
};
