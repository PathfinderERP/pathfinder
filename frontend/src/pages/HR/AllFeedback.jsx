import React, { useState, useEffect } from "react";
import {
    FaCommentDots, FaPaperPlane, FaSearch,
    FaRegCommentAlt, FaEnvelope, FaTimes, FaReply
} from "react-icons/fa";
import { toast } from "react-toastify";

const AllFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Reply Modal State
    const [replyModal, setReplyModal] = useState({ open: false, feedback: null });
    const [replyText, setReplyText] = useState("");

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/feedback/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setFeedbacks(data);
            } else {
                toast.error("Failed to fetch feedback");
            }
        } catch (error) {
            console.error("Error fetching feedback:", error);
            toast.error("Error fetching feedback");
        } finally {
            setLoading(false);
        }
    };

    const handleReplySubmit = async () => {
        if (!replyText.trim()) return toast.warn("Please enter a response");

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/feedback/respond/${replyModal.feedback._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ response: replyText })
            });

            if (response.ok) {
                toast.success("Response sent successfully");
                setReplyModal({ open: false, feedback: null });
                setReplyText("");
                fetchFeedbacks(); // Refresh
            } else {
                toast.error("Failed to send response");
            }
        } catch (error) {
            console.error("Reply Error:", error);
            toast.error("Error sending response");
        }
    };

    const filteredFeedbacks = feedbacks.filter(fb => {
        // Use fb.employee instead of fb.employeeId as per controller population
        const empName = fb.employee?.name || "";
        const subject = fb.subject || "";
        const msg = fb.message || "";

        return (
            empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                        Employee <span className="text-cyan-500">Feedback</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-bold mt-2 uppercase tracking-widest flex items-center gap-2">
                        <FaCommentDots className="text-cyan-500" /> Voice of the Workforce
                    </p>
                </div>

                {/* Search */}
                <div className="relative group w-full md:w-96">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="SEARCH FEEDBACK..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#131619] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white font-bold text-xs uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-gray-700"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <div className="animate-spin h-12 w-12 border-t-2 border-cyan-500 rounded-full"></div>
                </div>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-gray-800 rounded-[3rem] bg-[#1a1f24]/50">
                    <FaRegCommentAlt size={48} className="text-gray-700 mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No feedback found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredFeedbacks.map((fb) => (
                        <div key={fb._id} className="bg-[#1a1f24] border border-gray-800 rounded-[2rem] p-6 hover:border-cyan-500/30 transition-all group shadow-xl flex flex-col h-full">
                            {/* Employee Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 overflow-hidden flex-shrink-0 group-hover:border-cyan-500/50 transition-colors">
                                        {/* Use fb.employee instead of fb.employeeId */}
                                        {fb.employee?.profileImage ? (
                                            <img src={fb.employee.profileImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-cyan-500 font-black text-lg">
                                                {fb.employee?.name?.charAt(0) || "?"}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black uppercase tracking-tight leading-none mb-1 text-sm">{fb.employee?.name || "Unknown User"}</h3>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{fb.employee?.department?.departmentName || "General"}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-gray-800">
                                    {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : "Recent"}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="bg-black/20 rounded-xl p-4 mb-4 border border-gray-800/50 flex-1">
                                <h4 className="text-cyan-400 font-bold text-xs mb-2 uppercase tracking-wide flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                                    {fb.subject || "No Subject"}
                                </h4>
                                <p className="text-gray-300 text-sm leading-relaxed italic">
                                    "{fb.message}"
                                </p>
                            </div>

                            {/* Response Section if exists */}
                            {fb.hrResponse && (
                                <div className="bg-emerald-500/10 rounded-xl p-4 mb-4 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaReply className="text-emerald-500 text-xs" />
                                        <h4 className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest">HR Response</h4>
                                    </div>
                                    <p className="text-gray-400 text-xs italic">
                                        "{fb.hrResponse}"
                                    </p>
                                    <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest mt-2 text-right">
                                        By {fb.responderName || "Admin"}
                                    </p>
                                </div>
                            )}

                            {/* Footer / Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-auto">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest max-w-[50%] truncate">
                                    <FaEnvelope /> {fb.employee?.email || "No Email"}
                                </div>

                                {!fb.hrResponse ? (
                                    <button
                                        onClick={() => {
                                            setReplyModal({ open: true, feedback: fb });
                                            setReplyText("");
                                        }}
                                        className="text-cyan-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500 px-4 py-2 rounded-lg"
                                    >
                                        <FaPaperPlane size={10} /> Reply
                                    </button>
                                ) : (
                                    <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Responded
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reply Modal */}
            {replyModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#131619] w-full max-w-lg rounded-3xl shadow-2xl border border-gray-800 overflow-hidden transform transition-all">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                    <FaReply className="text-cyan-500" /> Send Response
                                </h2>
                                <button onClick={() => setReplyModal({ open: false, feedback: null })} className="text-gray-500 hover:text-white transition-colors">
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="mb-6 bg-black/40 p-4 rounded-xl border border-gray-800">
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Replying to {replyModal.feedback?.employee?.name}</p>
                                <p className="text-gray-300 text-sm italic">"{replyModal.feedback?.message}"</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Your Message</label>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl py-4 px-4 text-white font-medium text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-gray-700 resize-none h-32"
                                        placeholder="Type your official response here..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button
                                    onClick={() => setReplyModal({ open: false, feedback: null })}
                                    className="py-4 rounded-xl bg-gray-800 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:bg-gray-700 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReplySubmit}
                                    className="py-4 rounded-xl bg-cyan-500 text-black font-bold uppercase text-[10px] tracking-widest hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <FaPaperPlane /> Send Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllFeedback;
