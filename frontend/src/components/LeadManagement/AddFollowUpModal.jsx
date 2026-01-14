import React, { useState, useEffect } from "react";
import { FaTimes, FaCalendarAlt, FaCommentAlt, FaSave, FaPhoneAlt, FaStopCircle, FaPlayCircle, FaClock } from "react-icons/fa";
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

const AddFollowUpModal = ({ lead, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [dynamicOptions, setDynamicOptions] = useState([]);
    const [formData, setFormData] = useState({
        feedback: "",
        nextFollowUpDate: "",
        remarks: "",
        callStartTime: null,
        callEndTime: null,
        callDuration: ""
    });

    // Timer state
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
        toast.info("Call started");
    };

    const handleStopCall = () => {
        const now = new Date();
        setIsCalling(false);
        const duration = formatTime(elapsedTime);
        setFormData(prev => ({ ...prev, callEndTime: now, callDuration: duration }));
        toast.success(`Call ended. Duration: ${duration}`);
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
                toast.success("Follow-up added successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to add follow-up");
            }
        } catch (error) {
            console.error("Error adding follow-up:", error);
            toast.error("Error adding follow-up");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-[#1a1f24] w-full max-w-md rounded-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
                <div className="bg-[#131619] px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaCommentAlt className="text-cyan-400" />
                        Add Follow Up
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Call Timing Section */}
                    <div className="bg-[#131619] border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                            <FaClock className={isCalling ? "text-red-500 animate-pulse" : "text-cyan-400"} />
                            <span>Call Duration</span>
                        </div>
                        <div className={`text-3xl font-mono font-bold ${isCalling ? "text-red-500" : "text-white"}`}>
                            {formatTime(elapsedTime)}
                        </div>
                        
                        {!isCalling ? (
                            <button
                                type="button"
                                onClick={handleStartCall}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2 rounded-lg font-bold transition-all"
                            >
                                <FaPlayCircle /> Start Call
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStopCall}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-pulse"
                            >
                                <FaStopCircle /> Stop Call
                            </button>
                        )}
                        
                        {formData.callDuration && !isCalling && (
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                                Call timing captured: {formData.callDuration}
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Feedback *</label>
                        <select
                            required
                            value={formData.feedback}
                            onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                        >
                            <option value="">Select Feedback</option>
                            {optionsToRender.map((option, index) => (
                                <option key={index} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Next Follow Up Date</label>
                        <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="datetime-local"
                                value={formData.nextFollowUpDate}
                                onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none transition-colors icon-white-calendar"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Remarks</label>
                        <textarea
                            rows="4"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                            placeholder="Add detailed remarks here..."
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Saving..." : <><FaSave /> Save Follow Up</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
);
};

export default AddFollowUpModal;
