import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import Class from "../../models/Master_data/Class.js";
import mongoose from "mongoose";

export const getLeadJourney = async (req, res) => {
    try {
        const { id } = req.params;

        let query = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { _id: id };
        } else {
            query = {
                $or: [
                    { phoneNumber: id },
                    { secondPhoneNumber: id }
                ]
            };
        }

        const lead = await LeadManagement.findOne(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
            .populate('campaign', 'adName')
            .populate('createdBy', 'name email')
            .lean();

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        const events = [];

        // 1. Lead Creation / Upload Event
        const isBulk = lead.source === 'Bulk Import' || /import|bulk|excel/i.test(lead.source || '');
        events.push({
            date: lead.createdAt,
            type: 'CREATION',
            label: isBulk ? 'Lead Uploaded from Excel' : 'Lead Added to System',
            title: isBulk ? 'Excel Upload' : 'Manual Entry',
            icon: 'plus',
            details: {
                createdBy: lead.createdBy?.name || 'System / Excel',
                source: lead.source || 'Direct',
                schoolName: lead.schoolName || 'N/A',
                courseName: lead.course?.courseName || lead.courseText || 'N/A',
                className: lead.className?.name || 'N/A',
                boardName: lead.board?.boardCourse || 'N/A',
                targetExam: lead.targetExam || 'N/A',
                assignedTo: lead.leadResponsibility || 'Unassigned'
            }
        });

        // 2. Follow-up / Telecalling Events
        if (Array.isArray(lead.followUps) && lead.followUps.length > 0) {
            lead.followUps.forEach((followUp, idx) => {
                events.push({
                    date: followUp.date,
                    type: 'TELECALLING',
                    label: `Follow-up Call #${idx + 1}`,
                    title: followUp.feedback || 'Call Completed',
                    icon: 'phone',
                    details: {
                        feedback: followUp.feedback,
                        remarks: followUp.remarks || 'No remarks',
                        updatedBy: followUp.updatedBy || 'Telecaller',
                        status: followUp.status,
                        nextFollowUpDate: followUp.nextFollowUpDate,
                        callDuration: followUp.callDuration || 'N/A'
                    }
                });
            });
        }

        // 3. Search for Student and Counselling/Admission events
        let student = null;
        if (lead.phoneNumber) {
            const phoneSearch = [lead.phoneNumber];
            if (lead.secondPhoneNumber) {
                phoneSearch.push(lead.secondPhoneNumber);
            }
            student = await Student.findOne({
                "studentsDetails.mobileNum": { $in: phoneSearch }
            }).populate('course', 'courseName').lean();
        }

        let hasCounselling = false;
        let hasAdmission = false;

        const counsellingEvents = [];
        const admissionEvents = [];

        // 3a. Normal Counselling Event (derived from Student creation)
        if (student) {
            hasCounselling = true;
            counsellingEvents.push({
                date: student.createdAt,
                type: 'COUNSELLING',
                label: 'Normal Counselling Registered',
                title: 'Student Profile Created',
                icon: 'user-check',
                details: {
                    counselledBy: student.counselledBy || 'N/A',
                    courseName: student.course?.courseName || 'N/A',
                    status: 'Registered',
                    remarks: 'Student profile created in the system.'
                }
            });
        }

        // 3b. Board Course Counselling Events
        if (lead.phoneNumber) {
            const phoneSearch = [lead.phoneNumber];
            if (lead.secondPhoneNumber) {
                phoneSearch.push(lead.secondPhoneNumber);
            }
            const boardCounsellings = await BoardCourseCounselling.find({
                mobileNum: { $in: phoneSearch }
            })
            .populate('boardId', 'boardCourse')
            .populate('counselledBy', 'name email')
            .lean();

            if (boardCounsellings.length > 0) {
                hasCounselling = true;
                boardCounsellings.forEach(bc => {
                    counsellingEvents.push({
                        date: bc.counselledDate || bc.createdAt,
                        type: 'COUNSELLING',
                        label: 'Board Course Counselling',
                        title: `Counselling - ${bc.boardId?.boardCourse || 'Board'}`,
                        icon: 'book-open',
                        details: {
                            counselledBy: bc.counselledBy?.name || 'N/A',
                            boardName: bc.boardId?.boardCourse || 'N/A',
                            status: bc.status || 'PENDING',
                            remarks: bc.remarks || 'No remarks',
                            programme: bc.programme || 'N/A',
                            centre: bc.centre || 'N/A'
                        }
                    });
                });
            }
        }

        // If the lead was marked isCounseled but we didn't find any student/board counselling, add a fallback event
        if (lead.isCounseled && counsellingEvents.length === 0) {
            hasCounselling = true;
            counsellingEvents.push({
                date: lead.updatedAt,
                type: 'COUNSELLING',
                label: 'Counselling Completed',
                title: 'Marked as Counselled',
                icon: 'check-circle',
                details: {
                    counselledBy: lead.leadResponsibility || 'System',
                    status: 'Counselled',
                    remarks: 'Lead status updated to counselled.'
                }
            });
        }

        // Add counselling events to timeline
        events.push(...counsellingEvents);

        // 4. Admission Events
        if (student) {
            // Find normal admissions
            const normalAdmissions = await Admission.find({ student: student._id })
                .populate('course', 'courseName')
                .populate('createdBy', 'name email')
                .lean();

            if (normalAdmissions.length > 0) {
                hasAdmission = true;
                normalAdmissions.forEach(adm => {
                    admissionEvents.push({
                        date: adm.admissionDate || adm.createdAt,
                        type: 'ADMISSION',
                        label: 'Normal Course Admission Confirmed',
                        title: `Enrolled in ${adm.course?.courseName || 'Course'}`,
                        icon: 'award',
                        details: {
                            admissionNumber: adm.admissionNumber,
                            courseName: adm.course?.courseName || 'N/A',
                            centre: adm.centre,
                            admittedBy: adm.createdBy?.name || 'N/A',
                            session: adm.academicSession,
                            admissionStatus: adm.admissionStatus,
                            totalFees: adm.totalFees,
                            downPayment: adm.downPayment
                        }
                    });
                });
            }

            // Find board course admissions
            const boardAdmissions = await BoardCourseAdmission.find({ studentId: student._id })
                .populate('boardId', 'boardCourse')
                .populate('createdBy', 'name email')
                .lean();

            if (boardAdmissions.length > 0) {
                hasAdmission = true;
                boardAdmissions.forEach(badm => {
                    admissionEvents.push({
                        date: badm.admissionDate || badm.createdAt,
                        type: 'ADMISSION',
                        label: 'Board Course Admission Confirmed',
                        title: `Enrolled in Board Course - ${badm.boardCourseName || badm.boardId?.boardCourse || 'Course'}`,
                        icon: 'award',
                        details: {
                            admissionNumber: badm.admissionNumber,
                            courseName: badm.boardCourseName || badm.boardId?.boardCourse || 'N/A',
                            centre: badm.centre,
                            admittedBy: badm.createdBy?.name || 'N/A',
                            session: badm.academicSession,
                            status: badm.status,
                            admissionFee: badm.admissionFee,
                            totalDurationMonths: badm.totalDurationMonths
                        }
                    });
                });
            }
        }

        // Add admission events to timeline
        events.push(...admissionEvents);

        // Sort all events chronologically (newest first for timeline)
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 5. Determine Last Status & Summary
        let currentStage = 'TELECALLING';
        let lastStatusText = '';

        if (hasAdmission) {
            currentStage = 'ADMITTED';
            lastStatusText = 'Lead has been admitted.';
        } else if (hasCounselling) {
            currentStage = 'COUNSELLING';
            lastStatusText = 'Lead has been counselled.';
        } else {
            // Find last telecalling event
            const telecallingLogs = events.filter(e => e.type === 'TELECALLING');
            if (telecallingLogs.length > 0) {
                // Since sorted newest first, the first one is the latest
                const latestCall = telecallingLogs[0];
                lastStatusText = `Last Call: ${latestCall.title} - ${latestCall.details.remarks}`;
            } else {
                lastStatusText = 'No calls or counselling recorded yet.';
            }
        }

        res.status(200).json({
            message: "Lead journey fetched successfully",
            lead: {
                _id: lead._id,
                name: lead.name,
                phoneNumber: lead.phoneNumber,
                secondPhoneNumber: lead.secondPhoneNumber,
                email: lead.email,
                schoolName: lead.schoolName,
                leadType: lead.leadType,
                isPriority: lead.isPriority,
                assignedTo: lead.leadResponsibility,
                source: lead.source
            },
            summary: {
                totalCalls: lead.followUps?.length || 0,
                currentStage,
                lastStatusText,
                hasCounselling,
                hasAdmission
            },
            timeline: events
        });

    } catch (err) {
        console.error("Error in getLeadJourney:", err);
        res.status(500).json({ message: "Server error fetching lead journey", error: err.message });
    }
};
