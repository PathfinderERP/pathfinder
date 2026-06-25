import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { FaCheck, FaTimes, FaEye, FaSearch, FaFilter, FaCalendarAlt, FaBuilding, FaTag, FaChevronLeft, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// ─── Custom Multi-Select Dropdown ────────────────────────────────────────────
const MultiSelectDropdown = ({ label, options, selected, onChange, valueKey = '_id', labelKey = 'name', placeholder = 'All' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (val) => {
        if (selected.includes(val)) {
            onChange(selected.filter(v => v !== val));
        } else {
            onChange([...selected, val]);
        }
    };

    const clearAll = (e) => { e.stopPropagation(); onChange([]); };

    const displayLabel = selected.length === 0
        ? placeholder
        : selected.length === 1
            ? (options.find(o => (o[valueKey] || o) === selected[0])?.[labelKey] || selected[0])
            : `${selected.length} selected`;

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between bg-[#131619] border rounded-xl py-3 px-4 text-sm transition-all focus:outline-none ${open ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-800 hover:border-gray-600'}`}
            >
                <span className={`truncate font-medium ${selected.length > 0 ? 'text-white' : 'text-gray-500'}`}>
                    {displayLabel}
                </span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                    {selected.length > 0 && (
                        <span
                            onClick={clearAll}
                            className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5 font-black hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                        >
                            ×{selected.length}
                        </span>
                    )}
                    <FaChevronDown className={`text-gray-500 text-[10px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2030] border border-gray-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                    {options.length === 0 ? (
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest p-4 text-center">No options</p>
                    ) : (
                        options.map((opt, i) => {
                            const val = opt[valueKey] || opt;
                            const lbl = opt[labelKey] || opt;
                            const checked = selected.includes(val);
                            return (
                                <div
                                    key={val || i}
                                    onClick={() => toggle(val)}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm ${checked ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-600 bg-[#131619]'}`}>
                                        {checked && <FaCheck className="text-white text-[8px]" />}
                                    </div>
                                    <span className={`font-medium ${checked ? 'text-white' : 'text-gray-400'}`}>{lbl}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Status options (not from API) ────────────────────────────────────────────
const STATUS_OPTIONS = [
    { _id: 'pending', name: 'Pending Approval' },
    { _id: 'approved', name: 'Approved / Cleared' },
    { _id: 'rejected', name: 'Rejected / Returned' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const PettyCashApproval = () => {
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedExpenditure, setSelectedExpenditure] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
    const [bulkRejectionReason, setBulkRejectionReason] = useState("");

    // Multi-select Filters State (arrays)
    const [filters, setFilters] = useState({
        statuses: ['pending'],       // multi
        centreIds: [],               // multi
        categoryIds: [],             // multi
        subCategoryIds: [],          // multi
        expenditureTypeIds: [],      // multi
        startDate: '',
        endDate: '',
        search: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPage, setJumpPage] = useState('');

    // Metadata State
    const [centres, setCentres] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [expenditureTypes, setExpenditureTypes] = useState([]);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const canApprove = hasPermission(user, 'pettyCashManagement', 'expenditureApproval', 'create') ||
        hasPermission(user, 'pettyCashManagement', 'expenditureApproval', 'edit') ||
        hasPermission(user, 'pettyCashManagement', 'expenditureApproval', 'delete');

    const fetchMetadata = async () => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, { headers });
            const allCentres = res.data;
            if (user.role === 'superAdmin') {
                setCentres(allCentres);
            } else {
                const userCentres = (user.centres || []).map(c => c._id || c);
                setCentres(allCentres.filter(c => userCentres.includes(c._id)));
            }
        } catch (e) { console.error('Centres fetch failed', e); }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/category`, { headers });
            setCategories(res.data);
        } catch (e) { console.error('Categories fetch failed', e); }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/subcategory`, { headers });
            setSubCategories(res.data);
        } catch (e) { console.error('Subcategories fetch failed', e); }

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/expenditure-type`, { headers });
            setExpenditureTypes(res.data);
        } catch (e) { console.error('Exp types fetch failed', e); }
    };

    const fetchExpenditures = async (pageValue = currentPage) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();

            // Multi-value params — send as comma-separated
            if (filters.statuses.length > 0) params.append('status', filters.statuses.join(','));
            if (filters.centreIds.length > 0) params.append('centreId', filters.centreIds.join(','));
            if (filters.categoryIds.length > 0) params.append('categoryId', filters.categoryIds.join(','));
            if (filters.subCategoryIds.length > 0) params.append('subCategoryId', filters.subCategoryIds.join(','));
            if (filters.expenditureTypeIds.length > 0) params.append('expenditureTypeId', filters.expenditureTypeIds.join(','));
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.search) params.append('search', filters.search);

            params.append('page', pageValue);
            params.append('limit', itemsPerPage);

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/approval?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setExpenditures(Array.isArray(response.data.expenditures) ? response.data.expenditures : []);
            setTotalPages(response.data.totalPages || 1);
            setTotalItems(response.data.totalItems || 0);
            setCurrentPage(response.data.currentPage || 1);
            setJumpPage((response.data.currentPage || 1).toString());
        } catch (error) {
            toast.error('Failed to load expenditures');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('Are you sure you want to approve this expenditure?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/approve/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Expenditure approved successfully');
            fetchExpenditures();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Approval failed');
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/reject/${selectedExpenditure._id}`, {
                reason: rejectionReason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Expenditure rejected');
            setShowRejectModal(false);
            setRejectionReason('');
            fetchExpenditures();
        } catch (error) {
            toast.error('Rejection failed');
        }
    };

    const handleSelectAll = (e) => {
        const pendingItems = expenditures.filter(item => item.status === 'pending');
        if (e.target.checked) {
            const pendingIds = pendingItems.map(item => item._id);
            setSelectedIds(prev => [...new Set([...prev, ...pendingIds])]);
        } else {
            const pendingIds = pendingItems.map(item => item._id);
            setSelectedIds(prev => prev.filter(id => !pendingIds.includes(id)));
        }
    };

    const handleSelectRow = (id, checked) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleBulkApprove = async () => {
        if (!window.confirm(`Are you sure you want to approve the ${selectedIds.length} selected expenditures?`)) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/bulk-approve`, {
                ids: selectedIds
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Selected expenditures approved successfully');
            setSelectedIds([]);
            fetchExpenditures();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bulk approval failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkReject = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/finance/petty-cash/bulk-reject`, {
                ids: selectedIds,
                reason: bulkRejectionReason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Selected expenditures rejected successfully');
            setShowBulkRejectModal(false);
            setBulkRejectionReason('');
            setSelectedIds([]);
            fetchExpenditures();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bulk rejection failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMetadata(); }, []);

    useEffect(() => { fetchExpenditures(1); }, [filters, itemsPerPage]);

    useEffect(() => { setSelectedIds([]); }, [filters, currentPage, itemsPerPage]);

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
            statuses: ['pending'],
            centreIds: [],
            categoryIds: [],
            subCategoryIds: [],
            expenditureTypeIds: [],
            startDate: '',
            endDate: '',
            search: ''
        });
        setCurrentPage(1);
    };

    // Filtered sub-categories based on selected categories
    const filteredSubCategories = subCategories.filter(s =>
        filters.categoryIds.length === 0 ||
        filters.categoryIds.includes(s.category?._id || s.category)
    );

    const exportToExcel = () => {
        if (expenditures.length === 0) return toast.info('No data to export');
        const data = expenditures.map(exp => ({
            'Date': new Date(exp.date).toLocaleDateString(),
            'Centre': exp.centre?.centreName,
            'Category': exp.category?.name,
            'Sub Category': exp.subCategory?.name,
            'Type': exp.expenditureType?.name,
            'Amount': exp.amount,
            'Description': exp.description,
            'Vendor': exp.vendorName || '-',
            'Payment Mode': exp.paymentMode,
            'Tax': exp.taxApplicable ? 'Yes' : 'No',
            'Status': exp.status,
            'Rejection Reason': exp.rejectionReason || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Expenditures');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const finalData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(finalData, `PettyCash_Expenditures_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Active filter count badge
    const activeFilterCount = [
        filters.statuses.length > 0 && filters.statuses.length < 3,
        filters.centreIds.length > 0,
        filters.categoryIds.length > 0,
        filters.subCategoryIds.length > 0,
        filters.expenditureTypeIds.length > 0,
        !!filters.startDate || !!filters.endDate,
        !!filters.search
    ].filter(Boolean).length;

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
                        <button onClick={resetFilters} className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white transition-all font-bold text-sm border border-gray-700 flex items-center gap-2">
                            Reset
                            {activeFilterCount > 0 && (
                                <span className="bg-blue-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Advanced Multi-Select Filter Bar ─────────────────────── */}
                <div className="bg-[#1a1f24] border border-gray-800 p-6 rounded-2xl mb-8 shadow-xl">
                    <div className="flex items-center gap-2 mb-5">
                        <FaFilter className="text-blue-500 text-xs" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="ml-1 text-[9px] bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full px-2 py-0.5 font-black">
                                {activeFilterCount} active
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaFilter className="text-[8px]" /> Status
                            </label>
                            <MultiSelectDropdown
                                options={STATUS_OPTIONS}
                                selected={filters.statuses}
                                onChange={(val) => { setFilters(p => ({ ...p, statuses: val })); setCurrentPage(1); }}
                                placeholder="All Statuses"
                            />
                        </div>

                        {/* Centre */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaBuilding className="text-[8px]" /> Centre
                            </label>
                            <MultiSelectDropdown
                                options={centres}
                                selected={filters.centreIds}
                                onChange={(val) => { setFilters(p => ({ ...p, centreIds: val })); setCurrentPage(1); }}
                                labelKey="centreName"
                                placeholder="All Centres"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaTag className="text-[8px]" /> Category
                            </label>
                            <MultiSelectDropdown
                                options={categories}
                                selected={filters.categoryIds}
                                onChange={(val) => {
                                    setFilters(p => ({ ...p, categoryIds: val, subCategoryIds: [] }));
                                    setCurrentPage(1);
                                }}
                                placeholder="All Categories"
                            />
                        </div>

                        {/* Sub Category */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaTag className="text-[8px]" /> Sub Category
                            </label>
                            <MultiSelectDropdown
                                options={filteredSubCategories}
                                selected={filters.subCategoryIds}
                                onChange={(val) => { setFilters(p => ({ ...p, subCategoryIds: val })); setCurrentPage(1); }}
                                placeholder="All Sub-Categories"
                            />
                        </div>

                        {/* Expenditure Type */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaTag className="text-[8px]" /> Expenditure Type
                            </label>
                            <MultiSelectDropdown
                                options={expenditureTypes}
                                selected={filters.expenditureTypeIds}
                                onChange={(val) => { setFilters(p => ({ ...p, expenditureTypeIds: val })); setCurrentPage(1); }}
                                placeholder="All Types"
                            />
                        </div>

                        {/* Search */}
                        <div className="space-y-2 md:col-span-2 lg:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaSearch className="text-[8px]" /> Content Search
                            </label>
                            <div className="relative">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="text"
                                    placeholder="Description, Vendor..."
                                    value={filters.search}
                                    onChange={(e) => { setFilters(p => ({ ...p, search: e.target.value })); setCurrentPage(1); }}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 text-sm hover:border-gray-600 transition-all"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2 md:col-span-2 lg:col-span-1 xl:col-span-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FaCalendarAlt className="text-[8px]" /> Date Range
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => { setFilters(p => ({ ...p, startDate: e.target.value })); setCurrentPage(1); }}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 text-xs [color-scheme:dark] hover:border-gray-600 transition-all"
                                />
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => { setFilters(p => ({ ...p, endDate: e.target.value })); setCurrentPage(1); }}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500 text-xs [color-scheme:dark] hover:border-gray-600 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Pills */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800/50">
                            {filters.statuses.map(s => {
                                const opt = STATUS_OPTIONS.find(o => o._id === s);
                                return (
                                    <span key={s} className="flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                        {opt?.name || s}
                                        <button onClick={() => setFilters(p => ({ ...p, statuses: p.statuses.filter(v => v !== s) }))} className="hover:text-white transition-colors">×</button>
                                    </span>
                                );
                            })}
                            {filters.centreIds.map(id => {
                                const c = centres.find(c => c._id === id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 bg-purple-600/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                        {c?.centreName || id}
                                        <button onClick={() => setFilters(p => ({ ...p, centreIds: p.centreIds.filter(v => v !== id) }))} className="hover:text-white transition-colors">×</button>
                                    </span>
                                );
                            })}
                            {filters.categoryIds.map(id => {
                                const c = categories.find(c => c._id === id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                        {c?.name || id}
                                        <button onClick={() => setFilters(p => ({ ...p, categoryIds: p.categoryIds.filter(v => v !== id) }))} className="hover:text-white transition-colors">×</button>
                                    </span>
                                );
                            })}
                            {filters.subCategoryIds.map(id => {
                                const s = subCategories.find(s => s._id === id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                        {s?.name || id}
                                        <button onClick={() => setFilters(p => ({ ...p, subCategoryIds: p.subCategoryIds.filter(v => v !== id) }))} className="hover:text-white transition-colors">×</button>
                                    </span>
                                );
                            })}
                            {filters.expenditureTypeIds.map(id => {
                                const t = expenditureTypes.find(t => t._id === id);
                                return (
                                    <span key={id} className="flex items-center gap-1.5 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                        {t?.name || id}
                                        <button onClick={() => setFilters(p => ({ ...p, expenditureTypeIds: p.expenditureTypeIds.filter(v => v !== id) }))} className="hover:text-white transition-colors">×</button>
                                    </span>
                                );
                            })}
                            {(filters.startDate || filters.endDate) && (
                                <span className="flex items-center gap-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    {filters.startDate || '...'} → {filters.endDate || '...'}
                                    <button onClick={() => setFilters(p => ({ ...p, startDate: '', endDate: '' }))} className="hover:text-white transition-colors">×</button>
                                </span>
                            )}
                            {filters.search && (
                                <span className="flex items-center gap-1.5 bg-gray-600/20 border border-gray-500/20 text-gray-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                    "{filters.search}"
                                    <button onClick={() => setFilters(p => ({ ...p, search: '' }))} className="hover:text-white transition-colors">×</button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {selectedIds.length > 0 && (
                    <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl flex justify-between items-center mb-4 transition-all animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-400">{selectedIds.length} item(s) selected</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleBulkApprove}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                Approve Selected
                            </button>
                            <button
                                onClick={() => setShowBulkRejectModal(true)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                Reject Selected
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-gray-700 active:scale-95"
                            >
                                Cancel Selection
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-800 text-gray-300">
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={expenditures.filter(item => item.status === 'pending').length > 0 && expenditures.filter(item => item.status === 'pending').every(item => selectedIds.includes(item._id))}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 bg-[#131619] border-gray-700 text-blue-600 rounded cursor-pointer focus:ring-0"
                                        />
                                    </th>
                                    <th className="p-4 uppercase text-xs">Date</th>
                                    <th className="p-4 uppercase text-xs">Centre</th>
                                    <th className="p-4 uppercase text-xs">Category</th>
                                    <th className="p-4 uppercase text-xs">Sub Category</th>
                                    <th className="p-4 uppercase text-xs">Type</th>
                                    <th className="p-4 uppercase text-xs">Amount</th>
                                    <th className="p-4 uppercase text-xs">Description</th>
                                    <th className="p-4 uppercase text-xs">VENDOR/STAFF</th>
                                    <th className="p-4 uppercase text-xs">Payment Mode</th>
                                    <th className="p-4 uppercase text-xs">Tax</th>
                                    <th className="p-4 uppercase text-xs">Created By</th>
                                    <th className="p-4 uppercase text-xs">Approved/Rejected By</th>
                                    <th className="p-4 uppercase text-xs text-center">Status</th>
                                    <th className="p-4 uppercase text-xs text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="15" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest italic">Synchronizing Ledger...</p>
                                        </div>
                                    </td></tr>
                                ) : expenditures.length === 0 ? (
                                    <tr><td colSpan="15" className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest italic">
                                        No expenditure movements found for current filters
                                    </td></tr>
                                ) : (
                                    expenditures.map((item) => (
                                        <tr key={item._id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                {item.status === 'pending' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(item._id)}
                                                        onChange={(e) => handleSelectRow(item._id, e.target.checked)}
                                                        className="w-4 h-4 bg-[#131619] border-gray-700 text-blue-600 rounded cursor-pointer focus:ring-0"
                                                    />
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        disabled
                                                        className="w-4 h-4 bg-gray-800 border-gray-800 text-gray-600 rounded opacity-20 cursor-not-allowed"
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-400">{new Date(item.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold">{item.centre?.centreName}</td>
                                            <td className="p-4 text-gray-400">{item.category?.name}</td>
                                            <td className="p-4 text-gray-400">{item.subCategory?.name}</td>
                                            <td className="p-4 text-gray-400">{item.expenditureType?.name}</td>
                                            <td className="p-4 font-bold text-lg">₹{item.amount.toLocaleString()}</td>
                                            <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{item.description}</td>
                                            <td className="p-4 text-gray-400">{item.vendorName || '-'}</td>
                                            <td className="p-4 text-gray-400">{item.paymentMode}</td>
                                            <td className="p-4 text-gray-400">{item.taxApplicable ? 'Yes' : 'No'}</td>
                                            <td className="p-4 text-gray-400 font-bold">{item.requestedBy?.name || '-'}</td>
                                            <td className="p-4 text-gray-400 font-bold">{item.actionTakenBy?.name || '-'}</td>
                                            <td className="p-4 text-center">
                                                {item.status === 'pending' ? (
                                                    <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-2 w-fit mx-auto">
                                                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                                                        Pending
                                                    </span>
                                                ) : item.status === 'approved' ? (
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
                                                    {item.status === 'pending' && canApprove && (
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
                                                    {item.status === 'rejected' && item.rejectionReason && (
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

                {/* Reject Modal */}
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
                                    <button type="button" onClick={() => setShowRejectModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg">Cancel</button>
                                    <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold">Reject</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bulk Reject Modal */}
                {showBulkRejectModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Bulk Reject Expenditures</h3>
                                <button onClick={() => setShowBulkRejectModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleBulkReject}>
                                <div className="mb-6">
                                    <label className="block text-sm text-gray-400 mb-2">Rejection Reason</label>
                                    <textarea
                                        value={bulkRejectionReason}
                                        onChange={(e) => setBulkRejectionReason(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
                                        placeholder="Enter reason for rejection"
                                        rows="4"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowBulkRejectModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg">Cancel</button>
                                    <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold">Reject All Selected</button>
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
