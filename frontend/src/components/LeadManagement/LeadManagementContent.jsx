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

const LeadManagementContent = () => {
    const navigate = useNavigate();
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

            console.log("Lead Management - Fetching leads with params:", Object.fromEntries(params));
            console.log("Lead Management - Current filters:", filters);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            console.log("Lead Management - Response:", data);

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

            console.log("Lead Management - Current user:", currentUser);

            // If superAdmin, fetch all centres
            if (currentUser.role === 'superAdmin') {
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const centres = await response.json();
                console.log("Lead Management - SuperAdmin, all centres:", centres);
                setAllowedCentres(centres);
            } else {
                // For non-superAdmin, use populated centres from profile
                const userCentres = currentUser.centres || [];
                console.log("Lead Management - User centres from profile:", userCentres);
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

    const [localTheme, setLocalTheme] = useState(() => localStorage.getItem('leadManagementTheme') || 'dark');

    useEffect(() => {
        // Remove global dark class to ensure isolation
        document.documentElement.classList.remove('dark');
        localStorage.setItem('leadManagementTheme', localTheme);
    }, [localTheme]);

    const toggleLocalTheme = () => {
        setLocalTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // ... existing code ...

    return (
        <div className={`p-6 space-y-6 ${localTheme === 'dark' ? 'dark' : ''}`}>
             {/* Wrapper to apply dark class locally */}
             {/* Note: Tailwind 'dark' class relies on parent. If we put 'dark' here, children using dark: variant will work */}
             
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Management</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Manage and track all your leads</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={toggleLocalTheme}
                        className="p-2 mr-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        title={`Switch to ${localTheme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {localTheme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} className="text-gray-600" />}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-500 transition-colors"
                    >
                        <FaDownload /> Export Excel
                    </button>
                    {user && hasPermission(user, 'leadManagement', 'dashboard', 'view') && (
                        <button
                            onClick={() => navigate('/lead-management/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                        >
                            <FaChartLine /> Dashboard
                        </button>
                    )}
                    {/* Only show Import if Create is allowed? Or separate permission? Assuming Create permission allows Bulk Import too for simplify */}
                    {canCreate && (
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-500 transition-colors"
                        >
                            <FaFileExcel /> Import Excel
                        </button>
                    )}
                    <button
                        onClick={() => setShowFollowUpListModal(true)}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-500 transition-colors"
                    >
                        <FaHistory /> Follow Up List
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-cyan-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
                        >
                            <FaPlus /> Add Lead
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm dark:shadow-none transition-colors">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, or school..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full bg-gray-50 dark:bg-[#131619] border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm dark:shadow-none transition-colors">
                <div className="flex items-center gap-2 mb-3">
                    <FaFilter className="text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-gray-900 dark:text-white font-semibold">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 text-xs mb-1">Lead Type</label>
                        <CustomMultiSelect
                            options={[
                                { value: "HOT LEAD", label: "HOT LEAD" },
                                { value: "COLD LEAD", label: "COLD LEAD" },
                                { value: "NEGATIVE", label: "NEGATIVE" }
                            ]}
                            value={filters.leadType}
                            onChange={(selected) => handleFilterChange('leadType', selected)}
                            placeholder="Select Type"
                            theme={localTheme}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 text-xs mb-1">Source</label>
                        <CustomMultiSelect
                            options={sources.map(s => ({ value: s.sourceName, label: s.sourceName }))}
                            value={filters.source}
                            onChange={(selected) => handleFilterChange('source', selected)}
                            placeholder="Select Source"
                            theme={localTheme}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 text-xs mb-1">Centre</label>
                        <CustomMultiSelect
                            options={allowedCentres.map(c => ({ value: c._id, label: c.centreName }))}
                            value={filters.centre}
                            onChange={(selected) => handleFilterChange('centre', selected)}
                            placeholder="Select Centre"
                            theme={localTheme}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 text-xs mb-1">Course</label>
                        <CustomMultiSelect
                            options={courses.map(c => ({ value: c._id, label: c.courseName }))}
                            value={filters.course}
                            onChange={(selected) => handleFilterChange('course', selected)}
                            placeholder="Select Course"
                            theme={localTheme}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 text-xs mb-1">Board</label>
                        <CustomMultiSelect
                            options={boards.map(b => ({ value: b._id, label: b.boardName || b.boardCourse }))} // Fallback to boardCourse if name not populated as boardName
                            value={filters.board}
                            onChange={(selected) => handleFilterChange('board', selected)}
                            placeholder="Select Board"
                            theme={localTheme}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 text-xs mb-1">Lead Responsibility</label>
                         <CustomMultiSelect
                            options={telecallers.map(t => ({ value: t.name, label: t.name }))}
                            value={filters.leadResponsibility}
                            onChange={(selected) => handleFilterChange('leadResponsibility', selected)}
                            placeholder="Select Telecaller"
                            isDisabled={user?.role === 'telecaller'}
                            theme={localTheme}
                        />
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 text-sm font-medium"
                    >
                        <FaRedo size={12} /> Reset Filters
                    </button>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm dark:shadow-none transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">S/N</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone Number</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Board</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">School Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Centre</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Exam</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lead Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lead Responsibility</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="14" className="px-4 py-8 text-center text-cyan-600 dark:text-cyan-400">
                                        Loading...
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No leads found
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead, index) => (
                                    <tr key={lead._id} onClick={() => handleRowClick(lead)} className="hover:bg-gray-50 dark:hover:bg-[#131619] transition-colors border-b border-gray-200 dark:border-gray-800 cursor-pointer">
                                        <td className="px-4 py-3 text-gray-900 dark:text-white">{(currentPage - 1) * limit + index + 1}</td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{lead.name}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.email}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.phoneNumber || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.className?.name || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.board?.boardName || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.schoolName}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.centre?.centreName || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.course?.courseName || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.source || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.targetExam || "N/A"}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs border ${getLeadTypeColor(lead.leadType)} font-medium`}>
                                                {lead.leadType || "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.leadResponsibility || "N/A"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCounseling(lead); }}
                                                    className="bg-blue-600 dark:bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors shadow-sm"
                                                >
                                                    Counseling
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}
                                                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }}
                                                        className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                                    >
                                                        <FaTrash size={16} />
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
            <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                    Showing {leads.length === 0 ? 0 : (currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalLeads)} of {totalLeads} entries
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-gray-100 dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 p-2 rounded-lg hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FaChevronLeft size={12} />
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${currentPage === i + 1
                                ? "bg-cyan-600 dark:bg-cyan-500 text-white font-bold"
                                : "bg-gray-100 dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-gray-100 dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 p-2 rounded-lg hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FaChevronRight size={12} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            {
                showAddModal && (
                    <AddLeadModal
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            setShowAddModal(false);
                            fetchLeads();
                        }}
                    />
                )
            }

            {
                showEditModal && selectedLead && (
                    <EditLeadModal
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
                )
            }

            {
                showBulkModal && (
                    <BulkLeadModal
                        onClose={() => setShowBulkModal(false)}
                        onSuccess={() => {
                            setShowBulkModal(false);
                            fetchLeads();
                        }}
                    />
                )
            }

            {
                showDetailModal && selectedDetailLead && (
                    <LeadDetailsModal
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
                            // Close modal if deleted, though handleDelete usually refreshes list. 
                            // If delete successful, we might need to close modal.
                            // Assuming fetchLeads handles the refresh, we should close modal to avoid showing stale data.
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
                            // Keep details open? Or open history on top?
                            // User said "show pop up... entire screen".
                            // I'll show history modal.
                            // I might want to keep detail modal open underneath if history is an overlay, 
                            // but usually better to switch context or simple overlay.
                            // Implemeting as separate modal state.
                            // Let's close detail modal to focus on history or keep it open?
                            // If "entire screen", it will cover everything anyway.
                            // I will NOT close detail modal so when they close history they return to details?
                            // Actually, simplified ux: close details, show history.
                            // But user might want to go back.
                            // I'll keep detail modal state as is (open) and render history on top (z-index higher).
                            // wait, if I don't close it, it's still there.
                            // If I render HistoryModal conditionally, I need state.
                            setSelectedDetailLead(lead);
                            setShowHistoryModal(true);
                        }}
                    />
                )
            }

            {
                showFollowUpModal && selectedLead && (
                    <AddFollowUpModal
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
                )
            }

            {
                showHistoryModal && selectedDetailLead && (
                    <FollowUpHistoryModal
                        lead={selectedDetailLead}
                        onClose={() => setShowHistoryModal(false)}
                    />
                )
            }

            {
                showFollowUpListModal && (
                    <FollowUpListModal
                        onClose={() => setShowFollowUpListModal(false)}
                        onShowHistory={(lead) => {
                            // User might want to see detailed history from the list
                            // We can reuse history modal here.
                            // Assuming we want to show history on top of list or instead of list?
                            // User said "button which will be all follow up, after licking on it all the follow up details will be opne"
                            // I implemented that button inside the ListModal rows.
                            // So I need to handle opening HistoryModal.
                            // I'll open history modal on top of list modal (z-index should handle it if history is higher).
                            // FollowUpHistoryModal z-index is 70, ListModal is 60. So it works.
                            setSelectedDetailLead(lead);
                            setShowHistoryModal(true);
                        }}
                    />
                )
            }
        </div >
    );
};

export default LeadManagementContent;
