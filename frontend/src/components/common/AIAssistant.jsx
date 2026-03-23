
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaTimes, FaPaperPlane, FaChevronRight, FaInfoCircle, FaGraduationCap, FaUserGraduate } from 'react-icons/fa';
import axios from 'axios';

const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [view, setView] = useState('welcome'); // welcome, choice, instructions, chat
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            // Automatically show welcome options if first time opening
            if (messages.length === 0) {
                setTimeout(() => {
                    addBotMessage("Welcome to Pathfinder ERP Assistant! 🚀\nI can help you navigate the system. Which type of admission would you like to perform today?");
                    setView('choice');
                }, 500);
            }
        }
    }, [isOpen]);

    useEffect(scrollToBottom, [messages]);

    const addBotMessage = (text) => {
        setMessages(prev => [...prev, { role: 'bot', text }]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [...prev, { role: 'user', text }]);
    };

    const handleChoice = (type) => {
        addUserMessage(type === 'normal' ? "Normal Admission" : "Board Admission");
        
        if (type === 'normal') {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addBotMessage("Great! I'll guide you through the **Normal Admission** process step-by-step.");
                setView('instructions');
            }, 800);
        } else {
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addBotMessage("For **Board Admission**, you should go to the 'Board Admissions' section in the sidebar. Would you like me to tell you more about it?");
                setView('chat');
            }, 800);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = inputValue;
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
            addBotMessage("I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.");
        }
    };

    const normalAdmissionSteps = [
        { title: "Find Lead", detail: "Go to Telecalling Console or Lead Management to locate the student." },
        { title: "Create Profile", detail: "Navigate to 'Student Registration' to enter basic details." },
        { title: "Start Admission", detail: "Open 'Student Admission' from the sidebar." },
        { title: "Course & Fees", detail: "Search for the student, select their course, and set the fee structure." },
        { title: "Save & Finalize", detail: "Review all details and save. The Admission ID will be generated." }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-80 md:w-96 h-[500px] bg-white/80 dark:bg-[#1c2128]/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <FaRobot className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Pathfinder Assistant</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                        <span className="text-[10px] opacity-80 uppercase tracking-wider font-bold">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: msg.role === 'bot' ? -10 : 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx}
                                    className={`flex ${msg.role === 'bot' ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                        msg.role === 'bot' 
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none' 
                                            : 'bg-cyan-600 text-white rounded-tr-none shadow-md'
                                    }`}>
                                        {msg.text.split('\n').map((line, i) => (
                                            <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Views */}
                            {view === 'choice' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-2 flex flex-col gap-2"
                                >
                                    <button 
                                        onClick={() => handleChoice('normal')}
                                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                                            <FaUserGraduate />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold dark:text-gray-200">Normal Admission</div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Regular school course enrollments</div>
                                        </div>
                                        <FaChevronRight className="ml-auto text-gray-300" />
                                    </button>

                                    <button 
                                        onClick={() => handleChoice('board')}
                                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <FaGraduationCap />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold dark:text-gray-200">Board Admission</div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">Competitive & Board exam coaching</div>
                                        </div>
                                        <FaChevronRight className="ml-auto text-gray-300" />
                                    </button>
                                </motion.div>
                            )}

                            {view === 'instructions' && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-3"
                                >
                                    {normalAdmissionSteps.map((step, i) => (
                                        <div key={i} className="flex gap-3 items-start">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-[10px] flex items-center justify-center font-bold">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold dark:text-gray-200 uppercase tracking-tight">{step.title}</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">{step.detail}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => setView('chat')}
                                        className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                                    >
                                        I have more questions
                                    </button>
                                </motion.div>
                            )}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce delay-150"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce delay-300"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask me anything..."
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500 dark:text-white"
                            />
                            <button 
                                type="submit"
                                className="w-10 h-10 bg-cyan-600 text-white rounded-xl flex items-center justify-center hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-600/20"
                            >
                                <FaPaperPlane />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Toggle */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                    isOpen 
                        ? 'bg-white text-gray-800' 
                        : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                }`}
            >
                {isOpen ? <FaTimes className="text-xl" /> : <FaRobot className="text-2xl" />}
                {!isOpen && (
                    <motion.span 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
                    >
                        1
                    </motion.span>
                )}
            </motion.button>
        </div>
    );
};

export default AIAssistant;
