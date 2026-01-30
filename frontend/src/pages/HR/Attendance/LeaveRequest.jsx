import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaPlus, FaSpinner, FaCalendarAlt, FaFileUpload, FaEye, FaHistory } from "react-icons/fa";
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

    // Check if user has create permission
    // Updated to use employeeCenter module as per new granular permissions
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
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400';
            case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Leave Requests</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Apply for leave and track your requests</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-bold text-sm"
                        >
                            <FaPlus size={14} /> Apply for Leave
                        </button>
                    )}
                </div>

                {/* Leave Balance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {leaveTypes.slice(0, 3).map(type => (
                        <div key={type._id} className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">{type.name}</h3>
                            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{type.days}</p>
                            <p className="text-xs text-gray-500 mt-1">Days Available</p>
                        </div>
                    ))}
                </div>

                {/* Requests Table */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Leave Type</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Date Range</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase text-center">Days</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Reason</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center"><FaSpinner className="animate-spin mx-auto text-blue-600" size={30} /></td></tr>
                                ) : myRequests.length > 0 ? (
                                    myRequests.map((request) => (
                                        <tr key={request._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg">
                                                    {request.leaveType?.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                    <FaCalendarAlt className="opacity-40" />
                                                    <span>{new Date(request.startDate).toLocaleDateString()}</span>
                                                    <span>-</span>
                                                    <span>{new Date(request.endDate).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-bold text-gray-800 dark:text-white">{request.days}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                                                {request.reason}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(request.status)}`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                                                {request.reviewRemark || "-"}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500 text-sm italic">No leave requests found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Apply Leave Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#2a3038] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Apply for Leave</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <FaPlus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Leave Type *</label>
                                <select
                                    required
                                    value={formData.leaveType}
                                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white text-sm"
                                >
                                    <option value="">Select Leave Type</option>
                                    {leaveTypes.map(type => (
                                        <option key={type._id} value={type._id}>{type.name} ({type.days} days)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        min={formData.startDate}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white text-sm"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg">
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    Total Days: {formData.days}
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Reason *</label>
                                <textarea
                                    rows="3"
                                    required
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white text-sm resize-none"
                                    placeholder="Reason for leave..."
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-600/20"
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
