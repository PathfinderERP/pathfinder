import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaUserMinus, FaPaperPlane, FaHistory, FaCheckCircle, FaClock, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import { format } from "date-fns";

const ResignationRequest = () => {
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
            <div className="p-4 md:p-10 max-w-[1200px] mx-auto min-h-[80vh] flex flex-col items-center justify-center">

                {loading ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" />
                ) : myRequest && myRequest.status === "Pending" ? (
                    <div className="text-center bg-[#131619] border border-gray-800 p-12 rounded-[3rem] shadow-3xl max-w-lg w-full">
                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
                            <FaClock className="text-amber-500 animate-pulse" size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Request <span className="text-amber-500">Under Review</span></h2>
                        <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] leading-relaxed mb-10">
                            Your resignation request submitted on {format(new Date(myRequest.requestedAt), 'PPP')} is currently being reviewed by the HR department.
                        </p>
                        <div className="bg-black/40 border border-gray-800 rounded-2xl p-6 text-left">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Reason Provided:</p>
                            <p className="text-xs text-gray-400 font-bold italic">"{myRequest.reason}"</p>
                        </div>
                    </div>
                ) : myRequest && myRequest.status === "Approved" ? (
                    <div className="text-center bg-[#131619] border border-gray-800 p-12 rounded-[3rem] shadow-3xl max-w-lg w-full">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                            <FaCheckCircle className="text-emerald-500" size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Request <span className="text-emerald-500">Approved</span></h2>
                        <div className="space-y-4 mb-10">
                            <div className="flex justify-between p-4 bg-black/40 rounded-2xl border border-gray-800/50">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Last Date of Work</span>
                                <span className="text-xs font-black text-cyan-500">{myRequest.lastDateOfWork ? format(new Date(myRequest.lastDateOfWork), 'PPP') : 'TBD'}</span>
                            </div>
                            <div className="flex justify-between p-4 bg-black/40 rounded-2xl border border-gray-800/50">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Final Settlement (FNF)</span>
                                <span className="text-xs font-black text-emerald-500">₹{myRequest.fnfAmount}</span>
                            </div>
                        </div>
                        <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Please contact HR for exit formalities.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full">
                        {/* Info Section */}
                        <div className="flex flex-col justify-center">
                            <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-6 leading-none">
                                Exit <span className="text-cyan-500">Portal</span>
                            </h1>
                            <p className="text-gray-500 text-sm font-bold leading-relaxed mb-8">
                                Submitting a resignation request initiates the official separation process. Please ensure all transition documents and tasks are ready as per company policy.
                            </p>
                            <div className="space-y-4">
                                {[
                                    { icon: <FaExclamationTriangle />, text: "Min. 30 Days Notice Required", color: "amber" },
                                    { icon: <FaHistory />, text: "Request cannot be undone once approved", color: "red" },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl bg-${item.color}-500/5 border border-${item.color}-500/10`}>
                                        <span className={`text-${item.color}-500`}>{item.icon}</span>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Form Section */}
                        <div className="bg-[#131619] border border-gray-800 rounded-[3rem] p-10 shadow-3xl">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                                    <FaUserMinus size={20} />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Submit Request</h3>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block">Primary Reason / Remarks</label>
                                    <textarea
                                        className="w-full bg-black/40 border border-gray-800 rounded-[1.5rem] p-6 text-sm text-white font-bold outline-none focus:border-cyan-500/50 min-h-[180px] transition-all"
                                        placeholder="Briefly explain your reason for resignation..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-5 bg-cyan-500 text-[#1a1f24] font-black uppercase text-xs tracking-[0.3em] rounded-[1.5rem] hover:bg-cyan-600 transition-all flex items-center justify-center gap-4 group disabled:opacity-50"
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
