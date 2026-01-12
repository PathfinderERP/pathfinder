import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaUserGraduate, FaUniversity, FaChartLine, FaUsers,
    FaArrowRight, FaCheckCircle, FaGlobe, FaShieldAlt
} from 'react-icons/fa';
import logo from '../assets/logo-1.svg';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <FaUserGraduate className="text-4xl text-cyan-400" />,
            title: "Student Management",
            description: "End-to-end lifecycle tracking from admission to alumni status."
        },
        {
            icon: <FaUniversity className="text-4xl text-purple-400" />,
            title: "Academic Excellence",
            description: "Advanced curriculum planning, scheduling, and examination tools."
        },
        {
            icon: <FaChartLine className="text-4xl text-green-400" />,
            title: "Financial Intelligence",
            description: "Automated fee collection, expense tracking, and real-time auditing."
        },
        {
            icon: <FaUsers className="text-4xl text-pink-400" />,
            title: "HR & Payroll",
            description: "Comprehensive workforce management, attendance, and payroll processing."
        }
    ];

    return (
        <div className="min-h-screen bg-[#0a0d11] text-white font-sans overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen opacity-20 animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-purple-600/20 rounded-full blur-[140px] mix-blend-screen opacity-20 animate-pulse delay-1000"></div>
            </div>

            {/* Navbar */}
            <nav className="fixed w-full z-50 transition-all duration-300 bg-[#0a0d11]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-8xl mx-auto px-6 lg:px-12 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
                        <img src={logo} alt="Pathfinder Logo" className="h-10 w-auto filter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                        <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                PATHFINDER
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">
                                Enterprise Resource Planning
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-8 rounded-full shadow-lg shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                            Log In
                        </button>
                    </div>
                </div>
            </nav>

            {/* Content Wrapper */}
            <div className="relative z-10 pt-32 pb-16 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col items-center text-center">

                {/* Hero Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm font-bold tracking-wide mb-8 animate-fade-in-up">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    POWERING 50+ INSTITUTIONS
                </div>

                {/* Main Headline */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
                    The Future of <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 animate-gradient-text">
                        Education Management
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="text-xl md:text-2xl text-gray-400 max-w-3xl leading-relaxed mb-12 font-medium">
                    A unified, intelligent ecosystem designed to streamline operations, enhance learning, and drive institutional growth with AI-powered insights.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto mb-20 animate-fade-in-up delay-200">
                    <button
                        onClick={() => navigate('/login')}
                        className="group relative px-10 py-5 bg-white text-black text-lg font-black tracking-wide rounded-2xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.4)] transition-all duration-300 transform hover:scale-[1.02]"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            ACCESS PORTAL <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                    <button className="px-10 py-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-lg font-bold rounded-2xl backdrop-blur-md transition-all duration-300">
                        REQUEST DEMO
                    </button>
                </div>

                {/* Dashboard Preview (Abstract) */}
                <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#131619]/50 backdrop-blur-xl p-4 shadow-2xl mb-32 relative overflow-hidden group">
                    {/* Window Controls */}
                    <div className="absolute top-0 left-0 w-full h-12 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                    </div>

                    {/* Placeholder for actual content representation - using a gradient mesh or grid */}
                    <div className="mt-8 aspect-video w-full rounded-xl bg-gradient-to-br from-[#1a1f24] to-[#0d1014] relative overflow-hidden flex items-center justify-center border border-white/5">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                        <div className="text-center z-10 opacity-70 group-hover:opacity-100 transition-opacity duration-500">
                            <img src={logo} className="w-32 h-32 mx-auto mb-6 opacity-80" alt="Logo" />
                            <h3 className="text-2xl font-bold tracking-widest text-[#2a3036] uppercase">Dashboard Interface</h3>
                        </div>
                    </div>

                    {/* Glow effect under preview */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl blur-3xl opacity-10 -z-10 group-hover:opacity-20 transition-opacity duration-700"></div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl">
                    {features.map((feature, idx) => (
                        <div key={idx} className="bg-[#131619] p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 hover:bg-[#1a1f24] transition-all duration-300 group ring-1 ring-transparent hover:ring-cyan-500/20 shadow-lg hover:shadow-cyan-900/10">
                            <div className="w-16 h-16 rounded-2xl bg-[#0a0d11] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{feature.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* Trust/Stats Banner */}
                <div className="w-full mt-32 pt-20 border-t border-white/5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/5">
                        <div>
                            <div className="text-4xl font-black text-white mb-2">50+</div>
                            <div className="text-gray-500 uppercase text-xs tracking-widest font-bold">Institutions</div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-white mb-2">10k+</div>
                            <div className="text-gray-500 uppercase text-xs tracking-widest font-bold">Students Managed</div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-white mb-2">99.9%</div>
                            <div className="text-gray-500 uppercase text-xs tracking-widest font-bold">Uptime Reliability</div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-white mb-2">24/7</div>
                            <div className="text-gray-500 uppercase text-xs tracking-widest font-bold">Premium Support</div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <footer className="w-full bg-[#050608] border-t border-white/5 mt-20">
                <div className="max-w-7xl mx-auto px-12 py-12 flex flex-col md:flex-row justify-between items-center gap-8 text-gray-400 text-sm">
                    <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
                        <img src={logo} className="h-6 w-auto grayscale" alt="Logo" />
                        <span>&copy; {new Date().getFullYear()} Pathfinder ERP</span>
                    </div>

                    <div className="flex gap-8">
                        <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
                        <button
                            onClick={() => navigate('/login')}
                            className="hover:text-cyan-400 transition-colors uppercase font-bold"
                        >
                            Staff Login
                        </button>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes gradient-text {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-text {
                    background-size: 200% auto;
                    animation: gradient-text 5s ease infinite;
                }
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }
                .delay-200 { animation-delay: 200ms; }
                .delay-1000 { animation-delay: 1000ms; }
            `}</style>
        </div>
    );
};

export default LandingPage;
