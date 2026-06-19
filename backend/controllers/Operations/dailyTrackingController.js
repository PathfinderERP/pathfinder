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

const RESTRICTED_ROLES = ['telecaller', 'counsellor', 'marketing', 'centralizedtelecaller', 'centreincharge', 'centerincharge'];
const checkRestricted = (role) => {
    return RESTRICTED_ROLES.includes((role || '').toLowerCase());
};

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

        const isRestricted = checkRestricted(req.user?.role);

        // 1. Fetch all active centers
        let centers;
        if (isRestricted) {
            const userCenterIds = (req.user?.centres || []).map(c => c._id ? c._id.toString() : c.toString());
            centers = await CentreSchema.find({ _id: { $in: userCenterIds }, status: { $ne: "deactive" } }).lean();
        } else {
            centers = await CentreSchema.find({ status: { $ne: "deactive" } }).lean();
        }

        // Prepare tracking data
        const trackingData = await Promise.all(centers.map(async (center) => {
            const centerId = center._id;

            // --- Daily Calls & Counselled ---
            const leadMatch = { centre: centerId, "followUps.date": dateFilter };

            const filterCond = [
                { $gte: ["$$fu.date", today] },
                { $lt: ["$$fu.date", tomorrow] }
            ];

            if (isRestricted) {
                leadMatch["followUps.updatedBy"] = req.user.name;
                filterCond.push({ $eq: ["$$fu.updatedBy", req.user.name] });
            }

            const dailyCallsCountResult = await LeadManagement.aggregate([
                { $match: leadMatch },
                { $project: {
                    followUps: {
                        $filter: {
                            input: "$followUps",
                            as: "fu",
                            cond: { $and: filterCond }
                        }
                    }
                } },
                { $project: { count: { $size: "$followUps" } } },
                { $group: { _id: null, total: { $sum: "$count" } } }
            ]);
            const dailyCallsCount = dailyCallsCountResult.length > 0 ? dailyCallsCountResult[0].total : 0;

            // --- Daily Walk-ins ---
            const walkInsQuery = {
                centre: centerId,
                source: { $regex: /^walk[- ]?in$/i },
                createdAt: dateFilter
            };
            if (isRestricted) {
                walkInsQuery.createdBy = req.user._id;
            }
            const walkInsCount = await LeadManagement.countDocuments(walkInsQuery);

            // Counseling Analysis (Union of direct records and admissions)
            const counsellingNormalQuery = {
                centre: centerId,
                isCounseled: true,
                updatedAt: dateFilter
            };
            const admittedNormalQuery = {
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            };

            if (isRestricted) {
                counsellingNormalQuery.$or = [
                    { createdBy: req.user._id },
                    { followUps: { $elemMatch: { updatedBy: req.user.name, date: dateFilter } } }
                ];
                admittedNormalQuery.createdBy = req.user._id;
            }

            const centerCounsellingNormalLeads = await LeadManagement.find(counsellingNormalQuery).distinct('_id');
            const centerAdmittedNormalStudents = await Admission.find(admittedNormalQuery).distinct('student');

            const counselledNormalCount = new Set([
                ...centerCounsellingNormalLeads.map(id => id.toString()),
                ...centerAdmittedNormalStudents.map(id => id.toString())
            ]).size;

            const counsellingBoardQuery = {
                centre: centerId,
                counselledDate: dateFilter
            };
            const admittedBoardQuery = {
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            };

            if (isRestricted) {
                counsellingBoardQuery.counselledBy = req.user._id;
                admittedBoardQuery.createdBy = req.user._id;
            }

            const centerCounsellingBoardRecords = await BoardCourseCounselling.find(counsellingBoardQuery).distinct('studentId');
            const centerAdmittedBoardStudents = await BoardCourseAdmission.find(admittedBoardQuery).distinct('studentId');

            const counselledBoardCount = new Set([
                ...centerCounsellingBoardRecords.map(id => id.toString()),
                ...centerAdmittedBoardStudents.map(id => id.toString())
            ]).size;

            // --- Admissions (Total records) ---
            const admissionNormalQuery = {
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            };
            const admissionBoardQuery = {
                centre: new RegExp(`^${center.centreName}$`, 'i'),
                createdAt: dateFilter
            };

            if (isRestricted) {
                admissionNormalQuery.createdBy = req.user._id;
                admissionBoardQuery.createdBy = req.user._id;
            }

            const admissionNormalCount = await Admission.countDocuments(admissionNormalQuery);
            const admissionBoardCount = await BoardCourseAdmission.countDocuments(admissionBoardQuery);

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

            const paymentMatch = {
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
            };

            if (isRestricted) {
                paymentMatch.recordedBy = req.user._id;
            }

            const collections = await Payment.aggregate([
                { $match: paymentMatch },
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

            const totalCollections = collections.length > 0 ? Math.round(collections[0].total / 1.18) : 0;
            const collectionsAdmission = collections.length > 0 ? Math.round(collections[0].admission / 1.18) : 0;
            const collectionsInstallment = collections.length > 0 ? Math.round(collections[0].installment / 1.18) : 0;

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

        const isRestricted = checkRestricted(req.user?.role);
        if (isRestricted) {
            const userCenterIds = (req.user?.centres || []).map(c => c._id ? c._id.toString() : c.toString());
            if (!userCenterIds.includes(centerId)) {
                return res.status(403).json({ message: "Access denied. Center not assigned to user." });
            }
        }

        // 2. Fetch only ACTIVE users with operational roles assigned to this center
        const operationalRoles = ['telecaller', 'centralizedTelecaller', 'counsellor', 'marketing', 'centerIncharge', 'zonalManager'];
        const userQuery = {
            centres: centerId,
            isActive: true,
            role: { $in: operationalRoles }
        };
        if (isRestricted) {
            userQuery._id = req.user._id;
        }
        const users = await User.find(userQuery).lean();

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

            // 3.3 Daily Calls & 5-Day Call History (Optimized Bulk Query)
            const historyStart = new Date(startDate);
            historyStart.setDate(historyStart.getDate() - 4);
            historyStart.setHours(0, 0, 0, 0);
            
            const historyEnd = new Date(endDate);

            const allLeadsHistory = await LeadManagement.find({
                followUps: { $elemMatch: { updatedBy: user.name, date: { $gte: historyStart, $lte: historyEnd } } }
            }).select('name phoneNumber createdAt followUps').lean();

            const allNormalAdmissionsHistory = await Admission.find({
                createdBy: userId,
                createdAt: { $gte: historyStart, $lte: historyEnd }
            }).populate('student').lean();

            const allBoardAdmissionsHistory = await BoardCourseAdmission.find({
                createdBy: userId,
                createdAt: { $gte: historyStart, $lte: historyEnd }
            }).populate('studentId').lean();

            const allBoardCounsellingsHistory = await BoardCourseCounselling.find({
                counselledBy: userId,
                counselledDate: { $gte: historyStart, $lte: historyEnd }
            }).populate('studentId').lean();

            const getCallsCountForDay = (dStart, dEnd) => {
                let callDetailsCount = 0;
                const existingPhones = new Set();
                const existingNames = new Set();

                // 1. Process follow-ups for this day
                allLeadsHistory.forEach(lead => {
                    const todayFollowUps = (lead.followUps || []).filter(fu => {
                        const fuDate = new Date(fu.date);
                        return fuDate >= dStart && fuDate <= dEnd && fu.updatedBy === user.name;
                    });

                    todayFollowUps.forEach(fu => {
                        callDetailsCount++;
                        if (lead.phoneNumber && lead.phoneNumber !== '-') {
                            existingPhones.add(lead.phoneNumber);
                        }
                        if (lead.name) {
                            existingNames.add(lead.name.toLowerCase());
                        }
                    });
                });

                // 2. Process admissions/counsellings for this day
                const addExtra = (studentDetails) => {
                    const phone = studentDetails?.mobileNum || '-';
                    const name = studentDetails?.studentName || 'Unknown Student';
                    
                    if (phone !== '-' && existingPhones.has(phone)) return;
                    if (name !== 'Unknown Student' && existingNames.has(name.toLowerCase())) return;
                    
                    callDetailsCount++;
                    
                    if (phone !== '-') existingPhones.add(phone);
                    existingNames.add(name.toLowerCase());
                };

                allNormalAdmissionsHistory.forEach(adm => {
                    const admDate = new Date(adm.createdAt);
                    if (admDate >= dStart && admDate <= dEnd) {
                        const studentDetails = adm.student?.studentsDetails?.[0];
                        addExtra(studentDetails);
                    }
                });

                allBoardAdmissionsHistory.forEach(adm => {
                    const admDate = new Date(adm.createdAt);
                    if (admDate >= dStart && admDate <= dEnd) {
                        const studentDetails = adm.studentId?.studentsDetails?.[0];
                        addExtra(studentDetails);
                    }
                });

                allBoardCounsellingsHistory.forEach(couns => {
                    const counsDate = new Date(couns.counselledDate);
                    if (counsDate >= dStart && counsDate <= dEnd) {
                        const studentDetails = couns.studentId?.studentsDetails?.[0];
                        addExtra(studentDetails);
                    }
                });

                return callDetailsCount;
            };

            const dailyCalls = getCallsCountForDay(startDate, endDate);

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

                const cCount = getCallsCountForDay(dStart, dEnd);
                
                let targetCalls = 50;
                if (user.role) {
                    const role = user.role.toLowerCase();
                    if (role === 'counsellor') targetCalls = 30;
                    else if (role === 'marketing') targetCalls = 40;
                }
                callHistory.push({
                    date: dStart.toISOString(),
                    calls: cCount,
                    target: targetCalls
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
        const { date, fromDate, toDate, centerId } = req.query;

        const isRestricted = checkRestricted(req.user?.role);
        if (isRestricted && userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied. You can only view your own activity log." });
        }
        
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

        // Fetch corresponding center if centerId is provided
        let center = null;
        if (centerId) {
            center = await CentreSchema.findById(centerId).lean();
        }

        // Fetch corresponding Employee to check for profile image
        let profileImage = null;
        const employee = await Employee.findOne({ user: userId }).select("profileImage").lean();
        if (employee && employee.profileImage) {
            profileImage = await getSignedFileUrl(employee.profileImage);
        }

        // 2. Lead Follow-up Analysis
        // Fresh leads = uploaded today with NO followUps (no feedback/remarks = from fresh section)
        const freshQuery = {
            createdBy: userId,
            createdAt: dateFilter,
            $or: [
                { followUps: { $exists: false } },
                { followUps: { $size: 0 } }
            ]
        };
        const freshLeadsCount = await LeadManagement.countDocuments(freshQuery);

        // Fetch all leads followed up by the user today (old and new)
        const allFollowUpLeads = await LeadManagement.find({
            followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } }
        }).select('name phoneNumber leadType isCounseled followUps createdAt updatedAt course courseText').populate('centre').populate('course', 'courseName').lean();

        // 3. Counseling Analysis
        const normalCounsQuery = {
            isCounseled: true,
            updatedAt: dateFilter,
            $or: [
                { createdBy: userId },
                { followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } } }
            ]
        };
        const normalCounsellingLeads = await LeadManagement.find(normalCounsQuery).distinct('_id');

        const normalAdmStudentQuery = {
            createdBy: userId,
            createdAt: dateFilter
        };
        const normalAdmittedStudents = await Admission.find(normalAdmStudentQuery).distinct('student');

        const counselledNormal = new Set([
            ...normalCounsellingLeads.map(id => id.toString()),
            ...normalAdmittedStudents.map(id => id.toString())
        ]).size;

        const boardCounsStudentQuery = {
            counselledBy: userId,
            counselledDate: dateFilter
        };
        const boardCounsellingStudents = await BoardCourseCounselling.find(boardCounsStudentQuery).distinct('studentId');

        const boardAdmStudentQuery = {
            createdBy: userId,
            createdAt: dateFilter
        };
        const boardAdmittedStudents = await BoardCourseAdmission.find(boardAdmStudentQuery).distinct('studentId');

        const counselledBoard = new Set([
            ...boardCounsellingStudents.map(id => id.toString()),
            ...boardAdmittedStudents.map(id => id.toString())
        ]).size;

        // 4. Admission Breakdown
        const admNormalQuery = { createdBy: userId, createdAt: dateFilter };
        const admissionNormal = await Admission.countDocuments(admNormalQuery);

        const admBoardQuery = { createdBy: userId, createdAt: dateFilter };
        const admissionBoard = await BoardCourseAdmission.countDocuments(admBoardQuery);

        // 5. Detailed Collection Analysis
        let collections = await Payment.find({
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
        // Fresh = created today with NO followUps (pure fresh section uploads, no feedback/remarks)
        const freshLeadsDetailed = await LeadManagement.find(freshQuery).select('name phoneNumber leadType isCounseled followUps createdAt updatedAt course courseText').populate('course', 'courseName').lean();

        let hotCount = 0, warmCount = 0, coldCount = 0, neutralCount = 0, invalidCount = 0;
        const callDetails = [];

        // Process fresh leads (no followUps)
        freshLeadsDetailed.forEach(lead => {
            const type = (lead.leadType || '').toUpperCase();
            if (type.includes('HOT')) hotCount++;
            else if (type.includes('WARM')) warmCount++;
            else if (type.includes('COLD')) coldCount++;
            else if (type.includes('NEUTRAL')) neutralCount++;
            else if (type.includes('INVALID')) invalidCount++;

            callDetails.push({
                leadId: lead._id,
                studentName: lead.name,
                phoneNumber: lead.phoneNumber || '-',
                callType: 'FRESH',
                leadType: lead.leadType || 'UNTAGGED',
                isCounseled: lead.isCounseled,
                feedback: '-',
                remarks: '',
                nextFollowUpDate: null,
                date: lead.createdAt,
                updatedAt: lead.updatedAt,
                courseName: lead.course?.courseName || lead.courseText || '-'
            });
        });

        // Process all follow-up calls today
        allFollowUpLeads.forEach(lead => {
            const todayFollowUps = (lead.followUps || []).filter(fu => {
                const fuDate = new Date(fu.date);
                return fuDate >= startDate && fuDate <= endDate && fu.updatedBy === user.name;
            });

            todayFollowUps.forEach(fu => {
                const status = (fu.status || lead.leadType || '').toUpperCase();
                if (status.includes('HOT')) hotCount++;
                else if (status.includes('WARM')) warmCount++;
                else if (status.includes('COLD')) coldCount++;
                else if (status.includes('NEUTRAL')) neutralCount++;
                else if (status.includes('INVALID')) invalidCount++;

                const isFresh = new Date(lead.createdAt) >= startDate && new Date(lead.createdAt) <= endDate;

                callDetails.push({
                    leadId: lead._id,
                    studentName: lead.name,
                    phoneNumber: lead.phoneNumber || '-',
                    callType: isFresh ? 'CONTACTED_UPLOAD' : 'FOLLOW-UP',
                    leadType: fu.status || lead.leadType || 'UNTAGGED',
                    isCounseled: lead.isCounseled,
                    feedback: fu.feedback || '-',
                    remarks: fu.remarks || '',
                    nextFollowUpDate: fu.nextFollowUpDate || lead.nextFollowUpDate || null,
                    date: fu.date,
                    updatedAt: lead.updatedAt,
                    courseName: lead.course?.courseName || lead.courseText || '-'
                });
            });
        });

        const contactedLeadsCount = new Set(
            callDetails.filter(c => c.callType === 'FOLLOW-UP').map(c => c.leadId?.toString()).filter(Boolean)
        ).size;

        const uploadedAsContactedCount = new Set(
            callDetails.filter(c => c.callType === 'CONTACTED_UPLOAD').map(c => c.leadId?.toString()).filter(Boolean)
        ).size;

        // Fetch all direct admissions and counselling today to populate them if they are not in lead list
        const [allNormalAdmissionsToday, allBoardAdmissionsToday, allBoardCounsellingsToday] = await Promise.all([
            Admission.find(normalAdmStudentQuery).populate('student').populate('course', 'courseName').lean(),
            BoardCourseAdmission.find(boardAdmStudentQuery).populate('studentId').lean(),
            BoardCourseCounselling.find(boardCounsStudentQuery).populate('studentId').populate('boardId', 'boardName boardCourse').lean()
        ]);

        const extraPhones = [
            ...allNormalAdmissionsToday.map(adm => adm.student?.studentsDetails?.[0]?.mobileNum),
            ...allBoardAdmissionsToday.map(adm => adm.studentId?.studentsDetails?.[0]?.mobileNum),
            ...allBoardCounsellingsToday.map(couns => couns.studentId?.studentsDetails?.[0]?.mobileNum)
        ].filter(p => p && p !== '-');

        let leadMapByPhone = {};
        if (extraPhones.length > 0) {
            const leads = await LeadManagement.find({ phoneNumber: { $in: extraPhones } }).populate('centre').populate('course', 'courseName').lean();
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
                enrolledDate: adm.createdAt,
                courseName: adm.course?.courseName || existingLead?.course?.courseName || existingLead?.courseText || '-'
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
                enrolledDate: adm.createdAt,
                courseName: adm.boardCourseName || existingLead?.course?.courseName || existingLead?.courseText || '-'
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
                enrolledDate: hasAdmission ? couns.counselledDate : null,
                courseName: couns.boardId?.boardName || couns.boardId?.boardCourse || existingLead?.course?.courseName || existingLead?.courseText || '-'
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
                uploadedAsContacted: uploadedAsContactedCount,
                totalFollowUps: contactedLeadsCount,
                hot: hotCount,
                warm: warmCount,
                cold: coldCount,
                neutral: neutralCount,
                invalid: invalidCount
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
        const { fromDate, toDate, role } = req.query;
        
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

        const isRestricted = checkRestricted(req.user?.role);
        if (isRestricted) {
            const userCenterIds = (req.user?.centres || []).map(c => c._id ? c._id.toString() : c.toString());
            if (!userCenterIds.includes(centerId)) {
                return res.status(403).json({ message: "Access denied. Center not assigned to user." });
            }
        }

        const operationalRoles = ['telecaller', 'centralizedTelecaller', 'counsellor', 'marketing', 'centerIncharge', 'zonalManager'];
        
        const userQuery = {
            centres: centerId,
            isActive: true
        };

        if (isRestricted) {
            userQuery._id = req.user._id;
        } else if (role) {
            userQuery.role = { $regex: new RegExp(`^${role}$`, 'i') };
        } else {
            userQuery.role = { $in: operationalRoles };
        }

        const users = await User.find(userQuery).lean();

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

            // 3. Calls (Optimized Bulk Query to match user activity counts)
            const allLeadsHistory = await LeadManagement.find({
                followUps: { $elemMatch: { updatedBy: userName, date: dateFilter } }
            }).select('name phoneNumber createdAt followUps').lean();

            const allNormalAdmissionsHistory = await Admission.find({
                createdBy: userId,
                createdAt: dateFilter
            }).populate('student').lean();

            const allBoardAdmissionsHistory = await BoardCourseAdmission.find({
                createdBy: userId,
                createdAt: dateFilter
            }).populate('studentId').lean();

            const allBoardCounsellingsHistory = await BoardCourseCounselling.find({
                counselledBy: userId,
                counselledDate: dateFilter
            }).populate('studentId').lean();

            let dailyCalls = 0;
            const existingPhones = new Set();
            const existingNames = new Set();

            // 1. Process follow-ups for this range
            allLeadsHistory.forEach(lead => {
                const todayFollowUps = (lead.followUps || []).filter(fu => {
                    const fuDate = new Date(fu.date);
                    return fuDate >= startDate && fuDate <= endDate && fu.updatedBy === userName;
                });

                todayFollowUps.forEach(fu => {
                    dailyCalls++;
                    if (lead.phoneNumber && lead.phoneNumber !== '-') {
                        existingPhones.add(lead.phoneNumber);
                    }
                    if (lead.name) {
                        existingNames.add(lead.name.toLowerCase());
                    }
                });
            });

            // 2. Process admissions/counsellings for this range
            const addExtra = (studentDetails) => {
                const phone = studentDetails?.mobileNum || '-';
                const name = studentDetails?.studentName || 'Unknown Student';
                
                if (phone !== '-' && existingPhones.has(phone)) return;
                if (name !== 'Unknown Student' && existingNames.has(name.toLowerCase())) return;
                
                dailyCalls++;
                
                if (phone !== '-') existingPhones.add(phone);
                existingNames.add(name.toLowerCase());
            };

            allNormalAdmissionsHistory.forEach(adm => {
                const studentDetails = adm.student?.studentsDetails?.[0];
                addExtra(studentDetails);
            });

            allBoardAdmissionsHistory.forEach(adm => {
                const studentDetails = adm.studentId?.studentsDetails?.[0];
                addExtra(studentDetails);
            });

            allBoardCounsellingsHistory.forEach(couns => {
                const studentDetails = couns.studentId?.studentsDetails?.[0];
                addExtra(studentDetails);
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
                "Centre": center.centreName,
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

        const roleSuffix = role ? `_${role.toUpperCase()}` : '';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Performance_Report_${center.centreName}${roleSuffix}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error("EXPORT_PERFORMANCE_ERROR:", error);
        res.status(500).json({ message: "Failed to export performance data", error: error.message });
    }
};

export const exportUserCallingReportExcel = async (req, res) => {
    try {
        const { userId } = req.params;
        const { fromDate, toDate, centerId } = req.query;

        const isRestricted = checkRestricted(req.user?.role);
        if (isRestricted && userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access denied. You can only export your own calling report." });
        }
        
        let startDate = new Date();
        let endDate = new Date();

        if (fromDate && toDate) {
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
        }
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        const dateFilter = { $gte: startDate, $lte: endDate };

        const user = await User.findById(userId).lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        let center = null;
        if (centerId) {
            center = await CentreSchema.findById(centerId).lean();
        }

        // 1. Fresh Leads Detailed (created by user today with no followUps)
        const freshQuery = {
            createdBy: userId,
            createdAt: dateFilter,
            $or: [
                { followUps: { $exists: false } },
                { followUps: { $size: 0 } }
            ]
        };
        const freshLeadsDetailed = await LeadManagement.find(freshQuery).populate('centre').populate('course', 'courseName').lean();

        // Fetch all leads followed up by the user today (old and new)
        const allFollowUpLeads = await LeadManagement.find({
            followUps: { $elemMatch: { updatedBy: user.name, date: dateFilter } }
        }).populate('centre').populate('course', 'courseName').lean();

        const callDetails = [];

        freshLeadsDetailed.forEach(lead => {
            callDetails.push({
                centreName: lead.centre?.centreName || '-',
                studentName: lead.name,
                phoneNumber: lead.phoneNumber || '-',
                callType: 'FRESH',
                leadType: lead.leadType || 'UNTAGGED',
                feedback: '-',
                remarks: lead.remarks || '',
                nextFollowUpDate: null,
                date: lead.createdAt,
                courseName: lead.course?.courseName || lead.courseText || '-'
            });
        });

        allFollowUpLeads.forEach(lead => {
            const todayFollowUps = (lead.followUps || []).filter(fu => {
                const fuDate = new Date(fu.date);
                return fuDate >= startDate && fuDate <= endDate && fu.updatedBy === user.name;
            });

            todayFollowUps.forEach(fu => {
                const isFresh = new Date(lead.createdAt) >= startDate && new Date(lead.createdAt) <= endDate;
                callDetails.push({
                    centreName: lead.centre?.centreName || '-',
                    studentName: lead.name,
                    phoneNumber: lead.phoneNumber || '-',
                    callType: isFresh ? 'CONTACTED_UPLOAD' : 'FOLLOW-UP',
                    leadType: fu.status || lead.leadType || 'UNTAGGED',
                    feedback: fu.feedback || '-',
                    remarks: fu.remarks || '',
                    nextFollowUpDate: fu.nextFollowUpDate || lead.nextFollowUpDate || null,
                    date: fu.date,
                    courseName: lead.course?.courseName || lead.courseText || '-'
                });
            });
        });

        // 4. Also fetch admissions/counsellings to align with front-end
        const normalAdmStudentQuery = { createdBy: userId, createdAt: dateFilter };
        const boardAdmStudentQuery = { createdBy: userId, createdAt: dateFilter };
        const boardCounsStudentQuery = { counselledBy: userId, counselledDate: dateFilter };

        const [allNormalAdmissionsToday, allBoardAdmissionsToday, allBoardCounsellingsToday] = await Promise.all([
            Admission.find(normalAdmStudentQuery).populate('student').populate('course', 'courseName').lean(),
            BoardCourseAdmission.find(boardAdmStudentQuery).populate('studentId').lean(),
            BoardCourseCounselling.find(boardCounsStudentQuery).populate('studentId').populate('boardId', 'boardName boardCourse').populate('centre').lean()
        ]);

        const extraPhones = [
            ...allNormalAdmissionsToday.map(adm => adm.student?.studentsDetails?.[0]?.mobileNum),
            ...allBoardAdmissionsToday.map(adm => adm.studentId?.studentsDetails?.[0]?.mobileNum),
            ...allBoardCounsellingsToday.map(couns => couns.studentId?.studentsDetails?.[0]?.mobileNum)
        ].filter(p => p && p !== '-');

        let leadMapByPhone = {};
        if (extraPhones.length > 0) {
            const leads = await LeadManagement.find({ phoneNumber: { $in: extraPhones } }).populate('centre').populate('course', 'courseName').lean();
            leads.forEach(l => {
                leadMapByPhone[l.phoneNumber] = l;
            });
        }

        const existingPhones = new Set(callDetails.map(c => c.phoneNumber).filter(p => p && p !== '-'));
        const existingNames = new Set(callDetails.map(c => (c.studentName || '').toLowerCase()));

        const addExtra = (admOrCouns, isAdm, typeStr, remarksStr) => {
            const studentDetails = isAdm 
                ? (admOrCouns.student?.studentsDetails?.[0] || admOrCouns.studentId?.studentsDetails?.[0])
                : admOrCouns.studentId?.studentsDetails?.[0];
            const phone = studentDetails?.mobileNum || '-';
            const name = studentDetails?.studentName || 'Unknown Student';
            
            if (phone !== '-' && existingPhones.has(phone)) return;
            if (name !== 'Unknown Student' && existingNames.has(name.toLowerCase())) return;
            
            const existingLead = phone !== '-' ? leadMapByPhone[phone] : null;
            const itemCentreName = isAdm 
                ? admOrCouns.centre 
                : (admOrCouns.centre?.centreName || '-');

            let courseName = '-';
            if (isAdm) {
                courseName = admOrCouns.course?.courseName || admOrCouns.boardCourseName || existingLead?.course?.courseName || existingLead?.courseText || '-';
            } else {
                courseName = admOrCouns.boardId?.boardName || admOrCouns.boardId?.boardCourse || existingLead?.course?.courseName || existingLead?.courseText || '-';
            }

            callDetails.push({
                centreName: itemCentreName || (existingLead?.centre?.centreName) || '-',
                studentName: name,
                phoneNumber: phone,
                callType: 'FOLLOW-UP',
                leadType: existingLead ? existingLead.leadType : 'UNTAGGED',
                feedback: typeStr,
                remarks: remarksStr,
                nextFollowUpDate: null,
                date: admOrCouns.createdAt || admOrCouns.counselledDate || new Date(),
                courseName
            });
            
            if (phone !== '-') existingPhones.add(phone);
            existingNames.add(name.toLowerCase());
        };

        allNormalAdmissionsToday.forEach(adm => addExtra(adm, true, 'ADMISSION COMPLETED', 'Normal Course Admission'));
        allBoardAdmissionsToday.forEach(adm => addExtra(adm, true, 'BOARD ADMISSION COMPLETED', 'Board Course Admission'));
        allBoardCounsellingsToday.forEach(couns => addExtra(couns, false, 'BOARD COUNSELLING COMPLETED', 'Board Course Counselling'));

        // Sort newest first
        callDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Format for excel
        const reportData = callDetails.map((call, idx) => ({
            "Sl No": idx + 1,
            "Centre": call.centreName,
            "Student Name": call.studentName,
            "Phone Number": call.phoneNumber,
            "Course Name": call.courseName || '-',
            "Call Type": call.callType,
            "Lead Status": call.leadType,
            "Feedback": call.feedback,
            "Remarks": call.remarks,
            "Next Follow-Up Date": call.nextFollowUpDate ? new Date(call.nextFollowUpDate).toLocaleDateString('en-GB') : 'N/A',
            "Call Date & Time": new Date(call.date).toLocaleString('en-GB')
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);
        XLSX.utils.book_append_sheet(wb, ws, "Calling Report");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Calling_Report_${user.name.replace(/\s+/g, '_')}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error("EXPORT_USER_CALLING_REPORT_ERROR:", error);
        res.status(500).json({ message: "Failed to export user calling report", error: error.message });
    }
};

export const getDailyTrackingDetails = async (req, res) => {
    try {
        const { date, category } = req.query;
        if (!category) {
            return res.status(400).json({ message: "Category parameter is required" });
        }

        let today = new Date();
        if (date) {
            today = new Date(date);
        }
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateFilter = { $gte: today, $lt: tomorrow };
        
        const isRestricted = checkRestricted(req.user?.role);
        let detailsList = [];

        if (category === "walkins") {
            // Daily Walk-Ins
            const walkinsQuery = {
                source: { $regex: /^walk[- ]?in$/i },
                createdAt: dateFilter
            };
            if (isRestricted) {
                walkinsQuery.createdBy = req.user._id;
            }
            const walkins = await LeadManagement.find(walkinsQuery).populate('centre').populate('createdBy').lean();

            detailsList = walkins.map(lead => ({
                id: lead._id,
                name: lead.name,
                phone: lead.phoneNumber || 'N/A',
                email: lead.email || 'N/A',
                handledBy: lead.createdBy?.name || 'System',
                centreName: lead.centre?.centreName || 'N/A',
                dateTime: lead.createdAt,
                tag: lead.leadType || 'WALK-IN',
                feedback: lead.remarks || 'No remarks recorded'
            }));

        } else if (category === "counselling") {
            // Daily Counselling
            // 1. Normal Counselling
            const normalQuery = {
                isCounseled: true,
                updatedAt: dateFilter
            };
            if (isRestricted) {
                normalQuery.$or = [
                    { createdBy: req.user._id },
                    { followUps: { $elemMatch: { updatedBy: req.user.name, date: dateFilter } } }
                ];
            }
            const normalLeads = await LeadManagement.find(normalQuery).populate('centre').populate('createdBy').lean();

            const normalDetails = normalLeads.map(lead => ({
                id: lead._id,
                name: lead.name,
                phone: lead.phoneNumber || 'N/A',
                email: lead.email || 'N/A',
                handledBy: lead.createdBy?.name || 'System',
                centreName: lead.centre?.centreName || 'N/A',
                dateTime: lead.updatedAt,
                tag: lead.leadType || 'COUNSELLED',
                feedback: 'Normal Course Counselling'
            }));

            // 2. Board Counselling
            const boardQuery = {
                counselledDate: dateFilter
            };
            if (isRestricted) {
                boardQuery.counselledBy = req.user._id;
            }
            const boardCounsellings = await BoardCourseCounselling.find(boardQuery).populate('centre').populate('studentId').populate('counselledBy').lean();

            const boardDetails = boardCounsellings.map(bc => {
                const studentName = bc.studentId?.studentsDetails?.[0]?.studentName || 'Unknown Student';
                const phone = bc.studentId?.studentsDetails?.[0]?.mobileNum || 'N/A';
                return {
                    id: bc._id,
                    name: studentName,
                    phone: phone,
                    email: 'N/A',
                    handledBy: bc.counselledBy?.name || 'System',
                    centreName: bc.centre?.centreName || 'N/A',
                    dateTime: bc.counselledDate,
                    tag: 'BOARD COUNSEL',
                    feedback: 'Board Course Counselling'
                };
            });

            detailsList = [...normalDetails, ...boardDetails];

        } else if (category === "admission") {
            // Daily Admission
            // 1. Normal Admission
            const normalQuery = {
                createdAt: dateFilter
            };
            if (isRestricted) {
                normalQuery.createdBy = req.user._id;
            }
            const normalAdmissions = await Admission.find(normalQuery).populate('student').populate('createdBy').lean();

            const normalDetails = normalAdmissions.map(adm => {
                const studentName = adm.student?.studentsDetails?.[0]?.studentName || 'Unknown Student';
                const phone = adm.student?.studentsDetails?.[0]?.mobileNum || 'N/A';
                const email = adm.student?.studentsDetails?.[0]?.email || 'N/A';
                return {
                    id: adm._id,
                    name: studentName,
                    phone: phone,
                    email: email,
                    handledBy: adm.createdBy?.name || 'System',
                    centreName: adm.centre || 'N/A',
                    dateTime: adm.createdAt,
                    tag: 'NORMAL ADM',
                    feedback: `Admission No: ${adm.admissionNumber || 'N/A'}`
                };
            });

            // 2. Board Admission
            const boardQuery = {
                createdAt: dateFilter
            };
            if (isRestricted) {
                boardQuery.createdBy = req.user._id;
            }
            const boardAdmissions = await BoardCourseAdmission.find(boardQuery).populate('studentId').populate('createdBy').lean();

            const boardDetails = boardAdmissions.map(adm => {
                const studentName = adm.studentId?.studentsDetails?.[0]?.studentName || 'Unknown Student';
                const phone = adm.studentId?.studentsDetails?.[0]?.mobileNum || 'N/A';
                const email = adm.studentId?.studentsDetails?.[0]?.email || 'N/A';
                return {
                    id: adm._id,
                    name: studentName,
                    phone: phone,
                    email: email,
                    handledBy: adm.createdBy?.name || 'System',
                    centreName: adm.centre || 'N/A',
                    dateTime: adm.createdAt,
                    tag: 'BOARD ADM',
                    feedback: `Admission No: ${adm.admissionNumber || 'N/A'}`
                };
            });

            detailsList = [...normalDetails, ...boardDetails];

        } else if (category === "calls") {
            // Daily Calls
            const callsQuery = {
                "followUps.date": dateFilter
            };
            if (isRestricted) {
                callsQuery["followUps.updatedBy"] = req.user.name;
            }
            const leadsWithCalls = await LeadManagement.find(callsQuery).populate('centre').lean();

            leadsWithCalls.forEach(lead => {
                const matchingFollowups = (lead.followUps || []).filter(fu => {
                    const fuDate = new Date(fu.date);
                    return fuDate >= today && fuDate < tomorrow && (!isRestricted || fu.updatedBy === req.user.name);
                });

                matchingFollowups.forEach(fu => {
                    detailsList.push({
                        id: fu._id || lead._id + fu.date.toString(),
                        name: lead.name,
                        phone: lead.phoneNumber || 'N/A',
                        email: lead.email || 'N/A',
                        handledBy: fu.updatedBy || 'System',
                        centreName: lead.centre?.centreName || 'N/A',
                        dateTime: fu.date,
                        tag: fu.status || 'CALL',
                        feedback: fu.feedback || fu.remarks || 'No feedback recorded'
                    });
                });
            });

        } else if (category === "collection") {
            // Total Collection
            const collectionQuery = {
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
                        { $gte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, today] },
                        { $lt: [{ $ifNull: ["$receivedDate", "$paidDate"] }, tomorrow] }
                    ]
                }
            };
            if (isRestricted) {
                collectionQuery.recordedBy = req.user._id;
            }
            const payments = await Payment.find(collectionQuery).populate('recordedBy').lean();

            const admissionIds = payments.map(p => p.admission).filter(Boolean);
            const [normalAdms, boardAdms] = await Promise.all([
                Admission.find({ _id: { $in: admissionIds } }).populate('student').populate('course', 'courseName').lean(),
                BoardCourseAdmission.find({ _id: { $in: admissionIds } }).populate('studentId').lean()
            ]);

            const admissionMap = {};
            normalAdms.forEach(adm => {
                const studentName = adm.student?.studentsDetails?.[0]?.studentName || "Unknown Student";
                const phone = adm.student?.studentsDetails?.[0]?.mobileNum || 'N/A';
                const email = adm.student?.studentsDetails?.[0]?.email || 'N/A';
                const courseName = adm.course?.courseName || "N/A";
                admissionMap[adm._id.toString()] = { studentName, phone, email, centreName: adm.centre, courseName };
            });
            boardAdms.forEach(adm => {
                const studentName = adm.studentName || adm.studentId?.studentsDetails?.[0]?.studentName || "Unknown Student";
                const phone = adm.mobileNum || adm.studentId?.studentsDetails?.[0]?.mobileNum || 'N/A';
                const email = adm.studentId?.studentsDetails?.[0]?.email || 'N/A';
                const courseName = adm.boardCourseName || (adm.boardId ? "Board Course" : "N/A");
                admissionMap[adm._id.toString()] = { studentName, phone, email, centreName: adm.centre, courseName };
            });

            detailsList = payments.map(p => {
                const admInfo = admissionMap[p.admission?.toString()];
                const type = p.installmentNumber === 0 ? "Admission Fee" : `Installment #${p.installmentNumber}`;
                const amountWithoutGst = Math.round(p.paidAmount / 1.18);
                return {
                    id: p._id,
                    name: admInfo?.studentName || "Unknown Student",
                    phone: admInfo?.phone || 'N/A',
                    email: admInfo?.email || 'N/A',
                    handledBy: p.recordedBy?.name || 'System',
                    centreName: admInfo?.centreName || 'N/A',
                    dateTime: p.receivedDate || p.paidDate,
                    tag: `₹${amountWithoutGst.toLocaleString()}`,
                    amount: amountWithoutGst,
                    course: admInfo?.courseName || "N/A",
                    isAdmission: p.installmentNumber === 0,
                    feedback: `Method: ${p.paymentMethod || 'Other'} | Type: ${type}`
                };
            });
        }

        if (isRestricted) {
            const centers = await CentreSchema.find({ _id: { $in: (req.user?.centres || []) } }).select('centreName').lean();
            const centerNames = centers.map(c => c.centreName.toLowerCase());
            detailsList = detailsList.filter(d => d.centreName && centerNames.includes(d.centreName.toLowerCase()));
        }

        // Sort detailsList: newest first by dateTime
        detailsList.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        res.status(200).json(detailsList);

    } catch (error) {
        console.error("GET_DAILY_TRACKING_DETAILS_ERROR:", error);
        res.status(500).json({ message: "Failed to fetch daily tracking details", error: error.message });
    }
};

