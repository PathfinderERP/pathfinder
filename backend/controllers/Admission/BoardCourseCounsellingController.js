import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import Centre from "../../models/Master_data/Centre.js";
import LeadManagement from "../../models/LeadManagement.js";
import { getCache, setCache, clearCachePattern, generateCacheKey } from "../../utils/redisCache.js";


export const createBoardCourseCounselling = async (req, res) => {
    try {
        let { 
            studentId, studentName, mobileNum, whatsappNumber, studentEmail,
            dateOfBirth, gender, centre, board, state, schoolName, pincode, address, 
            class: studentClass, examTag, programme, 
            guardianName, guardianMobile, guardianEmail, relation, occupation,
            examName, lastClass, examStatus, markAgregate, scienceMathParcent,
            boardId, selectedSubjectIds, remarks 
        } = req.body;

        // Server-side duplicate validation BEFORE creating
        if (mobileNum) {
            const dupMobile = await Student.findOne({ "studentsDetails.mobileNum": mobileNum });
            if (dupMobile) {
                const dupName = dupMobile.studentsDetails?.[0]?.studentName || "Another student";
                return res.status(409).json({
                    message: `Mobile number already registered to "${dupName}". Cannot create counselling record.`,
                    field: "mobileNum",
                    takenBy: dupName
                });
            }
        }
        if (studentEmail && studentEmail.includes("@")) {
            const dupEmail = await Student.findOne({ "studentsDetails.studentEmail": new RegExp(`^${studentEmail}$`, 'i') });
            if (dupEmail) {
                const dupName = dupEmail.studentsDetails?.[0]?.studentName || "Another student";
                return res.status(409).json({
                    message: `Email already registered to "${dupName}". Cannot create counselling record.`,
                    field: "studentEmail",
                    takenBy: dupName
                });
            }
        }

        // If studentId is provided, check if it's a valid Student or a Lead
        if (studentId) {
            const existingStudent = await Student.findById(studentId);
            if (!existingStudent) {
                // Not a student, check if it's a Lead
                const lead = await LeadManagement.findById(studentId);
                if (lead) {
                    // It's a lead! Check if a student with this mobile already exists
                    let student = await Student.findOne({ "studentsDetails.mobileNum": mobileNum || lead.phoneNumber });
                    if (!student) {
                        // Create a new student from lead/form data
                        student = new Student({
                            studentsDetails: [{
                                studentName: studentName || lead.name,
                                mobileNum: mobileNum || lead.phoneNumber,
                                whatsappNumber: whatsappNumber || mobileNum || lead.phoneNumber,
                                studentEmail: studentEmail || lead.email,
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
                                    guardianMobile,
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
                                guardianMobile,
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
                            isEnrolled: false,
                            counselledBy: req.user?._id,
                            createdBy: req.user?.name || "System",
                            updatedBy: req.user?.name || "System",
                            updatedByUserId: req.user?._id
                        });
                        await student.save();
                    }
                    studentId = student._id;
                    // Mark lead as counseled
                    await LeadManagement.findByIdAndUpdate(lead._id, { isCounseled: true });
                }
            }
        }

        // If no studentId at this point, check if student exists by mobile number or create a new one
        if (!studentId) {
            let student = await Student.findOne({ "studentsDetails.mobileNum": mobileNum });
            if (!student) {
                student = new Student({
                    studentsDetails: [{
                        studentName,
                        mobileNum,
                        whatsappNumber: whatsappNumber || mobileNum,
                        studentEmail,
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
                            guardianMobile,
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
                        guardianMobile,
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
                    isEnrolled: false,
                    counselledBy: req.user?._id,
                    createdBy: req.user?.name || "System",
                    updatedBy: req.user?.name || "System",
                    updatedByUserId: req.user?._id
                });
                await student.save();
            } else {
                // If student found by mobile, update fields if provided and differing
                const updateSet = {};
                if (studentName && studentName !== student.studentsDetails?.[0]?.studentName) {
                    updateSet["studentsDetails.0.studentName"] = studentName;
                }
                if (programme && programme !== student.studentsDetails?.[0]?.programme) {
                    updateSet["studentsDetails.0.programme"] = programme;
                }
                if (Object.keys(updateSet).length > 0) {
                    await Student.findByIdAndUpdate(student._id, { $set: updateSet });
                }
            }
            studentId = student._id;
        }

        // Ensure centre, studentName and mobileNum are available if NOT provided in req.body
        if (studentId && (!studentName || !mobileNum || !centre)) {
            const studentData = await Student.findById(studentId);
            if (studentData && studentData.studentsDetails?.[0]) {
                const officialDetails = studentData.studentsDetails[0];
                studentName = studentName || officialDetails.studentName;
                mobileNum = mobileNum || officialDetails.mobileNum;
                centre = centre || officialDetails.centre;
            }
        }

        const counselling = new BoardCourseCounselling({
            studentId,
            studentName,
            mobileNum,
            studentEmail,
            centre,
            programme,
            lastClass,
            boardId,
            selectedSubjects: selectedSubjectIds.map(id => ({ subjectId: id })),
            remarks,
            counselledBy: req.user._id,
        });

        await counselling.save();

        // Invalidate counselling cache
        await clearCachePattern("board:counselling:*");

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
            const record = await BoardCourseCounselling.findById(id)
                .populate({
                    path: 'studentId',
                    populate: {
                        path: 'batches'
                    }
                })
                .populate('boardId')
                .populate('selectedSubjects.subjectId')
                .populate('counselledBy', 'name email');
            
            if (!record) return res.status(404).json({ message: "Counselling record not found" });
            return res.status(200).json(record);
        }

        const isSuperAdmin = req.user.role === "superAdmin" || req.user.role === "Super Admin";

        // REDIS CACHING START
        const cacheKey = generateCacheKey("board:counselling:list", {
            query: req.query,
            userId: req.user._id,
            role: req.user.role,
            centres: req.user.centres
        });
        const cachedData = await getCache(cacheKey);
        if (cachedData) return res.status(200).json(cachedData);
        // REDIS CACHING END

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
            .populate('selectedSubjects.subjectId')
            .populate('counselledBy', 'name email')
            .sort({ counselledDate: -1, createdAt: -1 });

        // Cache for 10 minutes
        await setCache(cacheKey, counselling, 600);

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
            boardId, selectedSubjectIds, remarks
        } = req.body;

        const counselling = await BoardCourseCounselling.findById(id);
        if (!counselling) return res.status(404).json({ message: "Counselling record not found" });

        // Update fields
        if (studentName) counselling.studentName = studentName;
        if (mobileNum) counselling.mobileNum = mobileNum;
        if (studentEmail) counselling.studentEmail = studentEmail;
        if (centre) counselling.centre = centre;
        if (programme) counselling.programme = programme;
        if (lastClass) counselling.lastClass = lastClass;
        if (boardId) counselling.boardId = boardId;
        if (remarks !== undefined) counselling.remarks = remarks;
        if (selectedSubjectIds) {
            counselling.selectedSubjects = selectedSubjectIds.map(subId => ({ subjectId: subId }));
        }

        // Also update the linked student profile if studentId exists
        if (counselling.studentId) {
            const updateSet = {};
            if (studentName) updateSet["studentsDetails.0.studentName"] = studentName;
            if (mobileNum) updateSet["studentsDetails.0.mobileNum"] = mobileNum;
            if (whatsappNumber) updateSet["studentsDetails.0.whatsappNumber"] = whatsappNumber;
            if (studentEmail) updateSet["studentsDetails.0.studentEmail"] = studentEmail;
            if (dateOfBirth) updateSet["studentsDetails.0.dateOfBirth"] = dateOfBirth;
            if (gender) updateSet["studentsDetails.0.gender"] = gender;
            if (centre) updateSet["studentsDetails.0.centre"] = centre;
            if (board) updateSet["studentsDetails.0.board"] = board;
            if (state) updateSet["studentsDetails.0.state"] = state;
            if (schoolName) updateSet["studentsDetails.0.schoolName"] = schoolName;
            if (pincode) updateSet["studentsDetails.0.pincode"] = pincode;
            if (address) updateSet["studentsDetails.0.address"] = address;
            if (guardianName) updateSet["studentsDetails.0.guardianName"] = guardianName;
            if (guardianMobile) updateSet["studentsDetails.0.guardianMobile"] = guardianMobile;
            if (guardianEmail) updateSet["studentsDetails.0.guardianEmail"] = guardianEmail;
            if (occupation) updateSet["studentsDetails.0.occupation"] = occupation;
            if (programme) updateSet["studentsDetails.0.programme"] = programme;
            if (Object.keys(updateSet).length > 0) {
                await Student.findByIdAndUpdate(counselling.studentId, { $set: updateSet });
            }
        }

        await counselling.save();

        // Invalidate counselling cache
        await clearCachePattern("board:counselling:*");

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
                "studentsDetails.mobileNum": mobile,
                ...(excludeStudentId ? { _id: { $ne: excludeStudentId } } : {})
            }).select("studentsDetails.studentName studentsDetails.mobileNum");
            if (existingByMobile) {
                result.mobileTaken = true;
                result.mobileStudentName = existingByMobile.studentsDetails?.[0]?.studentName || "Another student";
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

        // Invalidate counselling cache
        await clearCachePattern("board:counselling:*");

        res.status(200).json({ message: "Counselling record deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
