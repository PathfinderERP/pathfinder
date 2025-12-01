import React, { useState, useEffect } from "react";
import { FaSearch, FaUserPlus, FaFilter, FaDownload, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const HRContent = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("All Employees");
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mock data for demonstration
    const mockEmployees = [
        {
            employeeId: "EMP-001",
            name: "Dr. Ashok Kumar",
            department: "Faculty",
            center: "Siliguri",
            role: "Physics Faculty",
            experience: "12 years",
            performance: "Excellent"
        },
        {
            employeeId: "EMP-002",
            name: "Priya Chatterjee",
            department: "Management",
            center: "Salt Lake",
            role: "Center Manager",
            experience: "8 years",
            performance: "Excellent"
        },
        {
            employeeId: "EMP-003",
            name: "Rohit Sharma",
            department: "Admissions",
            center: "Durgapur",
            role: "Sr. Counselor",
            experience: "5 years",
            performance: "Good"
        }
    ];

    useEffect(() => {
        // Simulate loading
        setEmployees(mockEmployees);
    }, []);

    const tabs = ["All Employees", "Attendance & Payroll", "Recruitment", "Performance"];
    const quickActions = ["View Employee Profile", "Attendance & Payroll", "Recruitment Pipeline", "Performance Appraisal"];

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">HR & Manpower Management</h2>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800">
                        <FaDownload /> Reports
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400">
                        <FaUserPlus /> Add Employee
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-6">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {quickActions.map((action, index) => (
                    <button
                        key={index}
                        className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium"
                    >
                        {action}
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                {/* Total Employees */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Employees</h3>
                    <p className="text-4xl font-bold text-white mb-2">284</p>
                    <p className="text-gray-500 text-xs">158 Faculty · 126 Staff</p>
                </div>

                {/* Today's Attendance */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-green-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Today's Attendance</h3>
                    <p className="text-4xl font-bold text-white mb-2">96.5%</p>
                    <p className="text-cyan-400 text-xs font-semibold">274/284 present</p>
                </div>

                {/* Monthly Payroll */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-orange-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Monthly Payroll</h3>
                    <p className="text-4xl font-bold text-white mb-2">₹42.6L</p>
                    <p className="text-gray-500 text-xs">Processing for Nov 2025</p>
                </div>

                {/* Open Positions */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-red-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Open Positions</h3>
                    <p className="text-4xl font-bold text-white mb-2">12</p>
                    <p className="text-gray-500 text-xs">7 Faculty · 5 Staff</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <select className="bg-[#131619] text-gray-300 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none">
                        <option>All Departments</option>
                        <option>Faculty</option>
                        <option>Management</option>
                        <option>Admissions</option>
                        <option>Operations</option>
                    </select>
                    <select className="bg-[#131619] text-gray-300 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none">
                        <option>All Centers</option>
                        <option>Siliguri</option>
                        <option>Salt Lake</option>
                        <option>Durgapur</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#131619] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800">
                        <FaDownload /> Export
                    </button>
                </div>
            </div>

            {/* Employees Table */}
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-xl font-bold text-white">Employee Directory</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                <th className="p-4 font-medium">Employee ID</th>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Department</th>
                                <th className="p-4 font-medium">Center</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">Experience</th>
                                <th className="p-4 font-medium">Performance</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        No employees found.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((employee, index) => (
                                    <tr key={index} className="hover:bg-[#252b32] transition-colors group">
                                        <td className="p-4 text-cyan-400 font-medium">{employee.employeeId}</td>
                                        <td className="p-4 text-white font-medium">{employee.name}</td>
                                        <td className="p-4 text-gray-300">{employee.department}</td>
                                        <td className="p-4 text-gray-300">{employee.center}</td>
                                        <td className="p-4 text-gray-300">{employee.role}</td>
                                        <td className="p-4 text-gray-300">{employee.experience}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${employee.performance === "Excellent"
                                                    ? "bg-cyan-500/10 text-cyan-400"
                                                    : "bg-green-500/10 text-green-400"
                                                }`}>
                                                {employee.performance}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button className="px-3 py-1 bg-[#252b32] text-gray-300 rounded hover:bg-gray-700 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                <FaEye /> View
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
