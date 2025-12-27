import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaArrowLeft, FaFileAlt, FaFileContract, FaIdCard, FaHandshake, FaBriefcase, FaSignOutAlt } from "react-icons/fa";

const EmployeeLetters = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    const letterOptions = [
        { title: "Offer Letter", icon: <FaHandshake size={24} />, color: "bg-blue-500", url: "offer-letter" },
        { title: "Appointment Letter", icon: <FaBriefcase size={24} />, color: "bg-green-500", url: "appointment-letter" },
        { title: "Contract Letter", icon: <FaFileContract size={24} />, color: "bg-purple-500", url: "contract-letter" },
        { title: "Experience Letter", icon: <FaFileAlt size={24} />, color: "bg-orange-500", url: "experience-letter" },
        { title: "Release Letter", icon: <FaSignOutAlt size={24} />, color: "bg-red-500", url: "release-letter" },
        { title: "Virtual Id", icon: <FaIdCard size={24} />, color: "bg-indigo-500", url: "virtual-id" }
    ];

    useEffect(() => {
        fetchEmployeeDetails();
    }, [id]);

    const fetchEmployeeDetails = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployee(data);
            }
        } catch (error) {
            console.error("Error fetching employee details:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/hr/employee/list")}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
                    >
                        <FaArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Employee Letters
                        </h1>
                        {loading ? (
                            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Generate and manage letters for <span className="font-bold text-gray-900 dark:text-white">{employee?.name}</span> ({employee?.employeeId})
                            </p>
                        )}
                    </div>
                </div>

                {/* Letters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {letterOptions.map((option, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all cursor-pointer group"
                            onClick={() => {
                                navigate(`/hr/employee/letters/${id}/${option.url}`);
                            }}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${option.color} bg-opacity-90 shadow-lg shadow-gray-200 dark:shadow-none`}>
                                    {option.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {option.title}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Generate and download the {option.title.toLowerCase()} for this employee.
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                    Generate <span className="text-lg">›</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default EmployeeLetters;
