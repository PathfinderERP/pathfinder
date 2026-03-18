import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaBan, FaUndo, FaExclamationTriangle, FaFilter, FaDownload, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
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

const CancelChequePayment = () => {
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
                departments: Array.isArray(depts) ? depts : []
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
            "Cleared/Rejected Date": c.processedDate ? new Date(c.processedDate).toLocaleDateString('en-IN') : "N/A",
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
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderColor: '#1f2937',
            borderRadius: '0.75rem',
            padding: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: 'white',
            outline: 'none',
            '&:hover': {
                borderColor: 'rgba(59, 130, 246, 0.5)',
            }
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: '#131619',
            border: '1px solid #1f2937',
            borderRadius: '0.75rem',
            zIndex: 999
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: state.isFocused ? '#3b82f6' : '#9ca3af',
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
            color: 'white',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: 'white',
        }),
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                            Cheque Payment <span className="text-cyan-500">Records</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Comprehensive History of Cleared, Rejected & Cancelled Cheques
                        </p>
                    </div>

                    <div className="bg-[#131619] border border-gray-800 rounded-2xl p-4" style={{ width: '480px', height: '140px' }}>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Cheque Processing Analytics</div>
                        <ResponsiveContainer width="100%" height={90}>
                            <BarChart
                                data={[
                                    {
                                        name: 'Cleared',
                                        value: cheques.filter(c => c.status === "Cleared").length,
                                        amount: cheques.filter(c => c.status === "Cleared").reduce((sum, c) => sum + (c.amount || 0), 0),
                                        color: '#10b981'
                                    },
                                    {
                                        name: 'Rejected',
                                        value: cheques.filter(c => c.status === "Rejected").length,
                                        amount: cheques.filter(c => c.status === "Rejected").reduce((sum, c) => sum + (c.amount || 0), 0),
                                        color: '#ef4444'
                                    },
                                    {
                                        name: 'Cancelled',
                                        value: cheques.filter(c => c.status === "Cancelled").length,
                                        amount: cheques.filter(c => c.status === "Cancelled").reduce((sum, c) => sum + (c.amount || 0), 0),
                                        color: '#f97316'
                                    }
                                ]}
                                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                                    tick={{ fill: '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    style={{ fontSize: '9px' }}
                                    tick={{ fill: '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}
                                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}
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
                <div className="bg-[#131619] border border-gray-800 rounded-3xl p-6 mb-8">
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
                                    { value: "PAID", label: "CLEARED" },
                                    { value: "REJECTED", label: "REJECTED" },
                                    { value: "CANCELLED", label: "CANCELLED" }
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
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-gray-400 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Processing End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-gray-400 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Start Date</label>
                            <input
                                type="date"
                                value={filters.chequeStartDate}
                                onChange={(e) => handleFilterChange("chequeStartDate", e.target.value)}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-gray-400 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque End Date</label>
                            <input
                                type="date"
                                value={filters.chequeEndDate}
                                onChange={(e) => handleFilterChange("chequeEndDate", e.target.value)}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-gray-400 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all uppercase"
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-800/50">
                        <button
                            onClick={clearFilters}
                            className="flex-1 py-3 bg-gray-800 text-gray-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 hover:text-white transition-all border border-gray-700 flex items-center justify-center gap-2"
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
                        className="w-full bg-[#131619] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                    />
                </div>

                {/* Table */}
                <div className="bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="p-6">Cheque No.</th>
                                <th className="p-6">Student</th>
                                <th className="p-6">Bank</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Cheque Date</th>
                                <th className="p-6">Cleared/Rejected Date</th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6">Processed By</th>
                                <th className="p-6 text-right w-1/5">Remarks / Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center">
                                        <div className="animate-spin h-8 w-8 border-t-2 border-cyan-500 rounded-full mx-auto mb-4"></div>
                                        <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Records...</div>
                                    </td>
                                </tr>
                            ) : cheques.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs italic">
                                        No cheque recovery records found
                                    </td>
                                </tr>
                            ) : (
                                cheques.map((cheque) => (
                                    <tr key={cheque.id || cheque.paymentId} className="hover:bg-cyan-500/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <span className="text-cyan-500 font-black">{cheque.chequeNumber}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-white uppercase">{cheque.studentName}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{cheque.admissionNo}</div>
                                        </td>
                                        <td className="p-6 text-gray-300 font-bold text-xs">
                                            {cheque.bankName && cheque.bankName !== "N/A" ? cheque.bankName : (cheque.accountHolderName || "N/A")}
                                        </td>
                                        <td className="p-6 text-white font-black">₹{cheque.amount.toLocaleString()}</td>
                                        <td className="p-6 text-gray-300 font-bold text-xs">
                                            {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "N/A"}
                                        </td>
                                        <td className="p-6 text-gray-300 font-bold text-xs">
                                            {cheque.processedDate ? new Date(cheque.processedDate).toLocaleDateString('en-IN') : "N/A"}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                                                cheque.status === "Rejected"
                                                    ? "text-red-500 bg-red-500/10 border-red-500/20 shadow-red-500/5"
                                                    : cheque.status === "Cancelled"
                                                        ? "text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-orange-500/5"
                                                        : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5"
                                                }`}>
                                                {cheque.status}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-gray-300 text-xs font-black uppercase italic tracking-tighter">
                                                {cheque.processedBy || "N/A"}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="text-gray-400 text-[10px] font-bold uppercase leading-relaxed max-w-[200px] ml-auto">
                                                {cheque.remarks || "No additional notes"}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default CancelChequePayment;
