import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { 
    FaBullhorn, FaBoxes, FaRegNewspaper, FaRegImage, FaPaperPlane, 
    FaHistory, FaCheckCircle, FaTimesCircle, FaClock, FaBuilding, 
    FaSync, FaExclamationTriangle, FaTimes, FaCommentDots,
    FaWarehouse, FaEdit, FaTrash
} from 'react-icons/fa';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MarketingPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);

    const userRole = (currentUser.role || "").toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = userRole === "superadmin";

    // Centre States
    const [assignedCentres, setAssignedCentres] = useState([]);
    const [selectedCentreId, setSelectedCentreId] = useState("");
    const [loadingCentres, setLoadingCentres] = useState(true);

    // Bucket State
    const [bucketData, setBucketData] = useState({
        leaflets: 0,
        banners: 0,
        totalLeafletsReceived: 0,
        totalBannersReceived: 0,
        lastUpdated: null
    });
    const [bucketStats, setBucketStats] = useState({
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0
    });
    const [loadingBucket, setLoadingBucket] = useState(false);

    // Requisition Form State
    const [formData, setFormData] = useState({
        leaflets: "",
        banners: "",
        purpose: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // History & Filter State
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedReqForEdit, setSelectedReqForEdit] = useState(null);
    const [editForm, setEditForm] = useState({
        leaflets: "",
        banners: "",
        purpose: ""
    });
    const [savingEdit, setSavingEdit] = useState(false);

    // 1. Fetch Assigned Centres
    const fetchCentres = useCallback(async () => {
        try {
            setLoadingCentres(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch centres based on user access
            const endpoint = isSuperAdmin 
                ? `${import.meta.env.VITE_API_URL}/centre?fetchAll=true`
                : `${import.meta.env.VITE_API_URL}/centre`;

            const res = await axios.get(endpoint, { headers });
            const list = Array.isArray(res.data) ? res.data : [];
            setAssignedCentres(list);

            if (list.length > 0) {
                // If previously saved centre exists and is in list, keep it
                const savedCentre = sessionStorage.getItem("selectedMarketingCentre");
                const matched = list.find(c => c._id === savedCentre);
                if (matched) {
                    setSelectedCentreId(matched._id);
                } else {
                    setSelectedCentreId(list[0]._id);
                }
            }
        } catch (error) {
            console.error("Failed to load centres:", error);
            toast.error("Failed to load centres assigned to your profile.");
        } finally {
            setLoadingCentres(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchCentres();
    }, [fetchCentres]);

    // 2. Fetch Centre Bucket
    const fetchCentreBucket = useCallback(async (centreId) => {
        if (!centreId) return;
        try {
            setLoadingBucket(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing/bucket/${centreId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setBucketData(res.data.data || { leaflets: 0, banners: 0 });
                if (res.data.stats) {
                    setBucketStats(res.data.stats);
                }
            }
        } catch (error) {
            console.error("Failed to load centre bucket:", error);
        } finally {
            setLoadingBucket(false);
        }
    }, []);

    // 3. Fetch Requisition History
    const fetchHistory = useCallback(async (centreId) => {
        if (!centreId) return;
        try {
            setLoadingHistory(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing?centreId=${centreId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setHistory(res.data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch requisition history:", error);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    // Trigger data loading when selectedCentreId changes
    useEffect(() => {
        if (selectedCentreId) {
            sessionStorage.setItem("selectedMarketingCentre", selectedCentreId);
            fetchCentreBucket(selectedCentreId);
            fetchHistory(selectedCentreId);
        }
    }, [selectedCentreId, fetchCentreBucket, fetchHistory]);

    // Handle Form Change (allows clearing 0 on backspace)
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "leaflets" || name === "banners") {
            if (value === "") {
                setFormData(prev => ({ ...prev, [name]: "" }));
            } else {
                const num = parseInt(value, 10);
                setFormData(prev => ({
                    ...prev,
                    [name]: isNaN(num) ? "" : Math.max(0, num)
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Increment / Decrement quantity helpers
    const adjustQuantity = (field, delta) => {
        setFormData(prev => {
            const current = parseInt(prev[field], 10) || 0;
            const updated = Math.max(0, current + delta);
            return {
                ...prev,
                [field]: updated === 0 ? "" : updated
            };
        });
    };

    // Submit Requisition Request
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCentreId) {
            toast.warning("Please select a valid assigned centre.");
            return;
        }

        const leafletQty = parseInt(formData.leaflets, 10) || 0;
        const bannerQty = parseInt(formData.banners, 10) || 0;

        if (leafletQty === 0 && bannerQty === 0) {
            toast.warning("Please request at least 1 leaflet or 1 banner.");
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem("token");
            const payload = {
                centreId: selectedCentreId,
                leaflets: leafletQty,
                banners: bannerQty,
                purpose: formData.purpose
            };

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/operations/marketing`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Requisition request submitted to Hazra HO successfully!');
                setFormData({ leaflets: "", banners: "", purpose: "" });
                fetchHistory(selectedCentreId);
                fetchCentreBucket(selectedCentreId);
            }
        } catch (error) {
            console.error("Requisition submission error:", error);
            toast.error(error.response?.data?.message || 'Failed to submit requisition request');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (req) => {
        setSelectedReqForEdit(req);
        setEditForm({
            leaflets: req.leaflets || "",
            banners: req.banners || "",
            purpose: req.purpose || ""
        });
        setEditModalOpen(true);
    };

    // Save Edited Requisition
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!selectedReqForEdit) return;

        const leafletQty = parseInt(editForm.leaflets, 10) || 0;
        const bannerQty = parseInt(editForm.banners, 10) || 0;

        if (leafletQty === 0 && bannerQty === 0) {
            toast.warning("Please specify a quantity greater than 0 for leaflets or banners.");
            return;
        }

        try {
            setSavingEdit(true);
            const token = localStorage.getItem("token");
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/operations/marketing/requisitions/${selectedReqForEdit._id}`, {
                leaflets: leafletQty,
                banners: bannerQty,
                purpose: editForm.purpose
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success("Requisition updated successfully! Updated details are now visible in Marketing Approval.");
                setEditModalOpen(false);
                setSelectedReqForEdit(null);
                fetchHistory(selectedCentreId);
                fetchCentreBucket(selectedCentreId);
            }
        } catch (error) {
            console.error("Error updating requisition:", error);
            toast.error(error.response?.data?.message || "Failed to update requisition");
        } finally {
            setSavingEdit(false);
        }
    };

    // Delete Requisition
    const handleDeleteRequisition = async (req) => {
        const confirmMsg = `Are you sure you want to delete this requisition for ${req.centreName || 'Centre'} (${req.leaflets} Leaflets, ${req.banners} Banners)?`;
        if (!window.confirm(confirmMsg)) {
            return;
        }
        try {
            setDeletingId(req._id);
            const token = localStorage.getItem("token");
            const res = await axios.delete(`${import.meta.env.VITE_API_URL}/operations/marketing/requisitions/${req._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success("Requisition deleted successfully.");
                fetchHistory(selectedCentreId);
                fetchCentreBucket(selectedCentreId);
            }
        } catch (error) {
            console.error("Error deleting requisition:", error);
            toast.error(error.response?.data?.message || "Failed to delete requisition");
        } finally {
            setDeletingId(null);
        }
    };

    // Filtered History
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesSearch = !searchQuery.trim() || 
                (item.purpose && item.purpose.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.centreName && item.centreName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.destinationCentreName && item.destinationCentreName.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesStatus && matchesSearch;
        });
    }, [history, statusFilter, searchQuery]);

    // Active selected centre object
    const currentCentreObj = useMemo(() => {
        return assignedCentres.find(c => c._id === selectedCentreId) || null;
    }, [assignedCentres, selectedCentreId]);

    const cardBg = isDarkMode ? 'bg-[#151b22] border-gray-800' : 'bg-white shadow-sm border-gray-100';
    const inputBg = isDarkMode ? 'bg-[#0d1117] border-gray-700 text-white focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-500';

    return (
        <Layout activePage="Operations">
            <div className={`p-4 md:p-8 min-h-screen pb-24 ${isDarkMode ? 'bg-[#0b0f14] text-gray-100' : 'bg-[#f8fafc] text-gray-900'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} position="top-right" autoClose={3000} />

                {/* Header with Centre Switcher */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                <FaBullhorn className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                                    Centre Marketing & Requisitions
                                </h1>
                                <p className={`text-xs md:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Place material requisitions to Hazra Head Office & track centre stock bucket
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Centre Selector */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cardBg}`}>
                            <FaBuilding className="text-orange-500 text-sm" />
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Centre:</span>
                            {loadingCentres ? (
                                <span className="text-xs text-gray-400">Loading centres...</span>
                            ) : assignedCentres.length > 1 || isSuperAdmin ? (
                                <select
                                    value={selectedCentreId}
                                    onChange={(e) => setSelectedCentreId(e.target.value)}
                                    className={`text-sm font-bold bg-transparent outline-none cursor-pointer ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}
                                >
                                    {assignedCentres.map((c) => (
                                        <option key={c._id} value={c._id} className={isDarkMode ? 'bg-[#151b22] text-white' : 'bg-white text-gray-900'}>
                                            {c.centreName}
                                        </option>
                                    ))}
                                </select>
                            ) : assignedCentres.length === 1 ? (
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                    {assignedCentres[0].centreName}
                                </span>
                            ) : (
                                <span className="text-xs text-red-500 font-bold">No assigned centre</span>
                            )}
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={() => {
                                if (selectedCentreId) {
                                    fetchCentreBucket(selectedCentreId);
                                    fetchHistory(selectedCentreId);
                                }
                            }}
                            disabled={loadingBucket || loadingHistory}
                            className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-[#151b22] border-gray-800 hover:bg-gray-800 text-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                            title="Refresh Bucket & Requisitions"
                        >
                            <FaSync className={`${loadingBucket || loadingHistory ? 'animate-spin text-orange-500' : ''} text-sm`} />
                        </button>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* 1. MARKETING BUCKET (CURRENT STOCK AT CENTRE) */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FaWarehouse className="text-orange-500 text-lg" />
                            <h2 className="text-lg font-bold">
                                {currentCentreObj ? currentCentreObj.centreName : 'Centre'} Marketing Bucket
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                Live Stock
                            </span>
                        </div>
                        {bucketData.lastUpdated && (
                            <span className="text-xs text-gray-400">
                                Last Updated: {new Date(bucketData.lastUpdated).toLocaleDateString()} {new Date(bucketData.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Leaflets in Bucket */}
                        <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                            <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
                                    <FaRegNewspaper className="text-2xl" />
                                </div>
                                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                    In Bucket
                                </span>
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Leaflets Available
                            </span>
                            <h3 className="text-3xl md:text-4xl font-black mt-1 text-orange-500 tabular-nums">
                                {bucketData.leaflets.toLocaleString()}
                            </h3>
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex justify-between items-center text-xs">
                                <span className="text-gray-500">Total Received:</span>
                                <span className="font-bold text-gray-400">{(bucketData.totalLeafletsReceived || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Banners in Bucket */}
                        <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                            <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                                    <FaRegImage className="text-2xl" />
                                </div>
                                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    In Bucket
                                </span>
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Banners Available
                            </span>
                            <h3 className="text-3xl md:text-4xl font-black mt-1 text-blue-500 tabular-nums">
                                {bucketData.banners.toLocaleString()}
                            </h3>
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex justify-between items-center text-xs">
                                <span className="text-gray-500">Total Received:</span>
                                <span className="font-bold text-gray-400">{(bucketData.totalBannersReceived || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Pending Requests */}
                        <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-2xl">
                                    <FaClock className="text-2xl" />
                                </div>
                                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                    Pending
                                </span>
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Awaiting Hazra HO
                            </span>
                            <h3 className="text-3xl md:text-4xl font-black mt-1 text-yellow-500 tabular-nums">
                                {bucketStats.pendingRequests}
                            </h3>
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex justify-between items-center text-xs">
                                <span className="text-gray-500">Under Review</span>
                                <span className="font-bold text-yellow-500">Action Pending</span>
                            </div>
                        </div>

                        {/* Approved Requests */}
                        <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl">
                                    <FaCheckCircle className="text-2xl" />
                                </div>
                                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Completed
                                </span>
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Approved Requisitions
                            </span>
                            <h3 className="text-3xl md:text-4xl font-black mt-1 text-green-500 tabular-nums">
                                {bucketStats.approvedRequests}
                            </h3>
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex justify-between items-center text-xs">
                                <span className="text-gray-500">Rejections:</span>
                                <span className="font-bold text-red-400">{bucketStats.rejectedRequests}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* 2. REQUISITION REQUEST FORM */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className={`rounded-3xl p-6 md:p-8 mb-8 border transition-all ${cardBg}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                    <FaPaperPlane className="text-xl" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-black">
                                    Place Requisition Request
                                </h2>
                            </div>
                            <p className={`mt-1 text-xs md:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Select required quantities for promotional materials to be dispatched by Head Office.
                            </p>
                        </div>

                        {/* Destination Pill */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold">
                            <FaBuilding />
                            <span>Destination:</span>
                            <span className="font-black underline tracking-wide">HAZRA H.O (By Default)</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Leaflets Request Card */}
                            <div className={`p-6 rounded-3xl border-2 transition-all ${
                                Number(formData.leaflets) > 0 ? 'border-orange-500/60 bg-orange-500/5' : isDarkMode ? 'border-gray-800 bg-[#0d1117]/50' : 'border-gray-200 bg-gray-50/50'
                            }`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <FaRegNewspaper className="text-2xl" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-orange-500">Leaflets</h3>
                                            <p className="text-xs text-gray-500">Promotional handbills for campaigns</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">Pcs</span>
                                </div>

                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Quantity Required
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => adjustQuantity('leaflets', -100)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border transition-all ${
                                            isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-100 border-gray-300'
                                        }`}
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        name="leaflets"
                                        placeholder="0"
                                        value={formData.leaflets}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="1"
                                        className={`flex-1 p-3.5 rounded-xl text-center font-black text-2xl outline-none border transition-all ${inputBg}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => adjustQuantity('leaflets', 100)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border transition-all ${
                                            isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-100 border-gray-300'
                                        }`}
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="flex gap-2 mt-3">
                                    {[500, 1000, 2000, 5000].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, leaflets: (parseInt(p.leaflets, 10) || 0) + val }))}
                                            className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                                Number(formData.leaflets) === val 
                                                ? 'bg-orange-500 text-white border-orange-500' 
                                                : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                                            }`}
                                        >
                                            +{val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Banners Request Card */}
                            <div className={`p-6 rounded-3xl border-2 transition-all ${
                                Number(formData.banners) > 0 ? 'border-blue-500/60 bg-blue-500/5' : isDarkMode ? 'border-gray-800 bg-[#0d1117]/50' : 'border-gray-200 bg-gray-50/50'
                            }`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <FaRegImage className="text-2xl" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-blue-500">Banners</h3>
                                            <p className="text-xs text-gray-500">Display flex banners & signage</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">Pcs</span>
                                </div>

                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Quantity Required
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => adjustQuantity('banners', -1)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border transition-all ${
                                            isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-100 border-gray-300'
                                        }`}
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        name="banners"
                                        placeholder="0"
                                        value={formData.banners}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="1"
                                        className={`flex-1 p-3.5 rounded-xl text-center font-black text-2xl outline-none border transition-all ${inputBg}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => adjustQuantity('banners', 1)}
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border transition-all ${
                                            isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-gray-100 border-gray-300'
                                        }`}
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="flex gap-2 mt-3">
                                    {[2, 5, 10, 20].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, banners: (parseInt(p.banners, 10) || 0) + val }))}
                                            className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                                Number(formData.banners) === val 
                                                ? 'bg-blue-500 text-white border-blue-500' 
                                                : isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                                            }`}
                                        >
                                            +{val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Purpose / Remarks */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Purpose / Campaign Details (Optional)
                            </label>
                            <textarea
                                name="purpose"
                                rows="2"
                                placeholder="E.g., For school gate distribution campaign starting next Monday..."
                                value={formData.purpose}
                                onChange={handleInputChange}
                                className={`w-full p-4 rounded-2xl outline-none border text-sm transition-all ${inputBg}`}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end items-center gap-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || ((parseInt(formData.leaflets, 10) || 0) === 0 && (parseInt(formData.banners, 10) || 0) === 0) || !selectedCentreId}
                                className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                            >
                                <FaPaperPlane className={isSubmitting ? 'animate-bounce' : ''} />
                                <span>{isSubmitting ? 'Submitting to Hazra HO...' : 'Send Requisition to Hazra HO'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* 3. REQUISITION HISTORY TABLE */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className={`rounded-3xl p-6 md:p-8 border transition-all ${cardBg}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                <FaHistory className="text-lg" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">Requisition History</h2>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Status of all material requisition requests submitted by {currentCentreObj?.centreName || 'Centre'}
                                </p>
                            </div>
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                            {['all', 'Pending', 'Approved', 'Rejected'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        statusFilter === st 
                                        ? 'bg-orange-500 text-white shadow-sm' 
                                        : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                                    }`}
                                >
                                    {st === 'all' ? 'All' : st}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    {loadingHistory ? (
                        <div className="py-12 text-center text-gray-500">
                            <FaSync className="animate-spin text-2xl mx-auto mb-2 text-orange-500" />
                            <p className="text-xs">Loading requisition history...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            <FaBoxes className="text-4xl mx-auto mb-2 opacity-30" />
                            <p className="font-bold text-sm">No requisition requests found</p>
                            <p className="text-xs mt-1">Submit your first requisition using the form above.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`text-xs uppercase font-bold tracking-wider ${isDarkMode ? 'bg-[#0d1117] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                    <tr>
                                        <th className="p-4 rounded-tl-xl">Date & Time</th>
                                        <th className="p-4">Centre</th>
                                        <th className="p-4">Destination</th>
                                        <th className="p-4">Requested Items</th>
                                        <th className="p-4">Approved Quantity</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Remarks / Notes</th>
                                        <th className="p-4 rounded-tr-xl text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                    {filteredHistory.map((req) => (
                                        <tr key={req._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                            {/* Date */}
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="font-bold">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>

                                            {/* Centre */}
                                            <td className="p-4 font-bold text-gray-300">
                                                {req.centreName || (typeof req.centre === 'object' ? req.centre?.centreName : req.centre) || currentCentreObj?.centreName || 'HABRA'}
                                            </td>

                                            {/* Destination */}
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    <FaBuilding className="text-[10px]" />
                                                    {req.destinationCentreName || "HAZRA H.O"}
                                                </span>
                                            </td>

                                            {/* Requested Items */}
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    {req.leaflets > 0 && (
                                                        <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                                                            <FaRegNewspaper className="text-[10px]" />
                                                            {req.leaflets.toLocaleString()} Leaflets
                                                        </span>
                                                    )}
                                                    {req.banners > 0 && (
                                                        <span className="text-xs font-bold text-blue-500 flex items-center gap-1">
                                                            <FaRegImage className="text-[10px]" />
                                                            {req.banners.toLocaleString()} Banners
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Approved Items */}
                                            <td className="p-4">
                                                {req.status === 'Approved' ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-black text-green-500">
                                                            {req.approvedLeaflets || 0} Leaflets
                                                        </span>
                                                        <span className="text-xs font-black text-green-500">
                                                            {req.approvedBanners || 0} Banners
                                                        </span>
                                                    </div>
                                                ) : req.status === 'Rejected' ? (
                                                    <span className="text-xs text-red-400 font-medium">None (Rejected)</span>
                                                ) : (
                                                    <span className="text-xs text-yellow-500 font-medium italic">Pending Approval</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-4">
                                                <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full inline-flex items-center gap-1.5 ${
                                                    req.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                    req.status === 'Approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                    'bg-red-500/10 text-red-500 border border-red-500/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        req.status === 'Pending' ? 'bg-yellow-500' :
                                                        req.status === 'Approved' ? 'bg-green-500' : 'bg-red-500'
                                                    }`} />
                                                    {req.status}
                                                </span>
                                            </td>

                                            {/* Purpose & Remarks */}
                                            <td className="p-4 max-w-xs">
                                                {req.purpose && (
                                                    <div className="text-xs text-gray-300 font-medium mb-1 truncate" title={req.purpose}>
                                                        Purpose: {req.purpose}
                                                    </div>
                                                )}
                                                {req.approverRemarks && (
                                                    <div className="text-[11px] text-green-400 font-medium" title={req.approverRemarks}>
                                                        Approver Note: {req.approverRemarks}
                                                    </div>
                                                )}
                                                {req.rejectionReason && (
                                                    <div className="text-[11px] text-red-400 font-medium" title={req.rejectionReason}>
                                                        Reason: {req.rejectionReason}
                                                    </div>
                                                )}
                                                {!req.purpose && !req.approverRemarks && !req.rejectionReason && (
                                                    <span className="text-xs text-gray-500">-</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {(req.status === 'Pending' || isSuperAdmin) ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleOpenEdit(req)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-500 hover:bg-cyan-500/10 border border-cyan-500/20 transition-all hover:scale-105"
                                                                title="Edit Requisition Quantities & Notes"
                                                            >
                                                                <FaEdit className="text-[11px]" />
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRequisition(req)}
                                                                disabled={deletingId === req._id}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all hover:scale-105 disabled:opacity-50"
                                                                title="Delete Requisition Request"
                                                            >
                                                                <FaTrash className="text-[11px]" />
                                                                <span>{deletingId === req._id ? 'Deleting...' : 'Delete'}</span>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 font-medium italic">Completed</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Edit Requisition Modal */}
                {editModalOpen && selectedReqForEdit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 border shadow-2xl transition-all ${cardBg}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                                        <FaEdit className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">Edit Requisition</h3>
                                        <p className="text-xs text-gray-400">
                                            {selectedReqForEdit.centreName} &bull; Destination: {selectedReqForEdit.destinationCentreName || "HAZRA H.O"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditModalOpen(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} noValidate className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Leaflets */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-orange-500 mb-1">
                                            Leaflets Quantity
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(p => ({
                                                    ...p,
                                                    leaflets: Math.max(0, (parseInt(p.leaflets, 10) || 0) - 50) || ""
                                                }))}
                                                className={`w-9 h-11 rounded-lg flex items-center justify-center font-bold border transition-all ${
                                                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
                                                }`}
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                value={editForm.leaflets}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        leaflets: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0)
                                                    }));
                                                }}
                                                className={`flex-1 p-2.5 rounded-xl text-center font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(p => ({
                                                    ...p,
                                                    leaflets: (parseInt(p.leaflets, 10) || 0) + 50
                                                }))}
                                                className={`w-9 h-11 rounded-lg flex items-center justify-center font-bold border transition-all ${
                                                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
                                                }`}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Banners */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">
                                            Banners Quantity
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(p => ({
                                                    ...p,
                                                    banners: Math.max(0, (parseInt(p.banners, 10) || 0) - 1) || ""
                                                }))}
                                                className={`w-9 h-11 rounded-lg flex items-center justify-center font-bold border transition-all ${
                                                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
                                                }`}
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="0"
                                                value={editForm.banners}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        banners: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0)
                                                    }));
                                                }}
                                                className={`flex-1 p-2.5 rounded-xl text-center font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditForm(p => ({
                                                    ...p,
                                                    banners: (parseInt(p.banners, 10) || 0) + 1
                                                }))}
                                                className={`w-9 h-11 rounded-lg flex items-center justify-center font-bold border transition-all ${
                                                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
                                                }`}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Purpose / Remarks */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                        Purpose / Campaign Details (Optional)
                                    </label>
                                    <textarea
                                        rows="3"
                                        placeholder="E.g., Updated quantity required for weekend school campaign..."
                                        value={editForm.purpose}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, purpose: e.target.value }))}
                                        className={`w-full p-3 rounded-xl outline-none border text-sm transition-all ${inputBg}`}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setEditModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingEdit || ((parseInt(editForm.leaflets, 10) || 0) === 0 && (parseInt(editForm.banners, 10) || 0) === 0)}
                                        className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                                    >
                                        {savingEdit ? "Updating..." : "Save Changes"}
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

export default MarketingPage;
