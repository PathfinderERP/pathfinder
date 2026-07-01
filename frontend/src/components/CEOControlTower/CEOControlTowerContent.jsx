import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import axios from "axios";
import { MdAutoAwesome } from "react-icons/md";
import {
    FaTasks, FaFlag, FaHistory, FaBullseye, FaBullhorn,
    FaUserGraduate, FaBook, FaMoneyBillWave, FaShoppingCart,
    FaUserTie, FaChartBar, FaMoon, FaSun, FaArrowRight,
    FaRobot, FaPaperPlane, FaSyncAlt
} from "react-icons/fa";

// Inline Markdown formatter for AI responses
const formatAIResponseInline = (text) => {
    if (!text) return null;
    const parts = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        const raw = match[0];
        if (raw.startsWith('**')) {
            parts.push(<strong key={match.index} className="font-extrabold text-cyan-600 dark:text-cyan-400">{raw.slice(2, -2)}</strong>);
        } else if (raw.startsWith('*')) {
            parts.push(<em key={match.index} className="italic text-gray-400 dark:text-gray-305">{raw.slice(1, -1)}</em>);
        } else if (raw.startsWith('`')) {
            parts.push(<code key={match.index} className="bg-gray-150 dark:bg-gray-800 rounded px-1.5 py-0.5 text-[9px] font-mono text-purple-500">{raw.slice(1, -1)}</code>);
        }
        lastIndex = match.index + raw.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
};

const AIMarkdownText = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
        <div className="space-y-1 text-[10px] leading-relaxed font-bold text-gray-700 dark:text-gray-300 text-left">
            {lines.map((line, i) => {
                if (line.startsWith('### ')) {
                    return <h5 key={i} className="font-black text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mt-3 mb-1">{line.slice(4)}</h5>;
                }
                if (line.startsWith('## ') || line.startsWith('# ')) {
                    const cleanLine = line.startsWith('## ') ? line.slice(3) : line.slice(2);
                    return <h4 key={i} className="font-black text-[11px] uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mt-4 mb-2">{cleanLine}</h4>;
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    return (
                        <div key={i} className="flex gap-2 items-start pl-2 mt-1">
                            <span className="text-cyan-500 mt-0.5 text-xs select-none">•</span>
                            <span className="flex-1">{formatAIResponseInline(line.slice(2))}</span>
                        </div>
                    );
                }
                if (/^\d+\.\s/.test(line)) {
                    const match = line.match(/^(\d+)\.\s(.*)$/);
                    if (match) {
                        return (
                            <div key={i} className="flex gap-2 items-start pl-2 mt-1">
                                <span className="text-cyan-600 dark:text-cyan-400 font-black min-w-[14px]">{match[1]}.</span>
                                <span className="flex-1">{formatAIResponseInline(match[2])}</span>
                            </div>
                        );
                    }
                }
                if (line === '---' || line === '***') {
                    return <hr key={i} className="border-gray-200 dark:border-gray-800 my-3" />;
                }
                if (!line.trim()) {
                    return <div key={i} className="h-1.5" />;
                }
                return <p key={i} className="mt-1">{formatAIResponseInline(line)}</p>;
            })}
        </div>
    );
};

const AISectionAnalyst = ({ title, module, contextData, defaultQuestion, quickPrompts = [], isDarkMode, filters = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState('');
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const panelRef = useRef(null);

    const handleInitialAnalysis = async () => {
        if (hasAnalyzed) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/ai/analyse`, {
                question: defaultQuestion || `Analyze this ${title} dataset and highlight key insights, anomalies, and performance metrics.`,
                module: module || 'all',
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                centre: filters?.centre,
                contextData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.response) {
                setMessages([{ role: 'assistant', text: res.data.response }]);
                setHasAnalyzed(true);
            }
        } catch (error) {
            console.error("AI analysis error:", error);
            setMessages([{ role: 'assistant', text: "⚠️ Failed to generate AI analysis. Please verify your Gemini API key and backend configuration." }]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen && !hasAnalyzed) {
            handleInitialAnalysis();
        }
    }, [isOpen]);

    useEffect(() => {
        setHasAnalyzed(false);
        if (isOpen) {
            setMessages([]);
            handleInitialAnalysis();
        } else {
            setMessages([]);
        }
    }, [contextData, filters?.startDate, filters?.endDate, filters?.centre]);

    const handleAskQuestion = async (e, customQ = null) => {
        if (e) e.preventDefault();
        const queryText = customQ || question;
        if (!queryText.trim() || loading) return;

        const userMsg = { role: 'user', text: queryText };
        setMessages(prev => [...prev, userMsg]);
        setQuestion('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/ai/analyse`, {
                question: queryText,
                module: module || 'all',
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                centre: filters?.centre,
                contextData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.response) {
                setMessages(prev => [...prev, { role: 'assistant', text: res.data.response }]);
            }
        } catch (error) {
            console.error("AI chat error:", error);
            setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ Error communicating with Pathfinder AI." }]);
        }
        setLoading(false);
    };

    return (
        <div className="mt-4 border-t border-gray-800/10 dark:border-gray-700/30 pt-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[2px] transition-all duration-300 active:scale-95 ${
                    isOpen 
                        ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                        : (isDarkMode 
                            ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20' 
                            : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200')
                }`}
            >
                <MdAutoAwesome className={loading ? 'animate-spin' : 'animate-pulse'} />
                {isOpen ? 'Close AI Insights' : 'Pathfinder AI Insights'}
            </button>

            {isOpen && (
                <div 
                    ref={panelRef}
                    className={`mt-4 rounded-[2px] border p-4 transition-all duration-300 text-left ${
                        isDarkMode 
                            ? 'bg-[#0f1115] border-gray-800/80' 
                            : 'bg-gray-50/50 border-gray-250 shadow-inner'
                    }`}
                >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-800/10 dark:border-gray-800/30 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="p-1 rounded-[1px] bg-cyan-500/10 text-cyan-500"><FaRobot size={10} /></span>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Pathfinder AI Analyst — {title}
                            </span>
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-[1px] bg-cyan-500/15 text-cyan-400">VITE-GEMINI</span>
                    </div>

                    <div className="space-y-4 max-h-72 overflow-y-auto pr-1 custom-scrollbar mb-4">
                        {messages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={`flex flex-col gap-1 p-3 rounded-[2px] border ${
                                    msg.role === 'user' 
                                        ? (isDarkMode 
                                            ? 'bg-cyan-500/5 border-cyan-500/10 align-self-end ml-12' 
                                            : 'bg-cyan-50 border-cyan-100 align-self-end ml-12')
                                        : (isDarkMode 
                                            ? 'bg-black/20 border-gray-800/30' 
                                            : 'bg-white border-gray-150 shadow-sm')
                                }`}
                            >
                                <span className={`text-[7px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-cyan-500' : 'text-purple-500'}`}>
                                    {msg.role === 'user' ? 'You' : 'Pathfinder AI'}
                                </span>
                                <AIMarkdownText text={msg.text} />
                            </div>
                        ))}

                        {loading && messages.length === 0 && (
                            <div className="flex flex-col gap-2 py-4 items-center justify-center text-gray-500 font-bold text-[10px]">
                                <span className="animate-spin text-cyan-500"><FaSyncAlt size={16} /></span>
                                <span className="tracking-widest uppercase text-[8px] animate-pulse">Analyzing section data with Pathfinder AI...</span>
                            </div>
                        )}

                        {loading && messages.length > 0 && (
                            <div className="flex items-center gap-2 pl-3 text-cyan-500 text-[9px] font-bold">
                                <span className="animate-pulse">Pathfinder AI is thinking...</span>
                            </div>
                        )}
                    </div>

                    {quickPrompts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3.5">
                            {quickPrompts.map((promptText, pIdx) => (
                                <button
                                    key={pIdx}
                                    type="button"
                                    onClick={(e) => handleAskQuestion(e, promptText)}
                                    className={`text-[8px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                        isDarkMode 
                                            ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-cyan-500/30' 
                                            : 'bg-white border-gray-250 text-gray-600 hover:text-cyan-600 hover:border-cyan-400 shadow-sm'
                                    }`}
                                >
                                    {promptText}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleAskQuestion} className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={`Ask AI about ${title} data...`}
                            className={`flex-1 text-[10px] font-bold p-2.5 rounded-[2px] border outline-none transition-all ${
                                isDarkMode 
                                    ? 'bg-black border-gray-800 text-white focus:border-cyan-500' 
                                    : 'bg-white border-gray-200 text-black focus:border-cyan-500 shadow-sm'
                            }`}
                        />
                        <button
                            type="submit"
                            disabled={loading || !question.trim()}
                            className={`p-2.5 rounded-[2px] bg-cyan-500 text-black hover:bg-cyan-600 active:scale-95 transition-all font-black flex items-center justify-center ${
                                (loading || !question.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            <FaPaperPlane size={10} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

const CEOControlTowerContent = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();

    const modules = [
        {
            name: "Lead Management",
            icon: <FaBullseye />,
            color: "rose",
            bgColor: "bg-rose-500/10",
            textColor: "text-rose-400",
            borderColor: "hover:border-rose-500/40",
            shadowColor: "hover:shadow-rose-500/5",
            description: "Oversee sales pipelines, lead distributions, telecaller console efficiency, and conversion logs.",
            features: ["All Leads Pipeline", "Teacher Schedule", "Campaign Analysis"],
            path: "/ceo-control-tower/lead-analytics",
            moduleKey: "leads",
            aiQuestion: "Analyze our lead generation and conversion trends. Which channels or sources drive most leads?",
            aiPrompts: ["Analyze lead generation trends", "Which channels drive most leads?", "Identify low-performing sources"]
        },
        {
            name: "Admissions",
            icon: <FaUserGraduate />,
            color: "emerald",
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-400",
            borderColor: "hover:border-emerald-500/40",
            shadowColor: "hover:shadow-emerald-500/5",
            description: "Track counselled students, board course registrations, payment receipts, and enrolled rosters.",
            features: ["Counselled Students", "Board Registrations", "Enrolled Roster"],
            path: "/admissions",
            moduleKey: "admissions",
            aiQuestion: "Analyze our course-wise enrollments and revenues. Which centers have the highest fee collections?",
            aiPrompts: ["Analyze course enrollments", "Highest fee collections by center", "Calculate pending installment risk"]
        },
        {
            name: "Tracking & Flagging",
            icon: <FaFlag />,
            color: "amber",
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-400",
            borderColor: "hover:border-amber-500/40",
            shadowColor: "hover:shadow-amber-500/5",
            description: "Monitor daily center performance flags, operational exceptions, and metric-based alerts.",
            features: ["Daily Center Tracking", "Red Flag Desk", "Operational Logs"],
            path: "/daily-center-tracking",
            moduleKey: "all",
            aiQuestion: "Explain the daily center tracking metrics, operational exceptions, and red flags raised.",
            aiPrompts: ["Analyze center performance red flags", "Operational exception report"]
        },
        {
            name: "Daily Tracking Log",
            icon: <FaHistory />,
            color: "purple",
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-400",
            borderColor: "hover:border-purple-500/40",
            shadowColor: "hover:shadow-purple-500/5",
            description: "View department-wide logged activities, team logs, and historic operational reports.",
            features: ["My Daily Log", "Department Board", "Log Tracking"],
            path: "/daily-tracking-log?tab=myLog",
            moduleKey: "all",
            aiQuestion: "Summarize activity tracking logs and general institutional reports.",
            aiPrompts: ["Activity log summary", "Department board status"]
        },
        {
            name: "Marketing & CRM",
            icon: <FaBullhorn />,
            color: "blue",
            bgColor: "bg-blue-500/10",
            textColor: "text-blue-400",
            borderColor: "hover:border-blue-500/40",
            shadowColor: "hover:shadow-blue-500/5",
            description: "Oversee digital acquisition campaigns, lead sources, social channel integrations, and CRM metrics.",
            features: ["Campaign CRM", "Lead Acquisition", "Media Integration"],
            path: "/marketing-crm",
            moduleKey: "leads",
            aiQuestion: "Analyze marketing campaigns and CRM lead acquisition channels.",
            aiPrompts: ["Evaluate campaign CRM effectiveness", "Analyze acquisition channels"]
        },
        {
            name: "Academics",
            icon: <FaBook />,
            color: "indigo",
            bgColor: "bg-indigo-500/10",
            textColor: "text-indigo-400",
            borderColor: "hover:border-indigo-500/40",
            shadowColor: "hover:shadow-indigo-500/5",
            description: "Coordinate academic calendars, class timetables, teachers roster, routines, and HOD evaluations.",
            features: ["Teacher & HoD Lists", "Classes & Management", "Routines Schedule"],
            path: "/academics/teacher-list",
            moduleKey: "admissions",
            aiQuestion: "Analyze student board and standard course distribution across academic programs.",
            aiPrompts: ["Board course analysis", "Standard course distribution"]
        },
        {
            name: "Finance & Fees",
            icon: <FaMoneyBillWave />,
            color: "teal",
            bgColor: "bg-teal-500/10",
            textColor: "text-teal-400",
            borderColor: "hover:border-teal-500/40",
            shadowColor: "hover:shadow-teal-500/5",
            description: "Audit fee collections, due reports, check clearance, petty cash transfers, and expense approvals.",
            features: ["Installment Payments", "Expense Audit", "Due & Collection Reports"],
            path: "/finance/payment-analysis",
            moduleKey: "finance",
            aiQuestion: "Analyze transaction collections, method mixes, and revenue rankings.",
            aiPrompts: ["Analyze transaction payment methods mix", "Compare digital vs cash collections", "Evaluate center revenue performance"]
        },
        {
            name: "Sales & Targets",
            icon: <FaShoppingCart />,
            color: "orange",
            bgColor: "bg-orange-500/10",
            textColor: "text-orange-400",
            borderColor: "hover:border-orange-500/40",
            shadowColor: "hover:shadow-orange-500/5",
            description: "Track sales performance, center-wise target achievement, rank lists, and average ticket fees.",
            features: ["Centre Targets", "Comparison Rank", "Daily Collections"],
            path: "/sales/comparison-analysis",
            moduleKey: "sales",
            aiQuestion: "Analyze sales performance, counselor conversions, and center target achievements.",
            aiPrompts: ["Counselor conversion analysis", "Center performance rankings"]
        },
        {
            name: "Employee Center",
            icon: <FaUserTie />,
            color: "pink",
            bgColor: "bg-pink-500/10",
            textColor: "text-pink-400",
            borderColor: "hover:border-pink-500/40",
            shadowColor: "hover:shadow-pink-500/5",
            description: "Manage personal profiles, marking attendance logs, leaves, feedback, and document repositories.",
            features: ["Attendance & Leave", "Document Repository", "Feedback & Evaluation"],
            path: "/employee/attendance",
            moduleKey: "hr",
            aiQuestion: "Analyze employee attendance records, department headcounts, and staffing distributions.",
            aiPrompts: ["Workforce attendance analysis", "Employee department distribution", "Employee designation distribution"]
        },
        {
            name: "Task Workflow",
            icon: <FaTasks />,
            color: "cyan",
            bgColor: "bg-cyan-500/10",
            textColor: "text-cyan-400",
            borderColor: "hover:border-cyan-500/40",
            shadowColor: "hover:shadow-cyan-500/5",
            description: "Manage enterprise task lifecycle, task assignment, and workflow progression tracking.",
            features: ["Tasks Dashboard", "Assign Task", "Workflow Tracking"],
            path: "/task-workflow/tasks",
            moduleKey: "all",
            aiQuestion: "Evaluate operational task lifecycle, task assignment, and assignment tracking metrics.",
            aiPrompts: ["Track active task workflows", "Optimize operational task assignment"]
        },
        {
            name: "User Management",
            icon: <FaUserGraduate />,
            color: "emerald",
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-400",
            borderColor: "hover:border-emerald-500/40",
            shadowColor: "hover:shadow-emerald-500/5",
            description: "Track counselled students, board course registrations, payment receipts, and enrolled rosters.",
            features: ["Counselled Students", "Board Registrations", "Enrolled Roster"],
            path: "/user-management",
            moduleKey: "all",
            aiQuestion: "Provide recommendations for optimizing student and user roster tracking.",
            aiPrompts: ["Optimize student rosters", "Roster analytics"]
        },
        {
            name: "Hr & Manpower",
            icon: <FaUserGraduate />,
            color: "emerald",
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-400",
            borderColor: "hover:border-emerald-500/40",
            shadowColor: "hover:shadow-emerald-500/5",
            description: "Track counselled students, board course registrations, payment receipts, and enrolled rosters.",
            features: ["Counselled Students", "Board Registrations", "Enrolled Roster"],
            path: "/hr/employee/list",
            moduleKey: "hr",
            aiQuestion: "Analyze employee metrics, salaries, and center distributions.",
            aiPrompts: ["Salary budget overview", "Center staffing levels"]
        }
    ];

    return (
        <div className={`flex-1 flex flex-col min-h-screen ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'} transition-colors duration-500 p-6 overflow-y-auto custom-scrollbar`}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-800/50 pb-6">
                <div>
                    <h1 className={`text-2xl font-black italic tracking-tight mb-1 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span className="p-2 border-2 border-cyan-500 rounded-[2px] text-cyan-500"><FaChartBar /></span>
                        CEO CONTROL TOWER <span className="text-[10px] not-italic text-cyan-500 mt-2 bg-cyan-500/10 px-2 py-0.5 rounded-[1px] tracking-widest font-black uppercase">MODULE ANALYSIS</span>
                    </h1>
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Enterprise Dynamic Intelligence Dashboard</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1 p-1 rounded-[2px] border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={() => theme === 'light' && toggleTheme()}
                            className={`p-2 rounded-[1px] transition-all ${isDarkMode ? "bg-cyan-500 text-black" : "text-gray-500 hover:text-cyan-500"}`}
                        >
                            <FaMoon size={12} />
                        </button>
                        <button
                            onClick={() => theme === 'dark' && toggleTheme()}
                            className={`p-2 rounded-[1px] transition-all ${!isDarkMode ? "bg-cyan-500 text-black" : "text-gray-600 hover:text-cyan-500"}`}
                        >
                            <FaSun size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {modules.map((m, idx) => (
                    <div
                        key={idx}
                        onClick={() => navigate(m.path)}
                        className={`border rounded-[2px] p-6 relative group overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px] ${isDarkMode
                            ? `bg-[#131619] border-gray-800 ${m.borderColor} ${m.shadowColor}`
                            : `bg-white border-gray-200 shadow-sm ${m.borderColor} ${m.shadowColor} hover:shadow-md`
                            } hover:scale-[1.02]`}
                    >
                        {/* Glow effect on hover */}
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 transition-all duration-300 bg-${m.color}-500/5 group-hover:bg-${m.color}-500/20`} />

                        <div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className={`text-sm font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{m.name}</h3>
                                <div className={`w-8 h-8 rounded-[2px] ${m.bgColor} flex items-center justify-center ${m.textColor} border border-${m.color}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                                    {m.icon}
                                </div>
                            </div>

                            <p className={`text-[10px] leading-relaxed mb-4 font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                {m.description}
                            </p>
                        </div>

                        <div>
                            {/* Features list */}
                            <div className="flex flex-wrap gap-1.5 mb-4 z-10 relative">
                                {m.features.map((feat, fIdx) => (
                                    <span
                                        key={fIdx}
                                        className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[1px] ${isDarkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {feat}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-cyan-500 group-hover:text-cyan-400 transition-colors mb-4">
                                View Analytics <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
                            </div>

                            <div onClick={(e) => e.stopPropagation()} className="relative z-20">
                                <AISectionAnalyst
                                    title={m.name}
                                    module={m.moduleKey}
                                    contextData={null}
                                    defaultQuestion={m.aiQuestion}
                                    quickPrompts={m.aiPrompts}
                                    isDarkMode={isDarkMode}
                                    filters={{}}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#e5e7eb'}; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
            `}</style>
        </div>
    );
};

export default CEOControlTowerContent;
