import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaStar, FaEye, FaTimes, FaUserTie, FaChalkboardTeacher } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CCTeacherReview = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Modal State
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchReviews();
    }, [page, limit, searchTerm]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page,
                limit,
                search: searchTerm,
                hasFeedback: "true",
                status: "Completed" // Feedback usually for completed classes
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
                toast.error("Failed to fetch reviews");
            }
        } catch (error) {
            toast.error("Error fetching reviews");
        } finally {
            setLoading(false);
        }
    };

    const getRatingColor = (rating) => {
        switch (rating) {
            case "Excellent": return "text-green-400 bg-green-400/10 border-green-400/20";
            case "Good": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
            case "Average": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
            case "Bad": return "text-red-400 bg-red-400/10 border-red-400/20";
            default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white uppercase italic tracking-wider">CC Teacher Review</h1>
                </div>

                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-full md:w-1/3">
                            <input
                                type="text"
                                placeholder="Search class or teacher..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="bg-[#131619] text-white pl-10 pr-4 py-2.5 rounded-lg border border-gray-700 focus:border-blue-500 outline-none w-full transition-all"
                            />
                            <FaSearch className="absolute left-3 top-3.5 text-gray-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none transition-all text-sm"
                            >
                                <option value="10">10 per page</option>
                                <option value="20">20 per page</option>
                                <option value="50">50 per page</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-700/50">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#2a3038] text-gray-300 text-[10px] uppercase font-bold tracking-widest border-b border-gray-700">
                                    <th className="p-4">SL NO.</th>
                                    <th className="p-4">Class Details</th>
                                    <th className="p-4">Staff</th>
                                    <th className="p-4">Date & Time</th>
                                    <th className="p-4 text-center">Reviews</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 bg-[#1e2530]/50">
                                {loading && classes.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-gray-500 animate-pulse">Loading reviews...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-gray-500 italic uppercase tracking-[0.2em] opacity-50">No reviews found</td></tr>
                                ) : (
                                    classes.map((cls, index) => (
                                        <tr key={cls._id} className="hover:bg-white/5 transition-all text-sm group">
                                            <td className="p-4 text-gray-500 font-mono">{(page - 1) * limit + index + 1}</td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-white font-bold group-hover:text-blue-400 transition-colors">{cls.className}</span>
                                                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">
                                                        {cls.subjectId?.subjectName || "N/A"} • {cls.classMode}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <FaChalkboardTeacher className="text-blue-400/70" />
                                                        <span className="text-gray-300 font-semibold">{cls.teacherId?.name || "Unassigned"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <FaUserTie className="text-purple-400/70" />
                                                        <span className="text-gray-500">CC: {cls.coordinatorId?.name || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-300 font-mono text-xs">{formatDate(cls.date)}</span>
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">{cls.actualStartTime ? new Date(cls.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : cls.startTime}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center flex-wrap gap-1 max-w-[120px] mx-auto">
                                                    {["Excellent", "Good", "Average", "Bad"].map(r => {
                                                        const count = cls.teacherFeedback?.filter(f => f.rating === r).length || 0;
                                                        if (count === 0) return null;
                                                        return (
                                                            <div key={r} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border flex items-center gap-1 ${getRatingColor(r)}`}>
                                                                {r[0]} <span className="opacity-50">×</span> {count}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedFeedback(cls); setShowModal(true); }}
                                                    className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-blue-600/20 active:scale-95 flex items-center gap-2 ml-auto"
                                                >
                                                    <FaEye /> Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
                        <div className="text-xs text-gray-500 font-medium">
                            Showing <span className="text-white">{(page - 1) * limit + 1}</span> to <span className="text-white">{Math.min(page * limit, totalRecords)}</span> of <span className="text-white">{totalRecords}</span> reviews
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-[#131619] rounded-lg text-xs font-bold text-gray-400 hover:text-white border border-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-[#131619] rounded-lg text-xs font-bold text-gray-400 hover:text-white border border-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Details Modal */}
                {showModal && selectedFeedback && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                        <div className="bg-[#1a1f24] w-full max-w-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">{selectedFeedback.className}</h2>
                                    <p className="text-xs text-blue-400 font-bold mt-1 tracking-[0.2em] uppercase">Teacher Performance Report</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                                {/* Header Info */}
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Instructor</p>
                                        <p className="text-lg font-bold text-white mb-1">{selectedFeedback.teacherId?.name}</p>
                                        <p className="text-[10px] text-blue-400 font-bold uppercase">{selectedFeedback.subjectId?.subjectName}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">CC Evaluator</p>
                                        <p className="text-lg font-bold text-white mb-1">{selectedFeedback.coordinatorId?.name || "N/A"}</p>
                                        <p className="text-[10px] text-purple-400 font-bold uppercase">{formatDate(selectedFeedback.date)}</p>
                                    </div>
                                </div>

                                {/* Review List */}
                                <div className="space-y-4">
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em] mb-4">Detailed Metrics</p>
                                    {(selectedFeedback.teacherFeedback || []).map((fb, idx) => (
                                        <div key={idx} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-white/[0.04]">
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-black flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-gray-300 text-sm leading-relaxed">{fb.criteria}</p>
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border tracking-widest flex items-center gap-2 whitespace-nowrap self-end md:self-center ${getRatingColor(fb.rating)}`}>
                                                <FaStar className="opacity-50" /> {fb.rating}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 border-t border-white/5 bg-black/20 flex justify-end">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-10 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Close Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.1);
                }
            `}</style>
        </Layout>
    );
};

export default CCTeacherReview;