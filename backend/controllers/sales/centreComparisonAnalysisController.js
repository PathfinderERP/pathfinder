import mongoose from "mongoose";
import Centre from "../../models/Master_data/Centre.js";
import Zone from "../../models/Zone.js";
import Department from "../../models/Master_data/Department.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Payment from "../../models/Payment/Payment.js";

const standardMonths = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March"
];

// Helper to get calendar year for a given month in a financial year (e.g., "2026-2027")
const getCalendarYearForMonth = (fyString, monthName) => {
    const [startYearStr, endYearStr] = fyString.split("-");
    const startYear = parseInt(startYearStr, 10);
    const endYear = parseInt(endYearStr.length === 2 ? `20${endYearStr}` : endYearStr, 10);
    const monthIndex = standardMonths.indexOf(monthName);
    // April (0) - December (8) belong to startYear; January (9) - March (11) belong to endYear
    return monthIndex <= 8 ? startYear : endYear;
};

const monthToNumber = {
    "January": 0, "February": 1, "March": 2, "April": 3,
    "May": 4, "June": 5, "July": 6, "August": 7,
    "September": 8, "October": 9, "November": 10, "December": 11
};

export const getCentreComparisonAnalysis = async (req, res) => {
    try {
        const {
            viewMode = "month", // "month" | "year" | "day"
            financialYear = "2026-2027",
            months, // comma separated or single
            selectedDate, // for day-wise e.g. "2026-09-30"
            centreIds,
            zoneIds,
            departments: requestedDepts
        } = req.query;

        // 1. Fetch Active Centres, Zones, Departments
        const [masterCentres, masterZones, masterDepartments] = await Promise.all([
            Centre.find({ status: { $ne: "deactive" } }).select("centreName enterCode status").lean(),
            Zone.find({ isActive: true }).select("name centres").populate("centres", "centreName status").lean(),
            Department.find().select("departmentName").lean()
        ]);

        const activeCentresSet = new Set(
            masterCentres
                .map(c => (c.centreName || "").toUpperCase().trim())
                .filter(c => c && !c.match(/phsps|franchise|rkm/i))
        );

        // Map centreName -> zoneName
        const centreZoneMap = {};
        masterZones.forEach(z => {
            (z.centres || []).forEach(c => {
                const cName = (c.centreName || "").toUpperCase().trim();
                if (cName && activeCentresSet.has(cName)) {
                    centreZoneMap[cName] = z.name;
                }
            });
        });

        // Department ID -> Name map
        const deptMap = {};
        masterDepartments.forEach(d => {
            deptMap[d._id.toString()] = d.departmentName;
        });

        // Resolve allowed centres for role
        let allowedCentreNames = null;
        if (req.user && req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const userCentres = req.user.centres || [];
            allowedCentreNames = userCentres
                .map(id => {
                    const matched = masterCentres.find(mc => mc._id.toString() === id.toString());
                    return matched ? matched.centreName.toUpperCase().trim() : null;
                })
                .filter(c => c && activeCentresSet.has(c));
        }

        let filterCentresList = null;
        if (centreIds && !String(centreIds).includes("[object Object]")) {
            const reqCentres = (typeof centreIds === "string" ? centreIds.split(",") : centreIds)
                .map(c => (typeof c === "string" ? c.toUpperCase().trim() : ""))
                .filter(c => Boolean(c) && !c.includes("[OBJECT OBJECT]"));
            filterCentresList = reqCentres.filter(c => activeCentresSet.has(c));
        } else if (zoneIds && !String(zoneIds).includes("[object Object]")) {
            const zIds = (typeof zoneIds === "string" ? zoneIds.split(",") : zoneIds)
                .map(z => (typeof z === "string" ? z.trim() : ""))
                .filter(z => Boolean(z) && !z.includes("[object Object]"));
            const matchedZones = masterZones.filter(z => zIds.includes(z._id.toString()) || zIds.includes(z.name));
            filterCentresList = matchedZones
                .flatMap(z => (z.centres || []).map(c => (c.centreName || "").toUpperCase().trim()))
                .filter(c => activeCentresSet.has(c));
        }

        if (!filterCentresList || filterCentresList.length === 0) {
            filterCentresList = Array.from(activeCentresSet);
        }

        if (allowedCentreNames !== null) {
            filterCentresList = filterCentresList.filter(c => allowedCentreNames.includes(c));
        }

        const activeFilterSet = new Set(filterCentresList);
        const centresToDisplay = filterCentresList.sort((a, b) => a.localeCompare(b));

        // 2. Define Date Intervals based on viewMode
        let currentRanges = [];
        let previousRanges = [];

        // Helper to get prev financial year string (e.g. "2026-2027" -> "2025-2026")
        const [currStartYear, currEndYear] = financialYear.split("-").map(y => parseInt(y, 10));
        const prevFinancialYear = `${currStartYear - 1}-${currEndYear - 1}`;

        if (viewMode === "day") {
            let dayDate;
            if (selectedDate) {
                const parts = selectedDate.split("-").map(Number);
                dayDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
            } else {
                dayDate = new Date();
            }

            const currDayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
            const currDayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
            currentRanges.push({ start: currDayStart, end: currDayEnd });

            // Previous Year Same Day
            const prevDayDate = new Date(dayDate);
            prevDayDate.setFullYear(prevDayDate.getFullYear() - 1);
            const prevDayStart = new Date(prevDayDate.getFullYear(), prevDayDate.getMonth(), prevDayDate.getDate(), 0, 0, 0, 0);
            const prevDayEnd = new Date(prevDayDate.getFullYear(), prevDayDate.getMonth(), prevDayDate.getDate(), 23, 59, 59, 999);
            previousRanges.push({ start: prevDayStart, end: prevDayEnd });

        } else if (viewMode === "year") {
            // Full FY
            const currFyStart = new Date(currStartYear, 3, 1, 0, 0, 0, 0); // April 1
            const currFyEnd = new Date(currEndYear, 2, 31, 23, 59, 59, 999); // March 31
            currentRanges.push({ start: currFyStart, end: currFyEnd });

            const prevFyStart = new Date(currStartYear - 1, 3, 1, 0, 0, 0, 0);
            const prevFyEnd = new Date(currEndYear - 1, 2, 31, 23, 59, 59, 999);
            previousRanges.push({ start: prevFyStart, end: prevFyEnd });

        } else {
            // "month" mode
            let targetMonths = months
                ? (typeof months === "string" ? months.split(",") : months)
                    .map(m => (typeof m === "string" ? m.trim() : ""))
                    .filter(m => standardMonths.includes(m))
                : [];

            if (targetMonths.length === 0) {
                const currMonthIdx = new Date().getMonth();
                const currStdMonth = standardMonths[currMonthIdx >= 3 ? currMonthIdx - 3 : currMonthIdx + 9];
                targetMonths = [currStdMonth || "September"];
            }

            targetMonths.forEach(m => {
                const cYear = getCalendarYearForMonth(financialYear, m);
                const mIdx = monthToNumber[m];
                const cStart = new Date(cYear, mIdx, 1, 0, 0, 0, 0);
                const cEnd = new Date(cYear, mIdx + 1, 0, 23, 59, 59, 999);
                currentRanges.push({ start: cStart, end: cEnd, month: m });

                const pYear = getCalendarYearForMonth(prevFinancialYear, m);
                const pStart = new Date(pYear, mIdx, 1, 0, 0, 0, 0);
                const pEnd = new Date(pYear, mIdx + 1, 0, 23, 59, 59, 999);
                previousRanges.push({ start: pStart, end: pEnd, month: m });
            });
        }

        // 3. Resolve Department Helper (identical logic to Deactivated Analysis)
        const resolveDeptName = (record) => {
            const deptId = record.department?._id || record.department;
            if (deptId && deptMap[deptId.toString()]) return deptMap[deptId.toString()];
            const sDeptId = record.studentDept?._id || record.studentDept;
            if (sDeptId && deptMap[sDeptId.toString()]) return deptMap[sDeptId.toString()];
            const bName = (record.courseName || record.boardCourseName || "").toLowerCase();
            if (bName.includes("icse")) return "ICSE";
            if (bName.includes("isc")) return "ISC";
            if (bName.includes("madhyamik") || bName.includes("wbbse")) return "Madhyamik";
            if (bName.includes("hs") || bName.includes("wbchse")) return "HS";
            if (bName.includes("cbse")) return "CBSE Department";
            return "Other";
        };

        // Standard department ordering
        const standardOrder = [
            "Foundation", "Madhyamik", "HS", "ICSE", "ISC",
            "CBSE Department", "All India", "PMO", "PNTSE", "Academic Department"
        ];
        const allKnownDeptsSet = new Set(standardOrder);
        masterDepartments.forEach(d => allKnownDeptsSet.add(d.departmentName));
        const orderedDepartments = Array.from(allKnownDeptsSet);

        // 4. Fetch Admissions for Current & Previous ranges
        const buildDateOrQuery = (field, ranges) => {
            if (!ranges || ranges.length === 0) {
                return { [field]: { $exists: true } };
            }
            if (ranges.length === 1) {
                return { [field]: { $gte: ranges[0].start, $lte: ranges[0].end } };
            }
            return {
                $or: ranges.map(r => ({ [field]: { $gte: r.start, $lte: r.end } }))
            };
        };

        const [currNormalAdm, prevNormalAdm, currBoardAdm, prevBoardAdm] = await Promise.all([
            Admission.aggregate([
                { $match: buildDateOrQuery("admissionDate", currentRanges) },
                {
                    $project: {
                        admissionNumber: 1,
                        student: 1,
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        course: 1,
                        admissionDate: 1,
                        totalPaidAmount: 1
                    }
                }
            ]),
            Admission.aggregate([
                { $match: buildDateOrQuery("admissionDate", previousRanges) },
                {
                    $project: {
                        admissionNumber: 1,
                        student: 1,
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        course: 1,
                        admissionDate: 1,
                        totalPaidAmount: 1
                    }
                }
            ]),
            BoardCourseAdmission.aggregate([
                { $match: buildDateOrQuery("admissionDate", currentRanges) },
                {
                    $project: {
                        admissionNumber: 1,
                        studentId: 1,
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        boardCourseName: 1,
                        admissionDate: 1,
                        totalPaidAmount: 1
                    }
                }
            ]),
            BoardCourseAdmission.aggregate([
                { $match: buildDateOrQuery("admissionDate", previousRanges) },
                {
                    $project: {
                        admissionNumber: 1,
                        studentId: 1,
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        boardCourseName: 1,
                        admissionDate: 1,
                        totalPaidAmount: 1
                    }
                }
            ])
        ]);

        // 5. Fetch Revenue Payments for Current & Previous ranges
        const paymentMatchCurrent = {
            status: "PAID",
            ...buildDateOrQuery("paidDate", currentRanges)
        };
        const paymentMatchPrevious = {
            status: "PAID",
            ...buildDateOrQuery("paidDate", previousRanges)
        };

        const paymentLookupPipeline = (matchCondition) => [
            { $match: matchCondition },
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
                $project: {
                    paidAmount: { $ifNull: ["$paidAmount", "$amount", 0] },
                    paidDate: 1,
                    centre: {
                        $toUpper: {
                            $trim: {
                                input: {
                                    $ifNull: [
                                        "$centre",
                                        { $arrayElemAt: ["$admNormal.centre", 0] },
                                        { $arrayElemAt: ["$admBoard.centre", 0] },
                                        ""
                                    ]
                                }
                            }
                        }
                    },
                    department: {
                        $ifNull: [
                            { $arrayElemAt: ["$admNormal.department", 0] },
                            { $arrayElemAt: ["$admBoard.department", 0] }
                        ]
                    },
                    boardCourseName: {
                        $arrayElemAt: ["$admBoard.boardCourseName", 0]
                    }
                }
            }
        ];

        const [currPayments, prevPayments] = await Promise.all([
            Payment.aggregate(paymentLookupPipeline(paymentMatchCurrent)),
            Payment.aggregate(paymentLookupPipeline(paymentMatchPrevious))
        ]);

        // 6. Build Aggregated Centre Rows Structure
        const rowsMap = {};

        centresToDisplay.forEach(cName => {
            rowsMap[cName] = {
                centre: cName,
                zone: centreZoneMap[cName] || "General Zone",
                revenueCurrent: 0,
                revenuePrevious: 0,
                revenueGrowth: 0,
                admissionsCurrent: 0,
                admissionsPrevious: 0,
                admissionsGrowth: 0,
                deptRevenueCurrent: {},
                deptRevenuePrevious: {},
                deptAdmissionsCurrent: {},
                deptAdmissionsPrevious: {}
            };
        });

        // Helper to aggregate Admissions
        const processAdmissions = (records, isCurrent) => {
            records.forEach(rec => {
                const cName = rec.centre || "";
                if (!activeFilterSet.has(cName)) return;

                const dept = resolveDeptName(rec);
                const row = rowsMap[cName];
                if (!row) return;

                if (isCurrent) {
                    row.admissionsCurrent += 1;
                    row.deptAdmissionsCurrent[dept] = (row.deptAdmissionsCurrent[dept] || 0) + 1;
                } else {
                    row.admissionsPrevious += 1;
                    row.deptAdmissionsPrevious[dept] = (row.deptAdmissionsPrevious[dept] || 0) + 1;
                }
            });
        };

        processAdmissions(currNormalAdm, true);
        processAdmissions(currBoardAdm, true);
        processAdmissions(prevNormalAdm, false);
        processAdmissions(prevBoardAdm, false);

        // Helper to aggregate Revenue
        const processPayments = (records, isCurrent) => {
            records.forEach(p => {
                const cName = p.centre || "";
                if (!activeFilterSet.has(cName)) return;

                const dept = resolveDeptName(p);
                const amount = Number(p.paidAmount) || 0;
                const row = rowsMap[cName];
                if (!row) return;

                if (isCurrent) {
                    row.revenueCurrent += amount;
                    row.deptRevenueCurrent[dept] = (row.deptRevenueCurrent[dept] || 0) + amount;
                } else {
                    row.revenuePrevious += amount;
                    row.deptRevenuePrevious[dept] = (row.deptRevenuePrevious[dept] || 0) + amount;
                }
            });
        };

        processPayments(currPayments, true);
        processPayments(prevPayments, false);

        // Compute Growth Percentages and round values
        const rows = Object.values(rowsMap).map(r => {
            // Revenue Growth %
            if (r.revenuePrevious > 0) {
                r.revenueGrowth = Number((((r.revenueCurrent - r.revenuePrevious) / r.revenuePrevious) * 100).toFixed(1));
            } else {
                r.revenueGrowth = r.revenueCurrent > 0 ? 100 : 0;
            }

            // Admissions Growth %
            if (r.admissionsPrevious > 0) {
                r.admissionsGrowth = Number((((r.admissionsCurrent - r.admissionsPrevious) / r.admissionsPrevious) * 100).toFixed(1));
            } else {
                r.admissionsGrowth = r.admissionsCurrent > 0 ? 100 : 0;
            }

            r.revenueCurrent = Math.round(r.revenueCurrent);
            r.revenuePrevious = Math.round(r.revenuePrevious);

            return r;
        }).sort((a, b) => a.centre.localeCompare(b.centre));

        // 7. Overall Summary Card Metrics
        const totalRevenueCurrent = rows.reduce((s, r) => s + r.revenueCurrent, 0);
        const totalRevenuePrevious = rows.reduce((s, r) => s + r.revenuePrevious, 0);
        const overallRevenueGrowth = totalRevenuePrevious > 0
            ? Number((((totalRevenueCurrent - totalRevenuePrevious) / totalRevenuePrevious) * 100).toFixed(1))
            : (totalRevenueCurrent > 0 ? 100 : 0);

        const totalAdmissionsCurrent = rows.reduce((s, r) => s + r.admissionsCurrent, 0);
        const totalAdmissionsPrevious = rows.reduce((s, r) => s + r.admissionsPrevious, 0);
        const overallAdmissionsGrowth = totalAdmissionsPrevious > 0
            ? Number((((totalAdmissionsCurrent - totalAdmissionsPrevious) / totalAdmissionsPrevious) * 100).toFixed(1))
            : (totalAdmissionsCurrent > 0 ? 100 : 0);

        // Top Centre by Revenue & Admissions
        let topCentreRevenue = { name: "N/A", value: 0 };
        let topCentreAdmissions = { name: "N/A", value: 0 };

        rows.forEach(r => {
            if (r.revenueCurrent > topCentreRevenue.value) {
                topCentreRevenue = { name: r.centre, value: r.revenueCurrent };
            }
            if (r.admissionsCurrent > topCentreAdmissions.value) {
                topCentreAdmissions = { name: r.centre, value: r.admissionsCurrent };
            }
        });

        // Top Department by Revenue
        const deptTotalsRevenue = {};
        const deptTotalsAdmissions = {};
        orderedDepartments.forEach(d => {
            deptTotalsRevenue[d] = rows.reduce((s, r) => s + (r.deptRevenueCurrent[d] || 0), 0);
            deptTotalsAdmissions[d] = rows.reduce((s, r) => s + (r.deptAdmissionsCurrent[d] || 0), 0);
        });

        let topDeptRevenue = { name: "N/A", value: 0 };
        Object.entries(deptTotalsRevenue).forEach(([d, val]) => {
            if (val > topDeptRevenue.value) {
                topDeptRevenue = { name: d, value: val };
            }
        });

        return res.status(200).json({
            success: true,
            viewMode,
            financialYear,
            prevFinancialYear,
            summary: {
                totalRevenueCurrent,
                totalRevenuePrevious,
                overallRevenueGrowth,
                totalAdmissionsCurrent,
                totalAdmissionsPrevious,
                overallAdmissionsGrowth,
                topCentreRevenue,
                topCentreAdmissions,
                topDeptRevenue
            },
            departments: orderedDepartments,
            deptTotalsRevenue,
            deptTotalsAdmissions,
            rows
        });

    } catch (error) {
        console.error("GET_CENTRE_COMPARISON_ANALYSIS_ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate centre comparison analysis",
            error: error.message
        });
    }
};
