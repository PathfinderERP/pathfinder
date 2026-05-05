import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser, FaChartBar, FaTable, FaTh, FaArrowUp, FaSearch, FaSync, FaTimes, FaCoins, FaReceipt } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";

const TransactionList = () => {
    const { isDarkMode } = useTheme();
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
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(event.target)) {
                setIsCentreDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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
        setTimePeriod("This Month");
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
        toast.info("Filters reset to monthly default");
    };

    const filteredReport = billFilter === "no_bill"
        ? detailedReport.filter(item => !item.receiptNo || item.receiptNo === "-" || item.receiptNo.trim() === "")
        : billFilter === "with_bill"
            ? detailedReport.filter(item => item.receiptNo && item.receiptNo !== "-" && item.receiptNo.trim() !== "")
            : detailedReport;

    const dynamicSelectionTotalWithGst = filteredReport.reduce((sum, item) => sum + (item.amount || 0), 0);
    const dynamicSelectionTotalBase = filteredReport.reduce((sum, item) => sum + (item.revenueWithoutGst || 0), 0);

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
            "Centre", "Payment Mode", "Revenue (Base)", "GST Amount", "Total (Inc. GST)", "Status", "Taken By",
            "Total Classes", "Present", "Absent", "Attendance %", "Attendance Status"
        ];
        const data = filteredReport.map(item => [
            new Date(item.paymentDate).toLocaleDateString("en-IN"),
            item.receivedDate ? new Date(item.receivedDate).toLocaleDateString("en-IN") : "-",
            item.admissionNumber,
            item.receiptNo || "-",
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
            item.totalClasses,
            item.presentCount,
            item.absentCount,
            item.attendancePercent ? `${item.attendancePercent.toFixed(1)}%` : "0%",
            item.attendanceStatus
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
        toast.success("Financial report exported successfully");
    };

    const toggleSelection = (id, stateSetter) => {
        stateSetter(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Pagination Logic
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

    const handlePageInputSubmit = (e) => {
        e.preventDefault();
        const pageNum = parseInt(pageInput);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
        } else {
            setPageInput(currentPage.toString());
            toast.error(`Boundary Error: Value must be 1-${totalPages}`);
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 space-y-10 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header Section */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-500 shadow-inner border border-cyan-500/20">
                                <FaReceipt size={28} />
                            </span>
                            Transaction <span className="text-cyan-500">Archive</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Global ledger mapping & historical instrument tracing</p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleDownloadExcel}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3 uppercase text-[10px] tracking-widest active:scale-95"
                        >
                            <FaDownload size={14} /> EXPORT LEDGER
                        </button>
                    </div>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 group ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-2xl shadow-black/40' : 'bg-gradient-to-br from-cyan-600 to-cyan-400 border-cyan-500 shadow-xl shadow-cyan-500/20'}`}>
                        <div className="relative z-10">
                            <div className="flex flex-col border-b pb-4 mb-4 border-white/10">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isDarkMode ? 'text-cyan-400' : 'text-white/60'}`}>Matched Asset Value</span>
                                <h3 className={`text-3xl font-black leading-none italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-white'}`}>₹{dynamicSelectionTotalWithGst.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-400' : 'text-white/40'}`}>Revenue (Base)</span>
                                <h3 className={`text-xl font-black leading-none tabular-nums tracking-tighter ${isDarkMode ? 'text-gray-300' : 'text-white/80'}`}>₹{Math.round(dynamicSelectionTotalBase).toLocaleString('en-IN')}</h3>
                            </div>
                            <p className={`text-[9px] uppercase font-black tracking-[0.3em] mt-6 px-3 py-1 rounded-full inline-block ${isDarkMode ? 'text-cyan-500 bg-cyan-500/10' : 'text-cyan-900 bg-white/20'}`}>SELECTION_TOTAL</p>
                        </div>
                        <FaCoins className="absolute -bottom-4 -right-4 text-white/5 text-8xl transform -rotate-12 group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-2xl shadow-black/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="relative z-10">
                            <div className="flex flex-col border-b pb-4 mb-4 border-gray-800/10">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Fiscal Asset Mapping</span>
                                <h3 className={`text-3xl font-black leading-none italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{stats.currentYear.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Asset Growth</span>
                                <h3 className="text-xl font-black text-emerald-600 leading-none tabular-nums tracking-tighter">₹{Math.round(stats.currentYearRevenue).toLocaleString('en-IN')}</h3>
                            </div>
                            <p className={`text-[9px] uppercase font-black tracking-[0.3em] mt-6 px-3 py-1 rounded-full inline-block ${isDarkMode ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-50'}`}>{stats.currentYearLabel} FISCAL_CYCLE</p>
                        </div>
                        <FaChartBar className="absolute -bottom-4 -right-4 text-gray-500/5 text-8xl transform rotate-12" />
                    </div>

                    <div className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-2xl shadow-black/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="relative z-10">
                            <div className="flex flex-col border-b pb-4 mb-4 border-gray-800/10">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Historical Cycle</span>
                                <h3 className={`text-3xl font-black leading-none italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{stats.previousMonth.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-1">Archived Revenue</span>
                                <h3 className="text-xl font-black text-purple-600 leading-none tabular-nums tracking-tighter">₹{Math.round(stats.previousMonthRevenue).toLocaleString('en-IN')}</h3>
                            </div>
                            <p className={`text-[9px] uppercase font-black tracking-[0.3em] mt-6 px-3 py-1 rounded-full inline-block ${isDarkMode ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-50'}`}>{stats.previousMonthLabel.toUpperCase()}</p>
                        </div>
                        <FaChartBar className="absolute -bottom-4 -right-4 text-gray-500/5 text-8xl transform rotate-12" />
                    </div>

                    <div className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-2xl shadow-black/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="relative z-10">
                            <div className="flex flex-col border-b pb-4 mb-4 border-gray-800/10">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Current Active Cycle</span>
                                <h3 className={`text-3xl font-black leading-none italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{stats.currentMonth.toLocaleString('en-IN')}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Real-time Inflow</span>
                                <h3 className="text-xl font-black text-blue-600 leading-none tabular-nums tracking-tighter">₹{Math.round(stats.currentMonthRevenue).toLocaleString('en-IN')}</h3>
                            </div>
                            <p className={`text-[9px] uppercase font-black tracking-[0.3em] mt-6 px-3 py-1 rounded-full inline-block ${isDarkMode ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-50'}`}>{stats.currentMonthLabel.toUpperCase()}</p>
                        </div>
                        <FaChartBar className="absolute -bottom-4 -right-4 text-gray-500/5 text-8xl transform rotate-12" />
                    </div>
                </div>

                {/* Filter Matrix */}
                <div className={`p-8 rounded-[2.5rem] border shadow-[0_30px_60px_rgba(0,0,0,0.3)] space-y-8 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex flex-wrap items-center gap-6">
                        {/* Centres Dropdown */}
                        <div className="relative group" ref={centreDropdownRef}>
                            <div
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className={`min-w-[240px] px-6 py-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500 shadow-inner'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {selectedCentres.length === 0 ? "FILTER: GLOBAL CENTRES" : `${selectedCentres.length} NODES SELECTED`}
                                </span>
                                <FaChevronDown size={10} className={`text-cyan-500 transition-transform duration-300 ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isCentreDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-3 w-80 z-[100] border rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className={`p-4 border-b sticky top-0 z-10 ${isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-gray-50'}`}>
                                        <div className="relative">
                                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" />
                                            <input
                                                type="text"
                                                placeholder="Trace Centre Node..."
                                                value={centreSearch}
                                                onChange={(e) => setCentreSearch(e.target.value)}
                                                className={`w-full pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-widest border rounded-xl outline-none transition-all ${isDarkMode ? 'bg-black/20 border-gray-700 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto max-h-80 custom-scrollbar p-2">
                                        {centres
                                            .filter(c => c.centreName.toLowerCase().includes(centreSearch.toLowerCase()))
                                            .map(c => (
                                                <div
                                                    key={c._id}
                                                    className={`px-5 py-4 cursor-pointer flex items-center gap-4 rounded-xl transition-all mb-1 ${selectedCentres.includes(c._id) ? 'bg-cyan-500/10' : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}
                                                    onClick={() => toggleSelection(c._id, setSelectedCentres)}
                                                >
                                                    <div className={`w-4 h-4 rounded-lg border transition-all ${selectedCentres.includes(c._id) ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/30' : (isDarkMode ? 'border-gray-700' : 'border-gray-300 shadow-inner')}`}>
                                                        {selectedCentres.includes(c._id) && <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-black">✓</div>}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest truncate ${selectedCentres.includes(c._id) ? 'text-cyan-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{c.centreName}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Mode */}
                        <div className="relative" ref={paymentDropdownRef}>
                            <div
                                onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                                className={`min-w-[220px] px-6 py-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500 shadow-inner'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {selectedPaymentMode.length === 0 ? "PARAM: PAYMENT_MODE" : `${selectedPaymentMode.length} MODES`}
                                </span>
                                <FaChevronDown size={10} className={`text-cyan-500 transition-transform duration-300 ${isPaymentDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isPaymentDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-3 w-64 z-[100] border rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] p-2 animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    {["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"].map(mode => (
                                        <div
                                            key={mode}
                                            className={`px-5 py-4 cursor-pointer flex items-center gap-4 rounded-xl transition-all mb-1 ${selectedPaymentMode.includes(mode) ? 'bg-cyan-500/10' : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}
                                            onClick={() => toggleSelection(mode, setSelectedPaymentMode)}
                                        >
                                            <div className={`w-4 h-4 rounded-lg border transition-all ${selectedPaymentMode.includes(mode) ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/30' : (isDarkMode ? 'border-gray-700' : 'border-gray-300 shadow-inner')}`}>
                                                {selectedPaymentMode.includes(mode) && <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-black">✓</div>}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${selectedPaymentMode.includes(mode) ? 'text-cyan-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{mode}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Transaction Type */}
                        <div className="relative" ref={typeDropdownRef}>
                            <div
                                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                className={`min-w-[200px] px-6 py-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500 shadow-inner'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {selectedTransactionType.length === 0 ? "PARAM: TYPE" : `${selectedTransactionType.length} TYPES`}
                                </span>
                                <FaChevronDown size={10} className={`text-cyan-500 transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isTypeDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-3 w-60 z-[100] border rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] p-2 animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    {["Initial", "EMI"].map(type => (
                                        <div
                                            key={type}
                                            className={`px-5 py-4 cursor-pointer flex items-center gap-4 rounded-xl transition-all mb-1 ${selectedTransactionType.includes(type) ? 'bg-cyan-500/10' : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}
                                            onClick={() => toggleSelection(type, setSelectedTransactionType)}
                                        >
                                            <div className={`w-4 h-4 rounded-lg border transition-all ${selectedTransactionType.includes(type) ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/30' : (isDarkMode ? 'border-gray-700' : 'border-gray-300 shadow-inner')}`}>
                                                {selectedTransactionType.includes(type) && <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-black">✓</div>}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${selectedTransactionType.includes(type) ? 'text-cyan-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="relative" ref={statusDropdownRef}>
                            <div
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                className={`min-w-[200px] px-6 py-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500 shadow-inner'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {selectedStatus.length === 0 ? "FILTER: STATUS" : `${selectedStatus.length} STATUSES`}
                                </span>
                                <FaChevronDown size={10} className={`text-cyan-500 transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isStatusDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-3 w-72 z-[100] border rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] p-2 animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="p-4 border-b border-gray-800/10 mb-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Archival Status Mapping</span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                        {["PAID", "PARTIAL", "PENDING_CLEARANCE", "REJECTED", "CANCELLED", "PENDING", "OVERDUE"].map(status => (
                                            <div
                                                key={status}
                                                className={`px-5 py-4 cursor-pointer flex items-center gap-4 rounded-xl transition-all mb-1 ${selectedStatus.includes(status) ? 'bg-cyan-500/10' : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}
                                                onClick={() => toggleSelection(status, setSelectedStatus)}
                                            >
                                                <div className={`w-4 h-4 rounded-lg border transition-all ${selectedStatus.includes(status) ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/30' : (isDarkMode ? 'border-gray-700' : 'border-gray-300 shadow-inner')}`}>
                                                    {selectedStatus.includes(status) && <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-black">✓</div>}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStatus.includes(status) ? 'text-cyan-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{status.replace('_', ' ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bill Filter Segment */}
                        <div className={`flex items-center rounded-2xl border overflow-hidden p-1.5 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-100 border-gray-200 shadow-inner'}`}>
                            {[
                                { key: "all", label: "UNIVERSE", color: "bg-gray-700 text-white" },
                                { key: "no_bill", label: "NO_RECEIPT", color: "bg-red-600 text-white shadow-lg shadow-red-500/20" },
                                { key: "with_bill", label: "RECEIPTED", color: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" }
                            ].map(({ key, label, color }, i) => (
                                <button
                                    key={key}
                                    onClick={() => { setBillFilter(key); setCurrentPage(1); setPageInput("1"); }}
                                    className={`px-6 py-2.5 rounded-xl transition-all duration-500 text-[9px] font-black uppercase tracking-[0.2em] relative ${billFilter === key
                                        ? color
                                        : `${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`
                                        }`}
                                >
                                    {label}
                                    {billFilter === key && billFilter !== "all" && (
                                        <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded-full text-[8px] font-black">
                                            {filteredReport.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`pt-8 border-t flex flex-col xl:flex-row gap-6 items-center justify-between ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div className="flex flex-wrap items-center gap-6 flex-1 w-full">
                            <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border flex-1 min-w-[350px] transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                <FaCalendarAlt className="text-cyan-500 text-sm" />
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Temporal Horizon:</span>
                                <div className="flex items-center gap-3 flex-1">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => { setTimePeriod("Custom"); setStartDate(e.target.value); }}
                                        className={`outline-none text-[10px] font-black uppercase w-full bg-transparent [color-scheme:dark] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                    />
                                    <span className="text-gray-700 font-black">---</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => { setTimePeriod("Custom"); setEndDate(e.target.value); }}
                                        className={`outline-none text-[10px] font-black uppercase w-full bg-transparent [color-scheme:dark] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                    />
                                </div>
                            </div>

                            <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border flex-1 min-w-[300px] transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                <FaCoins className="text-cyan-500 text-sm" />
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic">Asset Range:</span>
                                <div className="flex items-center gap-3 flex-1">
                                    <input
                                        type="number"
                                        placeholder="MIN"
                                        value={minAmount}
                                        onChange={(e) => setMinAmount(e.target.value)}
                                        className={`w-full bg-transparent border-none text-[10px] font-black outline-none placeholder:text-gray-700 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                    />
                                    <span className="text-gray-700 font-black">|</span>
                                    <input
                                        type="number"
                                        placeholder="MAX"
                                        value={maxAmount}
                                        onChange={(e) => setMaxAmount(e.target.value)}
                                        className={`w-full bg-transparent border-none text-[10px] font-black outline-none placeholder:text-gray-700 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <button onClick={handleResetFilters} className="text-red-500 hover:text-red-400 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap px-6 py-3 border border-red-500/20 rounded-2xl hover:bg-red-500/10 transition-all active:scale-95 italic">
                            PURGE_PARAMETERS
                        </button>
                    </div>
                </div>

                {/* Search Horizon */}
                <div className={`p-6 rounded-[2.5rem] border shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="relative group">
                        <FaSearch className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 ${isDarkMode ? 'text-gray-700 group-focus-within:text-cyan-500' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                        <input
                            type="text"
                            placeholder="TRACING BY IDENTITY, ENROLLMENT SEQUENCE, COMM_NODE OR INSTRUMENT_ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full border rounded-3xl py-5 pl-16 pr-6 font-black text-[11px] uppercase tracking-[0.2em] outline-none transition-all duration-500 ${isDarkMode ? 'bg-black/20 border-gray-800 text-white placeholder:text-gray-800 focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500/50 shadow-inner'}`}
                        />
                    </div>
                </div>

                {/* Ledger Matrix */}
                <div className={`rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left border-collapse min-w-[2000px]">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'} border-b`}>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">ID</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">MR Temporal</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Recv Temporal</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Enrollment Seq</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Receipt Instrument</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Authorized Identity</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Origin Node</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Comm Mobile</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Cycle</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Sector</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Stream Matrix</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Attendance</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Mapping</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Trace ID</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Protocol</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 italic">Revenue (Base)</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-purple-500 italic">GST (18%)</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-500 italic">Total Asset</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Audit Status</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-[0.25em] text-blue-500 italic">Authorized By</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/30' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="20" className="p-40 text-center">
                                            <div className="flex flex-col items-center gap-8">
                                                <div className="w-20 h-20 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin shadow-lg shadow-cyan-500/20"></div>
                                                <p className="text-gray-500 font-black tracking-[0.5em] text-[10px] uppercase italic animate-pulse">Retrieving Archival Global Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredReport.length === 0 ? (
                                    <tr>
                                        <td colSpan="20" className="p-40 text-center">
                                            <p className="text-gray-600 font-black tracking-[0.5em] text-xs uppercase italic">No matched vectors in sectoral nodes</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((item, index) => (
                                        <tr key={item.transactionId || index} className={`transition-all duration-300 group ${isDarkMode ? 'hover:bg-cyan-500/[0.03] bg-transparent' : 'hover:bg-cyan-500/[0.02] bg-white'}`}>
                                            <td className={`p-8 text-[10px] font-black tabular-nums ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{startIndex + index + 1}</td>
                                            <td className={`p-8 text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {new Date(item.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                            </td>
                                            <td className={`p-8 text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '---'}
                                            </td>
                                            <td className={`p-8 text-[11px] font-black tabular-nums tracking-[0.1em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.admissionNumber}</td>
                                            <td className="p-8 text-[11px] text-cyan-500 font-black tracking-widest uppercase italic">{item.receiptNo || "PENDING_GEN"}</td>
                                            <td className={`p-8 text-sm font-black italic uppercase tracking-tighter transition-all duration-300 group-hover:translate-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.studentName}</td>
                                            <td className={`p-8 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.centre}</td>
                                            <td className={`p-8 text-[11px] font-black tabular-nums tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.studentMobile || 'VOID'}</td>
                                            <td className={`p-8 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.session || "GLOBAL"}</td>
                                            <td className="p-8 text-[10px] text-orange-500 font-black uppercase tracking-widest italic">{item.department || "CORE"}</td>
                                            <td className={`p-8 text-[10px] font-black uppercase tracking-widest max-w-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={item.course}>{item.course}</td>
                                            <td className="p-8">
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest text-center border ${item.attendanceStatus === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : (isDarkMode ? 'bg-white/5 text-gray-700 border-gray-800' : 'bg-gray-100 text-gray-400 border-gray-200')}`}>
                                                    {item.attendanceStatus === 'Available' ? `${item.attendancePercent.toFixed(1)}%` : 'VOID'}
                                                </div>
                                            </td>
                                            <td className={`p-8 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {item.installmentNumber === 0 ? "ENTRY_NODE" : "PHASE_MAP"}
                                            </td>
                                            <td className="p-8 text-[10px] text-gray-600 font-black tracking-widest uppercase italic tabular-nums">
                                                {item.method === "CASH" ? "LIQUID_SETTLE" : (item.transactionId || "NULL_TRACE")}
                                            </td>
                                            <td className={`p-8 text-[10px] font-black uppercase tracking-widest italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.method}</td>
                                            <td className="p-8 text-xl font-black text-emerald-500 tabular-nums tracking-tighter italic">₹{item.revenueWithoutGst ? item.revenueWithoutGst.toLocaleString() : "0"}</td>
                                            <td className="p-8 text-base font-black text-purple-500 tabular-nums tracking-tighter italic opacity-60">₹{item.gstAmount ? item.gstAmount.toLocaleString() : "0"}</td>
                                            <td className={`p-8 text-2xl font-black italic tabular-nums tracking-tighter border-l ${isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-100'}`}>₹{item.amount.toLocaleString()}</td>
                                            <td className="p-8">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all duration-300 ${item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                                                    item.status === 'PENDING' || item.status === 'PENDING_CLEARANCE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                                                        item.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                                                            'bg-gray-500/10 text-gray-500 border-gray-800'
                                                    }`}>
                                                    {item.status || "AUDITED"}
                                                </span>
                                            </td>
                                            <td className="p-8 text-[10px] font-black text-blue-500 uppercase italic tracking-widest whitespace-nowrap">
                                                {item.takenBy || "SYSTEM_AUTO"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Matrix */}
                    <div className={`p-10 border-t flex flex-col xl:flex-row justify-between items-center gap-8 transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Matrix Depth:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest focus:outline-none transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                            >
                                {[10, 25, 50, 100].map(v => <option key={v} value={v} className={isDarkMode ? "bg-[#0f1215]" : ""}>{v} NODES</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white border border-gray-800 shadow-xl' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}
                            >
                                Previous Horizon
                            </button>

                            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-4">
                                <input
                                    type="text"
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    className={`w-16 text-center py-3 rounded-xl border font-black text-[11px] tabular-nums transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                />
                                <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">/ {totalPages || 1}</span>
                            </form>

                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white border border-gray-800 shadow-xl' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}
                            >
                                Next Horizon
                            </button>
                        </div>

                        <div className="text-right">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic block mb-1">Sector Results</span>
                            <span className={`text-sm font-black tabular-nums tracking-tighter italic ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{filteredReport.length.toLocaleString()} Ledger Entries Found</span>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default TransactionList;
