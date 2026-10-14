import mongoose from "mongoose";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import Centre from "../../models/Master_data/Centre.js";
import LeadManagement from "../../models/LeadManagement.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import Department from "../../models/Master_data/Department.js";
import Boards from "../../models/Master_data/Boards.js";
import User from "../../models/User.js";


export const createBoardCourseCounselling = async (req, res) => {
    try {
        let { 
            studentId, studentName, mobileNum, whatsappNumber, studentEmail,
            dateOfBirth, gender, centre, board, state, schoolName, pincode, address, 
            class: studentClass, examTag, programme, 
            guardianName, guardianMobile, guardianEmail, relation, occupation,
            examName, lastClass, examStatus, markAgregate, scienceMathParcent,
            boardId, selectedSubjectIds, remarks, department, counselledBy,
            academicSession
        } = req.body;

        // Clean & sanitize inputs (critical: remove leading/trailing spaces or non-digit chars)
        const cleanMobile = typeof mobileNum === 'string' ? mobileNum.replace(/\D/g, '').trim() : (mobileNum ? String(mobileNum).replace(/\D/g, '').trim() : "");
        const cleanWhatsapp = typeof whatsappNumber === 'string' ? whatsappNumber.replace(/\D/g, '').trim() : (whatsappNumber ? String(whatsappNumber).replace(/\D/g, '').trim() : cleanMobile);
        const cleanGuardianMobile = typeof guardianMobile === 'string' ? guardianMobile.replace(/\D/g, '').trim() : (guardianMobile ? String(guardianMobile).replace(/\D/g, '').trim() : "");
        const cleanEmail = typeof studentEmail === 'string' ? studentEmail.trim() : (studentEmail || "");
        const cleanStudentName = typeof studentName === 'string' ? studentName.trim() : (studentName || "");

        // Robust Department Resolution (handles ObjectId, object with _id, or departmentName string)
        let resolvedDepartmentId = null;
        if (department && mongoose.Types.ObjectId.isValid(department)) {
            resolvedDepartmentId = department;
        } else if (department && typeof department === 'object' && department._id) {
            resolvedDepartmentId = department._id;
        } else if (department && typeof department === 'string' && department.trim()) {
            const deptDoc = await Department.findOne({
                $or: [
                    { departmentName: { $regex: new RegExp(`^${department.trim()}$`, 'i') } },
                    { departmentName: { $regex: department.trim(), $options: 'i' } }
                ]
            });
            if (deptDoc) resolvedDepartmentId = deptDoc._id;
        }

        if (!resolvedDepartmentId) {
            return res.status(400).json({ message: "A valid Department selection is required" });
        }

        // Robust Board Resolution (handles ObjectId, object with _id, or boardCourse/boardName string)
        let resolvedBoardId = null;
        if (boardId && mongoose.Types.ObjectId.isValid(boardId)) {
            resolvedBoardId = boardId;
        } else if (boardId && typeof boardId === 'object' && boardId._id) {
            resolvedBoardId = boardId._id;
        } else if ((boardId && typeof boardId === 'string' && boardId.trim()) || (board && typeof board === 'string' && board.trim())) {
            const searchName = (boardId || board).toString().trim();
            const boardDoc = await Boards.findOne({
                $or: [
                    { boardCourse: { $regex: new RegExp(`^${searchName}$`, 'i') } },
                    { boardName: { $regex: new RegExp(`^${searchName}$`, 'i') } }
                ]
            });
            if (boardDoc) resolvedBoardId = boardDoc._id;
        }

        if (!resolvedBoardId) {
            return res.status(400).json({ message: "A valid Target Board selection is required" });
        }

        // Robust Counselled By Resolution (handles ObjectId, object with _id, name string, or fallback to authenticated user)
        let resolvedCounselledBy = null;
        const counsellorInput = counselledBy || req.user?._id;
        if (counsellorInput && mongoose.Types.ObjectId.isValid(counsellorInput)) {
            resolvedCounselledBy = counsellorInput;
        } else if (counsellorInput && typeof counsellorInput === 'object' && counsellorInput._id) {
            resolvedCounselledBy = counsellorInput._id;
        } else if (typeof counsellorInput === 'string' && counsellorInput.trim()) {
            const userDoc = await User.findOne({ name: { $regex: new RegExp(`^${counsellorInput.trim()}$`, 'i') } });
            if (userDoc) resolvedCounselledBy = userDoc._id;
        }
        if (!resolvedCounselledBy && req.user?._id) {
            resolvedCounselledBy = req.user._id;
        }

        if (!resolvedCounselledBy) {
            return res.status(400).json({ message: "Counselled by selection is required" });
        }

        // Robust ExamTag Resolution (handles regex escaping and direct ObjectId)
        let resolvedExamTagId = null;
        if (examTag && mongoose.Types.ObjectId.isValid(examTag)) {
            resolvedExamTagId = examTag;
        } else if (examName && typeof examName === 'string' && examName.trim()) {
            const escaped = examName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const tagDoc = await ExamTag.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
            if (tagDoc) resolvedExamTagId = tagDoc._id;
        }

        // Robust selected subjects filtering (prevents null, undefined, or malformed entries)
        const validSelectedSubjects = (Array.isArray(selectedSubjectIds) ? selectedSubjectIds : [])
            .map(s => (s && typeof s === 'object' && s.subjectId) ? s.subjectId : s)
            .filter(id => id && mongoose.Types.ObjectId.isValid(id))
            .map(id => ({ subjectId: id }));

        // Server-side duplicate validation BEFORE creating
        // Only trigger duplicate conflict if it belongs to a DIFFERENT student
        if (cleanMobile) {
            const dupMobile = await Student.findOne({ "studentsDetails.mobileNum": cleanMobile });
            if (dupMobile) {
                let isAllowed = false;
                if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
                    if (dupMobile._id.toString() === studentId.toString()) {
                        isAllowed = true;
                    } else {
                        const leadObj = await LeadManagement.findById(studentId);
                        if (leadObj) {
                            const leadPhoneClean = (leadObj.phoneNumber || "").replace(/\D/g, '');
                            if (leadPhoneClean === cleanMobile) {
                                isAllowed = true;
                            }
                        }
                    }
                }
                if (!isAllowed) {
                    const dupName = dupMobile.studentsDetails?.[0]?.studentName || "Another student";
                    return res.status(409).json({
                        message: `Mobile number already registered to "${dupName}". Cannot create counselling record.`,
                        field: "mobileNum",
                        takenBy: dupName
                    });
                }
            }
        }

        if (cleanEmail && cleanEmail.includes("@")) {
            const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const dupEmail = await Student.findOne({ "studentsDetails.studentEmail": new RegExp(`^${escapedEmail}$`, 'i') });
            if (dupEmail) {
                let isAllowed = false;
                if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
                    if (dupEmail._id.toString() === studentId.toString()) {
                        isAllowed = true;
                    } else {
                        const leadObj = await LeadManagement.findById(studentId);
                        if (leadObj && leadObj.email && leadObj.email.trim().toLowerCase() === cleanEmail.toLowerCase()) {
                            isAllowed = true;
                        }
                    }
                }
                if (!isAllowed) {
                    const dupName = dupEmail.studentsDetails?.[0]?.studentName || "Another student";
                    return res.status(409).json({
                        message: `Email already registered to "${dupName}". Cannot create counselling record.`,
                        field: "studentEmail",
                        takenBy: dupName
                    });
                }
            }
        }

        // If studentId is provided, check if it's a valid Student or a Lead
        if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
            const existingStudent = await Student.findById(studentId);
            if (!existingStudent) {
                // Not a student, check if it's a Lead
                const lead = await LeadManagement.findById(studentId);
                if (lead) {
                    const leadPhoneClean = (lead.phoneNumber || "").replace(/\D/g, '');
                    const queryMobile = cleanMobile || leadPhoneClean;
                    // Check if a student with this mobile already exists
                    let student = queryMobile ? await Student.findOne({ "studentsDetails.mobileNum": queryMobile }) : null;
                    if (!student) {
                        // Create a new student from lead/form data with sanitized phone numbers
                        student = new Student({
                            studentsDetails: [{
                                studentName: cleanStudentName || lead.name?.trim(),
                                mobileNum: cleanMobile || leadPhoneClean,
                                whatsappNumber: cleanWhatsapp || cleanMobile || leadPhoneClean,
                                studentEmail: cleanEmail || lead.email?.trim() || "",
                                dateOfBirth,
                                gender,
                                centre: centre || lead.centre?.centreName || lead.centre || "Not Specified",
                                board: board || lead.board?.boardName || lead.board || "",
                                state,
                                schoolName: schoolName || lead.schoolName || "",
                                pincode,
                                address: address || lead.address || "",
                                programme,
                                guardians: [{
                                    guardianName,
                                    guardianMobile: cleanGuardianMobile,
                                    guardianEmail,
                                    occupation
                                }],
                                examSchema: [{
                                    examName: examName || lead.course?.courseName || "",
                                    class: lastClass || lead.className?.name || lead.className || "",
                                    examStatus,
                                    markAgregate,
                                    scienceMathParcent
                                }]
                            }],
                            guardians: [{
                                guardianName,
                                guardianMobile: cleanGuardianMobile,
                                guardianEmail,
                                occupation
                            }],
                            examSchema: [{
                                examName: examName || lead.course?.courseName || "",
                                class: lastClass || lead.className?.name || lead.className || "",
                                examStatus,
                                markAgregate,
                                scienceMathParcent
                            }],
                            sessionExamCourse: [{
                                 examTag: examName || "",
                                 session: academicSession || ""
                             }],
                            isEnrolled: false,
                            department: resolvedDepartmentId,
                            counselledBy: resolvedCounselledBy,
                            createdBy: req.user?.name || "System",
                            updatedBy: req.user?.name || "System",
                            updatedByUserId: req.user?._id
                        });
                        await student.save();
                    }
                    studentId = student._id;
                    // Mark lead as counseled
                    await LeadManagement.findByIdAndUpdate(lead._id, { isCounseled: true });
                } else {
                    studentId = null;
                }
            }
        }

        // If no studentId at this point, check if student exists by mobile number or create a new one
        if (!studentId) {
            let student = cleanMobile ? await Student.findOne({ "studentsDetails.mobileNum": cleanMobile }) : null;
            if (!student) {
                student = new Student({
                    studentsDetails: [{
                        studentName: cleanStudentName,
                        mobileNum: cleanMobile,
                        whatsappNumber: cleanWhatsapp || cleanMobile,
                        studentEmail: cleanEmail,
                        dateOfBirth,
                        gender,
                        centre: centre || "Not Specified",
                        board,
                        state,
                        schoolName,
                        pincode,
                        address,
                        programme,
                        guardians: [{
                            guardianName,
                            guardianMobile: cleanGuardianMobile,
                            guardianEmail,
                            occupation
                        }],
                        examSchema: [{
                            examName,
                            class: lastClass,
                            examStatus,
                            markAgregate,
                            scienceMathParcent
                        }]
                    }],
                    guardians: [{
                        guardianName,
                        guardianMobile: cleanGuardianMobile,
                        guardianEmail,
                        occupation
                    }],
                    examSchema: [{
                        examName,
                        class: lastClass,
                        examStatus,
                        markAgregate,
                        scienceMathParcent
                    }],
                    sessionExamCourse: [{
                        examTag: examName || "",
                        session: academicSession || ""
                    }],
                    isEnrolled: false,
                    counselledBy: resolvedCounselledBy,
                    createdBy: req.user?.name || "System",
                    updatedBy: req.user?.name || "System",
                    updatedByUserId: req.user?._id,
                    department: resolvedDepartmentId
                });
                await student.save();
            } else {
                // If student found by mobile, update fields if provided and differing
                const updateSet = {};
                if (cleanStudentName && cleanStudentName !== student.studentsDetails?.[0]?.studentName) {
                    updateSet["studentsDetails.0.studentName"] = cleanStudentName;
                }
                if (programme && programme !== student.studentsDetails?.[0]?.programme) {
                    updateSet["studentsDetails.0.programme"] = programme;
                }
                if (examName && (!student.sessionExamCourse || student.sessionExamCourse.length === 0 || !student.sessionExamCourse[0].examTag)) {
                    updateSet["sessionExamCourse"] = [{
                        examTag: examName,
                        session: academicSession || student.sessionExamCourse?.[0]?.session || "",
                        targetExams: student.sessionExamCourse?.[0]?.targetExams || ""
                    }];
                }
                if (resolvedDepartmentId && !student.department) {
                    updateSet["department"] = resolvedDepartmentId;
                }
                if (Object.keys(updateSet).length > 0) {
                    await Student.findByIdAndUpdate(student._id, { $set: updateSet });
                }
            }
            studentId = student._id;
        }

        // Ensure centre, studentName and mobileNum are available if NOT provided in req.body
        if (studentId && (!cleanStudentName || !cleanMobile || !centre)) {
            const studentData = await Student.findById(studentId);
            if (studentData && studentData.studentsDetails?.[0]) {
                const officialDetails = studentData.studentsDetails[0];
                studentName = cleanStudentName || officialDetails.studentName;
                mobileNum = cleanMobile || officialDetails.mobileNum;
                centre = centre || officialDetails.centre;
            }
        }

        const counselling = new BoardCourseCounselling({
            studentId,
            studentName: cleanStudentName || studentName,
            mobileNum: cleanMobile || mobileNum,
            studentEmail: cleanEmail || studentEmail,
            centre,
            programme,
            lastClass,
            boardId: resolvedBoardId,
            examTag: resolvedExamTagId,
            selectedSubjects: validSelectedSubjects,
            remarks,
            counselledBy: resolvedCounselledBy,
            department: resolvedDepartmentId,
            academicSession
        });

        await counselling.save();

        // Mark matching leads as counselled
        try {
            const queryPhones = [cleanMobile, cleanWhatsapp, mobileNum, whatsappNumber].filter(p => p && p !== '-');
            if (queryPhones.length > 0) {
                await LeadManagement.updateMany(
                    {
                        $or: [
                            { phoneNumber: { $in: queryPhones } },
                            { secondPhoneNumber: { $in: queryPhones } }
                        ]
                    },
                    { $set: { isCounseled: true } }
                );
            }
        } catch (leadErr) {
            console.error("Error marking matching leads as counselled in board course counselling:", leadErr);
        }

        res.status(201).json({ message: "Board course counselling recorded", counselling });
    } catch (error) {
        console.error("Error in createBoardCourseCounselling:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getBoardCourseCounselling = async (req, res) => {
    try {
        const { id } = req.params;
        if (id) {
            let record = await BoardCourseCounselling.findById(id)
                .populate({
                    path: 'studentId',
                    populate: {
                        path: 'batches'
                    }
                })
                .populate('boardId')
                .populate('examTag')
                .populate('selectedSubjects.subjectId')
                .populate('counselledBy', 'name email')
                .populate('department');
            
            if (!record) return res.status(404).json({ message: "Counselling record not found" });

            // Auto-heal: If studentId is null/missing/unlinked, resolve or create Student profile
            if (!record.studentId) {
                let resolvedStudent = null;
                const cleanRecordMobile = typeof record.mobileNum === 'string' ? record.mobileNum.replace(/\D/g, '').trim() : (record.mobileNum ? String(record.mobileNum).replace(/\D/g, '').trim() : "");
                if (cleanRecordMobile) {
                    resolvedStudent = await Student.findOne({ "studentsDetails.mobileNum": cleanRecordMobile }).populate('batches');
                }
                if (!resolvedStudent && cleanRecordMobile) {
                    const lead = await LeadManagement.findOne({
                        $or: [
                            { phoneNumber: record.mobileNum },
                            { phoneNumber: cleanRecordMobile },
                            { phoneNumber: ` ${cleanRecordMobile}` }
                        ]
                    });
                    const leadCleanMobile = lead?.phoneNumber ? String(lead.phoneNumber).replace(/\D/g, '').trim() : "";
                    const finalMobile = cleanRecordMobile || leadCleanMobile;
                    if (finalMobile) {
                        resolvedStudent = new Student({
                            studentsDetails: [{
                                studentName: record.studentName || lead?.name || "Student",
                                mobileNum: finalMobile,
                                whatsappNumber: (record.whatsappNumber ? String(record.whatsappNumber).replace(/\D/g, '').trim() : "") || finalMobile,
                                studentEmail: record.studentEmail || lead?.email || "",
                                centre: record.centre || lead?.centre?.centreName || lead?.centre || "Not Specified",
                                board: lead?.board?.boardName || lead?.board || "",
                                state: lead?.state || "",
                                schoolName: lead?.schoolName || "",
                                pincode: lead?.pincode || "",
                                address: lead?.address || "",
                                programme: record.programme || "CRP",
                                examSchema: [{
                                    examName: record.examTag?.name || "",
                                    class: record.lastClass || lead?.className?.name || lead?.className || ""
                                }]
                            }],
                            sessionExamCourse: [{
                                examTag: record.examTag?.name || "",
                                session: record.academicSession || ""
                            }],
                            isEnrolled: false,
                            department: record.department?._id || record.department,
                            counselledBy: record.counselledBy?._id || record.counselledBy,
                            createdBy: "System Healing",
                            updatedBy: "System Healing"
                        });
                        await resolvedStudent.save();
                        if (lead) {
                            await LeadManagement.findByIdAndUpdate(lead._id, { isCounseled: true });
                        }
                    }
                }
                if (!resolvedStudent && cleanRecordMobile) {
                    resolvedStudent = new Student({
                        studentsDetails: [{
                            studentName: record.studentName || "Student",
                            mobileNum: cleanRecordMobile,
                            whatsappNumber: (record.whatsappNumber ? String(record.whatsappNumber).replace(/\D/g, '').trim() : "") || cleanRecordMobile,
                            studentEmail: record.studentEmail || "",
                            centre: record.centre || "Not Specified",
                            programme: record.programme || "CRP",
                            lastClass: record.lastClass || ""
                        }],
                        sessionExamCourse: [{
                            examTag: record.examTag?.name || "",
                            session: record.academicSession || ""
                        }],
                        isEnrolled: false,
                        department: record.department?._id || record.department,
                        counselledBy: record.counselledBy?._id || record.counselledBy,
                        createdBy: "System Healing",
                        updatedBy: "System Healing"
                    });
                    await resolvedStudent.save();
                }

                if (resolvedStudent) {
                    await BoardCourseCounselling.findByIdAndUpdate(record._id, { studentId: resolvedStudent._id });
                    record.studentId = resolvedStudent;
                }
            }

            return res.status(200).json(record);
        }

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";

        let query = { status: "PENDING" };

        if (!isSuperAdmin) {
            const centres = await Centre.find({ _id: { $in: req.user.centres } });
            const centreNames = centres.map(c => c.centreName);
            query.centre = { $in: centreNames };
        }

        const counselling = await BoardCourseCounselling.find(query)
            .populate({
                path: 'studentId',
                populate: {
                    path: 'batches'
                }
            })
            .populate('boardId')
            .populate('examTag')
            .populate('selectedSubjects.subjectId')
            .populate('counselledBy', 'name email')
            .populate('department')
            .sort({ counselledDate: -1, createdAt: -1 });

        // Auto-heal any counselling records with missing/unlinked studentId in list
        for (let item of counselling) {
            if (!item.studentId) {
                try {
                    let resolvedStudent = null;
                    const cleanItemMobile = typeof item.mobileNum === 'string' ? item.mobileNum.replace(/\D/g, '').trim() : (item.mobileNum ? String(item.mobileNum).replace(/\D/g, '').trim() : "");
                    if (cleanItemMobile) {
                        resolvedStudent = await Student.findOne({ "studentsDetails.mobileNum": cleanItemMobile }).populate('batches');
                    }
                    if (!resolvedStudent && cleanItemMobile) {
                        const lead = await LeadManagement.findOne({
                            $or: [
                                { phoneNumber: item.mobileNum },
                                { phoneNumber: cleanItemMobile },
                                { phoneNumber: ` ${cleanItemMobile}` }
                            ]
                        });
                        const leadCleanMobile = lead?.phoneNumber ? String(lead.phoneNumber).replace(/\D/g, '').trim() : "";
                        const finalMobile = cleanItemMobile || leadCleanMobile;
                        if (finalMobile) {
                            resolvedStudent = new Student({
                                studentsDetails: [{
                                    studentName: item.studentName || lead?.name || "Student",
                                    mobileNum: finalMobile,
                                    whatsappNumber: (item.whatsappNumber ? String(item.whatsappNumber).replace(/\D/g, '').trim() : "") || finalMobile,
                                    studentEmail: item.studentEmail || lead?.email || "",
                                    centre: item.centre || lead?.centre?.centreName || lead?.centre || "Not Specified",
                                    programme: item.programme || "CRP",
                                    lastClass: item.lastClass || lead?.className?.name || lead?.className || ""
                                }],
                                sessionExamCourse: [{
                                    examTag: item.examTag?.name || "",
                                    session: item.academicSession || ""
                                }],
                                isEnrolled: false,
                                department: item.department?._id || item.department,
                                counselledBy: item.counselledBy?._id || item.counselledBy,
                                createdBy: "System Healing",
                                updatedBy: "System Healing"
                            });
                            await resolvedStudent.save();
                            if (lead) {
                                await LeadManagement.findByIdAndUpdate(lead._id, { isCounseled: true });
                            }
                        }
                    }
                    if (!resolvedStudent && cleanItemMobile) {
                        resolvedStudent = new Student({
                            studentsDetails: [{
                                studentName: item.studentName || "Student",
                                mobileNum: cleanItemMobile,
                                whatsappNumber: (item.whatsappNumber ? String(item.whatsappNumber).replace(/\D/g, '').trim() : "") || cleanItemMobile,
                                studentEmail: item.studentEmail || "",
                                centre: item.centre || "Not Specified",
                                programme: item.programme || "CRP",
                                lastClass: item.lastClass || ""
                            }],
                            sessionExamCourse: [{
                                examTag: item.examTag?.name || "",
                                session: item.academicSession || ""
                            }],
                            isEnrolled: false,
                            department: item.department?._id || item.department,
                            counselledBy: item.counselledBy?._id || item.counselledBy,
                            createdBy: "System Healing",
                            updatedBy: "System Healing"
                        });
                        await resolvedStudent.save();
                    }
                    if (resolvedStudent) {
                        await BoardCourseCounselling.findByIdAndUpdate(item._id, { studentId: resolvedStudent._id });
                        item.studentId = resolvedStudent;
                    }
                } catch (e) {
                    console.error("Auto-heal error for item:", item._id, e);
                }
            }
        }

        res.status(200).json(counselling);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const updateBoardCourseCounselling = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            studentName, mobileNum, whatsappNumber, studentEmail,
            dateOfBirth, gender, centre, board, state, schoolName, pincode, address,
            guardianName, guardianMobile, guardianEmail, occupation,
            programme, lastClass, examName, examStatus, markAgregate, scienceMathParcent,
            boardId, selectedSubjectIds, remarks, department, counselledBy,
            academicSession
        } = req.body;

        const counselling = await BoardCourseCounselling.findById(id);
        if (!counselling) return res.status(404).json({ message: "Counselling record not found" });

        // Clean & sanitize inputs
        const cleanMobile = typeof mobileNum === 'string' ? mobileNum.replace(/\D/g, '').trim() : (mobileNum ? String(mobileNum).replace(/\D/g, '').trim() : undefined);
        const cleanWhatsapp = typeof whatsappNumber === 'string' ? whatsappNumber.replace(/\D/g, '').trim() : (whatsappNumber ? String(whatsappNumber).replace(/\D/g, '').trim() : undefined);
        const cleanGuardianMobile = typeof guardianMobile === 'string' ? guardianMobile.replace(/\D/g, '').trim() : (guardianMobile ? String(guardianMobile).replace(/\D/g, '').trim() : undefined);
        const cleanEmail = typeof studentEmail === 'string' ? studentEmail.trim() : (studentEmail !== undefined ? String(studentEmail).trim() : undefined);
        const cleanStudentName = typeof studentName === 'string' ? studentName.trim() : (studentName !== undefined ? String(studentName).trim() : undefined);

        // Robust Department Resolution
        let resolvedDepartmentId = undefined;
        if (department && mongoose.Types.ObjectId.isValid(department)) {
            resolvedDepartmentId = department;
        } else if (department && typeof department === 'object' && department._id) {
            resolvedDepartmentId = department._id;
        } else if (department && typeof department === 'string' && department.trim()) {
            const deptDoc = await Department.findOne({
                $or: [
                    { departmentName: { $regex: new RegExp(`^${department.trim()}$`, 'i') } },
                    { departmentName: { $regex: department.trim(), $options: 'i' } }
                ]
            });
            if (deptDoc) resolvedDepartmentId = deptDoc._id;
        }

        // Robust Board Resolution
        let resolvedBoardId = undefined;
        if (boardId && mongoose.Types.ObjectId.isValid(boardId)) {
            resolvedBoardId = boardId;
        } else if (boardId && typeof boardId === 'object' && boardId._id) {
            resolvedBoardId = boardId._id;
        } else if ((boardId && typeof boardId === 'string' && boardId.trim()) || (board && typeof board === 'string' && board.trim())) {
            const searchName = (boardId || board).toString().trim();
            const boardDoc = await Boards.findOne({
                $or: [
                    { boardCourse: { $regex: new RegExp(`^${searchName}$`, 'i') } },
                    { boardName: { $regex: new RegExp(`^${searchName}$`, 'i') } }
                ]
            });
            if (boardDoc) resolvedBoardId = boardDoc._id;
        }

        // Robust Counselled By Resolution
        let resolvedCounselledBy = undefined;
        if (counselledBy && mongoose.Types.ObjectId.isValid(counselledBy)) {
            resolvedCounselledBy = counselledBy;
        } else if (counselledBy && typeof counselledBy === 'object' && counselledBy._id) {
            resolvedCounselledBy = counselledBy._id;
        } else if (typeof counselledBy === 'string' && counselledBy.trim()) {
            const userDoc = await User.findOne({ name: { $regex: new RegExp(`^${counselledBy.trim()}$`, 'i') } });
            if (userDoc) resolvedCounselledBy = userDoc._id;
        }

        // Update fields on counselling record
        if (cleanStudentName) counselling.studentName = cleanStudentName;
        if (cleanMobile) counselling.mobileNum = cleanMobile;
        if (cleanWhatsapp) counselling.whatsappNumber = cleanWhatsapp;
        if (cleanEmail !== undefined) counselling.studentEmail = cleanEmail;
        if (centre) counselling.centre = centre;
        if (programme) counselling.programme = programme;
        if (lastClass) counselling.lastClass = lastClass;
        if (resolvedBoardId) counselling.boardId = resolvedBoardId;
        if (remarks !== undefined) counselling.remarks = remarks;
        if (resolvedDepartmentId) counselling.department = resolvedDepartmentId;
        if (resolvedCounselledBy) counselling.counselledBy = resolvedCounselledBy;
        if (academicSession !== undefined) counselling.academicSession = academicSession;

        if (selectedSubjectIds) {
            const validSubjectIds = Array.isArray(selectedSubjectIds)
                ? selectedSubjectIds.filter(id => {
                    const sid = typeof id === 'object' && id !== null ? (id._id || id.subjectId) : id;
                    return sid && mongoose.Types.ObjectId.isValid(sid);
                }).map(id => typeof id === 'object' && id !== null ? (id._id || id.subjectId) : id)
                : [];
            counselling.selectedSubjects = validSubjectIds.map(subId => ({ subjectId: subId }));
        }

        // Resolve and update examTag safely
        if (examName) {
            const escaped = examName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const tagDoc = await ExamTag.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
            if (tagDoc) counselling.examTag = tagDoc._id;
        }

        // Also update the linked student profile if studentId exists
        if (counselling.studentId) {
            const updateSet = {};
            if (cleanStudentName) updateSet["studentsDetails.0.studentName"] = cleanStudentName;
            if (cleanMobile) updateSet["studentsDetails.0.mobileNum"] = cleanMobile;
            if (cleanWhatsapp) updateSet["studentsDetails.0.whatsappNumber"] = cleanWhatsapp;
            if (cleanEmail !== undefined) updateSet["studentsDetails.0.studentEmail"] = cleanEmail;
            if (dateOfBirth) updateSet["studentsDetails.0.dateOfBirth"] = dateOfBirth;
            if (gender) updateSet["studentsDetails.0.gender"] = gender;
            if (centre) updateSet["studentsDetails.0.centre"] = centre;
            if (board) updateSet["studentsDetails.0.board"] = board;
            if (state) updateSet["studentsDetails.0.state"] = state;
            if (schoolName) updateSet["studentsDetails.0.schoolName"] = schoolName;
            if (pincode) updateSet["studentsDetails.0.pincode"] = pincode;
            if (address) updateSet["studentsDetails.0.address"] = address;
            if (guardianName) updateSet["studentsDetails.0.guardianName"] = guardianName;
            if (cleanGuardianMobile) updateSet["studentsDetails.0.guardianMobile"] = cleanGuardianMobile;
            if (guardianEmail) updateSet["studentsDetails.0.guardianEmail"] = guardianEmail;
            if (occupation) updateSet["studentsDetails.0.occupation"] = occupation;
            if (programme) updateSet["studentsDetails.0.programme"] = programme;
            
            if (examName || academicSession) {
                const studentObj = await Student.findById(counselling.studentId);
                const currentTag = examName || studentObj?.sessionExamCourse?.[0]?.examTag || "";
                const currentSession = academicSession || studentObj?.sessionExamCourse?.[0]?.session || "";
                updateSet["sessionExamCourse"] = [{
                    examTag: currentTag,
                    session: currentSession,
                    targetExams: studentObj?.sessionExamCourse?.[0]?.targetExams || ""
                }];
            }
            if (resolvedDepartmentId) {
                updateSet["department"] = resolvedDepartmentId;
            }
            if (resolvedCounselledBy) {
                updateSet["counselledBy"] = resolvedCounselledBy;
            }

            if (Object.keys(updateSet).length > 0) {
                await Student.findByIdAndUpdate(counselling.studentId, { $set: updateSet });
            }
        }

        await counselling.save();

        res.status(200).json({ message: "Counselling record updated", counselling });
    } catch (error) {
        console.error("Error in updateBoardCourseCounselling:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const checkDuplicateContact = async (req, res) => {
    try {
        const { mobile, email, excludeStudentId } = req.query;
        const result = {};

        if (mobile && mobile.length === 10) {
            const existingByMobile = await Student.findOne({
                $or: [
                    { "studentsDetails.mobileNum": mobile },
                    { "studentsDetails.whatsappNumber": mobile }
                ],
                ...(excludeStudentId ? { _id: { $ne: excludeStudentId } } : {})
            }).select("studentsDetails.studentName studentsDetails.mobileNum studentsDetails.rollNo studentsDetails.admissionNumber admissionNumber rollNo");
            if (existingByMobile) {
                result.mobileTaken = true;
                result.mobileStudentName = existingByMobile.studentsDetails?.[0]?.studentName || "Another student";
                result.studentId = existingByMobile._id;
                result.admissionNumber = existingByMobile.admissionNumber || existingByMobile.rollNo || existingByMobile.studentsDetails?.[0]?.admissionNumber || existingByMobile.studentsDetails?.[0]?.rollNo || "";
            }
        }

        if (email && email.includes("@")) {
            const existingByEmail = await Student.findOne({
                "studentsDetails.studentEmail": { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                ...(excludeStudentId ? { _id: { $ne: excludeStudentId } } : {})
            }).select("studentsDetails.studentName studentsDetails.studentEmail");
            if (existingByEmail) {
                result.emailTaken = true;
                result.emailStudentName = existingByEmail.studentsDetails?.[0]?.studentName || "Another student";
            }
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteBoardCourseCounselling = async (req, res) => {
    try {
        await BoardCourseCounselling.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Counselling record deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
