import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import {
    FaSearch, FaCheckCircle, FaClock, FaTimes, FaSyncAlt,
    FaExclamationTriangle, FaFilter, FaDownload, FaRegFileAlt,
    FaFileInvoice, FaEdit, FaCalendarAlt, FaMoneyCheckAlt,
    FaBuilding, FaArrowRight, FaEye, FaUniversity
} from "react-icons/fa";
import { toast } from "react-toastify";
import Select from "react-select";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import BillGenerator from "../../components/Finance/BillGenerator";

const ChequeManagement = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for KPI card drilldown
    const [cardModalType, setCardModalType] = useState(null); // 'TOTAL' | 'CLEARED' | 'PENDING' | 'NOT_DEPOSITED' | null
    const [modalSearchTerm, setModalSearchTerm] = useState("");
    const [modalZoneFilter, setModalZoneFilter] = useState([]);
    const [modalCentreFilter, setModalCentreFilter] = useState([]);
    const [modalCurrentPage, setModalCurrentPage] = useState(1);
    const [modalItemsPerPage, setModalItemsPerPage] = useState(10);

    // Card-specific zone filter overrides
    const [cardZoneFilters, setCardZoneFilters] = useState({
        TOTAL: [],
        CLEARED: [],
        PENDING: [],
        NOT_DEPOSITED: []
    });

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectDate, setRejectDate] = useState(new Date().toISOString().split('T')[0]);

    const [showClearModal, setShowClearModal] = useState(false);
    const [clearingId, setClearingId] = useState(null);
    const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0]);

    const [showEditClearanceDateModal, setShowEditClearanceDateModal] = useState(false);
    const [editingCheque, setEditingCheque] = useState(null);
    const [editClearDate, setEditClearDate] = useState("");
    const [isUpdatingClearanceDate, setIsUpdatingClearanceDate] = useState(false);

    const [showEditStatusModal, setShowEditStatusModal] = useState(false);
    const [statusEditingCheque, setStatusEditingCheque] = useState(null);
    const [targetStatus, setTargetStatus] = useState("PAID");
    const [statusClearedDate, setStatusClearedDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusRejectDate, setStatusRejectDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusRejectReason, setStatusRejectReason] = useState("");
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const [selectedBillCheque, setSelectedBillCheque] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState("");

    const [filters, setFilters] = useState({
        zone: [],
        centre: [],
        course: [],
        department: [],
        status: ["PENDING_CLEARANCE"],
        receivedStartDate: "",
        receivedEndDate: "",
        chequeStartDate: "",
        chequeEndDate: "",
        clearRejectStartDate: "",
        clearRejectEndDate: ""
    });

    const [metadata, setMetadata] = useState({
        zones: [],
        centres: [],
        courses: [],
        departments: []
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    const isSuperAdminOrAccounts = userRoles.some(r => {
        const norm = typeof r === "string" ? r.toLowerCase().replace(/[\s\-_]+/g, "") : "";
        return norm === "superadmin" || norm === "accounts" || norm === "account";
    });

    // All role users can view Cheque Management after being granted access, while superadmin and accounts have view access by default
    const hasViewAccess = isSuperAdminOrAccounts || hasPermission(user, 'financeFees', 'chequeManagement', 'view');

    // Cheque approval and rejection strictly restricted to accounts and superadmin roles
    const canManageCheques = isSuperAdminOrAccounts && hasPermission(user, 'financeFees', 'chequeManagement', 'edit');

    useEffect(() => {
        if (!hasViewAccess) {
            toast.error("Access Denied: You do not have permission to view Cheque Management.");
            navigate("/");
        }
    }, [hasViewAccess, navigate]);

    useEffect(() => {
        fetchMetadata();
        fetchCheques();
    }, []);

    // Re-fetch when filters change (debounced for search)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCheques();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters, searchTerm]);

    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centresRes, coursesRes, deptsRes, zonesRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers })
            ]);

            const centres = await centresRes.json();
            const courses = await coursesRes.json();
            const depts = await deptsRes.json();
            const zonesData = zonesRes.ok ? await zonesRes.json() : [];
            const rawZones = Array.isArray(zonesData) ? zonesData : (zonesData.data || []);

            // Filter centres based on user's authorized assigned centres
            const isSuperAdminUser = userRoles.some(r => {
                const norm = typeof r === "string" ? r.toLowerCase().replace(/[\s\-_]+/g, "") : "";
                return norm === "superadmin";
            });

            const filteredCentres = Array.isArray(centres)
                ? centres.filter(c => {
                    if (isSuperAdminUser) return true;
                    if (!user.centres || user.centres.length === 0) return false;
                    return user.centres.some(uc => {
                        const ucId = typeof uc === 'object' ? (uc._id || uc.id) : uc;
                        const ucName = typeof uc === 'object' ? uc.centreName : null;
                        const matchId = ucId && c._id && ucId.toString() === c._id.toString();
                        const matchName = ucName && c.centreName && ucName.trim().toLowerCase() === c.centreName.trim().toLowerCase();
                        return matchId || matchName;
                    });
                })
                : [];

            const userCentresSet = new Set(filteredCentres.map(c => (c.centreName || "").trim().toLowerCase()));
            const availableZones = rawZones.filter(z => {
                if (z.isActive === false) return false;
                if (isSuperAdminUser) return true;
                return (z.centres || []).some(c => {
                    const cName = typeof c === 'object' ? c.centreName : null;
                    return cName && userCentresSet.has(cName.trim().toLowerCase());
                });
            });

            setMetadata({
                zones: availableZones,
                centres: filteredCentres,
                courses: Array.isArray(courses) ? courses : [],
                departments: Array.isArray(depts) ? depts.filter(dept => dept.showInAdmission !== false) : []
            });
        } catch (error) {
            console.error("Error fetching metadata:", error);
            toast.error("Failed to load metadata");
        }
    };

    const fetchCheques = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();

            // Handle multi-select arrays and other filters
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value) && value.length > 0) {
                    value.forEach(v => queryParams.append(key, v));
                } else if (value && !Array.isArray(value) && value !== 'all') {
                    queryParams.append(key, value);
                }
            });

            if (searchTerm) queryParams.append("search", searchTerm);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/pending-cheques?${queryParams.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setCheques(data);
            } else {
                toast.error("Failed to load cheques");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Error loading data");
        } finally {
            setLoading(false);
        }
    };

    // Zone options for dropdowns
    const zoneOptions = React.useMemo(() => {
        return (metadata.zones || [])
            .map(z => ({ value: z.name, label: z.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [metadata.zones]);

    // Available centres filtered by selected main zones
    const availableCentresForDropdown = React.useMemo(() => {
        if (!filters.zone || filters.zone.length === 0) {
            return metadata.centres;
        }
        const allowedCentreNames = new Set();
        (metadata.zones || [])
            .filter(z => filters.zone.includes(z.name) || filters.zone.includes(z._id))
            .forEach(z => {
                (z.centres || []).forEach(c => {
                    const name = typeof c === 'object' ? c.centreName : null;
                    if (name) allowedCentreNames.add(name.trim().toLowerCase());
                });
            });
        return metadata.centres.filter(c => allowedCentreNames.has((c.centreName || "").trim().toLowerCase()));
    }, [metadata.centres, metadata.zones, filters.zone]);

    // Helper to filter a cheque list by zones
    const filterChequesByZones = (chequeList, selectedZones) => {
        if (!selectedZones || selectedZones.length === 0) return chequeList;
        const allowedCentres = new Set();
        (metadata.zones || [])
            .filter(z => selectedZones.includes(z.name) || selectedZones.includes(z._id))
            .forEach(z => {
                (z.centres || []).forEach(c => {
                    const name = typeof c === 'object' ? c.centreName : null;
                    if (name) allowedCentres.add(name.trim().toLowerCase());
                });
            });
        return chequeList.filter(c => {
            const cCentre = (c.centre || "").trim().toLowerCase();
            return allowedCentres.has(cCentre);
        });
    };

    // Calculate individual card stats dynamically taking into account any card-specific zone filter
    const cardStats = React.useMemo(() => {
        const calculateStats = (chequeList) => {
            return chequeList.reduce((acc, c) => {
                const amt = Number(c.amount) || 0;
                acc.amount += amt;
                acc.count += 1;
                return acc;
            }, { amount: 0, count: 0 });
        };

        const totalList = filterChequesByZones(cheques, cardZoneFilters.TOTAL);
        const clearedList = filterChequesByZones(cheques.filter(c => c.status === "PAID"), cardZoneFilters.CLEARED);
        const pendingList = filterChequesByZones(cheques.filter(c => c.status === "PENDING_CLEARANCE"), cardZoneFilters.PENDING);
        const notDepositedList = filterChequesByZones(cheques.filter(c => !c.isDeposited), cardZoneFilters.NOT_DEPOSITED);

        return {
            TOTAL: calculateStats(totalList),
            CLEARED: calculateStats(clearedList),
            PENDING: calculateStats(pendingList),
            NOT_DEPOSITED: calculateStats(notDepositedList)
        };
    }, [cheques, cardZoneFilters, metadata.zones]);

    const handleCardZoneChange = (type, selectedZones) => {
        setCardZoneFilters(prev => ({
            ...prev,
            [type]: selectedZones
        }));
    };

    const availableCentres = React.useMemo(() => {
        const fromMeta = (metadata.centres || []).map(c => c.centreName).filter(Boolean);
        const fromCheques = (cheques || []).map(c => c.centre).filter(Boolean);
        return [...new Set([...fromMeta, ...fromCheques])].sort((a, b) => a.localeCompare(b));
    }, [metadata.centres, cheques]);

    const modalAvailableCentres = React.useMemo(() => {
        let centresToFilter = availableCentres;
        if (modalZoneFilter && modalZoneFilter.length > 0) {
            const allowedCentres = new Set();
            (metadata.zones || [])
                .filter(z => modalZoneFilter.includes(z.name) || modalZoneFilter.includes(z._id))
                .forEach(z => {
                    (z.centres || []).forEach(c => {
                        const name = typeof c === 'object' ? c.centreName : null;
                        if (name) allowedCentres.add(name.trim().toLowerCase());
                    });
                });
            centresToFilter = centresToFilter.filter(c => allowedCentres.has(c.trim().toLowerCase()));
        }
        return centresToFilter;
    }, [modalZoneFilter, metadata.zones, availableCentres]);

    const openCardModal = (type) => {
        setCardModalType(type);
        setModalSearchTerm("");
        const initialZones = cardZoneFilters[type] && cardZoneFilters[type].length > 0
            ? cardZoneFilters[type]
            : (filters.zone || []);
        setModalZoneFilter(initialZones);
        setModalCentreFilter(filters.centre && filters.centre.length > 0 ? filters.centre : []);
        setModalCurrentPage(1);
    };

    const getModalData = () => {
        let items = [];
        let title = "";
        let description = "";
        let badgeColor = "";
        let icon = null;

        if (cardModalType === "TOTAL") {
            items = cheques;
            title = "Total Cheques Details";
            description = "All cheques in current filter selection";
            badgeColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
            icon = <FaMoneyCheckAlt className="text-blue-400" />;
        } else if (cardModalType === "CLEARED") {
            items = cheques.filter(c => c.status === "PAID");
            title = "Cleared Cheques Details";
            description = "Cheques that have been cleared (PAID)";
            badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
            icon = <FaCheckCircle className="text-emerald-400" />;
        } else if (cardModalType === "PENDING") {
            items = cheques.filter(c => c.status === "PENDING_CLEARANCE");
            title = "Pending Cheques Details";
            description = "Cheques currently in process (PENDING_CLEARANCE)";
            badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
            icon = <FaClock className="text-amber-400" />;
        } else if (cardModalType === "NOT_DEPOSITED") {
            items = cheques.filter(c => !c.isDeposited);
            title = "Undeposited Cheques Details";
            description = "Cheques not deposited yet from Cheque Deposit Entry";
            badgeColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
            icon = <FaBuilding className="text-rose-400" />;
        }

        let filteredItems = items;

        if (modalZoneFilter && modalZoneFilter.length > 0) {
            const allowedCentres = new Set();
            (metadata.zones || [])
                .filter(z => modalZoneFilter.includes(z.name) || modalZoneFilter.includes(z._id))
                .forEach(z => {
                    (z.centres || []).forEach(c => {
                        const name = typeof c === 'object' ? c.centreName : null;
                        if (name) allowedCentres.add(name.trim().toLowerCase());
                    });
                });
            filteredItems = filteredItems.filter(c => allowedCentres.has((c.centre || "").trim().toLowerCase()));
        }

        if (modalCentreFilter && modalCentreFilter.length > 0) {
            const selectedCentreSet = new Set(
                (Array.isArray(modalCentreFilter) ? modalCentreFilter : [modalCentreFilter]).map(c => c.trim().toLowerCase())
            );
            filteredItems = filteredItems.filter(c =>
                selectedCentreSet.has((c.centre || "").trim().toLowerCase())
            );
        }

        if (modalSearchTerm.trim()) {
            const term = modalSearchTerm.toLowerCase();
            filteredItems = filteredItems.filter(c => {
                const chNo = (c.chequeNumber || "").toLowerCase();
                const sName = (c.studentName || "").toLowerCase();
                const admNo = (c.admissionNumber || "").toLowerCase();
                const bank = (c.bankName || "").toLowerCase();
                const centre = (c.centre || "").toLowerCase();
                const zone = (c.zone || "").toLowerCase();
                return chNo.includes(term) || sName.includes(term) || admNo.includes(term) || bank.includes(term) || centre.includes(term) || zone.includes(term);
            });
        }

        const totalModalAmount = filteredItems.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        return { items, filteredItems, title, description, badgeColor, icon, totalModalAmount };
    };

    const exportModalToExcel = () => {
        const { filteredItems, title } = getModalData();
        if (!filteredItems || filteredItems.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = filteredItems.map(c => ({
            "Cheque No": c.chequeNumber || "N/A",
            "Cheque Date": c.chequeDate ? new Date(c.chequeDate).toLocaleDateString('en-IN') : "N/A",
            "Student Name": c.studentName || "N/A",
            "Admission No": c.admissionNumber || "N/A",
            "Zone": c.zone || "N/A",
            "Centre": c.centre || "N/A",
            "Course": c.courseName || "N/A",
            "Bank": c.bankName || "N/A",
            "Amount (INR)": c.amount || 0,
            "Receiving Date": c.receivedDate ? new Date(c.receivedDate).toLocaleDateString('en-IN') : "N/A",
            "Status": c.status === "PAID" ? "CLEARED" : (c.status === "PENDING_CLEARANCE" ? "IN PROCESS" : c.status),
            "Deposit Status": c.isDeposited ? "Deposited" : "Not Deposited",
            "Deposit Date": c.depositedDate ? new Date(c.depositedDate).toLocaleDateString('en-IN') : "N/A",
            "Deposit Account": c.depositAccount || "N/A",
            "Cleared/Rejected Date": c.clearedOrRejectedDate ? new Date(c.clearedOrRejectedDate).toLocaleDateString('en-IN') : "N/A"
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cheques");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported successfully!");
    };

    const handleClearCheque = async () => {
        if (!canManageCheques) {
            toast.error("Access Denied: Only Accounts and SuperAdmin roles can clear cheques.");
            return;
        }
        if (!clearDate) {
            toast.error("Please provide a cleared date");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/clear-cheque/${clearingId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ clearedDate: clearDate })
                }
            );

            if (response.ok) {
                const result = await response.json();
                toast.success(`Cheque cleared! Bill ID: ${result.billId}`);
                setShowClearModal(false);
                setClearingId(null);
                setClearDate(new Date().toISOString().split('T')[0]);
                fetchCheques();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to clear cheque");
            }
        } catch (error) {
            console.error("Clear Error:", error);
            toast.error("Error clearing cheque");
        }
    };

    const handleRejectCheque = async () => {
        if (!canManageCheques) {
            toast.error("Access Denied: Only Accounts and SuperAdmin roles can reject cheques.");
            return;
        }
        if (!rejectDate) {
            toast.error("Please provide a rejection date");
            return;
        }
        if (!rejectReason) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/reject-cheque/${rejectingId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ reason: rejectReason, rejectedDate: rejectDate })
                }
            );

            if (response.ok) {
                toast.success("Cheque rejected/bounced");
                setShowRejectModal(false);
                setRejectingId(null);
                setRejectReason("");
                fetchCheques();
            } else {
                toast.error("Failed to reject cheque");
            }
        } catch (error) {
            console.error("Reject Error:", error);
            toast.error("Error rejecting cheque");
        }
    };

    const handleOpenEditClearanceDate = (cheque) => {
        setEditingCheque(cheque);
        let dateVal = "";
        if (cheque.clearedOrRejectedDate) {
            const d = new Date(cheque.clearedOrRejectedDate);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dateVal = `${year}-${month}-${day}`;
            }
        }
        if (!dateVal) {
            dateVal = new Date().toISOString().split('T')[0];
        }
        setEditClearDate(dateVal);
        setShowEditClearanceDateModal(true);
    };

    const handleUpdateClearanceDate = async () => {
        if (!isSuperAdminOrAccounts) {
            toast.error("Access Denied: Only Accounts and SuperAdmin users can edit clearance dates.");
            return;
        }
        if (!editClearDate) {
            toast.error("Please provide a valid clearance date.");
            return;
        }
        if (!editingCheque) return;

        setIsUpdatingClearanceDate(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/update-clearance-date/${editingCheque.paymentId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ clearedDate: editClearDate })
                }
            );

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || "Clearance date updated successfully!");
                setShowEditClearanceDateModal(false);
                setEditingCheque(null);
                setEditClearDate("");
                fetchCheques();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to update clearance date");
            }
        } catch (error) {
            console.error("Update Clearance Date Error:", error);
            toast.error("Error updating clearance date");
        } finally {
            setIsUpdatingClearanceDate(false);
        }
    };

    const handleOpenEditStatus = (cheque) => {
        setStatusEditingCheque(cheque);
        const initialTarget = cheque.status === "PAID" ? "REJECTED" : "PAID";
        setTargetStatus(initialTarget);

        let dVal = new Date().toISOString().split('T')[0];
        if (cheque.clearedOrRejectedDate) {
            const d = new Date(cheque.clearedOrRejectedDate);
            if (!isNaN(d.getTime())) {
                dVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        }
        setStatusClearedDate(dVal);
        setStatusRejectDate(dVal);
        setStatusRejectReason("");
        setShowEditStatusModal(true);
    };

    const handleUpdateStatus = async () => {
        if (!isSuperAdminOrAccounts) {
            toast.error("Access Denied: Only Accounts and SuperAdmin users can edit cheque status.");
            return;
        }
        if (!statusEditingCheque) return;

        if (targetStatus === "PAID" && !statusClearedDate) {
            toast.error("Please provide a cleared date");
            return;
        }
        if (targetStatus === "REJECTED" && !statusRejectDate) {
            toast.error("Please provide a rejection date");
            return;
        }

        setIsUpdatingStatus(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                status: targetStatus,
                clearedDate: targetStatus === "PAID" ? statusClearedDate : undefined,
                rejectedDate: targetStatus === "REJECTED" ? statusRejectDate : undefined,
                reason: targetStatus === "REJECTED" ? statusRejectReason : undefined
            };

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/update-status/${statusEditingCheque.paymentId || statusEditingCheque.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || "Cheque status updated successfully!");
                setShowEditStatusModal(false);
                setStatusEditingCheque(null);
                fetchCheques();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to update cheque status");
            }
        } catch (error) {
            console.error("Update Status Error:", error);
            toast.error("Error updating cheque status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const filteredCheques = cheques; // Now filtered by backend

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            zone: [],
            centre: [],
            course: [],
            department: [],
            status: ["PENDING_CLEARANCE"],
            receivedStartDate: "",
            receivedEndDate: "",
            chequeStartDate: "",
            chequeEndDate: "",
            clearRejectStartDate: "",
            clearRejectEndDate: ""
        });
        setCardZoneFilters({
            TOTAL: [],
            CLEARED: [],
            PENDING: [],
            NOT_DEPOSITED: []
        });
        setSearchTerm("");
    };

    const exportToExcel = () => {
        if (cheques.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = cheques.map(c => ({
            "Cheque No": c.chequeNumber,
            "Student Name": c.studentName,
            "Admission No": c.admissionNumber,
            "Zone": c.zone || "N/A",
            "Centre": c.centre,
            "Bank": c.bankName,
            "Amount": c.amount,
            "Receiving Date": c.receivedDate ? new Date(c.receivedDate).toLocaleDateString('en-IN') : "N/A",
            "Cheque Date": c.chequeDate ? new Date(c.chequeDate).toLocaleDateString('en-IN') : "N/A",
            "Cheque Deposit Date": c.depositedDate ? new Date(c.depositedDate).toLocaleDateString('en-IN') : "N/A",
            "Cleared/Rejected Date": c.clearedOrRejectedDate ? new Date(c.clearedOrRejectedDate).toLocaleDateString('en-IN') : "N/A",
            "Status": c.status === "PAID" ? "Cleared" : (c.status === "REJECTED" ? "Rejected" : "Pending"),
            "Bill No": c.status === "PAID" ? (c.billId || "Generated") : "N/A",
            "Course": c.courseName,
            "Department": c.department,
            "Processed By": c.processedBy
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cheque Management Report");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Cheque_Management_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported successfully!");
    };

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            background: isDarkMode ? "#131619" : "#ffffff",
            borderColor: state.isFocused ? "rgba(16, 185, 129, 0.5)" : (isDarkMode ? "rgba(31, 41, 55, 1)" : "rgba(209, 213, 219, 1)"),
            borderRadius: "0.75rem",
            padding: "2px",
            fontSize: "10px",
            fontWeight: "bold",
            color: isDarkMode ? "white" : "#111827",
            boxShadow: "none",
            "&:hover": {
                borderColor: "rgba(16, 185, 129, 0.3)"
            }
        }),
        menu: (base) => ({
            ...base,
            background: isDarkMode ? "#131619" : "#ffffff",
            border: isDarkMode ? "1px solid rgba(31, 41, 55, 1)" : "1px solid rgba(229, 231, 235, 1)",
            borderRadius: "0.75rem",
            zIndex: 9999
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected
                ? "#10b981"
                : state.isFocused
                    ? (isDarkMode ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)")
                    : "transparent",
            color: state.isSelected
                ? "white"
                : state.isFocused
                    ? "#10b981"
                    : (isDarkMode ? "#9ca3af" : "#374151"),
            fontSize: "10px",
            fontWeight: "bold",
            textTransform: "uppercase",
            cursor: "pointer",
            "&:active": {
                background: "rgba(16, 185, 129, 0.2)"
            }
        }),
        multiValue: (base) => ({
            ...base,
            background: "rgba(16, 185, 129, 0.1)",
            borderRadius: "4px"
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "#10b981",
            fontSize: "9px",
            fontWeight: "black"
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "#10b981",
            "&:hover": {
                background: "rgba(16, 185, 129, 0.2)",
                color: "#059669"
            }
        }),
        placeholder: (base) => ({
            ...base,
            color: isDarkMode ? "#4b5563" : "#9ca3af"
        }),
        singleValue: (base) => ({
            ...base,
            color: isDarkMode ? "#e5e7eb" : "#111827"
        })
    };

    const cardSelectStyles = {
        control: (base, state) => ({
            ...base,
            background: isDarkMode ? "#181c20" : "#f9fafb",
            borderColor: state.isFocused ? "rgba(16, 185, 129, 0.6)" : (isDarkMode ? "rgba(55, 65, 81, 0.6)" : "rgba(229, 231, 235, 1)"),
            borderRadius: "0.75rem",
            padding: "0 2px",
            minHeight: "30px",
            fontSize: "9px",
            fontWeight: "bold",
            color: isDarkMode ? "white" : "#111827",
            boxShadow: "none",
            "&:hover": {
                borderColor: "rgba(16, 185, 129, 0.4)"
            }
        }),
        menu: (base) => ({
            ...base,
            background: isDarkMode ? "#131619" : "#ffffff",
            border: isDarkMode ? "1px solid rgba(55, 65, 81, 1)" : "1px solid rgba(229, 231, 235, 1)",
            borderRadius: "0.75rem",
            zIndex: 9999
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        option: (base, state) => ({
            ...base,
            background: state.isSelected
                ? "#10b981"
                : state.isFocused
                    ? (isDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.08)")
                    : "transparent",
            color: state.isSelected
                ? "white"
                : state.isFocused
                    ? "#10b981"
                    : (isDarkMode ? "#9ca3af" : "#374151"),
            fontSize: "9px",
            fontWeight: "bold",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: "5px 10px"
        }),
        multiValue: (base) => ({
            ...base,
            background: "rgba(16, 185, 129, 0.15)",
            borderRadius: "4px",
            margin: "1px 2px"
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "#10b981",
            fontSize: "8px",
            fontWeight: "900",
            padding: "1px 4px"
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "#10b981",
            padding: "0 2px",
            "&:hover": {
                background: "rgba(16, 185, 129, 0.25)",
                color: "#059669"
            }
        }),
        placeholder: (base) => ({
            ...base,
            color: isDarkMode ? "#6b7280" : "#9ca3af",
            fontSize: "9px"
        }),
        indicatorsContainer: (base) => ({
            ...base,
            padding: "0"
        }),
        dropdownIndicator: (base) => ({
            ...base,
            padding: "2px 4px",
            svg: { width: "11px", height: "11px" }
        }),
        clearIndicator: (base) => ({
            ...base,
            padding: "2px",
            svg: { width: "11px", height: "11px" }
        })
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"><FaCheckCircle /> Cleared</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> IN PROCESS</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaTimes /> Bounced</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">{status}</span>;
        }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCheques.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCheques.length / itemsPerPage);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        } else {
            toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
        }
        setJumpToPage("");
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1700px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className={`text-4xl font-black ${isDarkMode ? "text-white" : "text-gray-900"} italic uppercase tracking-tighter mb-2`}>
                            Cheque <span className="text-emerald-500">Management</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Real-time Clearance & Rejection Tracking
                        </p>
                    </div>
                    <button
                        onClick={fetchCheques}
                        className={`px-6 py-3 font-black uppercase text-sm tracking-widest rounded-xl transition-all flex items-center gap-2 ${isDarkMode ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
                    >
                        <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Card 1: Total Cheque Amount */}
                    <div
                        onClick={() => openCardModal("TOTAL")}
                        className={`group relative p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 ${isDarkMode
                            ? "bg-[#131619] border-gray-800 hover:border-blue-500/50 hover:shadow-blue-500/10"
                            : "bg-white border-gray-200 hover:border-blue-400 hover:shadow-blue-500/10"
                            }`}
                        title="Click to view all cheques in filtered selection"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl group-hover:scale-110 transition-transform shadow-inner">
                                <FaMoneyCheckAlt />
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                {cardStats.TOTAL.count} Cheques
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Cheque Amount</p>
                        <h3 className={`text-2xl font-black italic tracking-tight mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            ₹{cardStats.TOTAL.amount.toLocaleString('en-IN')}
                        </h3>

                        {/* Zone Multi-Selection inside Card */}
                        <div className="mb-3 pt-2 border-t border-gray-800/40" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Zone Filter</span>
                                {cardZoneFilters.TOTAL.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleCardZoneChange("TOTAL", [])}
                                        className="text-[9px] text-rose-400 hover:text-rose-300 uppercase font-black tracking-wider"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <Select
                                isMulti
                                options={zoneOptions}
                                value={cardZoneFilters.TOTAL.map(z => ({ value: z, label: z }))}
                                onChange={(selected) => handleCardZoneChange("TOTAL", selected ? selected.map(s => s.value) : [])}
                                styles={cardSelectStyles}
                                placeholder="ALL ZONES"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/40 text-[10px] font-bold text-blue-400/80 group-hover:text-blue-400">
                            <span>Click to view details</span>
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform" size={10} />
                        </div>
                    </div>

                    {/* Card 2: Cleared Amount */}
                    <div
                        onClick={() => openCardModal("CLEARED")}
                        className={`group relative p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 ${isDarkMode
                            ? "bg-[#131619] border-gray-800 hover:border-emerald-500/50 hover:shadow-emerald-500/10"
                            : "bg-white border-gray-200 hover:border-emerald-400 hover:shadow-emerald-500/10"
                            }`}
                        title="Click to view cleared cheques"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl group-hover:scale-110 transition-transform shadow-inner">
                                <FaCheckCircle />
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                {cardStats.CLEARED.count} Cleared
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cleared Amount</p>
                        <h3 className="text-2xl font-black italic tracking-tight text-emerald-500 mb-3">
                            ₹{cardStats.CLEARED.amount.toLocaleString('en-IN')}
                        </h3>

                        {/* Zone Multi-Selection inside Card */}
                        <div className="mb-3 pt-2 border-t border-gray-800/40" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Zone Filter</span>
                                {cardZoneFilters.CLEARED.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleCardZoneChange("CLEARED", [])}
                                        className="text-[9px] text-rose-400 hover:text-rose-300 uppercase font-black tracking-wider"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <Select
                                isMulti
                                options={zoneOptions}
                                value={cardZoneFilters.CLEARED.map(z => ({ value: z, label: z }))}
                                onChange={(selected) => handleCardZoneChange("CLEARED", selected ? selected.map(s => s.value) : [])}
                                styles={cardSelectStyles}
                                placeholder="ALL ZONES"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/40 text-[10px] font-bold text-emerald-400/80 group-hover:text-emerald-400">
                            <span>Click to view details</span>
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform" size={10} />
                        </div>
                    </div>

                    {/* Card 3: Pending Amount */}
                    <div
                        onClick={() => openCardModal("PENDING")}
                        className={`group relative p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 ${isDarkMode
                            ? "bg-[#131619] border-gray-800 hover:border-yellow-500/50 hover:shadow-yellow-500/10"
                            : "bg-white border-gray-200 hover:border-yellow-400 hover:shadow-yellow-500/10"
                            }`}
                        title="Click to view pending cheques"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 text-xl group-hover:scale-110 transition-transform shadow-inner">
                                <FaClock />
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                {cardStats.PENDING.count} In Process
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Pending Amount</p>
                        <h3 className="text-2xl font-black italic tracking-tight text-yellow-500 mb-3">
                            ₹{cardStats.PENDING.amount.toLocaleString('en-IN')}
                        </h3>

                        {/* Zone Multi-Selection inside Card */}
                        <div className="mb-3 pt-2 border-t border-gray-800/40" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Zone Filter</span>
                                {cardZoneFilters.PENDING.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleCardZoneChange("PENDING", [])}
                                        className="text-[9px] text-rose-400 hover:text-rose-300 uppercase font-black tracking-wider"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <Select
                                isMulti
                                options={zoneOptions}
                                value={cardZoneFilters.PENDING.map(z => ({ value: z, label: z }))}
                                onChange={(selected) => handleCardZoneChange("PENDING", selected ? selected.map(s => s.value) : [])}
                                styles={cardSelectStyles}
                                placeholder="ALL ZONES"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/40 text-[10px] font-bold text-yellow-400/80 group-hover:text-yellow-400">
                            <span>Click to view details</span>
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform" size={10} />
                        </div>
                    </div>

                    {/* Card 4: Cheque Deposit Count (Not Deposited) */}
                    <div
                        onClick={() => openCardModal("NOT_DEPOSITED")}
                        className={`group relative p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1 ${isDarkMode
                            ? "bg-[#131619] border-gray-800 hover:border-rose-500/50 hover:shadow-rose-500/10"
                            : "bg-white border-gray-200 hover:border-rose-400 hover:shadow-rose-500/10"
                            }`}
                        title="Click to view cheques not yet deposited from cheque deposit entry"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xl group-hover:scale-110 transition-transform shadow-inner">
                                <FaBuilding />
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-rose-500/10 text-rose-400 border-rose-500/20">
                                ₹{cardStats.NOT_DEPOSITED.amount.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cheque Not Deposit Count</p>
                        <h3 className="text-2xl font-black italic tracking-tight text-rose-400 mb-3">
                            {cardStats.NOT_DEPOSITED.count} <span className="text-xs font-bold text-gray-500 not-italic">Not Deposited</span>
                        </h3>

                        {/* Zone Multi-Selection inside Card */}
                        <div className="mb-3 pt-2 border-t border-gray-800/40" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Zone Filter</span>
                                {cardZoneFilters.NOT_DEPOSITED.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleCardZoneChange("NOT_DEPOSITED", [])}
                                        className="text-[9px] text-rose-400 hover:text-rose-300 uppercase font-black tracking-wider"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <Select
                                isMulti
                                options={zoneOptions}
                                value={cardZoneFilters.NOT_DEPOSITED.map(z => ({ value: z, label: z }))}
                                onChange={(selected) => handleCardZoneChange("NOT_DEPOSITED", selected ? selected.map(s => s.value) : [])}
                                styles={cardSelectStyles}
                                placeholder="ALL ZONES"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/40 text-[10px] font-bold text-rose-400/80 group-hover:text-rose-400">
                            <span>Click to view details</span>
                            <FaArrowRight className="group-hover:translate-x-1 transition-transform" size={10} />
                        </div>
                    </div>
                </div>

                {/* Main Filter Section */}
                <div className={`border rounded-3xl p-6 mb-8 shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Zone</label>
                            <Select
                                isMulti
                                options={zoneOptions}
                                value={filters.zone.map(z => ({ value: z, label: z }))}
                                onChange={(selected) => handleFilterChange("zone", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL ZONES"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                            <Select
                                isMulti
                                options={availableCentresForDropdown.map(c => ({ value: c.centreName, label: c.centreName }))}
                                value={filters.centre.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("centre", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL CENTRES"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                            <Select
                                isMulti
                                options={metadata.courses.map(c => ({ value: c.courseName, label: c.courseName }))}
                                value={filters.course.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("course", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL COURSES"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                            <Select
                                isMulti
                                options={metadata.departments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                                value={filters.department.map(d => ({ value: d, label: d }))}
                                onChange={(selected) => handleFilterChange("department", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL DEPARTMENTS"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Status Wise Filter</label>
                            <Select
                                isMulti
                                options={[
                                    { value: "PENDING_CLEARANCE", label: "INPROCESS" },
                                    { value: "PAID", label: "CLEARED" },
                                    { value: "REJECTED", label: "REJECTED" }
                                ]}
                                value={(Array.isArray(filters.status) ? filters.status : []).map(s => {
                                    if (s === "PENDING_CLEARANCE") return { value: s, label: "INPROCESS" };
                                    if (s === "PAID") return { value: s, label: "CLEARED" };
                                    if (s === "REJECTED") return { value: s, label: "REJECTED" };
                                    return { value: s, label: s };
                                })}
                                onChange={(selected) => handleFilterChange("status", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL STATUS"
                                className="react-select-container"
                                classNamePrefix="react-select"
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 items-end mb-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Received Start Date</label>
                            <input
                                type="date"
                                value={filters.receivedStartDate}
                                onChange={(e) => handleFilterChange("receivedStartDate", e.target.value)}
                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Received End Date</label>
                            <input
                                type="date"
                                value={filters.receivedEndDate}
                                onChange={(e) => handleFilterChange("receivedEndDate", e.target.value)}
                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Start Date</label>
                            <input
                                type="date"
                                value={filters.chequeStartDate}
                                onChange={(e) => handleFilterChange("chequeStartDate", e.target.value)}
                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque End Date</label>
                            <input
                                type="date"
                                value={filters.chequeEndDate}
                                onChange={(e) => handleFilterChange("chequeEndDate", e.target.value)}
                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Clear/Reject Start Date</label>
                            <input
                                type="date"
                                value={filters.clearRejectStartDate}
                                onChange={(e) => handleFilterChange("clearRejectStartDate", e.target.value)}
                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Clear/Reject End Date</label>
                            <input
                                type="date"
                                value={filters.clearRejectEndDate}
                                onChange={(e) => handleFilterChange("clearRejectEndDate", e.target.value)}
                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-800/50">
                        <button
                            onClick={clearFilters}
                            className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all border flex items-center justify-center gap-2 ${isDarkMode ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border-gray-300"}`}
                        >
                            <FaTimes /> Clear All Filters
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex-1 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5"
                        >
                            <FaDownload /> Export Management Data
                        </button>
                    </div>
                </div>

                {/* Sub-search */}
                <div className="relative group mb-8">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="SUB-SEARCH BY NAME, ADMISSION NO, OR CHEQUE NUMBER..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-xl py-4 pl-12 pr-4 font-bold text-xs uppercase tracking-wider outline-none focus:border-emerald-500/50 transition-all ${isDarkMode ? "bg-[#131619] border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
                    />
                </div>

                {/* Table */}
                <div className={`border rounded-[2rem] overflow-hidden shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200"}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-widest ${isDarkMode ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                                    <th className="p-6">Cheque Info</th>
                                    <th className="p-6">Student Details</th>
                                    <th className="p-6">Bank Name</th>
                                    <th className="p-6">Amount</th>
                                    <th className="p-6">Receiving Date</th>
                                    <th className="p-6">Cheque Date</th>
                                    <th className="p-6">Cheque Deposit Date</th>
                                    <th className="p-6">Cleared/Rejected Date</th>
                                    <th className="p-6">Receipt</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-center">Bill</th>
                                    <th className="p-6">Processed By</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-200"}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="13" className="p-20 text-center">
                                            <div className="animate-spin h-10 w-10 border-t-2 border-emerald-500 rounded-full mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : currentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="13" className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                            No cheques found in records
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((cheque) => (
                                        <tr key={cheque.paymentId} className={`transition-colors group ${isDarkMode ? "hover:bg-emerald-500/[0.02] border-gray-800" : "hover:bg-emerald-500/[0.05] border-gray-200"}`}>
                                            <td className="p-6">
                                                <div className="text-cyan-500 font-black"># {cheque.chequeNumber || "N/A"}</div>
                                                <div className="text-[9px] text-gray-500 font-bold uppercase mt-1">Ref: {cheque.paymentId.slice(-6)}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`font-bold uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>{cheque.studentName}</div>
                                                <div className="text-[10px] text-emerald-500/70 font-bold uppercase">{cheque.admissionNumber}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`font-bold text-xs uppercase ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{cheque.bankName || "N/A"}</div>
                                                {cheque.zone && cheque.zone !== "N/A" && (
                                                    <div className="text-[10px] font-black text-emerald-500 uppercase mt-1">{cheque.zone}</div>
                                                )}
                                                <div className="text-[9px] text-gray-500 uppercase mt-0.5">{cheque.centre}</div>
                                            </td>
                                            <td className={`font-black text-lg p-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}>₹{cheque.amount.toLocaleString()}</td>
                                            <td className={`font-bold text-xs p-6 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                {cheque.receivedDate ? new Date(cheque.receivedDate).toLocaleDateString('en-IN') : "---"}
                                            </td>
                                            <td className={`font-bold text-xs p-6 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "N/A"}
                                            </td>
                                            <td className={`font-bold text-xs p-6 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                {cheque.depositedDate ? new Date(cheque.depositedDate).toLocaleDateString('en-IN') : "---"}
                                            </td>
                                            <td className={`font-bold text-xs p-6 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                <div className="flex items-center gap-2">
                                                    <span>{cheque.clearedOrRejectedDate ? new Date(cheque.clearedOrRejectedDate).toLocaleDateString('en-IN') : "---"}</span>
                                                    {cheque.status === "PAID" && isSuperAdminOrAccounts && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditClearanceDate(cheque)}
                                                            title="Edit Clearance Date"
                                                            className={`p-1.5 rounded-lg border transition-all ${isDarkMode
                                                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white"
                                                                : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
                                                                }`}
                                                        >
                                                            <FaEdit className="text-[11px]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {cheque.receiptFile ? (
                                                    <a
                                                        href={cheque.receiptFile}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500 hover:text-black font-black text-[9px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5"
                                                    >
                                                        <FaRegFileAlt /> View Slip
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Not Deposited</span>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(cheque.status)}
                                                    {(cheque.status === "PAID" || cheque.status === "REJECTED") && isSuperAdminOrAccounts && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditStatus(cheque)}
                                                            title="Edit Cheque Status"
                                                            className={`p-1.5 rounded-lg border transition-all ${isDarkMode
                                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                                                : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white"
                                                                }`}
                                                        >
                                                            <FaEdit className="text-[10px]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                {cheque.status === "PAID" ? (
                                                    <button
                                                        onClick={() => setSelectedBillCheque(cheque)}
                                                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-black font-black text-[9px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-sm"
                                                        title="View / Download Bill"
                                                    >
                                                        <FaFileInvoice /> {cheque.billId || "View Bill"}
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">---</span>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="text-gray-500 font-black text-[10px] uppercase italic">
                                                    {cheque.status === "PAID" ? (cheque.processedBy || "System") : "---"}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                {cheque.status === "PENDING_CLEARANCE" && canManageCheques ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setClearingId(cheque.paymentId);
                                                                setClearDate(new Date().toISOString().split('T')[0]);
                                                                setShowClearModal(true);
                                                            }}
                                                            className="px-4 py-2 bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase rounded-lg hover:bg-emerald-500 hover:text-black transition-all border border-emerald-500/20"
                                                        >
                                                            Clear
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRejectingId(cheque.paymentId);
                                                                setRejectDate(new Date().toISOString().split('T')[0]);
                                                                setShowRejectModal(true);
                                                            }}
                                                            className="px-4 py-2 bg-red-500/10 text-red-500 font-black text-[10px] uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                        >
                                                            Bounce
                                                        </button>
                                                    </div>
                                                ) : cheque.status === "PAID" && isSuperAdminOrAccounts ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenEditStatus(cheque)}
                                                            className={`px-3 py-1.5 border rounded-lg font-black text-[10px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-sm ${isDarkMode
                                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                                                : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white"
                                                                }`}
                                                            title="Change Cheque Status"
                                                        >
                                                            <FaSyncAlt className="text-[10px]" /> Status
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEditClearanceDate(cheque)}
                                                            className={`px-3 py-1.5 border rounded-lg font-black text-[10px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-sm ${isDarkMode
                                                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white"
                                                                : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
                                                                }`}
                                                            title="Edit Clearance Date"
                                                        >
                                                            <FaEdit /> Date
                                                        </button>
                                                    </div>
                                                ) : cheque.status === "REJECTED" && isSuperAdminOrAccounts ? (
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => handleOpenEditStatus(cheque)}
                                                            className={`px-3 py-1.5 border rounded-lg font-black text-[10px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-sm ${isDarkMode
                                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                                                : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-600 hover:text-white"
                                                                }`}
                                                            title="Change Cheque Status"
                                                        >
                                                            <FaSyncAlt className="text-[10px]" /> Change Status
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">---</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination UI */}
                    {!loading && filteredCheques.length > 0 && (
                        <div className={`p-4 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? "border-gray-800 bg-[#131619]" : "border-gray-200 bg-white"}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCheques.length)} of {filteredCheques.length} entries
                                </span>
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Rows per page:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className={`border rounded-lg px-2 py-1 text-[10px] font-bold outline-none focus:border-emerald-500/50 ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-300" : "bg-white border-gray-300 text-gray-755"}`}
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 font-bold text-[10px] uppercase rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Previous
                                </button>
                                <span className="text-gray-400 font-bold text-[10px] uppercase px-2">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1.5 font-bold text-[10px] uppercase rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Next
                                </button>
                                <form onSubmit={handleJumpToPage} className="flex items-center gap-2 ml-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        placeholder="PAGE"
                                        className={`w-16 border rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-emerald-500/50 text-center uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-300" : "bg-white border-gray-300 text-gray-700"}`}
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] uppercase rounded-lg hover:bg-emerald-500 hover:text-black transition-all"
                                    >
                                        Go
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`border w-full max-w-md rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                            <div className={`p-8 border-b flex items-center gap-4 bg-gradient-to-r from-red-500/10 to-transparent ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xl">
                                    <FaExclamationTriangle />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black italic uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>Bounce Cheque</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Provide a reason for rejection</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Rejected Date</label>
                                    <input
                                        type="date"
                                        value={rejectDate}
                                        onChange={(e) => setRejectDate(e.target.value)}
                                        className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-red-500/50 transition-all uppercase mb-4 ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-805"}`}
                                    />
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Reason</label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="e.g. Insufficient Funds, Signature Mismatch..."
                                        className={`w-full border rounded-xl p-4 font-bold text-xs uppercase tracking-widest outline-none focus:border-red-500/50 transition-all min-h-[120px] resize-none ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-805"}`}
                                    />
                                </div>
                            </div>
                            <div className={`p-8 border-t flex gap-4 ${isDarkMode ? "border-gray-800 bg-black/40" : "border-gray-200 bg-gray-50"}`}>
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectReason("");
                                    }}
                                    className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectCheque}
                                    className="flex-1 py-3 bg-red-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Confirm Bounce
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clear Modal */}
                {showClearModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`border w-full max-w-md rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                            <div className={`p-8 border-b flex items-center gap-4 bg-gradient-to-r from-emerald-500/10 to-transparent ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xl">
                                    <FaCheckCircle />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black italic uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>Clear Cheque</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Confirm clearing details</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cleared Date</label>
                                    <input
                                        type="date"
                                        value={clearDate}
                                        onChange={(e) => setClearDate(e.target.value)}
                                        className={`w-full border rounded-xl py-2.5 px-4 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-805"}`}
                                    />
                                </div>
                            </div>
                            <div className={`p-8 border-t flex gap-4 ${isDarkMode ? "border-gray-800 bg-black/40" : "border-gray-200 bg-gray-50"}`}>
                                <button
                                    onClick={() => {
                                        setShowClearModal(false);
                                        setClearDate(new Date().toISOString().split('T')[0]);
                                    }}
                                    className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearCheque}
                                    className="flex-1 py-3 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Confirm Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Clearance Date Modal */}
                {showEditClearanceDateModal && editingCheque && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`border w-full max-w-md rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                            <div className={`p-8 border-b flex items-center gap-4 bg-gradient-to-r from-blue-500/10 to-transparent ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-xl">
                                    <FaCalendarAlt />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black italic uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>Edit Clearance Date</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Update Cheque #{editingCheque.chequeNumber || "N/A"}</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-4">
                                <div className={`p-4 rounded-xl border text-xs ${isDarkMode ? "bg-black/30 border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Student:</span>
                                        <span className="font-black uppercase">{editingCheque.studentName} ({editingCheque.admissionNumber})</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Bank & Centre:</span>
                                        <span className="font-bold uppercase">{editingCheque.bankName || "N/A"} - {editingCheque.centre}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Amount:</span>
                                        <span className="font-black text-emerald-500">₹{editingCheque.amount?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                                        New Clearance Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={editClearDate}
                                        onChange={(e) => setEditClearDate(e.target.value)}
                                        className={`w-full border rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:border-blue-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                    />
                                </div>
                            </div>
                            <div className={`p-8 border-t flex gap-4 ${isDarkMode ? "border-gray-800 bg-black/40" : "border-gray-200 bg-gray-50"}`}>
                                <button
                                    onClick={() => {
                                        setShowEditClearanceDateModal(false);
                                        setEditingCheque(null);
                                        setEditClearDate("");
                                    }}
                                    disabled={isUpdatingClearanceDate}
                                    className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateClearanceDate}
                                    disabled={isUpdatingClearanceDate}
                                    className="flex-1 py-3 bg-blue-500 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUpdatingClearanceDate ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        "Update Date"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Cheque Status Modal */}
                {showEditStatusModal && statusEditingCheque && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className={`border w-full max-w-lg rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                            <div className={`p-8 border-b flex items-center gap-4 bg-gradient-to-r from-purple-500/10 to-transparent ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 text-xl">
                                    <FaSyncAlt />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black italic uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>Edit Cheque Status</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Update status for Cheque #{statusEditingCheque.chequeNumber || "N/A"}</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
                                {/* Cheque Summary */}
                                <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${isDarkMode ? "bg-black/30 border-gray-800 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Student:</span>
                                        <span className="font-black uppercase">{statusEditingCheque.studentName} ({statusEditingCheque.admissionNumber || statusEditingCheque.admissionNo})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Bank & Centre:</span>
                                        <span className="font-bold uppercase">{statusEditingCheque.bankName || "N/A"} - {statusEditingCheque.centre}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Amount:</span>
                                        <span className="font-black text-emerald-500 text-sm">₹{statusEditingCheque.amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-700/30">
                                        <span className="text-gray-500 font-bold uppercase text-[10px]">Current Status:</span>
                                        {getStatusBadge(statusEditingCheque.status)}
                                    </div>
                                </div>

                                {/* Target Status Selection */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                                        Select New Status <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setTargetStatus("PAID")}
                                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${targetStatus === "PAID"
                                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black shadow-lg shadow-emerald-500/10"
                                                : isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                                                }`}
                                        >
                                            <FaCheckCircle className="text-base" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Cleared</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTargetStatus("REJECTED")}
                                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${targetStatus === "REJECTED"
                                                ? "bg-red-500/20 border-red-500 text-red-400 font-black shadow-lg shadow-red-500/10"
                                                : isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                                                }`}
                                        >
                                            <FaExclamationTriangle className="text-base" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Rejected</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTargetStatus("PENDING_CLEARANCE")}
                                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${targetStatus === "PENDING_CLEARANCE"
                                                ? "bg-amber-500/20 border-amber-500 text-amber-400 font-black shadow-lg shadow-amber-500/10"
                                                : isDarkMode ? "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                                                }`}
                                        >
                                            <FaClock className="text-base" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Pending</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Conditional Fields based on target status */}
                                {targetStatus === "PAID" && (
                                    <div className="space-y-3 pt-2">
                                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">
                                            Cleared Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={statusClearedDate}
                                            onChange={(e) => setStatusClearedDate(e.target.value)}
                                            className={`w-full border rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:border-emerald-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                        />
                                        <p className="text-[9px] text-gray-500 uppercase italic">Cheque will be marked Cleared/Paid and financial balance adjusted.</p>
                                    </div>
                                )}

                                {targetStatus === "REJECTED" && (
                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">
                                                Rejection Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={statusRejectDate}
                                                onChange={(e) => setStatusRejectDate(e.target.value)}
                                                className={`w-full border rounded-xl py-2.5 px-4 font-bold text-xs outline-none focus:border-red-500/50 transition-all uppercase ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200 [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 block">
                                                Reason for Rejection / Bounce
                                            </label>
                                            <textarea
                                                value={statusRejectReason}
                                                onChange={(e) => setStatusRejectReason(e.target.value)}
                                                placeholder="e.g. Insufficient Funds, Signature Mismatch, Customer stopped payment..."
                                                className={`w-full border rounded-xl p-3 font-bold text-xs uppercase tracking-wider outline-none focus:border-red-500/50 transition-all min-h-[80px] resize-none ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {targetStatus === "PENDING_CLEARANCE" && (
                                    <div className={`p-4 rounded-xl border text-xs text-amber-500/90 font-bold uppercase leading-relaxed ${isDarkMode ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                                        ℹ Note: Reverting this cheque to "Pending Clearance" will reset clearance/rejection records and place it back into the pending processing queue.
                                    </div>
                                )}
                            </div>

                            <div className={`p-8 border-t flex gap-4 ${isDarkMode ? "border-gray-800 bg-black/40" : "border-gray-200 bg-gray-50"}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditStatusModal(false);
                                        setStatusEditingCheque(null);
                                    }}
                                    disabled={isUpdatingStatus}
                                    className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdateStatus}
                                    disabled={isUpdatingStatus}
                                    className="flex-1 py-3 bg-purple-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUpdatingStatus ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        "Update Status"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Generator Modal */}
                {selectedBillCheque && (
                    <BillGenerator
                        admission={{ _id: selectedBillCheque.admissionId }}
                        installment={{
                            _id: selectedBillCheque.paymentId,
                            paymentId: selectedBillCheque.paymentId,
                            installmentNumber: selectedBillCheque.installmentNumber,
                            billingMonth: selectedBillCheque.billingMonth,
                            billId: selectedBillCheque.billId,
                            status: "PAID",
                            isReceivingSlip: false
                        }}
                        isReceivingSlip={false}
                        onClose={() => setSelectedBillCheque(null)}
                    />
                )}

                {/* Card Drilldown Modal */}
                {cardModalType && (() => {
                    const modalData = getModalData();
                    const totalPages = Math.ceil(modalData.filteredItems.length / modalItemsPerPage) || 1;
                    const startIndex = (modalCurrentPage - 1) * modalItemsPerPage;
                    const paginatedItems = modalData.filteredItems.slice(startIndex, startIndex + modalItemsPerPage);

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md">
                            <div className={`border w-full max-w-7xl max-h-[92vh] rounded-[2rem] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? "bg-[#131619] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                                }`}>
                                {/* Modal Header */}
                                <div className={`p-6 md:p-8 border-b flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent ${isDarkMode ? "border-gray-800" : "border-gray-200"
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center text-xl shadow-inner">
                                            {modalData.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h2 className={`text-2xl font-black italic uppercase tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                    {modalData.title}
                                                </h2>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${modalData.badgeColor}`}>
                                                    {modalData.filteredItems.length} Records
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                {modalData.description} • Total: <span className="text-emerald-400 font-black">₹{modalData.totalModalAmount.toLocaleString('en-IN')}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCardModalType(null)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors border ${isDarkMode ? "bg-gray-900 hover:bg-gray-800 border-gray-800" : "bg-gray-100 hover:bg-gray-200 border-gray-300"
                                            }`}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                {/* Toolbar with Zone Filter, Centre Filter, Search, and Export */}
                                <div className={`p-4 md:px-8 border-b flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 ${isDarkMode ? "border-gray-800 bg-black/20" : "border-gray-200 bg-gray-50"
                                    }`}>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                                        {/* Zone Filter in Modal */}
                                        <div className="min-w-[180px] sm:max-w-[220px]">
                                            <Select
                                                isMulti
                                                options={zoneOptions}
                                                value={modalZoneFilter.map(z => ({ value: z, label: z }))}
                                                onChange={(selected) => {
                                                    setModalZoneFilter(selected ? selected.map(s => s.value) : []);
                                                    setModalCurrentPage(1);
                                                }}
                                                styles={customSelectStyles}
                                                placeholder="ALL ZONES"
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>

                                        {/* Centre Filter in Modal */}
                                        <div className="min-w-[180px] sm:max-w-[220px]">
                                            <Select
                                                isMulti
                                                options={modalAvailableCentres.map(c => ({ value: c, label: c }))}
                                                value={modalCentreFilter.map(c => ({ value: c, label: c }))}
                                                onChange={(selected) => {
                                                    setModalCentreFilter(selected ? selected.map(s => s.value) : []);
                                                    setModalCurrentPage(1);
                                                }}
                                                styles={customSelectStyles}
                                                placeholder="ALL CENTRES"
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>

                                        {/* Search Input in Modal */}
                                        <div className="relative flex-1 min-w-[200px]">
                                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                            <input
                                                type="text"
                                                placeholder="SEARCH WITHIN DETAILS..."
                                                value={modalSearchTerm}
                                                onChange={(e) => {
                                                    setModalSearchTerm(e.target.value);
                                                    setModalCurrentPage(1);
                                                }}
                                                className={`w-full pl-10 pr-4 py-2.5 text-xs font-bold uppercase rounded-xl border outline-none focus:border-emerald-500/50 transition-all ${isDarkMode ? "bg-black/40 border-gray-800 text-gray-200" : "bg-white border-gray-300 text-gray-800"
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 justify-end">
                                        {(modalZoneFilter.length > 0 || modalCentreFilter.length > 0) && (
                                            <button
                                                onClick={() => {
                                                    setModalZoneFilter([]);
                                                    setModalCentreFilter([]);
                                                    setModalCurrentPage(1);
                                                }}
                                                className="text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 px-2 py-1"
                                            >
                                                Reset Filters
                                            </button>
                                        )}
                                        <button
                                            onClick={exportModalToExcel}
                                            className="px-4 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black uppercase text-xs tracking-wider rounded-xl hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            <FaDownload size={11} /> Export
                                        </button>
                                    </div>
                                </div>

                                {/* Table Content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                                    <div className={`border rounded-2xl overflow-x-auto custom-scrollbar ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                                        <table className="w-full text-left border-collapse min-w-[1100px]">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-widest ${isDarkMode ? "bg-gray-900/60 border-gray-800" : "bg-gray-50 border-gray-200"
                                                    }`}>
                                                    <th className="p-4 whitespace-nowrap min-w-[120px]">Cheque Info</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[160px]">Student Details</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[160px]">Zone, Centre & Course</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[140px]">Bank Name</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[100px]">Amount</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[120px]">Receiving Date</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[110px]">Cheque Date</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[120px]">Status</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[160px] text-left">Deposit Status</th>
                                                    <th className="p-4 whitespace-nowrap min-w-[150px] text-left">Cleared / Action Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y text-xs ${isDarkMode ? "divide-gray-800" : "divide-gray-200"}`}>
                                                {paginatedItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="10" className="p-12 text-center text-gray-500 font-bold uppercase tracking-wider text-xs">
                                                            No matching cheque records found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedItems.map((cheque) => (
                                                        <tr key={cheque.paymentId} className={`transition-colors ${isDarkMode ? "hover:bg-emerald-500/[0.02]" : "hover:bg-emerald-500/[0.04]"
                                                            }`}>
                                                            <td className="p-4 whitespace-nowrap">
                                                                <div className="text-cyan-500 font-black"># {cheque.chequeNumber || "N/A"}</div>
                                                                <div className="text-[9px] text-gray-500 font-bold uppercase">Ref: {cheque.paymentId ? String(cheque.paymentId).slice(-6) : "—"}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className={`font-bold uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>{cheque.studentName || "—"}</div>
                                                                <div className="text-[10px] text-emerald-500/70 font-bold uppercase">{cheque.admissionNumber || "—"}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                {cheque.zone && cheque.zone !== "N/A" && (
                                                                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">{cheque.zone}</div>
                                                                )}
                                                                <div className="font-bold text-gray-300 uppercase text-[11px] mt-0.5">{cheque.centre || "—"}</div>
                                                                <div className="text-[10px] text-gray-500 uppercase">{cheque.courseName || "—"}</div>
                                                            </td>
                                                            <td className="p-4 font-bold uppercase text-gray-400">
                                                                {cheque.bankName || "—"}
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap">
                                                                <span className="font-black text-emerald-400 text-sm">
                                                                    ₹{Number(cheque.amount || 0).toLocaleString('en-IN')}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-400 whitespace-nowrap">
                                                                {cheque.receivedDate ? new Date(cheque.receivedDate).toLocaleDateString('en-IN') : "—"}
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-400 whitespace-nowrap">
                                                                {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "—"}
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap">
                                                                {getStatusBadge(cheque.status)}
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap min-w-[160px] align-middle">
                                                                {cheque.isDeposited ? (
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                                                            <FaCheckCircle size={10} /> Deposited
                                                                        </span>
                                                                        {cheque.depositedDate && (
                                                                            <span className="text-[9px] text-gray-500 font-bold tracking-tight pl-1">
                                                                                {new Date(cheque.depositedDate).toLocaleDateString('en-IN')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border text-rose-400 bg-rose-500/10 border-rose-500/20 inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                                                        <FaClock size={10} /> Not Deposited
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-400 whitespace-nowrap min-w-[150px] align-middle">
                                                                {cheque.clearedOrRejectedDate ? new Date(cheque.clearedOrRejectedDate).toLocaleDateString('en-IN') : "—"}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Modal Footer with Pagination */}
                                <div className={`p-4 md:px-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? "border-gray-800 bg-black/40" : "border-gray-200 bg-gray-50"
                                    }`}>
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Showing {modalData.filteredItems.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + modalItemsPerPage, modalData.filteredItems.length)} of {modalData.filteredItems.length}
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setModalCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={modalCurrentPage === 1}
                                                className={`px-3 py-1.5 font-bold text-[10px] uppercase rounded-lg disabled:opacity-40 transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                    }`}
                                            >
                                                Prev
                                            </button>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase px-2">
                                                Page {modalCurrentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setModalCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={modalCurrentPage === totalPages}
                                                className={`px-3 py-1.5 font-bold text-[10px] uppercase rounded-lg disabled:opacity-40 transition-all ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                    }`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </Layout>
    );
};

export default ChequeManagement;
