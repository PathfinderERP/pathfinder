import React, { useState, useEffect } from "react";
import { FaCheck, FaTimes, FaSearch, FaEdit, FaTrash, FaCalendarAlt, FaMoneyBillWave, FaCommentDots, FaUserTie, FaBuilding, FaHourglassHalf } from "react-icons/fa";
import Layout from "../../components/Layout";
import { toast } from "react-toastify";
import usePermission from "../../hooks/usePermission";

const ResignRequestList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editModal, setEditModal] = useState({ open: false, request: null });
    const [formData, setFormData] = useState({
        lastWorkDate: "",
        fnfAmount: "",
        remarks: ""
    });

    // Permission checks
    const canApprove = usePermission("hrManpower", "resignations", "approve");
    const canEdit = usePermission("hrManpower", "resignations", "edit");
    const canDelete = usePermission("hrManpower", "resignations", "delete");

    useEffect(() => {
        fetchResignationRequests();
    }, []);

    const fetchResignationRequests = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                setRequests(data);
            } else {
                toast.error(data.message || "Failed to fetch resignation requests");
            }
        } catch (error) {
            console.error("Error fetching requests:", error);
            toast.error("Error fetching requests");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/${id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                toast.success(`Request ${status} successfully`);
                fetchResignationRequests();
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Error updating status");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this content?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Request deleted");
                fetchResignationRequests();
            } else {
                toast.error("Failed to delete request");
            }
        } catch (error) {
            console.error("Error deleting request:", error);
            toast.error("Error deleting request");
        }
    };

    const openEditModal = (request) => {
        setEditModal({ open: true, request });
        setFormData({
            lastWorkDate: request.lastWorkDate ? new Date(request.lastWorkDate).toISOString().split('T')[0] : "",
            fnfAmount: request.fnfAmount || "",
            remarks: request.remarks || ""
        });
    };

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/resignation/${editModal.request._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success("Request updated");
                setEditModal({ open: false, request: null });
                fetchResignationRequests();
            } else {
                toast.error("Failed to update request");
            }
        } catch (error) {
            console.error("Error updating request:", error);
            toast.error("Error updating request");
        }
    };

    const filteredRequests = requests.filter(req =>
        req.employeeId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employeeId?.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case "Approved": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            case "Rejected": return "text-red-500 bg-red-500/10 border-red-500/20";
            default: return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter">
                            Resignation <span className="text-cyan-500">Requests</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                            <FaUserTie className="text-cyan-500" /> Manage Employee Exits & FNF
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group w-full md:w-96">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH EMPLOYEE NAME OR ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 md:py-4 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20">
                        <div className="animate-spin h-12 w-12 border-t-2 border-cyan-500 rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View (Hidden on Mobile) */}
                        <div className="hidden md:block bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
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
                                    {filteredRequests.map((req) => (
                                        <tr key={req._id} className="hover:bg-cyan-500/[0.02] transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700 overflow-hidden flex-shrink-0 group-hover:border-cyan-500/50 transition-colors">
                                                        {req.employeeId?.profileImage ? (
                                                            <img src={req.employeeId.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-cyan-500 font-black">
                                                                {req.employeeId?.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
                                                            {req.employeeId?.name}
                                                        </div>
                                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                                            {req.employeeId?.employeeId}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                                    <FaBuilding className="text-gray-600" />
                                                    {req.employeeId?.department?.departmentName || "N/A"}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-gray-400 text-sm max-w-[200px] truncate" title={req.reason}>
                                                    {req.reason}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-gray-300 font-mono text-sm">
                                                    <FaCalendarAlt className="text-cyan-500/50" />
                                                    {req.lastWorkDate ? new Date(req.lastWorkDate).toLocaleDateString() : "-"}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-emerald-400 font-black tracking-wide text-sm">
                                                    ₹{req.fnfAmount?.toLocaleString() || "0"}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canApprove && req.status === "Pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(req._id, "Approved")}
                                                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition-all"
                                                                title="Approve"
                                                            >
                                                                <FaCheck />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(req._id, "Rejected")}
                                                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                                                                title="Reject"
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => openEditModal(req)}
                                                            className="p-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-500 hover:text-white rounded-lg transition-all"
                                                            title="Edit Details"
                                                        >
                                                            <FaEdit />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(req._id)}
                                                            className="p-2 bg-gray-800 hover:bg-red-500 text-gray-400 hover:text-white rounded-lg transition-all"
                                                            title="Delete"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRequests.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                                No resignation requests found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View (Visible on Mobile) */}
                        <div className="md:hidden grid grid-cols-1 gap-4">
                            {filteredRequests.map((req) => (
                                <div key={req._id} className="bg-[#131619] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                                    <div className="absolute top-0 right-0 p-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-800 border-2 border-gray-700 overflow-hidden flex-shrink-0">
                                            {req.employeeId?.profileImage ? (
                                                <img src={req.employeeId.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-cyan-500 font-black text-xl">
                                                    {req.employeeId?.name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2">
                                            <h3 className="text-white font-black uppercase tracking-tight text-lg leading-none mb-1">{req.employeeId?.name}</h3>
                                            <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest">{req.employeeId?.employeeId}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-black/20 p-3 rounded-xl border border-gray-800/50">
                                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><FaBuilding size={10} /> Dept</div>
                                            <div className="text-xs text-gray-300 font-bold truncate">{req.employeeId?.department?.departmentName || "N/A"}</div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-gray-800/50">
                                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><FaMoneyBillWave size={10} /> FNF</div>
                                            <div className="text-xs text-emerald-400 font-black truncate">₹{req.fnfAmount?.toLocaleString() || "0"}</div>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-gray-800/50 col-span-2">
                                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><FaCommentDots size={10} /> Reason</div>
                                            <div className="text-xs text-gray-300 font-medium italic line-clamp-2">"{req.reason}"</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                                        {canApprove && req.status === "Pending" ? (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(req._id, "Approved")}
                                                    className="flex-1 py-3 bg-emerald-500 text-black font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <FaCheck /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(req._id, "Rejected")}
                                                    className="flex-1 py-3 bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <FaTimes /> Reject
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex-1 text-center py-2 text-gray-500 text-xs font-bold uppercase tracking-widest">
                                                {/* Actions Disabled or Completed */}
                                                Actions Completed
                                            </div>
                                        )}
                                        {canEdit && (
                                            <button
                                                onClick={() => openEditModal(req)}
                                                className="w-12 h-12 flex items-center justify-center bg-gray-800 text-gray-400 rounded-xl hover:text-cyan-500 hover:bg-gray-700 transition-colors"
                                            >
                                                <FaEdit />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(req._id)}
                                                className="w-12 h-12 flex items-center justify-center bg-gray-800 text-gray-400 rounded-xl hover:text-red-500 hover:bg-gray-700 transition-colors"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Edit Modal */}
                {editModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[#131619] w-full max-w-lg rounded-3xl shadow-2xl border border-gray-800 overflow-hidden transform transition-all">
                            <div className="p-8">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                                    <FaEdit className="text-cyan-500" /> Edit Request
                                </h2>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Last Working Date</label>
                                        <div className="relative">
                                            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                            <input
                                                type="date"
                                                value={formData.lastWorkDate}
                                                onChange={(e) => setFormData({ ...formData, lastWorkDate: e.target.value })}
                                                className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white font-bold text-sm outline-none focus:border-cyan-500/50 transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">FNF Settlement Amount (₹)</label>
                                        <div className="relative">
                                            <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                            <input
                                                type="number"
                                                value={formData.fnfAmount}
                                                onChange={(e) => setFormData({ ...formData, fnfAmount: e.target.value })}
                                                className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white font-bold text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-gray-700"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Admin Remarks</label>
                                        <textarea
                                            value={formData.remarks}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl py-4 px-4 text-white font-medium text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-gray-700 resize-none h-32"
                                            placeholder="Enter administrative notes regarding this exit..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <button
                                        onClick={() => setEditModal({ open: false, request: null })}
                                        className="py-4 rounded-xl bg-gray-800 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:bg-gray-700 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdate}
                                        className="py-4 rounded-xl bg-cyan-500 text-black font-bold uppercase text-[10px] tracking-widest hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transition-all"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ResignRequestList;
