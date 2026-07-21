import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import axios from "axios";
import { MdAutoAwesome } from "react-icons/md";
import {
    FaRobot, FaPaperPlane, FaSyncAlt, FaMoon, FaSun,
    FaBullhorn, FaUserGraduate, FaMoneyBillWave, FaBook,
    FaUserTie, FaFlag, FaChartBar, FaTasks, FaTrashAlt,
    FaSearch, FaChevronRight, FaChevronDown, FaBrain
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
            parts.push(<em key={match.index} className="italic text-gray-500 dark:text-gray-300">{raw.slice(1, -1)}</em>);
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

// Categorized ERP Suggested Prompts covering ALL available ERP Data
const erpPromptCategories = [
    {
        title: "CRM & Lead Pipeline",
        icon: <FaBullhorn className="text-cyan-500" />,
        badge: "Leads Data",
        questions: [
            "How many leads were generated today, this week, and this month?",
            "How many leads are assigned versus unassigned across centres?",
            "What is the breakdown of leads by current status (contacted, counselled, converted, lost)?",
            "How many leads are older than 24 hours without a first call?",
            "What is the total and weighted pipeline revenue of all open leads?",
            "Which marketing campaigns generated the highest number of leads and counselling sessions?",
            "What are the counts of common lead objections (fee, distance, faculty, timing)?",
            "Which telecallers have the highest call volume and lead contacted rate?"
        ]
    },
    {
        title: "Admissions & Enrolments",
        icon: <FaUserGraduate className="text-emerald-500" />,
        badge: "Admissions Data",
        questions: [
            "What are the total registrations, counselled, and enrolled student counts by centre?",
            "What is the average conversion time from counselling to formal admission?",
            "Which counsellors have the highest conversion rates and reliance on discounts?",
            "What are the top 10 contributing schools for enrolled students?",
            "How many registered students have incomplete forms or missing documents?",
            "How many board course admissions are enrolled versus counselled?",
            "What is the breakdown of registrations by Board, Class, and Programme?"
        ]
    },
    {
        title: "Finance & Installments",
        icon: <FaMoneyBillWave className="text-amber-500" />,
        badge: "Finance Data",
        questions: [
            "What is the total revenue collected, pending due, and overall collection rate across centres?",
            "What is the monthly installment collection status for normal and board courses?",
            "Which students have overdue installments past their due dates?",
            "What is the total expense breakdown by category and centre?",
            "How many active admissions have total paid amount as ₹0 or pending clearance?",
            "What is the total discount given per centre and average discount per admission?"
        ]
    },
    {
        title: "Academics & Batches",
        icon: <FaBook className="text-purple-500" />,
        badge: "Academics Data",
        questions: [
            "How many registered students are not yet allotted to any batch?",
            "Which batches are underfilled (<10 students) or overcrowded (>40 capacity)?",
            "What is the overall student and faculty attendance rate today?",
            "How many enrolled students have paid fees but never attended any class?",
            "Which subjects and courses have the highest student enrollment?"
        ]
    },
    {
        title: "HR & Staffing",
        icon: <FaUserTie className="text-indigo-500" />,
        badge: "HR Data",
        questions: [
            "What is the total employee count and salary distribution across centres?",
            "What is the counselling session count completed by each counsellor?",
            "What is the employee attendance percentage for today across centres?",
            "Which centres have understaffed administrative or counseling teams?"
        ]
    },
    {
        title: "Operations & Executive Red Flags",
        icon: <FaFlag className="text-red-500" />,
        badge: "Operations Data",
        questions: [
            "What are the active open Red Flags by severity, owner, and centre?",
            "Which managers have not submitted their Daily Tracking Log today?",
            "What are the key blockers and pending approvals reported in daily logs?",
            "How many students have not received their books, materials, ID cards, or login credentials?",
            "What are the unresolved activities and promises made yesterday in daily logs?"
        ]
    }
];

export default function CEOControlTowerContent() {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [openCategory, setOpenCategory] = useState(0); // Open first category by default
    const [searchFilter, setSearchFilter] = useState("");

    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSendQuery = async (e, customQuery) => {
        if (e) e.preventDefault();
        const queryText = (customQuery || question).trim();
        if (!queryText || loading) return;

        const userMsg = { role: 'user', text: queryText, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setQuestion('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/ai/analyse`, {
                question: queryText,
                module: 'all' // Query across ALL ERP data
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.response) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: res.data.response,
                    timestamp: new Date()
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    text: "⚠️ Received empty response from Pathfinder AI.",
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error("Pathfinder AI query error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "⚠️ Error communicating with Pathfinder AI. Please ensure backend server is running.",
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
    };

    return (
        <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-[#0a0a0b] text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300 p-4 md:p-6 overflow-hidden`}>
            
            {/* Top Header Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-800 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
                        <FaBrain className="text-2xl animate-pulse text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase flex items-center gap-2">
                            Pathfinder AI Assistant
                            <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-500/15 text-cyan-500 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                                CEO Control Tower
                            </span>
                        </h1>
                        <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Enterprise AI Intelligence — Ask any questions about available ERP module data
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                    {messages.length > 0 && (
                        <button
                            onClick={handleClearChat}
                            className={`flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all ${
                                isDarkMode 
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            }`}
                            title="Clear Chat History"
                        >
                            <FaTrashAlt size={12} /> Clear Chat
                        </button>
                    )}

                    <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={() => theme === 'light' && toggleTheme()}
                            className={`p-2 rounded-lg transition-all ${isDarkMode ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20" : "text-gray-500 hover:text-cyan-500"}`}
                            title="Dark Mode"
                        >
                            <FaMoon size={13} />
                        </button>
                        <button
                            onClick={() => theme === 'dark' && toggleTheme()}
                            className={`p-2 rounded-lg transition-all ${!isDarkMode ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20" : "text-gray-600 hover:text-cyan-500"}`}
                            title="Light Mode"
                        >
                            <FaSun size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Interactive Interface Layout (2 Column split) */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden h-[calc(100vh-140px)]">
                
                {/* Left Sidebar: Categorized Suggested Questions */}
                <div className={`w-full md:w-[380px] shrink-0 flex flex-col rounded-2xl border p-4 overflow-hidden shadow-xl ${
                    isDarkMode ? 'bg-[#121418] border-gray-800/80' : 'bg-white border-gray-200'
                }`}>
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-500 flex items-center gap-2">
                                <MdAutoAwesome /> Suggested ERP Prompts
                            </h3>
                            <span className="text-[10px] font-bold text-gray-500">
                                {erpPromptCategories.reduce((acc, cat) => acc + cat.questions.length, 0)} Prompts
                            </span>
                        </div>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3 text-xs text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filter questions..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border outline-none transition-all ${
                                    isDarkMode 
                                        ? 'bg-black/40 border-gray-800 text-white placeholder-gray-500 focus:border-cyan-500/50' 
                                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-cyan-500/50'
                                }`}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1.5 space-y-3 custom-scrollbar">
                        {erpPromptCategories.map((cat, catIdx) => {
                            const filteredQuestions = searchFilter 
                                ? cat.questions.filter(q => q.toLowerCase().includes(searchFilter.toLowerCase()))
                                : cat.questions;

                            if (searchFilter && filteredQuestions.length === 0) return null;

                            const isOpen = openCategory === catIdx || searchFilter.length > 0;

                            return (
                                <div key={catIdx} className={`rounded-xl border transition-all ${
                                    isDarkMode ? 'border-gray-800/60 bg-black/20' : 'border-gray-200 bg-gray-50/50'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenCategory(isOpen && !searchFilter ? null : catIdx)}
                                        className={`w-full flex items-center justify-between p-3 text-left font-bold text-xs transition-colors rounded-xl ${
                                            isDarkMode ? 'hover:bg-gray-800/40 text-gray-200' : 'hover:bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-1.5 rounded-lg bg-gray-800/10 dark:bg-gray-800">{cat.icon}</span>
                                            <span>{cat.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500">
                                                {cat.badge}
                                            </span>
                                            {isOpen ? <FaChevronDown className="text-gray-400 text-xs" /> : <FaChevronRight className="text-gray-400 text-xs" />}
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="p-2 pt-0 space-y-1.5 border-t border-gray-200/50 dark:border-gray-800/50">
                                            {filteredQuestions.map((q, qIdx) => (
                                                <button
                                                    key={qIdx}
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={(e) => handleSendQuery(e, q)}
                                                    className={`w-full text-left text-[11px] leading-relaxed font-bold p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2 group ${
                                                        isDarkMode 
                                                            ? 'bg-black/40 border-gray-800/80 text-gray-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-white' 
                                                            : 'bg-white border-gray-200 text-gray-700 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 shadow-sm'
                                                    }`}
                                                >
                                                    <span className="flex-1">{q}</span>
                                                    <MdAutoAwesome className="text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Active Chat & Analysis Stream */}
                <div className={`flex-1 flex flex-col rounded-2xl border p-4 md:p-6 overflow-hidden shadow-2xl ${
                    isDarkMode ? 'bg-[#121418] border-gray-800/80' : 'bg-white border-gray-200'
                }`}>
                    
                    {/* Chat Message History */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar mb-4">
                        {messages.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 text-cyan-400 mb-4 animate-pulse shadow-lg shadow-cyan-500/5">
                                    <FaRobot size={44} />
                                </div>
                                <h3 className={`text-lg font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                                    Pathfinder ERP Assistant Ready
                                </h3>
                                <p className={`text-xs max-w-lg leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                                    Ask any analytical or operational questions about live ERP data — including Lead CRM, Admissions, Fee Collections, Expenses, Attendance, Batches, Staffing, or Executive Red Flags.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                                    {[
                                        "How many total admissions were done this month across all centres?",
                                        "What is the total fee revenue collected vs remaining due?",
                                        "Show me all active lead conversion rates by counsellor",
                                        "Which batches are currently overcrowded or underfilled?"
                                    ].map((quickQ, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={(e) => handleSendQuery(e, quickQ)}
                                            className={`text-[11px] font-bold px-3 py-2 rounded-xl border transition-all ${
                                                isDarkMode 
                                                    ? 'bg-gray-900/80 border-gray-800 text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10' 
                                                    : 'bg-gray-50 border-gray-200 text-cyan-700 hover:border-cyan-400 hover:bg-cyan-50'
                                            }`}
                                        >
                                            ✨ {quickQ}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                    {msg.role === 'user' ? (
                                        <><span>You</span> <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span></>
                                    ) : (
                                        <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> <span>Pathfinder AI Analyst</span></>
                                    )}
                                </div>

                                <div className={`p-4 rounded-2xl max-w-[92%] border transition-all ${
                                    msg.role === 'user'
                                        ? (isDarkMode 
                                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-100 rounded-tr-none' 
                                            : 'bg-cyan-500 text-white border-cyan-600 rounded-tr-none font-medium shadow-md')
                                        : (isDarkMode 
                                            ? 'bg-gray-900/90 border-gray-800 text-gray-200 rounded-tl-none shadow-lg' 
                                            : 'bg-gray-50 border-gray-200 text-gray-900 rounded-tl-none shadow-sm')
                                }`}>
                                    {msg.role === 'user' ? (
                                        <p className="text-sm font-semibold">{msg.text}</p>
                                    ) : (
                                        <AIMarkdownText text={msg.text} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 max-w-[300px]">
                                <div className="animate-spin h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                                <span className="text-xs font-black uppercase tracking-widest text-cyan-500 animate-pulse">
                                    Analyzing Live ERP Data...
                                </span>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Bottom Prompt Input Area */}
                    <form onSubmit={(e) => handleSendQuery(e)} className="pt-3 border-t border-gray-200 dark:border-gray-800/80">
                        <div className={`flex items-center gap-2 p-1.5 rounded-2xl border transition-all ${
                            isDarkMode 
                                ? 'bg-black/50 border-gray-800 focus-within:border-cyan-500/60 focus-within:bg-black/80' 
                                : 'bg-gray-50 border-gray-300 focus-within:border-cyan-500 focus-within:bg-white'
                        }`}>
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Ask any question about ERP data (e.g., total collection, unassigned leads, student counts)..."
                                disabled={loading}
                                className={`flex-1 bg-transparent px-4 py-2.5 text-xs md:text-sm font-semibold outline-none ${
                                    isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                                }`}
                            />
                            <button
                                type="submit"
                                disabled={loading || !question.trim()}
                                className={`p-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    loading || !question.trim()
                                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95'
                                }`}
                            >
                                <FaPaperPlane size={13} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
            `}</style>
        </div>
    );
}
