import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaCalendarDay, FaEraser, FaSearch, FaChevronDown, FaFlag, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const DailyCollection = () => {
    const storedUser = localStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;
    const userRoleClean = currentUser?.role?.toLowerCase()?.replace(/\s+/g, '') || '';
    const isSuperAdmin = userRoleClean === 'superadmin';
    const isDigital = userRoleClean === 'digital' || userRoleClean === 'digitalmarketing' || userRoleClean.includes('digital');
    const canEditTarget = isSuperAdmin || isDigital;

    const getSavedFilters = () => {
        try {
            const saved = localStorage.getItem("dailyCollection_filters");
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    };
    const savedFilters = getSavedFilters();

    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(savedFilters.date || new Date().toISOString().split("T")[0]);
    const [startDate, setStartDate] = useState(savedFilters.startDate || "");
    const [endDate, setEndDate] = useState(savedFilters.endDate || "");
    const [activePreset, setActivePreset] = useState(savedFilters.activePreset || "today");
    const [dailyDetails, setDailyDetails] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [totalCollection, setTotalCollection] = useState(0);
    const [transactionCount, setTransactionCount] = useState(0);
    const [activeTab, setActiveTab] = useState(savedFilters.activeTab || "centers"); // "centers" or "details"
    const [centreTargets, setCentreTargets] = useState({});
    const [centreTargetMeta, setCentreTargetMeta] = useState({});
    const [editingCentre, setEditingCentre] = useState(null);
    const [editTargetValue, setEditTargetValue] = useState("");
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkTargetValues, setBulkTargetValues] = useState({});
    const [bulkCommonValue, setBulkCommonValue] = useState("");
    const [bulkSearch, setBulkSearch] = useState("");
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkSelectedDates, setBulkSelectedDates] = useState([]);
    const [bulkWeekDays, setBulkWeekDays] = useState([]);
    const [allMonthWeeks, setAllMonthWeeks] = useState([]);
    const [selectedWeekNumbers, setSelectedWeekNumbers] = useState([1]);
    const [bulkSelectedCentres, setBulkSelectedCentres] = useState([]);
    const [zones, setZones] = useState([]);
    const [zonalManagers, setZonalManagers] = useState([]);
    const [selectedZones, setSelectedZones] = useState(savedFilters.selectedZones || []);
    const [isZoneOpen, setIsZoneOpen] = useState(false);
    const [zoneSearch, setZoneSearch] = useState("");

    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [paymentMethodsList, setPaymentMethodsList] = useState([]);

    const [selectedCentres, setSelectedCentres] = useState(savedFilters.selectedCentres || []);
    const [selectedCourses, setSelectedCourses] = useState(savedFilters.selectedCourses || []);
    const [selectedDepartments, setSelectedDepartments] = useState(savedFilters.selectedDepartments || []);
    const [selectedExamTags, setSelectedExamTags] = useState(savedFilters.selectedExamTags || []);
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState(savedFilters.selectedPaymentMethods || []);
    const [searchText, setSearchText] = useState(savedFilters.searchText || "");

    const [centreSearch, setCentreSearch] = useState("");
    const [courseSearch, setCourseSearch] = useState("");
    const [departmentSearch, setDepartmentSearch] = useState("");
    const [examTagSearch, setExamTagSearch] = useState("");
    const [paymentMethodSearch, setPaymentMethodSearch] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [pageInput, setPageInput] = useState("1");

    const [isCentreOpen, setIsCentreOpen] = useState(false);
    const [isCourseOpen, setIsCourseOpen] = useState(false);
    const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
    const [isExamTagOpen, setIsExamTagOpen] = useState(false);
    const [isPaymentMethodOpen, setIsPaymentMethodOpen] = useState(false);

    const { theme } = useTheme();

    useEffect(() => {
        const filtersToSave = {
            date,
            startDate,
            endDate,
            activePreset,
            activeTab,
            selectedZones,
            selectedCentres,
            selectedCourses,
            selectedDepartments,
            selectedExamTags,
            selectedPaymentMethods,
            searchText
        };
        localStorage.setItem("dailyCollection_filters", JSON.stringify(filtersToSave));
    }, [date, startDate, endDate, activePreset, activeTab, selectedZones, selectedCentres, selectedCourses, selectedDepartments, selectedExamTags, selectedPaymentMethods, searchText]);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchDailyCollection();
    }, [date, startDate, endDate, activePreset, selectedCentres, selectedCourses, selectedDepartments, selectedExamTags, selectedPaymentMethods, searchText]);

    const isDarkMode = theme === "dark";
    const filterButtonClass = isDarkMode
        ? "bg-[#15181f] border border-gray-700 text-white"
        : "bg-white border border-gray-300 text-slate-900";
    const filterPopupClass = isDarkMode
        ? "bg-[#1a1e27] border border-gray-600 text-white"
        : "bg-white border border-gray-300 text-slate-900";
    const filterInputClass = isDarkMode
        ? "bg-[#15181f] border-b border-gray-600 text-white"
        : "bg-white border-b border-gray-300 text-slate-900";
    const filterOptionClass = isDarkMode
        ? "text-white hover:bg-slate-800"
        : "text-slate-900 hover:bg-slate-100";
    const clearButtonClass = isDarkMode
        ? "text-blue-300 hover:text-blue-100"
        : "text-blue-600 hover:text-blue-800";
    const resetButtonClass = isDarkMode
        ? "bg-slate-700 text-white hover:bg-slate-600"
        : "bg-slate-100 text-slate-900 hover:bg-slate-200";
    const cardBgClass = isDarkMode ? "bg-[#111318]" : "bg-white";
    const cardBorderClass = isDarkMode ? "border border-gray-800" : "border border-gray-200";
    const cardTextClass = isDarkMode ? "text-white" : "text-slate-900";
    const secondaryTextClass = isDarkMode ? "text-gray-400" : "text-slate-500";
    const tableHeaderBgClass = isDarkMode ? "bg-[#0f1318]" : "bg-slate-100";
    const tableHeaderTextClass = isDarkMode ? "text-gray-400" : "text-slate-500";
    const tableRowHoverClass = isDarkMode ? "hover:bg-slate-900" : "hover:bg-slate-100";
    const tableDataTextClass = isDarkMode ? "text-gray-200" : "text-slate-700";
    const tableAmountTextClass = isDarkMode ? "text-white" : "text-green-600 font-semibold";
    const tableBillTextClass = "text-blue-600 font-semibold";
    const wrapperBgClass = isDarkMode ? "bg-[#090b10]" : "bg-white";
    const centreDropdownRef = useRef(null);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchDailyCollection();
    }, [date, startDate, endDate, activePreset, selectedCentres, selectedCourses, selectedDepartments, selectedExamTags, selectedPaymentMethods, searchText]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, coRes, eRes, dRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
            ]);

            if (cRes.ok) {
                const centreData = await cRes.json();
                let centreList = Array.isArray(centreData) ? centreData : centreData.centres || [];
                centreList = centreList.filter(c => c.status !== "deactive" && c.centreName && !/franchise/i.test(c.centreName));
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.role !== "superAdmin" && user.role !== "Super Admin" && user.centres) {
                        const allowedIds = user.centres.map(c => c._id || c);
                        const sortedCentres = centreList
                            .filter(c => allowedIds.includes(c._id))
                            .sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                        setCentres(sortedCentres);
                    } else {
                        const sortedCentres = centreList.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                        setCentres(sortedCentres);
                    }
                } else {
                    const sortedCentres = centreList.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                    setCentres(sortedCentres);
                }
            }
            if (coRes.ok) setCourses(await coRes.json());
            if (eRes.ok) setExamTags(await eRes.json());
            if (dRes.ok) {
                const allDepts = await dRes.json();
                const visibleDepts = allDepts.filter(dept => dept.showInAdmission !== false);
                setDepartments(visibleDepts);
            }
        } catch (error) {
            console.error("Error loading master data", error);
        }
    };

    const formatLocalDate = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const fetchDailyCollection = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            const now = new Date();

            if (activePreset === "today") {
                const todayStr = formatLocalDate(now);
                params.append("startDate", todayStr);
                params.append("endDate", todayStr);
            } else if (activePreset === "yesterday") {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                const yesterdayStr = formatLocalDate(yesterday);
                params.append("startDate", yesterdayStr);
                params.append("endDate", yesterdayStr);
            } else if (activePreset === "last7") {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                params.append("startDate", formatLocalDate(sevenDaysAgo));
                params.append("endDate", formatLocalDate(now));
            } else if (activePreset === "thisMonth") {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                params.append("startDate", formatLocalDate(start));
                params.append("endDate", formatLocalDate(end));
            } else if (activePreset === "lastMonth") {
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                params.append("startDate", formatLocalDate(start));
                params.append("endDate", formatLocalDate(end));
            } else if (activePreset === "custom") {
                if (startDate && endDate) {
                    params.append("startDate", startDate);
                    params.append("endDate", endDate);
                } else {
                    params.append("date", date);
                }
            } else {
                params.append("date", date);
            }

            if (selectedCentres.length) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length) params.append("courseIds", selectedCourses.join(","));
            if (selectedDepartments.length) params.append("departmentIds", selectedDepartments.join(","));
            if (selectedExamTags.length) params.append("examTagId", selectedExamTags.join(","));
            if (selectedPaymentMethods.length) params.append("paymentMode", selectedPaymentMethods.join(","));
            if (searchText) params.append("search", searchText);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/daily-collection?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const fetchedDetails = Array.isArray(data.details) ? data.details : [];
                const sortedDetails = [...fetchedDetails].sort((a, b) => new Date(b.date) - new Date(a.date));
                setTotalCollection(data.totalCollection || 0);
                setTransactionCount(data.transactionCount || 0);
                setPaymentMethods(data.paymentMethods || []);
                setDailyDetails(sortedDetails);
                setCentreTargets(data.centreTargets || {});
                setCentreTargetMeta(data.centreTargetMeta || {});
                setZones(data.zones || []);
                setZonalManagers(data.zonalManagers || []);
                setCurrentPage(1);
                setPageInput("1");
                // Extract unique payment methods and merge with default methods
                const methods = data.paymentMethods || [];
                const uniqueMethods = methods.map(m => m._id).filter(Boolean);
                const defaultMethods = ["CASH", "UPI", "CARD", "CHEQUE", "BANK_TRANSFER"];
                const mergedMethods = Array.from(new Set([...defaultMethods, ...uniqueMethods]));
                setPaymentMethodsList(mergedMethods);
            } else {
                setDailyDetails([]);
                setPaymentMethods([]);
                setPaymentMethodsList([]);
                setTotalCollection(0);
                setTransactionCount(0);
                setCentreTargets({});
                setCentreTargetMeta({});
            }
        } catch (error) {
            console.error("Error fetching daily collection", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTarget = async (centreName) => {
        try {
            const token = localStorage.getItem("token");
            const now = new Date();
            let targetDateToSend = formatLocalDate(now);
            if (activePreset === "today") {
                targetDateToSend = formatLocalDate(now);
            } else if (activePreset === "yesterday") {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                targetDateToSend = formatLocalDate(yesterday);
            } else if (activePreset === "last7") {
                targetDateToSend = formatLocalDate(now);
            } else if (activePreset === "thisMonth" || activePreset === "lastMonth" || activePreset === "custom") {
                targetDateToSend = endDate || startDate || date || formatLocalDate(now);
            } else if (endDate) {
                targetDateToSend = endDate;
            } else if (startDate) {
                targetDateToSend = startDate;
            } else if (date) {
                targetDateToSend = date;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/daily-collection/target`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: targetDateToSend,
                    centreName: centreName,
                    targetAmount: Number(editTargetValue)
                })
            });

            if (response.ok) {
                toast.success("Daily target updated successfully");
                setEditingCentre(null);
                fetchDailyCollection();
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Failed to update daily target");
            }
        } catch (error) {
            console.error("Error saving daily target:", error);
            toast.error("Error updating daily target");
        }
    };

    const getEffectiveTargetDate = () => {
        const now = new Date();
        if (activePreset === "today") return formatLocalDate(now);
        if (activePreset === "yesterday") {
            const y = new Date(now);
            y.setDate(now.getDate() - 1);
            return formatLocalDate(y);
        }
        if (activePreset === "last7") return formatLocalDate(now);
        return endDate || startDate || date || formatLocalDate(now);
    };

    const getAllWeeksForMonth = (dateStr) => {
        try {
            const parts = dateStr.split("-");
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;

            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            let startDay = 1;
            let weekNum = 1;
            const weeks = [];

            while (startDay <= daysInMonth) {
                let endDay = startDay;
                while (endDay < daysInMonth) {
                    const tempDate = new Date(y, m, endDay);
                    if (tempDate.getDay() === 0) break; // Sunday ends the week
                    endDay++;
                }

                const days = [];
                for (let d = startDay; d <= endDay; d++) {
                    const tempDate = new Date(y, m, d);
                    const dow = tempDate.getDay();
                    const mm = String(m + 1).padStart(2, '0');
                    const dd = String(d).padStart(2, '0');
                    days.push({
                        dateStr: `${y}-${mm}-${dd}`,
                        dayNum: d,
                        dayName: dayNames[dow],
                        isWeekend: dow === 0 || dow === 6
                    });
                }

                weeks.push({
                    weekNumber: weekNum,
                    label: `Week ${weekNum} (${startDay} - ${endDay})`,
                    startDay,
                    endDay,
                    days
                });

                startDay = endDay + 1;
                weekNum++;
            }
            return weeks;
        } catch (e) {
            return [];
        }
    };

    const openBulkTargetModal = (targetCentresList) => {
        const initialValues = {};
        targetCentresList.forEach(cName => {
            const base = centreTargetMeta[cName]?.baseTarget !== undefined
                ? centreTargetMeta[cName].baseTarget
                : (centreTargets[cName] || 0);
            initialValues[cName] = base;
        });
        setBulkTargetValues(initialValues);
        setBulkCommonValue("");
        setBulkSearch("");

        const targetDate = getEffectiveTargetDate();
        const allWeeks = getAllWeeksForMonth(targetDate);
        setAllMonthWeeks(allWeeks);

        const targetDayOfMonth = parseInt(targetDate.split("-")[2], 10);
        const matchedWeek = allWeeks.find(w => targetDayOfMonth >= w.startDay && targetDayOfMonth <= w.endDay) || allWeeks[0];

        const initialWeekNum = matchedWeek?.weekNumber || 1;
        setSelectedWeekNumbers([initialWeekNum]);

        // Pre-select all weekdays of this week by default for quick common weekday targets
        const weekdaysList = (matchedWeek?.days || []).filter(d => !d.isWeekend).map(d => d.dateStr);
        setBulkSelectedDates(weekdaysList.length > 0 ? weekdaysList : (matchedWeek?.days || []).map(d => d.dateStr));

        // Pre-select all centres by default
        setBulkSelectedCentres(targetCentresList);

        setIsBulkModalOpen(true);
    };

    const handleToggleWeek = (weekNum) => {
        setSelectedWeekNumbers(prev => {
            let next;
            if (prev.includes(weekNum)) {
                next = prev.filter(x => x !== weekNum);
                if (next.length === 0) next = [weekNum];
            } else {
                next = [...prev, weekNum].sort((a, b) => a - b);
            }

            const activeWeeks = allMonthWeeks.filter(w => next.includes(w.weekNumber));
            const validActiveDates = activeWeeks.flatMap(w => w.days).map(d => d.dateStr);

            setBulkSelectedDates(prevDates => {
                const retained = prevDates.filter(d => validActiveDates.includes(d));
                if (!prev.includes(weekNum)) {
                    const newWeek = allMonthWeeks.find(w => w.weekNumber === weekNum);
                    const newWeekdays = (newWeek?.days || []).filter(d => !d.isWeekend).map(d => d.dateStr);
                    return Array.from(new Set([...retained, ...newWeekdays]));
                }
                return retained;
            });

            return next;
        });
    };

    const handleSelectAllWeeks = () => {
        const allNums = allMonthWeeks.map(w => w.weekNumber);
        setSelectedWeekNumbers(allNums);
        const allWeekdays = allMonthWeeks.flatMap(w => w.days).filter(d => !d.isWeekend).map(d => d.dateStr);
        setBulkSelectedDates(allWeekdays);
    };

    const handleSelectWeekdaysAcrossWeeks = () => {
        const activeWeeks = allMonthWeeks.filter(w => selectedWeekNumbers.includes(w.weekNumber));
        const weekdays = activeWeeks.flatMap(w => w.days).filter(d => !d.isWeekend).map(d => d.dateStr);
        setBulkSelectedDates(weekdays);
    };

    const handleSelectWeekendAcrossWeeks = () => {
        const activeWeeks = allMonthWeeks.filter(w => selectedWeekNumbers.includes(w.weekNumber));
        const weekends = activeWeeks.flatMap(w => w.days).filter(d => d.isWeekend).map(d => d.dateStr);
        setBulkSelectedDates(weekends);
    };

    const handleSelectAllDaysAcrossWeeks = () => {
        const activeWeeks = allMonthWeeks.filter(w => selectedWeekNumbers.includes(w.weekNumber));
        const allDays = activeWeeks.flatMap(w => w.days).map(d => d.dateStr);
        setBulkSelectedDates(allDays);
    };

    const handleToggleCentre = (cName) => {
        setBulkSelectedCentres(prev =>
            prev.includes(cName) ? prev.filter(c => c !== cName) : [...prev, cName]
        );
    };

    const handleToggleAllCentres = (visibleCentres) => {
        const allSelected = visibleCentres.every(c => bulkSelectedCentres.includes(c));
        if (allSelected) {
            setBulkSelectedCentres(prev => prev.filter(c => !visibleCentres.includes(c)));
        } else {
            setBulkSelectedCentres(prev => Array.from(new Set([...prev, ...visibleCentres])));
        }
    };

    const handleApplyCommonValue = () => {
        if (bulkCommonValue === "" || isNaN(Number(bulkCommonValue))) return;
        if (bulkSelectedCentres.length === 0) {
            toast.error("Please select at least one centre to apply target");
            return;
        }
        const val = Number(bulkCommonValue);
        setBulkTargetValues(prev => {
            const next = { ...prev };
            bulkSelectedCentres.forEach(cName => {
                next[cName] = val;
            });
            return next;
        });
        toast.success(`Applied ₹${val} to ${bulkSelectedCentres.length} selected centre(s)`);
    };

    const handleSaveBulkTargets = async () => {
        if (!bulkSelectedDates || bulkSelectedDates.length === 0) {
            toast.error("Please select at least one date to apply targets");
            return;
        }
        if (!bulkSelectedCentres || bulkSelectedCentres.length === 0) {
            toast.error("Please select at least one centre to apply targets");
            return;
        }

        setBulkSaving(true);
        try {
            const token = localStorage.getItem("token");
            const targetsList = Object.entries(bulkTargetValues)
                .filter(([centreName]) => bulkSelectedCentres.includes(centreName))
                .map(([centreName, targetAmount]) => ({
                    centreName,
                    targetAmount: Number(targetAmount) || 0
                }));

            if (targetsList.length === 0) {
                toast.error("No valid targets selected to save");
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/daily-collection/target/bulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    dates: bulkSelectedDates,
                    targets: targetsList
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || `Saved targets for ${targetsList.length} centres across ${bulkSelectedDates.length} date(s)`);
                setIsBulkModalOpen(false);
                fetchDailyCollection();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to save bulk targets");
            }
        } catch (err) {
            console.error("Error saving bulk daily targets:", err);
            toast.error("Failed to save bulk daily targets");
        } finally {
            setBulkSaving(false);
        }
    };

    const resetFilters = () => {
        localStorage.removeItem("dailyCollection_filters");
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedDepartments([]);
        setSelectedExamTags([]);
        setSelectedPaymentMethods([]);
        setCentreSearch("");
        setCourseSearch("");
        setDepartmentSearch("");
        setExamTagSearch("");
        setPaymentMethodSearch("");
        setSearchText("");
        setDate(new Date().toISOString().split("T")[0]);
        setStartDate("");
        setEndDate("");
        setActivePreset("today");
        setSelectedZones([]);
        setZoneSearch("");
        setActiveTab("centers");
        toast.info("Filters reset");
    };

    /* ── Quick date preset helper ─────────────────────────────────────── */
    const DATE_PRESETS = [
        { key: "today", label: "Today" },
        { key: "yesterday", label: "Yesterday" },
        { key: "last7", label: "Last 7 Days" },
        { key: "thisMonth", label: "This Month" },
        { key: "lastMonth", label: "Last Month" },
        { key: "custom", label: "Custom Range" },
    ];

    const applyPreset = (key) => {
        const now = new Date();
        let d = now;
        if (key === "today") {
            d = new Date();
            setStartDate("");
            setEndDate("");
        } else if (key === "yesterday") {
            d = new Date();
            d.setDate(d.getDate() - 1);
            setStartDate("");
            setEndDate("");
        } else if (key === "last7") {
            d = new Date();
            d.setDate(d.getDate() - 6);
            setStartDate("");
            setEndDate("");
        } else if (key === "thisMonth") {
            d = new Date(now.getFullYear(), now.getMonth(), 1);
            setStartDate("");
            setEndDate("");
        } else if (key === "lastMonth") {
            d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            setStartDate("");
            setEndDate("");
        } else if (key === "custom") {
            setStartDate("");
            setEndDate("");
        }
        setDate(d.toISOString().split("T")[0]);
        setActivePreset(key);
    };

    const exportToExcel = () => {
        if (dailyDetails.length === 0) {
            toast.warning("No data to export");
            return;
        }

        try {
            const workbook = XLSX.utils.book_new();

            if (activeTab === "centers") {
                // Export Centres Collection aggregated data
                const aggregated = dailyDetails.reduce((acc, curr) => {
                    const c = curr.centre || "N/A";
                    if (!acc[c]) acc[c] = { total: 0, totalWithoutGst: 0 };
                    acc[c][curr.paymentMethod] = (acc[c][curr.paymentMethod] || 0) + (curr.paidAmount || 0);
                    acc[c].total += (curr.paidAmount || 0);

                    let itemWithoutGst = 0;
                    if (curr.revenueWithoutGst !== undefined && curr.revenueWithoutGst !== null) {
                        itemWithoutGst = Number(curr.revenueWithoutGst);
                    } else if (curr.courseFee && Number(curr.courseFee) > 0 && (!curr.centre || !/phsps/i.test(curr.centre))) {
                        itemWithoutGst = Number(curr.courseFee);
                    } else {
                        const isPhsps = curr.centre && /phsps/i.test(curr.centre);
                        itemWithoutGst = isPhsps ? (curr.paidAmount || 0) : ((curr.paidAmount || 0) / 1.18);
                    }
                    acc[c].totalWithoutGst = (acc[c].totalWithoutGst || 0) + itemWithoutGst;

                    return acc;
                }, (() => {
                    const initialAcc = {};
                    const targetCentres = selectedCentres.length > 0
                        ? centres.filter(c => selectedCentres.includes(c._id))
                        : centres;
                    targetCentres.forEach(c => {
                        if (c.centreName) {
                            initialAcc[c.centreName] = { total: 0, totalWithoutGst: 0 };
                        }
                    });
                    return initialAcc;
                })());

                const sortedAggregated = Object.entries(aggregated).sort((a, b) => a[0].localeCompare(b[0]));

                const headers = [
                    "Centre Name",
                    "Daily Target (Dynamic Adjusted - Excl. GST)",
                    ...paymentMethodsList,
                    "Total (With GST)",
                    "Total (Without GST)"
                ];

                const rows = sortedAggregated.map(([centre, data]) => {
                    const row = [
                        centre,
                        centreTargets[centre] || 0
                    ];
                    paymentMethodsList.forEach(method => {
                        row.push(data[method] || 0);
                    });
                    row.push(data.total || 0);
                    const isPhsps = /phsps/i.test(centre);
                    const withoutGst = data.totalWithoutGst !== undefined ? data.totalWithoutGst : (isPhsps ? data.total : (data.total / 1.18));
                    row.push(Number(withoutGst.toFixed(2)) || 0);
                    return row;
                });

                const sheetData = [headers, ...rows];
                const sheet = XLSX.utils.aoa_to_sheet(sheetData);

                // Set column widths
                sheet["!cols"] = [
                    { wch: 25 }, // Centre Name
                    { wch: 25 }, // Daily Target
                    ...paymentMethodsList.map(() => ({ wch: 15 })), // Payment Methods
                    { wch: 18 }, // Total With GST
                    { wch: 18 }  // Total Without GST
                ];

                // Style header row
                for (let i = 0; i < headers.length; i++) {
                    const cell = sheet[XLSX.utils.encode_col(i) + "1"];
                    if (cell) {
                        cell.s = {
                            font: { bold: true, color: { rgb: "FFFFFF" } },
                            fill: { fgColor: { rgb: "4B5563" } },
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    }
                }

                XLSX.utils.book_append_sheet(workbook, sheet, "Centers Collection");

                // Generate file name with date
                const fileName = `Centers-Collection-${new Date(date).toISOString().split("T")[0]}.xlsx`;
                XLSX.writeFile(workbook, fileName);

                toast.success("Centers collection exported successfully!");
            } else {
                // Summary Sheet
                const summaryData = [
                    ["Daily Collection Report"],
                    [""],
                    ["Report Date:", new Date().toLocaleString()],
                    ["Collection Date:", new Date(date).toLocaleDateString()],
                    [""],
                    ["Summary Information"],
                    ["Total Amount Collected:", "", "", "$" + formatAmount(totalCollection).replace("₹", "")],
                    ["Total Transactions:", transactionCount],
                    [""],
                    ["Payment Methods Breakdown"],
                    ["Payment Method", "Total Amount", "Count"],
                    ...paymentMethods.map(m => [m._id, formatAmount(m.totalAmount), m.count])
                ];

                const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
                summarySheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

                // Details Sheet
                const detailsHeaders = [
                    "MR Date",
                    "Received Date",
                    "Centre",
                    "Student Name",
                    "Admission No.",
                    "Student Class",
                    "Email",
                    "Mobile",
                    "Whatsapp",
                    "Address",
                    "Guardian Name",
                    "Guardian Mobile",
                    "Bill ID",
                    "Transaction ID",
                    "Course",
                    "Department",
                    "Payment Method",
                    "Amount",
                    "Status",
                    "Recorded By",
                    "Total Classes",
                    "Present",
                    "Absent",
                    "Attendance Status"
                ];

                const detailsData = dailyDetails.map(item => [
                    formatDateTime(item.date),
                    formatDateTime(item.receivedDate),
                    item.centre || "-",
                    item.studentName || "-",
                    item.admissionNumber || "-",
                    item.studentClass || "-",
                    item.studentEmail || "-",
                    item.studentMobile || "-",
                    item.studentWhatsapp || "-",
                    item.studentAddress || "-",
                    item.guardianName || "-",
                    item.guardianMobile || "-",
                    item.billId || "-",
                    item.transactionId || "-",
                    item.courseName || "-",
                    item.departmentName || "-",
                    item.paymentMethod || "-",
                    item.paidAmount || 0,
                    item.status || "-",
                    item.recordedByName || "-",
                    item.totalClasses || 0,
                    item.presentCount || 0,
                    item.absentCount || 0,
                    item.attendanceStatus || "Not Taken"
                ]);

                const detailsSheet = XLSX.utils.aoa_to_sheet([detailsHeaders, ...detailsData]);
                detailsSheet["!cols"] = [
                    { wch: 20 },
                    { wch: 15 },
                    { wch: 20 },
                    { wch: 15 },
                    { wch: 12 },
                    { wch: 12 },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 12 },
                    { wch: 12 },
                    { wch: 15 }
                ];

                // Style header row
                for (let i = 0; i < detailsHeaders.length; i++) {
                    const cell = detailsSheet[XLSX.utils.encode_col(i) + "1"];
                    if (cell) {
                        cell.s = {
                            font: { bold: true, color: { rgb: "FFFFFF" } },
                            fill: { fgColor: { rgb: "4B5563" } },
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    }
                }

                XLSX.utils.book_append_sheet(workbook, detailsSheet, "Transaction Details");

                // Generate file name with date
                const fileName = `Daily-Collection-${new Date(date).toISOString().split("T")[0]}.xlsx`;
                XLSX.writeFile(workbook, fileName);

                toast.success("Excel file exported successfully!");
            }
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            toast.error("Failed to export to Excel");
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const dateFormatted = date.toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
        const timeFormatted = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
        return `${dateFormatted} ${timeFormatted}`;
    };

    const formatAmount = (amount) => {
        return typeof amount === "number" ? amount.toLocaleString("en-IN", { style: "currency", currency: "INR" }) : "₹0";
    };

    const toggleSelection = (value, selected, setSelected) => {
        setSelected(prev =>
            prev.includes(value)
                ? prev.filter(id => id !== value)
                : [...prev, value]
        );
    };

    // Zone wise filtering
    const activeZones = zones.filter(z => selectedZones.includes(z._id));
    const zoneCentreNames = new Set();
    const zoneCentreIds = new Set();
    activeZones.forEach(z => {
        if (z.centres) {
            z.centres.forEach(c => {
                const name = c && typeof c === 'object' ? c.centreName : null;
                const id = c && typeof c === 'object' ? (c._id || c.id) : c;
                if (name) zoneCentreNames.add(name.toLowerCase().trim());
                if (id) zoneCentreIds.add(id.toString().toLowerCase().trim());
            });
        }
    });

    const activeCentres = selectedZones.length > 0
        ? centres.filter(c => c._id && zoneCentreIds.has(c._id.toString().toLowerCase().trim()))
        : centres;

    const activeDetails = selectedZones.length > 0
        ? dailyDetails.filter(d => d.centre && zoneCentreNames.has(d.centre.toLowerCase().trim()))
        : dailyDetails;

    const filteredZones = zones.filter((z) =>
        z.name?.toLowerCase().includes(zoneSearch.toLowerCase())
    );

    const filteredCenters = activeCentres.filter((c) =>
        c.centreName?.toLowerCase().includes(centreSearch.toLowerCase())
    );

    const filteredCourses = courses.filter((c) =>
        c.courseName?.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const filteredDepartments = departments.filter((d) =>
        d.departmentName?.toLowerCase().includes(departmentSearch.toLowerCase())
    );

    const filteredExamTags = examTags.filter((t) =>
        `${t.name || t.examName || ""}`.toLowerCase().includes(examTagSearch.toLowerCase())
    );

    const filteredPaymentMethods = paymentMethodsList.filter((method) =>
        method.toLowerCase().includes(paymentMethodSearch.toLowerCase())
    );

    const pageCount = Math.max(1, Math.ceil(activeDetails.length / pageSize));
    const paginatedDetails = activeDetails.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    React.useEffect(() => {
        if (currentPage > pageCount) {
            setCurrentPage(pageCount);
            setPageInput(String(pageCount));
        }
    }, [pageCount]);

    return (
        <Layout activePage="Sales">
            <div className="p-6 space-y-6" style={{ backgroundColor: wrapperBgClass }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className={`text-2xl font-bold ${cardTextClass}`}>Daily Collection</h1>
                        <p className={`mt-1 ${secondaryTextClass}`}>View the exact transaction collections for the selected date.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <button
                            onClick={exportToExcel}
                            className={`px-4 py-2 rounded-[4px] flex items-center gap-2 ${isDarkMode
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-500 text-white hover:bg-blue-600"}`}
                        >
                            <FaDownload /> Export
                        </button>
                        <button
                            onClick={resetFilters}
                            className={`px-4 py-2 rounded-[4px] ${resetButtonClass}`}
                        >
                            <FaEraser className="inline mr-2" /> Reset
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                    <div className={`${cardBgClass} p-4 rounded-[4px] ${cardBorderClass} shadow-sm`}>
                        <div className={`flex items-center gap-3 ${secondaryTextClass} mb-3`}>
                            <FaCalendarDay />
                            <span className="font-semibold">Collection Date</span>
                        </div>
                        {/* Quick date preset dropdown */}
                        <select
                            value={activePreset}
                            onChange={(e) => applyPreset(e.target.value)}
                            className={`w-full rounded-[4px] p-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${isDarkMode
                                ? "bg-[#15181f] border border-gray-700 text-white"
                                : "bg-white border border-gray-300 text-slate-900"
                                }`}
                        >
                            {!activePreset && <option value="">Custom Date</option>}
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last7">Last 7 Days</option>
                            <option value="thisMonth">This Month</option>
                            <option value="lastMonth">Last Month</option>
                            <option value="custom">Custom Range</option>
                        </select>

                        {activePreset === "custom" ? (
                            <div className="flex flex-col gap-2 mt-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">From:</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`w-full rounded-[4px] p-2 text-xs ${isDarkMode ? "bg-[#15181f] border border-gray-700 text-white" : "bg-white border border-gray-300 text-slate-900"}`}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">To:</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`w-full rounded-[4px] p-2 text-xs ${isDarkMode ? "bg-[#15181f] border border-gray-700 text-white" : "bg-white border border-gray-300 text-slate-900"}`}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => { setDate(e.target.value); setActivePreset(""); }}
                                    className={`w-full rounded-[4px] p-3 text-xs ${isDarkMode ? "bg-[#15181f] border border-gray-700 text-white" : "bg-white border border-gray-300 text-slate-900"}`}
                                />
                            </div>
                        )}
                    </div>
                    <div className={`${cardBgClass} p-4 rounded-[4px] ${cardBorderClass} shadow-sm flex flex-col justify-between`}>
                        <div>
                            <div className={`${secondaryTextClass} font-semibold mb-2`}>Total Collected</div>
                            <div className="flex flex-col gap-1.5 mt-1">
                                {(() => {
                                    const isPhspsMidnapore = (centre) => {
                                        if (!centre) return false;
                                        const str = centre.toLowerCase();
                                        return str.includes('phsps') && (str.includes('midnapore') || str.includes('midnapur') || str.includes('medinipur'));
                                    };
                                    const totalWithGst = activeDetails.reduce((sum, d) => {
                                        if (isPhspsMidnapore(d.centre)) return sum;
                                        return sum + (d.paidAmount || 0);
                                    }, 0);
                                    const totalWithoutGst = activeDetails.reduce((sum, d) => {
                                        if (isPhspsMidnapore(d.centre)) return sum;
                                        if (d.revenueWithoutGst !== undefined && d.revenueWithoutGst !== null) {
                                            return sum + Number(d.revenueWithoutGst);
                                        }
                                        if (d.courseFee && Number(d.courseFee) > 0 && (!d.centre || !/phsps/i.test(d.centre))) {
                                            return sum + Number(d.courseFee);
                                        }
                                        const isPhsps = d.centre && /phsps/i.test(d.centre);
                                        const withoutGst = isPhsps ? (d.paidAmount || 0) : ((d.paidAmount || 0) / 1.18);
                                        return sum + withoutGst;
                                    }, 0);
                                    return (
                                        <>
                                            <div className="flex items-baseline justify-between">
                                                <span className={`text-2xl font-bold ${cardTextClass}`}>{formatAmount(totalWithGst)}</span>
                                                <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">With GST</span>
                                            </div>
                                            <div className="flex items-baseline justify-between border-t border-gray-100 dark:border-gray-800 pt-1.5">
                                                <span className={`text-lg font-semibold ${secondaryTextClass}`}>{formatAmount(Math.round(totalWithoutGst))}</span>
                                                <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Without GST</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className={`${secondaryTextClass} text-xs mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center`}>
                            <span>Transactions Count</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">{activeDetails.length}</span>
                        </div>
                    </div>
                    <div className={`${cardBgClass} p-4 rounded-[4px] ${cardBorderClass} shadow-sm flex flex-col justify-between`}>
                        <div>
                            <div className={`${secondaryTextClass} font-semibold mb-2`}>Daily Total Target</div>
                            <div className="flex flex-col gap-1.5 mt-1">
                                {(() => {
                                    const isPhspsMidnapore = (centre) => {
                                        if (!centre) return false;
                                        const str = centre.toLowerCase();
                                        return str.includes('phsps') && (str.includes('midnapore') || str.includes('midnapur') || str.includes('medinipur'));
                                    };
                                    const computedTargetWithoutGst = activeCentres.reduce((sum, c) => {
                                        if (isPhspsMidnapore(c.centreName)) return sum;
                                        return sum + (centreTargets[c.centreName] || 0);
                                    }, 0);
                                    const computedTargetWithGst = activeCentres.reduce((sum, c) => {
                                        if (isPhspsMidnapore(c.centreName)) return sum;
                                        const target = centreTargets[c.centreName] || 0;
                                        const isPhsps = c.centreName && /phsps/i.test(c.centreName);
                                        return sum + (isPhsps ? target : target * 1.18);
                                    }, 0);

                                    return (
                                        <>
                                            <div className="flex items-baseline justify-between">
                                                <span className={`text-2xl font-bold ${cardTextClass}`}>{formatAmount(computedTargetWithGst)}</span>
                                                <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">With GST</span>
                                            </div>
                                            <div className="flex items-baseline justify-between border-t border-gray-100 dark:border-gray-800 pt-1.5">
                                                <span className={`text-lg font-semibold ${secondaryTextClass}`}>{formatAmount(computedTargetWithoutGst)}</span>
                                                <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Without GST</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className={`${secondaryTextClass} text-xs mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center`}>
                            <span>Active Centres</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                                {selectedCentres.length > 0 ? selectedCentres.length : activeCentres.length}
                            </span>
                        </div>
                        {selectedZones.length > 0 && (
                            <div className={`${secondaryTextClass} text-xs mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center`}>
                                {/* <span>Zonal Manager</span>
                                <span className="font-bold text-cyan-400">
                                    {(() => {
                                        const managersOfZone = zonalManagers.filter(manager => 
                                            manager.centres && manager.centres.some(cId => zoneCentreIds.includes(cId))
                                        );
                                        return managersOfZone.map(m => m.name).join(", ") || "N/A";
                                    })()}
                                </span> */}
                            </div>
                        )}
                    </div>
                    <div className={`${cardBgClass} p-4 rounded-[4px] ${cardBorderClass} shadow-sm`}>
                        <div className={`${secondaryTextClass} font-semibold mb-3`}>Payment Methods</div>
                        <div className="space-y-2">
                            {(() => {
                                const isPhspsMidnapore = (centre) => {
                                    if (!centre) return false;
                                    const str = centre.toLowerCase();
                                    return str.includes('phsps') && (str.includes('midnapore') || str.includes('midnapur') || str.includes('medinipur'));
                                };
                                const dynamicPaymentMethods = Object.entries(
                                    activeDetails.reduce((acc, curr) => {
                                        const pm = curr.paymentMethod || "Unknown";
                                        if (!acc[pm]) acc[pm] = { totalAmount: 0, count: 0 };
                                        if (!isPhspsMidnapore(curr.centre)) {
                                            acc[pm].totalAmount += (curr.paidAmount || 0);
                                        }
                                        acc[pm].count += 1;
                                        return acc;
                                    }, {})
                                ).map(([method, data]) => ({ _id: method, totalAmount: data.totalAmount, count: data.count }));

                                return dynamicPaymentMethods.length ? dynamicPaymentMethods.map((method) => (
                                    <div key={method._id} className={`flex justify-between text-sm ${secondaryTextClass}`}>
                                        <span>{method._id || "Unknown"}</span>
                                        <span>{formatAmount(method.totalAmount)} ({method.count})</span>
                                    </div>
                                )) : (
                                    <div className="text-gray-500">No payment method data available.</div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                <div className={`${cardBgClass} ${cardBorderClass} rounded-[4px] p-4 mb-6`}>
                    <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
                        <div className="relative">
                            <label className={`block mb-2 text-sm ${secondaryTextClass}`}>Zone</label>
                            <button
                                onClick={() => {
                                    setIsZoneOpen(!isZoneOpen);
                                    setIsCentreOpen(false);
                                    setIsCourseOpen(false);
                                    setIsDepartmentOpen(false);
                                    setIsExamTagOpen(false);
                                    setIsPaymentMethodOpen(false);
                                }}
                                className={`w-full rounded-[4px] p-3 text-left flex justify-between items-center ${filterButtonClass}`}
                            >
                                <span>{selectedZones.length === 0 ? "All Zones" : `${selectedZones.length} selected`}</span>
                                <FaChevronDown className={`transform transition ${isZoneOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isZoneOpen && (
                                <div className={`absolute top-full left-0 right-0 mt-1 rounded-[4px] shadow-lg z-50 ${filterPopupClass}`}>
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Search zone..."
                                            value={zoneSearch}
                                            onChange={(e) => setZoneSearch(e.target.value)}
                                            className={`w-full rounded-t-[4px] p-2 text-sm ${filterInputClass}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedZones([]);
                                                setZoneSearch("");
                                                setSelectedCentres([]); // reset centre selection
                                            }}
                                            className={`ml-2 text-xs font-medium ${clearButtonClass}`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {filteredZones.length > 0 ? filteredZones.map((zone) => (
                                            <label key={zone._id} className={`flex items-center px-4 py-2 cursor-pointer ${filterOptionClass}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedZones.includes(zone._id)}
                                                    onChange={() => {
                                                        toggleSelection(zone._id, selectedZones, setSelectedZones);
                                                        setSelectedCentres([]); // reset centre selection
                                                    }}
                                                    className="mr-2 w-4 h-4"
                                                />
                                                <span>{zone.name}</span>
                                            </label>
                                        )) : (
                                            <div className="px-4 py-2 text-gray-500 text-sm">No zones found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <label className={`block mb-2 text-sm ${secondaryTextClass}`}>Centre</label>
                            <button
                                onClick={() => {
                                    setIsCentreOpen(!isCentreOpen);
                                    setIsZoneOpen(false);
                                    setIsCourseOpen(false);
                                    setIsDepartmentOpen(false);
                                    setIsExamTagOpen(false);
                                    setIsPaymentMethodOpen(false);
                                }}
                                className={`w-full rounded-\[4px\] p-3 text-left flex justify-between items-center ${filterButtonClass}`}
                            >
                                <span>{selectedCentres.length === 0 ? "All Centres" : `${selectedCentres.length} selected`}</span>
                                <FaChevronDown className={`transform transition ${isCentreOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isCentreOpen && (
                                <div className={`absolute top-full left-0 right-0 mt-1 rounded-\[4px\] shadow-lg z-50 ${filterPopupClass}`}>
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Search centre..."
                                            value={centreSearch}
                                            onChange={(e) => setCentreSearch(e.target.value)}
                                            className={`w-full rounded-t-\[4px\] p-2 text-sm ${filterInputClass}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCentres([]);
                                                setCentreSearch("");
                                            }}
                                            className={`ml-2 text-xs font-medium ${clearButtonClass}`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {filteredCenters.length > 0 ? filteredCenters.map((centre) => (
                                            <label key={centre._id} className={`flex items-center px-4 py-2 cursor-pointer ${filterOptionClass}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCentres.includes(centre._id)}
                                                    onChange={() => toggleSelection(centre._id, selectedCentres, setSelectedCentres)}
                                                    className="mr-2 w-4 h-4"
                                                />
                                                <span>{centre.centreName}</span>
                                            </label>
                                        )) : (
                                            <div className="px-4 py-2 text-gray-500 text-sm">No centres found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <label className={`block mb-2 text-sm ${secondaryTextClass}`}>Course</label>
                            <button
                                onClick={() => {
                                    setIsCourseOpen(!isCourseOpen);
                                    setIsZoneOpen(false);
                                    setIsCentreOpen(false);
                                    setIsDepartmentOpen(false);
                                    setIsExamTagOpen(false);
                                    setIsPaymentMethodOpen(false);
                                }}
                                className={`w-full rounded-\[4px\] p-3 text-left flex justify-between items-center ${filterButtonClass}`}
                            >
                                <span>{selectedCourses.length === 0 ? "All Courses" : `${selectedCourses.length} selected`}</span>
                                <FaChevronDown className={`transform transition ${isCourseOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isCourseOpen && (
                                <div className={`absolute top-full left-0 right-0 mt-1 rounded-\[4px\] shadow-lg z-50 ${filterPopupClass}`}>
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Search course..."
                                            value={courseSearch}
                                            onChange={(e) => setCourseSearch(e.target.value)}
                                            className={`w-full rounded-t-\[4px\] p-2 text-sm ${filterInputClass}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCourses([]);
                                                setCourseSearch("");
                                            }}
                                            className={`ml-2 text-xs font-medium ${clearButtonClass}`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {filteredCourses.length > 0 ? filteredCourses.map((course) => (
                                            <label key={course._id} className={`flex items-center px-4 py-2 cursor-pointer ${filterOptionClass}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCourses.includes(course._id)}
                                                    onChange={() => toggleSelection(course._id, selectedCourses, setSelectedCourses)}
                                                    className="mr-2 w-4 h-4"
                                                />
                                                <span>{course.courseName}</span>
                                            </label>
                                        )) : (
                                            <div className="px-4 py-2 text-gray-500 text-sm">No courses found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <label className={`block mb-2 text-sm ${secondaryTextClass}`}>Department</label>
                            <button
                                onClick={() => {
                                    setIsDepartmentOpen(!isDepartmentOpen);
                                    setIsZoneOpen(false);
                                    setIsCentreOpen(false);
                                    setIsCourseOpen(false);
                                    setIsExamTagOpen(false);
                                }}
                                className={`w-full rounded-\[4px\] p-3 text-left flex justify-between items-center ${filterButtonClass}`}
                            >
                                <span>{selectedDepartments.length === 0 ? "All Departments" : `${selectedDepartments.length} selected`}</span>
                                <FaChevronDown className={`transform transition ${isDepartmentOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isDepartmentOpen && (
                                <div className={`absolute top-full left-0 right-0 mt-1 rounded-\[4px\] shadow-lg z-50 ${filterPopupClass}`}>
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Search department..."
                                            value={departmentSearch}
                                            onChange={(e) => setDepartmentSearch(e.target.value)}
                                            className={`w-full rounded-t-\[4px\] p-2 text-sm ${filterInputClass}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedDepartments([]);
                                                setDepartmentSearch("");
                                            }}
                                            className={`ml-2 text-xs font-medium ${clearButtonClass}`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {filteredDepartments.length > 0 ? filteredDepartments.map((department) => (
                                            <label key={department._id} className={`flex items-center px-4 py-2 cursor-pointer ${filterOptionClass}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDepartments.includes(department._id)}
                                                    onChange={() => toggleSelection(department._id, selectedDepartments, setSelectedDepartments)}
                                                    className="mr-2 w-4 h-4"
                                                />
                                                <span>{department.departmentName}</span>
                                            </label>
                                        )) : (
                                            <div className="px-4 py-2 text-gray-500 text-sm">No departments found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <label className={`block mb-2 text-sm ${secondaryTextClass}`}>Exam Tag</label>
                            <button
                                onClick={() => {
                                    setIsExamTagOpen(!isExamTagOpen);
                                    setIsZoneOpen(false);
                                    setIsCentreOpen(false);
                                    setIsCourseOpen(false);
                                    setIsDepartmentOpen(false);
                                }}
                                className={`w-full rounded-\[4px\] p-3 text-left flex justify-between items-center ${filterButtonClass}`}
                            >
                                <span>{selectedExamTags.length === 0 ? "All Exam Tags" : `${selectedExamTags.length} selected`}</span>
                                <FaChevronDown className={`transform transition ${isExamTagOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isExamTagOpen && (
                                <div className={`absolute top-full left-0 right-0 mt-1 rounded-\[4px\] shadow-lg z-50 ${filterPopupClass}`}>
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Search exam tag..."
                                            value={examTagSearch}
                                            onChange={(e) => setExamTagSearch(e.target.value)}
                                            className={`w-full rounded-t-\[4px\] p-2 text-sm ${filterInputClass}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedExamTags([]);
                                                setExamTagSearch("");
                                            }}
                                            className={`ml-2 text-xs font-medium ${clearButtonClass}`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {filteredExamTags.length > 0 ? filteredExamTags.map((tag) => (
                                            <label key={tag._id} className={`flex items-center px-4 py-2 cursor-pointer ${filterOptionClass}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedExamTags.includes(tag._id)}
                                                    onChange={() => toggleSelection(tag._id, selectedExamTags, setSelectedExamTags)}
                                                    className="mr-2 w-4 h-4"
                                                />
                                                <span>{tag.name || tag.examName || "Unknown"}</span>
                                            </label>
                                        )) : (
                                            <div className="px-4 py-2 text-gray-500 text-sm">No exam tags found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <label className={`block mb-2 text-sm ${secondaryTextClass}`}>Payment Method</label>
                            <button
                                onClick={() => {
                                    setIsPaymentMethodOpen(!isPaymentMethodOpen);
                                    setIsZoneOpen(false);
                                    setIsCentreOpen(false);
                                    setIsCourseOpen(false);
                                    setIsDepartmentOpen(false);
                                    setIsExamTagOpen(false);
                                }}
                                className={`w-full rounded-[4px] p-3 text-left flex justify-between items-center ${filterButtonClass}`}
                            >
                                <span>{selectedPaymentMethods.length === 0 ? "All Methods" : `${selectedPaymentMethods.length} selected`}</span>
                                <FaChevronDown className={`transform transition ${isPaymentMethodOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isPaymentMethodOpen && (
                                <div className={`absolute top-full left-0 right-0 mt-1 rounded-[4px] shadow-lg z-50 ${filterPopupClass}`}>
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Search payment method..."
                                            value={paymentMethodSearch}
                                            onChange={(e) => setPaymentMethodSearch(e.target.value)}
                                            className={`w-full rounded-t-[4px] p-2 text-sm ${filterInputClass}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedPaymentMethods([]);
                                                setPaymentMethodSearch("");
                                            }}
                                            className={`ml-2 text-xs font-medium ${clearButtonClass}`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto">
                                        {filteredPaymentMethods.length > 0 ? filteredPaymentMethods.map((method, index) => (
                                            <label key={`${method}_${index}`} className={`flex items-center px-4 py-2 cursor-pointer ${filterOptionClass}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPaymentMethods.includes(method)}
                                                    onChange={() => toggleSelection(method, selectedPaymentMethods, setSelectedPaymentMethods)}
                                                    className="mr-2 w-4 h-4"
                                                />
                                                <span>{method}</span>
                                            </label>
                                        )) : (
                                            <div className="px-4 py-2 text-gray-500 text-sm">No payment methods found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={`block mb-2 text-sm ${secondaryTextClass}`}>Search</label>
                            <div className="relative">
                                <input
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Search by bill, txn, student"
                                    className={`w-full rounded-[4px] p-3 pl-10 ${isDarkMode ? "bg-[#15181f] border border-gray-700 text-white" : "bg-white border border-gray-300 text-slate-900"}`}
                                />
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`${cardBgClass} ${cardBorderClass} rounded-[4px] p-4`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                        <div className={`flex items-center gap-2 p-1 rounded-lg border ${isDarkMode
                            ? "bg-gray-900/40 border-gray-800"
                            : "bg-slate-100 border-gray-200"
                            }`}>
                            <button
                                onClick={() => setActiveTab("centers")}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === "centers"
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : isDarkMode
                                        ? "text-gray-400 hover:text-gray-200"
                                        : "text-slate-600 hover:text-slate-950"
                                    }`}
                            >
                                Centers Collection
                            </button>
                            <button
                                onClick={() => setActiveTab("details")}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === "details"
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : isDarkMode
                                        ? "text-gray-400 hover:text-gray-200"
                                        : "text-slate-600 hover:text-slate-950"
                                    }`}
                            >
                                Details with Bill
                            </button>
                        </div>
                        <div className={`text-sm ${secondaryTextClass}`}>{activeTab === "centers" ? "Aggregated by Centre" : `${dailyDetails.length} records`}</div>
                    </div>

                    {activeTab === "centers" ? (
                        <div className="overflow-x-auto">
                            <table className={`w-full divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-200"} text-sm text-left`}>
                                <thead className={`${tableHeaderBgClass} ${tableHeaderTextClass} uppercase text-[11px] tracking-wider`}>
                                    <tr>
                                        <th className="px-4 py-3">Centre Name</th>
                                        <th className="px-4 py-3 text-right font-bold text-amber-500">
                                            <div className="flex items-center justify-end gap-2">
                                                <span>Daily Target (Adjusted - Excl. GST)</span>
                                                {canEditTarget && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openBulkTargetModal(activeCentres.map(c => c.centreName).filter(Boolean))}
                                                        className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded flex items-center gap-1 transition-all shadow-sm"
                                                        title="Bulk Update Daily Targets for Current Date"
                                                    >
                                                        <FaEdit size={10} /> Bulk
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                        {paymentMethodsList.map(method => (
                                            <th key={method} className="px-4 py-3 text-right">{method}</th>
                                        ))}
                                        <th className="px-4 py-3 text-right font-bold text-blue-400">Total (With GST)</th>
                                        <th className="px-4 py-3 text-right font-bold text-amber-500">Total (Without GST)</th>
                                    </tr>
                                </thead>
                                {(() => {
                                    const aggregatedData = activeDetails.reduce((acc, curr) => {
                                        const c = curr.centre || "N/A";
                                        if (!acc[c]) acc[c] = { total: 0, totalWithoutGst: 0 };
                                        acc[c][curr.paymentMethod] = (acc[c][curr.paymentMethod] || 0) + (curr.paidAmount || 0);
                                        acc[c].total += (curr.paidAmount || 0);

                                        let itemWithoutGst = 0;
                                        if (curr.revenueWithoutGst !== undefined && curr.revenueWithoutGst !== null) {
                                            itemWithoutGst = Number(curr.revenueWithoutGst);
                                        } else if (curr.courseFee && Number(curr.courseFee) > 0 && (!curr.centre || !/phsps/i.test(curr.centre))) {
                                            itemWithoutGst = Number(curr.courseFee);
                                        } else {
                                            const isPhsps = curr.centre && /phsps/i.test(curr.centre);
                                            itemWithoutGst = isPhsps ? (curr.paidAmount || 0) : ((curr.paidAmount || 0) / 1.18);
                                        }
                                        acc[c].totalWithoutGst = (acc[c].totalWithoutGst || 0) + itemWithoutGst;

                                        return acc;
                                    }, (() => {
                                        const initialAcc = {};
                                        const targetCentres = selectedCentres.length > 0
                                            ? activeCentres.filter(c => selectedCentres.includes(c._id))
                                            : activeCentres;
                                        targetCentres.forEach(c => {
                                            if (c.centreName) {
                                                initialAcc[c.centreName] = { total: 0, totalWithoutGst: 0 };
                                            }
                                        });
                                        return initialAcc;
                                    })()); const sortedData = Object.entries(aggregatedData).sort((a, b) => a[0].localeCompare(b[0]));

                                    const isPhspsMidnapore = (centre) => {
                                        if (!centre) return false;
                                        const str = centre.toLowerCase();
                                        return str.includes('phsps') && (str.includes('midnapore') || str.includes('midnapur') || str.includes('medinipur'));
                                    };

                                    // Column Totals (excluding PHSPS Midnapore from total sums)
                                    const totalTarget = sortedData.reduce((sum, [centre]) => isPhspsMidnapore(centre) ? sum : sum + (centreTargets[centre] || 0), 0);
                                    const totalPaymentMethods = paymentMethodsList.reduce((acc, method) => {
                                        acc[method] = sortedData.reduce((sum, [centre, data]) => isPhspsMidnapore(centre) ? sum : sum + (data[method] || 0), 0);
                                        return acc;
                                    }, {});
                                    const totalWithGst = sortedData.reduce((sum, [centre, data]) => isPhspsMidnapore(centre) ? sum : sum + (data.total || 0), 0);
                                    const totalWithoutGst = sortedData.reduce((sum, [centre, data]) => {
                                        if (isPhspsMidnapore(centre)) return sum;
                                        return sum + (data.totalWithoutGst || 0);
                                    }, 0);

                                    return (
                                        <>
                                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-200"}`}>
                                                {sortedData.map(([centre, data]) => {
                                                    const isPhsps = /phsps/i.test(centre);
                                                    const rowWithoutGst = data.totalWithoutGst !== undefined ? data.totalWithoutGst : (isPhsps ? data.total : (data.total / 1.18));
                                                    return (
                                                        <tr key={centre} className={tableRowHoverClass}>
                                                            <td className={`px-4 py-4 font-bold ${cardTextClass}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <span>{centre}</span>
                                                                    {rowWithoutGst < (centreTargets[centre] || 0) && (
                                                                        <span className="inline-flex items-center text-red-500 hover:scale-110 transition-transform cursor-help" title="Total (without GST) is less than daily target (without GST)">
                                                                            <FaFlag className="animate-pulse text-red-500" size={14} />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className={`px-4 py-4 text-right font-semibold text-amber-500`}>
                                                                {canEditTarget ? (
                                                                    editingCentre === centre ? (
                                                                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                                                            <input
                                                                                type="number"
                                                                                value={editTargetValue}
                                                                                onChange={e => setEditTargetValue(e.target.value)}
                                                                                className={`w-24 px-2 py-1 text-xs text-right border rounded outline-none ${isDarkMode ? "bg-gray-800 border-gray-700 text-white focus:border-blue-500" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"}`}
                                                                                autoFocus
                                                                                onKeyDown={e => {
                                                                                    if (e.key === 'Enter') handleSaveTarget(centre);
                                                                                    if (e.key === 'Escape') setEditingCentre(null);
                                                                                }}
                                                                            />
                                                                            <button
                                                                                onClick={() => handleSaveTarget(centre)}
                                                                                className="p-1 text-green-500 hover:text-green-400 transition-colors"
                                                                                title="Save"
                                                                            >
                                                                                <FaSave size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingCentre(null)}
                                                                                className="p-1 text-red-500 hover:text-red-400 transition-colors"
                                                                                title="Cancel"
                                                                            >
                                                                                <FaTimes size={14} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className="flex items-center justify-end gap-2 group/target cursor-pointer select-none"
                                                                            onClick={() => {
                                                                                setEditingCentre(centre);
                                                                                setEditTargetValue(centreTargets[centre] || 0);
                                                                            }}
                                                                            title="Click to edit daily target"
                                                                        >
                                                                            <div className="flex flex-col items-end">
                                                                                <span>{formatAmount(centreTargets[centre] || 0)}</span>
                                                                                {centreTargetMeta[centre]?.shortfallAdded > 0 && (
                                                                                    <span
                                                                                        className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.5 rounded mt-0.5"
                                                                                        title={`Base target: ${formatAmount(centreTargetMeta[centre]?.baseTarget || 0)} + Shortfall adjusted: ${formatAmount(centreTargetMeta[centre]?.shortfallAdded || 0)}`}
                                                                                    >
                                                                                        +{formatAmount(centreTargetMeta[centre]?.shortfallAdded)} adj
                                                                                    </span>
                                                                                )}
                                                                                {centreTargetMeta[centre]?.shortfallAdded < 0 && (
                                                                                    <span
                                                                                        className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded mt-0.5"
                                                                                        title={`Base target: ${formatAmount(centreTargetMeta[centre]?.baseTarget || 0)} - Saturday surplus adjusted: ${formatAmount(Math.abs(centreTargetMeta[centre]?.shortfallAdded))}`}
                                                                                    >
                                                                                        -{formatAmount(Math.abs(centreTargetMeta[centre]?.shortfallAdded))} adj
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <FaEdit size={12} className="text-amber-500 opacity-0 group-hover/target:opacity-100 transition-opacity" />
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <div className="flex flex-col items-end">
                                                                        <span>{formatAmount(centreTargets[centre] || 0)}</span>
                                                                        {centreTargetMeta[centre]?.shortfallAdded > 0 && (
                                                                            <span
                                                                                className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.5 rounded mt-0.5"
                                                                                title={`Base target: ${formatAmount(centreTargetMeta[centre]?.baseTarget || 0)} + Shortfall adjusted: ${formatAmount(centreTargetMeta[centre]?.shortfallAdded || 0)}`}
                                                                            >
                                                                                +{formatAmount(centreTargetMeta[centre]?.shortfallAdded)} adj
                                                                            </span>
                                                                        )}
                                                                        {centreTargetMeta[centre]?.shortfallAdded < 0 && (
                                                                            <span
                                                                                className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded mt-0.5"
                                                                                title={`Base target: ${formatAmount(centreTargetMeta[centre]?.baseTarget || 0)} - Saturday surplus adjusted: ${formatAmount(Math.abs(centreTargetMeta[centre]?.shortfallAdded))}`}
                                                                            >
                                                                                -{formatAmount(Math.abs(centreTargetMeta[centre]?.shortfallAdded))} adj
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {paymentMethodsList.map(method => (
                                                                <td key={method} className={`px-4 py-4 text-right ${tableDataTextClass}`}>
                                                                    {data[method] ? formatAmount(data[method]) : "0"}
                                                                </td>
                                                            ))}
                                                            <td className={`px-4 py-4 text-right font-black text-green-500`}>{formatAmount(data.total)}</td>
                                                            <td className={`px-4 py-4 text-right font-bold text-amber-500`}>{formatAmount(rowWithoutGst)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className={`${tableHeaderBgClass} font-bold ${cardTextClass} border-t-2 ${isDarkMode ? "border-gray-800" : "border-gray-300"}`}>
                                                <tr>
                                                    <td className="px-4 py-4">TOTAL</td>
                                                    <td className="px-4 py-4 text-right text-amber-500">{formatAmount(totalTarget)}</td>
                                                    {paymentMethodsList.map(method => (
                                                        <td key={method} className="px-4 py-4 text-right text-gray-400">{formatAmount(totalPaymentMethods[method] || 0)}</td>
                                                    ))}
                                                    <td className="px-4 py-4 text-right text-green-500">{formatAmount(totalWithGst)}</td>
                                                    <td className="px-4 py-4 text-right text-amber-500">{formatAmount(totalWithoutGst)}</td>
                                                </tr>
                                            </tfoot>
                                        </>
                                    );
                                })()}
                            </table>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                                <table className={`min-w-[1400px] divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-200"} text-sm text-left`}>
                                    <thead className={`${tableHeaderBgClass} ${tableHeaderTextClass} uppercase text-[11px] tracking-wider`}>
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Centre</th>
                                            <th className="px-4 py-3">Student</th>
                                            <th className="px-4 py-3">Admission No.</th>
                                            <th className="px-4 py-3">Class</th>
                                            <th className="px-4 py-3">Bill / Txn</th>
                                            <th className="px-4 py-3">Course</th>
                                            <th className="px-4 py-3">Department</th>
                                            <th className="px-4 py-3">Method</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Recorded By</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-200"}`}>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="12" className={`px-4 py-8 text-center ${secondaryTextClass}`}>Loading collection data...</td>
                                            </tr>
                                        ) : dailyDetails.length === 0 ? (
                                            <tr>
                                                <td colSpan="12" className={`px-4 py-8 text-center ${secondaryTextClass}`}>No transactions found for this date.</td>
                                            </tr>
                                        ) : (
                                            paginatedDetails.map((item) => (
                                                <tr key={item._id} className={tableRowHoverClass}>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{formatDateTime(item.date)}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.centre || "-"}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.studentName || "-"}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.admissionNumber || "-"}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.studentClass || "-"}</td>
                                                    <td className={`px-4 py-3 ${tableBillTextClass}`}>
                                                        <div>{item.billId || "-"}</div>
                                                        <div className={`text-xs ${isDarkMode ? "text-gray-500" : "text-slate-500"}`}>{item.transactionId || ""}</div>
                                                    </td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.courseName || "-"}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.departmentName || "-"}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.paymentMethod || "-"}</td>
                                                    <td className={`px-4 py-3 text-right ${tableAmountTextClass}`}>{formatAmount(item.paidAmount)}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.status || "-"}</td>
                                                    <td className={`px-4 py-3 ${tableDataTextClass}`}>{item.recordedByName || "-"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className={`text-sm ${secondaryTextClass}`}>
                                    Showing {paginatedDetails.length} of {dailyDetails.length} transactions
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <label htmlFor="pageSize" className={`font-medium ${cardTextClass}`}>Rows:</label>
                                        <select
                                            id="pageSize"
                                            value={pageSize}
                                            onChange={(e) => {
                                                const size = Number(e.target.value);
                                                setPageSize(size);
                                                setCurrentPage(1);
                                                setPageInput("1");
                                            }}
                                            className={`rounded-[4px] border px-2 py-1 ${isDarkMode ? "bg-[#15181f] border-gray-700 text-white" : "bg-white border-gray-300 text-slate-900"}`}
                                        >
                                            {[10, 20, 50, 100].map((size) => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => {
                                                const nextPage = Math.max(1, currentPage - 1);
                                                setCurrentPage(nextPage);
                                                setPageInput(String(nextPage));
                                            }}
                                            className={`rounded-[4px] px-3 py-1 ${isDarkMode ? "bg-slate-800 border border-gray-700" : "bg-slate-100 border border-gray-300"} ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200"}`}
                                        >Prev</button>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max={pageCount}
                                                value={pageInput}
                                                onChange={(e) => setPageInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        const page = Number(e.target.value) || 1;
                                                        const validPage = Math.min(Math.max(page, 1), pageCount);
                                                        setCurrentPage(validPage);
                                                        setPageInput(String(validPage));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    const page = Number(pageInput) || 1;
                                                    const validPage = Math.min(Math.max(page, 1), pageCount);
                                                    setCurrentPage(validPage);
                                                    setPageInput(String(validPage));
                                                }}
                                                className={`w-20 rounded-[4px] border px-2 py-1 text-sm ${isDarkMode ? "bg-[#15181f] border-gray-700 text-white" : "bg-white border-gray-300 text-slate-900"}`}
                                            />
                                            <span className={tableDataTextClass}>/ {pageCount}</span>
                                        </div>
                                        <button
                                            disabled={currentPage === pageCount}
                                            onClick={() => {
                                                const nextPage = Math.min(pageCount, currentPage + 1);
                                                setCurrentPage(nextPage);
                                                setPageInput(String(nextPage));
                                            }}
                                            className={`rounded-[4px] px-3 py-1 ${isDarkMode ? "bg-slate-800 border border-gray-700" : "bg-slate-100 border border-gray-300"} ${currentPage === pageCount ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200"}`}
                                        >Next</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Bulk Daily Target Updation Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className={`w-full max-w-3xl rounded-lg shadow-2xl border flex flex-col max-h-[92vh] ${isDarkMode ? "bg-[#13161c] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-bold">Bulk Set Daily Targets</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Set targets across centres for multiple dates simultaneously. Weekday shortfalls automatically adjust into Saturday & Sunday.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsBulkModalOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* Week-Wise Selection Section */}
                        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-900/30">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mr-1">Select Weeks:</span>
                                    {allMonthWeeks.map(w => {
                                        const isCurrent = selectedWeekNumbers.includes(w.weekNumber);
                                        return (
                                            <button
                                                key={w.weekNumber}
                                                type="button"
                                                onClick={() => handleToggleWeek(w.weekNumber)}
                                                className={`px-3 py-1 text-xs font-bold rounded transition-all select-none flex items-center gap-1.5 ${
                                                    isCurrent
                                                        ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
                                                        : isDarkMode
                                                            ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                                                            : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${isCurrent ? "bg-white" : "bg-transparent border border-gray-400"}`} />
                                                <span>{w.label}</span>
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={handleSelectAllWeeks}
                                        className="px-2.5 py-1 text-xs font-bold rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        All Weeks
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 ml-auto">
                                    <button
                                        type="button"
                                        onClick={handleSelectWeekdaysAcrossWeeks}
                                        className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                                    >
                                        Weekdays Only (Mon-Fri)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSelectWeekendAcrossWeeks}
                                        className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-colors"
                                    >
                                        Weekend Only (Sat-Sun)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSelectAllDaysAcrossWeeks}
                                        className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                                    >
                                        All Days
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-1 max-h-[160px] overflow-y-auto">
                                {allMonthWeeks
                                    .filter(w => selectedWeekNumbers.includes(w.weekNumber))
                                    .map(w => (
                                        <div key={w.weekNumber} className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 min-w-[60px]">
                                                Week {w.weekNumber}:
                                            </span>
                                            {w.days.map(d => {
                                                const isSelected = bulkSelectedDates.includes(d.dateStr);
                                                return (
                                                    <button
                                                        key={d.dateStr}
                                                        type="button"
                                                        onClick={() => {
                                                            setBulkSelectedDates(prev =>
                                                                prev.includes(d.dateStr) ? prev.filter(x => x !== d.dateStr) : [...prev, d.dateStr]
                                                            );
                                                        }}
                                                        className={`px-2.5 py-1 text-xs rounded-md font-semibold border flex items-center gap-1.5 transition-all select-none ${isSelected
                                                            ? d.isWeekend
                                                                ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                                                                : "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                            : isDarkMode
                                                                ? "bg-[#181b22] border-gray-700 text-gray-400 hover:border-gray-500"
                                                                : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                                                        }`}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-transparent border border-gray-400"}`} />
                                                        <span>{d.dayName} {d.dayNum}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-2 font-medium">
                                <span>Click any day to toggle on/off</span>
                                <span>
                                    Selected: <b className="text-amber-500">{bulkSelectedDates.length}</b> day(s) across <b className="text-blue-400">{selectedWeekNumbers.length}</b> week(s)
                                </span>
                            </div>
                        </div>

                        {/* Quick Fill & Search Bar */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/40">
                            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                                <input
                                    type="number"
                                    placeholder="Common target amount..."
                                    value={bulkCommonValue}
                                    onChange={(e) => setBulkCommonValue(e.target.value)}
                                    className={`w-44 px-3 py-1.5 text-xs rounded border outline-none ${isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyCommonValue}
                                    className="px-3 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-1"
                                >
                                    Apply to Selected ({bulkSelectedCentres.length})
                                </button>
                            </div>
                            <div className="relative w-48">
                                <input
                                    type="text"
                                    placeholder="Search centre..."
                                    value={bulkSearch}
                                    onChange={(e) => setBulkSearch(e.target.value)}
                                    className={`w-full pl-7 pr-3 py-1.5 text-xs rounded border outline-none ${isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                />
                                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                            </div>
                        </div>

                        {/* Centres Target List */}
                        <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
                            {(() => {
                                const visibleCentres = Object.keys(bulkTargetValues)
                                    .filter(cName => !bulkSearch || cName.toLowerCase().includes(bulkSearch.toLowerCase()));
                                const allVisibleSelected = visibleCentres.length > 0 && visibleCentres.every(c => bulkSelectedCentres.includes(c));

                                return (
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase tracking-wider text-[10px]">
                                                <th className="pb-2 text-left w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        onChange={() => handleToggleAllCentres(visibleCentres)}
                                                        className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                                    />
                                                </th>
                                                <th className="pb-2 text-left">Centre Name</th>
                                                <th className="pb-2 text-right">Current Target</th>
                                                <th className="pb-2 text-right">New Target (Excl. GST)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {visibleCentres.map(cName => {
                                                const isCentreSelected = bulkSelectedCentres.includes(cName);
                                                return (
                                                    <tr
                                                        key={cName}
                                                        className={`transition-colors ${
                                                            isCentreSelected
                                                                ? "bg-blue-50/40 dark:bg-blue-950/20"
                                                                : "opacity-60 hover:opacity-100"
                                                        }`}
                                                    >
                                                        <td className="py-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={isCentreSelected}
                                                                onChange={() => handleToggleCentre(cName)}
                                                                className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td
                                                            className="py-2.5 font-semibold text-gray-800 dark:text-gray-200 cursor-pointer select-none"
                                                            onClick={() => handleToggleCentre(cName)}
                                                        >
                                                            {cName}
                                                        </td>
                                                        <td className="py-2.5 text-right text-gray-500">
                                                            ₹{formatAmount(centreTargets[cName] || 0)}
                                                            {centreTargetMeta[cName]?.shortfallAdded > 0 && (
                                                                <span className="ml-1.5 text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.2 rounded" title={`Base target: ₹${formatAmount(centreTargetMeta[cName]?.baseTarget || 0)} (+₹${formatAmount(centreTargetMeta[cName]?.shortfallAdded)} shortfall adjusted)`}>
                                                                    +{formatAmount(centreTargetMeta[cName]?.shortfallAdded)} adj
                                                                </span>
                                                            )}
                                                            {centreTargetMeta[cName]?.shortfallAdded < 0 && (
                                                                <span className="ml-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded" title={`Base target: ₹${formatAmount(centreTargetMeta[cName]?.baseTarget || 0)} (-₹${formatAmount(Math.abs(centreTargetMeta[cName]?.shortfallAdded))} Saturday surplus adjusted)`}>
                                                                    -{formatAmount(Math.abs(centreTargetMeta[cName]?.shortfallAdded))} adj
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 text-right">
                                                            <input
                                                                type="number"
                                                                value={bulkTargetValues[cName] ?? ""}
                                                                disabled={!isCentreSelected}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setBulkTargetValues(prev => ({ ...prev, [cName]: val }));
                                                                }}
                                                                className={`w-32 px-2.5 py-1 text-xs text-right rounded border outline-none font-semibold ${
                                                                    !isCentreSelected
                                                                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-800"
                                                                        : isDarkMode
                                                                            ? "bg-gray-800 border-gray-700 text-white focus:border-amber-500"
                                                                            : "bg-white border-gray-300 text-gray-900 focus:border-amber-500"
                                                                }`}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
                            <span className="text-[11px] text-gray-500">
                                <b className="text-blue-500">{bulkSelectedCentres.length}</b> of {Object.keys(bulkTargetValues).length} centres selected
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBulkModalOpen(false)}
                                    className="px-4 py-1.5 text-xs font-semibold rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={bulkSaving || bulkSelectedCentres.length === 0}
                                    onClick={handleSaveBulkTargets}
                                    className={`px-5 py-1.5 text-xs font-bold rounded bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-1.5 ${
                                        bulkSaving || bulkSelectedCentres.length === 0 ? "opacity-60 cursor-not-allowed" : ""
                                    }`}
                                >
                                    {bulkSaving ? "Saving..." : `Save Selected (${bulkSelectedCentres.length} centres)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default DailyCollection;
