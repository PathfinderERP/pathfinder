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

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin" || user.role === "superAdmin";
    const isCoordinator = user.role === "Class_Coordinator";
    const isTeacher = user.role === "teacher";

    // Feedback State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedClassForFeedback, setSelectedClassForFeedback] = useState(null);
    const [teacherFeedback, setTeacherFeedback] = useState([]);

    const staticFeedbackCriteria = [
        "Explains concepts clearly and uses real-world examples to improve understanding.",
        "Maintains excellent classroom discipline and encourages student participation.",
        "Always well-prepared and delivers structured, easy-to-follow lessons.",
        "Provides timely feedback and supports students beyond classroom hours.",
        "Demonstrates strong subject knowledge and effective teaching methodologies.",
        "Creates a positive learning environment that motivates students to perform better.",
        "Uses interactive teaching methods and digital tools effectively.",
        "Regularly tracks student progress and addresses learning gaps proactively.",
        "Encourages critical thinking and problem-solving skills among students.",
        "Shows professionalism, punctuality, and dedication towards student success."
    ];

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
            const response = await fetch(`${API_URL}/academics/class-schedule/feedback/${selectedClassForFeedback._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ teacherFeedback })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Feedback submitted successfully");
                setShowFeedbackModal(false);
                setTeacherFeedback([]);
                fetchClasses();
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
                                    <th className="p-4">Allocated Time</th>
                                    <th className="p-4">Actual Time</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4 text-center">Study Started</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="9" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="9" className="p-8 text-center text-gray-500 uppercase tracking-widest opacity-50">No previous classes found</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className="hover:bg-[#252b32] transition-colors text-sm text-gray-300">
                                            <td className="p-4 font-semibold text-white">{cls.className}</td>
                                            <td className="p-4">{cls.batchId?.batchName || cls.batchId?.name || "-"}</td>
                                            <td className="p-4">{formatDate(cls.date)}</td>
                                            <td className="p-4 text-xs font-bold text-gray-400">
                                                {cls.startTime} - {cls.endTime}
                                            </td>
                                            <td className="p-4 text-xs font-bold text-gray-400">
                                                {cls.actualStartTime ? new Date(cls.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                                {" - "}
                                                {cls.actualEndTime ? new Date(cls.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </td>
                                            <td className="p-4">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-4 text-center font-mono text-xs text-cyan-400">
                                                {cls.studyStartTime ? new Date(cls.studyStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-600/50 flex items-center justify-center gap-1 mx-auto w-fit">
                                                    <FaCheckCircle size={10} /> Completed
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {(isAdmin || isCoordinator) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClassForFeedback(cls);
                                                            const existingFeedback = cls.teacherFeedback && cls.teacherFeedback.length > 0
                                                                ? cls.teacherFeedback
                                                                : staticFeedbackCriteria.map(criteria => ({ criteria, rating: "Good" }));
                                                            setTeacherFeedback(existingFeedback);
                                                            setShowFeedbackModal(true);
                                                        }}
                                                        className="bg-purple-600/10 text-purple-400 px-3 py-1 rounded text-[10px] font-bold uppercase border border-purple-600/30 hover:bg-purple-600 hover:text-white transition-all shadow-lg shadow-purple-900/10"
                                                    >
                                                        {cls.teacherFeedback && cls.teacherFeedback.length > 0 ? "Feedback" : "Add Feedback"}
                                                    </button>
                                                )}
                                                {isTeacher && <span className="text-[10px] font-bold text-gray-500 uppercase italic">Locked</span>}
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
                                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">Teacher Performance Feedback</h2>
                                </div>
                                <button
                                    onClick={() => setShowFeedbackModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitFeedback} className="p-0">
                                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                                    {teacherFeedback.map((item, index) => (
                                        <div key={index} className="bg-[#131619] p-4 rounded-xl border border-gray-800 space-y-3">
                                            <div className="flex gap-3">
                                                <span className="bg-purple-600/20 text-purple-400 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border border-purple-600/30 flex-shrink-0">
                                                    {index + 1}
                                                </span>
                                                <p className="text-gray-300 text-sm leading-relaxed">{item.criteria}</p>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                {["Excellent", "Good", "Average", "Bad"].map((r) => (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...teacherFeedback];
                                                            updated[index].rating = r;
                                                            setTeacherFeedback(updated);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${item.rating === r
                                                            ? r === "Excellent" ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/40"
                                                                : r === "Good" ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40"
                                                                    : r === "Average" ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/40"
                                                                        : "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40"
                                                            : "bg-[#1e2530] border-gray-700 text-gray-500 hover:text-gray-300"
                                                            }`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 border-t border-gray-700 flex gap-3 bg-[#252b32]">
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
                                        Save All Feedback
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
