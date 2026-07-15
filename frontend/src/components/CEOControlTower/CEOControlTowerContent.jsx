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
            parts.push(<strong key={match.index} className="font-black text-cyan-600 dark:text-cyan-400">{raw.slice(2, -2)}</strong>);
        } else if (raw.startsWith('*')) {
            parts.push(<em key={match.index} className="italic text-gray-400 dark:text-gray-300">{raw.slice(1, -1)}</em>);
        } else if (raw.startsWith('`')) {
            parts.push(<code key={match.index} className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 text-xs font-mono text-purple-500 dark:text-purple-400">{raw.slice(1, -1)}</code>);
        }
        lastIndex = match.index + raw.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
};

// Parser to group markdown blocks (including tables)
const parseMarkdownBlocks = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const blocks = [];
    let currentTable = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('|')) {
            let cells = line.split('|').map(c => c.trim());
            if (cells[0] === '') cells.shift();
            if (cells[cells.length - 1] === '') cells.pop();

            const isSeparator = cells.every(cell => cell === '' || /^:?-+:?$/.test(cell));

            if (isSeparator) {
                continue;
            }

            if (!currentTable) {
                currentTable = { type: 'table', headers: cells, rows: [] };
            } else {
                currentTable.rows.push(cells);
            }
        } else {
            if (currentTable) {
                blocks.push(currentTable);
                currentTable = null;
            }

            if (trimmed.startsWith('### ')) {
                blocks.push({ type: 'h5', text: line.slice(4) });
            } else if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                const cleanLine = trimmed.startsWith('## ') ? line.slice(3) : line.slice(2);
                blocks.push({ type: 'h4', text: cleanLine });
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                blocks.push({ type: 'li', text: line.slice(2) });
            } else if (/^\d+\.\s/.test(trimmed)) {
                const match = trimmed.match(/^(\d+)\.\s(.*)$/);
                if (match) {
                    blocks.push({ type: 'ol', num: match[1], text: match[2] });
                } else {
                    blocks.push({ type: 'p', text: line });
                }
            } else if (trimmed === '---' || trimmed === '***') {
                blocks.push({ type: 'hr' });
            } else if (!trimmed) {
                blocks.push({ type: 'empty' });
            } else {
                blocks.push({ type: 'p', text: line });
            }
        }
    }

    if (currentTable) {
        blocks.push(currentTable);
    }

    return blocks;
};

const AIMarkdownText = ({ text }) => {
    const blocks = parseMarkdownBlocks(text);

    return (
        <div className="space-y-2.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300 text-left font-normal">
            {blocks.map((block, i) => {
                switch (block.type) {
                    case 'h5':
                        return <h5 key={i} className="font-extrabold text-sm uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mt-4 mb-1.5">{block.text}</h5>;
                    case 'h4':
                        return <h4 key={i} className="font-black text-base uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mt-5 mb-2">{block.text}</h4>;
                    case 'li':
                        return (
                            <div key={i} className="flex gap-2.5 items-start pl-3 mt-1.5">
                                <span className="text-cyan-500 mt-1 text-xs select-none">•</span>
                                <span className="flex-1">{formatAIResponseInline(block.text)}</span>
                            </div>
                        );
                    case 'ol':
                        return (
                            <div key={i} className="flex gap-2.5 items-start pl-3 mt-1.5">
                                <span className="text-cyan-600 dark:text-cyan-400 font-extrabold min-w-[16px] text-sm">{block.num}.</span>
                                <span className="flex-1">{formatAIResponseInline(block.text)}</span>
                            </div>
                        );
                    case 'hr':
                        return <hr key={i} className="border-gray-250 dark:border-gray-800 my-4" />;
                    case 'empty':
                        return <div key={i} className="h-1.5" />;
                    case 'table':
                        return (
                            <div key={i} className="overflow-x-auto my-4 rounded-[4px] border border-gray-250 dark:border-gray-800 shadow-md max-w-full">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-[13px] border-collapse">
                                    <thead className="bg-gray-50 dark:bg-gray-900/60 font-black text-cyan-600 dark:text-cyan-400 border-b border-gray-250 dark:border-gray-800">
                                        <tr>
                                            {block.headers.map((h, idx) => (
                                                <th key={idx} className="px-4 py-3 text-left text-xs uppercase tracking-wider font-extrabold whitespace-nowrap">{formatAIResponseInline(h)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 dark:divide-gray-800/80 bg-white dark:bg-black/10">
                                        {block.rows.map((row, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-colors">
                                                {row.map((cell, cellIdx) => (
                                                    <td key={cellIdx} className="px-4 py-2.5 text-gray-850 dark:text-gray-250 font-normal whitespace-nowrap">{formatAIResponseInline(cell)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    case 'p':
                    default:
                        return <p key={i} className="mt-1">{formatAIResponseInline(block.text)}</p>;
                }
            })}
        </div>
    );
};
const leadQuestionsCategories = [
    {
        category: "Lead Volume & Statuses",
        questions: [
            "How many leads were generated today, this week and this month?",
            "How many leads are assigned, unassigned, contacted, counselled, converted, lost or dormant?",
            "Which leads have no next follow-up date?",
            "How many duplicate leads exist across phone numbers, guardians or students?",
            "Which leads have been reassigned multiple times?"
        ]
    },
    {
        category: "Conversions & Deficits",
        questions: [
            "What is the lead-to-admission conversion rate by centre?",
            "What is the conversion rate by course, class, board and source?",
            "Which centres have enough leads to achieve their admission targets?",
            "Which centres have a lead deficit?",
            "At which funnel stage are the most leads being lost?"
        ]
    },
    {
        category: "SLA & Response",
        questions: [
            "How many leads are older than 24 hours without a first call?",
            "How many hot leads have not been contacted within the defined SLA?",
            "What is the average first-response time by telecaller and centre?",
            "What is the average time taken from lead generation to admission?"
        ]
    },
    {
        category: "Objections & Demands",
        questions: [
            "Which centres are losing leads due to fee, distance, faculty, timing or brand objections?",
            "What are the most common guardian objections by course?",
            "Which PIN codes have high demand but weak Pathfinder presence?",
            "Which schools or locations produce the highest-converting leads?",
            "Which leads were marked \"Not Interested\" without a valid reason?",
            "Which leads were closed unusually quickly?"
        ]
    },
    {
        category: "Campaigns & Pipeline Revenue",
        questions: [
            "What is the expected revenue currently available in the open pipeline?",
            "What is the weighted pipeline value after conversion probability?",
            "Which campaigns generated leads that actually converted?",
            "Which campaign has the lowest cost per lead / Cost per admission?",
            "Which campaign produces the highest realized revenue?",
            "Which campaigns produce leads outside Pathfinder's serviceable geography?"
        ]
    },
    {
        category: "Calling Efficiency & Operations",
        questions: [
            "Who is available in each calling window?",
            "Which hours generate the highest connection rate?",
            "Which hours generate the highest conversion rate?",
            "Is lead assignment proportional to staff availability?",
            "Which employees have more leads than they can meaningfully handle?",
            "Which centres need evening or weekend coverage?"
        ]
    },
    {
        category: "Marketing & Strategy",
        questions: [
            "Which campaign works best for each centre, course, class and board?",
            "What is the delay between exposure, lead creation and admission?",
            "Which creatives generate clicks but not counselling?",
            "Which campaign's leads are being mishandled by the sales team?",
            "What is the conversion rate of online versus physical counselling?",
            "Which course recommendations resulted in admission?",
            "Are counsellors recommending courses according to need or ticket size?",
            "What is the fee realization after each counsellor's discounting?",
            "Which centres have high counselling volume but weak admission closure?",
            "Is poor campaign performance caused by marketing or follow-up failure?",
            "What percentage of admissions are unattributed?",
            "Are campaign tags and UTM parameters being captured correctly?"
        ]
    },
    {
        category: "Audits & Staff Metrics",
        questions: [
            "Which staff members show suspicious bulk status updates?",
            "Which lead statuses appear manipulated near review dates?",
            "Which counsellors have the highest conversion after adjusting for lead quality?",
            "Which telecallers are receiving good leads but converting poorly?",
            "Which employees are receiving low-quality leads?"
        ]
    },
    {
        category: "Academics & Faculty Support",
        questions: [
            "Which teachers are available for counselling support, demo classes or seminars?",
            "Which lead-conversion activities require subject experts?",
            "Do demo class availability and admission conversion correlate?",
            "Which high-intent leads are waiting for faculty interaction?",
            "Which teachers generate the strongest conversion after orientation or demo sessions?",
            "Are sales teams promising academic slots that do not exist?"
        ]
    }
];

const AISectionAnalyst = ({ title, module, contextData, defaultQuestion, quickPrompts = [], isDarkMode, filters = {}, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState('');
    const panelRef = useRef(null);

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
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                ref={panelRef}
                className={`w-full max-w-6xl rounded-[8px] border p-6 transition-all duration-300 text-left shadow-2xl flex flex-col h-[90vh] max-h-[90vh] ${
                    isDarkMode 
                        ? 'bg-[#0f1115] border-gray-800 shadow-black/60 text-white' 
                        : 'bg-white border-gray-250 shadow-gray-200/50 text-black'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-gray-200 dark:border-gray-800/55 mb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-[4px] bg-cyan-500/10 text-cyan-500"><FaRobot size={18} /></span>
                        <div>
                            <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                Pathfinder AI Analyst
                            </h3>
                            <p className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Section: {title}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] bg-cyan-500/15 text-cyan-400">VITE-GEMINI</span>
                        <button 
                            onClick={onClose}
                            className={`p-1.5 rounded-full transition-colors ${
                                isDarkMode 
                                    ? 'text-gray-400 hover:text-white hover:bg-gray-800/60' 
                                    : 'text-gray-500 hover:text-black hover:bg-gray-100'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Main Content Area split into columns */}
                <div className="flex-1 flex gap-6 overflow-hidden min-h-0 mb-4">
                    {/* Left Column: Suggested CEO Lead Questions (only shown if module === "leads") */}
                    {module === "leads" && (
                        <div className="w-[340px] shrink-0 flex flex-col border-r border-gray-255 dark:border-gray-800 pr-4 overflow-y-auto custom-scrollbar">
                            <h4 className="text-xs font-black uppercase tracking-widest text-cyan-500 mb-4 select-none">CEO Control Tower CRM Prompts</h4>
                            <div className="space-y-4 pr-1">
                                {leadQuestionsCategories.map((cat, catIdx) => (
                                    <div key={catIdx} className="space-y-2">
                                        <h5 className="text-[11px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-1.5">{cat.category}</h5>
                                        <div className="flex flex-col gap-2">
                                            {cat.questions.map((q, qIdx) => (
                                                <button
                                                    key={qIdx}
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={(e) => handleAskQuestion(e, q)}
                                                    className={`text-left text-[12px] leading-snug font-bold p-3.5 rounded-[4px] border transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-black/30 border-gray-800 hover:border-cyan-500/40 hover:bg-cyan-500/5 text-gray-300 hover:text-white' 
                                                            : 'bg-gray-50 border-gray-200 hover:border-cyan-450 hover:bg-cyan-50/55 text-gray-750 hover:text-cyan-700 shadow-sm hover:shadow'
                                                    }`}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Right Column: Chat messages and input */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* Chat Messages */}
                        <div className="flex-1 space-y-4 overflow-y-auto pr-1.5 custom-scrollbar mb-4 min-h-[300px]">
                            {messages.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                                    <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-500 mb-4 animate-bounce">
                                        <FaRobot size={36} />
                                    </div>
                                    <h4 className={`text-base font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                                        Pathfinder AI Analyst Ready
                                    </h4>
                                    <p className={`text-xs max-w-md leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-650'}`}>
                                        {module === "leads" 
                                            ? "Select a suggested CEO Control Tower CRM question from the left sidebar, or type a custom question below to start analyzing live ERP data."
                                            : "Type a custom analysis question below to analyze this section's live ERP data."}
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex flex-col gap-1.5 p-4 rounded-[4px] border ${
                                        msg.role === 'user' 
                                            ? (isDarkMode 
                                                ? 'bg-cyan-500/5 border-cyan-500/10 align-self-end ml-12' 
                                                : 'bg-cyan-50/50 border-cyan-200/80 align-self-end ml-12')
                                            : (isDarkMode 
                                                ? 'bg-black/30 border-gray-850' 
                                                : 'bg-gray-50/75 border-gray-200/80 shadow-sm')
                                    }`}
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-cyan-500' : 'text-purple-500'}`}>
                                        {msg.role === 'user' ? 'You' : 'Pathfinder AI'}
                                    </span>
                                    <AIMarkdownText text={msg.text} />
                                </div>
                            ))}

                            {loading && messages.length === 0 && (
                                <div className="flex flex-col gap-3 py-16 items-center justify-center text-gray-500 font-bold text-sm">
                                    <span className="animate-spin text-cyan-500"><FaSyncAlt size={24} /></span>
                                    <span className="tracking-widest uppercase text-xs animate-pulse">Analyzing section data with Pathfinder AI...</span>
                                </div>
                            )}

                            {loading && messages.length > 0 && (
                                <div className="flex items-center gap-2 pl-3 text-cyan-500 text-xs font-bold">
                                    <span className="animate-pulse">Pathfinder AI is thinking...</span>
                                </div>
                            )}
                        </div>

                        {/* Footer input and prompts */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-800/55">
                            {quickPrompts.length > 0 && module !== "leads" && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {quickPrompts.map((promptText, pIdx) => (
                                        <button
                                            key={pIdx}
                                            type="button"
                                            onClick={(e) => handleAskQuestion(e, promptText)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
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

                            <form onSubmit={handleAskQuestion} className="flex gap-2.5 items-center">
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder={`Ask AI about ${title} data...`}
                                    className={`flex-1 text-sm font-medium p-3 rounded-[3px] border outline-none transition-all ${
                                        isDarkMode 
                                            ? 'bg-black border-gray-800 text-white focus:border-cyan-500' 
                                            : 'bg-white border-gray-200 text-black focus:border-cyan-500 shadow-sm'
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !question.trim()}
                                    className={`p-3 rounded-[3px] bg-cyan-500 text-black hover:bg-cyan-600 active:scale-95 transition-all font-black flex items-center justify-center ${
                                        (loading || !question.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <FaPaperPlane size={14} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CEOControlTowerContent = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    const [activeAIModule, setActiveAIModule] = useState(null);

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

                            <div onClick={(e) => e.stopPropagation()} className="relative z-20 mt-2 border-t border-gray-800/10 dark:border-gray-700/30 pt-4">
                                <button
                                    onClick={() => setActiveAIModule({
                                        title: m.name,
                                        module: m.moduleKey,
                                        defaultQuestion: m.aiQuestion,
                                        quickPrompts: m.aiPrompts
                                    })}
                                    className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-[2px] transition-all duration-300 active:scale-95 ${
                                        isDarkMode 
                                            ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20' 
                                            : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200'
                                    }`}
                                >
                                    <MdAutoAwesome className="animate-pulse" />
                                    Pathfinder AI Insights
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {activeAIModule && (
                <AISectionAnalyst
                    title={activeAIModule.title}
                    module={activeAIModule.module}
                    contextData={null}
                    defaultQuestion={activeAIModule.defaultQuestion}
                    quickPrompts={activeAIModule.quickPrompts}
                    isDarkMode={isDarkMode}
                    filters={{}}
                    onClose={() => setActiveAIModule(null)}
                />
            )}

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
