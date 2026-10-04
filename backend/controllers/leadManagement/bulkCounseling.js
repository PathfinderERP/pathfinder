import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import Department from "../../models/Master_data/Department.js";
import Boards from "../../models/Master_data/Boards.js";
import mongoose from "mongoose";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

const sanitizePhone = (phone, fallback = "9876543210") => {
    if (!phone) return fallback;
    const digits = phone.toString().replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) return digits;
    if (digits.length > 15) return digits.slice(-10);
    return fallback;
};

/**
 * Bulk mark leads as Walk-In (Unlimited / filtered selection)
 */
export const bulkTagWalkIn = async (req, res) => {
    try {
        const { leadIds, filters, isAllFilteredSelected } = req.body;

        let query = {};
        if (isAllFilteredSelected && filters) {
            query = await buildLeadQuery(filters, req.user);
        } else if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
            query = { _id: { $in: leadIds } };
        } else {
            return res.status(400).json({ message: "No leads selected for Walk-In tagging." });
        }

        const now = new Date();
        const walkInBy = req.user?.id || req.user?._id;

        const updateResult = await LeadManagement.updateMany(
            query,
            {
                $set: {
                    isWalkIn: true,
                    source: "Walk In",
                    walkInDate: now,
                    walkInBy: walkInBy
                }
            }
        );

        const updatedCount = updateResult.modifiedCount || updateResult.nModified || updateResult.matchedCount || 0;

        return res.status(200).json({
            success: true,
            message: `${updatedCount} ${updatedCount === 1 ? 'student' : 'students'} tagged as Walk-In successfully.`,
            count: updatedCount
        });
    } catch (err) {
        console.error("Bulk Tag Walk-In error:", err);
        return res.status(500).json({ message: "Server error marking students as Walk-In", error: err.message });
    }
};

/**
 * Bulk convert leads to Counselling (Unlimited / filtered selection)
 * Can convert to either Normal Course Counselling or Board Course Counselling
 */
export const bulkConvertToCounseling = async (req, res) => {
    try {
        const { leadIds, filters, isAllFilteredSelected, courseType, remarks, departmentId, boardId } = req.body;

        let query = {};
        if (isAllFilteredSelected && filters) {
            query = await buildLeadQuery(filters, req.user);
        } else if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
            query = { _id: { $in: leadIds } };
        } else {
            return res.status(400).json({ message: "No students selected for counselling conversion." });
        }

        if (!courseType || !['normal', 'board'].includes(courseType)) {
            return res.status(400).json({ message: "Invalid course type. Choose either 'normal' or 'board'." });
        }

        // Fetch the leads with populated references
        const leads = await LeadManagement.find(query)
            .populate(['className', 'centre', 'course', 'board']);

        if (leads.length === 0) {
            return res.status(404).json({ message: "No valid leads found matching the criteria." });
        }

        // Enforce Walk-In check: without clicking Walk-In, conversion is prohibited
        const notWalkInLeads = leads.filter(lead => !lead.isWalkIn && lead.source?.toLowerCase() !== 'walk in');
        if (notWalkInLeads.length > 0) {
            return res.status(400).json({
                message: "All selected students must be marked as Walk-In first before converting to counselling.",
                pendingWalkInNames: notWalkInLeads.slice(0, 5).map(l => l.name),
                pendingCount: notWalkInLeads.length
            });
        }

        const currentUserId = req.user?.id || req.user?._id;
        const currentUserName = req.user?.name || "Counsellor";

        // Find fallback department and board in case lead lacks them
        let defaultDept = null;
        let defaultBoard = null;

        if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            defaultDept = await Department.findById(departmentId);
        }
        if (!defaultDept) {
            defaultDept = await Department.findOne();
        }

        if (boardId && mongoose.Types.ObjectId.isValid(boardId)) {
            defaultBoard = await Boards.findById(boardId);
        }
        if (!defaultBoard) {
            defaultBoard = await Boards.findOne();
        }

        const convertedRecords = [];

        if (courseType === 'normal') {
            // Normal Course Counselling Pipeline -> Saves to Student model, visible in /admissions
            for (const lead of leads) {
                const mobile = sanitizePhone(lead.phoneNumber || lead.secondPhoneNumber);
                const secondMobile = sanitizePhone(lead.secondPhoneNumber || lead.phoneNumber, mobile);
                const centreName = lead.centre?.centreName || (typeof lead.centre === 'string' ? lead.centre : "Main Campus");
                const boardName = lead.board?.boardCourse || lead.board?.boardName || (typeof lead.board === 'string' ? lead.board : "CBSE");
                const className = lead.className?.name || (typeof lead.className === 'string' ? lead.className : "Class 10");
                const courseName = lead.course?.courseName || lead.courseText || "Regular Course";
                const studentEmail = lead.email && lead.email.includes("@") ? lead.email : `${mobile}@student.pathfinder.edu`;

                let student = await Student.findOne({ "studentsDetails.mobileNum": mobile });

                if (!student) {
                    student = new Student({
                        studentsDetails: [{
                            studentName: lead.name,
                            mobileNum: mobile,
                            whatsappNumber: secondMobile,
                            studentEmail: studentEmail,
                            centre: centreName,
                            board: boardName,
                            schoolName: lead.schoolName || "",
                            source: "Walk In",
                            programme: lead.programme || "CRP",
                            guardians: [{
                                guardianName: lead.fatherName || lead.guardianName || "Parent / Guardian",
                                guardianMobile: sanitizePhone(lead.fatherMobile || lead.guardianMobile, mobile),
                                guardianEmail: lead.guardianEmail || ""
                            }],
                            examSchema: [{
                                examName: courseName,
                                class: className
                            }]
                        }],
                        guardians: [{
                            guardianName: lead.fatherName || lead.guardianName || "Parent / Guardian",
                            guardianMobile: sanitizePhone(lead.fatherMobile || lead.guardianMobile, mobile)
                        }],
                        examSchema: [{
                            examName: courseName,
                            class: className
                        }],
                        sessionExamCourse: [{
                            session: lead.academicSession || new Date().getFullYear().toString(),
                            examTag: courseName
                        }],
                        course: lead.course?._id || lead.course || null,
                        department: lead.department || defaultDept?._id || null,
                        counselledBy: currentUserName,
                        isEnrolled: false,
                        status: 'Active',
                        createdBy: currentUserName,
                        updatedBy: currentUserName,
                        updatedByUserId: currentUserId
                    });
                    await student.save();
                } else {
                    // Update existing student's counselling status if not enrolled
                    student.counselledBy = currentUserName;
                    student.updatedBy = currentUserName;
                    student.updatedByUserId = currentUserId;
                    await student.save();
                }

                // Mark lead as counseled
                await LeadManagement.findByIdAndUpdate(lead._id, {
                    isCounseled: true,
                    leadResponsibility: currentUserName
                });

                convertedRecords.push({ leadId: lead._id, studentId: student._id, name: lead.name });
            }

            return res.status(200).json({
                success: true,
                message: `Successfully converted ${convertedRecords.length} students to Normal Course Counselling.`,
                count: convertedRecords.length,
                courseType: 'normal',
                targetUrl: '/admissions',
                records: convertedRecords
            });

        } else if (courseType === 'board') {
            // Board Course Counselling Pipeline -> Saves to BoardCourseCounselling model, visible in /board-admissions?tab=Counselling
            for (const lead of leads) {
                const mobile = sanitizePhone(lead.phoneNumber || lead.secondPhoneNumber);
                const secondMobile = sanitizePhone(lead.secondPhoneNumber || lead.phoneNumber, mobile);
                const centreName = lead.centre?.centreName || (typeof lead.centre === 'string' ? lead.centre : "Main Campus");
                const studentEmail = lead.email && lead.email.includes("@") ? lead.email : `${mobile}@student.pathfinder.edu`;

                // Resolve class digits/string
                let classVal = "10";
                if (lead.className?.name) {
                    const match = lead.className.name.match(/\d+/);
                    classVal = match ? match[0] : lead.className.name;
                } else if (typeof lead.className === 'string') {
                    const match = lead.className.match(/\d+/);
                    classVal = match ? match[0] : lead.className;
                }

                const resolvedBoardId = lead.board?._id || defaultBoard?._id;
                const resolvedDeptId = lead.department || defaultDept?._id;

                if (!resolvedDeptId) {
                    return res.status(400).json({ message: "Department is required for Board Course Counselling." });
                }
                if (!resolvedBoardId) {
                    return res.status(400).json({ message: "Board is required for Board Course Counselling." });
                }

                // Ensure a base Student document exists
                let student = await Student.findOne({ "studentsDetails.mobileNum": mobile });
                if (!student) {
                    student = new Student({
                        studentsDetails: [{
                            studentName: lead.name,
                            mobileNum: mobile,
                            whatsappNumber: secondMobile,
                            studentEmail: studentEmail,
                            centre: centreName,
                            board: lead.board?.boardCourse || lead.board?.boardName || defaultBoard?.boardCourse || "CBSE",
                            schoolName: lead.schoolName || "",
                            source: "Walk In",
                            programme: lead.programme || "CRP"
                        }],
                        isEnrolled: false,
                        counselledBy: currentUserName,
                        department: resolvedDeptId,
                        status: 'Active',
                        createdBy: currentUserName,
                        updatedBy: currentUserName
                    });
                    await student.save();
                }

                // Create Board Course Counselling document
                const boardCounselingDoc = new BoardCourseCounselling({
                    studentId: student._id,
                    studentName: lead.name,
                    mobileNum: mobile,
                    studentEmail: studentEmail,
                    centre: centreName,
                    boardId: resolvedBoardId,
                    department: resolvedDeptId,
                    lastClass: classVal,
                    academicSession: lead.academicSession || new Date().getFullYear().toString(),
                    programme: lead.programme === 'NCRP' ? 'NCRP' : 'CRP',
                    counselledBy: currentUserId,
                    counselledDate: new Date(),
                    status: "PENDING",
                    remarks: remarks || lead.remarks || "Bulk counselled from Lead Management"
                });

                await boardCounselingDoc.save();

                // Mark lead as counseled
                await LeadManagement.findByIdAndUpdate(lead._id, {
                    isCounseled: true,
                    leadResponsibility: currentUserName
                });

                convertedRecords.push({ leadId: lead._id, counsellingId: boardCounselingDoc._id, name: lead.name });
            }

            return res.status(200).json({
                success: true,
                message: `Successfully converted ${convertedRecords.length} students to Board Course Counselling.`,
                count: convertedRecords.length,
                courseType: 'board',
                targetUrl: '/board-admissions?tab=Counselling',
                records: convertedRecords
            });
        }
    } catch (err) {
        console.error("Bulk Convert To Counselling error:", err);
        return res.status(500).json({ message: "Server error during bulk counselling conversion", error: err.message });
    }
};
