import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaUserTimes, FaBuilding, FaSearch, FaEye, FaCalendarAlt, FaPaperPlane, FaFilePdf, FaImage, FaCheck, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import usePermission from "../../hooks/usePermission";

const PoshDashboard = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewModal, setViewModal] = useState({ open: false, complaint: null });
    const [response, setResponse] = useState("");
    const [updating, setUpdating] = useState(false);

    // Permissions (using existing HR permissions or defaults)
    const canManage = true;

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/posh/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setComplaints(data);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (status, close = false) => {
        if (!viewModal.complaint) return;
        setUpdating(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/hr/posh/${viewModal.complaint._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status, hrResponse: response })
            });

            if (res.ok) {
                toast.success(`Complaint status updated to ${status}`);
                fetchComplaints();
                if (close) setViewModal({ open: false, complaint: null });
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating:", error);
            toast.error("Update failed");
        } finally {
            setUpdating(false);
        }
    };

    const openViewModal = (comp) => {
        setViewModal({ open: true, complaint: comp });
        setResponse(comp.hrResponse || "");
    };

    const filteredComplaints = complaints.filter(c =>
        c.complainant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.accused?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case "Resolved": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            case "Dismissed": return "text-red-500 bg-red-500/10 border-red-500/20";
            case "Under Review": return "text-cyan-500 bg-cyan-500/10 border-cyan-500/20";
            default: return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-4 md:p-10 max-w-[1400px] mx-auto min-h-screen pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            POSH <span className="text-red-500">Dashboard</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">
                            Manage & Resolve Sexual Harassment Complaints
                        </p>
                    </div>
                    <div className="relative group w-full md:w-96">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH NAMES..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-wider outline-none focus:border-red-500/50 transition-all shadow-inner"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin h-12 w-12 border-t-2 border-red-500 rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        <th className="p-6">Complainant</th>
                                        <th className="p-6">Accused Employee</th>
                                        <th className="p-6">Incident Details</th>
                                        <th className="p-6">Status</th>
                                        <th className="p-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {filteredComplaints.map((comp) => (
                                        <tr key={comp._id} className="hover:bg-red-500/[0.02] transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={comp.complainant?.profileImage || "https://ui-avatars.com/api/?name=" + comp.complainant?.name}
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
                                                        alt=""
                                                    />
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{comp.complainant?.name}</div>
                                                        <div className="text-[10px] text-gray-500 font-black uppercase">{comp.complainant?.employeeId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={comp.accused?.profileImage || "https://ui-avatars.com/api/?name=" + comp.accused?.name}
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-red-500/30"
                                                        alt=""
                                                    />
                                                    <div>
                                                        <div className="font-bold text-gray-200 text-sm">{comp.accused?.name}</div>
                                                        <div className="text-[10px] text-red-400 font-black uppercase">{comp.accused?.employeeId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                                        <FaBuilding /> {comp.centre?.centreName || "Centre"}
                                                    </div>
                                                    <div className="text-gray-400 text-xs italic line-clamp-1 max-w-[200px]" title={comp.complaintDetails}>
                                                        "{comp.complaintDetails}"
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[9px] text-gray-600 font-mono">
                                                        <FaCalendarAlt /> {new Date(comp.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(comp.status)}`}>
                                                    {comp.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => openViewModal(comp)}
                                                    className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all"
                                                >
                                                    <FaEye />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredComplaints.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                                No complaints found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {filteredComplaints.map((comp) => (
                                <div key={comp._id} className="bg-[#131619] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                                    <div className="absolute top-0 right-0 p-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(comp.status)}`}>
                                            {comp.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 mb-6 mt-2">
                                        <img
                                            src={comp.accused?.profileImage || "https://ui-avatars.com/api/?name=" + comp.accused?.name}
                                            className="w-14 h-14 rounded-2xl object-cover border-2 border-red-500/30"
                                            alt=""
                                        />
                                        <div>
                                            <span className="text-[10px] text-red-500 font-black uppercase tracking-widest block mb-1">ACCUSED</span>
                                            <h3 className="text-white font-black text-lg leading-none">{comp.accused?.name}</h3>
                                            <p className="text-gray-500 text-[10px] mt-1 font-bold">{comp.accused?.employeeId}</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 p-4 rounded-xl border border-gray-800/50 mb-6 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <img src={comp.complainant?.profileImage} className="w-6 h-6 rounded-full" />
                                                <span className="text-xs text-gray-300 font-bold">{comp.complainant?.name}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-black uppercase">Reporter</span>
                                        </div>
                                        <div className="h-px bg-gray-800/50"></div>
                                        <p className="text-xs text-gray-400 italic line-clamp-2">"{comp.complaintDetails}"</p>
                                    </div>

                                    <button
                                        onClick={() => openViewModal(comp)}
                                        className="w-full py-4 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white font-bold uppercase text-xs tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <FaEye /> View Case Details
                                    </button>
                                </div>
                            ))}
                            {filteredComplaints.length === 0 && (
                                <div className="text-center p-10 text-gray-500 font-bold text-xs uppercase tracking-widest">
                                    No complaints found
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* View/Action Modal */}
                {viewModal.open && viewModal.complaint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[#131619] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border border-gray-800">
                            <div className="p-8 md:p-10">
                                <div className="flex justify-between items-start mb-8">
                                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                        Case <span className="text-red-500">Details</span>
                                    </h2>
                                    <button
                                        onClick={() => setViewModal({ open: false, complaint: null })}
                                        className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-all"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 block">Accused Employee</span>
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={viewModal.complaint.accused?.profileImage || "https://ui-avatars.com/api/?name=" + viewModal.complaint.accused?.name}
                                                className="w-16 h-16 rounded-2xl object-cover"
                                                alt=""
                                            />
                                            <div>
                                                <h3 className="text-white font-bold text-lg">{viewModal.complaint.accused?.name}</h3>
                                                <p className="text-gray-500 text-xs font-black uppercase">{viewModal.complaint.accused?.employeeId}</p>
                                                <p className="text-gray-400 text-xs">{viewModal.complaint.designation?.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4 block">Complainant</span>
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={viewModal.complaint.complainant?.profileImage || "https://ui-avatars.com/api/?name=" + viewModal.complaint.complainant?.name}
                                                className="w-16 h-16 rounded-2xl object-cover"
                                                alt=""
                                            />
                                            <div>
                                                <h3 className="text-white font-bold text-lg">{viewModal.complaint.complainant?.name}</h3>
                                                <p className="text-gray-500 text-xs font-black uppercase">{viewModal.complaint.complainant?.employeeId}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 mb-8">
                                    <div>
                                        <h4 className="text-lg font-bold text-white mb-2">Detailed Description</h4>
                                        <div className="p-6 bg-black/40 border border-gray-800 rounded-2xl text-gray-300 text-sm leading-relaxed">
                                            {viewModal.complaint.complaintDetails}
                                        </div>
                                    </div>

                                    {viewModal.complaint.documents && viewModal.complaint.documents.length > 0 && (
                                        <div>
                                            <h4 className="text-lg font-bold text-white mb-2">Submitted Evidence</h4>
                                            <div className="flex gap-4 flex-wrap">
                                                {viewModal.complaint.documents.map((url, i) => (
                                                    <a
                                                        key={i}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors border border-gray-700"
                                                    >
                                                        {url.includes('.pdf') ? <FaFilePdf className="text-red-400" /> : <FaImage className="text-blue-400" />}
                                                        <span className="text-xs font-bold text-gray-300">View Evidence {i + 1}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                                    <h4 className="text-lg font-bold text-white mb-4">HR Resolution & Action</h4>
                                    <textarea
                                        value={response}
                                        onChange={(e) => setResponse(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white text-sm min-h-[100px] mb-4 outline-none focus:border-cyan-500"
                                        placeholder="Enter remarks, investigation notes, or final resolution..."
                                    />
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleUpdateStatus("Under Review")}
                                            disabled={updating}
                                            className="px-6 py-3 bg-cyan-500/10 text-cyan-500 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-cyan-500 hover:text-black transition-all"
                                        >
                                            Mark Under Review
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus("Resolved", true)}
                                            disabled={updating}
                                            className="px-6 py-3 bg-emerald-500/10 text-emerald-500 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                                        >
                                            <FaCheck className="inline mr-2" /> Resolve Case
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus("Dismissed", true)}
                                            disabled={updating}
                                            className="px-6 py-3 bg-red-500/10 text-red-500 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <FaTimes className="inline mr-2" /> Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PoshDashboard;
