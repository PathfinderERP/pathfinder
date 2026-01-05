import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { FaCheck, FaTimes, FaSearch, FaEye } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';

const PettyCashRequestApproval = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [approvedAmount, setApprovedAmount] = useState("");
    const [remarks, setRemarks] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canApprove = hasPermission(user, 'pettyCashManagement', 'pettyCashRequestApproval', 'approve');

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
        } catch (error) {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/request-approve/${selectedRequest._id}`, {
                approvedAmount,
                remarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Request approved and funds added to centre");
            setShowApprovalModal(false);
            setApprovedAmount("");
            setRemarks("");
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || "Approval failed");
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/request-reject/${selectedRequest._id}`, {
                remarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Request rejected");
            setShowRejectModal(false);
            setRemarks("");
            fetchRequests();
        } catch (error) {
            toast.error("Rejection failed");
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = requests.filter(req =>
        req.centre?.centreName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="Petty Cash Management">
            <div className="flex-1 bg-[#131619] p-6 text-white min-h-screen">
                <ToastContainer theme="dark" />
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Petty Cash Approval</h2>
                        <p className="text-gray-400 text-sm">Review, approve, or reject petty cash requests from centers.</p>
                    </div>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search centre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#1a1f24] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64 shadow-lg"
                        />
                    </div>
                </div>

                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">DATE</th>
                                    <th className="p-4">APPROVAL DATE</th>
                                    <th className="p-4">CENTRE</th>
                                    <th className="p-4">AMOUNT</th>
                                    <th className="p-4">APROVED AMOUNT</th>
                                    <th className="p-4 text-center">STATUS</th>
                                    <th className="p-4">CREATED BY</th>
                                    <th className="p-4">APROVED BY</th>
                                    <th className="p-4 text-center">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="9" className="p-10 text-center text-gray-500">Loading requests...</td></tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr><td colSpan="9" className="p-10 text-center text-gray-500">No requests found.</td></tr>
                                ) : (
                                    filteredRequests.map((item) => (
                                        <tr key={item._id} className="hover:bg-white/5 transition-colors border-b border-gray-800/50">
                                            <td className="p-4 text-gray-400 text-sm">{new Date(item.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4 text-gray-400 text-sm">{item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : "-"}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-300">{item.centre?.centreName}</div>
                                                <div className="text-[10px] text-gray-500 font-mono uppercase">H.O</div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-200">₹{item.requestedAmount.toLocaleString()}</td>
                                            <td className="p-4 font-bold text-gray-200">₹{item.approvedAmount.toLocaleString() || 0}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${item.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                        item.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                            'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-bold text-gray-400 uppercase">{item.requestedBy?.name || "N/A"}</td>
                                            <td className="p-4 text-xs font-bold text-gray-400 uppercase">{item.approvedBy?.name || "-"}</td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-3">
                                                    {item.status === 'pending' && canApprove ? (
                                                        <>
                                                            <button
                                                                onClick={() => { setSelectedRequest(item); setApprovedAmount(item.requestedAmount); setShowApprovalModal(true); }}
                                                                className="text-green-500 hover:text-green-400 text-xs font-black uppercase tracking-tighter"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedRequest(item); setShowRejectModal(true); }}
                                                                className="text-red-500 hover:text-red-400 text-xs font-black uppercase tracking-tighter"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-600 text-xs">Processed</span>
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

                {showApprovalModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Approve Petty Cash</h3>
                                <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleApprove} className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Requested from: <span className="text-white font-bold">{selectedRequest?.centre?.centreName}</span></p>
                                    <p className="text-sm text-gray-400 mb-4">Requested Amount: <span className="text-blue-400 font-bold">₹{selectedRequest?.requestedAmount}</span></p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Approved Amount (₹) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        value={approvedAmount}
                                        onChange={(e) => setApprovedAmount(e.target.value)}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none font-bold text-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Remarks</label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="Optional approval nodes..."
                                        rows="3"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowApprovalModal(false)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold shadow-lg shadow-green-900/20"
                                    >
                                        Approve & Fund
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showRejectModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Reject Request</h3>
                                <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleReject} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Reason for Rejection <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="w-full bg-[#131619] border border-red-900/30 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                                        placeholder="Explain why this request is being rejected..."
                                        rows="4"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowRejectModal(false)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold"
                                    >
                                        Reject Request
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

export default PettyCashRequestApproval;
