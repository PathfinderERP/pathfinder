import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser, FaChartBar, FaTable, FaTh, FaArrowUp, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TransactionList = () => {
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
    const [sessions, setSessions] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedExamTag, setSelectedExamTag] = useState("");
    const [selectedSession, setSelectedSession] = useState("");
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [timePeriod, setTimePeriod] = useState("All Time");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // New Filters specific to list
    const [selectedPaymentMode, setSelectedPaymentMode] = useState([]);
    const [selectedTransactionType, setSelectedTransactionType] = useState([]);
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pageInput, setPageInput] = useState("1");

    // Dropdown Refs
    const centreDropdownRef = useRef(null);
    const paymentDropdownRef = useRef(null);
    const typeDropdownRef = useRef(null);
    const departmentDropdownRef = useRef(null);

    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);

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
    }, [selectedCentres, selectedCourses, selectedExamTag, selectedSession, timePeriod, startDate, endDate, selectedPaymentMode, selectedTransactionType, minAmount, maxAmount, selectedDepartments, searchTerm]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, dRes, sRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
            ]);

            if (cRes.ok) {
                const data = await cRes.json();
                const filteredCentres = Array.isArray(data)
                    ? data.filter(c =>
                        user.role === 'superAdmin' ||
                        (user.centres && user.centres.some(uc => uc._id === c._id || uc.centreName === c.centreName))
                    )
                    : [];
                setCentres(filteredCentres);
            }
            if (dRes.ok) setDepartments(await dRes.json());
            if (sRes.ok) {
                const sessionData = await sRes.json();
                setSessions(Array.isArray(sessionData) ? sessionData : []);
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

            if (selectedSession) params.append("session", selectedSession);
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
            if (selectedDepartments.length > 0) params.append("departmentIds", selectedDepartments.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);

            // New Filters
            if (selectedPaymentMode.length > 0) params.append("paymentMode", selectedPaymentMode.join(","));
            if (selectedTransactionType.length > 0) params.append("transactionType", selectedTransactionType.join(","));
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
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedExamTag("");
        setSelectedSession("");
        setTimePeriod("All Time");
        setStartDate("");
        setEndDate("");
        setSelectedPaymentMode([]);
        setSelectedTransactionType([]);
        setSelectedDepartments([]);
        setMinAmount("");
        setMaxAmount("");
        setSearchTerm("");
        toast.info("Filters reset");
    };

    const handleDownloadExcel = () => {
        if (!detailedReport.length) {
            toast.warn("No data to download");
            return;
        }

        const wb = XLSX.utils.book_new();

        const headers = ["Date", "Received Date", "Enroll No.", "Receipt No", "Student Name", "Session", "Department", "Course Name", "Transaction Type", "PaymentID", "Centre", "Payment Mode", "Revenue (Base)", "GST Amount", "Total (Inc. GST)", "Status"];
        const data = detailedReport.map(item => [
            new Date(item.paymentDate).toLocaleDateString("en-IN"),
            item.receivedDate ? new Date(item.receivedDate).toLocaleDateString("en-IN") : "-",
            item.admissionNumber,
            item.receiptNo || "-",
            item.studentName,
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
            item.status
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws, "Transaction List");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `Transaction_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

    // Pagination Logic
    const totalPages = Math.ceil(detailedReport.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = detailedReport.slice(startIndex, endIndex);

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
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex items-center justify-between col-span-1 md:col-span-1">
                        <div className="text-right flex-1">
                            <div className="flex flex-col border-b border-gray-700 pb-2 mb-2">
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-tighter">Selection Total (With GST)</span>
                                <h3 className="text-xl font-black text-white leading-none">Rs.{stats.selectionTotalWithGst ? stats.selectionTotalWithGst.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Selection Revenue (Base)</span>
                                <h3 className="text-xl font-black text-gray-300 leading-none">Rs.{stats.selectionTotalBase ? Math.round(stats.selectionTotalBase).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className="text-[9px] text-cyan-500 uppercase font-black tracking-[0.2em] mt-3 bg-cyan-500/10 px-2 py-0.5 rounded-full inline-block">MATCHED TOTAL</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                                <FaChartBar size={24} />
                            </div>
                        </div>
                        <div className="text-right flex-1">
                            <div className="flex flex-col border-b border-gray-100 pb-2 mb-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total (With GST)</span>
                                <h3 className="text-lg font-black text-gray-900 leading-none">Rs.{stats.currentYear ? stats.currentYear.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-tighter">Revenue (Base)</span>
                                <h3 className="text-lg font-black text-green-600 leading-none">Rs.{stats.currentYearRevenue ? Math.round(stats.currentYearRevenue).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-[0.2em] mt-3 bg-gray-50 px-2 py-0.5 rounded-full inline-block">{stats.currentYearLabel} FISCAL</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
                                <FaChartBar size={24} />
                            </div>
                        </div>
                        <div className="text-right flex-1">
                            <div className="flex flex-col border-b border-gray-100 pb-2 mb-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total (With GST)</span>
                                <h3 className="text-lg font-black text-gray-900 leading-none">Rs.{stats.previousMonth ? stats.previousMonth.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">Revenue (Base)</span>
                                <h3 className="text-lg font-black text-purple-600 leading-none">Rs.{stats.previousMonthRevenue ? Math.round(stats.previousMonthRevenue).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-[0.2em] mt-3 bg-gray-50 px-2 py-0.5 rounded-full inline-block">{stats.previousMonthLabel}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                                <FaChartBar size={24} />
                            </div>
                        </div>
                        <div className="text-right flex-1">
                            <div className="flex flex-col border-b border-gray-100 pb-2 mb-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Total (With GST)</span>
                                <h3 className="text-lg font-black text-gray-900 leading-none">Rs.{stats.currentMonth ? stats.currentMonth.toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Revenue (Base)</span>
                                <h3 className="text-lg font-black text-blue-600 leading-none">Rs.{stats.currentMonthRevenue ? Math.round(stats.currentMonthRevenue).toLocaleString('en-IN') : 0}</h3>
                            </div>
                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-[0.2em] mt-3 bg-gray-50 px-2 py-0.5 rounded-full inline-block">{stats.currentMonthLabel}</p>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
                    {/* Centre Logic Reuse */}
                    <div className="relative" ref={centreDropdownRef}>
                        <div
                            onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                            className="min-w-[200px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
                        >
                            <span className="truncate">
                                {selectedCentres.length === 0 ? "-Select Center-" : `${selectedCentres.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isCentreDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-60 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {centres.map(c => (
                                    <div
                                        key={c._id}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onClick={() => toggleCentreSelection(c._id)}
                                    >
                                        <input type="checkbox" checked={selectedCentres.includes(c._id)} readOnly className="rounded" />
                                        <span className="text-sm text-gray-700 truncate">{c.centreName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment Mode */}
                    {/* Payment Mode */}
                    <div className="relative" ref={paymentDropdownRef}>
                        <div
                            onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                            className="min-w-[200px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
                        >
                            <span className="truncate">
                                {selectedPaymentMode.length === 0 ? "-Select Payment Mode-" : `${selectedPaymentMode.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isPaymentDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isPaymentDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-60 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"].map(mode => (
                                    <div
                                        key={mode}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onClick={() => togglePaymentModeSelection(mode)}
                                    >
                                        <input type="checkbox" checked={selectedPaymentMode.includes(mode)} readOnly className="rounded" />
                                        <span className="text-sm text-gray-700 truncate">{mode}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transaction Type (MultiSelect) */}
                    <div className="relative" ref={typeDropdownRef}>
                        <div
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                            className="min-w-[200px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
                        >
                            <span className="truncate">
                                {selectedTransactionType.length === 0 ? "-Select Type-" : `${selectedTransactionType.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isTypeDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-60 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {["Initial", "EMI"].map(type => (
                                    <div
                                        key={type}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onClick={() => toggleTransactionTypeSelection(type)}
                                    >
                                        <input type="checkbox" checked={selectedTransactionType.includes(type)} readOnly className="rounded" />
                                        <span className="text-sm text-gray-700 truncate">{type}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Department (MultiSelect) */}
                    <div className="relative" ref={departmentDropdownRef}>
                        <div
                            onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                            className="min-w-[200px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
                        >
                            <span className="truncate">
                                {selectedDepartments.length === 0 ? "-Select Department-" : `${selectedDepartments.length} Selected`}
                            </span>
                            <FaChevronDown size={10} className={`transform transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isDepartmentDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-60 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {departments.map(d => (
                                    <div
                                        key={d._id}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onClick={() => toggleDepartmentSelection(d._id)}
                                    >
                                        <input type="checkbox" checked={selectedDepartments.includes(d._id)} readOnly className="rounded" />
                                        <span className="text-sm text-gray-700 truncate">{d.departmentName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Session (Single Select to match existing state logic) */}
                    <div className="relative">
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="min-w-[150px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-blue-500 transition-colors appearance-none"
                        >
                            <option value="">-Select Session-</option>
                            {sessions.map(s => (
                                <option key={s._id} value={s.sessionName || s.name}>{s.sessionName || s.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <FaChevronDown size={10} />
                        </div>
                    </div>

                    <button
                        onClick={handleDownloadExcel}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm flex items-center gap-2 uppercase text-sm tracking-wide ml-auto"
                    >
                        Export
                    </button>

                </div>

                {/* Date & Amount Filter Row */}
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 flex-1 min-w-[300px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Duration:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setTimePeriod("Custom"); setStartDate(e.target.value); }}
                                className="outline-none text-sm text-gray-700 w-full bg-transparent"
                            />
                            <span className="text-gray-400 font-bold">-to-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setTimePeriod("Custom"); setEndDate(e.target.value); }}
                                className="outline-none text-sm text-gray-700 w-full bg-transparent"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100 flex-1 min-w-[300px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Amount:</span>
                            <input
                                type="number"
                                placeholder="Min"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-gray-700 outline-none font-bold"
                            />
                            <span className="text-gray-300">|</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-gray-700 outline-none font-bold"
                            />
                        </div>

                        <button onClick={handleResetFilters} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-widest whitespace-nowrap ml-auto px-4">
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Search Row */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="relative group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH BY STUDENT NAME, ENROLLMENT NO, EMAIL, OR RECEIPT NO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg py-3 pl-12 pr-4 text-gray-700 font-bold text-xs uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all shadow-inner"
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">#</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Received Date</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Enroll No.</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Receipt No</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Student Name</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Session</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Department</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Course Name</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Transaction Type</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Centre</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Payment Mode</th>
                                    <th className="p-4 text-xs font-black text-orange-500 uppercase tracking-wider">Revenue (Base)</th>
                                    <th className="p-4 text-xs font-black text-purple-500 uppercase tracking-wider">GST (18%)</th>
                                    <th className="p-4 text-xs font-black text-gray-800 uppercase tracking-wider">Total (Inc. GST)</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className="p-8 text-center text-gray-500">Loading transactions...</td>
                                    </tr>
                                ) : detailedReport.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="p-8 text-center text-gray-500">No transactions found</td>
                                    </tr>
                                ) : (
                                    paginatedData.map((item, index) => (
                                        <tr key={item.transactionId || index} className="hover:bg-gray-50 transition-colors bg-white">
                                            <td className="p-4 text-sm font-bold text-gray-700">{startIndex + index + 1}</td>
                                            <td className="p-4 text-sm text-gray-600 font-medium">
                                                {new Date(item.paymentDate).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 font-medium">
                                                {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('en-GB') : '-'}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">{item.admissionNumber}</td>
                                            <td className="p-4 text-sm text-gray-500">{item.receiptNo || "-"}</td>
                                            <td className="p-4 text-sm font-bold text-gray-800 uppercase">{item.studentName}</td>
                                            <td className="p-4 text-sm text-gray-600 font-bold">{item.session || "-"}</td>
                                            <td className="p-4 text-sm text-orange-500 font-bold uppercase">{item.department || "-"}</td>
                                            <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={item.course}>{item.course}</td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {item.installmentNumber === 0 ? "Initial" : "EMI"}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 font-mono text-xs">
                                                {item.method === "CASH" ? "CASH" : (item.transactionId || "-")}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 uppercase">{item.centre}</td>
                                            <td className="p-4 text-sm text-gray-600">{item.method}</td>
                                            <td className="p-4 text-sm font-bold text-orange-600">₹{item.revenueWithoutGst ? item.revenueWithoutGst.toLocaleString() : "-"}</td>
                                            <td className="p-4 text-sm font-bold text-purple-600 text-xs">₹{item.gstAmount ? item.gstAmount.toLocaleString() : "-"}</td>
                                            <td className="p-4 text-sm font-black text-gray-900 border-l border-gray-100">₹{item.amount.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'PAID' ? 'bg-green-100 text-green-600' :
                                                    item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {item.status || "completed"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {detailedReport.length > 0 && (
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                            {/* Left: Items per page */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 font-medium">Show</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={handleItemsPerPageChange}
                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span className="text-sm text-gray-600 font-medium">entries</span>
                            </div>

                            {/* Center: Page info and navigation */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Page</span>
                                    <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={pageInput}
                                            onChange={handlePageInputChange}
                                            className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-600">of {totalPages}</span>
                                    </form>
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>

                            {/* Right: Showing info */}
                            <div className="text-sm text-gray-600">
                                Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                                <span className="font-semibold">{Math.min(endIndex, detailedReport.length)}</span> of{" "}
                                <span className="font-semibold">{detailedReport.length}</span> entries
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default TransactionList;
