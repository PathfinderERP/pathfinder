import CourseTarget from "../../models/Sales/CourseTarget.js";
import Course from "../../models/Master_data/Courses.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Centre from "../../models/Master_data/Centre.js";
import Department from "../../models/Master_data/Department.js";
import mongoose from "mongoose";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// POST /sales/course-target
export const saveCourseTarget = async (req, res) => {
    try {
        const { centreId, courseId, targetType, year, month, quarter, week, targetCount, department, examTag } = req.body;

        if (!centreId || !targetType || !year || !department || !targetCount) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const filter = { centre: centreId, course: courseId || null, targetType, year, examTag: examTag || null };
        if (targetType === 'MONTHLY') filter.month = month;
        if (targetType === 'QUARTERLY') filter.quarter = quarter;
        if (targetType === 'WEEKLY') filter.week = week;

        const update = { targetCount, department, createdBy: req.user._id };

        console.log("Saving Course Target with Filter:", JSON.stringify(filter));
        console.log("Saving Course Target with Update:", JSON.stringify(update));

        const result = await CourseTarget.findOneAndUpdate(
            filter,
            { ...filter, ...update },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Target saved successfully", data: result });
    } catch (error) {
        console.error("saveCourseTarget error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /sales/course-target/analysis
export const getCourseTargetAnalysis = async (req, res) => {
    try {
        const { centre, year, month, quarter, week, targetType } = req.query;

        if (!centre || !year || !targetType) {
            return res.status(400).json({ message: "Centre(s), Year, and Target Type are required" });
        }

        const parsedYear = parseInt(year, 10);
        let centreIds = [];

        if (centre === 'all') {
            // Fetch all centres allowed for this user
            let allowedCentres;
            if (req.user.role === 'superAdmin') {
                allowedCentres = await Centre.find({}).lean();
            } else {
                const userCentres = req.user.centres.map(id => typeof id === 'object' ? id._id : id);
                allowedCentres = await Centre.find({ _id: { $in: userCentres } }).lean();
            }
            centreIds = allowedCentres.map(c => c._id.toString());
        } else {
            centreIds = centre.split(',').filter(id => id.trim() !== '');
        }
        
        if (centreIds.length === 0) {
            return res.status(200).json({ year: parsedYear, targetType, data: [] });
        }
        
        // 1. Fetch all visible departments from Master Data
        // Use $ne: false to include legacy records where showInAdmission is undefined/not set
        const masterDepartments = await Department.find({ showInAdmission: { $ne: false } }).lean();
        
        // 2. Fetch all courses and populate department
        const courses = await Course.find({}).populate('department').lean();
        
        // 3. Fetch all centres
        const allCentres = await Centre.find({ _id: { $in: centreIds } }).lean();
        const centreMap = {};
        allCentres.forEach(c => centreMap[c._id.toString()] = c);

        // 4. Define Date Range for Admission Counting
        let startDate, endDate;
        if (targetType === 'MONTHLY') {
            const mIdx = monthNames.indexOf(month);
            startDate = new Date(parsedYear, mIdx, 1);
            endDate = new Date(parsedYear, mIdx + 1, 0, 23, 59, 59, 999);
        } else if (targetType === 'QUARTERLY') {
            const q = quarter; // Q1, Q2, Q3, Q4
            const qMap = { 'Q1': [0, 2], 'Q2': [3, 5], 'Q3': [6, 8], 'Q4': [9, 11] };
            startDate = new Date(parsedYear, qMap[q][0], 1);
            endDate = new Date(parsedYear, qMap[q][1] + 1, 0, 23, 59, 59, 999);
        } else if (targetType === 'YEARLY') {
            startDate = new Date(parsedYear, 0, 1);
            endDate = new Date(parsedYear, 11, 31, 23, 59, 59, 999);
        } else if (targetType === 'WEEKLY') {
            startDate = new Date(parsedYear, 0, 1 + (week - 1) * 7);
            endDate = new Date(parsedYear, 0, 1 + week * 7 - 1, 23, 59, 59, 999);
        }

        // 5. Fetch Targets and Admissions for all centres
        const results = [];

        for (const centreId of centreIds) {
            const centreDoc = centreMap[centreId];
            if (!centreDoc) continue;

            const targetFilter = { centre: centreId, year: parsedYear, targetType };
            if (targetType === 'MONTHLY') targetFilter.month = month;
            if (targetType === 'QUARTERLY') targetFilter.quarter = quarter;
            if (targetType === 'WEEKLY') targetFilter.week = week;

            const targets = await CourseTarget.find(targetFilter).lean();
            console.log(`Found ${targets.length} targets for centre ${centreId}`);
            
            // Map targets by Department
            const deptTargetAgg = {};
            targets.forEach(t => {
                const dId = t.department.toString();
                if (!deptTargetAgg[dId]) deptTargetAgg[dId] = { direct: 0, courseSum: 0 };
                
                if (t.course) {
                    deptTargetAgg[dId].courseSum += (t.targetCount || 0);
                } else {
                    deptTargetAgg[dId].direct = (t.targetCount || 0);
                }
            });

            console.log("Dept Target Map:", JSON.stringify(deptTargetAgg));

            const centreName = centreDoc.centreName;
            // Use regex for case-insensitive match to handle naming variations
            const centreRegex = new RegExp(`^${centreName.trim()}$`, 'i');
            
            console.log(`Fetching admissions for ${centreName} from ${startDate} to ${endDate}`);

            const [normalAdmissions, boardAdmissions] = await Promise.all([
                Admission.aggregate([
                    { $match: { 
                        centre: centreRegex, 
                        admissionDate: { $gte: startDate, $lte: endDate }, 
                        admissionStatus: "ACTIVE" 
                    } },
                    { $group: { _id: "$department", count: { $sum: 1 } } }
                ]),
                BoardCourseAdmission.aggregate([
                    { $match: { 
                        centre: centreRegex, 
                        admissionDate: { $gte: startDate, $lte: endDate }, 
                        status: "ACTIVE" 
                    } },
                    { $group: { _id: "$boardId", count: { $sum: 1 } } }
                ])
            ]);

            console.log("Normal Admissions found:", JSON.stringify(normalAdmissions));

            const deptAdmissionMap = {};
            normalAdmissions.forEach(a => { if (a._id) deptAdmissionMap[a._id.toString()] = a.count; });
            
            // Map master departments to final results
            const finalDeptStats = masterDepartments.map(dept => {
                const dId = dept._id.toString();
                const targetData = deptTargetAgg[dId] || { direct: 0, courseSum: 0 };
                const achieved = deptAdmissionMap[dId] || 0;
                
                const finalTarget = targetData.direct > 0 ? targetData.direct : targetData.courseSum;
                const finalPct = finalTarget > 0 ? (achieved / finalTarget) * 100 : 0;

                return {
                    name: dept.departmentName,
                    id: dept._id,
                    target: finalTarget,
                    achieved: achieved,
                    pct: parseFloat(finalPct.toFixed(1)),
                    courses: [] 
                };
            });

            results.push({
                centreId,
                centreName,
                departments: finalDeptStats
            });
        }

        res.status(200).json({
            year: parsedYear,
            targetType,
            data: results
        });

    } catch (error) {
        console.error("getCourseTargetAnalysis error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
