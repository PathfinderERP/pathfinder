import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import {
    FaUserTie, FaUsers, FaPhoneAlt, FaMicrophone, FaPlay, FaPause,
    FaChevronRight, FaSearch, FaArrowLeft, FaCalendarAlt, FaEnvelope,
    FaFingerprint, FaClock, FaCheckCircle, FaExclamationCircle, FaDownload,
    FaChartPie, FaChartBar, FaQuoteRight, FaStar
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";

// Custom Audio Player Component
const AudioPlayer = ({ src, fileName }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [error, setError] = useState(false);
    const audioRef = useRef(null);

    const togglePlay = async () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            try {
                await audioRef.current.play();
            } catch (err) {
                console.error('Audio playback error:', err);
                toast.error('Failed to play audio. The file may be unavailable.');
                setError(true);
            }
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
        try {
            // Direct download using anchor tag to avoid CORS issues
            const link = document.createElement('a');
            link.href = src;
            link.download = fileName || 'recording.mp3';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download audio. The file may be unavailable.');
        }
    };

    const handleAudioError = (e) => {
        console.error('Audio loading error:', e);
        setError(true);
        toast.error('Failed to load audio. The file may be unavailable or expired.');
    };

    return (
        <div className="bg-[#131619] border border-gray-700 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400">
                    ⚠️ Audio file unavailable. The link may have expired.
                </div>
            )}
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={handleAudioError}
            />

            <div className="flex items-center gap-4">
                <button
                    onClick={togglePlay}
                    disabled={error}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${error
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        }`}
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
                >
                    <FaDownload size={12} />
                </button>
            </div>
        </div>
    );
};

const TelecallingConsole = () => {
    const [telecallers, setTelecallers] = useState([]);
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
            setAssignedLeads([]);
            setExpandedLead(null);
        }
    }, [telecallerNameFromUrl]);

    const fetchTelecallers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin";

            // Get user's assigned centres
            const userCentres = currentUser.centres?.map(c => c._id || c) || [];

            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let telecallersList = (data.users || []).filter(u => u.role === "telecaller");

                // Filter telecallers by centres if not superAdmin
                if (!isSuperAdmin && userCentres.length > 0) {
                    telecallersList = telecallersList.filter(telecaller => {
                        const telecallerCentres = telecaller.centres?.map(c => c._id || c) || [];
                        return telecallerCentres.some(tc => userCentres.includes(tc));
                    });
                }

                setTelecallers(telecallersList);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            if (!telecallerNameFromUrl) setLoading(false);
        }
    };

    const fetchAssignedLeads = async (telecallerName) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin";

            // Get user's assigned centres
            const userCentres = currentUser.centres?.map(c => c.centreName || c) || [];

            const params = new URLSearchParams({ leadResponsibility: telecallerName, limit: 100 });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let leads = data.leads || [];

                // Filter leads by centre if not superAdmin
                if (!isSuperAdmin && userCentres.length > 0) {
                    leads = leads.filter(lead => {
                        const leadCentre = lead.centre;
                        return userCentres.includes(leadCentre);
                    });
                }

                const sortedLeads = leads.sort((a, b) => (b.recordings?.length || 0) - (a.recordings?.length || 0));
                setAssignedLeads(sortedLeads);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTelecallerClick = (telecaller) => {
        navigate(`/admissions/telecalling-console?telecaller=${encodeURIComponent(telecaller.name)}`);
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
                {/* Header */}
                <div className="relative overflow-hidden bg-[#1a1f24] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black text-3xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                <FaMicrophone />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Telecalling Intelligence</h2>
                                <p className="text-gray-400 font-medium mt-1">
                                    {!telecallerNameFromUrl ? "Analyze telecalling performance and script accuracy" : `Speech logs for ${telecallerNameFromUrl}`}
                                </p>
                            </div>
                        </div>
                        {telecallerNameFromUrl && (
                            <button onClick={() => navigate("/admissions/telecalling-console")} className="bg-gray-800 text-white px-6 py-3 rounded-2xl border border-gray-700 hover:border-cyan-500 transition-all flex items-center gap-2">
                                <FaArrowLeft /> Back to List
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-40">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                    </div>
                ) : (
                    <>
                        {!telecallerNameFromUrl ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {telecallers.map(caller => (
                                    <div key={caller._id} onClick={() => handleTelecallerClick(caller)} className="bg-[#1a1f24] border border-gray-800 rounded-3xl p-6 hover:border-cyan-500/50 cursor-pointer transition-all flex flex-col items-center group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-3xl mb-4 border-2 border-cyan-500/20 group-hover:scale-110 transition-transform">
                                            <FaUserTie />
                                        </div>
                                        <h3 className="text-xl font-bold text-white uppercase">{caller.name}</h3>
                                        <div className="flex flex-col items-center mt-2">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Assigned Script</p>
                                            <p className="text-sm text-cyan-400 font-bold">{caller.assignedScript?.scriptName || "No Script Assigned"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Telecaller Performance Overview */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-[#1a1f24] border border-gray-800 rounded-3xl p-6 flex items-center gap-5 shadow-lg overflow-hidden relative">
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
                                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-2xl border border-cyan-500/20">
                                            <FaChartPie />
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Overall Accuracy</p>
                                            <h4 className="text-3xl font-black text-white">
                                                {Math.round(assignedLeads.reduce((acc, lead) => {
                                                    const leadAvg = lead.recordings?.length > 0
                                                        ? lead.recordings.reduce((sum, r) => sum + (r.accuracyScore || 0), 0) / lead.recordings.length
                                                        : 0;
                                                    return acc + leadAvg;
                                                }, 0) / (assignedLeads.filter(l => l.recordings?.length > 0).length || 1))}%
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="bg-[#1a1f24] border border-gray-800 rounded-3xl p-6 flex items-center gap-5 shadow-lg overflow-hidden relative">
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
                                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-2xl border border-purple-500/20">
                                            <FaQuoteRight />
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Assigned Script</p>
                                            <h4 className="text-xl font-bold text-white uppercase truncate max-w-[200px]">
                                                {telecallers.find(u => u.name === telecallerNameFromUrl)?.assignedScript?.scriptName || "N/A"}
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="bg-[#1a1f24] border border-gray-800 rounded-3xl p-6 flex items-center gap-5 shadow-lg overflow-hidden relative">
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
                                        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 text-2xl border border-green-500/20">
                                            <FaCheckCircle />
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Analyzed Calls</p>
                                            <h4 className="text-3xl font-black text-white">
                                                {assignedLeads.reduce((acc, lead) => acc + (lead.recordings?.length || 0), 0)}
                                            </h4>
                                        </div>
                                    </div>
                                </div>

                                {/* Search */}
                                <div className="bg-[#1a1f24] p-4 rounded-2xl border border-gray-800 flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input type="text" placeholder="Filter by student name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#131619] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white focus:border-cyan-500 outline-none" />
                                    </div>
                                    <div className="bg-cyan-500/10 border border-cyan-500/30 px-6 py-3 rounded-xl flex items-center gap-2">
                                        <FaUsers className="text-cyan-400" />
                                        <span className="text-white font-bold">{assignedLeads.length} Students Assigned</span>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="bg-[#1a1f24] border border-gray-800 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#131619] text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-800">
                                                <th className="p-6">Student Information</th>
                                                <th className="p-6">Accuracy %</th>
                                                <th className="p-6">Recordings</th>
                                                <th className="p-6 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {assignedLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => {
                                                const isEx = expandedLead === lead._id;
                                                const avgAccuracy = lead.recordings?.reduce((acc, r) => acc + (r.accuracyScore || 0), 0) / (lead.recordings?.length || 1);

                                                return (
                                                    <React.Fragment key={lead._id}>
                                                        <tr onClick={() => setExpandedLead(isEx ? null : lead._id)} className={`hover:bg-cyan-500/[0.03] cursor-pointer transition-all ${isEx ? 'bg-cyan-500/10' : ''}`}>
                                                            <td className="p-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${lead.recordings?.length > 0 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-gray-800 text-gray-600 border-gray-700'}`}>
                                                                        {lead.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-white font-bold uppercase">{lead.name}</h4>
                                                                        <p className="text-xs text-gray-500 font-medium">{lead.phoneNumber}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-cyan-500" style={{ width: `${avgAccuracy || 0}%` }}></div>
                                                                    </div>
                                                                    <span className={`text-xs font-black ${avgAccuracy > 80 ? 'text-green-400' : 'text-cyan-400'}`}>{Math.round(avgAccuracy || 0)}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-6">
                                                                <span className="text-white font-bold text-sm">{lead.recordings?.length || 0} Logs</span>
                                                            </td>
                                                            <td className="p-6 text-center">
                                                                {lead.recordings?.length > 0 ? (
                                                                    <span className="bg-green-500/10 text-green-400 text-[10px] font-black px-3 py-1 rounded-full border border-green-500/30">ANALYZED</span>
                                                                ) : (
                                                                    <span className="bg-gray-800 text-gray-500 text-[10px] font-black px-3 py-1 rounded-full border border-gray-700">NO DATA</span>
                                                                )}
                                                            </td>
                                                        </tr>

                                                        {isEx && (
                                                            <tr>
                                                                <td colSpan="4" className="bg-[#131619] p-8">
                                                                    <div className="grid grid-cols-1 gap-10">
                                                                        {lead.recordings?.map((rec, idx) => (
                                                                            <div key={idx} className="bg-[#1a1f24] border border-gray-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-[4rem]"></div>

                                                                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                                                                    {/* Left: Info & Audio */}
                                                                                    <div className="xl:col-span-4 space-y-6">
                                                                                        <div>
                                                                                            <span className="text-xs font-black text-cyan-500 uppercase tracking-[0.2em]">Log Entry #{idx + 1}</span>
                                                                                            <h5 className="text-lg font-bold text-white mt-1">{formatDateTime(rec.uploadedAt).date} at {formatDateTime(rec.uploadedAt).time}</h5>
                                                                                        </div>

                                                                                        <AudioPlayer src={rec.audioUrl} fileName={rec.fileName} />

                                                                                        <div className="bg-[#131619] border border-gray-800 rounded-2xl p-4">
                                                                                            <h6 className="text-[10px] text-gray-500 font-black uppercase mb-3 flex items-center gap-2">
                                                                                                <FaQuoteRight /> Transcription Preview
                                                                                            </h6>
                                                                                            <p className="text-sm text-gray-400 italic line-clamp-3 leading-relaxed">"{rec.transcription || "No transcription available."}"</p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Middle: Accuracy Visual */}
                                                                                    <div className="xl:col-span-4 flex flex-col items-center justify-center">
                                                                                        <h6 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                                                                            <FaChartPie className="text-cyan-500" /> Script Accuracy
                                                                                        </h6>
                                                                                        <div className="relative w-40 h-40">
                                                                                            <svg className="w-full h-full transform -rotate-90">
                                                                                                <circle
                                                                                                    cx="80"
                                                                                                    cy="80"
                                                                                                    r="70"
                                                                                                    stroke="#1f2937"
                                                                                                    strokeWidth="20"
                                                                                                    fill="none"
                                                                                                />
                                                                                                <circle
                                                                                                    cx="80"
                                                                                                    cy="80"
                                                                                                    r="70"
                                                                                                    stroke="#06b6d4"
                                                                                                    strokeWidth="20"
                                                                                                    fill="none"
                                                                                                    strokeDasharray={`${(rec.accuracyScore / 100) * 440} 440`}
                                                                                                    className="transition-all duration-1000"
                                                                                                />
                                                                                            </svg>
                                                                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                                                <span className="text-3xl font-black text-white">{rec.accuracyScore}%</span>
                                                                                                <p className="text-[10px] text-gray-500 font-bold">MATCH SCORE</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Right: Performance Bars */}
                                                                                    <div className="xl:col-span-4">
                                                                                        <h6 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                                                                            <FaChartBar className="text-cyan-500" /> Performance Analysis
                                                                                        </h6>
                                                                                        <div className="space-y-4">
                                                                                            <div>
                                                                                                <div className="flex justify-between mb-2">
                                                                                                    <span className="text-xs text-gray-400 font-bold">Clarity</span>
                                                                                                    <span className="text-xs text-cyan-400 font-black">{rec.analysisData?.clarity || 0}%</span>
                                                                                                </div>
                                                                                                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                                                                                    <div
                                                                                                        className="h-full bg-cyan-500 rounded-full transition-all duration-1000"
                                                                                                        style={{ width: `${rec.analysisData?.clarity || 0}%` }}
                                                                                                    ></div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <div className="flex justify-between mb-2">
                                                                                                    <span className="text-xs text-gray-400 font-bold">Pace</span>
                                                                                                    <span className="text-xs text-purple-400 font-black">{rec.analysisData?.pace || 0}%</span>
                                                                                                </div>
                                                                                                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                                                                                    <div
                                                                                                        className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                                                                                                        style={{ width: `${rec.analysisData?.pace || 0}%` }}
                                                                                                    ></div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <div className="flex justify-between mb-2">
                                                                                                    <span className="text-xs text-gray-400 font-bold">Confidence</span>
                                                                                                    <span className="text-xs text-green-400 font-black">{rec.analysisData?.confidence || 0}%</span>
                                                                                                </div>
                                                                                                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                                                                                    <div
                                                                                                        className="h-full bg-green-500 rounded-full transition-all duration-1000"
                                                                                                        style={{ width: `${rec.analysisData?.confidence || 0}%` }}
                                                                                                    ></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
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

            <style>{`
                input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    background: #06b6d4;
                    cursor: pointer;
                    border-radius: 50%;
                }
            `}</style>
        </Layout>
    );
};

export default TelecallingConsole;
