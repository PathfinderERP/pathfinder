import Admission from "../../models/Admission/Admission.js";
import LeadManagement from "../../models/LeadManagement.js";
import Centre from "../../models/Master_data/Centre.js";
import Course from "../../models/Master_data/Courses.js";
import ExamTag from "../../models/Master_data/ExamTag.js";
import ClassModel from "../../models/Master_data/Class.js";
import mongoose from "mongoose";

export const getAdmissionReport = async (req, res) => {
    try {
        const {
            year,
            startDate,
            endDate,
            centreIds, // comma separated or array
            courseIds, // comma separated or array
            classIds,  // comma separated or array
            examTagId
        } = req.query;

        console.log("Admission Report Query:", req.query);

        // Filters
        let admissionQuery = {};
        let leadQuery = {};

        // Date Filter (Range or Year)
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            const targetYear = parseInt(year) || new Date().getFullYear();
            start = new Date(targetYear, 0, 1);
            end = new Date(targetYear, 11, 31, 23, 59, 59);
        }

        admissionQuery.admissionDate = { $gte: start, $lte: end };
        leadQuery.createdAt = { $gte: start, $lte: end };

        // Resolve Centre IDs for filtering
        let allowedCentreIds = [];
        let allowedCentreNames = [];
        if (req.user.role !== 'superAdmin') {
            const userCentres = await Centre.find({ _id: { $in: req.user.centres || [] } }).select("centreName");
            allowedCentreIds = userCentres.map(c => c._id.toString());
            allowedCentreNames = userCentres.map(c => c.centreName);
        }

        if (centreIds) {
            const rawIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));

            if (req.user.role !== 'superAdmin') {
                const finalIds = validIds.filter(id => allowedCentreIds.includes(id));
                const finalObjectIds = finalIds.map(id => new mongoose.Types.ObjectId(id));
                leadQuery.centre = { $in: finalObjectIds.length > 0 ? finalObjectIds : [new mongoose.Types.ObjectId()] };

                // Since finalIds are already strings, and we have allowedCentreNames, we need to find names of finalIds
                const finalCentres = await Centre.find({ _id: { $in: finalObjectIds } }).select("centreName");
                const finalNames = finalCentres.map(c => c.centreName);
                admissionQuery.centre = { $in: finalNames.length > 0 ? finalNames : ["__NO_MATCH__"] };
            } else if (validIds.length > 0) {
                const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));
                leadQuery.centre = { $in: objectIds };
                const centres = await Centre.find({ _id: { $in: objectIds } }).select("centreName");
                const centreNames = centres.map(c => c.centreName);
                admissionQuery.centre = { $in: centreNames.length > 0 ? centreNames : ["__NO_MATCH__"] };
            }
        } else if (req.user.role !== 'superAdmin') {
            leadQuery.centre = { $in: allowedCentreIds.map(id => new mongoose.Types.ObjectId(id)) };
            admissionQuery.centre = { $in: allowedCentreNames.length > 0 ? allowedCentreNames : ["__NO_MATCH__"] };
        }

        // Course Filter
        if (courseIds) {
            const rawIds = typeof courseIds === 'string' ? courseIds.split(',') : courseIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));

            if (objectIds.length > 0) {
                admissionQuery.course = { $in: objectIds };
                leadQuery.course = { $in: objectIds };
            }
        }

        // Class Filter
        if (classIds) {
            const rawIds = typeof classIds === 'string' ? classIds.split(',') : classIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));

            if (objectIds.length > 0) {
                admissionQuery.class = { $in: objectIds };
                // Using class in leadQuery if applicable, usually it is 'class' field in Lead schema too
                // Assuming standard reference
                // leadQuery.class = { $in: objectIds }; 
            }
        }

        // Exam Tag Filter
        if (examTagId && mongoose.Types.ObjectId.isValid(examTagId)) {
            const eId = new mongoose.Types.ObjectId(examTagId);
            admissionQuery.examTag = eId;
            const tagDoc = await ExamTag.findById(eId);
            if (tagDoc) {
                leadQuery.targetExam = tagDoc.examName;
            }
        }

        const reportType = req.query.reportType || 'monthly';

        if (reportType === 'daily') {
            // --- DAILY REPORTING ENGINE ---
            const dailyAdmitted = await Admission.aggregate([
                { $match: admissionQuery },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            const dailyCounselling = await LeadManagement.aggregate([
                {
                    $match: {
                        ...leadQuery,
                        leadType: { $in: ['HOT LEAD', 'COLD LEAD'] }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            // Merge daily data
            const allDates = [...new Set([...dailyAdmitted.map(d => d._id), ...dailyCounselling.map(d => d._id)])].sort();
            const trendData = allDates.map(date => {
                const adm = dailyAdmitted.find(d => d._id === date);
                const coun = dailyCounselling.find(d => d._id === date);
                return {
                    date,
                    count: adm ? adm.count : 0,
                    admitted: adm ? adm.count : 0,
                    counselling: coun ? coun.count : 0
                };
            });

            const totalAdmitted = dailyAdmitted.reduce((sum, d) => sum + d.count, 0);
            const totalCounselling = dailyCounselling.reduce((sum, d) => sum + d.count, 0);

            return res.status(200).json({
                trend: trendData,
                status: {
                    admitted: totalAdmitted,
                    inCounselling: totalCounselling
                }
            });
        }

        // --- MONTHLY REPORTING ENGINE (Default) ---
        const monthlyTrend = await Admission.aggregate([
            { $match: admissionQuery },
            {
                $group: {
                    _id: { $month: "$admissionDate" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 1b. Detailed Trend (Grouped by Month, Centre, Course, Class) - For Excel
        const detailedTrendRaw = await Admission.aggregate([
            { $match: admissionQuery },
            {
                $group: {
                    _id: {
                        month: { $month: "$admissionDate" },
                        centre: "$centre",
                        course: "$course",
                        class: "$class"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "_id.course",
                    foreignField: "_id",
                    as: "courseInfo"
                }
            },
            { $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "classes",
                    localField: "_id.class",
                    foreignField: "_id",
                    as: "classInfo"
                }
            },
            { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    month: "$_id.month",
                    centre: "$_id.centre",
                    courseName: "$courseInfo.courseName",
                    className: "$classInfo.name",
                    count: "$count",
                    _id: 0
                }
            },
            { $sort: { month: 1, centre: 1 } }
        ]);


        // 2. Admission Status (Admitted vs In Counselling) per month
        const monthlyAdmitted = await Admission.aggregate([
            { $match: admissionQuery },
            {
                $group: {
                    _id: { $month: "$admissionDate" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const monthlyCounselling = await LeadManagement.aggregate([
            {
                $match: {
                    ...leadQuery,
                    leadType: { $in: ['HOT LEAD', 'COLD LEAD'] }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format for Chart (fill missing months with 0)
        const trendData = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let totalAdmitted = 0;
        let totalCounselling = 0;

        for (let i = 1; i <= 12; i++) {
            const adm = monthlyAdmitted.find(m => m._id === i);
            const coun = monthlyCounselling.find(m => m._id === i);

            const admittedCount = adm ? adm.count : 0;
            const counsellingCount = coun ? coun.count : 0;

            totalAdmitted += admittedCount;
            totalCounselling += counsellingCount;

            trendData.push({
                month: monthNames[i - 1],
                count: admittedCount,
                admitted: admittedCount,
                counselling: counsellingCount
            });
        }

        const detailedTrend = detailedTrendRaw.map(item => ({
            ...item,
            monthName: monthNames[item.month - 1]
        }));

        res.status(200).json({
            trend: trendData,
            detailedTrend: detailedTrend,
            status: {
                admitted: totalAdmitted,
                inCounselling: totalCounselling
            }
        });

    } catch (error) {
        console.error("Error in Admission Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
