import React, { useState, useEffect, useCallback } from "react";
import { FaCalendarAlt, FaDownload, FaFileUpload, FaFileExcel, FaPlus, FaFilter, FaSearch, FaChevronLeft, FaChevronRight, FaMoon, FaSun, FaHistory, FaChartLine, FaTrash, FaRedo, FaPhoneAlt, FaEnvelope, FaEdit, FaStar, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import AddLeadModal from "./AddLeadModal";
import EditLeadModal from "./EditLeadModal";
import BulkLeadModal from "./BulkLeadModal";
import LeadDetailsModal from "./LeadDetailsModal";
import AddFollowUpModal from "./AddFollowUpModal";
import FollowUpHistoryModal from "./FollowUpHistoryModal";
import FollowUpListModal from "./FollowUpListModal";
import CentreAnalysisModal from "./CentreAnalysisModal";
import CustomMultiSelect from "../common/CustomMultiSelect";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";
import LeadTrendChart from "./LeadTrendChart"; // Added Import
import CentreCallBarChart from "./CentreCallBarChart";
import FollowUpActivityModal from "./FollowUpActivityModal";
import { CardSkeleton, TableRowSkeleton, FeedItemSkeleton } from "../common/Skeleton";
const LeadManagementContent = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
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
    const [dailyLeads, setDailyLeads] = useState([]); // Added state
    const [followUpStats, setFollowUpStats] = useState({
        totalFollowUps: 0,
        hotLeads: 0,
        coldLeads: 0,
        negativeLeads: 0,
        totalScheduled: 0,
        recentActivity: [],
        scheduledList: []
    });

    const [leadStats, setLeadStats] = useState({
        contactedCount: 0,
        remainingCount: 0
    });

    const [activityModal, setActivityModal] = useState({
        isOpen: false,
        title: "",
        data: []
    });

    const [centreAnalysis, setCentreAnalysis] = useState([]);
    const [showCentreAnalysisModal, setShowCentreAnalysisModal] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);

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
        className: [],
        leadResponsibility: [],
        fromDate: "",
        toDate: "",
        scheduledDate: new Date().toISOString().split('T')[0],
        feedback: [],
        followUpStatus: []
    });

    // Dropdown data for filters
    const [sources, setSources] = useState([]);
    const [courses, setCourses] = useState([]);
    const [boards, setBoards] = useState([]);
    const [classes, setClasses] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [feedbackCategories, setFeedbackCategories] = useState([]);

    const fetchLeadStats = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/stats/dashboard?fromDate=${new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDailyLeads(data.dailyLeads || []);
            }
        } catch (error) {
            console.error("Error fetching lead stats:", error);
        }
    }, []);

    const fetchFollowUpStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            // Pass all relevant filters to the stats endpoint (handling MultiSelect arrays)
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        const val = (v && typeof v === 'object' && 'value' in v) ? v.value : v;
                        if (val) params.append(key, val);
                    });
                } else if (value && key !== 'searchTerm') {
                    params.append(key, value);
                }
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/stats/today-followups?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFollowUpStats(data);
            }
        } catch (error) {
            console.error("Error fetching follow-up stats:", error);
        } finally {
            setStatsLoading(false);
        }
    }, [filters]);

    const fetchCentreAnalysis = useCallback(async () => {
        setAnalysisLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            // Sync with current filters
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        const val = (v && typeof v === 'object' && 'value' in v) ? v.value : v;
                        if (val) params.append(key, val);
                    });
                } else if (value && ['fromDate', 'toDate'].includes(key)) {
                    params.append(key, value);
                }
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/stats/centre-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCentreAnalysis(data);
            }
        } catch (error) {
            console.error("Error fetching centre analysis:", error);
        } finally {
            setAnalysisLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchLeadStats();
        fetchFollowUpStats();
        fetchCentreAnalysis();
    }, [fetchLeadStats, fetchFollowUpStats, fetchCentreAnalysis]);

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
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        value.forEach(v => {
                            const paramValue = (v && typeof v === 'object' && 'value' in v) ? v.value : v;
                            params.append(key, paramValue);
                        });
                    }
                } else if (value) {
                    params.append(key, value);
                }
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setLeads(data.leads);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages);
                    setTotalLeads(data.pagination.totalLeads);
                }
                if (data.stats) {
                    setLeadStats(data.stats);
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

            // If superAdmin, fetch all centres
            if (currentUser.role === 'superAdmin') {
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const centres = await response.json();
                setAllowedCentres(centres);
            } else {
                // For non-superAdmin, use populated centres from profile
                const userCentres = currentUser.centres || [];
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
            if (boardResponse.ok) setBoards(boardData || []);

            // Fetch classes
            const classResponse = await fetch(`${import.meta.env.VITE_API_URL}/class`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const classData = await classResponse.json();
            if (classResponse.ok) setClasses(Array.isArray(classData) ? classData : []);

            // Fetch telecallers (backend already filters by shared centers)
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userResponse.json();
            if (userResponse.ok) {
                // Return only relevant roles as requested (Telecallers, Counsellors, Admins, etc.)
                const leadUsers = (userData.users || []).filter(u =>
                    ['telecaller', 'centralizedTelecaller', 'counsellor', 'marketing', 'admin', 'RM'].includes(u.role)
                );
                setTelecallers(leadUsers);

                // If current user exists and is NOT a superAdmin, auto-select them in filters
                const isSuperAdmin = currentUser.role?.toLowerCase() === 'superadmin' || currentUser.role?.toLowerCase() === 'super admin';
                const currentLeadUser = leadUsers.find(t => t.name === currentUser.name);
                if (currentLeadUser && !isSuperAdmin) {
                    setFilters(prev => ({
                        ...prev,
                        leadResponsibility: prev.leadResponsibility.length > 0
                            ? prev.leadResponsibility
                            : [{ value: currentLeadUser.name, label: currentLeadUser.name }]
                    }));
                }
            }

            // Fetch follow-up feedback categories
            const feedbackResponse = await fetch(`${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const feedbackData = await feedbackResponse.json();
            if (feedbackResponse.ok) {
                setFeedbackCategories(Array.isArray(feedbackData) ? feedbackData : []);
            }
        } catch (error) {
            console.error("Error fetching filter data:", error);
        }
    }, [user?.role, user?.name]);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setCanCreate(true); // Everyone can create leads as requested
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

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setFilters({
            leadType: [],
            source: [],
            centre: [],
            course: [],
            board: [],
            className: [],
            leadResponsibility: [],
            fromDate: "",
            toDate: "",
            scheduledDate: new Date().toISOString().split('T')[0],
            feedback: [],
            followUpStatus: []
        });
        setSearchTerm("");
        setCurrentPage(1);
        toast.info("All filters have been reset");
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
            // console.log("Export Filters:", filters);
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (searchTerm) params.append("search", searchTerm);

            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        value.forEach(v => {
                            const paramValue = (v && typeof v === 'object' && 'value' in v) ? v.value : v;
                            params.append(key, paramValue);
                        });
                    }
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

    const handleCardClick = (type) => {
        let title = "";
        let filteredData = [];

        switch (type) {
            case 'total':
                title = "Total Follow-up Activity";
                filteredData = followUpStats.recentActivity;
                break;
            case 'hot':
                title = "Hot Interest Leads";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === 'HOT LEAD');
                break;
            case 'cold':
                title = "Cold Lead Discussions";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === 'COLD LEAD');
                break;
            case 'negative':
                title = "Negative Results History";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === 'NEGATIVE');
                break;
            case 'scheduled':
                title = `Scheduled Follow-ups (${filters.scheduledDate})`;
                filteredData = followUpStats.scheduledList;
                break;
            default:
                return;
        }

        setActivityModal({
            isOpen: true,
            title,
            data: filteredData
        });
    };

    const setDatePreset = (preset) => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const last7Days = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

        switch (preset) {
            case 'today':
                setFilters(prev => ({ ...prev, fromDate: today, toDate: today }));
                break;
            case 'yesterday':
                setFilters(prev => ({ ...prev, fromDate: yesterday, toDate: yesterday }));
                break;
            case '7days':
                setFilters(prev => ({ ...prev, fromDate: last7Days, toDate: today }));
                break;
            default:
                break;
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <div className="p-4 sm:p-6 md:p-8 max-w-[1800px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                        <div>
                            <h1 className={`text-2xl sm:text-4xl font-black mb-2 tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Lead <span className="text-cyan-500">Management</span>
                            </h1>
                            <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2`}>
                                Lead Tracking & Management
                            </p>
                        </div>
                    </div>

                    {/* Charts Section - Now more prominent in the middle */}
                    <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 px-4">
                        <LeadTrendChart data={dailyLeads} isDarkMode={isDarkMode} loading={statsLoading} />
                        <CentreCallBarChart data={centreAnalysis} isDarkMode={isDarkMode} loading={analysisLoading} />
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
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

                {/* Localized Analytics Filters */}
                <div className={`p-4 rounded-[2px] border flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest mr-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Quick View</span>
                        <button
                            onClick={() => setDatePreset('today')}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${filters.fromDate === new Date().toISOString().split('T')[0] && filters.toDate === new Date().toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setDatePreset('yesterday')}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${filters.fromDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && filters.toDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                        >
                            Yesterday
                        </button>
                        <button
                            onClick={() => setDatePreset('7days')}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${filters.fromDate === new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={resetFilters}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white'}`}
                        >
                            <FaRedo size={10} /> Reset All
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <div className={`h-8 w-[1px] mx-2 hidden sm:block ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Scheduled Call Date</span>
                            <input
                                type="date"
                                value={filters.scheduledDate}
                                onChange={(e) => handleFilterChange('scheduledDate', e.target.value)}
                                className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-black outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 focus:border-cyan-500' : 'bg-cyan-50 border-cyan-100 text-cyan-700 focus:border-cyan-500'}`}
                            />
                        </div>
                        <div className={`h-8 w-[1px] mx-2 hidden sm:block ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>From</span>
                            <input
                                type="date"
                                value={filters.fromDate}
                                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>To</span>
                            <input
                                type="date"
                                value={filters.toDate}
                                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Activity Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {statsLoading ? (
                            <>
                                <CardSkeleton isDarkMode={isDarkMode} />
                                <CardSkeleton isDarkMode={isDarkMode} />
                                <CardSkeleton isDarkMode={isDarkMode} />
                                <CardSkeleton isDarkMode={isDarkMode} />
                                <CardSkeleton isDarkMode={isDarkMode} />
                                <CardSkeleton isDarkMode={isDarkMode} />
                            </>
                        ) : (
                            <>
                                {/* Centre Analysis Card */}
                                <div
                                    onClick={() => setShowCentreAnalysisModal(true)}
                                    className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-cyan-500/10 hover:border-cyan-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Centre Analysis
                                            </p>
                                            <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {analysisLoading ? "..." : centreAnalysis.length}
                                            </h3>
                                            <p className="text-[8px] font-bold text-cyan-500 mt-1 uppercase tracking-widest text-nowrap">Active Centres analyzed</p>
                                        </div>
                                        <div className={`p-2.5 rounded-[2px] transition-all bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}>
                                            <FaChartLine size={16} />
                                        </div>
                                    </div>
                                    <div className="mt-2 relative z-10">
                                        {centreAnalysis.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-cyan-500 uppercase italic truncate max-w-[100px]">{centreAnalysis[0].centreName}</span>
                                                <div className="flex-1 h-[2px] bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-cyan-500 w-[70%]"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform group-hover:scale-110 transition-transform text-emerald-500">
                                        <FaChartLine size={100} />
                                    </div>
                                </div>
                                {/* Scheduled Follow-ups Card (New Target Section) */}
                                <div
                                    onClick={() => handleCardClick('scheduled')}
                                    className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-cyan-500/10 hover:border-cyan-500/30 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                        <div>
                                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Upcoming Tasks</p>
                                            <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalScheduled}</h3>
                                            <p className="text-[8px] font-bold text-cyan-500 mt-1 uppercase tracking-widest">Scheduled Follow-ups</p>
                                        </div>
                                        <div className={`p-2.5 rounded-[20px] transition-all bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]`}>
                                            <FaCalendarAlt size={16} />
                                        </div>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform group-hover:scale-110 transition-transform text-cyan-500">
                                        <FaCalendarAlt size={100} />
                                    </div>
                                </div>

                                {/* Total Follow-ups Card */}
                                <div
                                    onClick={() => handleCardClick('total')}
                                    className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-cyan-500/10 hover:border-cyan-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {filters.fromDate || filters.toDate ? "Filtered Activity" : "Today's Activity"}
                                            </p>
                                            <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalFollowUps}</h3>
                                            <p className="text-[9px] font-bold text-cyan-500 mt-1 uppercase tracking-widest">Follow-ups Recorded</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); fetchFollowUpStats(); }}
                                            className={`p-3 rounded-[2px] transition-all hover:rotate-180 duration-500 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-50 text-cyan-600'}`}
                                        >
                                            <FaHistory size={20} />
                                        </button>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                        <FaHistory size={100} />
                                    </div>
                                </div>

                                {/* Hot Leads Card */}
                                <div
                                    onClick={() => handleCardClick('hot')}
                                    className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-red-500/10 hover:border-red-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {filters.fromDate || filters.toDate ? "Filtered Interests" : "Hot Interests"}
                                            </p>
                                            <h3 className="text-3xl font-black italic tracking-tighter text-red-500">{followUpStats.hotLeads}</h3>
                                            <p className="text-[9px] font-bold text-red-500/80 mt-1 uppercase tracking-widest">Positive Feedback</p>
                                        </div>
                                        <div className="p-3 bg-red-500/10 text-red-500 rounded-[2px]">
                                            <FaChartLine size={20} />
                                        </div>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                        <FaChartLine size={100} />
                                    </div>
                                </div>

                                {/* Cold Leads Card */}
                                <div
                                    onClick={() => handleCardClick('cold')}
                                    className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-blue-500/10 hover:border-blue-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {filters.fromDate || filters.toDate ? "Filtered Leads" : "Cold Leads"}
                                            </p>
                                            <h3 className="text-3xl font-black italic tracking-tighter text-blue-500">{followUpStats.coldLeads}</h3>
                                            <p className="text-[9px] font-bold text-blue-500/80 mt-1 uppercase tracking-widest">Ongoing Discussions</p>
                                        </div>
                                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-[2px]">
                                            <FaSearch size={20} />
                                        </div>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                        <FaSearch size={100} />
                                    </div>
                                </div>

                                {/* Negative Results Card */}
                                <div
                                    onClick={() => handleCardClick('negative')}
                                    className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-gray-500/10 hover:border-gray-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {filters.fromDate || filters.toDate ? "Filtered Negative" : "Negative Results"}
                                            </p>
                                            <h3 className="text-3xl font-black italic tracking-tighter text-gray-500">{followUpStats.negativeLeads}</h3>
                                            <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-widest">No Interest Shown</p>
                                        </div>
                                        <div className="p-3 bg-gray-500/10 text-gray-500 rounded-[2px]">
                                            <FaTrash size={20} />
                                        </div>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                        <FaTrash size={100} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Activity Feed */}
                    <div className={`rounded-[2px] border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                            <h4 className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {filters.fromDate || filters.toDate ? "History Feed" : "Live Feed"}
                            </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[140px] custom-scrollbar p-1">
                            {statsLoading ? (
                                <>
                                    <FeedItemSkeleton isDarkMode={isDarkMode} />
                                    <FeedItemSkeleton isDarkMode={isDarkMode} />
                                    <FeedItemSkeleton isDarkMode={isDarkMode} />
                                </>
                            ) : followUpStats.recentActivity.length === 0 ? (
                                <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest text-center py-8">No Activity Yet</p>
                            ) : (
                                followUpStats.recentActivity.map((act, idx) => (
                                    <div key={idx} className={`p-3 border-b last:border-0 rounded-[2px] transition-all hover:bg-cyan-500/5 ${isDarkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-tight truncate max-w-[120px] ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{act.leadName}</span>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-[2px] border ${getLeadTypeColor(act.status)}`}>{act.status?.charAt(0)}</span>
                                        </div>
                                        <p className={`text-[9px] font-medium italic truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{act.feedback}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[7px] font-black text-cyan-500/60 uppercase">{act.updatedBy}</span>
                                            <span className="text-[7px] text-gray-600">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Daily Goal Progress Bar for Telecallers */}
                {user?.role === 'telecaller' && (
                    <div className={`mb-8 border rounded-[2px] p-6 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-[2px] ${(followUpStats.totalFollowUps / 50 * 100) >= 70 ? 'bg-green-500/10 text-green-500' :
                                    (followUpStats.totalFollowUps / 50 * 100) >= 30 ? 'bg-yellow-500/10 text-yellow-500' :
                                        'bg-red-500/10 text-red-500'
                                    }`}>
                                    <FaChartLine size={14} />
                                </div>
                                <div>
                                    <h3 className={`text-[12px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Daily Call Progress</h3>
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Start from 0 every day • Goal: 50 Calls</p>
                                </div>
                            </div>

                            {/* Red Flags Display */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <FaStar
                                            key={i}
                                            size={14}
                                            className={`${i < (followUpStats.userMetaData?.redFlags || 0) ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}
                                        />
                                    ))}
                                </div>
                                <div className={`px-3 py-1 rounded-[2px] border text-[9px] font-black uppercase tracking-widest ${(followUpStats.userMetaData?.redFlags || 0) > 0 ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'
                                    }`}>
                                    {(followUpStats.userMetaData?.redFlags || 0)} / 5 Flags
                                </div>
                            </div>
                        </div>

                        <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                            <div
                                className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out flex items-center justify-end pr-2 overflow-visible ${(followUpStats.totalFollowUps / 50 * 100) >= 70 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                                    (followUpStats.totalFollowUps / 50 * 100) >= 30 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                                        'bg-gradient-to-r from-red-600 to-red-400'
                                    }`}
                                style={{ width: `${Math.min((followUpStats.totalFollowUps / 50) * 100, 100)}%` }}
                            >
                                <span className="text-[8px] font-black text-white whitespace-nowrap drop-shadow-md">
                                    {Math.min(Math.round((followUpStats.totalFollowUps / 50) * 100), 100)}%
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-2 px-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Completed: <span className="text-cyan-500">{followUpStats.totalFollowUps}</span> / 50
                                </span>
                                {followUpStats.totalFollowUps >= 50 && (
                                    <div className="flex items-center gap-1 text-green-500 animate-bounce">
                                        <FaCheckCircle size={10} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Goal Met!</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                {followUpStats.totalFollowUps < 15 && (
                                    <div className="flex items-center gap-1 text-red-500 animate-pulse">
                                        <FaExclamationTriangle size={10} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Low Activity</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar - Reduced Padding (p-4 instead of p-6) */}
                <div className={`border rounded-[2px] p-4 relative group transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 focus-within:border-cyan-500/30' : 'bg-white border-gray-200 focus-within:border-cyan-500/30 shadow-sm'}`}>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-4">
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
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Class</label>
                            <CustomMultiSelect
                                options={classes.map(c => ({ value: c._id, label: c.name }))}
                                value={filters.className}
                                onChange={(selected) => handleFilterChange('className', selected)}
                                placeholder="Select Class"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Telecaller</label>
                            <CustomMultiSelect
                                options={
                                    ['superadmin', 'super admin'].includes(user?.role?.toLowerCase())
                                        ? telecallers.map(t => ({ value: t.name, label: t.name }))
                                        : telecallers.filter(t => t.name === user?.name).map(t => ({ value: t.name, label: t.name }))
                                }
                                value={filters.leadResponsibility}
                                onChange={(selected) => handleFilterChange('leadResponsibility', selected)}
                                placeholder="Select Telecaller"
                                isDisabled={!['superadmin', 'super admin'].includes(user?.role?.toLowerCase())}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>From Date</label>
                            <input
                                type="date"
                                value={filters.fromDate}
                                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                className={`w-full px-4 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Feedback</label>
                            <CustomMultiSelect
                                options={feedbackCategories.length > 0
                                    ? feedbackCategories.map(f => ({ value: f.name, label: f.name }))
                                    : [
                                        { value: "Interested", label: "Interested" },
                                        { value: "Not Interested", label: "Not Interested" },
                                        { value: "Call back later", label: "Call back later" },
                                        { value: "Wrong Number", label: "Wrong Number" },
                                        { value: "Busy", label: "Busy" },
                                        { value: "Asked for details", label: "Asked for details" },
                                        { value: "Price Issue", label: "Price Issue" },
                                        { value: "Will visit centre", label: "Will visit centre" },
                                        { value: "Enrolled elsewhere", label: "Enrolled elsewhere" },
                                        { value: "Others", label: "Others" }
                                    ]
                                }
                                value={filters.feedback}
                                onChange={(selected) => handleFilterChange('feedback', selected)}
                                placeholder="Select Feedback"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>To Date</label>
                            <input
                                type="date"
                                value={filters.toDate}
                                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                className={`w-full px-4 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Follow Up Status</label>
                            <CustomMultiSelect
                                options={[
                                    { value: "contacted", label: "Contacted" },
                                    { value: "remaining", label: "Pending" }
                                ]}
                                value={filters.followUpStatus}
                                onChange={(selected) => handleFilterChange('followUpStatus', selected)}
                                placeholder="Select Status"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                    </div>

                    {/* Follow Up Stats Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 pt-4 border-t border-gray-800/20">
                        <div className={`p-4 rounded-[2px] border relative overflow-hidden group transition-all ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100 shadow-sm'}`}>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Contacted Leads</p>
                                    <h3 className={`text-xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{leadStats.contactedCount}</h3>
                                </div>
                                <div className={`p-2 rounded-[2px] bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]`}>
                                    <FaCheckCircle size={12} />
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 rounded-[2px] border relative overflow-hidden group transition-all ${isDarkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-100 shadow-sm'}`}>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Pending Leads</p>
                                    <h3 className={`text-xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{leadStats.remainingCount}</h3>
                                </div>
                                <div className={`p-2 rounded-[2px] bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]`}>
                                    <FaCalendarAlt size={12} />
                                </div>
                            </div>
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
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Follow Up</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Name</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Contact</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Centers</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ops Info</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Class</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Board</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>School</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Status</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Owner</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Assigned At</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Last Feedback</th>
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                {loading ? (
                                    <>
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} />
                                    </>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan="14" className="px-6 py-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">
                                            No leads found
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead, index) => (
                                        <tr key={lead._id} onClick={() => handleRowClick(lead)} className={`transition-all group cursor-pointer ${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'}`}>
                                            <td className={`px-6 py-4 text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{(currentPage - 1) * limit + index + 1}</td>
                                            <td className="px-6 py-4">
                                                {lead.followUps?.length > 0 ? (
                                                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] border transition-all ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                        <FaCheckCircle size={10} className="animate-pulse" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Contacted</span>
                                                        <span className={`ml-1 text-[8px] font-black px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>{lead.followUps.length}</span>
                                                    </div>
                                                ) : (
                                                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] border transition-all ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-yellow-50 border-yellow-100 text-yellow-600'}`}>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Pending</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>{lead.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.email}</div>
                                                <div className="text-[10px] font-black text-cyan-500 mt-0.5">{lead.phoneNumber || "NO CONTACT"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase group-hover:text-cyan-500 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.centre?.centreName || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[9px] font-bold text-cyan-500 mt-0.5 truncate max-w-[120px]">{lead.course?.courseName || "General Query"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.className?.name || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.board?.boardName || lead.board?.boardCourse || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-medium italic truncate max-w-[150px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{lead.schoolName || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${getLeadTypeColor(lead.leadType)}`}>
                                                    {lead.leadType || "U/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[9px] font-black uppercase px-2 py-1 rounded-[2px] inline-block truncate max-w-[100px] ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                    {lead.leadResponsibility || "NO OWNER"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {new Date(lead.assignedAt || lead.createdAt).toLocaleDateString('en-GB')}
                                                </div>
                                                <div className="text-[9px] font-black text-cyan-500 mt-0.5">
                                                    {new Date(lead.assignedAt || lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase tracking-widest ${lead.followUps?.length > 0 ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                                                    {lead.followUps?.length > 0
                                                        ? lead.followUps[lead.followUps.length - 1].feedback
                                                        : "Not Contacted"}
                                                </div>
                                                {lead.followUps?.length > 0 && lead.followUps[lead.followUps.length - 1].remarks && (
                                                    <div className="text-[8px] font-medium italic text-gray-500 mt-0.5 truncate max-w-[120px]">
                                                        {lead.followUps[lead.followUps.length - 1].remarks}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCounseling(lead); }}
                                                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                                                    >
                                                        Counselling
                                                    </button>
                                                    {(canEdit || (lead.createdBy === user?._id || lead.createdBy === user?.id)) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}
                                                            className={`transition-colors ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                    )}
                                                    {(canDelete || (lead.createdBy === user?._id || lead.createdBy === user?.id)) && (
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
                <div className="flex flex-col xl:flex-row justify-between items-center gap-6 pt-6 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                            Showing: {leads.length === 0 ? 0 : (currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, totalLeads)} / {totalLeads} Records
                        </div>

                        {/* Jump to Page */}
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-500'}`}>Go to Page:</span>
                            <input
                                type="number"
                                min="1"
                                max={totalPages}
                                value={currentPage}
                                onChange={(e) => {
                                    const page = parseInt(e.target.value);
                                    if (page >= 1 && page <= totalPages) {
                                        setCurrentPage(page);
                                    }
                                }}
                                className={`w-16 px-3 py-1.5 rounded-[2px] border text-[10px] font-black text-center outline-none transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-cyan-500 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-cyan-600 focus:border-cyan-500'}`}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`p-2.5 rounded-[2px] transition-all disabled:opacity-30 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-cyan-500 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            title="Previous Page"
                        >
                            <FaChevronLeft size={10} />
                        </button>

                        {/* Paginated Buttons with compact logic */}
                        {(() => {
                            const buttons = [];

                            if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++) buttons.push(i);
                            } else {
                                buttons.push(1);
                                if (currentPage > 3) buttons.push('...');

                                const start = Math.max(2, currentPage - 1);
                                const end = Math.min(totalPages - 1, currentPage + 1);

                                for (let i = start; i <= end; i++) {
                                    if (!buttons.includes(i)) buttons.push(i);
                                }

                                if (currentPage < totalPages - 2) buttons.push('...');
                                if (!buttons.includes(totalPages)) buttons.push(totalPages);
                            }

                            return buttons.map((page, i) => (
                                page === '...' ? (
                                    <span key={`dots-${i}`} className={`px-2 text-[10px] font-black ${isDarkMode ? 'text-gray-700' : 'text-gray-400'}`}>...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-[2px] text-[10px] font-black transition-all ${currentPage === page
                                            ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-110 z-10"
                                            : (isDarkMode ? "bg-gray-800 text-gray-500 hover:text-white hover:bg-gray-700" : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50")
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )
                            ));
                        })()}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`p-2.5 rounded-[2px] transition-all disabled:opacity-30 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-cyan-500 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            title="Next Page"
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

            {showAddModal && <AddLeadModal isDarkMode={isDarkMode} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchLeads(); }} />}
            {showEditModal && selectedLead && <EditLeadModal isDarkMode={isDarkMode} lead={selectedLead} onClose={() => { setShowEditModal(false); setSelectedLead(null); }} onSuccess={() => { setShowEditModal(false); setSelectedLead(null); fetchLeads(); }} />}
            {showBulkModal && <BulkLeadModal isDarkMode={isDarkMode} onClose={() => setShowBulkModal(false)} onSuccess={() => { setShowBulkModal(false); fetchLeads(); }} />}
            {showDetailModal && selectedDetailLead && <LeadDetailsModal isDarkMode={isDarkMode} lead={selectedDetailLead} canEdit={canEdit} canDelete={canDelete} onClose={() => { setShowDetailModal(false); setSelectedDetailLead(null); }} onEdit={(lead) => { setShowDetailModal(false); handleEdit(lead); }} onDelete={(id) => { handleDelete(id); setShowDetailModal(false); setSelectedDetailLead(null); }} onFollowUp={(lead) => { setShowDetailModal(false); setSelectedLead(lead); setShowFollowUpModal(true); }} onCounseling={(lead) => handleCounseling(lead)} onShowHistory={(lead) => { setSelectedDetailLead(lead); setShowHistoryModal(true); }} />}
            {showFollowUpModal && selectedLead && <AddFollowUpModal isDarkMode={isDarkMode} lead={selectedLead} onClose={() => { setShowFollowUpModal(false); setSelectedLead(null); }} onSuccess={() => { setShowFollowUpModal(false); setSelectedLead(null); fetchLeads(); fetchFollowUpStats(); }} />}
            {showHistoryModal && selectedDetailLead && <FollowUpHistoryModal isDarkMode={isDarkMode} lead={selectedDetailLead} onClose={() => setShowHistoryModal(false)} />}
            {showFollowUpListModal && <FollowUpListModal isDarkMode={isDarkMode} onClose={() => setShowFollowUpListModal(false)} onShowHistory={(lead) => { setSelectedDetailLead(lead); setShowHistoryModal(true); }} />}
            <FollowUpActivityModal
                isOpen={activityModal.isOpen}
                onClose={() => setActivityModal({ ...activityModal, isOpen: false })}
                title={activityModal.title}
                data={activityModal.data}
                isDarkMode={isDarkMode}
            />

            {
                showCentreAnalysisModal && (
                    <CentreAnalysisModal
                        isOpen={showCentreAnalysisModal}
                        onClose={() => setShowCentreAnalysisModal(false)}
                        isDarkMode={isDarkMode}
                        data={centreAnalysis}
                    />
                )
            }
        </div >
    );
};

export default LeadManagementContent;
