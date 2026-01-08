import Admission from "../../models/Admission/Admission.js";
import Centre from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getDiscountReport = async (req, res) => {
    try {
        const {
            year,
            startDate,
            endDate,
            centreIds,
            courseIds,
            examTagId, // Usually string from query, but stored as ObjectId in DB
            session // e.g., "2025-2027"
        } = req.query;

        console.log("Discount Report Query:", req.query);

        let matchStage = {};

        // 1. Time Period / Date Filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchStage.admissionDate = { $gte: start, $lte: end };
        } else if (year) {
            const targetYear = parseInt(year);
            if (!isNaN(targetYear)) {
                const startOfYear = new Date(targetYear, 0, 1);
                const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
                matchStage.admissionDate = { $gte: startOfYear, $lte: endOfYear };
            }
        }

        // 2. Academic Session Filter
        if (session) {
            matchStage.academicSession = session;
        }

        // 3. Centre Filter (Resolve IDs to Names)
        let allowedCentreNames = [];
        if (req.user.role !== 'superAdmin') {
            const userCentres = await Centre.find({ _id: { $in: req.user.centres || [] } }).select("centreName");
            allowedCentreNames = userCentres.map(c => c.centreName);
        }

        if (centreIds) {
            const rawIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));

            if (validIds.length > 0) {
                const requestedCentres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
                const requestedNames = requestedCentres.map(c => c.centreName);

                if (req.user.role !== 'superAdmin') {
                    const finalNames = requestedNames.filter(name => allowedCentreNames.includes(name));
                    matchStage.centre = { $in: finalNames.length > 0 ? finalNames : ["__NO_MATCH__"] };
                } else if (requestedNames.length > 0) {
                    matchStage.centre = { $in: requestedNames };
                }
            }
        } else if (req.user.role !== 'superAdmin') {
            matchStage.centre = { $in: allowedCentreNames.length > 0 ? allowedCentreNames : ["__NO_MATCH__"] };
        }

        // 4. Course Filter (Fix: Cast to ObjectId)
        if (courseIds) {
            const rawIds = typeof courseIds === 'string' ? courseIds.split(',') : courseIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));

            if (objectIds.length > 0) {
                matchStage.course = { $in: objectIds };
            }
        }

        // 5. Exam Tag Filter (Fix: Cast to ObjectId)
        if (examTagId && mongoose.Types.ObjectId.isValid(examTagId)) {
            matchStage.examTag = new mongoose.Types.ObjectId(examTagId);
        }

        // Aggregation: Group by Centre
        const centreStats = await Admission.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$centre",
                    originalFees: { $sum: "$baseFees" },
                    committedFees: { $sum: "$totalFees" },
                    discountGiven: { $sum: "$discountAmount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Map Centre IDs to Names
        const allCentres = await Centre.find({}, 'centreName _id');
        const centreMap = {};
        allCentres.forEach(c => {
            centreMap[c._id.toString()] = c.centreName;
        });

        const reportData = centreStats.map(item => {
            const name = centreMap[item._id] || item._id;
            const original = item.originalFees || 0;
            const discount = item.discountGiven || 0;
            const efficiency = original > 0 ? ((discount / original) * 100).toFixed(2) : 0;

            return {
                name: name,
                originalFees: original,
                committedFees: item.committedFees || 0,
                discountGiven: discount,
                efficiency: parseFloat(efficiency),
                count: item.count
            };
        });

        // Sorting (Optional, by name or value?)
        // Let's sort by name for now, or use frontend sorting
        // reportData.sort((a, b) => a.name.localeCompare(b.name));

        const totalDiscount = reportData.reduce((acc, curr) => acc + curr.discountGiven, 0);

        // Detailed Report for Excel (Student-wise)
        const detailedStats = await Admission.find(matchStage)
            .populate({
                path: 'student',
                select: 'studentsDetails'
            })
            .populate('course', 'courseName')
            .sort({ admissionDate: -1 })
            .lean();

        const detailedReport = detailedStats.map(adm => {
            const details = adm.student?.studentsDetails?.[0] || {};
            return {
                admissionNumber: adm.admissionNumber || "-",
                studentName: details.studentName || "Unknown",
                centre: adm.centre || "Unknown",
                course: adm.course?.courseName || "Unknown",
                admissionDate: adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString() : "-",
                originalFees: adm.baseFees || 0,
                discountGiven: adm.discountAmount || 0,
                committedFees: adm.totalFees || 0,
                remarks: adm.remarks || ""
            };
        });

        res.status(200).json({
            data: reportData,
            detailedReport,
            totalDiscount
        });

    } catch (error) {
        console.error("Error in Discount Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
