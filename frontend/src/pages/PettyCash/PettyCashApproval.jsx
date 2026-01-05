import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { FaCheck, FaTimes, FaEye, FaSearch } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';

const PettyCashApproval = () => {
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedExpenditure, setSelectedExpenditure] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canApprove = hasPermission(user, 'pettyCashManagement', 'expenditureApproval', 'approve');

    const fetchExpenditures = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/approval?status=pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenditures(response.data);
        } catch (error) {
            toast.error("Failed to load pending expenditures");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this expenditure?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/approve/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Expenditure approved successfully");
            fetchExpenditures();
        } catch (error) {
            toast.error(error.response?.data?.message || "Approval failed");
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/reject/${selectedExpenditure._id}`, {
                reason: rejectionReason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Expenditure rejected");
            setShowRejectModal(false);
            setRejectionReason("");
            fetchExpenditures();
        } catch (error) {
            toast.error("Rejection failed");
        }
    };

    useEffect(() => {
        fetchExpenditures();
    }, []);

    const filteredExpenditures = expenditures.filter(exp =>
        exp.centre?.centreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="Petty Cash Management">
            <div className="flex-1 bg-[#131619] p-6 text-white min-h-screen">
                <ToastContainer theme="dark" />
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Petty Cash Expenditure Approval</h2>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#1a1f24] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64"
                        />
                    </div>
                </div>

                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-800 text-gray-300">
                                    <th className="p-4 uppercase text-xs">Date</th>
                                    <th className="p-4 uppercase text-xs">Centre</th>
                                    <th className="p-4 uppercase text-xs">Category</th>
                                    <th className="p-4 uppercase text-xs">Sub Category</th>
                                    <th className="p-4 uppercase text-xs">Type</th>
                                    <th className="p-4 uppercase text-xs">Amount</th>
                                    <th className="p-4 uppercase text-xs">Description</th>
                                    <th className="p-4 uppercase text-xs">Vendor</th>
                                    <th className="p-4 uppercase text-xs">Payment Mode</th>
                                    <th className="p-4 uppercase text-xs">Tax</th>
                                    <th className="p-4 uppercase text-xs text-center">Status</th>
                                    <th className="p-4 uppercase text-xs text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="12" className="p-10 text-center text-gray-500">Loading pending requests...</td></tr>
                                ) : filteredExpenditures.length === 0 ? (
                                    <tr><td colSpan="12" className="p-10 text-center text-gray-500">No pending expenditures.</td></tr>
                                ) : (
                                    filteredExpenditures.map((item) => (
                                        <tr key={item._id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-gray-400">{new Date(item.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold">{item.centre?.centreName}</td>
                                            <td className="p-4 text-gray-400">{item.category?.name}</td>
                                            <td className="p-4 text-gray-400">{item.subCategory?.name}</td>
                                            <td className="p-4 text-gray-400">{item.expenditureType?.name}</td>
                                            <td className="p-4 font-bold text-lg">₹{item.amount.toLocaleString()}</td>
                                            <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{item.description}</td>
                                            <td className="p-4 text-gray-400">{item.vendorName || "-"}</td>
                                            <td className="p-4 text-gray-400">{item.paymentMode}</td>
                                            <td className="p-4 text-gray-400">{item.taxApplicable ? "Yes" : "No"}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-yellow-900/40 text-yellow-500 px-3 py-1 rounded-full text-[10px] uppercase font-bold border border-yellow-800/50">
                                                    pending
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-3">
                                                    {canApprove && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(item._id)}
                                                                className="text-green-500 hover:text-green-400 text-sm font-bold flex items-center gap-1"
                                                                title="Accept"
                                                            >
                                                                Accept
                                                            </button>
                                                            <span className="text-gray-700">/</span>
                                                            <button
                                                                onClick={() => { setSelectedExpenditure(item); setShowRejectModal(true); }}
                                                                className="text-red-500 hover:text-red-400 text-sm font-bold flex items-center gap-1"
                                                                title="Reject"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.billImage && (
                                                        <a href={item.billImage} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2" title="View Bill">
                                                            <FaEye />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showRejectModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Reject Expenditure</h3>
                                <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleReject}>
                                <div className="mb-6">
                                    <label className="block text-sm text-gray-400 mb-2">Rejection Reason</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
                                        placeholder="Enter reason for rejection"
                                        rows="4"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRejectModal(false)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default PettyCashApproval;
