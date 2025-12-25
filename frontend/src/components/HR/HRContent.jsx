import React, { useState, useEffect } from "react";
import { FaSearch, FaUserPlus, FaFilter, FaDownload, FaEye, FaUsers, FaCalendarCheck, FaMoneyBillWave, FaBriefcase } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const HRContent = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("All Employees");
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        attendance: "96.5%", // Mocked for now until attendance is implemented
        payroll: "₹0",
        openPositions: 0
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee?limit=5`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setEmployees(data.employees || []);
                setStats(prev => ({
                    ...prev,
                    totalEmployees: data.totalEmployees || 0,
                    // Payroll calculation: sum of currentSalary of all employees (from this page, though usually a separate API)
                    payroll: "₹" + (data.employees?.reduce((sum, emp) => sum + (emp.currentSalary || 0), 0) / 100000).toFixed(1) + "L"
                }));
            }
        } catch (error) {
            console.error("Error fetching HR dashboard data:", error);
            toast.error("Failed to load HR dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const tabs = ["All Employees", "Attendance & Payroll", "Recruitment", "Performance"];

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">HR & Manpower Dashboard</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate("/hr/employee/list")}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800"
                    >
                        <FaUsers /> Employee List
                    </button>
                    <button
                        onClick={() => navigate("/hr/employee/add")}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transitions-colors"
                    >
                        <FaUserPlus /> Add Employee
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Employees */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-medium">Total Employees</h3>
                        <FaUsers className="text-cyan-500" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-2">{stats.totalEmployees}</p>
                    <p className="text-gray-500 text-xs">Active workforce</p>
                </div>

                {/* Today's Attendance */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-green-500 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-medium">Today's Attendance</h3>
                        <FaCalendarCheck className="text-green-500" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-2">{stats.attendance}</p>
                    <p className="text-cyan-400 text-xs font-semibold">Real-time sync</p>
                </div>

                {/* Monthly Payroll */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-orange-500 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-medium">Monthly Payroll</h3>
                        <FaMoneyBillWave className="text-orange-500" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-2">{stats.payroll}</p>
                    <p className="text-gray-500 text-xs">Estimated based on active</p>
                </div>

                {/* Open Positions */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-red-500 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-gray-400 text-sm font-medium">Open Positions</h3>
                        <FaBriefcase className="text-red-500" />
                    </div>
                    <p className="text-4xl font-bold text-white mb-2">{stats.openPositions}</p>
                    <p className="text-gray-500 text-xs">Awaiting recruitment</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-6 overflow-x-auto">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab
                            ? "text-cyan-400 border-b-2 border-cyan-400"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Quick Filter Area */}
            {activeTab === "All Employees" && (
                <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Recently Added Employees</h3>
                        <button
                            onClick={() => navigate("/hr/employee/list")}
                            className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold"
                        >
                            View All Employees
                        </button>
                    </div>
                </div>
            )}

            {/* Employees Table */}
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                <th className="p-4 font-semibold">Employee ID</th>
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Department</th>
                                <th className="p-4 font-semibold">Center</th>
                                <th className="p-4 font-semibold">Designation</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500 italic">
                                            <FaUsers size={48} className="mb-2 opacity-20" />
                                            No employees found in the system.
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                employees.map((employee, index) => (
                                    <tr key={index} className="hover:bg-[#1f252b] transition-colors group">
                                        <td className="p-4 text-cyan-400 font-mono text-sm">{employee.employeeId}</td>
                                        <td className="p-4 text-white font-medium">{employee.name}</td>
                                        <td className="p-4 text-gray-300">{employee.department?.departmentName || "N/A"}</td>
                                        <td className="p-4 text-gray-300">{employee.primaryCentre?.centreName || "N/A"}</td>
                                        <td className="p-4 text-gray-400 text-sm">{employee.designation?.name || "N/A"}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${employee.status === "Active" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                                    employee.status === "Inactive" ? "bg-gray-500/10 text-gray-400 border border-gray-500/20" :
                                                        "bg-red-500/10 text-red-400 border border-red-500/20"
                                                }`}>
                                                {employee.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => navigate(`/hr/employee/view/${employee._id}`)}
                                                className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-lg transition-all"
                                                title="View Details"
                                            >
                                                <FaEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HRContent;
