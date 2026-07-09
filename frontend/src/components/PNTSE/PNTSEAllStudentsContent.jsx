import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaDownload, FaFileImport, FaFileExcel,
    FaGraduationCap, FaUsers, FaTrophy, FaChartLine, FaSortUp, FaSortDown,
    FaSpinner, FaTimes, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaFileInvoice,
    FaEdit, FaTrash, FaEye, FaBookOpen, FaChalkboardTeacher, FaSchool, FaPlus
} from 'react-icons/fa';
import BillGenerator from '../Finance/BillGenerator';
import PNTSEAdmitCard from './PNTSEAdmitCard';

const PNTSEAllStudentsContent = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ centre: '', class: '', status: '', session: '' });
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

    // Handle Free status click
    const handleSetFree = async (student) => {
        if (!window.confirm(`Are you sure you want to mark ${student.name} as FREE?`)) return;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/${student._id}/set-free`, {
                method: 'PATCH',
                headers: getHeaders()
            });
            if (response.ok) {
                // Refresh student list
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
        
        // Validation
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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/${checkoutStudent._id}/process-payment`, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
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

                // Show bill modal if generated
                if (data.billData) {
                    setSelectedStudentForBill(data.billData);
                }

                // Update student list state inline with populated student
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
    const [dbClasses, setDbClasses] = useState([]);
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
        name: '', mobile: '', email: '', dob: '', gender: '',
        class: '', centre: '', session: '', examTag: '', course: '',
        school: '', guardianName: '', guardianMobile: '',
        address: '', city: '', state: '', pincode: '',
        remarks: '', status: '', score: '', rank: ''
    });
    const [editErrors, setEditErrors] = useState({});
    const [editSubmitting, setEditSubmitting] = useState(false);

    const courses = [
        'PNTSE CLASS 6',
        'PNTSE CLASS 7',
        'PNTSE CLASS 8',
        'PNTSE CLASS 9',
        'PNTSE CLASS 10'
    ];
    const genders = ['Male', 'Female', 'Other'];

    const handleViewStudent = (student) => {
        setViewStudent(student);
        setShowViewModal(true);
    };

    const handleEditStudent = (student) => {
        setEditStudent(student);
        setEditForm({
            name: student.name || '',
            mobile: student.mobile || '',
            email: student.email || '',
            dob: student.dob || '',
            gender: student.gender || '',
            class: student.class?._id || student.class || '',
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
            remarks: student.remarks || '',
            status: student.status || '',
            score: student.score || 0,
            rank: student.rank || ''
        });
        setEditErrors({});
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        
        const errs = {};
        if (!editForm.name.trim()) errs.name = 'Name is required';
        if (!editForm.mobile.trim()) errs.mobile = 'Mobile is required';
        if (!editForm.class) errs.class = 'Class is required';
        if (!editForm.course) errs.course = 'Course is required';
        if (!editForm.centre) errs.centre = 'Centre is required';
        if (!editForm.session) errs.session = 'Session is required';
        if (!editForm.examTag) errs.examTag = 'Exam tag is required';

        if (Object.keys(errs).length > 0) {
            setEditErrors(errs);
            return;
        }

        setEditSubmitting(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/${editStudent._id}`, {
                method: 'PUT',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });

            const data = await response.json();
            if (response.ok) {
                setShowEditModal(false);
                setEditStudent(null);
                setEditErrors({});
                
                const listRes = await fetch(`${import.meta.env.VITE_API_URL}/pntse/list`, { headers: getHeaders() });
                if (listRes.ok) setStudents(await listRes.json());
            } else {
                alert(data.message || 'Edit failed.');
            }
        } catch (err) {
            console.error("Error editing student", err);
            alert("Server error occurred.");
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDeleteStudent = async (student) => {
        if (!window.confirm(`Are you sure you want to delete student ${student.name}? This will also delete any payment receipts.`)) return;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/${student._id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (response.ok) {
                const listRes = await fetch(`${import.meta.env.VITE_API_URL}/pntse/list`, { headers: getHeaders() });
                if (listRes.ok) setStudents(await listRes.json());
            } else {
                const data = await response.json();
                alert(data.message || 'Delete failed.');
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting student.");
        }
    };

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    const statuses = ['Qualified', 'Appeared', 'Not Qualified'];

    const getToken = () => localStorage.getItem("token");
    const getHeaders = () => ({ "Authorization": `Bearer ${getToken()}` });

    // Load master data
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const headers = getHeaders();
                const [centresRes, classesRes, sessionsRes, examTagsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers })
                ]);
                if (centresRes.ok) setDbCentres(await centresRes.json());
                if (classesRes.ok) setDbClasses(await classesRes.json());
                if (sessionsRes.ok) {
                    const data = await sessionsRes.json();
                    setDbSessions(Array.isArray(data) ? data : (data.sessions || []));
                }
                if (examTagsRes.ok) setDbExamTags(await examTagsRes.json());
            } catch (err) {
                console.error("Failed to load master data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMasterData();
    }, []);

    // Load students on filter/search change
    useEffect(() => {
        const fetchStudents = async () => {
            setStudentsLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (filters.centre) params.append('centre', filters.centre);
                if (filters.class) params.append('class', filters.class);
                if (filters.session) params.append('session', filters.session);
                if (filters.status) params.append('status', filters.status);

                const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/list?${params.toString()}`, { headers: getHeaders() });
                if (response.ok) setStudents(await response.json());
            } catch (err) {
                console.error("Failed to load students", err);
            } finally {
                setStudentsLoading(false);
            }
        };
        const handler = setTimeout(fetchStudents, 300);
        return () => clearTimeout(handler);
    }, [searchQuery, filters]);

    // Download template
    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/template`, { headers: getHeaders() });
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'PNTSE_Import_Template.xlsx';
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error("Template download failed", err);
        }
    };

    // Handle file import submit
    const handleImportSubmit = async () => {
        if (!importFile) return;
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/import-excel`, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${getToken()}` },
                body: formData
            });
            const data = await response.json();
            setImportResult(data);
            if (data.success > 0) {
                // Refresh students list
                const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/pntse/list`, { headers: getHeaders() });
                if (refreshRes.ok) setStudents(await refreshRes.json());
            }
        } catch (err) {
            setImportResult({ message: "Import failed: " + err.message, success: 0, failed: 0, errors: [] });
        } finally {
            setImporting(false);
        }
    };

    const handleCloseModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const handleViewBill = (student) => {
        if (!student.paymentId) return;
        const payment = student.paymentId;
        
        const billData = {
            billId: student.billId || payment.billId,
            billDate: payment.paidDate || payment.receivedDate || payment.createdAt,
            centre: {
                name: student.centre?.centreName || student.centre?.enterCode || 'N/A',
                address: student.centre?.address || 'N/A',
                phoneNumber: student.centre?.phoneNumber || 'N/A',
                gstNumber: student.centre?.enterGstNo || 'N/A',
                corporateAddress: student.centre?.enterCorporateOfficeAddress || '47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026',
                corporatePhone: student.centre?.enterCorporateOfficePhoneNumber || '033 2455-1840 / 2454-4817 / 4668'
            },
            student: {
                id: student._id,
                name: student.name,
                admissionNumber: student.rollNo,
                phoneNumber: student.mobile,
                email: student.email || 'N/A'
            },
            course: {
                name: student.course,
                department: 'PNTSE',
                examTag: student.examTag?.name || 'PNTSE',
                class: student.class?.name || 'N/A',
                session: student.session?.sessionName || 'N/A'
            },
            payment: {
                installmentNumber: 0,
                paymentMethod: payment.paymentMethod || 'CASH',
                transactionId: payment.transactionId || '',
                paidDate: payment.paidDate,
                receivedDate: payment.receivedDate,
                accountHolderName: payment.accountHolderName || '',
                chequeDate: payment.chequeDate ? new Date(payment.chequeDate) : null,
                status: payment.status || 'PAID',
                remarks: payment.remarks || `PNTSE Fee | Net: ₹${student.amountPaid}`
            },
            amounts: {
                courseFee: payment.courseFee || student.amountPaid,
                cgst: payment.cgst || 0,
                sgst: payment.sgst || 0,
                totalAmount: payment.totalAmount || student.amountPaid,
                waiver: student.waiver || 0,
                grossFee: payment.amount || (student.amountPaid + (student.waiver || 0))
            }
        };

        setSelectedStudentForBill(billData);
    };

    const sortedStudents = [...students].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'class') { aVal = a.class?.name || ''; bVal = b.class?.name || ''; }
        if (sortConfig.key === 'centre') { aVal = a.centre?.centreName || ''; bVal = b.centre?.centreName || ''; }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const pntseClasses = dbClasses.filter(cls => {
        if (!cls || !cls.name) return false;
        const name = String(cls.name).trim();
        const isMatch = /^(?:6|7|8|9|10|VI|VII|VIII|IX|X|Class\s*(?:6|7|8|9|10|VI|VII|VIII|IX|X))$/i.test(name);
        if (isMatch) return true;
        return students.some(s => (s.class?._id || s.class) === cls._id);
    });

    const sortedClasses = [...pntseClasses].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const classStats = sortedClasses.map((cls, index) => {
        const count = students.filter(s => (s.class?._id || s.class) === cls._id).length;
        
        const colorSchemes = [
            { color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10', icon: <FaGraduationCap /> },
            { color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', icon: <FaBookOpen /> },
            { color: 'from-purple-500 to-indigo-500', bg: 'bg-purple-500/10', icon: <FaChalkboardTeacher /> },
            { color: 'from-rose-500 to-pink-500', bg: 'bg-rose-500/10', icon: <FaSchool /> },
            { color: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500/10', icon: <FaUsers /> },
        ];
        
        const scheme = colorSchemes[index % colorSchemes.length];
        
        return {
            label: cls.name.toLowerCase().includes('class') ? cls.name : `Class ${cls.name}`,
            value: count,
            icon: scheme.icon,
            color: scheme.color,
            bg: scheme.bg
        };
    });

    const stats = [
        { 
            label: 'Total Students', 
            value: students.length, 
            icon: <FaUsers />, 
            color: 'from-blue-500 to-cyan-500', 
            bg: 'bg-blue-500/10'
        },
        ...classStats
    ];

    const getStatusBadge = (status) => {
        const map = {
            'Qualified': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
            'Appeared': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
            'Not Qualified': 'bg-red-500/20 text-red-400 border border-red-500/30',
        };
        return map[status] || 'bg-gray-500/20 text-gray-400';
    };

    const SortIcon = ({ field }) => {
        if (sortConfig.key !== field) return <FaSortUp className="opacity-30" />;
        return sortConfig.direction === 'asc' ? <FaSortUp className="text-cyan-400" /> : <FaSortDown className="text-cyan-400" />;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <FaSpinner className="text-4xl text-cyan-400 animate-spin" />
                    <p className="text-sm text-gray-400">Loading PNTSE console...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <FaGraduationCap className="text-white text-lg" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">PNTSE — All Students</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Pathfinder National Talent Search Examination</p>
                    </div>
                </div>
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/pntse/add-student')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 cursor-pointer"
                    >
                        <FaPlus />
                        Add Student
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/25 cursor-pointer"
                    >
                        <FaFileImport />
                        Import Excel
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all duration-200 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    <span className={`bg-gradient-to-br ${stat.color} bg-clip-text text-transparent text-xl`}>{stat.icon}</span>
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white">{stat.value}</p>
                            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters Row */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                        <input
                            type="text"
                            placeholder="Search by name, roll no, mobile..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        />
                    </div>
                    <select value={filters.centre} onChange={e => setFilters(p => ({ ...p, centre: e.target.value }))} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[140px]">
                        <option value="">All Centres</option>
                        {dbCentres.map(c => <option key={c._id} value={c._id}>{c.centreName || c.enterCode}</option>)}
                    </select>
                    <select value={filters.class} onChange={e => setFilters(p => ({ ...p, class: e.target.value }))} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[130px]">
                        <option value="">All Classes</option>
                        {dbClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[150px]">
                        <option value="">All Statuses</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filters.session} onChange={e => setFilters(p => ({ ...p, session: e.target.value }))} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer min-w-[130px]">
                        <option value="">All Sessions</option>
                        {dbSessions.map(s => <option key={s._id} value={s._id}>{s.sessionName}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden relative">
                {studentsLoading && (
                    <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <FaSpinner className="text-3xl text-cyan-400 animate-spin" />
                    </div>
                )}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-white">
                        PNTSE Students
                        <span className="ml-2 text-xs text-gray-400 font-normal">{sortedStudents.length} record(s)</span>
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-800/60">
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Sl.</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1.5">Student Name <SortIcon field="name" /></div>
                                </th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Roll No.</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Class</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Centre</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Mobile</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Course</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid Status</th>
                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Exam Tag</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Admit Card</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {sortedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-16 text-gray-500">
                                        <FaGraduationCap className="text-4xl mx-auto mb-3 opacity-30" />
                                        <p>No students found</p>
                                    </td>
                                </tr>
                            ) : sortedStudents.map((student, idx) => (
                                <tr key={student._id} className="hover:bg-gray-800/40 transition-colors duration-150">
                                    <td className="px-5 py-4 text-gray-400">{idx + 1}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {student.name?.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-100">{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-cyan-400 font-mono text-xs font-semibold">{student.rollNo}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.class?.name || student.class}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.centre?.centreName || student.centre?.enterCode || student.centre}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.mobile}</td>
                                    <td className="px-5 py-4 text-gray-300">{student.course}</td>
                                    <td className="px-5 py-4">
                                        {student.paymentType === 'paid' && student.paymentId ? (
                                            <button 
                                                onClick={() => handleViewBill(student)}
                                                className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-500/30"
                                            >
                                                <FaFileInvoice className="text-[10px]" />
                                                PAID (Rs. {student.amountPaid})
                                            </button>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-gray-500/20 text-gray-400">
                                                {student.paymentType}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                            {student.examTag?.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button 
                                            onClick={() => handleGenerateAdmitCard(student)}
                                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                                        >
                                            <FaDownload size={12} />
                                            Admit Card
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {student.isImported && student.isPaymentPending && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setCheckoutStudent(student);
                                                            setCheckoutForm({
                                                                waiver: '',
                                                                paymentMethod: 'CASH',
                                                                receivedDate: new Date().toISOString().split('T')[0],
                                                                transactionId: '',
                                                                accountHolderName: '',
                                                                chequeDate: ''
                                                            });
                                                            setCheckoutErrors({});
                                                            setShowPayModal(true);
                                                        }}
                                                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer font-bold"
                                                        title="Pay Now"
                                                    >
                                                        Pay
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetFree(student)}
                                                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold shadow transition-all border border-gray-700 cursor-pointer font-bold"
                                                        title="Set as Free"
                                                    >
                                                        Free
                                                    </button>
                                                </>
                                            )}
                                            
                                            {/* Icon actions */}
                                            <button
                                                onClick={() => handleViewStudent(student)}
                                                className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                                title="View Details"
                                            >
                                                <FaEye size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleEditStudent(student)}
                                                className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                                title="Edit Student"
                                            >
                                                <FaEdit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStudent(student)}
                                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                                title="Delete Student"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ==================== IMPORT MODAL ==================== */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <FaFileExcel className="text-emerald-400 text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Import Students via Excel</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">All imported students will be set as <span className="text-emerald-400 font-medium">Free</span></p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-white transition-colors">
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Template Download */}
                            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                                <p className="text-sm font-semibold text-white mb-1">Step 1 — Download Template</p>
                                <p className="text-xs text-gray-400 mb-3">Download the Excel template with required column headers and sample data.</p>
                                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-3">
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Required Columns</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['Name*', 'Mobile*', 'Class Name*', 'Centre Name*', 'Session Name*', 'ExamTag Name*', 'Course*'].map(col => (
                                            <span key={col} className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded font-mono">{col}</span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-3 mb-2">Optional Columns</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['Email', 'DOB', 'Gender', 'School', 'Guardian Name', 'Guardian Mobile', 'Address', 'City', 'State', 'Pincode', 'Remarks'].map(col => (
                                            <span key={col} className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded font-mono">{col}</span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all"
                                >
                                    <FaDownload className="text-xs" />
                                    Download Template
                                </button>
                            </div>

                            {/* File Upload */}
                            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                                <p className="text-sm font-semibold text-white mb-1">Step 2 — Upload Filled Excel</p>
                                <p className="text-xs text-gray-400 mb-3">Upload your filled Excel file. Roll numbers will be auto-generated per centre and class.</p>
                                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-600 hover:border-emerald-500 rounded-xl p-6 cursor-pointer transition-colors group">
                                    <FaFileExcel className="text-3xl text-gray-500 group-hover:text-emerald-400 transition-colors" />
                                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                        {importFile ? importFile.name : 'Click to select .xlsx file'}
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={e => { setImportFile(e.target.files[0]); setImportResult(null); }}
                                    />
                                </label>
                            </div>

                            {/* Import Result */}
                            {importResult && (
                                <div className={`rounded-xl p-4 border ${importResult.failed === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {importResult.failed === 0
                                            ? <FaCheckCircle className="text-emerald-400" />
                                            : <FaExclamationTriangle className="text-amber-400" />
                                        }
                                        <p className="text-sm font-semibold text-white">{importResult.message}</p>
                                    </div>
                                    <div className="flex gap-4 text-xs mb-2">
                                        <span className="text-emerald-400">✓ {importResult.success} imported</span>
                                        {importResult.failed > 0 && <span className="text-red-400">✗ {importResult.failed} failed</span>}
                                    </div>
                                    {importResult.errors && importResult.errors.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
                                            {importResult.errors.map((err, i) => (
                                                <p key={i} className="text-xs text-red-400 flex items-start gap-1">
                                                    <FaTimesCircle className="mt-0.5 shrink-0" />
                                                    {err}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
                            <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-all border border-gray-700">
                                Close
                            </button>
                            <button
                                onClick={handleImportSubmit}
                                disabled={!importFile || importing}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
                            >
                                {importing ? <FaSpinner className="animate-spin" /> : <FaFileImport />}
                                {importing ? 'Importing...' : 'Import Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== BILL GENERATOR MODAL ==================== */}
            {selectedStudentForBill && (
                <BillGenerator
                    admission={null}
                    installment={null}
                    preloadedBillData={selectedStudentForBill}
                    onClose={() => setSelectedStudentForBill(null)}
                />
            )}

            {/* ==================== ADMIT CARD MODAL ==================== */}
            {showAdmitCard && (
                <PNTSEAdmitCard 
                    student={admitCardStudent} 
                    onClose={() => { setShowAdmitCard(false); setAdmitCardStudent(null); }} 
                />
            )}

            {/* ==================== PAY CHECKOUT MODAL ==================== */}
            {showPayModal && checkoutStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                            <div>
                                <h3 className="text-base font-bold text-white">Process Payment</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{checkoutStudent.name}</p>
                            </div>
                            <button onClick={() => { setShowPayModal(false); setCheckoutStudent(null); }} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
                            {/* Fee Card */}
                            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                                <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                                    <span>Registration Fee</span>
                                    <span>₹ 100.00</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-amber-400 mb-2">
                                    <span>Waiver Amount</span>
                                    <span>− ₹ {Number(checkoutForm.waiver || 0).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-700 pt-2 flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-300">Net Payable</span>
                                    <span className="text-emerald-400">₹ {(100 - Math.max(0, Math.min(100, Number(checkoutForm.waiver || 0)))).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Waiver Input */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Waiver Amount (Rs.)</label>
                                <input
                                    type="number"
                                    value={checkoutForm.waiver}
                                    onChange={e => setCheckoutForm(prev => ({ ...prev, waiver: e.target.value }))}
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                    className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-amber-300 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                />
                                <p className="text-[10px] text-gray-500">Max Rs. 100. Leave empty for no waiver.</p>
                            </div>

                            {/* Payment Method */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Method</label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[
                                        { value: 'CASH', label: 'Cash', icon: '💵' },
                                        { value: 'UPI', label: 'UPI', icon: '📱' },
                                        { value: 'CARD', label: 'Card', icon: '💳' },
                                        { value: 'BANK_TRANSFER', label: 'Bank', icon: '🏦' },
                                        { value: 'CHEQUE', label: 'Cheque', icon: '✍️' }
                                    ].map(m => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => setCheckoutForm(prev => ({ ...prev, paymentMethod: m.value }))}
                                            className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-all border cursor-pointer ${
                                                checkoutForm.paymentMethod === m.value
                                                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-cyan-600/50 hover:text-cyan-300'
                                            }`}
                                        >
                                            <span className="text-base">{m.icon}</span>
                                            <span className="leading-tight">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Received Date */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Received Date *</label>
                                <input
                                    type="date"
                                    value={checkoutForm.receivedDate}
                                    onChange={e => setCheckoutForm(prev => ({ ...prev, receivedDate: e.target.value }))}
                                    className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                />
                                {checkoutErrors.receivedDate && <p className="text-xs text-red-400">{checkoutErrors.receivedDate}</p>}
                            </div>

                            {/* Transaction ID (non-cash) */}
                            {checkoutForm.paymentMethod !== 'CASH' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transaction ID *</label>
                                    <input
                                        type="text"
                                        value={checkoutForm.transactionId}
                                        onChange={e => setCheckoutForm(prev => ({ ...prev, transactionId: e.target.value }))}
                                        placeholder="UTR / Ref / Cheque No."
                                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                    />
                                    {checkoutErrors.transactionId && <p className="text-xs text-red-400">{checkoutErrors.transactionId}</p>}
                                </div>
                            )}

                            {/* Account Holder Name (cheque/bank) */}
                            {['CHEQUE', 'BANK_TRANSFER'].includes(checkoutForm.paymentMethod) && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        {checkoutForm.paymentMethod === 'CHEQUE' ? 'Cheque Holder Name' : 'Account Holder Name'}
                                    </label>
                                    <input
                                        type="text"
                                        value={checkoutForm.accountHolderName}
                                        onChange={e => setCheckoutForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                                        placeholder="Name on cheque / account"
                                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                    />
                                </div>
                            )}

                            {/* Cheque Date */}
                            {checkoutForm.paymentMethod === 'CHEQUE' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cheque Date *</label>
                                    <input
                                        type="date"
                                        value={checkoutForm.chequeDate}
                                        onChange={e => setCheckoutForm(prev => ({ ...prev, chequeDate: e.target.value }))}
                                        className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                    />
                                    {checkoutErrors.chequeDate && <p className="text-xs text-red-400">{checkoutErrors.chequeDate}</p>}
                                </div>
                            )}

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowPayModal(false); setCheckoutStudent(null); }}
                                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold border border-gray-700 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkoutSubmitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {checkoutSubmitting ? <FaSpinner className="animate-spin" /> : 'Pay Now'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ==================== VIEW STUDENT MODAL ==================== */}
            {showViewModal && viewStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 text-left">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                            <div>
                                <h3 className="text-base font-bold text-white">Student Details</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{viewStudent.name} (Roll: {viewStudent.rollNo || 'N/A'})</p>
                            </div>
                            <button onClick={() => { setShowViewModal(false); setViewStudent(null); }} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Personal Info */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Personal Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800/40 p-4 rounded-xl border border-gray-800">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Gender</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.gender || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Date of Birth</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.dob ? new Date(viewStudent.dob).toLocaleDateString() : '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Mobile</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.mobile || '—'}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Email</p>
                                        <p className="text-sm text-gray-200 mt-0.5 truncate">{viewStudent.email || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Academic details */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Academic Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800/40 p-4 rounded-xl border border-gray-800">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Class</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.class?.name || viewStudent.class || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Course</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.course || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Centre</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.centre?.centreName || viewStudent.centre?.enterCode || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Session</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.session?.sessionName || viewStudent.session?.name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Exam Tag</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.examTag?.name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">School Name</p>
                                        <p className="text-sm text-gray-200 mt-0.5 truncate">{viewStudent.school || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian details */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Guardian Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/40 p-4 rounded-xl border border-gray-800">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Guardian Name</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.guardianName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Guardian Mobile</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.guardianMobile || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Address Information</h4>
                                <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-800 space-y-3">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Street Address</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.address || '—'}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">City</p>
                                            <p className="text-sm text-gray-200 mt-0.5">{viewStudent.city || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">State</p>
                                            <p className="text-sm text-gray-200 mt-0.5">{viewStudent.state || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Pincode</p>
                                            <p className="text-sm text-gray-200 mt-0.5">{viewStudent.pincode || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Scores */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Results & Status</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800/40 p-4 rounded-xl border border-gray-800">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Exam Status</p>
                                        <p className="text-sm text-gray-200 mt-0.5">{viewStudent.status || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Score</p>
                                        <p className="text-sm text-gray-200 mt-0.5 font-bold">{viewStudent.score ?? 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Rank</p>
                                        <p className="text-sm text-gray-200 mt-0.5 font-bold text-amber-400">{viewStudent.rank || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Payment Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-800/40 p-4 rounded-xl border border-gray-800">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Payment Type</p>
                                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase mt-1 ${
                                            viewStudent.paymentType === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                            {viewStudent.paymentType}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Amount Paid</p>
                                        <p className="text-sm text-gray-200 mt-0.5 font-semibold">₹ {viewStudent.amountPaid ?? 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Waiver Applied</p>
                                        <p className="text-sm text-gray-200 mt-0.5">₹ {viewStudent.waiver ?? 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Bill ID</p>
                                        <p className="text-xs text-cyan-400 mt-1 font-mono font-bold break-all">{viewStudent.billId || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Remarks */}
                            {viewStudent.remarks && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">Remarks</h4>
                                    <p className="text-sm text-gray-300 bg-gray-800/40 p-4 rounded-xl border border-gray-800 leading-relaxed italic">
                                        "{viewStudent.remarks}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-800 text-right bg-gray-900/60">
                            <button
                                onClick={() => { setShowViewModal(false); setViewStudent(null); }}
                                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold border border-gray-700 transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== EDIT STUDENT MODAL ==================== */}
            {showEditModal && editStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 text-left text-gray-100">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                            <div>
                                <h3 className="text-base font-bold text-white">Edit Student Details</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{editStudent.name}</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setEditStudent(null); }} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleEditSubmit} className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
                            {/* Personal Fields */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Personal Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Student Name *</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                        {editErrors.name && <p className="text-[10px] text-red-400">{editErrors.name}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Mobile *</label>
                                        <input
                                            type="text"
                                            value={editForm.mobile}
                                            onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                        {editErrors.mobile && <p className="text-[10px] text-red-400">{editErrors.mobile}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Email ID</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={editForm.dob ? editForm.dob.split('T')[0] : ''}
                                            onChange={e => setEditForm(p => ({ ...p, dob: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Gender</label>
                                        <select
                                            value={editForm.gender}
                                            onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Select Gender</option>
                                            {genders.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Fields */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Academic details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Class *</label>
                                        <select
                                            value={editForm.class}
                                            onChange={e => setEditForm(p => ({ ...p, class: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Select Class</option>
                                            {dbClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                        {editErrors.class && <p className="text-[10px] text-red-400">{editErrors.class}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Course *</label>
                                        <select
                                            value={editForm.course}
                                            onChange={e => setEditForm(p => ({ ...p, course: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Select Course</option>
                                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        {editErrors.course && <p className="text-[10px] text-red-400">{editErrors.course}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Centre *</label>
                                        <select
                                            value={editForm.centre}
                                            onChange={e => setEditForm(p => ({ ...p, centre: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Select Centre</option>
                                            {dbCentres.map(c => <option key={c._id} value={c._id}>{c.centreName || c.enterCode}</option>)}
                                        </select>
                                        {editErrors.centre && <p className="text-[10px] text-red-400">{editErrors.centre}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Session *</label>
                                        <select
                                            value={editForm.session}
                                            onChange={e => setEditForm(p => ({ ...p, session: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Select Session</option>
                                            {dbSessions.map(s => <option key={s._id} value={s._id}>{s.sessionName}</option>)}
                                        </select>
                                        {editErrors.session && <p className="text-[10px] text-red-400">{editErrors.session}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Exam Tag *</label>
                                        <select
                                            value={editForm.examTag}
                                            onChange={e => setEditForm(p => ({ ...p, examTag: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Select Exam Tag</option>
                                            {dbExamTags.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </select>
                                        {editErrors.examTag && <p className="text-[10px] text-red-400">{editErrors.examTag}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">School Name</label>
                                        <input
                                            type="text"
                                            value={editForm.school}
                                            onChange={e => setEditForm(p => ({ ...p, school: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Fields */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Guardian Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Guardian Name</label>
                                        <input
                                            type="text"
                                            value={editForm.guardianName}
                                            onChange={e => setEditForm(p => ({ ...p, guardianName: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Guardian Mobile</label>
                                        <input
                                            type="text"
                                            value={editForm.guardianMobile}
                                            onChange={e => setEditForm(p => ({ ...p, guardianMobile: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Fields */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Address Info</h4>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Street Address</label>
                                        <input
                                            type="text"
                                            value={editForm.address}
                                            onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-400 font-semibold">City</label>
                                            <input
                                                type="text"
                                                value={editForm.city}
                                                onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-400 font-semibold">State</label>
                                            <input
                                                type="text"
                                                value={editForm.state}
                                                onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))}
                                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-400 font-semibold">Pincode</label>
                                            <input
                                                type="text"
                                                value={editForm.pincode}
                                                onChange={e => setEditForm(p => ({ ...p, pincode: e.target.value }))}
                                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Result Fields */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Status & Scores</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Exam Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                                        >
                                            <option value="">Select Status</option>
                                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Score</label>
                                        <input
                                            type="number"
                                            value={editForm.score}
                                            onChange={e => setEditForm(p => ({ ...p, score: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-400 font-semibold">Rank</label>
                                        <input
                                            type="text"
                                            value={editForm.rank}
                                            onChange={e => setEditForm(p => ({ ...p, rank: e.target.value }))}
                                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-semibold">Remarks</label>
                                <textarea
                                    value={editForm.remarks}
                                    onChange={e => setEditForm(p => ({ ...p, remarks: e.target.value }))}
                                    placeholder="Enter review remarks..."
                                    rows="3"
                                    className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditStudent(null); }}
                                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold border border-gray-700 transition-all cursor-pointer text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {editSubmitting ? <FaSpinner className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PNTSEAllStudentsContent;
