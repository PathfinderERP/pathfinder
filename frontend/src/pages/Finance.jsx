import React from "react";
import Layout from "../components/Layout";
import { FaMoneyCheckAlt, FaFileInvoiceDollar, FaCheckCircle, FaBan, FaChartLine, FaUsers, FaCalendarAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Finance = () => {
    const navigate = useNavigate();

    const financeModules = [
        {
            title: "Installment Payment",
            description: "Manage student fee installments and payment schedules",
            icon: <FaMoneyCheckAlt />,
            path: "/finance/installment-payment",
            color: "cyan",
            stats: { label: "Active Plans", value: "245" }
        },
        {
            title: "Fee Due List",
            description: "View and track all pending fee payments",
            icon: <FaFileInvoiceDollar />,
            path: "/finance/fee-due-list",
            color: "orange",
            stats: { label: "Pending", value: "₹12.5L" }
        },
        {
            title: "Cheque Management",
            description: "Track and manage cheque payments and clearances",
            icon: <FaCheckCircle />,
            path: "/finance/cheque-management",
            color: "emerald",
            stats: { label: "Pending", value: "18" }
        },
        {
            title: "Cancel Cheque Payment",
            description: "Process cheque cancellations and refunds",
            icon: <FaBan />,
            path: "/finance/cancel-cheque",
            color: "red",
            stats: { label: "Cancelled", value: "5" }
        }
    ];

    const quickStats = [
        { label: "Total Collection", value: "₹45.2L", icon: <FaChartLine />, color: "text-green-500" },
        { label: "Outstanding", value: "₹12.5L", icon: <FaCalendarAlt />, color: "text-orange-500" },
        { label: "Active Students", value: "1,245", icon: <FaUsers />, color: "text-cyan-500" }
    ];

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-screen">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
                        Finance & <span className="text-cyan-500">Fees</span>
                    </h1>
                    <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest">
                        Complete Financial Management System
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {quickStats.map((stat, index) => (
                        <div key={index} className="bg-[#131619] border border-gray-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`text-3xl ${stat.color}`}>{stat.icon}</div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-black text-white group-hover:text-cyan-400 transition-colors">
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Finance Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {financeModules.map((module, index) => (
                        <div
                            key={index}
                            onClick={() => navigate(module.path)}
                            className="group bg-[#131619] border border-gray-800 rounded-[2rem] p-8 hover:border-cyan-500/50 transition-all cursor-pointer relative overflow-hidden"
                        >
                            {/* Gradient Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-${module.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`w-16 h-16 rounded-2xl bg-${module.color}-500/10 border border-${module.color}-500/20 flex items-center justify-center text-${module.color}-500 text-2xl group-hover:scale-110 transition-transform`}>
                                        {module.icon}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                                            {module.stats.label}
                                        </div>
                                        <div className={`text-2xl font-black text-${module.color}-500`}>
                                            {module.stats.value}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-white mb-3 group-hover:text-cyan-400 transition-colors">
                                    {module.title}
                                </h3>
                                <p className="text-gray-400 text-sm font-medium leading-relaxed mb-6">
                                    {module.description}
                                </p>

                                <div className="flex items-center gap-2 text-cyan-500 font-bold text-sm group-hover:gap-4 transition-all">
                                    <span>Open Module</span>
                                    <span className="text-xl">→</span>
                                </div>
                            </div>

                            {/* Decorative Elements */}
                            <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-${module.color}-500/5 blur-2xl group-hover:scale-150 transition-transform`}></div>
                        </div>
                    ))}
                </div>

                {/* Additional Info Section */}
                <div className="mt-12 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-2">Need Help?</h3>
                            <p className="text-gray-400 text-sm">Contact the finance team for assistance with payments and queries</p>
                        </div>
                        <button className="px-8 py-4 bg-cyan-500 text-black font-black uppercase text-sm tracking-widest rounded-xl hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Finance;
