import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaPlus, FaSpinner, FaCalendarAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import usePermission from "../../../hooks/usePermission";
import { useTheme } from "../../../context/ThemeContext";

const LeaveRequest = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        leaveType: "",
        startDate: "",
        endDate: "",
        days: 0,
        reason: ""
    });

    const canCreate = usePermission('employeeCenter', 'leaveManagement', 'create');

    useEffect(() => {
        fetchLeaveTypes();
        fetchMyRequests();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/leave-types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLeaveTypes(data);
            }
        } catch (error) {
            console.error("Error fetching leave types:", error);
        }
    };

    const fetchMyRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/leave-requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMyRequests(data);
            }
        } catch (error) {
            toast.error("Failed to load leave requests");
        } finally {
            setLoading(false);
        }
    };

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            const days = calculateDays(formData.startDate, formData.endDate);
            setFormData(prev => ({ ...prev, days }));
        }
    }, [formData.startDate, formData.endDate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/leave-requests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success("Leave request submitted successfully");
                setShowModal(false);
                setFormData({ leaveType: "", startDate: "", endDate: "", days: 0, reason: "" });
                fetchMyRequests();
            } else {
                toast.error("Failed to submit leave request");
            }
        } catch (error) {
            toast.error("Error submitting request");
        }
    };

    const getStatusColor = (status) => {
        if (isDarkMode) {
            switch (status) {
                case 'Approved': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                case 'Rejected': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                default: return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            }
        } else {
            switch (status) {
                case 'Approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                case 'Rejected': return 'bg-rose-50 text-rose-700 border border-rose-200';
                default: return 'bg-amber-50 text-amber-700 border border-amber-200';
            }
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            My Leave <span className="text-blue-600">Requests</span>
                        </h1>
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Apply for leave and track your requests
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-black text-[10px] uppercase tracking-widest active:scale-95"
                        >
                            <FaPlus size={12} /> Apply for Leave
                        </button>
                    )}
                </div>

                {/* Leave Balance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {leaveTypes.slice(0, 3).map((type, idx) => {
                        const accents = ['text-blue-600', 'text-emerald-600', 'text-violet-600'];
                        const bgs = [
                            isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100',
                            isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100',
                            isDarkMode ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-100',
                        ];
                        return (
                            <div
                                key={type._id}
                                className={`p-6 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                            >
                                <div className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 border ${bgs[idx % 3]} ${accents[idx % 3]}`}>
                                    {type.name}
                                </div>
                                <p className={`text-4xl font-black tracking-tighter ${accents[idx % 3]}`}>{type.days}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Days Available
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Requests Table */}
                <div className={`rounded-2xl border overflow-hidden transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'} uppercase text-[9px] font-black tracking-widest`}>
                                    <th className="px-6 py-4">Leave Type</th>
                                    <th className="px-6 py-4">Date Range</th>
                                    <th className="px-6 py-4 text-center">Days</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Remark</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center">
                                            <FaSpinner className="animate-spin mx-auto text-blue-600" size={28} />
                                        </td>
                                    </tr>
                                ) : myRequests.length > 0 ? (
                                    myRequests.map((request) => (
                                        <tr
                                            key={request._id}
                                            className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-lg border ${isDarkMode ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>
                                                    {request.leaveType?.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    <FaCalendarAlt className="opacity-40" />
                                                    <span>{new Date(request.startDate).toLocaleDateString()}</span>
                                                    <span className="opacity-40">—</span>
                                                    <span>{new Date(request.endDate).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-lg font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {request.days}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-xs font-medium max-w-[200px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {request.reason}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(request.status)}`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {request.reviewRemark || "—"}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className={`px-6 py-16 text-center text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`}>
                                            No leave requests found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Apply Leave Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        {/* Modal Header */}
                        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <div>
                                <h2 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Apply for Leave</h2>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Submit a new leave request</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-500 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
                            >
                                <FaPlus size={16} className="rotate-45" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Leave Type *</label>
                                <select
                                    required
                                    value={formData.leaveType}
                                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                    className={`w-full px-4 py-3 border rounded-xl outline-none text-sm font-medium transition-colors focus:border-blue-500 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                >
                                    <option value="">Select Leave Type</option>
                                    {leaveTypes.map(type => (
                                        <option key={type._id} value={type._id}>{type.name} ({type.days} days)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className={`w-full px-4 py-3 border rounded-xl outline-none text-sm font-medium transition-colors focus:border-blue-500 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>End Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        min={formData.startDate}
                                        className={`w-full px-4 py-3 border rounded-xl outline-none text-sm font-medium transition-colors focus:border-blue-500 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                <p className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                    Total Days: <span className="text-2xl">{formData.days}</span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reason *</label>
                                <textarea
                                    rows="3"
                                    required
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className={`w-full px-4 py-3 border rounded-xl outline-none text-sm font-medium transition-colors resize-none focus:border-blue-500 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    placeholder="Reason for leave..."
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                                >
                                    Submit Leave Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default LeaveRequest;
