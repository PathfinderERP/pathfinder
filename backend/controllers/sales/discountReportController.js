import Admission from "../../models/Admission/Admission.js";
import Centre from "../../models/Master_data/Centre.js";

export const getDiscountReport = async (req, res) => {
    try {
        const {
            year,
            centreIds,
            courseIds,
            examTagId, // Usually string from query, but stored as ObjectId in DB
            session // e.g., "2025-2027"
        } = req.query;

        console.log("Discount Report Query:", req.query);

        let matchStage = {};

        // 1. Time Period / Year Filter
        if (year) {
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

        // 3. Centre Filter
        if (centreIds) {
            const cIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            if (cIds.length > 0) {
                matchStage.centre = { $in: cIds };
            }
        }

        // 4. Course Filter
        if (courseIds) {
            const coIds = typeof courseIds === 'string' ? courseIds.split(',') : courseIds;
            if (coIds.length > 0) {
                // Course in Admission is ObjectId
                // Mongoose aggregate auto-cast usually works if we use $in with ObjectIds
                // But passed as strings. 
                // Let's rely on Mongoose's casting match.
                matchStage.course = { $in: coIds };
            }
        }

        // 5. Exam Tag Filter
        if (examTagId) {
            matchStage.examTag = examTagId;
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

        res.status(200).json({
            data: reportData,
            totalDiscount
        });

    } catch (error) {
        console.error("Error in Discount Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
