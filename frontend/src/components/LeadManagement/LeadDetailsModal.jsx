import React from "react";
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaSchool, FaMapMarkerAlt, FaBook, FaInfoCircle, FaBullseye, FaTrash, FaEdit, FaCommentAlt, FaMicrophone, FaPlay, FaMicrophoneSlash, FaPause, FaTh, FaPhoneSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import ExotelCRMWebSDK from "@exotel-npm-dev/exotel-ip-calling-crm-websdk";

// Module-level persistent state for Exotel WebRTC (preserves registration across modal open/close)
let globalWebPhone = null;
let globalWebSDK = null;
let globalIsDeviceRegistered = false;
let globalCallStatus = "idle";
let globalCallMessage = "";
let globalIsIncomingCall = false;
let globalIsMuted = false;
let globalIsOnHold = false;
let globalCallDuration = 0;
let globalActiveCallObj = null;
let globalTimerId = null;

// Subscribers for state updates
const subscribers = new Set();
const notifySubscribers = () => {
    subscribers.forEach(sub => sub({
        isDeviceRegistered: globalIsDeviceRegistered,
        callStatus: globalCallStatus,
        callMessage: globalCallMessage,
        isIncomingCall: globalIsIncomingCall,
        isMuted: globalIsMuted,
        isOnHold: globalIsOnHold,
        callDuration: globalCallDuration
    }));
};

const LeadDetailsModal = ({ lead, onClose, onEdit, onDelete, onFollowUp, onCounseling, onShowHistory, onWalkIn, canEdit, canDelete, isDarkMode }) => {
    const [recordings, setRecordings] = React.useState((lead?.recordings || []).filter(rec => rec.audioUrl && !rec.audioUrl.toLowerCase().includes("twilio")));
    const [userProfile, setUserProfile] = React.useState(null);
    
    // Local state variables bound to persistent global state
    const [callStatus, setCallStatus] = React.useState(globalCallStatus); 
    const [callMessage, setCallMessage] = React.useState(globalCallMessage);
    const [callDuration, setCallDuration] = React.useState(globalCallDuration);
    const [isMuted, setIsMuted] = React.useState(globalIsMuted);
    const [isOnHold, setIsOnHold] = React.useState(globalIsOnHold);
    const [isIncomingCall, setIsIncomingCall] = React.useState(globalIsIncomingCall);
    const [isDeviceRegistered, setIsDeviceRegistered] = React.useState(globalIsDeviceRegistered);
    const [isKeypadOpen, setIsKeypadOpen] = React.useState(false);

    const lastMuteClick = React.useRef(0);
    const lastHoldClick = React.useRef(0);
    const isOutboundCallRef = React.useRef(false);

    // Sync local state with global state on mount and when changed
    React.useEffect(() => {
        const updateState = (state) => {
            setIsDeviceRegistered(state.isDeviceRegistered);
            setCallStatus(state.callStatus);
            setCallMessage(state.callMessage);
            setIsIncomingCall(state.isIncomingCall);
            setIsMuted(state.isMuted);
            setIsOnHold(state.isOnHold);
            setCallDuration(state.callDuration);
        };
        
        subscribers.add(updateState);
        return () => {
            subscribers.delete(updateState);
        };
    }, []);

    const debounceClick = (ref, callback, delay = 500) => {
        const now = Date.now();
        if (now - ref.current < delay) return;
        ref.current = now;
        callback();
    };

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

    const initWebRTC = async () => {
        if (globalWebPhone) {
            console.log("[Exotel WebRTC]: Using existing registered device.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/call/token`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch voice token");
            }

            if (!globalWebPhone) {
                globalWebSDK = new ExotelCRMWebSDK(data.token, data.userId, true);

                const HandleCallEvents = (eventType, callObj) => {
                    console.log("[Exotel Call Event]:", eventType, callObj);
                    globalActiveCallObj = callObj;
                    switch (eventType) {
                        case "incoming":
                            globalCallStatus = "ringing";
                            globalIsIncomingCall = true;
                            globalCallMessage = isOutboundCallRef.current ? "Agent leg ringing (outbound)..." : "Incoming call...";
                            notifySubscribers();
                            break;
                        case "connected":
                            globalCallStatus = "connected";
                            globalIsIncomingCall = false;
                            globalCallMessage = "Call connected! Talk now.";
                            globalIsMuted = false;
                            globalIsOnHold = false;
                            notifySubscribers();
                            
                            // Start timer
                            globalCallDuration = 0;
                            if (globalTimerId) clearInterval(globalTimerId);
                            globalTimerId = setInterval(() => {
                                globalCallDuration += 1;
                                notifySubscribers();
                            }, 1000);
                            break;
                        case "callEnded":
                            isOutboundCallRef.current = false;
                            globalCallStatus = "disconnected";
                            globalIsIncomingCall = false;
                            globalIsMuted = false;
                            globalIsOnHold = false;
                            globalCallMessage = "Call disconnected.";
                            notifySubscribers();
                            if (globalTimerId) {
                                clearInterval(globalTimerId);
                                globalTimerId = null;
                            }
                            setTimeout(() => {
                                globalCallStatus = "idle";
                                notifySubscribers();
                            }, 3000);
                            break;
                        case "holdtoggle":
                            globalIsOnHold = !globalIsOnHold;
                            notifySubscribers();
                            break;
                        case "mutetoggle":
                            globalIsMuted = !globalIsMuted;
                            notifySubscribers();
                            break;
                        default:
                            break;
                    }
                };

                const RegisterationEvent = (event) => {
                    console.log("[Exotel Register Event]:", event);
                    if (event === "registered") {
                        globalIsDeviceRegistered = true;
                        globalCallMessage = "Exotel softphone is online.";
                        console.log('Exotel WebRTC Device registered successfully.');
                        notifySubscribers();
                    } else if (event === "unregistered") {
                        globalIsDeviceRegistered = false;
                        notifySubscribers();
                    }
                };

                const crmWebPhone = await globalWebSDK.Initialize(HandleCallEvents, RegisterationEvent);
                if (!crmWebPhone) {
                    throw new Error("Exotel WebRTC device initialization failed.");
                }
                globalWebPhone = crmWebPhone;
            }
        } catch (error) {
            console.error("WebRTC initialization error:", error);
            globalCallMessage = "Calling capability offline.";
            notifySubscribers();
        }
    };

    React.useEffect(() => {
        if (lead) {
            setRecordings((lead.recordings || []).filter(rec => rec.audioUrl && !rec.audioUrl.toLowerCase().includes("twilio")));
        }
        fetchUserProfile();
        initWebRTC();

        return () => {
            // Keep WebRTC online. Do not unregister globalWebPhone.
        };
    }, [lead]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCallNow = async () => {
        let leadNumber = lead.phoneNumber || lead.secondPhoneNumber;
        if (!leadNumber) {
            toast.error("Lead does not have any phone number configured.");
            return;
        }

        leadNumber = leadNumber.replace(/[^\d+]/g, "");

        globalCallStatus = "connecting";
        globalCallMessage = "Requesting microphone permissions...";
        notifySubscribers();

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });

            if (!globalWebPhone) {
                globalCallMessage = "Initializing WebRTC device...";
                notifySubscribers();
                await initWebRTC();
            }

            if (!globalWebPhone) {
                throw new Error("Exotel softphone is not initialized.");
            }

            globalCallMessage = "Connecting call...";
            notifySubscribers();
            isOutboundCallRef.current = true;

            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/call/outbound-call`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ to: leadNumber })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to initiate outbound call on server.");
            }

            const callData = await response.json();
            console.log("[Exotel Outbound Call Success]:", callData);
            globalCallStatus = "ringing";
            globalIsIncomingCall = true;
            globalCallMessage = "Agent WebSDK softphone is ringing...";
            notifySubscribers();

        } catch (error) {
            isOutboundCallRef.current = false;
            console.error("Outbound WebRTC call error:", error);
            globalCallStatus = "error";
            globalCallMessage = error.message || "Failed to initialize WebRTC call.";
            notifySubscribers();
            toast.error(error.message || "Microphone access denied or connection failed.");
            setTimeout(() => {
                globalCallStatus = "idle";
                notifySubscribers();
            }, 3000);
        }
    };

    const handleHangUp = () => {
        isOutboundCallRef.current = false;
        if (globalWebPhone) {
            globalWebPhone.HangupCall();
        }
        if (globalTimerId) {
            clearInterval(globalTimerId);
            globalTimerId = null;
        }
        globalCallStatus = "disconnected";
        globalIsIncomingCall = false;
        globalIsMuted = false;
        globalIsOnHold = false;
        globalCallMessage = "Call hung up by agent.";
        notifySubscribers();
        setTimeout(() => {
            globalCallStatus = "idle";
            notifySubscribers();
        }, 3000);
    };

    const handleToggleMute = () => {
        if (!globalWebPhone) return;
        debounceClick(lastMuteClick, () => {
            globalWebPhone.ToggleMute();
        });
    };

    const handleToggleHold = () => {
        if (!globalWebPhone) return;
        debounceClick(lastHoldClick, () => {
            globalWebPhone.ToggleHold();
        });
    };

    const handleSendDTMF = (digit) => {
        if (!globalWebPhone) return;
        globalWebPhone.SendDTMF(digit.toString());
        toast.info(`Sent tone: ${digit}`, { autoClose: 1000 });
    };

    const handleAcceptCall = () => {
        if (!globalWebPhone) return;
        globalWebPhone.AcceptCall();
        globalCallStatus = "connected";
        globalIsIncomingCall = false;
        globalIsMuted = false;
        globalIsOnHold = false;
        notifySubscribers();
    };

    const getAudioUrl = (url) => {
        if (!url) return "";
        if (url.toLowerCase().includes("twilio")) {
            return "";
        }
        if (url.includes("exotel.com") || url.includes("exotel.in")) {
            const token = localStorage.getItem("token");
            return `${import.meta.env.VITE_API_URL}/lead-management/call/recording-proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(token)}`;
        }
        return url;
    };

    if (!lead) return null;

    const getLeadTypeColor = (type) => {
        switch (type) {
            case "HOT LEAD": return isDarkMode ? "text-red-400 border-red-500/50 bg-red-500/10" : "text-red-600 border-red-200 bg-red-50";
            case "WARM LEAD": return isDarkMode ? "text-orange-400 border-orange-500/50 bg-orange-500/10" : "text-orange-600 border-orange-200 bg-orange-50";
            case "COLD LEAD": return isDarkMode ? "text-blue-400 border-blue-500/50 bg-blue-500/10" : "text-blue-600 border-blue-200 bg-blue-50";
            default: return isDarkMode ? "text-gray-400 border-gray-500/50 bg-gray-500/10" : "text-gray-600 border-gray-200 bg-gray-50";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl rounded-none sm:rounded-[4px] border transition-all flex flex-col ${isDarkMode ? 'bg-[#1a1f24] border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'bg-white border-gray-200 shadow-2xl'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-5 py-5 sm:px-8 sm:py-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden shrink-0 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>

                    <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
                        <div className={`shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-[4px] border flex items-center justify-center text-lg sm:text-2xl font-black transition-all ${isDarkMode ? 'bg-cyan-900/30 border-cyan-500/30 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-600'}`}>
                            {lead.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className={`text-lg sm:text-2xl font-black uppercase tracking-tight italic truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lead.name}</h2>
                            <p className="text-gray-500 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mt-1 truncate">
                                <FaEnvelope size={10} className="text-cyan-500 shrink-0" /> <span className="truncate">{lead.email}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end mt-4 sm:mt-0 z-10">
                        {/* Device Registration Status Pill */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-[9px] font-black uppercase tracking-widest shrink-0 ${
                            isDeviceRegistered 
                                ? (isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700')
                                : (isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isDeviceRegistered ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            {isDeviceRegistered ? "Phone Online" : "Phone Offline"}
                        </div>
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
                <div className={`p-6 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
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
                                    <FaPhone size={12} className="rotate-90" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Second Phone Number</p>
                                    <p className={`text-[12px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lead.secondPhoneNumber || "N/A"}</p>
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

                    {/* Incoming Call Ringing Overlay */}
                    {isIncomingCall && (
                        <div className={`p-6 rounded-[4px] border border-green-500/30 mb-6 flex flex-col items-center justify-center space-y-4 animate-pulse ${
                            isDarkMode ? 'bg-green-500/5' : 'bg-green-50/50'
                        }`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-bounce`}>
                                <FaPhone size={24} className="animate-pulse" />
                            </div>
                            <div className="text-center">
                                <h4 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>INCOMING CALL</h4>
                                <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Agent WebSDK softphone is ringing...</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleAcceptCall}
                                    className="px-6 py-2.5 rounded-[4px] bg-green-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-green-500 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-green-600/20"
                                >
                                    <FaPhone size={10} /> Accept Call
                                </button>
                                <button
                                    onClick={handleHangUp}
                                    className="px-6 py-2.5 rounded-[4px] bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-500 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-red-600/20"
                                >
                                    <FaPhoneSlash size={10} /> Decline
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Call Status & Premium Active Call Console */}
                    {callStatus !== "idle" && !isIncomingCall && (
                        <div className={`p-6 rounded-[4px] border mb-6 transition-all ${
                            isDarkMode 
                                ? 'bg-[#131619]/90 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.05)]' 
                                : 'bg-slate-50 border-gray-200 shadow-inner'
                        }`}>
                            {/* Device & Status Header */}
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        callStatus === "connecting" ? 'bg-amber-500 animate-pulse' :
                                        callStatus === "ringing" ? (isIncomingCall ? 'bg-green-500 animate-bounce' : 'bg-cyan-500 animate-ping') :
                                        callStatus === "connected" ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                    }`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {callMessage}
                                    </span>
                                </div>
                                <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-[4px] border ${
                                    isDeviceRegistered 
                                        ? (isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700')
                                        : (isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                                }`}>
                                    {isDeviceRegistered ? "Device Online" : "Device Offline"}
                                </div>
                            </div>

                            {/* Active call details */}
                            <div className="flex flex-col items-center justify-center py-4 space-y-2 border-t border-b border-dashed border-gray-800/10">
                                <span className={`text-xs font-bold uppercase tracking-widest ${isIncomingCall ? 'text-green-500 animate-pulse' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {isIncomingCall ? "INCOMING CALL (AGENT DEVICE)" : callStatus === "connected" ? "Ongoing Session" : "Outbound Ringing"}
                                </span>
                                <span className={`text-xl font-mono font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {lead.phoneNumber || lead.secondPhoneNumber}
                                </span>
                                {callStatus === "connected" && (
                                    <span className={`text-sm font-mono font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                        {formatDuration(callDuration)}
                                    </span>
                                )}
                            </div>

                            {/* Call Action Panel (Mute, Hold, Keypad, Hangup) */}
                            {["connecting", "ringing", "connected"].includes(callStatus) && (
                                <div className="flex items-center justify-center gap-6 mt-6">
                                    {/* Mute Button */}
                                    <button
                                        onClick={handleToggleMute}
                                        disabled={callStatus !== "connected"}
                                        title={isMuted ? "Unmute Call" : "Mute Call"}
                                        className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                                            isMuted
                                                ? (isDarkMode ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-red-50 border-red-300 text-red-600')
                                                : (isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400' : 'bg-white border-gray-300 text-gray-600 hover:border-cyan-600 hover:text-cyan-600')
                                        }`}
                                    >
                                        {isMuted ? <FaMicrophoneSlash size={16} /> : <FaMicrophone size={16} />}
                                    </button>

                                    {/* Hang Up (Decline) Button */}
                                    <button
                                        onClick={handleHangUp}
                                        title="Hang Up"
                                        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-600/30 active:scale-95"
                                    >
                                        <FaPhoneSlash size={20} />
                                    </button>

                                    {/* Hold Button */}
                                    <button
                                        onClick={handleToggleHold}
                                        disabled={callStatus !== "connected"}
                                        title={isOnHold ? "Resume Call" : "Hold Call"}
                                        className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                                            isOnHold
                                                ? (isDarkMode ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-amber-50 border-amber-300 text-amber-600')
                                                : (isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400' : 'bg-white border-gray-300 text-gray-600 hover:border-cyan-600 hover:text-cyan-600')
                                        }`}
                                    >
                                        {isOnHold ? <FaPlay size={14} className="ml-0.5" /> : <FaPause size={14} />}
                                    </button>

                                    {/* Keypad Toggle Button */}
                                    <button
                                        onClick={() => setIsKeypadOpen((prev) => !prev)}
                                        disabled={callStatus !== "connected"}
                                        title="Show Keypad"
                                        className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                                            isKeypadOpen
                                                ? (isDarkMode ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-cyan-50 border-cyan-300 text-cyan-600')
                                                : (isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400' : 'bg-white border-gray-300 text-gray-600 hover:border-cyan-600 hover:text-cyan-600')
                                        }`}
                                    >
                                        <FaTh size={16} />
                                    </button>
                                </div>
                            )}

                            {/* DTMF Keypad Drawer */}
                            {isKeypadOpen && callStatus === "connected" && (
                                <div className="mt-6 border-t border-gray-800/10 pt-6 flex flex-col items-center">
                                    <div className="grid grid-cols-3 gap-3 max-w-[200px]">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((digit) => (
                                            <button
                                                key={digit}
                                                onClick={() => handleSendDTMF(digit)}
                                                className={`w-12 h-12 rounded-full border flex items-center justify-center font-bold text-base transition-all active:scale-90 ${
                                                    isDarkMode 
                                                        ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-cyan-500/30' 
                                                        : 'bg-white border-gray-200 text-gray-850 hover:bg-gray-100 hover:border-cyan-600'
                                                }`}
                                            >
                                                {digit}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dismiss button if call ended */}
                            {!["connecting", "ringing", "connected"].includes(callStatus) && (
                                <div className="flex justify-center mt-4">
                                    <button 
                                        onClick={() => setCallStatus("idle")} 
                                        className={`px-4 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                            isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                        }`}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
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
                                        <audio controls className={`h-8 w-32 sm:w-48 transition-opacity ${isDarkMode ? 'opacity-40 hover:opacity-100 invert' : 'opacity-70 hover:opacity-100'}`}>
                                            <source src={getAudioUrl(rec.audioUrl)} type="audio/mpeg" />
                                        </audio>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Meta */}
                <div className={`px-6 sm:px-8 py-4 border-t flex justify-between items-center shrink-0 ${isDarkMode ? 'bg-[#131619]/50 border-gray-800' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Assigned To</span>
                        <span className={`text-[11px] font-black italic uppercase ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{lead.leadResponsibility || "NONE"}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Assigned At</span>
                        <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(lead.assignedAt || lead.createdAt).toLocaleDateString('en-GB')} {new Date(lead.assignedAt || lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className={`p-4 sm:p-6 border-t shrink-0 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex flex-col-reverse sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-3">
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => onShowHistory(lead)}
                                className={`px-5 py-3 sm:py-2.5 justify-center rounded-[4px] border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                            >
                                <FaCommentAlt size={12} /> View History
                            </button>
                            <button
                                onClick={() => onCounseling(lead)}
                                className="px-5 py-3 sm:py-2.5 justify-center rounded-[4px] bg-green-600 text-white hover:bg-green-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95"
                            >
                                <FaUser size={12} /> Counseling
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            {canDelete && (
                                <button
                                    onClick={() => onDelete(lead._id)}
                                    className="px-5 py-3 sm:py-2.5 justify-center rounded-[4px] bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                                >
                                    <FaTrash size={12} /> Delete
                                </button>
                            )}
                            {canEdit && (
                                <button
                                    onClick={() => onEdit(lead)}
                                    className={`px-5 py-3 sm:py-2.5 justify-center rounded-[4px] border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100'}`}
                                >
                                    <FaEdit size={12} /> Edit
                                </button>
                            )}
                            {!lead.isWalkIn && (
                                <button
                                    onClick={async () => {
                                        if (onWalkIn) {
                                            await onWalkIn(lead._id);
                                            onClose();
                                        }
                                    }}
                                    className="px-5 py-3 sm:py-2.5 justify-center rounded-[4px] bg-amber-600 text-white hover:bg-amber-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    <FaMapMarkerAlt size={12} /> Walk In
                                </button>
                            )}
                            {["connecting", "ringing", "connected"].includes(callStatus) ? (
                                <button
                                    onClick={handleHangUp}
                                    className="px-5 py-3 sm:py-2.5 justify-center rounded-[4px] bg-red-600 text-white hover:bg-red-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 animate-pulse"
                                >
                                    <FaPhone size={12} className="rotate-[135deg]" /> Hang Up
                                </button>
                            ) : (
                                <button
                                    onClick={handleCallNow}
                                    className="px-5 py-3 sm:py-2.5 justify-center rounded-[4px] bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                                >
                                    <FaPhone size={12} /> Call Now
                                </button>
                            )}
                            <button
                                onClick={() => onFollowUp(lead)}
                                className="px-5 py-3 sm:py-2.5 justify-center rounded-[4px] bg-cyan-600 text-white hover:bg-cyan-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95"
                            >
                                <FaCommentAlt size={12} /> Follow Up
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default LeadDetailsModal;
