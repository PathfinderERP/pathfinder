import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaCalendarAlt, FaHistory, FaCheck, FaTimes, FaSpinner, FaPlus, FaClock, FaBriefcase, FaHome, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-toastify";

const MyRegularization = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [employeeId, setEmployeeId] = useState(null);

    const [formData, setFormData] = useState({
        date: "",
        type: "On Duty",
        reason: "",
        fromTime: "",
        toTime: ""
    });

    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchEmployeeProfile();
    }, []);

    useEffect(() => {
        if (employeeId) {
            fetchRequests();
        }
    }, [employeeId]);

    const fetchEmployeeProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployeeId(data._id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations?employeeId=${employeeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ...formData, employeeId })
            });

            if (response.ok) {
                toast.success("Request submitted successfully");
                setFormData({ date: "", type: "On Duty", reason: "", fromTime: "", toTime: "" });
                setShowForm(false);
                fetchRequests();
            } else {
                toast.error("Failed to submit request");
            }
        } catch (error) {
            toast.error("Error submitting request");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout activePage="Employee Center">
            <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <FaHistory className="text-blue-500" /> My Regularizations
                        </h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Correct your attendance records</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <FaPlus className={`${showForm ? 'rotate-45' : ''} transition-transform`} />
                        {showForm ? 'Close Form' : 'New Request'}
                    </button>
                </div>

                {/* Submission Form */}
                {showForm && (
                    <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 animate-slide-in-top">
                        <h2 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">Submit Correction Request</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Regularization Type</label>
                                    <div className="relative">
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors appearance-none"
                                        >
                                            <option value="On Duty">On Duty (Field Work)</option>
                                            <option value="Missed Punch">Missed Punch (Forgot)</option>
                                            <option value="Work From Home">Work From Home</option>
                                            <option value="Late Login / Early Logout">Late Login / Early Logout</option>
                                            <option value="Other">Other Reason</option>
                                        </select>
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                            {formData.type === 'On Duty' && <FaBriefcase />}
                                            {formData.type === 'Missed Punch' && <FaClock />}
                                            {formData.type === 'Work From Home' && <FaHome />}
                                            {(formData.type === 'Other' || formData.type === 'Late Login / Early Logout') && <FaExclamationCircle />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">From Time</label>
                                    <input
                                        type="time"
                                        value={formData.fromTime}
                                        onChange={(e) => setFormData({ ...formData, fromTime: e.target.value })}
                                        class="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">To Time</label>
                                    <input
                                        type="time"
                                        value={formData.toTime}
                                        onChange={(e) => setFormData({ ...formData, toTime: e.target.value })}
                                        class="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reason / Description</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Explain why you need regularization (e.g. 'Visited Client X, returned late')..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Request List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-gray-800 dark:text-gray-400 uppercase tracking-wider pl-1">Request History</h2>

                    {loading ? (
                        <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-500 text-4xl" /></div>
                    ) : requests.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {requests.map(req => (
                                <div key={req._id} className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 p-3 rounded-xl ${req.type === 'On Duty' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' :
                                            req.type === 'Missed Punch' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                                                'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                            }`}>
                                            {req.type === 'On Duty' ? <FaBriefcase /> : req.type === 'Missed Punch' ? <FaClock /> : <FaExclamationCircle />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-lg font-black text-gray-800 dark:text-white">{new Date(req.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${req.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                                                    req.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                                                        'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{req.type}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                                "{req.reason}"
                                            </p>
                                            {req.fromTime && req.toTime && (
                                                <p className="mt-1 text-xs font-mono text-gray-500">
                                                    Requested Time: {req.fromTime} - {req.toTime}
                                                </p>
                                            )}
                                            {req.reviewRemark && (
                                                <div className="mt-2 text-xs text-gray-400">
                                                    <span className="font-bold uppercase text-gray-500">Admin Remark:</span> {req.reviewRemark}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white dark:bg-[#1a1f24] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <FaHistory className="mx-auto text-gray-300 text-4xl mb-3" />
                            <p className="text-gray-500 font-bold uppercase text-xs">No regularization history</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MyRegularization;
