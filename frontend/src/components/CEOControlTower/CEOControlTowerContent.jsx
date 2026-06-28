import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
    FaTasks, FaFlag, FaHistory, FaBullseye, FaBullhorn,
    FaUserGraduate, FaBook, FaMoneyBillWave, FaShoppingCart,
    FaUserTie, FaChartBar, FaMoon, FaSun, FaArrowRight
} from "react-icons/fa";

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
            path: "/ceo-control-tower/lead-analytics"
        }
        ,
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
            path: "/admissions"
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
            path: "/daily-center-tracking"
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
            path: "/daily-tracking-log?tab=myLog"
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
            path: "/marketing-crm"
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
            path: "/academics/teacher-list"
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
            path: "/finance/payment-analysis"
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
            path: "/sales/comparison-analysis"
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
            path: "/employee/attendance"
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
            path: "/task-workflow/tasks"
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
            path: "/user-management"
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
            path: "/admissions"
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
            path: "/hr/employee/list"
        },
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

                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-cyan-500 group-hover:text-cyan-400 transition-colors">
                                View Analytics <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
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





