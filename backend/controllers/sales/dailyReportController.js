import Centre from "../../models/Master_data/Centre.js";
import LeadManagement from "../../models/LeadManagement.js";
import StudentServiceCall from "../../models/StudentServiceCall.js";
import StudentFollowUp from "../../models/StudentFollowUp.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import MarketingPlanner from "../../models/MarketingPlanner.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Payment from "../../models/Payment/Payment.js";
import User from "../../models/User.js";
import SchoolForTask from "../../models/Master_data/SchoolForTask.js";
import Zone from "../../models/Zone.js";
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
        const { date, startDate, endDate, fromDate, toDate, centreId, zoneId, centreIds, zoneIds } = req.query;

        // Parse multiple or single centre IDs
        const rawCentreIds = centreIds || centreId;
        let parsedCentreIds = [];
        if (Array.isArray(rawCentreIds)) {
            parsedCentreIds = rawCentreIds.map(id => id.toString().trim()).filter(id => id && id !== "all" && mongoose.Types.ObjectId.isValid(id));
        } else if (typeof rawCentreIds === "string" && rawCentreIds.trim() && rawCentreIds !== "all") {
            parsedCentreIds = rawCentreIds.split(",").map(id => id.trim()).filter(id => id && id !== "all" && mongoose.Types.ObjectId.isValid(id));
        }

        // Parse multiple or single zone IDs
        const rawZoneIds = zoneIds || zoneId;
        let parsedZoneIds = [];
        if (Array.isArray(rawZoneIds)) {
            parsedZoneIds = rawZoneIds.map(id => id.toString().trim()).filter(id => id && id !== "all" && mongoose.Types.ObjectId.isValid(id));
        } else if (typeof rawZoneIds === "string" && rawZoneIds.trim() && rawZoneIds !== "all") {
            parsedZoneIds = rawZoneIds.split(",").map(id => id.trim()).filter(id => id && id !== "all" && mongoose.Types.ObjectId.isValid(id));
        }

        // 1. Resolve Target Date / Date Range in IST
        const todayIST = getTodayISTStr();
        const effectiveStart = (startDate || fromDate || date || todayIST).trim();
        const effectiveEnd = (endDate || toDate || date || effectiveStart).trim();

        const startOfRange = new Date(`${effectiveStart}T00:00:00+05:30`);
        const endOfRange = new Date(`${effectiveEnd}T23:59:59.999+05:30`);
        const dateLabel = effectiveStart === effectiveEnd ? effectiveStart : `${effectiveStart} to ${effectiveEnd}`;

        // 2. Fetch Active Master Centres
        const centreQuery = {
            status: { $ne: "deactive" },
            centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] }
        };

        const rawRole = req.user?.role || "";
        const userRole = Array.isArray(rawRole) ? rawRole.join(" ") : String(rawRole);
        const isSuperAdmin = /super\s*admin|ceo|director/i.test(userRole);

        // Resolve zone IDs to centre IDs
        let zoneCentreIdStrs = [];
        if (parsedZoneIds.length > 0) {
            const zoneDocs = await Zone.find({ _id: { $in: parsedZoneIds } }).select("centres").lean();
            zoneCentreIdStrs = zoneDocs.flatMap(z => (z.centres || [])).map(id => (id._id || id).toString());
        }

        // Determine final allowed centre IDs
        let allowedCentreIdStrs = null;

        // A. Role restricted centres
        if (!isSuperAdmin && req.user?.centres && req.user.centres.length > 0) {
            allowedCentreIdStrs = req.user.centres.map(id => id.toString());
        }

        // B. Zone filtering
        if (parsedZoneIds.length > 0) {
            if (allowedCentreIdStrs) {
                allowedCentreIdStrs = allowedCentreIdStrs.filter(id => zoneCentreIdStrs.includes(id));
            } else {
                allowedCentreIdStrs = zoneCentreIdStrs;
            }
        }

        // C. Specific Centre filtering
        if (parsedCentreIds.length > 0) {
            if (allowedCentreIdStrs) {
                allowedCentreIdStrs = allowedCentreIdStrs.filter(id => parsedCentreIds.includes(id));
            } else {
                allowedCentreIdStrs = parsedCentreIds;
            }
        }

        if (allowedCentreIdStrs !== null) {
            centreQuery._id = { $in: allowedCentreIdStrs.map(id => new mongoose.Types.ObjectId(id)) };
        }

        const activeCentres = await Centre.find(centreQuery)
            .select("_id centreName code location")
            .sort({ centreName: 1 })
            .lean();

        if (!activeCentres || activeCentres.length === 0) {
            return res.status(200).json({
                success: true,
                date: dateLabel, startDate: effectiveStart, endDate: effectiveEnd, isRange: effectiveStart !== effectiveEnd,
                summary: {
                    totalCentres: 0,
                    totalCalls: 0,
                    totalFollowUps: 0,
                    totalWalkIns: 0,
                    totalCounselling: 0,
                    totalCounsellingNormal: 0,
                    totalCounsellingBoard: 0,
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
                walkIns: [],
                counsellingCount: 0,
                counsellingNormalCount: 0,
                counsellingBoardCount: 0,
                _normalCounsSet: new Set(),
                _boardCounsSet: new Set(),
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
                        "followUps.date": { $gte: startOfRange, $lte: endOfRange }
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
                        callDate: { $gte: startOfRange, $lte: endOfRange }
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
                    { createdAt: { $gte: startOfRange, $lte: endOfRange } },
                    { callDate: { $gte: effectiveStart, $lte: effectiveEnd } }
                ]
            }).select("centreId centreName").lean(),

            // d) Walk-Ins from LeadManagement for date
            LeadManagement.find({
                centre: { $in: targetCentreIds },
                $or: [
                    { isWalkIn: true, walkInDate: { $gte: startOfRange, $lte: endOfRange } },
                    { source: { $regex: /^walk[- ]?in$/i }, createdAt: { $gte: startOfRange, $lte: endOfRange } }
                ]
            })
                .populate("walkInBy", "name email role")
                .populate("createdBy", "name email role")
                .populate("className", "name")
                .populate("course", "courseName name")
                .select("centre name phoneNumber secondPhoneNumber source isWalkIn walkInDate createdAt walkInBy createdBy className targetClass course courseText remarks leadType isCounseled isAdmitted status")
                .lean(),

            // e1) Board Course Counselling for date
            BoardCourseCounselling.find({
                counselledDate: { $gte: startOfRange, $lte: endOfRange }
            }).select("studentId centre counselledDate").lean(),

            // e2) Lead Counselling for date
            LeadManagement.find({
                centre: { $in: targetCentreIds },
                isCounseled: true,
                updatedAt: { $gte: startOfRange, $lte: endOfRange }
            }).select("_id centre updatedAt").lean(),

            // f) Marketing Planner activities for date
            MarketingPlanner.find({
                $or: [
                    { date: { $gte: effectiveStart, $lte: effectiveEnd } },
                    { createdAt: { $gte: startOfRange, $lte: endOfRange } }
                ]
            })
                .populate("user", "name email phone role centres primaryCentre")
                .populate("schoolRef", "schoolName centerName tier status")
                .sort({ createdAt: -1 })
                .lean(),

            // g1) Normal Admissions for date
            Admission.find({
                $or: [
                    { admissionDate: { $gte: startOfRange, $lte: endOfRange } },
                    { createdAt: { $gte: startOfRange, $lte: endOfRange } }
                ]
            })
                .populate("course", "courseName name")
                .select("centre student course courseText admissionDate createdAt downPayment totalPaidAmount")
                .lean(),

            // g2) Board Course Admissions for date
            BoardCourseAdmission.find({
                $or: [
                    { admissionDate: { $gte: startOfRange, $lte: endOfRange } },
                    { createdAt: { $gte: startOfRange, $lte: endOfRange } }
                ]
            })
                .populate("boardId", "boardName name")
                .select("centre studentId boardId boardCourseName admissionDate createdAt downPayment admissionFee totalPaidAmount")
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
                                        { $toDate: "$clearedOrRejectedDate" },
                                        { $toDate: "$paidDate" }
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
                        effectiveDate: { $gte: startOfRange, $lte: endOfRange }
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
        (walkInLeads || []).forEach(lead => {
            const cObj = resolveToCanonical(lead.centre);
            if (cObj) {
                cObj.walkInCount += 1;
                cObj.walkIns.push({
                    _id: lead._id,
                    name: lead.name || "Anonymous",
                    phoneNumber: lead.phoneNumber || lead.secondPhoneNumber || "-",
                    className: lead.className?.name || lead.targetClass || "-",
                    courseName: lead.course?.courseName || lead.courseText || "-",
                    source: lead.source || (lead.isWalkIn ? "Walk-In" : "-"),
                    isWalkIn: Boolean(lead.isWalkIn),
                    walkInDate: lead.walkInDate || lead.createdAt,
                    taggedBy: lead.walkInBy?.name || lead.createdBy?.name || "Staff",
                    leadType: lead.isWalkIn ? "Walk-In (Tagged)" : (lead.leadType || "WALK_IN"),
                    status: lead.status || "-",
                    isCounseled: Boolean(lead.isCounseled),
                    isAdmitted: Boolean(lead.isAdmitted),
                    remarks: lead.remarks || ""
                });
            }
        });

        // --- e) Counselling (Leads & Board Records) ---
        (leadCounsellings || []).forEach(item => {
            const cObj = resolveToCanonical(item.centre);
            if (cObj && item._id) {
                cObj._normalCounsSet.add(item._id.toString());
            }
        });

        (boardCounsellings || []).forEach(item => {
            const cObj = resolveToCanonical(item.centre);
            if (cObj && (item.studentId || item._id)) {
                cObj._boardCounsSet.add((item.studentId || item._id).toString());
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
                if (adm.student) {
                    cObj._normalCounsSet.add(adm.student.toString());
                } else if (adm._id) {
                    cObj._normalCounsSet.add(adm._id.toString());
                }
                const cNameRaw = adm.course?.courseName || adm.course?.name || adm.courseText || "General Course";
                const courseName = cNameRaw.trim().toUpperCase();
                cObj.coursesBreakdown[courseName] = (cObj.coursesBreakdown[courseName] || 0) + 1;
            }
        });

        (boardAdmissions || []).forEach(adm => {
            const cObj = resolveToCanonical(adm.centre);
            if (cObj) {
                cObj.admissionsCount += 1;
                if (adm.studentId) {
                    cObj._boardCounsSet.add(adm.studentId.toString());
                } else if (adm._id) {
                    cObj._boardCounsSet.add(adm._id.toString());
                }
                const cNameRaw = adm.boardCourseName || adm.boardId?.boardName || adm.boardId?.name || "Board Course";
                const courseName = cNameRaw.trim().toUpperCase();
                cObj.coursesBreakdown[courseName] = (cObj.coursesBreakdown[courseName] || 0) + 1;
            }
        });

        // Finalize counselling counts per canonical centre
        canonicalCentreData.forEach(cObj => {
            cObj.counsellingNormalCount = cObj._normalCounsSet ? cObj._normalCounsSet.size : 0;
            cObj.counsellingBoardCount = cObj._boardCounsSet ? cObj._boardCounsSet.size : 0;
            cObj.counsellingCount = cObj.counsellingNormalCount + cObj.counsellingBoardCount;
            delete cObj._normalCounsSet;
            delete cObj._boardCounsSet;
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
            totalCounsellingNormal: 0,
            totalCounsellingBoard: 0,
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
            summary.totalCounsellingNormal += c.counsellingNormalCount || 0;
            summary.totalCounsellingBoard += c.counsellingBoardCount || 0;
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

        // Fetch all active zones and master centres for frontend filters
        const [allZones, allMasterCentres] = await Promise.all([
            Zone.find({ isActive: true }).select("_id name centres").sort({ name: 1 }).lean(),
            Centre.find({ status: { $ne: "deactive" }, centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] } }).select("_id centreName code").sort({ centreName: 1 }).lean()
        ]);

        return res.status(200).json({
            success: true,
            date: dateLabel, startDate: effectiveStart, endDate: effectiveEnd, isRange: effectiveStart !== effectiveEnd,
            summary,
            centres: centresResult,
            zones: allZones,
            allCentres: allMasterCentres
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
