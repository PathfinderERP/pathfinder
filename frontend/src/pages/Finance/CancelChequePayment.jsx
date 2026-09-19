import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaBan, FaUndo, FaExclamationTriangle, FaFilter, FaDownload, FaTimes, FaRegFileAlt, FaEdit, FaSyncAlt, FaCheckCircle, FaClock } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Select from "react-select";
import { useTheme } from "../../context/ThemeContext";
import {
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const CancelChequePayment = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userRoles = Array.isArray(user.role) ? user.role : [user.role || ''];
    const isSuperAdminUser = userRoles.some(r => {
        const norm = typeof r === "string" ? r.toLowerCase().replace(/[\s\-_]+/g, "") : "";
        return norm === "superadmin";
    });
    const isSuperAdminOrAccounts = userRoles.some(r => {
        const norm = typeof r === "string" ? r.toLowerCase().replace(/[\s\-_]+/g, "") : "";
        return norm === "superadmin" || norm === "accounts" || norm === "account";
    });

    // State for cheques
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showEditStatusModal, setShowEditStatusModal] = useState(false);
    const [statusEditingCheque, setStatusEditingCheque] = useState(null);
    const [targetStatus, setTargetStatus] = useState("PAID");
    const [statusClearedDate, setStatusClearedDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusRejectDate, setStatusRejectDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusRejectReason, setStatusRejectReason] = useState("");
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState("");

    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        department: [],
        status: ["REJECTED"],
        startDate: "",
        endDate: "",
        chequeStartDate: "",
        chequeEndDate: ""
    });
    const [metadata, setMetadata] = useState({
        centres: [],
        courses: [],
        departments: []
    });

    useEffect(() => {
        fetchMetadata();
        fetchCheques();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch cheques when filters or search change
    useEffect(() => {
        setCurrentPage(1);
        const timer = setTimeout(() => {
            fetchCheques();
        }, 500); // Debounce search
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, searchTerm]);

    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centresRes, coursesRes, deptsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
            ]);

            const centres = await centresRes.json();
            const courses = await coursesRes.json();
            const depts = await deptsRes.json();

            // Filter centres based on user's authorized assigned centres (under User Management)
            const filteredCentres = Array.isArray(centres)
                ? centres.filter(c => {
                    if (isSuperAdminUser) return true;
                    if (!user.centres || user.centres.length === 0) return false;
                    return user.centres.some(uc => {
                        const ucId = typeof uc === 'object' ? (uc._id || uc.id) : uc;
                        const ucName = typeof uc === 'object' ? uc.centreName : null;
                        const matchId = ucId && c._id && ucId.toString() === c._id.toString();
                        const matchName = ucName && c.centreName && ucName.trim().toLowerCase() === c.centreName.trim().toLowerCase();
                        return matchId || matchName;
                    });
                })
                : [];

            setMetadata({
                centres: filteredCentres,
                courses: Array.isArray(courses) ? courses : [],
                departments: Array.isArray(depts) ? depts.filter(dept => dept.showInAdmission !== false) : []
            });
        } catch (error) {
            console.error("Error fetching metadata:", error);
            toast.error("Failed to load metadata");
        }
    };

    const fetchCheques = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return; // Wait for auth

            // Build query params
            const queryParams = new URLSearchParams();

            // Handle multi-select arrays
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value) && value.length > 0) {
                    value.forEach(v => queryParams.append(key, v));
                } else if (value && !Array.isArray(value)) {
                    queryParams.append(key, value);
                }
            });

            if (searchTerm) queryParams.append("search", searchTerm);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/cheque/all?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch cheques");

            const data = await response.json();
            setCheques(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching cheques:", error);
            toast.error("Failed to load cheque payments");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditStatus = (cheque) => {
        setStatusEditingCheque(cheque);
        const normStatus = (cheque.status || '').toUpperCase();
        const initialTarget = (normStatus === "PAID" || normStatus === "CLEARED") ? "REJECTED" : "PAID";
        setTargetStatus(initialTarget);

        let dVal = new Date().toISOString().split('T')[0];
        if (cheque.clearedOrRejectedDate) {
            const d = new Date(cheque.clearedOrRejectedDate);
            if (!isNaN(d.getTime())) {
                dVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        }
        setStatusClearedDate(dVal);
        setStatusRejectDate(dVal);
        setStatusRejectReason("");
        setShowEditStatusModal(true);
    };

    const handleUpdateStatus = async () => {
        if (!isSuperAdminOrAccounts) {
            toast.error("Access Denied: Only Accounts and SuperAdmin users can edit cheque status.");
            return;
        }
        if (!statusEditingCheque) return;

        if (targetStatus === "PAID" && !statusClearedDate) {
            toast.error("Please provide a cleared date");
            return;
        }
        if (targetStatus === "REJECTED" && !statusRejectDate) {
            toast.error("Please provide a rejection date");
            return;
        }

        setIsUpdatingStatus(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                status: targetStatus,
                clearedDate: targetStatus === "PAID" ? statusClearedDate : undefined,
                rejectedDate: targetStatus === "REJECTED" ? statusRejectDate : undefined,
                reason: targetStatus === "REJECTED" ? statusRejectReason : undefined
            };

            const paymentId = statusEditingCheque.paymentId || statusEditingCheque.id;
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/update-status/${paymentId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || "Cheque status updated successfully!");
                setShowEditStatusModal(false);
                setStatusEditingCheque(null);
                fetchCheques();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to update cheque status");
            }
        } catch (error) {
            console.error("Update Status Error:", error);
            toast.error("Error updating cheque status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            centre: [],
            course: [],
            department: [],
            status: ["REJECTED"],
            startDate: "",
            endDate: "",
            chequeStartDate: "",
            chequeEndDate: ""
        });
        setSearchTerm("");
        setCurrentPage(1);
    };

    const exportToExcel = () => {
        if (cheques.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = cheques.map(c => ({
            "Cheque No": c.chequeNumber || c.transactionId || "N/A",
            "Student Name": c.studentName,
            "Admission No": c.admissionNo,
            "Bank": c.bankName,
            "Amount": c.amount,
            "Cheque Date": c.chequeDate ? new Date(c.chequeDate).toLocaleDateString('en-IN') : "N/A",
            "Cheque Deposit Date": c.depositedDate ? new Date(c.depositedDate).toLocaleDateString('en-IN') : "N/A",
            "Cleared/Rejected Date": c.clearedOrRejectedDate ? new Date(c.clearedOrRejectedDate).toLocaleDateString('en-IN') : "N/A",
            "Status": c.status,
            "Centre": c.centre,
            "Course": c.course,
            "Department": c.department,
            "Processed By": c.processedBy,
            "Remarks": c.remarks
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cheque Records");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Cheque_Records_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported successfully!");
    };




    const customStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : '#ffffff',
            borderColor: isDarkMode ? '#1f2937' : '#d1d5db',
            borderRadius: '0.75rem',
            padding: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: isDarkMode ? 'white' : '#111827',
            outline: 'none',
            '&:hover': {
                borderColor: 'rgba(59, 130, 246, 0.5)',
            }
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#131619' : '#ffffff',
            border: isDarkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            zIndex: 999
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected 
                ? '#3b82f6' 
                : state.isFocused 
                    ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                    : 'transparent',
            color: state.isSelected 
                ? 'white' 
                : state.isFocused 
                    ? '#3b82f6' 
                    : (isDarkMode ? '#9ca3af' : '#374151'),
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '10px 15px',
            '&:active': {
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
            }
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '6px',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: '#3b82f6',
            fontSize: '0.7rem',
            fontWeight: 'black',
            textTransform: 'uppercase'
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: '#3b82f6',
            '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: 'white',
            }
        }),
        input: (provided) => ({
            ...provided,
            color: isDarkMode ? 'white' : '#111827',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? 'white' : '#111827',
        }),
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = cheques.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(cheques.length / itemsPerPage) || 1;

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        } else {
            toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
        }
        setJumpToPage("");
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            Cheque Payment <span className="text-cyan-500">Records</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Comprehensive History of Rejected & Cleared Cheques
                        </p>
                    </div>

                    <div className={`border rounded-2xl p-4 shadow-md ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`} style={{ width: '480px', height: '140px' }}>
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Cheque Processing Analytics</div>
                        <ResponsiveContainer width="100%" height={90}>
                            <BarChart
                                data={[
                                    {
                                        name: 'Rejected',
                                        value: cheques.filter(c => c.status === "Rejected").length,
                                        amount: cheques.filter(c => c.status === "Rejected").reduce((sum, c) => sum + (c.amount || 0), 0),
                                        color: '#ef4444'
                                    },
                                    {
                                        name: 'Cleared',
                                        value: cheques.filter(c => c.status === "Cleared").length,
                                        amount: cheques.filter(c => c.status === "Cleared").reduce((sum, c) => sum + (c.amount || 0), 0),
                                        color: '#10b981'
                                    }
                                ]}
                                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                                    tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: '9px' }}
                                    tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                        border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: isDarkMode ? '#fff' : '#111827'
                                    }}
                                    labelStyle={{ color: isDarkMode ? '#fff' : '#111827', fontWeight: 'bold', fontSize: '10px' }}
                                    itemStyle={{ color: isDarkMode ? '#e5e7eb' : '#111827' }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    formatter={(value, name) => {
                                        if (name === 'value') return [value + ' Cheques', 'Count'];
                                        if (name === 'amount') return ['₹' + value.toLocaleString(), 'Amount'];
                                        return [value, name];
                                    }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {
                                        [
                                            { name: 'Rejected', color: '#ef4444' },
                                            { name: 'Cleared', color: '#10b981' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Filters Section */}
                <div className={`border rounded-3xl p-6 mb-8 ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900 shadow-md"}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end mb-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                            <Select
                                isMulti
                                options={metadata.centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                value={filters.centre.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("centre", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL CENTRES"
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                            <Select
                                isMulti
                                options={metadata.courses.map(c => ({ value: c.courseName, label: c.courseName }))}
                                value={filters.course.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("course", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL COURSES"
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                            <Select
                                isMulti
                                options={metadata.departments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                                value={filters.department.map(d => ({ value: d, label: d }))}
                                onChange={(selected) => handleFilterChange("department", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL DEPARTMENTS"
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Status Wise Filter</label>
                            <Select
                                isMulti
                                options={[
                                    { value: "REJECTED", label: "REJECTED" },
                                    { value: "PAID", label: "CLEARED" }
                                ]}
                                value={filters.status.map(s => ({ value: s, label: s === "PAID" ? "CLEARED" : s }))}
                                onChange={(selected) => handleFilterChange("status", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL STATUS"
                                className="react-select-container"
                                classNamePrefix="react-select"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end mb-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Processing Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Processing End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Start Date</label>
                            <input
                                type="date"
                                value={filters.chequeStartDate}
                                onChange={(e) => handleFilterChange("chequeStartDate", e.target.value)}
                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque End Date</label>
                            <input
                                type="date"
                                value={filters.chequeEndDate}
                                onChange={(e) => handleFilterChange("chequeEndDate", e.target.value)}
                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-800/50">
                        <button
                            onClick={clearFilters}
                            className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl border flex items-center justify-center gap-2 transition-all ${isDarkMode ? "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white" : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 hover:text-gray-900"}`}
                        >
                            <FaTimes /> Clear Filters
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex-1 py-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5"
                        >
                            <FaDownload /> Export Full Report
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative group mb-8">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="SEARCH BY NAME, ADMISSION NO, OR CHEQUE NUMBER..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-xl py-4 pl-12 pr-4 font-bold text-xs uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all shadow-inner ${isDarkMode ? "bg-[#131619] border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
                    />
                </div>

                {/* Table */}
                <div className={`border rounded-[2rem] overflow-hidden shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200"}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead>
                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-widest ${isDarkMode ? "bg-gray-900/50 border-gray-800" : "bg-gray-100 border-gray-200"}`}>
                                    <th className="p-6">Cheque No.</th>
                                    <th className="p-6">Student</th>
                                    <th className="p-6">Bank</th>
                                    <th className="p-6">Amount</th>
                                    <th className="p-6">Cheque Date</th>
                                    <th className="p-6">Cheque Deposit Date</th>
                                    <th className="p-6">Cleared/Rejected Date</th>
                                    <th className="p-6">Receipt</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6">Processed By</th>
                                    <th className="p-6">Remarks / Notes</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-200"}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className="p-12 text-center">
                                            <div className="animate-spin h-8 w-8 border-t-2 border-cyan-500 rounded-full mx-auto mb-4"></div>
                                            <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Records...</div>
                                        </td>
                                    </tr>
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs italic">
                                            No cheque recovery records found
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((cheque) => (
                                        <tr key={cheque.id || cheque.paymentId} className="hover:bg-cyan-500/[0.02] transition-colors group">
                                            <td className="p-6">
                                                <span className="text-cyan-500 font-black">{cheque.chequeNumber && cheque.chequeNumber !== "N/A" ? cheque.chequeNumber : (cheque.transactionId || "N/A")}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className={`font-bold uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>{cheque.studentName}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{cheque.admissionNo}</div>
                                            </td>
                                            <td className={`p-6 font-bold text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                {cheque.bankName && cheque.bankName !== "N/A" ? cheque.bankName : (cheque.accountHolderName || "N/A")}
                                            </td>
                                            <td className={`p-6 font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>₹{cheque.amount.toLocaleString()}</td>
                                            <td className={`p-6 font-bold text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "N/A"}
                                            </td>
                                            <td className={`p-6 font-bold text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                {cheque.depositedDate ? new Date(cheque.depositedDate).toLocaleDateString('en-IN') : "N/A"}
                                            </td>
                                            <td className={`p-6 font-bold text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                {cheque.clearedOrRejectedDate ? new Date(cheque.clearedOrRejectedDate).toLocaleDateString('en-IN') : "N/A"}
                                            </td>
                                            <td className="p-6">
                                                {cheque.receiptFile ? (
                                                    <a
                                                        href={cheque.receiptFile}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500 hover:text-black font-black text-[9px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5"
                                                    >
                                                        <FaRegFileAlt /> View Slip
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Not Deposited</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                                                        cheque.status === "Rejected"
                                                            ? "text-red-500 bg-red-500/10 border-red-500/20 shadow-red-500/5"
                                                            : cheque.status === "Cancelled"
                                                                ? "text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-orange-500/5"
                                                                : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5"
                                                        }`}>
                                                        {cheque.status}
                                                    </span>
                                                    {isSuperAdminOrAccounts && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditStatus(cheque)}
                                                            title="Edit Cheque Status"
                                                            className={`p-1.5 rounded-lg border transition-all ${
                                                                isDarkMode
                                                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                                                    : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white"
                                                            }`}
                                                        >
                                                            <FaEdit className="text-[10px]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`text-xs font-black uppercase italic tracking-tighter ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                    {cheque.processedBy || "N/A"}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`text-[10px] font-bold uppercase leading-relaxed max-w-[250px] ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                                    {cheque.remarks || "No additional notes"}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                {isSuperAdminOrAccounts ? (
                                                    <button
                                                        onClick={() => handleOpenEditStatus(cheque)}
                                                        className={`px-3 py-1.5 border rounded-lg font-black text-[10px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-sm ${
                                                            isDarkMode
                                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                                                : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white"
                                                        }`}
                                                        title="Change Cheque Status"
                                                    >
                                                        <FaSyncAlt className="text-[10px]" /> Status
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">---</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination UI */}
                    {!loading && cheques.length > 0 && (
                        <div className={`p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? "border-gray-800 bg-[#131619]" : "border-gray-200 bg-white"}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, cheques.length)} of {cheques.length} entries
                                </span>
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Rows per page:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className={`border rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:border-cyan-500/50 ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-300" : "bg-white border-gray-300 text-gray-700"}`}
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 font-bold text-[10px] uppercase rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Previous
                                </button>
                                <span className="text-gray-400 font-bold text-[10px] uppercase px-2">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1.5 font-bold text-[10px] uppercase rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Next
                                </button>
                                <form onSubmit={handleJumpToPage} className="flex items-center gap-2 ml-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        placeholder="PAGE"
                                        className={`w-16 border rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-cyan-500/50 text-center uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-300" : "bg-white border-gray-300 text-gray-700"}`}
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-bold text-[10px] uppercase rounded-lg hover:bg-cyan-500 hover:text-black transition-all"
                                    >
                                        Go
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit Cheque Status Modal */}
                {showEditStatusModal && statusEditingCheque && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`border w-full max-w-lg rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                            <div className={`p-8 border-b flex items-center gap-4 bg-gradient-to-r from-purple-500/10 to-transparent ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 text-xl">
                                    <FaSyncAlt />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black italic uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>Edit Cheque Status</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Update status for Cheque #{statusEditingCheque.chequeNumber || "N/A"}</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
                                {/* Cheque Summary */}
                                <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${isDarkMode ? "bg-black/30 border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Student:</span>
                                        <span className="font-black uppercase">{statusEditingCheque.studentName} ({statusEditingCheque.admissionNo || statusEditingCheque.admissionNumber})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Bank & Centre:</span>
                                        <span className="font-bold uppercase">{statusEditingCheque.bankName || "N/A"} - {statusEditingCheque.centre}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Amount:</span>
                                        <span className="font-black text-emerald-500 text-sm">₹{statusEditingCheque.amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-700/30">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Current Status:</span>
                                        <span className="font-bold uppercase text-xs text-cyan-400">{statusEditingCheque.status}</span>
                                    </div>
                                </div>

                                {/* Target Status Selection */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                                        Select New Status <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setTargetStatus("PAID")}
                                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                                                targetStatus === "PAID"
                                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black shadow-lg shadow-emerald-500/10"
                                                    : isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                                            }`}
                                        >
                                            <FaCheckCircle className="text-base" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Cleared</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTargetStatus("REJECTED")}
                                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                                                targetStatus === "REJECTED"
                                                    ? "bg-red-500/20 border-red-500 text-red-400 font-black shadow-lg shadow-red-500/10"
                                                    : isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                                            }`}
                                        >
                                            <FaExclamationTriangle className="text-base" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Rejected</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTargetStatus("PENDING_CLEARANCE")}
                                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                                                targetStatus === "PENDING_CLEARANCE"
                                                    ? "bg-amber-500/20 border-amber-500 text-amber-400 font-black shadow-lg shadow-amber-500/10"
                                                    : isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                                            }`}
                                        >
                                            <FaClock className="text-base" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Pending</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Conditional Fields based on target status */}
                                {targetStatus === "PAID" && (
                                    <div className="space-y-3 pt-2">
                                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">
                                            Cleared Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={statusClearedDate}
                                            onChange={(e) => setStatusClearedDate(e.target.value)}
                                            className={`w-full border rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                        />
                                        <p className="text-[9px] text-gray-500 uppercase italic">Cheque will be marked Cleared/Paid and financial balance adjusted.</p>
                                    </div>
                                )}

                                {targetStatus === "REJECTED" && (
                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">
                                                Rejection Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={statusRejectDate}
                                                onChange={(e) => setStatusRejectDate(e.target.value)}
                                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:border-red-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">
                                                Reason for Rejection / Bounce
                                            </label>
                                            <textarea
                                                value={statusRejectReason}
                                                onChange={(e) => setStatusRejectReason(e.target.value)}
                                                placeholder="e.g. Insufficient Funds, Signature Mismatch, Customer stopped payment..."
                                                className={`w-full border rounded-xl p-3 font-bold text-xs uppercase tracking-wider outline-none focus:border-red-500/50 transition-all min-h-[80px] resize-none ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {targetStatus === "PENDING_CLEARANCE" && (
                                    <div className={`p-4 rounded-xl border text-xs text-amber-500/90 font-bold uppercase leading-relaxed ${isDarkMode ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                                        ℹ Note: Reverting this cheque to "Pending Clearance" will reset clearance/rejection records and place it back into the pending processing queue.
                                    </div>
                                )}
                            </div>

                            <div className={`p-8 border-t flex gap-4 ${isDarkMode ? "border-gray-800 bg-black/40" : "border-gray-200 bg-gray-50"}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditStatusModal(false);
                                        setStatusEditingCheque(null);
                                    }}
                                    disabled={isUpdatingStatus}
                                    className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdateStatus}
                                    disabled={isUpdatingStatus}
                                    className="flex-1 py-3 bg-purple-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUpdatingStatus ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        "Update Status"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CancelChequePayment;
