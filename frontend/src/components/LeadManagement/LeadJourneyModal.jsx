import React, { useState, useEffect } from "react";
import { 
    FaTimes, 
    FaCalendarAlt, 
    FaClock, 
    FaUser, 
    FaPhone, 
    FaPlus, 
    FaFileExcel, 
    FaAward, 
    FaUserCheck, 
    FaBookOpen, 
    FaWalking, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaSpinner 
} from "react-icons/fa";
import { toast } from "react-toastify";

const LeadJourneyModal = ({ leadId, onClose, isDarkMode }) => {
    const [loading, setLoading] = useState(true);
    const [journeyData, setJourneyData] = useState(null);

    useEffect(() => {
        if (!leadId) return;

        const fetchJourney = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${leadId}/journey`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setJourneyData(data);
                } else {
                    const error = await response.json();
                    toast.error(error.message || "Failed to fetch lead journey");
                    onClose();
                }
            } catch (err) {
                console.error("Error fetching lead journey:", err);
                toast.error("Network error fetching lead journey");
                onClose();
            } finally {
                setLoading(false);
            }
        };

        fetchJourney();
    }, [leadId, onClose]);

    if (loading) {
        return (
            <div className={`fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-md ${isDarkMode ? 'bg-black/80' : 'bg-white/80'}`}>
                <div className="flex flex-col items-center gap-4">
                    <FaSpinner className={`animate-spin text-4xl ${isDarkMode ? 'text-cyan-500' : 'text-cyan-600'}`} />
                    <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading Lead Journey...</p>
                </div>
            </div>
        );
    }

    if (!journeyData) return null;

    const { lead, summary, timeline } = journeyData;

    // Helper to get step status styling
    const getStepClass = (stepIndex) => {
        // Steps: 0: Creation, 1: Calling, 2: Counselling, 3: Admission
        const { totalCalls, hasCounselling, hasAdmission } = summary;
        
        let active = false;
        let completed = false;

        if (stepIndex === 0) {
            active = true;
            completed = true;
        } else if (stepIndex === 1) {
            active = totalCalls > 0 || hasCounselling || hasAdmission;
            completed = totalCalls > 0 || hasCounselling || hasAdmission;
        } else if (stepIndex === 2) {
            active = hasCounselling || hasAdmission;
            completed = hasCounselling || hasAdmission;
        } else if (stepIndex === 3) {
            active = hasAdmission;
            completed = hasAdmission;
        }

        if (completed) {
            return isDarkMode 
                ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                : "bg-cyan-500 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]";
        }
        if (active) {
            return isDarkMode 
                ? "bg-[#1a1f24] border-cyan-500 text-cyan-400" 
                : "bg-white border-cyan-500 text-cyan-600";
        }
        return isDarkMode 
            ? "bg-[#111418] border-gray-800 text-gray-600" 
            : "bg-white border-gray-200 text-gray-400";
    };

    // Helper to get step connector status styling
    const getConnectorClass = (stepIndex) => {
        const { totalCalls, hasCounselling, hasAdmission } = summary;
        let completed = false;

        if (stepIndex === 0) {
            completed = totalCalls > 0 || hasCounselling || hasAdmission;
        } else if (stepIndex === 1) {
            completed = hasCounselling || hasAdmission;
        } else if (stepIndex === 2) {
            completed = hasAdmission;
        }

        return completed 
            ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
            : (isDarkMode ? "bg-gray-800" : "bg-gray-200");
    };

    // Render Event Card content dynamically
    const renderEventCard = (event, index) => {
        const formattedDate = new Date(event.date).toLocaleDateString("en-GB", {
            day: '2-digit', month: 'short', year: 'numeric'
        }).toUpperCase();
        
        const formattedTime = new Date(event.date).toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit', hour12: true 
        }).toUpperCase();

        switch (event.type) {
            case 'CREATION':
                return (
                    <div className={`border rounded-[4px] p-6 shadow-2xl transition-all hover:border-blue-500/50 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4 border-b pb-3 border-gray-800/10 dark:border-gray-800">
                            <div className="flex items-center gap-2.5 text-blue-500 dark:text-blue-400">
                                <FaPlus size={12} />
                                <span className="font-black text-[10px] uppercase tracking-widest">{event.label}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                {event.title}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                            <div className="space-y-1">
                                <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Created By</span>
                                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.createdBy}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Marketing Source</span>
                                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.source}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Class & Course</span>
                                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.className} - {event.details.courseName}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Assigned Owner</span>
                                <span className="text-cyan-500">{event.details.assignedTo}</span>
                            </div>
                        </div>
                    </div>
                );

            case 'TELECALLING':
                return (
                    <div className={`border rounded-[4px] p-6 shadow-2xl transition-all hover:border-amber-500/50 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4 border-b pb-3 border-gray-800/10 dark:border-gray-800">
                            <div className="flex items-center gap-2.5 text-amber-500 dark:text-amber-400">
                                <FaPhone size={12} className="animate-pulse" />
                                <span className="font-black text-[10px] uppercase tracking-widest">{event.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {event.details.callDuration !== 'N/A' && (
                                    <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {event.details.callDuration}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                    {event.title}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Called By</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.updatedBy}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Lead Type Status</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.status}</span>
                                </div>
                            </div>
                            {event.details.remarks && (
                                <div className={`p-3 rounded-[4px] border border-dashed text-xs ${isDarkMode ? 'bg-black/20 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1 font-black">Operator Remarks</span>
                                    <span className="italic">"{event.details.remarks}"</span>
                                </div>
                            )}
                            {event.details.nextFollowUpDate && (
                                <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-1.5 pt-1">
                                    <FaClock size={10} />
                                    <span>Next Follow Up: {new Date(event.details.nextFollowUpDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'COUNSELLING':
                return (
                    <div className={`border rounded-[4px] p-6 shadow-2xl transition-all hover:border-cyan-500/50 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4 border-b pb-3 border-gray-800/10 dark:border-gray-800">
                            <div className="flex items-center gap-2.5 text-cyan-500 dark:text-cyan-400">
                                <FaUserCheck size={13} />
                                <span className="font-black text-[10px] uppercase tracking-widest">{event.label}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'}`}>
                                {event.title}
                            </span>
                        </div>
                        <div className="space-y-3 text-xs font-bold">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Counsellor</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.counselledBy}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Allocated Target Course</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.courseName || event.details.boardName}</span>
                                </div>
                                {event.details.programme && (
                                    <div className="space-y-1">
                                        <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Programme Type</span>
                                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.programme}</span>
                                    </div>
                                )}
                                {event.details.centre && (
                                    <div className="space-y-1">
                                        <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Centre</span>
                                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.centre}</span>
                                    </div>
                                )}
                            </div>
                            {event.details.remarks && (
                                <div className={`p-3 rounded-[4px] border border-dashed text-xs ${isDarkMode ? 'bg-black/20 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block mb-1 font-black">Counselling Remarks</span>
                                    <span className="italic">"{event.details.remarks}"</span>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'ADMISSION':
                return (
                    <div className={`border rounded-[4px] p-6 shadow-2xl transition-all hover:border-emerald-500/50 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-4 border-b pb-3 border-gray-800/10 dark:border-gray-800">
                            <div className="flex items-center gap-2.5 text-emerald-500 dark:text-emerald-400">
                                <FaAward size={13} />
                                <span className="font-black text-[10px] uppercase tracking-widest">{event.label}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                ADMITTED
                            </span>
                        </div>
                        <div className="space-y-3 text-xs font-bold">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Admission Number</span>
                                    <span className="text-cyan-500 font-mono tracking-wider">{event.details.admissionNumber}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Enrolled Course</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.courseName}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Admitted By Officer</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.admittedBy}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Academic Cycle</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.session}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Location Centre</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{event.details.centre}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`fixed inset-0 z-[70] overflow-y-auto backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/90' : 'bg-white/80'}`}>
            <div className="min-h-screen p-4 sm:p-6 md:p-10 relative">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 transition-all p-3 rounded-[4px] shadow-lg border active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-500 hover:bg-gray-100 border-gray-200 shadow-sm'}`}
                >
                    <FaTimes size={20} />
                </button>

                {/* Header */}
                <div className="text-center mb-10 max-w-4xl mx-auto">
                    <h2 className={`text-3xl sm:text-4xl font-black uppercase tracking-tighter italic mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lead Journey</h2>
                    <p className={`text-lg sm:text-xl font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{lead.name}</p>
                    
                    {/* Secondary Contact Info */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[10px] font-black tracking-wider uppercase text-gray-500">
                        <span>Phone: <span className="text-cyan-500">{lead.phoneNumber}</span></span>
                        {lead.secondPhoneNumber && <span>| Sec: <span className="text-cyan-500">{lead.secondPhoneNumber}</span></span>}
                        {lead.email && <span>| Email: <span className={isDarkMode ? 'text-white' : 'text-gray-700'}>{lead.email}</span></span>}
                        {lead.schoolName && <span>| School: <span className={isDarkMode ? 'text-white' : 'text-gray-700'}>{lead.schoolName}</span></span>}
                    </div>

                    {/* Overall Status Banner */}
                    <div className="flex flex-wrap justify-center gap-3 mt-6">
                        <span className={`px-4 py-1.5 rounded-[4px] border text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                            STAGE: {summary.currentStage}
                        </span>
                        <span className={`px-4 py-1.5 rounded-[4px] border text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            TOTAL CALLS: {summary.totalCalls}
                        </span>
                        <span className={`px-4 py-1.5 rounded-[4px] border text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                            INTERACTION: {summary.lastStatusText}
                        </span>
                    </div>
                </div>

                {/* Progress Stepper Stepped Path */}
                <div className="max-w-4xl mx-auto mb-16 px-4">
                    <div className="flex items-center justify-between relative">
                        {/* Stepper lines */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 z-0 flex">
                            <div className={`h-full w-1/3 transition-all duration-500 ${getConnectorClass(0)}`} />
                            <div className={`h-full w-1/3 transition-all duration-500 ${getConnectorClass(1)}`} />
                            <div className={`h-full w-1/3 transition-all duration-500 ${getConnectorClass(2)}`} />
                        </div>

                        {/* Step items */}
                        {[
                            { label: "Added", icon: <FaPlus size={10} /> },
                            { label: "Telecalling", icon: <FaPhone size={10} /> },
                            { label: "Counselling", icon: <FaUserCheck size={11} /> },
                            { label: "Admitted", icon: <FaAward size={11} /> }
                        ].map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 font-bold ${getStepClass(idx)}`}>
                                    {step.icon}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Journey Timeline */}
                {timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <FaWalking size={48} className={`mb-4 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                        <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No Journey Events Found</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto relative px-4 sm:px-8">
                        {/* Vertical line linking events */}
                        <div className={`absolute left-8 sm:left-1/2 top-4 bottom-4 w-[2px] transform sm:-translate-x-1/2 ${isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-500/5'}`}></div>

                        <div className="space-y-12">
                            {timeline.map((event, index) => (
                                <div 
                                    key={index} 
                                    className={`relative flex flex-col sm:flex-row items-start ${index % 2 === 0 ? 'sm:flex-row-reverse' : ''}`}
                                >
                                    {/* Event Node Circle */}
                                    <div className={`absolute left-4 sm:left-1/2 w-8 h-8 rounded-full border-2 transform -translate-x-1/2 flex items-center justify-center z-10 transition-all ${
                                        event.type === 'CREATION' ? 'bg-blue-500/20 text-blue-400 border-blue-500' :
                                        event.type === 'TELECALLING' ? 'bg-amber-500/20 text-amber-400 border-amber-500' :
                                        event.type === 'COUNSELLING' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500' :
                                        'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                    }`}>
                                        {event.type === 'CREATION' && (event.details.source === 'Bulk Import' ? <FaFileExcel size={11} /> : <FaPlus size={11} />)}
                                        {event.type === 'TELECALLING' && <FaPhone size={10} />}
                                        {event.type === 'COUNSELLING' && <FaUserCheck size={11} />}
                                        {event.type === 'ADMISSION' && <FaAward size={11} />}
                                    </div>

                                    {/* Date Stamp Label (On alternate side for Desktop, inside card for Mobile) */}
                                    <div className={`w-full sm:w-[calc(50%-2rem)] flex flex-col sm:items-end ${index % 2 === 0 ? 'sm:items-start' : 'sm:items-end'} pl-12 sm:pl-0 mb-2 sm:mb-0`}>
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <FaCalendarAlt size={10} />
                                            <span className="font-black text-[9px] uppercase tracking-widest">
                                                {new Date(event.date).toLocaleDateString("en-GB", {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                }).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-[8px] font-bold text-gray-500/70 font-mono tracking-tighter mt-0.5">
                                            {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Spacing holder */}
                                    <div className="hidden sm:block w-16"></div>

                                    {/* Event Details Card */}
                                    <div className="w-full sm:w-[calc(50%-2rem)] pl-12 sm:pl-0">
                                        {renderEventCard(event, index)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeadJourneyModal;
