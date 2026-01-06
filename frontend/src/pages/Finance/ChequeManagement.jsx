import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaCheckCircle, FaClock, FaTimes, FaSyncAlt, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";

const ChequeManagement = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ cleared: 0, pending: 0, bounced: 0, totalAmount: 0 });
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canManageCheques = hasPermission(user, 'financeFees', 'chequeManagement', 'edit');

    useEffect(() => {
        fetchCheques();
    }, []);

    const fetchCheques = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/pending-cheques`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setCheques(data);
                calculateStats(data);
            } else {
                toast.error("Failed to load cheques");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Error loading data");
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const statsObj = data.reduce((acc, c) => {
            if (c.status === "PAID") acc.cleared++;
            else if (c.status === "PENDING_CLEARANCE") acc.pending++;
            else if (c.status === "REJECTED") acc.bounced++;
            acc.totalAmount += (c.amount || 0);
            return acc;
        }, { cleared: 0, pending: 0, bounced: 0, totalAmount: 0 });
        setStats(statsObj);
    };

    const handleClearCheque = async (paymentId) => {
        if (!window.confirm("Are you sure you want to clear this cheque and generate the bill?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/clear-cheque/${paymentId}`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const result = await response.json();
                toast.success(`Cheque cleared! Bill ID: ${result.billId}`);
                fetchCheques();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to clear cheque");
            }
        } catch (error) {
            console.error("Clear Error:", error);
            toast.error("Error clearing cheque");
        }
    };

    const handleRejectCheque = async () => {
        if (!rejectReason) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/reject-cheque/${rejectingId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ reason: rejectReason })
                }
            );

            if (response.ok) {
                toast.success("Cheque rejected/bounced");
                setShowRejectModal(false);
                setRejectingId(null);
                setRejectReason("");
                fetchCheques();
            } else {
                toast.error("Failed to reject cheque");
            }
        } catch (error) {
            console.error("Reject Error:", error);
            toast.error("Error rejecting cheque");
        }
    };

    const filteredCheques = cheques.filter(c => {
        const matchesSearch = c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.chequeNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === "all" ||
            (filterStatus === "pending" && c.status === "PENDING_CLEARANCE") ||
            (filterStatus === "cleared" && c.status === "PAID") ||
            (filterStatus === "bounced" && c.status === "REJECTED");
        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"><FaCheckCircle /> Cleared</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> IN PROCESS</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaTimes /> Bounced</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">{status}</span>;
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1700px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                            Cheque <span className="text-emerald-500">Management</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Real-time Clearance & Rejection Tracking
                        </p>
                    </div>
                    <button
                        onClick={fetchCheques}
                        className="px-6 py-3 bg-gray-800 text-white font-black uppercase text-sm tracking-widest rounded-xl hover:bg-gray-700 transition-all flex items-center gap-2"
                    >
                        <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="relative group col-span-2">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME, ADMISSION NO, OR CHEQUE NUMBER..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#131619] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-wider outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-[#131619] border border-gray-800 rounded-xl py-4 px-4 text-gray-200 font-bold text-xs uppercase outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending Clearance</option>
                        <option value="cleared">Cleared</option>
                        <option value="bounced">Bounced/Rejected</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="p-6">Cheque Info</th>
                                <th className="p-6">Student Details</th>
                                <th className="p-6">Bank Name</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Cheque Date</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-20 text-center">
                                        <div className="animate-spin h-10 w-10 border-t-2 border-emerald-500 rounded-full mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredCheques.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                        No cheques found in records
                                    </td>
                                </tr>
                            ) : (
                                filteredCheques.map((cheque) => (
                                    <tr key={cheque.paymentId} className="hover:bg-emerald-500/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <div className="text-cyan-500 font-black"># {cheque.chequeNumber || "N/A"}</div>
                                            <div className="text-[9px] text-gray-500 font-bold uppercase mt-1">Ref: {cheque.paymentId.slice(-6)}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-white uppercase">{cheque.studentName}</div>
                                            <div className="text-[10px] text-emerald-500/70 font-bold uppercase">{cheque.admissionNumber}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-gray-300 font-bold text-xs uppercase">{cheque.bankName || "N/A"}</div>
                                            <div className="text-[9px] text-gray-500 uppercase mt-1">{cheque.centre}</div>
                                        </td>
                                        <td className="p-6 text-white font-black text-lg">₹{cheque.amount.toLocaleString()}</td>
                                        <td className="p-6 text-gray-300 font-bold text-xs">
                                            {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "N/A"}
                                        </td>
                                        <td className="p-6">{getStatusBadge(cheque.status)}</td>
                                        <td className="p-6 text-right">
                                            {cheque.status === "PENDING_CLEARANCE" && canManageCheques && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleClearCheque(cheque.paymentId)}
                                                        className="px-4 py-2 bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase rounded-lg hover:bg-emerald-500 hover:text-black transition-all border border-emerald-500/20"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRejectingId(cheque.paymentId);
                                                            setShowRejectModal(true);
                                                        }}
                                                        className="px-4 py-2 bg-red-500/10 text-red-500 font-black text-[10px] uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                    >
                                                        Bounce
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#131619] border border-gray-800 w-full max-w-md rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
                            <div className="p-8 border-b border-gray-800 flex items-center gap-4 bg-gradient-to-r from-red-500/10 to-transparent">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xl">
                                    <FaExclamationTriangle />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic uppercase">Bounce Cheque</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Provide a reason for rejection</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Insufficient Funds, Signature Mismatch..."
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-gray-200 font-bold text-xs uppercase tracking-widest outline-none focus:border-red-500/50 transition-all min-h-[120px] resize-none"
                                />
                            </div>
                            <div className="p-8 border-t border-gray-800 flex gap-4 bg-black/40">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectReason("");
                                    }}
                                    className="flex-1 py-3 bg-gray-800 text-gray-300 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectCheque}
                                    className="flex-1 py-3 bg-red-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Confirm Bounce
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ChequeManagement;
