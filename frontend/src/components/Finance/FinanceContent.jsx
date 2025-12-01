import React, { useState, useEffect } from "react";
// Duplicate import removed
import { FaSearch, FaFileInvoice, FaFilter, FaPlus, FaBell, FaExclamationTriangle, FaClock, FaCheckCircle, FaSyncAlt } from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SMSTestPanel from './SMSTestPanel';
import StudentFeeList from './StudentFeeList';

const FinanceContent = () => {
    const [activeTab, setActiveTab] = useState("Overview");
    const [overduePayments, setOverduePayments] = useState([]);
    const [allStudentFees, setAllStudentFees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingReminders, setSendingReminders] = useState(false);
    const [sendingAllReminders, setSendingAllReminders] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    // Fetch overdue payments
    const fetchOverduePayments = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/payment-reminder/overdue`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOverduePayments(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching overdue payments:", error);
        }
    };

    // Fetch all student fee details
    const fetchAllStudentFees = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/payment-reminder/student-fees`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAllStudentFees(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching student fees:", error);
        }
    };

    // Refresh all data
    const handleRefresh = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchOverduePayments(),
                fetchAllStudentFees()
            ]);
            toast.success("Data refreshed successfully!");
        } catch (error) {
            toast.error("Failed to refresh data");
        } finally {
            setLoading(false);
        }
    };

    // Send payment reminders (only overdue)
    const sendReminders = async () => {
        setSendingReminders(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/payment-reminder/send-reminders`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Reminders sent to ${data.data.remindersSent} students`);
                fetchOverduePayments();
            } else {
                toast.error("Failed to send reminders");
            }
        } catch (error) {
            console.error("Error sending reminders:", error);
            toast.error("Error sending reminders");
        } finally {
            setSendingReminders(false);
        }
    };

    // Send reminders to ALL pending payments
    const sendAllReminders = async () => {
        if (!window.confirm("This will send reminders to ALL students with pending payments. Continue?")) {
            return;
        }

        setSendingAllReminders(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/payment-reminder/send-all-reminders`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Test reminders sent to ${data.data.remindersSent} students`);
                fetchOverduePayments();
            } else {
                toast.error("Failed to send test reminders");
            }
        } catch (error) {
            console.error("Error sending test reminders:", error);
            toast.error("Error sending test reminders");
        } finally {
            setSendingAllReminders(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchOverduePayments(),
            fetchAllStudentFees()
        ]).finally(() => setLoading(false));
    }, []);
    const tabs = ["Overview", "Student Fees", "Outstanding Dues", "Reports"];

    // Calculate comprehensive statistics
    const totalOutstanding = allStudentFees.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);
    const totalPaid = allStudentFees.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
    const totalInvestment = allStudentFees.reduce((sum, s) => sum + (s.totalFees || 0), 0);
    const totalStudentsWithDues = allStudentFees.filter(s => (s.remainingAmount || 0) > 0).length;
    const criticalOverdue = overduePayments.filter(p => p.daysOverdue > 7).length;
    const todayDue = overduePayments.filter(p => p.daysOverdue === 0).length;
    const collectionRate = totalPaid + totalOutstanding > 0
        ? ((totalPaid / (totalPaid + totalOutstanding)) * 100).toFixed(1)
        : 0;

    const getStatusBadge = (daysOverdue) => {
        if (daysOverdue === 0) {
            return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold flex items-center gap-1">
                <FaClock /> Due Today
            </span>;
        } else if (daysOverdue < 0) {
            return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold flex items-center gap-1">
                <FaClock /> Due in {Math.abs(daysOverdue)} Days
            </span>;
        } else if (daysOverdue <= 3) {
            return <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold flex items-center gap-1">
                <FaExclamationTriangle /> {daysOverdue} Days Overdue
            </span>;
        } else {
            return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold flex items-center gap-1">
                <FaExclamationTriangle /> {daysOverdue} Days Overdue
            </span>;
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#131619]">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-white">Finance & Fees</h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 font-semibold text-xs md:text-sm whitespace-nowrap"
                    >
                        <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button
                        onClick={sendReminders}
                        disabled={sendingReminders || overduePayments.length === 0}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs md:text-sm whitespace-nowrap"
                    >
                        <FaBell /> {sendingReminders ? "Sending..." : "Reminders"}
                    </button>
                    <button
                        onClick={sendAllReminders}
                        disabled={sendingAllReminders}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs md:text-sm whitespace-nowrap"
                        title="Send reminders to ALL students"
                    >
                        <FaBell /> {sendingAllReminders ? "Sending..." : "Test All"}
                    </button>
                    <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm">
                        <FaFileInvoice /> Reports
                    </button>
                    <button className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 text-xs md:text-sm whitespace-nowrap">
                        <FaPlus /> Collect Fee
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-800 mb-4 md:mb-6 scrollbar-hide">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
                            ? "text-cyan-400 border-b-2 border-cyan-400"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-8">
                {/* Total Outstanding */}
                <div className="bg-[#1a1f24] p-4 md:p-6 rounded-xl border-l-4 border-red-500 shadow-lg">
                    <h3 className="text-gray-400 text-xs md:text-sm font-medium mb-1 md:mb-2">Total Outstanding</h3>
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
                        ₹{(totalOutstanding / 100000).toFixed(2)}L
                    </p>
                    <p className="text-gray-500 text-xs">{totalStudentsWithDues} students</p>
                </div>

                {/* Critical Overdue */}
                <div className="bg-[#1a1f24] p-4 md:p-6 rounded-xl border-l-4 border-orange-500 shadow-lg">
                    <h3 className="text-gray-400 text-xs md:text-sm font-medium mb-1 md:mb-2">Critical (7+ days)</h3>
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">{criticalOverdue}</p>
                    <p className="text-gray-500 text-xs">Immediate attention</p>
                </div>

                {/* Due Today */}
                <div className="bg-[#1a1f24] p-4 md:p-6 rounded-xl border-l-4 border-yellow-500 shadow-lg">
                    <h3 className="text-gray-400 text-xs md:text-sm font-medium mb-1 md:mb-2">Due Today</h3>
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">{todayDue}</p>
                    <p className="text-gray-500 text-xs">Payments due</p>
                </div>

                {/* Collection Rate */}
                <div className="bg-[#1a1f24] p-4 md:p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                    <h3 className="text-gray-400 text-xs md:text-sm font-medium mb-1 md:mb-2">Collection Rate</h3>
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">{collectionRate}%</p>
                    <p className="text-gray-500 text-xs">₹{(totalPaid / 100000).toFixed(2)}L collected</p>
                </div>

                {/* Total Investment */}
                <div className="bg-[#1a1f24] p-4 md:p-6 rounded-xl border-l-4 border-green-500 shadow-lg">
                    <h3 className="text-gray-400 text-xs md:text-sm font-medium mb-1 md:mb-2">Total Investment</h3>
                    <p className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
                        ₹{(totalInvestment / 100000).toFixed(2)}L
                    </p>
                    <p className="text-gray-500 text-xs">Total fee value</p>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === "Student Fees" && <StudentFeeList />}

            {activeTab === "Outstanding Dues" && (
                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden mb-6">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Outstanding Payments</h3>
                        <button
                            onClick={handleRefresh}
                            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
                        >
                            <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                    <th className="p-4 font-medium">Admission No.</th>
                                    <th className="p-4 font-medium">Student Name</th>
                                    <th className="p-4 font-medium">Course</th>
                                    <th className="p-4 font-medium">Installment</th>
                                    <th className="p-4 font-medium">Due Date</th>
                                    <th className="p-4 font-medium">Amount</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : overduePayments.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <FaCheckCircle className="text-4xl text-green-500" />
                                                <p>No outstanding payments!</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    overduePayments.map((payment, index) => (
                                        <tr key={index} className="hover:bg-[#252b32] transition-colors group">
                                            <td className="p-4 text-cyan-400 font-medium">{payment.admissionNumber}</td>
                                            <td className="p-4 text-white font-medium">{payment.studentName}</td>
                                            <td className="p-4 text-gray-300">{payment.course || "N/A"}</td>
                                            <td className="p-4 text-gray-300">Installment #{payment.installmentNumber}</td>
                                            <td className="p-4 text-gray-300">
                                                {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                                            </td>
                                            <td className="p-4 text-white font-semibold">₹{payment.amount.toLocaleString('en-IN')}</td>
                                            <td className="p-4">
                                                {getStatusBadge(payment.daysOverdue)}
                                            </td>
                                            <td className="p-4 text-gray-300">
                                                <div className="text-xs">
                                                    <div>📞 {payment.phoneNumber}</div>
                                                    <div className="text-gray-500">{payment.email}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "Overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-bold text-white mb-4">Recent Payment Activity</h3>
                        <div className="space-y-3">
                            {overduePayments.slice(0, 5).map((payment, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-[#252b32] rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">{payment.studentName}</p>
                                        <p className="text-xs text-gray-400">Due: {new Date(payment.dueDate).toLocaleDateString('en-IN')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-semibold">₹{payment.amount.toLocaleString('en-IN')}</p>
                                        <p className="text-xs text-red-400">
                                            {payment.daysOverdue > 0 ? `${payment.daysOverdue} days overdue` : payment.daysOverdue === 0 ? 'Due Today' : `Due in ${Math.abs(payment.daysOverdue)} days`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reminder System */}
                    <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-bold text-white mb-4">Reminder System</h3>
                        <SMSTestPanel />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceContent;
