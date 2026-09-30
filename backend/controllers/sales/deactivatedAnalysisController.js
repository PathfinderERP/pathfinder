import mongoose from "mongoose";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import Centre from "../../models/Master_data/Centre.js";
import Department from "../../models/Master_data/Department.js";
import Zone from "../../models/Zone.js";
import User from "../../models/User.js";

// Helper to get IST Date at specific hour, minute, second
const getISTDate = (y, m, d, hr = 0, min = 0, sec = 0, ms = 0) => {
    const utcDate = new Date(Date.UTC(y, m, d, hr, min, sec, ms));
    utcDate.setMinutes(utcDate.getMinutes() - 330); // 5h 30m offset
    return utcDate;
};

// Helper to calculate date range based on filter preset
const calculateDateBounds = ({ preset, startDate, endDate, selectedDate, month, year }) => {
    const nowInIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const currentYear = nowInIST.getFullYear();
    const currentMonth = nowInIST.getMonth(); // 0-indexed

    // Financial Year Logic (April - March)
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    let start = null;
    let end = null;
    let label = "All Time";

    switch (preset) {
        case "thisMonth": {
            start = getISTDate(currentYear, currentMonth, 1, 0, 0, 0, 0);
            end = getISTDate(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
            label = nowInIST.toLocaleString("default", { month: "long", year: "numeric" });
            break;
        }
        case "previousMonth": {
            start = getISTDate(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
            end = getISTDate(currentYear, currentMonth, 0, 23, 59, 59, 999);
            const prevMonthDate = new Date(nowInIST.getFullYear(), nowInIST.getMonth() - 1, 1);
            label = prevMonthDate.toLocaleString("default", { month: "long", year: "numeric" });
            break;
        }
        case "thisYear": {
            start = getISTDate(fyStartYear, 3, 1, 0, 0, 0, 0); // April 1
            end = getISTDate(fyStartYear + 1, 2, 31, 23, 59, 59, 999); // March 31
            label = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
            break;
        }
        case "previousYear": {
            start = getISTDate(fyStartYear - 1, 3, 1, 0, 0, 0, 0);
            end = getISTDate(fyStartYear, 2, 31, 23, 59, 59, 999);
            label = `FY ${fyStartYear - 1}-${fyStartYear.toString().slice(-2)}`;
            break;
        }
        case "date":
        case "dateWise": {
            if (selectedDate) {
                const [y, m, d] = selectedDate.split("-").map(Number);
                start = getISTDate(y, m - 1, d, 0, 0, 0, 0);
                end = getISTDate(y, m - 1, d, 23, 59, 59, 999);
                label = `${d.toString().padStart(2, "0")}-${m.toString().padStart(2, "0")}-${y}`;
            } else {
                start = getISTDate(currentYear, currentMonth, nowInIST.getDate(), 0, 0, 0, 0);
                end = getISTDate(currentYear, currentMonth, nowInIST.getDate(), 23, 59, 59, 999);
                label = "Today";
            }
            break;
        }
        case "month":
        case "monthWise": {
            const parsedYear = year ? parseInt(year, 10) : currentYear;
            let mIdx = currentMonth;
            if (month !== undefined && month !== null && month !== "") {
                if (typeof month === "string" && isNaN(Number(month))) {
                    const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
                    const foundIdx = monthNames.indexOf(month.toLowerCase());
                    if (foundIdx !== -1) mIdx = foundIdx;
                } else {
                    mIdx = parseInt(month, 10) - 1;
                }
            }
            start = getISTDate(parsedYear, mIdx, 1, 0, 0, 0, 0);
            end = getISTDate(parsedYear, mIdx + 1, 0, 23, 59, 59, 999);
            const mDate = new Date(parsedYear, mIdx, 1);
            label = mDate.toLocaleString("default", { month: "long", year: "numeric" });
            break;
        }
        case "custom": {
            if (startDate && endDate) {
                const [sy, sm, sd] = startDate.split("-").map(Number);
                const [ey, em, ed] = endDate.split("-").map(Number);
                start = getISTDate(sy, sm - 1, sd, 0, 0, 0, 0);
                end = getISTDate(ey, em - 1, ed, 23, 59, 59, 999);
                label = `${startDate} to ${endDate}`;
            }
            break;
        }
        case "all":
        default: {
            start = null;
            end = null;
            label = "All Time";
            break;
        }
    }

    return { start, end, label, fyStartYear, currentYear, currentMonth };
};

/**
 * GET /sales/deactivated-analysis
 * Matrix of Admissions vs Deactivations:
 * Rows = Centres (Total Admitted, Deactivated, Deact %), Columns = Departments
 */
export const getDeactivatedAnalysis = async (req, res) => {
    try {
        const {
            preset = "thisMonth",
            startDate,
            endDate,
            selectedDate,
            month,
            year,
            dateBasis = "deactivationDate", // 'deactivationDate' | 'admissionDate'
            centres: requestedCentres,
            zones: requestedZones,
            departments: requestedDepartments,
            session
        } = req.query;

        // 1. Calculate Date Bounds
        const { start, end, label, fyStartYear, currentYear, currentMonth } = calculateDateBounds({
            preset,
            startDate,
            endDate,
            selectedDate,
            month,
            year
        });

        // Current & Previous Month bounds for summary stats cards
        const thisMonthStart = getISTDate(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const thisMonthEnd = getISTDate(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        const prevMonthStart = getISTDate(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
        const prevMonthEnd = getISTDate(currentYear, currentMonth, 0, 23, 59, 59, 999);

        // Fiscal Year Bounds
        const fyStartThisYear = getISTDate(fyStartYear, 3, 1, 0, 0, 0, 0);
        const fyEndThisYear = getISTDate(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
        const fyStartPrevYear = getISTDate(fyStartYear - 1, 3, 1, 0, 0, 0, 0);
        const fyEndPrevYear = getISTDate(fyStartYear, 2, 31, 23, 59, 59, 999);

        // 2. Fetch Master Data - Only ACTIVE Centres
        const [masterCentres, masterZones, masterDepartments] = await Promise.all([
            Centre.find({ status: { $ne: "deactive" } }).select("centreName enterCode status").lean(),
            Zone.find({ isActive: true }).select("name centres").populate("centres", "centreName status").lean(),
            Department.find().select("departmentName").lean()
        ]);

        // Build Set of valid Active Centre names (excluding franchised / external special formats)
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
                if (cName && activeCentresSet.has(cName)) centreZoneMap[cName] = z.name;
            });
        });

        // Department ID -> Name map
        const deptMap = {};
        masterDepartments.forEach(d => {
            deptMap[d._id.toString()] = d.departmentName;
        });

        // Determine Allowed Centres for user role
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

        // Filter Centres by requested zones/centres strictly from active centres
        let filterCentresList = null;
        if (requestedCentres) {
            const requested = (typeof requestedCentres === "string" ? requestedCentres.split(",") : requestedCentres)
                .map(c => c.toUpperCase().trim())
                .filter(Boolean);
            filterCentresList = requested.filter(c => activeCentresSet.has(c));
        } else if (requestedZones) {
            const zoneIds = (typeof requestedZones === "string" ? requestedZones.split(",") : requestedZones).map(z => z.trim());
            const matchedZones = masterZones.filter(z => zoneIds.includes(z._id.toString()) || zoneIds.includes(z.name));
            filterCentresList = matchedZones
                .flatMap(z => (z.centres || []).map(c => (c.centreName || "").toUpperCase().trim()))
                .filter(c => activeCentresSet.has(c));
        } else {
            filterCentresList = Array.from(activeCentresSet);
        }

        // Apply role restriction
        if (allowedCentreNames !== null) {
            filterCentresList = filterCentresList.filter(c => allowedCentreNames.includes(c));
        }

        const activeFilterSet = new Set(filterCentresList);
        const centresToDisplay = filterCentresList;

        // 3. Query All Admissions (Normal + Board) with Deactivation Indicators
        const sessionFilter = session ? { session: session } : {};

        const [normalRecords, boardRecords] = await Promise.all([
            Admission.aggregate([
                { $match: sessionFilter },
                {
                    $lookup: {
                        from: "students",
                        localField: "student",
                        foreignField: "_id",
                        as: "studentDoc"
                    }
                },
                { $unwind: { path: "$studentDoc", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        admissionNumber: 1,
                        student: 1,
                        studentId: "$student",
                        studentDocId: "$studentDoc._id",
                        studentName: { $ifNull: ["$studentDoc.studentName", "$studentDoc.name"] },
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        studentDept: "$studentDoc.department",
                        course: 1,
                        admissionStatus: 1,
                        studentStatus: "$studentDoc.status",
                        deactivatedBy: { $ifNull: ["$studentDoc.deactivatedBy", "$deactivatedBy"] },
                        effectiveAdmissionDate: { $ifNull: ["$admissionDate", "$createdAt"] },
                        effectiveDeactivationDate: {
                            $ifNull: ["$studentDoc.deactivationDate", "$deactivationDate", "$updatedAt"]
                        },
                        isDeactivated: {
                            $cond: [
                                {
                                    $or: [
                                        { $in: ["$admissionStatus", ["INACTIVE", "CANCELLED"]] },
                                        { $eq: ["$studentDoc.status", "Deactivated"] }
                                    ]
                                },
                                true,
                                false
                            ]
                        }
                    }
                }
            ]),
            BoardCourseAdmission.aggregate([
                { $match: sessionFilter },
                {
                    $lookup: {
                        from: "students",
                        localField: "studentId",
                        foreignField: "_id",
                        as: "studentDoc"
                    }
                },
                { $unwind: { path: "$studentDoc", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        admissionNumber: 1,
                        studentId: 1,
                        studentDocId: "$studentDoc._id",
                        studentName: { $ifNull: ["$studentDoc.studentName", "$studentDoc.name", "$studentName"] },
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        studentDept: "$studentDoc.department",
                        boardCourseName: 1,
                        status: 1,
                        enrolledStudentsStatus: 1,
                        studentStatus: "$studentDoc.status",
                        deactivatedBy: { $ifNull: ["$deactivatedBy", "$studentDoc.deactivatedBy"] },
                        effectiveAdmissionDate: { $ifNull: ["$admissionDate", "$createdAt"] },
                        effectiveDeactivationDate: {
                            $ifNull: ["$deactivationDate", "$studentDoc.deactivationDate", "$updatedAt"]
                        },
                        isDeactivated: {
                            $cond: [
                                {
                                    $or: [
                                        { $in: ["$status", ["DEACTIVATED", "CANCELLED", "INACTIVE"]] },
                                        { $eq: ["$enrolledStudentsStatus", "INACTIVE"] },
                                        { $eq: ["$studentDoc.status", "Deactivated"] }
                                    ]
                                },
                                true,
                                false
                            ]
                        }
                    }
                }
            ])
        ]);

        // Helper to resolve Department Name for any record
        const resolveDeptName = (record) => {
            const deptId = record.department?._id || record.department;
            if (deptId && deptMap[deptId.toString()]) return deptMap[deptId.toString()];

            const sDeptId = record.studentDept?._id || record.studentDept;
            if (sDeptId && deptMap[sDeptId.toString()]) return deptMap[sDeptId.toString()];

            const bName = (record.boardCourseName || "").toLowerCase();
            if (bName.includes("icse")) return "ICSE";
            if (bName.includes("isc")) return "ISC";
            if (bName.includes("madhyamik") || bName.includes("wbbse")) return "Madhyamik";
            if (bName.includes("hs") || bName.includes("wbchse")) return "HS";
            if (bName.includes("cbse")) return "CBSE Department";

            return "Other";
        };

        const allAdmissions = [...normalRecords, ...boardRecords];

        // 4. Build Canonical Student Equivalence Mapping (Union-Find)
        // Deduplicate students who are in both Board and Normal courses using either their student ID or admissionNumber
        const parent = new Map();
        const find = (i) => {
            if (!parent.has(i)) parent.set(i, i);
            if (parent.get(i) !== i) {
                parent.set(i, find(parent.get(i)));
            }
            return parent.get(i);
        };
        const union = (i, j) => {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) parent.set(rootI, rootJ);
        };

        allAdmissions.forEach(rec => {
            const sId = (rec.studentId || rec.studentDocId || rec.student)?.toString();
            const adm = (rec.admissionNumber || "").trim().toUpperCase();
            if (sId && adm && adm !== "-" && adm !== "N/A") {
                union(`sid:${sId}`, `adm:${adm}`);
            }
        });

        const getCanonicalStudentKey = (rec) => {
            const sId = (rec.studentId || rec.studentDocId || rec.student)?.toString();
            const adm = (rec.admissionNumber || "").trim().toUpperCase();
            if (sId) return find(`sid:${sId}`);
            if (adm && adm !== "-" && adm !== "N/A") return find(`adm:${adm}`);
            return rec._id.toString();
        };

        // Benchmark Sets for unique student counting
        const thisMonthAdmittedSet = new Set();
        const thisMonthDeactivatedSet = new Set();
        const prevMonthAdmittedSet = new Set();
        const prevMonthDeactivatedSet = new Set();
        const thisYearAdmittedSet = new Set();
        const thisYearDeactivatedSet = new Set();
        const prevYearAdmittedSet = new Set();
        const prevYearDeactivatedSet = new Set();

        // Department and Centre collection structures
        const deptSet = new Set();
        const centreRowsMap = {};

        // Pre-populate with all allowed active centres
        centresToDisplay.forEach(cName => {
            if (!cName) return;
            centreRowsMap[cName] = {
                centre: cName,
                zone: centreZoneMap[cName] || "General Zone",
                admitted: 0,
                deactivated: 0,
                percentage: 0,
                counts: {},
                total: 0
            };
        });

        // Selected Period Trackers (Sets for deduplication)
        const periodAdmittedSet = new Set();
        const periodDeactivatedSet = new Set();
        const centreAdmittedSet = {};
        const centreDeactivatedSet = {};
        const centreDeptDeactSet = {};

        // Process all admissions
        for (const item of allAdmissions) {
            const cName = item.centre || "";

            // CRITICAL: Strictly skip admissions that do not belong to active centres
            if (!activeFilterSet.has(cName)) {
                continue;
            }

            const admDate = item.effectiveAdmissionDate ? new Date(item.effectiveAdmissionDate) : null;
            const deactDate = item.effectiveDeactivationDate ? new Date(item.effectiveDeactivationDate) : null;
            const isDeact = Boolean(item.isDeactivated);
            const dept = resolveDeptName(item);
            const studentKey = getCanonicalStudentKey(item);

            // Compute global monthly/yearly benchmarks across active centres
            if (admDate) {
                if (admDate >= thisMonthStart && admDate <= thisMonthEnd) thisMonthAdmittedSet.add(studentKey);
                if (admDate >= prevMonthStart && admDate <= prevMonthEnd) prevMonthAdmittedSet.add(studentKey);
                if (admDate >= fyStartThisYear && admDate <= fyEndThisYear) thisYearAdmittedSet.add(studentKey);
                if (admDate >= fyStartPrevYear && admDate <= fyEndPrevYear) prevYearAdmittedSet.add(studentKey);
            }
            if (isDeact && deactDate) {
                if (deactDate >= thisMonthStart && deactDate <= thisMonthEnd) thisMonthDeactivatedSet.add(studentKey);
                if (deactDate >= prevMonthStart && deactDate <= prevMonthEnd) prevMonthDeactivatedSet.add(studentKey);
                if (deactDate >= fyStartThisYear && deactDate <= fyEndThisYear) thisYearDeactivatedSet.add(studentKey);
                if (deactDate >= fyStartPrevYear && deactDate <= fyEndPrevYear) prevYearDeactivatedSet.add(studentKey);
            }

            // Check if record matches selected period filter
            let isAdmittedInPeriod = false;
            let isDeactivatedInPeriod = false;

            if (dateBasis === "admissionDate") {
                if (start === null && end === null) {
                    isAdmittedInPeriod = true;
                    isDeactivatedInPeriod = isDeact;
                } else if (admDate && admDate >= start && admDate <= end) {
                    isAdmittedInPeriod = true;
                    isDeactivatedInPeriod = isDeact;
                }
            } else {
                // deactivationDate basis
                if (start === null && end === null) {
                    isAdmittedInPeriod = true;
                    isDeactivatedInPeriod = isDeact;
                } else {
                    if (admDate && admDate >= start && admDate <= end) {
                        isAdmittedInPeriod = true;
                    }
                    if (isDeact && deactDate && deactDate >= start && deactDate <= end) {
                        isDeactivatedInPeriod = true;
                    }
                }
            }

            // Initialize centre row if not present
            if (!centreRowsMap[cName]) {
                centreRowsMap[cName] = {
                    centre: cName,
                    zone: centreZoneMap[cName] || "General Zone",
                    admitted: 0,
                    deactivated: 0,
                    percentage: 0,
                    counts: {},
                    total: 0
                };
            }

            if (isAdmittedInPeriod) {
                periodAdmittedSet.add(studentKey);
                if (!centreAdmittedSet[cName]) centreAdmittedSet[cName] = new Set();
                centreAdmittedSet[cName].add(studentKey);
            }

            if (isDeactivatedInPeriod) {
                periodDeactivatedSet.add(studentKey);
                if (!centreDeactivatedSet[cName]) centreDeactivatedSet[cName] = new Set();
                centreDeactivatedSet[cName].add(studentKey);

                if (!centreDeptDeactSet[cName]) centreDeptDeactSet[cName] = {};
                if (!centreDeptDeactSet[cName][dept]) centreDeptDeactSet[cName][dept] = new Set();
                centreDeptDeactSet[cName][dept].add(studentKey);

                deptSet.add(dept);
            }
        }

        // Standard department ordering
        const standardOrder = ["Foundation", "Madhyamik", "HS", "ICSE", "ISC", "CBSE Department", "All India", "PMO", "PNTSE", "Academic Department"];
        const orderedDepartments = [];

        standardOrder.forEach(dept => {
            if (deptSet.has(dept)) {
                orderedDepartments.push(dept);
                deptSet.delete(dept);
            }
        });
        const remainingDepts = Array.from(deptSet).sort((a, b) => a.localeCompare(b));
        orderedDepartments.push(...remainingDepts);

        let activeDepartments = orderedDepartments;
        if (requestedDepartments) {
            const reqDepts = (typeof requestedDepartments === "string" ? requestedDepartments.split(",") : requestedDepartments)
                .map(d => d.trim().toLowerCase());
            activeDepartments = activeDepartments.filter(d => reqDepts.includes(d.toLowerCase()));
        }

        // Compute unique student counts per centre and percentage
        const rows = Object.values(centreRowsMap).map(row => {
            const cName = row.centre;
            row.admitted = centreAdmittedSet[cName] ? centreAdmittedSet[cName].size : 0;
            row.deactivated = centreDeactivatedSet[cName] ? centreDeactivatedSet[cName].size : 0;
            row.total = row.deactivated;

            activeDepartments.forEach(d => {
                row.counts[d] = (centreDeptDeactSet[cName] && centreDeptDeactSet[cName][d])
                    ? centreDeptDeactSet[cName][d].size
                    : 0;
            });

            row.percentage = row.admitted > 0 ? Number(((row.deactivated / row.admitted) * 100).toFixed(1)) : 0;
            return row;
        }).sort((a, b) => a.centre.localeCompare(b.centre));

        // Column totals: unique students deactivated in that department across all displayed centres
        const columnTotals = {};
        activeDepartments.forEach(d => {
            const deptStudentSet = new Set();
            centresToDisplay.forEach(cName => {
                if (centreDeptDeactSet[cName] && centreDeptDeactSet[cName][d]) {
                    centreDeptDeactSet[cName][d].forEach(sKey => deptStudentSet.add(sKey));
                }
            });
            columnTotals[d] = deptStudentSet.size;
        });

        // Top Centre by Unique Deactivation Count
        let topCentre = { name: "N/A", deactivated: 0, admitted: 0, rate: 0 };
        rows.forEach(r => {
            if (r.deactivated > topCentre.deactivated) {
                topCentre = {
                    name: r.centre,
                    deactivated: r.deactivated,
                    admitted: r.admitted,
                    rate: r.percentage
                };
            }
        });

        // Top Department by Unique Deactivation Count
        const periodTotalAdmitted = periodAdmittedSet.size;
        const periodTotalDeactivated = periodDeactivatedSet.size;

        let topDepartment = { name: "N/A", deactivated: 0, admitted: 0, rate: 0 };
        Object.entries(columnTotals).forEach(([dName, count]) => {
            if (count > topDepartment.deactivated) {
                topDepartment = {
                    name: dName,
                    deactivated: count,
                    admitted: periodTotalAdmitted,
                    rate: periodTotalAdmitted > 0 ? Number(((count / periodTotalAdmitted) * 100).toFixed(1)) : 0
                };
            }
        });

        const overallRate = periodTotalAdmitted > 0
            ? Number(((periodTotalDeactivated / periodTotalAdmitted) * 100).toFixed(1))
            : 0;

        const thisMonthAdmitted = thisMonthAdmittedSet.size;
        const thisMonthDeactivated = thisMonthDeactivatedSet.size;
        const thisMonthRate = thisMonthAdmitted > 0
            ? Number(((thisMonthDeactivated / thisMonthAdmitted) * 100).toFixed(1))
            : 0;

        const prevMonthAdmitted = prevMonthAdmittedSet.size;
        const prevMonthDeactivated = prevMonthDeactivatedSet.size;
        const prevMonthRate = prevMonthAdmitted > 0
            ? Number(((prevMonthDeactivated / prevMonthAdmitted) * 100).toFixed(1))
            : 0;

        const thisYearAdmitted = thisYearAdmittedSet.size;
        const thisYearDeactivated = thisYearDeactivatedSet.size;
        const thisYearRate = thisYearAdmitted > 0
            ? Number(((thisYearDeactivated / thisYearAdmitted) * 100).toFixed(1))
            : 0;

        const prevYearAdmitted = prevYearAdmittedSet.size;
        const prevYearDeactivated = prevYearDeactivatedSet.size;
        const prevYearRate = prevYearAdmitted > 0
            ? Number(((prevYearDeactivated / prevYearAdmitted) * 100).toFixed(1))
            : 0;

        res.status(200).json({
            success: true,
            filterMeta: {
                preset,
                dateBasis,
                label,
                startDate: start ? start.toISOString().split("T")[0] : null,
                endDate: end ? end.toISOString().split("T")[0] : null
            },
            summary: {
                // Period Metrics (Unique Students)
                totalAdmitted: periodTotalAdmitted,
                totalDeactivated: periodTotalDeactivated,
                rate: overallRate,

                // Current Month (Unique Students)
                thisMonthAdmitted,
                thisMonthDeactivated,
                thisMonthRate,

                // Previous Month (Unique Students)
                prevMonthAdmitted,
                prevMonthDeactivated,
                prevMonthRate,

                // Fiscal Year (Unique Students)
                thisYearAdmitted,
                thisYearDeactivated,
                thisYearRate,
                prevYearAdmitted,
                prevYearDeactivated,
                prevYearRate,

                // Top Attrition Leaders
                topCentre,
                topDepartment
            },
            departments: activeDepartments,
            allAvailableDepartments: orderedDepartments,
            rows,
            columnTotals,
            grandTotalAdmitted: periodTotalAdmitted,
            grandTotalDeactivated: periodTotalDeactivated,
            grandTotalRate: overallRate
        });

    } catch (error) {
        console.error("Error in Deactivated Analysis:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate deactivated analysis",
            error: error.message
        });
    }
};

/**
 * GET /sales/deactivated-analysis/students
 * Drill-down list of deactivated students for a selected Centre and/or Department
 */
export const getDeactivatedStudentsList = async (req, res) => {
    try {
        const {
            centre,
            department,
            preset = "thisMonth",
            startDate,
            endDate,
            selectedDate,
            month,
            year,
            dateBasis = "deactivationDate"
        } = req.query;

        const { start, end } = calculateDateBounds({
            preset,
            startDate,
            endDate,
            selectedDate,
            month,
            year
        });

        // Fetch Active Centres and Department map
        const [masterDepartments, activeCentresDocs] = await Promise.all([
            Department.find().select("departmentName").lean(),
            Centre.find({ status: { $ne: "deactive" } }).select("centreName").lean()
        ]);

        const activeCentresSet = new Set(
            activeCentresDocs
                .map(c => (c.centreName || "").toUpperCase().trim())
                .filter(c => c && !c.match(/phsps|franchise|rkm/i))
        );

        const deptMap = {};
        masterDepartments.forEach(d => {
            deptMap[d._id.toString()] = d.departmentName;
        });

        const normCentre = centre ? centre.toUpperCase().trim() : null;

        // Query Normal Admissions
        const normalMatches = {
            $or: [
                { admissionStatus: { $in: ["INACTIVE", "CANCELLED"] } },
                { "studentDoc.status": "Deactivated" }
            ]
        };

        const [normalRecords, boardRecords] = await Promise.all([
            Admission.aggregate([
                {
                    $lookup: {
                        from: "students",
                        localField: "student",
                        foreignField: "_id",
                        as: "studentDoc"
                    }
                },
                { $unwind: { path: "$studentDoc", preserveNullAndEmptyArrays: true } },
                { $match: normalMatches },
                {
                    $lookup: {
                        from: "courses",
                        localField: "course",
                        foreignField: "_id",
                        as: "courseDoc"
                    }
                },
                { $unwind: { path: "$courseDoc", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        admissionNumber: 1,
                        student: 1,
                        studentId: "$student",
                        studentDocId: "$studentDoc._id",
                        studentName: { $ifNull: ["$studentDoc.studentName", "$studentDoc.name", "N/A"] },
                        rollNo: { $ifNull: ["$admissionNumber", "$rollNo", "-"] },
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        studentDept: "$studentDoc.department",
                        courseName: { $ifNull: ["$courseDoc.courseName", "$boardCourseName", "-"] },
                        contactNumber: { $ifNull: ["$studentDoc.mobileNum", "$studentDoc.mobile", "-"] },
                        admissionStatus: 1,
                        studentStatus: "$studentDoc.status",
                        deactivatedBy: { $ifNull: ["$studentDoc.deactivatedBy", "$deactivatedBy", null] },
                        deactivatedByUserId: { $ifNull: ["$studentDoc.deactivatedByUserId", "$deactivatedByUserId", null] },
                        updatedBy: { $ifNull: ["$studentDoc.updatedBy", "$updatedBy", null] },
                        createdBy: { $ifNull: ["$studentDoc.createdBy", "$createdBy", null] },
                        effectiveDeactivationDate: {
                            $ifNull: ["$studentDoc.deactivationDate", "$deactivationDate", "$updatedAt"]
                        },
                        effectiveAdmissionDate: {
                            $ifNull: ["$admissionDate", "$createdAt"]
                        }
                    }
                }
            ]),
            BoardCourseAdmission.aggregate([
                {
                    $lookup: {
                        from: "students",
                        localField: "studentId",
                        foreignField: "_id",
                        as: "studentDoc"
                    }
                },
                { $unwind: { path: "$studentDoc", preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $or: [
                            { status: { $in: ["DEACTIVATED", "CANCELLED", "INACTIVE"] } },
                            { enrolledStudentsStatus: "INACTIVE" },
                            { "studentDoc.status": "Deactivated" }
                        ]
                    }
                },
                {
                    $project: {
                        admissionNumber: 1,
                        studentId: 1,
                        studentDocId: "$studentDoc._id",
                        studentName: { $ifNull: ["$studentDoc.studentName", "$studentDoc.name", "$studentName", "N/A"] },
                        rollNo: { $ifNull: ["$admissionNumber", "-"] },
                        centre: { $toUpper: { $trim: { input: { $ifNull: ["$centre", ""] } } } },
                        department: 1,
                        studentDept: "$studentDoc.department",
                        courseName: { $ifNull: ["$boardCourseName", "-"] },
                        contactNumber: { $ifNull: ["$studentDoc.mobileNum", "$studentDoc.mobile", "-"] },
                        status: 1,
                        deactivatedBy: { $ifNull: ["$deactivatedBy", "$studentDoc.deactivatedBy", null] },
                        deactivatedByUserId: { $ifNull: ["$deactivatedByUserId", "$studentDoc.deactivatedByUserId", null] },
                        updatedBy: { $ifNull: ["$studentDoc.updatedBy", "$updatedBy", null] },
                        createdBy: { $ifNull: ["$studentDoc.createdBy", "$createdBy", null] },
                        effectiveDeactivationDate: {
                            $ifNull: ["$deactivationDate", "$studentDoc.deactivationDate", "$updatedAt"]
                        },
                        effectiveAdmissionDate: {
                            $ifNull: ["$admissionDate", "$createdAt"]
                        }
                    }
                }
            ])
        ]);

        const resolveDeptName = (record) => {
            const deptId = record.department?._id || record.department;
            if (deptId && deptMap[deptId.toString()]) return deptMap[deptId.toString()];
            const sDeptId = record.studentDept?._id || record.studentDept;
            if (sDeptId && deptMap[sDeptId.toString()]) return deptMap[sDeptId.toString()];
            const bName = (record.courseName || "").toLowerCase();
            if (bName.includes("icse")) return "ICSE";
            if (bName.includes("isc")) return "ISC";
            if (bName.includes("madhyamik") || bName.includes("wbbse")) return "Madhyamik";
            if (bName.includes("hs") || bName.includes("wbchse")) return "HS";
            if (bName.includes("cbse")) return "CBSE Department";
            return "Other";
        };

        const allRecords = [...normalRecords, ...boardRecords];

        // Canonical mapping for drilldown deduplication
        const parent = new Map();
        const find = (i) => {
            if (!parent.has(i)) parent.set(i, i);
            if (parent.get(i) !== i) parent.set(i, find(parent.get(i)));
            return parent.get(i);
        };
        const union = (i, j) => {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) parent.set(rootI, rootJ);
        };

        allRecords.forEach(rec => {
            const sId = (rec.studentId || rec.studentDocId || rec.student)?.toString();
            const adm = (rec.admissionNumber || "").trim().toUpperCase();
            if (sId && adm && adm !== "-" && adm !== "N/A") {
                union(`sid:${sId}`, `adm:${adm}`);
            }
        });

        const getCanonicalStudentKey = (rec) => {
            const sId = (rec.studentId || rec.studentDocId || rec.student)?.toString();
            const adm = (rec.admissionNumber || "").trim().toUpperCase();
            if (sId) return find(`sid:${sId}`);
            if (adm && adm !== "-" && adm !== "N/A") return find(`adm:${adm}`);
            return rec._id.toString();
        };

        // Collect candidate User IDs to resolve real names
        const candidateUserIds = new Set();
        allRecords.forEach(item => {
            [item.deactivatedByUserId, item.updatedBy, item.createdBy].forEach(val => {
                if (val && mongoose.Types.ObjectId.isValid(val.toString()) && val.toString().length === 24) {
                    candidateUserIds.add(val.toString());
                }
            });
            if (item.deactivatedBy && mongoose.Types.ObjectId.isValid(item.deactivatedBy.toString()) && item.deactivatedBy.toString().length === 24) {
                candidateUserIds.add(item.deactivatedBy.toString());
            }
        });

        const usersDocs = candidateUserIds.size > 0 
            ? await User.find({ _id: { $in: Array.from(candidateUserIds) } }).select("name email role").lean() 
            : [];
        const userMap = new Map();
        usersDocs.forEach(u => userMap.set(u._id.toString(), u.name || u.email));

        // Build fallback map for active staff by centre
        const staffByCentreDocs = await User.find({
            role: { $regex: /admin|manager|incharge|counsellor|staff/i },
            isActive: { $ne: false }
        }).select("name centres centre").lean();

        const centreStaffMap = new Map();
        for (const st of staffByCentreDocs) {
            if (st.name) {
                if (st.centre) {
                    const cKey = st.centre.toUpperCase().trim();
                    if (!centreStaffMap.has(cKey)) centreStaffMap.set(cKey, st.name);
                }
            }
        }

        const resolveDeactivatedBy = (item) => {
            // 1. Direct explicit name string
            if (item.deactivatedBy && typeof item.deactivatedBy === "string") {
                const trimmed = item.deactivatedBy.trim();
                if (trimmed && !/system|testrunner|null|undefined/i.test(trimmed)) {
                    if (mongoose.Types.ObjectId.isValid(trimmed) && userMap.has(trimmed)) {
                        return userMap.get(trimmed);
                    }
                    if (trimmed.length > 2 && !/^\d+$/.test(trimmed)) {
                        return trimmed;
                    }
                }
            }
            // 2. From deactivatedByUserId
            if (item.deactivatedByUserId && userMap.has(item.deactivatedByUserId.toString())) {
                return userMap.get(item.deactivatedByUserId.toString());
            }
            // 3. From updatedBy
            if (item.updatedBy) {
                const uStr = item.updatedBy.toString().trim();
                if (userMap.has(uStr)) return userMap.get(uStr);
                if (typeof item.updatedBy === "string" && !/system|testrunner|null|undefined/i.test(uStr) && uStr.length > 2 && !/^\d+$/.test(uStr)) {
                    return uStr;
                }
            }
            // 4. From createdBy
            if (item.createdBy && userMap.has(item.createdBy.toString())) {
                return userMap.get(item.createdBy.toString());
            }
            // 5. From Centre Incharge / Administrator of that centre
            const cName = (item.centre || "").toUpperCase().trim();
            if (cName && centreStaffMap.has(cName)) {
                return centreStaffMap.get(cName);
            }
            return "Centre Incharge";
        };

        const studentMap = new Map();

        for (const item of allRecords) {
            const resolvedDept = resolveDeptName(item);

            // Strictly Active Centres only
            if (!activeCentresSet.has(item.centre)) continue;

            // Filter Centre
            if (normCentre && normCentre !== "TOTAL" && item.centre !== normCentre) continue;

            // Filter Department
            if (department && department.toLowerCase() !== "all" && department.toLowerCase() !== "total" && resolvedDept.toLowerCase() !== department.toLowerCase()) {
                continue;
            }

            // Filter Date
            const targetDate = dateBasis === "admissionDate"
                ? (item.effectiveAdmissionDate ? new Date(item.effectiveAdmissionDate) : null)
                : (item.effectiveDeactivationDate ? new Date(item.effectiveDeactivationDate) : null);

            if (start !== null && end !== null) {
                if (!targetDate || targetDate < start || targetDate > end) continue;
            }

            const studentKey = getCanonicalStudentKey(item);
            const deactByName = resolveDeactivatedBy(item);

            if (studentMap.has(studentKey)) {
                const existing = studentMap.get(studentKey);
                // Combine courses if distinct
                if (item.courseName && item.courseName !== "-" && !existing.courseName.includes(item.courseName)) {
                    existing.courseName = `${existing.courseName}, ${item.courseName}`;
                }
                // Keep latest deactivation info
                if (new Date(item.effectiveDeactivationDate || 0) > new Date(existing.deactivationDate || 0)) {
                    existing.deactivationDate = item.effectiveDeactivationDate;
                    if (deactByName && deactByName !== "Centre Incharge") {
                        existing.deactivatedBy = deactByName;
                    }
                }
                // Keep earliest admissionDate
                if (new Date(item.effectiveAdmissionDate || 0) < new Date(existing.admissionDate || 0)) {
                    existing.admissionDate = item.effectiveAdmissionDate;
                }
            } else {
                studentMap.set(studentKey, {
                    admissionNumber: item.admissionNumber || "-",
                    studentName: item.studentName || "N/A",
                    rollNo: item.rollNo || item.admissionNumber || "-",
                    centre: item.centre || "UNSPECIFIED",
                    department: resolvedDept,
                    courseName: item.courseName || "-",
                    contactNumber: item.contactNumber || "-",
                    deactivatedBy: deactByName,
                    deactivationDate: item.effectiveDeactivationDate,
                    admissionDate: item.effectiveAdmissionDate
                });
            }
        }

        const results = Array.from(studentMap.values());
        // Sort latest deactivation first
        results.sort((a, b) => new Date(b.deactivationDate || 0) - new Date(a.deactivationDate || 0));

        res.status(200).json({
            success: true,
            totalStudents: results.length,
            students: results
        });

    } catch (error) {
        console.error("Error fetching deactivated students list:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch student details",
            error: error.message
        });
    }
};
