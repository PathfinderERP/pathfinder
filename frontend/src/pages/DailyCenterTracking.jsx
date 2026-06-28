import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import { FaBuilding, FaUsers, FaChartLine, FaClipboardList, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaThLarge, FaList, FaWalking, FaComments, FaUserPlus, FaPhoneAlt, FaRupeeSign, FaFileExcel } from 'react-icons/fa';
import { toast } from "react-toastify";
import DailyTrackingDetailsModal from '../components/Dashboard/DailyTrackingDetailsModal';
import ActiveCentresCallsReportModal from '../components/Dashboard/ActiveCentresCallsReportModal';
import { hasPermission } from '../config/permissions';
import CustomMultiSelect from '../components/common/CustomMultiSelect';
import { downloadExcel } from '../utils/exportUtils';


const DailyCenterTracking = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [dateRange, setDateRange] = useState("Today");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [leadTypeFilter, setLeadTypeFilter] = useState("");
    const [viewMode, setViewMode] = useState("card"); // "card" or "table"
    const navigate = useNavigate();

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCallsReportModal, setShowCallsReportModal] = useState(false);
    const [detailsData, setDetailsData] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const getDateRangeLimits = (range) => {
        const today = new Date();
        const formatDate = (d) => {
            const tzOffset = d.getTimezoneOffset() * 60 * 1000;
            const localTime = d.getTime() - tzOffset;
            const localDate = new Date(localTime);
            return localDate.toISOString().split('T')[0];
        };

        let start, end;
        switch (range) {
            case "Today":
                start = formatDate(today);
                end = formatDate(today);
                break;
            case "Yesterday":
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                start = formatDate(yesterday);
                end = formatDate(yesterday);
                break;
            case "Last 7 Days":
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 6);
                start = formatDate(sevenDaysAgo);
                end = formatDate(today);
                break;
            case "This Month":
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                start = formatDate(startOfMonth);
                end = formatDate(today);
                break;
            case "This Year":
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                start = formatDate(startOfYear);
                end = formatDate(today);
                break;
            case "Last Year":
                const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
                const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
                start = formatDate(startOfLastYear);
                end = formatDate(endOfLastYear);
                break;
            default:
                start = formatDate(today);
                end = formatDate(today);
                break;
        }
        return { start, end };
    };

    const getCardLabel = (baseLabel) => {
        if (dateRange === "Today") {
            return baseLabel === "Collection" ? "Total Collection" : `Daily ${baseLabel}`;
        }
        if (dateRange === "Yesterday") return `Yesterday's ${baseLabel}`;
        if (dateRange === "Last 7 Days") return `Last 7 Days ${baseLabel}`;
        if (dateRange === "This Month") return `This Month's ${baseLabel}`;
        if (dateRange === "This Year") return `This Year's ${baseLabel}`;
        if (dateRange === "Last Year") return `Last Year's ${baseLabel}`;
        if (dateRange === "Custom Range") return `Custom Range ${baseLabel}`;
        return baseLabel === "Collection" ? "Total Collection" : `Daily ${baseLabel}`;
    };

    const handleCardClick = async (category, title) => {
        setSelectedCategory(category);
        setModalTitle(title);
        setShowDetailsModal(true);
        setLoadingDetails(true);
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;

            const params = new URLSearchParams({ category });
            if (dateRange === "Custom Range") {
                params.append("startDate", customStartDate);
                params.append("endDate", customEndDate);
            } else {
                const { start, end } = getDateRangeLimits(dateRange);
                params.append("startDate", start);
                params.append("endDate", end);
            }

            if (selectedCenters && selectedCenters.length > 0) {
                params.append("centerIds", selectedCenters.map(sc => sc.value).join(","));
            }

            if (leadTypeFilter) {
                params.append("leadType", leadTypeFilter);
            }

            const response = await fetch(`${apiUrl}/operations/daily-tracking/details?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setDetailsData(data);
            } else {
                toast.error(data.message || "Failed to fetch details");
                setShowDetailsModal(false);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
            toast.error("Error fetching details");
            setShowDetailsModal(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canView = hasPermission(user, 'trackingFlagging', 'dailyCenterTracking', 'view');

    useEffect(() => {
        if (!canView && user.role !== 'superAdmin' && user.role !== 'superadmin') {
            toast.error("Access Denied");
            navigate("/");
        }
    }, [canView, user.role, navigate]);

    const fetchCenters = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;

            const params = new URLSearchParams();
            if (dateRange === "Custom Range") {
                if (customStartDate && customEndDate) {
                    params.append("startDate", customStartDate);
                    params.append("endDate", customEndDate);
                } else {
                    return; // Don't fetch if custom range is incomplete
                }
            } else {
                const { start, end } = getDateRangeLimits(dateRange);
                params.append("startDate", start);
                params.append("endDate", end);
            }

            if (leadTypeFilter) {
                params.append("leadType", leadTypeFilter);
            }

            const response = await fetch(`${apiUrl}/operations/daily-tracking?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                const filteredData = Array.isArray(data)
                    ? data.filter(c =>
                        user.role === 'superAdmin' || user.role === 'superadmin' ||
                        (user.centres && user.centres.some(uc => uc._id === c.id || uc.centreName === c.name))
                    )
                    : [];
                filteredData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setCenters(filteredData);
            } else {
                toast.error("Failed to fetch centers");
            }
        } catch (error) {
            console.error("Error fetching centers:", error);
            toast.error("Error fetching centers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!canView && user.role !== 'superAdmin' && user.role !== 'superadmin') return;
        if (dateRange === "Custom Range" && (!customStartDate || !customEndDate)) return;
        fetchCenters();
    }, [dateRange, customStartDate, customEndDate, canView, leadTypeFilter]);

    const filteredCenters = centers.filter(center => {
        const matchesSearch = center.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCenter = selectedCenters.length === 0 || selectedCenters.some(sc => sc.label === center.name);
        return matchesSearch && matchesCenter;
    });

    const handleExportExcel = () => {
        if (!filteredCenters || filteredCenters.length === 0) {
            toast.warn("No data available to export");
            return;
        }

        const headers = [
            { key: "name", label: "Center Name" },

            { key: "walkIns", label: "Walk-Ins" },
            { key: "dailyCalls", label: "Daily Calls" },
            { key: "counselledNormal", label: "Counselled (Normal)" },
            { key: "counselledBoard", label: "Counselled (Board)" },
            { key: "counselledTotal", label: "Counselled (Total)" },
            { key: "admissionNormal", label: "Admission (Normal)" },
            { key: "admissionBoard", label: "Admission (Board)" },
            { key: "admissionTotal", label: "Admission (Total)" },
            { key: "collectionsAdmissionVal", label: "Collection (Admission) [Excl. GST]" },
            { key: "collectionsInstallmentVal", label: "Collection (Installment) [Excl. GST]" },
            { key: "collectionsVal", label: "Collection (Total) [Excl. GST]" }
        ];

        const exportData = filteredCenters.map(center => ({
            ...center,
            counselledTotal: (center.counselledNormal || 0) + (center.counselledBoard || 0),
            admissionTotal: (center.admissionNormal || 0) + (center.admissionBoard || 0),
        }));

        const cleanDateRange = dateRange === "Custom Range"
            ? `${customStartDate}_to_${customEndDate}`
            : dateRange.replace(/\s+/g, '_');

        const filename = `Daily_Center_Tracking_${cleanDateRange}`;
        downloadExcel(exportData, headers, filename);
        toast.success("Excel exported successfully!");
    };


    if (!canView && user.role !== 'superAdmin' && user.role !== 'superadmin') {
        return null;
    }

    return (
        <Layout activePage="Tracking & Flagging">
            <div className={`p-4 md:p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                            <FaBuilding className="text-cyan-500" />
                            Daily Center Tracking
                            {centers.length > 0 && (
                                <span className={`text-xs px-2.5 py-1 rounded border font-semibold ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-100'}`}>
                                    {centers.filter(c => c.status === "Active" || c.status === "active").length} Active
                                </span>
                            )}
                        </h1>
                        <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Monitor daily operations, attendance, admissions, and collections across all centers.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search centers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded border focus:ring-2 focus:ring-cyan-500 outline-none transition-all ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                    }`}
                            />
                        </div>

                        {/* Centre Filter (Multi Select) */}
                        <div className="relative min-w-[200px] z-20">
                            <CustomMultiSelect
                                options={centers.map(c => ({ value: c.id, label: c.name }))}
                                value={selectedCenters}
                                onChange={setSelectedCenters}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${isDarkMode ? 'bg-[#1a1f24] text-gray-500' : 'bg-white text-gray-400'}`}>Centre</span>
                        </div>

                        {/* Date Range Dropdown */}
                        <div className="relative min-w-[140px]">
                            <select
                                value={dateRange}
                                onChange={e => {
                                    setDateRange(e.target.value);
                                    if (e.target.value !== "Custom Range") {
                                        setCustomStartDate("");
                                        setCustomEndDate("");
                                    }
                                }}
                                className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-cyan-500 text-sm font-semibold outline-none cursor-pointer appearance-none transition-all ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-white'
                                        : 'bg-white border-gray-200 text-gray-900'
                                    }`}
                            >
                                {["Today", "Yesterday", "Last 7 Days", "This Month", "This Year", "Last Year", "Custom Range"].map(d => (
                                    <option key={d} value={d} className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>{d}</option>
                                ))}
                            </select>
                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${isDarkMode ? 'bg-[#0f1214] text-gray-500' : 'bg-white text-gray-400'
                                }`}>Date Range</span>
                        </div>

                        {/* Lead Intensity Dropdown */}
                        <div className="relative min-w-[160px]">
                            <select
                                value={leadTypeFilter}
                                onChange={e => setLeadTypeFilter(e.target.value)}
                                className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-cyan-500 text-sm font-semibold outline-none cursor-pointer appearance-none transition-all ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-white'
                                        : 'bg-white border-gray-200 text-gray-900'
                                    }`}
                            >
                                <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>All Lead Intensity</option>
                                {["HOT LEAD", "WARM LEAD", "COLD LEAD", "NEUTRAL LEAD", "INVALID LEAD"].map(t => (
                                    <option key={t} value={t} className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>{t}</option>
                                ))}
                            </select>
                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${isDarkMode ? 'bg-[#0f1214] text-gray-500' : 'bg-white text-gray-400'
                                }`}>Lead Intensity</span>
                        </div>

                        {/* Custom Start/End Dates */}
                        {dateRange === "Custom Range" && (
                            <>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className={`px-3 py-2 rounded border focus:ring-2 focus:ring-cyan-500 text-sm font-semibold outline-none cursor-pointer transition-all ${isDarkMode
                                                ? 'bg-[#1a1f24] border-gray-700 text-white'
                                                : 'bg-white border-gray-200 text-[#05080c]'
                                            }`}
                                    />
                                    <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${isDarkMode ? 'bg-[#0f1214] text-gray-500' : 'bg-white text-gray-400'
                                        }`}>From</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={e => setCustomEndDate(e.target.value)}
                                        className={`px-3 py-2 rounded border focus:ring-2 focus:ring-cyan-500 text-sm font-semibold outline-none cursor-pointer transition-all ${isDarkMode
                                                ? 'bg-[#1a1f24] border-gray-700 text-white'
                                                : 'bg-white border-gray-200 text-[#05080c]'
                                            }`}
                                    />
                                    <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${isDarkMode ? 'bg-[#0f1214] text-gray-500' : 'bg-white text-gray-400'
                                        }`}>To</span>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => setShowCallsReportModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                        >
                            <FaPhoneAlt /> Calls Report
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                        >
                            <FaFileExcel /> Export Excel
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {[
                        { title: getCardLabel("Walk-Ins"), category: "walkins", value: filteredCenters.reduce((acc, curr) => acc + (curr.walkIns || 0), 0).toString(), icon: <FaWalking />, color: "text-blue-500", bg: "bg-blue-500/10" },
                        {
                            title: getCardLabel("Counselling"),
                            category: "counselling",
                            value: filteredCenters.reduce((acc, curr) => acc + ((curr.counselledNormal || 0) + (curr.counselledBoard || 0)), 0).toString(),
                            subtext: `Normal: ${filteredCenters.reduce((acc, curr) => acc + (curr.counselledNormal || 0), 0)} | Board: ${filteredCenters.reduce((acc, curr) => acc + (curr.counselledBoard || 0), 0)}`,
                            icon: <FaComments />,
                            color: "text-green-500",
                            bg: "bg-green-500/10"
                        },
                        {
                            title: getCardLabel("Admission"),
                            category: "admission",
                            value: filteredCenters.reduce((acc, curr) => acc + ((curr.admissionNormal || 0) + (curr.admissionBoard || 0)), 0).toString(),
                            subtext: `Normal: ${filteredCenters.reduce((acc, curr) => acc + (curr.admissionNormal || 0), 0)} | Board: ${filteredCenters.reduce((acc, curr) => acc + (curr.admissionBoard || 0), 0)}`,
                            icon: <FaUserPlus />,
                            color: "text-purple-500",
                            bg: "bg-purple-500/10"
                        },
                        { title: getCardLabel("Calls"), category: "calls", value: filteredCenters.reduce((acc, curr) => acc + (curr.dailyCalls || 0), 0), icon: <FaPhoneAlt />, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                        {
                            title: getCardLabel("Collection"),
                            category: "collection",
                            value: `₹${filteredCenters.reduce((acc, curr) => acc + (curr.collectionsVal || 0), 0).toLocaleString()}`,
                            subtext: `Admission: ₹${filteredCenters.reduce((acc, curr) => acc + (curr.collectionsAdmissionVal || 0), 0).toLocaleString()} | Installment: ₹${filteredCenters.reduce((acc, curr) => acc + (curr.collectionsInstallmentVal || 0), 0).toLocaleString()}`,
                            icon: <FaRupeeSign />,
                            color: "text-cyan-500",
                            bg: "bg-cyan-500/10"
                        }
                    ].map((kpi, index) => (
                        <div
                            key={index}
                            onClick={() => handleCardClick(kpi.category, kpi.title)}
                            className={`p-5 rounded transition-all hover:shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] select-none hover:border-cyan-500/40 ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'
                                }`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-3 rounded ${kpi.bg} ${kpi.color} shrink-0`}>
                                    {React.cloneElement(kpi.icon, { className: "text-xl" })}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-medium`}>{kpi.title}</p>
                                    <h3 className="text-xl font-bold mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{kpi.value}</h3>
                                    {kpi.subtext && (
                                        <p className={`text-[10px] mt-1 font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {kpi.subtext}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className={`rounded overflow-hidden border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            Center Operations Overview
                            {centers.length > 0 && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDarkMode ? 'bg-cyan-950 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                    {filteredCenters.filter(c => c.status === "Active" || c.status === "active").length} Active
                                </span>
                            )}
                        </h2>

                        {/* View Mode Toggle */}
                        <div className={`flex rounded p-1 border ${isDarkMode ? 'bg-[#131619] border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                            <button
                                onClick={() => setViewMode('card')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded transition-all text-sm font-medium ${viewMode === 'card'
                                        ? (isDarkMode ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white')
                                        : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                                    }`}
                            >
                                <FaThLarge /> Cards
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded transition-all text-sm font-medium ${viewMode === 'table'
                                        ? (isDarkMode ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white')
                                        : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                                    }`}
                            >
                                <FaList /> Table
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading centers...</div>
                    ) : filteredCenters.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No centers found.</div>
                    ) : (
                        viewMode === 'table' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] text-gray-500' : 'bg-gray-50 text-gray-500'}`}>
                                            <th className="p-4 font-semibold min-w-[150px]">Center Name</th>
                                            <th className="p-4 font-semibold">Daily Calls</th>
                                            <th className="p-4 font-semibold">Counselled</th>
                                            <th className="p-4 font-semibold">Admission</th>
                                            <th className="p-4 font-semibold">Collection</th>
                                            <th className="p-4 font-semibold text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {filteredCenters.map((center) => (
                                            <tr key={center.id} className={`border-b last:border-b-0 transition-colors ${isDarkMode ? 'border-gray-800 hover:bg-[#1f252b]' : 'border-gray-50 hover:bg-gray-50'
                                                }`}>
                                                <td className="p-4 font-medium flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${center.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    {center.name}
                                                </td>
                                                <td className="p-4 font-medium">{center.dailyCalls}</td>
                                                <td className="p-4 font-medium">
                                                    {center.counselledNormal + center.counselledBoard}
                                                </td>
                                                <td className="p-4 font-medium">
                                                    {center.admissionNormal + center.admissionBoard}
                                                </td>
                                                <td className="p-4 font-semibold text-cyan-600 dark:text-cyan-400">{center.collections}</td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            let start = "", end = "";
                                                            if (dateRange === "Custom Range") {
                                                                start = customStartDate;
                                                                end = customEndDate;
                                                            } else {
                                                                const limits = getDateRangeLimits(dateRange);
                                                                start = limits.start;
                                                                end = limits.end;
                                                            }
                                                            navigate(`/daily-center-tracking/${center.id}?fromDate=${start}&toDate=${end}`);
                                                        }}
                                                        className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${isDarkMode
                                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                            }`}>
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredCenters.map((center) => (
                                    <div key={center.id} className={`rounded p-5 border transition-all hover:shadow-lg ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {center.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                                                        {center.name}
                                                    </h3>
                                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        Head: {center.head}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${center.status === 'Active'
                                                    ? (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')
                                                    : (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700')
                                                }`}>
                                                {center.status === 'Active' ? <FaCheckCircle /> : <FaTimesCircle />}
                                                {center.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 my-6">
                                            <div>
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Daily Calls</p>
                                                <span className="font-bold text-lg">{center.dailyCalls}</span>
                                            </div>
                                            <div>
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Counselled</p>
                                                <span className="font-bold text-lg">{center.counselledNormal + center.counselledBoard}</span>
                                            </div>
                                            <div>
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admission</p>
                                                <span className="font-bold text-lg">{center.admissionNormal + center.admissionBoard}</span>
                                            </div>
                                            <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Collection</p>
                                                <span className="font-bold text-cyan-600 dark:text-cyan-400 text-lg">{center.collections}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                let start = "", end = "";
                                                if (dateRange === "Custom Range") {
                                                    start = customStartDate;
                                                    end = customEndDate;
                                                } else {
                                                    const limits = getDateRangeLimits(dateRange);
                                                    start = limits.start;
                                                    end = limits.end;
                                                }
                                                navigate(`/daily-center-tracking/${center.id}?fromDate=${start}&toDate=${end}`);
                                            }}
                                            className={`w-full py-2 rounded text-sm font-medium transition-colors ${isDarkMode
                                                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                                                }`}>
                                            View Details
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            <DailyTrackingDetailsModal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={modalTitle}
                data={detailsData}
                loading={loadingDetails}
                isDarkMode={isDarkMode}
            />

            <ActiveCentresCallsReportModal
                isOpen={showCallsReportModal}
                onClose={() => setShowCallsReportModal(false)}
                isDarkMode={isDarkMode}
                centres={centers}
            />
        </Layout>
    );
};

export default DailyCenterTracking;
