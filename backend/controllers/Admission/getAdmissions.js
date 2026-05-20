import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import CentreSchema from "../../models/Master_data/Centre.js";

export const getAdmissions = async (req, res) => {
    try {
        let query = {};
        let allowedCentreNames = [];

        // Centre-based access control
        if (req.user.role !== 'superAdmin') {
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user.centres }
            }).select('centreName');

            allowedCentreNames = userCentres.map(c => c.centreName);

            if (allowedCentreNames.length === 0) {
                return res.status(200).json([]);
            }

            // Base restriction
            query.centre = { $in: allowedCentreNames };

            // Handle query-level centre filtering
            if (req.query.centre) {
                const requestedCentres = req.query.centre.split(',').map(c => c.trim());
                const validRequestedCentres = requestedCentres.filter(c => allowedCentreNames.includes(c));

                if (validRequestedCentres.length > 0) {
                    query.centre = { $in: validRequestedCentres };
                } else {
                    query.centre = { $in: [] };
                }
            }
        } else {
            if (req.query.centre) {
                const requestedCentres = req.query.centre.split(',').map(c => c.trim());
                query.centre = { $in: requestedCentres };
            }
        }

        // Apply additional filters if provided
        if (req.query.status) query.admissionStatus = req.query.status;
        if (req.query.course) query.course = { $in: req.query.course.split(',') };
        if (req.query.class) query.class = { $in: req.query.class.split(',') };
        if (req.query.examTag) query.examTag = { $in: req.query.examTag.split(',') };

        // Date range filtering
        if (req.query.startDate || req.query.endDate) {
            query.admissionDate = {};
            if (req.query.startDate) query.admissionDate.$gte = new Date(req.query.startDate);
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                query.admissionDate.$lte = end;
            }
        }

        // Fetch Normal Admissions
        const admissions = await Admission.find(query)
            .populate({
                path: 'student',
                populate: [
                    { path: 'batches' },
                    { path: 'allocatedItems.allocatedBy', select: 'name' }
                ]
            })
            // .populate('course') // Removed automatic populate to handle missing courses manually
            .populate('class')
            .populate('board')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // Fetch Board Admissions (Sequential lookup to merge results)
        // Adjusting query for Board model (it uses studentId instead of student)
        let boardQuery = { ...query };
        if (boardQuery.student) {
            boardQuery.studentId = boardQuery.student;
            delete boardQuery.student;
        }

        const boardAdmissions = await BoardCourseAdmission.find(boardQuery)
            .populate({
                path: 'studentId',
                populate: [
                    { path: 'batches' },
                    { path: 'allocatedItems.allocatedBy', select: 'name' }
                ]
            })
            .populate('boardId')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // Standardize board admissions to match the main Admission structure
        const mappedBoardAdmissions = boardAdmissions.map(ba => ({
            ...ba,
            student: ba.studentId,
            board: ba.boardId,
            admissionType: "BOARD",
            admissionDate: ba.admissionDate || ba.createdAt,
            totalFees: ba.totalExpectedAmount,
            totalPaidAmount: ba.totalPaidAmount,
            paymentStatus: ba.totalPaidAmount >= ba.totalExpectedAmount ? "COMPLETED" : (ba.totalPaidAmount > 0 ? "PARTIAL" : "PENDING"),
            admissionStatus: ba.status || "ACTIVE"
        }));

        // Merge both lists
        const combinedAdmissions = [...admissions, ...mappedBoardAdmissions].sort((a, b) => 
            new Date(b.admissionDate || b.createdAt) - new Date(a.admissionDate || a.createdAt)
        );

        // Manual Course Population to handle orphaned courseId references
        const Course = (await import("../../models/Master_data/Courses.js")).default;
        const allCourses = await Course.find({}).lean();
        const courseMap = new Map(allCourses.map(c => [c._id.toString(), c]));

        const populatedAdmissions = combinedAdmissions.map(admission => {
            if (admission.admissionType === 'NORMAL' && admission.course) {
                const courseIdStr = admission.course.toString();
                if (courseMap.has(courseIdStr)) {
                    admission.course = courseMap.get(courseIdStr);
                } else {
                    // Keep the ID as a string if course not found (prevents it from being null)
                    admission.course = courseIdStr;
                }
            }
            return admission;
        });

        // Manually resolve counselledBy if it's an ObjectID for students
        const mongoose = (await import("mongoose")).default;
        const userIds = populatedAdmissions
            .map(a => a.student && a.student.counselledBy)
            .filter(id => id && mongoose.Types.ObjectId.isValid(id));

        const uniqueUserIds = [...new Set(userIds)];
        
        const User = (await import("../../models/User.js")).default;
        const users = await User.find({ _id: { $in: uniqueUserIds } }).select('name').lean();
        const userMap = users.reduce((map, user) => {
            map[user._id.toString().toLowerCase()] = user.name;
            return map;
        }, {});

        // Gather student details for bulk lead & counselling lookup
        const phoneNumbers = [];
        const emails = [];
        const studentIds = [];
        populatedAdmissions.forEach(a => {
            if (a.student) {
                studentIds.push(a.student._id);
                if (a.student.studentsDetails && a.student.studentsDetails[0]) {
                    const det = a.student.studentsDetails[0];
                    if (det.mobileNum) phoneNumbers.push(det.mobileNum.toString().trim());
                    if (det.whatsappNumber) phoneNumbers.push(det.whatsappNumber.toString().trim());
                    if (det.studentEmail) emails.push(det.studentEmail.toString().trim().toLowerCase());
                }
            }
        });

        // Bulk find leads matching by phone/email
        let leadMap = {};
        try {
            const LeadManagement = (await import("../../models/LeadManagement.js")).default;
            const leads = await LeadManagement.find({
                $or: [
                    { phoneNumber: { $in: phoneNumbers } },
                    { secondPhoneNumber: { $in: phoneNumbers } },
                    { email: { $in: emails } }
                ]
            }).populate('createdBy', 'name').lean();

            leads.forEach(l => {
                if (l.phoneNumber) leadMap[l.phoneNumber.toString().trim()] = l;
                if (l.secondPhoneNumber) leadMap[l.secondPhoneNumber.toString().trim()] = l;
                if (l.email) leadMap[l.email.toString().trim().toLowerCase()] = l;
            });
        } catch (leadErr) {
            console.error("Error fetching matching leads in getAdmissions:", leadErr);
        }

        // Bulk find board course counsellings
        let boardCounsMap = {};
        try {
            const BoardCourseCounselling = (await import("../../models/Admission/BoardCourseCounselling.js")).default;
            const boardCouns = await BoardCourseCounselling.find({
                studentId: { $in: studentIds }
            }).populate('counselledBy', 'name').lean();

            boardCouns.forEach(bc => {
                if (bc.studentId) {
                    boardCounsMap[bc.studentId.toString()] = bc;
                }
            });
        } catch (counsErr) {
            console.error("Error fetching board counsellings in getAdmissions:", counsErr);
        }

        const finalAdmissions = populatedAdmissions.map(admission => {
            if (admission.student && admission.student.counselledBy && mongoose.Types.ObjectId.isValid(admission.student.counselledBy)) {
                const idLower = admission.student.counselledBy.toString().toLowerCase();
                admission.student.counselledBy = userMap[idLower] || admission.student.counselledBy;
            }

            let leadBy = { name: "System", createdAt: admission.createdAt || new Date() };
            let counselledByDetails = {
                name: (admission.student && admission.student.counselledBy) || "N/A",
                createdAt: (admission.student && admission.student.createdAt) || admission.createdAt || new Date()
            };

            if (admission.student) {
                // 1. Find matching lead
                let matchedLead = null;
                if (admission.student.studentsDetails && admission.student.studentsDetails[0]) {
                    const det = admission.student.studentsDetails[0];
                    if (det.mobileNum && leadMap[det.mobileNum.toString().trim()]) {
                        matchedLead = leadMap[det.mobileNum.toString().trim()];
                    } else if (det.whatsappNumber && leadMap[det.whatsappNumber.toString().trim()]) {
                        matchedLead = leadMap[det.whatsappNumber.toString().trim()];
                    } else if (det.studentEmail && leadMap[det.studentEmail.toString().trim().toLowerCase()]) {
                        matchedLead = leadMap[det.studentEmail.toString().trim().toLowerCase()];
                    }
                }

                if (matchedLead) {
                    leadBy = {
                        name: matchedLead.createdBy?.name || "System",
                        createdAt: matchedLead.createdAt || matchedLead.updatedAt || admission.student.createdAt
                    };
                } else {
                    leadBy = {
                        name: admission.student.createdBy || "System",
                        createdAt: admission.student.createdAt || admission.createdAt
                    };
                }

                // 2. Counselled By Details
                const bcRecord = boardCounsMap[admission.student._id.toString()];
                if (bcRecord) {
                    counselledByDetails = {
                        name: bcRecord.counselledBy?.name || admission.student.counselledBy || "N/A",
                        createdAt: bcRecord.counselledDate || bcRecord.createdAt || admission.student.createdAt
                    };
                } else {
                    counselledByDetails = {
                        name: admission.student.counselledBy || "N/A",
                        createdAt: admission.student.createdAt || admission.createdAt
                    };
                }

                // Attach to student
                admission.student.leadBy = leadBy;
                admission.student.counselledByDetails = counselledByDetails;
            }

            // Attach to admission
            admission.leadBy = leadBy;
            admission.counselledByDetails = counselledByDetails;

            return admission;
        });

        res.status(200).json(finalAdmissions);
    } catch (err) {
        console.error("getAdmissions error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
