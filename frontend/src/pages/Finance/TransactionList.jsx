import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser, FaChartBar, FaTable, FaTh, FaArrowUp } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TransactionList = () => {
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [detailedReport, setDetailedReport] = useState([]);
    
    // Total Revenue only for the stats cards if needed, calculated from list or API
    const [totalRevenue, setTotalRevenue] = useState(0); 

    // Filters
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const sessions = ["2023-2024", "2024-2025", "2025-2026", "2025-2027","2026-2027","2027-2028","2028-2029"];

    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedExamTag, setSelectedExamTag] = useState("");
    const [selectedSession, setSelectedSession] = useState("");
    const [timePeriod, setTimePeriod] = useState("All Time");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // New Filters specific to list
    const [selectedPaymentMode, setSelectedPaymentMode] = useState([]);
    const [selectedTransactionType, setSelectedTransactionType] = useState([]);

    // Dropdown Refs
    const centreDropdownRef = useRef(null);
    const courseDropdownRef = useRef(null);
    const departmentDropdownRef = useRef(null);
    const paymentDropdownRef = useRef(null);
    const typeDropdownRef = useRef(null);
    
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

    // ---- Effects ----
    useEffect(() => {
        fetchMasterData();
        const handleClickOutside = (event) => {
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(event.target)) {
                setIsCentreDropdownOpen(false);
            }
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
                setIsCourseDropdownOpen(false);
            }
            if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
                setIsDepartmentDropdownOpen(false);
            }
            if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target)) {
                setIsPaymentDropdownOpen(false);
            }
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setIsTypeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (timePeriod === "Custom" && (!startDate || !endDate)) {
            return;
        }
        fetchReportData();
    }, [selectedCentres, selectedCourses, selectedDepartments, selectedExamTag, selectedSession, timePeriod, startDate, endDate, selectedPaymentMode, selectedTransactionType]);

    // ---- API Calls ----
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

            if (cRes.ok) setCentres(await cRes.json());
            if (coRes.ok) setCourses(await coRes.json());
            if (eRes.ok) setExamTags(await eRes.json());
            if (dRes.ok) setDepartments(await dRes.json());
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

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/transaction-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setDetailedReport(result.detailedReport || []);
                // If the backend filters the 'detailedReport' based on all criteria, we can sum it up here for "Current Selection Revenue"
                // Or if the backend returns specific totals, use those. 
                // Currently backend returns totalRevenue for the whole matched set.
                // But let's calculate revenue from the *filtered list* to be safe and dynamic
                const currentListRevenue = (result.detailedReport || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
                setTotalRevenue(currentListRevenue);
            } else {
                setDetailedReport([]);
                setTotalRevenue(0);
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
        setSelectedDepartments([]);
        setSelectedExamTag("");
        setSelectedSession("");
        setTimePeriod("All Time");
        setStartDate("");
        setEndDate("");
        setSelectedPaymentMode([]);
        setSelectedTransactionType([]);
        toast.info("Filters reset");
    };

    const handleDownloadExcel = () => {
        if (!detailedReport.length) {
            toast.warn("No data to download");
            return;
        }

        const wb = XLSX.utils.book_new();
        const dateStr = new Date().toLocaleString();

        const headers = ["Date", "Received Date", "Enroll No.", "Receipt No", "Student Name", "Course Name", "Transaction Type", "PaymentID", "Centre", "Payment Mode", "Amount", "Status"];
        const data = detailedReport.map(item => [
            new Date(item.paymentDate).toLocaleDateString("en-IN"),
            item.receivedDate ? new Date(item.receivedDate).toLocaleDateString("en-IN") : "-",
            item.admissionNumber,
            item.receiptNo || "-",
            item.studentName,
            item.course,
            item.installmentNumber === 1 ? "Initial" : "EMI",
            item.transactionId || "-",
            item.centre,
            item.method,
            item.amount,
            item.status
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
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

    const toggleCourseSelection = (id) => {
        setSelectedCourses(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDepartmentSelection = (id) => {
        setSelectedDepartments(prev =>
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

    // Calculate Stats
    // Today's Date
    const today = new Date();
    // Revenue logic can be expanded if needed (Current Year, Month, etc.)
    // For now, let's show "Current Selection Revenue" like in the screenshot concept or simply Total Revenue
    
    return (
        <Layout activePage="Finance & Fees">
            <div className="space-y-6 animate-fade-in pb-10">
                
                {/* Stats Cards Row (Optional - based on user preference for "Transaction List" page) */}
                {/* The user screenshot shows stats cards at the top */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                                <FaArrowUp size={24} />
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-2xl font-black text-gray-800">Rs.{totalRevenue.toLocaleString('en-IN')}</h3>
                            <p className="text-gray-500 text-sm">Current Selection Revenue</p>
                        </div>
                    </div>
                     {/* Add more cards if needed (e.g. Current Month/Year specific queries) */}
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
                    {/* Department Logic */}
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

                    {/* Payment Mode (MultiSelect) */}
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

                    <button
                        onClick={handleDownloadExcel}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm flex items-center gap-2 uppercase text-sm tracking-wide"
                    >
                        Export to Excel
                    </button>
                    
                </div>
                
                {/* Date Filter Row (Separate or integrated) */}
                 <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2">
                         <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setTimePeriod("Custom"); setStartDate(e.target.value); }}
                            className="outline-none text-sm text-gray-700 w-full p-2"
                            placeholder="DD/MM/YYYY" 
                        />
                        <span className="text-gray-400 font-bold">-to-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setTimePeriod("Custom"); setEndDate(e.target.value); }}
                            className="outline-none text-sm text-gray-700 w-full p-2"
                            placeholder="DD/MM/YYYY"
                        />
                         <button onClick={handleResetFilters} className="text-red-500 hover:text-red-700 font-semibold text-sm underline ml-4 whitespace-nowrap">
                            Clear Filters
                        </button>
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
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Course Name</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Transaction Type</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">PaymentID</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Centre</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Payment Mode</th>
                                    <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Amount(Inc. GST)</th>
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
                                    detailedReport.map((item, index) => (
                                        <tr key={item.transactionId || index} className="hover:bg-gray-50 transition-colors bg-white">
                                            <td className="p-4 text-sm font-bold text-gray-700">{index + 1}</td>
                                            <td className="p-4 text-sm text-gray-600 font-medium">
                                                {new Date(item.paymentDate).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 font-medium">
                                                {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('en-GB') : '-'}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">{item.admissionNumber}</td>
                                            <td className="p-4 text-sm text-gray-500">{item.receiptNo || "-"}</td>
                                            <td className="p-4 text-sm font-bold text-gray-800 uppercase">{item.studentName}</td>
                                            <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={item.course}>{item.course}</td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {item.installmentNumber === 1 ? "Initial" : "EMI"}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 font-mono text-xs">{item.transactionId || "-"}</td>
                                            <td className="p-4 text-sm text-gray-600 uppercase">{item.centre}</td>
                                            <td className="p-4 text-sm text-gray-600">{item.method}</td>
                                            <td className="p-4 text-sm font-black text-gray-800">Rs.{item.amount}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                    item.status === 'PAID' ? 'bg-green-100 text-green-600' : 
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
                </div>
            </div>
        </Layout>
    );
};

export default TransactionList;
