import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaRobot, FaTimes, FaPaperPlane, FaChevronRight,
    FaUserGraduate, FaUsers, FaComments, FaMoneyBillWave,
    FaUserTie, FaArrowLeft, FaGraduationCap
} from 'react-icons/fa';
import axios from 'axios';

const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [view, setView] = useState('welcome'); // welcome, choice, instructions, chat
    const [activeGuide, setActiveGuide] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            if (messages.length === 0) {
                setTimeout(() => {
                    addBotMessage("Welcome to Pathfinder ERP Assistant! 🚀\nI can guide you through any part of the system. What do you need help with today?");
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

    const erpGuides = {
        'lead': {
            title: 'Lead Management',
            icon: <FaUsers className="text-purple-600" />,
            bg: 'bg-purple-100 dark:bg-purple-900/50',
            steps: [
                { title: "Dashboard", detail: "Go to the lead management page ." },
                { title: "Add Lead", detail: "Then add the lead details , after that it will be appeared in the dashboard .You can ypload it by excel file also ." },
                { title: "Follow Up", detail: " Then click in the lead and add the follow up details .Click on the follow up then start the call , it will record the call then after completion you can update the details from hot to cold or cold to hot .Then add some feed back and next follow up date , means on which date they told you to call again, you can leave it blank if you want to call them immediately." },
                { title: "Save the follow up", detail: "Then save the follow up." }
            ]
        },
        'counselling': {
            title: 'Counselling',
            icon: <FaComments className="text-pink-600" />,
            bg: 'bg-pink-100 dark:bg-pink-900/50',
            steps: [
                { title: "Counselling Pool", detail: "Inside the admission section click on the counselled students section, then click on the add counselling button at the top right corner." },
                { title: "Fill the details", detail: "Fill the details of the student and the course.At first search the course from the search bar in the course section (if not present then you can create the course). select the course and fill the form with students data and save that form ." },
                { title: "Schedule Next", detail: "You can edit it later by clicking on the edit button." },
                { title: "Proceed to Admit", detail: "If convinced, start the admission finalization process." }
            ]
        },
        'enrollment': {
            title: 'Enrollment & Admission',
            icon: <FaUserGraduate className="text-cyan-600" />,
            bg: 'bg-cyan-100 dark:bg-cyan-900/50',
            steps: [
                { title: "Go to Counselling section", detail: "Click on the students right side Admit button." },
                { title: "Admission Form", detail: "Fill the amount details, means the total amount which they are paying as down payment , and the for the remaining amount they want to divide for how many months , and if you want to give them some discount then you can give it here (FEE WAIVER)." },
                { title: "Confirm the Admission", detail: "Confirm the admission by clicking on the confirm button.And generate the bill .You can also download it or print it.Then go to the enrolled students list." },
                { title: "Installment Payment", detail: "In the enrolled students list, click the row of that student, then you can see the installment payment details.You can also download it or print it.And during the installment you can also pay the more or the less amount than the installment amount, the remaining or the extra amount will be adjusted in the next installment." }
            ]
        },
        'finance': {
            title: 'Finance & Fees',
            icon: <FaMoneyBillWave className="text-emerald-600" />,
            bg: 'bg-emerald-100 dark:bg-emerald-900/50',
            steps: [
                { title: "Fee Collection", detail: "Go to Active Students to 'Pay Now' for EMI or pending fees." },
                { title: "Transaction List", detail: "View 'Finance & Fees > Transaction List' for all payments." },
                { title: "Defaulters", detail: "Track students who have missed their due dates." },
                { title: "Reports", detail: "Check out finance reports from the Sales Dashboard." }
            ]
        },
        'employee': {
            title: 'Employee Center',
            icon: <FaUserTie className="text-orange-600" />,
            bg: 'bg-orange-100 dark:bg-orange-900/50',
            steps: [
                { title: "My Profile", detail: "View your employee details, attendance, and leave balance." },
                { title: "Apply Leave", detail: "Submit a leave application through the 'Leave Management' tab." },
                { title: "Attendance", detail: "Check your daily and monthly biometric check-in/out logs." },
                { title: "Payslips", detail: "Access your monthly payslip history." }
            ]
        }
    };

    const handleChoice = (key) => {
        const guide = erpGuides[key];
        addUserMessage(`Help me with ${guide.title}`);

        setIsTyping(true);
        setView('chat'); // Hide choices temporarily

        setTimeout(() => {
            setIsTyping(false);
            addBotMessage(`Here is your quick guide for **${guide.title}**! Let me know if you need more details.`);
            setActiveGuide(guide);
            setView('instructions');
        }, 800);
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

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-80 md:w-96 h-[550px] bg-white/80 dark:bg-[#1c2128]/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex justify-between items-center z-10 shadow-sm relative">
                            <div className="flex items-center gap-3">
                                {view === 'instructions' ? (
                                    <button onClick={() => setView('choice')} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                                        <FaArrowLeft className="text-sm" />
                                    </button>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <FaRobot className="text-xl" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-sm">ERP Assistant</h3>
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
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'bot'
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
                                        : 'bg-cyan-600 text-white rounded-tr-none shadow-md'
                                        }`}>
                                        {msg.text.split('\n').map((line, i) => {
                                            // Handle basic bolding markdown
                                            const formattedLine = line.split('**').map((part, index) =>
                                                index % 2 === 1 ? <strong key={index}>{part}</strong> : part
                                            );
                                            return <p key={i} className={i > 0 ? 'mt-1' : ''}>{formattedLine}</p>;
                                        })}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Views */}
                            {view === 'choice' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-2 grid grid-cols-1 gap-2"
                                >
                                    {Object.entries(erpGuides).map(([key, guide]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleChoice(key)}
                                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-cyan-300 hover:shadow-md dark:hover:bg-gray-700 transition-all flex items-center gap-3 group"
                                        >
                                            <div className={`w-8 h-8 rounded-lg ${guide.bg} flex items-center justify-center transition-colors`}>
                                                {guide.icon}
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="text-sm font-bold dark:text-gray-200">{guide.title}</div>
                                            </div>
                                            <FaChevronRight className="text-gray-300 dark:text-gray-500 text-xs group-hover:text-cyan-500 transition-colors" />
                                        </button>
                                    ))}
                                </motion.div>
                            )}

                            {view === 'instructions' && activeGuide && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-4 pl-2"
                                >
                                    <div className="relative border-l-2 border-cyan-100 dark:border-gray-700 pl-4 py-2 space-y-5">
                                        {activeGuide.steps.map((step, i) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[25px] top-0 w-6 h-6 rounded-full bg-cyan-600 border-4 border-white dark:border-gray-900 text-white text-[10px] flex items-center justify-center font-black">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black dark:text-gray-200 uppercase tracking-wide text-cyan-600 dark:text-cyan-400">{step.title}</div>
                                                    <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{step.detail}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setView('choice')}
                                            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Back to Menu
                                        </button>
                                        <button
                                            onClick={() => setView('chat')}
                                            className="flex-1 py-2.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded-lg text-xs font-bold hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
                                        >
                                            Ask specific question
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center h-10 border border-gray-200 dark:border-gray-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce delay-150"></span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce delay-300"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#1c2128] border-t border-gray-100 dark:border-gray-800 flex gap-2">
                            {view === 'chat' && (
                                <button
                                    type="button"
                                    onClick={() => setView('choice')}
                                    className="w-10 h-10 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                                    title="Back to Topics"
                                >
                                    <FaRobot />
                                </button>
                            )}
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask me anything..."
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500 dark:text-white"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isTyping}
                                className="w-10 h-10 bg-gradient-to-tr from-cyan-600 to-blue-600 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-[#1c2128] text-white rounded-xl flex items-center justify-center hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shrink-0 disabled:opacity-50"
                            >
                                <FaPaperPlane className="text-xs ml-[-2px]" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Toggle */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.2)] ${isOpen
                    ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700'
                    : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                    }`}
            >
                {isOpen ? <FaTimes className="text-xl" /> : <FaRobot className="text-2xl" />}
                {!isOpen && (
                    <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1c2128]"
                    >
                        1
                    </motion.span>
                )}
            </motion.button>
        </div>
    );
};

export default AIAssistant;

