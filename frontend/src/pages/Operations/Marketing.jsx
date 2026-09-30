import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { 
    FaBullhorn, FaBoxes, FaRegNewspaper, FaRegImage, FaPaperPlane, 
    FaHistory, FaCheckCircle, FaTimesCircle, FaClock, FaBuilding, 
    FaSync, FaExclamationTriangle, FaTimes, FaCommentDots,
    FaWarehouse, FaEdit, FaTrash, FaUserTie, FaGlobe,
    FaShoppingBag, FaTshirt, FaBook, FaBookOpen, FaBookmark, FaInfoCircle, FaChevronDown, FaPlus
} from 'react-icons/fa';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MATERIAL_OPTIONS = [
    { value: "Leaflets", label: "Leaflets", icon: FaRegNewspaper, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", presets: [500, 1000, 2000, 5000], desc: "Promotional handbills & flyers" },
    { value: "Banners", label: "Banners", icon: FaRegImage, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", presets: [2, 5, 10, 20], desc: "Flex banners, standees & signage" },
    { value: "Bags", label: "Bags", icon: FaShoppingBag, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30", presets: [25, 50, 100, 200], desc: "Promotional student bags" },
    { value: "T-Shirts", label: "T-Shirts", icon: FaTshirt, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", presets: [20, 50, 100, 200], desc: "Branded promotional T-shirts" },
    { value: "Books", label: "Books (KTS / VSO)", icon: FaBook, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", presets: [25, 50, 100, 250], desc: "Competition & academic series books" }
];

const BOOK_SUBTYPES = [
    { value: "KTS Books", label: "KTS Books (Key To Success)", icon: FaBookOpen, desc: "Key To Success Books", color: "text-amber-500" },
    { value: "VSO Books", label: "VSO Books (Vidyamandir Science Olympiad)", icon: FaBookmark, desc: "Vidyamandir Science Olympiad Books", color: "text-purple-400" }
];

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
        bags: 0,
        tshirts: 0,
        ktsBooks: 0,
        vsoBooks: 0,
        totalLeafletsReceived: 0,
        totalBannersReceived: 0,
        totalBagsReceived: 0,
        totalTshirtsReceived: 0,
        totalKtsBooksReceived: 0,
        totalVsoBooksReceived: 0,
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
        itemType: "Leaflets",
        bookType: "",
        quantity: "",
        purpose: ""
    });
    const [stagedItems, setStagedItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // History & Filter State
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [historyScope, setHistoryScope] = useState("my"); // "my" | "centre" | "all"
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedReqForEdit, setSelectedReqForEdit] = useState(null);
    const [editForm, setEditForm] = useState({
        itemType: "Leaflets",
        bookType: "",
        quantity: "",
        purpose: ""
    });
    const [savingEdit, setSavingEdit] = useState(false);

    // 1. Fetch Assigned Centres
    const fetchCentres = useCallback(async () => {
        try {
            setLoadingCentres(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Also fetch fresh user profile to ensure primaryCentre is always up-to-date
            let userObj = currentUser;
            try {
                const pRes = await axios.get(`${import.meta.env.VITE_API_URL}/profile/me`, { headers });
                if (pRes.data?.user) {
                    userObj = pRes.data.user;
                    localStorage.setItem("user", JSON.stringify(userObj));
                }
            } catch (err) {
                userObj = JSON.parse(localStorage.getItem("user") || "{}");
            }

            // Fetch centres based on user access
            const endpoint = isSuperAdmin 
                ? `${import.meta.env.VITE_API_URL}/centre?fetchAll=true`
                : `${import.meta.env.VITE_API_URL}/centre`;

            const res = await axios.get(endpoint, { headers });
            const list = Array.isArray(res.data) ? res.data : [];

            const primaryId = userObj.primaryCentre?._id || userObj.primaryCentre || userObj.centre?._id || userObj.centre;
            const primaryName = (userObj.primaryCentre?.centreName || userObj.centre?.centreName || "").toLowerCase();

            // Sort list so Primary Centre (Hazra H.O) appears at the very top
            const sortedList = [...list].sort((a, b) => {
                const aIsPrimary = (primaryId && a._id?.toString() === primaryId.toString()) || 
                                   (primaryName && a.centreName?.toLowerCase() === primaryName) || 
                                   a.centreName?.toLowerCase().includes("hazra");
                const bIsPrimary = (primaryId && b._id?.toString() === primaryId.toString()) || 
                                   (primaryName && b.centreName?.toLowerCase() === primaryName) || 
                                   b.centreName?.toLowerCase().includes("hazra");
                if (aIsPrimary && !bIsPrimary) return -1;
                if (!aIsPrimary && bIsPrimary) return 1;
                return (a.centreName || "").localeCompare(b.centreName || "");
            });

            setAssignedCentres(sortedList);

            if (sortedList.length > 0) {
                const userManuallySelected = sessionStorage.getItem("userManuallySelectedMarketingCentre");
                const savedCentre = sessionStorage.getItem("selectedMarketingCentre");

                let target = null;
                // If user manually switched the dropdown in this session, honor their selection
                if (userManuallySelected && savedCentre) {
                    target = sortedList.find(c => c._id?.toString() === savedCentre.toString());
                }

                // Otherwise, default directly to Primary Centre (Hazra H.O)
                if (!target) {
                    if (primaryId) {
                        target = sortedList.find(c => c._id?.toString() === primaryId.toString());
                    }
                    if (!target && primaryName) {
                        target = sortedList.find(c => c.centreName?.toLowerCase() === primaryName);
                    }
                    if (!target) {
                        target = sortedList.find(c => c.centreName?.toLowerCase().includes("hazra"));
                    }
                    if (!target) {
                        target = sortedList[0];
                    }
                }

                if (target) {
                    setSelectedCentreId(target._id);
                }
            }
        } catch (error) {
            console.error("Failed to load centres:", error);
            toast.error("Failed to load centres assigned to your profile.");
        } finally {
            setLoadingCentres(false);
        }
    }, [isSuperAdmin, currentUser]);

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
    const fetchHistory = useCallback(async (centreId, scope = historyScope) => {
        try {
            setLoadingHistory(true);
            const token = localStorage.getItem("token");
            let url = `${import.meta.env.VITE_API_URL}/operations/marketing`;
            if (scope === 'my') {
                url += `?myRequests=true`;
            } else if (scope === 'centre' && centreId) {
                url += `?centreId=${centreId}`;
            } else if (scope === 'all') {
                url += `?centreId=all`;
            } else if (centreId) {
                url += `?centreId=${centreId}`;
            }

            const res = await axios.get(url, {
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
    }, [historyScope]);

    // Trigger data loading when selectedCentreId or historyScope changes
    useEffect(() => {
        if (selectedCentreId) {
            sessionStorage.setItem("selectedMarketingCentre", selectedCentreId);
            fetchCentreBucket(selectedCentreId);
            fetchHistory(selectedCentreId, historyScope);
        } else if (historyScope === 'my' || historyScope === 'all') {
            fetchHistory(null, historyScope);
        }
    }, [selectedCentreId, historyScope, fetchCentreBucket, fetchHistory]);

    // Add Item to Requisition List (One by One)
    const handleAddStagedItem = () => {
        const qty = parseInt(formData.quantity, 10) || 0;
        if (qty <= 0) {
            toast.warning("Please specify a quantity greater than 0 before adding.");
            return;
        }

        if (formData.itemType === 'Books' && !formData.bookType) {
            toast.warning("Please select a Book Type (KTS Books or VSO Books).");
            return;
        }

        const effectiveItemType = formData.itemType === 'Books' ? (formData.bookType || 'KTS Books') : formData.itemType;
        const itemLabel = formData.itemType === 'Books'
            ? (formData.bookType === 'KTS Books' ? 'KTS Books (Key To Success)' : 'VSO Books (Vidyamandir Science Olympiad)')
            : formData.itemType;

        const existingIndex = stagedItems.findIndex(it => 
            it.itemType === effectiveItemType || (it.baseItem === formData.itemType && it.bookType === formData.bookType)
        );

        if (existingIndex >= 0) {
            const updated = [...stagedItems];
            updated[existingIndex].quantity += qty;
            if (formData.purpose && !updated[existingIndex].purpose) {
                updated[existingIndex].purpose = formData.purpose;
            }
            setStagedItems(updated);
            toast.info(`Updated quantity for ${itemLabel} to ${updated[existingIndex].quantity} Pcs`);
        } else {
            const newItem = {
                id: Date.now() + Math.random(),
                itemType: effectiveItemType,
                baseItem: formData.itemType,
                bookType: formData.itemType === 'Books' ? formData.bookType : "",
                displayName: itemLabel,
                quantity: qty,
                purpose: formData.purpose || ""
            };
            setStagedItems(prev => [...prev, newItem]);
            toast.success(`Added ${itemLabel} (${qty} Pcs) to requisition list!`);
        }

        setFormData(prev => ({
            ...prev,
            quantity: "",
            purpose: ""
        }));
    };

    // Remove Item from Requisition List
    const handleRemoveStagedItem = (id) => {
        setStagedItems(prev => prev.filter(it => it.id !== id));
    };

    // Submit Requisition Request (Places all staged items at once)
    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (!selectedCentreId) {
            toast.warning("Please select a valid assigned centre.");
            return;
        }

        let itemsToSubmit = [...stagedItems];

        // If the user has also typed something into the input without clicking "+ Add", include it
        const currentQty = parseInt(formData.quantity, 10) || 0;
        if (currentQty > 0) {
            if (formData.itemType === 'Books' && !formData.bookType) {
                toast.warning("Please select a Book Type (KTS Books or VSO Books).");
                return;
            }
            const effectiveItemType = formData.itemType === 'Books' ? (formData.bookType || 'KTS Books') : formData.itemType;
            const itemLabel = formData.itemType === 'Books'
                ? (formData.bookType === 'KTS Books' ? 'KTS Books (Key To Success)' : 'VSO Books (Vidyamandir Science Olympiad)')
                : formData.itemType;

            const existingIndex = itemsToSubmit.findIndex(it => 
                it.itemType === effectiveItemType || (it.baseItem === formData.itemType && it.bookType === formData.bookType)
            );

            if (existingIndex >= 0) {
                itemsToSubmit[existingIndex].quantity += currentQty;
            } else {
                itemsToSubmit.push({
                    id: Date.now(),
                    itemType: effectiveItemType,
                    baseItem: formData.itemType,
                    bookType: formData.itemType === 'Books' ? formData.bookType : "",
                    displayName: itemLabel,
                    quantity: currentQty,
                    purpose: formData.purpose || ""
                });
            }
        }

        if (itemsToSubmit.length === 0) {
            toast.warning("Please add at least one material to submit requisition request.");
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem("token");

            const payload = {
                centreId: selectedCentreId,
                items: itemsToSubmit.map(it => ({
                    itemType: it.itemType,
                    bookType: it.bookType,
                    quantity: it.quantity,
                    purpose: it.purpose || formData.purpose || ""
                })),
                purpose: formData.purpose || ""
            };

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/operations/marketing`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success(`Requisition request for ${itemsToSubmit.length} material${itemsToSubmit.length > 1 ? 's' : ''} placed successfully to Hazra HO!`);
                setStagedItems([]);
                setFormData({ itemType: "Leaflets", bookType: "", quantity: "", purpose: "" });
                fetchHistory(selectedCentreId, historyScope);
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

        let initialItemType = "Leaflets";
        let initialBookType = "";
        let initialQty = "";

        if (req.ktsBooks > 0) {
            initialItemType = "Books";
            initialBookType = "KTS Books";
            initialQty = req.ktsBooks;
        } else if (req.vsoBooks > 0) {
            initialItemType = "Books";
            initialBookType = "VSO Books";
            initialQty = req.vsoBooks;
        } else if (req.books > 0) {
            initialItemType = "Books";
            initialBookType = req.bookType || "KTS Books";
            initialQty = req.books;
        } else if (req.bags > 0) {
            initialItemType = "Bags";
            initialQty = req.bags;
        } else if (req.tshirts > 0) {
            initialItemType = "T-Shirts";
            initialQty = req.tshirts;
        } else if (req.banners > 0 && (!req.leaflets || req.leaflets === 0)) {
            initialItemType = "Banners";
            initialQty = req.banners;
        } else if (req.leaflets > 0) {
            initialItemType = "Leaflets";
            initialQty = req.leaflets;
        } else if (req.itemType) {
            const low = req.itemType.toLowerCase();
            if (low.includes("kts")) {
                initialItemType = "Books";
                initialBookType = "KTS Books";
            } else if (low.includes("vso")) {
                initialItemType = "Books";
                initialBookType = "VSO Books";
            } else if (low.includes("bag")) {
                initialItemType = "Bags";
            } else if (low.includes("tshirt") || low.includes("t-shirt")) {
                initialItemType = "T-Shirts";
            } else if (low.includes("banner")) {
                initialItemType = "Banners";
            }
            initialQty = req.quantity || "";
        }

        setEditForm({
            itemType: initialItemType,
            bookType: initialBookType,
            quantity: initialQty,
            purpose: req.purpose || ""
        });
        setEditModalOpen(true);
    };

    // Save Edited Requisition
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!selectedReqForEdit) return;

        const qty = parseInt(editForm.quantity, 10) || 0;
        if (qty <= 0) {
            toast.warning("Please specify a quantity greater than 0.");
            return;
        }

        if (editForm.itemType === 'Books' && !editForm.bookType) {
            toast.warning("Please select a Book Type (KTS Books or VSO Books).");
            return;
        }

        try {
            setSavingEdit(true);
            const token = localStorage.getItem("token");
            const effectiveItemType = editForm.itemType === 'Books' ? (editForm.bookType || 'KTS Books') : editForm.itemType;
            const payload = {
                itemType: effectiveItemType,
                bookType: editForm.itemType === 'Books' ? editForm.bookType : "",
                quantity: qty,
                leaflets: editForm.itemType === 'Leaflets' ? qty : 0,
                banners: editForm.itemType === 'Banners' ? qty : 0,
                bags: editForm.itemType === 'Bags' ? qty : 0,
                tshirts: editForm.itemType === 'T-Shirts' ? qty : 0,
                ktsBooks: (editForm.itemType === 'Books' && editForm.bookType === 'KTS Books') ? qty : 0,
                vsoBooks: (editForm.itemType === 'Books' && editForm.bookType === 'VSO Books') ? qty : 0,
                purpose: editForm.purpose
            };

            const res = await axios.put(`${import.meta.env.VITE_API_URL}/operations/marketing/requisitions/${selectedReqForEdit._id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success("Requisition updated successfully! Updated details are now visible in Marketing Approval.");
                setEditModalOpen(false);
                setSelectedReqForEdit(null);
                fetchHistory(selectedCentreId, historyScope);
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
        const itemLabel = req.itemType || (req.leaflets > 0 ? `${req.leaflets} Leaflets` : '') || (req.banners > 0 ? `${req.banners} Banners` : '') || 'items';
        const confirmMsg = `Are you sure you want to delete this requisition for ${req.centreName || 'Centre'} (${itemLabel})?`;
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
                fetchHistory(selectedCentreId, historyScope);
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
                (item.destinationCentreName && item.destinationCentreName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.requestedBy?.name && item.requestedBy.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
                                    onChange={(e) => {
                                        setSelectedCentreId(e.target.value);
                                        sessionStorage.setItem("userManuallySelectedMarketingCentre", "true");
                                        sessionStorage.setItem("selectedMarketingCentre", e.target.value);
                                    }}
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

                    {/* In-Hand Materials Stock Overview Strip */}
                    <div className={`mt-4 p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${cardBg}`}>
                        <div className="flex items-center gap-2">
                            <FaBoxes className="text-orange-500 text-sm" />
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Additional In-Hand Materials:
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
                                <FaShoppingBag className="text-teal-400" />
                                <span className="text-gray-400 font-semibold">Bags:</span>
                                <strong className="font-black text-teal-400">{(bucketData.bags || 0).toLocaleString()}</strong>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                                <FaTshirt className="text-rose-400" />
                                <span className="text-gray-400 font-semibold">T-Shirts:</span>
                                <strong className="font-black text-rose-400">{(bucketData.tshirts || 0).toLocaleString()}</strong>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                                <FaBookOpen className="text-amber-500" />
                                <span className="text-gray-400 font-semibold">KTS Books:</span>
                                <strong className="font-black text-amber-500">{(bucketData.ktsBooks || 0).toLocaleString()}</strong>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                                <FaBookmark className="text-purple-400" />
                                <span className="text-gray-400 font-semibold">VSO Books:</span>
                                <strong className="font-black text-purple-400">{(bucketData.vsoBooks || 0).toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* 2. REQUISITION REQUEST FORM (SIMPLE DROPDOWN FORM) */}
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
                                Select material from dropdown and enter required quantity to be dispatched by Head Office.
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            {/* Dropdown 1: Select Material */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Requisition Item / Material <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        name="itemType"
                                        value={formData.itemType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData(prev => ({
                                                ...prev,
                                                itemType: val,
                                                bookType: val === "Books" ? (prev.bookType || "KTS Books") : "",
                                                quantity: ""
                                            }));
                                        }}
                                        className={`w-full p-3.5 pr-10 rounded-2xl font-bold text-sm outline-none border transition-all cursor-pointer appearance-none ${inputBg}`}
                                    >
                                        <option value="Leaflets">Leaflets</option>
                                        <option value="Banners">Banners</option>
                                        <option value="Bags">Bags</option>
                                        <option value="T-Shirts">T-Shirts</option>
                                        <option value="Books">Books (KTS / VSO)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <FaChevronDown className="text-xs" />
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5">
                                    {formData.itemType === 'Leaflets' && 'Promotional handbills for student outreach'}
                                    {formData.itemType === 'Banners' && 'Display flex banners & signage for centres'}
                                    {formData.itemType === 'Bags' && 'Pathfinder branded student bags'}
                                    {formData.itemType === 'T-Shirts' && 'Pathfinder promotional T-shirts'}
                                    {formData.itemType === 'Books' && 'Choose book sub-section (KTS Books / VSO Books) below'}
                                </p>
                            </div>

                            {/* Dropdown 2: Book Type (Sub Section - ONLY shown when Books is selected) */}
                            {formData.itemType === "Books" && (
                                <div className="animate-in fade-in zoom-in-95 duration-200">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
                                        <FaBook className="text-xs" />
                                        <span>Book Type (Sub-Section) <span className="text-red-500">*</span></span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            name="bookType"
                                            value={formData.bookType}
                                            onChange={(e) => setFormData(prev => ({ ...prev, bookType: e.target.value }))}
                                            className={`w-full p-3.5 pr-10 rounded-2xl font-bold text-sm outline-none border-2 border-amber-500/50 bg-amber-500/5 transition-all cursor-pointer appearance-none ${
                                                isDarkMode ? 'text-amber-400' : 'text-amber-700'
                                            }`}
                                        >
                                            <option value="KTS Books">KTS Books (Key To Success)</option>
                                            <option value="VSO Books">VSO Books (Vidyamandir Science Olympiad)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500">
                                            <FaChevronDown className="text-xs" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-semibold">
                                        <FaInfoCircle className="flex-shrink-0" />
                                        <span>Separate requisition will be created for each book type.</span>
                                    </div>
                                </div>
                            )}

                            {/* Quantity Input and Add Button */}
                            <div className={formData.itemType === "Books" ? "col-span-1" : "md:col-span-1"}>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Quantity Required (Pcs) <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1 flex items-center">
                                        <input
                                            type="number"
                                            name="quantity"
                                            placeholder="Enter quantity (e.g. 500)"
                                            value={formData.quantity}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    quantity: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0)
                                                }));
                                            }}
                                            min="1"
                                            step="1"
                                            className={`w-full p-3.5 pr-12 rounded-2xl font-black text-lg outline-none border transition-all ${inputBg}`}
                                        />
                                        <span className="absolute right-3 text-xs font-black uppercase tracking-wider text-gray-400">
                                            Pcs
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddStagedItem}
                                        className="px-4 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 active:scale-95 shrink-0"
                                        title="Add this material to your requisition list"
                                    >
                                        <FaPlus />
                                        <span>Add Item</span>
                                    </button>
                                </div>

                                {/* Preset Chips */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {(formData.itemType === 'Leaflets' ? [500, 1000, 2000, 5000] :
                                      formData.itemType === 'Banners' ? [2, 5, 10, 20] :
                                      [25, 50, 100, 200]).map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, quantity: val }))}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                                Number(formData.quantity) === val 
                                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
                                                : isDarkMode ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                                            }`}
                                        >
                                            {val} Pcs
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Staged Items List - Add one by one, place at once */}
                        {stagedItems.length > 0 && (
                            <div className="mb-6 p-4 md:p-5 rounded-2xl bg-orange-500/5 border-2 border-dashed border-orange-500/30 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-orange-500/20">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-xl bg-orange-500 text-white font-black text-xs">
                                            {stagedItems.length} {stagedItems.length === 1 ? 'Material' : 'Materials'} Added
                                        </span>
                                        <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Ready to place at once ({stagedItems.reduce((acc, it) => acc + (it.quantity || 0), 0).toLocaleString()} Total Pcs)
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStagedItems([])}
                                        className="text-xs text-red-400 hover:text-red-500 font-bold transition-all"
                                    >
                                        Clear List
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stagedItems.map((item) => (
                                        <div key={item.id} className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                            <div className="min-w-0">
                                                <div className="font-black text-sm text-orange-400 truncate">
                                                    {item.displayName}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 font-black text-xs border border-orange-500/20">
                                                        {Number(item.quantity).toLocaleString()} Pcs
                                                    </span>
                                                    {item.purpose && (
                                                        <span className="text-[11px] text-gray-400 truncate max-w-[120px]" title={item.purpose}>
                                                            {item.purpose}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveStagedItem(item.id)}
                                                className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                                                title="Remove this item"
                                            >
                                                <FaTrash className="text-xs" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                                className={`w-full p-4 rounded-2xl outline-none border text-sm transition-all ${inputBg}`}
                            />
                        </div>

                        {/* Summary & Submit Button Row */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800/80">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                {stagedItems.length > 0 ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                        <span>Ready to place:</span>
                                        <strong className="text-sm font-black">{stagedItems.length} Materials</strong>
                                        <span>({stagedItems.reduce((acc, it) => acc + (it.quantity || 0), 0).toLocaleString()} Total Pcs)</span>
                                    </span>
                                ) : Number(formData.quantity) > 0 ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                        <span>Requesting:</span>
                                        <strong className="text-sm font-black">{Number(formData.quantity).toLocaleString()} Pcs</strong>
                                        <span>of {formData.itemType === 'Books' ? (formData.bookType || 'Books') : formData.itemType}</span>
                                    </span>
                                ) : (
                                    <span>Add materials one by one and place the requisition request at once.</span>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || (!selectedCentreId) || (stagedItems.length === 0 && ((parseInt(formData.quantity, 10) || 0) <= 0 || (formData.itemType === 'Books' && !formData.bookType)))}
                                className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 cursor-pointer"
                            >
                                <FaPaperPlane className={isSubmitting ? 'animate-bounce' : ''} />
                                <span>
                                    {isSubmitting 
                                        ? 'Submitting to Hazra HO...' 
                                        : stagedItems.length > 0 
                                            ? `Place Requisition Request at Once (${stagedItems.length} Materials)` 
                                            : 'Place Requisition Request'}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* 3. REQUISITION HISTORY TABLE */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                <div className={`rounded-3xl p-6 md:p-8 border transition-all ${cardBg}`}>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                <FaHistory className="text-lg" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-black">Requisition History</h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                        {filteredHistory.length}
                                    </span>
                                </div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {historyScope === 'my' 
                                        ? `Showing requisitions submitted through your profile (${currentUser.name || 'You'}) across all centres`
                                        : historyScope === 'all'
                                        ? "Showing requisitions submitted across all centres in the organization"
                                        : `Status of all material requisition requests submitted for ${currentCentreObj?.centreName || 'Selected Centre'}`
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Scope Selector and Status Filter Tabs */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                            {/* Scope Selector */}
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHistoryScope("my");
                                        fetchHistory(selectedCentreId, "my");
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        historyScope === 'my' 
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' 
                                        : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                                    }`}
                                >
                                    <FaUserTie className="text-[11px]" />
                                    <span>My Submissions</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setHistoryScope("centre");
                                        fetchHistory(selectedCentreId, "centre");
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        historyScope === 'centre' 
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' 
                                        : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                                    }`}
                                >
                                    <FaBuilding className="text-[11px]" />
                                    <span>{currentCentreObj?.centreName || 'Centre'}</span>
                                </button>

                                {isSuperAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHistoryScope("all");
                                            fetchHistory(selectedCentreId, "all");
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            historyScope === 'all' 
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' 
                                            : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                                        }`}
                                    >
                                        <FaGlobe className="text-[11px]" />
                                        <span>All Centres</span>
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                                {['all', 'Pending', 'Approved', 'Rejected'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setStatusFilter(st)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            statusFilter === st 
                                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm' 
                                            : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                                        }`}
                                    >
                                        {st === 'all' ? 'All' : st}
                                    </button>
                                ))}
                            </div>
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
                                        <th className="p-4">Requested By</th>
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

                                            {/* Requested By */}
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs uppercase">
                                                        {(req.requestedBy?.name || req.user?.name || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-xs flex items-center gap-1.5">
                                                            <span>{req.requestedBy?.name || req.user?.name || "Unknown"}</span>
                                                            {((req.requestedBy?._id || req.requestedBy || req.user?._id || req.user)?.toString() === (currentUser._id || currentUser.id)?.toString()) && (
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 capitalize">
                                                            {req.requestedBy?.role || req.user?.role || "Staff"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Requested Items */}
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    {req.ktsBooks > 0 && (
                                                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                                                            <FaBookOpen className="text-[11px]" />
                                                            {req.ktsBooks.toLocaleString()} KTS Books
                                                        </span>
                                                    )}
                                                    {req.vsoBooks > 0 && (
                                                        <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                                            <FaBookmark className="text-[11px]" />
                                                            {req.vsoBooks.toLocaleString()} VSO Books
                                                        </span>
                                                    )}
                                                    {(!req.ktsBooks && !req.vsoBooks && req.books > 0) && (
                                                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                                                            <FaBook className="text-[11px]" />
                                                            {req.books.toLocaleString()} Books {req.bookType ? `(${req.bookType})` : ''}
                                                        </span>
                                                    )}
                                                    {req.bags > 0 && (
                                                        <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                                                            <FaShoppingBag className="text-[11px]" />
                                                            {req.bags.toLocaleString()} Bags
                                                        </span>
                                                    )}
                                                    {req.tshirts > 0 && (
                                                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
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
                                                    {(!req.ktsBooks && !req.vsoBooks && !req.books && !req.bags && !req.tshirts && !req.leaflets && !req.banners && req.quantity > 0) && (
                                                        <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                                            <FaBoxes className="text-[11px]" />
                                                            {req.quantity.toLocaleString()} {req.itemType || 'Pcs'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Approved Items */}
                                            <td className="p-4">
                                                {req.status === 'Approved' ? (
                                                    <div className="flex flex-col gap-1">
                                                        {req.approvedKtsBooks > 0 && (
                                                            <span className="text-xs font-black text-green-500 flex items-center gap-1">
                                                                <FaBookOpen className="text-[10px]" />
                                                                {req.approvedKtsBooks.toLocaleString()} KTS Books
                                                            </span>
                                                        )}
                                                        {req.approvedVsoBooks > 0 && (
                                                            <span className="text-xs font-black text-green-500 flex items-center gap-1">
                                                                <FaBookmark className="text-[10px]" />
                                                                {req.approvedVsoBooks.toLocaleString()} VSO Books
                                                            </span>
                                                        )}
                                                        {req.approvedBags > 0 && (
                                                            <span className="text-xs font-black text-green-500 flex items-center gap-1">
                                                                <FaShoppingBag className="text-[10px]" />
                                                                {req.approvedBags.toLocaleString()} Bags
                                                            </span>
                                                        )}
                                                        {req.approvedTshirts > 0 && (
                                                            <span className="text-xs font-black text-green-500 flex items-center gap-1">
                                                                <FaTshirt className="text-[10px]" />
                                                                {req.approvedTshirts.toLocaleString()} T-Shirts
                                                            </span>
                                                        )}
                                                        {req.approvedLeaflets > 0 && (
                                                            <span className="text-xs font-black text-green-500 flex items-center gap-1">
                                                                <FaRegNewspaper className="text-[10px]" />
                                                                {req.approvedLeaflets.toLocaleString()} Leaflets
                                                            </span>
                                                        )}
                                                        {req.approvedBanners > 0 && (
                                                            <span className="text-xs font-black text-green-500 flex items-center gap-1">
                                                                <FaRegImage className="text-[10px]" />
                                                                {req.approvedBanners.toLocaleString()} Banners
                                                            </span>
                                                        )}
                                                        {(!req.approvedKtsBooks && !req.approvedVsoBooks && !req.approvedBags && !req.approvedTshirts && !req.approvedLeaflets && !req.approvedBanners && req.approvedQuantity > 0) && (
                                                            <span className="text-xs font-black text-green-500">
                                                                {req.approvedQuantity.toLocaleString()} {req.itemType || 'Pcs'}
                                                            </span>
                                                        )}
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
                                <div className="space-y-4">
                                    {/* Material Item Dropdown */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-orange-500 mb-1.5">
                                            Material Item
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={editForm.itemType}
                                                onChange={(e) => {
                                                    const nextItem = e.target.value;
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        itemType: nextItem,
                                                        bookType: nextItem === 'Books' ? (prev.bookType || 'KTS Books') : ''
                                                    }));
                                                }}
                                                className={`w-full p-3 rounded-xl border text-sm font-semibold outline-none appearance-none transition-all ${inputBg}`}
                                            >
                                                {MATERIAL_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value} className={isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                <FaChevronDown className="text-xs" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Books Sub-section Dropdown */}
                                    {editForm.itemType === 'Books' && (
                                        <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-amber-500">
                                                    Book Category <span className="text-red-500">*</span>
                                                </label>
                                                <span className="text-[11px] font-bold text-amber-400/90">
                                                    Separate Requisition
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <select
                                                    value={editForm.bookType}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, bookType: e.target.value }))}
                                                    className={`w-full p-2.5 rounded-xl border text-sm font-semibold outline-none appearance-none transition-all ${inputBg}`}
                                                >
                                                    {BOOK_SUBTYPES.map(st => (
                                                        <option key={st.value} value={st.value} className={isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                                                            {st.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-amber-400">
                                                    <FaChevronDown className="text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                            Quantity Required ({MATERIAL_OPTIONS.find(m => m.id === editForm.itemType)?.unit || 'Pcs'})
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="Enter required quantity..."
                                            value={editForm.quantity}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditForm(prev => ({
                                                    ...prev,
                                                    quantity: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0)
                                                }));
                                            }}
                                            className={`w-full p-3 rounded-xl text-left font-black text-lg outline-none border transition-all ${inputBg}`}
                                        />
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
