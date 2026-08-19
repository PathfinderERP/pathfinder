import LeadManagement from "../../models/LeadManagement.js";
import CampaignLead from "../../models/CampaignLead.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import StudentServiceCall from "../../models/StudentServiceCall.js";
import PNTSEStudent from "../../models/PNTSEStudent.js";
import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import Class from "../../models/Master_data/Class.js";
import mongoose from "mongoose";

export const getLeadJourney = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Identifier is required" });
        }

        const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
        let phoneSearchList = [];

        // 1. Try finding Lead first
        let leadQuery = {};
        if (isValidObjectId) {
            leadQuery = { _id: id };
        } else {
            leadQuery = {
                $or: [
                    { phoneNumber: id },
                    { secondPhoneNumber: id }
                ]
            };
        }

        let lead = await LeadManagement.findOne(leadQuery)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
            .populate('campaign', 'adName')
            .populate('createdBy', 'name email')
            .lean();

        if (!lead) {
            lead = await CampaignLead.findOne(leadQuery)
                .populate('className', 'name')
                .populate('centre', 'centreName')
                .populate('course', 'courseName')
                .populate('board', 'boardCourse')
                .populate('campaign', 'adName')
                .populate('createdBy', 'name email')
                .lean();
        }

        if (lead) {
            if (lead.phoneNumber) phoneSearchList.push(lead.phoneNumber);
            if (lead.secondPhoneNumber) phoneSearchList.push(lead.secondPhoneNumber);
        } else if (!isValidObjectId) {
            phoneSearchList.push(id);
        }

        // 2. Search for Student (either by ID, studentDetails mobile, or collected phones)
        let student = null;
        if (isValidObjectId) {
            student = await Student.findById(id)
                .populate('course', 'courseName')
                .populate('department', 'departmentName')
                .populate('batches', 'batchName')
                .lean();
        }

        if (!student && phoneSearchList.length > 0) {
            student = await Student.findOne({
                $or: [
                    { "studentsDetails.mobileNum": { $in: phoneSearchList } },
                    { "studentsDetails.whatsappNumber": { $in: phoneSearchList } }
                ]
            })
            .populate('course', 'courseName')
            .populate('department', 'departmentName')
            .populate('batches', 'batchName')
            .lean();
        }

        // 3. Search for Admission directly if not found
        let directAdmission = null;
        if (!student && isValidObjectId) {
            directAdmission = await Admission.findById(id).populate('course', 'courseName').populate('student').lean();
            if (directAdmission?.student) {
                student = typeof directAdmission.student === 'object' ? directAdmission.student : await Student.findById(directAdmission.student).populate('course', 'courseName').lean();
            }
        }

        // 4. Search for BoardCourseAdmission directly if not found
        let directBoardAdmission = null;
        if (!student && isValidObjectId) {
            directBoardAdmission = await BoardCourseAdmission.findById(id).populate('boardId', 'boardCourse').populate('studentId').lean();
            if (directBoardAdmission?.studentId) {
                student = typeof directBoardAdmission.studentId === 'object' ? directBoardAdmission.studentId : await Student.findById(directBoardAdmission.studentId).populate('course', 'courseName').lean();
            }
        }

        // 5. Search for PNTSEStudent directly if not found
        let pntseStudent = null;
        if (isValidObjectId) {
            pntseStudent = await PNTSEStudent.findById(id).populate('class', 'name').populate('centre', 'centreName').lean();
        }

        // Gather all mobile numbers associated with the student / pntse
        if (student?.studentsDetails?.length > 0) {
            student.studentsDetails.forEach(sd => {
                if (sd.mobileNum && !phoneSearchList.includes(sd.mobileNum)) phoneSearchList.push(sd.mobileNum);
                if (sd.whatsappNumber && !phoneSearchList.includes(sd.whatsappNumber)) phoneSearchList.push(sd.whatsappNumber);
            });
        }
        if (pntseStudent?.mobile && !phoneSearchList.includes(pntseStudent.mobile)) {
            phoneSearchList.push(pntseStudent.mobile);
        }
        if (pntseStudent?.secondaryMobile && !phoneSearchList.includes(pntseStudent.secondaryMobile)) {
            phoneSearchList.push(pntseStudent.secondaryMobile);
        }

        // If lead was not found previously, try searching lead by collected phones
        if (!lead && phoneSearchList.length > 0) {
            lead = await LeadManagement.findOne({
                $or: [
                    { phoneNumber: { $in: phoneSearchList } },
                    { secondPhoneNumber: { $in: phoneSearchList } }
                ]
            })
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
            .populate('campaign', 'adName')
            .populate('createdBy', 'name email')
            .lean();

            if (!lead) {
                lead = await CampaignLead.findOne({
                    $or: [
                        { phoneNumber: { $in: phoneSearchList } },
                        { secondPhoneNumber: { $in: phoneSearchList } }
                    ]
                })
                .populate('className', 'name')
                .populate('centre', 'centreName')
                .populate('course', 'courseName')
                .populate('board', 'boardCourse')
                .populate('campaign', 'adName')
                .populate('createdBy', 'name email')
                .lean();
            }
        }

        // If PNTSE was not checked, search PNTSE by phone numbers
        if (!pntseStudent && phoneSearchList.length > 0) {
            pntseStudent = await PNTSEStudent.findOne({
                $or: [
                    { mobile: { $in: phoneSearchList } },
                    { secondaryMobile: { $in: phoneSearchList } }
                ]
            }).populate('class', 'name').populate('centre', 'centreName').lean();
        }

        // If we still found no Lead, no Student, and no PNTSE record, return 404
        if (!lead && !student && !pntseStudent && !directAdmission && !directBoardAdmission) {
            return res.status(404).json({ message: "No journey record found for the provided identifier" });
        }

        const events = [];

        // ----------------------------------------------------
        // 1. LEAD CREATION / UPLOAD EVENT
        // ----------------------------------------------------
        if (lead) {
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
        }

        // ----------------------------------------------------
        // 2. LEAD FOLLOW-UPS (TELECALLING)
        // ----------------------------------------------------
        if (lead && Array.isArray(lead.followUps) && lead.followUps.length > 0) {
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

        // ----------------------------------------------------
        // 3. PNTSE REGISTRATION & EXAM EVENT
        // ----------------------------------------------------
        if (pntseStudent) {
            events.push({
                date: pntseStudent.createdAt,
                type: 'PNTSE',
                label: 'PNTSE Registration & Exam',
                title: pntseStudent.examTag ? `Exam: ${pntseStudent.examTag}` : 'PNTSE Candidate',
                icon: 'file-alt',
                details: {
                    rollNo: pntseStudent.rollNo || pntseStudent.registrationNo || 'N/A',
                    className: pntseStudent.class?.name || 'N/A',
                    centreName: pntseStudent.centre?.centreName || 'N/A',
                    schoolName: pntseStudent.schoolName || pntseStudent.school || 'N/A',
                    marks: pntseStudent.marks !== undefined ? pntseStudent.marks : 'N/A',
                    percentage: pntseStudent.percentage ? `${pntseStudent.percentage}%` : 'N/A',
                    scholarship: pntseStudent.scholarshipPercent ? `${pntseStudent.scholarshipPercent}% Scholarship` : (pntseStudent.isFree ? '100% Free / Waiver' : 'N/A'),
                    paymentStatus: pntseStudent.paymentStatus || (pntseStudent.isFree ? 'FREE' : 'PAID')
                }
            });
        }

        // ----------------------------------------------------
        // 4. COUNSELLING EVENTS (NORMAL & BOARD COURSE)
        // ----------------------------------------------------
        let hasCounselling = false;
        const counsellingEvents = [];

        // 4a. Student Profile Creation / Counselling
        if (student) {
            hasCounselling = true;
            counsellingEvents.push({
                date: student.createdAt,
                type: 'COUNSELLING',
                label: 'Normal Counselling Registered',
                title: student.course?.courseName ? `Counselled for ${student.course?.courseName}` : 'Student Profile Created',
                icon: 'user-check',
                details: {
                    counselledBy: student.counselledBy || student.leadBy || 'N/A',
                    courseName: student.course?.courseName || 'N/A',
                    programme: student.studentsDetails?.[0]?.programme || 'N/A',
                    centre: student.studentsDetails?.[0]?.centre || 'N/A',
                    status: 'Registered',
                    remarks: 'Student profile created in the system.'
                }
            });
        }

        // 4b. Board Course Counselling Events
        if (phoneSearchList.length > 0) {
            const boardCounsellings = await BoardCourseCounselling.find({
                mobileNum: { $in: phoneSearchList }
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

        // 4c. Lead marked isCounseled fallback
        if (lead?.isCounseled && counsellingEvents.length === 0) {
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

        events.push(...counsellingEvents);

        // ----------------------------------------------------
        // 5. ADMISSION EVENTS (NORMAL & BOARD COURSE)
        // ----------------------------------------------------
        let hasAdmission = false;
        let admissionTypeDetected = 'Normal Admission';
        const admissionEvents = [];
        const admissionIds = [];

        if (student) {
            // Find normal admissions
            const normalAdmissions = await Admission.find({ student: student._id })
                .populate('course', 'courseName')
                .populate('createdBy', 'name email')
                .lean();

            if (normalAdmissions.length > 0) {
                hasAdmission = true;
                normalAdmissions.forEach(adm => {
                    admissionIds.push(adm._id);
                    const isCarryForward = (adm.previousBalance && adm.previousBalance > 0) ||
                                           /carry\s*forward/i.test(adm.remarks || '') ||
                                           student.markedForCarryForward ||
                                           (student.carryForwardBalance && student.carryForwardBalance > 0);
                    const isPntse = pntseStudent !== null ||
                                    /pntse/i.test(adm.remarks || '') ||
                                    /pntse/i.test(adm.course?.courseName || '');

                    let admissionOrigin = "Normal Admission";
                    if (isCarryForward) admissionOrigin = "Carry Forward Admission";
                    else if (isPntse) admissionOrigin = "PNTSE Admission";
                    admissionTypeDetected = admissionOrigin;

                    admissionEvents.push({
                        date: adm.admissionDate || adm.createdAt,
                        type: 'ADMISSION',
                        label: `Admission Confirmed (${admissionOrigin})`,
                        title: `Enrolled in ${adm.course?.courseName || 'Course'}`,
                        icon: 'award',
                        details: {
                            admissionNumber: adm.admissionNumber,
                            courseName: adm.course?.courseName || 'N/A',
                            admissionOrigin,
                            centre: adm.centre,
                            admittedBy: adm.createdBy?.name || 'N/A',
                            session: adm.academicSession,
                            admissionStatus: adm.admissionStatus,
                            totalFees: adm.totalFees,
                            downPayment: adm.downPayment,
                            previousBalance: adm.previousBalance || 0,
                            remarks: adm.remarks || ''
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
                if (admissionEvents.length === 0) admissionTypeDetected = "Board Course Admission";
                boardAdmissions.forEach(badm => {
                    admissionIds.push(badm._id);
                    admissionEvents.push({
                        date: badm.admissionDate || badm.createdAt,
                        type: 'ADMISSION',
                        label: 'Board Course Admission Confirmed',
                        title: `Enrolled in Board Course - ${badm.boardCourseName || badm.boardId?.boardCourse || 'Course'}`,
                        icon: 'award',
                        details: {
                            admissionNumber: badm.admissionNumber,
                            courseName: badm.boardCourseName || badm.boardId?.boardCourse || 'N/A',
                            admissionOrigin: 'Board Course Admission',
                            centre: badm.centre,
                            admittedBy: badm.createdBy?.name || 'N/A',
                            session: badm.academicSession,
                            status: badm.status,
                            admissionFee: badm.admissionFee,
                            totalDurationMonths: badm.totalDurationMonths,
                            remarks: badm.remarks || ''
                        }
                    });
                });
            }
        } else if (directAdmission) {
            hasAdmission = true;
            admissionIds.push(directAdmission._id);
            admissionEvents.push({
                date: directAdmission.admissionDate || directAdmission.createdAt,
                type: 'ADMISSION',
                label: 'Admission Confirmed',
                title: `Enrolled in ${directAdmission.course?.courseName || 'Course'}`,
                icon: 'award',
                details: {
                    admissionNumber: directAdmission.admissionNumber,
                    courseName: directAdmission.course?.courseName || 'N/A',
                    admissionOrigin: 'Normal Admission',
                    centre: directAdmission.centre,
                    session: directAdmission.academicSession,
                    admissionStatus: directAdmission.admissionStatus,
                    totalFees: directAdmission.totalFees,
                    downPayment: directAdmission.downPayment
                }
            });
        } else if (directBoardAdmission) {
            hasAdmission = true;
            admissionIds.push(directBoardAdmission._id);
            admissionEvents.push({
                date: directBoardAdmission.admissionDate || directBoardAdmission.createdAt,
                type: 'ADMISSION',
                label: 'Board Course Admission Confirmed',
                title: `Enrolled in Board Course - ${directBoardAdmission.boardCourseName || 'Course'}`,
                icon: 'award',
                details: {
                    admissionNumber: directBoardAdmission.admissionNumber,
                    courseName: directBoardAdmission.boardCourseName || 'N/A',
                    admissionOrigin: 'Board Course Admission',
                    centre: directBoardAdmission.centre,
                    session: directBoardAdmission.academicSession,
                    status: directBoardAdmission.status
                }
            });
        }

        events.push(...admissionEvents);

        // ----------------------------------------------------
        // 6. CARRY FORWARD EVENT (IF APPLICABLE)
        // ----------------------------------------------------
        const hasCarryForwardBalance = student && (student.carryForwardBalance > 0 || student.markedForCarryForward);
        if (hasCarryForwardBalance) {
            events.push({
                date: student.updatedAt || student.createdAt,
                type: 'CARRY_FORWARD',
                label: 'Carry Forward Balance Recorded',
                title: `Carry Forward Balance: ₹${(student.carryForwardBalance || 0).toLocaleString()}`,
                icon: 'sync-alt',
                details: {
                    balance: student.carryForwardBalance || 0,
                    markedForCarryForward: student.markedForCarryForward ? 'Yes' : 'No',
                    status: 'Active',
                    remarks: 'Student record carries forward balance from previous courses/sessions.'
                }
            });
        }

        // ----------------------------------------------------
        // 7. STUDENT SERVICE CALL EVENTS
        // ----------------------------------------------------
        const serviceCallQuery = [];
        if (student?._id) {
            serviceCallQuery.push({ student: student._id });
        }
        if (admissionIds.length > 0) {
            serviceCallQuery.push({ admission: { $in: admissionIds } });
        }
        if (phoneSearchList.length > 0) {
            serviceCallQuery.push({ studentPhone: { $in: phoneSearchList } });
        }

        let studentServiceCalls = [];
        if (serviceCallQuery.length > 0) {
            studentServiceCalls = await StudentServiceCall.find({ $or: serviceCallQuery })
                .populate('user', 'name role')
                .lean();

            studentServiceCalls.forEach((sc, idx) => {
                events.push({
                    date: sc.createdAt || sc.callDate,
                    type: 'SERVICE_CALL',
                    label: `Service Call #${idx + 1} (${sc.servicePurpose})`,
                    title: sc.servicePurpose,
                    icon: 'headset',
                    details: {
                        servicePurpose: sc.servicePurpose,
                        status: sc.status || 'Neutral',
                        calledBy: sc.userName || sc.user?.name || 'Staff',
                        userRole: sc.userRole || sc.user?.role || '',
                        remarks: sc.remarks || 'No remarks',
                        nextFollowUpDate: sc.nextFollowUpDate || '',
                        centreName: sc.centreName || '',
                        enrollmentNo: sc.enrollmentNo || '',
                        studentPhone: sc.studentPhone || ''
                    }
                });
            });
        }

        // Sort all events chronologically (newest first for timeline)
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        // ----------------------------------------------------
        // 8. DETERMINE SUMMARY & CURRENT STAGE
        // ----------------------------------------------------
        const totalTelecalling = lead?.followUps?.length || 0;
        const totalServiceCalls = studentServiceCalls.length;
        const totalCalls = totalTelecalling + totalServiceCalls;

        let currentStage = 'NEW';
        let lastStatusText = '';

        if (hasAdmission) {
            currentStage = `ADMITTED (${admissionTypeDetected.toUpperCase()})`;
            lastStatusText = `Student admitted via ${admissionTypeDetected}.`;
        } else if (hasCounselling) {
            currentStage = 'COUNSELLING';
            lastStatusText = 'Student has been counselled.';
        } else if (pntseStudent) {
            currentStage = 'PNTSE CANDIDATE';
            lastStatusText = `PNTSE Exam registered: ${pntseStudent.examTag || 'Standard'}.`;
        } else if (totalCalls > 0) {
            currentStage = 'CALLING';
            const latestCall = events.find(e => e.type === 'SERVICE_CALL' || e.type === 'TELECALLING');
            lastStatusText = latestCall ? `${latestCall.label}: ${latestCall.details?.remarks || latestCall.title}` : 'Call recorded.';
        } else {
            lastStatusText = 'No interactions recorded yet.';
        }

        // Determine primary contact / student details for header
        const primaryDetails = {
            _id: student?._id || lead?._id || pntseStudent?._id || id,
            name: student?.studentsDetails?.[0]?.studentName || lead?.name || pntseStudent?.name || 'Student',
            phoneNumber: student?.studentsDetails?.[0]?.mobileNum || lead?.phoneNumber || pntseStudent?.mobile || (phoneSearchList[0] || 'N/A'),
            secondPhoneNumber: student?.studentsDetails?.[0]?.whatsappNumber || lead?.secondPhoneNumber || pntseStudent?.secondaryMobile || '',
            email: student?.studentsDetails?.[0]?.studentEmail || lead?.email || pntseStudent?.email || '',
            schoolName: student?.studentsDetails?.[0]?.schoolName || lead?.schoolName || pntseStudent?.schoolName || '',
            centreName: student?.studentsDetails?.[0]?.centre || lead?.centre?.centreName || pntseStudent?.centre?.centreName || '',
            courseName: student?.course?.courseName || lead?.course?.courseName || lead?.courseText || '',
            enrollmentNo: student?.uid || student?.studentsDetails?.[0]?.enrollmentNo || '',
            leadType: lead?.leadType || '',
            isPriority: lead?.isPriority || false,
            assignedTo: lead?.leadResponsibility || student?.counselledBy || 'Staff',
            source: lead?.source || (pntseStudent ? 'PNTSE' : 'ERP Direct')
        };

        res.status(200).json({
            message: "Student journey fetched successfully",
            lead: primaryDetails,
            summary: {
                totalCalls,
                telecallingCount: totalTelecalling,
                serviceCallsCount: totalServiceCalls,
                currentStage,
                lastStatusText,
                hasCounselling,
                hasAdmission,
                admissionType: admissionTypeDetected,
                hasCarryForward: Boolean(hasCarryForwardBalance),
                carryForwardBalance: student?.carryForwardBalance || 0,
                hasPNTSE: Boolean(pntseStudent)
            },
            timeline: events
        });

    } catch (err) {
        console.error("Error in getLeadJourney:", err);
        res.status(500).json({ message: "Server error fetching lead journey", error: err.message });
    }
};
