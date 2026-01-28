import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaRedo, FaFileExcel, FaDownload, FaChevronLeft, FaChevronRight, FaHistory, FaChartLine, FaUserPlus, FaSun, FaMoon } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AddLeadModal from "./AddLeadModal";
import EditLeadModal from "./EditLeadModal";
import BulkLeadModal from "./BulkLeadModal";
import LeadDetailsModal from "./LeadDetailsModal";
import AddFollowUpModal from "./AddFollowUpModal";
import FollowUpHistoryModal from "./FollowUpHistoryModal";
import FollowUpListModal from "./FollowUpListModal";
import CustomMultiSelect from "../common/CustomMultiSelect";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

const LeadManagementContent = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showFollowUpListModal, setShowFollowUpListModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedDetailLead, setSelectedDetailLead] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Permission states
    const [user, setUser] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const limit = 10;

    // Filter states
    const [filters, setFilters] = useState({
        leadType: [],
        source: [],
        centre: [],
        course: [],
        board: [],
        leadResponsibility: []
    });

    // Dropdown data for filters
    const [sources, setSources] = useState([]);
    const [courses, setCourses] = useState([]);
    const [boards, setBoards] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState([]);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // Build query params
            const params = new URLSearchParams();
            params.append("page", currentPage);
            params.append("limit", limit);
            if (searchTerm) params.append("search", searchTerm);

            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value) && value.length > 0) {
                    value.forEach(v => params.append(key, v.value || v)); // Handle object from react-select or raw value
                } else if (value) {
                    params.append(key, value);
                }
            });

            // console.log("Lead Management - Fetching leads with params:", Object.fromEntries(params));
            // console.log("Lead Management - Current filters:", filters);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            // console.log("Lead Management - Response:", data);

            if (response.ok) {
                setLeads(data.leads);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages);
                    setTotalLeads(data.pagination.totalLeads);
                }
            } else {
                toast.error(data.message || "Failed to fetch leads");
                console.error("Lead Management - Error response:", data);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
            toast.error("Error fetching leads");
        } finally {
            setLoading(false);
        }
    }, [currentPage, filters, limit, searchTerm]);

    const fetchAllowedCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;

            // Fetch current user data to get latest centre assignments
            const userResponse = await fetch(`${apiUrl}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!userResponse.ok) {
                console.error("Failed to fetch user profile");
                return;
            }

            const responseData = await userResponse.json();
            const currentUser = responseData.user;

            // console.log("Lead Management - Current user:", currentUser);

            // If superAdmin, fetch all centres
            if (currentUser.role === 'superAdmin') {
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const centres = await response.json();
                // console.log("Lead Management - SuperAdmin, all centres:", centres);
                setAllowedCentres(centres);
            } else {
                // For non-superAdmin, use populated centres from profile
                const userCentres = currentUser.centres || [];
                // console.log("Lead Management - User centres from profile:", userCentres);
                setAllowedCentres(userCentres);
            }
        } catch (error) {
            console.error("Error fetching allowed centres:", error);
        }
    }, []);

    const fetchFilterData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

            // Fetch sources
            const sourceResponse = await fetch(`${import.meta.env.VITE_API_URL}/source`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const sourceData = await sourceResponse.json();
            if (sourceResponse.ok) setSources(sourceData.sources || []);

            // Note: Centres are now fetched in fetchAllowedCentres() based on user permissions

            // Fetch courses
            const courseResponse = await fetch(`${import.meta.env.VITE_API_URL}/course`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const courseData = await courseResponse.json();
            if (courseResponse.ok) setCourses(Array.isArray(courseData) ? courseData : []);

            // Fetch boards
            const boardResponse = await fetch(`${import.meta.env.VITE_API_URL}/board`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const boardData = await boardResponse.json();
            if (boardResponse.ok) setBoards(Array.isArray(boardData) ? boardData : []);

            // Fetch telecallers
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userResponse.json();
            if (userResponse.ok) {
                const telecallerUsers = (userData.users || []).filter(user => user.role === "telecaller");

                // If current user is a telecaller, only show their own name
                if (currentUser.role === "telecaller") {
                    const currentTelecaller = telecallerUsers.find(t => t._id === currentUser._id);
                    setTelecallers(currentTelecaller ? [currentTelecaller] : []);

                    // Auto-select the telecaller's own name
                    if (currentTelecaller) {
                        setFilters(prev => ({ ...prev, leadResponsibility: [{ value: currentTelecaller.name, label: currentTelecaller.name }] }));
                    }
                } else {
                    // For other roles, show all telecallers
                    setTelecallers(telecallerUsers);
                }
            }
        } catch (error) {
            console.error("Error fetching filter data:", error);
        }
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setCanCreate(hasPermission(parsedUser, 'leadManagement', 'leads', 'create'));
            setCanEdit(hasPermission(parsedUser, 'leadManagement', 'leads', 'edit'));
            setCanDelete(hasPermission(parsedUser, 'leadManagement', 'leads', 'delete'));
        }
        fetchAllowedCentres();
        fetchFilterData();
    }, [fetchAllowedCentres, fetchFilterData]);

    useEffect(() => {
        // Debounce search to avoid too many requests
        const timeout = setTimeout(() => {
            fetchLeads();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm, filters, currentPage, fetchLeads]);

    const handleFilterChange = (name, selectedOptions) => {
        setFilters(prev => ({ ...prev, [name]: selectedOptions || [] }));
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setFilters({
            leadType: [],
            source: [],
            centre: [],
            course: [],
            board: [],
            leadResponsibility: []
        });
        setSearchTerm("");
        setCurrentPage(1);
    };

    const handleRowClick = (lead) => {
        setSelectedDetailLead(lead);
        setShowDetailModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this lead?")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Lead deleted successfully");
                fetchLeads();
            } else {
                toast.error(data.message || "Failed to delete lead");
            }
        } catch (error) {
            console.error("Error deleting lead:", error);
            toast.error("Error deleting lead");
        }
    };

    const handleEdit = (lead) => {
        setSelectedLead(lead);
        setShowEditModal(true);
    };

    const handleCounseling = (lead) => {
        navigate("/student-registration", { state: { leadData: lead } });
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (searchTerm) params.append("search", searchTerm);

            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value) && value.length > 0) {
                    value.forEach(v => params.append(key, v.value || v));
                } else if (value) {
                    params.append(key, value);
                }
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/export/excel?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                saveAs(blob, "Leads_Export.xlsx");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to export leads");
            }
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Error exporting leads");
        }
    };

    const getLeadTypeColor = (type) => {
        switch (type) {
            case "HOT LEAD":
                return "bg-red-500/20 text-red-400 border-red-500";
            case "COLD LEAD":
                return "bg-blue-500/20 text-blue-400 border-blue-500";
            case "NEGATIVE":
                return "bg-gray-500/20 text-gray-400 border-gray-500";
            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500";
        }
    };

    // Local theme logic removed in favor of global theme provider

    // Local theme effects removed

    // ... existing code ...

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <div className="p-6 md:p-8 max-w-[1800px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div>
                        <h1 className={`text-4xl font-black mb-2 tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Lead <span className="text-cyan-500">Management</span>
                        </h1>
                        <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2`}>
                            Lead Tracking & Management
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className={`p-3 rounded-[2px] border transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}
                        >
                            {isDarkMode ? <><FaSun /> Day Mode</> : <><FaMoon /> Night Mode</>}
                        </button>

                        <button
                            onClick={handleExport}
                            className="px-6 py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-[2px] border border-emerald-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                            <FaDownload /> Export Excel
                        </button>
                        {user && hasPermission(user, 'leadManagement', 'dashboard', 'view') && (
                            <button
                                onClick={() => navigate('/lead-management/dashboard')}
                                className="px-6 py-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-[2px] border border-blue-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                            >
                                <FaChartLine /> Dashboard
                            </button>
                        )}
                        {canCreate && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="px-6 py-3 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-[2px] border border-indigo-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                            >
                                <FaFileExcel /> Import Excel
                            </button>
                        )}
                        <button
                            onClick={() => setShowFollowUpListModal(true)}
                            className="px-6 py-3 bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white rounded-[2px] border border-purple-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                        >
                            <FaHistory /> Follow Up List
                        </button>
                        {canCreate && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-3 bg-cyan-500 text-black hover:bg-cyan-400 rounded-[2px] shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                            >
                                <FaPlus /> Add Lead
                            </button>
                        )}
                    </div>
                </div>

                {/* Search Bar */}
                <div className={`border rounded-[2px] p-6 relative group transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 focus-within:border-cyan-500/30' : 'bg-white border-gray-200 focus-within:border-cyan-500/30 shadow-sm'}`}>
                    <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-xs transition-colors group-focus-within:text-cyan-500" />
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME, EMAIL, PHONE, OR SCHOOL..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className={`w-full bg-transparent border-none pl-12 pr-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none placeholder:text-gray-700 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className={`border rounded-[2px] p-8 space-y-6 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-cyan-500/10 text-cyan-500 rounded-[2px]">
                            <FaFilter size={12} />
                        </span>
                        <h3 className={`text-[12px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Filter Leads</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Lead Type</label>
                            <CustomMultiSelect
                                options={[
                                    { value: "HOT LEAD", label: "HOT LEAD" },
                                    { value: "COLD LEAD", label: "COLD LEAD" },
                                    { value: "NEGATIVE", label: "NEGATIVE" }
                                ]}
                                value={filters.leadType}
                                onChange={(selected) => handleFilterChange('leadType', selected)}
                                placeholder="Select Type"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Source</label>
                            <CustomMultiSelect
                                options={sources.map(s => ({ value: s.sourceName, label: s.sourceName }))}
                                value={filters.source}
                                onChange={(selected) => handleFilterChange('source', selected)}
                                placeholder="Select Source"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Centre</label>
                            <CustomMultiSelect
                                options={allowedCentres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={filters.centre}
                                onChange={(selected) => handleFilterChange('centre', selected)}
                                placeholder="Select Centre"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Course</label>
                            <CustomMultiSelect
                                options={courses.map(c => ({ value: c._id, label: c.courseName }))}
                                value={filters.course}
                                onChange={(selected) => handleFilterChange('course', selected)}
                                placeholder="Select Course"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Board</label>
                            <CustomMultiSelect
                                options={boards.map(b => ({ value: b._id, label: b.boardName || b.boardCourse }))}
                                value={filters.board}
                                onChange={(selected) => handleFilterChange('board', selected)}
                                placeholder="Select Board"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Telecaller</label>
                            <CustomMultiSelect
                                options={telecallers.map(t => ({ value: t.name, label: t.name }))}
                                value={filters.leadResponsibility}
                                onChange={(selected) => handleFilterChange('leadResponsibility', selected)}
                                placeholder="Select Telecaller"
                                isDisabled={user?.role === 'telecaller'}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={resetFilters}
                            className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isDarkMode ? 'text-gray-500 hover:text-cyan-400' : 'text-gray-400 hover:text-cyan-600'}`}
                        >
                            <FaRedo size={10} /> Reset Filters
                        </button>
                    </div>
                </div>

                {/* Leads Table */}
                <div className={`border rounded-[2px] overflow-hidden transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead className={`border-b ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <tr>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>S/N</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Name</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Contact Details</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Operational Info</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Lead Status</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Responsibility</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-cyan-500 font-black uppercase text-[10px] tracking-widest animate-pulse">
                                            Loading Leads...
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">
                                            No leads found
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead, index) => (
                                        <tr key={lead._id} onClick={() => handleRowClick(lead)} className={`transition-all group cursor-pointer ${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'}`}>
                                            <td className={`px-6 py-4 text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{(currentPage - 1) * limit + index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>{lead.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.email}</div>
                                                <div className="text-[10px] font-black text-cyan-500 mt-0.5">{lead.phoneNumber || "NO CONTACT"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.centre?.centreName || "N/A"}</div>
                                                <div className="text-[9px] font-bold text-cyan-500 mt-0.5">{lead.course?.courseName || "General Query"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${getLeadTypeColor(lead.leadType)}`}>
                                                    {lead.leadType || "UNASSIGNED"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-[2px] inline-block ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                    {lead.leadResponsibility || "NO OWNER"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCounseling(lead); }}
                                                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                                                    >
                                                        Counselling
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}
                                                            className={`transition-colors ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }}
                                                            className="text-red-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <FaTrash size={14} />
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
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-800">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        Showing: {leads.length === 0 ? 0 : (currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, totalLeads)} / {totalLeads} Records
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-[2px] transition-all disabled:opacity-30 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-cyan-500' : 'bg-white border border-gray-200 text-gray-500'}`}
                        >
                            <FaChevronLeft size={10} />
                        </button>

                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-8 h-8 rounded-[2px] text-[10px] font-black transition-all ${currentPage === i + 1
                                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                    : (isDarkMode ? "bg-gray-800 text-gray-500 hover:text-white" : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50")
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-[2px] transition-all disabled:opacity-30 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-cyan-500' : 'bg-white border border-gray-200 text-gray-500'}`}
                        >
                            <FaChevronRight size={10} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#e5e7eb'}; border-radius: 2px; }
            `}</style>

            {/* Modals */}
            {showAddModal && (
                <AddLeadModal
                    isDarkMode={isDarkMode}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchLeads();
                    }}
                />
            )}

            {showEditModal && selectedLead && (
                <EditLeadModal
                    isDarkMode={isDarkMode}
                    lead={selectedLead}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedLead(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedLead(null);
                        fetchLeads();
                    }}
                />
            )}

            {showBulkModal && (
                <BulkLeadModal
                    isDarkMode={isDarkMode}
                    onClose={() => setShowBulkModal(false)}
                    onSuccess={() => {
                        setShowBulkModal(false);
                        fetchLeads();
                    }}
                />
            )}

            {showDetailModal && selectedDetailLead && (
                <LeadDetailsModal
                    isDarkMode={isDarkMode}
                    lead={selectedDetailLead}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedDetailLead(null);
                    }}
                    onEdit={(lead) => {
                        setShowDetailModal(false);
                        handleEdit(lead);
                    }}
                    onDelete={(id) => {
                        handleDelete(id);
                        setShowDetailModal(false);
                        setSelectedDetailLead(null);
                    }}
                    onFollowUp={(lead) => {
                        setShowDetailModal(false);
                        setSelectedLead(lead);
                        setShowFollowUpModal(true);
                    }}
                    onCounseling={(lead) => {
                        handleCounseling(lead);
                    }}
                    onShowHistory={(lead) => {
                        setSelectedDetailLead(lead);
                        setShowHistoryModal(true);
                    }}
                />
            )}

            {showFollowUpModal && selectedLead && (
                <AddFollowUpModal
                    isDarkMode={isDarkMode}
                    lead={selectedLead}
                    onClose={() => {
                        setShowFollowUpModal(false);
                        setSelectedLead(null);
                    }}
                    onSuccess={() => {
                        setShowFollowUpModal(false);
                        setSelectedLead(null);
                        fetchLeads();
                    }}
                />
            )}

            {showHistoryModal && selectedDetailLead && (
                <FollowUpHistoryModal
                    isDarkMode={isDarkMode}
                    lead={selectedDetailLead}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}

            {showFollowUpListModal && (
                <FollowUpListModal
                    isDarkMode={isDarkMode}
                    onClose={() => setShowFollowUpListModal(false)}
                    onShowHistory={(lead) => {
                        setSelectedDetailLead(lead);
                        setShowHistoryModal(true);
                    }}
                />
            )}
        </div>
    );
};

export default LeadManagementContent;
