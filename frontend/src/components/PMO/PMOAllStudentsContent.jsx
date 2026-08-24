import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaSearch, FaDownload, FaFileImport, FaFileExcel,
    FaGraduationCap, FaUsers, FaTrophy, FaChartLine, FaSortUp, FaSortDown,
    FaSpinner, FaTimes, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaFileInvoice,
    FaEdit, FaTrash, FaEye, FaPlus, FaMoneyBillWave, FaTag
} from 'react-icons/fa';
import { hasPermission } from '../../config/permissions';
import BillGenerator from '../Finance/BillGenerator';
import PMOAdmitCard from './PMOAdmitCard';
import PMOBulkImportModal from './PMOBulkImportModal';
import * as XLSX from 'xlsx';

const formatReportingTime = (timeStr) => {
    if (!timeStr) return '—';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }
    return timeStr;
};

const PMOAllStudentsContent = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'super admin';
    const canCreate = isSuperAdmin || hasPermission(user, 'pmo', 'addStudent', 'create') || hasPermission(user, 'pmo', 'allStudents', 'create');
    const canEdit = isSuperAdmin || hasPermission(user, 'pmo', 'allStudents', 'edit');
    const canDelete = isSuperAdmin || hasPermission(user, 'pmo', 'allStudents', 'delete');
    const canImport = isSuperAdmin || hasPermission(user, 'pmo', 'allStudents', 'import');

    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ zone: '', centre: '', class: '', status: '', session: '' });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    
    // Bill Generation State
    const [selectedStudentForBill, setSelectedStudentForBill] = useState(null);

    // Admit Card State
    const [showAdmitCard, setShowAdmitCard] = useState(false);
    const [admitCardStudent, setAdmitCardStudent] = useState(null);

    const handleGenerateAdmitCard = (student) => {
        setAdmitCardStudent(student);
        setShowAdmitCard(true);
    };

    // Checkout Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [checkoutStudent, setCheckoutStudent] = useState(null);
    const [checkoutForm, setCheckoutForm] = useState({
        waiver: '',
        paymentMethod: 'CASH',
        receivedDate: new Date().toISOString().split('T')[0],
        transactionId: '',
        accountHolderName: '',
        chequeDate: ''
    });
    const [checkoutErrors, setCheckoutErrors] = useState({});
    const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

    // Handle Free status click (100% waiver)
    const handleSetFree = async (student) => {
        if (!window.confirm(`Are you sure you want to grant 100% waiver (FREE) for ${student.name}?`)) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pmo/${student._id}/set-free`, {
                method: 'PATCH',
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStudents(prev => prev.map(s => s._id === student._id ? data.student : s));
            } else {
                alert("Failed to update status.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating status.");
        }
    };

    // Handle checkout form submit
    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (checkoutForm.paymentMethod !== 'CASH' && !checkoutForm.transactionId.trim()) {
            errs.transactionId = 'Transaction ID is required';
        }
        if (checkoutForm.paymentMethod === 'CHEQUE' && !checkoutForm.chequeDate) {
            errs.chequeDate = 'Cheque date is required';
        }
        if (!checkoutForm.receivedDate) {
            errs.receivedDate = 'Received date is required';
        }
        
        if (Object.keys(errs).length > 0) {
            setCheckoutErrors(errs);
            return;
        }

        setCheckoutSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pmo/${checkoutStudent._id}/process-payment`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    paymentMethod: checkoutForm.paymentMethod,
                    transactionId: checkoutForm.transactionId,
                    accountHolderName: checkoutForm.accountHolderName,
                    chequeDate: checkoutForm.chequeDate || undefined,
                    receivedDate: checkoutForm.receivedDate,
                    waiver: checkoutForm.waiver !== '' ? Number(checkoutForm.waiver) : 0
                })
            });

            const data = await response.json();
            if (response.ok) {
                setShowPayModal(false);
                setCheckoutStudent(null);
                setCheckoutForm({
                    waiver: '',
                    paymentMethod: 'CASH',
                    receivedDate: new Date().toISOString().split('T')[0],
                    transactionId: '',
                    accountHolderName: '',
                    chequeDate: ''
                });
                setCheckoutErrors({});

                if (data.billData) {
                    setSelectedStudentForBill(data.billData);
                }

                if (data.student) {
                    setStudents(prev => prev.map(s => s._id === checkoutStudent._id ? data.student : s));
                }
            } else {
                alert(data.message || 'Payment submission failed.');
            }
        } catch (err) {
            console.error("Error processing payment", err);
            alert("Server error occurred.");
        } finally {
            setCheckoutSubmitting(false);
        }
    };

    const [students, setStudents] = useState([]);
    const [dbCentres, setDbCentres] = useState([]);
    const [dbZones, setDbZones] = useState([]);
    const [dbClasses, setDbClasses] = useState([]);
    const [dbBoards, setDbBoards] = useState([]);
    const [dbSessions, setDbSessions] = useState([]);
    const [dbExamTags, setDbExamTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewStudent, setViewStudent] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editStudent, setEditStudent] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '', mobile: '', secondaryMobile: '', email: '', dob: '', gender: '',
        class: '', board: '', centre: '', session: '', examTag: '', course: '',
        school: '', guardianName: '', guardianMobile: '',
        address: '', city: '', state: '', pincode: '',
        examDate: '', examVenue: '', reportingTime: '', timeSlot: '',
        remarks: '', status: '', score: '', rank: '', rollNo: ''
    });
    const [editErrors, setEditErrors] = useState({});
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Bulk Import Modal State
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 15;

    const getHeaders = () => {
        const token = localStorage.getItem("token");
        return { "Authorization": `Bearer ${token}` };
    };

    // Load Master Data
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const headers = getHeaders();
                const [centresRes, classesRes, sessionsRes, tagsRes, boardsRes, zonesRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/board`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers })
                ]);
                if (centresRes.ok) setDbCentres(await centresRes.json());
                if (classesRes.ok) setDbClasses(await classesRes.json());
                if (boardsRes.ok) setDbBoards(await boardsRes.json());
                if (sessionsRes.ok) {
                    const d = await sessionsRes.json();
                    setDbSessions(Array.isArray(d) ? d : (d.sessions || []));
                }
                if (tagsRes.ok) {
                    const allTags = await tagsRes.json();
                    setDbExamTags(Array.isArray(allTags) ? allTags : []);
                }
                if (zonesRes.ok) {
                    const zData = await zonesRes.json();
                    setDbZones(Array.isArray(zData) ? zData : (zData.zones || zData.data || []));
                }
            } catch (err) {
                console.error("Failed to load master data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMasterData();
    }, []);

    // Helper to get Zone for a centre
    const getZoneName = (centreIdOrObj) => {
        if (!centreIdOrObj) return '—';
        const cId = (centreIdOrObj._id || centreIdOrObj).toString();
        const matchedZone = dbZones.find(z =>
            (z.centres || []).some(c => (c._id || c).toString() === cId)
        );
        return matchedZone ? matchedZone.name : '—';
    };

    // Fetch Students
    const fetchStudents = async () => {
        setStudentsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (filters.zone) params.append('zone', filters.zone);
            if (filters.centre) params.append('centre', filters.centre);
            if (filters.class) params.append('class', filters.class);
            if (filters.status) params.append('status', filters.status);
            if (filters.session) params.append('session', filters.session);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/pmo/list?${params.toString()}`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setStudents(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to fetch PMO students", err);
        } finally {
            setStudentsLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            fetchStudents();
        }
    }, [filters, loading]);

    // Search on Enter or debounce
    const handleSearch = (e) => {
        e.preventDefault();
        fetchStudents();
    };

    // Filter available centres based on selected zone
    const availableCentres = filters.zone
        ? dbCentres.filter(c => {
            const z = dbZones.find(zone => zone._id === filters.zone);
            return (z?.centres || []).some(zC => (zC._id || zC).toString() === c._id.toString());
        })
        : dbCentres;

    // Sorting
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStudents = [...students].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';
        if (sortConfig.key === 'class') {
            aVal = a.class?.name || '';
            bVal = b.class?.name || '';
        }
        if (sortConfig.key === 'centre') {
            aVal = a.centre?.centreName || '';
            bVal = b.centre?.centreName || '';
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedStudents.length / rowsPerPage) || 1;
    const paginatedStudents = sortedStudents.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Export to Excel
    const handleExport = () => {
        const exportData = sortedStudents.map((s, idx) => ({
            'Sl. No': idx + 1,
            'Roll / Enrollment No': s.rollNo,
            'Name': s.name,
            'Mobile': s.mobile,
            'Email': s.email || '—',
            'Gender': s.gender || '—',
            'Class': s.class?.name || '—',
            'Board': s.board?.boardCourse || s.board?.boardName || '—',
            'Centre': s.centre?.centreName || '—',
            'Zone': getZoneName(s.centre),
            'Session': s.session?.sessionName || s.session?.name || '—',
            'Course': s.course || '—',
            'Course Fee (Gross)': 100,
            'Discount / Waiver': s.waiver || 0,
            'Net Amount Paid': s.amountPaid || 0,
            'Payment Status': s.isPaymentPending ? 'Pending' : (s.paymentType === 'free' || s.amountPaid === 0 ? 'Free' : 'Paid'),
            'Payment Method': s.paymentMethod || '—',
            'Bill Receipt ID': s.billId || '—',
            'School': s.school || '—',
            'Guardian Name': s.guardianName || '—',
            'Guardian Mobile': s.guardianMobile || '—',
            'Exam Date': s.examDate || '—',
            'Exam Venue': s.examVenue || '—',
            'Reporting Time': formatReportingTime(s.reportingTime),
            'Exam Time Slot': s.timeSlot || '—',
            'Status': s.status,
            'Score': s.score || 0,
            'Rank': s.rank || '—',
            'Remarks': s.remarks || '—',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "PMO Students");
        XLSX.writeFile(wb, `PMO_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Delete Student
    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete PMO student "${name}"? This action cannot be undone.`)) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/pmo/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (res.ok) {
                setStudents(prev => prev.filter(s => s._id !== id));
            } else {
                const data = await res.json();
                alert(data.message || "Failed to delete student.");
            }
        } catch (err) {
            console.error("Delete failed", err);
            alert("Server error occurred.");
        }
    };

    // Open View Modal
    const handleOpenView = (student) => {
        setViewStudent(student);
        setShowViewModal(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (student) => {
        setEditStudent(student);
        setEditForm({
            name: student.name || '',
            mobile: student.mobile || '',
            secondaryMobile: student.secondaryMobile || '',
            email: student.email || '',
            dob: student.dob || '',
            gender: student.gender || '',
            class: student.class?._id || student.class || '',
            board: student.board?._id || student.board || '',
            centre: student.centre?._id || student.centre || '',
            session: student.session?._id || student.session || '',
            examTag: student.examTag?._id || student.examTag || '',
            course: student.course || '',
            school: student.school || '',
            guardianName: student.guardianName || '',
            guardianMobile: student.guardianMobile || '',
            address: student.address || '',
            city: student.city || '',
            state: student.state || '',
            pincode: student.pincode || '',
            examDate: student.examDate || '',
            examVenue: student.examVenue || '',
            reportingTime: student.reportingTime || '',
            timeSlot: student.timeSlot || '',
            remarks: student.remarks || '',
            status: student.status || 'Appeared',
            score: student.score !== undefined ? student.score : '',
            rank: student.rank !== undefined ? student.rank : '',
            rollNo: student.rollNo || ''
        });
        setEditErrors({});
        setShowEditModal(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
        if (editErrors[name]) setEditErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!editForm.name.trim()) errs.name = 'Full Name is required';
        if (!editForm.mobile.trim() || !/^\d{10}$/.test(editForm.mobile)) errs.mobile = 'Valid 10-digit mobile is required';
        if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }

        setEditSubmitting(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/pmo/${editStudent._id}`, {
                method: 'PUT',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (res.ok) {
                setStudents(prev => prev.map(s => s._id === editStudent._id ? data.student : s));
                setShowEditModal(false);
            } else {
                alert(data.message || "Failed to update student.");
            }
        } catch (err) {
            console.error("Update failed", err);
            alert("Server error occurred.");
        } finally {
            setEditSubmitting(false);
        }
    };

    // Stats
    const totalCount = students.length;
    const paidCount = students.filter(s => !s.isPaymentPending && (s.paymentType === 'paid' && s.amountPaid > 0)).length;
    const pendingCount = students.filter(s => s.isPaymentPending).length;
    const totalCollections = students.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const qualifiedCount = students.filter(s => s.status === 'Qualified').length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <FaSpinner className="text-4xl text-purple-400 animate-spin" />
                    <p className="text-sm text-gray-400">Loading PMO Students module...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6 space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <FaGraduationCap className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">PMO — All Students</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Pathfinder Math Olympiad Student Enrolments & Payment Management</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {canImport && (
                        <button
                            onClick={() => setShowBulkImportModal(true)}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
                        >
                            <FaFileImport className="text-purple-400" /> Bulk Import
                        </button>
                    )}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
                    >
                        <FaDownload className="text-emerald-400" /> Export Excel
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => navigate('/pmo/add-student')}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition transform active:scale-95"
                        >
                            <FaPlus /> Add Student
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                        <FaUsers className="text-lg" />
                    </div>
                    <div>
                        <span className="text-[11px] text-gray-400 uppercase font-semibold">Total Students</span>
                        <h4 className="text-xl font-bold text-white mt-0.5">{totalCount}</h4>
                    </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <FaMoneyBillWave className="text-lg" />
                    </div>
                    <div>
                        <span className="text-[11px] text-gray-400 uppercase font-semibold">Total Collection</span>
                        <h4 className="text-xl font-bold text-emerald-400 mt-0.5">₹{totalCollections.toLocaleString()}</h4>
                    </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <FaCheckCircle className="text-lg" />
                    </div>
                    <div>
                        <span className="text-[11px] text-gray-400 uppercase font-semibold">Paid Enrolments</span>
                        <h4 className="text-xl font-bold text-white mt-0.5">{paidCount}</h4>
                    </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                        <FaExclamationTriangle className="text-lg" />
                    </div>
                    <div>
                        <span className="text-[11px] text-gray-400 uppercase font-semibold">Pending Payment</span>
                        <h4 className="text-xl font-bold text-amber-400 mt-0.5">{pendingCount}</h4>
                    </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <FaTrophy className="text-lg" />
                    </div>
                    <div>
                        <span className="text-[11px] text-gray-400 uppercase font-semibold">Qualified</span>
                        <h4 className="text-xl font-bold text-cyan-400 mt-0.5">{qualifiedCount}</h4>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="md:col-span-2 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Name, Mobile, Roll No..."
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
                        />
                        <FaSearch className="absolute left-3 top-2.5 text-gray-600 text-xs" />
                    </form>

                    {/* Zone Filter */}
                    <select
                        value={filters.zone}
                        onChange={(e) => setFilters(prev => ({ ...prev, zone: e.target.value, centre: '' }))}
                        className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-purple-500 transition"
                    >
                        <option value="">All Zones</option>
                        {dbZones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                    </select>

                    {/* Centre Filter */}
                    <select
                        value={filters.centre}
                        onChange={(e) => setFilters(prev => ({ ...prev, centre: e.target.value }))}
                        className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-purple-500 transition"
                    >
                        <option value="">All Centres</option>
                        {availableCentres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                    </select>

                    {/* Class Filter */}
                    <select
                        value={filters.class}
                        onChange={(e) => setFilters(prev => ({ ...prev, class: e.target.value }))}
                        className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-purple-500 transition"
                    >
                        <option value="">All Classes</option>
                        {dbClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-purple-500 transition"
                    >
                        <option value="">All Statuses</option>
                        <option value="Appeared">Appeared</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Not Qualified">Not Qualified</option>
                    </select>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                        <thead className="bg-gray-950/80 text-gray-400 uppercase text-[10px] font-bold border-b border-gray-800">
                            <tr>
                                <th className="p-3.5">#</th>
                                <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('rollNo')}>
                                    <div className="flex items-center gap-1">
                                        Enrollment ID
                                        {sortConfig.key === 'rollNo' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                                    </div>
                                </th>
                                <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">
                                        Student Details
                                        {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                                    </div>
                                </th>
                                <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('centre')}>
                                    <div className="flex items-center gap-1">
                                        Centre / Zone
                                        {sortConfig.key === 'centre' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                                    </div>
                                </th>
                                <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('class')}>
                                    <div className="flex items-center gap-1">
                                        Class / Course
                                        {sortConfig.key === 'class' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                                    </div>
                                </th>
                                <th className="p-3.5">Fee & Payment</th>
                                <th className="p-3.5">Exam Venue & Time</th>
                                <th className="p-3.5">Result</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                            {studentsLoading ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-gray-500">
                                        <FaSpinner className="animate-spin text-2xl text-purple-400 mx-auto mb-2" />
                                        Loading PMO students...
                                    </td>
                                </tr>
                            ) : paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-gray-500">
                                        No PMO students found. Click "Add Student" or adjust search/filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((s, idx) => {
                                    const isPending = s.isPaymentPending;
                                    const isFree = s.paymentType === 'free' || s.amountPaid === 0;

                                    return (
                                        <tr key={s._id} className="hover:bg-gray-800/40 transition">
                                            <td className="p-3.5 font-mono text-gray-500">
                                                {(currentPage - 1) * rowsPerPage + idx + 1}
                                            </td>

                                            <td className="p-3.5">
                                                <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">
                                                    {s.rollNo}
                                                </span>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-semibold text-white">{s.name}</div>
                                                <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                                                    <span>{s.mobile}</span>
                                                    {s.email && <span className="text-gray-500 truncate max-w-[120px]">{s.email}</span>}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="text-gray-200 font-medium">{s.centre?.centreName || '—'}</div>
                                                <div className="text-[11px] text-gray-500">{getZoneName(s.centre)}</div>
                                            </td>

                                            <td className="p-3.5">
                                                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                                                    {s.course || `PMO ${s.class?.name || ''}`}
                                                </span>
                                                <div className="text-[11px] text-gray-500 mt-1">
                                                    {s.board?.boardCourse || s.board?.boardName || '—'}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                {isPending ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                                            Pending
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setCheckoutStudent(s);
                                                                setCheckoutForm({
                                                                    waiver: '',
                                                                    paymentMethod: 'CASH',
                                                                    receivedDate: new Date().toISOString().split('T')[0],
                                                                    transactionId: '',
                                                                    accountHolderName: '',
                                                                    chequeDate: ''
                                                                });
                                                                setShowPayModal(true);
                                                            }}
                                                            className="text-[11px] text-purple-400 hover:underline font-semibold"
                                                        >
                                                            Pay / Discount
                                                        </button>
                                                    </div>
                                                ) : isFree ? (
                                                    <div>
                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                                            Free (₹0)
                                                        </span>
                                                        {s.waiver > 0 && <span className="text-[10px] text-gray-500 block mt-0.5">100% Waiver</span>}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                                                Paid ₹{s.amountPaid}
                                                            </span>
                                                            {s.billId && (
                                                                <button
                                                                    onClick={() => {
                                                                        const fakeBill = {
                                                                            billId: s.billId,
                                                                            billDate: s.updatedAt || s.createdAt,
                                                                            centre: {
                                                                                name: s.centre?.centreName || 'N/A',
                                                                                address: s.centre?.address || 'N/A',
                                                                                phoneNumber: s.centre?.phoneNumber || 'N/A',
                                                                                gstNumber: s.centre?.enterGstNo || 'N/A',
                                                                                corporateAddress: '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                                                                                corporatePhone: '033 2455-1840 / 2454-4817'
                                                                            },
                                                                            student: {
                                                                                id: s._id,
                                                                                name: s.name,
                                                                                admissionNumber: s.rollNo,
                                                                                phoneNumber: s.mobile,
                                                                                email: s.email || 'N/A'
                                                                            },
                                                                            course: {
                                                                                name: s.course,
                                                                                department: 'PMO',
                                                                                examTag: 'PMO',
                                                                                class: s.class?.name || 'N/A',
                                                                                session: s.session?.sessionName || 'N/A'
                                                                            },
                                                                            payment: {
                                                                                installmentNumber: 0,
                                                                                paymentMethod: s.paymentMethod || 'CASH',
                                                                                paidDate: s.updatedAt || s.createdAt,
                                                                                receivedDate: s.updatedAt || s.createdAt,
                                                                                status: 'PAID',
                                                                                remarks: `PMO Fee | Gross: ₹100 | Discount: ₹${s.waiver || 0} | Paid: ₹${s.amountPaid}`
                                                                            },
                                                                            amounts: {
                                                                                courseFee: (s.amountPaid / 1.18).toFixed(2),
                                                                                cgst: ((s.amountPaid - s.amountPaid / 1.18) / 2).toFixed(2),
                                                                                sgst: ((s.amountPaid - s.amountPaid / 1.18) / 2).toFixed(2),
                                                                                totalAmount: s.amountPaid,
                                                                                waiver: s.waiver || 0,
                                                                                grossFee: 100
                                                                            }
                                                                        };
                                                                        setSelectedStudentForBill(fakeBill);
                                                                    }}
                                                                    title="View Bill Receipt"
                                                                    className="text-purple-400 hover:text-purple-300 transition"
                                                                >
                                                                    <FaFileInvoice size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {s.waiver > 0 && <span className="text-[10px] text-amber-400 block mt-0.5">Discount: -₹{s.waiver}</span>}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <div className="text-gray-300">{s.examVenue || s.centre?.centreName || '—'}</div>
                                                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                                    {s.examDate || '—'} {s.reportingTime && `(${formatReportingTime(s.reportingTime)})`}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    s.status === 'Qualified'
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        : s.status === 'Not Qualified'
                                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                        : 'bg-gray-800 text-gray-400'
                                                }`}>
                                                    {s.status || 'Appeared'}
                                                </span>
                                            </td>

                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleGenerateAdmitCard(s)}
                                                        className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition"
                                                        title="PMO Admit Card"
                                                    >
                                                        <FaGraduationCap size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenView(s)}
                                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                                                        title="View Details"
                                                    >
                                                        <FaEye size={13} />
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => handleOpenEdit(s)}
                                                            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition"
                                                            title="Edit Student"
                                                        >
                                                            <FaEdit size={13} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(s._id, s.name)}
                                                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                                                            title="Delete Student"
                                                        >
                                                            <FaTrash size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-950/60 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
                        <span>Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, sortedStudents.length)} of {sortedStudents.length}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 transition"
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, currentPage - 3), currentPage + 2).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition ${p === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bill Receipt Modal */}
            {selectedStudentForBill && (
                <BillGenerator
                    preloadedBillData={selectedStudentForBill}
                    onClose={() => setSelectedStudentForBill(null)}
                />
            )}

            {/* Admit Card Modal */}
            {showAdmitCard && admitCardStudent && (
                <PMOAdmitCard
                    student={admitCardStudent}
                    onClose={() => {
                        setShowAdmitCard(false);
                        setAdmitCardStudent(null);
                    }}
                />
            )}

            {/* Bulk Import Modal */}
            {showBulkImportModal && (
                <PMOBulkImportModal
                    apiUrl={import.meta.env.VITE_API_URL}
                    token={localStorage.getItem("token")}
                    onClose={() => setShowBulkImportModal(false)}
                    onSuccess={() => {
                        setShowBulkImportModal(false);
                        fetchStudents();
                    }}
                />
            )}

            {/* Checkout Settlement Modal (for pending students) */}
            {showPayModal && checkoutStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-purple-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 to-indigo-950 border-b border-gray-800 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white text-base">PMO Fee Settlement</h3>
                                <p className="text-xs text-purple-300 mt-0.5">{checkoutStudent.name} (Roll: {checkoutStudent.rollNo})</p>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4 text-xs">
                            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
                                <label className="block text-gray-300 font-semibold flex items-center gap-1.5">
                                    <FaTag className="text-amber-400" /> Discount / Waiver (₹)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={checkoutForm.waiver}
                                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, waiver: e.target.value }))}
                                    placeholder="0 - 100 (e.g. 20)"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-400 transition"
                                />
                                <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                                    <span>Course Fee: ₹100</span>
                                    <span>Discount: -₹{Math.max(0, Math.min(100, Number(checkoutForm.waiver) || 0))}</span>
                                    <span className="font-bold text-emerald-400">Net: ₹{Math.max(0, 100 - (Number(checkoutForm.waiver) || 0))}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Payment Method</label>
                                    <select
                                        value={checkoutForm.paymentMethod}
                                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="CASH">💵 Cash</option>
                                        <option value="UPI">📱 UPI</option>
                                        <option value="CARD">💳 Card</option>
                                        <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                                        <option value="CHEQUE">📝 Cheque</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Received Date <span className="text-rose-500">*</span></label>
                                    <input
                                        type="date"
                                        value={checkoutForm.receivedDate}
                                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, receivedDate: e.target.value }))}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            {checkoutForm.paymentMethod !== 'CASH' && (
                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Transaction ID <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={checkoutForm.transactionId}
                                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, transactionId: e.target.value }))}
                                        placeholder="Transaction Reference"
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    />
                                    {checkoutErrors.transactionId && <p className="text-rose-400 text-[11px] mt-1">{checkoutErrors.transactionId}</p>}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => handleSetFree(checkoutStudent)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition"
                                >
                                    Mark 100% Free
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkoutSubmitting}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                                >
                                    {checkoutSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                    Collect Payment & Bill
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showViewModal && viewStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 to-indigo-950 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-white text-base">PMO Student Details</h3>
                            <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
                            <div className="grid grid-cols-2 gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800">
                                <div><span className="text-gray-500">Full Name:</span> <strong className="text-white block mt-0.5">{viewStudent.name}</strong></div>
                                <div><span className="text-gray-500">Roll / Enrollment ID:</span> <strong className="text-purple-400 block mt-0.5 font-mono">{viewStudent.rollNo}</strong></div>
                                <div><span className="text-gray-500">Mobile:</span> <span className="text-gray-200 block mt-0.5 font-mono">{viewStudent.mobile}</span></div>
                                <div><span className="text-gray-500">Email:</span> <span className="text-gray-200 block mt-0.5">{viewStudent.email || '—'}</span></div>
                                <div><span className="text-gray-500">Class & Board:</span> <span className="text-gray-200 block mt-0.5">{viewStudent.class?.name || '—'} ({viewStudent.board?.boardCourse || viewStudent.board?.boardName || '—'})</span></div>
                                <div><span className="text-gray-500">Course:</span> <span className="text-purple-300 font-bold block mt-0.5">{viewStudent.course}</span></div>
                                <div><span className="text-gray-500">Centre:</span> <span className="text-gray-200 block mt-0.5">{viewStudent.centre?.centreName} ({getZoneName(viewStudent.centre)})</span></div>
                                <div><span className="text-gray-500">Fee Paid:</span> <span className="text-emerald-400 font-bold block mt-0.5">₹{viewStudent.amountPaid} (Discount: ₹{viewStudent.waiver || 0})</span></div>
                                <div><span className="text-gray-500">Exam Venue:</span> <span className="text-gray-200 block mt-0.5">{viewStudent.examVenue || '—'}</span></div>
                                <div><span className="text-gray-500">Exam Date & Time:</span> <span className="text-gray-200 block mt-0.5">{viewStudent.examDate || '—'} {viewStudent.reportingTime && `(${formatReportingTime(viewStudent.reportingTime)})`}</span></div>
                                <div><span className="text-gray-500">Status:</span> <span className="text-gray-200 block mt-0.5">{viewStudent.status}</span></div>
                                <div><span className="text-gray-500">Score & Rank:</span> <span className="text-gray-200 block mt-0.5">{viewStudent.score || 0} pts (Rank: {viewStudent.rank || '—'})</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 to-indigo-950 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-white text-base">Edit PMO Student: {editStudent.name}</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Full Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    />
                                    {editErrors.name && <p className="text-rose-400 text-[11px] mt-1">{editErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Mobile <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        name="mobile"
                                        maxLength={10}
                                        value={editForm.mobile}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
                                    />
                                    {editErrors.mobile && <p className="text-rose-400 text-[11px] mt-1">{editErrors.mobile}</p>}
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editForm.email}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Class</label>
                                    <select
                                        name="class"
                                        value={editForm.class}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">Select Class</option>
                                        {dbClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Centre</label>
                                    <select
                                        name="centre"
                                        value={editForm.centre}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">Select Centre</option>
                                        {dbCentres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Course</label>
                                    <input
                                        type="text"
                                        name="course"
                                        value={editForm.course}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-purple-300 font-bold focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Status</label>
                                    <select
                                        name="status"
                                        value={editForm.status}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="Appeared">Appeared</option>
                                        <option value="Qualified">Qualified</option>
                                        <option value="Not Qualified">Not Qualified</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Score</label>
                                    <input
                                        type="number"
                                        name="score"
                                        value={editForm.score}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 mb-1 font-medium">Rank</label>
                                    <input
                                        type="number"
                                        name="rank"
                                        value={editForm.rank}
                                        onChange={handleEditChange}
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-gray-200 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                                >
                                    {editSubmitting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PMOAllStudentsContent;
