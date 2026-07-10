import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaCalendarAlt, FaDownload, FaFileUpload, FaFileExcel, FaPlus, FaFilter, FaSearch, FaChevronLeft, FaChevronRight, FaMoon, FaSun, FaHistory, FaChartLine, FaTrash, FaRedo, FaPhoneAlt, FaEnvelope, FaEdit, FaStar, FaExclamationTriangle, FaCheckCircle, FaUserGraduate, FaGraduationCap, FaTimes, FaWalking } from "react-icons/fa";
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
import BulkUpdateLeadModal from "./BulkUpdateLeadModal";
import { CardSkeleton, TableRowSkeleton, FeedItemSkeleton } from "../common/Skeleton";
import LeadJourneyModal from "./LeadJourneyModal";

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
    const [startCallOnOpen, setStartCallOnOpen] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showFollowUpListModal, setShowFollowUpListModal] = useState(false);
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedDetailLead, setSelectedDetailLead] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [dailyLeads, setDailyLeads] = useState([]); // Added state
    const [selectedLeads, setSelectedLeads] = useState([]);
    const shouldSelectNewPageRef = useRef(false);
    const [showJourneyModal, setShowJourneyModal] = useState(false);
    const [journeyLeadId, setJourneyLeadId] = useState(null);
    const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);
    const [followUpStats, setFollowUpStats] = useState({
        totalFollowUps: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        neutralLeads: 0,
        invalidLeads: 0,
        totalScheduled: 0,
        recentActivity: [],
        scheduledList: [],
        walkInsCountToday: 0
    });

    const [leadStats, setLeadStats] = useState({
        contactedCount: 0,
        remainingCount: 0,
        walkInCount: 0
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
    const [canUpload, setCanUpload] = useState(false);
    const [canExport, setCanExport] = useState(true); // default true; false only if admin explicitly unchecks

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const [limit, setLimit] = useState(10);
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const [dashboardFilters, setDashboardFilters] = useState({
        fromDate: "",
        toDate: "",
        scheduledDate: new Date().toISOString().split('T')[0] // Default to today for scheduled
    });

    const [filters, setFilters] = useState({
        leadType: [{ value: "HOT LEAD", label: "HOT LEAD" }],
        source: [],
        centre: [],
        course: [],
        board: [],
        className: [],
        leadResponsibility: [],
        fromDate: "", // These are for the table
        toDate: "",   // These are for the table
        feedback: [],
        followUpStatus: [],
        marketingBy: [],
        isPriority: "",
        schoolName: [],
        showDuplicates: "",
        zone: [],
        uploadedBy: []
    });

    // Dropdown data for filters
    const [sources, setSources] = useState([]);
    const [courses, setCourses] = useState([]);
    const [boards, setBoards] = useState([]);
    const [classes, setClasses] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [feedbackCategories, setFeedbackCategories] = useState([]);
    const [zones, setZones] = useState([]);
    const [schoolsList, setSchoolsList] = useState([]);
    const [uploaders, setUploaders] = useState([]);

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

            // Pass all relevant attribute filters
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        const val = (v && typeof v === 'object' && 'value' in v) ? v.value : v;
                        if (val) params.append(key, val);
                    });
                } else if (value && !['fromDate', 'toDate'].includes(key)) {
                    params.append(key, value);
                }
            });

            // ADD Dashboard specific date filters
            if (dashboardFilters.fromDate) params.append('fromDate', dashboardFilters.fromDate);
            if (dashboardFilters.toDate) params.append('toDate', dashboardFilters.toDate);
            if (dashboardFilters.scheduledDate) params.append('scheduledDate', dashboardFilters.scheduledDate);

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
    }, [filters, dashboardFilters]);

    const fetchCentreAnalysis = useCallback(async () => {
        setAnalysisLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            // Sync with current attribute filters
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        const val = (v && typeof v === 'object' && 'value' in v) ? v.value : v;
                        if (val) params.append(key, val);
                    });
                }
            });

            // ADD Dashboard specific date filters
            if (dashboardFilters.fromDate) params.append('fromDate', dashboardFilters.fromDate);
            if (dashboardFilters.toDate) params.append('toDate', dashboardFilters.toDate);

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
    }, [filters, dashboardFilters]);

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
            if (dashboardFilters.fromDate) params.append("followUpFromDate", dashboardFilters.fromDate);
            if (dashboardFilters.toDate) params.append("followUpToDate", dashboardFilters.toDate);
            if (sortField) {
                params.append("sortBy", sortField);
                params.append("sortOrder", sortDirection);
            }

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
                if (shouldSelectNewPageRef.current) {
                    const pageLeadIds = data.leads.map(lead => lead._id);
                    setSelectedLeads(pageLeadIds);
                    setIsAllFilteredSelected(false);
                    shouldSelectNewPageRef.current = false;
                } else {
                    setSelectedLeads([]);
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
    }, [currentPage, filters, limit, searchTerm, dashboardFilters.fromDate, dashboardFilters.toDate, sortField, sortDirection]);

    useEffect(() => {
        clearSelection();
    }, [filters, searchTerm, dashboardFilters.fromDate, dashboardFilters.toDate, sortField, sortDirection]);



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
                setAllowedCentres(centres.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || "")));
            } else {
                // For non-superAdmin, use populated centres from profile
                const userCentres = (currentUser.centres || []).sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
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

            // Fetch sources: master list + distinct values from actual leads (merged & deduplicated)
            const [sourceResponse, distinctSourceResponse] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/source`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${import.meta.env.VITE_API_URL}/lead-management/distinct-sources`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            const sourceData = await sourceResponse.json();
            const distinctSourceData = distinctSourceResponse.ok ? await distinctSourceResponse.json() : { sources: [] };

            // Master sources come as objects with { sourceName, ... }; lead sources are plain strings
            const masterSources = sourceData.sources || [];
            const masterSourceNames = new Set(masterSources.map(s => s.sourceName?.toLowerCase()));

            // Build extra entries from leads that aren't already in master
            const extraSources = (distinctSourceData.sources || [])
                .filter(s => !masterSourceNames.has(s.toLowerCase()))
                .map(s => ({ sourceName: s, _fromLeads: true }));

            setSources([...masterSources, ...extraSources]);

            // Fetch courses
            const courseResponse = await fetch(`${import.meta.env.VITE_API_URL}/course`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (courseResponse.ok) {
                const data = await courseResponse.json();
                setCourses((Array.isArray(data) ? data : []).filter(c => c.department?.showInAdmission !== false));
            }

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
                const leadUsers = (userData.users || []).filter(u => {
                    const r = u.role?.toLowerCase()?.replace(/\s+/g, '') || '';
                    const isActive = u.isActive !== false;
                    const allowedRoles = ['telecaller', 'centralizedtelecaller', 'counsellor', 'marketing', 'rm', 'centerincharge', 'centreincharge', 'zonalmanager', 'hod', 'superadmin', 'assistantzonalmanager', 'assistantcenterincharge'];
                    return isActive && allowedRoles.includes(r);
                });

                // Find duplicate active user names
                const nameCounts = {};
                leadUsers.forEach(u => {
                    const name = u.name?.trim();
                    if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
                });

                const formattedUsers = leadUsers.map(u => {
                    const name = u.name?.trim();
                    const isDuplicate = nameCounts[name] > 1;
                    let displayName = u.name;
                    if (isDuplicate) {
                        const centreNames = (u.centres || []).map(c => c.centreName || c.name).filter(Boolean).join(', ');
                        displayName = `${u.name} (${centreNames || 'No Centre'})`;
                    }
                    return {
                        ...u,
                        displayName,
                        value: isDuplicate ? displayName : u.name
                    };
                });

                formattedUsers.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
                console.log("Lead Management - Fetched Users:", userData.users?.length, "Filtered Users:", formattedUsers.length);
                setTelecallers(formattedUsers);

                // If current user exists and is NOT a superAdmin, auto-select them in filters
                // Managerial roles shouldn't be auto-filtered to themselves
                const isManagerial = ['superadmin', 'super admin', 'admin', 'centerincharge', 'centreincharge', 'zonalmanager', 'hod', 'assistantzonalmanager', 'assistantcenterincharge'].includes(currentUser.role?.toLowerCase()?.replace(/\s+/g, ''));
                const currentLeadUser = formattedUsers.find(t => t.name === currentUser.name);
                if (currentLeadUser && !isManagerial) {
                    setFilters(prev => ({
                        ...prev,
                        leadResponsibility: prev.leadResponsibility.length > 0
                            ? prev.leadResponsibility
                            : [{ value: currentLeadUser.value, label: currentLeadUser.displayName }]
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

            // Fetch distinct school names
            const schoolResponse = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/distinct-schools`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const schoolData = await schoolResponse.json();
            if (schoolResponse.ok) {
                const schools = schoolData.schools || [];
                const sortedSchools = [...schools].sort((a, b) => (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' }));
                setSchoolsList(sortedSchools);
            }

            // Fetch zones
            const zoneResponse = await fetch(`${import.meta.env.VITE_API_URL}/zone`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (zoneResponse.ok) {
                const zoneData = await zoneResponse.json();
                setZones(zoneData.data || zoneData.zones || []);
            }

            // Fetch lead uploaders
            const uploadersResponse = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/uploaders`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (uploadersResponse.ok) {
                const uploaderData = await uploadersResponse.json();
                setUploaders(uploaderData.uploaders || []);
            }
        } catch (error) {
            console.error("Error fetching filter data:", error);
        }
    }, []);

    // Helper to apply permissions from a user object
    const applyPermissions = (parsedUser) => {
        setUser(parsedUser);
        setCanCreate(true); // Everyone can create leads as requested
        setCanEdit(hasPermission(parsedUser, 'leadManagement', 'leads', 'edit'));
        setCanDelete(hasPermission(parsedUser, 'leadManagement', 'leads', 'delete'));

        const hasCreatePerm = hasPermission(parsedUser, 'leadManagement', 'leads', 'create');
        const hasUploadPerm = hasPermission(parsedUser, 'leadManagement', 'leads', 'upload');
        const uploadPermDefined = parsedUser?.granularPermissions?.leadManagement?.leads?.hasOwnProperty('upload');
        setCanUpload(uploadPermDefined ? hasUploadPerm : hasCreatePerm);

        // Export permission — must be explicitly set to true; no access by default if defined
        const hasExportPerm = hasPermission(parsedUser, 'leadManagement', 'leads', 'export');
        const exportPermDefined = parsedUser?.granularPermissions?.leadManagement?.leads?.hasOwnProperty('export');
        setCanExport(exportPermDefined ? hasExportPerm : true);
    };

    useEffect(() => {
        // Apply cached permissions immediately for instant UI render
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            applyPermissions(JSON.parse(storedUser));
        }

        // Then fetch FRESH permissions from server to override any stale localStorage data
        const fetchFreshPermissions = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const freshUser = data.user;
                    if (freshUser) {
                        // Update localStorage so subsequent reads are also fresh
                        localStorage.setItem("user", JSON.stringify(freshUser));
                        applyPermissions(freshUser);
                    }
                }
            } catch (error) {
                console.error("Error fetching fresh user permissions:", error);
            }
        };

        fetchFreshPermissions();
        fetchAllowedCentres();
        fetchFilterData();
    }, [fetchAllowedCentres, fetchFilterData]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // Debounce search to avoid too many requests
        const timeout = setTimeout(() => {
            fetchLeads();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm, filters, currentPage, dashboardFilters.fromDate, dashboardFilters.toDate, fetchLeads]);

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleDashboardFilterChange = (name, value) => {
        setDashboardFilters(prev => ({ ...prev, [name]: value }));
        if (name === 'fromDate' || name === 'toDate') {
            setCurrentPage(1);
        }
    };

    const handleFollowUpStatusCardClick = (statusValue) => {
        const isSelected = filters.followUpStatus?.some(item => item.value === statusValue);
        if (isSelected) {
            handleFilterChange('followUpStatus', []);
        } else {
            const label = statusValue === 'contacted' ? 'Contacted' : statusValue === 'remaining' ? 'Pending' : 'Walk In';
            handleFilterChange('followUpStatus', [{ value: statusValue, label }]);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const renderSortableHeader = (label, field) => {
        return (
            <th 
                onClick={() => handleSort(field)}
                className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest cursor-pointer select-none hover:text-cyan-400 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
            >
                <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    {sortField === field ? (
                        sortDirection === 'asc' ? '▲' : '▼'
                    ) : '↕'}
                </div>
            </th>
        );
    };

    const handleCleanDuplicates = async () => {
        const confirmClean = window.confirm(
            "Are you sure you want to clean up duplicate mobile numbers? For every phone number that appears multiple times, the most recently created lead will be kept, and all other duplicate leads will be deleted."
        );
        if (!confirmClean) return;

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/clean-duplicates`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ filters })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(
                    `Cleaned ${data.checkedNumbers} duplicate phone number groups! Deleted ${data.deletedCount} duplicate leads.`
                );
                fetchLeads();
                fetchFollowUpStats();
            } else {
                toast.error(data.message || "Failed to clean duplicates");
            }
        } catch (error) {
            console.error("Error cleaning duplicates:", error);
            toast.error("Error cleaning duplicates");
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            leadType: [{ value: "HOT LEAD", label: "HOT LEAD" }],
            source: [],
            centre: [],
            course: [],
            board: [],
            className: [],
            leadResponsibility: [],
            fromDate: "",
            toDate: "",
            feedback: [],
            followUpStatus: [],
            marketingBy: [],
            isPriority: "",
            schoolName: [],
            showDuplicates: "",
            zone: [],
            uploadedBy: []
        });
        setSortField(null);
        setSortDirection('asc');
        setSearchTerm("");
        setCurrentPage(1);
        toast.info("Table filters have been reset");
    };

    const resetDashboardFilters = () => {
        setDashboardFilters({
            fromDate: "",
            toDate: "",
            scheduledDate: new Date().toISOString().split('T')[0]
        });
        setCurrentPage(1);
        toast.info("Analytics filters have been reset");
    };

    const handleRowClick = (lead) => {
        setSelectedDetailLead(lead);
        setShowDetailModal(true);
    };

    const handleSelectLead = (e, leadId) => {
        e.stopPropagation();
        if (e.target.checked) {
            setSelectedLeads(prev => [...prev, leadId]);
        } else {
            setSelectedLeads(prev => prev.filter(id => id !== leadId));
            // If we were in "select all filtered" mode, we're not anymore
            setIsAllFilteredSelected(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const pageLeadIds = leads.map(lead => lead._id);
            // Add current page IDs to selection
            setSelectedLeads(prev => [...new Set([...prev, ...pageLeadIds])]);

            // If there are more leads than what's on the page, select all matching filters
            if (totalLeads > leads.length) {
                setIsAllFilteredSelected(true);
            }
        } else {
            setSelectedLeads([]);
            setIsAllFilteredSelected(false);
        }
    };

    const handleSelectAllFiltered = () => {
        setIsAllFilteredSelected(true);
        // We don't need to put all IDs in the array, we'll use the flag and filters
    };

    const clearSelection = () => {
        setSelectedLeads([]);
        setIsAllFilteredSelected(false);
    };

    const handleMultipleDelete = async () => {
        const totalMatching = totalLeads;
        const visibleCount = selectedLeads.filter(id => leads.some(l => l._id === id)).length;

        let confirmMsg = "";
        let endpoint = "bulk-delete";
        let body = {};

        if (isAllFilteredSelected) {
            confirmMsg = `Are you sure you want to delete ALL ${totalMatching} leads matching the current filters across ALL pages? This action cannot be undone.`;
            endpoint = "bulk-delete-filtered";
            body = { filters: { ...filters, search: searchTerm } };
        } else {
            const visibleSelectedLeads = selectedLeads.filter(id => leads.some(l => l._id === id));
            if (visibleSelectedLeads.length === 0) {
                toast.warning("No visible leads selected for deletion");
                return;
            }
            confirmMsg = `Are you sure you want to delete ${visibleSelectedLeads.length} selected leads visible on this page?`;
            body = { leadIds: visibleSelectedLeads };
        }

        if (!window.confirm(confirmMsg)) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Leads deleted successfully");
                clearSelection();
                fetchLeads();
            } else {
                toast.error(data.message || "Failed to delete leads");
            }
        } catch (error) {
            console.error("Error deleting leads:", error);
            toast.error("Error deleting leads");
        }
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

    const [showCounselingChoiceModal, setShowCounselingChoiceModal] = useState(false);

    const handleCounseling = (lead) => {
        setSelectedLead(lead);
        setShowCounselingChoiceModal(true);
    };

    const handleViewJourney = (lead) => {
        setJourneyLeadId(lead._id);
        setShowJourneyModal(true);
    };

    const handleTagWalkIn = async (leadId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${leadId}/walk-in`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message || "Student marked as Walk-In successfully");
                fetchLeads();
                fetchFollowUpStats(); // refresh walk-in progress bar immediately
            } else {
                toast.error(data.message || "Failed to tag Walk-In");
            }
        } catch (error) {
            console.error("Error tagging walk-in:", error);
            toast.error("Error marking student as Walk-In");
        }
    };

    const handleTogglePriority = async (leadId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${leadId}/toggle-priority`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message || "Lead priority updated");
                fetchLeads();
                if (selectedDetailLead && selectedDetailLead._id === leadId) {
                    setSelectedDetailLead(prev => ({ ...prev, isPriority: !prev.isPriority }));
                }
            } else {
                toast.error(data.message || "Failed to update priority");
            }
        } catch (error) {
            console.error("Error toggling priority:", error);
            toast.error("Error updating priority");
        }
    };

    const handleNormalCounseling = () => {
        navigate("/student-registration", { state: { leadData: selectedLead } });
        setShowCounselingChoiceModal(false);
    };

    const handleBoardCounseling = () => {
        navigate("/board-admissions?tab=Counselling", { state: { leadData: selectedLead } });
        setShowCounselingChoiceModal(false);
    };

    const handleExport = async () => {
        try {
            // console.log("Export Filters:", filters);
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (searchTerm) params.append("search", searchTerm);
            if (dashboardFilters.fromDate) params.append("followUpFromDate", dashboardFilters.fromDate);
            if (dashboardFilters.toDate) params.append("followUpToDate", dashboardFilters.toDate);

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
            case "WARM LEAD":
                return "bg-orange-500/20 text-orange-400 border-orange-500";
            case "COLD LEAD":
                return "bg-blue-500/20 text-blue-400 border-blue-500";
            case "NEUTRAL LEAD":
                return "bg-purple-500/20 text-purple-400 border-purple-500";
            case "INVALID LEAD":
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
                filteredData = followUpStats.recentActivity.filter(a =>
                    ['HOT LEAD', 'ADMISSION TAKEN'].includes(a.status?.toUpperCase())
                );
                break;
            case 'warm':
                title = "Warm Interest Leads";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === 'WARM LEAD');
                break;
            case 'cold':
                title = "Cold Lead Discussions";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === 'COLD LEAD');
                break;
            case 'neutral':
                title = "Neutral Lead Discussions";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === 'NEUTRAL LEAD');
                break;
            case 'invalid':
                title = "Invalid Lead Discussions";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === 'INVALID LEAD');
                break;
            case 'scheduled':
                title = `Scheduled Follow-ups (${dashboardFilters.scheduledDate})`;
                filteredData = followUpStats.scheduledList;
                break;
            case 'previous_pending':
                title = "Previous Follow Ups Not Done";
                filteredData = followUpStats.previousPendingList || [];
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
        const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

        setCurrentPage(1);
        switch (preset) {
            case 'today':
                setDashboardFilters(prev => ({ ...prev, fromDate: today, toDate: today }));
                break;
            case 'yesterday':
                setDashboardFilters(prev => ({ ...prev, fromDate: yesterday, toDate: yesterday }));
                break;
            case '7days':
                setDashboardFilters(prev => ({ ...prev, fromDate: last7Days, toDate: today }));
                break;
            case 'lastMonth':
                setDashboardFilters(prev => ({ ...prev, fromDate: lastMonth, toDate: today }));
                break;
            default:
                break;
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <div className="p-4 sm:p-6 md:p-8 max-w-[2000px] mx-auto space-y-8">
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

                        {canExport && (
                            <button
                                onClick={handleExport}
                                className="px-6 py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-[2px] border border-emerald-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                <FaDownload /> Export Excel
                            </button>
                        )}
                        {/* {user && hasPermission(user, 'leadManagement', 'dashboard', 'view') && (
                            <button
                                onClick={() => navigate('/lead-management/dashboard')}
                                className="px-6 py-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-[2px] border border-blue-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                            >
                                <FaChartLine /> Dashboard
                            </button>
                        )} */}
                        {canUpload && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="px-6 py-3 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-[2px] border border-indigo-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                            >
                                <FaFileExcel /> Import Excel
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/lead-management/teacher-schedule')}
                            className="px-6 py-3 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black rounded-[2px] border border-amber-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        >
                            <FaCalendarAlt /> Teacher Schedule
                        </button>
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
                        {selectedLeads.length > 0 && (
                            <button
                                onClick={() => setShowBulkUpdateModal(true)}
                                className="px-6 py-3 bg-teal-500 text-black hover:bg-teal-400 rounded-[2px] shadow-[0_0_20px_rgba(20,184,166,0.2)] transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                            >
                                <FaEdit /> Update Multiple Data ({isAllFilteredSelected ? totalLeads : selectedLeads.length})
                            </button>
                        )}
                        {canDelete && selectedLeads.length > 0 && (
                            <button
                                onClick={handleMultipleDelete}
                                className="px-6 py-3 bg-red-500 text-white hover:bg-red-600 rounded-[2px] shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                            >
                                <FaTrash /> Delete Selected ({isAllFilteredSelected ? totalLeads : selectedLeads.filter(id => leads.some(l => l._id === id)).length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Localized Analytics Filters */}
                <div className={`p-4 rounded-[2px] border flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest mr-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Follo</span>
                        <button
                            onClick={() => setDatePreset('today')}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${dashboardFilters.fromDate === new Date().toISOString().split('T')[0] && dashboardFilters.toDate === new Date().toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setDatePreset('yesterday')}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${dashboardFilters.fromDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && dashboardFilters.toDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                        >
                            Yesterday
                        </button>
                        <button
                            onClick={() => setDatePreset('7days')}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${dashboardFilters.fromDate === new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => setDatePreset('lastMonth')}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${dashboardFilters.fromDate === new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] && dashboardFilters.toDate === new Date().toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                        >
                            Last Month
                        </button>
                        <button
                            onClick={resetDashboardFilters}
                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white'}`}
                        >
                            <FaRedo size={10} /> Reset Analytics
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <div className={`h-8 w-[1px] mx-2 hidden sm:block ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                        {/* <div className="flex flex-col sm:flex-row items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Scheduled Call Date</span>
                            <input
                                type="date"
                                value={dashboardFilters.scheduledDate}
                                onChange={(e) => handleDashboardFilterChange('scheduledDate', e.target.value)}
                                className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-black outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 focus:border-cyan-500' : 'bg-cyan-50 border-cyan-100 text-cyan-700 focus:border-cyan-500'}`}
                            />
                        </div> */}
                        <div className={`h-8 w-[1px] mx-2 hidden sm:block ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>From</span>
                            <input
                                type="date"
                                value={dashboardFilters.fromDate}
                                onChange={(e) => handleDashboardFilterChange('fromDate', e.target.value)}
                                className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>To</span>
                            <input
                                type="date"
                                value={dashboardFilters.toDate}
                                onChange={(e) => handleDashboardFilterChange('toDate', e.target.value)}
                                className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Activity Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    {statsLoading ? (
                        <>
                            <CardSkeleton isDarkMode={isDarkMode} />
                            <CardSkeleton isDarkMode={isDarkMode} />
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

                            {/* Previous Follow Ups Not Done Card */}
                            <div
                                onClick={() => handleCardClick('previous_pending')}
                                className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-amber-500/10 hover:border-amber-500/30 ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Previous Follow Ups Not Done</p>
                                        <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalPreviousPending || 0}</h3>
                                    </div>
                                    <div className={`p-2.5 rounded-[20px] transition-all bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]`}>
                                        <FaExclamationTriangle size={16} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform group-hover:scale-110 transition-transform text-amber-500">
                                    <FaExclamationTriangle size={100} />
                                </div>
                            </div>

                            {/* Scheduled Follow-ups Card (New Target Section) */}
                            <div
                                onClick={() => handleCardClick('scheduled')}
                                className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-cyan-500/10 hover:border-cyan-500/30 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Upcoming Followups</p>
                                        {/* <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {followUpStats.totalFollowUps} / {followUpStats.totalScheduled + followUpStats.totalFollowUps}
                                            </h3> */}
                                        <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalScheduled}</h3>
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
                                            {filters.fromDate || filters.toDate ? "Filtered Follow Up" : "Followed Up Till Date"}
                                        </p>
                                        <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalFollowUps}</h3>
                                        {/* <p className="text-[9px] font-bold text-cyan-500 mt-1 uppercase tracking-widest">Follow-ups Recorded</p> */}
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
                                            {filters.fromDate || filters.toDate ? "Hot Leads" : "Hot Leads"}
                                        </p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-red-500">{followUpStats.hotLeads}</h3>
                                        {/* <p className="text-[9px] font-bold text-red-500/80 mt-1 uppercase tracking-widest">Positive Feedback</p> */}
                                    </div>
                                    <div className="p-3 bg-red-500/10 text-red-500 rounded-[2px]">
                                        <FaChartLine size={20} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                    <FaChartLine size={100} />
                                </div>
                            </div>

                            {/* Warm Leads Card */}
                            <div
                                onClick={() => handleCardClick('warm')}
                                className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-orange-500/10 hover:border-orange-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Warm Leads
                                        </p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-orange-500">{followUpStats.warmLeads}</h3>
                                        {/* <p className="text-[9px] font-bold text-orange-500/80 mt-1 uppercase tracking-widest">Growing Interest</p> */}
                                    </div>
                                    <div className="p-3 bg-orange-500/10 text-orange-500 rounded-[2px]">
                                        <FaStar size={20} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform text-orange-500">
                                    <FaStar size={100} />
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
                                            {filters.fromDate || filters.toDate ? "Cold Leads" : "Cold Leads"}
                                        </p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-blue-500">{followUpStats.coldLeads}</h3>
                                        {/* <p className="text-[9px] font-bold text-blue-500/80 mt-1 uppercase tracking-widest">Cold Leads</p> */}
                                    </div>
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-[2px]">
                                        <FaSearch size={20} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                    <FaSearch size={100} />
                                </div>
                            </div>

                            {/* Neutral Leads Card */}
                            <div
                                onClick={() => handleCardClick('neutral')}
                                className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-purple-500/10 hover:border-purple-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Neutral Leads
                                        </p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-purple-500">{followUpStats.neutralLeads || 0}</h3>
                                    </div>
                                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-[2px]">
                                        <FaSearch size={20} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform text-purple-500">
                                    <FaSearch size={100} />
                                </div>
                            </div>

                            {/* Invalid Leads Card */}
                            <div
                                onClick={() => handleCardClick('invalid')}
                                className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:shadow-gray-500/10 hover:border-gray-500/30 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Invalid Leads
                                        </p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-gray-500">{followUpStats.invalidLeads || 0}</h3>
                                    </div>
                                    <div className="p-3 bg-gray-500/10 text-gray-500 rounded-[2px]">
                                        <FaTimes size={20} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform text-gray-500">
                                    <FaTimes size={100} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Daily Goal Progress Bars – Telecaller only */}
                {user?.role?.toLowerCase() === 'telecaller' && (
                    <div className="mb-8 grid grid-cols-1 gap-6">

                        {/* Daily Call Progress – telecaller only */}
                        <div className={`border rounded-[2px] p-5 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-[2px] ${(followUpStats.totalFollowUps / 50 * 100) >= 70 ? 'bg-green-500/10 text-green-500' : (followUpStats.totalFollowUps / 50 * 100) >= 30 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <FaChartLine size={13} />
                                    </div>
                                    <div>
                                        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Daily Calls</h3>
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Goal: 50 calls / day</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-[2px] border ${followUpStats.totalFollowUps >= 50 ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                    {followUpStats.totalFollowUps || 0} / 50
                                </span>
                            </div>
                            <div className="relative h-3.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                <div
                                    className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${(followUpStats.totalFollowUps / 50 * 100) >= 70 ? 'bg-gradient-to-r from-green-600 to-green-400' : (followUpStats.totalFollowUps / 50 * 100) >= 30 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                                    style={{ width: `${Math.min((followUpStats.totalFollowUps / 50) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1.5 px-0.5">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                    {Math.min(Math.round((followUpStats.totalFollowUps / 50) * 100), 100)}% complete
                                </span>
                                {followUpStats.totalFollowUps >= 50 ? (
                                    <span className="flex items-center gap-1 text-green-500 text-[8px] font-black uppercase tracking-widest animate-bounce"><FaCheckCircle size={9} /> Goal Met!</span>
                                ) : followUpStats.totalFollowUps < 15 ? (
                                    <span className="flex items-center gap-1 text-red-500 text-[8px] font-black uppercase tracking-widest animate-pulse"><FaExclamationTriangle size={9} /> Low Activity</span>
                                ) : null}
                            </div>
                        </div>

                    </div>
                )}



                {/* Status Quick Filters */}
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                    <button
                        onClick={() => handleFilterChange('leadType', [])}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${filters.leadType.length === 0 ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800 hover:text-white hover:border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300')}`}
                    >
                        All Data
                    </button>
                    <button
                        onClick={() => handleFilterChange('leadType', [{ value: "HOT LEAD", label: "HOT LEAD" }])}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${filters.leadType.length === 1 && filters.leadType[0].value === "HOT LEAD" ? 'bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : (isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800 hover:text-red-500 hover:border-red-500/50' : 'bg-white text-gray-500 border-gray-200 hover:border-red-500')}`}
                    >
                        Only Hot Lead
                    </button>
                    <button
                        onClick={() => handleFilterChange('leadType', [{ value: "WARM LEAD", label: "WARM LEAD" }])}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${filters.leadType.length === 1 && filters.leadType[0].value === "WARM LEAD" ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : (isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800 hover:text-orange-500 hover:border-orange-500/50' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-500')}`}
                    >
                        Only Warm Lead
                    </button>
                    <button
                        onClick={() => handleFilterChange('leadType', [{ value: "COLD LEAD", label: "COLD LEAD" }])}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${filters.leadType.length === 1 && filters.leadType[0].value === "COLD LEAD" ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : (isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800 hover:text-blue-500 hover:border-blue-500/50' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-500')}`}
                    >
                        Only Cold Lead
                    </button>
                    <button
                        onClick={() => handleFilterChange('leadType', [{ value: "NEUTRAL LEAD", label: "NEUTRAL LEAD" }])}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${filters.leadType.length === 1 && filters.leadType[0].value === "NEUTRAL LEAD" ? 'bg-purple-500 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : (isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800 hover:text-purple-500 hover:border-purple-500/50' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-500')}`}
                    >
                        Only Neutral Lead
                    </button>
                    <button
                        onClick={() => handleFilterChange('leadType', [{ value: "INVALID LEAD", label: "INVALID LEAD" }])}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${filters.leadType.length === 1 && filters.leadType[0].value === "INVALID LEAD" ? 'bg-gray-500 text-white border-gray-500 shadow-[0_0_15px_rgba(107,114,128,0.3)]' : (isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800 hover:text-gray-400 hover:border-gray-500/50' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-500')}`}
                    >
                        Only Invalid Lead
                    </button>
                </div>

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
                                    { value: "WARM LEAD", label: "WARM  LEAD" },
                                    { value: "COLD LEAD", label: "COLD LEAD" },
                                    { value: "NEUTRAL LEAD", label: "NEUTRAL LEAD" },
                                    { value: "INVALID LEAD", label: "INVALID LEAD" }
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
                        {user?.role === 'superAdmin' && (
                            <div className="space-y-2">
                                <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Zone</label>
                                <CustomMultiSelect
                                    options={zones.map(z => ({ value: z._id, label: z.name }))}
                                    value={filters.zone}
                                    onChange={(selected) => handleFilterChange('zone', selected)}
                                    placeholder="Select Zone"
                                    theme={isDarkMode ? 'dark' : 'light'}
                                />
                            </div>
                        )}
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
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>School</label>
                            <CustomMultiSelect
                                options={schoolsList.map(s => ({ value: s, label: s }))}
                                value={filters.schoolName}
                                onChange={(selected) => handleFilterChange('schoolName', selected)}
                                placeholder="Select School"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Agent</label>
                            <CustomMultiSelect
                                options={
                                    ['superadmin', 'super admin', 'admin', 'centerincharge', 'centreincharge', 'zonalmanager', 'hod', 'assistantzonalmanager', 'assistantcenterincharge'].includes(user?.role?.toLowerCase()?.replace(/\s+/g, ''))
                                        ? telecallers.map(t => ({ value: t.value || t.name, label: t.displayName || t.name }))
                                        : telecallers.filter(t => t.name === user?.name).map(t => ({ value: t.value || t.name, label: t.displayName || t.name }))
                                }
                                value={filters.leadResponsibility}
                                onChange={(selected) => handleFilterChange('leadResponsibility', selected)}
                                placeholder="Select Agent"
                                isDisabled={!['superadmin', 'super admin', 'admin', 'centerincharge', 'centreincharge', 'zonalmanager', 'hod', 'assistantzonalmanager', 'assistantcenterincharge'].includes(user?.role?.toLowerCase()?.replace(/\s+/g, ''))}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Uploaded By</label>
                            <CustomMultiSelect
                                options={uploaders.map(u => ({ value: u._id, label: u.name }))}
                                value={filters.uploadedBy || []}
                                onChange={(selected) => handleFilterChange('uploadedBy', selected)}
                                placeholder="Select Uploader"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Marketing By</label>
                            <CustomMultiSelect
                                options={telecallers.map(t => ({ value: t.value || t.name, label: t.displayName || t.name }))}
                                value={filters.marketingBy || []}
                                onChange={(selected) => handleFilterChange('marketingBy', selected)}
                                placeholder="Select Marketing User"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>From Date</label>
                            <input
                                type="date"
                                value={filters.fromDate || ""}
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
                                value={filters.toDate || ""}
                                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                className={`w-full px-4 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Follow Up Status</label>
                            <CustomMultiSelect
                                options={[
                                    { value: "contacted", label: "Contacted" },
                                    { value: "remaining", label: "Pending" },
                                    { value: "walkin", label: "Walk In" }
                                ]}
                                value={filters.followUpStatus}
                                onChange={(selected) => handleFilterChange('followUpStatus', selected)}
                                placeholder="Select Status"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Priority Status</label>
                            <select
                                value={filters.isPriority || ""}
                                onChange={(e) => handleFilterChange('isPriority', e.target.value)}
                                className={`w-full px-4 py-2.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">ALL LEADS</option>
                                <option value="true">PRIORITY LEADS ONLY</option>
                                <option value="false">NON-PRIORITY LEADS ONLY</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Duplicate Mobile Number</label>
                            <select
                                value={filters.showDuplicates || ""}
                                onChange={(e) => handleFilterChange('showDuplicates', e.target.value)}
                                className={`w-full px-4 py-2.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">ALL LEADS</option>
                                <option value="true">SHOW DUPLICATES ONLY</option>
                                <option value="false">HIDE DUPLICATES</option>
                            </select>
                        </div>
                    </div>

                    {/* Follow Up Stats Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 pt-4 border-t border-gray-800/20">
                        <div
                            onClick={() => handleFollowUpStatusCardClick('contacted')}
                            className={`p-4 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${filters.followUpStatus?.some(item => item.value === 'contacted')
                                ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500' : 'bg-emerald-100 border-emerald-500 shadow-md')
                                : (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50' : 'bg-emerald-50 border-emerald-100 shadow-sm hover:border-emerald-300')
                                }`}
                        >
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

                        <div
                            onClick={() => handleFollowUpStatusCardClick('remaining')}
                            className={`p-4 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${filters.followUpStatus?.some(item => item.value === 'remaining')
                                ? (isDarkMode ? 'bg-yellow-500/10 border-yellow-500 ring-1 ring-yellow-500' : 'bg-yellow-100 border-yellow-500 shadow-md')
                                : (isDarkMode ? 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/50' : 'bg-yellow-50 border-yellow-100 shadow-sm hover:border-yellow-300')
                                }`}
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>UnContacted Leads</p>
                                    <h3 className={`text-xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{leadStats.remainingCount}</h3>
                                </div>
                                <div className={`p-2 rounded-[2px] bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]`}>
                                    <FaCalendarAlt size={12} />
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => handleFollowUpStatusCardClick('walkin')}
                            className={`p-4 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${filters.followUpStatus?.some(item => item.value === 'walkin')
                                ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500' : 'bg-cyan-100 border-cyan-500 shadow-md')
                                : (isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/50' : 'bg-cyan-50 border-cyan-100 shadow-sm hover:border-cyan-300')
                                }`}
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Walk In Leads</p>
                                    <h3 className={`text-xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{leadStats.walkInCount || 0}</h3>
                                </div>
                                <div className={`p-2 rounded-[2px] bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]`}>
                                    <FaWalking size={12} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-2">
                        {canDelete && (
                            <button
                                onClick={handleCleanDuplicates}
                                className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors px-3 py-1.5 border rounded-[2px] ${
                                    isDarkMode 
                                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50' 
                                        : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                                }`}
                            >
                                <FaTrash size={10} /> Clean Duplicates
                            </button>
                        )}
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
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isAllFilteredSelected || (leads.length > 0 && leads.every(lead => selectedLeads.includes(lead._id)))}
                                                onChange={handleSelectAll}
                                                className="cursor-pointer"
                                            />
                                            <span>S/N</span>
                                        </div>
                                    </th>
                                    {renderSortableHeader("Assigned At", "assignedAt")}
                                    {renderSortableHeader("Follow Up", "followUps")}
                                    {renderSortableHeader("Name", "name")}
                                    {renderSortableHeader("Email", "email")}
                                    {renderSortableHeader("Mobile No", "phoneNumber")}
                                    {renderSortableHeader("Second Mobile No", "secondMobileNo")}
                                    {renderSortableHeader("Centers", "centre")}
                                    {renderSortableHeader("Course Name", "course")}
                                    {renderSortableHeader("Class", "className")}
                                    {renderSortableHeader("Board", "board")}
                                    {renderSortableHeader("School", "schoolName")}
                                    {renderSortableHeader("Marks", "marks")}
                                    {renderSortableHeader("Walk In Date", "walkInDate")}
                                    {renderSortableHeader("Status", "leadType")}
                                    {renderSortableHeader("Owner", "leadResponsibility")}
                                    {renderSortableHeader("Target Source", "source")}
                                    {renderSortableHeader("Campaign From", "campaignFrom")}
                                    {renderSortableHeader("Marketing By", "marketingBy")}
                                    {renderSortableHeader("Last Feedback", "followUps.feedback")}
                                    {renderSortableHeader("Next Follow Up", "nextFollowUpDate")}
                                    {renderSortableHeader("Uploaded By", "createdBy")}
                                    <th className={`px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest min-w-[460px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                {loading ? (
                                    <>
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                        <TableRowSkeleton isDarkMode={isDarkMode} columns={23} />
                                    </>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan="23" className="px-6 py-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">
                                            No leads found
                                        </td>
                                    </tr>
                                ) : <>
                                    {/* Bulk Selection Banner */}
                                    {leads.length > 0 && leads.every(lead => selectedLeads.includes(lead._id)) && totalLeads > leads.length && (
                                        <tr>
                                            <td colSpan="23" className={`px-6 py-3 text-center text-[10px] font-black uppercase tracking-[0.15em] transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700'}`}>
                                                {isAllFilteredSelected ? (
                                                    <div className="flex items-center justify-center gap-4">
                                                        <span>All {totalLeads} leads matching these filters are selected.</span>
                                                        <button onClick={clearSelection} className="underline hover:no-underline">Clear selection</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-4">
                                                        <span>All {leads.length} leads on this page are selected.</span>
                                                        <button onClick={handleSelectAllFiltered} className="underline hover:no-underline text-cyan-500">Select all {totalLeads} leads matching filters</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                    {leads.map((lead, index) => (
                                        <tr key={lead._id} onClick={() => handleRowClick(lead)} className={`transition-all group cursor-pointer ${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'}`}>
                                            <td className={`px-6 py-4 text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeads.includes(lead._id)}
                                                        onChange={(e) => handleSelectLead(e, lead._id)}
                                                        className="cursor-pointer"
                                                    />
                                                    <span>{(currentPage - 1) * limit + index + 1}</span>
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
                                                {lead.isWalkIn || lead.source?.toLowerCase() === 'walk in' ? (
                                                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] border transition-all ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-100 text-cyan-600'}`}>
                                                        <FaWalking size={10} className="animate-pulse" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Walk In</span>
                                                        <span className={`ml-1 text-[8px] font-black px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>{lead.followUps?.length || 0}</span>
                                                    </div>
                                                ) : lead.followUps?.length > 0 ? (
                                                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] border transition-all ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                        <FaCheckCircle size={10} className="animate-pulse" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Contacted</span>
                                                        <span className={`ml-1 text-[8px] font-black px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>{lead.followUps.length}</span>
                                                    </div>
                                                ) : (
                                                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] border transition-all ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-yellow-50 border-yellow-100 text-yellow-600'}`}>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Pending</span>
                                                        <span className={`ml-1 text-[8px] font-black px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>{lead.followUps?.length || 0}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>
                                                        {lead.name}
                                                    </div>
                                                    {lead.isPriority && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded-[2px] text-[7px] font-black uppercase tracking-widest border border-red-500 bg-red-500/20 text-red-400 self-start leading-none">
                                                            Priority
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.email || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black text-cyan-500`}>{lead.phoneNumber || "NO CONTACT"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.secondPhoneNumber || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase group-hover:text-cyan-500 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.centre?.centreName || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[9px] font-bold text-cyan-500 mt-0.5 truncate max-w-[120px]">{lead.course?.courseName || lead.courseText || "Not provided"}</div>
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
                                                <div className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.marks !== undefined && lead.marks !== null ? lead.marks : "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-bold ${lead.walkInDate ? 'text-cyan-500' : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                                                    {lead.walkInDate ? new Date(lead.walkInDate).toLocaleDateString('en-GB') : "N/A"}
                                                </div>
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
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {lead.source || "N/A"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {lead.campaignFrom || "—"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {lead.marketingBy || "N/A"}
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
                                                <div className={`text-[10px] font-bold ${lead.nextFollowUpDate ? 'text-amber-500' : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                                                    {lead.nextFollowUpDate
                                                        ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB')
                                                        : "—"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} whitespace-nowrap`}>
                                                    {lead.createdBy?.name || "—"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 min-w-[460px]">
                                                <div className="flex items-center gap-2.5 whitespace-nowrap min-w-max">

                                                    {['superadmin', 'zonalmanager'].includes(user?.role?.toLowerCase()?.replace(/\s+/g, '')) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleTogglePriority(lead._id); }}
                                                            className={`px-3.5 py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all whitespace-nowrap ${lead.isPriority
                                                                ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-600/20'
                                                                : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white'
                                                                }`}
                                                        >
                                                            {lead.isPriority ? "★ Priority" : "☆ Priority"}
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleViewJourney(lead); }}
                                                        className="bg-purple-500 hover:bg-purple-400 text-white px-3.5 py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all whitespace-nowrap"
                                                    >
                                                        Journey
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCounseling(lead); }}
                                                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-3.5 py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all whitespace-nowrap"
                                                    >
                                                        Counselling
                                                    </button>
                                                    {lead.isWalkIn || lead.source?.toLowerCase() === 'walk in' ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleTagWalkIn(lead._id); }}
                                                            className="bg-emerald-500 hover:bg-emerald-400 text-white px-3.5 py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all whitespace-nowrap"
                                                        >
                                                            Walkined
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleTagWalkIn(lead._id); }}
                                                            className="bg-blue-500 hover:bg-blue-400 text-white px-3.5 py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all whitespace-nowrap"
                                                        >
                                                            Walk In
                                                        </button>
                                                    )}

                                                    {(canEdit || (lead.createdBy === user?._id || lead.createdBy === user?.id)) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}
                                                            className={`transition-colors whitespace-nowrap ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                    )}
                                                    {(canDelete || (lead.createdBy === user?._id || lead.createdBy === user?.id)) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }}
                                                            className="text-red-500 hover:text-red-400 transition-colors whitespace-nowrap"
                                                        >
                                                            <FaTrash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                                }
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

                        {/* Rows per page selector */}
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${isDarkMode ? 'text-gray-600' : 'text-gray-500'}`}>Rows:</span>
                            <div className="flex gap-1">
                                {[10, 20, 50, 100].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => {
                                            shouldSelectNewPageRef.current = true;
                                            setLimit(n);
                                            setCurrentPage(1);
                                        }}
                                        className={`px-2.5 py-1 rounded-[2px] text-[10px] font-black uppercase tracking-wider transition-all border ${limit === n
                                            ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                            : isDarkMode
                                                ? 'bg-gray-800 text-gray-500 border-gray-700 hover:border-cyan-500/40 hover:text-cyan-400'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-cyan-400 hover:text-cyan-600'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
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

            {showAddModal && <AddLeadModal isDarkMode={isDarkMode} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchLeads(); fetchFollowUpStats(); }} />}
            {showEditModal && selectedLead && <EditLeadModal isDarkMode={isDarkMode} lead={selectedLead} onClose={() => { setShowEditModal(false); setSelectedLead(null); }} onSuccess={() => { setShowEditModal(false); setSelectedLead(null); fetchLeads(); fetchFollowUpStats(); }} />}
            {showBulkModal && <BulkLeadModal isDarkMode={isDarkMode} onClose={() => setShowBulkModal(false)} onSuccess={() => { setShowBulkModal(false); fetchLeads(); fetchFollowUpStats(); }} />}
            {showBulkUpdateModal && (
                <BulkUpdateLeadModal
                    selectedLeadIds={selectedLeads}
                    isAllFilteredSelected={isAllFilteredSelected}
                    filters={{ ...filters, search: searchTerm }}
                    totalLeads={totalLeads}
                    isDarkMode={isDarkMode}
                    onClose={() => setShowBulkUpdateModal(false)}
                    onSuccess={() => { setShowBulkUpdateModal(false); clearSelection(); fetchLeads(); fetchFollowUpStats(); }}
                />
            )}
            {showDetailModal && selectedDetailLead && <LeadDetailsModal isDarkMode={isDarkMode} lead={selectedDetailLead} canEdit={canEdit} canDelete={canDelete} onClose={() => { setShowDetailModal(false); setSelectedDetailLead(null); }} onEdit={(lead) => { setShowDetailModal(false); handleEdit(lead); }} onDelete={(id) => { handleDelete(id); setShowDetailModal(false); setSelectedDetailLead(null); }} onFollowUp={(lead, startCall = false) => { setShowDetailModal(false); setSelectedLead(lead); setStartCallOnOpen(startCall); setShowFollowUpModal(true); }} onCounseling={(lead) => handleCounseling(lead)} onShowHistory={(lead) => { setSelectedDetailLead(lead); setShowHistoryModal(true); }} onWalkIn={handleTagWalkIn} onViewJourney={(lead) => { setShowDetailModal(false); handleViewJourney(lead); }} onTogglePriority={handleTogglePriority} />}
            {showFollowUpModal && selectedLead && <AddFollowUpModal isDarkMode={isDarkMode} lead={selectedLead} startCall={startCallOnOpen} onClose={() => { setShowFollowUpModal(false); setSelectedLead(null); setStartCallOnOpen(false); }} onSuccess={() => { setShowFollowUpModal(false); setSelectedLead(null); setStartCallOnOpen(false); fetchLeads(); fetchFollowUpStats(); }} />}
            {showHistoryModal && selectedDetailLead && <FollowUpHistoryModal isDarkMode={isDarkMode} lead={selectedDetailLead} onClose={() => setShowHistoryModal(false)} />}
            {showFollowUpListModal && <FollowUpListModal isDarkMode={isDarkMode} onClose={() => setShowFollowUpListModal(false)} onShowHistory={(lead) => { setSelectedDetailLead(lead); setShowHistoryModal(true); }} />}
            <FollowUpActivityModal
                isOpen={activityModal.isOpen}
                onClose={() => setActivityModal({ ...activityModal, isOpen: false })}
                title={activityModal.title}
                data={activityModal.data}
                isDarkMode={isDarkMode}
                onAddFollowUp={(leadObj) => {
                    setActivityModal({ ...activityModal, isOpen: false });
                    setSelectedLead(leadObj);
                    setShowFollowUpModal(true);
                }}
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

            {showCounselingChoiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md p-6 rounded-[2px] border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className={`text-xl font-black italic tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Select <span className="text-cyan-500">Course Type</span>
                                </h3>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Choose the counselling pipeline for this lead
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCounselingChoiceModal(false)}
                                className={`p-2 rounded-[2px] transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-500 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleNormalCounseling}
                                className={`w-full p-4 rounded-[2px] border text-left flex items-start gap-4 transition-all group hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20' : 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100'}`}
                            >
                                <div className="p-3 bg-cyan-500 rounded-[2px] text-black">
                                    <FaUserGraduate size={20} />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Normal Course Counselling</h4>
                                    <p className={`text-[10px] font-bold mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Standard admission workflow for pathway courses.</p>
                                </div>
                            </button>

                            <button
                                onClick={handleBoardCounseling}
                                className={`w-full p-4 rounded-[2px] border text-left flex items-start gap-4 transition-all group hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}`}
                            >
                                <div className="p-3 bg-indigo-500 rounded-[2px] text-white group-hover:bg-indigo-600 transition-colors">
                                    <FaGraduationCap size={20} />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Board Course Counselling</h4>
                                    <p className={`text-[10px] font-bold mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Specialized workflow for board pattern enrollments.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showJourneyModal && (
                <LeadJourneyModal
                    leadId={journeyLeadId}
                    onClose={() => {
                        setShowJourneyModal(false);
                        setJourneyLeadId(null);
                    }}
                    isDarkMode={isDarkMode}
                />
            )}

        </div >
    );
};

export default LeadManagementContent;
