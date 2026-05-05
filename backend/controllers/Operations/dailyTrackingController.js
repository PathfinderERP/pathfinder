import CentreSchema from "../../models/Master_data/Centre.js";
import LeadManagement from "../../models/LeadManagement.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import EmployeeAttendance from "../../models/Attendance/EmployeeAttendance.js";
import Payment from "../../models/Payment/Payment.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

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

            const counselledNormalCount = await LeadManagement.countDocuments({
                centre: centerId,
                isCounseled: true,
                updatedAt: dateFilter
            });

            const counselledBoardCount = await BoardCourseCounselling.countDocuments({
                centre: centerId,
                updatedAt: dateFilter
            });

            // --- Admissions ---
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
                        total: { $sum: "$paidAmount" }
                    }
                }
            ]);

            const collectionsAmount = collections.length > 0 ? collections[0].total : 0;
            const totalCollections = collectionsAmount;

            return {
                id: center._id,
                name: center.centreName,
                head: "Not Assigned", // Optional: logic to find Center Head
                status: "Active",
                staffPresent: staffPresentCount,
                staffTotal: staffTotalCount > 0 ? staffTotalCount : 0,
                dailyCalls: dailyCallsCount,
                counselledNormal: counselledNormalCount,
                counselledBoard: counselledBoardCount,
                admissionNormal: admissionNormalCount,
                admissionBoard: admissionBoardCount,
                collections: `₹${totalCollections.toLocaleString()}`
            };
        }));

        res.status(200).json(trackingData);

    } catch (error) {
        console.error("GET_DAILY_TRACKING_ERROR:", error);
        res.status(500).json({ message: "Failed to fetch daily tracking data", error: error.message });
    }
};
