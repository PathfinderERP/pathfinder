import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaCheckCircle, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PreviousClass = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Feedback State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedClassForFeedback, setSelectedClassForFeedback] = useState(null);
    const [feedbackData, setFeedbackData] = useState({
        feedbackName: "",
        feedbackContent: "",
        feedbackRating: ""
    });

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchClasses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page,
                limit,
                status: "Completed",
                search
            });

            const response = await fetch(`${API_URL}/academics/class-schedule/list?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setClasses(data.classes);
                setTotalPages(data.totalPages);
                setTotalRecords(data.total);
            } else {
                toast.error(data.message || "Failed to fetch previous classes");
            }
        } catch (error) {
            toast.error("Error fetching previous classes");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/${selectedClassForFeedback._id}/feedback`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(feedbackData)
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Feedback submitted successfully");
                setShowFeedbackModal(false);
                fetchClasses();
                setFeedbackData({ feedbackName: "", feedbackContent: "", feedbackRating: "" }); // Reset
            } else {
                toast.error(data.message || "Failed to submit feedback");
            }
        } catch (error) {
            toast.error("Error submitting feedback");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white uppercase italic tracking-wider">Previous Class</h1>
                </div>

                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-64">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="bg-[#131619] text-white px-4 py-2 pl-10 rounded-lg border border-gray-700 focus:border-blue-500 outline-none w-full"
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-500" />
                        </div>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#2a3038] text-gray-300 text-xs uppercase font-bold tracking-wider">
                                    <th className="p-4">Class Name</th>
                                    <th className="p-4">Batch</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Actual Time</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500 uppercase tracking-widest opacity-50">No previous classes found</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className="hover:bg-[#252b32] transition-colors text-sm text-gray-300">
                                            <td className="p-4 font-semibold text-white">{cls.className}</td>
                                            <td className="p-4">{cls.batchId?.batchName || cls.batchId?.name || "-"}</td>
                                            <td className="p-4">{formatDate(cls.date)}</td>
                                            <td className="p-4">
                                                {cls.actualStartTime ? new Date(cls.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                {" - "}
                                                {cls.actualEndTime ? new Date(cls.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </td>
                                            <td className="p-4">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-600/50 flex items-center justify-center gap-1 mx-auto w-fit">
                                                    <FaCheckCircle size={10} /> Completed
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedClassForFeedback(cls);
                                                        setFeedbackData({
                                                            feedbackName: cls.feedbackName || "",
                                                            feedbackContent: cls.feedbackContent || "",
                                                            feedbackRating: cls.feedbackRating || ""
                                                        });
                                                        setShowFeedbackModal(true);
                                                    }}
                                                    className="bg-purple-600/10 text-purple-400 px-3 py-1 rounded text-[10px] font-bold uppercase border border-purple-600/30 hover:bg-purple-600 hover:text-white transition-all shadow-lg shadow-purple-900/10"
                                                >
                                                    Feedback
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-6 text-sm text-gray-400">
                        <div>
                            Showing {totalRecords === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
                            >
                                Previous
                            </button>
                            <span> Page {page} </span>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feedback Modal */}
                {showFeedbackModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1e2530] w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-fade-in-up">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#252b32]">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">Class Feedback</h2>
                                </div>
                                <button
                                    onClick={() => setShowFeedbackModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitFeedback} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Rating</label>
                                    <select
                                        required
                                        value={feedbackData.feedbackRating}
                                        onChange={(e) => setFeedbackData({ ...feedbackData, feedbackRating: e.target.value })}
                                        className="w-full bg-[#131619] text-white p-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition-all"
                                    >
                                        <option value="">Select Rating</option>
                                        <option value="Excellent">Excellent</option>
                                        <option value="Good">Good</option>
                                        <option value="Average">Average</option>
                                        <option value="Bad">Bad</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Remarks (Optional)</label>
                                    <textarea
                                        value={feedbackData.feedbackContent}
                                        onChange={(e) => setFeedbackData({ ...feedbackData, feedbackContent: e.target.value })}
                                        placeholder="Describe the teacher's performance or class observations..."
                                        rows="4"
                                        className="w-full bg-[#131619] text-white p-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition-all placeholder:text-gray-600 resize-none"
                                    ></textarea>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowFeedbackModal(false)}
                                        className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl font-bold uppercase hover:bg-gray-600 transition-all text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold uppercase hover:shadow-lg hover:shadow-purple-900/40 transition-all text-xs"
                                    >
                                        Save Feedback
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PreviousClass;
