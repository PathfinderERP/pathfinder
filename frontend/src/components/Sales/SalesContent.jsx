import React, { useState } from "react";
import { 
    FaChartLine, FaShoppingCart, FaTrophy, FaUsers, 
    FaDollarSign, FaArrowUp, FaArrowDown, FaCalendarAlt,
    FaFilter, FaDownload, FaPlus
} from "react-icons/fa";

const SalesContent = () => {
    const [selectedPeriod, setSelectedPeriod] = useState("month");

    // Demo data
    const salesStats = [
        {
            title: "Total Revenue",
            value: "₹12,45,000",
            change: "+12.5%",
            trend: "up",
            icon: <FaDollarSign />,
            color: "cyan"
        },
        {
            title: "Total Orders",
            value: "1,234",
            change: "+8.2%",
            trend: "up",
            icon: <FaShoppingCart />,
            color: "green"
        },
        {
            title: "Active Customers",
            value: "856",
            change: "+15.3%",
            trend: "up",
            icon: <FaUsers />,
            color: "purple"
        },
        {
            title: "Conversion Rate",
            value: "68.5%",
            change: "-2.1%",
            trend: "down",
            icon: <FaTrophy />,
            color: "orange"
        }
    ];

    const recentOrders = [
        { id: "ORD-001", customer: "Rahul Sharma", amount: "₹15,000", status: "Completed", date: "2025-12-06" },
        { id: "ORD-002", customer: "Priya Patel", amount: "₹22,500", status: "Pending", date: "2025-12-06" },
        { id: "ORD-003", customer: "Amit Kumar", amount: "₹8,750", status: "Processing", date: "2025-12-05" },
        { id: "ORD-004", customer: "Sneha Reddy", amount: "₹31,200", status: "Completed", date: "2025-12-05" },
        { id: "ORD-005", customer: "Vikram Singh", amount: "₹19,800", status: "Completed", date: "2025-12-04" },
    ];

    const topProducts = [
        { name: "Premium Course Package", sales: 145, revenue: "₹4,35,000" },
        { name: "Standard Course Package", sales: 289, revenue: "₹3,46,800" },
        { name: "Basic Course Package", sales: 412, revenue: "₹2,47,200" },
        { name: "Advanced Coaching", sales: 98, revenue: "₹1,96,000" },
    ];

    const getStatusColor = (status) => {
        const colors = {
            Completed: "bg-green-500/20 text-green-400 border-green-500/50",
            Pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
            Processing: "bg-blue-500/20 text-blue-400 border-blue-500/50",
            Cancelled: "bg-red-500/20 text-red-400 border-red-500/50"
        };
        return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/50";
    };

    const getStatColor = (color) => {
        const colors = {
            cyan: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
            green: "bg-green-500/20 text-green-400 border-green-500/50",
            purple: "bg-purple-500/20 text-purple-400 border-purple-500/50",
            orange: "bg-orange-500/20 text-orange-400 border-orange-500/50"
        };
        return colors[color] || "bg-gray-500/20 text-gray-400 border-gray-500/50";
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FaChartLine className="text-cyan-400" />
                        Sales Dashboard
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Track your sales performance and revenue</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>

                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                        <FaFilter /> Filter
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/50 rounded-lg hover:bg-green-600/30 transition-colors">
                        <FaDownload /> Export
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors">
                        <FaPlus /> New Order
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {salesStats.map((stat, index) => (
                    <div key={index} className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800 hover:border-cyan-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-lg ${getStatColor(stat.color)} flex items-center justify-center text-xl`}>
                                {stat.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-semibold ${stat.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                                {stat.trend === "up" ? <FaArrowUp /> : <FaArrowDown />}
                                {stat.change}
                            </div>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FaShoppingCart className="text-cyan-400" />
                            Recent Orders
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-800/50 text-gray-400 text-sm uppercase">
                                    <th className="p-4 text-left border-b border-gray-800">Order ID</th>
                                    <th className="p-4 text-left border-b border-gray-800">Customer</th>
                                    <th className="p-4 text-left border-b border-gray-800">Amount</th>
                                    <th className="p-4 text-left border-b border-gray-800">Status</th>
                                    <th className="p-4 text-left border-b border-gray-800">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {recentOrders.map((order, index) => (
                                    <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="p-4 text-cyan-400 font-semibold">{order.id}</td>
                                        <td className="p-4 text-white">{order.customer}</td>
                                        <td className="p-4 text-white font-semibold">{order.amount}</td>
                                        <td className="p-4">
                                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm flex items-center gap-2">
                                            <FaCalendarAlt className="text-gray-500" />
                                            {order.date}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FaTrophy className="text-orange-400" />
                            Top Products
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {topProducts.map((product, index) => (
                            <div key={index} className="bg-gray-800/30 p-4 rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-all">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-white font-semibold text-sm">{product.name}</h4>
                                    <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-2 py-1 rounded">
                                        #{index + 1}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">{product.sales} sales</span>
                                    <span className="text-green-400 font-semibold">{product.revenue}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Demo Notice */}
            <div className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xl flex-shrink-0">
                        <FaChartLine />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg mb-2">Sales Dashboard - Demo Version</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            This is a demo sales dashboard showcasing key metrics, recent orders, and top-performing products. 
                            The data shown here is sample data for demonstration purposes. In the production version, this will 
                            display real-time sales data, analytics, and comprehensive reporting features.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="bg-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Real-time Analytics
                            </span>
                            <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Revenue Tracking
                            </span>
                            <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Order Management
                            </span>
                            <span className="bg-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Performance Reports
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesContent;
