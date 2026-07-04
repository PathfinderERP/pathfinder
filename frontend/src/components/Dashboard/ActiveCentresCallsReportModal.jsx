import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaCalendarAlt, FaBuilding, FaSpinner, FaFileExcel, FaDownload, FaUser, FaPhoneAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import CustomMultiSelect from '../common/CustomMultiSelect';

const ActiveCentresCallsReportModal = ({ isOpen, onClose, isDarkMode, centres }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(todayStr);
    const [toDate, setToDate] = useState(todayStr);
    const [dateRange, setDateRange] = useState("Today");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

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

    useEffect(() => {
        if (dateRange === "Custom Range") {
            if (customStartDate && customEndDate) {
                setFromDate(customStartDate);
                setToDate(customEndDate);
            }
        } else {
            const { start, end } = getDateRangeLimits(dateRange);
            setFromDate(start);
            setToDate(end);
        }
    }, [dateRange, customStartDate, customEndDate]);
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exportingSummary, setExportingSummary] = useState(false);
    const [exportingBulk, setExportingBulk] = useState(false);

    // States for lead details secondary popup
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedLeadType, setSelectedLeadType] = useState('ALL');
    const [popupCallsData, setPopupCallsData] = useState([]);
    const [loadingPopup, setLoadingPopup] = useState(false);
    const [popupSearchQuery, setPopupSearchQuery] = useState('');
    const [exportingUserCalling, setExportingUserCalling] = useState(false);

    const fetchReport = async () => {
        if (!isOpen) return;
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const centerIdsParam = selectedCenters.length > 0 
                ? `&centerIds=${selectedCenters.map(c => c.value).join(',')}` 
                : '';
            const response = await fetch(`${apiUrl}/operations/daily-tracking/calls-report?fromDate=${fromDate}&toDate=${toDate}${centerIdsParam}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setReportData(data);
            } else {
                toast.error(data.message || "Failed to fetch calls report");
            }
        } catch (error) {
            console.error("Error fetching calls report:", error);
            toast.error("Error fetching calls report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [isOpen, fromDate, toDate, selectedCenters]);

    // Fetch user details when count is clicked
    const handleCountClick = async (row, leadType) => {
        if (!row.userId) {
            toast.error("User ID not found for this staff member");
            return;
        }
        setSelectedUser(row);
        setSelectedLeadType(leadType);
        setPopupSearchQuery('');
        setPopupCallsData([]);
        
        try {
            setLoadingPopup(true);
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            let endpoint = `${apiUrl}/operations/daily-tracking/user/${row.userId}?fromDate=${fromDate}&toDate=${toDate}&centerId=${row.centreId}`;
            if (leadType === 'WALK_IN') {
                endpoint = `${apiUrl}/operations/daily-tracking/user/${row.userId}/walk-ins?fromDate=${fromDate}&toDate=${toDate}&centerId=${row.centreId}`;
            } else if (leadType === 'ADMISSION') {
                endpoint = `${apiUrl}/operations/daily-tracking/user/${row.userId}/admissions?fromDate=${fromDate}&toDate=${toDate}&centerId=${row.centreId}`;
            } else if (leadType === 'TODAYS_FOLLOWUP') {
                endpoint = `${apiUrl}/operations/daily-tracking/user/${row.userId}/todays-followups?fromDate=${fromDate}&toDate=${toDate}&centerId=${row.centreId}`;
            } else if (leadType === 'PREVIOUS_FOLLOWUP') {
                endpoint = `${apiUrl}/operations/daily-tracking/user/${row.userId}/previous-followups?fromDate=${fromDate}&toDate=${toDate}&centerId=${row.centreId}`;
            }
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const result = await response.json();
            if (response.ok) {
                if (['WALK_IN', 'ADMISSION', 'TODAYS_FOLLOWUP', 'PREVIOUS_FOLLOWUP'].includes(leadType)) {
                    setPopupCallsData(result || []);
                } else {
                    setPopupCallsData(result.callDetails || []);
                }
            } else {
                toast.error(result.message || "Failed to fetch user activity details");
            }
        } catch (error) {
            console.error("Error fetching user activity details:", error);
            toast.error("Error fetching user activity details");
        } finally {
            setLoadingPopup(false);
        }
    };

    const handleExportUserCalling = async () => {
        if (!selectedUser) return;
        try {
            setExportingUserCalling(true);
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(
                `${apiUrl}/operations/daily-tracking/user/export/${selectedUser.userId}?fromDate=${fromDate}&toDate=${toDate}&centerId=${selectedUser.centreId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Calling_Report_${selectedUser.userName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast.success("Calling report exported successfully!");
            } else {
                toast.error("Failed to export calling report");
            }
        } catch (error) {
            console.error("Export calling report error:", error);
            toast.error("Error during export");
        } finally {
            setExportingUserCalling(false);
        }
    };

    if (!isOpen) return null;

    // Filter reportData based on search query (staff name or role)
    const filteredData = reportData.filter(row => 
        (row.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.role || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate totals
    const totals = filteredData.reduce((acc, curr) => {
        acc.hot += curr.hot || 0;
        acc.warm += curr.warm || 0;
        acc.cold += curr.cold || 0;
        acc.neutral += curr.neutral || 0;
        acc.invalid += curr.invalid || 0;
        acc.todaysFollowUp += curr.todaysFollowUp || 0;
        acc.previousFollowUp += curr.previousFollowUp || 0;
        acc.walkInCount += curr.walkInCount || 0;
        acc.admissionCount += curr.admissionCount || 0;
        acc.totalCalls += curr.totalCalls || 0;
        return acc;
    }, { hot: 0, warm: 0, cold: 0, neutral: 0, invalid: 0, todaysFollowUp: 0, previousFollowUp: 0, walkInCount: 0, admissionCount: 0, totalCalls: 0 });

    const handleExportSummary = async () => {
        try {
            setExportingSummary(true);
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const centerIdsParam = selectedCenters.length > 0 
                ? `&centerIds=${selectedCenters.map(c => c.value).join(',')}` 
                : '';
            const response = await fetch(`${apiUrl}/operations/daily-tracking/calls-report/export?fromDate=${fromDate}&toDate=${toDate}${centerIdsParam}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Calls_Summary_Report_${fromDate}_to_${toDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast.success("Summary report exported successfully!");
            } else {
                toast.error("Failed to export summary report");
            }
        } catch (error) {
            console.error("Export summary report error:", error);
            toast.error("Error during summary export");
        } finally {
            setExportingSummary(false);
        }
    };

    const handleExportBulk = async () => {
        try {
            setExportingBulk(true);
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const centerIdsParam = selectedCenters.length > 0 
                ? `&centerIds=${selectedCenters.map(c => c.value).join(',')}` 
                : '';
            const response = await fetch(`${apiUrl}/operations/daily-tracking/calls-report/export-bulk?fromDate=${fromDate}&toDate=${toDate}${centerIdsParam}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Bulk_Calling_Details_${fromDate}_to_${toDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast.success("Bulk details report exported successfully!");
            } else {
                toast.error("Failed to export bulk details report");
            }
        } catch (error) {
            console.error("Export bulk details report error:", error);
            toast.error("Error during bulk export");
        } finally {
            setExportingBulk(false);
        }
    };

    // Filter popup details
    const filteredPopupCalls = popupCallsData.filter(call => {
        const matchSearch = popupSearchQuery === '' ||
            (call.studentName || '').toLowerCase().includes(popupSearchQuery.toLowerCase()) ||
            (call.phoneNumber || '').includes(popupSearchQuery) ||
            (call.admissionNumber || '').toLowerCase().includes(popupSearchQuery.toLowerCase()) ||
            (call.feedback || '').toLowerCase().includes(popupSearchQuery.toLowerCase()) ||
            (call.remarks || '').toLowerCase().includes(popupSearchQuery.toLowerCase());
        
        let matchLead = true;
        if (selectedLeadType !== 'ALL' && selectedLeadType !== 'WALK_IN' && selectedLeadType !== 'ADMISSION') {
            const key = (call.leadType || '').toUpperCase();
            if (selectedLeadType === 'HOT') matchLead = key.includes('HOT');
            else if (selectedLeadType === 'WARM') matchLead = key.includes('WARM');
            else if (selectedLeadType === 'COLD') matchLead = key.includes('COLD');
            else if (selectedLeadType === 'NEUTRAL') matchLead = key.includes('NEUTRAL');
            else if (selectedLeadType === 'INVALID') matchLead = key.includes('INVALID') || key.includes('INACTIVE');
        }
        return matchSearch && matchLead;
    });

    const getLeadBadge = (status) => {
        const key = (status || '').toUpperCase();
        if (key.includes('HOT')) return 'bg-red-500/10 text-red-500 border border-red-500/20';
        if (key.includes('WARM')) return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
        if (key.includes('COLD')) return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
        if (key.includes('NEUTRAL')) return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-6xl h-[85vh] flex flex-col rounded-[2px] border shadow-2xl scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h2 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="w-2 h-8 bg-cyan-500 rounded-full animate-pulse"></div>
                            Active Centres Calls Report
                        </h2>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">
                            User-wise and Centre-wise calling report with lead status breakdown
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-[2px] transition-all hover:rotate-90 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${isDarkMode ? 'bg-[#181d23] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex flex-wrap items-center gap-3">
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
                                className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-cyan-500 text-sm font-semibold outline-none cursor-pointer appearance-none transition-all ${
                                    isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-white'
                                        : 'bg-white border-gray-200 text-gray-900'
                                }`}
                            >
                                {["Today", "Yesterday", "Last 7 Days", "This Month", "This Year", "Last Year", "Custom Range"].map(d => (
                                    <option key={d} value={d} className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>{d}</option>
                                ))}
                            </select>
                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${
                                isDarkMode ? 'bg-[#181d23] text-gray-500' : 'bg-white text-gray-400'
                            }`}>Date Range</span>
                        </div>

                        {/* Custom Start/End Dates */}
                        {dateRange === "Custom Range" && (
                            <>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className={`px-3 py-2 rounded border focus:ring-2 focus:ring-cyan-500 text-sm font-semibold outline-none cursor-pointer transition-all ${
                                            isDarkMode
                                                ? 'bg-[#1a1f24] border-gray-700 text-white'
                                                : 'bg-white border-gray-200 text-[#05080c]'
                                        }`}
                                    />
                                    <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${
                                        isDarkMode ? 'bg-[#181d23] text-gray-500' : 'bg-white text-gray-400'
                                    }`}>From</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={e => setCustomEndDate(e.target.value)}
                                        className={`px-3 py-2 rounded border focus:ring-2 focus:ring-cyan-500 text-sm font-semibold outline-none cursor-pointer transition-all ${
                                            isDarkMode
                                                ? 'bg-[#1a1f24] border-gray-700 text-white'
                                                : 'bg-white border-gray-200 text-[#05080c]'
                                        }`}
                                    />
                                    <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-30 ${
                                        isDarkMode ? 'bg-[#181d23] text-gray-500' : 'bg-white text-gray-400'
                                    }`}>To</span>
                                </div>
                            </>
                        )}

                        {/* Centre Selector */}
                        <div className="relative min-w-[200px] z-30">
                            <CustomMultiSelect
                                options={centres.map(c => ({ value: c.id || c._id, label: c.name || c.centreName }))}
                                value={selectedCenters}
                                onChange={setSelectedCenters}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 z-40 ${isDarkMode ? 'bg-[#181d23] text-gray-500' : 'bg-white text-gray-400'}`}>Centre</span>
                        </div>

                        {/* Search Input */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded border w-full md:w-60 z-10 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <FaSearch className="text-gray-500 text-sm animate-pulse" />
                            <input 
                                type="text"
                                placeholder="Search staff name or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`bg-transparent border-none outline-none text-xs w-full ${isDarkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}`}
                            />
                        </div>
                    </div>

                    {/* Export Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportSummary}
                            disabled={exportingSummary || loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-[2px] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 cursor-pointer"
                        >
                            {exportingSummary ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
                            Export Summary
                        </button>
                        <button
                            onClick={handleExportBulk}
                            disabled={exportingBulk || loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-[2px] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 cursor-pointer"
                        >
                            {exportingBulk ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                            Export Bulk Details
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading report data...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="py-20 text-center">
                            <FaBuilding className={`mx-auto mb-4 text-4xl ${isDarkMode ? 'text-gray-800' : 'text-gray-200'}`} />
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>No calling reports found</p>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto border rounded-[2px] ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Centre</th>
                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Staff Name</th>
                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Role</th>
                                        <th className={`p-4 font-semibold text-center text-red-500 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Hot</th>
                                        <th className={`p-4 font-semibold text-center text-orange-500 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Warm</th>
                                        <th className={`p-4 font-semibold text-center text-blue-500 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Cold</th>
                                        <th className={`p-4 font-semibold text-center text-purple-500 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Neutral</th>
                                        <th className={`p-4 font-semibold text-center border-b ${isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'}`}>Inactive</th>
                                        <th className={`p-4 font-semibold text-center text-teal-500 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Todays Follow Up</th>
                                        <th className={`p-4 font-semibold text-center text-amber-600 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Previous Follow Up</th>
                                        <th className={`p-4 font-semibold text-center text-emerald-500 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Walk In</th>
                                        <th className={`p-4 font-semibold text-center text-indigo-500 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Admission</th>
                                        <th className={`p-4 font-semibold text-center border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Total Calls</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {filteredData.map((row, index) => (
                                        <tr key={index} className={`border-b last:border-b-0 transition-colors ${
                                            isDarkMode ? 'border-gray-800 hover:bg-[#1f252b] text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                                        }`}>
                                            <td className="p-4 font-medium flex items-center gap-2">
                                                <FaBuilding className="text-gray-500 text-xs shrink-0" />
                                                {row.centreName}
                                            </td>
                                            <td className="p-4 font-medium uppercase tracking-wide">
                                                <div className="flex items-center gap-2">
                                                    <FaUser className="text-cyan-500 text-xs shrink-0" />
                                                    {row.userName}
                                                </div>
                                            </td>
                                            <td className={`p-4 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{row.role}</td>
                                            
                                            {/* Clickable Lead counts */}
                                            <td className="p-4 text-center font-bold text-red-500">
                                                {row.hot > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'HOT')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.hot}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.hot}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-orange-500">
                                                {row.warm > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'WARM')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.warm}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.warm}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-blue-500">
                                                {row.cold > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'COLD')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.cold}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.cold}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-purple-500">
                                                {row.neutral > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'NEUTRAL')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.neutral}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.neutral}</span>
                                                )}
                                            </td>
                                            <td className={`p-4 text-center font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {row.invalid > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'INVALID')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.invalid}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.invalid}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-teal-500">
                                                {row.todaysFollowUp > 0 ? (
                                                    <span className="inline-block">{row.todaysFollowUp}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.todaysFollowUp || 0}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-amber-600">
                                                {row.previousFollowUp > 0 ? (
                                                    <span className="inline-block">{row.previousFollowUp}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.previousFollowUp || 0}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-emerald-500">
                                                {row.walkInCount > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'WALK_IN')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.walkInCount}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.walkInCount || 0}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-indigo-500">
                                                {row.admissionCount > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'ADMISSION')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.admissionCount}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.admissionCount || 0}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-extrabold text-cyan-400">
                                                {row.totalCalls > 0 ? (
                                                    <span onClick={() => handleCountClick(row, 'ALL')} className="cursor-pointer hover:underline hover:scale-110 transition-all inline-block">{row.totalCalls}</span>
                                                ) : (
                                                    <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} opacity-40`}>{row.totalCalls}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals Row */}
                                    <tr className={`font-black uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] border-t border-gray-800 text-gray-200' : 'bg-gray-100 border-t border-gray-350 text-gray-700'}`}>
                                        <td className="p-4" colSpan="3">Total Summary</td>
                                        <td className="p-4 text-center text-red-500 font-extrabold">{totals.hot}</td>
                                        <td className="p-4 text-center text-orange-500 font-extrabold">{totals.warm}</td>
                                        <td className="p-4 text-center text-blue-500 font-extrabold">{totals.cold}</td>
                                        <td className="p-4 text-center text-purple-500 font-extrabold">{totals.neutral}</td>
                                        <td className={`p-4 text-center font-extrabold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{totals.invalid}</td>
                                        <td className="p-4 text-center text-teal-500 font-extrabold">{totals.todaysFollowUp}</td>
                                        <td className="p-4 text-center text-amber-600 font-extrabold">{totals.previousFollowUp}</td>
                                        <td className="p-4 text-center text-emerald-500 font-extrabold">{totals.walkInCount}</td>
                                        <td className="p-4 text-center text-indigo-500 font-extrabold">{totals.admissionCount}</td>
                                        <td className="p-4 text-center text-cyan-400 font-extrabold">{totals.totalCalls}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Total Staff Count: {filteredData.length}
                    </p>
                    <button
                        onClick={onClose}
                        className={`px-8 py-2.5 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isDarkMode ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200'} cursor-pointer`}
                    >
                        Close Report
                    </button>
                </div>
            </div>

            {/* SECONDARY CALLS DETAIL POPUP */}
            {selectedUser && (
                <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/80' : 'bg-white/70'}`}>
                    <div className={`w-full max-w-5xl h-[75vh] flex flex-col rounded-[2px] border shadow-2xl scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}>
                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div>
                                <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <FaPhoneAlt className="text-cyan-500 shrink-0" />
                                    {selectedUser.userName}'s {selectedLeadType === 'WALK_IN' ? 'WALK IN DETAILS' : selectedLeadType === 'ADMISSION' ? 'ADMISSION DETAILS' : (selectedLeadType !== 'ALL' ? `${selectedLeadType} LEAD CALL DETAILS` : 'TOTAL CALL DETAILS')}
                                </h3>
                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                    Centre: {selectedUser.centreName} | Role: {selectedUser.role.toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className={`p-2 rounded-[2px] transition-all hover:rotate-90 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {/* Search and Action Row */}
                        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${isDarkMode ? 'bg-[#181d23] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded border w-full md:w-80 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <FaSearch className="text-gray-500 text-sm" />
                                <input 
                                    type="text"
                                    placeholder={selectedLeadType === 'ADMISSION' ? "Search student, admission number or remarks..." : "Search student, phone, feedback or remarks..."}
                                    value={popupSearchQuery}
                                    onChange={(e) => setPopupSearchQuery(e.target.value)}
                                    className={`bg-transparent border-none outline-none text-xs w-full ${isDarkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}`}
                                />
                            </div>

                            {selectedLeadType !== 'WALK_IN' && selectedLeadType !== 'ADMISSION' && (
                                <button
                                    onClick={handleExportUserCalling}
                                    disabled={exportingUserCalling || loadingPopup}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-[2px] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                                >
                                    {exportingUserCalling ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
                                    Export User calling Report
                                </button>
                            )}
                        </div>

                        {/* Calls Table Content */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {loadingPopup ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {selectedLeadType === 'WALK_IN' ? 'Loading walk-ins list...' 
                                         : selectedLeadType === 'ADMISSION' ? 'Loading admissions list...' 
                                         : selectedLeadType === 'TODAYS_FOLLOWUP' ? 'Loading todays follow-ups...' 
                                         : selectedLeadType === 'PREVIOUS_FOLLOWUP' ? 'Loading previous follow-ups...' 
                                         : 'Loading calls list...'}
                                    </p>
                                </div>
                            ) : filteredPopupCalls.length === 0 ? (
                                <div className="py-20 text-center">
                                    <FaPhoneAlt className={`mx-auto mb-4 text-4xl ${isDarkMode ? 'text-gray-800' : 'text-gray-200'}`} />
                                    <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {selectedLeadType === 'WALK_IN' ? 'No walk-in entries found matching criteria' 
                                         : selectedLeadType === 'ADMISSION' ? 'No admission entries found matching criteria' 
                                         : selectedLeadType === 'TODAYS_FOLLOWUP' ? 'No todays follow-up entries found' 
                                         : selectedLeadType === 'PREVIOUS_FOLLOWUP' ? 'No previous follow-up entries found' 
                                         : 'No call entries found matching criteria'}
                                    </p>
                                </div>
                            ) : (
                                <div className={`overflow-x-auto border rounded-[2px] ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                    <table className="w-full text-left border-collapse">
                                        {['WALK_IN', 'TODAYS_FOLLOWUP', 'PREVIOUS_FOLLOWUP'].includes(selectedLeadType) ? (
                                            <>
                                                <thead>
                                                    <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>#</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Student Name</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Phone Number</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Class</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Board</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>School</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Course</th>
                                                        <th className={`p-4 font-semibold text-center border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Lead Status</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Remarks</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                            {selectedLeadType === 'WALK_IN' ? 'Walk-In Date' : 'Follow-Up Date'}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {filteredPopupCalls.map((call, index) => (
                                                        <tr key={index} className={`border-b last:border-b-0 transition-colors ${
                                                            isDarkMode ? 'border-gray-800 hover:bg-[#1f252b] text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                                                        }`}>
                                                            <td className={`p-4 text-xs font-semibold ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{index + 1}</td>
                                                            <td className={`p-4 font-medium uppercase tracking-wide ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{call.studentName}</td>
                                                            <td className={`p-4 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{call.phoneNumber}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.className || '-'}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.boardName || '-'}</td>
                                                            <td className={`p-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{call.schoolName || '-'}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.courseName || '-'}</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`inline-block px-2.5 py-0.5 rounded-[2px] text-[9px] font-extrabold uppercase tracking-tight ${getLeadBadge(call.leadType)}`}>
                                                                    {call.leadType}
                                                                </span>
                                                            </td>
                                                            <td className={`p-4 text-xs max-w-[150px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={call.remarks}>{call.remarks || '-'}</td>
                                                            <td className="p-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                                {call.date ? (
                                                                    selectedLeadType === 'WALK_IN' 
                                                                        ? new Date(call.date).toLocaleString('en-GB') 
                                                                        : new Date(call.date).toLocaleDateString('en-GB')
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </>
                                        ) : selectedLeadType === 'ADMISSION' ? (
                                            <>
                                                <thead>
                                                    <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>#</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Student Name</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Admission No</th>
                                                        <th className={`p-4 font-semibold text-center border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Type</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Class</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Board</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Course</th>
                                                        <th className={`p-4 font-semibold text-right border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Total Fees</th>
                                                        <th className={`p-4 font-semibold text-right border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Down Payment</th>
                                                        <th className={`p-4 font-semibold text-right border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Remaining</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Remarks</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Admission Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {filteredPopupCalls.map((call, index) => (
                                                        <tr key={index} className={`border-b last:border-b-0 transition-colors ${
                                                            isDarkMode ? 'border-gray-800 hover:bg-[#1f252b] text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                                                        }`}>
                                                            <td className={`p-4 text-xs font-semibold ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{index + 1}</td>
                                                            <td className={`p-4 font-medium uppercase tracking-wide ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{call.studentName}</td>
                                                            <td className={`p-4 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{call.admissionNumber}</td>
                                                            <td className="p-4 text-center text-xs">
                                                                <span className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-black uppercase ${
                                                                    isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200'
                                                                }`}>
                                                                    {call.admissionType}
                                                                </span>
                                                            </td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.className || '-'}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.boardName || '-'}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.courseName || '-'}</td>
                                                            <td className={`p-4 text-right text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>₹{call.totalFees?.toLocaleString('en-IN') || 0}</td>
                                                            <td className="p-4 text-right text-xs font-bold text-emerald-500">₹{call.downPayment?.toLocaleString('en-IN') || 0}</td>
                                                            <td className="p-4 text-right text-xs font-bold text-red-500">₹{call.remainingAmount?.toLocaleString('en-IN') || 0}</td>
                                                            <td className={`p-4 text-xs max-w-[150px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={call.remarks}>{call.remarks || '-'}</td>
                                                            <td className="p-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                                {new Date(call.date).toLocaleString('en-GB')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </>
                                        ) : (
                                            <>
                                                <thead>
                                                    <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>#</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Student Name</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Phone Number</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Class</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Board</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>School</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Course</th>
                                                        <th className={`p-4 font-semibold text-center border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Call Type</th>
                                                        <th className={`p-4 font-semibold text-center border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Lead Status</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Feedback</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Remarks</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Next Follow Up</th>
                                                        <th className={`p-4 font-semibold border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>Date & Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {filteredPopupCalls.map((call, index) => (
                                                        <tr key={index} className={`border-b last:border-b-0 transition-colors ${
                                                            isDarkMode ? 'border-gray-800 hover:bg-[#1f252b] text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                                                        }`}>
                                                            <td className={`p-4 text-xs font-semibold ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{index + 1}</td>
                                                            <td className={`p-4 font-medium uppercase tracking-wide ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{call.studentName}</td>
                                                            <td className={`p-4 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{call.phoneNumber}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.className || '-'}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.boardName || '-'}</td>
                                                            <td className={`p-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{call.schoolName || '-'}</td>
                                                            <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{call.courseName || '-'}</td>
                                                            <td className="p-4 text-center text-xs">
                                                                <span className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-black uppercase ${
                                                                    isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200'
                                                                }`}>
                                                                    {call.callType}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`inline-block px-2.5 py-0.5 rounded-[2px] text-[9px] font-extrabold uppercase tracking-tight ${getLeadBadge(call.leadType)}`}>
                                                                    {call.leadType}
                                                                </span>
                                                            </td>
                                                            <td className={`p-4 text-xs max-w-[150px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={call.feedback}>{call.feedback || '-'}</td>
                                                            <td className={`p-4 text-xs max-w-[150px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={call.remarks}>{call.remarks || '-'}</td>
                                                            <td className="p-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                                {call.nextFollowUpDate ? new Date(call.nextFollowUpDate).toLocaleDateString('en-GB') : '-'}
                                                            </td>
                                                            <td className="p-4 text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                                {new Date(call.date).toLocaleString('en-GB')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </>
                                        )}
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className={`px-6 py-4 border-t flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                Total Matching Calls: {filteredPopupCalls.length}
                            </p>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className={`px-6 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} cursor-pointer`}
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default ActiveCentresCallsReportModal;
