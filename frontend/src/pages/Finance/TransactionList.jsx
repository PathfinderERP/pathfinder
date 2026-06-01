import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser, FaChartBar, FaTable, FaTh, FaArrowUp, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";

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

    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedExamTag, setSelectedExamTag] = useState("");
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [timePeriod, setTimePeriod] = useState("This Month");

    // New Filters specific to list
    const [selectedPaymentMode, setSelectedPaymentMode] = useState([]);
    const [selectedTransactionType, setSelectedTransactionType] = useState([]);
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [centreSearch, setCentreSearch] = useState("");
    const [departmentSearch, setDepartmentSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState([]);
    const [billFilter, setBillFilter] = useState("all"); // "all" | "no_bill" | "with_bill"
    const [selectedBilledBy, setSelectedBilledBy] = useState([]);
    const [isBilledByDropdownOpen, setIsBilledByDropdownOpen] = useState(false);
    const [billedBySearch, setBilledBySearch] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pageInput, setPageInput] = useState("1");

    // Dropdown Refs
    const centreDropdownRef = useRef(null);
    const paymentDropdownRef = useRef(null);
    const typeDropdownRef = useRef(null);
    const departmentDropdownRef = useRef(null);
    const statusDropdownRef = useRef(null);
    const billedByDropdownRef = useRef(null);

    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    // ---- Effects ----
    useEffect(() => {
        fetchMasterData();
        const handleClickOutside = (event) => {
            if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {
                setIsPaymentDropdownOpen(false);
            }
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
            if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
                setIsDepartmentDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setIsStatusDropdownOpen(false);
            }
            if (billedByDropdownRef.current && !billedByDropdownRef.current.contains(event.target)) {
                setIsBilledByDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (timePeriod === "Custom" && (!startDate || !endDate)) {
            return;
        }

        const debounce = setTimeout(() => {
            setCurrentPage(1);
            setPageInput("1");
            fetchReportData();
        }, 500);

        return () => clearTimeout(debounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCentres, selectedCourses, selectedExamTag, timePeriod, startDate, endDate, selectedPaymentMode, selectedTransactionType, minAmount, maxAmount, selectedDepartments, searchTerm, selectedStatus]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, dRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
            ]);

            if (cRes.ok) {
                const data = await cRes.json();
                const filteredCentres = Array.isArray(data)
                    ? data.filter(c =>
                        user.role === 'superAdmin' ||
                        (user.centres && user.centres.some(uc => uc._id === c._id || uc.centreName === c.centreName))
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
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
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

            if (timePeriod === "Custom") {
                if (!startDate || !endDate) return;
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else if (timePeriod === "This Financial Year") {
                start = new Date(fyStartYear, 3, 1);
                end = now;
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            } else if (timePeriod === "Last Financial Year") {
                start = new Date(fyStartYear - 1, 3, 1);
                end = new Date(fyStartYear, 2, 31);
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            } else if (timePeriod === "This Month") {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            } else if (timePeriod === "Last Month") {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            }

            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
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
                setDetailedReport(result.detailedReport || []);
                if (result.stats) {
                    setStats(result.stats);
                }
            } else {
                setDetailedReport([]);
            }
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    // ---- Handlers ----
    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedExamTag("");
        setTimePeriod("All Time");
        setStartDate("");
        setEndDate("");
        setSelectedPaymentMode([]);
        setSelectedTransactionType([]);
        setSelectedDepartments([]);
        setSelectedStatus([]);
        setMinAmount("");
        setMaxAmount("");
        setSearchTerm("");
        setCentreSearch("");
        setDepartmentSearch("");
        setBillFilter("all");
        setSelectedBilledBy([]);
        setBilledBySearch("");
        toast.info("Filters reset");
    };

    // --- Derived filtered data (client-side bill filter + billed by filter) ---
    const uniqueBilledByOptions = [...new Set(detailedReport.map(item => item.takenBy).filter(Boolean))];

    const filteredReport = detailedReport
        .filter(item => {
            if (billFilter === "no_bill") return !item.receiptNo || item.receiptNo === "-" || item.receiptNo.toString().trim() === "" || item.receiptNo === "undefined" || !item.receiptNo.toString().toUpperCase().includes("PATH");
            if (billFilter === "with_bill") return item.receiptNo && item.receiptNo !== "-" && item.receiptNo.toString().trim() !== "" && item.receiptNo !== "undefined" && item.receiptNo.toString().toUpperCase().includes("PATH");
            return item.receiptNo && item.receiptNo.toString().toUpperCase().includes("PATH");
        })
        .filter(item => selectedBilledBy.length === 0 || selectedBilledBy.includes(item.takenBy || "System"));

    // Dynamically calculate selection totals based on visually filtered active dataset (Includes all statuses)
    const hasActiveFilters = 
        selectedCentres.length > 0 ||
        selectedCourses.length > 0 ||
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
        (timePeriod === "Custom" && startDate !== "" && endDate !== "");

    const dynamicSelectionTotalWithGst = hasActiveFilters ? filteredReport.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
    const dynamicSelectionTotalBase = hasActiveFilters ? filteredReport.reduce((sum, item) => sum + (item.revenueWithoutGst || 0), 0) : 0;

    const handleDownloadExcel = () => {
        if (!filteredReport.length) {
            toast.warn("No data to download");
            return;
        }

        const wb = XLSX.utils.book_new();

        const sheetTitle = billFilter === "no_bill" ? "No Bill No. Records" : billFilter === "with_bill" ? "Only Bills" : "Transaction List";
        const headers = [
            "Date", "Received Date", "Enroll No.", "Receipt No", "Student Name",
            "Student Email", "Student Mobile", "Whatsapp", "Address", "Guardian Name", "Guardian Mobile",
            "Session", "Department", "Course Name", "Transaction Type", "Transaction ID",
            "Centre", "Payment Mode", "Revenue (Base)", "GST Amount", "Total (Inc. GST)", "Status", "Billed By"

        ];
        const data = filteredReport.map(item => [
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
            item.course,
            item.installmentNumber === 0 ? "Initial" : "EMI",
            item.transactionId || "-",
            item.centre,
            item.method,
            item.revenueWithoutGst ? item.revenueWithoutGst.toFixed(2) : "-",
            item.gstAmount ? item.gstAmount.toFixed(2) : "-",
            item.amount,
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

    // Pagination Logic (uses filteredReport so No Bill filter affects pagination too)
    const totalPages = Math.ceil(filteredReport.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredReport.slice(startIndex, endIndex);

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
                                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-none`}>Rs.{dynamicSelectionTotalWithGst ? dynamicSelectionTotalWithGst.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black ${isDark ? 'text-gray-400' : 'text-slate-500'} uppercase tracking-tighter`}>Selection Revenue (Base)</span>
                                <h3 className={`text-xl font-black ${isDark ? 'text-gray-300' : 'text-slate-700'} leading-none`}>Rs.{dynamicSelectionTotalBase ? Math.round(dynamicSelectionTotalBase).toLocaleString('en-IN') : 0}</h3>
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
                </div>

                {/* Filters Row */}
                <div className={`${cardBg} p-4 rounded-xl shadow-sm ${cardBorder} flex flex-wrap items-center gap-4`}>
                    {/* Centre Logic Reuse */}
                    <div className="relative" ref={centreDropdownRef}>
                        <div
                            onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                            className={`min-w-[200px] h-10 px-3 py-2 ${btnBg} rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors`}
                        >
                            <span className="truncate">
                                {selectedCentres.length === 0 ? "-Select Center-" : `${selectedCentres.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isCentreDropdownOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-64 z-[9999] ${dropdownBg} rounded-lg shadow-2xl max-h-80 flex flex-col overflow-hidden`}>
                                <div className={`p-2 ${dropdownHdr} sticky top-0 z-10`}>
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
                                    {centres
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
                                    {centres.filter(c => c.centreName.toLowerCase().includes(centreSearch.toLowerCase())).length === 0 && (
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
                            <span className={`text-[10px] font-black ${subText} uppercase tracking-widest px-2`}>Duration:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setTimePeriod("Custom"); setStartDate(e.target.value); }}
                                className={`outline-none text-sm w-full bg-transparent ${isDark ? 'text-gray-300' : 'text-gray-700'} `}
                                style={{ colorScheme: isDark ? 'dark' : 'light' }}
                            />
                            <span className="text-gray-400 font-bold">-to-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setTimePeriod("Custom"); setEndDate(e.target.value); }}
                                className={`outline-none text-sm w-full bg-transparent ${isDark ? 'text-gray-300' : 'text-gray-700'} `}
                                style={{ colorScheme: isDark ? 'dark' : 'light' }}
                            />
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
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[120px]`}>MR Date</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[120px]`}>Received Date</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[150px]`}>Enroll No.</th>
                                    <th className={`p-4 text-xs font-black ${tHeadTxt} uppercase tracking-wider min-w-[240px]`}>Receipt No</th>
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
                                ) : filteredReport.length === 0 ? (
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
                                                {new Date(item.paymentDate).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-medium`}>
                                                {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('en-GB') : '-'}
                                            </td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-mono whitespace-nowrap min-w-[150px]`}>
                                                {item.admissionNumber && !item.admissionNumber.toString().startsWith("PATH") ? `PATH${item.admissionNumber}` : item.admissionNumber}
                                            </td>
                                            <td className={`p-4 text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} font-mono font-bold whitespace-nowrap min-w-[240px] uppercase`}>
                                                {(item.receiptNo && item.receiptNo !== "-" && !item.receiptNo.toString().startsWith("PATH")) ? `PATH/${item.receiptNo}` : (item.receiptNo || "-")}
                                            </td>
                                            <td className={`p-4 text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'} uppercase whitespace-nowrap min-w-[180px]`}>{item.studentName}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-bold whitespace-nowrap`}>{item.centre}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-medium whitespace-nowrap`}>{item.studentMobile || '-'}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} font-bold`}>{item.session || "-"}</td>
                                            <td className={`p-4 text-sm ${isDark ? 'text-orange-400' : 'text-orange-500'} font-bold uppercase`}>{item.department || "-"}</td>
                                            <td className={`p-4 text-sm ${tTxtSub} max-w-xs truncate`} title={item.course}>{item.course}</td>
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
