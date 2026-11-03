import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import {
    FaPhoneAlt,
    FaHandsHelping,
    FaGraduationCap,
    FaRupeeSign,
    FaCalendarAlt,
    FaDownload,
    FaSearch,
    FaSyncAlt,
    FaBuilding,
    FaMapMarkerAlt,
    FaFilter,
    FaWalking,
    FaChevronLeft,
    FaChevronRight,
    FaTimes,
    FaExternalLinkAlt,
    FaInfoCircle,
    FaPercentage,
    FaUser,
    FaCheckCircle,
    FaClock,
    FaBookOpen
} from "react-icons/fa";
import { GiSchoolBag } from "react-icons/gi";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
        style: "currency",
        currency: "INR"
    });
};

const getTodayIST = () => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    return formatter.format(new Date());
};

const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    try {
        const [y, m, d] = dateStr.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch {
        return dateStr;
    }
};


const getDateRangeLimits = (range, customStart, customEnd) => {
    const today = new Date();
    const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    let start, end;
    switch (range) {
        case "Today":
            start = formatDate(today);
            end = formatDate(today);
            break;
        case "Yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            start = formatDate(yesterday);
            end = formatDate(yesterday);
            break;
        }
        case "This Week": {
            const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon
            const diffToMon = (dayOfWeek + 6) % 7;
            const monday = new Date(today);
            monday.setDate(today.getDate() - diffToMon);
            start = formatDate(monday);
            end = formatDate(today);
            break;
        }
        case "Previous Week": {
            const dayOfWeek = today.getDay();
            const diffToMon = (dayOfWeek + 6) % 7;
            const thisMonday = new Date(today);
            thisMonday.setDate(today.getDate() - diffToMon);
            const prevMonday = new Date(thisMonday);
            prevMonday.setDate(thisMonday.getDate() - 7);
            const prevSunday = new Date(thisMonday);
            prevSunday.setDate(thisMonday.getDate() - 1);
            start = formatDate(prevMonday);
            end = formatDate(prevSunday);
            break;
        }
        case "Last 7 Days": {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);
            start = formatDate(sevenDaysAgo);
            end = formatDate(today);
            break;
        }
        case "This Month": {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            start = formatDate(startOfMonth);
            end = formatDate(today);
            break;
        }
        case "Previous Month":
        case "Last Month": {
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            start = formatDate(startOfLastMonth);
            end = formatDate(endOfLastMonth);
            break;
        }
        case "This Year": {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            start = formatDate(startOfYear);
            end = formatDate(today);
            break;
        }
        case "Previous Year": {
            const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
            const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
            start = formatDate(startOfLastYear);
            end = formatDate(endOfLastYear);
            break;
        }
        case "Custom Range":
        case "Custom":
            start = customStart || formatDate(today);
            end = customEnd || formatDate(today);
            break;
        default:
            start = formatDate(today);
            end = formatDate(today);
            break;
    }
    return { start, end };
};

const DailyReport = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const apiUrl = import.meta.env.VITE_API_URL || "";

    // State
    // Date & Range State (Default: Today)
    const [dateRangeOption, setDateRangeOption] = useState("Today");
    const [customStartDate, setCustomStartDate] = useState(getTodayIST());
    const [customEndDate, setCustomEndDate] = useState(getTodayIST());
    const [selectedZones, setSelectedZones] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [zonesList, setZonesList] = useState([]);
    const [masterCentresList, setMasterCentresList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);

    // Hover State for Admissions
    const [hoveredAdmission, setHoveredAdmission] = useState(null); // { centre, rect }

    // Modals
    const [marketingModalCentre, setMarketingModalCentre] = useState(null);
    const [coursesModalCentre, setCoursesModalCentre] = useState(null);
    const [walkInModalCentre, setWalkInModalCentre] = useState(null);
    const [walkInModalOpen, setWalkInModalOpen] = useState(false);
    const [walkInSearch, setWalkInSearch] = useState("");

    // Counselling Modal
    const [counsellingModalOpen, setCounsellingModalOpen] = useState(false);
    const [counsellingModalCentre, setCounsellingModalCentre] = useState(null);
    const [counsellingSearch, setCounsellingSearch] = useState("");

    // Admissions Modal
    const [admissionsModalOpen, setAdmissionsModalOpen] = useState(false);
    const [admissionsModalCentre, setAdmissionsModalCentre] = useState(null);
    const [admissionsSearch, setAdmissionsSearch] = useState("");

    // Collections Modal
    const [collectionsModalOpen, setCollectionsModalOpen] = useState(false);
    const [collectionsModalCentre, setCollectionsModalCentre] = useState(null);
    const [collectionsSearch, setCollectionsSearch] = useState("");

    // Marketing All Modal (all centres)
    const [marketingAllModalOpen, setMarketingAllModalOpen] = useState(false);
    const [marketingAllSearch, setMarketingAllSearch] = useState("");

    const handleOpenWalkInsModal = (centreObj = null) => {
        setWalkInModalCentre(centreObj);
        setWalkInSearch("");
        setWalkInModalOpen(true);
    };

    const handleOpenCounsellingModal = (centreObj = null) => {
        setCounsellingModalCentre(centreObj);
        setCounsellingSearch("");
        setCounsellingModalOpen(true);
    };

    const handleOpenAdmissionsModal = (centreObj = null) => {
        setAdmissionsModalCentre(centreObj);
        setAdmissionsSearch("");
        setAdmissionsModalOpen(true);
    };

    const handleOpenCollectionsModal = (centreObj = null) => {
        setCollectionsModalCentre(centreObj);
        setCollectionsSearch("");
        setCollectionsModalOpen(true);
    };

    const handleOpenMarketingModal = () => {
        setMarketingAllSearch("");
        setMarketingAllModalOpen(true);
    };

    // Active Range computation
    const activeRange = useMemo(() => {
        if (dateRangeOption === "Custom Range") {
            return {
                start: customStartDate || getTodayIST(),
                end: customEndDate || customStartDate || getTodayIST()
            };
        }
        return getDateRangeLimits(dateRangeOption, customStartDate, customEndDate);
    }, [dateRangeOption, customStartDate, customEndDate]);

    // Human-friendly date display label
    const dateDisplayLabel = useMemo(() => {
        const { start, end } = activeRange;
        if (start === end) {
            if (start === getTodayIST()) return `Today (${formatDateDisplay(start)})`;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split("T")[0];
            if (start === yStr) return `Yesterday (${formatDateDisplay(start)})`;
            return formatDateDisplay(start);
        }
        return `${formatDateDisplay(start)} — ${formatDateDisplay(end)}`;
    }, [activeRange]);

    // Fetch Report Data
    // Initial fetch for zones and master centres list
    useEffect(() => {
        const loadInitialFilters = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };
                const zoneRes = await fetch(`${apiUrl}/zone`, { headers });
                if (zoneRes.ok) {
                    const zData = await zoneRes.json();
                    const list = Array.isArray(zData) ? zData : (zData.zones || zData.data || []);
                    if (list.length > 0) setZonesList(list);
                }
            } catch (e) {
                console.error("Failed to preload zones:", e);
            }
        };
        loadInitialFilters();
    }, [apiUrl]);

    // Zone options for CustomMultiSelect
    const zoneOptions = useMemo(() => {
        return zonesList.map(z => ({ value: String(z._id), label: z.name }));
    }, [zonesList]);

    // Centre options filtered by selected zones
    const centreOptions = useMemo(() => {
        const all = masterCentresList.length > 0
            ? masterCentresList
            : (reportData?.allCentres || reportData?.centres || []);

        if (selectedZones.length === 0) {
            return all.map(c => ({ value: String(c._id), label: c.centreName + (c.code ? ` (${c.code})` : "") }));
        }
        const selectedZoneIdSet = new Set(selectedZones);
        const filteredCentresByZone = all.filter(c => {
            return zonesList.some(z =>
                selectedZoneIdSet.has(String(z._id)) &&
                z.centres &&
                z.centres.some(zc => String(zc._id || zc) === String(c._id))
            );
        });
        return filteredCentresByZone.map(c => ({ value: String(c._id), label: c.centreName + (c.code ? ` (${c.code})` : "") }));
    }, [masterCentresList, reportData, selectedZones, zonesList]);

    // Selected Zone objects for CustomMultiSelect
    const selectedZoneObjects = useMemo(() => {
        return zoneOptions.filter(o => selectedZones.includes(o.value));
    }, [zoneOptions, selectedZones]);

    // Selected Centre objects for CustomMultiSelect
    const selectedCentreObjects = useMemo(() => {
        return centreOptions.filter(o => selectedCentres.includes(o.value));
    }, [centreOptions, selectedCentres]);

    // Handle Zone Change (multi-select)
    const handleZonesChange = (selected) => {
        const newZones = Array.isArray(selected) ? selected.map(s => (s && typeof s === 'object' && 'value' in s) ? s.value : s) : [];
        setSelectedZones(newZones);
        // Clear centres that don't belong to newly selected zones
        if (newZones.length > 0 && selectedCentres.length > 0) {
            const selectedZoneIdSet = new Set(newZones);
            const all = masterCentresList.length > 0
                ? masterCentresList
                : (reportData?.allCentres || reportData?.centres || []);
            const allowedCentreIds = new Set();
            all.forEach(c => {
                const inZone = zonesList.some(z =>
                    selectedZoneIdSet.has(String(z._id)) &&
                    z.centres &&
                    z.centres.some(zc => String(zc._id || zc) === String(c._id))
                );
                if (inZone) allowedCentreIds.add(String(c._id));
            });
            setSelectedCentres(prev => prev.filter(id => allowedCentreIds.has(id)));
        }
    };

    // Handle Centre Change (multi-select)
    const handleCentresChange = (selected) => {
        const newCentres = Array.isArray(selected) ? selected.map(s => (s && typeof s === 'object' && 'value' in s) ? s.value : s) : [];
        setSelectedCentres(newCentres);
    };

    // Has active filters
    const hasActiveFilters = selectedZones.length > 0 || selectedCentres.length > 0 || (searchTerm && searchTerm.trim() !== "") || dateRangeOption !== "Today";

    // Reset All Filters
    const handleResetAllFilters = () => {
        setSelectedZones([]);
        setSelectedCentres([]);
        setSearchTerm("");
        setDateRangeOption("Today");
        const todayStr = getTodayIST();
        setCustomStartDate(todayStr);
        setCustomEndDate(todayStr);
    };

    // Fetch Report Data
    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const { start, end } = activeRange;
            const params = new URLSearchParams({
                startDate: start,
                endDate: end
            });
            if (start === end) {
                params.append("date", start);
            }
            if (selectedZones.length > 0) {
                params.append("zoneIds", selectedZones.join(","));
            }
            if (selectedCentres.length > 0) {
                params.append("centreIds", selectedCentres.join(","));
            }

            const res = await fetch(`${apiUrl}/sales/daily-report?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setReportData(data);
                if (data.zones && data.zones.length > 0) {
                    setZonesList(data.zones);
                }
                if (data.allCentres && data.allCentres.length > 0) {
                    setMasterCentresList(data.allCentres);
                }
            } else {
                toast.error(data.message || "Failed to fetch daily report");
                setReportData(null);
            }
        } catch (error) {
            console.error("fetchReport error:", error);
            toast.error("Network error while fetching report");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, activeRange, selectedZones, selectedCentres]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Date Range Dropdown Change
    const handleDateRangeChange = (val) => {
        setDateRangeOption(val);
        if (val !== "Custom Range") {
            const { start, end } = getDateRangeLimits(val);
            setCustomStartDate(start);
            setCustomEndDate(end);
        }
    };

    // Date Navigation helpers
    const handlePrevDay = () => {
        const currentBase = activeRange.start;
        const [y, m, d] = currentBase.split("-").map(Number);
        const dt = new Date(y, m - 1, d - 1);
        const newDateStr = dt.toISOString().split("T")[0];
        const todayStr = getTodayIST();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (newDateStr === todayStr) {
            setDateRangeOption("Today");
            setCustomStartDate(todayStr);
            setCustomEndDate(todayStr);
        } else if (newDateStr === yesterdayStr) {
            setDateRangeOption("Yesterday");
            setCustomStartDate(yesterdayStr);
            setCustomEndDate(yesterdayStr);
        } else {
            setDateRangeOption("Custom Range");
            setCustomStartDate(newDateStr);
            setCustomEndDate(newDateStr);
        }
    };

    const handleNextDay = () => {
        const currentBase = activeRange.end;
        const [y, m, d] = currentBase.split("-").map(Number);
        const dt = new Date(y, m - 1, d + 1);
        const newDateStr = dt.toISOString().split("T")[0];
        const todayStr = getTodayIST();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (newDateStr === todayStr) {
            setDateRangeOption("Today");
            setCustomStartDate(todayStr);
            setCustomEndDate(todayStr);
        } else if (newDateStr === yesterdayStr) {
            setDateRangeOption("Yesterday");
            setCustomStartDate(yesterdayStr);
            setCustomEndDate(yesterdayStr);
        } else {
            setDateRangeOption("Custom Range");
            setCustomStartDate(newDateStr);
            setCustomEndDate(newDateStr);
        }
    };

    const handleResetToday = () => {
        setDateRangeOption("Today");
        const todayStr = getTodayIST();
        setCustomStartDate(todayStr);
        setCustomEndDate(todayStr);
    };

    // Filtered Centres list
    const filteredCentres = useMemo(() => {
        if (!reportData?.centres) return [];
        let list = reportData.centres;
        if (searchTerm.trim()) {
            const cleanSearch = searchTerm.trim().toLowerCase();
            list = list.filter(c =>
                c.centreName.toLowerCase().includes(cleanSearch) ||
                (c.code && c.code.toLowerCase().includes(cleanSearch))
            );
        }
        return list;
    }, [reportData, searchTerm]);

    // Computed Totals for filtered list (Without GST as primary, plus With GST)
    const filteredSummary = useMemo(() => {
        const defaultSum = {
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
            totalCollection: 0,
            totalFreshCollectionWithGst: 0,
            totalEmiCollectionWithGst: 0,
            totalCollectionWithGst: 0
        };

        if (!filteredCentres || filteredCentres.length === 0) {
            return reportData?.summary || defaultSum;
        }

        return filteredCentres.reduce((acc, c) => {
            acc.totalCalls += c.callsCount || 0;
            acc.totalFollowUps += c.followUpsCount || 0;
            acc.totalWalkIns += c.walkInCount || 0;
            acc.totalCounselling += c.counsellingCount || 0;
            acc.totalCounsellingNormal += c.counsellingNormalCount || 0;
            acc.totalCounsellingBoard += c.counsellingBoardCount || 0;
            acc.totalMarketingActivities += c.marketingCount || 0;
            acc.totalSchoolsVisited += c.schoolsCount || 0;
            acc.totalAdmissions += c.admissionsCount || 0;
            acc.totalFreshCollection += c.freshCollection || 0;
            acc.totalEmiCollection += c.emiCollection || 0;
            acc.totalCollection += c.totalCollection || 0;
            acc.totalFreshCollectionWithGst += c.freshCollectionWithGst || 0;
            acc.totalEmiCollectionWithGst += c.emiCollectionWithGst || 0;
            acc.totalCollectionWithGst += c.totalCollectionWithGst || 0;
            return acc;
        }, {
            ...defaultSum,
            totalCentres: filteredCentres.length
        });
    }, [filteredCentres, reportData]);

    // Walk-In leads displayed inside Walk-In details modal
    const walkInModalLeads = useMemo(() => {
        if (!walkInModalOpen || !reportData?.centres) return [];
        let list = [];
        if (walkInModalCentre) {
            list = (walkInModalCentre.walkIns || []).map(l => ({
                ...l,
                centreName: walkInModalCentre.centreName
            }));
        } else {
            filteredCentres.forEach(c => {
                (c.walkIns || []).forEach(l => {
                    list.push({
                        ...l,
                        centreName: c.centreName
                    });
                });
            });
        }

        if (!walkInSearch.trim()) return list;
        const q = walkInSearch.toLowerCase().trim();
        return list.filter(l =>
            (l.name || "").toLowerCase().includes(q) ||
            (l.phoneNumber || "").toLowerCase().includes(q) ||
            (l.centreName || "").toLowerCase().includes(q) ||
            (l.taggedBy || "").toLowerCase().includes(q) ||
            (l.source || "").toLowerCase().includes(q) ||
            (l.courseName || "").toLowerCase().includes(q) ||
            (l.className || "").toLowerCase().includes(q)
        );
    }, [walkInModalOpen, walkInModalCentre, reportData, filteredCentres, walkInSearch]);

    // Counselling modal list
    const counsellingModalLeads = useMemo(() => {
        if (!counsellingModalOpen || !reportData?.centres) return [];
        let list = [];
        if (counsellingModalCentre) {
            list = (counsellingModalCentre.counsellingDetails || []).map(l => ({
                ...l,
                centreName: counsellingModalCentre.centreName
            }));
        } else {
            filteredCentres.forEach(c => {
                (c.counsellingDetails || []).forEach(l => {
                    list.push({ ...l, centreName: c.centreName });
                });
            });
        }
        if (!counsellingSearch.trim()) return list;
        const q = counsellingSearch.toLowerCase().trim();
        return list.filter(l =>
            (l.studentName || "").toLowerCase().includes(q) ||
            (l.phoneNumber || "").toLowerCase().includes(q) ||
            (l.centreName || "").toLowerCase().includes(q) ||
            (l.courseName || "").toLowerCase().includes(q) ||
            (l.status || "").toLowerCase().includes(q)
        );
    }, [counsellingModalOpen, counsellingModalCentre, reportData, filteredCentres, counsellingSearch]);

    // Admissions modal list
    const admissionsModalList = useMemo(() => {
        if (!admissionsModalOpen || !reportData?.centres) return [];
        let list = [];
        if (admissionsModalCentre) {
            list = (admissionsModalCentre.admissionsDetails || []).map(l => ({
                ...l,
                centreName: admissionsModalCentre.centreName
            }));
        } else {
            filteredCentres.forEach(c => {
                (c.admissionsDetails || []).forEach(l => {
                    list.push({ ...l, centreName: c.centreName });
                });
            });
        }
        if (!admissionsSearch.trim()) return list;
        const q = admissionsSearch.toLowerCase().trim();
        return list.filter(l =>
            (l.studentName || "").toLowerCase().includes(q) ||
            (l.phoneNumber || "").toLowerCase().includes(q) ||
            (l.centreName || "").toLowerCase().includes(q) ||
            (l.courseName || "").toLowerCase().includes(q) ||
            (l.admissionNumber || "").toLowerCase().includes(q)
        );
    }, [admissionsModalOpen, admissionsModalCentre, reportData, filteredCentres, admissionsSearch]);

    // Collections modal list
    const collectionsModalList = useMemo(() => {
        if (!collectionsModalOpen || !reportData?.centres) return [];
        let list = [];
        if (collectionsModalCentre) {
            list = (collectionsModalCentre.paymentsDetails || []).map(l => ({
                ...l,
                centreName: collectionsModalCentre.centreName
            }));
        } else {
            filteredCentres.forEach(c => {
                (c.paymentsDetails || []).forEach(l => {
                    list.push({ ...l, centreName: c.centreName });
                });
            });
        }
        if (!collectionsSearch.trim()) return list;
        const q = collectionsSearch.toLowerCase().trim();
        return list.filter(l =>
            (l.studentName || "").toLowerCase().includes(q) ||
            (l.centreName || "").toLowerCase().includes(q) ||
            (l.courseName || "").toLowerCase().includes(q) ||
            (l.paymentMethod || "").toLowerCase().includes(q) ||
            (l.type || "").toLowerCase().includes(q)
        );
    }, [collectionsModalOpen, collectionsModalCentre, reportData, filteredCentres, collectionsSearch]);

    // Marketing All modal list
    const marketingAllModalActivities = useMemo(() => {
        if (!marketingAllModalOpen || !reportData?.centres) return [];
        let list = [];
        filteredCentres.forEach(c => {
            (c.marketingActivities || []).forEach(act => {
                list.push({ ...act, centreName: c.centreName });
            });
        });
        if (!marketingAllSearch.trim()) return list;
        const q = marketingAllSearch.toLowerCase().trim();
        return list.filter(a =>
            (a.institution || "").toLowerCase().includes(q) ||
            (a.centreName || "").toLowerCase().includes(q) ||
            (a.activityType || "").toLowerCase().includes(q) ||
            (a.marketerName || "").toLowerCase().includes(q)
        );
    }, [marketingAllModalOpen, reportData, filteredCentres, marketingAllSearch]);

    // Excel Export (includes both Excl. GST and Incl. GST)
    const handleExportExcel = () => {
        if (!reportData?.centres || reportData.centres.length === 0) {
            toast.warning("No data available to export");
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Sheet 1: Centre Consolidated Summary
            const summaryHeaders = [
                "Centre Name",
                "Centre Code",
                "Total Calls",
                "Follow-Ups",
                "Walk-Ins",
                "Counselling",
                "Marketing Visits",
                "Schools Count",
                "Admissions Count",
                "Course Breakdown",
                "Fresh Coll. Excl. GST (₹)",
                "EMI Coll. Excl. GST (₹)",
                "Total Coll. Excl. GST (₹)",
                "Total Coll. Incl. GST (₹)"
            ];

            const summaryRows = reportData.centres.map(c => {
                const courseText = Object.entries(c.coursesBreakdown || {})
                    .map(([name, count]) => `${name}: ${count}`)
                    .join(", ") || "-";

                return [
                    c.centreName,
                    c.code || "-",
                    c.callsCount,
                    c.followUpsCount,
                    c.walkInCount,
                    c.counsellingCount,
                    c.marketingCount,
                    c.schoolsCount,
                    c.admissionsCount,
                    courseText,
                    c.freshCollection,
                    c.emiCollection,
                    c.totalCollection,
                    c.totalCollectionWithGst || c.totalCollection
                ];
            });

            // Add Total row
            const totalRow = [
                "TOTAL / CONSOLIDATED",
                "-",
                reportData.summary.totalCalls,
                reportData.summary.totalFollowUps,
                reportData.summary.totalWalkIns,
                reportData.summary.totalCounselling,
                reportData.summary.totalMarketingActivities,
                reportData.summary.totalSchoolsVisited,
                reportData.summary.totalAdmissions,
                "-",
                reportData.summary.totalFreshCollection,
                reportData.summary.totalEmiCollection,
                reportData.summary.totalCollection,
                reportData.summary.totalCollectionWithGst || reportData.summary.totalCollection
            ];

            const { start, end } = activeRange;
            const isRange = start !== end;
            const dateLabel = isRange ? `${start} to ${end}` : start;
            const fileSuffix = isRange ? `${start}_to_${end}` : start;

            const wsSummary = XLSX.utils.aoa_to_sheet([
                [`Daily Centre Consolidated Report (Excl. GST Base) - ${dateLabel}`],
                [`Generated on: ${new Date().toLocaleString("en-IN")}`],
                [],
                summaryHeaders,
                ...summaryRows,
                [],
                totalRow
            ]);

            // Set column widths
            wsSummary["!cols"] = [
                { wch: 22 }, // Centre Name
                { wch: 12 }, // Code
                { wch: 12 }, // Total Calls
                { wch: 12 }, // Follow-Ups
                { wch: 12 }, // Walk-Ins
                { wch: 14 }, // Counselling
                { wch: 16 }, // Marketing Visits
                { wch: 14 }, // Schools Count
                { wch: 16 }, // Admissions
                { wch: 35 }, // Course Breakdown
                { wch: 24 }, // Fresh Excl. GST
                { wch: 22 }, // EMI Excl. GST
                { wch: 24 }, // Total Excl. GST
                { wch: 24 }  // Total Incl. GST
            ];

            XLSX.utils.book_append_sheet(wb, wsSummary, "Daily Summary");

            // Sheet 2: Marketing Activity Details
            const marketingHeaders = [
                "Centre Name",
                "Institution / School",
                "Activity Type",
                "Purpose",
                "Marketer / Executive",
                "Remarks",
                "Outcome / Results",
                "Leads Collected",
                "Next Visit Date",
                "Status"
            ];

            const marketingRows = [];
            reportData.centres.forEach(c => {
                (c.marketingActivities || []).forEach(act => {
                    marketingRows.push([
                        c.centreName,
                        act.institution || "-",
                        act.activityType || "-",
                        act.activityPurpose || "-",
                        act.marketerName || "-",
                        act.remarks || "-",
                        act.outcome || "-",
                        act.leads || 0,
                        act.nextActivityDate || "-",
                        act.status || "-"
                    ]);
                });
            });

            if (marketingRows.length > 0) {
                const wsMarketing = XLSX.utils.aoa_to_sheet([
                    [`Marketing Activities Breakdown - ${dateLabel}`],
                    [],
                    marketingHeaders,
                    ...marketingRows
                ]);

                wsMarketing["!cols"] = [
                    { wch: 20 },
                    { wch: 30 },
                    { wch: 18 },
                    { wch: 24 },
                    { wch: 22 },
                    { wch: 35 },
                    { wch: 25 },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 12 }
                ];

                XLSX.utils.book_append_sheet(wb, wsMarketing, "Marketing Activities");
            }

            // Write File
            const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            saveAs(
                new Blob([buf], { type: "application/octet-stream" }),
                `Daily_Sales_Consolidated_Report_${fileSuffix}.xlsx`
            );
            toast.success("Excel report exported successfully!");
        } catch (error) {
            console.error("Export Excel error:", error);
            toast.error("Failed to export Excel report");
        }
    };

    return (
        <Layout>
            <div className={`p-4 md:p-6 space-y-6 min-h-screen transition-colors ${isDark ? "bg-[#0a0f1d] text-slate-100" : "bg-slate-50 text-slate-900"
                }`}>

                {/* 1. Header Banner */}
                <div className={`p-5 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl backdrop-blur-md ${isDark
                    ? "bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-blue-950/40 border-slate-800"
                    : "bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/30 border-slate-200"
                    }`}>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                                <FaBuilding className="text-lg" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl md:text-2xl font-black tracking-tight">
                                        Daily Consolidated Report
                                    </h1>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isDark ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-300"
                                        }`}>
                                        Collection Excl. GST
                                    </span>
                                </div>
                                <p className={`text-xs md:text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Everyday centre-wise compiled metrics: CRM, Marketing, Admissions &amp; Collections without GST
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Buttons (Export & Refresh) */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                        >
                            <FaDownload className="text-xs" />
                            <span>Export Excel</span>
                        </button>

                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className={`p-2.5 rounded-xl border transition-all ${isDark
                                ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                                }`}
                            title="Refresh Data"
                        >
                            <FaSyncAlt className={`text-xs ${loading ? "animate-spin text-cyan-500" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* 2. Comprehensive Filters Bar */}
                <div className={`p-4 md:p-5 rounded-2xl border shadow-lg relative z-30 flex flex-col gap-4 ${isDark
                    ? "bg-slate-900/90 border-slate-800"
                    : "bg-white border-slate-200"
                    }`}>
                    {/* Top Controls Grid/Flex */}
                    <div className="flex flex-wrap items-end gap-3 justify-between">
                        <div className="flex flex-wrap items-end gap-3 flex-1">
                            {/* Zone Filter */}
                            <div className="w-full sm:w-[200px]">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Zone
                                </label>
                                <CustomMultiSelect
                                    options={zoneOptions}
                                    value={selectedZoneObjects}
                                    onChange={handleZonesChange}
                                    placeholder="All Zones"
                                    isDarkMode={isDark}
                                    isMulti={true}
                                />
                            </div>

                            {/* Centre Filter */}
                            <div className="w-full sm:w-[240px]">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Centre
                                </label>
                                <CustomMultiSelect
                                    options={centreOptions}
                                    value={selectedCentreObjects}
                                    onChange={handleCentresChange}
                                    placeholder="All Centres"
                                    isDarkMode={isDark}
                                    isMulti={true}
                                />
                            </div>

                            {/* Date Range Dropdown Filter */}
                            <div className="w-full sm:w-[170px]">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Date Range
                                </label>
                                <div className={`relative flex items-center rounded-lg border h-[38px] px-3 transition-colors ${isDark ? "bg-[#131619] border-gray-700 hover:border-cyan-500" : "bg-white border-gray-300 hover:border-cyan-500"}`}>
                                    <FaCalendarAlt className="text-cyan-500 text-xs mr-2 flex-shrink-0" />
                                    <select
                                        value={dateRangeOption}
                                        onChange={(e) => handleDateRangeChange(e.target.value)}
                                        className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer w-full pr-2 ${isDark ? "text-slate-100" : "text-slate-800"}`}
                                    >
                                        <option value="Today" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>Today</option>
                                        <option value="Yesterday" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>Yesterday</option>
                                        <option value="This Week" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>This Week</option>
                                        <option value="Previous Week" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>Previous Week</option>
                                        <option value="This Month" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>This Month</option>
                                        <option value="Previous Month" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>Previous Month</option>
                                        <option value="Last 7 Days" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>Last 7 Days</option>
                                        <option value="This Year" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>This Year</option>
                                        <option value="Previous Year" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>Previous Year</option>
                                        <option value="Custom Range" className={isDark ? "bg-[#1a1f24] text-slate-100" : "bg-white text-slate-900"}>Custom Range</option>
                                    </select>
                                </div>
                            </div>

                            {/* Custom Range Date Pickers */}
                            {dateRangeOption === "Custom Range" && (
                                <div className="space-y-1.5">
                                    <label className={`block text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Custom Period
                                    </label>
                                    <div className={`flex items-center gap-2 rounded-lg border h-[38px] px-3 ${isDark ? "bg-[#131619] border-gray-700" : "bg-white border-gray-300"}`}>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isDark ? "text-slate-100" : "text-slate-800"}`}
                                        />
                                        <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>to</span>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isDark ? "text-slate-100" : "text-slate-800"}`}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Day Stepper (Single Day Navigation) */}
                            {(dateRangeOption === "Today" || dateRangeOption === "Yesterday" || (dateRangeOption === "Custom Range" && customStartDate === customEndDate)) && (
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-transparent select-none">
                                        Step
                                    </label>
                                    <div className={`flex items-center rounded-lg border h-[38px] px-1 shadow-sm ${isDark ? "bg-[#131619] border-gray-700" : "bg-white border-gray-300"}`}>
                                        <button
                                            onClick={handlePrevDay}
                                            title="Previous Day"
                                            className={`p-1.5 rounded transition-colors ${isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}
                                        >
                                            <FaChevronLeft className="text-xs" />
                                        </button>
                                        <span className={`text-xs font-bold px-2 whitespace-nowrap ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                            {activeRange.start === getTodayIST() ? "Today" : activeRange.start}
                                        </span>
                                        <button
                                            onClick={handleNextDay}
                                            title="Next Day"
                                            className={`p-1.5 rounded transition-colors ${isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}
                                        >
                                            <FaChevronRight className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quick Today Button */}
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-transparent select-none">
                                    Today
                                </label>
                                <button
                                    onClick={handleResetToday}
                                    className={`h-[38px] px-3.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${dateRangeOption === "Today" && activeRange.start === getTodayIST()
                                        ? isDark
                                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                                            : "bg-cyan-50 border-cyan-200 text-cyan-700"
                                        : isDark
                                            ? "bg-[#131619] border-gray-700 text-slate-300 hover:bg-slate-800"
                                            : "bg-white border-gray-300 text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    Today
                                </button>
                            </div>

                            {/* Reset Filters Button */}
                            {hasActiveFilters && (
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-transparent select-none">
                                        Reset
                                    </label>
                                    <button
                                        onClick={handleResetAllFilters}
                                        className={`h-[38px] flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${isDark
                                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                                            : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                            }`}
                                        title="Reset All Filters"
                                    >
                                        <FaTimes className="text-xs" />
                                        <span>Reset</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto">
                            <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Search Centre
                            </label>
                            <div className={`relative flex items-center rounded-lg border h-[38px] px-3 shadow-sm w-full sm:w-56 ${isDark ? "bg-[#131619] border-gray-700 focus-within:border-cyan-500" : "bg-white border-gray-300 focus-within:border-cyan-500"}`}>
                                <FaSearch className={`text-xs mr-2 flex-shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                                <input
                                    type="text"
                                    placeholder="Search centre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`bg-transparent text-xs focus:outline-none w-full ${isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="text-slate-400 hover:text-slate-200 ml-1 text-xs"
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Filters & Report Period Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/50">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Report Period:
                            </span>
                            <span className={`text-xs font-black px-3 py-1 rounded-full border shadow-sm ${isDark ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-800"}`}>
                                {dateDisplayLabel}
                            </span>
                            {dateRangeOption !== "Custom Range" && dateRangeOption !== "Today" && (
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-200 text-slate-700 border border-slate-300"}`}>
                                    {dateRangeOption}
                                </span>
                            )}

                            {/* Active Zone Pills */}
                            {selectedZones.length > 0 && selectedZones.map(zId => {
                                const z = zonesList.find(z => String(z._id) === zId);
                                return z ? (
                                    <span key={zId} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        Zone: {z.name}
                                        <button onClick={() => setSelectedZones(prev => prev.filter(id => id !== zId))} className="hover:text-white">
                                            <FaTimes className="text-[9px]" />
                                        </button>
                                    </span>
                                ) : null;
                            })}

                            {/* Active Centre Pills */}
                            {selectedCentres.length > 0 && selectedCentres.map(cId => {
                                const all = masterCentresList.length > 0 ? masterCentresList : (reportData?.allCentres || reportData?.centres || []);
                                const c = all.find(c => String(c._id) === cId);
                                return c ? (
                                    <span key={cId} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        {c.centreName}
                                        <button onClick={() => setSelectedCentres(prev => prev.filter(id => id !== cId))} className="hover:text-white">
                                            <FaTimes className="text-[9px]" />
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>

                        {/* Centre count badge */}
                        <div className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Showing <span className="text-cyan-400 font-extrabold">{filteredCentres.length}</span> centre{filteredCentres.length === 1 ? "" : "s"}
                        </div>
                    </div>
                </div>

                {/* 3. Top KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {/* Total Calls */}
                    <div
                        onClick={() => handleOpenWalkInsModal(null)}
                        className={`p-4 rounded-xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isDark
                            ? "bg-slate-900/70 border-slate-800 hover:border-emerald-500/40"
                            : "bg-white border-slate-200 hover:border-emerald-400"
                            }`}
                        title="Click to view all walk-in leads"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Calls &amp; Follow-ups
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <FaPhoneAlt className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-emerald-500">
                            {filteredSummary.totalCalls}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Follow-ups: {filteredSummary.totalFollowUps}
                        </div>
                    </div>

                    {/* Walk-Ins */}
                    <div
                        onClick={() => handleOpenWalkInsModal(null)}
                        className={`p-4 rounded-xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isDark
                            ? "bg-slate-900/70 border-slate-800 hover:border-amber-500/40"
                            : "bg-white border-slate-200 hover:border-amber-400"
                            }`}
                        title="Click to view all walk-in leads"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Walk-Ins
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <FaWalking className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-amber-500">
                            {filteredSummary.totalWalkIns}
                        </div>
                        <div className={`text-[10px] mt-1 flex items-center justify-between ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            <span>Direct centre visits</span>
                            <span className="text-[9px] text-amber-400 font-semibold underline underline-offset-1">View leads →</span>
                        </div>
                    </div>

                    {/* Counselling */}
                    <div
                        onClick={() => handleOpenCounsellingModal(null)}
                        className={`p-4 rounded-xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isDark
                            ? "bg-slate-900/70 border-slate-800 hover:border-purple-500/40"
                            : "bg-white border-slate-200 hover:border-purple-400"
                            }`}
                        title="Click to view all counselling sessions"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Counselling
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <FaHandsHelping className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-purple-500">
                            {filteredSummary.totalCounselling}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Normal: {filteredSummary.totalCounsellingNormal ?? filteredCentres.reduce((s, c) => s + (c.counsellingNormalCount || 0), 0)} | Board: {filteredSummary.totalCounsellingBoard ?? filteredCentres.reduce((s, c) => s + (c.counsellingBoardCount || 0), 0)}
                        </div>
                    </div>

                    {/* Marketing Visits */}
                    <div
                        onClick={() => handleOpenMarketingModal()}
                        className={`p-4 rounded-xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isDark
                            ? "bg-slate-900/70 border-slate-800 hover:border-pink-500/40"
                            : "bg-white border-slate-200 hover:border-pink-400"
                            }`}
                        title="Click to view all marketing activities"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Marketing Visits
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                <GiSchoolBag className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-pink-500">
                            {filteredSummary.totalMarketingActivities}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Schools: {filteredSummary.totalSchoolsVisited}
                        </div>
                    </div>

                    {/* Admissions */}
                    <div
                        onClick={() => handleOpenAdmissionsModal(null)}
                        className={`p-4 rounded-xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isDark
                            ? "bg-slate-900/70 border-slate-800 hover:border-cyan-500/40"
                            : "bg-white border-slate-200 hover:border-cyan-400"
                            }`}
                        title="Click to view all admissions"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Admissions
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                                <FaGraduationCap className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-cyan-500">
                            {filteredSummary.totalAdmissions}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Hover table cell for courses
                        </div>
                    </div>

                    {/* Total Collection (Without GST as primary!) */}
                    <div
                        onClick={() => handleOpenCollectionsModal(null)}
                        className={`p-4 rounded-xl border shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md ${isDark
                            ? "bg-gradient-to-br from-blue-950/60 to-indigo-950/50 border-blue-800/50 hover:border-blue-600/60"
                            : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400"
                            }`}
                        title="Click to view all payment collections"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                                    Total (Excl. GST)
                                </span>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                <FaRupeeSign className="text-xs" />
                            </div>
                        </div>
                        <div className={`text-xl md:text-2xl font-black ${isDark ? "text-white" : "text-blue-950"}`}>
                            {formatCurrency(filteredSummary.totalCollection)}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1 text-[10px]">
                            <div className="flex items-center justify-between">
                                <span className={isDark ? "text-emerald-400" : "text-emerald-700 font-semibold"}>
                                    Fresh: {formatCurrency(filteredSummary.totalFreshCollection)}
                                </span>
                                <span className={isDark ? "text-indigo-400" : "text-indigo-700 font-semibold"}>
                                    EMI: {formatCurrency(filteredSummary.totalEmiCollection)}
                                </span>
                            </div>
                            {filteredSummary.totalCollectionWithGst > 0 && (
                                <span className={`text-[9px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Incl. GST: {formatCurrency(filteredSummary.totalCollectionWithGst)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Centre-wise Consolidated Table */}
                <div className={`rounded-2xl border shadow-xl overflow-hidden ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className={`border-b uppercase font-bold tracking-wider ${isDark
                                    ? "bg-slate-950/70 text-slate-400 border-slate-800"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}>
                                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                                    <th className="py-3.5 px-4">Centre</th>
                                    <th className="py-3.5 px-3 text-center">Calls</th>
                                    <th className="py-3.5 px-3 text-center">Walk-ins</th>
                                    <th className="py-3.5 px-3 text-center">Counselling</th>
                                    <th className="py-3.5 px-4">Marketing (Schools &amp; Purpose)</th>
                                    <th className="py-3.5 px-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>Admissions (Course Breakdown)</span>
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal normal-case ${isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                                                }`}>
                                                Hover for details
                                            </span>
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-3 text-right">Fresh (Excl. GST)</th>
                                    <th className="py-3.5 px-3 text-right">EMI (Excl. GST)</th>
                                    <th className="py-3.5 px-4 text-right">Total (Excl. GST)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                    Compiling centre data for {dateDisplayLabel}...
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCentres.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FaBuilding className={`text-3xl ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                                                <span className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                    No centres found matching your filter
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCentres.map((c, idx) => {
                                        const hasMarketing = c.marketingActivities && c.marketingActivities.length > 0;
                                        const hasAdmissions = c.admissionsCount > 0;
                                        const coursesList = Object.entries(c.coursesBreakdown || {});

                                        return (
                                            <tr
                                                key={c.centreId}
                                                className={`transition-colors ${isDark
                                                    ? "hover:bg-slate-800/40 border-slate-800/40"
                                                    : "hover:bg-slate-50 border-slate-100"
                                                    }`}
                                            >
                                                {/* Index */}
                                                <td className={`py-3.5 px-4 text-center font-bold ${isDark ? "text-slate-500" : "text-slate-400"
                                                    }`}>
                                                    {idx + 1}
                                                </td>

                                                {/* Centre Name */}
                                                <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-100 dark:text-slate-100 text-[13px]">
                                                            {c.centreName}
                                                        </span>
                                                        {c.code && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600"
                                                                }`}>
                                                                {c.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Calls */}
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${c.callsCount > 0
                                                        ? isDark
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : isDark ? "text-slate-600" : "text-slate-400"
                                                        }`}>
                                                        <FaPhoneAlt className="text-[10px]" />
                                                        {c.callsCount}
                                                    </span>
                                                </td>

                                                {/* Walk-ins */}
                                                <td className="py-3.5 px-3 text-center">
                                                    {c.walkInCount > 0 ? (
                                                        <button
                                                            onClick={() => handleOpenWalkInsModal(c)}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${isDark
                                                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                                                                : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                                                                }`}
                                                            title="Click to view centre walk-in leads"
                                                        >
                                                            <FaWalking className="text-[10px]" />
                                                            {c.walkInCount}
                                                        </button>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${isDark ? "text-slate-600" : "text-slate-400"
                                                            }`}>
                                                            <FaWalking className="text-[10px]" />
                                                            0
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Counselling */}
                                                <td className="py-3.5 px-3 text-center">
                                                    {c.counsellingCount > 0 ? (
                                                        <button
                                                            onClick={() => handleOpenCounsellingModal(c)}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${isDark
                                                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20"
                                                                : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                                                                }`}
                                                            title="Click to view counselling sessions"
                                                        >
                                                            <FaHandsHelping className="text-[10px]" />
                                                            {c.counsellingCount}
                                                        </button>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${isDark ? "text-slate-600" : "text-slate-400"
                                                            }`}>
                                                            <FaHandsHelping className="text-[10px]" />
                                                            0
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Marketing (Schools & Purpose) */}
                                                <td className="py-3.5 px-4 max-w-xs">
                                                    {hasMarketing ? (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${isDark ? "bg-pink-500/15 text-pink-400 border border-pink-500/30" : "bg-pink-50 text-pink-700 border border-pink-200"
                                                                    }`}>
                                                                    <GiSchoolBag className="text-xs" />
                                                                    {c.marketingCount} {c.marketingCount === 1 ? "activity" : "activities"}
                                                                </span>

                                                                <button
                                                                    onClick={() => setMarketingModalCentre(c)}
                                                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 transition-colors cursor-pointer ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-800"
                                                                        }`}
                                                                >
                                                                    <span>Details</span>
                                                                    <FaExternalLinkAlt className="text-[9px]" />
                                                                </button>
                                                            </div>

                                                            {/* Quick preview of institutions */}
                                                            <div className="flex flex-wrap gap-1">
                                                                {c.marketingActivities.slice(0, 2).map((act, i) => (
                                                                    <span
                                                                        key={i}
                                                                        title={`${act.institution} - ${act.activityType} (${act.outcome})`}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-[140px] ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                                                                            }`}
                                                                    >
                                                                        {act.institution}
                                                                    </span>
                                                                ))}
                                                                {c.marketingActivities.length > 2 && (
                                                                    <span className={`text-[10px] px-1 rounded ${isDark ? "text-slate-500" : "text-slate-400"
                                                                        }`}>
                                                                        +{c.marketingActivities.length - 2} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[11px] font-medium italic ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                                            No marketing
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Admissions & Course Breakdown with HOVER INTERACTIVITY */}
                                                <td
                                                    className="py-3.5 px-4 max-w-sm relative"
                                                    onMouseEnter={(e) => {
                                                        if (hasAdmissions) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setHoveredAdmission({ centre: c, rect });
                                                        }
                                                    }}
                                                    onMouseLeave={() => setHoveredAdmission(null)}
                                                >
                                                    {hasAdmissions ? (
                                                        <div className="space-y-1.5 cursor-pointer">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenAdmissionsModal(c);
                                                                    }}
                                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold shadow-sm transition-all hover:scale-105 cursor-pointer active:scale-95 ${isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30" : "bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100"
                                                                        }`}
                                                                    title="Click to view centre admissions details"
                                                                >
                                                                    <FaGraduationCap className="text-xs" />
                                                                    {c.admissionsCount} {c.admissionsCount === 1 ? "Admission" : "Admissions"}
                                                                </button>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCoursesModalCentre(c);
                                                                    }}
                                                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 transition-colors cursor-pointer ${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-800"
                                                                        }`}
                                                                >
                                                                    <span>All Courses</span>
                                                                </button>
                                                            </div>

                                                            {/* Course Chips with full hover titles */}
                                                            <div className="flex flex-wrap gap-1">
                                                                {coursesList.slice(0, 3).map(([cName, count], i) => (
                                                                    <span
                                                                        key={i}
                                                                        title={`${cName}: ${count} student(s)`}
                                                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 transition-all hover:border-cyan-400 ${isDark
                                                                            ? "bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-750"
                                                                            : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                                                                            }`}
                                                                    >
                                                                        <span className="truncate max-w-[120px]">{cName}</span>
                                                                        <span className={`px-1 py-0.2 rounded-full text-[9px] font-black ${isDark ? "bg-cyan-500/30 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                                                                            }`}>
                                                                            {count}
                                                                        </span>
                                                                    </span>
                                                                ))}
                                                                {coursesList.length > 3 && (
                                                                    <span
                                                                        title={`Click or hover to view all ${coursesList.length} courses`}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? "bg-cyan-950/60 text-cyan-400 border border-cyan-800" : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                                                            }`}
                                                                    >
                                                                        +{coursesList.length - 3} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[11px] font-medium italic ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                                            0 admissions
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Fresh Collection (Without GST) */}
                                                <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                    <div>
                                                        <span className={`font-bold text-xs ${c.freshCollection > 0
                                                            ? isDark ? "text-emerald-400" : "text-emerald-700"
                                                            : isDark ? "text-slate-600" : "text-slate-400"
                                                            }`}>
                                                            {formatCurrency(c.freshCollection)}
                                                        </span>
                                                        {c.freshCollectionWithGst > 0 && (
                                                            <span className={`block text-[9px] font-medium opacity-65 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                                Incl: {formatCurrency(c.freshCollectionWithGst)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* EMI Collection (Without GST) */}
                                                <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                    <div>
                                                        <span className={`font-bold text-xs ${c.emiCollection > 0
                                                            ? isDark ? "text-indigo-400" : "text-indigo-700"
                                                            : isDark ? "text-slate-600" : "text-slate-400"
                                                            }`}>
                                                            {formatCurrency(c.emiCollection)}
                                                        </span>
                                                        {c.emiCollectionWithGst > 0 && (
                                                            <span className={`block text-[9px] font-medium opacity-65 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                                Incl: {formatCurrency(c.emiCollectionWithGst)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Total Collection (Without GST) */}
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div>
                                                        <button
                                                            onClick={() => handleOpenCollectionsModal(c)}
                                                            className={`text-[13px] font-black px-2.5 py-1 rounded-lg inline-block cursor-pointer transition-all hover:scale-105 active:scale-95 ${c.totalCollection > 0
                                                                ? isDark
                                                                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25"
                                                                    : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                                                                : isDark ? "text-slate-600" : "text-slate-400"
                                                                }`}
                                                            title="Click to view centre collection details"
                                                        >
                                                            {formatCurrency(c.totalCollection)}
                                                        </button>
                                                        {c.totalCollectionWithGst > 0 && (
                                                            <span className={`block text-[9px] font-bold mt-0.5 opacity-70 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                                                Incl. GST: {formatCurrency(c.totalCollectionWithGst)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>

                            {/* Consolidated Table Footer */}
                            {!loading && filteredCentres.length > 0 && (
                                <tfoot>
                                    <tr className={`border-t-2 font-black uppercase tracking-wider text-xs ${isDark
                                        ? "bg-slate-950/90 text-slate-200 border-slate-700"
                                        : "bg-slate-200 text-slate-900 border-slate-300"
                                        }`}>
                                        <td colSpan={2} className="py-4 px-4 text-left font-black">
                                            Total ({filteredSummary.totalCentres} Centres)
                                        </td>
                                        <td className="py-4 px-3 text-center text-emerald-500">
                                            {filteredSummary.totalCalls}
                                        </td>
                                        <td className="py-4 px-3 text-center">
                                            <button
                                                onClick={() => handleOpenWalkInsModal(null)}
                                                className="text-amber-500 font-bold hover:underline cursor-pointer"
                                                title="View all walk-in leads"
                                            >
                                                {filteredSummary.totalWalkIns}
                                            </button>
                                        </td>
                                        <td className="py-4 px-3 text-center">
                                            <button
                                                onClick={() => handleOpenCounsellingModal(null)}
                                                className="text-purple-500 font-bold hover:underline cursor-pointer"
                                                title="View all counselling sessions"
                                            >
                                                {filteredSummary.totalCounselling}
                                            </button>
                                        </td>
                                        <td className="py-4 px-4 text-pink-500">
                                            <button
                                                onClick={() => handleOpenMarketingModal()}
                                                className="text-pink-500 font-bold hover:underline cursor-pointer text-left"
                                                title="View all marketing activities"
                                            >
                                                {filteredSummary.totalMarketingActivities} Visits ({filteredSummary.totalSchoolsVisited} Schools)
                                            </button>
                                        </td>
                                        <td className="py-4 px-4 text-cyan-500">
                                            <button
                                                onClick={() => handleOpenAdmissionsModal(null)}
                                                className="text-cyan-500 font-bold hover:underline cursor-pointer text-left"
                                                title="View all admissions"
                                            >
                                                {filteredSummary.totalAdmissions} Admissions
                                            </button>
                                        </td>
                                        <td className="py-4 px-3 text-right">
                                            <span className="text-emerald-500 block">
                                                {formatCurrency(filteredSummary.totalFreshCollection)}
                                            </span>
                                            {filteredSummary.totalFreshCollectionWithGst > 0 && (
                                                <span className={`text-[9px] block font-normal lowercase ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                    incl: {formatCurrency(filteredSummary.totalFreshCollectionWithGst)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-3 text-right">
                                            <span className="text-indigo-500 block">
                                                {formatCurrency(filteredSummary.totalEmiCollection)}
                                            </span>
                                            {filteredSummary.totalEmiCollectionWithGst > 0 && (
                                                <span className={`text-[9px] block font-normal lowercase ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                    incl: {formatCurrency(filteredSummary.totalEmiCollectionWithGst)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <button
                                                onClick={() => handleOpenCollectionsModal(null)}
                                                className="text-blue-400 text-sm block font-black hover:underline cursor-pointer ml-auto"
                                                title="View all collection payments"
                                            >
                                                {formatCurrency(filteredSummary.totalCollection)}
                                            </button>
                                            {filteredSummary.totalCollectionWithGst > 0 && (
                                                <span className={`text-[9px] block font-normal lowercase ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                                    incl: {formatCurrency(filteredSummary.totalCollectionWithGst)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* 4. Interactive Floating Hover Card for Admissions Course Breakdown */}
                {hoveredAdmission && hoveredAdmission.centre.admissionsCount > 0 && (
                    <div
                        className="fixed z-50 pointer-events-none transition-all duration-150 animate-fade-in"
                        style={{
                            left: Math.min(
                                Math.max(16, hoveredAdmission.rect.left + hoveredAdmission.rect.width / 2 - 160),
                                window.innerWidth - 340
                            ),
                            top: hoveredAdmission.rect.top > 260
                                ? hoveredAdmission.rect.top - 12
                                : hoveredAdmission.rect.bottom + 12,
                            transform: hoveredAdmission.rect.top > 260 ? "translateY(-100%)" : "translateY(0)"
                        }}
                    >
                        <div className={`w-80 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${isDark
                            ? "bg-slate-900/95 border-cyan-500/40 text-slate-100 shadow-cyan-950/50"
                            : "bg-white/95 border-cyan-300 text-slate-900 shadow-xl"
                            }`}>
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b pb-2.5 mb-2.5 border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <FaGraduationCap className="text-xs" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xs uppercase tracking-tight">
                                            {hoveredAdmission.centre.centreName}
                                        </h4>
                                        <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Enrolled Courses</span>
                                    </div>
                                </div>

                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-cyan-100 text-cyan-800"
                                    }`}>
                                    {hoveredAdmission.centre.admissionsCount} {hoveredAdmission.centre.admissionsCount === 1 ? "Admission" : "Admissions"}
                                </span>
                            </div>

                            {/* Course List: Simple Course Names Only */}
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {Object.keys(hoveredAdmission.centre.coursesBreakdown || {}).map((cName, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors ${isDark
                                            ? "bg-slate-800/60 hover:bg-slate-800/90 text-slate-200"
                                            : "bg-slate-100 hover:bg-slate-200/70 text-slate-800"
                                            }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                                        <span className="leading-snug break-words">
                                            {cName}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Card Footer hint */}
                            <div className={`mt-2.5 pt-2 border-t text-[10px] flex items-center justify-between ${isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
                                }`}>
                                <span className="flex items-center gap-1">
                                    <FaInfoCircle className="text-[9px] text-cyan-400" />
                                    <span>Period: {dateDisplayLabel}</span>
                                </span>
                                <span className="font-semibold text-cyan-400">Click to view modal</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Marketing Details Modal */}
                {marketingModalCentre && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                            }`}>
                            {/* Modal Header */}
                            <div className={`p-5 border-b flex items-center justify-between ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                                        <GiSchoolBag className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            Marketing Activities - {marketingModalCentre.centreName}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Activities conducted for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMarketingModalCentre(null)}
                                    className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"
                                        }`}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-3.5">
                                {marketingModalCentre.marketingActivities.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 text-xs">
                                        No marketing activities recorded for this centre in this period.
                                    </div>
                                ) : (
                                    marketingModalCentre.marketingActivities.map((act, index) => (
                                        <div
                                            key={act._id || index}
                                            className={`p-4 rounded-xl border space-y-2.5 transition-all ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-cyan-400">
                                                        {act.institution}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                                                        }`}>
                                                        {act.activityType}
                                                    </span>
                                                </div>

                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${act.status === "Approved"
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : "bg-amber-500/20 text-amber-400"
                                                    }`}>
                                                    {act.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Activity Purpose
                                                    </span>
                                                    <p className="font-medium mt-0.5">{act.activityPurpose || "-"}</p>
                                                </div>

                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Executive / Marketer
                                                    </span>
                                                    <p className="font-medium mt-0.5">{act.marketerName || "-"}</p>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Remarks
                                                    </span>
                                                    <p className={`p-2.5 rounded-lg border mt-1 ${isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                                                        }`}>
                                                        {act.remarks || "No remarks logged."}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Outcome / Results
                                                    </span>
                                                    <p className="font-bold text-emerald-400 mt-0.5">{act.outcome || "-"}</p>
                                                </div>

                                                {act.nextActivityDate && (
                                                    <div>
                                                        <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                            Next Scheduled Date
                                                        </span>
                                                        <p className="font-semibold text-cyan-400 mt-0.5">{act.nextActivityDate}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex justify-end ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                                }`}>
                                <button
                                    onClick={() => setMarketingModalCentre(null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                                        }`}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Course Breakdown Modal */}
                {coursesModalCentre && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                            }`}>
                            <div className={`p-5 border-b flex items-center justify-between ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <FaGraduationCap className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            Course Breakdown - {coursesModalCentre.centreName}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Total {coursesModalCentre.admissionsCount} admissions for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCoursesModalCentre(null)}
                                    className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"
                                        }`}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
                                {Object.entries(coursesModalCentre.coursesBreakdown || {}).map(([cName, count], idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                                            <span className="font-bold text-xs">{cName}</span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-black flex-shrink-0 ${isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                                            }`}>
                                            {count} {count === 1 ? "student" : "students"}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className={`p-4 border-t flex justify-end ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                                }`}>
                                <button
                                    onClick={() => setCoursesModalCentre(null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                                        }`}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. Counselling Details Modal */}
                {counsellingModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
                            {/* Modal Header */}
                            <div className={`p-5 border-b flex items-center justify-between gap-4 ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                        <FaHandsHelping className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            {counsellingModalCentre ? `Counselling — ${counsellingModalCentre.centreName}` : "Counselling — All Centres"}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Showing {counsellingModalLeads.length} counselling session(s) for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`relative flex items-center rounded-xl border px-3 py-1.5 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}>
                                        <FaSearch className={`text-xs mr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={counsellingSearch}
                                            onChange={(e) => setCounsellingSearch(e.target.value)}
                                            className={`bg-transparent text-xs focus:outline-none w-32 sm:w-44 ${isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => { setCounsellingModalOpen(false); setCounsellingModalCentre(null); }}
                                        className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"}`}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-3">
                                {counsellingModalLeads.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-xs">No counselling sessions found for this selection.</div>
                                ) : (
                                    counsellingModalLeads.map((item, idx) => (
                                        <div key={item._id || idx} className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${isDark ? "bg-slate-950/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-black text-sm text-purple-400">{item.studentName || "—"}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>{item.centreName}</span>
                                                    {item.type && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.type === "Board" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>{item.type}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                    {item.phoneNumber && (
                                                        <span className="flex items-center gap-1"><FaPhoneAlt className="text-[10px]" />{item.phoneNumber}</span>
                                                    )}
                                                    {item.courseName && <span>Course: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{item.courseName}</strong></span>}
                                                    {item.className && <span>Class: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{item.className}</strong></span>}
                                                </div>
                                                {item.remarks && <p className={`text-xs italic mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Remarks: {item.remarks}</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 text-xs flex-shrink-0">
                                                {item.status && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.status === "Admitted" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                                {item.date && <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{new Date(item.date).toLocaleDateString("en-IN")}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex items-center justify-between ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total: {counsellingModalLeads.length} sessions</span>
                                <button
                                    onClick={() => { setCounsellingModalOpen(false); setCounsellingModalCentre(null); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"}`}
                                >Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. Admissions Details Modal */}
                {admissionsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
                            {/* Modal Header */}
                            <div className={`p-5 border-b flex items-center justify-between gap-4 ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <FaGraduationCap className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            {admissionsModalCentre ? `Admissions — ${admissionsModalCentre.centreName}` : "Admissions — All Centres"}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Showing {admissionsModalList.length} admission(s) for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`relative flex items-center rounded-xl border px-3 py-1.5 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}>
                                        <FaSearch className={`text-xs mr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={admissionsSearch}
                                            onChange={(e) => setAdmissionsSearch(e.target.value)}
                                            className={`bg-transparent text-xs focus:outline-none w-32 sm:w-44 ${isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => { setAdmissionsModalOpen(false); setAdmissionsModalCentre(null); }}
                                        className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"}`}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-3">
                                {admissionsModalList.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-xs">No admissions found for this selection.</div>
                                ) : (
                                    admissionsModalList.map((item, idx) => (
                                        <div key={item._id || idx} className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${isDark ? "bg-slate-950/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-black text-sm text-cyan-400">{item.studentName || "—"}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>{item.centreName}</span>
                                                    {item.type && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.type === "Board" ? "bg-blue-500/20 text-blue-400" : "bg-cyan-500/20 text-cyan-400"}`}>{item.type}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                    {item.phoneNumber && <span className="flex items-center gap-1"><FaPhoneAlt className="text-[10px]" />{item.phoneNumber}</span>}
                                                    {item.courseName && <span>Course: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{item.courseName}</strong></span>}
                                                    {item.admissionNumber && <span>Adm#: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{item.admissionNumber}</strong></span>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 text-xs flex-shrink-0">
                                                {item.totalPaid > 0 && (
                                                    <span className={`text-sm font-black ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>{formatCurrency(item.totalPaid)}</span>
                                                )}
                                                {item.downPayment > 0 && (
                                                    <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Down: {formatCurrency(item.downPayment)}</span>
                                                )}
                                                {item.admissionDate && <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{new Date(item.admissionDate).toLocaleDateString("en-IN")}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex items-center justify-between ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total: {admissionsModalList.length} admissions</span>
                                <button
                                    onClick={() => { setAdmissionsModalOpen(false); setAdmissionsModalCentre(null); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"}`}
                                >Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 9. Collections Details Modal */}
                {collectionsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
                            {/* Modal Header */}
                            <div className={`p-5 border-b flex items-center justify-between gap-4 ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                        <FaRupeeSign className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            {collectionsModalCentre ? `Collections — ${collectionsModalCentre.centreName}` : "Collections — All Centres"}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Showing {collectionsModalList.length} payment(s) for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`relative flex items-center rounded-xl border px-3 py-1.5 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}>
                                        <FaSearch className={`text-xs mr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={collectionsSearch}
                                            onChange={(e) => setCollectionsSearch(e.target.value)}
                                            className={`bg-transparent text-xs focus:outline-none w-32 sm:w-44 ${isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => { setCollectionsModalOpen(false); setCollectionsModalCentre(null); }}
                                        className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"}`}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-3">
                                {collectionsModalList.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-xs">No payment records found for this selection.</div>
                                ) : (
                                    collectionsModalList.map((item, idx) => (
                                        <div key={item._id || idx} className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${isDark ? "bg-slate-950/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-black text-sm text-blue-400">{item.studentName || "—"}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>{item.centreName}</span>
                                                    {item.type && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.type === "EMI" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}>{item.type}</span>
                                                    )}
                                                    {item.paymentMethod && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"}`}>{item.paymentMethod}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                    {item.courseName && <span>Course: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{item.courseName}</strong></span>}
                                                    {item.billId && <span>Bill#: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{item.billId}</strong></span>}
                                                    {item.installmentNumber > 0 && <span>EMI #{item.installmentNumber}</span>}
                                                </div>
                                                {item.remarks && <p className={`text-xs italic mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>Remarks: {item.remarks}</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 text-xs flex-shrink-0">
                                                <span className={`text-sm font-black ${isDark ? "text-blue-300" : "text-blue-800"}`}>{formatCurrency(item.amountWithoutGst)}</span>
                                                {item.amountWithGst > 0 && item.amountWithGst !== item.amountWithoutGst && (
                                                    <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Incl. GST: {formatCurrency(item.amountWithGst)}</span>
                                                )}
                                                {item.date && <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{new Date(item.date).toLocaleDateString("en-IN")}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex items-center justify-between ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total: {collectionsModalList.length} payments</span>
                                <button
                                    onClick={() => { setCollectionsModalOpen(false); setCollectionsModalCentre(null); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"}`}
                                >Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 10. Marketing All Centres Modal */}
                {marketingAllModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>
                            {/* Modal Header */}
                            <div className={`p-5 border-b flex items-center justify-between gap-4 ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                                        <GiSchoolBag className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">Marketing Activities — All Centres</h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Showing {marketingAllModalActivities.length} activities for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`relative flex items-center rounded-xl border px-3 py-1.5 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"}`}>
                                        <FaSearch className={`text-xs mr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={marketingAllSearch}
                                            onChange={(e) => setMarketingAllSearch(e.target.value)}
                                            className={`bg-transparent text-xs focus:outline-none w-32 sm:w-44 ${isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setMarketingAllModalOpen(false)}
                                        className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"}`}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-3.5">
                                {marketingAllModalActivities.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-xs">No marketing activities found for this selection.</div>
                                ) : (
                                    marketingAllModalActivities.map((act, index) => (
                                        <div key={act._id || index} className={`p-4 rounded-xl border space-y-2.5 transition-all ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-cyan-400">{act.institution}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"}`}>{act.activityType}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${isDark ? "bg-pink-500/15 text-pink-400" : "bg-pink-50 text-pink-700"}`}>{act.centreName}</span>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${act.status === "Approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{act.status}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Activity Purpose</span>
                                                    <p className="font-medium mt-0.5">{act.activityPurpose || "—"}</p>
                                                </div>
                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Executive / Marketer</span>
                                                    <p className="font-medium mt-0.5">{act.marketerName || "—"}</p>
                                                </div>
                                                {act.remarks && (
                                                    <div className="md:col-span-2">
                                                        <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>Remarks</span>
                                                        <p className={`p-2.5 rounded-lg border mt-1 ${isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"}`}>{act.remarks}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex items-center justify-between ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total: {marketingAllModalActivities.length} activities</span>
                                <button
                                    onClick={() => setMarketingAllModalOpen(false)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"}`}
                                >Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 11. Walk-In Details Modal */}
                {walkInModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                            }`}>
                            {/* Modal Header */}
                            <div className={`p-5 border-b flex items-center justify-between gap-4 ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                        <FaWalking className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            {walkInModalCentre ? `Walk-In Leads — ${walkInModalCentre.centreName}` : "Walk-In Leads — All Centres"}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Showing {walkInModalLeads.length} direct walk-in and button-tagged leads for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className={`relative flex items-center rounded-xl border px-3 py-1.5 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-300"
                                        }`}>
                                        <FaSearch className={`text-xs mr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                                        <input
                                            type="text"
                                            placeholder="Search leads..."
                                            value={walkInSearch}
                                            onChange={(e) => setWalkInSearch(e.target.value)}
                                            className={`bg-transparent text-xs focus:outline-none w-32 sm:w-44 ${isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"
                                                }`}
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            setWalkInModalOpen(false);
                                            setWalkInModalCentre(null);
                                        }}
                                        className={`p-2 rounded-xl transition-colors cursor-pointer ${isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"
                                            }`}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-3">
                                {walkInModalLeads.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-xs">
                                        No walk-in leads found for this selection.
                                    </div>
                                ) : (
                                    walkInModalLeads.map((lead, idx) => (
                                        <div
                                            key={lead._id || idx}
                                            className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${isDark ? "bg-slate-950/40 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                                                }`}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-black text-sm text-cyan-400">
                                                        {lead.name}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${lead.isWalkIn
                                                        ? isDark
                                                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                            : "bg-amber-50 text-amber-800 border border-amber-300"
                                                        : isDark
                                                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                            : "bg-blue-50 text-blue-800 border border-blue-200"
                                                        }`}>
                                                        {lead.isWalkIn ? "Walked In (Button Tagged)" : (lead.source || "Walk In")}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                                                        }`}>
                                                        {lead.centreName}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <FaPhoneAlt className="text-[10px]" />
                                                        {lead.phoneNumber}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Class: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{lead.className}</strong></span>
                                                    <span>•</span>
                                                    <span>Course: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{lead.courseName}</strong></span>
                                                </div>

                                                {lead.remarks && (
                                                    <p className={`text-xs italic mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                        Remarks: {lead.remarks}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap md:flex-col md:items-end gap-1.5 text-xs flex-shrink-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${lead.isCounseled
                                                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                        : isDark ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-500"
                                                        }`}>
                                                        {lead.isCounseled ? "Counselled" : "Not Counselled"}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${lead.isAdmitted
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : isDark ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-500"
                                                        }`}>
                                                        {lead.isAdmitted ? "Admitted" : "Pending Admission"}
                                                    </span>
                                                </div>
                                                <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                    Tagged by: <strong>{lead.taggedBy}</strong>
                                                </span>
                                                <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                    {lead.walkInDate ? new Date(lead.walkInDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" }) : "-"}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex items-center justify-between ${isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                                }`}>
                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Total: {walkInModalLeads.length} leads
                                </span>
                                <button
                                    onClick={() => {
                                        setWalkInModalOpen(false);
                                        setWalkInModalCentre(null);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                                        }`}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
};

export default DailyReport;
