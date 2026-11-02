import Centre from "../../models/Master_data/Centre.js";
import LeadManagement from "../../models/LeadManagement.js";
import StudentServiceCall from "../../models/StudentServiceCall.js";
import StudentFollowUp from "../../models/StudentFollowUp.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import MarketingPlanner from "../../models/MarketingPlanner.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Payment from "../../models/Payment/Payment.js";
import mongoose from "mongoose";

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone
 */
const getTodayISTStr = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

const cleanStr = (s) => (s || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Get Centre-wise Daily Consolidated Report
 * GET /api/sales/daily-report?date=YYYY-MM-DD&centreId=...
 */
export const getDailyCentreReport = async (req, res) => {
    try {
        const { date, centreId } = req.query;

        // 1. Resolve Target Date in IST
        const targetDateStr = (date && date.trim()) ? date.trim() : getTodayISTStr();
        const startOfDay = new Date(`${targetDateStr}T00:00:00+05:30`);
        const endOfDay = new Date(`${targetDateStr}T23:59:59.999+05:30`);

        // 2. Fetch Active Master Centres
        const centreQuery = {
            status: { $ne: "deactive" },
            centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] }
        };

        const rawRole = req.user?.role || "";
        const userRole = Array.isArray(rawRole) ? rawRole.join(" ") : String(rawRole);
        const isSuperAdmin = /super\s*admin|ceo|director/i.test(userRole);

        if (!isSuperAdmin && req.user?.centres && req.user.centres.length > 0) {
            centreQuery._id = { $in: req.user.centres };
        }

        if (centreId && centreId !== "all" && mongoose.Types.ObjectId.isValid(centreId)) {
            centreQuery._id = new mongoose.Types.ObjectId(centreId);
        }

        const activeCentres = await Centre.find(centreQuery)
            .select("_id centreName code location")
            .sort({ centreName: 1 })
            .lean();

        if (!activeCentres || activeCentres.length === 0) {
            return res.status(200).json({
                success: true,
                date: targetDateStr,
                summary: {
                    totalCentres: 0,
                    totalCalls: 0,
                    totalFollowUps: 0,
                    totalWalkIns: 0,
                    totalCounselling: 0,
                    totalMarketingActivities: 0,
                    totalSchoolsVisited: 0,
                    totalAdmissions: 0,
                    totalFreshCollection: 0,
                    totalEmiCollection: 0,
                    totalCollection: 0
                },
                centres: []
            });
        }

        // 3. Build Canonical Centre Maps
        const canonicalCentreData = new Map();
        const idMap = new Map();
        const nameMap = new Map();

        activeCentres.forEach(c => {
            const cId = c._id.toString();
            const cName = (c.centreName || "").trim();
            const cleanKey = cleanStr(cName);

            const initialData = {
                centreId: cId,
                centreName: cName,
                code: c.code || "",
                location: c.location || "",
                callsCount: 0,
                followUpsCount: 0,
                walkInCount: 0,
                counsellingCount: 0,
                marketingActivities: [],
                marketingCount: 0,
                schoolsCount: 0,
                admissionsCount: 0,
                coursesBreakdown: {},
                freshCollection: 0,
                emiCollection: 0,
                totalCollection: 0,
                freshCollectionWithGst: 0,
                emiCollectionWithGst: 0,
                totalCollectionWithGst: 0
            };

            canonicalCentreData.set(cId, initialData);
            idMap.set(cId, initialData);
            if (cleanKey) {
                nameMap.set(cleanKey, initialData);
            }
        });

        // Helper to resolve any input (ObjectId, string name, object) to a Canonical Centre
        const resolveToCanonical = (input, userCentres = [], schoolCenter = null) => {
            if (input) {
                if (typeof input === "object") {
                    if (input._id) {
                        const byId = idMap.get(input._id.toString());
                        if (byId) return byId;
                    }
                    if (input.centreName) {
                        const byName = nameMap.get(cleanStr(input.centreName));
                        if (byName) return byName;
                    }
                    if (input.name) {
                        const byName = nameMap.get(cleanStr(input.name));
                        if (byName) return byName;
                    }
                } else {
                    const str = String(input).trim();
                    if (idMap.has(str)) return idMap.get(str);
                    const cleaned = cleanStr(str);
                    if (nameMap.has(cleaned)) return nameMap.get(cleaned);

                    // Partial / fuzzy match
                    for (const [k, obj] of nameMap.entries()) {
                        if (k.length >= 3 && (cleaned.includes(k) || k.includes(cleaned))) {
                            return obj;
                        }
                    }
                }
            }

            // Fallback to school's centre
            if (schoolCenter) {
                const sc = resolveToCanonical(schoolCenter);
                if (sc) return sc;
            }

            // Fallback to user's assigned centres
            if (Array.isArray(userCentres) && userCentres.length > 0) {
                for (const uC of userCentres) {
                    const sc = resolveToCanonical(uC);
                    if (sc) return sc;
                }
            }

            return null;
        };

        const targetCentreIds = activeCentres.map(c => c._id);

        // 4. Run Parallel Queries for the Date
        const [
            leadFollowUpsAgg,
            studentFollowUpsAgg,
            studentServiceCalls,
            walkInLeads,
            boardCounsellings,
            leadCounsellings,
            marketingPlanners,
            normalAdmissions,
            boardAdmissions,
            paymentsList
        ] = await Promise.all([

            // a) LeadManagement Follow-Ups for date
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                {
                    $match: {
                        "followUps.date": { $gte: startOfDay, $lte: endOfDay }
                    }
                },
                {
                    $group: {
                        _id: "$centre",
                        count: { $sum: 1 }
                    }
                }
            ]),

            // b) StudentFollowUp calls for date (PNTSE / PMO)
            StudentFollowUp.aggregate([
                {
                    $match: {
                        callDate: { $gte: startOfDay, $lte: endOfDay }
                    }
                },
                {
                    $group: {
                        _id: "$centre",
                        count: { $sum: 1 }
                    }
                }
            ]),

            // c) StudentServiceCall for date
            StudentServiceCall.find({
                $or: [
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } },
                    { callDate: targetDateStr }
                ]
            }).select("centreId centreName").lean(),

            // d) Walk-Ins from LeadManagement for date
            LeadManagement.find({
                $or: [
                    { isWalkIn: true },
                    { source: { $regex: /walk[- ]?in/i } }
                ],
                $or: [
                    { walkInDate: { $gte: startOfDay, $lte: endOfDay } },
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            }).select("centre walkInDate createdAt").lean(),

            // e1) Board Course Counselling for date
            BoardCourseCounselling.find({
                counselledDate: { $gte: startOfDay, $lte: endOfDay }
            }).select("centre counselledDate").lean(),

            // e2) Lead Counselling for date
            LeadManagement.find({
                isCounseled: true,
                updatedAt: { $gte: startOfDay, $lte: endOfDay }
            }).select("centre updatedAt").lean(),

            // f) Marketing Planner activities for date
            MarketingPlanner.find({
                $or: [
                    { date: targetDateStr },
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            })
                .populate("user", "name email phone role centres primaryCentre")
                .populate("schoolRef", "schoolName centerName tier status")
                .sort({ createdAt: -1 })
                .lean(),

            // g1) Normal Admissions for date
            Admission.find({
                $or: [
                    { admissionDate: { $gte: startOfDay, $lte: endOfDay } },
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            })
                .populate("course", "courseName name")
                .select("centre course courseText admissionDate createdAt downPayment totalPaidAmount")
                .lean(),

            // g2) Board Course Admissions for date
            BoardCourseAdmission.find({
                $or: [
                    { admissionDate: { $gte: startOfDay, $lte: endOfDay } },
                    { createdAt: { $gte: startOfDay, $lte: endOfDay } }
                ]
            })
                .populate("boardId", "boardName name")
                .select("centre boardId boardCourseName admissionDate createdAt downPayment admissionFee totalPaidAmount")
                .lean(),

            // h) Payments / Collections for date
            Payment.aggregate([
                {
                    $lookup: {
                        from: "admissions",
                        localField: "admission",
                        foreignField: "_id",
                        as: "admNormal"
                    }
                },
                {
                    $lookup: {
                        from: "boardcourseadmissions",
                        localField: "admission",
                        foreignField: "_id",
                        as: "admBoard"
                    }
                },
                {
                    $lookup: {
                        from: "pntsestudents",
                        localField: "admission",
                        foreignField: "_id",
                        as: "admPntse"
                    }
                },
                {
                    $lookup: {
                        from: "pmostudents",
                        localField: "admission",
                        foreignField: "_id",
                        as: "admPmo"
                    }
                },
                {
                    $addFields: {
                        admissionDetails: {
                            $ifNull: [
                                { $arrayElemAt: ["$admNormal", 0] },
                                { $arrayElemAt: ["$admBoard", 0] },
                                { $arrayElemAt: ["$admPntse", 0] },
                                { $arrayElemAt: ["$admPmo", 0] }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        effectiveCentre: {
                            $ifNull: ["$centre", "$admissionDetails.centre"]
                        },
                        effectiveDate: {
                            $cond: {
                                if: { $eq: ["$paymentMethod", "CHEQUE"] },
                                then: {
                                    $ifNull: [
                                        { $toDate: "$paidDate" },
                                        { $toDate: "$clearedOrRejectedDate" }
                                    ]
                                },
                                else: { $ifNull: ["$paidDate", "$receivedDate", "$createdAt"] }
                            }
                        },
                        revenueBase: {
                            $cond: [
                                { $regexMatch: { input: { $ifNull: ["$centre", "$admissionDetails.centre", ""] }, regex: "phsps", options: "i" } },
                                { $ifNull: ["$paidAmount", "$totalAmount", 0] },
                                {
                                    $cond: [
                                        { $gt: ["$courseFee", 0] },
                                        "$courseFee",
                                        { $divide: [{ $ifNull: ["$paidAmount", "$totalAmount", 0] }, 1.18] }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $match: {
                        billId: { $exists: true, $nin: [null, "", "-"] },
                        status: { $in: ["PAID", "PARTIAL", "COMPLETED"] },
                        effectiveDate: { $gte: startOfDay, $lte: endOfDay }
                    }
                },
                {
                    $project: {
                        effectiveCentre: 1,
                        installmentNumber: 1,
                        amount: 1,
                        paidAmount: { $ifNull: ["$paidAmount", "$totalAmount", 0] },
                        revenueBase: 1,
                        paymentMethod: 1,
                        remarks: 1,
                        billId: 1
                    }
                }
            ])
        ]);

        // 5. Aggregate Results into Canonical Centres

        // --- a) Lead Follow-Ups ---
        (leadFollowUpsAgg || []).forEach(item => {
            const cObj = resolveToCanonical(item._id);
            if (cObj) {
                cObj.followUpsCount += item.count || 0;
                cObj.callsCount += item.count || 0;
            }
        });

        // --- b) Student Follow-Ups (PNTSE/PMO) ---
        (studentFollowUpsAgg || []).forEach(item => {
            const cObj = resolveToCanonical(item._id);
            if (cObj) {
                cObj.callsCount += item.count || 0;
            }
        });

        // --- c) Student Service Calls ---
        (studentServiceCalls || []).forEach(item => {
            const cObj = resolveToCanonical(item.centreId || item.centreName);
            if (cObj) {
                cObj.callsCount += 1;
            }
        });

        // --- d) Walk-Ins ---
        (walkInLeads || []).forEach(item => {
            const cObj = resolveToCanonical(item.centre);
            if (cObj) {
                cObj.walkInCount += 1;
            }
        });

        // --- e) Counselling ---
        (boardCounsellings || []).forEach(item => {
            const cObj = resolveToCanonical(item.centre);
            if (cObj) {
                cObj.counsellingCount += 1;
            }
        });

        (leadCounsellings || []).forEach(item => {
            const cObj = resolveToCanonical(item.centre);
            if (cObj) {
                cObj.counsellingCount += 1;
            }
        });

        // --- f) Marketing Planner Activities ---
        (marketingPlanners || []).forEach(m => {
            const schoolRefCenter = m.schoolRef?.centerName;
            const userCentres = m.user?.centres || (m.user?.primaryCentre ? [m.user.primaryCentre] : []);
            const cObj = resolveToCanonical(schoolRefCenter, userCentres) || resolveToCanonical(null, userCentres);

            if (cObj) {
                const schoolName = (m.institution || m.schoolRef?.schoolName || "Open Field / Other").trim();
                const activityType = (m.type || "School Visit").trim();
                const activityPurpose = (m.activityPurpose || "").trim();
                const remarks = (m.remarks || m.notes || "-").trim();
                const outcome = (
                    m.actual ||
                    (m.leads && m.leads !== "0" ? `${m.leads} Leads` : "") ||
                    m.activityStatus ||
                    "-"
                ).trim();

                cObj.marketingActivities.push({
                    _id: m._id,
                    institution: schoolName,
                    activityType,
                    activityPurpose: activityPurpose || "-",
                    remarks: remarks || "-",
                    outcome: outcome || "-",
                    leads: Number(m.leads) || 0,
                    marketerName: m.user?.name || m.owner || "Staff",
                    nextActivityDate: m.nextActivityDate || "",
                    status: m.status || "Pending",
                    activityStatus: m.activityStatus || "Neutral"
                });
            }
        });

        // Compute marketingCount & schoolsCount
        canonicalCentreData.forEach(cObj => {
            cObj.marketingCount = cObj.marketingActivities.length;
            const uniqueSchools = new Set(
                cObj.marketingActivities
                    .map(a => a.institution.toLowerCase())
                    .filter(s => s && s !== "-" && s !== "other")
            );
            cObj.schoolsCount = uniqueSchools.size || (cObj.marketingCount > 0 ? 1 : 0);
        });

        // --- g) Admissions & Course-wise breakdown ---
        (normalAdmissions || []).forEach(adm => {
            const cObj = resolveToCanonical(adm.centre);
            if (cObj) {
                cObj.admissionsCount += 1;
                const cNameRaw = adm.course?.courseName || adm.course?.name || adm.courseText || "General Course";
                const courseName = cNameRaw.trim().toUpperCase();
                cObj.coursesBreakdown[courseName] = (cObj.coursesBreakdown[courseName] || 0) + 1;
            }
        });

        (boardAdmissions || []).forEach(adm => {
            const cObj = resolveToCanonical(adm.centre);
            if (cObj) {
                cObj.admissionsCount += 1;
                const cNameRaw = adm.boardCourseName || adm.boardId?.boardName || adm.boardId?.name || "Board Course";
                const courseName = cNameRaw.trim().toUpperCase();
                cObj.coursesBreakdown[courseName] = (cObj.coursesBreakdown[courseName] || 0) + 1;
            }
        });

        // --- h) Payments / Collections (Fresh vs EMI - Without GST Base) ---
        (paymentsList || []).forEach(pay => {
            const cObj = resolveToCanonical(pay.effectiveCentre);
            if (cObj) {
                const amtWithoutGst = Number(pay.revenueBase) || 0;
                const amtWithGst = Number(pay.paidAmount) || 0;
                const instNum = Number(pay.installmentNumber);
                const isFresh = instNum === 0 || (instNum === 1 && /down\s*payment|admission|initial/i.test(pay.remarks || ""));

                if (isFresh) {
                    cObj.freshCollection += amtWithoutGst;
                    cObj.freshCollectionWithGst += amtWithGst;
                } else {
                    cObj.emiCollection += amtWithoutGst;
                    cObj.emiCollectionWithGst += amtWithGst;
                }
                cObj.totalCollection += amtWithoutGst;
                cObj.totalCollectionWithGst += amtWithGst;
            }
        });

        // 6. Calculate Top-Level Summary
        const summary = {
            totalCentres: activeCentres.length,
            totalCalls: 0,
            totalFollowUps: 0,
            totalWalkIns: 0,
            totalCounselling: 0,
            totalMarketingActivities: 0,
            totalSchoolsVisited: 0,
            totalAdmissions: 0,
            totalFreshCollection: 0,
            totalEmiCollection: 0,
            totalCollection: 0,
            totalFreshCollectionWithGst: 0,
            totalEmiCollectionWithGst: 0,
            totalCollectionWithGst: 0
        };

        const centresResult = Array.from(canonicalCentreData.values()).map(c => {
            // Round monetary figures to 2 decimal places
            c.freshCollection = Math.round(c.freshCollection * 100) / 100;
            c.emiCollection = Math.round(c.emiCollection * 100) / 100;
            c.totalCollection = Math.round(c.totalCollection * 100) / 100;
            c.freshCollectionWithGst = Math.round(c.freshCollectionWithGst * 100) / 100;
            c.emiCollectionWithGst = Math.round(c.emiCollectionWithGst * 100) / 100;
            c.totalCollectionWithGst = Math.round(c.totalCollectionWithGst * 100) / 100;

            summary.totalCalls += c.callsCount;
            summary.totalFollowUps += c.followUpsCount;
            summary.totalWalkIns += c.walkInCount;
            summary.totalCounselling += c.counsellingCount;
            summary.totalMarketingActivities += c.marketingCount;
            summary.totalSchoolsVisited += c.schoolsCount;
            summary.totalAdmissions += c.admissionsCount;
            summary.totalFreshCollection += c.freshCollection;
            summary.totalEmiCollection += c.emiCollection;
            summary.totalCollection += c.totalCollection;
            summary.totalFreshCollectionWithGst += c.freshCollectionWithGst;
            summary.totalEmiCollectionWithGst += c.emiCollectionWithGst;
            summary.totalCollectionWithGst += c.totalCollectionWithGst;

            return c;
        });

        // Round summary monetary totals
        summary.totalFreshCollection = Math.round(summary.totalFreshCollection * 100) / 100;
        summary.totalEmiCollection = Math.round(summary.totalEmiCollection * 100) / 100;
        summary.totalCollection = Math.round(summary.totalCollection * 100) / 100;
        summary.totalFreshCollectionWithGst = Math.round(summary.totalFreshCollectionWithGst * 100) / 100;
        summary.totalEmiCollectionWithGst = Math.round(summary.totalEmiCollectionWithGst * 100) / 100;
        summary.totalCollectionWithGst = Math.round(summary.totalCollectionWithGst * 100) / 100;

        return res.status(200).json({
            success: true,
            date: targetDateStr,
            summary,
            centres: centresResult
        });
    } catch (error) {
        console.error("getDailyCentreReport error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate daily centre report.",
            error: error.message
        });
    }
};
