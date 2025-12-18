import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import {
    FaUserTie, FaUsers, FaPhoneAlt, FaMicrophone, FaPlay, FaPause,
    FaChevronRight, FaSearch, FaArrowLeft, FaCalendarAlt, FaEnvelope,
    FaFingerprint, FaClock, FaCheckCircle, FaExclamationCircle, FaDownload
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";

// Custom Audio Player Component for better visibility and control
const AudioPlayer = ({ src, fileName }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const onTimeUpdate = () => {
        setCurrentTime(audioRef.current.currentTime);
    };

    const onLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const handleSeek = (e) => {
        const time = e.target.value;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = src;
        link.download = fileName || 'recording.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-[#131619] border border-gray-700 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />

            <div className="flex items-center gap-4">
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex-shrink-0"
                >
                    {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-0.5" />}
                </button>

                <div className="flex-1 flex flex-col gap-1">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-700 hover:text-white transition-all border border-gray-700"
                    title="Download Recording"
                >
                    <FaDownload size={12} />
                </button>
            </div>
        </div>
    );
};

const TelecallingConsole = () => {
    const [telecallers, setTelecallers] = useState([]);
    const [selectedTelecaller, setSelectedTelecaller] = useState(null);
    const [assignedLeads, setAssignedLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedLead, setExpandedLead] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const telecallerNameFromUrl = queryParams.get("telecaller");

    useEffect(() => {
        fetchTelecallers();
    }, []);

    useEffect(() => {
        if (telecallerNameFromUrl) {
            fetchAssignedLeads(telecallerNameFromUrl);
        } else {
            setSelectedTelecaller(null);
            setAssignedLeads([]);
            setExpandedLead(null);
        }
    }, [telecallerNameFromUrl]);

    const fetchTelecallers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                const callers = (data.users || []).filter(u => u.role === "telecaller");
                setTelecallers(callers);

                if (telecallerNameFromUrl) {
                    const found = callers.find(c => c.name === telecallerNameFromUrl);
                    if (found) setSelectedTelecaller(found);
                }
            } else {
                toast.error(data.message || "Failed to fetch telecallers");
            }
        } catch (error) {
            console.error("Error fetching telecallers:", error);
            toast.error("Error fetching telecallers");
        } finally {
            if (!telecallerNameFromUrl) setLoading(false);
        }
    };

    const fetchAssignedLeads = async (telecallerName) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                leadResponsibility: telecallerName,
                limit: 100
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                const sortedLeads = (data.leads || []).sort((a, b) => {
                    const aRecCount = a.recordings?.length || 0;
                    const bRecCount = b.recordings?.length || 0;
                    if (aRecCount > 0 && bRecCount === 0) return -1;
                    if (aRecCount === 0 && bRecCount > 0) return 1;
                    return 0;
                });
                setAssignedLeads(sortedLeads);
            } else {
                toast.error(data.message || "Failed to fetch leads");
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
            toast.error("Error fetching leads");
        } finally {
            setLoading(false);
        }
    };

    const handleTelecallerClick = (telecaller) => {
        navigate(`/admissions/telecalling-console?telecaller=${encodeURIComponent(telecaller.name)}`);
    };

    const handleBack = () => {
        navigate(`/admissions/telecalling-console`);
    };

    const toggleLeadExpansion = (leadId) => {
        setExpandedLead(expandedLead === leadId ? null : leadId);
    };

    const getLeadTypeColor = (type) => {
        switch (type) {
            case "HOT LEAD": return "bg-red-500/20 text-red-400 border-red-500/30";
            case "COLD LEAD": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            case "NEGATIVE": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
            default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    return (
        <Layout activePage="Admissions">
            <div className="p-6 space-y-6 min-h-screen bg-[#131619]">
                {/* Header Section */}
                <div className="relative overflow-hidden bg-[#1a1f24] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black text-3xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                <FaPhoneAlt />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                                    Telecalling Console
                                </h2>
                                <p className="text-gray-400 font-medium mt-1">
                                    {!telecallerNameFromUrl
                                        ? "Master Control Panel for Telecalling Activity"
                                        : `Detailed Student Logs for ${telecallerNameFromUrl}`}
                                </p>
                            </div>
                        </div>

                        {telecallerNameFromUrl && (
                            <button
                                onClick={handleBack}
                                className="group flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700 text-white px-6 py-3 rounded-2xl transition-all border border-gray-700 hover:border-cyan-500/50"
                            >
                                <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                                <span>Return to List</span>
                            </button>
                        )}
                    </div>
                </div>

                {loading && !telecallers.length ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Synchronizing Logs...</p>
                    </div>
                ) : (
                    <>
                        {!telecallerNameFromUrl ? (
                            /* TELECALLERS GRID VIEW */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {telecallers.map((caller) => (
                                    <div
                                        key={caller._id}
                                        onClick={() => handleTelecallerClick(caller)}
                                        className="bg-[#1a1f24] border border-gray-800 rounded-3xl p-6 hover:border-cyan-500/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-3xl mb-4 border-2 border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                            <FaUserTie />
                                        </div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{caller.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1 mb-4">{caller.email}</p>

                                        <div className="px-4 py-1 rounded-full bg-gray-800 text-gray-400 text-[10px] font-black uppercase tracking-widest border border-gray-700">
                                            Active Caller
                                        </div>

                                        <div className="w-full mt-6 pt-4 border-t border-gray-800 flex justify-center items-center text-cyan-500 group-hover:text-cyan-400 gap-2 font-bold text-xs pointer-events-none">
                                            VIEW STUDENTS <FaChevronRight size={10} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* ASSIGNED LEADS TABLE VIEW */
                            <div className="space-y-6">
                                {/* Search & Stats */}
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="flex-1 min-w-[300px] relative">
                                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search students by name, phone or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#1a1f24] border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-cyan-500 outline-none transition-all shadow-xl"
                                        />
                                    </div>
                                    <div className="bg-[#1a1f24] border border-gray-800 px-6 py-4 rounded-2xl flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Students</p>
                                            <p className="text-xl font-bold text-white">{assignedLeads.length}</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-800"></div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">With Audio</p>
                                            <p className="text-xl font-bold text-cyan-400">{assignedLeads.filter(l => l.recordings?.length > 0).length}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Header */}
                                <div className="bg-[#1a1f24] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#131619] text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-800">
                                                <th className="p-6">Student Information</th>
                                                <th className="p-6">Lead Status</th>
                                                <th className="p-6">Audio Status</th>
                                                <th className="p-6 text-center">Recordings</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {assignedLeads
                                                .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || (l.phoneNumber && l.phoneNumber.includes(searchTerm)))
                                                .map((lead) => {
                                                    const hasRecordings = lead.recordings?.length > 0;
                                                    const isExpanded = expandedLead === lead._id;

                                                    return (
                                                        <React.Fragment key={lead._id}>
                                                            <tr
                                                                onClick={() => toggleLeadExpansion(lead._id)}
                                                                className={`hover:bg-cyan-500/[0.02] cursor-pointer transition-colors group ${isExpanded ? 'bg-cyan-500/[0.03]' : ''}`}
                                                            >
                                                                <td className="p-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${hasRecordings ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-gray-800 text-gray-600 border-gray-700'}`}>
                                                                            {lead.name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{lead.name}</h4>
                                                                            <p className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                                                                                <span>{lead.phoneNumber}</span>
                                                                                <span className="text-gray-700">•</span>
                                                                                <span className="truncate max-w-[150px]">{lead.email}</span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6">
                                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${getLeadTypeColor(lead.leadType)}`}>
                                                                        {lead.leadType || "N/A"}
                                                                    </span>
                                                                </td>
                                                                <td className="p-6">
                                                                    {hasRecordings ? (
                                                                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-tighter">
                                                                            <FaCheckCircle /> Voice Logged
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 text-gray-700 font-bold text-xs uppercase tracking-tighter">
                                                                            <FaExclamationCircle /> No Audio
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-6 text-center">
                                                                    <div className="inline-flex items-center gap-3 bg-gray-800/50 px-3 py-1.5 rounded-xl border border-gray-700 group-hover:border-cyan-500/30 transition-all">
                                                                        <span className={`text-xs font-bold ${hasRecordings ? 'text-cyan-400' : 'text-gray-600'}`}>
                                                                            {lead.recordings?.length || 0}
                                                                        </span>
                                                                        <FaMicrophone size={12} className={hasRecordings ? 'text-cyan-400' : 'text-gray-600'} />
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {/* EXPANDED RECORDINGS SECTION */}
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan="4" className="bg-[#131619]/50 p-8">
                                                                        <div className="space-y-6">
                                                                            <h5 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                                <div className="w-1.5 h-4 bg-cyan-500 rounded-full"></div>
                                                                                CALL RECORDING TIMELINE
                                                                            </h5>

                                                                            {hasRecordings ? (
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                                    {lead.recordings.map((rec, idx) => {
                                                                                        const dt = formatDateTime(rec.uploadedAt);
                                                                                        return (
                                                                                            <div key={idx} className="bg-[#1a1f24] border border-gray-800 rounded-3xl p-6 flex flex-col gap-5 hover:border-cyan-500/40 transition-all group/player shadow-2xl relative">
                                                                                                <div className="flex justify-between items-start">
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">RECORDING #{idx + 1}</span>
                                                                                                        <div className="flex items-center gap-3 text-white">
                                                                                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                                                                                <FaCalendarAlt className="text-gray-600" size={12} /> {dt.date}
                                                                                                            </div>
                                                                                                            <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                                                                                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                                                                                <FaClock className="text-gray-600" size={12} /> {dt.time}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 group-hover/player:bg-cyan-500 group-hover/player:text-black transition-all">
                                                                                                        <FaMicrophone size={16} />
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* USE CUSTOM AUDIO PLAYER FOR RELIABILITY */}
                                                                                                <AudioPlayer
                                                                                                    src={rec.audioUrl}
                                                                                                    fileName={rec.fileName}
                                                                                                />

                                                                                                <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-wider">
                                                                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                                                    File: {rec.fileName || 'unknown'}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="py-16 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-[#1a1f24]/30">
                                                                                    <FaMicrophone size={48} className="text-gray-800 mx-auto mb-4 opacity-30" />
                                                                                    <p className="text-gray-600 font-black uppercase text-xs tracking-[0.2em]">No voice logs recorded for this student</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style jsx>{`
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    background: #06b6d4;
                    cursor: pointer;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
                }
                
                input[type='range']::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    background: #06b6d4;
                    cursor: pointer;
                    border-radius: 50%;
                    border: none;
                }
            `}</style>
        </Layout>
    );
};

export default TelecallingConsole;
