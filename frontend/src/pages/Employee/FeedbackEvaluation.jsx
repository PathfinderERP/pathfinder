import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    FaCommentDots, FaPaperPlane, FaHistory, FaUserTie,
    FaClock, FaCheckCircle, FaExclamationCircle, FaUserShield, FaUserCircle
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";

const FeedbackEvaluation = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        subject: "",
        message: "",
        type: "Feedback"
    });

    const apiUrl = import.meta.env.VITE_API_URL.replace("localhost", "127.0.0.1");

    useEffect(() => {
        fetchMyFeedbacks();
    }, []);

    const fetchMyFeedbacks = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${apiUrl}/hr/feedback/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbacks(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load your feedback history");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.message) return toast.warning("Please fill all fields");

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${apiUrl}/hr/feedback/submit`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Feedback submitted successfully!");
            setFormData({ subject: "", message: "", type: "Feedback" });
            fetchMyFeedbacks();
        } catch (error) {
            console.error(error);
            toast.error("Error submitting feedback");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout activePage="Employee Center">
            <div className={`p-4 md:p-8 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0F172A] text-slate-200' : 'bg-gray-50 text-gray-800'}`}>
                <ToastContainer theme={isDarkMode ? "dark" : "light"} />

                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-10 animate-in slide-in-from-top duration-700">
                        <h1 className={`text-4xl font-black flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20 text-white">
                                <FaCommentDots />
                            </div>
                            Feedback & <span className="text-indigo-600">Self Evaluation</span>
                        </h1>
                        <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} mt-2 font-medium`}>Share your thoughts, evaluations, or grievances with the HR team.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Submission Form */}
                        <div className="lg:col-span-1">
                            <div className={`border rounded-[32px] p-8 backdrop-blur-sm sticky top-8 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <h2 className={`text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <FaPaperPlane className="text-indigo-600" /> New Request
                                </h2>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Type</label>
                                        <select
                                            className={`w-full border rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="Feedback">General Feedback</option>
                                            <option value="Self Evaluation">Self Evaluation</option>
                                            <option value="Grievance">Grievance</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Subject</label>
                                        <input
                                            type="text"
                                            className={`w-full border rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
                                            placeholder="Briefly describe the topic..."
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Detailed Message</label>
                                        <textarea
                                            className={`w-full border rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium min-h-[150px] placeholder:text-slate-600 resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
                                            placeholder="Write your feedback here..."
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {submitting ? "Processing..." : (
                                            <>Submit Request <FaPaperPlane className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right: History */}
                        <div className="lg:col-span-2">
                            <div className={`border rounded-[32px] p-8 min-h-[600px] ${isDarkMode ? 'bg-slate-800/20 border-slate-700/30' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <h2 className={`text-xl font-black mb-8 uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <FaHistory className="text-indigo-600" /> Request History
                                </h2>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full mb-4"></div>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing Records</p>
                                    </div>
                                ) : feedbacks.length === 0 ? (
                                    <div className={`text-center py-20 border-2 border-dashed rounded-3xl ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                                        <FaCommentDots className={`text-6xl mx-auto mb-4 ${isDarkMode ? 'text-slate-800' : 'text-gray-200'}`} />
                                        <p className={`${isDarkMode ? 'text-slate-500' : 'text-gray-400'} font-bold`}>No feedback history found.</p>
                                        <p className={`${isDarkMode ? 'text-slate-600' : 'text-gray-400'} text-sm mt-1`}>Your submitted requests will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {feedbacks.map((f) => (
                                            <div key={f._id} className={`group relative border rounded-3xl p-6 transition-all duration-300 ${isDarkMode ? 'bg-slate-800/40 border-slate-700/50 hover:border-indigo-500/30' : 'bg-white border-gray-100 shadow-sm hover:border-indigo-200'}`}>
                                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${f.type === 'Grievance' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'
                                                            }`}>
                                                            <FaUserShield size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className={`font-black uppercase text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{f.subject}</h4>
                                                            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                                                <FaClock /> {new Date(f.createdAt).toLocaleDateString()} • {f.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`self-start md:self-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border ${f.status === 'Pending'
                                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        }`}>
                                                        {f.status}
                                                    </div>
                                                </div>

                                                <div className={`p-5 rounded-2xl mb-4 border ${isDarkMode ? 'bg-slate-900/40 border-slate-700/20' : 'bg-gray-50 border-gray-100'}`}>
                                                    <p className={`text-sm font-medium leading-relaxed italic ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>"{f.message}"</p>
                                                </div>

                                                {f.hrResponse && (
                                                    <div className={`mt-4 p-5 rounded-2xl relative overflow-hidden border ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                                            <FaCheckCircle className="text-emerald-500" size={40} />
                                                        </div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                                                <FaUserTie /> Official Response
                                                            </div>
                                                            {f.responderName && (
                                                                <div className={`flex items-center gap-3 py-1.5 pl-3 pr-1.5 rounded-full border shadow-inner ${isDarkMode ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{f.responderName}</span>
                                                                    <div className={`w-8 h-8 rounded-full overflow-hidden ring-2 shadow-lg ${isDarkMode ? 'bg-slate-800 ring-emerald-500/20' : 'bg-gray-100 ring-emerald-100'}`}>
                                                                        {f.responderImage ? (
                                                                            <img src={f.responderImage} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <FaUserCircle className={`w-full h-full p-1 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className={`text-sm font-medium ${isDarkMode ? 'text-emerald-100' : 'text-emerald-900'}`}>"{f.hrResponse}"</p>
                                                        <div className={`mt-2 text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-emerald-500/60' : 'text-emerald-600/60'}`}>
                                                            Responded on {new Date(f.respondedAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FeedbackEvaluation;
