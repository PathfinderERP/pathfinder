import React from "react";
import logo from '../../assets/logo-1.svg';

const DashboardContent = () => {
    return (
        <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#131619] p-6 text-center overflow-hidden relative">

            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none"></div>

            <div className="relative z-10 max-w-2xl animate-fade-in-up">
                <img
                    src={logo}
                    alt="Pathfinder Logo"
                    className="w-64 h-auto mx-auto mb-8 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-pulse-slow"
                />

                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6">
                    Welcome to <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                        Pathfinder ERP
                    </span>
                </h1>

                <p className="text-xl text-gray-400 font-medium leading-relaxed mb-10">
                    Your central command for institutional excellence. <br />
                    Select a module from the sidebar to begin your journey.
                </p>

                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm font-bold tracking-wide">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    SYSTEM OPERATIONAL
                </div>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }
                @keyframes pulse-slow {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default DashboardContent;
