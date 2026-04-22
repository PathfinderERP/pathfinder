import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import Centre from "../../models/Master_data/Centre.js";


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

        // If no studentId, check if student exists by mobile number or create a new one
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
            centre,
            programme,
            lastClass,
            boardId,
            selectedSubjects: selectedSubjectIds.map(id => ({ subjectId: id })),
            remarks,
            counselledBy: req.user._id,
        });

        await counselling.save();
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
        res.status(200).json(counselling);
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
