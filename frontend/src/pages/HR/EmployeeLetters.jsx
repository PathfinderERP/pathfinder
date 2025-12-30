import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import {
    FaFileContract, FaHandshake, FaBriefcase, FaUserTag,
    FaArrowLeft, FaFileAlt, FaCertificate, FaAward, FaIdCard
} from "react-icons/fa";

const EmployeeLetters = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Define available letter types with enhanced metadata
    const letterOptions = [
        {
            title: "Offer Letter",
            description: "Official employment offer",
            url: "offer-letter",
            icon: FaHandshake,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "group-hover:border-emerald-500/50"
        },
        {
            title: "Appointment Letter",
            description: "Confirmation of role",
            url: "appointment-letter",
            icon: FaBriefcase,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "group-hover:border-blue-500/50"
        },
        {
            title: "Contract Letter",
            description: "Terms of service agreement",
            url: "contract-letter",
            icon: FaFileContract,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "group-hover:border-purple-500/50"
        },
        // {
        //     title: "Increment Letter",
        //     description: "Salary revision document",
        //     url: "increment-letter",
        //     icon: FaCertificate,
        //     color: "text-amber-500",
        //     bg: "bg-amber-500/10",
        //     border: "group-hover:border-amber-500/50"
        // },
        // {
        //     title: "Appraisal Letter",
        //     description: "Performance review",
        //     url: "appraisal-letter",
        //     icon: FaAward,
        //     color: "text-rose-500",
        //     bg: "bg-rose-500/10",
        //     border: "group-hover:border-rose-500/50"
        // },
        {
            title: "Experience Letter",
            description: "Proof of work history",
            url: "experience-letter",
            icon: FaFileAlt,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "group-hover:border-indigo-500/50"
        },
        {
            title: "Relieving Letter",
            description: "Exit documentation",
            url: "relieving-letter",
            icon: FaUserTag,
            color: "text-red-500",
            bg: "bg-red-500/10",
            border: "group-hover:border-red-500/50"
        },
        {
            title: "Virtual ID Card",
            description: "Digital Identity Card",
            url: "virtual-id",
            icon: FaIdCard,
            color: "text-teal-500",
            bg: "bg-teal-500/10",
            border: "group-hover:border-teal-500/50"
        },
    ];

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-[80vh] flex flex-col animate-fade-in">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <button
                            onClick={() => navigate("/hr/employee/list")}
                            className="flex items-center gap-2 text-gray-500 hover:text-cyan-500 transition-colors mb-4 text-[10px] font-black uppercase tracking-widest"
                        >
                            <FaArrowLeft /> Back to List
                        </button>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            Employee <span className="text-cyan-500">Documents</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-bold mt-2 max-w-2xl">
                            Generate and manage official correspondence and legal documents for this employee.
                        </p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {letterOptions.map((option, index) => (
                        <div
                            key={index}
                            onClick={() => navigate(`/hr/employee/letters/${id}/${option.url}`)}
                            className={`group bg-[#131619] border border-gray-800 p-8 rounded-3xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10 ${option.border}`}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={`p-4 rounded-2xl ${option.bg} ${option.color} transition-transform group-hover:scale-110 duration-500`}>
                                    <option.icon size={28} />
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                                    <FaFileAlt size={14} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-gray-200 group-hover:text-white mb-2 uppercase tracking-tight">
                                    {option.title}
                                </h3>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest group-hover:text-gray-400">
                                    {option.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default EmployeeLetters;
