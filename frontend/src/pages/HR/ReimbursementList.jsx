import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaFilter, FaEdit, FaEye, FaCalendarAlt, FaMoneyBillWave, FaFileInvoiceDollar } from "react-icons/fa";
import { toast } from "react-toastify";

const ReimbursementList = () => {
    const [reimbursements, setReimbursements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        status: "All Status"
    });

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedReimbursement, setSelectedReimbursement] = useState(null);
    const [modalMode, setModalMode] = useState("view"); // "view" or "edit"

    // Edit Form State
    const [editFormData, setEditFormData] = useState({
        purpose: "",
        travelType: "",
        travelMode: "",
        fromDate: "",
        toDate: "",
        allowanceType: "",
        amount: "",
        description: "",
        status: ""
    });

    useEffect(() => {
        fetchReimbursements();
    }, []);

    const fetchReimbursements = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            let query = "?";
            if (filters.fromDate) query += `fromDate=${filters.fromDate}&`;
            if (filters.toDate) query += `toDate=${filters.toDate}&`;
            if (filters.status !== "All Status") query += `status=${filters.status}&`;

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/reimbursement/all${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setReimbursements(data);
            } else {
                if (response.status === 403) {
                    toast.error("Access Restricted: HR Only");
                } else {
                    toast.error("Failed to fetch reimbursements");
                }
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (reimbursement, mode) => {
        setSelectedReimbursement(reimbursement);
        setModalMode(mode);
        if (mode === "edit") {
            setEditFormData({
                purpose: reimbursement.purpose,
                travelType: reimbursement.travelType,
                travelMode: reimbursement.travelMode,
                fromDate: reimbursement.fromDate.split("T")[0],
                toDate: reimbursement.toDate.split("T")[0],
                allowanceType: reimbursement.allowanceType,
                amount: reimbursement.amount,
                description: reimbursement.description,
                status: reimbursement.status
            });
        }
        setShowModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/reimbursement/${selectedReimbursement._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editFormData)
            });

            if (response.ok) {
                toast.success("Reimbursement updated successfully");
                setShowModal(false);
                fetchReimbursements();
            } else {
                toast.error("Failed to update reimbursement");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error updating reimbursement");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Approved": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "Rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 md:p-10 animate-fade-in pb-20">
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                    Reimbursement <span className="text-cyan-500">List</span>
                </h1>

                {/* Filters */}
                <div className="bg-[#131619] p-6 rounded-2xl border border-gray-800 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 block">From Date</label>
                        <input
                            type="date"
                            className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none [color-scheme:dark]"
                            value={filters.fromDate}
                            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 block">To Date</label>
                        <input
                            type="date"
                            className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none [color-scheme:dark]"
                            value={filters.toDate}
                            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Status</label>
                        <select
                            className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option>All Status</option>
                            <option>Pending</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchReimbursements}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-colors uppercase text-xs tracking-wider"
                        >
                            Apply
                        </button>
                        <button
                            onClick={() => {
                                setFilters({ fromDate: "", toDate: "", status: "All Status" });
                                fetchReimbursements();
                            }}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold py-3 rounded-xl transition-colors uppercase text-xs tracking-wider"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#131619] rounded-2xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1a1f24] border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    <th className="p-4">SI No.</th>
                                    <th className="p-4">Employee ID</th>
                                    <th className="p-4">Employee Name</th>
                                    <th className="p-4">Purpose</th>
                                    <th className="p-4">Travel Type</th>
                                    <th className="p-4">Travel Period</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="9" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : reimbursements.length === 0 ? (
                                    <tr><td colSpan="9" className="p-8 text-center text-gray-500">No records found</td></tr>
                                ) : (
                                    reimbursements.map((item, index) => (
                                        <tr key={item._id} className="hover:bg-cyan-500/[0.02] transition-colors">
                                            <td className="p-4 text-gray-400 text-xs font-bold">{index + 1}</td>
                                            <td className="p-4 text-cyan-500 text-xs font-black uppercase tracking-wider">{item.employee?.employeeId}</td>
                                            <td className="p-4 text-white text-xs font-bold">{item.employee?.name}</td>
                                            <td className="p-4 text-gray-400 text-xs truncate max-w-[150px]">{item.purpose}</td>
                                            <td className="p-4 text-gray-400 text-xs">{item.travelType}</td>
                                            <td className="p-4 text-gray-400 text-xs">
                                                {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-emerald-400 text-xs font-black">₹{item.amount}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(item, 'view')}
                                                        className="p-2 bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(item, 'edit')}
                                                        className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {showModal && selectedReimbursement && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
                        <div className="bg-[#131619] w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-800 my-8">
                            <div className="p-8 border-b border-gray-800 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                    {modalMode === 'edit' ? 'Edit Reimbursement' : 'Reimbursement Details'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">✕</button>
                            </div>

                            <form onSubmit={handleUpdate} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Read Only / Editable Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Purpose of Travel</label>
                                        <input
                                            readOnly={modalMode === 'view'}
                                            type="text"
                                            className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={modalMode === 'edit' ? editFormData.purpose : selectedReimbursement.purpose}
                                            onChange={(e) => setEditFormData({ ...editFormData, purpose: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Travel Type</label>
                                        <select
                                            disabled={modalMode === 'view'}
                                            className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={modalMode === 'edit' ? editFormData.travelType : selectedReimbursement.travelType}
                                            onChange={(e) => setEditFormData({ ...editFormData, travelType: e.target.value })}
                                        >
                                            <option>Official</option>
                                            <option>Training</option>
                                            <option>Client Visit</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">From Date</label>
                                            <input
                                                readOnly={modalMode === 'view'}
                                                type="date"
                                                className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                value={modalMode === 'edit' ? editFormData.fromDate : selectedReimbursement.fromDate.split('T')[0]}
                                                onChange={(e) => setEditFormData({ ...editFormData, fromDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">To Date</label>
                                            <input
                                                readOnly={modalMode === 'view'}
                                                type="date"
                                                className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                value={modalMode === 'edit' ? editFormData.toDate : selectedReimbursement.toDate.split('T')[0]}
                                                onChange={(e) => setEditFormData({ ...editFormData, toDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Proof Document</label>
                                        {selectedReimbursement.proofUrl ? (
                                            <a href={selectedReimbursement.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-3 rounded-xl border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider w-full justify-center">
                                                <FaFileInvoiceDollar /> View Uploaded Receipt
                                            </a>
                                        ) : (
                                            <div className="bg-gray-800/50 p-4 rounded-xl text-center text-gray-500 text-xs italic">No proof uploaded</div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Travel Mode</label>
                                        <select
                                            disabled={modalMode === 'view'}
                                            className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={modalMode === 'edit' ? editFormData.travelMode : selectedReimbursement.travelMode}
                                            onChange={(e) => setEditFormData({ ...editFormData, travelMode: e.target.value })}
                                        >
                                            <option>Train</option>
                                            <option>Bus</option>
                                            <option>Flight</option>
                                            <option>Car</option>
                                            <option>Bike</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Allowance Type</label>
                                        <select
                                            disabled={modalMode === 'view'}
                                            className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={modalMode === 'edit' ? editFormData.allowanceType : selectedReimbursement.allowanceType}
                                            onChange={(e) => setEditFormData({ ...editFormData, allowanceType: e.target.value })}
                                        >
                                            <option>Travel Allowance</option>
                                            <option>Daily Allowance</option>
                                            <option>Lodging</option>
                                            <option>Food</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Travel Expense (₹)</label>
                                        <input
                                            readOnly={modalMode === 'view'}
                                            type="number"
                                            className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-emerald-400 font-bold text-sm focus:border-cyan-500 outline-none ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={modalMode === 'edit' ? editFormData.amount : selectedReimbursement.amount}
                                            onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Description</label>
                                        <textarea
                                            readOnly={modalMode === 'view'}
                                            className={`w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none resize-none h-24 ${modalMode === 'view' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            value={modalMode === 'edit' ? editFormData.description : selectedReimbursement.description}
                                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                        />
                                    </div>

                                    {modalMode === 'edit' && (
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Approve Status</label>
                                            <select
                                                className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 outline-none"
                                                value={editFormData.status}
                                                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                            >
                                                <option>Pending</option>
                                                <option>Approved</option>
                                                <option>Rejected</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {modalMode === 'edit' && (
                                    <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-4 pt-6 border-t border-gray-800">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition-colors"
                                        >
                                            Update
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ReimbursementList;
