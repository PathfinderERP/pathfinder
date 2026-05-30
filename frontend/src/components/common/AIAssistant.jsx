import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaRobot, FaTimes, FaPaperPlane, FaChevronRight,
    FaUserGraduate, FaUsers, FaMoneyBillWave,
    FaUserTie, FaArrowLeft, FaChartBar
} from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import axios from 'axios';


// ── Simple Markdown Renderer ──────────────────────────────────
const MarkdownText = ({ text }) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
        <div className="ai-markdown space-y-1">
            {lines.map((line, i) => {
                // Heading
                if (line.startsWith('### ')) return <h4 key={i} className="font-black text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mt-2">{line.slice(4)}</h4>;
                if (line.startsWith('## ')) return <h3 key={i} className="font-black text-sm text-gray-800 dark:text-gray-100 mt-2">{line.slice(3)}</h3>;
                if (line.startsWith('# ')) return <h2 key={i} className="font-black text-sm text-gray-900 dark:text-white mt-2">{line.slice(2)}</h2>;

                // Bullet points
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    const content = line.slice(2);
                    return (
                        <div key={i} className="flex gap-1.5 items-start">
                            <span className="text-cyan-500 mt-0.5 text-xs">•</span>
                            <span>{formatInline(content)}</span>
                        </div>
                    );
                }

                // Numbered list
                if (/^\d+\.\s/.test(line)) {
                    const match = line.match(/^(\d+)\.\s(.*)$/);
                    if (match) {
                        return (
                            <div key={i} className="flex gap-1.5 items-start">
                                <span className="text-cyan-600 font-bold min-w-[16px] text-xs">{match[1]}.</span>
                                <span>{formatInline(match[2])}</span>
                            </div>
                        );
                    }
                }

                // Horizontal rule
                if (line === '---' || line === '***') return <hr key={i} className="border-gray-200 dark:border-gray-700 my-1" />;

                // Empty line
                if (!line.trim()) return <div key={i} className="h-1" />;

                // Regular paragraph
                return <p key={i}>{formatInline(line)}</p>;
            })}
        </div>
    );
};

// Inline formatting (bold, italic, code)
const formatInline = (text) => {
    const parts = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        const raw = match[0];
        if (raw.startsWith('**')) parts.push(<strong key={match.index} className="font-bold text-gray-900 dark:text-white">{raw.slice(2, -2)}</strong>);
        else if (raw.startsWith('*')) parts.push(<em key={match.index} className="italic">{raw.slice(1, -1)}</em>);
        else if (raw.startsWith('`')) parts.push(<code key={match.index} className="bg-gray-100 dark:bg-gray-800 rounded px-1 text-[10px] font-mono text-cyan-600">{raw.slice(1, -1)}</code>);
        lastIndex = match.index + raw.length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length ? parts : text;
};

// ── Main Component ────────────────────────────────────────────
const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [view, setView] = useState('welcome'); // welcome, choice, chat
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setTimeout(() => {
                addBotMessage(
                    "Hello! I'm **Pathfinder AI** 🤖\n\nI have live access to your ERP data. Ask me anything about:\n- **Admissions & Fees** — today's admissions, pending payments\n- **Leads** — hot leads, follow-up counts\n- **Students** — enrolled, active, centre-wise\n- **HR** — employees, salary bill\n- **Finance** — expenses, collections\n- **Or just ask** — \"Give me today's ERP summary\""
                );
                setView('choice');
            }, 400);
        }
    }, [isOpen]);

    useEffect(scrollToBottom, [messages]);

    const addBotMessage = (text) => {
        setMessages(prev => [...prev, { role: 'bot', text }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, { role: 'user', text }]);
    };

    const quickPrompts = [
        { label: "Today's ERP Summary", icon: <MdAutoAwesome />, prompt: "Give me today's complete ERP overview and summary" },
        { label: "Pending Payments", icon: <FaMoneyBillWave />, prompt: "Show me all pending and overdue payment admissions" },
        { label: "Lead Overview", icon: <FaUsers />, prompt: "How many leads do we have? Break down by hot, warm and cold" },
        { label: "Admission Stats", icon: <FaUserGraduate />, prompt: "Give me the complete admissions statistics and revenue collected" },
        { label: "Employee Summary", icon: <FaUserTie />, prompt: "Give me a summary of all employees and total monthly salary bill" },
        { label: "Finance Report", icon: <FaChartBar />, prompt: "Show me the finance and expense summary for this month" },
    ];

    const handleQuickPrompt = (prompt) => {
        setInputValue(prompt);
        handleSendMessage(null, prompt);
    };

    const handleSendMessage = async (e, overrideMsg = null) => {
        if (e) e.preventDefault();
        const userMsg = overrideMsg || inputValue;
        if (!userMsg.trim()) return;

        setInputValue('');
        addUserMessage(userMsg);
        setIsTyping(true);
        setView('chat');

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/ai/chat', {
                message: userMsg,
                context: window.location.pathname
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsTyping(false);
            addBotMessage(response.data.response);
        } catch (error) {
            console.error("AI Error:", error);
            setIsTyping(false);
            addBotMessage("⚠️ I'm having trouble connecting to the ERP right now. Please check your connection and try again.");
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="mb-4 w-80 md:w-[400px] h-[580px] bg-white/90 dark:bg-[#1c2128]/97 backdrop-blur-2xl border border-white/30 dark:border-gray-700/60 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }}></div>
                            <div className="flex items-center gap-3 relative z-10">
                                {view === 'chat' ? (
                                    <button
                                        onClick={() => setView('choice')}
                                        className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                    >
                                        <FaArrowLeft className="text-sm" />
                                    </button>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                                        <FaRobot className="text-xl" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-black text-sm tracking-wide">Pathfinder AI</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                        <span className="text-[10px] opacity-90 uppercase tracking-widest font-bold">Live ERP Access</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="relative z-10 hover:bg-white/20 p-2 rounded-full transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={idx}
                                    className={`flex ${msg.role === 'bot' ? 'justify-start' : 'justify-end'}`}
                                >
                                    {msg.role === 'bot' && (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mr-2 mt-0.5 shrink-0 shadow-md">
                                            <FaRobot className="text-white text-[10px]" />
                                        </div>
                                    )}
                                    <div className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                                        msg.role === 'bot'
                                            ? 'bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700/50 shadow-sm'
                                            : 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-lg'
                                    }`}>
                                        {msg.role === 'bot'
                                            ? <MarkdownText text={msg.text} />
                                            : <p>{msg.text}</p>
                                        }
                                    </div>
                                </motion.div>
                            ))}

                            {/* Quick Prompts Panel */}
                            {view === 'choice' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-1 grid grid-cols-1 gap-2"
                                >
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">Quick Questions</p>
                                    {quickPrompts.map((qp, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleQuickPrompt(qp.prompt)}
                                            className="w-full p-2.5 bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 rounded-xl hover:border-cyan-400 hover:shadow-md hover:bg-cyan-50/50 dark:hover:bg-gray-700/60 transition-all flex items-center gap-3 group text-left"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-xs shrink-0">
                                                {qp.icon}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{qp.label}</span>
                                            <FaChevronRight className="ml-auto text-gray-300 dark:text-gray-600 text-[10px] group-hover:text-cyan-500 transition-colors" />
                                        </button>
                                    ))}
                                </motion.div>
                            )}

                            {/* Typing Indicator */}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mr-2 shrink-0 shadow-md">
                                        <FaRobot className="text-white text-[10px]" />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center border border-gray-100 dark:border-gray-700/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        <span className="text-[10px] text-gray-400 ml-1">Analysing ERP data...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form
                            onSubmit={handleSendMessage}
                            className="p-3 bg-white/80 dark:bg-[#1c2128]/90 border-t border-gray-100 dark:border-gray-800 flex gap-2"
                        >
                            {view === 'chat' && (
                                <button
                                    type="button"
                                    onClick={() => setView('choice')}
                                    className="w-10 h-10 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                                    title="Back to Quick Questions"
                                >
                                    <MdAutoAwesome />
                                </button>
                            )}
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask anything about your ERP..."
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:text-white placeholder-gray-400 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isTyping}
                                className="w-10 h-10 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl flex items-center justify-center hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FaPaperPlane className="text-xs" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,150,255,0.35)] relative ${
                    isOpen
                        ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700'
                        : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                }`}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <FaTimes className="text-xl" />
                        </motion.span>
                    ) : (
                        <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <FaRobot className="text-2xl" />
                        </motion.span>
                    )}
                </AnimatePresence>

                {!isOpen && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow"
                    >
                        AI
                    </motion.span>
                )}
            </motion.button>
        </div>
    );
};

export default AIAssistant;
