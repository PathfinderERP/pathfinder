import CourseTarget from "../../models/Sales/CourseTarget.js";
import Course from "../../models/Master_data/Courses.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import Centre from "../../models/Master_data/Centre.js";
import Department from "../../models/Master_data/Department.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Boards from "../../models/Master_data/Boards.js";
import mongoose from "mongoose";

const isBoardMatchingDept = (boardCourse, deptName) => {
    const bName = (boardCourse || "").toUpperCase();
    const dName = (deptName || "").toUpperCase();
    
    if (dName.includes(bName) || bName.includes(dName)) return true;
    
    if (bName === 'WBBSE' && dName.includes('MADHYAMIK')) return true;
    if (dName.includes('WBBSE') && bName.includes('MADHYAMIK')) return true;
    
    if (bName === 'WBCHSE' && (dName.includes('HS') || dName.includes('HIGHER SECONDARY'))) return true;
    
    return false;
};

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// POST /sales/course-target
export const saveCourseTarget = async (req, res) => {
    try {
        const { centreId, targetType, year, month, quarter, week, targetCount, department, examTags } = req.body;

        if (!centreId || !targetType || !year || !department || !targetCount) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const filter = { centre: centreId, department, targetType, year };
        if (targetType === 'MONTHLY') filter.month = month;
        if (targetType === 'QUARTERLY') filter.quarter = quarter;
        if (targetType === 'WEEKLY') filter.week = week;

        const update = { targetCount, examTags: examTags || [], createdBy: req.user._id };

        console.log("Saving Course Target with Filter:", JSON.stringify(filter));
        console.log("Saving Course Target with Update:", JSON.stringify(update));

        const result = await CourseTarget.findOneAndUpdate(
            filter,
            { ...filter, ...update },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Target saved successfully", data: result });
    } catch (error) {
        console.error("saveCourseTarget error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /sales/course-target/analysis
export const getCourseTargetAnalysis = async (req, res) => {
    try {
        const { centre, year, month, quarter, week, targetType, programme } = req.query;

        if (!centre || !year || !targetType) {
            return res.status(400).json({ message: "Centre(s), Year, and Target Type are required" });
        }

        const parsedYear = parseInt(year, 10);
        let centreIds = [];

        if (centre === 'all') {
            let allowedCentres;
            if (req.user.role === 'superAdmin') {
                allowedCentres = await Centre.find({ status: { $ne: 'deactive' }, centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] } }).lean();
            } else {
                const userCentres = req.user.centres.map(id => typeof id === 'object' ? id._id : id);
                allowedCentres = await Centre.find({ _id: { $in: userCentres }, status: { $ne: 'deactive' }, centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] } }).lean();
            }
            centreIds = allowedCentres.map(c => c._id.toString());
        } else {
            centreIds = centre.split(',').filter(id => id.trim() !== '');
            // Filter to only include active centres
            const activeCentres = await Centre.find({ _id: { $in: centreIds }, status: { $ne: 'deactive' } }).lean();
            centreIds = activeCentres.map(c => c._id.toString());
        }

        if (centreIds.length === 0) {
            return res.status(200).json({ year: parsedYear, targetType, data: [] });
        }

        const masterDepartments = await Department.find({ showInAdmission: { $ne: false } }).lean();
        const allCentres = await Centre.find({ _id: { $in: centreIds }, status: { $ne: 'deactive' } }).lean();
        const centreMap = {};
        allCentres.forEach(c => centreMap[c._id.toString()] = c);

        let startDate, endDate;
        if (targetType === 'MONTHLY') {
            const mIdx = monthNames.indexOf(month);
            startDate = new Date(parsedYear, mIdx, 1);
            endDate = new Date(parsedYear, mIdx + 1, 0, 23, 59, 59, 999);
        } else if (targetType === 'QUARTERLY') {
            if (quarter === 'Q1') {
                startDate = new Date(parsedYear, 3, 1);
                endDate = new Date(parsedYear, 5, 30, 23, 59, 59, 999);
            } else if (quarter === 'Q2') {
                startDate = new Date(parsedYear, 6, 1);
                endDate = new Date(parsedYear, 8, 30, 23, 59, 59, 999);
            } else if (quarter === 'Q3') {
                startDate = new Date(parsedYear, 9, 1);
                endDate = new Date(parsedYear, 11, 31, 23, 59, 59, 999);
            } else if (quarter === 'Q4') {
                startDate = new Date(parsedYear + 1, 0, 1);
                endDate = new Date(parsedYear + 1, 2, 31, 23, 59, 59, 999);
            }
        } else if (targetType === 'YEARLY') {
            startDate = new Date(parsedYear, 3, 1);
            endDate = new Date(parsedYear + 1, 2, 31, 23, 59, 59, 999);
        } else if (targetType === 'WEEKLY') {
            const mIdx = monthNames.indexOf(month);
            const daysInMonth = new Date(parsedYear, mIdx + 1, 0).getDate();
            const startDay = (week - 1) * 7 + 1;
            const endDay = Math.min(week * 7, daysInMonth);
            startDate = new Date(parsedYear, mIdx, startDay);
            endDate = new Date(parsedYear, mIdx, endDay, 23, 59, 59, 999);
        } else if (targetType === 'CUSTOM') {
            const { startDate: qStart, endDate: qEnd } = req.query;
            if (!qStart || !qEnd) {
                return res.status(400).json({ message: "Start Date and End Date are required for CUSTOM view" });
            }
            startDate = new Date(qStart);
            endDate = new Date(qEnd);
            endDate.setHours(23, 59, 59, 999);
        }

        const results = [];
        const allExamTags = await ExamTag.find({}).lean();
        const examTagMap = {};
        allExamTags.forEach(t => examTagMap[t._id.toString()] = t.tagName || t.name);

        // Fetch Course Targets
        const targetFilter = {
            centre: { $in: centreIds },
            year: parsedYear,
            targetType
        };
        if (targetType === 'MONTHLY') targetFilter.month = month;
        if (targetType === 'QUARTERLY') targetFilter.quarter = quarter;
        if (targetType === 'WEEKLY') targetFilter.week = parseInt(week, 10);

        const courseTargets = await CourseTarget.find(targetFilter).lean();
        const targetMap = {};
        courseTargets.forEach(t => {
            const key = `${t.centre.toString()}_${t.department.toString()}`;
            targetMap[key] = t.targetCount;
        });

        console.log(`Analyzing ${centreIds.length} centres from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        for (const centreId of centreIds) {
            const centreDoc = centreMap[centreId];
            if (!centreDoc) continue;

            const centreName = centreDoc.centreName;
            const centreRegex = new RegExp(`^${centreName.trim()}$`, 'i');

            const [normalAdmissions, boardAdmissions] = await Promise.all([
                Admission.aggregate([
                    {
                        $match: {
                            centre: centreRegex,
                            admissionDate: { $gte: startDate, $lte: endDate },
                            admissionStatus: "ACTIVE",
                            admissionType: "NORMAL"
                        }
                    },
                    {
                        $lookup: {
                            from: "students",
                            localField: "student",
                            foreignField: "_id",
                            as: "studentInfo"
                        }
                    },
                    { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
                    ...(programme ? [{
                        $match: {
                            "studentInfo.studentsDetails.programme": programme
                        }
                    }] : []),
                    {
                        $group: {
                            _id: { department: "$department", examTag: "$examTag" },
                            count: { $sum: 1 }
                        }
                    }
                ]),
                BoardCourseAdmission.aggregate([
                    {
                        $match: {
                            centre: centreRegex,
                            admissionDate: { $gte: startDate, $lte: endDate },
                            status: "ACTIVE"
                        }
                    },
                    {
                        $lookup: {
                            from: "students",
                            localField: "studentId",
                            foreignField: "_id",
                            as: "studentInfo"
                        }
                    },
                    { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
                    ...(programme ? [{
                        $match: {
                            "studentInfo.studentsDetails.programme": programme
                        }
                    }] : []),
                    {
                        $lookup: {
                            from: "boards",
                            localField: "boardId",
                            foreignField: "_id",
                            as: "boardInfo"
                        }
                    },
                    { $unwind: { path: "$boardInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: "$boardInfo.boardCourse",
                            count: { $sum: 1 }
                        }
                    }
                ])
            ]);

            console.log(`Centre: ${centreName} | Normal: ${normalAdmissions.length} | Board: ${boardAdmissions.length}`);

            const deptAdmissionMap = {};
            const deptExamTagBreakdown = {};

            normalAdmissions.forEach(a => {
                if (a._id && a._id.department) {
                    const dId = a._id.department.toString();
                    deptAdmissionMap[dId] = (deptAdmissionMap[dId] || 0) + a.count;

                    if (!deptExamTagBreakdown[dId]) deptExamTagBreakdown[dId] = [];
                    deptExamTagBreakdown[dId].push({
                        tagId: a._id.examTag,
                        tagName: a._id.examTag ? (examTagMap[a._id.examTag.toString()] || "Other") : "Uncategorized",
                        count: a.count
                    });
                }
            });

            boardAdmissions.forEach(a => {
                if (a._id) {
                    const boardName = a._id.toString();
                    const matchingDepts = masterDepartments.filter(d =>
                        isBoardMatchingDept(boardName, d.departmentName)
                    );

                    matchingDepts.forEach(dept => {
                        const dId = dept._id.toString();
                        deptAdmissionMap[dId] = (deptAdmissionMap[dId] || 0) + a.count;

                        if (!deptExamTagBreakdown[dId]) deptExamTagBreakdown[dId] = [];
                        deptExamTagBreakdown[dId].push({
                            tagId: "board-tag",
                            tagName: boardName,
                            count: a.count
                        });
                    });
                }
            });

            const finalDeptStats = masterDepartments.map(dept => {
                const dId = dept._id.toString();
                const targetKey = `${centreId}_${dId}`;
                const target = targetMap[targetKey] || 0;
                return {
                    name: dept.departmentName,
                    id: dept._id,
                    target: target,
                    achieved: deptAdmissionMap[dId] || 0,
                    examTagAchieved: deptExamTagBreakdown[dId] || [],
                    courses: []
                };
            });

            results.push({
                centreId,
                centreName,
                departments: finalDeptStats
            });
        }

        res.status(200).json({ success: true, year: parsedYear, targetType, data: results });

    } catch (error) {
        console.error("getCourseTargetAnalysis error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /sales/course-target/admissions
export const getAdmissionDetails = async (req, res) => {
    try {
        const { centreName, departmentId, startDate, endDate, programme } = req.query;

        if (!centreName || !departmentId || !startDate || !endDate) {
            return res.status(400).json({ message: "Missing required parameters" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const centreRegex = new RegExp(`^${centreName.trim()}$`, 'i');

        // Fetch Normal Admissions
        const admissions = await Admission.find({
            centre: centreRegex,
            department: departmentId,
            admissionDate: { $gte: start, $lte: end },
            admissionStatus: "ACTIVE",
            admissionType: "NORMAL"
        })
            .populate('course', 'courseName programme')
            .populate('examTag', 'name tagName')
            .populate('student', 'studentsDetails mobileNum')
            .lean();

        let normalResults = admissions.map(a => ({
            _id: a._id,
            admissionNumber: a.admissionNumber,
            studentName: a.student?.studentsDetails?.[0]?.studentName || "N/A",
            phone: a.student?.studentsDetails?.[0]?.mobileNum || a.student?.mobileNum || "N/A",
            admissionDate: a.admissionDate,
            examTag: a.examTag?.name || a.examTag?.tagName || "NORMAL",
            course: a.course?.courseName || "N/A",
            programme: a.student?.studentsDetails?.[0]?.programme || a.course?.programme || "",
            downPayment: a.downPayment || 0,
            totalFees: a.totalFees || 0
        }));

        if (programme) {
            normalResults = normalResults.filter(a => a.programme === programme);
        }

        // Fetch Board Course Admissions matching this department
        let boardResults = [];
        const dept = await Department.findById(departmentId).lean();
        if (dept) {
            const deptName = dept.departmentName;
            const allBoards = await Boards.find({}).lean();
            const matchingBoardIds = allBoards
                .filter(b => isBoardMatchingDept(b.boardCourse, deptName))
                .map(b => b._id);

            if (matchingBoardIds.length > 0) {
                const boardQuery = {
                    centre: centreRegex,
                    boardId: { $in: matchingBoardIds },
                    admissionDate: { $gte: start, $lte: end },
                    status: "ACTIVE"
                };
                const boardAdmissions = await BoardCourseAdmission.find(boardQuery)
                    .populate('studentId')
                    .populate('boardId')
                    .lean();

                boardResults = boardAdmissions.map(a => ({
                    _id: a._id,
                    admissionNumber: a.admissionNumber,
                    studentName: a.studentName || a.studentId?.studentsDetails?.[0]?.studentName || "N/A",
                    phone: a.mobileNum || a.studentId?.studentsDetails?.[0]?.mobileNum || a.studentId?.mobileNum || "N/A",
                    admissionDate: a.admissionDate,
                    examTag: a.boardId?.boardCourse || "BOARD",
                    course: a.boardId?.boardCourse || "N/A",
                    programme: a.studentId?.studentsDetails?.[0]?.programme || a.programme || "",
                    downPayment: a.totalPaidAmount || a.admissionFee || 0,
                    totalFees: a.totalExpectedAmount || 0
                }));

                if (programme) {
                    boardResults = boardResults.filter(a => a.programme === programme);
                }
            }
        }

        const combinedResults = [...normalResults, ...boardResults];

        res.status(200).json({ success: true, data: combinedResults });

    } catch (error) {
        console.error("getAdmissionDetails error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};