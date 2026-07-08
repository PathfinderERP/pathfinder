import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaDownload, FaFileImport, FaFileExcel,
    FaGraduationCap, FaUsers, FaTrophy, FaChartLine, FaSortUp, FaSortDown,
    FaSpinner, FaTimes, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaFileInvoice
} from 'react-icons/fa';
import BillGenerator from '../Finance/BillGenerator';

const PNTSEAllStudentsContent = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ centre: '', class: '', status: '', session: '' });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    
    // Bill Generation State
    const [selectedStudentForBill, setSelectedStudentForBill] = useState(null);

    const [students, setStudents] = useState([]);
    const [dbCentres, setDbCentres] = useState([]);
    const [dbClasses, setDbClasses] = useState([]);
    const [dbSessions, setDbSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);

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
                const [centresRes, classesRes, sessionsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
                ]);
                if (centresRes.ok) setDbCentres(await centresRes.json());
                if (classesRes.ok) setDbClasses(await classesRes.json());
                if (sessionsRes.ok) {
                    const data = await sessionsRes.json();
                    setDbSessions(Array.isArray(data) ? data : (data.sessions || []));
                }
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

    const stats = [
        { label: 'Total Students', value: students.length, icon: <FaUsers />, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
        { label: 'Qualified', value: students.filter(s => s.status === 'Qualified').length, icon: <FaTrophy />, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10' },
        { label: 'Appeared', value: students.filter(s => s.status === 'Appeared').length, icon: <FaGraduationCap />, color: 'from-amber-500 to-yellow-500', bg: 'bg-amber-500/10' },
        { label: 'Avg. Score', value: students.length > 0 ? `${Math.round(students.reduce((a, b) => a + (b.score || 0), 0) / students.length)}%` : '0%', icon: <FaChartLine />, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
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
                {/* Import Button */}
                <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/25"
                >
                    <FaFileImport />
                    Import Excel
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                <span className={`bg-gradient-to-br ${stat.color} bg-clip-text text-transparent text-xl`}>{stat.icon}</span>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {sortedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-16 text-gray-500">
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
        </div>
    );
};

export default PNTSEAllStudentsContent;
