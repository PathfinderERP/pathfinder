import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { 
    FaSearch, FaFilter, FaSync, FaUserGraduate, 
    FaBoxOpen, FaClipboardList, FaCheckCircle, 
    FaUser, FaPhoneAlt, FaBuilding, FaBook, FaShoppingBag, FaTshirt, FaPenNib,
    FaArrowLeft, FaUsers, FaCheckSquare, FaSquare, FaPlus, FaIdCard, FaCalculator,
    FaBoxes, FaCheck, FaTimes, FaMapMarkerAlt, FaChartPie, FaLayerGroup, FaTags,
    FaGraduationCap, FaNetworkWired, FaUniversity, FaCalendarAlt
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MultiSelectFilter from '../../components/common/MultiSelectFilter';
import Pagination from '../../components/common/Pagination';
import { TableRowSkeleton } from '../../components/common/Skeleton';

const StorePage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const apiUrl = import.meta.env.VITE_API_URL;

    // Overview data states
    const [centreWiseSummary, setCentreWiseSummary] = useState([]);
    const [masterSessions, setMasterSessions] = useState([]);
    const [masterClasses, setMasterClasses] = useState([]);
    const [masterDepartments, setMasterDepartments] = useState([]);
    const [masterBoards, setMasterBoards] = useState([]);
    const [globalStats, setGlobalStats] = useState({
        totalActiveCentres: 0,
        totalActiveStudents: 0,
        totalAllottedStudents: 0,
        totalPendingStudents: 0,
        totalItemsDispatched: 0
    });
    const [loading, setLoading] = useState(true);

    // Active View state: 'centres' (centre-wise list) or 'centre_detail' (students inside selected centre)
    const [viewMode, setViewMode] = useState('centres');
    const [selectedCentre, setSelectedCentre] = useState(null); // When drilling down into a centre
    const [currentCentreStudents, setCurrentCentreStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [centreStudentsCache, setCentreStudentsCache] = useState({});

    // Filter & Search states (Centre level)
    const [centreSearchQuery, setCentreSearchQuery] = useState("");

    // Filter & Search states (Student level inside centre)
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [filterSession, setFilterSession] = useState([]);
    const [filterClass, setFilterClass] = useState([]);
    const [filterDepartment, setFilterDepartment] = useState([]);
    const [filterBoard, setFilterBoard] = useState([]);
    const [filterAllocationStatus, setFilterAllocationStatus] = useState([]);

    // Multi-select students inside drilled-down centre
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    // Pagination for students list
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Allocation Modal State
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    // Modal Target Type: 'centre_all' | 'centre_not_allotted' | 'selected_students' | 'single_student'
    const [allocationTargetType, setAllocationTargetType] = useState('centre_all');
    const [modalTargetCentre, setModalTargetCentre] = useState(null);
    const [modalSingleStudent, setModalSingleStudent] = useState(null);
    const [modalSelectedStudentsList, setModalSelectedStudentsList] = useState([]);

    const [allocationData, setAllocationData] = useState({
        items: [],
        quantities: {} // { itemName: quantityPerStudent }
    });
    const [customItemInput, setCustomItemInput] = useState("");
    const [customItemsList, setCustomItemsList] = useState([]);
    const [submittingAllocation, setSubmittingAllocation] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Blazing-fast initial overview load using the dedicated aggregation endpoint
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const res = await fetch(`${apiUrl}/inventory/allocation/overview`, { headers });
            if (!res.ok) {
                throw new Error("Failed to fetch store overview");
            }

            const data = await res.json();
            setCentreWiseSummary(data.centreWiseSummary || []);
            setMasterSessions(data.masterSessions || []);
            setMasterClasses(data.masterClasses || []);
            setMasterDepartments(data.masterDepartments || []);
            setMasterBoards(data.masterBoards || []);
            if (data.globalStats) {
                setGlobalStats(data.globalStats);
            }
        } catch (error) {
            console.error("Error fetching store overview:", error);
            toast.error("Failed to load store inventory overview");
        } finally {
            setLoading(false);
        }
    };

    // Fast fetch for active students belonging to a single centre
    const fetchCentreStudents = async (centreName, forceRefresh = false) => {
        if (!centreName) return [];
        const cacheKey = centreName.trim().toLowerCase();

        if (!forceRefresh && centreStudentsCache[cacheKey]) {
            setCurrentCentreStudents(centreStudentsCache[cacheKey]);
            return centreStudentsCache[cacheKey];
        }

        try {
            setLoadingStudents(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const res = await fetch(`${apiUrl}/inventory/allocation/centre-students?centre=${encodeURIComponent(centreName.trim())}`, { headers });
            if (!res.ok) {
                throw new Error("Failed to fetch centre students");
            }

            const studentsData = await res.json();
            setCentreStudentsCache(prev => ({ ...prev, [cacheKey]: studentsData }));
            setCurrentCentreStudents(studentsData);
            return studentsData;
        } catch (error) {
            console.error("Error fetching centre students:", error);
            toast.error(`Failed to load students for ${centreName}`);
            setCurrentCentreStudents([]);
            return [];
        } finally {
            setLoadingStudents(false);
        }
    };

    // Filtered Centres for Centre View
    const filteredCentres = useMemo(() => {
        if (!centreSearchQuery.trim()) return centreWiseSummary;
        const q = centreSearchQuery.toLowerCase().trim();
        return centreWiseSummary.filter(c => 
            (c.centreName || "").toLowerCase().includes(q) ||
            (c.centreCode || "").toLowerCase().includes(q) ||
            (c.location || "").toLowerCase().includes(q)
        );
    }, [centreWiseSummary, centreSearchQuery]);

    // Available dynamic filter options
    const availableSessionOptions = useMemo(() => {
        return masterSessions.map(s => ({ value: s, label: s }));
    }, [masterSessions]);

    const availableClassOptions = useMemo(() => {
        const set = new Set(masterClasses);
        currentCentreStudents.forEach(item => {
            if (item.resolvedClass && item.resolvedClass !== "N/A") set.add(item.resolvedClass);
        });
        return Array.from(set).filter(Boolean).map(cls => ({ value: cls, label: `Class ${cls}`.replace('Class Class', 'Class') }));
    }, [masterClasses, currentCentreStudents]);

    const availableDepartmentOptions = useMemo(() => {
        const set = new Set(masterDepartments);
        currentCentreStudents.forEach(item => {
            if (item.resolvedDepartment && item.resolvedDepartment !== "N/A") set.add(item.resolvedDepartment);
        });
        return Array.from(set).filter(Boolean).map(dept => ({ value: dept, label: dept.toUpperCase() }));
    }, [masterDepartments, currentCentreStudents]);

    const availableBoardOptions = useMemo(() => {
        const set = new Set(masterBoards);
        currentCentreStudents.forEach(item => {
            if (item.resolvedBoard && item.resolvedBoard !== "N/A") set.add(item.resolvedBoard);
        });
        return Array.from(set).filter(Boolean).map(b => ({ value: b, label: b.toUpperCase() }));
    }, [masterBoards, currentCentreStudents]);

    // Filtered students for drilled-down Centre View
    const filteredStudents = useMemo(() => {
        let list = currentCentreStudents;

        if (studentSearchQuery.trim()) {
            const query = studentSearchQuery.toLowerCase().trim();
            list = list.filter(item => {
                const s = item.student?.studentsDetails?.[0] || {};
                return (s.studentName || "").toLowerCase().includes(query) ||
                       (s.mobileNum || "").includes(query) ||
                       (s.whatsappNumber || "").includes(query) ||
                       (item.latestAdmission?.admissionNumber || "").toLowerCase().includes(query);
            });
        }

        if (filterSession.length > 0) {
            list = list.filter(item => {
                const studentSession = item.resolvedSession || "N/A";
                return filterSession.includes(studentSession);
            });
        }

        if (filterClass.length > 0) {
            list = list.filter(item => {
                const studentClass = item.resolvedClass || "N/A";
                return filterClass.includes(studentClass);
            });
        }

        if (filterDepartment.length > 0) {
            list = list.filter(item => {
                const studentDept = item.resolvedDepartment || "N/A";
                return filterDepartment.includes(studentDept);
            });
        }

        if (filterBoard.length > 0) {
            list = list.filter(item => {
                const studentBoard = item.resolvedBoard || "N/A";
                return filterBoard.includes(studentBoard);
            });
        }

        if (filterAllocationStatus.length > 0) {
            list = list.filter(item => {
                const hasAllocations = (item.student?.allocatedItems?.length || 0) > 0;
                if (filterAllocationStatus.includes('allotted') && hasAllocations) return true;
                if (filterAllocationStatus.includes('not_allotted') && !hasAllocations) return true;
                return false;
            });
        }

        return list;
    }, [currentCentreStudents, studentSearchQuery, filterSession, filterClass, filterDepartment, filterBoard, filterAllocationStatus]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [studentSearchQuery, filterSession, filterClass, filterDepartment, filterBoard, filterAllocationStatus]);

    // Clear selection when changing centre
    useEffect(() => {
        setSelectedStudentIds([]);
    }, [selectedCentre]);

    // Drill down to a centre
    const handleSelectCentre = (centreSummaryItem) => {
        setSelectedCentre(centreSummaryItem);
        setViewMode('centre_detail');
        setStudentSearchQuery("");
        setFilterSession([]);
        setFilterClass([]);
        setFilterDepartment([]);
        setFilterBoard([]);
        setFilterAllocationStatus([]);
        setSelectedStudentIds([]);
        fetchCentreStudents(centreSummaryItem.centreName);
    };

    // Return back to centre list
    const handleBackToCentres = () => {
        setViewMode('centres');
        setSelectedCentre(null);
        setSelectedStudentIds([]);
    };

    // Multi-select handlers
    const handleSelectAllStudents = (e) => {
        if (e.target.checked) {
            const allIds = filteredStudents.map(item => item.student._id.toString());
            setSelectedStudentIds(allIds);
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleToggleStudentSelection = (studentId) => {
        setSelectedStudentIds(prev => 
            prev.includes(studentId) 
                ? prev.filter(id => id !== studentId) 
                : [...prev, studentId]
        );
    };

    // Item Catalog
    const standardItems = [
        { id: 'academic_books', name: 'Academic Books', icon: <FaBook className="text-blue-500" /> },
        { id: 'dress', name: 'Dress / Uniform', icon: <FaTshirt className="text-pink-500" /> },
        { id: 'pens', name: 'Pens & Stationery', icon: <FaPenNib className="text-purple-500" /> },
        { id: 'bags', name: 'Bags', icon: <FaShoppingBag className="text-orange-500" /> },
        { id: 'id_card', name: 'ID Card', icon: <FaIdCard className="text-teal-500" /> },
    ];

    const availableItems = useMemo(() => {
        const customMapped = customItemsList.map(c => ({
            id: c.toLowerCase().replace(/\s+/g, '_'),
            name: c,
            icon: <FaBoxOpen className="text-cyan-500" />
        }));
        return [...standardItems, ...customMapped];
    }, [customItemsList]);

    // Trigger Modals
    const handleOpenCentreAllocationModal = (centreSummaryItem) => {
        setModalTargetCentre(centreSummaryItem);
        setModalSingleStudent(null);
        setModalSelectedStudentsList([]);
        setAllocationTargetType('centre_all');
        setAllocationData({ items: ['Academic Books'], quantities: { 'Academic Books': 1 } });
        setIsAllocationModalOpen(true);
    };

    const handleOpenSelectedStudentsAllocationModal = () => {
        if (selectedStudentIds.length === 0) {
            toast.warning("Please select at least one student to allocate");
            return;
        }
        const selectedList = currentCentreStudents.filter(item => 
            selectedStudentIds.includes(item.student._id.toString())
        );
        setModalTargetCentre(selectedCentre);
        setModalSingleStudent(null);
        setModalSelectedStudentsList(selectedList);
        setAllocationTargetType('selected_students');
        setAllocationData({ items: ['Academic Books'], quantities: { 'Academic Books': 1 } });
        setIsAllocationModalOpen(true);
    };

    const handleOpenSingleStudentAllocationModal = (studentItem) => {
        setModalSingleStudent(studentItem);
        setModalTargetCentre(selectedCentre);
        setModalSelectedStudentsList([]);
        setAllocationTargetType('single_student');
        setAllocationData({ items: [], quantities: {} });
        setIsAllocationModalOpen(true);
    };

    // Item selection inside modal
    const toggleModalItem = (itemName) => {
        setAllocationData(prev => {
            const exists = prev.items.includes(itemName);
            if (exists) {
                const newItems = prev.items.filter(i => i !== itemName);
                const newQuantities = { ...prev.quantities };
                delete newQuantities[itemName];
                return { ...prev, items: newItems, quantities: newQuantities };
            } else {
                return { 
                    ...prev, 
                    items: [...prev.items, itemName],
                    quantities: { ...prev.quantities, [itemName]: 1 }
                };
            }
        });
    };

    const updateModalItemQuantity = (itemName, delta) => {
        setAllocationData(prev => {
            const currentQty = prev.quantities[itemName] || 1;
            const newQty = Math.max(1, currentQty + delta);
            return {
                ...prev,
                quantities: { ...prev.quantities, [itemName]: newQty }
            };
        });
    };

    const handleAddCustomItem = () => {
        if (!customItemInput.trim()) return;
        const formatted = customItemInput.trim();
        if (!customItemsList.includes(formatted) && !standardItems.some(s => s.name.toLowerCase() === formatted.toLowerCase())) {
            setCustomItemsList(prev => [...prev, formatted]);
            toggleModalItem(formatted);
            setCustomItemInput("");
        } else {
            toast.info("Item already in catalog");
        }
    };

    // Calculate dynamic target students count for total allotment
    const targetStudentsCount = useMemo(() => {
        if (allocationTargetType === 'single_student') return 1;
        if (allocationTargetType === 'selected_students') return modalSelectedStudentsList.length;
        if (!modalTargetCentre) return 0;

        if (allocationTargetType === 'centre_all') {
            return modalTargetCentre.activeStudentsCount || 0;
        } else if (allocationTargetType === 'centre_not_allotted') {
            return modalTargetCentre.notAllottedCount || 0;
        }
        return 0;
    }, [allocationTargetType, modalTargetCentre, modalSelectedStudentsList]);

    // Submit Allocation
    const handleAllocationSubmit = async () => {
        if (allocationData.items.length === 0) {
            toast.warning("Please select at least one item to allocate");
            return;
        }

        if (targetStudentsCount === 0) {
            toast.warning("No active students selected for allocation");
            return;
        }

        try {
            setSubmittingAllocation(true);
            const token = localStorage.getItem("token");
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const preparedItems = allocationData.items.map(name => ({
                itemName: name,
                quantity: allocationData.quantities[name] || 1
            }));

            if (allocationTargetType === 'single_student') {
                // Single student API call
                const payload = {
                    studentId: modalSingleStudent.student._id,
                    admissionId: modalSingleStudent.latestAdmission?._id,
                    items: preparedItems
                };

                const res = await fetch(`${apiUrl}/inventory/allocation`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok) {
                    toast.success(`Successfully allocated items to ${modalSingleStudent.student.studentsDetails?.[0]?.studentName}`);
                    setIsAllocationModalOpen(false);
                    fetchInitialData();
                    if (selectedCentre) {
                        fetchCentreStudents(selectedCentre.centreName, true);
                    }
                } else {
                    toast.error(data.message || "Failed to save allocation");
                }
            } else {
                // Bulk Allocation
                let payload = { items: preparedItems };

                if (allocationTargetType === 'selected_students') {
                    payload.students = modalSelectedStudentsList.map(s => ({
                        studentId: s.student._id,
                        admissionId: s.latestAdmission?._id
                    }));
                } else if (allocationTargetType === 'centre_all' || allocationTargetType === 'centre_not_allotted') {
                    payload.centreName = modalTargetCentre?.centreName;
                    payload.scope = allocationTargetType;
                }

                const res = await fetch(`${apiUrl}/inventory/allocation/bulk`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok) {
                    toast.success(`Total Allotment complete! Distributed items across ${data.count || targetStudentsCount} active students.`);
                    setIsAllocationModalOpen(false);
                    setSelectedStudentIds([]);
                    // Clear cache for updated centre and reload
                    if (modalTargetCentre?.centreName) {
                        const cKey = modalTargetCentre.centreName.trim().toLowerCase();
                        setCentreStudentsCache(prev => {
                            const updated = { ...prev };
                            delete updated[cKey];
                            return updated;
                        });
                    }
                    fetchInitialData();
                    if (selectedCentre) {
                        fetchCentreStudents(selectedCentre.centreName, true);
                    }
                } else {
                    toast.error(data.message || "Failed to perform bulk allocation");
                }
            }
        } catch (error) {
            console.error("Allocation Submit Error:", error);
            toast.error("An error occurred while saving the allocation.");
        } finally {
            setSubmittingAllocation(false);
        }
    };

    // Student Pagination slicing
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentStudentsPage = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <Layout activePage="Operations">
            <div className={`p-4 md:p-8 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0b0f14] text-gray-100' : 'bg-[#f8fafc] text-gray-900'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} position="top-right" autoClose={3000} />

                {/* Header & Global Stats */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-cyan-500/20">
                                <FaBoxes className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                                    Store & Inventory Allotment
                                </h1>
                                <p className={`text-xs md:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Active Centre-wise stock management and total student allotment
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        <button 
                            onClick={() => {
                                setCentreStudentsCache({});
                                fetchInitialData();
                                if (selectedCentre) {
                                    fetchCentreStudents(selectedCentre.centreName, true);
                                }
                            }}
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all shadow-sm ${
                                isDarkMode 
                                ? 'bg-[#151b22] hover:bg-[#1f2937] text-cyan-400 border border-gray-800' 
                                : 'bg-white hover:bg-gray-50 text-blue-600 border border-gray-200'
                            }`}
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                            Refresh Data
                        </button>
                    </div>
                </div>

                {/* Global Metrics Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Active Centres */}
                    <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#12171e] border-gray-800/80 shadow-lg shadow-black/20' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Centres</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-cyan-500">{globalStats.totalActiveCentres}</h3>
                            </div>
                            <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl">
                                <FaBuilding className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Eligible operational centres</p>
                    </div>

                    {/* Total Active Students */}
                    <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#12171e] border-gray-800/80 shadow-lg shadow-black/20' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Students</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-blue-500">{globalStats.totalActiveStudents}</h3>
                            </div>
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                                <FaUserGraduate className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Enrolled & currently active</p>
                    </div>

                    {/* Total Allotted Students */}
                    <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#12171e] border-gray-800/80 shadow-lg shadow-black/20' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Allotted vs Pending</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <h3 className="text-2xl md:text-3xl font-black text-green-500">{globalStats.totalAllottedStudents}</h3>
                                    <span className="text-xs font-bold text-gray-400">/ {globalStats.totalPendingStudents} pending</span>
                                </div>
                            </div>
                            <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                                <FaCheckCircle className="text-xl" />
                            </div>
                        </div>
                        <div className="w-full bg-gray-700/20 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${globalStats.totalActiveStudents > 0 ? (globalStats.totalAllottedStudents / globalStats.totalActiveStudents) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Total Items Allotted */}
                    <div className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#12171e] border-gray-800/80 shadow-lg shadow-black/20' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Items Dispatched</span>
                                <h3 className="text-2xl md:text-3xl font-black mt-1 text-purple-500">{globalStats.totalItemsDispatched}</h3>
                            </div>
                            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                                <FaClipboardList className="text-xl" />
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 font-medium">Books, Uniforms, Stationery & Bags</p>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* VIEW 1: ACTIVE CENTRE-WISE LIST (DEFAULT VIEW) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {viewMode === 'centres' && (
                    <div className="space-y-6">
                        {/* Search & Centre Filter Bar */}
                        <div className={`p-4 md:p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 ${
                            isDarkMode ? 'bg-[#12171e] border-gray-800/80' : 'bg-white border-gray-100 shadow-sm'
                        }`}>
                            <div className="relative flex-1 max-w-md">
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input 
                                    type="text"
                                    placeholder="Search active centre by name or code..."
                                    value={centreSearchQuery}
                                    onChange={(e) => setCentreSearchQuery(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${
                                        isDarkMode 
                                        ? 'bg-[#0b0f14] border-gray-700/80 focus:border-cyan-500 text-white' 
                                        : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'
                                    }`}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                                    isDarkMode ? 'bg-gray-800/50 border-gray-700 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                                }`}>
                                    Showing {filteredCentres.length} Active Centres
                                </span>
                            </div>
                        </div>

                        {/* Centres Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`p-6 rounded-2xl border animate-pulse ${isDarkMode ? 'bg-[#12171e] border-gray-800' : 'bg-white border-gray-100'}`}>
                                        <div className="h-6 bg-gray-700/20 rounded-md w-3/4 mb-4" />
                                        <div className="h-4 bg-gray-700/20 rounded-md w-1/2 mb-6" />
                                        <div className="h-12 bg-gray-700/10 rounded-xl mb-4" />
                                        <div className="h-10 bg-gray-700/20 rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredCentres.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCentres.map((centreItem, idx) => {
                                    const percentAllotted = centreItem.activeStudentsCount > 0 
                                        ? Math.round((centreItem.allottedCount / centreItem.activeStudentsCount) * 100)
                                        : 0;

                                    return (
                                        <div 
                                            key={idx}
                                            className={`rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl group ${
                                                isDarkMode 
                                                ? 'bg-[#12171e] border-gray-800 hover:border-cyan-500/40 hover:shadow-cyan-500/5' 
                                                : 'bg-white border-gray-100 hover:border-blue-300 shadow-sm'
                                            }`}
                                        >
                                            {/* Centre Header */}
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm border border-cyan-500/30">
                                                            <FaBuilding />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-extrabold text-base md:text-lg tracking-tight group-hover:text-cyan-400 transition-colors">
                                                                {centreItem.centreName}
                                                            </h3>
                                                            <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                Code: <span className="font-mono text-cyan-500">{centreItem.centreCode}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                                                        isDarkMode 
                                                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                                                        : 'bg-blue-50 text-blue-600 border-blue-200'
                                                    }`}>
                                                        ACTIVE
                                                    </span>
                                                </div>

                                                {centreItem.location && (
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 truncate">
                                                        <FaMapMarkerAlt className="text-gray-500 shrink-0 text-[10px]" />
                                                        <span className="truncate">{centreItem.location}</span>
                                                    </div>
                                                )}

                                                {/* Active Students & Allotment Metrics Card */}
                                                <div className={`p-4 rounded-xl mb-4 border ${isDarkMode ? 'bg-[#0b0f14] border-gray-800/60' : 'bg-gray-50 border-gray-200/60'}`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            Active Students
                                                        </span>
                                                        <span className="text-base font-black text-cyan-500 flex items-center gap-1">
                                                            <FaUsers className="text-xs" />
                                                            {centreItem.activeStudentsCount}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs font-semibold mb-2">
                                                        <span className="text-green-500 flex items-center gap-1">
                                                            <FaCheckCircle className="text-[10px]" /> {centreItem.allottedCount} Allotted
                                                        </span>
                                                        <span className="text-amber-500 flex items-center gap-1">
                                                            <FaBoxOpen className="text-[10px]" /> {centreItem.notAllottedCount} Pending
                                                        </span>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div className="w-full bg-gray-700/20 h-2 rounded-full overflow-hidden">
                                                        <div 
                                                            className="bg-gradient-to-r from-cyan-500 to-green-500 h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${percentAllotted}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1 text-[10px] text-gray-500">
                                                        <span>Allotment Rate</span>
                                                        <span className="font-bold text-cyan-400">{percentAllotted}%</span>
                                                    </div>
                                                </div>

                                                {/* Distributed Items Chips */}
                                                <div className="mb-4">
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        Current Dispatched Units ({centreItem.totalUnitsAllotted})
                                                    </p>
                                                    {centreItem.itemCounts && Object.keys(centreItem.itemCounts).length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {Object.entries(centreItem.itemCounts).slice(0, 4).map(([name, qty], i) => (
                                                                <span 
                                                                    key={i} 
                                                                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                                                                        isDarkMode ? 'bg-gray-800/60 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700 shadow-2xs'
                                                                    }`}
                                                                >
                                                                    {name}: <strong className="text-cyan-500">{qty}</strong>
                                                                </span>
                                                            ))}
                                                            {Object.keys(centreItem.itemCounts).length > 4 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md text-gray-500">
                                                                    +{Object.keys(centreItem.itemCounts).length - 4} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-gray-500 italic">No inventory items alloted yet</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-4 border-t border-gray-800/40 flex flex-col gap-2 mt-2">
                                                {/* Centre Total Allotment Button */}
                                                <button
                                                    onClick={() => handleOpenCentreAllocationModal(centreItem)}
                                                    disabled={centreItem.activeStudentsCount === 0}
                                                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                                                        centreItem.activeStudentsCount === 0 
                                                        ? 'opacity-40 cursor-not-allowed bg-gray-800 text-gray-500' 
                                                        : (isDarkMode 
                                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#0b0f14] shadow-cyan-500/10 active:scale-[0.98]' 
                                                            : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-95 text-white shadow-blue-500/20 active:scale-[0.98]')
                                                    }`}
                                                >
                                                    <FaCalculator />
                                                    Centre Total Allotment ({centreItem.activeStudentsCount})
                                                </button>

                                                {/* View Centre Active Students Button */}
                                                <button
                                                    onClick={() => handleSelectCentre(centreItem)}
                                                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                                                        isDarkMode 
                                                        ? 'bg-[#0b0f14] hover:bg-gray-800/60 border-gray-700/80 text-gray-300' 
                                                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    <FaUsers />
                                                    View Active Students ({centreItem.activeStudentsCount})
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={`p-12 text-center rounded-2xl border ${isDarkMode ? 'bg-[#12171e] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <FaBuilding className="text-4xl text-gray-500 mx-auto mb-3 opacity-50" />
                                <h3 className="text-lg font-bold">No Active Centres Found</h3>
                                <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria or check centre permissions.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* VIEW 2: CENTRE DRILL-DOWN (ACTIVE STUDENTS OF SELECTED CENTRE) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {viewMode === 'centre_detail' && selectedCentre && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Navigation & Header */}
                        <div className={`p-6 rounded-2xl border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${
                            isDarkMode ? 'bg-[#12171e] border-gray-800/80' : 'bg-white border-gray-100 shadow-sm'
                        }`}>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handleBackToCentres}
                                    className={`p-3 rounded-xl border transition-all ${
                                        isDarkMode 
                                        ? 'bg-[#0b0f14] hover:bg-gray-800 border-gray-700 text-cyan-400' 
                                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-blue-600'
                                    }`}
                                    title="Back to all centres"
                                >
                                    <FaArrowLeft />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl md:text-2xl font-black tracking-tight">
                                            {selectedCentre.centreName}
                                        </h2>
                                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            {selectedCentre.centreCode}
                                        </span>
                                    </div>
                                    <p className={`text-xs md:text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Showing <strong className="text-cyan-400">{filteredStudents.length}</strong> active students in this centre
                                    </p>
                                </div>
                            </div>

                            {/* Quick Action for this Centre */}
                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <button
                                    onClick={() => handleOpenCentreAllocationModal(selectedCentre)}
                                    disabled={selectedCentre.activeStudentsCount === 0}
                                    className={`flex-1 lg:flex-none py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                                        isDarkMode 
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#0b0f14]' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    <FaCalculator />
                                    Allot All Centre Students ({selectedCentre.activeStudentsCount})
                                </button>
                            </div>
                        </div>

                        {/* Filters for Students inside Centre: Search, Active Session, Class, Department, Board, Allotment Status */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#12171e] border-gray-800/80' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                                {/* Search Student */}
                                <div className="relative">
                                    <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Search Student
                                    </label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                        <input 
                                            type="text"
                                            placeholder="Name, Phone or ID"
                                            value={studentSearchQuery}
                                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                                            className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                                                isDarkMode 
                                                ? 'bg-[#0b0f14] border-gray-700 focus:border-cyan-500 text-white' 
                                                : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Active Session Filter */}
                                <MultiSelectFilter 
                                    label="Filter by Session"
                                    options={availableSessionOptions}
                                    selectedValues={filterSession}
                                    onChange={setFilterSession}
                                    placeholder="All Active Sessions"
                                />

                                {/* Class Filter */}
                                <MultiSelectFilter 
                                    label="Filter by Class"
                                    options={availableClassOptions}
                                    selectedValues={filterClass}
                                    onChange={setFilterClass}
                                    placeholder="All Classes"
                                />

                                {/* Department Filter */}
                                <MultiSelectFilter 
                                    label="Filter by Department"
                                    options={availableDepartmentOptions}
                                    selectedValues={filterDepartment}
                                    onChange={setFilterDepartment}
                                    placeholder="All Departments"
                                />

                                {/* Board Filter */}
                                <MultiSelectFilter 
                                    label="Filter by Board"
                                    options={availableBoardOptions}
                                    selectedValues={filterBoard}
                                    onChange={setFilterBoard}
                                    placeholder="All Boards"
                                />

                                {/* Status Filter */}
                                <MultiSelectFilter 
                                    label="Allotment Status"
                                    options={[
                                        { value: 'allotted', label: 'ALLOTTED' },
                                        { value: 'not_allotted', label: 'NOT ALLOTTED' }
                                    ]}
                                    selectedValues={filterAllocationStatus}
                                    onChange={setFilterAllocationStatus}
                                    placeholder="All Status"
                                />
                            </div>
                        </div>

                        {/* Batch Selection Banner */}
                        {selectedStudentIds.length > 0 && (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                                        <FaCheckSquare className="text-xl" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm md:text-base">
                                            {selectedStudentIds.length} Active Students Selected
                                        </h4>
                                        <p className="text-cyan-100 text-xs font-medium">
                                            Apply total item allotment to selected students simultaneously
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button 
                                        onClick={() => setSelectedStudentIds([])}
                                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
                                    >
                                        Clear Selection
                                    </button>
                                    <button 
                                        onClick={handleOpenSelectedStudentsAllocationModal}
                                        className="py-2 px-4 rounded-xl bg-white text-blue-900 hover:bg-cyan-50 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                                    >
                                        <FaBoxOpen />
                                        Allocate Selected ({selectedStudentIds.length})
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Students Table */}
                        <div className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'bg-[#12171e] border-gray-800/80' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`border-b text-xs uppercase tracking-wider font-extrabold ${
                                            isDarkMode ? 'bg-[#182029] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                                        }`}>
                                            <th className="p-4 w-12 text-center">
                                                <input 
                                                    type="checkbox"
                                                    checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                                                    onChange={handleSelectAllStudents}
                                                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                                                />
                                            </th>
                                            <th className="p-4">Active Student</th>
                                            <th className="p-4">Session & Class</th>
                                            <th className="p-4">Dept & Board</th>
                                            <th className="p-4">Contact</th>
                                            <th className="p-4">Allocated Items</th>
                                            <th className="p-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/30 text-xs">
                                        {loadingStudents ? (
                                            [...Array(5)].map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                                        ) : currentStudentsPage.length > 0 ? (
                                            currentStudentsPage.map((item, idx) => {
                                                const s = item.student?.studentsDetails?.[0] || {};
                                                const isSelected = selectedStudentIds.includes(item.student._id.toString());
                                                const hasAllocations = (item.student?.allocatedItems?.length || 0) > 0;

                                                return (
                                                    <tr 
                                                        key={idx}
                                                        className={`transition-colors ${
                                                            isSelected 
                                                            ? (isDarkMode ? 'bg-cyan-500/10' : 'bg-blue-50/70') 
                                                            : (isDarkMode ? 'hover:bg-[#182029]/70' : 'hover:bg-gray-50')
                                                        }`}
                                                    >
                                                        {/* Checkbox */}
                                                        <td className="p-4 text-center">
                                                            <input 
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleToggleStudentSelection(item.student._id.toString())}
                                                                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                                                            />
                                                        </td>

                                                        {/* Student Profile */}
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
                                                                    {s.studentName?.charAt(0) || 'S'}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-extrabold text-sm tracking-tight">
                                                                            {s.studentName || 'Unnamed Student'}
                                                                        </span>
                                                                        {hasAllocations ? (
                                                                            <span className="text-[9px] font-extrabold bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20">
                                                                                ALLOTTED
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-extrabold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                                                PENDING
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className={`text-[11px] font-mono mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                        ID: {item.latestAdmission?.admissionNumber || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Session & Class */}
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-400">
                                                                    <FaGraduationCap className="text-cyan-500 text-xs shrink-0" />
                                                                    <span>{item.resolvedClass && item.resolvedClass !== "N/A" ? `Class ${item.resolvedClass}` : 'Class N/A'}</span>
                                                                </div>
                                                                {item.resolvedSession && item.resolvedSession !== "N/A" && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                                                                        <FaCalendarAlt className="text-[9px] text-gray-500" />
                                                                        <span>{item.resolvedSession}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Dept & Board */}
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <FaUniversity className="text-purple-400 text-[10px] shrink-0" />
                                                                    <span className="font-bold text-purple-400">{item.resolvedBoard || 'Board N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                                                    <FaNetworkWired className="text-gray-500 text-[10px] shrink-0" />
                                                                    <span className="truncate max-w-[140px]">{item.resolvedDepartment || 'Dept N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Contact */}
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <FaPhoneAlt className="text-green-500 text-[10px] shrink-0" />
                                                                    <span className="font-mono">{s.mobileNum || 'N/A'}</span>
                                                                </div>
                                                                {s.studentEmail && (
                                                                    <span className="text-[10px] text-gray-500 truncate max-w-[130px]">
                                                                        {s.studentEmail}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Allocated Items Pills */}
                                                        <td className="p-4">
                                                            {hasAllocations ? (
                                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                                    {Object.entries(
                                                                        item.student.allocatedItems.reduce((acc, curr) => {
                                                                            acc[curr.itemName] = (acc[curr.itemName] || 0) + (curr.quantity || 1);
                                                                            return acc;
                                                                        }, {})
                                                                    ).map(([name, qty], i) => (
                                                                        <span 
                                                                            key={i} 
                                                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                                                                isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'
                                                                            }`}
                                                                        >
                                                                            {name} <strong className="text-cyan-500">x{qty}</strong>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] text-gray-500 italic">None</span>
                                                            )}
                                                        </td>

                                                        {/* Single Allocate Button */}
                                                        <td className="p-4 text-center">
                                                            <button 
                                                                onClick={() => handleOpenSingleStudentAllocationModal(item)}
                                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
                                                                    isDarkMode 
                                                                    ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                                                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'
                                                                }`}
                                                            >
                                                                Allocate
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center">
                                                    <FaUsers className="text-4xl text-gray-500 mx-auto mb-2 opacity-40" />
                                                    <p className="text-base font-bold">No Active Students Match Filter</p>
                                                    <p className="text-xs text-gray-500 mt-1">Try resetting search or filter tags</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className="mt-4">
                            <Pagination 
                                currentPage={currentPage}
                                totalItems={filteredStudents.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* INTERACTIVE ALLOCATION MODAL (CENTRE TOTAL & STUDENT MODES) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {isAllocationModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <div className={`w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border ${
                            isDarkMode ? 'bg-[#12171e] border-gray-800' : 'bg-white border-gray-200'
                        }`}>
                            {/* Modal Header */}
                            <div className="p-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white relative">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md text-xl">
                                        <FaCalculator />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">
                                            {allocationTargetType === 'single_student' 
                                                ? 'Individual Item Allotment'
                                                : `Centre Total Allotment: ${modalTargetCentre?.centreName || 'Selected Students'}`
                                            }
                                        </h3>
                                        <p className="text-cyan-100 text-xs font-medium mt-0.5">
                                            {allocationTargetType === 'single_student'
                                                ? `Student: ${modalSingleStudent?.student?.studentsDetails?.[0]?.studentName}`
                                                : `Targeting Active Centre Students`
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsAllocationModalOpen(false)}
                                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-all"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
                                {/* Scope Selector (if Centre Level) */}
                                {allocationTargetType !== 'single_student' && allocationTargetType !== 'selected_students' && (
                                    <div>
                                        <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Select Target Scope
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setAllocationTargetType('centre_all')}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    allocationTargetType === 'centre_all'
                                                    ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-blue-50 border-blue-500 text-blue-700')
                                                    : (isDarkMode ? 'bg-gray-800/40 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600')
                                                }`}
                                            >
                                                <div className="font-extrabold text-xs">All Active Students</div>
                                                <div className="text-[11px] font-bold opacity-80 mt-0.5">
                                                    {modalTargetCentre?.activeStudentsCount || 0} Students
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setAllocationTargetType('centre_not_allotted')}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    allocationTargetType === 'centre_not_allotted'
                                                    ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-blue-50 border-blue-500 text-blue-700')
                                                    : (isDarkMode ? 'bg-gray-800/40 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600')
                                                }`}
                                            >
                                                <div className="font-extrabold text-xs">Only Not Allotted</div>
                                                <div className="text-[11px] font-bold opacity-80 mt-0.5">
                                                    {modalTargetCentre?.notAllottedCount || 0} Students
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Target Students Count Badge */}
                                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                                    isDarkMode ? 'bg-[#0b0f14] border-gray-800' : 'bg-cyan-50/60 border-cyan-200'
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        <FaUsers className="text-cyan-500 text-base" />
                                        <div>
                                            <span className={`text-[11px] font-bold block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                Target Active Students for this Allotment
                                            </span>
                                            <span className="text-xs font-semibold text-gray-500">
                                                {allocationTargetType === 'single_student' ? '1 Individual Student' : `${targetStudentsCount} active students in batch`}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xl font-black text-cyan-500">
                                        {targetStudentsCount}
                                    </span>
                                </div>

                                {/* Items Catalog Selection */}
                                <div>
                                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Select Inventory Items & Quantity per Student
                                    </label>

                                    <div className="space-y-2.5">
                                        {availableItems.map(item => {
                                            const isSelected = allocationData.items.includes(item.name);
                                            const qty = allocationData.quantities[item.name] || 1;
                                            const totalAllotment = targetStudentsCount * qty;

                                            return (
                                                <div 
                                                    key={item.id}
                                                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                                        isSelected
                                                        ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500 shadow-md' : 'bg-blue-50 border-blue-500 shadow-sm')
                                                        : (isDarkMode ? 'bg-gray-800/30 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300')
                                                    }`}
                                                >
                                                    <div 
                                                        className="flex items-center gap-3 cursor-pointer flex-1"
                                                        onClick={() => toggleModalItem(item.name)}
                                                    >
                                                        <div className="text-xl p-2 rounded-xl bg-black/10 dark:bg-white/5 shrink-0">
                                                            {item.icon}
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-black block">{item.name}</span>
                                                            <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {isSelected 
                                                                    ? `${qty} / student × ${targetStudentsCount} students = ${totalAllotment} total`
                                                                    : 'Click to select item'
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center bg-black/20 dark:bg-white/10 rounded-lg p-0.5 border border-white/10">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => updateModalItemQuantity(item.name, -1)}
                                                                    className="w-6 h-6 flex items-center justify-center rounded font-bold hover:bg-white/20 transition-colors text-xs"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-7 text-center font-extrabold text-xs">
                                                                    {qty}
                                                                </span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => updateModalItemQuantity(item.name, 1)}
                                                                    className="w-6 h-6 flex items-center justify-center rounded font-bold hover:bg-white/20 transition-colors text-xs"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Custom Item Add */}
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Add custom item name (e.g. Study Module, Lab Kit)..."
                                        value={customItemInput}
                                        onChange={(e) => setCustomItemInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomItem())}
                                        className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${
                                            isDarkMode ? 'bg-[#0b0f14] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                        }`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddCustomItem}
                                        className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs flex items-center gap-1.5"
                                    >
                                        <FaPlus /> Add
                                    </button>
                                </div>

                                {/* ══════════════════════════════════════════════════════════════ */}
                                {/* LIVE TOTAL ALLOTMENT CALCULATION BREAKDOWN */}
                                {/* ══════════════════════════════════════════════════════════════ */}
                                {allocationData.items.length > 0 && (
                                    <div className={`p-4 rounded-2xl border ${
                                        isDarkMode ? 'bg-[#0b0f14] border-cyan-500/30' : 'bg-blue-50/60 border-blue-200'
                                    }`}>
                                        <div className="flex items-center gap-2 text-xs font-black text-cyan-500 mb-2">
                                            <FaCalculator />
                                            <span>TOTAL ALLOTMENT BREAKDOWN</span>
                                        </div>

                                        <div className="space-y-1 text-xs">
                                            {allocationData.items.map((itemName, i) => {
                                                const qty = allocationData.quantities[itemName] || 1;
                                                const totalItemUnits = targetStudentsCount * qty;
                                                return (
                                                    <div key={i} className="flex justify-between items-center py-1 border-b border-gray-700/20 last:border-0">
                                                        <span className="font-semibold text-gray-300">{itemName}:</span>
                                                        <span className="font-mono">
                                                            {targetStudentsCount} students × {qty} = <strong className="text-cyan-400">{totalItemUnits} Units</strong>
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            <div className="pt-2 flex justify-between items-center font-extrabold text-sm border-t border-gray-700/50">
                                                <span>Grand Total Items To Dispatch:</span>
                                                <span className="text-base font-black text-cyan-400">
                                                    {allocationData.items.reduce((acc, curr) => acc + (targetStudentsCount * (allocationData.quantities[curr] || 1)), 0)} Units
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAllocationModalOpen(false)}
                                        className={`flex-1 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-colors ${
                                            isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAllocationSubmit}
                                        disabled={allocationData.items.length === 0 || targetStudentsCount === 0 || submittingAllocation}
                                        className={`flex-[2] py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                                            isDarkMode 
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-[#0b0f14] hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20' 
                                            : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:opacity-95 shadow-blue-500/20'
                                        }`}
                                    >
                                        {submittingAllocation ? (
                                            <>
                                                <FaSync className="animate-spin" />
                                                Allocating...
                                            </>
                                        ) : (
                                            <>
                                                <FaCheck />
                                                Confirm Total Allotment
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default StorePage;
