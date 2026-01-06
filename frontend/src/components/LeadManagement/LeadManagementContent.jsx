import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaRedo, FaFileExcel, FaDownload, FaChevronLeft, FaChevronRight, FaHistory } from "react-icons/fa";
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
        leadType: "",
        source: "",
        centre: "",
        course: "",
        leadResponsibility: ""
    });

    // Dropdown data for filters
    const [sources, setSources] = useState([]);
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState([]);

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
    }, []);

    const fetchAllowedCentres = async () => {
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
    };

    useEffect(() => {
        // Debounce search to avoid too many requests
        const timeout = setTimeout(() => {
            fetchLeads();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm, filters, currentPage]);

    const fetchFilterData = async () => {
        try {
            const token = localStorage.getItem("token");

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

            // Fetch telecallers
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userResponse.json();
            if (userResponse.ok) {
                const telecallerUsers = (userData.users || []).filter(user => user.role === "telecaller");
                setTelecallers(telecallerUsers);
            }
        } catch (error) {
            console.error("Error fetching filter data:", error);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // Build query params
            const params = new URLSearchParams({
                page: currentPage,
                limit: limit,
                search: searchTerm,
                ...filters
            });

            // Remove empty filters
            for (const [key, value] of params.entries()) {
                if (!value) params.delete(key);
            }

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
            } else {
                toast.error(data.message || "Failed to fetch leads");
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
            toast.error("Error fetching leads");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const resetFilters = () => {
        setFilters({
            leadType: "",
            source: "",
            centre: "",
            course: "",
            leadResponsibility: ""
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

    const handleExport = () => {
        // Basic export of current page (or fetching all - implementing basic current view export for now)
        // Ideally should have a backend "export all" endpoint, but frontend export is limited to what's loaded.
        // User asked for output excel data, assumedly of visible or filtered data.
        // For now, I'll export currently loaded leads.

        if (leads.length === 0) {
            toast.warn("No leads to export");
            return;
        }

        const exportData = leads.map(lead => ({
            Name: lead.name,
            Email: lead.email,
            PhoneNumber: lead.phoneNumber,
            SchoolName: lead.schoolName,
            Class: lead.className?.name || "",
            Centre: lead.centre?.centreName || "",
            Course: lead.course?.courseName || "",
            Source: lead.source,
            TargetExam: lead.targetExam,
            LeadType: lead.leadType,
            LeadResponsibility: lead.leadResponsibility
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(data, "Leads_Export.xlsx");
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Lead Management</h2>
                    <p className="text-gray-400 text-sm">Manage and track all your leads</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-500 transition-colors"
                    >
                        <FaDownload /> Export Excel
                    </button>
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
            <div className="bg-[#1a1f24] border border-gray-700 rounded-lg p-4">
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
                        className="w-full bg-[#131619] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#1a1f24] border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <FaFilter className="text-cyan-400" />
                    <h3 className="text-white font-semibold">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Lead Type</label>
                        <select
                            value={filters.leadType}
                            onChange={(e) => handleFilterChange('leadType', e.target.value)}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="HOT LEAD">HOT LEAD</option>
                            <option value="COLD LEAD">COLD LEAD</option>
                            <option value="NEGATIVE">NEGATIVE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Source</label>
                        <select
                            value={filters.source}
                            onChange={(e) => handleFilterChange('source', e.target.value)}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white text-sm"
                        >
                            <option value="">All Sources</option>
                            {sources.map(source => (
                                <option key={source._id} value={source.sourceName}>{source.sourceName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Centre</label>
                        <select
                            value={filters.centre}
                            onChange={(e) => handleFilterChange('centre', e.target.value)}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white text-sm"
                        >
                            <option value="">All Centres</option>
                            {allowedCentres.map(centre => (
                                <option key={centre._id} value={centre._id}>{centre.centreName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Course</label>
                        <select
                            value={filters.course}
                            onChange={(e) => handleFilterChange('course', e.target.value)}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white text-sm"
                        >
                            <option value="">All Courses</option>
                            {courses.map(course => (
                                <option key={course._id} value={course._id}>{course.courseName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs mb-1">Lead Responsibility</label>
                        <select
                            value={filters.leadResponsibility}
                            onChange={(e) => handleFilterChange('leadResponsibility', e.target.value)}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white text-sm"
                        >
                            <option value="">All Telecallers</option>
                            {telecallers.map(telecaller => (
                                <option key={telecaller._id} value={telecaller.name}>{telecaller.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                        <FaRedo size={12} /> Reset Filters
                    </button>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-[#1a1f24] border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#131619] border-b border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">S/N</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Phone Number</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Class</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">School Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Centre</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Course</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Source</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Target Exam</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Lead Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Lead Responsibility</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="13" className="px-4 py-8 text-center text-cyan-400">
                                        Loading...
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="px-4 py-8 text-center text-gray-400">
                                        No leads found
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead, index) => (
                                    <tr key={lead._id} onClick={() => handleRowClick(lead)} className="hover-wave-row hover:bg-[#131619] transition-colors border-b border-gray-800 cursor-pointer">
                                        <td className="px-4 py-3 text-white">{(currentPage - 1) * limit + index + 1}</td>
                                        <td className="px-4 py-3 text-white">{lead.name}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.email}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.phoneNumber || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.className?.name || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.schoolName}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.centre?.centreName || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.course?.courseName || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.source || "N/A"}</td>
                                        <td className="px-4 py-3 text-gray-400">{lead.targetExam || "N/A"}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs border ${getLeadTypeColor(lead.leadType)}`}>
                                                {lead.leadType || "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">{lead.leadResponsibility || "N/A"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCounseling(lead); }}
                                                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-400 transition-colors"
                                                >
                                                    Counseling
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(lead); }}
                                                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
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
            <div className="flex justify-between items-center border-t border-gray-700 pt-4">
                <div className="text-gray-400 text-sm">
                    Showing {leads.length === 0 ? 0 : (currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalLeads)} of {totalLeads} entries
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-[#1a1f24] border border-gray-700 text-gray-400 p-2 rounded-lg hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaChevronLeft size={12} />
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${currentPage === i + 1
                                ? "bg-cyan-500 text-black font-bold"
                                : "bg-[#1a1f24] border border-gray-700 text-gray-400 hover:text-white"
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-[#1a1f24] border border-gray-700 text-gray-400 p-2 rounded-lg hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
