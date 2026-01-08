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

        // 1. Monthly Trend (Admissions Only) - Summary for Chart
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
                    from: "classes", // Collection name usually plural lowercase of Class model
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


        // Format for Chart (fill missing months with 0)
        const trendData = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 1; i <= 12; i++) {
            const found = monthlyTrend.find(m => m._id === i);
            trendData.push({
                month: monthNames[i - 1],
                count: found ? found.count : 0
            });
        }

        // Map Detailed Trend to friendly Month Names
        const detailedTrend = detailedTrendRaw.map(item => ({
            ...item,
            monthName: monthNames[item.month - 1]
        }));

        // 2. Admission Status (Admitted vs In Counselling)
        const admittedCount = await Admission.countDocuments(admissionQuery);

        const inCounsellingCount = await LeadManagement.countDocuments({
            ...leadQuery,
            leadType: { $in: ['HOT LEAD', 'COLD LEAD'] } // Exclude NEGATIVE/Closed
        });

        res.status(200).json({
            trend: trendData,
            detailedTrend: detailedTrend, // New field for Excel
            status: {
                admitted: admittedCount,
                inCounselling: inCounsellingCount
            }
        });

    } catch (error) {
        console.error("Error in Admission Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
