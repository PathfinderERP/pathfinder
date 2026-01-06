import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaChartLine, FaMoneyBillWave, FaCalendarAlt, FaFilter } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FinancialAnalysis = () => {
    const [loading, setLoading] = useState(true);
    const [selectedCentre, setSelectedCentre] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState("This Month");
    const [centres, setCentres] = useState([]);
    const [analytics, setAnalytics] = useState({
        totalAmountToCome: 0,
        totalAmountCame: 0,
        amountWillCome: 0,
        totalDue: 0,
        paymentBreakdown: {
            CASH: 0,
            UPI: 0,
            CARD: 0,
            BANK_TRANSFER: 0,
            CHEQUE: 0,
            CHEQUE_PENDING: 0
        }
    });

    useEffect(() => {
        fetchCentres();
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [selectedCentre, selectedPeriod]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (selectedCentre) params.append("centreId", selectedCentre);
            params.append("period", selectedPeriod);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/analytics?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = await response.json();
            if (response.ok) {
                setAnalytics(data);
            } else {
                toast.error(data.message || "Failed to fetch analytics");
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const StatCard = ({ title, amount, subtitle, colorClass, icon }) => (
        <div className={`bg-[#1a1f24] p-5 rounded-xl border border-gray-800 transition-all hover:border-cyan-500/50 group relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`}></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-800/50 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">{formatCurrency(amount)}</h3>
                <p className="text-gray-500 text-[10px] italic">{subtitle}</p>
            </div>
        </div>
    );

    const PaymentCard = ({ title, amount, icon, colorClass = "text-cyan-400" }) => (
        <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 hover:border-cyan-500/30 transition-all flex items-center gap-4">
            <div className={`p-2 bg-gray-800/50 rounded-lg ${colorClass}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{title}</p>
                <p className={`text-lg font-bold ${colorClass}`}>{formatCurrency(amount)}</p>
            </div>
        </div>
    );

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-2 space-y-8">
                <ToastContainer position="top-right" theme="dark" />

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                                <FaChartLine size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Financial Analysis</h1>
                        </div>
                        <p className="text-gray-400 text-sm">Comprehensive revenue and payment tracking</p>
                    </div>

                    <div className="flex flex-wrap gap-4 bg-[#1a1f24] p-3 rounded-2xl border border-gray-800 shadow-xl">
                        <div className="flex items-center gap-3 px-2">
                            <FaFilter className="text-cyan-500 text-xs" />
                            <select
                                value={selectedCentre}
                                onChange={(e) => setSelectedCentre(e.target.value)}
                                className="bg-transparent text-white text-sm focus:outline-none cursor-pointer font-bold w-40"
                            >
                                <option value="" className="bg-[#1a1f24]">All Centres</option>
                                {centres.map(c => (
                                    <option key={c._id} value={c._id} className="bg-[#1a1f24]">{c.centreName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-px h-6 bg-gray-700 hidden md:block"></div>
                        <div className="flex items-center gap-3 px-2">
                            <FaCalendarAlt className="text-cyan-500 text-xs" />
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="bg-transparent text-white text-sm focus:outline-none cursor-pointer font-bold"
                            >
                                <option value="This Month" className="bg-[#1a1f24]">This Month</option>
                                <option value="Last Month" className="bg-[#1a1f24]">Last Month</option>
                                <option value="This Quarter" className="bg-[#1a1f24]">This Quarter</option>
                                <option value="This Year" className="bg-[#1a1f24]">This Year</option>
                                <option value="All Time" className="bg-[#1a1f24]">All Time</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-cyan-500 font-bold tracking-widest text-[10px] uppercase">Gathering Intelligence...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard
                                title="Total Amount Has to Come"
                                amount={analytics.totalAmountToCome}
                                subtitle="Expected Revenue"
                                colorClass="bg-blue-500"
                                icon={<FaChartLine size={20} />}
                            />
                            <StatCard
                                title="Total Amount Came"
                                amount={analytics.totalAmountCame}
                                subtitle="Received Revenue"
                                colorClass="bg-green-500"
                                icon={<FaMoneyBillWave size={20} />}
                            />
                            <StatCard
                                title="Amount will Come"
                                amount={analytics.amountWillCome}
                                subtitle="Pending Revenue"
                                colorClass="bg-purple-500"
                                icon={<FaCalendarAlt size={20} />}
                            />
                        </div>

                        {/* Breakdown Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <PaymentCard
                                title="Cash"
                                amount={analytics.paymentBreakdown.CASH}
                                icon={<FaMoneyBillWave />}
                            />
                            <PaymentCard
                                title="UPI"
                                amount={analytics.paymentBreakdown.UPI}
                                icon={<FaMoneyBillWave />}
                                colorClass="text-purple-400"
                            />
                            <PaymentCard
                                title="Cheque (Cleared)"
                                amount={analytics.paymentBreakdown.CHEQUE}
                                icon={<FaMoneyBillWave />}
                                colorClass="text-blue-400"
                            />
                            <PaymentCard
                                title="Card"
                                amount={analytics.paymentBreakdown.CARD}
                                icon={<FaMoneyBillWave />}
                                colorClass="text-orange-400"
                            />
                            <PaymentCard
                                title="Bank Transfer"
                                amount={analytics.paymentBreakdown.BANK_TRANSFER}
                                icon={<FaMoneyBillWave />}
                                colorClass="text-indigo-400"
                            />
                            <PaymentCard
                                title="Cheque Amount (Pending)"
                                amount={analytics.paymentBreakdown.CHEQUE_PENDING}
                                icon={<FaMoneyBillWave />}
                                colorClass="text-yellow-500"
                            />
                        </div>

                        {/* Total Due Section */}
                        <div className="bg-[#1a1f24] p-8 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-red-500/50 transition-all">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 blur-[100px] group-hover:bg-red-500/10 transition-colors"></div>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                <div>
                                    <p className="text-red-500 font-black uppercase tracking-[0.2em] text-xs mb-3">Total Due</p>
                                    <h2 className="text-6xl font-black text-white tracking-tighter">
                                        {formatCurrency(analytics.totalDue)}
                                    </h2>
                                    <p className="text-gray-500 mt-2 font-medium tracking-wide">Outstanding payments to be collected from candidates</p>
                                </div>
                                <div className="p-8 bg-red-500/10 rounded-3xl text-red-500 group-hover:scale-110 transition-transform">
                                    <FaMoneyBillWave size={56} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default FinancialAnalysis;
