import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { FaCheck, FaTimes, FaEye, FaSearch, FaFilter, FaCalendarAlt, FaBuilding, FaTag, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const PettyCashApproval = () => {
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedExpenditure, setSelectedExpenditure] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    // Filters State
    const [filters, setFilters] = useState({
        status: "pending",
        centreId: "",
        categoryId: "",
        subCategoryId: "",
        expenditureTypeId: "",
        startDate: "",
        endDate: "",
        search: ""
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPage, setJumpPage] = useState("");

    // Metadata State
    const [centres, setCentres] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [expenditureTypes, setExpenditureTypes] = useState([]);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canApprove = hasPermission(user, 'pettyCashManagement', 'expenditureApproval', 'approve');

    const fetchMetadata = async () => {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, { headers });
            setCentres(res.data);
        } catch (e) { console.error("Centres fetch failed", e); }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/category`, { headers });
            setCategories(res.data);
        } catch (e) { console.error("Categories fetch failed", e); }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/subcategory`, { headers });
            setSubCategories(res.data);
        } catch (e) { console.error("Subcategories fetch failed", e); }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/expenditure-type`, { headers });
            setExpenditureTypes(res.data);
        } catch (e) { console.error("Exp types fetch failed", e); }
    };

    const fetchExpenditures = async (pageValue = currentPage) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (filters.status) params.append("status", filters.status);
            if (filters.centreId) params.append("centreId", filters.centreId);
            if (filters.categoryId) params.append("categoryId", filters.categoryId);
            if (filters.subCategoryId) params.append("subCategoryId", filters.subCategoryId);
            if (filters.expenditureTypeId) params.append("expenditureTypeId", filters.expenditureTypeId);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.search) params.append("search", filters.search);

            params.append("page", pageValue);
            params.append("limit", itemsPerPage);

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/approval?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setExpenditures(Array.isArray(response.data.expenditures) ? response.data.expenditures : []);
            setTotalPages(response.data.totalPages || 1);
            setTotalItems(response.data.totalItems || 0);
            setCurrentPage(response.data.currentPage || 1);
            setJumpPage((response.data.currentPage || 1).toString());
        } catch (error) {
            toast.error("Failed to load expenditures");
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
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchExpenditures(1);
    }, [filters, itemsPerPage]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleJumpPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPage);
        if (pageNum > 0 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            fetchExpenditures(pageNum);
        } else {
            toast.warn(`Please enter a page between 1 and ${totalPages}`);
            setJumpPage(currentPage.toString());
        }
    };

    const resetFilters = () => {
        setFilters({
            status: "pending",
            centreId: "",
            categoryId: "",
            subCategoryId: "",
            expenditureTypeId: "",
            startDate: "",
            endDate: "",
            search: ""
        });
        setCurrentPage(1);
    };

    const exportToExcel = () => {
        if (expenditures.length === 0) return toast.info("No data to export");
        const data = expenditures.map(exp => ({
            "Date": new Date(exp.date).toLocaleDateString(),
            "Centre": exp.centre?.centreName,
            "Category": exp.category?.name,
            "Sub Category": exp.subCategory?.name,
            "Type": exp.expenditureType?.name,
            "Amount": exp.amount,
            "Description": exp.description,
            "Vendor": exp.vendorName || "-",
            "Payment Mode": exp.paymentMode,
            "Tax": exp.taxApplicable ? "Yes" : "No",
            "Status": exp.status,
            "Rejection Reason": exp.rejectionReason || ""
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Expenditures");
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const finalData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(finalData, `PettyCash_Expenditures_${new Date().toISOString().split('T')[0]}.xlsx`);
    };



    return (
        <Layout activePage="Petty Cash Management">
            <div className="flex-1 bg-[#131619] p-6 text-white min-h-screen">
                <ToastContainer theme="dark" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Petty Cash Expenditure Ledger</h2>
                        <p className="text-gray-500 text-sm mt-1">Review, approve and track petty cash expenses across all nodes</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={exportToExcel} className="px-4 py-2 bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-600 hover:text-white transition-all font-bold text-sm">
                            Export Excel
                        </button>
                        <button onClick={resetFilters} className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white transition-all font-bold text-sm border border-gray-700">
                            Reset
                        </button>
                    </div>
                </div>

                {/* Advanced Filter Bar */}
                <div className="bg-[#1a1f24] border border-gray-800 p-6 rounded-2xl mb-8 shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Status Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaFilter className="text-[8px]" />Status
                            </label>
                            <select
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                                className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending Approval</option>
                                <option value="approved">Approved / Cleared</option>
                                <option value="rejected">Rejected / Returned</option>
                            </select>
                        </div>

                        {/* Centre Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaBuilding className="text-[8px]" />Center
                            </label>
                            <select
                                name="centreId"
                                value={filters.centreId}
                                onChange={handleFilterChange}
                                className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm cursor-pointer"
                            >
                                <option value="">All Center</option>
                                {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                            </select>
                        </div>

                        {/* Search Bar */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaSearch className="text-[8px]" /> Content Search
                            </label>
                            <div className="relative">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="text"
                                    name="search"
                                    placeholder="Description, Vendor..."
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaCalendarAlt className="text-[8px]" /> Temporal Interval
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    name="startDate"
                                    value={filters.startDate}
                                    onChange={handleFilterChange}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 text-xs [color-scheme:dark]"
                                />
                                <input
                                    type="date"
                                    name="endDate"
                                    value={filters.endDate}
                                    onChange={handleFilterChange}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 text-xs [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Additional Metadata Filters */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaTag className="text-[8px]" /> Expense Category
                            </label>
                            <select
                                name="categoryId"
                                value={filters.categoryId}
                                onChange={handleFilterChange}
                                className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm cursor-pointer"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaTag className="text-[8px]" /> Sub Category
                            </label>
                            <select
                                name="subCategoryId"
                                value={filters.subCategoryId}
                                onChange={handleFilterChange}
                                className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm cursor-pointer"
                            >
                                <option value="">All Subcategories</option>
                                {subCategories.filter(s => !filters.categoryId || (s.category?._id || s.category) === filters.categoryId).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaTag className="text-[8px]" /> Expenditure Type
                            </label>
                            <select
                                name="expenditureTypeId"
                                value={filters.expenditureTypeId}
                                onChange={handleFilterChange}
                                className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm cursor-pointer"
                            >
                                <option value="">All Expenditure Types</option>
                                {expenditureTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>
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
                                    <tr><td colSpan="12" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest italic">Synchronizing Ledger...</p>
                                        </div>
                                    </td></tr>
                                ) : expenditures.length === 0 ? (
                                    <tr><td colSpan="12" className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest italic">
                                        No expenditure movements found for current filters
                                    </td></tr>
                                ) : (
                                    expenditures.map((item) => (
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
                                                {item.status === "pending" ? (
                                                    <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2 w-fit mx-auto">
                                                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                                                        Pending
                                                    </span>
                                                ) : item.status === "approved" ? (
                                                    <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-2 w-fit mx-auto">
                                                        <FaCheck />
                                                        Cleared
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-500/20 flex items-center gap-2 w-fit mx-auto">
                                                        <FaTimes />
                                                        Rejected
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-3">
                                                    {item.status === "pending" && canApprove && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(item._id)}
                                                                className="px-3 py-1 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-lg active:scale-95"
                                                                title="Accept"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedExpenditure(item); setShowRejectModal(true); }}
                                                                className="px-3 py-1 bg-red-600/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95"
                                                                title="Reject"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.billImage && (
                                                        <a href={item.billImage} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-lg" title="View Bill">
                                                            <FaEye />
                                                        </a>
                                                    )}
                                                    {item.status === "rejected" && item.rejectionReason && (
                                                        <div className="group relative">
                                                            <div className="p-2 bg-gray-800 text-amber-500 border border-gray-700 rounded-lg cursor-help">
                                                                <FaSearch className="text-xs" />
                                                            </div>
                                                            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-2xl pointer-events-none">
                                                                {item.rejectionReason}
                                                            </div>
                                                        </div>
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

                {/* Pagination Footer */}
                <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-[#1a1f24]/60 backdrop-blur-xl p-6 rounded-[2rem] border border-gray-800 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                            Showing <span className="text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-white">{totalItems}</span> entries
                        </p>
                        <div className="h-4 w-[1px] bg-gray-800 hidden md:block"></div>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-[10px] font-black text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all outline-none"
                        >
                            {[10, 25, 50, 100].map(size => (
                                <option key={size} value={size}>{size} per page</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800/50">
                            <button
                                onClick={() => { if (currentPage > 1) { const p = currentPage - 1; setCurrentPage(p); fetchExpenditures(p); } }}
                                disabled={currentPage === 1}
                                className="p-2.5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-800 text-gray-400 hover:text-white"
                            >
                                <FaChevronLeft className="text-[10px]" />
                            </button>

                            <div className="flex items-center px-4 gap-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Page</span>
                                <form onSubmit={handleJumpPage} className="relative group">
                                    <input
                                        type="number"
                                        value={jumpPage}
                                        onChange={(e) => setJumpPage(e.target.value)}
                                        className="w-12 bg-gray-800 border border-gray-700 rounded-lg py-1 px-2 text-center text-[10px] font-black text-white focus:outline-none focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="absolute -bottom-1 left-0 w-0 h-[2px] bg-blue-500 group-focus-within:w-full transition-all duration-300"></div>
                                </form>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">of {totalPages}</span>
                            </div>

                            <button
                                onClick={() => { if (currentPage < totalPages) { const p = currentPage + 1; setCurrentPage(p); fetchExpenditures(p); } }}
                                disabled={currentPage === totalPages}
                                className="p-2.5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-800 text-gray-400 hover:text-white"
                            >
                                <FaChevronRight className="text-[10px]" />
                            </button>
                        </div>

                        <div className="flex gap-1.5">
                            {[...Array(Math.min(3, totalPages))].map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => { setCurrentPage(pageNum); fetchExpenditures(pageNum); }}
                                        className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all duration-300 ${currentPage === pageNum
                                            ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110'
                                            : 'bg-gray-900 text-gray-500 hover:bg-gray-800 border border-gray-800/50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {totalPages > 3 && <span className="text-gray-700 self-center">...</span>}
                            {totalPages > 3 && (
                                <button
                                    onClick={() => { setCurrentPage(totalPages); fetchExpenditures(totalPages); }}
                                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all duration-300 ${currentPage === totalPages
                                        ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110'
                                        : 'bg-gray-900 text-gray-500 hover:bg-gray-800 border border-gray-800/50'
                                        }`}
                                >
                                    {totalPages}
                                </button>
                            )}
                        </div>
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
