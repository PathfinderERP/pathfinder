import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaUserMinus, FaPaperPlane, FaHistory, FaCheckCircle, FaClock, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";

const ResignationRequest = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [reason, setReason] = useState("");
    const [myRequest, setMyRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/my-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMyRequest(data);
            }
        } catch (error) {
            console.error("Status error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return toast.error("Please provide a reason");

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                fetchStatus();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Submission failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout activePage="Employee Center">
            <div className={`p-4 md:p-10 max-w-[1200px] mx-auto min-h-[80vh] flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? '' : 'text-gray-800'}`}>

                {loading ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" />
                ) : myRequest && myRequest.status === "Pending" ? (
                    <div className={`text-center border p-12 rounded-[3rem] shadow-3xl max-w-lg w-full transition-all duration-300 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-xl'}`}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                            <FaClock className="text-amber-500 animate-pulse" size={32} />
                        </div>
                        <h2 className={`text-3xl font-black italic uppercase tracking-tighter mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Request <span className="text-amber-500">Under Review</span></h2>
                        <p className={`text-xs font-black uppercase tracking-[0.2em] leading-relaxed mb-10 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Your resignation request submitted on {format(new Date(myRequest.requestedAt), 'PPP')} is currently being reviewed by the HR department.
                        </p>
                        <div className={`border rounded-2xl p-6 text-left ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Reason Provided:</p>
                            <p className={`text-xs font-bold italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>"{myRequest.reason}"</p>
                        </div>
                    </div>
                ) : myRequest && myRequest.status === "Approved" ? (
                    <div className={`text-center border p-12 rounded-[3rem] shadow-3xl max-w-lg w-full transition-all duration-300 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-xl'}`}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                            <FaCheckCircle className="text-emerald-500" size={32} />
                        </div>
                        <h2 className={`text-3xl font-black italic uppercase tracking-tighter mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Request <span className="text-emerald-500">Approved</span></h2>
                        <div className="space-y-4 mb-10">
                            <div className={`flex justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Last Date of Work</span>
                                <span className="text-xs font-black text-cyan-600">{myRequest.lastDateOfWork ? format(new Date(myRequest.lastDateOfWork), 'PPP') : 'TBD'}</span>
                            </div>
                            <div className={`flex justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Final Settlement (FNF)</span>
                                <span className="text-xs font-black text-emerald-600">₹{myRequest.fnfAmount}</span>
                            </div>
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-500'}`}>Please contact HR for exit formalities.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full">
                        {/* Info Section */}
                        <div className="flex flex-col justify-center">
                            <h1 className={`text-5xl font-black italic uppercase tracking-tighter mb-6 leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Exit <span className="text-cyan-600">Portal</span>
                            </h1>
                            <p className={`text-sm font-bold leading-relaxed mb-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                Submitting a resignation request initiates the official separation process. Please ensure all transition documents and tasks are ready as per company policy.
                            </p>
                            <div className="space-y-4">
                                {[
                                    { icon: <FaExclamationTriangle />, text: "Min. 30 Days Notice Required", color: "amber" },
                                    { icon: <FaHistory />, text: "Request cannot be undone once approved", color: "red" },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border ${isDarkMode ? `bg-${item.color}-500/5 border-${item.color}-500/10` : `bg-${item.color}-50 border-${item.color}-100`}`}>
                                        <span className={`text-${item.color}-600`}>{item.icon}</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Form Section */}
                        <div className={`border rounded-[3rem] p-10 shadow-3xl transition-all duration-300 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center gap-4 mb-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
                                    <FaUserMinus size={20} />
                                </div>
                                <h3 className={`text-xl font-black uppercase tracking-tight italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Submit Request</h3>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Primary Reason / Remarks</label>
                                    <textarea
                                        className={`w-full border rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:border-cyan-500/50 min-h-[180px] transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
                                        placeholder="Briefly explain your reason for resignation..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full py-5 font-black uppercase text-xs tracking-[0.3em] rounded-[1.5rem] transition-all flex items-center justify-center gap-4 group disabled:opacity-50 ${isDarkMode ? 'bg-cyan-500 text-[#1a1f24] hover:bg-cyan-400' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg'}`}
                                >
                                    {submitting ? "Processing..." : (
                                        <>
                                            Submit Formal Resignation
                                            <FaPaperPlane className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ResignationRequest;
