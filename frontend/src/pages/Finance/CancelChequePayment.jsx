import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaBan, FaUndo, FaExclamationTriangle, FaFilter, FaDownload, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Select from "react-select";
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

import { useTheme } from "../../context/ThemeContext";

const CancelChequePayment = () => {
    const { isDarkMode } = useTheme();
    const [searchTerm, setSearchTerm] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // State for cheques
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        department: [],
        status: [],
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

            // Filter centres based on user's authorized centres
            const filteredCentres = Array.isArray(centres)
                ? centres.filter(c =>
                    user.role === 'superAdmin' || user.role === 'Super Admin' ||
                    (user.centres && user.centres.some(uc => uc._id === c._id || (uc.centreName && c.centreName && uc.centreName.trim() === c.centreName.trim())))
                )
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

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            centre: [],
            course: [],
            department: [],
            status: [],
            startDate: "",
            endDate: "",
            chequeStartDate: "",
            chequeEndDate: ""
        });
        setSearchTerm("");
    };

    const exportToExcel = () => {
        if (cheques.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = cheques.map(c => ({
            "Cheque No": c.chequeNumber,
            "Student Name": c.studentName,
            "Admission No": c.admissionNo,
            "Bank": c.bankName,
            "Amount": c.amount,
            "Cheque Date": c.chequeDate ? new Date(c.chequeDate).toLocaleDateString('en-IN') : "N/A",
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
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
            borderColor: state.isFocused ? 'rgba(6, 182, 212, 0.5)' : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'),
            borderRadius: '0.75rem',
            padding: '4px',
            fontSize: '10px',
            fontWeight: 'black',
            color: isDarkMode ? 'white' : '#111827',
            outline: 'none',
            boxShadow: 'none',
            '&:hover': {
                borderColor: 'rgba(6, 182, 212, 0.3)',
            }
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            zIndex: 999
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
            color: state.isFocused ? '#06b6d4' : (isDarkMode ? '#9ca3af' : '#4b5563'),
            fontSize: '10px',
            fontWeight: 'black',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '10px 15px',
            '&:active': {
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
            }
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '6px',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: '#06b6d4',
            fontSize: '9px',
            fontWeight: 'black',
            textTransform: 'uppercase'
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: '#06b6d4',
            '&:hover': {
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                color: 'white',
            }
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? '#4b5563' : '#9ca3af',
            textTransform: 'uppercase'
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

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header */}
                <div className="mb-10 flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                    <div className="flex-1">
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Cheque <span className="text-cyan-500">Archives</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">
                            Authorized historical mapping of instruments: Cleared, Rejected & Revoked status
                        </p>
                    </div>

                    <div className={`rounded-[2rem] border p-6 transition-all duration-300 shadow-2xl flex-shrink-0 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`} style={{ width: '500px', height: '160px' }}>
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                            Historical instrument Analytics
                        </div>
                        <ResponsiveContainer width="100%" height={100}>
                            <BarChart
                                data={[
                                    {
                                        name: 'Cleared',
                                        value: cheques.filter(c => c.status === "Cleared").length,
                                        color: '#10b981'
                                    },
                                    {
                                        name: 'Rejected',
                                        value: cheques.filter(c => c.status === "Rejected").length,
                                        color: '#ef4444'
                                    },
                                    {
                                        name: 'Cancelled',
                                        value: cheques.filter(c => c.status === "Cancelled").length,
                                        color: '#f97316'
                                    }
                                ]}
                                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1f2937" : "#f1f5f9"} vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    style={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase' }}
                                    tick={{ fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: '8px', fontWeight: 'black' }}
                                    tick={{ fill: '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
                                        border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: 'black',
                                        color: isDarkMode ? '#fff' : '#111827',
                                        textTransform: 'uppercase',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ color: '#06b6d4' }}
                                    cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                    {
                                        [
                                            { name: 'Cleared', color: '#10b981' },
                                            { name: 'Rejected', color: '#ef4444' },
                                            { name: 'Cancelled', color: '#f97316' }
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
                <div className={`border rounded-[2.5rem] p-10 mb-10 transition-all duration-300 shadow-2xl ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Entity (Centre)</label>
                            <Select
                                isMulti
                                options={metadata.centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                value={filters.centre.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("centre", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL ENTITIES"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Academic Stream</label>
                            <Select
                                isMulti
                                options={metadata.courses.map(c => ({ value: c.courseName, label: c.courseName }))}
                                value={filters.course.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("course", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL STREAMS"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Division</label>
                            <Select
                                isMulti
                                options={metadata.departments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                                value={filters.department.map(d => ({ value: d, label: d }))}
                                onChange={(selected) => handleFilterChange("department", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL DIVISIONS"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Historical Status</label>
                            <Select
                                isMulti
                                options={[
                                    { value: "PAID", label: "CLEARED" },
                                    { value: "REJECTED", label: "REJECTED" },
                                    { value: "CANCELLED", label: "CANCELLED" }
                                ]}
                                value={filters.status.map(s => ({ value: s, label: s === "PAID" ? "CLEARED" : s }))}
                                onChange={(selected) => handleFilterChange("status", selected ? selected.map(s => s.value) : [])}
                                styles={customStyles}
                                placeholder="ALL STATUS MAPS"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Processing Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-cyan-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Processing End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-cyan-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Cheque Issued Start</label>
                            <input
                                type="date"
                                value={filters.chequeStartDate}
                                onChange={(e) => handleFilterChange("chequeStartDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-cyan-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Cheque Issued End</label>
                            <input
                                type="date"
                                value={filters.chequeEndDate}
                                onChange={(e) => handleFilterChange("chequeEndDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-cyan-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                    </div>
                    
                    <div className={`flex flex-col md:flex-row gap-6 pt-10 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <button
                            onClick={clearFilters}
                            className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all border flex items-center justify-center gap-3 active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-500 border-gray-800 hover:text-white hover:bg-white/10 hover:border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:text-gray-900'}`}
                        >
                            <FaTimes size={12} /> Reset Parameters
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <FaDownload size={12} /> Export Intelligence Report
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative group mb-10">
                    <FaSearch className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-500 ${isDarkMode ? 'text-gray-700 group-focus-within:text-cyan-500' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                    <input
                        type="text"
                        placeholder="TRACING BY IDENTITY, ADMISSION SEQUENCE, OR INSTRUMENT NUMBER..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-3xl py-5 pl-16 pr-6 font-black text-[11px] uppercase tracking-[0.2em] outline-none focus:border-cyan-500/50 transition-all duration-500 shadow-2xl ${isDarkMode ? 'bg-white/5 border-gray-800 text-white placeholder:text-gray-700' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}
                    />
                </div>

                {/* Table */}
                <div className={`border rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead>
                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <th className="p-8">Instrument No.</th>
                                    <th className="p-8">Entity Details</th>
                                    <th className="p-8">Financial Node (Bank)</th>
                                    <th className="p-8">Asset Value</th>
                                    <th className="p-8">Issue Date</th>
                                    <th className="p-8">Process Date</th>
                                    <th className="p-8 text-center">Protocol Status</th>
                                    <th className="p-8">Authorized By</th>
                                    <th className="p-8 text-right">Audit Remarks</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse">Retrieving Archival Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : cheques.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="p-32 text-center text-gray-600 font-black uppercase tracking-[0.4em] italic text-xs">
                                            No matched records in archival nodes
                                        </td>
                                    </tr>
                                ) : (
                                    cheques.map((cheque) => (
                                        <tr key={cheque.id || cheque.paymentId} className={`transition-all group ${isDarkMode ? 'hover:bg-cyan-500/[0.02] bg-transparent' : 'hover:bg-cyan-500/[0.02] bg-white'}`}>
                                            <td className="p-8">
                                                <span className="text-cyan-500 font-black font-mono text-base tracking-widest leading-none"># {cheque.chequeNumber}</span>
                                            </td>
                                            <td className="p-8">
                                                <div className={`font-black uppercase italic tracking-tighter text-base leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cheque.studentName}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-black mt-1.5 tracking-widest italic">{cheque.admissionNo}</div>
                                            </td>
                                            <td className={`p-8 font-black text-[11px] uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {cheque.bankName && cheque.bankName !== "N/A" ? cheque.bankName : (cheque.accountHolderName || "UNDEFINED_NODE")}
                                            </td>
                                            <td className={`p-8 font-black text-2xl tracking-tighter italic tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{cheque.amount.toLocaleString()}</td>
                                            <td className={`p-8 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "N/A"}
                                            </td>
                                            <td className={`p-8 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {cheque.clearedOrRejectedDate ? new Date(cheque.clearedOrRejectedDate).toLocaleDateString('en-IN') : "---"}
                                            </td>
                                            <td className="p-8 text-center">
                                                <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
                                                    cheque.status === "Rejected"
                                                        ? "text-red-500 bg-red-500/10 border-red-500/20"
                                                        : cheque.status === "Cancelled"
                                                            ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                                                            : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                                    }`}>
                                                    {cheque.status}
                                                </span>
                                            </td>
                                            <td className="p-8">
                                                <div className={`text-[10px] font-black uppercase italic tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {cheque.processedBy || "SYSTEM_NODE"}
                                                </div>
                                            </td>
                                            <td className="p-8 text-right">
                                                <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-relaxed max-w-[300px] ml-auto italic">
                                                    {cheque.remarks || "No supplementary notes"}
                                                </div>
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

export default CancelChequePayment;
