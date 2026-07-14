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

const getBaseExamTag = (tagName) => {
    if (!tagName) return "Uncategorized";
    const name = tagName.toUpperCase().trim();
    if (name.includes("WBBSE") || name === "MADHYAMIK") return "WBBSE";
    if (name.includes("WBCHSE") || name === "HS" || name.includes("HIGHER SECONDARY")) return "WBCHSE";
    if (name.includes("CBSE")) return "CBSE";
    if (name.includes("ICSE")) return "ICSE";
    if (name.includes("ISC")) return "ISC";
    return tagName.trim();
};

const getDeptForBoard = (boardName, departments) => {
    const bName = (boardName || "").toUpperCase().trim();
    let targetDeptName = "";
    if (bName === "WBBSE" || bName === "MADHYAMIK") {
        targetDeptName = "MADHYAMIK";
    } else if (bName === "WBCHSE" || bName === "HS") {
        targetDeptName = "HS";
    } else if (bName === "CBSE") {
        targetDeptName = "CBSE DEPARTMENT";
    } else if (bName === "ICSE") {
        targetDeptName = "ICSE";
    } else if (bName === "ISC") {
        targetDeptName = "ISC";
    }

    if (targetDeptName) {
        const dept = departments.find(d => d.departmentName.toUpperCase().trim() === targetDeptName);
        if (dept) return dept._id.toString();
    }
    
    // Fallback to isBoardMatchingDept
    const matched = departments.find(d => isBoardMatchingDept(boardName, d.departmentName));
    return matched ? matched._id.toString() : null;
};

const getStudentSessionExamTag = (studentDoc, academicSession) => {
    if (!studentDoc || !studentDoc.sessionExamCourse || !Array.isArray(studentDoc.sessionExamCourse)) return null;
    const match = studentDoc.sessionExamCourse.find(sec => 
        sec && sec.session === academicSession
    );
    return match ? match.examTag : null;
};

const getNormalizedExamTagName = (tagName, masterExamTags) => {
    if (!tagName) return "Uncategorized";
    const upperName = tagName.toUpperCase().trim();
    const match = masterExamTags.find(t => 
        (t.name || "").toUpperCase().trim() === upperName ||
        (t.tagName || "").toUpperCase().trim() === upperName
    );
    return match ? (match.name || match.tagName) : tagName.trim();
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
        if (targetType === 'WEEKLY') {
            filter.week = week;
            filter.month = month; // required: distinguishes same week number across different months
        }

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
        const { centre, year, month, quarter, week, targetType, programme, sessions, classIds } = req.query;

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
            const parsedWeekNum = parseInt(week, 10);
            const daysInMonth = new Date(parsedYear, mIdx + 1, 0).getDate();
            const firstDowJS = new Date(parsedYear, mIdx, 1).getDay();
            const firstMonOffset = (firstDowJS + 6) % 7; // Mon=0, Tue=1 … Sun=6
            
            const weeksList = [];
            let currentDay = 1;
            let currentWeekNum = 1;
            
            while (currentDay <= daysInMonth) {
                const startOffset = currentWeekNum === 1 ? firstMonOffset : 0;
                let startDay = currentDay;
                let colIdx = startOffset;
                while (currentDay <= daysInMonth && colIdx < 7) {
                    currentDay++;
                    colIdx++;
                }
                const endDay = currentDay - 1;
                weeksList.push({ weekNumber: currentWeekNum, startDay, endDay });
                currentWeekNum++;
            }
            
            const currentWeekRange = weeksList.find(w => w.weekNumber === parsedWeekNum) || weeksList[0];
            const startDay = currentWeekRange ? currentWeekRange.startDay : 1;
            const endDay = currentWeekRange ? currentWeekRange.endDay : 7;
            
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
        if (targetType === 'WEEKLY') {
            targetFilter.week = parseInt(week, 10);
            targetFilter.month = month; // required: same week number can exist in different months
        }

        const courseTargets = await CourseTarget.find(targetFilter).lean();
        const targetMap = {};
        courseTargets.forEach(t => {
            const key = `${t.centre.toString()}_${t.department.toString()}`;
            targetMap[key] = t.targetCount;
        });

        const programList = programme ? (typeof programme === 'string' ? programme.split(',').map(s => s.trim()) : programme) : [];
        const sessionList = sessions ? (typeof sessions === 'string' ? sessions.split(',').map(s => s.trim()) : sessions) : [];
        const classIdList = classIds ? classIds.split(',').map(s => s.trim()).filter(id => mongoose.Types.ObjectId.isValid(id)) : [];

        let boardClassMatches = [];
        if (classIdList.length > 0) {
            const ClassModel = mongoose.model("Class");
            const classDocs = await ClassModel.find({ _id: { $in: classIdList } }).select("name");
            const classNames = classDocs.map(c => c.name);
            const classDigits = classDocs.map(c => (c.name.match(/\d+/) || [])[0]).filter(Boolean);
            boardClassMatches = [...new Set([...classNames, ...classDigits])];
        }

        console.log(`Analyzing ${centreIds.length} centres from ${startDate.toISOString()} to ${endDate.toISOString()} | Sessions: ${sessionList} | Programs: ${programList}`);

        for (const centreId of centreIds) {
            const centreDoc = centreMap[centreId];
            if (!centreDoc) continue;

            const centreName = centreDoc.centreName;
            const centreRegex = new RegExp(`^${centreName.trim()}$`, 'i');

            const normalMatch = {
                centre: centreRegex,
                admissionDate: { $gte: startDate, $lte: endDate },
                admissionStatus: "ACTIVE",
                admissionType: "NORMAL"
            };
            if (sessionList.length > 0) {
                normalMatch.academicSession = { $in: sessionList };
            }
            if (classIdList.length > 0) {
                normalMatch.class = { $in: classIdList.map(id => new mongoose.Types.ObjectId(id)) };
            }

            const boardMatch = {
                centre: centreRegex,
                admissionDate: { $gte: startDate, $lte: endDate },
                status: "ACTIVE"
            };
            if (sessionList.length > 0) {
                boardMatch.academicSession = { $in: sessionList };
            }
            if (classIdList.length > 0) {
                boardMatch.lastClass = { $in: boardClassMatches };
            }

            const [normalAdmissions, boardAdmissions] = await Promise.all([
                Admission.find(normalMatch)
                    .populate('examTag')
                    .populate('student')
                    .lean(),
                BoardCourseAdmission.find(boardMatch)
                    .populate('boardId')
                    .populate('studentId')
                    .populate('examTag')
                    .lean()
            ]);

            // Filter in memory by programme list
            let filteredNormal = normalAdmissions;
            if (programList.length > 0) {
                filteredNormal = normalAdmissions.filter(a => {
                    const prog = a.student?.studentsDetails?.[0]?.programme;
                    return prog && programList.includes(prog);
                });
            }

            let filteredBoard = boardAdmissions;
            if (programList.length > 0) {
                filteredBoard = boardAdmissions.filter(a => {
                    const prog = a.studentId?.studentsDetails?.[0]?.programme || a.programme;
                    return prog && programList.includes(prog);
                });
            }

            // Combine and Deduplicate
            const combinedAdmissions = [];

            filteredNormal.forEach(a => {
                const sId = a.student?._id?.toString() || a.student?.toString();
                const studentTag = getStudentSessionExamTag(a.student, a.academicSession);
                let origTagName = studentTag || a.examTag?.name || a.examTag?.tagName || "NORMAL";
                origTagName = getNormalizedExamTagName(origTagName, allExamTags);
                const baseTagName = getBaseExamTag(origTagName);
                combinedAdmissions.push({
                    type: "normal",
                    studentId: sId,
                    baseTagName,
                    originalTagName: origTagName,
                    departmentId: a.department?.toString(),
                    admissionDate: new Date(a.admissionDate),
                    tagId: a.examTag?._id?.toString(),
                    raw: a
                });
            });

            filteredBoard.forEach(a => {
                const sId = a.studentId?._id?.toString() || a.studentId?.toString();
                const studentTag = getStudentSessionExamTag(a.studentId, a.academicSession);
                let origTagName = studentTag || a.examTag?.name || a.examTag?.tagName || a.boardId?.boardCourse || "BOARD";
                origTagName = getNormalizedExamTagName(origTagName, allExamTags);
                const baseTagName = getBaseExamTag(origTagName);
                const deptId = getDeptForBoard(baseTagName, masterDepartments);
                combinedAdmissions.push({
                    type: "board",
                    studentId: sId,
                    baseTagName,
                    originalTagName: origTagName,
                    departmentId: deptId,
                    admissionDate: new Date(a.admissionDate),
                    tagId: a.examTag?._id?.toString() || "board-tag",
                    raw: a
                });
            });

            // Deduplicate by (studentId, baseTagName)
            const uniqueMap = new Map();
            combinedAdmissions.forEach(item => {
                if (!item.studentId) return;
                const key = `${item.studentId}_${item.baseTagName.toUpperCase()}`;
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, item);
                } else {
                    const existing = uniqueMap.get(key);
                    if (item.admissionDate < existing.admissionDate) {
                        uniqueMap.set(key, item);
                    }
                }
            });

            const uniqueAdmissions = Array.from(uniqueMap.values());

            console.log(`Centre: ${centreName} | Normal raw: ${normalAdmissions.length} | Board raw: ${boardAdmissions.length} | Unique combined: ${uniqueAdmissions.length}`);

            const deptAdmissionMap = {};
            const deptExamTagBreakdown = {};

            uniqueAdmissions.forEach(item => {
                if (item.departmentId) {
                    const dId = item.departmentId;
                    deptAdmissionMap[dId] = (deptAdmissionMap[dId] || 0) + 1;

                    if (!deptExamTagBreakdown[dId]) deptExamTagBreakdown[dId] = [];
                    const breakdown = deptExamTagBreakdown[dId];
                    const existing = breakdown.find(t => t.tagName === item.originalTagName);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        breakdown.push({
                            tagId: item.tagId,
                            tagName: item.originalTagName,
                            count: 1
                        });
                    }
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
        const { centreName, departmentId, startDate, endDate, programme, sessions, tagName, classIds } = req.query;

        if (!centreName || !departmentId || !startDate || !endDate) {
            return res.status(400).json({ message: "Missing required parameters" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const centreRegex = new RegExp(`^${centreName.trim()}$`, 'i');

        const programList = programme ? (typeof programme === 'string' ? programme.split(',').map(s => s.trim()) : programme) : [];
        const sessionList = sessions ? (typeof sessions === 'string' ? sessions.split(',').map(s => s.trim()) : sessions) : [];
        const classIdList = classIds ? classIds.split(',').map(s => s.trim()).filter(id => mongoose.Types.ObjectId.isValid(id)) : [];

        let boardClassMatches = [];
        if (classIdList.length > 0) {
            const ClassModel = mongoose.model("Class");
            const classDocs = await ClassModel.find({ _id: { $in: classIdList } }).select("name");
            const classNames = classDocs.map(c => c.name);
            const classDigits = classDocs.map(c => (c.name.match(/\d+/) || [])[0]).filter(Boolean);
            boardClassMatches = [...new Set([...classNames, ...classDigits])];
        }

        // Check if we need to filter by a specific exam tag/board name (across all departments in the centre)
        const isTagFiltered = tagName && tagName !== "All";

        const allExamTags = await ExamTag.find({}).lean();

        // Fetch Normal Admissions
        const normalQuery = {
            centre: centreRegex,
            admissionDate: { $gte: start, $lte: end },
            admissionStatus: "ACTIVE",
            admissionType: "NORMAL"
        };
        // If not specific tag filtering, query only for requested departmentId
        if (!isTagFiltered) {
            normalQuery.department = departmentId;
        }
        if (sessionList.length > 0) {
            normalQuery.academicSession = { $in: sessionList };
        }
        if (classIdList.length > 0) {
            normalQuery.class = { $in: classIdList.map(id => new mongoose.Types.ObjectId(id)) };
        }

        const admissions = await Admission.find(normalQuery)
            .populate('course', 'courseName programme')
            .populate('examTag', 'name tagName')
            .populate('student', 'studentsDetails mobileNum sessionExamCourse')
            .lean();

        let normalResults = admissions.map(a => {
            const studentTag = getStudentSessionExamTag(a.student, a.academicSession);
            let origTagName = studentTag || a.examTag?.name || a.examTag?.tagName || "NORMAL";
            origTagName = getNormalizedExamTagName(origTagName, allExamTags);
            return {
                _id: a._id,
                studentId: a.student?._id?.toString() || a.student?.toString(),
                admissionNumber: a.admissionNumber,
                studentName: a.student?.studentsDetails?.[0]?.studentName || "N/A",
                phone: a.student?.studentsDetails?.[0]?.mobileNum || a.student?.mobileNum || "N/A",
                admissionDate: a.admissionDate,
                examTag: origTagName,
                course: a.course?.courseName || "N/A",
                programme: a.student?.studentsDetails?.[0]?.programme || a.course?.programme || "",
                downPayment: a.downPayment || 0,
                totalFees: a.totalFees || 0
            };
        });

        if (programList.length > 0) {
            normalResults = normalResults.filter(a => programList.includes(a.programme));
        }

        // Fetch Board Course Admissions matching
        let boardResults = [];
        const masterDepartments = await Department.find({ showInAdmission: { $ne: false } }).lean();

        const boardQuery = {
            centre: centreRegex,
            admissionDate: { $gte: start, $lte: end },
            status: "ACTIVE"
        };
        if (sessionList.length > 0) {
            boardQuery.academicSession = { $in: sessionList };
        }
        if (classIdList.length > 0) {
            boardQuery.lastClass = { $in: boardClassMatches };
        }

        const boardAdmissions = await BoardCourseAdmission.find(boardQuery)
            .populate('studentId')
            .populate('boardId')
            .populate('examTag')
            .lean();

        boardResults = boardAdmissions.map(a => {
            const studentTag = getStudentSessionExamTag(a.studentId, a.academicSession);
            let origTagName = studentTag || a.examTag?.name || a.examTag?.tagName || a.boardId?.boardCourse || "BOARD";
            origTagName = getNormalizedExamTagName(origTagName, allExamTags);
            return {
                _id: a._id,
                studentId: a.studentId?._id?.toString() || a.studentId?.toString(),
                admissionNumber: a.admissionNumber,
                studentName: a.studentName || a.studentId?.studentsDetails?.[0]?.studentName || "N/A",
                phone: a.mobileNum || a.studentId?.studentsDetails?.[0]?.mobileNum || a.studentId?.mobileNum || "N/A",
                admissionDate: a.admissionDate,
                examTag: origTagName,
                course: a.boardCourseName || a.boardId?.boardCourse || "N/A",
                programme: a.studentId?.studentsDetails?.[0]?.programme || a.programme || "",
                downPayment: a.totalPaidAmount || a.admissionFee || 0,
                totalFees: a.totalExpectedAmount || 0
            };
        });

        if (programList.length > 0) {
            boardResults = boardResults.filter(a => programList.includes(a.programme));
        }

        // Filter board results by matching tag column or department mapping
        if (isTagFiltered) {
            const filterBase = getBaseExamTag(tagName).toUpperCase();
            boardResults = boardResults.filter(a => getBaseExamTag(a.examTag).toUpperCase() === filterBase);
        } else {
            boardResults = boardResults.filter(a => 
                getDeptForBoard(getBaseExamTag(a.examTag), masterDepartments) === departmentId
            );
        }

        const combinedResults = [...normalResults, ...boardResults];

        // Deduplicate combined results by student ID and base exam tag name
        const uniqueResultsMap = new Map();
        combinedResults.forEach(item => {
            if (!item.studentId) return;
            const baseTag = getBaseExamTag(item.examTag);
            const key = `${item.studentId}_${baseTag.toUpperCase()}`;
            if (!uniqueResultsMap.has(key)) {
                uniqueResultsMap.set(key, item);
            } else {
                const existing = uniqueResultsMap.get(key);
                if (new Date(item.admissionDate) < new Date(existing.admissionDate)) {
                    uniqueResultsMap.set(key, item);
                }
            }
        });

        let uniqueCombinedResults = Array.from(uniqueResultsMap.values());

        // If specific tag filtering, filter the deduplicated list to only keep matching tags
        if (isTagFiltered) {
            uniqueCombinedResults = uniqueCombinedResults.filter(item => 
                (item.examTag || "").toLowerCase() === tagName.toLowerCase()
            );
        }

        res.status(200).json({ success: true, data: uniqueCombinedResults });



    } catch (error) {
        console.error("getAdmissionDetails error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};