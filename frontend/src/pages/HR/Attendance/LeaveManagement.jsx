import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaSearch, FaFilter, FaCheck, FaTimes, FaSpinner, FaFileDownload, FaEye, FaPlus, FaCalendarAlt, FaUserEdit } from "react-icons/fa";
import { toast } from "react-toastify";

const LeaveManagement = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        employeeId: "",
        status: "",
        startDate: "",
        endDate: ""
    });
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewData, setReviewData] = useState({ status: "Approved", remark: "" });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/leave-requests?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            toast.error("Failed to load leave requests");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/leave-requests/${selectedRequest._id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: reviewData.status,
                    reviewRemark: reviewData.remark
                })
            });

            if (response.ok) {
                toast.success(`Request ${reviewData.status.toLowerCase()}`);
                setShowStatusModal(false);
                fetchRequests();
            }
        } catch (error) {
            toast.error("Error updating status");
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
                {/* Header & Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leave Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Review and manage employee leave applications</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm border dark:border-gray-700">
                            <FaFileDownload /> Export to Excel
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                        <div className="space-y-1.5 font-medium">
                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Search Employee</label>
                            <input type="text" value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl text-sm" placeholder="Employee ID or Name..." />
                        </div>
                        <div className="space-y-1.5 font-medium">
                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">From Date</label>
                            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5 font-medium">
                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">To Date</label>
                            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1.5 font-medium">
                            <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Status</label>
                            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl text-sm">
                                <option value="">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={fetchRequests} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm">Search</button>
                            <button onClick={() => { setFilters({ employeeId: "", status: "", startDate: "", endDate: "" }); fetchRequests(); }} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-gray-200 font-bold text-sm">Reset</button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Sl No.</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Employee Details</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Leave Type</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Date Range</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase text-center">Days</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="7" className="px-6 py-10 text-center"><FaSpinner className="animate-spin mx-auto text-blue-600" size={30} /></td></tr>
                                ) : requests.length > 0 ? (
                                    requests.map((request, index) => (
                                        <tr key={request._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-medium text-gray-500">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                                        {request.employee?.profileImage && !request.employee.profileImage.startsWith('undefined/') ? (
                                                            <img src={request.employee.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-blue-500">{request.employee?.name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{request.employee?.name || "N/A"}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold">{request.employee?.employeeId || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg">{request.leaveType?.name}</span>
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
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(request.status)}`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => { setSelectedRequest(request); setReviewData({ status: "Approved", remark: "" }); setShowStatusModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                                                        <FaUserEdit size={14} />
                                                    </button>
                                                    {request.documentUrl && (
                                                        <button onClick={() => window.open(request.documentUrl, '_blank')} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg">
                                                            <FaEye size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-500 text-sm italic">No leave applications found matching your criteria</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Approval Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1a1f24] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tight">Review Application</h2>
                            <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <FaPlus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleStatusUpdate} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Update Status</label>
                                    <div className="flex gap-3">
                                        {['Approved', 'Rejected'].map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setReviewData({ ...reviewData, status: s })}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${reviewData.status === s
                                                    ? (s === 'Approved' ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white')
                                                    : 'border-gray-100 dark:border-gray-800 text-gray-500'
                                                    }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Admin Remarks (Optional)</label>
                                    <textarea
                                        rows="3"
                                        value={reviewData.remark}
                                        onChange={(e) => setReviewData({ ...reviewData, remark: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm resize-none"
                                        placeholder="Add a remark for the employee..."
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowStatusModal(false)} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold border dark:border-gray-700">Dismiss</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20">Submit Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default LeaveManagement;
