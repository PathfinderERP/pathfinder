import React from "react";
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaSchool, FaMapMarkerAlt, FaBook, FaInfoCircle, FaBullseye, FaTrash, FaEdit, FaCommentAlt } from "react-icons/fa";

const LeadDetailsModal = ({ lead, onClose, onEdit, onDelete, onFollowUp, onCounseling, onShowHistory, canEdit, canDelete }) => {
    if (!lead) return null;

    const getLeadTypeColor = (type) => {
        switch (type) {
            case "HOT LEAD": return "text-red-400 border-red-500/50 bg-red-500/10";
            case "COLD LEAD": return "text-blue-400 border-blue-500/50 bg-blue-500/10";
            case "NEGATIVE": return "text-gray-400 border-gray-500/50 bg-gray-500/10";
            default: return "text-gray-400 border-gray-500/50 bg-gray-500/10";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#1a1f24] w-full max-w-2xl rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden transform transition-all hover:shadow-[0_0_50px_rgba(6,182,212,0.3)] hover:border-cyan-500/50"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[#131619] px-8 py-6 border-b border-gray-800 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500"></div>
                    <div className="flex items-center gap-4 z-10">
                        <div className="w-16 h-16 rounded-full bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center text-2xl font-bold text-cyan-400">
                            {lead.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{lead.name}</h2>
                            <p className="text-gray-400 text-sm flex items-center gap-2">
                                <FaEnvelope size={12} /> {lead.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-full"
                    >
                        <FaTimes size={20} />
                    </button>

                    {/* Background decoration */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                {/* Content */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Personal Info */}
                    <div className="space-y-4">
                        <h3 className="text-cyan-400 text-sm font-bold uppercase tracking-wider mb-2 border-b border-gray-800 pb-2">Personal Details</h3>

                        <div className="flex items-center gap-3 text-gray-300 group">
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-cyan-400 transition-colors">
                                <FaPhone size={14} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Phone Number</p>
                                <p className="font-medium">{lead.phoneNumber || "N/A"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-300 group">
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-cyan-400 transition-colors">
                                <FaSchool size={14} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">School Name</p>
                                <p className="font-medium">{lead.schoolName || "N/A"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-300 group">
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-cyan-400 transition-colors">
                                <FaBook size={14} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Class</p>
                                <p className="font-medium">{lead.className?.name || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Academic Info */}
                    <div className="space-y-4">
                        <h3 className="text-cyan-400 text-sm font-bold uppercase tracking-wider mb-2 border-b border-gray-800 pb-2">Academic & System</h3>

                        <div className="flex items-center gap-3 text-gray-300 group">
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-cyan-400 transition-colors">
                                <FaMapMarkerAlt size={14} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Centre</p>
                                <p className="font-medium">{lead.centre?.centreName || "N/A"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-300 group">
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-cyan-400 transition-colors">
                                <FaBullseye size={14} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Course & Target</p>
                                <p className="font-medium">
                                    {lead.course?.courseName || "N/A"}
                                    {lead.targetExam && <span className="text-gray-500 text-sm"> ({lead.targetExam})</span>}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-300 group">
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-cyan-400 transition-colors">
                                <FaInfoCircle size={14} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Status & Source</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-xs border font-semibold ${getLeadTypeColor(lead.leadType)}`}>
                                        {lead.leadType || "N/A"}
                                    </span>
                                    <span className="text-sm text-gray-400">• {lead.source || "Unknown Source"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Responsibility */}
                <div className="bg-[#131619]/50 px-8 py-4 border-t border-gray-800 flex justify-between items-center text-sm">
                    <p className="text-gray-500">
                        Lead Responsibility: <span className="text-cyan-400 font-medium">{lead.leadResponsibility || "Unassigned"}</span>
                    </p>
                    <p className="text-gray-600 text-xs">
                        ID: {lead._id}
                    </p>
                </div>

                {/* Actions Footer */}
                <div className="bg-[#131619] border-t border-gray-800 p-4">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {/* Left Side Buttons */}
                        <div className="mr-auto flex gap-3">
                            <button
                                onClick={() => onShowHistory(lead)}
                                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors flex items-center gap-2 font-medium border border-gray-600"
                            >
                                <FaCommentAlt size={16} /> Show Follow Ups
                            </button>
                            <button
                                onClick={() => onCounseling(lead)}
                                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors flex items-center gap-2 font-medium shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                            >
                                <FaUser size={16} /> Counseling
                            </button>
                        </div>

                        {/* Right Side Buttons */}
                        {canDelete && (
                            <button
                                onClick={() => onDelete(lead._id)}
                                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors flex items-center gap-2 font-medium"
                            >
                                <FaTrash size={16} /> Delete
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={() => onEdit(lead)}
                                className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors flex items-center gap-2 font-medium"
                            >
                                <FaEdit size={16} /> Edit
                            </button>
                        )}
                        <button
                            onClick={() => onFollowUp(lead)}
                            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        >
                            <FaCommentAlt size={16} /> Add Follow Up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default LeadDetailsModal;

