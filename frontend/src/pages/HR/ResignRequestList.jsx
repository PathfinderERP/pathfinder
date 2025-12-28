import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaUserMinus, FaCheck, FaTimes, FaPlus, FaTrash, FaSearch,
    FaCalendarAlt, FaMoneyBillWave, FaEdit
} from "react-icons/fa";
import { toast } from "react-toastify";
import { format } from "date-fns";

const ResignationList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingRequest, setEditingRequest] = useState(null); // For modal

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id, payload) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/update/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success("Request updated");
                fetchRequests();
                setEditingRequest(null);
            } else {
                toast.error("Failed to update");
            }
        } catch (error) {
            console.error("Update error:", error);
            toast.error("Network error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this request?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Deleted successfully");
                fetchRequests();
            }
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const filteredRequests = requests.filter(req =>
        req.employeeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employeeId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
                <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            All Resign <span className="text-cyan-500">Requests</span>
                        </h1>
                    </div>
                    <div className="relative w-full xl:w-96">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="SEARCH NAME / ID..."
                            className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-xs text-white font-bold uppercase tracking-widest outline-none focus:border-cyan-500/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="p-6">Employee</th>
                                <th className="p-6">Department</th>
                                <th className="p-6">Reason</th>
                                <th className="p-6">Last Work Date</th>
                                <th className="p-6">FNF Amount</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan="7" className="p-20 text-center"><div className="animate-spin h-8 w-8 border-t-2 border-cyan-500 rounded-full mx-auto" /></td></tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr><td colSpan="7" className="p-20 text-center text-gray-600 font-black uppercase italic tracking-widest text-sm">No requests found</td></tr>
                            ) : filteredRequests.map((req, i) => (
                                <tr key={req._id} className="hover:bg-cyan-500/[0.02] transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 shadow-lg overflow-hidden bg-gray-900 flex-shrink-0">
                                                {req.employeeId?.profileImage && !req.employeeId.profileImage.startsWith('undefined/') ? (
                                                    <img src={req.employeeId.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-cyan-500 font-black text-lg">
                                                        {req.employeeId?.name?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-white font-black uppercase text-xs tracking-tight">{req.employeeId?.name}</p>
                                                <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest leading-none mt-1">{req.employeeId?.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {req.employeeId?.department?.departmentName || 'N/A'}
                                    </td>
                                    <td className="p-6">
                                        <p className="text-[10px] text-gray-500 line-clamp-2 max-w-[200px] leading-relaxed italic">{req.reason}</p>
                                    </td>
                                    <td className="p-6">
                                        {req.lastDateOfWork ? (
                                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                                                {format(new Date(req.lastDateOfWork), 'do MMM yyyy')}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => setEditingRequest(req)}
                                                className="bg-cyan-600/10 text-cyan-500 hover:bg-cyan-600 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Add +
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        {req.fnfAmount > 0 ? (
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">₹{req.fnfAmount}</span>
                                        ) : (
                                            <button
                                                onClick={() => setEditingRequest(req)}
                                                className="bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Add +
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        <span className={`
                                            px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em]
                                            ${req.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : ''}
                                            ${req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                                            ${req.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : ''}
                                        `}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            {req.status === 'Pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdate(req._id, { status: 'Approved' })}
                                                        className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all"
                                                        title="Approve"
                                                    >
                                                        <FaCheck size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdate(req._id, { status: 'Rejected' })}
                                                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                                        title="Reject"
                                                    >
                                                        <FaTimes size={12} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setEditingRequest(req)}
                                                className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:text-cyan-500 flex items-center justify-center transition-all"
                                                title="Edit Details"
                                            >
                                                <FaEdit size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(req._id)}
                                                className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all"
                                                title="Delete"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Edit Modal (Premium Glassmorphism) */}
                {editingRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-md bg-[#131619] border border-gray-800 rounded-[2.5rem] p-10 shadow-3xl">
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8">Update <span className="text-cyan-500">Details</span></h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Last Date of Work</label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500" />
                                        <input
                                            type="date"
                                            className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-xs text-white font-bold outline-none focus:border-cyan-500/50"
                                            defaultValue={editingRequest.lastDateOfWork ? editingRequest.lastDateOfWork.split('T')[0] : ''}
                                            id="lastDateInput"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">FNF Final Amount (₹)</label>
                                    <div className="relative">
                                        <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                                        <input
                                            type="number"
                                            placeholder="Enter amount..."
                                            className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-xs text-white font-bold outline-none focus:border-cyan-500/50"
                                            defaultValue={editingRequest.fnfAmount}
                                            id="fnfInput"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">HR Remarks</label>
                                    <textarea
                                        placeholder="Add private remarks..."
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-4 px-6 text-xs text-white font-bold outline-none focus:border-cyan-500/50 min-h-[100px]"
                                        defaultValue={editingRequest.remarks}
                                        id="remarksInput"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={() => setEditingRequest(null)}
                                    className="flex-1 py-4 bg-gray-800 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const lastDateOfWork = document.getElementById('lastDateInput').value;
                                        const fnfAmount = document.getElementById('fnfInput').value;
                                        const remarks = document.getElementById('remarksInput').value;
                                        handleUpdate(editingRequest._id, { lastDateOfWork, fnfAmount, remarks });
                                    }}
                                    className="flex-1 py-4 bg-cyan-500 text-[#1a1f24] font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-cyan-600 transition-all shadow-xl shadow-cyan-500/20"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ResignationList;
