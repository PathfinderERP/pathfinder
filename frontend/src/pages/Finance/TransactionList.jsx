import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser, FaChartBar, FaTable, FaTh, FaArrowUp, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import { sortTransactionsSequentially } from "../../utils/transactionSortHelper";

const TransactionList = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    // Theme class variables (same pattern as DailyCollection)
    const cardBg = isDark ? "bg-[#1a1e27]" : "bg-white";
    const cardBorder = isDark ? "border border-gray-700" : "border border-gray-200";
    const cardText = isDark ? "text-white" : "text-slate-900";
    const subText = isDark ? "text-gray-400" : "text-slate-500";
    const innerBox = isDark ? "bg-[#111318] border border-gray-800" : "bg-gray-50 border border-gray-100";
    const inputBg = isDark ? "bg-[#15181f] border-gray-700 text-white placeholder-gray-600" : "bg-white border-gray-300 text-slate-900";
    const dropdownBg = isDark ? "bg-[#1a1e27] border border-gray-600 text-white" : "bg-white border border-gray-200 text-slate-900";
    const dropdownHdr = isDark ? "bg-[#111318] border-b border-gray-700" : "bg-gray-50 border-b border-gray-100";
    const dropdownRow = isDark ? "hover:bg-slate-800 border-b border-gray-800" : "hover:bg-gray-100 border-b border-gray-50";
    const dropdownTxt = isDark ? "text-gray-200" : "text-slate-700";
    const tHeadBg = isDark ? "bg-[#0f1318]" : "bg-gray-50";
    const tHeadBorder = isDark ? "border-b border-gray-700" : "border-b border-gray-200";
    const tHeadTxt = isDark ? "text-gray-400" : "text-slate-500";
    const tRowBg = isDark ? "bg-[#1a1e27]" : "bg-white";
    const tRowHover = isDark ? "hover:bg-slate-900" : "hover:bg-gray-50";
    const tRowBorder = isDark ? "border-b border-gray-800" : "border-b border-gray-100";
    const tTxt = isDark ? "text-gray-200" : "text-slate-700";
    const tTxtSub = isDark ? "text-gray-400" : "text-slate-500";
    const paginBg = isDark ? "bg-[#111318] border-t border-gray-800" : "bg-gray-50 border-t border-gray-200";
    const btnBg = isDark ? "bg-[#15181f] border border-gray-700 text-white hover:bg-slate-800" : "bg-white border border-gray-300 text-slate-700 hover:bg-gray-50";
    const segmentOff = isDark ? "bg-[#15181f] text-gray-400" : "bg-white text-gray-500";
    const segmentBorder = isDark ? "border border-gray-700" : "border border-gray-300";
    const iconBoxGreen = isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600";
    const iconBoxPurple = isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600";
    const iconBoxOrange = isDark ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-600";
    const pillBg = isDark ? "bg-[#15181f]" : "bg-gray-50";

    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [detailedReport, setDetailedReport] = useState([]);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const [stats, setStats] = useState({
        currentYear: 0,
        previousYear: 0,
        currentMonth: 0,
        previousMonth: 0,
        currentYearLabel: new Date().getFullYear(),
        previousYearLabel: new Date().getFullYear() - 1,
        currentMonthLabel: "Current Month",
        previousMonthLabel: "Previous Month"
    });

    // Filters
    const [centres, setCentres] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [zones, setZones] = useState([]);
    const [boards, setBoards] = useState([]);

    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedBoards, setSelectedBoards] = useState([]);
    const [selectedProgrammes, setSelectedProgrammes] = useState([]);
    const [selectedExamTag, setSelectedExamTag] = useState("");
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [timePeriod, setTimePeriod] = useState("Custom Range");

    // New Filters specific to list
    const [selectedPaymentMode, setSelectedPaymentMode] = useState([]);
    const [selectedTransactionType, setSelectedTransactionType] = useState([]);
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [centreSearch, setCentreSearch] = useState("");
    const [departmentSearch, setDepartmentSearch] = useState("");
    const [zoneSearch, setZoneSearch] = useState("");
    const [boardSearch, setBoardSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState([]);
    const [billFilter, setBillFilter] = useState("all"); // "all" | "no_bill" | "with_bill"
    const [selectedBilledBy, setSelectedBilledBy] = useState([]);
    const [isBilledByDropdownOpen, setIsBilledByDropdownOpen] = useState(false);
    const [billedBySearch, setBilledBySearch] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pageInput, setPageInput] = useState("1");

    // Hold selection totals state during loads & prevent race conditions
    const fetchIdRef = useRef(0);
    const [displaySelectionTotalWithGst, setDisplaySelectionTotalWithGst] = useState(0);
    const [displaySelectionTotalBase, setDisplaySelectionTotalBase] = useState(0);

    // Dropdown Refs
    const centreDropdownRef = useRef(null);
    const paymentDropdownRef = useRef(null);
    const typeDropdownRef = useRef(null);
    const departmentDropdownRef = useRef(null);
    const boardDropdownRef = useRef(null);
    const statusDropdownRef = useRef(null);
    const billedByDropdownRef = useRef(null);
    const zoneDropdownRef = useRef(null);
    const courseDropdownRef = useRef(null);
    const programmeDropdownRef = useRef(null);

    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
    const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isProgrammeDropdownOpen, setIsProgrammeDropdownOpen] = useState(false);
    const [courseSearch, setCourseSearch] = useState("");

    // ---- Effects ----
    useEffect(() => {
        fetchMasterData();
        const handleClickOutside = (event) => {
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(event.target)) {
                setIsCentreDropdownOpen(false);
            }
            if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {
                setIsPaymentDropdownOpen(false);
            }
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
            if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
                setIsDepartmentDropdownOpen(false);
            }
            if (boardDropdownRef.current && !boardDropdownRef.current.contains(event.target)) {
                setIsBoardDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setIsStatusDropdownOpen(false);
            }
            if (billedByDropdownRef.current && !billedByDropdownRef.current.contains(event.target)) {
                setIsBilledByDropdownOpen(false);
            }
            if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(event.target)) {
                setIsZoneDropdownOpen(false);
            }
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
                setIsCourseDropdownOpen(false);
            }
            if (programmeDropdownRef.current && !programmeDropdownRef.current.contains(event.target)) {
                setIsProgrammeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            setCurrentPage(1);
            setPageInput("1");
            fetchReportData();
        }, 500);

        return () => clearTimeout(debounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCentres, selectedZones, selectedExamTag, timePeriod, startDate, endDate, selectedPaymentMode, selectedTransactionType, minAmount, maxAmount, selectedDepartments, searchTerm, selectedStatus]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, dRes, zRes, bRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/board`, { headers })
            ]);

            if (cRes.ok) {
                const data = await cRes.json();
                const filteredCentres = Array.isArray(data)
                    ? data.filter(c =>
                        (!c.status || c.status === 'active') && (
                            user.role === 'superAdmin' ||
                            (user.centres && user.centres.some(uc => uc._id === c._id || uc.centreName === c.centreName))
                        )
                    )
                    : [];
                const sortedCentres = filteredCentres.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setCentres(sortedCentres);
            }
            if (dRes.ok) {
                const data = await dRes.json();
                const visibleDepts = Array.isArray(data) ? data.filter(dept => dept.showInAdmission !== false) : [];
                setDepartments(visibleDepts);
            }
            if (zRes.ok) {
                const data = await zRes.json();
                const zoneList = Array.isArray(data) ? data : (data.data || []);
                const activeZones = zoneList.filter(z => z.isActive !== false);
                setZones(activeZones.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
            }
            if (bRes && bRes.ok) {
                const data = await bRes.json();
                setBoards(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
        const currentFetchId = ++fetchIdRef.current;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            const now = new Date();
            let start, end;

            // Financial Year Calculation
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

            const formatLocalDate = (d) => {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            };

            if (timePeriod === "Custom" || timePeriod === "Custom Range") {
                if (startDate && endDate) {
                    params.append("startDate", startDate);
                    params.append("endDate", endDate);
                }
            } else if (timePeriod === "Today") {
                const todayStr = formatLocalDate(now);
                params.append("startDate", todayStr);
                params.append("endDate", todayStr);
            } else if (timePeriod === "Yesterday") {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                const yesterdayStr = formatLocalDate(yesterday);
                params.append("startDate", yesterdayStr);
                params.append("endDate", yesterdayStr);
            } else if (timePeriod === "Last 7 Days") {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                params.append("startDate", formatLocalDate(sevenDaysAgo));
                params.append("endDate", formatLocalDate(now));
            } else if (timePeriod === "This Month") {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                params.append("startDate", formatLocalDate(start));
                params.append("endDate", formatLocalDate(end));
            } else if (timePeriod === "Last Month") {
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                params.append("startDate", formatLocalDate(start));
                params.append("endDate", formatLocalDate(end));
            }

            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedZones.length > 0) params.append("zoneIds", selectedZones.join(","));
            if (selectedDepartments.length > 0) params.append("departmentIds", selectedDepartments.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);

            // New Filters
            if (selectedPaymentMode.length > 0) params.append("paymentMode", selectedPaymentMode.join(","));
            if (selectedTransactionType.length > 0) params.append("transactionType", selectedTransactionType.join(","));
            if (selectedStatus.length > 0) params.append("status", selectedStatus.join(","));
            if (minAmount) params.append("minAmount", minAmount);
            if (maxAmount) params.append("maxAmount", maxAmount);
            if (searchTerm) params.append("search", searchTerm);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/transaction-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                if (currentFetchId !== fetchIdRef.current) return;
                setDetailedReport(result.detailedReport || []);
                if (result.stats) {
                    setStats(result.stats);
                }
            } else {
                if (currentFetchId === fetchIdRef.current) {
                    setDetailedReport([]);
                }
            }
        } catch (error) {
            if (currentFetchId === fetchIdRef.current) {
                console.error("Error fetching report", error);
            }
        } finally {
            if (currentFetchId === fetchIdRef.current) {
                setLoading(false);
            }
        }
    };

    // ---- Handlers ----
    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedBoards([]);
        setSelectedProgrammes([]);
        setCourseSearch("");
        setBoardSearch("");
        setSelectedExamTag("");
        setTimePeriod("Custom Range");
        setStartDate("");
        setEndDate("");
        setSelectedPaymentMode([]);
        setSelectedTransactionType([]);
        setSelectedDepartments([]);
        setSelectedZones([]);
        setSelectedStatus([]);
        setMinAmount("");
        setMaxAmount("");
        setSearchTerm("");
        setCentreSearch("");
        setDepartmentSearch("");
        setZoneSearch("");
        setBillFilter("all");
        setSelectedBilledBy([]);
        setBilledBySearch("");
        toast.info("Filters reset");
    };

    // Derive centres filtered by selected zones for Centre dropdown
    const zoneCentreIds = selectedZones.length > 0
        ? new Set(
            zones
                .filter(z => selectedZones.includes(z._id))
                .flatMap(z => (z.centres || []).map(c => (c._id || c).toString()))
        )
        : null;

    const centresForDropdown = zoneCentreIds
        ? centres.filter(c => zoneCentreIds.has(c._id.toString()))
        : centres;

    const toggleZoneSelection = (id) => {
        setSelectedZones(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            // When zone selection changes, clear centres that are no longer in scope
            if (next.length > 0) {
                const newZoneCentreIds = new Set(
                    zones
                        .filter(z => next.includes(z._id))
                        .flatMap(z => (z.centres || []).map(c => (c._id || c).toString()))
                );
                setSelectedCentres(sc => sc.filter(cid => newZoneCentreIds.has(cid.toString())));
            }
            return next;
        });
    };

    // --- Helpers to extract Board and Programme ---
    const getItemBoard = (item) => {
        if (item.board) return item.board;
        const text = `${item.course || ""} ${item.department || ""}`;
        if (/\bWBCHSE\b/i.test(text)) return "WBCHSE";
        if (/\bWBBSE\b/i.test(text)) return "WBBSE";
        if (/\bCBSE\b/i.test(text)) return "CBSE";
        if (/\bICSE\b/i.test(text)) return "ICSE";
        if (/\bISC\b/i.test(text)) return "ISC";
        return null;
    };

    const getItemProgramme = (item) => {
        if (item.programme) return item.programme.toUpperCase();
        const text = `${item.course || ""}`;
        if (/\bNCRP\b/i.test(text)) return "NCRP";
        if (/\bCRP\b/i.test(text)) return "CRP";
        return null;
    };

    // --- Derived filtered data (client-side bill filter + billed by + course + board + programme) ---
    const uniqueBilledByOptions = [...new Set(detailedReport.map(item => item.takenBy).filter(Boolean))];
    const uniqueCourseOptions = [...new Set(detailedReport.map(item => item.course).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const uniqueBoardOptions = React.useMemo(() => {
        const fromMaster = boards.map(b => b.boardCourse || b.name).filter(Boolean);
        const fromReport = detailedReport.map(item => getItemBoard(item)).filter(Boolean);
        const combined = [...new Set([...fromMaster, ...fromReport])];
        if (combined.length === 0) return ["WBCHSE", "CBSE", "ICSE", "ISC", "WBBSE"];
        return combined.sort((a, b) => a.localeCompare(b));
    }, [boards, detailedReport]);
    const programmeOptions = ["CRP", "NCRP"];

    const toggleCourseSelection = (courseName) => {
        setSelectedCourses(prev =>
            prev.includes(courseName) ? prev.filter(c => c !== courseName) : [...prev, courseName]
        );
        setCurrentPage(1);
        setPageInput("1");
    };

    const toggleBoardSelection = (boardName) => {
        setSelectedBoards(prev =>
            prev.includes(boardName) ? prev.filter(b => b !== boardName) : [...prev, boardName]
        );
        setCurrentPage(1);
        setPageInput("1");
    };

    const toggleProgrammeSelection = (prog) => {
        setSelectedProgrammes(prev =>
            prev.includes(prog) ? prev.filter(p => p !== prog) : [...prev, prog]
        );
        setCurrentPage(1);
        setPageInput("1");
    };

    const filteredReport = detailedReport
        .filter(item => {
            if (billFilter === "no_bill") return !item.receiptNo || item.receiptNo === "-" || item.receiptNo.toString().trim() === "" || item.receiptNo === "undefined";
            if (billFilter === "with_bill") return item.receiptNo && item.receiptNo !== "-" && item.receiptNo.toString().trim() !== "" && item.receiptNo !== "undefined";
            return true;
        })
        .filter(item => selectedBilledBy.length === 0 || selectedBilledBy.includes(item.takenBy || "System"))
        .filter(item => selectedCourses.length === 0 || selectedCourses.includes(item.course))
        .filter(item => {
            if (selectedBoards.length === 0) return true;
            const b = getItemBoard(item);
            return b && selectedBoards.includes(b);
        })
        .filter(item => {
            if (selectedProgrammes.length === 0) return true;
            const p = getItemProgramme(item);
            return p && selectedProgrammes.includes(p);
        });

    const sortedReport = React.useMemo(() => {
        return sortTransactionsSequentially(filteredReport);
    }, [filteredReport]);

    // Dynamically calculate selection totals based on visually filtered active dataset (Includes all statuses)
    const hasActiveFilters =
        selectedCentres.length > 0 ||
        selectedZones.length > 0 ||
        selectedCourses.length > 0 ||
        selectedBoards.length > 0 ||
        selectedProgrammes.length > 0 ||
        selectedExamTag !== "" ||
        selectedDepartments.length > 0 ||
        selectedPaymentMode.length > 0 ||
        selectedTransactionType.length > 0 ||
        minAmount !== "" ||
        maxAmount !== "" ||
        searchTerm !== "" ||
        selectedStatus.length > 0 ||
        billFilter !== "all" ||
        selectedBilledBy.length > 0 ||
        (timePeriod !== "Custom" && timePeriod !== "Custom Range" && timePeriod !== "") ||
        ((timePeriod === "Custom" || timePeriod === "Custom Range") && startDate !== "" && endDate !== "");

    const isPhspsMidnapore = (centre) => {
        if (!centre) return false;
        const str = centre.toLowerCase();
        return str.includes('phsps') && (str.includes('midnapore') || str.includes('midnapur') || str.includes('medinipur'));
    };

    const dynamicSelectionTotalWithGst = hasActiveFilters
        ? filteredReport.reduce((sum, item) => isPhspsMidnapore(item.centre) ? sum : sum + (item.amount || 0), 0)
        : 0;
    const dynamicSelectionTotalBase = hasActiveFilters
        ? filteredReport.reduce((sum, item) => isPhspsMidnapore(item.centre) ? sum : sum + (item.revenueWithoutGst || 0), 0)
        : 0;

    // Hold selection totals while a background fetch is running to prevent intermediate flickering
    useEffect(() => {
        if (!loading) {
            setDisplaySelectionTotalWithGst(dynamicSelectionTotalWithGst);
            setDisplaySelectionTotalBase(dynamicSelectionTotalBase);
        }
    }, [loading, dynamicSelectionTotalWithGst, dynamicSelectionTotalBase]);

    const handleDownloadExcel = () => {
        if (!sortedReport.length) {
            toast.warn("No data to download");
            return;
        }

        const wb = XLSX.utils.book_new();

        const sheetTitle = billFilter === "no_bill" ? "No Bill No. Records" : billFilter === "with_bill" ? "Only Bills" : "Transaction List";
        const headers = [
            "Date", "Received Date", "Enroll No.", "Receipt No", "Student Name",
            "Student Email", "Student Mobile", "Whatsapp", "Address", "Guardian Name", "Guardian Mobile",
            "Session", "Department", "Board", "Programme", "Course Name", "Transaction Type", "Transaction ID",
            "Centre", "Payment Mode", "Revenue (Base)", "GST Amount", "Total (Inc. GST)", "Status", "Billed By"
        ];
        const data = sortedReport.map(item => [
            new Date(item.paymentDate).toLocaleDateString("en-IN"),
            item.receivedDate ? new Date(item.receivedDate).toLocaleDateString("en-IN") : "-",
            item.admissionNumber && !item.admissionNumber.toString().startsWith("PATH") ? `PATH${item.admissionNumber}` : item.admissionNumber,
            (item.receiptNo && item.receiptNo !== "-" && !item.receiptNo.toString().startsWith("PATH")) ? `PATH/${item.receiptNo}` : (item.receiptNo || "-"),
            item.studentName,
            item.studentEmail || "-",
            item.studentMobile || "-",
            item.studentWhatsapp || "-",
            item.studentAddress || "-",
            item.guardianName || "-",
            item.guardianMobile || "-",
            item.session || "-",
            item.department || "-",
            getItemBoard(item) || "-",
            getItemProgramme(item) || "-",
            item.course,
            item.installmentNumber === 0 ? "Initial" : "EMI",
            item.transactionId || "-",
            item.centre,
            item.method,
            item.revenueWithoutGst !== undefined && item.revenueWithoutGst !== null ? Number(Number(item.revenueWithoutGst).toFixed(2)) : null,
            item.gstAmount !== undefined && item.gstAmount !== null ? Number(Number(item.gstAmount).toFixed(2)) : null,
            item.amount !== undefined && item.amount !== null ? Number(Number(item.amount).toFixed(2)) : null,
            item.status,
            item.takenBy || "System",
            // item.totalClasses,
            // item.presentCount,
            // item.absentCount,
            // item.attendancePercent ? `${item.attendancePercent.toFixed(1)}%` : "0%",
            // item.attendanceStatus
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        const fileName = billFilter === "no_bill"
            ? `No_Bill_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`
            : billFilter === "with_bill"
                ? `Only_Bills_${new Date().toISOString().slice(0, 10)}.xlsx`
                : `Transaction_List_${new Date().toISOString().slice(0, 10)}.xlsx`;
        saveAs(blob, fileName);
    };

    const toggleCentreSelection = (id) => {
        setSelectedCentres(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const togglePaymentModeSelection = (id) => {
        setSelectedPaymentMode(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleTransactionTypeSelection = (id) => {
        setSelectedTransactionType(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDepartmentSelection = (id) => {
        setSelectedDepartments(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleStatusSelection = (id) => {
        setSelectedStatus(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Pagination Logic (uses sortedReport so sequential bill sorting affects pagination too)
    const totalPages = Math.ceil(sortedReport.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = sortedReport.slice(startIndex, endIndex);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            setPageInput(newPage.toString());
        }
    };

    const handlePageInputChange = (e) => {
        setPageInput(e.target.value);
    };

    const handlePageInputSubmit = (e) => {
        e.preventDefault();
        const pageNum = parseInt(pageInput);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
        } else {
            setPageInput(currentPage.toString());
            toast.error(`Please enter a page number between 1 and ${totalPages}`);
        }
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
        setPageInput("1");
    };

    // Calculate Stats
    // Revenue logic can be expanded if needed (Current Year, Month, etc.)
    // For now, let's show "Current Selection Revenue" like in the screenshot concept or simply Total Revenue

    return (
        <Layout activePage="Finance & Fees">
            <div className="space-y-6 animate-fade-in pb-10">

                {/* Stats Cards Row (Optional - based on user preference for "Transaction List" page) */}
                {/* The user screenshot shows stats cards at the top */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className={`${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-sm border flex items-center justify-between col-span-1 md:col-span-1`}>
                        <div className="text-right flex-1">
                            <div className={`flex flex-col border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 mb-2`}>
                                <span className={`text-[10px] font-black ${isDark ? 'text-cyan-400' : 'text-blue-600'} uppercase tracking-tighter`}>Selection Total (With GST)</span>
                                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-none`}>Rs.{displaySelectionTotalWithGst ? displaySelectionTotalWithGst.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${isDark ? 'text-gray-400' : 'text-slate-500'} uppercase tracking-tighter`}>Selection Revenue (Base)</span>
                                <h3 className={`text-xl font-black ${isDark ? 'text-gray-300' : 'text-slate-700'} leading-none`}>Rs.{displaySelectionTotalBase ? Math.round(displaySelectionTotalBase).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className={`text-[9px] ${isDark ? 'text-cyan-500 bg-cyan-500/10' : 'text-blue-600 bg-blue-50'} uppercase font-black tracking-[0.2em] mt-3 px-2 py-0.5 rounded-full inline-block`}>MATCHED TOTAL</p>
                        </div>
                    </div>

                    {/* <div className={`${cardBg} p-6 rounded-xl shadow-sm ${cardBorder} flex items-center justify-between`}>
                        <div>
                            <div className={`${iconBoxGreen} p-3 rounded-lg`}>
                                <FaChartBar size={24} />
                            </div>
                        </div>
                        <div className="text-right flex-1">
                            <div className={`flex flex-col border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 mb-2`}>
                                <span className={`text-[10px] font-black ${subText} uppercase tracking-tighter`}>Total (With GST)</span>
                                <h3 className={`text-lg font-black ${cardText} leading-none`}>Rs.{stats.currentYear ? stats.currentYear.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${isDark ? 'text-green-400' : 'text-green-400'} uppercase tracking-tighter`}>Revenue (Base)</span>
                                <h3 className={`text-lg font-black ${isDark ? 'text-green-400' : 'text-green-600'} leading-none`}>Rs.{stats.currentYearRevenue ? Math.round(stats.currentYearRevenue).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className={`text-[9px] ${subText} uppercase font-black tracking-[0.2em] mt-3 ${pillBg} px-2 py-0.5 rounded-full inline-block`}>{stats.currentYearLabel} FISCAL</p>
                        </div>
                    </div>

                    <div className={`${cardBg} p-6 rounded-xl shadow-sm ${cardBorder} flex items-center justify-between`}>
                        <div>
                            <div className={`${iconBoxPurple} p-3 rounded-lg`}>
                                <FaChartBar size={24} />
                            </div>
                        </div>
                        <div className="text-right flex-1">
                            <div className={`flex flex-col border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 mb-2`}>
                                <span className={`text-[10px] font-black ${subText} uppercase tracking-tighter`}>Total (With GST)</span>
                                <h3 className={`text-lg font-black ${cardText} leading-none`}>Rs.{stats.previousMonth ? stats.previousMonth.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${isDark ? 'text-purple-400' : 'text-purple-400'} uppercase tracking-tighter`}>Revenue (Base)</span>
                                <h3 className={`text-lg font-black ${isDark ? 'text-purple-400' : 'text-purple-600'} leading-none`}>Rs.{stats.previousMonthRevenue ? Math.round(stats.previousMonthRevenue).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className={`text-[9px] ${subText} uppercase font-black tracking-[0.2em] mt-3 ${pillBg} px-2 py-0.5 rounded-full inline-block`}>{stats.previousMonthLabel}</p>
                        </div>
                    </div> */}

                    <div className={`${cardBg} p-6 rounded-xl shadow-sm ${cardBorder} flex items-center justify-between`}>
                        <div>
                            <div className={`${iconBoxOrange} p-3 rounded-lg`}>
                                <FaChartBar size={24} />
                            </div>
                        </div>
                        <div className="text-right flex-1">
                            <div className={`flex flex-col border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 mb-2`}>
                                <span className={`text-[10px] font-black ${subText} uppercase tracking-tighter`}>Total (With GST)</span>
                                <h3 className={`text-lg font-black ${cardText} leading-none`}>Rs.{stats.currentMonth ? stats.currentMonth.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${isDark ? 'text-blue-400' : 'text-blue-400'} uppercase tracking-tighter`}>Revenue (Base)</span>
                                <h3 className={`text-lg font-black ${isDark ? 'text-blue-400' : 'text-blue-600'} leading-none`}>Rs.{stats.currentMonthRevenue ? Math.round(stats.currentMonthRevenue).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className={`text-[9px] ${subText} uppercase font-black tracking-[0.2em] mt-3 ${pillBg} px-2 py-0.5 rounded-full inline-block`}>{stats.currentMonthLabel}</p>
                        </div>
                    </div>

                    <div className={`${cardBg} p-6 rounded-xl shadow-sm ${cardBorder} flex items-center justify-between`}>
                        <div>
                            <div className={`${iconBoxGreen} p-3 rounded-lg`}>
                                <FaChartBar size={24} />
                            </div>
                        </div>
                        <div className="text-right flex-1">
                            <div className={`flex flex-col border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} pb-2 mb-2`}>
                                <span className={`text-[10px] font-black ${subText} uppercase tracking-tighter`}>Total (With GST)</span>
                                <h3 className={`text-lg font-black ${cardText} leading-none`}>Rs.{stats.todayCollection ? stats.todayCollection.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${isDark ? 'text-green-400' : 'text-green-400'} uppercase tracking-tighter`}>Revenue (Base)</span>
                                <h3 className={`text-lg font-black ${isDark ? 'text-green-400' : 'text-green-600'} leading-none`}>Rs.{stats.todayRevenue ? Math.round(stats.todayRevenue).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className={`text-[9px] text-green-500 bg-green-500/10 uppercase font-black tracking-[0.2em] mt-3 px-2 py-0.5 rounded-full inline-block`}>Daily Collections</p>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className={`${cardBg} p-4 rounded-xl shadow-sm ${cardBorder} flex flex-wrap items-center gap-4`}>

                    {/* Zone Filter (MultiSelect) */}
                    <div className="relative" ref={zoneDropdownRef}>
                        <div
                            onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                            className={`min-w-[180px] h-10 px-3 py-2 ${selectedZones.length > 0 ? (isDark ? 'bg-indigo-900/40 border border-indigo-500/60 text-indigo-300' : 'bg-indigo-50 border border-indigo-300 text-indigo-700') : btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate font-semibold">
                                {selectedZones.length === 0 ? "-Select Zone-" : `${selectedZones.length} Zone${selectedZones.length > 1 ? 's' : ''} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isZoneDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isZoneDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-64 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10`}>
                                    <div className="relative">
                                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search Zone..."
                                            value={zoneSearch}
                                            onChange={(e) => setZoneSearch(e.target.value)}
                                            className={`w-full pl-8 pr-2 py-1.5 text-xs rounded focus:border-indigo-500 outline-none font-bold uppercase ${inputBg}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    {selectedZones.length > 0 && (
                                        <div className="flex items-center justify-between mt-1.5 px-1">
                                            <span className={`text-[9px] font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest`}>{selectedZones.length} selected</span>
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedZones([]); setSelectedCentres([]); }} className={`text-[9px] font-black ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'} uppercase tracking-widest`}>Clear</button>
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {zones.length === 0 && (
                                        <div className={`p-4 text-center text-[10px] ${subText} font-black uppercase`}>No zones found</div>
                                    )}
                                    {zones
                                        .filter(z => (z.name || "").toLowerCase().includes(zoneSearch.toLowerCase()))
                                        .map(z => (
                                            <div
                                                key={z._id}
                                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                                onClick={() => toggleZoneSelection(z._id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedZones.includes(z._id)}
                                                    readOnly
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`}>{z.name}</span>
                                                    <span className={`text-[9px] ${subText} truncate`}>{(z.centres || []).length} centres</span>
                                                </div>
                                            </div>
                                        ))}
                                    {zones.filter(z => (z.name || "").toLowerCase().includes(zoneSearch.toLowerCase())).length === 0 && zones.length > 0 && (
                                        <div className={`p-4 text-center text-[10px] ${subText} font-black uppercase`}>No zones matched</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Centre Filter (filtered by zone if zones selected) */}
                    <div className="relative" ref={centreDropdownRef}>
                        <div
                            onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                            className={`min-w-[200px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedCentres.length === 0
                                    ? (selectedZones.length > 0 ? `-Centres in ${selectedZones.length} Zone${selectedZones.length > 1 ? 's' : ''}-` : "-Select Center-")
                                    : `${selectedCentres.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isCentreDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-64 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10`}>
                                    {selectedZones.length > 0 && (
                                        <div className={`text-[9px] font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest px-1 mb-1.5`}>
                                            Showing {centresForDropdown.length} centres from selected zone{selectedZones.length > 1 ? 's' : ''}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search Centre..."
                                            value={centreSearch}
                                            onChange={(e) => setCentreSearch(e.target.value)}
                                            className={`w-full pl-8 pr-2 py-1.5 text-xs rounded focus:border-blue-500 outline-none font-bold uppercase ${inputBg}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {centresForDropdown
                                        .filter(c => c.centreName.toLowerCase().includes(centreSearch.toLowerCase()))
                                        .map(c => (
                                            <div
                                                key={c._id}
                                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                                onClick={() => toggleCentreSelection(c._id)}
                                            >
                                                <input type="checkbox" checked={selectedCentres.includes(c._id)} readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                                                <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`}>{c.centreName}</span>
                                            </div>
                                        ))}
                                    {centresForDropdown.filter(c => c.centreName.toLowerCase().includes(centreSearch.toLowerCase())).length === 0 && (
                                        <div className={`p-4 text-center text-[10px] ${subText} font-black uppercase`}>No centres matched</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Mode */}
                    {/* Payment Mode */}
                    <div className="relative" ref={paymentDropdownRef}>
                        <div
                            onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                            className={`min-w-[200px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedPaymentMode.length === 0 ? "-Select Payment Mode-" : `${selectedPaymentMode.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isPaymentDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isPaymentDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-60 z-50 ${dropdownBg} rounded-lg shadow-xl max-h-60 overflow-y-auto`}>
                                {["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"].map(mode => (
                                    <div
                                        key={mode}
                                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${dropdownRow}`}
                                        onClick={() => togglePaymentModeSelection(mode)}
                                    >
                                        <input type="checkbox" checked={selectedPaymentMode.includes(mode)} readOnly className="rounded" />
                                        <span className={`text-sm ${dropdownTxt} truncate`}>{mode}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transaction Type (MultiSelect) */}
                    <div className="relative" ref={typeDropdownRef}>
                        <div
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                            className={`min-w-[200px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedTransactionType.length === 0 ? "-Select Type-" : `${selectedTransactionType.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isTypeDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-60 z-50 ${dropdownBg} rounded-lg shadow-xl max-h-60 overflow-y-auto`}>
                                {["Initial", "EMI"].map(type => (
                                    <div
                                        key={type}
                                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${dropdownRow}`}
                                        onClick={() => toggleTransactionTypeSelection(type)}
                                    >
                                        <input type="checkbox" checked={selectedTransactionType.includes(type)} readOnly className="rounded" />
                                        <span className={`text-sm ${dropdownTxt} truncate`}>{type}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Department (MultiSelect) */}
                    <div className="relative" ref={departmentDropdownRef}>
                        <div
                            onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                            className={`min-w-[200px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedDepartments.length === 0 ? "-Select Department-" : `${selectedDepartments.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isDepartmentDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-64 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10`}>
                                    <div className="relative">
                                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search Department..."
                                            value={departmentSearch}
                                            onChange={(e) => setDepartmentSearch(e.target.value)}
                                            className={`w-full pl-8 pr-2 py-1.5 text-xs rounded focus:border-blue-500 outline-none font-bold uppercase ${inputBg}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {departments
                                        .filter(d => d.departmentName.toLowerCase().includes(departmentSearch.toLowerCase()))
                                        .map(d => (
                                            <div
                                                key={d._id}
                                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                                onClick={() => toggleDepartmentSelection(d._id)}
                                            >
                                                <input type="checkbox" checked={selectedDepartments.includes(d._id)} readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                                                <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`}>{d.departmentName}</span>
                                            </div>
                                        ))}
                                    {departments.filter(d => d.departmentName.toLowerCase().includes(departmentSearch.toLowerCase())).length === 0 && (
                                        <div className={`p-4 text-center text-[10px] ${subText} font-black uppercase`}>No departments matched</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Board (MultiSelect) */}
                    <div className="relative" ref={boardDropdownRef}>
                        <div
                            onClick={() => setIsBoardDropdownOpen(!isBoardDropdownOpen)}
                            className={`min-w-[180px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedBoards.length === 0 ? "-Select Board-" : `${selectedBoards.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isBoardDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isBoardDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-64 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10 flex flex-col gap-2`}>
                                    <div className="relative">
                                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search Board..."
                                            value={boardSearch}
                                            onChange={(e) => setBoardSearch(e.target.value)}
                                            className={`w-full pl-8 pr-2 py-1.5 text-xs rounded focus:border-blue-500 outline-none font-bold uppercase ${inputBg}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    {uniqueBoardOptions.length > 0 && (
                                        <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-wider">
                                            <button
                                                type="button"
                                                className="text-blue-500 hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedBoards(uniqueBoardOptions);
                                                    setCurrentPage(1);
                                                    setPageInput("1");
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                className="text-gray-400 hover:text-red-400"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedBoards([]);
                                                    setCurrentPage(1);
                                                    setPageInput("1");
                                                }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {uniqueBoardOptions
                                        .filter(b => b.toLowerCase().includes(boardSearch.toLowerCase()))
                                        .map(boardName => (
                                            <div
                                                key={boardName}
                                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                                onClick={() => toggleBoardSelection(boardName)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBoards.includes(boardName)}
                                                    readOnly
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                                                />
                                                <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`}>
                                                    {boardName}
                                                </span>
                                            </div>
                                        ))}
                                    {uniqueBoardOptions.filter(b => b.toLowerCase().includes(boardSearch.toLowerCase())).length === 0 && (
                                        <div className={`p-4 text-center text-[10px] ${subText} font-black uppercase`}>No boards matched</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Course Name (MultiSelect) */}
                    <div className="relative" ref={courseDropdownRef}>
                        <div
                            onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                            className={`min-w-[200px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedCourses.length === 0 ? "-Select Course-" : `${selectedCourses.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isCourseDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-72 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10 flex flex-col gap-2`}>
                                    <div className="relative">
                                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search Course..."
                                            value={courseSearch}
                                            onChange={(e) => setCourseSearch(e.target.value)}
                                            className={`w-full pl-8 pr-2 py-1.5 text-xs rounded focus:border-blue-500 outline-none font-bold uppercase ${inputBg}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    {uniqueCourseOptions.length > 0 && (
                                        <div className="flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-wider">
                                            <button
                                                type="button"
                                                className="text-blue-500 hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCourses(uniqueCourseOptions);
                                                    setCurrentPage(1);
                                                    setPageInput("1");
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                className="text-gray-400 hover:text-red-400"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCourses([]);
                                                    setCurrentPage(1);
                                                    setPageInput("1");
                                                }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {uniqueCourseOptions
                                        .filter(course => course.toLowerCase().includes(courseSearch.toLowerCase()))
                                        .map(courseName => (
                                            <div
                                                key={courseName}
                                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                                onClick={() => toggleCourseSelection(courseName)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCourses.includes(courseName)}
                                                    readOnly
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                                                />
                                                <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`} title={courseName}>
                                                    {courseName}
                                                </span>
                                            </div>
                                        ))}
                                    {uniqueCourseOptions.filter(course => course.toLowerCase().includes(courseSearch.toLowerCase())).length === 0 && (
                                        <div className={`p-4 text-center text-[10px] ${subText} font-black uppercase`}>
                                            {uniqueCourseOptions.length === 0 ? "No courses on page" : "No courses matched"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Programme (MultiSelect) */}
                    <div className="relative" ref={programmeDropdownRef}>
                        <div
                            onClick={() => setIsProgrammeDropdownOpen(!isProgrammeDropdownOpen)}
                            className={`min-w-[170px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedProgrammes.length === 0 ? "-Select Programme-" : `${selectedProgrammes.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isProgrammeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isProgrammeDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-56 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10 flex items-center justify-between`}>
                                    <span className={`text-[10px] font-black ${subText} uppercase tracking-widest px-1`}>Programme</span>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                                        <button
                                            type="button"
                                            className="text-blue-500 hover:underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProgrammes(programmeOptions);
                                                setCurrentPage(1);
                                                setPageInput("1");
                                            }}
                                        >
                                            All
                                        </button>
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-red-400"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProgrammes([]);
                                                setCurrentPage(1);
                                                setPageInput("1");
                                            }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {programmeOptions.map(prog => (
                                        <div
                                            key={prog}
                                            className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                            onClick={() => toggleProgrammeSelection(prog)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedProgrammes.includes(prog)}
                                                readOnly
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                                            />
                                            <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`}>
                                                {prog}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status (MultiSelect) */}
                    <div className="relative" ref={statusDropdownRef}>
                        <div
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            className={`min-w-[180px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedStatus.length === 0 ? "-Select Status-" : `${selectedStatus.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isStatusDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-60 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10`}>
                                    <span className={`text-[10px] font-black ${subText} uppercase tracking-widest px-2`}>Filter By Status</span>
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {["PAID", "PARTIAL", "PENDING_CLEARANCE", "REJECTED", "CANCELLED", "PENDING", "OVERDUE"].map(status => (
                                        <div
                                            key={status}
                                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                            onClick={() => toggleStatusSelection(status)}
                                        >
                                            <input type="checkbox" checked={selectedStatus.includes(status)} readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                                            <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`}>{status.replace('_', ' ')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Billed By (MultiSelect) */}
                    <div className="relative" ref={billedByDropdownRef}>
                        <div
                            onClick={() => setIsBilledByDropdownOpen(!isBilledByDropdownOpen)}
                            className={`min-w-[180px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedBilledBy.length === 0 ? "-Billed By-" : `${selectedBilledBy.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isBilledByDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isBilledByDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-64 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10`}>
                                    <div className="relative">
                                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                                        <input
                                            type="text"
                                            placeholder="Search Billed By..."
                                            value={billedBySearch}
                                            onChange={(e) => setBilledBySearch(e.target.value)}
                                            className={`w-full pl-8 pr-2 py-1.5 text-xs rounded focus:border-blue-500 outline-none font-bold uppercase ${inputBg}`}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-60 custom-scrollbar">
                                    {uniqueBilledByOptions
                                        .filter(name => name.toLowerCase().includes(billedBySearch.toLowerCase()))
                                        .map(name => (
                                            <div
                                                key={name}
                                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${dropdownRow}`}
                                                onClick={() => setSelectedBilledBy(prev =>
                                                    prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
                                                )}
                                            >
                                                <input type="checkbox" checked={selectedBilledBy.includes(name)} readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                                                <span className={`text-xs ${dropdownTxt} truncate font-bold uppercase`}>{name}</span>
                                            </div>
                                        ))}
                                    {uniqueBilledByOptions.filter(n => n.toLowerCase().includes(billedBySearch.toLowerCase())).length === 0 && (
                                        <div className={`p-4 text-center text-[10px] ${subText} font-black uppercase`}>No results found</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bill Filter Segmented Control
                    <div className={`flex items-center rounded-lg ${segmentBorder} overflow-hidden text-xs font-black uppercase tracking-widest`}>
                        {[
                            { key: "all", label: "All", color: "bg-gray-700 text-white", hover: "hover:bg-gray-600" },
                            { key: "no_bill", label: "No Bill No.", color: "bg-red-500 text-white", hover: "hover:bg-red-400" },
                            { key: "with_bill", label: "Only Bills", color: "bg-green-500 text-white", hover: "hover:bg-green-400" }
                        ].map(({ key, label, color, hover }, i) => (
                            <button
                                key={key}
                                onClick={() => { setBillFilter(key); setCurrentPage(1); setPageInput("1"); }}
                                className={`px-4 py-2 transition-all duration-150 ${billFilter === key
                                    ? color
                                    : `${segmentOff} ${hover}`
                                    } ${i > 0 ? (isDark ? 'border-l border-gray-700' : 'border-l border-gray-300') : ""}`}
                            >
                                {label}
                                {billFilter === key && billFilter !== "all" && (
                                    <span className="ml-1.5 bg-white/30 px-1 py-0.5 rounded-full text-[9px]">
                                        {filteredReport.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div> */}

                    <button
                        onClick={handleDownloadExcel}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm flex items-center gap-2 uppercase text-sm tracking-wide ml-auto"
                    >
                        Export
                    </button>

                </div>

                {/* Date & Amount Filter Row */}
                <div className={`${cardBg} p-2 rounded-xl shadow-sm ${cardBorder}`}>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-2 ${innerBox} p-2 rounded-lg flex-1 min-w-[300px]`}>
                            <span className={`text-[10px] font-black ${subText} uppercase tracking-widest px-2`}>Paid Date:</span>
                            <select
                                value={timePeriod}
                                onChange={(e) => {
                                    setTimePeriod(e.target.value);
                                    if (e.target.value !== "Custom" && e.target.value !== "Custom Range") {
                                        setStartDate("");
                                        setEndDate("");
                                    }
                                }}
                                className={`outline-none text-sm bg-transparent ${isDark ? 'text-gray-300 bg-[#131619]' : 'text-gray-700 bg-white'} font-semibold border-none cursor-pointer`}
                            >
                                <option value="Today" className={isDark ? 'bg-[#131619] text-gray-300' : 'bg-white text-gray-700'}>Today</option>
                                <option value="Yesterday" className={isDark ? 'bg-[#131619] text-gray-300' : 'bg-white text-gray-700'}>Yesterday</option>
                                <option value="Last 7 Days" className={isDark ? 'bg-[#131619] text-gray-300' : 'bg-white text-gray-700'}>Last 7 Days</option>
                                <option value="This Month" className={isDark ? 'bg-[#131619] text-gray-300' : 'bg-white text-gray-700'}>This Month</option>
                                <option value="Last Month" className={isDark ? 'bg-[#131619] text-gray-300' : 'bg-white text-gray-700'}>Last Month</option>
                                <option value="Custom Range" className={isDark ? 'bg-[#131619] text-gray-300' : 'bg-white text-gray-700'}>Custom Range</option>
                            </select>

                            {(timePeriod === "Custom" || timePeriod === "Custom Range") && (
                                <>
                                    <span className="text-gray-400">|</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`outline-none text-sm w-full bg-transparent ${isDark ? 'text-gray-300' : 'text-gray-700'} `}
                                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                                    />
                                    <span className="text-gray-400 font-bold">-to-</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`outline-none text-sm w-full bg-transparent ${isDark ? 'text-gray-300' : 'text-gray-700'} `}
                                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                                    />
                                </>
                            )}
                        </div>

                        <div className={`flex items-center gap-2 ${innerBox} p-2 rounded-lg flex-1 min-w-[300px]`}>
                            <span className={`text-[10px] font-black ${subText} uppercase tracking-widest px-2`}>Amount:</span>
                            <input
                                type="number"
                                placeholder="Min"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                className={`w-full bg-transparent border-none text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} outline-none font-bold`}
                            />
                            <span className="text-gray-300">|</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                className={`w-full bg-transparent border-none text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} outline-none font-bold`}
                            />
                        </div>

                        <button onClick={handleResetFilters} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-widest whitespace-nowrap ml-auto px-4">
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Search Row */}
                <div className={`${cardBg} p-4 rounded-xl shadow-sm ${cardBorder}`}>
                    <div className="relative group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH BY STUDENT NAME, ENROLLMENT NO, EMAIL, OR RECEIPT NO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full ${innerBox} rounded-lg py-3 pl-12 pr-4 ${tTxt} font-bold text-xs uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all shadow-inner`}
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className={`${cardBg} rounded-xl shadow-sm ${cardBorder} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${tHeadBg} ${tHeadBorder}`}>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>#</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[130px]`}>
                                        MR Date
                                    </th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[120px]`}>Received Date</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[150px]`}>Enroll No.</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[180px]`}>
                                        Receipt No
                                    </th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[180px]`}>Student Name</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[150px]`}>Centre</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[120px]`}>Mobile</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>Session</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>Department</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>Course Name</th>
                                    {/* <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[100px]`}>Attendance</th> */}
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[120px]`}>Transaction Type</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>Transaction ID</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>Payment Mode</th>
                                    <th className={`p-4 text-xs font-black text-orange-500 uppercase tracking-wider`}>Revenue (Base)</th>
                                    <th className={`p-4 text-xs font-black text-purple-500 uppercase tracking-wider`}>GST (18%)</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>Total (Inc. GST)</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider`}>Status</th>
                                    <th className={`p-4 text-xs font-black text-blue-500 uppercase tracking-wider`}>Billed By</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="18" className={`p-8 text-center ${tTxtSub} font-bold uppercase tracking-widest text-[10px]`}>Loading transactions...</td>
                                    </tr>
                                ) : sortedReport.length === 0 ? (
                                    <tr>
                                        <td colSpan="18" className={`p-8 text-center ${tTxtSub} font-bold uppercase tracking-widest text-[10px]`}>
                                            {billFilter === "no_bill" ? "No records without a bill number found" : billFilter === "with_bill" ? "No records with a bill number found" : "No transactions found"}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((item, index) => (
                                        <tr key={item.transactionId || index} className={`${tRowHover} transition-colors ${tRowBg}`}>
                                            <td className={`p-4 text-sm font-bold ${tTxt}`}>{startIndex + index + 1}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-medium`}>
                                                {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-GB') : '-'}
                                            </td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-medium`}>
                                                {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('en-GB') : '-'}
                                            </td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-mono whitespace-nowrap min-w-[150px]`}>
                                                {item.admissionNumber && !item.admissionNumber.toString().startsWith("PATH") ? `PATH${item.admissionNumber}` : item.admissionNumber}
                                            </td>
                                            <td className={`p-4 text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} font-mono font-bold whitespace-nowrap min-w-[240px] uppercase`}>
                                                {(item.receiptNo && item.receiptNo !== "-") ? (
                                                    <span
                                                        className="inline-block transition-all duration-150 hover:text-blue-500 hover:scale-[1.02] hover:brightness-125 select-text cursor-default"
                                                        title={`Bill No: ${!item.receiptNo.toString().startsWith("PATH") ? `PATH/${item.receiptNo}` : item.receiptNo}`}
                                                    >
                                                        {!item.receiptNo.toString().startsWith("PATH") ? `PATH/${item.receiptNo}` : item.receiptNo}
                                                    </span>
                                                ) : (
                                                    item.receiptNo || "-"
                                                )}
                                            </td>
                                            <td className={`p-4 text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'} uppercase whitespace-nowrap min-w-[180px]`}>{item.studentName}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-bold whitespace-nowrap`}>{item.centre}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-medium whitespace-nowrap`}>{item.studentMobile || '-'}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-bold`}>{item.session || "-"}</td>
                                            <td className={`p-4 text-sm ${isDark ? 'text-orange-400' : 'text-orange-500'} font-bold uppercase`}>{item.department || "-"}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} max-w-xs`} title={item.course}>
                                                <div className="truncate font-semibold">{item.course}</div>
                                                {(getItemBoard(item) || getItemProgramme(item)) && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {getItemBoard(item) && (
                                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-900/40 text-purple-300 border border-purple-800' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                                                                {getItemBoard(item)}
                                                            </span>
                                                        )}
                                                        {getItemProgramme(item) && (
                                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${getItemProgramme(item) === 'CRP' ? (isDark ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' : 'bg-cyan-50 text-cyan-700 border border-cyan-200') : (isDark ? 'bg-amber-900/40 text-amber-300 border border-amber-800' : 'bg-amber-50 text-amber-700 border border-amber-200')}`}>
                                                                {getItemProgramme(item)}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            {/* <td className="p-4 text-sm">
                                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-black text-center ${item.attendanceStatus === 'Available' ? (isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600')}`}>
                                                    {item.attendanceStatus === 'Available' ? `${item.attendancePercent.toFixed(1)}%` : 'N/A'}
                                                </div>
                                            </td> */}
                                            <td className={`p-4 text-sm ${tTxtSub}`}>
                                                {item.installmentNumber === 0 ? "Initial" : "EMI"}
                                            </td>
                                            <td className={`p-4 text-sm text-red-500 ${tTxtSub} font-mono text-xs`}>
                                                {item.method === "CASH" ? "CASH" : (item.transactionId || "-")}
                                            </td>
                                            <td className={`p-4 text-sm ${tTxtSub}`}>{item.method}</td>
                                            <td className={`p-4 text-sm font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>₹{item.revenueWithoutGst ? item.revenueWithoutGst.toLocaleString() : "-"}</td>
                                            <td className={`p-4 text-sm font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'} text-xs`}>₹{item.gstAmount ? item.gstAmount.toLocaleString() : "-"}</td>
                                            <td className={`p-4 text-sm font-black ${isDark ? 'text-green-400 border-l border-gray-700' : 'text-green-600 border-l border-gray-100'}`}>₹{item.amount.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${item.status === 'PAID' ? (isDark ? 'bg-green-900/30 text-green-400 shadow-sm shadow-green-900/20' : 'bg-green-100 text-green-600 shadow-sm shadow-green-200') :
                                                    item.status === 'PENDING' || item.status === 'PENDING_CLEARANCE' ? (isDark ? 'bg-yellow-900/30 text-yellow-400 shadow-sm shadow-yellow-900/20' : 'bg-yellow-100 text-yellow-600 shadow-sm shadow-yellow-200') :
                                                        item.status === 'REJECTED' ? (isDark ? 'bg-red-900/30 text-red-400 shadow-sm shadow-red-900/20' : 'bg-red-100 text-red-600 shadow-sm shadow-red-200') :
                                                            (isDark ? 'bg-gray-800 text-gray-400 shadow-sm' : 'bg-gray-100 text-gray-600 shadow-sm')
                                                    }`}>
                                                    {item.status || "PAID"}
                                                </span>
                                            </td>
                                            <td className={`p-4 text-[10px] font-black ${isDark ? 'text-blue-400' : 'text-blue-600'} uppercase italic tracking-tighter whitespace-nowrap`}>
                                                {item.takenBy || "System"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredReport.length > 0 && (
                        <div className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 ${paginBg}`}>
                            {/* Left: Items per page */}
                            <div className="flex items-center gap-2">
                                <span className={`text-sm ${subText} font-medium`}>Show</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={handleItemsPerPageChange}
                                    className={`rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className={`text-sm ${subText} font-medium`}>entries</span>
                            </div>

                            {/* Center: Page info and navigation */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${btnBg}`}
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    <span className={`text-sm ${subText}`}>Page</span>
                                    <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={pageInput}
                                            onChange={handlePageInputChange}
                                            className={`w-16 px-2 py-1 rounded-md text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                                        />
                                        <span className={`text-sm ${subText}`}>of {totalPages}</span>
                                    </form>
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${btnBg}`}
                                >
                                    Next
                                </button>
                            </div>

                            {/* Right: Showing info */}
                            <div className={`text-sm ${subText}`}>
                                Showing <span className={`font-semibold ${cardText}`}>{startIndex + 1}</span> to{" "}
                                <span className={`font-semibold ${cardText}`}>{Math.min(endIndex, filteredReport.length)}</span> of{" "}
                                <span className={`font-semibold ${cardText}`}>{filteredReport.length}</span> entries
                                {billFilter !== "all" && detailedReport.length !== filteredReport.length && (
                                    <span className="ml-2 text-gray-400 font-bold text-xs">({detailedReport.length} total)</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default TransactionList;
