import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { FaPlus, FaTimes, FaSearch } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';

const AddPettyCash = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [centres, setCentres] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        centre: "",
        amount: "",
        remarks: ""
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'pettyCashManagement', 'addPettyCash', 'create');

    // Get user's assigned centres from user object
    const userCentres = user.centres || [];
    const isSuperAdmin = user.role === 'superAdmin';

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [reqRes, centresRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/requests`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setRequests(reqRes.data);

            // If superAdmin, show all centres. Otherwise, only show assigned centres.
            if (isSuperAdmin) {
                setCentres(centresRes.data);
            } else {
                const assignedIds = userCentres.map(c => c._id || c);
                const filtered = centresRes.data.filter(c => assignedIds.includes(c._id));
                setCentres(filtered);

                // Auto-select if only one centre
                if (filtered.length === 1) {
                    setFormData(prev => ({ ...prev, centre: filtered[0]._id }));
                }
            }
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

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
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Submission failed");
        }
    };

    useEffect(() => {
        fetchData();
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
                    <div className="p-4 border-b border-gray-800">
                        <div className="relative w-64">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search centre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#131619] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">DATE</th>
                                    <th className="p-4">CENTRE</th>
                                    <th className="p-4">AMOUNT</th>
                                    <th className="p-4">APROVED AMOUNT</th>
                                    <th className="p-4">APROVED DATE</th>
                                    <th className="p-4">STATUS</th>
                                    <th className="p-4">CREATED BY</th>
                                    <th className="p-4">APROVED BY</th>
                                    <th className="p-4">ACTIONS</th>
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
                                            <td className="p-4">
                                                <div className="font-bold text-gray-300">{item.centre?.centreName}</div>
                                                <div className="text-[10px] text-gray-500 font-mono uppercase">H.O</div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-200">₹{item.requestedAmount}</td>
                                            <td className="p-4 font-bold text-gray-200">₹{item.approvedAmount || 0}</td>
                                            <td className="p-4 text-gray-400 text-sm">{item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : "-"}</td>
                                            <td className="p-4">
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
                                                <button className="text-gray-500 hover:text-white transition-colors" title="View Details">
                                                    ...
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

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
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-lg font-bold text-white shadow-lg transition-all"
                                >
                                    Submit Request
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AddPettyCash;
