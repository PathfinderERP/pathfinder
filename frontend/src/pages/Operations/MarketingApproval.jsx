import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { 
    FaShieldAlt, FaClock, FaCheckCircle, FaTimesCircle, FaBoxes, 
    FaSearch, FaFilter, FaSync, FaRegNewspaper, FaRegImage, 
    FaBuilding, FaUserTie, FaCheck, FaTimes, FaWarehouse, 
    FaArrowLeft, FaCommentDots, FaEdit, FaSave, FaInfoCircle, FaExclamationTriangle,
    FaShoppingBag, FaTshirt, FaBook, FaBookmark, FaBookOpen
} from 'react-icons/fa';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../config/permissions';
import CustomMultiSelect from '../../components/common/CustomMultiSelect';

const MATERIAL_FILTER_OPTIONS = [
    { value: "Leaflets", label: "Leaflets" },
    { value: "Banners", label: "Banners" },
    { value: "Bags", label: "Bags" },
    { value: "T-Shirts", label: "T-Shirts" },
    { value: "KTS Books", label: "KTS Books" },
    { value: "VSO Books", label: "VSO Books" }
];

const MarketingApprovalPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();

    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }, []);

    const userRole = (currentUser.role || "").toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = userRole === "superadmin";

    // Permission Check: User must be SuperAdmin or have explicit marketingApproval permission
    const canAccessApproval = isSuperAdmin || 
        hasPermission(currentUser, "marketingApproval", "approval", "view") ||
        hasPermission(currentUser, "operations", "marketingApproval", "view");

    useEffect(() => {
        if (!isSuperAdmin && !canAccessApproval) {
            toast.error("Access Denied: You do not have permission to access Marketing Approval.");
            navigate("/operations/marketing", { replace: true });
        }
    }, [isSuperAdmin, canAccessApproval, navigate]);

    // Master data states
    const [allCentres, setAllCentres] = useState([]);
    const [requisitions, setRequisitions] = useState([]);
    const [loadingRequisitions, setLoadingRequisitions] = useState(true);
    const [overviewStats, setOverviewStats] = useState({
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        totalLeafletsDispatched: 0,
        totalBannersDispatched: 0,
        totalBagsDispatched: 0,
        totalTshirtsDispatched: 0,
        totalKtsBooksDispatched: 0,
        totalVsoBooksDispatched: 0
    });

    // Filters
    const [statusFilter, setStatusFilter] = useState("all");
    const [centreFilter, setCentreFilter] = useState("all");
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter requisitions by selected materials (multi-select)
    const filteredRequisitions = useMemo(() => {
        if (!selectedMaterials || selectedMaterials.length === 0) {
            return requisitions;
        }

        const selectedVals = selectedMaterials.map(m => (m.value || m).toLowerCase());

        return requisitions.filter(req => {
            return selectedVals.some(mat => {
                if (mat.includes('leaflet')) {
                    return (req.leaflets > 0) || (req.approvedLeaflets > 0) || (req.itemType && req.itemType.toLowerCase().includes('leaflet'));
                }
                if (mat.includes('banner')) {
                    return (req.banners > 0) || (req.approvedBanners > 0) || (req.itemType && req.itemType.toLowerCase().includes('banner'));
                }
                if (mat.includes('bag')) {
                    return (req.bags > 0) || (req.approvedBags > 0) || (req.itemType && req.itemType.toLowerCase().includes('bag'));
                }
                if (mat.includes('tshirt') || mat.includes('t-shirt')) {
                    return (req.tshirts > 0) || (req.approvedTshirts > 0) || (req.itemType && (req.itemType.toLowerCase().includes('tshirt') || req.itemType.toLowerCase().includes('t-shirt')));
                }
                if (mat.includes('kts')) {
                    return (req.ktsBooks > 0) || (req.approvedKtsBooks > 0) || (req.bookType && req.bookType.toLowerCase().includes('kts')) || (req.itemType && req.itemType.toLowerCase().includes('kts'));
                }
                if (mat.includes('vso')) {
                    return (req.vsoBooks > 0) || (req.approvedVsoBooks > 0) || (req.bookType && req.bookType.toLowerCase().includes('vso')) || (req.itemType && req.itemType.toLowerCase().includes('vso'));
                }
                return false;
            });
        });
    }, [requisitions, selectedMaterials]);

    // Modal: Approve
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [selectedReqForApproval, setSelectedReqForApproval] = useState(null);
    const [approvalForm, setApprovalForm] = useState({
        approvedLeaflets: 0,
        approvedBanners: 0,
        approvedBags: 0,
        approvedTshirts: 0,
        approvedKtsBooks: 0,
        approvedVsoBooks: 0,
        approverRemarks: ""
    });
    const [approving, setApproving] = useState(false);
    const [selectedReqBucket, setSelectedReqBucket] = useState(null);
    const [loadingReqBucket, setLoadingReqBucket] = useState(false);
    const [hazraStock, setHazraStock] = useState(null);
    const [loadingHazraStock, setLoadingHazraStock] = useState(false);

    // Modal: Reject
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedReqForRejection, setSelectedReqForRejection] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejecting, setRejecting] = useState(false);

    // Modal: Centres Bucket Inventory Overview
    const [bucketOverviewOpen, setBucketOverviewOpen] = useState(false);
    const [allBuckets, setAllBuckets] = useState([]);
    const [loadingAllBuckets, setLoadingAllBuckets] = useState(false);
    const [bucketSearchQuery, setBucketSearchQuery] = useState("");

    // Edit Bucket Modal (SuperAdmin only)
    const [editingBucket, setEditingBucket] = useState(null);
    const [editBucketForm, setEditBucketForm] = useState({ 
        leaflets: 0, 
        banners: 0,
        bags: 0,
        tshirts: 0,
        ktsBooks: 0,
        vsoBooks: 0
    });
    const [savingBucketEdit, setSavingBucketEdit] = useState(false);

    // 1. Fetch Centres
    const fetchCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre?fetchAll=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllCentres(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch centres:", err);
        }
    }, []);

    // 2. Fetch Requisitions
    const fetchRequisitions = useCallback(async () => {
        try {
            setLoadingRequisitions(true);
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (centreFilter !== 'all') params.append('centreId', centreFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (searchQuery.trim()) params.append('search', searchQuery.trim());

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setRequisitions(res.data.data || []);
                if (res.data.overview) {
                    setOverviewStats(res.data.overview);
                }
            }
        } catch (error) {
            console.error("Failed to fetch requisitions:", error);
            toast.error("Failed to load marketing requisitions");
        } finally {
            setLoadingRequisitions(false);
        }
    }, [centreFilter, statusFilter, searchQuery]);

    // 3. Fetch All Buckets for Inventory Modal
    const fetchAllBuckets = useCallback(async () => {
        try {
            setLoadingAllBuckets(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing/all-buckets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setAllBuckets(res.data.data || []);
            }
        } catch (error) {
            console.error("Failed to load all buckets:", error);
        } finally {
            setLoadingAllBuckets(false);
        }
    }, []);

    useEffect(() => {
        if (isSuperAdmin || canAccessApproval) {
            fetchCentres();
        }
    }, [fetchCentres, isSuperAdmin, canAccessApproval]);

    useEffect(() => {
        if (isSuperAdmin || canAccessApproval) {
            fetchRequisitions();
        }
    }, [fetchRequisitions, isSuperAdmin, canAccessApproval]);

    // Open Approval Modal
    const handleOpenApproval = async (req) => {
        setSelectedReqForApproval(req);

        const leafDef = req.leaflets || (req.itemType?.toLowerCase().includes('leaflet') ? req.quantity : 0) || 0;
        const banDef  = req.banners  || (req.itemType?.toLowerCase().includes('banner') ? req.quantity : 0) || 0;
        const bagDef  = req.bags     || (req.itemType?.toLowerCase().includes('bag') ? req.quantity : 0) || 0;
        const tshDef  = req.tshirts  || ((req.itemType?.toLowerCase().includes('tshirt') || req.itemType?.toLowerCase().includes('t-shirt')) ? req.quantity : 0) || 0;
        const ktsDef  = req.ktsBooks || (req.bookType?.toLowerCase().includes('kts') || req.itemType?.toLowerCase().includes('kts') ? (req.books || req.quantity) : 0) || 0;
        const vsoDef  = req.vsoBooks || (req.bookType?.toLowerCase().includes('vso') || req.itemType?.toLowerCase().includes('vso') ? (req.books || req.quantity) : 0) || 0;

        setApprovalForm({
            approvedLeaflets: req.status === 'Approved' ? (req.approvedLeaflets !== undefined ? req.approvedLeaflets : leafDef) : leafDef,
            approvedBanners: req.status === 'Approved' ? (req.approvedBanners !== undefined ? req.approvedBanners : banDef) : banDef,
            approvedBags: req.status === 'Approved' ? (req.approvedBags !== undefined ? req.approvedBags : bagDef) : bagDef,
            approvedTshirts: req.status === 'Approved' ? (req.approvedTshirts !== undefined ? req.approvedTshirts : tshDef) : tshDef,
            approvedKtsBooks: req.status === 'Approved' ? (req.approvedKtsBooks !== undefined ? req.approvedKtsBooks : ktsDef) : ktsDef,
            approvedVsoBooks: req.status === 'Approved' ? (req.approvedVsoBooks !== undefined ? req.approvedVsoBooks : vsoDef) : vsoDef,
            approverRemarks: req.approverRemarks || ""
        });
        setApproveModalOpen(true);

        // Fetch centre's current bucket so approver sees live stock
        const centreId = typeof req.centre === 'object' ? req.centre?._id : req.centre;
        if (centreId) {
            try {
                setLoadingReqBucket(true);
                const token = localStorage.getItem("token");
                const bRes = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing/bucket/${centreId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (bRes.data.success) {
                    setSelectedReqBucket(bRes.data.data);
                }
            } catch (err) {
                console.error("Error fetching bucket:", err);
            } finally {
                setLoadingReqBucket(false);
            }
        }

        // Fetch Hazra Central Warehouse stock
        try {
            setLoadingHazraStock(true);
            const token = localStorage.getItem("token");
            const hRes = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing-stock`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (hRes.data?.success) {
                setHazraStock(hRes.data.stock);
            }
        } catch (err) {
            console.error("Error fetching Hazra central stock:", err);
        } finally {
            setLoadingHazraStock(false);
        }
    };

    // Submit Approval
    const handleSubmitApproval = async (e) => {
        e.preventDefault();
        if (!selectedReqForApproval) return;

        try {
            setApproving(true);
            const token = localStorage.getItem("token");
            const payload = {
                approvedLeaflets: parseInt(approvalForm.approvedLeaflets, 10) || 0,
                approvedBanners: parseInt(approvalForm.approvedBanners, 10) || 0,
                approvedBags: parseInt(approvalForm.approvedBags, 10) || 0,
                approvedTshirts: parseInt(approvalForm.approvedTshirts, 10) || 0,
                approvedKtsBooks: parseInt(approvalForm.approvedKtsBooks, 10) || 0,
                approvedVsoBooks: parseInt(approvalForm.approvedVsoBooks, 10) || 0,
                approverRemarks: approvalForm.approverRemarks
            };

            const res = await axios.put(
                `${import.meta.env.VITE_API_URL}/operations/marketing/requisitions/${selectedReqForApproval._id}/approve`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                toast.success(res.data.message || "Requisition updated successfully!");
                setApproveModalOpen(false);
                setSelectedReqForApproval(null);
                fetchRequisitions();
            }
        } catch (error) {
            console.error("Approval error:", error);
            toast.error(error.response?.data?.message || "Failed to process requisition");
        } finally {
            setApproving(false);
        }
    };

    // Open Rejection Modal
    const handleOpenRejection = (req) => {
        setSelectedReqForRejection(req);
        setRejectionReason(req.rejectionReason || "");
        setRejectModalOpen(true);
    };

    // Submit Rejection
    const handleSubmitRejection = async (e) => {
        e.preventDefault();
        if (!selectedReqForRejection) return;

        if (!rejectionReason.trim()) {
            toast.warning("Please provide a reason for rejection.");
            return;
        }

        try {
            setRejecting(true);
            const token = localStorage.getItem("token");
            const res = await axios.put(
                `${import.meta.env.VITE_API_URL}/operations/marketing/requisitions/${selectedReqForRejection._id}/reject`,
                { rejectionReason: rejectionReason.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                toast.success("Requisition marked as rejected.");
                setRejectModalOpen(false);
                setSelectedReqForRejection(null);
                fetchRequisitions();
            }
        } catch (error) {
            console.error("Rejection error:", error);
            toast.error(error.response?.data?.message || "Failed to reject requisition");
        } finally {
            setRejecting(false);
        }
    };

    // Save Direct Bucket Edit
    const handleSaveBucketEdit = async (e) => {
        e.preventDefault();
        if (!editingBucket) return;
        try {
            setSavingBucketEdit(true);
            const token = localStorage.getItem("token");
            const payload = {
                leaflets: parseInt(editBucketForm.leaflets, 10) || 0,
                banners: parseInt(editBucketForm.banners, 10) || 0,
                bags: parseInt(editBucketForm.bags, 10) || 0,
                tshirts: parseInt(editBucketForm.tshirts, 10) || 0,
                ktsBooks: parseInt(editBucketForm.ktsBooks, 10) || 0,
                vsoBooks: parseInt(editBucketForm.vsoBooks, 10) || 0
            };
            const res = await axios.put(
                `${import.meta.env.VITE_API_URL}/operations/marketing/bucket/${editingBucket.centreId}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                toast.success("Centre bucket updated successfully.");
                setEditingBucket(null);
                fetchAllBuckets();
            }
        } catch (error) {
            console.error("Error updating bucket:", error);
            toast.error(error.response?.data?.message || "Failed to update bucket");
        } finally {
            setSavingBucketEdit(false);
        }
    };

    // Filtered Buckets for Inventory Modal
    const filteredBuckets = useMemo(() => {
        if (!bucketSearchQuery.trim()) return allBuckets;
        const q = bucketSearchQuery.toLowerCase().trim();
        return allBuckets.filter(b => 
            (b.centreName || "").toLowerCase().includes(q) ||
            (b.centreCode || "").toLowerCase().includes(q) ||
            (b.location || "").toLowerCase().includes(q)
        );
    }, [allBuckets, bucketSearchQuery]);

    const cardBg = isDarkMode ? 'bg-[#151b22] border-gray-800' : 'bg-white shadow-sm border-gray-100';
    const inputBg = isDarkMode ? 'bg-[#0d1117] border-gray-700 text-white focus:border-orange-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-500';

    return (
        <Layout activePage="Operations">
            <div className={`p-4 md:p-8 min-h-screen pb-24 ${isDarkMode ? 'bg-[#0b0f14] text-gray-100' : 'bg-[#f8fafc] text-gray-900'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} position="top-right" autoClose={3000} />

                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-tr from-red-500 via-orange-500 to-amber-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                <FaShieldAlt className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                                    Marketing Requests Approval Portal
                                </h1>
                                <p className={`text-xs md:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Hazra Head Office approval hub & centre marketing material distribution
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Return to Centre Marketing Portal */}
                        <button
                            onClick={() => navigate('/operations/marketing')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs md:text-sm font-bold transition-all ${
                                isDarkMode ? 'bg-[#151b22] border-gray-800 hover:bg-gray-800 text-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                            <FaArrowLeft className="text-xs" />
                            <span>Centre Requisitions</span>
                        </button>

                        {/* All Centres Inventory Modal Button */}
                        <button
                            onClick={() => {
                                setBucketOverviewOpen(true);
                                fetchAllBuckets();
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
                        >
                            <FaWarehouse className="text-sm" />
                            <span>Centres Stock Overview</span>
                        </button>

                        {/* Refresh */}
                        <button
                            onClick={fetchRequisitions}
                            disabled={loadingRequisitions}
                            className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-[#151b22] border-gray-800 hover:bg-gray-800 text-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                            title="Refresh Requisitions"
                        >
                            <FaSync className={`${loadingRequisitions ? 'animate-spin text-orange-500' : ''} text-sm`} />
                        </button>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* GLOBAL METRICS CARDS */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {/* Pending Approvals */}
                    <div className={`p-5 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-500">Pending Actions</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-yellow-500 tabular-nums">
                                    {overviewStats.pendingRequests}
                                </h3>
                            </div>
                            <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
                                <FaClock className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Awaiting Hazra HO Decision</p>
                    </div>

                    {/* Approved Requests */}
                    <div className={`p-5 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-green-500">Approved</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-green-500 tabular-nums">
                                    {overviewStats.approvedRequests}
                                </h3>
                            </div>
                            <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                                <FaCheckCircle className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Successfully Credited</p>
                    </div>

                    {/* Rejected Requests */}
                    <div className={`p-5 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">Rejected</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-red-500 tabular-nums">
                                    {overviewStats.rejectedRequests}
                                </h3>
                            </div>
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                                <FaTimesCircle className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Declined by Approvers</p>
                    </div>

                    {/* Total Leaflets Dispatched */}
                    <div className={`p-5 rounded-3xl border relative overflow-hidden transition-all ${cardBg}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500">Leaflets Dispatched</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-orange-500 tabular-nums">
                                    {(overviewStats.totalLeafletsDispatched || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                                <FaRegNewspaper className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Total Quantity Approved</p>
                    </div>

                    {/* Total Banners Dispatched */}
                    <div className={`p-5 rounded-3xl border relative overflow-hidden transition-all col-span-2 lg:col-span-1 ${cardBg}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Banners Dispatched</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-blue-500 tabular-nums">
                                    {(overviewStats.totalBannersDispatched || 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                                <FaRegImage className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Total Quantity Approved</p>
                    </div>
                </div>

                {/* Dispatched Materials Summary Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${cardBg}`}>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <FaBook className="text-base" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-500">KTS Books Dispatched</div>
                            <div className="text-base font-black text-amber-400 tabular-nums">
                                {(overviewStats.totalKtsBooksDispatched || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">Pcs</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${cardBg}`}>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                            <FaBookmark className="text-base" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-purple-400">VSO Books Dispatched</div>
                            <div className="text-base font-black text-purple-300 tabular-nums">
                                {(overviewStats.totalVsoBooksDispatched || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">Pcs</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${cardBg}`}>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <FaShoppingBag className="text-base" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Bags Dispatched</div>
                            <div className="text-base font-black text-emerald-400 tabular-nums">
                                {(overviewStats.totalBagsDispatched || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">Pcs</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${cardBg}`}>
                        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                            <FaTshirt className="text-base" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-violet-400">T-Shirts Dispatched</div>
                            <div className="text-base font-black text-violet-300 tabular-nums">
                                {(overviewStats.totalTshirtsDispatched || 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">Pcs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* FILTERS & SEARCH */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className={`p-4 md:p-6 rounded-3xl border mb-8 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 ${cardBg}`}>
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search by centre name or campaign purpose..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${inputBg}`}
                        />
                    </div>

                    {/* Dropdowns & Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Centre Filter */}
                        <div className="flex items-center gap-2">
                            <FaBuilding className="text-gray-400 text-sm" />
                            <select
                                value={centreFilter}
                                onChange={(e) => setCentreFilter(e.target.value)}
                                className={`text-xs md:text-sm font-bold py-2.5 px-3 rounded-xl border outline-none cursor-pointer ${
                                    isDarkMode ? 'bg-[#0d1117] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                            >
                                <option value="all">All Requesting Centres</option>
                                {allCentres.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.centreName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Material Multi-selection Filter */}
                        <div className="w-56 min-w-[200px]">
                            <CustomMultiSelect
                                isMulti
                                options={MATERIAL_FILTER_OPTIONS}
                                value={selectedMaterials}
                                onChange={(val) => setSelectedMaterials(val || [])}
                                placeholder="Filter Materials..."
                                maxShowTags={1}
                            />
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
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
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* REQUISITIONS TABLE */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className={`rounded-3xl p-6 md:p-8 border transition-all ${cardBg}`}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black">All Centre Requisitions</h2>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Showing {filteredRequisitions.length} requisition records
                            </p>
                        </div>
                    </div>

                    {loadingRequisitions ? (
                        <div className="py-16 text-center text-gray-500">
                            <FaSync className="animate-spin text-3xl mx-auto mb-3 text-orange-500" />
                            <p className="text-sm font-medium">Loading requisitions...</p>
                        </div>
                    ) : filteredRequisitions.length === 0 ? (
                        <div className="py-16 text-center text-gray-500">
                            <FaBoxes className="text-4xl mx-auto mb-3 opacity-30" />
                            <p className="font-bold text-base">No requisitions match your filters</p>
                            <p className="text-xs mt-1">Try changing the material, status or centre filter.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`text-xs uppercase font-bold tracking-wider ${isDarkMode ? 'bg-[#0d1117] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                    <tr>
                                        <th className="p-4 rounded-tl-xl">Date & Time</th>
                                        <th className="p-4">Requesting Centre</th>
                                        <th className="p-4">Requested By</th>
                                        <th className="p-4">Destination</th>
                                        <th className="p-4">Requested Material</th>
                                        <th className="p-4">Approved Quantity</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Remarks / Purpose</th>
                                        <th className="p-4 rounded-tr-xl text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                    {filteredRequisitions.map((req) => (
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
                                            <td className="p-4">
                                                <div className="font-bold text-orange-400">
                                                    {req.centreName || (typeof req.centre === 'object' ? req.centre?.centreName : req.centre) || 'HABRA'}
                                                </div>
                                            </td>

                                            {/* Requested By */}
                                            <td className="p-4">
                                                <div className="font-bold">
                                                    {req.requestedByName || req.requestedBy?.name || req.user?.name || (typeof req.requestedBy === 'string' ? req.requestedBy : '') || 'ROHAN SINGH'}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {req.requestedByRole || req.requestedBy?.role || req.user?.role || req.requestedBy?.email || 'superAdmin'}
                                                </div>
                                            </td>

                                            {/* Destination */}
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    <FaBuilding className="text-[10px]" />
                                                    {req.destinationCentreName || "HAZRA H.O"}
                                                </span>
                                            </td>

                                            {/* Requested Material */}
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {req.ktsBooks > 0 && (
                                                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                                                            <FaBook className="text-[11px]" />
                                                            {req.ktsBooks.toLocaleString()} KTS Books
                                                        </span>
                                                    )}
                                                    {req.vsoBooks > 0 && (
                                                        <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                                            <FaBookmark className="text-[11px]" />
                                                            {req.vsoBooks.toLocaleString()} VSO Books
                                                        </span>
                                                    )}
                                                    {req.bags > 0 && (
                                                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                            <FaShoppingBag className="text-[11px]" />
                                                            {req.bags.toLocaleString()} Bags
                                                        </span>
                                                    )}
                                                    {req.tshirts > 0 && (
                                                        <span className="text-xs font-bold text-violet-400 flex items-center gap-1.5">
                                                            <FaTshirt className="text-[11px]" />
                                                            {req.tshirts.toLocaleString()} T-Shirts
                                                        </span>
                                                    )}
                                                    {req.leaflets > 0 && (
                                                        <span className="text-xs font-bold text-orange-500 flex items-center gap-1.5">
                                                            <FaRegNewspaper className="text-[11px]" />
                                                            {req.leaflets.toLocaleString()} Leaflets
                                                        </span>
                                                    )}
                                                    {req.banners > 0 && (
                                                        <span className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                                                            <FaRegImage className="text-[11px]" />
                                                            {req.banners.toLocaleString()} Banners
                                                        </span>
                                                    )}
                                                    {!req.ktsBooks && !req.vsoBooks && !req.bags && !req.tshirts && !req.leaflets && !req.banners && req.quantity > 0 && (
                                                        <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                                            <FaBoxes className="text-[11px]" />
                                                            {req.quantity} {req.itemType || 'Pcs'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Approved Quantities */}
                                            <td className="p-4">
                                                {req.status === 'Approved' ? (
                                                    <div className="flex flex-col gap-1">
                                                        {req.approvedKtsBooks > 0 && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedKtsBooks.toLocaleString()} KTS Books
                                                            </span>
                                                        )}
                                                        {req.approvedVsoBooks > 0 && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedVsoBooks.toLocaleString()} VSO Books
                                                            </span>
                                                        )}
                                                        {req.approvedBags > 0 && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedBags.toLocaleString()} Bags
                                                            </span>
                                                        )}
                                                        {req.approvedTshirts > 0 && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedTshirts.toLocaleString()} T-Shirts
                                                            </span>
                                                        )}
                                                        {req.approvedLeaflets > 0 && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedLeaflets.toLocaleString()} Leaflets
                                                            </span>
                                                        )}
                                                        {req.approvedBanners > 0 && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedBanners.toLocaleString()} Banners
                                                            </span>
                                                        )}
                                                        {!(req.approvedKtsBooks > 0) && !(req.approvedVsoBooks > 0) && !(req.approvedBags > 0) && !(req.approvedTshirts > 0) && !(req.approvedLeaflets > 0) && !(req.approvedBanners > 0) && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedQuantity || req.quantity || 0} {req.itemType || 'Pcs'}
                                                            </span>
                                                        )}
                                                        {req.approvedBy?.name && (
                                                            <span className="text-[10px] text-gray-400">
                                                                By: {req.approvedBy.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : req.status === 'Rejected' ? (
                                                    <div>
                                                        <span className="text-xs text-red-400 font-medium">None (Rejected)</span>
                                                        {req.rejectedBy?.name && (
                                                            <div className="text-[10px] text-gray-400">
                                                                By: {req.rejectedBy.name}
                                                            </div>
                                                        )}
                                                    </div>
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

                                            {/* Remarks & Notes */}
                                            <td className="p-4 max-w-xs">
                                                {req.purpose && (
                                                    <div className="text-xs text-gray-300 font-medium mb-1 truncate" title={req.purpose}>
                                                        {req.purpose}
                                                    </div>
                                                )}
                                                {req.approverRemarks && (
                                                    <div className="text-[11px] text-green-400 font-medium" title={req.approverRemarks}>
                                                        Note: {req.approverRemarks}
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

                                            {/* Action Buttons */}
                                            <td className="p-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenApproval(req)}
                                                        title={req.status === 'Approved' ? 'Modify Approved Quantities' : req.status === 'Rejected' ? 'Revert & Approve Requisition' : 'Approve Requisition'}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all transform hover:-translate-y-0.5 ${
                                                            req.status === 'Approved'
                                                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                                                                : 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20'
                                                        }`}
                                                    >
                                                        <FaCheck className="text-[10px]" />
                                                        {req.status === 'Approved' ? 'Approved' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenRejection(req)}
                                                        title={req.status === 'Rejected' ? 'Modify Rejection Reason' : req.status === 'Approved' ? 'Revert Approval & Reject' : 'Reject Requisition'}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all transform hover:-translate-y-0.5 ${
                                                            req.status === 'Rejected'
                                                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400/50'
                                                                : 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20'
                                                        }`}
                                                    >
                                                        <FaTimes className="text-[10px]" />
                                                        {req.status === 'Rejected' ? 'Rejected' : 'Reject'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* MODAL: APPROVE REQUISITION */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                {approveModalOpen && selectedReqForApproval && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className={`w-full max-w-lg rounded-3xl p-6 md:p-8 border shadow-2xl transition-all ${cardBg}`}>
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
                                        <FaCheckCircle className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">
                                            {selectedReqForApproval.status === 'Approved' ? 'Modify Approved Requisition' : 'Approve Requisition'}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            {selectedReqForApproval.centreName} &bull; Sent to Hazra HO
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setApproveModalOpen(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Informational banners if modifying previous decision */}
                            {selectedReqForApproval.status === 'Approved' && (
                                <div className="mb-4 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-start gap-2.5">
                                    <FaInfoCircle className="text-base shrink-0 mt-0.5" />
                                    <span>
                                        This requisition is already <strong>Approved</strong>. Updating quantities will adjust the count difference directly in <strong>{selectedReqForApproval.centreName}</strong>'s bucket.
                                    </span>
                                </div>
                            )}

                            {selectedReqForApproval.status === 'Rejected' && (
                                <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2.5">
                                    <FaInfoCircle className="text-base shrink-0 mt-0.5" />
                                    <span>
                                        This requisition was previously <strong>Declined</strong>. Submitting will approve it and credit the specified quantities to <strong>{selectedReqForApproval.centreName}</strong>'s bucket.
                                    </span>
                                </div>
                            )}

                            {/* Hazra Central Warehouse Available Stock (Deducted From) */}
                            <div className={`p-3.5 rounded-2xl mb-4 border ${isDarkMode ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/70 border-indigo-200'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <FaWarehouse className="text-xs text-indigo-400" />
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                            Hazra Central Main Stock Available
                                        </span>
                                    </div>
                                    {loadingHazraStock && <FaSync className="animate-spin text-xs text-indigo-500" />}
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Leaflets</span>
                                        <span className="font-extrabold text-orange-400">{(hazraStock?.leaflets ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Banners</span>
                                        <span className="font-extrabold text-blue-400">{(hazraStock?.banners ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Bags</span>
                                        <span className="font-extrabold text-emerald-400">{(hazraStock?.bags ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-violet-500/10">
                                        <span className="text-[9px] text-gray-400 font-bold block uppercase">T-Shirts</span>
                                        <span className="font-extrabold text-violet-400">{(hazraStock?.tshirts ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                                        <span className="text-[9px] text-gray-400 font-bold block uppercase">KTS Books</span>
                                        <span className="font-extrabold text-amber-400">{(hazraStock?.ktsBooks ?? 0).toLocaleString()}</span>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-purple-500/10">
                                        <span className="text-[9px] text-gray-400 font-bold block uppercase">VSO Books</span>
                                        <span className="font-extrabold text-purple-400">{(hazraStock?.vsoBooks ?? 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-indigo-400/80 mt-2 flex items-center gap-1">
                                    <FaInfoCircle className="text-[9px]" />
                                    <span>Approved units will be automatically deducted from Hazra central main stock.</span>
                                </p>
                            </div>

                            {/* Current Centre Bucket Info */}
                            <div className={`p-4 rounded-2xl mb-6 border ${isDarkMode ? 'bg-[#0d1117] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Current Centre Bucket Stock
                                    </span>
                                    {loadingReqBucket && <FaSync className="animate-spin text-xs text-orange-500" />}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
                                    <div className="p-2 rounded-xl bg-orange-500/10">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Leaflets</span>
                                        <p className="text-base font-black text-orange-500">{(selectedReqBucket?.leaflets || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-blue-500/10">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Banners</span>
                                        <p className="text-base font-black text-blue-500">{(selectedReqBucket?.banners || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-emerald-500/10">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Bags</span>
                                        <p className="text-base font-black text-emerald-400">{(selectedReqBucket?.bags || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-violet-500/10">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">T-Shirts</span>
                                        <p className="text-base font-black text-violet-300">{(selectedReqBucket?.tshirts || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-amber-500/10">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">KTS Books</span>
                                        <p className="text-base font-black text-amber-400">{(selectedReqBucket?.ktsBooks || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-purple-500/10">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">VSO Books</span>
                                        <p className="text-base font-black text-purple-300">{(selectedReqBucket?.vsoBooks || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitApproval} noValidate className="space-y-4">
                                <div className="space-y-3">
                                    {/* KTS Books Approval */}
                                    {(selectedReqForApproval.ktsBooks > 0 || selectedReqForApproval.bookType === 'KTS Books' || selectedReqForApproval.itemType === 'KTS Books') && (
                                        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                                                    <FaBook className="text-xs" /> Approved KTS Books
                                                </label>
                                                <span className="text-[11px] font-bold text-amber-400">
                                                    Requested: {selectedReqForApproval.ktsBooks || selectedReqForApproval.quantity || 0} Pcs
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={approvalForm.approvedKtsBooks}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setApprovalForm({ ...approvalForm, approvedKtsBooks: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                                }}
                                                min="0"
                                                step="1"
                                                className={`w-full p-2.5 rounded-xl font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                        </div>
                                    )}

                                    {/* VSO Books Approval */}
                                    {(selectedReqForApproval.vsoBooks > 0 || selectedReqForApproval.bookType === 'VSO Books' || selectedReqForApproval.itemType === 'VSO Books') && (
                                        <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                                    <FaBookmark className="text-xs" /> Approved VSO Books
                                                </label>
                                                <span className="text-[11px] font-bold text-purple-300">
                                                    Requested: {selectedReqForApproval.vsoBooks || selectedReqForApproval.quantity || 0} Pcs
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={approvalForm.approvedVsoBooks}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setApprovalForm({ ...approvalForm, approvedVsoBooks: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                                }}
                                                min="0"
                                                step="1"
                                                className={`w-full p-2.5 rounded-xl font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                        </div>
                                    )}

                                    {/* Bags Approval */}
                                    {(selectedReqForApproval.bags > 0 || selectedReqForApproval.itemType === 'Bags') && (
                                        <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                                    <FaShoppingBag className="text-xs" /> Approved Bags
                                                </label>
                                                <span className="text-[11px] font-bold text-emerald-400">
                                                    Requested: {selectedReqForApproval.bags || selectedReqForApproval.quantity || 0} Pcs
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={approvalForm.approvedBags}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setApprovalForm({ ...approvalForm, approvedBags: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                                }}
                                                min="0"
                                                step="1"
                                                className={`w-full p-2.5 rounded-xl font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                        </div>
                                    )}

                                    {/* T-Shirts Approval */}
                                    {(selectedReqForApproval.tshirts > 0 || selectedReqForApproval.itemType === 'T-Shirts') && (
                                        <div className="p-3 rounded-2xl bg-violet-500/5 border border-violet-500/20">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                                                    <FaTshirt className="text-xs" /> Approved T-Shirts
                                                </label>
                                                <span className="text-[11px] font-bold text-violet-300">
                                                    Requested: {selectedReqForApproval.tshirts || selectedReqForApproval.quantity || 0} Pcs
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={approvalForm.approvedTshirts}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setApprovalForm({ ...approvalForm, approvedTshirts: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                                }}
                                                min="0"
                                                step="1"
                                                className={`w-full p-2.5 rounded-xl font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                        </div>
                                    )}

                                    {/* Leaflets Approval */}
                                    {(selectedReqForApproval.leaflets > 0 || selectedReqForApproval.itemType === 'Leaflets' || (!selectedReqForApproval.itemType && !selectedReqForApproval.ktsBooks && !selectedReqForApproval.vsoBooks && !selectedReqForApproval.bags && !selectedReqForApproval.tshirts && !selectedReqForApproval.banners)) && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-orange-500">
                                                    Approved Leaflets
                                                </label>
                                                <span className="text-[10px] text-gray-400">
                                                    Requested: {selectedReqForApproval.leaflets || selectedReqForApproval.quantity || 0}
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={approvalForm.approvedLeaflets}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setApprovalForm({ ...approvalForm, approvedLeaflets: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                                }}
                                                min="0"
                                                step="1"
                                                className={`w-full p-3 rounded-xl font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                        </div>
                                    )}

                                    {/* Banners Approval */}
                                    {(selectedReqForApproval.banners > 0 || selectedReqForApproval.itemType === 'Banners') && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-blue-500">
                                                    Approved Banners
                                                </label>
                                                <span className="text-[10px] text-gray-400">
                                                    Requested: {selectedReqForApproval.banners || selectedReqForApproval.quantity || 0}
                                                </span>
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={approvalForm.approvedBanners}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setApprovalForm({ ...approvalForm, approvedBanners: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                                }}
                                                min="0"
                                                step="1"
                                                className={`w-full p-3 rounded-xl font-black text-lg outline-none border transition-all ${inputBg}`}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Remarks */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                        Approver Remarks / Dispatch Notes
                                    </label>
                                    <textarea
                                        rows="3"
                                        placeholder="E.g., Dispatched via internal van / courier consignment #12345..."
                                        value={approvalForm.approverRemarks}
                                        onChange={(e) => setApprovalForm({ ...approvalForm, approverRemarks: e.target.value })}
                                        className={`w-full p-3 rounded-xl text-sm outline-none border transition-all ${inputBg}`}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setApproveModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl border border-gray-700 text-xs font-bold hover:bg-gray-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={approving}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
                                    >
                                        {approving ? 'Processing...' : (selectedReqForApproval.status === 'Approved' ? 'Update & Adjust Bucket' : 'Approve & Credit to Bucket')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* MODAL: REJECT REQUISITION */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                {rejectModalOpen && selectedReqForRejection && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-3xl p-6 md:p-8 border shadow-2xl transition-all ${cardBg}`}>
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                                        <FaTimesCircle className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">
                                            {selectedReqForRejection.status === 'Approved' ? 'Revert to Rejected' : selectedReqForRejection.status === 'Rejected' ? 'Modify Rejection Reason' : 'Reject Requisition'}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            {selectedReqForRejection.centreName}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setRejectModalOpen(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Warning if reversing an already approved requisition */}
                            {selectedReqForRejection.status === 'Approved' && (
                                <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                                    <FaExclamationTriangle className="text-base shrink-0 mt-0.5 text-red-400" />
                                    <span>
                                        <strong>Reversal Warning:</strong> This request was previously approved. Rejecting it now will deduct the approved material quantities from <strong>{selectedReqForRejection.centreName}</strong>'s bucket stock.
                                    </span>
                                </div>
                            )}

                            <form onSubmit={handleSubmitRejection} className="space-y-4">
                                <p className="text-xs text-gray-400">
                                    {selectedReqForRejection.status === 'Approved'
                                        ? 'Provide a reason for reverting and declining this requisition:'
                                        : 'Are you sure you want to reject this requisition? Please provide a clear reason for the centre users:'}
                                </p>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                                        Rejection Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows="3"
                                        required
                                        placeholder="E.g., Requested mistakenly / Out of stock at Hazra HO..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className={`w-full p-3 rounded-xl text-sm outline-none border transition-all ${inputBg}`}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setRejectModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl border border-gray-700 text-xs font-bold hover:bg-gray-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={rejecting || !rejectionReason.trim()}
                                        className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        {rejecting ? 'Processing...' : (selectedReqForRejection.status === 'Approved' ? 'Confirm Revert & Reject' : 'Confirm Rejection')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* MODAL: ALL CENTRES BUCKET INVENTORY OVERVIEW */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                {bucketOverviewOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl p-6 md:p-8 border shadow-2xl transition-all ${cardBg}`}>
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                        <FaWarehouse className="text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black">Centres Stock Bucket Inventory</h3>
                                        <p className="text-xs text-gray-400">
                                            Current Leaflets & Banners available at each operational centre
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setBucketOverviewOpen(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Search bar inside modal */}
                            <div className="mb-4">
                                <div className="relative">
                                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                        type="text"
                                        placeholder="Search centre by name..."
                                        value={bucketSearchQuery}
                                        onChange={(e) => setBucketSearchQuery(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${inputBg}`}
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-y-auto pr-1">
                                {loadingAllBuckets ? (
                                    <div className="py-12 text-center text-gray-500">
                                        <FaSync className="animate-spin text-2xl mx-auto mb-2 text-blue-500" />
                                        <p className="text-xs">Loading centre buckets...</p>
                                    </div>
                                ) : filteredBuckets.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500">
                                        <p className="text-sm font-bold">No centre bucket data found</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className={`text-xs uppercase font-bold tracking-wider sticky top-0 ${isDarkMode ? 'bg-[#0d1117] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                            <tr>
                                                <th className="p-3 rounded-tl-xl">Centre Name</th>
                                                <th className="p-3 text-right">Leaflets</th>
                                                <th className="p-3 text-right">Banners</th>
                                                <th className="p-3 text-right">Bags</th>
                                                <th className="p-3 text-right">T-Shirts</th>
                                                <th className="p-3 text-right">KTS Books</th>
                                                <th className="p-3 text-right">VSO Books</th>
                                                {isSuperAdmin && <th className="p-3 text-center rounded-tr-xl">Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                            {filteredBuckets.map((b) => (
                                                <tr key={b.centreId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-3 font-bold text-gray-200 whitespace-nowrap">
                                                        {b.centreName}
                                                    </td>
                                                    <td className="p-3 text-right font-black text-orange-500 tabular-nums">
                                                        {(b.leaflets || 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-3 text-right font-black text-blue-500 tabular-nums">
                                                        {(b.banners || 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-3 text-right font-black text-emerald-400 tabular-nums">
                                                        {(b.bags || 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-3 text-right font-black text-violet-300 tabular-nums">
                                                        {(b.tshirts || 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-3 text-right font-black text-amber-400 tabular-nums">
                                                        {(b.ktsBooks || 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-3 text-right font-black text-purple-300 tabular-nums">
                                                        {(b.vsoBooks || 0).toLocaleString()}
                                                    </td>
                                                    {isSuperAdmin && (
                                                        <td className="p-3 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingBucket(b);
                                                                    setEditBucketForm({ 
                                                                        leaflets: b.leaflets || 0, 
                                                                        banners: b.banners || 0,
                                                                        bags: b.bags || 0,
                                                                        tshirts: b.tshirts || 0,
                                                                        ktsBooks: b.ktsBooks || 0,
                                                                        vsoBooks: b.vsoBooks || 0
                                                                    });
                                                                }}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                                                                title="Adjust bucket stock"
                                                            >
                                                                <FaEdit className="text-xs" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => setBucketOverviewOpen(false)}
                                    className="px-6 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* MODAL: DIRECT BUCKET EDIT (SUPERADMIN) */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                {editingBucket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl transition-all ${cardBg}`}>
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800">
                                <h4 className="font-black text-sm">Adjust {editingBucket.centreName} Stock</h4>
                                <button onClick={() => setEditingBucket(null)} className="text-gray-400 hover:text-white">
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSaveBucketEdit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-orange-500 mb-1">Leaflets</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={editBucketForm.leaflets}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditBucketForm({ ...editBucketForm, leaflets: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                            }}
                                            className={`w-full p-2.5 rounded-xl font-bold border text-sm outline-none ${inputBg}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-blue-500 mb-1">Banners</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={editBucketForm.banners}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditBucketForm({ ...editBucketForm, banners: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                            }}
                                            className={`w-full p-2.5 rounded-xl font-bold border text-sm outline-none ${inputBg}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-emerald-400 mb-1">Bags</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={editBucketForm.bags}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditBucketForm({ ...editBucketForm, bags: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                            }}
                                            className={`w-full p-2.5 rounded-xl font-bold border text-sm outline-none ${inputBg}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-violet-400 mb-1">T-Shirts</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={editBucketForm.tshirts}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditBucketForm({ ...editBucketForm, tshirts: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                            }}
                                            className={`w-full p-2.5 rounded-xl font-bold border text-sm outline-none ${inputBg}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-amber-500 mb-1">KTS Books</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={editBucketForm.ktsBooks}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditBucketForm({ ...editBucketForm, ktsBooks: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                            }}
                                            className={`w-full p-2.5 rounded-xl font-bold border text-sm outline-none ${inputBg}`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-purple-400 mb-1">VSO Books</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={editBucketForm.vsoBooks}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditBucketForm({ ...editBucketForm, vsoBooks: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0) });
                                            }}
                                            className={`w-full p-2.5 rounded-xl font-bold border text-sm outline-none ${inputBg}`}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingBucket(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingBucketEdit}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white"
                                    >
                                        {savingBucketEdit ? 'Saving...' : 'Save Stock'}
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

export default MarketingApprovalPage;
