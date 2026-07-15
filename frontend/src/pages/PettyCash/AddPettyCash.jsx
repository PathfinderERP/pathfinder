import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { FaPlus, FaTimes, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';

const LIMIT = 15;

const AddPettyCash = () => {
    const [requests, setRequests]   = useState([]);
    const [loading, setLoading]     = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [centres, setCentres]     = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showRemarksModal, setShowRemarksModal] = useState(false);
    const [viewRemarks, setViewRemarks] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages]   = useState(1);
    const [totalItems, setTotalItems]   = useState(0);

    const [formData, setFormData] = useState({ centre: "", amount: "", remarks: "" });

    const user        = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate   = hasPermission(user, 'pettyCashManagement', 'addPettyCash', 'create');
    const userCentres = user.centres || [];
    const isSuperAdmin = user.role === 'superAdmin' || user.role === 'Super Admin';

    const fetchRequests = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = { page, limit: LIMIT };
            if (searchTerm.trim()) params.search = searchTerm.trim();

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/requests`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(Array.isArray(res.data.requests) ? res.data.requests : (Array.isArray(res.data) ? res.data : []));
            setTotalPages(res.data.totalPages || 1);
            setTotalItems(res.data.totalItems || 0);
            setCurrentPage(res.data.currentPage || page);
        } catch {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    }, [searchTerm]);

    const fetchCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isSuperAdmin) {
                setCentres(res.data);
            } else {
                const assignedIds = userCentres.map(c => c._id || c);
                const filtered = res.data.filter(c => assignedIds.includes(c._id));
                setCentres(filtered);
                if (filtered.length === 1) setFormData(prev => ({ ...prev, centre: filtered[0]._id }));
            }
        } catch { /* silent */ }
    }, [isSuperAdmin]);

    useEffect(() => { fetchCentres(); }, [fetchCentres]);

    // Re-fetch when page changes
    useEffect(() => { fetchRequests(currentPage); }, [currentPage]);

    // When search changes, reset to page 1
    useEffect(() => {
        setCurrentPage(1);
        fetchRequests(1);
    }, [searchTerm]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${import.meta.env.VITE_API_URL}/finance/petty-cash/requests`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Petty cash request submitted");
            setShowModal(false);
            setFormData({ centre: "", amount: "", remarks: "" });
            fetchRequests(1);
            setCurrentPage(1);
        } catch (error) {
            toast.error(error.response?.data?.message || "Submission failed");
        }
    };

    const goToPage = (p) => {
        if (p < 1 || p > totalPages) return;
        setCurrentPage(p);
    };

    // Build visible page numbers
    const buildPages = () => {
        const pages = [];
        const delta = 2;
        const left  = Math.max(1, currentPage - delta);
        const right = Math.min(totalPages, currentPage + delta);
        if (left > 1) { pages.push(1); if (left > 2) pages.push("..."); }
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages) { if (right < totalPages - 1) pages.push("..."); pages.push(totalPages); }
        return pages;
    };

    return (
        <Layout activePage="Petty Cash Management">
            <div className="flex-1 bg-[#131619] p-6 text-white min-h-screen">
                <ToastContainer theme="dark" />

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Petty Cash Management</h2>
                        <p className="text-gray-400 text-sm">Manage and track petty cash transactions across all centers.</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all"
                        >
                            <FaPlus /> Add Petty Cash
                        </button>
                    )}
                </div>

                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-4 flex-wrap">
                        <div className="relative w-72">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search centre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#131619] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full"
                            />
                        </div>
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                            {totalItems} record{totalItems !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">DATE</th>
                                    <th className="p-4">CENTRE</th>
                                    <th className="p-4">AMOUNT</th>
                                    <th className="p-4">APPROVED AMOUNT</th>
                                    <th className="p-4">APPROVED DATE</th>
                                    <th className="p-4">STATUS</th>
                                    <th className="p-4">CREATED BY</th>
                                    <th className="p-4">APPROVED BY</th>
                                    <th className="p-4">REMARKS</th>
                                    <th className="p-4 text-center">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="10" className="p-10 text-center text-gray-500">Loading requests...</td></tr>
                                ) : requests.length === 0 ? (
                                    <tr><td colSpan="10" className="p-10 text-center text-gray-500">No requests found.</td></tr>
                                ) : (
                                    requests.map((item) => (
                                        <tr key={item._id} className="hover:bg-white/5 transition-colors border-b border-gray-800/50">
                                            <td className="p-4 text-gray-400 text-sm">{new Date(item.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-300">{item.centre?.centreName}</div>
                                                <div className="text-[10px] text-gray-500 font-mono uppercase">H.O</div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-200">₹{item.requestedAmount}</td>
                                            <td className="p-4 font-bold text-gray-200">₹{item.approvedAmount || 0}</td>
                                            <td className="p-4 text-gray-400 text-sm">{item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : "-"}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${
                                                    item.status === 'approved'  ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                    item.status === 'rejected'  ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                    'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-bold text-gray-400 uppercase">{item.requestedBy?.name || "N/A"}</td>
                                            <td className="p-4 text-xs font-bold text-gray-400 uppercase">{item.approvedBy?.name || "-"}</td>
                                            <td className="p-4 text-xs text-gray-400 max-w-[150px]">
                                                <div
                                                    className={`truncate ${item.remarks ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
                                                    onClick={() => { if (item.remarks) { setViewRemarks(item.remarks); setShowRemarksModal(true); } }}
                                                    title={item.remarks ? "Click to view full remarks" : ""}
                                                >
                                                    {item.remarks || "-"}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button className="text-gray-500 hover:text-white transition-colors" title="View Details">...</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800 bg-[#131619]">
                            <p className="text-xs text-gray-500">
                                Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
                                &nbsp;&mdash;&nbsp;<span className="text-white font-bold">{totalItems}</span> total records
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <FaChevronLeft size={11} />
                                </button>
                                {buildPages().map((p, i) =>
                                    p === "..." ? (
                                        <span key={`e${i}`} className="px-2 text-gray-600 text-sm select-none">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => goToPage(p)}
                                            className={`min-w-[34px] h-[34px] rounded-lg text-xs font-black border transition-all ${
                                                p === currentPage
                                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                                    : "border-gray-700 text-gray-400 hover:text-white hover:border-blue-500"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <FaChevronRight size={11} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Request Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-lg rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold">Request Petty Cash</h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Centre <span className="text-red-500">*</span></label>
                                    <select
                                        name="centre"
                                        value={formData.centre}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        required
                                        disabled={!isSuperAdmin && centres.length === 1}
                                    >
                                        <option value="">Choose centre</option>
                                        {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="Enter requested amount"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Remarks</label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="Add any notes..."
                                        rows="3"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-lg font-bold text-white shadow-lg transition-all">
                                    Submit Request
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Remarks View Modal */}
                {showRemarksModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Remarks Details</h3>
                                <button onClick={() => setShowRemarksModal(false)} className="text-gray-400 hover:text-white transition-colors"><FaTimes /></button>
                            </div>
                            <div className="bg-[#131619] border border-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap">
                                {viewRemarks}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowRemarksModal(false)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-blue-900/20 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AddPettyCash;
