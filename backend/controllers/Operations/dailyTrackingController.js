import CentreSchema from "../../models/Master_data/Centre.js";
import LeadManagement from "../../models/LeadManagement.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import EmployeeAttendance from "../../models/Attendance/EmployeeAttendance.js";
import Payment from "../../models/Payment/Payment.js";
import User from "../../models/User.js";
import Student from "../../models/Students.js";
import Employee from "../../models/HR/Employee.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";
import mongoose from "mongoose";
import XLSX from "xlsx";

export const getDailyTracking = async (req, res) => {
    try {
        const { date } = req.query;
        let today = new Date();
        if (date) {
            today = new Date(date);
        }
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateFilter = { $gte: today, $lt: tomorrow };

        // 1. Fetch all centers
        const centers = await CentreSchema.find({}).lean();

        // Prepare tracking data
        const trackingData = await Promise.all(centers.map(async (center) => {
            const centerId = center._id;

            // --- Daily Calls & Counselled ---
            const dailyCallsCount = await LeadManagement.countDocuments({
                centre: centerId,
                $or: [
                    { createdAt: dateFilter },
                    { "followUps.date": dateFilter }
                ]
            });

            // --- Daily Walk-ins ---
            const walkInsCount = await LeadManagement.countDocuments({
                centre: centerId,
                source: { $regex: /^walk[- ]?in$/i },
                createdAt: dateFilter
            });

            // Counseling Analysis (Union of direct records and admissions)
            const centerCounsellingNormalLeads = await LeadManagement.find({
                centre: centerId,
                isCounseled: true,
                updatedAt: dateFilter
            }).distinct('_id');

            const centerAdmittedNormalStudents = await Admission.find({
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            }).distinct('student');

            const counselledNormalCount = new Set([
                ...centerCounsellingNormalLeads.map(id => id.toString()),
                ...centerAdmittedNormalStudents.map(id => id.toString())
            ]).size;

            const centerCounsellingBoardRecords = await BoardCourseCounselling.find({
                centre: centerId,
                counselledDate: dateFilter
            }).distinct('studentId');

            const centerAdmittedBoardStudents = await BoardCourseAdmission.find({
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            }).distinct('studentId');

            const counselledBoardCount = new Set([
                ...centerCounsellingBoardRecords.map(id => id.toString()),
                ...centerAdmittedBoardStudents.map(id => id.toString())
            ]).size;

            // --- Admissions (Total records) ---
            const admissionNormalCount = await Admission.countDocuments({
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            });

            const admissionBoardCount = await BoardCourseAdmission.countDocuments({
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            });

            // --- Attendance ---
            const staffPresentCount = await EmployeeAttendance.countDocuments({
                centreId: centerId,
                date: dateFilter,
                status: { $in: ["Present", "Late", "Half Day", "Early Leave", "Overtime", "Forgot to Checkout"] }
            });

            const staffTotalCount = await User.countDocuments({
                centres: centerId,
                isActive: true
            });

            // --- Collections ---
            // To get collections, we need to find payments for admissions linked to this center.
            const admissionsForCenter = await Admission.find({ centre: new RegExp(`^${center.centreName}$`, 'i') }).select('_id');
            const boardAdmissionsForCenter = await BoardCourseAdmission.find({ centre: new RegExp(`^${center.centreName}$`, 'i') }).select('_id');

            const admissionIds = [
                ...admissionsForCenter.map(a => a._id),
                ...boardAdmissionsForCenter.map(a => a._id)
            ];

            const collections = await Payment.aggregate([
                {
                    $match: {
                        admission: { $in: admissionIds },
                        paidAmount: { $gt: 0 },
                        billId: { $regex: /^PATH/i },
                        $or: [
                            { status: { $in: ["PAID", "PARTIAL"] } },
                            {
                                paymentMethod: "CHEQUE",
                                status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
                            }
                        ],
                        $expr: {
                            $and: [
                                {
                                    $gte: [
                                        { $ifNull: ["$receivedDate", "$paidDate"] },
                                        today
                                    ]
                                },
                                {
                                    $lt: [
                                        { $ifNull: ["$receivedDate", "$paidDate"] },
                                        tomorrow
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$paidAmount" },
                        admission: {
                            $sum: {
                                $cond: [{ $eq: ["$installmentNumber", 0] }, "$paidAmount", 0]
                            }
                        },
                        installment: {
                            $sum: {
                                $cond: [{ $gt: ["$installmentNumber", 0] }, "$paidAmount", 0]
                            }
                        }
                    }
                }
            ]);

            const totalCollections = collections.length > 0 ? collections[0].total : 0;
            const collectionsAdmission = collections.length > 0 ? collections[0].admission : 0;
            const collectionsInstallment = collections.length > 0 ? collections[0].installment : 0;

            return {
                id: center._id,
                name: center.centreName,
                head: "Not Assigned", // Optional: logic to find Center Head
                status: "Active",
                staffPresent: staffPresentCount,
                staffTotal: staffTotalCount > 0 ? staffTotalCount : 0,
                dailyCalls: dailyCallsCount,
                walkIns: walkInsCount,
                counselledNormal: counselledNormalCount,
                counselledBoard: counselledBoardCount,
                admissionNormal: admissionNormalCount,
                admissionBoard: admissionBoardCount,
                collections: `₹${totalCollections.toLocaleString()}`,
                collectionsVal: totalCollections,
                collectionsAdmissionVal: collectionsAdmission,
                collectionsInstallmentVal: collectionsInstallment
            };
        }));

        res.status(200).json(trackingData);

    } catch (error) {
        console.error("GET_DAILY_TRACKING_ERROR:", error);
        res.status(500).json({ message: "Failed to fetch daily tracking data", error: error.message });
    }
};

export const getDailyCenterDetails = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { date, fromDate, toDate } = req.query;
        
        let startDate = new Date();
        let endDate = new Date();

        if (fromDate && toDate) {
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
        } else if (date) {
            startDate = new Date(date);
            endDate = new Date(date);
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const dateFilter = { $gte: startDate, $lte: endDate };
        const tomorrow = new Date(endDate);
        tomorrow.setDate(tomorrow.getDate() + 1); // For Payment aggregation logic if needed

        // 1. Fetch center info
        const center = await CentreSchema.findById(centerId).lean();
        if (!center) return res.status(404).json({ message: "Center not found" });

        // 2. Fetch only ACTIVE users with operational roles assigned to this center
        const operationalRoles = ['telecaller', 'centralizedTelecaller', 'counsellor', 'marketing', 'centerIncharge', 'zonalManager', 'zonalHead', 'admin'];
        const users = await User.find({
            centres: centerId,
            isActive: true,
            role: { $in: operationalRoles }
        }).lean();

        // 3. Aggregate performance per user
        const performanceData = await Promise.all(users.map(async (user) => {
            const userId = user._id;

            // 3.1 Counselling Analysis (Union of direct counselling records and admissions)
            // For Normal: unique students admitted today or marked as counselled today by THIS user
            const normalCounsellingLeads = await LeadManagement.find({
                isCounseled: true,
                updatedAt: dateFilter,
                $or: [
                    { createdBy: userId },
                    { followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } } }
                ]
            }).distinct('_id');

            const normalAdmittedStudents = await Admission.find({
                createdBy: userId,
                createdAt: dateFilter
            }).distinct('student');

            const userCounselledNormalCount = new Set([
                ...normalCounsellingLeads.map(id => id.toString()),
                ...normalAdmittedStudents.map(id => id.toString())
            ]).size;

            // For Board: counselling records today or board admissions today
            const boardCounsellingStudents = await BoardCourseCounselling.find({
                counselledBy: userId,
                counselledDate: dateFilter
            }).distinct('studentId');

            const boardAdmittedStudents = await BoardCourseAdmission.find({
                createdBy: userId,
                createdAt: dateFilter
            }).distinct('studentId');

            const userCounselledBoardCount = new Set([
                ...boardCounsellingStudents.map(id => id.toString()),
                ...boardAdmittedStudents.map(id => id.toString())
            ]).size;

            // 3.2 Admission Breakdown (Total records)
            const admissionNormal = await Admission.countDocuments({
                createdBy: userId,
                createdAt: dateFilter
            });

            const admissionBoard = await BoardCourseAdmission.countDocuments({
                createdBy: userId,
                createdAt: dateFilter
            });

            // 3.3 Daily Calls
            const dailyCalls = await LeadManagement.countDocuments({
                $or: [
                    { createdBy: userId, createdAt: dateFilter },
                    { followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } } }
                ]
            });

            // Collections (Payments recorded by this user today)
            const collections = await Payment.aggregate([
                {
                    $match: {
                        recordedBy: userId,
                        paidAmount: { $gt: 0 },
                        $expr: {
                            $and: [
                                { $gte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, startDate] },
                                { $lt: [{ $ifNull: ["$receivedDate", "$paidDate"] }, tomorrow] }
                            ]
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: "$paidAmount" } } }
            ]);

            const collectionsAmount = collections.length > 0 ? collections[0].total : 0;

            let profileImage = null;
            const emp = await Employee.findOne({ user: userId }).select("profileImage").lean();
            if (emp && emp.profileImage) {
                profileImage = await getSignedFileUrl(emp.profileImage);
            }

            let callHistory = [];
            for (let i = 4; i >= 0; i--) {
                let dDate = new Date(startDate);
                dDate.setDate(dDate.getDate() - i);
                let dStart = new Date(dDate);
                dStart.setHours(0,0,0,0);
                let dEnd = new Date(dDate);
                dEnd.setHours(23,59,59,999);

                const cCount = await LeadManagement.countDocuments({
                    $or: [
                        { createdBy: userId, createdAt: { $gte: dStart, $lte: dEnd } },
                        { followUps: { $elemMatch: { updatedBy: user.name, date: { $gte: dStart, $lte: dEnd } } } }
                    ]
                });
                
                callHistory.push({
                    date: dStart.toISOString(),
                    calls: cCount,
                    target: 50
                });
            }

            return {
                userId: user._id,
                name: user.name,
                role: user.role,
                employeeId: user.employeeId,
                profileImage,
                performance: {
                    dailyCalls,
                    counselled: userCounselledNormalCount + userCounselledBoardCount,
                    admissions: admissionNormal + admissionBoard,
                    collection: collectionsAmount
                },
                callHistory
            };
        }));

        // 4. Group by Role
        const groupedByRole = performanceData.reduce((acc, curr) => {
            if (!acc[curr.role]) acc[curr.role] = [];
            acc[curr.role].push(curr);
            return acc;
        }, {});

        res.status(200).json({
            centerName: center.centreName,
            startDate: startDate,
            endDate: endDate,
            roles: groupedByRole
        });

    } catch (error) {
        console.error("GET_DAILY_CENTER_DETAILS_ERROR:", error);
        res.status(500).json({ message: "Failed to fetch center details", error: error.message });
    }
};

export const getDailyUserActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const { date, fromDate, toDate } = req.query;
        
        let startDate = new Date();
        let endDate = new Date();

        if (fromDate && toDate) {
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
        } else if (date) {
            startDate = new Date(date);
            endDate = new Date(date);
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const dateFilter = { $gte: startDate, $lte: endDate };
        const tomorrow = new Date(endDate);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Fetch User Info
        const user = await User.findById(userId).lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        // Fetch corresponding Employee to check for profile image
        let profileImage = null;
        const employee = await Employee.findOne({ user: userId }).select("profileImage").lean();
        if (employee && employee.profileImage) {
            profileImage = await getSignedFileUrl(employee.profileImage);
        }

        // 2. Lead Follow-up Analysis
        const freshLeadsCount = await LeadManagement.countDocuments({
            createdBy: userId,
            createdAt: dateFilter
        });

        const contactedLeadsCount = await LeadManagement.countDocuments({
            createdAt: { $lt: startDate },
            followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } }
        });

        // 3. Counseling Analysis
        const normalCounsellingLeads = await LeadManagement.find({
            isCounseled: true,
            updatedAt: dateFilter,
            $or: [
                { createdBy: userId },
                { followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } } }
            ]
        }).distinct('_id');

        const normalAdmittedStudents = await Admission.find({
            createdBy: userId,
            createdAt: dateFilter
        }).distinct('student');

        const counselledNormal = new Set([
            ...normalCounsellingLeads.map(id => id.toString()),
            ...normalAdmittedStudents.map(id => id.toString())
        ]).size;

        const boardCounsellingStudents = await BoardCourseCounselling.find({
            counselledBy: userId,
            counselledDate: dateFilter
        }).distinct('studentId');

        const boardAdmittedStudents = await BoardCourseAdmission.find({
            createdBy: userId,
            createdAt: dateFilter
        }).distinct('studentId');

        const counselledBoard = new Set([
            ...boardCounsellingStudents.map(id => id.toString()),
            ...boardAdmittedStudents.map(id => id.toString())
        ]).size;

        // 4. Admission Breakdown
        const admissionNormal = await Admission.countDocuments({ createdBy: userId, createdAt: dateFilter });
        const admissionBoard = await BoardCourseAdmission.countDocuments({ createdBy: userId, createdAt: dateFilter });

        // 5. Detailed Collection Analysis
        const collections = await Payment.find({
            recordedBy: userId,
            paidAmount: { $gt: 0 },
            $expr: {
                $and: [
                    { $gte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, startDate] },
                    { $lt: [{ $ifNull: ["$receivedDate", "$paidDate"] }, tomorrow] }
                ]
            }
        }).lean();

        const admissionIds = collections.map(p => p.admission).filter(Boolean);
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({ _id: { $in: admissionIds } }).populate('student').lean(),
            BoardCourseAdmission.find({ _id: { $in: admissionIds } }).populate('studentId').lean()
        ]);

        const admissionMap = {};
        normalAdmissions.forEach(adm => {
            const studentName = adm.student?.studentsDetails?.[0]?.studentName || "Unknown Student";
            admissionMap[adm._id.toString()] = { studentName, admissionNumber: adm.admissionNumber };
        });
        boardAdmissions.forEach(adm => {
            const studentName = adm.studentId?.studentsDetails?.[0]?.studentName || "Unknown Student";
            admissionMap[adm._id.toString()] = { studentName, admissionNumber: adm.admissionNumber };
        });

        const collectionAnalysis = collections.map(p => {
            const admInfo = admissionMap[p.admission?.toString()];
            return {
                studentName: admInfo?.studentName || "Unknown Student",
                admissionNumber: admInfo?.admissionNumber || "N/A",
                amount: p.paidAmount,
                method: p.paymentMethod || "Other",
                type: p.installmentNumber === 0 ? "Admission Fee" : `Installment #${p.installmentNumber}`,
                isFresh: p.installmentNumber === 0
            };
        });

        // 6. HOT / WARM / COLD Lead Breakdown + Detailed Call List
        const freshLeadsDetailed = await LeadManagement.find({
            createdBy: userId,
            createdAt: dateFilter
        }).select('name phoneNumber leadType isCounseled followUps createdAt updatedAt').lean();

        const contactedLeadsDetailed = await LeadManagement.find({
            createdAt: { $lt: startDate },
            followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } }
        }).select('name phoneNumber leadType isCounseled followUps createdAt updatedAt').lean();

        let hotCount = 0, warmCount = 0, coldCount = 0;
        const callDetails = [];

        // Process fresh leads
        freshLeadsDetailed.forEach(lead => {
            const type = (lead.leadType || '').toUpperCase();
            if (type.includes('HOT')) hotCount++;
            else if (type.includes('WARM')) warmCount++;
            else if (type.includes('COLD')) coldCount++;

            callDetails.push({
                leadId: lead._id,
                studentName: lead.name,
                phoneNumber: lead.phoneNumber || '-',
                callType: 'FRESH',
                leadType: lead.leadType || 'UNTAGGED',
                isCounseled: lead.isCounseled,
                feedback: lead.followUps?.[0]?.feedback || '-',
                remarks: lead.followUps?.[0]?.remarks || '',
                nextFollowUpDate: lead.followUps?.[0]?.nextFollowUpDate || null,
                date: lead.createdAt,
                updatedAt: lead.updatedAt
            });
        });

        // Process follow-up calls
        contactedLeadsDetailed.forEach(lead => {
            const todayFollowUps = (lead.followUps || []).filter(fu => {
                const fuDate = new Date(fu.date);
                return fuDate >= startDate && fuDate <= endDate && fu.updatedBy === user.name;
            });
            todayFollowUps.forEach(fu => {
                const status = (fu.status || lead.leadType || '').toUpperCase();
                if (status.includes('HOT')) hotCount++;
                else if (status.includes('WARM')) warmCount++;
                else if (status.includes('COLD')) coldCount++;

                callDetails.push({
                    leadId: lead._id,
                    studentName: lead.name,
                    phoneNumber: lead.phoneNumber || '-',
                    callType: 'FOLLOW-UP',
                    leadType: fu.status || lead.leadType || 'UNTAGGED',
                    isCounseled: lead.isCounseled,
                    feedback: fu.feedback || '-',
                    remarks: fu.remarks || '',
                    nextFollowUpDate: fu.nextFollowUpDate || null,
                    date: fu.date,
                    updatedAt: lead.updatedAt
                });
            });
        });

        // Fetch all direct admissions and counselling today to populate them if they are not in lead list
        const [allNormalAdmissionsToday, allBoardAdmissionsToday, allBoardCounsellingsToday] = await Promise.all([
            Admission.find({ createdBy: userId, createdAt: dateFilter }).populate('student').lean(),
            BoardCourseAdmission.find({ createdBy: userId, createdAt: dateFilter }).populate('studentId').lean(),
            BoardCourseCounselling.find({ counselledBy: userId, counselledDate: dateFilter }).populate('studentId').lean()
        ]);

        const extraPhones = [
            ...allNormalAdmissionsToday.map(adm => adm.student?.studentsDetails?.[0]?.mobileNum),
            ...allBoardAdmissionsToday.map(adm => adm.studentId?.studentsDetails?.[0]?.mobileNum),
            ...allBoardCounsellingsToday.map(couns => couns.studentId?.studentsDetails?.[0]?.mobileNum)
        ].filter(p => p && p !== '-');

        let leadMapByPhone = {};
        if (extraPhones.length > 0) {
            const leads = await LeadManagement.find({ phoneNumber: { $in: extraPhones } }).lean();
            leads.forEach(l => {
                leadMapByPhone[l.phoneNumber] = l;
            });
        }

        const existingPhones = new Set(callDetails.map(c => c.phoneNumber).filter(p => p && p !== '-'));
        const existingNames = new Set(callDetails.map(c => (c.studentName || '').toLowerCase()));

        allNormalAdmissionsToday.forEach(adm => {
            const studentDetails = adm.student?.studentsDetails?.[0];
            const phone = studentDetails?.mobileNum || '-';
            const name = studentDetails?.studentName || 'Unknown Student';
            
            if (phone !== '-' && existingPhones.has(phone)) return;
            if (name !== 'Unknown Student' && existingNames.has(name.toLowerCase())) return;
            
            const existingLead = phone !== '-' ? leadMapByPhone[phone] : null;
            
            callDetails.push({
                leadId: existingLead ? existingLead._id : null,
                studentName: name,
                phoneNumber: phone,
                callType: 'FOLLOW-UP',
                leadType: existingLead ? existingLead.leadType : 'UNTAGGED',
                isCounseled: true,
                feedback: 'ADMISSION COMPLETED',
                remarks: 'Normal Course Admission',
                nextFollowUpDate: null,
                date: adm.createdAt || new Date(),
                updatedAt: adm.createdAt || new Date(),
                leadTick: true,
                leadDate: existingLead ? existingLead.createdAt : adm.createdAt,
                counselledTick: true,
                counselledDate: adm.createdAt,
                enrolledTick: true,
                enrolledDate: adm.createdAt
            });
            
            if (phone !== '-') existingPhones.add(phone);
            existingNames.add(name.toLowerCase());
        });

        allBoardAdmissionsToday.forEach(adm => {
            const studentDetails = adm.studentId?.studentsDetails?.[0];
            const phone = studentDetails?.mobileNum || '-';
            const name = studentDetails?.studentName || 'Unknown Student';
            
            if (phone !== '-' && existingPhones.has(phone)) return;
            if (name !== 'Unknown Student' && existingNames.has(name.toLowerCase())) return;
            
            const existingLead = phone !== '-' ? leadMapByPhone[phone] : null;
            
            callDetails.push({
                leadId: existingLead ? existingLead._id : null,
                studentName: name,
                phoneNumber: phone,
                callType: 'FOLLOW-UP',
                leadType: existingLead ? existingLead.leadType : 'UNTAGGED',
                isCounseled: true,
                feedback: 'BOARD ADMISSION COMPLETED',
                remarks: 'Board Course Admission',
                nextFollowUpDate: null,
                date: adm.createdAt || new Date(),
                updatedAt: adm.createdAt || new Date(),
                leadTick: true,
                leadDate: existingLead ? existingLead.createdAt : adm.createdAt,
                counselledTick: true,
                counselledDate: adm.createdAt,
                enrolledTick: true,
                enrolledDate: adm.createdAt
            });
            
            if (phone !== '-') existingPhones.add(phone);
            existingNames.add(name.toLowerCase());
        });

        allBoardCounsellingsToday.forEach(couns => {
            const studentDetails = couns.studentId?.studentsDetails?.[0];
            const phone = studentDetails?.mobileNum || '-';
            const name = studentDetails?.studentName || 'Unknown Student';
            
            if (phone !== '-' && existingPhones.has(phone)) return;
            if (name !== 'Unknown Student' && existingNames.has(name.toLowerCase())) return;
            
            const existingLead = phone !== '-' ? leadMapByPhone[phone] : null;
            const hasAdmission = allBoardAdmissionsToday.some(adm => 
                adm.studentId?._id?.toString() === couns.studentId?._id?.toString()
            );
            
            callDetails.push({
                leadId: existingLead ? existingLead._id : null,
                studentName: name,
                phoneNumber: phone,
                callType: 'FOLLOW-UP',
                leadType: existingLead ? existingLead.leadType : 'UNTAGGED',
                isCounseled: true,
                feedback: 'BOARD COUNSELLING COMPLETED',
                remarks: 'Board Course Counselling',
                nextFollowUpDate: null,
                date: couns.counselledDate || new Date(),
                updatedAt: couns.counselledDate || new Date(),
                leadTick: true,
                leadDate: existingLead ? existingLead.createdAt : couns.counselledDate,
                counselledTick: true,
                counselledDate: couns.counselledDate,
                enrolledTick: hasAdmission,
                enrolledDate: hasAdmission ? couns.counselledDate : null
            });
            
            if (phone !== '-') existingPhones.add(phone);
            existingNames.add(name.toLowerCase());
        });

        // Fetch students and admissions in bulk to determine stage status and timestamps
        const phoneNumbers = callDetails.map(c => c.phoneNumber).filter(p => p && p !== '-');
        
        let studentMapByPhone = {};
        let admissionMapByStudentId = {};
        let counsellingMapByStudentId = {};

        if (phoneNumbers.length > 0) {
            const students = await Student.find({ "studentsDetails.mobileNum": { $in: phoneNumbers } }).lean();
            
            students.forEach(s => {
                const phone = s.studentsDetails?.[0]?.mobileNum;
                if (phone) {
                    studentMapByPhone[phone] = s;
                }
            });

            const studentIds = students.map(s => s._id);
            const [normalAdmissions, boardAdmissions, boardCounsellings] = await Promise.all([
                Admission.find({ student: { $in: studentIds } }).lean(),
                BoardCourseAdmission.find({ studentId: { $in: studentIds } }).lean(),
                BoardCourseCounselling.find({ studentId: { $in: studentIds } }).lean()
            ]);

            normalAdmissions.forEach(a => {
                admissionMapByStudentId[a.student.toString()] = {
                    date: a.createdAt || a.admissionDate
                };
            });
            boardAdmissions.forEach(a => {
                admissionMapByStudentId[a.studentId.toString()] = {
                    date: a.createdAt || a.admissionDate
                };
            });
            boardCounsellings.forEach(c => {
                counsellingMapByStudentId[c.studentId.toString()] = {
                    date: c.counselledDate || c.createdAt
                };
            });
        }

        // Augment each item in callDetails with stage metadata
        callDetails.forEach(detail => {
            const phone = detail.phoneNumber;
            const student = phone !== '-' ? studentMapByPhone[phone] : null;

            // 1. Lead tick & date
            detail.leadTick = true;
            detail.leadDate = detail.date;

            // 2. Counselled tick & date
            detail.counselledTick = detail.isCounseled;
            detail.counselledDate = null;
            if (detail.isCounseled) {
                const bCouns = student ? counsellingMapByStudentId[student._id.toString()] : null;
                detail.counselledDate = bCouns ? bCouns.date : (detail.updatedAt || detail.date);
            }

            // 3. Enrolled tick & date
            const adm = student ? admissionMapByStudentId[student._id.toString()] : null;
            detail.enrolledTick = !!adm;
            detail.enrolledDate = adm ? adm.date : null;
        });

        // Sort newest first
        callDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            userName: user.name,
            role: user.role,
            profileImage,
            date: startDate,
            leads: {
                fresh: freshLeadsCount,
                contacted: contactedLeadsCount,
                totalFollowUps: freshLeadsCount + contactedLeadsCount,
                hot: hotCount,
                warm: warmCount,
                cold: coldCount
            },
            counselled: {
                normal: counselledNormal,
                board: counselledBoard,
                total: counselledNormal + counselledBoard
            },
            admissions: {
                normal: admissionNormal,
                board: admissionBoard,
                total: admissionNormal + admissionBoard
            },
            collections: {
                freshAdmissionTotal: collectionAnalysis.filter(c => c.isFresh).reduce((acc, curr) => acc + curr.amount, 0),
                installmentTotal: collectionAnalysis.filter(c => !c.isFresh).reduce((acc, curr) => acc + curr.amount, 0),
                details: collectionAnalysis
            },
            callDetails
        });

    } catch (error) {
        console.error("GET_DAILY_USER_ACTIVITY_ERROR:", error);
        res.status(500).json({ message: "Failed to fetch user activity log", error: error.message });
    }
};

export const exportCenterPerformanceExcel = async (req, res) => {
    try {
        const { centerId } = req.params;
        const { fromDate, toDate } = req.query;
        
        let startDate = new Date();
        let endDate = new Date();

        if (fromDate && toDate) {
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
        }
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        const dateFilter = { $gte: startDate, $lte: endDate };

        const center = await CentreSchema.findById(centerId).lean();
        if (!center) return res.status(404).json({ message: "Center not found" });

        const operationalRoles = ['telecaller', 'centralizedTelecaller', 'counsellor', 'marketing', 'centerIncharge', 'zonalManager', 'zonalHead', 'admin', 'superAdmin'];
        const users = await User.find({ 
            centres: centerId, 
            isActive: true,
            role: { $in: operationalRoles }
        }).lean();

        const performanceData = await Promise.all(users.map(async (user) => {
            const userId = user._id;
            const userName = user.name;

            // 1. Counselling
            const normalCounselling = await LeadManagement.find({
                isCounseled: true,
                updatedAt: dateFilter,
                $or: [
                    { createdBy: userId },
                    { followUps: { $elemMatch: { updatedBy: userName, date: dateFilter } } }
                ]
            }).distinct('_id');

            const normalAdmitted = await Admission.find({
                createdBy: userId,
                createdAt: dateFilter
            }).distinct('student');

            const boardCounselling = await BoardCourseCounselling.find({
                counselledBy: userId,
                counselledDate: dateFilter
            }).distinct('studentId');

            const boardAdmitted = await BoardCourseAdmission.find({
                createdBy: userId,
                createdAt: dateFilter
            }).distinct('studentId');

            // 2. Admissions
            const admNormal = await Admission.countDocuments({ createdBy: userId, createdAt: dateFilter });
            const admBoard = await BoardCourseAdmission.countDocuments({ createdBy: userId, createdAt: dateFilter });

            // 3. Calls
            const dailyCalls = await LeadManagement.countDocuments({
                $or: [
                    { createdBy: userId, createdAt: dateFilter },
                    { followUps: { $elemMatch: { updatedBy: userName, date: dateFilter } } }
                ]
            });

            // 4. Collections
            const collections = await Payment.aggregate([
                {
                    $match: {
                        recordedBy: userId,
                        paidAmount: { $gt: 0 },
                        $expr: {
                            $and: [
                                { $gte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, startDate] },
                                { $lt: [{ $ifNull: ["$receivedDate", "$paidDate"] }, new Date(endDate.getTime() + 1)] }
                            ]
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: "$paidAmount" } } }
            ]);

            const collectionsAmount = collections.length > 0 ? collections[0].total : 0;

            return {
                "Staff Name": user.name,
                "Employee ID": user.employeeId || "N/A",
                "Role": user.role.toUpperCase(),
                "Calls": dailyCalls,
                "Normal Counselled": new Set([...normalCounselling.map(id => id.toString()), ...normalAdmitted.map(id => id.toString())]).size,
                "Board Counselled": new Set([...boardCounselling.map(id => id.toString()), ...boardAdmitted.map(id => id.toString())]).size,
                "Total Counselled": new Set([
                    ...normalCounselling.map(id => id.toString()), 
                    ...normalAdmitted.map(id => id.toString()),
                    ...boardCounselling.map(id => id.toString()),
                    ...boardAdmitted.map(id => id.toString())
                ]).size,
                "Normal Admissions": admNormal,
                "Board Admissions": admBoard,
                "Total Admissions": admNormal + admBoard,
                "Total Collection (₹)": collectionsAmount
            };
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(performanceData);
        XLSX.utils.book_append_sheet(wb, ws, "Performance Report");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Performance_Report_${center.centreName}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error("EXPORT_PERFORMANCE_ERROR:", error);
        res.status(500).json({ message: "Failed to export performance data", error: error.message });
    }
};

