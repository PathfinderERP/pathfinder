import React from "react";
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaSchool, FaMapMarkerAlt, FaBook, FaInfoCircle, FaBullseye, FaTrash, FaEdit, FaCommentAlt, FaMicrophone, FaUpload, FaPlay, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";

const LeadDetailsModal = ({ lead, onClose, onEdit, onDelete, onFollowUp, onCounseling, onShowHistory, canEdit, canDelete, isDarkMode }) => {
    const [uploading, setUploading] = React.useState(false);
    const [recordings, setRecordings] = React.useState(lead?.recordings || []);
    const fileInputRef = React.useRef(null);

    const [userProfile, setUserProfile] = React.useState(null);

    React.useEffect(() => {
        if (lead) {
            setRecordings(lead.recordings || []);
        }
        fetchUserProfile();
    }, [lead]);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setUserProfile(data.user);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    if (!lead) return null;

    const getLeadTypeColor = (type) => {
        switch (type) {
            case "HOT LEAD": return isDarkMode ? "text-red-400 border-red-500/50 bg-red-500/10" : "text-red-600 border-red-200 bg-red-50";
            case "COLD LEAD": return isDarkMode ? "text-blue-400 border-blue-500/50 bg-blue-500/10" : "text-blue-600 border-blue-200 bg-blue-50";
            case "NEGATIVE": return isDarkMode ? "text-gray-400 border-gray-500/50 bg-gray-500/10" : "text-gray-600 border-gray-200 bg-gray-50";
            default: return isDarkMode ? "text-gray-400 border-gray-500/50 bg-gray-500/10" : "text-gray-600 border-gray-200 bg-gray-50";
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check if it's an audio file
        if (!file.type.startsWith('audio/')) {
            toast.error("Please upload an audio file");
            return;
        }

        if (!userProfile?.assignedScript) {
            toast.error("You don't have an assigned script. Please contact admin.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('audio', file);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${lead._id}/upload-recording`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Recording uploaded and processed successfully");
                setRecordings(prev => [...prev, data.recording]);
            } else {
                toast.error(data.message || "Failed to upload recording");
            }
        } catch (error) {
            console.error("Error uploading recording:", error);
            toast.error("Error uploading recording");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`w-full max-w-2xl rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'bg-white border-gray-200 shadow-2xl'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-8 py-6 border-b flex justify-between items-center relative overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
                    <div className="flex items-center gap-4 z-10">
                        <div className={`w-16 h-16 rounded-[4px] border flex items-center justify-center text-2xl font-black transition-all ${isDarkMode ? 'bg-cyan-900/30 border-cyan-500/30 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-600'}`}>
                            {lead.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black uppercase tracking-tight italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lead.name}</h2>
                            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                <FaEnvelope size={10} className="text-cyan-500" /> {lead.email}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="audio/*"
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current.click()}
                            disabled={uploading}
                            className={`px-4 py-2 rounded-[4px] border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100'}`}
                        >
                            {uploading ? <FaSpinner className="animate-spin" /> : <FaMicrophone />}
                            {uploading ? "Processing..." : "Process Recording"}
                        </button>
                        <button
                            onClick={onClose}
                            className={`transition-all p-2 rounded-[4px] active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <FaTimes size={18} />
                        </button>
                    </div>

                    {/* Background decoration */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                {/* Content */}
                <div className={`p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Personal Info */}
                        <div className="space-y-4">
                            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-4 border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'text-cyan-400 border-gray-800' : 'text-cyan-600 border-gray-100'}`}>
                                <FaUser size={10} /> Personal Details
                            </h3>

                            <div className="flex items-center gap-3 group">
                                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#131619] text-gray-500 group-hover:text-cyan-400' : 'bg-gray-50 text-gray-400 group-hover:text-cyan-600'}`}>
                                    <FaPhone size={12} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Phone Number</p>
                                    <p className={`text-[12px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lead.phoneNumber || "N/A"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#131619] text-gray-500 group-hover:text-cyan-400' : 'bg-gray-50 text-gray-400 group-hover:text-cyan-600'}`}>
                                    <FaSchool size={12} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">School Name</p>
                                    <p className={`text-[12px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lead.schoolName || "N/A"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#131619] text-gray-500 group-hover:text-cyan-400' : 'bg-gray-50 text-gray-400 group-hover:text-cyan-600'}`}>
                                    <FaBook size={12} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Class</p>
                                    <p className={`text-[12px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lead.className?.name || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Academic Info */}
                        <div className="space-y-4">
                            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-4 border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'text-cyan-400 border-gray-800' : 'text-cyan-600 border-gray-100'}`}>
                                <FaBullseye size={10} /> Academic Details
                            </h3>

                            <div className="flex items-center gap-3 group">
                                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#131619] text-gray-500 group-hover:text-cyan-400' : 'bg-gray-50 text-gray-400 group-hover:text-cyan-600'}`}>
                                    <FaMapMarkerAlt size={12} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Centre</p>
                                    <p className={`text-[12px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lead.centre?.centreName || "N/A"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#131619] text-gray-500 group-hover:text-cyan-400' : 'bg-gray-50 text-gray-400 group-hover:text-cyan-600'}`}>
                                    <FaBullseye size={12} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Course & Target</p>
                                    <p className={`text-[12px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {lead.course?.courseName || "N/A"}
                                        {lead.targetExam && <span className="text-gray-500 text-[10px] font-bold uppercase ml-1">({lead.targetExam})</span>}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 group">
                                <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all ${isDarkMode ? 'bg-[#131619] text-gray-500 group-hover:text-cyan-400' : 'bg-gray-50 text-gray-400 group-hover:text-cyan-600'}`}>
                                    <FaInfoCircle size={12} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Status & Source</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black border tracking-wider ${getLeadTypeColor(lead.leadType)}`}>
                                            {lead.leadType || "N/A"}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>• {lead.source || "Unknown"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Script Section */}
                    {userProfile?.assignedScript && (
                        <div className={`p-6 rounded-[4px] border border-dashed relative overflow-hidden transition-all ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50/50 border-cyan-200'}`}>
                            <FaMicrophone className="absolute -right-4 -bottom-4 text-cyan-500/10 text-6xl pointer-events-none" />
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                                CALL SCRIPT
                            </h3>
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center gap-2">
                                    <span className={`font-black uppercase text-xs italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{userProfile.assignedScript.scriptName}</span>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>Active</span>
                                </div>
                                <div className={`rounded-[4px] border p-4 max-h-40 overflow-y-auto custom-scrollbar transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100'}`}>
                                    <p className={`text-[12px] leading-relaxed italic font-medium whitespace-pre-wrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        "{userProfile.assignedScript.scriptContent || "No script content available."}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recordings Section */}
                    <div className="space-y-4">
                        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-4 border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'text-cyan-400 border-gray-800' : 'text-cyan-600 border-gray-100'}`}>
                            CALL RECORDINGS ({recordings.length})
                        </h3>
                        {recordings.length === 0 ? (
                            <div className="py-6 flex flex-col items-center justify-center opacity-40">
                                <FaMicrophone size={24} className="text-gray-500 mb-2" />
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">No call recordings found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recordings.map((rec, idx) => (
                                    <div key={idx} className={`p-4 rounded-[4px] border flex items-center justify-between group transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/30' : 'bg-gray-50 border-gray-100 hover:border-cyan-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'}`}>
                                                <FaPlay size={12} className="ml-0.5" />
                                            </div>
                                            <div>
                                                <p className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rec.fileName || `RECORDING_${idx + 1}`}</p>
                                                <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5 font-mono">{new Date(rec.uploadedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <audio controls className={`h-8 w-48 transition-opacity ${isDarkMode ? 'opacity-40 hover:opacity-100 invert' : 'opacity-70 hover:opacity-100'}`}>
                                            <source src={rec.audioUrl} type="audio/mpeg" />
                                        </audio>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Meta */}
                <div className={`px-8 py-4 border-t flex justify-between items-center ${isDarkMode ? 'bg-[#131619]/50 border-gray-800' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Assigned To</span>
                        <span className={`text-[11px] font-black italic uppercase ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{lead.leadResponsibility || "NONE"}</span>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className={`p-6 border-t ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <div className="mr-auto flex gap-3">
                            <button
                                onClick={() => onShowHistory(lead)}
                                className={`px-5 py-2.5 rounded-[4px] border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                            >
                                <FaCommentAlt size={12} /> View History
                            </button>
                            <button
                                onClick={() => onCounseling(lead)}
                                className="px-5 py-2.5 rounded-[4px] bg-green-600 text-white hover:bg-green-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95"
                            >
                                <FaUser size={12} /> Counseling
                            </button>
                        </div>

                        {canDelete && (
                            <button
                                onClick={() => onDelete(lead._id)}
                                className="px-5 py-2.5 rounded-[4px] bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                            >
                                <FaTrash size={12} /> Delete
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={() => onEdit(lead)}
                                className={`px-5 py-2.5 rounded-[4px] border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100'}`}
                            >
                                <FaEdit size={12} /> Edit
                            </button>
                        )}
                        <button
                            onClick={() => onFollowUp(lead)}
                            className="px-5 py-2.5 rounded-[4px] bg-cyan-600 text-white hover:bg-cyan-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95"
                        >
                            <FaCommentAlt size={12} /> Add Follow Up
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default LeadDetailsModal;
