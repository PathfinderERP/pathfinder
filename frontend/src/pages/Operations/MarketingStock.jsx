import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { 
    FaWarehouse, FaBoxes, FaPlusCircle, FaEdit, 
    FaSync, FaSearch, FaHistory, FaCheckCircle, 
    FaRegNewspaper, FaRegImage, FaShoppingBag, FaTshirt, 
    FaBookOpen, FaBookmark, FaTruckLoading, FaExchangeAlt, 
    FaBuilding, FaUserTie, FaCalendarAlt, FaTimes, FaListAlt, FaEye
} from 'react-icons/fa';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CustomMultiSelect from '../../components/common/CustomMultiSelect';

const MATERIAL_FILTER_OPTIONS = [
    { value: "Leaflets", label: "Leaflets" },
    { value: "Banners", label: "Banners" },
    { value: "Bags", label: "Bags" },
    { value: "T-Shirts", label: "T-Shirts" },
    { value: "KTS Books", label: "KTS Books" },
    { value: "VSO Books", label: "VSO Books" }
];

const MATERIALS_CONFIG = [
    { key: "leaflets", name: "Leaflets", label: "Leaflets", icon: FaRegNewspaper, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", desc: "Promotional handbills & flyers" },
    { key: "banners", name: "Banners", label: "Banners", icon: FaRegImage, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", desc: "Flex banners, standees & posters" },
    { key: "bags", name: "Bags", label: "Bags", icon: FaShoppingBag, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30", desc: "Promotional student backpacks" },
    { key: "tshirts", name: "T-Shirts", label: "T-Shirts", icon: FaTshirt, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", desc: "Branded promotional T-shirts" },
    { key: "ktsBooks", name: "KTS Books", label: "KTS Books", icon: FaBookOpen, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", desc: "Key To Success series books" },
    { key: "vsoBooks", name: "VSO Books", label: "VSO Books", icon: FaBookmark, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", desc: "Vidyamandir Science Olympiad books" }
];

// Strict material matching helper to prevent substring collision (e.g., leaflets matching t-shirts)
const matchesMaterial = (materialStr, key) => {
    if (!materialStr || !key) return false;
    const s = String(materialStr).toLowerCase().replace(/[-_\s]+/g, '');
    const k = String(key).toLowerCase().replace(/[-_\s]+/g, '');
    
    if (k === 'leaflets' || k === 'leaflet') {
        return s.includes('leaflet');
    }
    if (k === 'banners' || k === 'banner') {
        return s.includes('banner');
    }
    if (k === 'bags' || k === 'bag') {
        return s.includes('bag');
    }
    if (k === 'tshirts' || k === 'tshirt') {
        return s.includes('tshirt') || s.includes('t-shirt');
    }
    if (k === 'ktsbooks' || k === 'kts') {
        return s.includes('kts');
    }
    if (k === 'vsobooks' || k === 'vso') {
        return s.includes('vso');
    }
    return false;
};

const MarketingStock = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Stock & Hazra Centre state
    const [hazraCentre, setHazraCentre] = useState(null);
    const [stock, setStock] = useState({
        leaflets: 0,
        banners: 0,
        bags: 0,
        tshirts: 0,
        ktsBooks: 0,
        vsoBooks: 0,
        lastUpdated: null
    });
    const [stats, setStats] = useState({
        totalUnitsInStock: 0,
        totalStockIn: 0,
        totalDispatched: 0,
        totalApprovedRequisitions: 0
    });
    const [loadingStock, setLoadingStock] = useState(true);

    // Active View Tab: Default is "consolidatedReport" as requested by user
    const [activeTab, setActiveTab] = useState("consolidatedReport"); // "consolidatedReport" | "centreReport" | "dispatchesLog" | "stockInHistory"

    // Material Breakdown Modal
    const [selectedMaterialBreakdown, setSelectedMaterialBreakdown] = useState(null);
    const [materialBreakdownModalOpen, setMaterialBreakdownModalOpen] = useState(false);

    // Centre-Wise Report state
    const [centreReport, setCentreReport] = useState([]);
    const [reportSummary, setReportSummary] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [centreSearch, setCentreSearch] = useState("");
    const [selectedMaterials, setSelectedMaterials] = useState([]);

    // Selected Centre for View Details Modal
    const [selectedCentreDetails, setSelectedCentreDetails] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);

    // Dispatches history list & Stock movements
    const [movements, setMovements] = useState([]);
    const [loadingMovements, setLoadingMovements] = useState(false);
    const [movementSearch, setMovementSearch] = useState("");

    // Set Stock Modal state
    const [setStockModalOpen, setSetStockModalOpen] = useState(false);
    const [setStockForm, setSetStockForm] = useState({
        leaflets: 0,
        banners: 0,
        bags: 0,
        tshirts: 0,
        ktsBooks: 0,
        vsoBooks: 0,
        remarks: ""
    });
    const [savingStock, setSavingStock] = useState(false);

    // Stock In Modal state
    const [stockInModalOpen, setStockInModalOpen] = useState(false);
    const [stockInForm, setStockInForm] = useState({
        material: "Leaflets",
        quantity: "",
        sourceOrVendor: "",
        remarks: ""
    });
    const [savingStockIn, setSavingStockIn] = useState(false);

    // 1. Fetch Hazra Stock & Summary
    const fetchHazraStock = useCallback(async () => {
        setLoadingStock(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing-stock`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                setHazraCentre(res.data.centre);
                setStock(res.data.stock || {});
                setStats(res.data.stats || {});
            }
        } catch (error) {
            console.error("Error fetching Hazra stock:", error);
            toast.error(error.response?.data?.message || "Failed to load Hazra central stock");
        } finally {
            setLoadingStock(false);
        }
    }, []);

    // 2. Fetch Centre-Wise Report (Which centres materials have been sent to)
    const fetchCentreReport = useCallback(async () => {
        setLoadingReport(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing-stock/centre-report`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                setCentreReport(res.data.data || []);
                setReportSummary(res.data.summary || null);
                return;
            }
        } catch {
            // Resilient fallback: Query approved requisitions directly to render report without waiting for server restart
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing?status=Approved`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const reqs = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
                const map = new Map();
                reqs.filter(r => r.status === 'Approved').forEach(r => {
                    const cName = r.centreName || r.centre?.centreName || "Centre";
                    if (cName.toLowerCase().includes("hazra")) return;
                    const cId = r.centre?._id || r.centre || cName;
                    if (!map.has(cId)) {
                        map.set(cId, {
                            centreId: cId,
                            centreName: cName,
                            centreCode: r.centre?.centreCode || "",
                            location: r.centre?.location || "",
                            leaflets: 0,
                            banners: 0,
                            bags: 0,
                            tshirts: 0,
                            ktsBooks: 0,
                            vsoBooks: 0,
                            totalUnits: 0,
                            approvedRequisitionsCount: 0,
                            lastDispatchedAt: r.approvedAt || r.updatedAt,
                            dispatches: []
                        });
                    }
                    const item = map.get(cId);
                    const l = r.approvedLeaflets || 0;
                    const bn = r.approvedBanners || 0;
                    const bg = r.approvedBags || 0;
                    const t = r.approvedTshirts || 0;
                    const k = r.approvedKtsBooks || 0;
                    const v = r.approvedVsoBooks || 0;
                    const tot = (l + bn + bg + t + k + v) || r.approvedQuantity || 0;
                    item.leaflets += l;
                    item.banners += bn;
                    item.bags += bg;
                    item.tshirts += t;
                    item.ktsBooks += k;
                    item.vsoBooks += v;
                    item.totalUnits += tot;
                    item.approvedRequisitionsCount += 1;
                    item.dispatches.push({
                        requisitionId: r._id,
                        approvedAt: r.approvedAt,
                        leaflets: l, banners: bn, bags: bg, tshirts: t, ktsBooks: k, vsoBooks: v, totalUnits: tot,
                        purpose: r.purpose,
                        approvedBy: r.approvedBy ? { name: r.approvedBy.name, role: r.approvedBy.role } : null
                    });
                });
                const arr = Array.from(map.values()).sort((a, b) => b.totalUnits - a.totalUnits);
                setCentreReport(arr);
                setReportSummary({
                    totalCentresServed: arr.length,
                    totalLeafletsSent: arr.reduce((acc, c) => acc + c.leaflets, 0),
                    totalBannersSent: arr.reduce((acc, c) => acc + c.banners, 0),
                    totalBagsSent: arr.reduce((acc, c) => acc + c.bags, 0),
                    totalTshirtsSent: arr.reduce((acc, c) => acc + c.tshirts, 0),
                    totalKtsBooksSent: arr.reduce((acc, c) => acc + c.ktsBooks, 0),
                    totalVsoBooksSent: arr.reduce((acc, c) => acc + c.vsoBooks, 0),
                    totalUnitsSent: arr.reduce((acc, c) => acc + c.totalUnits, 0),
                    totalRequisitionsApproved: reqs.filter(r => r.status === 'Approved').length
                });
            } catch (err2) {
                console.error("Error fetching centre report fallback:", err2);
            }
        } finally {
            setLoadingReport(false);
        }
    }, []);

    // 3. Fetch Stock Movements / Audit History
    const fetchMovements = useCallback(async () => {
        setLoadingMovements(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing-stock/movements`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                setMovements(res.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching movements:", error);
        } finally {
            setLoadingMovements(false);
        }
    }, []);

    useEffect(() => {
        fetchHazraStock();
        fetchCentreReport();
        fetchMovements();
    }, [fetchHazraStock, fetchCentreReport, fetchMovements]);

    // Open Set Current Stock Modal
    const handleOpenSetStock = () => {
        setSetStockForm({
            leaflets: stock.leaflets || 0,
            banners: stock.banners || 0,
            bags: stock.bags || 0,
            tshirts: stock.tshirts || 0,
            ktsBooks: stock.ktsBooks || 0,
            vsoBooks: stock.vsoBooks || 0,
            remarks: "Physical baseline stock update"
        });
        setSetStockModalOpen(true);
    };

    // Save Set Stock
    const handleSaveSetStock = async (e) => {
        e.preventDefault();
        setSavingStock(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/operations/marketing-stock/set-stock`, setStockForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                toast.success(res.data.message || "Stock baseline updated successfully!");
                setSetStockModalOpen(false);
                fetchHazraStock();
                fetchMovements();
            }
        } catch (error) {
            console.error("Error saving stock:", error);
            toast.error(error.response?.data?.message || "Failed to update stock");
        } finally {
            setSavingStock(false);
        }
    };

    // Open Stock In Modal
    const handleOpenStockIn = (materialName = "Leaflets") => {
        setStockInForm({
            material: materialName,
            quantity: "",
            sourceOrVendor: "",
            remarks: ""
        });
        setStockInModalOpen(true);
    };

    // Save Stock In
    const handleSaveStockIn = async (e) => {
        e.preventDefault();
        const qty = parseInt(stockInForm.quantity, 10);
        if (!qty || qty <= 0) {
            toast.warning("Please enter a valid quantity greater than 0");
            return;
        }

        setSavingStockIn(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/operations/marketing-stock/stock-in`, stockInForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                toast.success(res.data.message || "New stock in added successfully!");
                setStockInModalOpen(false);
                fetchHazraStock();
                fetchMovements();
            }
        } catch (error) {
            console.error("Error adding stock in:", error);
            toast.error(error.response?.data?.message || "Failed to record stock in");
        } finally {
            setSavingStockIn(false);
        }
    };

    // Filtered Centre Report (filtered by search and selected materials)
    const filteredCentreReport = useMemo(() => {
        let list = centreReport;

        if (selectedMaterials && selectedMaterials.length > 0) {
            const selectedKeys = selectedMaterials.map(m => (m.value || m).toLowerCase());
            list = list.map(c => {
                let dynamicTotal = 0;
                let hasAny = false;

                if (selectedKeys.some(k => k.includes('leaflet'))) {
                    dynamicTotal += (c.leaflets || 0);
                    if ((c.leaflets || 0) > 0) hasAny = true;
                }
                if (selectedKeys.some(k => k.includes('banner'))) {
                    dynamicTotal += (c.banners || 0);
                    if ((c.banners || 0) > 0) hasAny = true;
                }
                if (selectedKeys.some(k => k.includes('bag'))) {
                    dynamicTotal += (c.bags || 0);
                    if ((c.bags || 0) > 0) hasAny = true;
                }
                if (selectedKeys.some(k => k.includes('tshirt') || k.includes('t-shirt'))) {
                    dynamicTotal += (c.tshirts || 0);
                    if ((c.tshirts || 0) > 0) hasAny = true;
                }
                if (selectedKeys.some(k => k.includes('kts'))) {
                    dynamicTotal += (c.ktsBooks || 0);
                    if ((c.ktsBooks || 0) > 0) hasAny = true;
                }
                if (selectedKeys.some(k => k.includes('vso'))) {
                    dynamicTotal += (c.vsoBooks || 0);
                    if ((c.vsoBooks || 0) > 0) hasAny = true;
                }

                return {
                    ...c,
                    totalUnits: dynamicTotal,
                    hasAny
                };
            }).filter(c => c.hasAny);
        }

        if (!centreSearch) return list;
        const q = centreSearch.toLowerCase();
        return list.filter(c => 
            (c.centreName || "").toLowerCase().includes(q) ||
            (c.centreCode || "").toLowerCase().includes(q) ||
            (c.location || "").toLowerCase().includes(q)
        );
    }, [centreReport, centreSearch, selectedMaterials]);

    // Dynamic summary banner calculation based on active filters
    const dynamicSummary = useMemo(() => {
        const totalCentresServed = filteredCentreReport.length;
        const totalUnitsSent = filteredCentreReport.reduce((acc, c) => acc + (c.totalUnits || 0), 0);
        const totalRequisitionsApproved = filteredCentreReport.reduce((acc, c) => acc + (c.approvedRequisitionsCount || 0), 0);
        return {
            totalCentresServed,
            totalUnitsSent,
            totalRequisitionsApproved
        };
    }, [filteredCentreReport]);

    // Detailed stats per material (Added, Dispatched, Remaining)
    const materialStatsMap = useMemo(() => {
        const statsObj = {};

        MATERIALS_CONFIG.forEach(item => {
            // Total Dispatched from centreReport
            let totalDispatched = 0;
            let centresCount = 0;
            const centreBreakdown = [];

            centreReport.forEach(c => {
                const qty = c[item.key] || 0;
                if (qty > 0) {
                    totalDispatched += qty;
                    centresCount += 1;
                    centreBreakdown.push({
                        centreName: c.centreName,
                        centreCode: c.centreCode,
                        quantity: qty,
                        lastSent: c.lastDispatchedAt
                    });
                }
            });

            // Total Stock In from movements using strict matchesMaterial
            let totalStockIn = 0;
            movements.filter(m => m.movementType === 'STOCK_IN').forEach(m => {
                if (Array.isArray(m.items) && m.items.length > 0) {
                    m.items.forEach(it => {
                        if (matchesMaterial(it.material, item.key)) {
                            totalStockIn += (it.quantity || 0);
                        }
                    });
                } else if (m.material) {
                    if (matchesMaterial(m.material, item.key)) {
                        totalStockIn += (m.quantity || 0);
                    }
                }
            });

            centreBreakdown.sort((a, b) => b.quantity - a.quantity);

            // Available main stock = Math.max(0, Total Stock In - Total Dispatched)
            const currentStock = Math.max(0, totalStockIn - totalDispatched);

            statsObj[item.key] = {
                currentStock,
                totalStockIn,
                totalDispatched,
                centresSupplied: centresCount,
                requisitionsApproved: centreBreakdown.length,
                centreBreakdown,
                status: currentStock > 50 ? 'In Stock' : (currentStock > 0 ? 'Low Stock' : 'Out of Stock')
            };
        });

        return statsObj;
    }, [centreReport, movements]);

    // Overall dynamic calculations synchronized across stock in and dispatches
    const totalCentralStockCalc = useMemo(() => {
        return Object.values(materialStatsMap).reduce((acc, m) => acc + (m.currentStock || 0), 0);
    }, [materialStatsMap]);

    const totalStockInCalc = useMemo(() => {
        return Object.values(materialStatsMap).reduce((acc, m) => acc + (m.totalStockIn || 0), 0);
    }, [materialStatsMap]);

    const totalSentToCentresCalc = useMemo(() => {
        return Object.values(materialStatsMap).reduce((acc, m) => acc + (m.totalDispatched || 0), 0);
    }, [materialStatsMap]);

    const totalApprovedReqsCalc = useMemo(() => {
        return reportSummary?.totalRequisitionsApproved || stats.totalApprovedRequisitions || 0;
    }, [reportSummary, stats]);

    // Consolidated Material Report list
    const consolidatedList = useMemo(() => {
        let list = MATERIALS_CONFIG.map(item => {
            const stats = materialStatsMap[item.key] || {};
            return {
                ...item,
                ...stats
            };
        });

        if (selectedMaterials && selectedMaterials.length > 0) {
            const selectedKeys = selectedMaterials.map(m => (m.value || m).toLowerCase());
            list = list.filter(m => selectedKeys.some(k => matchesMaterial(m.name, k) || m.name.toLowerCase().includes(k.replace(/\s+/g, '')) || m.name.toLowerCase().includes(k)));
        }

        return list;
    }, [materialStatsMap, selectedMaterials]);

    const handleViewMaterialBreakdown = (item) => {
        setSelectedMaterialBreakdown(item);
        setMaterialBreakdownModalOpen(true);
    };

    // Filtered Movements for tab 2 and 3
    const dispatchesMovements = useMemo(() => {
        let list = movements.filter(m => m.movementType === 'REQUISITION_DISPATCH' || m.movementType === 'REQUISITION_REVERSAL');
        if (selectedMaterials && selectedMaterials.length > 0) {
            const selectedKeys = selectedMaterials.map(m => (m.value || m).toLowerCase());
            list = list.filter(m => {
                const matStr = (m.material || "").toLowerCase();
                return selectedKeys.some(k => matStr.includes(k.replace(/\s+/g, '')) || matStr.includes(k));
            });
        }
        if (!movementSearch) return list;
        const q = movementSearch.toLowerCase();
        return list.filter(m => 
            (m.targetCentreName || "").toLowerCase().includes(q) ||
            (m.material || "").toLowerCase().includes(q) ||
            (m.remarks || "").toLowerCase().includes(q) ||
            (m.purpose || "").toLowerCase().includes(q)
        );
    }, [movements, movementSearch, selectedMaterials]);

    const stockInMovements = useMemo(() => {
        let list = movements.filter(m => m.movementType === 'STOCK_IN' || m.movementType === 'STOCK_ADJUSTMENT');
        if (selectedMaterials && selectedMaterials.length > 0) {
            const selectedKeys = selectedMaterials.map(m => (m.value || m).toLowerCase());
            list = list.filter(m => {
                const matStr = (m.material || "").toLowerCase();
                return selectedKeys.some(k => matStr.includes(k.replace(/\s+/g, '')) || matStr.includes(k));
            });
        }
        if (!movementSearch) return list;
        const q = movementSearch.toLowerCase();
        return list.filter(m => 
            (m.material || "").toLowerCase().includes(q) ||
            (m.sourceOrVendor || "").toLowerCase().includes(q) ||
            (m.remarks || "").toLowerCase().includes(q)
        );
    }, [movements, movementSearch, selectedMaterials]);

    // Open Centre Details
    const handleViewCentreDispatches = (centreItem) => {
        setSelectedCentreDetails(centreItem);
        setDetailsModalOpen(true);
    };

    return (
        <Layout>
            <div className={`min-h-screen p-4 md:p-6 transition-colors duration-200 ${isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
                <ToastContainer position="top-right" autoClose={3000} theme={isDarkMode ? 'dark' : 'light'} />

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* HEADER SECTION                                                           */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                                <FaWarehouse className="text-2xl" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight">Marketing Stock Management</h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        {hazraCentre?.name || "Hazra Central H.O."}
                                    </span>
                                </div>
                                <p className={`text-xs md:text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Central stock repository. Materials automatically decrease when requisitions are approved in the Marketing Approval module.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons: Only Set Stock & Stock In */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={handleOpenSetStock}
                            className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg border transition shadow-sm ${
                                isDarkMode 
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                        >
                            <FaEdit className="text-indigo-400" />
                            <span>Set Current Stock</span>
                        </button>

                        <button
                            onClick={() => handleOpenStockIn("Leaflets")}
                            className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition active:scale-95"
                        >
                            <FaPlusCircle />
                            <span>+ Stock In (Add Materials)</span>
                        </button>

                        <button
                            onClick={() => { fetchHazraStock(); fetchCentreReport(); fetchMovements(); }}
                            title="Refresh"
                            className={`p-2.5 rounded-lg border transition ${
                                isDarkMode 
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                        >
                            <FaSync className={loadingStock || loadingReport ? "animate-spin text-indigo-400" : ""} />
                        </button>
                    </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* TOP METRICS SUMMARY CARDS                                                */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Total Central Units */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden transition-all ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Total Central Stock
                            </span>
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                <FaBoxes className="text-lg" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-indigo-500">
                                {loadingStock ? "..." : (totalCentralStockCalc || 0).toLocaleString()}
                            </span>
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Available in Hazra H.O.</span>
                        </div>
                    </div>

                    {/* Total Stock In */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden transition-all ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Total Stock In
                            </span>
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <FaPlusCircle className="text-lg" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-500">
                                {loadingStock ? "..." : (totalStockInCalc || 0).toLocaleString()}
                            </span>
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Added from Printers/Vendors</span>
                        </div>
                    </div>

                    {/* Dispatched to Centres */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden transition-all ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Total Sent to Centres
                            </span>
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <FaTruckLoading className="text-lg" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-blue-500">
                                {loadingStock ? "..." : (totalSentToCentresCalc || 0).toLocaleString()}
                            </span>
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Deducted via Approvals</span>
                        </div>
                    </div>

                    {/* Approved Requisitions */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden transition-all ${
                        isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Approved Requisitions
                            </span>
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                <FaCheckCircle className="text-lg" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl md:text-3xl font-extrabold tracking-tight text-purple-500">
                                {loadingReport || loadingStock ? "..." : (totalApprovedReqsCalc || 0).toLocaleString()}
                            </span>
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Centres Requisitions Fulfilled</span>
                        </div>
                    </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* 6 CORE MATERIAL STOCK CARDS (HAZRA CURRENT STOCK)                         */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
                            <span>Hazra Central Stock Inventory</span>
                            <span className={`text-xs px-2 py-0.5 rounded font-normal ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                6 Materials
                            </span>
                        </h2>
                        {stock.lastUpdated && (
                            <span className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <FaCalendarAlt className="text-[11px]" />
                                Last updated: {new Date(stock.lastUpdated).toLocaleDateString()} {new Date(stock.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MATERIALS_CONFIG.map((item) => {
                            const IconComponent = item.icon;
                            const count = materialStatsMap[item.key]?.currentStock ?? (stock[item.key] || 0);
                            const isLow = count < 25;
                            const isOut = count === 0;

                            return (
                                <div
                                    key={item.key}
                                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                                        isDarkMode 
                                            ? 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600' 
                                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                                                    <IconComponent className="text-xl" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-base leading-tight">{item.label}</h3>
                                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            {isOut ? (
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                    Out of Stock
                                                </span>
                                            ) : isLow ? (
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    In Stock
                                                </span>
                                            )}
                                        </div>

                                        {/* Large Count */}
                                        <div className="mt-4 mb-2">
                                            <span className="text-3xl font-extrabold tracking-tight">
                                                {loadingStock ? "..." : count.toLocaleString()}
                                            </span>
                                            <span className={`text-xs ml-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Units Available
                                            </span>
                                        </div>

                                        {/* Material Inflow & Outflow Breakdown */}
                                        <div className={`grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg mb-2.5 ${isDarkMode ? 'bg-slate-900/60 border border-slate-700/50' : 'bg-slate-50 border border-slate-200/60'}`}>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Total Added</span>
                                                <span className="font-bold text-emerald-500">+{((materialStatsMap[item.key]?.totalStockIn) || 0).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Dispatched Out</span>
                                                <span className="font-bold text-blue-500">-{((materialStatsMap[item.key]?.totalDispatched) || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer: Only Add In */}
                                    <div className={`pt-3 mt-2 border-t flex items-center justify-between ${
                                        isDarkMode ? 'border-slate-700/60' : 'border-slate-100'
                                    }`}>
                                        <button
                                            onClick={() => handleOpenStockIn(item.name)}
                                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                                isDarkMode 
                                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' 
                                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                            }`}
                                        >
                                            <FaPlusCircle className="text-[11px]" />
                                            <span>+ Stock In (Add New Units)</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* TABS NAVIGATION                                                          */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                <div className={`border-b mb-4 flex items-center gap-6 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                        onClick={() => setActiveTab("consolidatedReport")}
                        className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === "consolidatedReport"
                                ? 'border-indigo-500 text-indigo-500'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        <FaBoxes />
                        <span>Consolidated Material Report</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("centreReport")}
                        className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === "centreReport"
                                ? 'border-indigo-500 text-indigo-500'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        <FaBuilding />
                        <span>Centre-Wise Dispatched Report</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("dispatchesLog")}
                        className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === "dispatchesLog"
                                ? 'border-indigo-500 text-indigo-500'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        <FaTruckLoading />
                        <span>Approval Dispatch Transactions</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("stockInHistory")}
                        className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === "stockInHistory"
                                ? 'border-indigo-500 text-indigo-500'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        <FaHistory />
                        <span>Stock In & Adjustment History</span>
                    </button>
                </div>

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* TAB 0: CONSOLIDATED MATERIAL REPORT (STOCK IN, DISPATCHED, AVAILABLE)      */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {activeTab === "consolidatedReport" && (
                    <div className="space-y-6">
                        {/* Material Master Consolidated Table */}
                        <div className={`p-4 md:p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                                        <span>Consolidated Material Inventory & Dispatches Report</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            {consolidatedList.length} Materials
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Comprehensive consolidated view showing baseline stock in, dispatches deducted upon requisition approvals, and current main warehouse balance.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
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
                                </div>
                            </div>

                            {/* Consolidated Material Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs md:text-sm">
                                    <thead>
                                        <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                                            isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                                        }`}>
                                            <th className="py-3 px-3">Material</th>
                                            <th className="py-3 px-3 text-center">Total Stock In (Added)</th>
                                            <th className="py-3 px-3 text-center">Dispatched (Sent to Centres)</th>
                                            <th className="py-3 px-3 text-center">Current Main Stock Available</th>
                                            <th className="py-3 px-3 text-center">Centres Supplied</th>
                                            <th className="py-3 px-3 text-center">Requisitions</th>
                                            <th className="py-3 px-3 text-center">Status</th>
                                            <th className="py-3 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {consolidatedList.map((m) => {
                                            const IconComp = m.icon;
                                            return (
                                                <tr key={m.key} className={`hover:bg-slate-500/5 transition ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`p-2 rounded-lg ${m.bg} ${m.color}`}>
                                                                <IconComp className="text-base" />
                                                            </div>
                                                            <div>
                                                                <span className="font-bold block text-sm">{m.label}</span>
                                                                <span className="text-[10px] text-slate-400">{m.desc}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-emerald-500">
                                                        +{(m.totalStockIn || 0).toLocaleString()} Units
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-blue-500">
                                                        -{(m.totalDispatched || 0).toLocaleString()} Units
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className="text-base font-extrabold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                                            {(m.currentStock || 0).toLocaleString()} Units
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className="font-semibold text-slate-300">
                                                            {m.centresSupplied || 0} Centres
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            {m.requisitionsApproved || 0} Requests
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        {m.status === 'Out of Stock' ? (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                                Out of Stock
                                                            </span>
                                                        ) : m.status === 'Low Stock' ? (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                                Low Stock
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                In Stock
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleViewMaterialBreakdown(m)}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                                                                    isDarkMode ? 'bg-slate-700/80 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                                }`}
                                                                title="View centre allocations"
                                                            >
                                                                <FaEye className="text-[10px]" />
                                                                <span>Centres</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenStockIn(m.name)}
                                                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 transition"
                                                                title="Add stock in for this material"
                                                            >
                                                                <FaPlusCircle className="text-[10px]" />
                                                                <span>+ Stock</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Centre-Wise Material Distribution Matrix */}
                        <div className={`p-4 md:p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="font-bold text-sm md:text-base">Centres Material Allocation Matrix</h3>
                                    <p className="text-xs text-slate-400">
                                        Cross-tabular consolidated matrix showing units sent to each centre vs remaining Hazra stock balance.
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs md:text-sm">
                                    <thead>
                                        <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                                            isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                                        }`}>
                                            <th className="py-3 px-3">Centre Name</th>
                                            <th className="py-3 px-3 text-center">Leaflets</th>
                                            <th className="py-3 px-3 text-center">Banners</th>
                                            <th className="py-3 px-3 text-center">Bags</th>
                                            <th className="py-3 px-3 text-center">T-Shirts</th>
                                            <th className="py-3 px-3 text-center">KTS Books</th>
                                            <th className="py-3 px-3 text-center">VSO Books</th>
                                            <th className="py-3 px-3 text-right">Total Sent</th>
                                            <th className="py-3 px-3 text-center">Requests</th>
                                            <th className="py-3 px-3 text-right">Last Sent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {centreReport.length === 0 ? (
                                            <tr>
                                                <td colSpan="10" className="text-center py-6 text-slate-400">
                                                    No centre dispatches recorded yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            centreReport.map(c => (
                                                <tr key={c.centreId} className={`hover:bg-slate-500/5 transition ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                    <td className="py-2.5 px-3 font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <FaBuilding className="text-indigo-400 text-xs" />
                                                            <span>{c.centreName}</span>
                                                            {c.centreCode && <span className="text-[10px] text-slate-400 font-normal">({c.centreCode})</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-orange-400">{c.leaflets || 0}</td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-blue-400">{c.banners || 0}</td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-teal-400">{c.bags || 0}</td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-rose-400">{c.tshirts || 0}</td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-amber-400">{c.ktsBooks || 0}</td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-purple-400">{c.vsoBooks || 0}</td>
                                                    <td className="py-2.5 px-3 text-right font-extrabold text-indigo-400">{(c.totalUnits || 0).toLocaleString()}</td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400">
                                                            {c.approvedRequisitionsCount || 0}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-xs text-slate-400">
                                                        {c.lastDispatchedAt ? new Date(c.lastDispatchedAt).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        {/* Total Dispatched Across All Centres Row */}
                                        <tr className={`border-t-2 font-black ${isDarkMode ? 'border-indigo-500/40 bg-slate-900/80 text-white' : 'border-indigo-500/30 bg-indigo-50/50 text-indigo-950'}`}>
                                            <td className="py-3 px-3 uppercase text-xs">Total Dispatched to Centres</td>
                                            <td className="py-3 px-3 text-center text-orange-400 font-bold">{centreReport.reduce((acc, c) => acc + (c.leaflets || 0), 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center text-blue-400 font-bold">{centreReport.reduce((acc, c) => acc + (c.banners || 0), 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center text-teal-400 font-bold">{centreReport.reduce((acc, c) => acc + (c.bags || 0), 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center text-rose-400 font-bold">{centreReport.reduce((acc, c) => acc + (c.tshirts || 0), 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center text-amber-400 font-bold">{centreReport.reduce((acc, c) => acc + (c.ktsBooks || 0), 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center text-purple-400 font-bold">{centreReport.reduce((acc, c) => acc + (c.vsoBooks || 0), 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-right text-indigo-400 text-sm font-black">{centreReport.reduce((acc, c) => acc + (c.totalUnits || 0), 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center">{centreReport.reduce((acc, c) => acc + (c.approvedRequisitionsCount || 0), 0)}</td>
                                            <td className="py-3 px-3 text-right text-[10px] text-slate-400">All Centres</td>
                                        </tr>
                                        {/* Hazra Central Main Stock Balance Row */}
                                        <tr className={`border-t font-black ${isDarkMode ? 'border-slate-700 bg-emerald-950/20 text-emerald-400' : 'border-slate-200 bg-emerald-50 text-emerald-800'}`}>
                                            <td className="py-3 px-3 uppercase text-xs flex items-center gap-1.5">
                                                <FaWarehouse className="text-xs" />
                                                <span>Hazra Main Stock Remaining</span>
                                            </td>
                                            <td className="py-3 px-3 text-center font-extrabold text-orange-400">{(stock.leaflets || 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center font-extrabold text-blue-400">{(stock.banners || 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center font-extrabold text-teal-400">{(stock.bags || 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center font-extrabold text-rose-400">{(stock.tshirts || 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center font-extrabold text-amber-400">{(stock.ktsBooks || 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-center font-extrabold text-purple-400">{(stock.vsoBooks || 0).toLocaleString()}</td>
                                            <td className="py-3 px-3 text-right text-emerald-400 text-sm font-black">
                                                {((stock.leaflets || 0) + (stock.banners || 0) + (stock.bags || 0) + (stock.tshirts || 0) + (stock.ktsBooks || 0) + (stock.vsoBooks || 0)).toLocaleString()}
                                            </td>
                                            <td colSpan="2" className="py-3 px-3 text-right text-xs font-semibold">Available Balance</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* TAB 1: CENTRE-WISE DISPATCHED REPORT TABLE LIST (PRIMARY VIEW)           */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {activeTab === "centreReport" && (
                    <div className={`p-4 md:p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'}`}>
                        {/* Search, Filter and Summary */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-sm md:text-base">Centres Material Dispatch Report</h3>
                                <p className="text-xs text-slate-400">
                                    Shows each centre that materials have been sent to following approval in Marketing Approval module.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
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

                                {/* Centre Search Input */}
                                <div className="relative w-full sm:w-64">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search centre name, code, location..."
                                        value={centreSearch}
                                        onChange={(e) => setCentreSearch(e.target.value)}
                                        className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary Bar */}
                        {(reportSummary || dynamicSummary) && (
                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl mb-4 text-xs ${
                                isDarkMode ? 'bg-slate-900/60 border border-slate-700/50' : 'bg-slate-100 border border-slate-200'
                            }`}>
                                <div>
                                    <span className="text-slate-400 block">Centres Served</span>
                                    <span className="text-sm font-bold text-indigo-400">
                                        {selectedMaterials.length > 0 ? dynamicSummary.totalCentresServed : (reportSummary?.totalCentresServed || 0)} Centres
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Units Dispatched {selectedMaterials.length > 0 ? '(Filtered)' : ''}</span>
                                    <span className="text-sm font-bold text-blue-400">
                                        {(selectedMaterials.length > 0 ? dynamicSummary.totalUnitsSent : (reportSummary?.totalUnitsSent || 0)).toLocaleString()} Units
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Requisitions Approved</span>
                                    <span className="text-sm font-bold text-purple-400">
                                        {selectedMaterials.length > 0 ? dynamicSummary.totalRequisitionsApproved : (reportSummary?.totalRequisitionsApproved || 0)} Requests
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Selected Materials Filter</span>
                                    <span className="text-sm font-bold text-emerald-400">
                                        {selectedMaterials.length > 0 
                                            ? selectedMaterials.map(m => m.label).join(", ") 
                                            : "All Materials Active"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Centre-wise Table List */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs md:text-sm">
                                <thead>
                                    <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                                        isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                                    }`}>
                                        <th className="py-3 px-3">Centre Name</th>
                                        <th className="py-3 px-3 text-center">Leaflets</th>
                                        <th className="py-3 px-3 text-center">Banners</th>
                                        <th className="py-3 px-3 text-center">Bags</th>
                                        <th className="py-3 px-3 text-center">T-Shirts</th>
                                        <th className="py-3 px-3 text-center">KTS Books</th>
                                        <th className="py-3 px-3 text-center">VSO Books</th>
                                        <th className="py-3 px-3 text-right">Total Sent</th>
                                        <th className="py-3 px-3 text-center">Requests</th>
                                        <th className="py-3 px-3 text-right">Last Sent Date</th>
                                        <th className="py-3 px-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {loadingReport ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-8 text-slate-400">
                                                <FaSync className="animate-spin inline mr-2 text-indigo-400" />
                                                Loading centre-wise dispatch report...
                                            </td>
                                        </tr>
                                    ) : filteredCentreReport.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-10">
                                                <FaBuilding className="text-3xl mx-auto mb-2 text-slate-500 opacity-50" />
                                                <p className="text-sm font-medium text-slate-400">No centres have received dispatches yet</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    When a user approves a requisition in Marketing Approval, it will automatically minus from Hazra stock and appear in this list.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCentreReport.map((c) => (
                                            <tr key={c.centreId} className={`hover:bg-slate-500/5 transition ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                            <FaBuilding className="text-xs" />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold block">{c.centreName}</span>
                                                            {c.centreCode && <span className="text-[10px] text-slate-400">Code: {c.centreCode}</span>}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3 text-center font-semibold text-orange-400">
                                                    {c.leaflets || 0}
                                                </td>
                                                <td className="py-3 px-3 text-center font-semibold text-blue-400">
                                                    {c.banners || 0}
                                                </td>
                                                <td className="py-3 px-3 text-center font-semibold text-teal-400">
                                                    {c.bags || 0}
                                                </td>
                                                <td className="py-3 px-3 text-center font-semibold text-rose-400">
                                                    {c.tshirts || 0}
                                                </td>
                                                <td className="py-3 px-3 text-center font-semibold text-amber-400">
                                                    {c.ktsBooks || 0}
                                                </td>
                                                <td className="py-3 px-3 text-center font-semibold text-purple-400">
                                                    {c.vsoBooks || 0}
                                                </td>

                                                <td className="py-3 px-3 text-right">
                                                    <span className="font-extrabold text-sm text-indigo-400">
                                                        {(c.totalUnits || 0).toLocaleString()}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                        {c.approvedRequisitionsCount || 0}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-3 text-right text-xs whitespace-nowrap">
                                                    {c.lastDispatchedAt ? (
                                                        <span>{new Date(c.lastDispatchedAt).toLocaleDateString()}</span>
                                                    ) : "—"}
                                                </td>

                                                <td className="py-3 px-3 text-center">
                                                    <button
                                                        onClick={() => handleViewCentreDispatches(c)}
                                                        className={`p-1.5 rounded-lg text-xs font-medium transition ${
                                                            isDarkMode 
                                                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
                                                                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                                                        }`}
                                                        title="View Individual Dispatches"
                                                    >
                                                        <FaEye className="inline mr-1" /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* TAB 2: APPROVAL DISPATCH TRANSACTIONS (REQUISITIONS LOG)                 */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {activeTab === "dispatchesLog" && (
                    <div className={`p-4 md:p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-sm md:text-base">Approval Dispatch History</h3>
                                <p className="text-xs text-slate-400">
                                    Every individual approved requisition that automatically subtracted stock from Hazra main warehouse.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="w-52 min-w-[180px]">
                                    <CustomMultiSelect
                                        isMulti
                                        options={MATERIAL_FILTER_OPTIONS}
                                        value={selectedMaterials}
                                        onChange={(val) => setSelectedMaterials(val || [])}
                                        placeholder="Filter Materials..."
                                        maxShowTags={1}
                                    />
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search centre, material, remarks..."
                                        value={movementSearch}
                                        onChange={(e) => setMovementSearch(e.target.value)}
                                        className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs md:text-sm">
                                <thead>
                                    <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                                        isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                                    }`}>
                                        <th className="py-3 px-3">Date & Time</th>
                                        <th className="py-3 px-3">Destination Centre</th>
                                        <th className="py-3 px-3">Materials Deducted from Hazra</th>
                                        <th className="py-3 px-3 text-center">Total Units</th>
                                        <th className="py-3 px-3">Approved By</th>
                                        <th className="py-3 px-3">Requisition Purpose / Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {loadingMovements ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-6 text-slate-400">
                                                <FaSync className="animate-spin inline mr-2 text-indigo-400" /> Loading transactions...
                                            </td>
                                        </tr>
                                    ) : dispatchesMovements.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-slate-400">
                                                No approval dispatches found
                                            </td>
                                        </tr>
                                    ) : (
                                        dispatchesMovements.map(m => (
                                            <tr key={m._id} className={`hover:bg-slate-500/5 transition ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                <td className="py-3 px-3 whitespace-nowrap text-xs">
                                                    <span className="font-semibold block">{new Date(m.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-3">
                                                    <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                                                        <FaBuilding className="text-[11px]" />
                                                        {m.targetCentreName || m.targetCentre?.centreName || "Centre"}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-3">
                                                    <span className="text-xs font-semibold">{m.material || "Materials"}</span>
                                                </td>

                                                <td className="py-3 px-3 text-center font-bold text-rose-500">
                                                    -{m.quantity || 0}
                                                </td>

                                                <td className="py-3 px-3 text-xs whitespace-nowrap">
                                                    {m.performedBy ? (
                                                        <div>
                                                            <span className="font-medium block">{m.performedBy.name}</span>
                                                            <span className="text-[10px] text-slate-400 capitalize">{m.performedBy.role}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500">Approver</span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-3 text-xs max-w-xs truncate" title={m.remarks || m.purpose}>
                                                    {m.remarks || m.purpose || "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* TAB 3: STOCK IN & ADJUSTMENTS LOG                                        */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {activeTab === "stockInHistory" && (
                    <div className={`p-4 md:p-5 rounded-xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-sm md:text-base">Stock In & Physical Baseline Log</h3>
                                <p className="text-xs text-slate-400">
                                    Records of new materials received from printers/vendors and baseline adjustments.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="w-52 min-w-[180px]">
                                    <CustomMultiSelect
                                        isMulti
                                        options={MATERIAL_FILTER_OPTIONS}
                                        value={selectedMaterials}
                                        onChange={(val) => setSelectedMaterials(val || [])}
                                        placeholder="Filter Materials..."
                                        maxShowTags={1}
                                    />
                                </div>
                                <button
                                    onClick={() => handleOpenStockIn("Leaflets")}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1.5 self-start"
                                >
                                    <FaPlusCircle />
                                    <span>+ New Stock In</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs md:text-sm">
                                <thead>
                                    <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                                        isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                                    }`}>
                                        <th className="py-3 px-3">Date & Time</th>
                                        <th className="py-3 px-3">Type</th>
                                        <th className="py-3 px-3">Materials Added</th>
                                        <th className="py-3 px-3 text-center">Quantity</th>
                                        <th className="py-3 px-3">Vendor / Source</th>
                                        <th className="py-3 px-3">Entered By</th>
                                        <th className="py-3 px-3">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {loadingMovements ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-6 text-slate-400">
                                                <FaSync className="animate-spin inline mr-2 text-indigo-400" /> Loading log...
                                            </td>
                                        </tr>
                                    ) : stockInMovements.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-8 text-slate-400">
                                                No stock in records found
                                            </td>
                                        </tr>
                                    ) : (
                                        stockInMovements.map(m => (
                                            <tr key={m._id} className={`hover:bg-slate-500/5 transition ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                <td className="py-3 px-3 whitespace-nowrap text-xs">
                                                    <span className="font-semibold block">{new Date(m.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        {m.movementType === 'STOCK_IN' ? 'Stock In' : 'Baseline Setup'}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-3 font-semibold text-xs">
                                                    {m.material}
                                                </td>

                                                <td className="py-3 px-3 text-center font-bold text-emerald-500">
                                                    +{m.quantity || 0}
                                                </td>

                                                <td className="py-3 px-3 text-xs">
                                                    {m.sourceOrVendor || "—"}
                                                </td>

                                                <td className="py-3 px-3 text-xs whitespace-nowrap">
                                                    {m.performedBy?.name || "User"}
                                                </td>

                                                <td className="py-3 px-3 text-xs max-w-xs truncate" title={m.remarks}>
                                                    {m.remarks || "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* MODAL: SET CURRENT PHYSICAL BASELINE STOCK                               */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {setStockModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                                        <FaEdit className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Set Hazra Current Stock Data</h3>
                                        <p className="text-xs text-slate-400">Put current physical stock numbers for Hazra central stock</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSetStockModalOpen(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSaveSetStock} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {MATERIALS_CONFIG.map((m) => (
                                        <div key={m.key} className="p-3 rounded-xl border border-slate-700/60 bg-slate-800/40">
                                            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                                                <m.icon className={`${m.color} text-xs`} />
                                                <span>{m.label}</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={setStockForm[m.key]}
                                                onChange={(e) => setSetStockForm({ ...setStockForm, [m.key]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                                className={`w-full px-3 py-1.5 text-sm font-bold rounded-lg border focus:ring-1 focus:ring-indigo-500 ${
                                                    isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                                                }`}
                                            />
                                            <span className="text-[10px] text-slate-500 mt-1 block">
                                                Current: {stock[m.key] || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1">
                                        Audit Remarks / Reason
                                    </label>
                                    <input
                                        type="text"
                                        value={setStockForm.remarks}
                                        onChange={(e) => setSetStockForm({ ...setStockForm, remarks: e.target.value })}
                                        placeholder="e.g. Physical inventory baseline setup"
                                        className={`w-full px-3 py-2 text-xs rounded-lg border focus:ring-1 focus:ring-indigo-500 ${
                                            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/50">
                                    <button
                                        type="button"
                                        onClick={() => setSetStockModalOpen(false)}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-600 hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingStock}
                                        className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                                    >
                                        {savingStock && <FaSync className="animate-spin text-xs" />}
                                        <span>Save Baseline Stock</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* MODAL: STOCK IN (ADD NEW UNITS FROM PRINTERS / VENDORS)                   */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {stockInModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                                        <FaPlusCircle className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">+ Record New Stock In</h3>
                                        <p className="text-xs text-slate-400">Add received materials into Hazra main warehouse</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStockInModalOpen(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSaveStockIn} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1">
                                        Select Material Type *
                                    </label>
                                    <select
                                        value={stockInForm.material}
                                        onChange={(e) => setStockInForm({ ...stockInForm, material: e.target.value })}
                                        className={`w-full px-3 py-2 text-sm rounded-lg border focus:ring-1 focus:ring-emerald-500 ${
                                            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    >
                                        {MATERIALS_CONFIG.map(m => (
                                            <option key={m.key} value={m.name}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1">
                                        Quantity Received *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        placeholder="e.g. 500"
                                        value={stockInForm.quantity}
                                        onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                                        className={`w-full px-3 py-2 text-sm font-bold rounded-lg border focus:ring-1 focus:ring-emerald-500 ${
                                            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1">
                                        Vendor / Printer / Source
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ABC Printers"
                                        value={stockInForm.sourceOrVendor}
                                        onChange={(e) => setStockInForm({ ...stockInForm, sourceOrVendor: e.target.value })}
                                        className={`w-full px-3 py-2 text-xs rounded-lg border focus:ring-1 focus:ring-emerald-500 ${
                                            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1">
                                        Challan / Invoice / Remarks
                                    </label>
                                    <textarea
                                        rows="2"
                                        placeholder="e.g. Challan #104, delivered at Hazra store"
                                        value={stockInForm.remarks}
                                        onChange={(e) => setStockInForm({ ...stockInForm, remarks: e.target.value })}
                                        className={`w-full px-3 py-2 text-xs rounded-lg border focus:ring-1 focus:ring-emerald-500 ${
                                            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                                        }`}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/50">
                                    <button
                                        type="button"
                                        onClick={() => setStockInModalOpen(false)}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-600 hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingStockIn}
                                        className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
                                    >
                                        {savingStockIn && <FaSync className="animate-spin text-xs" />}
                                        <span>Add to Main Stock</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* MODAL: VIEW INDIVIDUAL DISPATCHES TO A CENTRE                            */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {detailsModalOpen && selectedCentreDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                        }`}>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                                        <FaBuilding className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedCentreDetails.centreName}</h3>
                                        <p className="text-xs text-slate-400">
                                            Dispatches history from Hazra main stock • Total {selectedCentreDetails.totalUnits} Units Sent
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailsModalOpen(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="max-h-96 overflow-y-auto space-y-3">
                                {(!selectedCentreDetails.dispatches || selectedCentreDetails.dispatches.length === 0) ? (
                                    <p className="text-xs text-center py-6 text-slate-400">No individual requisitions found</p>
                                ) : (
                                    selectedCentreDetails.dispatches.map((d, idx) => (
                                        <div key={idx} className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-800/40 text-xs">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-indigo-400">
                                                    Requisition #{d.requisitionId?.slice(-6) || idx + 1}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {d.approvedAt ? new Date(d.approvedAt).toLocaleDateString() : ""}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-2 py-2 border-y border-slate-700/40 text-center">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block">Leaflets</span>
                                                    <span className="font-bold text-orange-400">{d.leaflets || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block">Banners</span>
                                                    <span className="font-bold text-blue-400">{d.banners || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block">Bags</span>
                                                    <span className="font-bold text-teal-400">{d.bags || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block">T-Shirts</span>
                                                    <span className="font-bold text-rose-400">{d.tshirts || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block">KTS Books</span>
                                                    <span className="font-bold text-amber-400">{d.ktsBooks || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block">VSO Books</span>
                                                    <span className="font-bold text-purple-400">{d.vsoBooks || 0}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                                                <span>Purpose: {d.purpose || "—"}</span>
                                                {d.approvedBy && <span>Approved by: {d.approvedBy.name}</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-700/50 flex justify-end mt-4">
                                <button
                                    onClick={() => setDetailsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {/* MODAL: MATERIAL CENTRE BREAKDOWN                                         */}
                {/* ═════════════════════════════════════════════════════════════════════════ */}
                {materialBreakdownModalOpen && selectedMaterialBreakdown && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className={`w-full max-w-lg rounded-2xl p-5 border shadow-2xl ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${selectedMaterialBreakdown.bg} ${selectedMaterialBreakdown.color}`}>
                                        {React.createElement(selectedMaterialBreakdown.icon, { className: "text-lg" })}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base leading-tight">
                                            {selectedMaterialBreakdown.label} — Centre Allocation Breakdown
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Centres that received this material following approval
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMaterialBreakdownModalOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Summary Chips */}
                            <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
                                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                                    <span className="text-[10px] text-slate-400 block uppercase">Added In</span>
                                    <span className="text-sm font-black text-emerald-400">+{(selectedMaterialBreakdown.totalStockIn || 0).toLocaleString()}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                                    <span className="text-[10px] text-slate-400 block uppercase">Dispatched</span>
                                    <span className="text-sm font-black text-blue-400">-{(selectedMaterialBreakdown.totalDispatched || 0).toLocaleString()}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                                    <span className="text-[10px] text-indigo-400 block uppercase">Hazra Stock</span>
                                    <span className="text-sm font-black text-indigo-300">{(selectedMaterialBreakdown.currentStock || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Breakdown List */}
                            <div className="max-h-80 overflow-y-auto space-y-2">
                                {(!selectedMaterialBreakdown.centreBreakdown || selectedMaterialBreakdown.centreBreakdown.length === 0) ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">
                                        <FaBuilding className="text-2xl mx-auto mb-2 opacity-40" />
                                        No centres have received {selectedMaterialBreakdown.label} yet.
                                    </div>
                                ) : (
                                    selectedMaterialBreakdown.centreBreakdown.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-700/50 bg-slate-800/30 text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                    <FaBuilding className="text-xs" />
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-sm">{item.centreName}</span>
                                                    {item.centreCode && <span className="text-[10px] text-slate-400">Code: {item.centreCode}</span>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-base font-extrabold text-indigo-400 block">
                                                    {item.quantity.toLocaleString()} Units
                                                </span>
                                                {item.lastSent && (
                                                    <span className="text-[10px] text-slate-400">
                                                        Sent: {new Date(item.lastSent).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-700/50 flex justify-end mt-4">
                                <button
                                    onClick={() => setMaterialBreakdownModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
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

export default MarketingStock;
