import Admission from "../../models/Admission/Admission.js";
import LeadManagement from "../../models/LeadManagement.js";
import Centre from "../../models/Master_data/Centre.js";
import Course from "../../models/Master_data/Courses.js";
import ExamTag from "../../models/Master_data/ExamTag.js";

export const getAdmissionReport = async (req, res) => {
    try {
        const {
            year,
            centreIds, // comma separated or array
            courseIds, // comma separated or array
            examTagId
        } = req.query;

        console.log("Admission Report Query:", req.query);
        console.log("Filters - Year:", year, "CentreIds:", centreIds, "CourseIds:", courseIds, "ExamTagId:", examTagId);

        // Filters
        let admissionQuery = {};
        let leadQuery = {};

        // Date Filter (Year)
        // For admissions, we check admissionDate
        // For leads, we check createdAt
        const targetYear = parseInt(year) || new Date().getFullYear();
        const startOfYear = new Date(targetYear, 0, 1);
        const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

        admissionQuery.admissionDate = { $gte: startOfYear, $lte: endOfYear };
        leadQuery.createdAt = { $gte: startOfYear, $lte: endOfYear };

        // Centre Filter
        if (centreIds) {
            const cIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            if (cIds.length > 0) {
                admissionQuery.centre = { $in: cIds };
                leadQuery.centre = { $in: cIds };
            }
        }

        // Course Filter
        if (courseIds) {
            const crsIds = typeof courseIds === 'string' ? courseIds.split(',') : courseIds;
            if (crsIds.length > 0) {
                admissionQuery.course = { $in: crsIds };
                leadQuery.course = { $in: crsIds };
            }
        }

        // Exam Tag Filter
        if (examTagId) {
            admissionQuery.examTag = examTagId;
            // LeadManagement has targetExam (String) or something? 
            // LeadManagement schema: targetExam: { type: String }. No direct ExamTag ref.
            if (examTagId) {
                const tagDoc = await ExamTag.findById(examTagId);
                if (tagDoc) {
                    leadQuery.targetExam = tagDoc.examName;
                }
            }
        }

        // 1. Monthly Trend (Admissions Only)
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

        // 2. Admission Status (Admitted vs In Counselling)
        const admittedCount = await Admission.countDocuments(admissionQuery);

        const inCounsellingCount = await LeadManagement.countDocuments({
            ...leadQuery,
            leadType: { $in: ['HOT LEAD', 'COLD LEAD'] } // Exclude NEGATIVE/Closed
        });

        res.status(200).json({
            trend: trendData,
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
