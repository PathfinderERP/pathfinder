import React, { useState, useEffect } from "react";
import { FaTimes, FaCalendarAlt, FaCommentAlt, FaSave, FaPhoneAlt, FaStopCircle, FaPlayCircle, FaClock, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";

const FEEDBACK_OPTIONS = [
    "Call back later",
    "Interested",
    "Not Interested",
    "Wrong Number",
    "Busy",
    "Asked for details",
    "Price Issue",
    "Will visit centre",
    "Enrolled elsewhere",
    "Others"
];

const AddFollowUpModal = ({ lead, onClose, onSuccess, isDarkMode }) => {
    const [loading, setLoading] = useState(false);
    const [dynamicOptions, setDynamicOptions] = useState([]);
    const [formData, setFormData] = useState({
        feedback: "",
        nextFollowUpDate: "",
        remarks: "",
        callStartTime: null,
        callEndTime: null,
        callDuration: "",
        leadType: ""
    });

    const [isCalling, setIsCalling] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        let interval;
        if (isCalling) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((new Date() - startTime) / 1000));
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isCalling, startTime]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
    };

    const handleStartCall = () => {
        const now = new Date();
        setStartTime(now);
        setIsCalling(true);
        setFormData(prev => ({ ...prev, callStartTime: now, callEndTime: null, callDuration: "" }));
        toast.info("Starting call recording...");
    };

    const handleStopCall = () => {
        const now = new Date();
        setIsCalling(false);
        const duration = formatTime(elapsedTime);
        setFormData(prev => ({ ...prev, callEndTime: now, callDuration: duration }));
        toast.success(`Call recording ended. Length: ${duration}`);
    };

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        setDynamicOptions(data.map(item => item.name));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch feedback options:", error);
            }
        };
        fetchOptions();
    }, []);

    const optionsToRender = dynamicOptions.length > 0 ? dynamicOptions : FEEDBACK_OPTIONS;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.leadType) {
            toast.warning("Please categorize the lead (Hot/Cold/Negative)");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${lead._id}/follow-up`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Follow up added successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to save follow up");
            }
        } catch (error) {
            console.error("Error adding follow-up:", error);
            toast.error("An internal error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-md rounded-[4px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h3 className={`text-lg font-black uppercase tracking-tighter italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaCommentAlt className="text-cyan-500" />
                            Add Follow Up
                        </h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">Updating lead follow-up details</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-all p-2 rounded-[4px] active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                <div className={`p-6 space-y-6 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    {/* Call Timing Section */}
                    <div className={`p-6 rounded-[4px] border border-dashed flex flex-col items-center gap-4 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <FaClock className={isCalling ? "text-red-500 animate-pulse" : "text-cyan-500"} />
                            <span>Call Duration</span>
                        </div>
                        <div className={`text-4xl font-black font-mono tracking-tighter ${isCalling ? "text-red-500" : (isDarkMode ? "text-white" : "text-gray-900")}`}>
                            {formatTime(elapsedTime)}
                        </div>

                        {!isCalling ? (
                            <button
                                type="button"
                                onClick={handleStartCall}
                                className={`w-full flex items-center justify-center gap-3 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/10' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'}`}
                            >
                                <FaPlayCircle size={14} /> Start Call
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStopCall}
                                className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] animate-pulse active:scale-95"
                            >
                                <FaStopCircle size={14} /> End Call
                            </button>
                        )}

                        {formData.callDuration && !isCalling && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest italic">
                                    Duration Recorded: {formData.callDuration}
                                </p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">FEEDBACK</label>
                            <select
                                required
                                value={formData.feedback}
                                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                                className={`w-full rounded-[4px] border px-4 py-3 text-[11px] font-black uppercase tracking-widest focus:outline-none transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">SELECT STATUS</option>
                                {optionsToRender.map((option, index) => (
                                    <option key={index} value={option}>{option.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">LEAD STATUS</label>
                            <select
                                required
                                value={formData.leadType || ""}
                                onChange={(e) => setFormData({ ...formData, leadType: e.target.value })}
                                className={`w-full rounded-[4px] border px-4 py-3 text-[11px] font-black uppercase tracking-widest focus:outline-none transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">CATEGORIZE LEAD</option>
                                <option value="HOT LEAD">HOT LEAD</option>
                                <option value="COLD LEAD">COLD LEAD</option>
                                <option value="NEGATIVE">NEGATIVE</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">NEXT FOLLOW UP DATE</label>
                            <div className="relative group">
                                <FaCalendarAlt className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-500' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                                <input
                                    type="datetime-local"
                                    value={formData.nextFollowUpDate}
                                    onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-3 rounded-[4px] border text-[11px] font-black uppercase tracking-widest focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">REMARKS</label>
                            <textarea
                                rows="4"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className={`w-full rounded-[4px] border p-4 text-[12px] font-medium transition-all focus:outline-none resize-none ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-300 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-700 focus:border-cyan-500'}`}
                                placeholder="Add follow up notes..."
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/20' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-500/30'}`}
                            >
                                {loading ? (
                                    <FaSync className="animate-spin" />
                                ) : (
                                    <>
                                        <FaSave size={14} /> Save Follow Up
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default AddFollowUpModal;
