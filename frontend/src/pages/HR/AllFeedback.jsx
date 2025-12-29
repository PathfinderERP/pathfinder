import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    FaCommentDots, FaUserCircle, FaPaperPlane, FaSearch,
    FaCalendarAlt, FaEnvelope, FaIdCard, FaBuilding, FaUserTie
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";

const AllFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL.replace("localhost", "127.0.0.1");

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${apiUrl}/hr/feedback/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbacks(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load feedbacks");
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async () => {
        if (!response.trim()) return toast.warning("Please type a response");
        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${apiUrl}/hr/feedback/respond/${selectedFeedback._id}`,
                { response },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Response sent successfully");
            setResponse("");
            setSelectedFeedback(null);
            fetchFeedbacks();
        } catch (error) {
            console.error(error);
            toast.error("Failed to send response");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredFeedbacks = feedbacks.filter(f =>
        f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.employee?.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 bg-[#0F172A] min-h-screen text-slate-200">
            <ToastContainer theme="dark" />

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                                <FaCommentDots />
                            </div>
                            Employee <span className="text-indigo-400">Feedback</span> Hub
                        </h1>
                        <p className="text-slate-400 mt-1">Review and respond to employee evaluations and feedback.</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Find feedback by employee or subject..."
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full"></div>
                    </div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
                        <FaCommentDots className="text-6xl text-slate-700 mx-auto mb-4" />
                        <p className="text-xl font-bold text-slate-500">No feedback submissions found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredFeedbacks.map((f) => (
                            <div key={f._id} className="bg-slate-800/40 border border-slate-700/50 rounded-[32px] p-6 hover:border-indigo-500/30 transition-all group backdrop-blur-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-700 overflow-hidden border-2 border-slate-600 group-hover:border-indigo-500/50 transition-colors shadow-xl">
                                            {f.employee?.profileImage ? (
                                                <img src={f.employee.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-400">
                                                    <FaUserCircle size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{f.employee?.name}</h3>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className="flex items-center gap-1 text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                                    <FaIdCard size={10} /> {f.employee?.employeeId}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-indigo-500/20">
                                                    <FaBuilding size={10} /> {f.employee?.department?.departmentName || "General"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${f.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        }`}>
                                        {f.status}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        <FaCalendarAlt className="text-indigo-500" />
                                        {new Date(f.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold lowercase tracking-tight">
                                        <FaEnvelope className="text-indigo-500" />
                                        {f.employee?.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        <FaUserTie className="text-indigo-400" />
                                        {f.employee?.designation?.name || "N/A"}
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/30 mb-6">
                                    <h4 className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                                        {f.type}
                                        <span className="text-slate-500 font-bold opacity-50">Subject: {f.subject}</span>
                                    </h4>
                                    <p className="text-slate-300 text-sm leading-relaxed font-medium">"{f.message}"</p>
                                </div>

                                {f.hrResponse ? (
                                    <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">My Response</h4>
                                            {f.responderName && (
                                                <div className="flex items-center gap-3 bg-slate-900/40 py-1.5 pl-3 pr-1.5 rounded-full border border-slate-700/50 shadow-inner">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{f.responderName}</span>
                                                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-500/20 shadow-lg">
                                                        {f.responderImage ? (
                                                            <img src={f.responderImage} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <FaUserCircle className="text-slate-600 w-full h-full p-1" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-indigo-200 text-sm italic">"{f.hrResponse}"</p>
                                        <div className="mt-3 text-[9px] text-indigo-400 font-bold uppercase tracking-widest">
                                            Replied on {new Date(f.respondedAt).toLocaleString()}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSelectedFeedback(f)}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                    >
                                        <FaPaperPlane /> Send Response
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Response Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/80 animate-in fade-in duration-300">
                    <div className="relative w-full max-w-lg bg-slate-900 rounded-[32px] border border-slate-700 p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Compose Response</h2>
                            <button onClick={() => setSelectedFeedback(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <FaCommentDots />
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">To: {selectedFeedback.employee?.name}</div>
                            <div className="text-slate-400 text-sm font-medium italic">"{selectedFeedback.message}"</div>
                        </div>

                        <textarea
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-slate-200 min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-500 mb-6 font-medium text-sm transition-all"
                            placeholder="Type your official response here..."
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => setSelectedFeedback(null)}
                                className="flex-1 py-4 border border-slate-700 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRespond}
                                disabled={submitting}
                                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                            >
                                {submitting ? "Sending..." : "Submit Response"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllFeedback;
