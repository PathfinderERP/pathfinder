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
    const [selectedCheque, setSelectedCheque] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [showModal, setShowModal] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCancelCheque = hasPermission(user, 'financeFees', 'cancelCheque', 'delete');

    // State for cheques
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        department: []
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
        setFilters({ centre: [], course: [], department: [] });
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
            "Date": new Date(c.chequeDate).toLocaleDateString(),
            "Status": c.status,
            "Centre": c.centre,
            "Course": c.course,
            "Department": c.department
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cancelled Cheques");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Cheque_Cancellation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported successfully!");
    };



    const handleCancelClick = (cheque) => {
        setSelectedCheque(cheque);
        setShowModal(true);
    };

    const handleCancelConfirm = async () => {
        if (!cancelReason.trim()) {
            toast.error("Please provide a cancellation reason");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/cheque/cancel/${selectedCheque.paymentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason: cancelReason })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to cancel cheque");
            }

            toast.success(`Cheque ${selectedCheque.chequeNumber} cancelled successfully`);
            setShowModal(false);
            setCancelReason("");
            setSelectedCheque(null);
            fetchCheques(); // Refresh list
        } catch (error) {
            console.error("Cancel Error:", error);
            toast.error(error.message);
        }
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
                borderColor: 'rgba(239, 68, 68, 0.5)',
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
            backgroundColor: state.isFocused ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            color: state.isFocused ? '#ef4444' : '#9ca3af',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '10px 15px',
            '&:active': {
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
            }
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: '#ef4444',
            fontSize: '0.7rem',
            fontWeight: 'black',
            textTransform: 'uppercase'
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: '#ef4444',
            '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
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
                            Cancel Cheque <span className="text-red-500">Payment</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Process Cheque Cancellations & Refunds
                        </p>
                    </div>

                    <div className="bg-[#131619] border border-gray-800 rounded-2xl p-4" style={{ width: '480px', height: '140px' }}>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Cheque Analytics</div>
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
                                        name: 'Pending',
                                        value: cheques.filter(c => c.status === "Pending").length,
                                        amount: cheques.filter(c => c.status === "Pending").reduce((sum, c) => sum + (c.amount || 0), 0),
                                        color: '#f59e0b'
                                    },
                                    {
                                        name: 'Cancelled',
                                        value: cheques.filter(c => c.status === "Cancelled" || c.status === "Rejected").length,
                                        amount: cheques.filter(c => c.status === "Cancelled" || c.status === "Rejected").reduce((sum, c) => sum + (c.amount || 0), 0),
                                        color: '#ef4444'
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
                                            { name: 'Pending', color: '#f59e0b' },
                                            { name: 'Cancelled', color: '#ef4444' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Warning Banner */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
                    <FaExclamationTriangle className="text-red-500 text-2xl flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="text-red-500 font-black uppercase text-sm mb-2">Important Notice</h3>
                        <p className="text-gray-400 text-sm">
                            Cancelling a cheque payment is irreversible. Please ensure you have verified all details before proceeding with the cancellation.
                        </p>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-[#131619] border border-gray-800 rounded-3xl p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-1">
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
                        <div className="lg:col-span-1">
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
                        <div className="lg:col-span-1">
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
                        <div className="lg:col-span-1">
                            <button
                                onClick={clearFilters}
                                className="w-full py-3 bg-gray-800 text-gray-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 hover:text-white transition-all border border-gray-700 flex items-center justify-center gap-2"
                            >
                                <FaTimes /> Clear Filters
                            </button>
                        </div>
                        <div className="lg:col-span-1">
                            <button
                                onClick={exportToExcel}
                                className="w-full py-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2"
                            >
                                <FaDownload /> Export Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative group mb-8">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="SEARCH BY NAME, ADMISSION NO, OR CHEQUE NUMBER..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#131619] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-wider outline-none focus:border-red-500/50 transition-all"
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
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="animate-spin h-8 w-8 border-t-2 border-red-500 rounded-full mx-auto mb-4"></div>
                                        <div className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Cheques...</div>
                                    </td>
                                </tr>
                            ) : cheques.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                        No cheques found
                                    </td>
                                </tr>
                            ) : (
                                cheques.map((cheque) => (
                                    <tr key={cheque.id} className="hover:bg-red-500/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <span className="text-cyan-500 font-black">{cheque.chequeNumber}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-white">{cheque.studentName}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">{cheque.admissionNo}</div>
                                        </td>
                                        {/* Display Bank Name if available, otherwise Account Holder */}
                                        <td className="p-6 text-gray-300">
                                            {cheque.bankName && cheque.bankName !== "N/A" ? cheque.bankName : (cheque.accountHolderName || "N/A")}
                                        </td>
                                        <td className="p-6 text-white font-bold">₹{cheque.amount.toLocaleString()}</td>
                                        <td className="p-6 text-gray-300">{new Date(cheque.chequeDate).toLocaleDateString('en-IN')}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${cheque.status === "Pending"
                                                ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
                                                : cheque.status === "Cleared"
                                                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                                    : "text-red-500 bg-red-500/10 border-red-500/20" // Default/Cancelled
                                                }`}>
                                                {cheque.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            {canCancelCheque && cheque.status !== "Cancelled" && (
                                                <button
                                                    onClick={() => handleCancelClick(cheque)}
                                                    className="px-4 py-2 bg-red-500/10 text-red-500 font-bold text-xs uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 ml-auto"
                                                >
                                                    <FaBan /> Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Cancel Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#131619] w-full max-w-2xl rounded-[2rem] shadow-2xl border border-gray-800 overflow-hidden">
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                        <FaBan size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Cancel Cheque Payment</h2>
                                        <p className="text-gray-500 text-xs uppercase tracking-widest">Cheque #{selectedCheque?.chequeNumber}</p>
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded-2xl p-6 mb-6">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Student</span>
                                            <span className="text-white font-bold">{selectedCheque?.studentName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Amount</span>
                                            <span className="text-white font-bold">₹{selectedCheque?.amount.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Bank</span>
                                            <span className="text-white font-bold">{selectedCheque?.bankName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Status</span>
                                            <span className="text-white font-bold">{selectedCheque?.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">
                                        Cancellation Reason *
                                    </label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white text-sm min-h-[120px] outline-none focus:border-red-500/50 transition-all resize-none"
                                        placeholder="Enter the reason for cancelling this cheque payment..."
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            setCancelReason("");
                                            setSelectedCheque(null);
                                        }}
                                        className="flex-1 py-4 bg-gray-800 text-gray-300 font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-gray-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCancelConfirm}
                                        className="flex-1 py-4 bg-red-500 text-white font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Confirm Cancellation
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CancelChequePayment;
