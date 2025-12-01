import React, { useState, useEffect } from "react";
import { FaSearch, FaPlus, FaFilter, FaDownload, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const AcademicsContent = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("Batches");
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mock data for demonstration
    const mockBatches = [
        {
            batchName: "JEE-24-A",
            course: "JEE Main/Advanced",
            center: "Siliguri",
            strength: "45/60",
            faculty: "Dr. A. Kumar",
            attendance: "92%",
            syllabus: "78%",
            avgPerformance: "88%"
        },
        {
            batchName: "NEET-24-B",
            course: "NEET",
            center: "Salt Lake",
            strength: "38/40",
            faculty: "Dr. S. Ghosh",
            attendance: "95%",
            syllabus: "82%",
            avgPerformance: "91%"
        },
        {
            batchName: "WBJEE-24-C",
            course: "WBJEE",
            center: "Durgapur",
            strength: "42/45",
            faculty: "Prof. R. Das",
            attendance: "88%",
            syllabus: "75%",
            avgPerformance: "85%"
        }
    ];

    useEffect(() => {
        // Simulate loading
        setBatches(mockBatches);
    }, []);

    const tabs = ["Batches", "Curriculum", "Attendance", "Exams & Tests", "Faculty"];
    const quickActions = ["Curriculum Builder", "Test Management", "Attendance Detail", "View Sample Batch"];

    // Course performance data
    const coursePerformance = [
        {
            name: "JEE Main/Advanced",
            students: 1247,
            batches: 24,
            performance: 92,
            target: 95,
            status: "⚠ Needs Attention"
        },
        {
            name: "NEET",
            students: 1089,
            batches: 22,
            performance: 88,
            target: 90,
            status: "⚠ Needs Attention"
        },
        {
            name: "WBJEE",
            students: 867,
            batches: 18,
            performance: 85,
            target: 88,
            status: "⚠ Needs Attention"
        },
        {
            name: "Class 11-12 Boards",
            students: 1534,
            batches: 32,
            performance: 91,
            target: 93,
            status: "⚠ Needs Attention"
        },
        {
            name: "Class 9-10 Foundation",
            students: 2156,
            batches: 45,
            performance: 87,
            target: 90,
            status: "⚠ Needs Attention"
        },
        {
            name: "Olympiad",
            students: 678,
            batches: 15,
            performance: 89,
            target: 92,
            status: "⚠ Needs Attention"
        }
    ];

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Academics & Education Delivery</h2>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800">
                        <FaDownload /> Reports
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400">
                        <FaPlus /> New Batch
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

            {/* Course Performance Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {coursePerformance.map((course, index) => (
                    <div key={index} className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                        <h3 className="text-gray-400 text-sm font-medium mb-2">{course.name}</h3>
                        <p className="text-4xl font-bold text-white mb-2">{course.students}</p>
                        <p className="text-gray-500 text-xs mb-3">{course.batches} Active Batches</p>
                        <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Performance: {course.performance}% (Target: {course.target}%)</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-cyan-500 h-2 rounded-full transition-all"
                                    style={{ width: `${(course.performance / course.target) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-red-400 text-xs font-semibold mt-3">
                            <span>{course.status}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search batches..."
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <select className="bg-[#131619] text-gray-300 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none">
                        <option>All Courses</option>
                        <option>JEE Main/Advanced</option>
                        <option>NEET</option>
                        <option>WBJEE</option>
                        <option>Boards</option>
                        <option>Foundation</option>
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

            {/* Batches Table */}
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-xl font-bold text-white">Active Batches</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                <th className="p-4 font-medium">Batch Name</th>
                                <th className="p-4 font-medium">Course</th>
                                <th className="p-4 font-medium">Center</th>
                                <th className="p-4 font-medium">Strength</th>
                                <th className="p-4 font-medium">Faculty</th>
                                <th className="p-4 font-medium">Attendance %</th>
                                <th className="p-4 font-medium">Syllabus %</th>
                                <th className="p-4 font-medium">Avg Performance</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {batches.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-gray-500">
                                        No batches found.
                                    </td>
                                </tr>
                            ) : (
                                batches.map((batch, index) => (
                                    <tr key={index} className="hover:bg-[#252b32] transition-colors group">
                                        <td className="p-4 text-cyan-400 font-medium">{batch.batchName}</td>
                                        <td className="p-4 text-white font-medium">{batch.course}</td>
                                        <td className="p-4 text-gray-300">{batch.center}</td>
                                        <td className="p-4 text-gray-300">{batch.strength}</td>
                                        <td className="p-4 text-gray-300">{batch.faculty}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${parseInt(batch.attendance) >= 90
                                                    ? "bg-cyan-500/10 text-cyan-400"
                                                    : "bg-orange-500/10 text-orange-400"
                                                }`}>
                                                {batch.attendance}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">{batch.syllabus}</td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs font-bold">
                                                {batch.avgPerformance}
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

export default AcademicsContent;
