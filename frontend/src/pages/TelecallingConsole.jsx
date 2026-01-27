import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import {
    FaUserTie, FaUsers, FaPhoneAlt, FaMicrophone, FaPlay, FaPause,
    FaSearch, FaArrowLeft, FaCalendarAlt, FaEnvelope,
    FaFingerprint, FaClock, FaCheckCircle, FaDownload,
    FaChartPie, FaChartBar, FaQuoteRight, FaSun, FaMoon, FaSync
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";

// Custom Audio Player Component
const AudioPlayer = ({ src, fileName, isDarkMode }) => {
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
        <div className={`p-4 flex flex-col gap-3 transition-all border rounded-[4px] ${isDarkMode ? 'bg-[#131619] border-gray-700 shadow-inner' : 'bg-gray-50 border-gray-200 shadow-sm'}`}>
            {error && (
                <div className={`rounded-[4px] p-2 text-[10px] font-bold uppercase tracking-widest border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                    ⚠️ Audio file unavailable / Expired
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
                    className={`w-10 h-10 rounded-[4px] flex items-center justify-center transition-all flex-shrink-0 ${error
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 active:scale-95' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg shadow-cyan-500/10 active:scale-95'
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
                        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-500 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}
                    />
                    <div className="flex justify-between text-[9px] font-black text-gray-500 font-mono tracking-widest uppercase">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all border ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border-gray-700' : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200'}`}
                >
                    <FaDownload size={12} />
                </button>
            </div>
        </div>
    );
};

const TelecallingConsole = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('telecallingThemePremium');
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('telecallingThemePremium', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

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
            fetchTelecallers(); // Ensure we have the list when not looking at specific telecaller
        }
    }, [telecallerNameFromUrl]);

    const fetchTelecallers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin" || currentUser.role === "Super Admin";

            const userCentres = currentUser.centres?.map(c => c._id || c) || [];

            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let telecallersList = (data.users || []).filter(u => u.role === "telecaller");

                if (!isSuperAdmin && userCentres.length > 0) {
                    telecallersList = telecallersList.filter(telecaller => {
                        const telecallerCentres = telecaller.centres?.map(c => c._id || c) || [];
                        return telecallerCentres.some(tc => userCentres.includes(tc));
                    });
                }
                setTelecallers(telecallersList);
            }
        } catch (error) {
            console.error("Error fetching telecallers:", error);
        } finally {
            if (!telecallerNameFromUrl) setLoading(false);
        }
    };

    const fetchAssignedLeads = async (telecallerName) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin" || currentUser.role === "Super Admin";

            const userCentres = currentUser.centres?.map(c => c.centreName || c) || [];

            const params = new URLSearchParams({ leadResponsibility: telecallerName, limit: 100 });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let leads = data.leads || [];

                if (!isSuperAdmin && userCentres.length > 0) {
                    leads = leads.filter(lead => userCentres.includes(lead.centre));
                }

                const sortedLeads = leads.sort((a, b) => (b.recordings?.length || 0) - (a.recordings?.length || 0));
                setAssignedLeads(sortedLeads);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
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
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />

                {/* Tactical Header */}
                <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-30 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <div>
                            <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Telecalling Audit Console
                            </h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2 italic">
                                {!telecallerNameFromUrl ? "ANALYZE PERFORMANCE AND SCRIPT ACCURACY" : `SPEECH LOGS FOR AGENT: ${telecallerNameFromUrl.toUpperCase()}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                            title="Toggle Mode"
                        >
                            {isDarkMode ? <FaSun /> : <FaMoon />}
                        </button>
                        <button
                            onClick={() => telecallerNameFromUrl ? fetchAssignedLeads(telecallerNameFromUrl) : fetchTelecallers()}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black' : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100 shadow-sm'}`}
                            title="Refresh Data"
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-8 space-y-8 custom-scrollbar overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-6">
                            <FaSync size={48} className="text-cyan-500 animate-spin" />
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-500 animate-pulse">Synchronizing Neural Data...</p>
                        </div>
                    ) : (
                        <>
                            {!telecallerNameFromUrl ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                                    {telecallers.map(caller => (
                                        <div
                                            key={caller._id}
                                            onClick={() => handleTelecallerClick(caller)}
                                            className={`p-8 rounded-[4px] border transition-all cursor-pointer group flex flex-col items-center relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/50 hover:bg-[#1e242a]' : 'bg-white border-gray-200 hover:border-cyan-500/50 hover:bg-gray-50 shadow-sm'}`}
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                                            <div className={`w-24 h-24 rounded-[4px] flex items-center justify-center text-4xl mb-6 shadow-xl transition-all group-hover:scale-110 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-100 shadow-sm'}`}>
                                                <FaUserTie />
                                            </div>
                                            <h3 className={`text-xl font-black uppercase tracking-tight text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{caller.name}</h3>
                                            <div className="flex flex-col items-center mt-4">
                                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">ASSIGNED SCRIPT</p>
                                                <p className={`text-[11px] font-black uppercase mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{caller.assignedScript?.scriptName || "NO OPERATIONAL SCRIPT"}</p>
                                            </div>
                                            <div className={`mt-6 w-full pt-6 border-t flex justify-center ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-500/40 group-hover:text-cyan-400' : 'text-cyan-600/40 group-hover:text-cyan-600'}`}>VIEW AGENCY LOGS →</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-10 animate-fadeIn">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className={`p-8 rounded-[4px] border transition-all flex items-center gap-6 shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
                                            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl border transition-transform hover:scale-110 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-lg shadow-cyan-500/10' : 'bg-cyan-50 text-cyan-600 border-cyan-100 shadow-sm'}`}>
                                                <FaUsers />
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">TOTAL SUBJECTS</p>
                                                <h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{assignedLeads.length}</h4>
                                            </div>
                                        </div>

                                        <div className={`p-8 rounded-[4px] border transition-all flex items-center gap-6 shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
                                            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl border transition-transform hover:scale-110 ${isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-lg shadow-purple-500/10' : 'bg-purple-50 text-purple-600 border-purple-100 shadow-sm'}`}>
                                                <FaMicrophone />
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">VOICE LOGS</p>
                                                <h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {assignedLeads.reduce((acc, lead) => acc + (lead.recordings?.length || 0), 0)}
                                                </h4>
                                            </div>
                                        </div>

                                        <div className={`p-8 rounded-[4px] border transition-all flex items-center gap-6 shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
                                            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl border transition-transform hover:scale-110 ${isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-lg shadow-green-500/10' : 'bg-green-50 text-green-600 border-green-100 shadow-sm'}`}>
                                                <FaCheckCircle />
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">ACCURACY INDEX</p>
                                                <h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {Math.round(assignedLeads.reduce((acc, lead) => {
                                                        const avg = lead.recordings?.length > 0 ? lead.recordings.reduce((s, r) => s + (r.accuracyScore || 0), 0) / lead.recordings.length : 0;
                                                        return acc + avg;
                                                    }, 0) / (assignedLeads.filter(l => l.recordings?.length > 0).length || 1))}%
                                                </h4>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Search and List */}
                                    <div className={`rounded-[4px] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                        <div className={`p-6 border-b transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="relative group max-w-md">
                                                <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                                                <input
                                                    type="text"
                                                    placeholder="LOCATE SUBJECT IN MATRIX..."
                                                    value={searchTerm}
                                                    onChange={e => setSearchTerm(e.target.value)}
                                                    className={`w-full pl-12 pr-4 py-3 rounded-[4px] border text-[11px] font-black uppercase tracking-widest focus:outline-none transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                />
                                            </div>
                                        </div>

                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`${isDarkMode ? 'bg-[#131619] text-gray-500' : 'bg-gray-50 text-gray-400'} text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                    <th className="p-6">STUDENT DATA VECTOR</th>
                                                    <th className="p-6 text-center">ANALYTICS</th>
                                                    <th className="p-6 text-center">LOG DENSITY</th>
                                                    <th className="p-6 text-center">STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                                {assignedLeads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => {
                                                    const isEx = expandedLead === lead._id;
                                                    const avgAccuracy = lead.recordings?.reduce((acc, r) => acc + (r.accuracyScore || 0), 0) / (lead.recordings?.length || 1);

                                                    return (
                                                        <React.Fragment key={lead._id}>
                                                            <tr
                                                                onClick={() => setExpandedLead(isEx ? null : lead._id)}
                                                                className={`transition-all cursor-pointer ${isEx ? (isDarkMode ? 'bg-cyan-500/5' : 'bg-cyan-50/50') : (isDarkMode ? 'hover:bg-cyan-500/10' : 'hover:bg-gray-50')}`}
                                                            >
                                                                <td className="p-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center font-black text-lg border transition-all ${lead.recordings?.length > 0 ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/10' : 'bg-cyan-50 text-cyan-600 border-cyan-200') : (isDarkMode ? 'bg-gray-800 text-gray-600 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200')}`}>
                                                                            {lead.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className={`font-black uppercase tracking-tight text-[11px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lead.name}</h4>
                                                                            <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5">{lead.phoneNumber}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6">
                                                                    <div className="flex items-center gap-4 justify-center">
                                                                        <div className={`w-24 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                            <div className="h-full bg-cyan-500 rounded-full transition-all duration-1000" style={{ width: `${avgAccuracy || 0}%` }}></div>
                                                                        </div>
                                                                        <span className={`text-[10px] font-black tracking-widest ${avgAccuracy > 80 ? 'text-green-500' : 'text-cyan-500'}`}>{Math.round(avgAccuracy || 0)}%</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6 text-center">
                                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.recordings?.length || 0} LOGS</span>
                                                                </td>
                                                                <td className="p-6 text-center">
                                                                    <span className={`text-[9px] font-black px-3 py-1 rounded-[4px] border ${lead.recordings?.length > 0 ? (isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-200') : (isDarkMode ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200')}`}>
                                                                        {lead.recordings?.length > 0 ? "ANALYZED" : "NO_DATA"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {isEx && (
                                                                <tr>
                                                                    <td colSpan="4" className={`p-10 transition-all ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                                                                        <div className="grid grid-cols-1 gap-10">
                                                                            {lead.recordings?.map((rec, idx) => (
                                                                                <div key={idx} className={`p-8 rounded-[4px] border shadow-2xl relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-[4rem]"></div>
                                                                                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                                                                        <div className="xl:col-span-4 space-y-6">
                                                                                            <div>
                                                                                                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">LOG ENTRY #{idx + 1}</span>
                                                                                                <h5 className={`text-xl font-black italic tracking-tighter mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(rec.uploadedAt).date} | {formatDateTime(rec.uploadedAt).time}</h5>
                                                                                            </div>
                                                                                            <AudioPlayer src={rec.audioUrl} fileName={rec.fileName} isDarkMode={isDarkMode} />
                                                                                            <div className={`p-5 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                                                                <h6 className="text-[9px] text-gray-500 font-black uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                                                                                                    <FaQuoteRight size={10} /> TRANSCRIPTION PREVIEW
                                                                                                </h6>
                                                                                                <p className={`text-[12px] italic leading-relaxed font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>"{rec.transcription || "No transcription available."}"</p>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="xl:col-span-4 flex flex-col items-center justify-center">
                                                                                            <h6 className={`text-[10px] font-black uppercase tracking-widest mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>SCRIPT ACCURACY</h6>
                                                                                            <div className="relative w-48 h-48">
                                                                                                <svg className="w-full h-full transform -rotate-90">
                                                                                                    <circle cx="96" cy="96" r="80" stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} strokeWidth="16" fill="none" />
                                                                                                    <circle
                                                                                                        cx="96" cy="96" r="80"
                                                                                                        stroke="#06b6d4" strokeWidth="16" fill="none"
                                                                                                        strokeDasharray={`${(rec.accuracyScore / 100) * 502.4} 502.4`}
                                                                                                        className="transition-all duration-1000"
                                                                                                    />
                                                                                                </svg>
                                                                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                                                    <span className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rec.accuracyScore}%</span>
                                                                                                    <p className="text-[9px] text-gray-500 font-black uppercase mt-1 tracking-widest">MATCH SCORE</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="xl:col-span-4 space-y-6">
                                                                                            <h6 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>PERFORMANCE METRICS</h6>
                                                                                            <div className="space-y-6">
                                                                                                {[
                                                                                                    { label: 'CLARITY', val: rec.analysisData?.clarity || 0, color: 'bg-cyan-500' },
                                                                                                    { label: 'PACE', val: rec.analysisData?.pace || 0, color: 'bg-purple-500' },
                                                                                                    { label: 'CONFIDENCE', val: rec.analysisData?.confidence || 0, color: 'bg-green-500' }
                                                                                                ].map(metric => (
                                                                                                    <div key={metric.label}>
                                                                                                        <div className="flex justify-between mb-2">
                                                                                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{metric.label}</span>
                                                                                                            <span className={`text-[10px] font-black tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{metric.val}%</span>
                                                                                                        </div>
                                                                                                        <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                                                            <div className={`h-full ${metric.color} rounded-full transition-all duration-1000`} style={{ width: `${metric.val}%` }} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
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
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
                .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </Layout>
    );
};

export default TelecallingConsole;
