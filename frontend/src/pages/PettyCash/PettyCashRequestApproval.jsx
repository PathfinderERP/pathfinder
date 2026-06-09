import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { FaCheck, FaTimes, FaSearch, FaEye } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';
import CustomSearchSelect from '../../components/common/CustomSearchSelect';
import { FaChevronLeft, FaChevronRight, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const PettyCashRequestApproval = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [approvedAmount, setApprovedAmount] = useState("");
    const [remarks, setRemarks] = useState("");
    const [employees, setEmployees] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        id: "",
        centreId: "",
        requestedAmount: "",
        approvedAmount: "",
        status: "",
        remarks: "",
        createdAt: "",
        requestedById: "",
        approvedById: "",
        approvalDate: ""
    });
    
    // Filters & Pagination
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        centreId: ""
    });
    const [allCentres, setAllCentres] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canApprove = hasPermission(user, 'pettyCashManagement', 'pettyCashRequestApproval', 'create') || 
                       hasPermission(user, 'pettyCashManagement', 'pettyCashRequestApproval', 'edit') || 
                       hasPermission(user, 'pettyCashManagement', 'pettyCashRequestApproval', 'delete');

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllCentres(response.data || []);
        } catch (error) {
            console.error("Failed to fetch centres", error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/hr/employee/dropdown`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(response.data || []);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/request-approval`, {
                params: {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    centreId: filters.centreId,
                    page: currentPage,
                    limit: limit
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data.requests || []);
            setTotalPages(response.data.totalPages || 1);
            setTotalItems(response.data.totalItems || 0);
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

    const handleOpenEditModal = (request) => {
        const dateStr = request.createdAt ? new Date(request.createdAt).toISOString().split('T')[0] : "";
        const approvalDateStr = request.approvalDate ? new Date(request.approvalDate).toISOString().split('T')[0] : "";
        setEditFormData({
            id: request._id,
            centreId: request.centre?._id || request.centre,
            requestedAmount: request.requestedAmount || "",
            approvedAmount: request.approvedAmount || 0,
            status: request.status || "pending",
            remarks: request.remarks || "",
            createdAt: dateStr,
            requestedById: request.requestedBy?._id || request.requestedBy,
            approvedById: request.approvedBy?._id || request.approvedBy || "",
            approvalDate: approvalDateStr
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/request-update/${editFormData.id}`, {
                centre: editFormData.centreId,
                requestedAmount: Number(editFormData.requestedAmount),
                approvedAmount: Number(editFormData.approvedAmount),
                status: editFormData.status,
                remarks: editFormData.remarks,
                createdAt: editFormData.createdAt,
                requestedBy: editFormData.requestedById,
                approvedBy: editFormData.approvedById || null,
                approvalDate: editFormData.approvalDate || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Request updated successfully");
            setShowEditModal(false);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update request");
        }
    };

    const exportToExcel = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/request-approval`, {
                params: {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    centreId: filters.centreId,
                    isExport: true
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const allData = response.data || [];
            
            if (allData.length === 0) {
                toast.info("No data to export");
                return;
            }

            const dataToExport = allData.map(item => ({
                "Date": new Date(item.createdAt).toLocaleDateString(),
                "Approval Date": item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : "-",
                "Centre": item.centre?.centreName,
                "Requested Amount": item.requestedAmount,
                "Approved Amount": item.approvedAmount || 0,
                "Status": item.status?.toUpperCase(),
                "Created By": item.requestedBy?.name || "N/A",
                "Approved By": item.approvedBy?.name || "-",
                "Edited By": item.updatedBy?.name || "-"
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Petty Cash Requests");
            const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
            const excelData = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
            saveAs(excelData, `Petty_Cash_Approval_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success(`Exported ${allData.length} records to Excel`);
        } catch (error) {
            toast.error("Failed to export data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCentres();
        fetchEmployees();
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [filters, currentPage]);

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
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
                    >
                        <FaFileExcel /> Export Excel
                    </button>
                </div>
                <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6 flex flex-wrap items-center gap-4 shadow-xl">
                    <div className="flex items-center gap-3 min-w-[240px]">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Centre</label>
                        <div className="flex-1">
                            <CustomSearchSelect
                                options={[
                                    { value: "", label: "ALL CENTRES" },
                                    ...allCentres.map(c => ({ value: c._id, label: c.centreName }))
                                ]}
                                value={filters.centreId}
                                onChange={(val) => { setFilters({...filters, centreId: val}); setCurrentPage(1); }}
                                placeholder="SELECT CENTRE..."
                                isDarkMode={true}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">From</label>
                        <input 
                            type="date"
                            className="bg-[#131619] border border-gray-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                            value={filters.startDate}
                            onChange={(e) => { setFilters({...filters, startDate: e.target.value}); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">To</label>
                        <input 
                            type="date"
                            className="bg-[#131619] border border-gray-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                            value={filters.endDate}
                            onChange={(e) => { setFilters({...filters, endDate: e.target.value}); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex-1 relative min-w-[200px]">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search in table..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500"
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
                                    <th className="p-4">REMARKS</th>
                                    <th className="p-4 text-center">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="10" className="p-10 text-center text-gray-500">Loading requests...</td></tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr><td colSpan="10" className="p-10 text-center text-gray-500">No requests found.</td></tr>
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
                                            <td className="p-4">
                                                <div className="text-xs font-bold text-gray-400 uppercase">{item.requestedBy?.name || "N/A"}</div>
                                                {item.updatedBy?.name && (
                                                    <div className="text-[9px] text-cyan-500/80 font-black uppercase mt-0.5 tracking-wider">
                                                        Edited by: {item.updatedBy.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-xs font-bold text-gray-400 uppercase">{item.approvedBy?.name || "-"}</td>
                                            <td className="p-4 text-xs text-gray-400 max-w-[150px] truncate" title={item.remarks}>{item.remarks || "-"}</td>
                                            <td className="p-4">
                                                <div className="flex justify-center items-center gap-3">
                                                    {item.status === 'pending' && canApprove && (
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
                                                    )}
                                                    {item.status !== 'pending' && (
                                                        <span className="text-gray-600 text-xs">Processed</span>
                                                    )}
                                                    {canApprove && (
                                                        <button
                                                            onClick={() => handleOpenEditModal(item)}
                                                            className="text-blue-500 hover:text-blue-400 text-xs font-black uppercase tracking-tighter"
                                                        >
                                                            Edit
                                                        </button>
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-[#1a1f24] p-4 rounded-xl border border-gray-800 shadow-xl">
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                            Showing <span className="text-white">{(currentPage - 1) * limit + 1}</span> to <span className="text-white">{Math.min(currentPage * limit, totalItems)}</span> of <span className="text-white">{totalItems}</span> requests
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-[#131619] border border-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                            >
                                <FaChevronLeft size={12} />
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                                            currentPage === i + 1 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                            : 'bg-[#131619] text-gray-500 border border-gray-700 hover:bg-gray-800'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-[#131619] border border-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                            >
                                <FaChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}

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

                {showEditModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-lg rounded-xl border border-gray-700 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Edit Petty Cash Request</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Centre <span className="text-red-500">*</span></label>
                                        <select
                                            value={editFormData.centreId}
                                            onChange={(e) => setEditFormData({ ...editFormData, centreId: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm cursor-pointer"
                                            required
                                        >
                                            <option value="">Select Centre</option>
                                            {allCentres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status <span className="text-red-500">*</span></label>
                                        <select
                                            value={editFormData.status}
                                            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm cursor-pointer"
                                            required
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Requested Amount (₹) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            value={editFormData.requestedAmount}
                                            onChange={(e) => setEditFormData({ ...editFormData, requestedAmount: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Approved Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={editFormData.approvedAmount}
                                            onChange={(e) => setEditFormData({ ...editFormData, approvedAmount: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Requested By <span className="text-red-500">*</span></label>
                                        <select
                                            value={editFormData.requestedById}
                                            onChange={(e) => setEditFormData({ ...editFormData, requestedById: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm cursor-pointer"
                                            required
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Approved By</label>
                                        <select
                                            value={editFormData.approvedById}
                                            onChange={(e) => setEditFormData({ ...editFormData, approvedById: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm cursor-pointer"
                                        >
                                            <option value="">Select Employee (Approved By)</option>
                                            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Requested Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            value={editFormData.createdAt}
                                            onChange={(e) => setEditFormData({ ...editFormData, createdAt: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm [color-scheme:dark]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Approval Date</label>
                                        <input
                                            type="date"
                                            value={editFormData.approvalDate}
                                            onChange={(e) => setEditFormData({ ...editFormData, approvalDate: e.target.value })}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Remarks</label>
                                    <textarea
                                        value={editFormData.remarks}
                                        onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm"
                                        rows="3"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold shadow-lg shadow-blue-900/20"
                                    >
                                        Save Changes
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
