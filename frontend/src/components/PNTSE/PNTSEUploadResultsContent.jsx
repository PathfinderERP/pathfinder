import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaCloudUploadAlt,
    FaFileExcel,
    FaCheckCircle,
    FaTimesCircle,
    FaSpinner,
    FaTrophy,
    FaUsers,
    FaGraduationCap,
    FaSearch,
    FaBuilding,
    FaArrowLeft,
    FaPlus,
    FaEye,
    FaSync,
    FaCheck,
    FaExclamationTriangle,
    FaMedal,
    FaPercent,
    FaFileAlt
} from 'react-icons/fa';
import PNTSEStudentResultModal from './PNTSEStudentResultModal';

const PNTSEUploadResultsContent = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Active Tab: 'allCentres' | 'centreWise' | 'singleStudent' | 'resultsDirectory'
    const [activeTab, setActiveTab] = useState('allCentres');

    // Centres list
    const [centres, setCentres] = useState([]);
    const [selectedCentre, setSelectedCentre] = useState('');

    // Summary statistics
    const [summary, setSummary] = useState({
        totalStudents: 0,
        studentsWithResults: 0,
        studentsWithoutResults: 0,
        topRankers: []
    });
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Upload state
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResponse, setUploadResponse] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [showUnmatchedList, setShowUnmatchedList] = useState(false);

    // Single student entry state
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [searchingStudent, setSearchingStudent] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [singleStudentResult, setSingleStudentResult] = useState({
        examSet: '',
        totalMarks: '',
        percentage: '',
        centreRank: '',
        air: '',
        subjects: [
            { subjectName: 'SCIENCE', marks: '' },
            { subjectName: 'MATHS', marks: '' },
            { subjectName: 'MAT', marks: '' },
            { subjectName: 'ENGLISH', marks: '' }
        ]
    });
    const [savingSingle, setSavingSingle] = useState(false);
    const [singleSuccessMsg, setSingleSuccessMsg] = useState('');
    const [singleErrorMsg, setSingleErrorMsg] = useState('');

    // Results Directory state
    const [directoryStudents, setDirectoryStudents] = useState([]);
    const [directoryLoading, setDirectoryLoading] = useState(false);
    const [dirSearchQuery, setDirSearchQuery] = useState('');
    const [dirCentreFilter, setDirCentreFilter] = useState('');
    const [modalStudent, setModalStudent] = useState(null);

    const getHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            Authorization: `Bearer ${token}`
        };
    };

    // Fetch summary and centres on load
    useEffect(() => {
        fetchSummary();
        fetchCentres();
    }, []);

    // When Results Directory tab is active, fetch list
    useEffect(() => {
        if (activeTab === 'resultsDirectory') {
            fetchDirectoryStudents();
        }
    }, [activeTab]);

    const fetchSummary = async () => {
        setSummaryLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/pntse/results-summary`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setSummary(data);
            }
        } catch (err) {
            console.error("Failed to fetch results summary:", err);
        } finally {
            setSummaryLoading(false);
        }
    };

    const fetchCentres = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/centres`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : data.centres || [];
                setCentres(list);
            }
        } catch (err) {
            console.error("Failed to fetch centres:", err);
        }
    };

    const fetchDirectoryStudents = async () => {
        setDirectoryLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/pntse/list`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                // Filter only students that have a result or score
                const withResults = Array.isArray(data)
                    ? data.filter(s => s.result && (s.result.totalMarks !== null || s.result.air || s.result.centreRank || (s.result.subjects && s.result.subjects.length > 0)))
                    : [];
                setDirectoryStudents(withResults);
            }
        } catch (err) {
            console.error("Failed to fetch directory students:", err);
        } finally {
            setDirectoryLoading(false);
        }
    };

    // File selection
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadResponse(null);
            setUploadError('');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadResponse(null);
            setUploadError('');
        }
    };

    // Upload Excel
    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadError('Please select an Excel file to upload.');
            return;
        }

        if (activeTab === 'centreWise' && !selectedCentre) {
            setUploadError('Please select a centre for centre-wise upload.');
            return;
        }

        setUploading(true);
        setUploadError('');
        setUploadResponse(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('uploadMode', activeTab === 'centreWise' ? 'centre' : 'all');
            if (activeTab === 'centreWise' && selectedCentre) {
                formData.append('centreId', selectedCentre);
            }

            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/pntse/upload-results`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to upload results');
            }

            setUploadResponse(data);
            fetchSummary();
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            setUploadError(err.message || 'An error occurred during file upload.');
        } finally {
            setUploading(false);
        }
    };

    // Search students for single student entry
    const handleSearchStudent = async (query) => {
        setStudentSearchQuery(query);
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchingStudent(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/pntse/list?search=${encodeURIComponent(query.trim())}`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setSearchResults(Array.isArray(data) ? data.slice(0, 10) : []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingStudent(false);
        }
    };

    const handleSelectStudentForSingleEntry = (student) => {
        setSelectedStudent(student);
        setSearchResults([]);
        setStudentSearchQuery('');
        setSingleSuccessMsg('');
        setSingleErrorMsg('');

        const res = student.result || {};
        setSingleStudentResult({
            examSet: res.examSet || '',
            totalMarks: res.totalMarks !== null && res.totalMarks !== undefined ? res.totalMarks : '',
            percentage: res.percentage !== null && res.percentage !== undefined ? res.percentage : '',
            centreRank: res.centreRank !== null && res.centreRank !== undefined ? res.centreRank : '',
            air: res.air !== null && res.air !== undefined ? res.air : '',
            subjects: res.subjects && res.subjects.length > 0
                ? res.subjects.map(s => ({ subjectName: s.subjectName || '', marks: s.marks !== null && s.marks !== undefined ? s.marks : '' }))
                : [
                    { subjectName: 'SCIENCE', marks: '' },
                    { subjectName: 'MATHS', marks: '' },
                    { subjectName: 'MAT', marks: '' },
                    { subjectName: 'ENGLISH', marks: '' }
                ]
        });
    };

    const handleSingleSubjectChange = (index, field, value) => {
        const updated = [...singleStudentResult.subjects];
        updated[index][field] = value;
        setSingleStudentResult(prev => {
            const next = { ...prev, subjects: updated };
            const numericMarks = updated
                .map(s => Number(s.marks))
                .filter(m => !isNaN(m) && m !== 0);
            if (numericMarks.length > 0) {
                next.totalMarks = numericMarks.reduce((a, b) => a + b, 0);
            }
            return next;
        });
    };

    const handleAddSingleSubject = () => {
        setSingleStudentResult(prev => ({
            ...prev,
            subjects: [...prev.subjects, { subjectName: '', marks: '' }]
        }));
    };

    const handleRemoveSingleSubject = (index) => {
        setSingleStudentResult(prev => ({
            ...prev,
            subjects: prev.subjects.filter((_, i) => i !== index)
        }));
    };

    const handleSaveSingleStudent = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return;

        setSavingSingle(true);
        setSingleSuccessMsg('');
        setSingleErrorMsg('');

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/pntse/save-single-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: selectedStudent._id,
                    examSet: singleStudentResult.examSet,
                    totalMarks: singleStudentResult.totalMarks === '' ? null : Number(singleStudentResult.totalMarks),
                    percentage: singleStudentResult.percentage === '' ? null : Number(singleStudentResult.percentage),
                    centreRank: singleStudentResult.centreRank === '' ? null : Number(singleStudentResult.centreRank),
                    air: singleStudentResult.air === '' ? null : Number(singleStudentResult.air),
                    subjects: singleStudentResult.subjects.filter(s => s.subjectName.trim() !== '').map(s => ({
                        subjectName: s.subjectName.trim().toUpperCase(),
                        marks: s.marks === '' ? null : (!isNaN(Number(s.marks)) ? Number(s.marks) : s.marks)
                    }))
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to save student result');
            }

            setSingleSuccessMsg(`Result saved successfully for ${selectedStudent.name}!`);
            setSelectedStudent(data.student);
            fetchSummary();
        } catch (err) {
            console.error(err);
            setSingleErrorMsg(err.message || 'Failed to save result.');
        } finally {
            setSavingSingle(false);
        }
    };

    // Filter directory students
    const filteredDirectory = directoryStudents.filter(s => {
        const matchesSearch = !dirSearchQuery ||
            s.name?.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
            s.rollNo?.toLowerCase().includes(dirSearchQuery.toLowerCase());
        const matchesCentre = !dirCentreFilter || (s.centre?._id === dirCentreFilter || s.centre === dirCentreFilter);
        return matchesSearch && matchesCentre;
    });

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button
                            onClick={() => navigate('/pntse/all-students')}
                            className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-gray-800 transition-colors cursor-pointer"
                            title="Back to All Students"
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
                            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
                                <FaTrophy size={20} />
                            </span>
                            PNTSE — Upload Student Rank & Results
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 ml-11">
                        Upload Excel file containing students marks & ranks. Matches automatically with PNTSE students by extracting roll number digits.
                    </p>
                </div>

                <div className="flex items-center gap-2 ml-11 sm:ml-0">
                    <button
                        onClick={fetchSummary}
                        disabled={summaryLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold border border-gray-800 transition-all cursor-pointer"
                    >
                        <FaSync className={summaryLoading ? 'animate-spin text-cyan-400' : 'text-gray-400'} />
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate('/pntse/all-students')}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-blue-500/25 cursor-pointer"
                    >
                        View All Students
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 font-medium">Total PNTSE Students</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <FaUsers size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{summary.totalStudents || 0}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Admitted students</p>
                </div>

                <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 font-medium">Results Uploaded</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <FaCheckCircle size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{summary.studentsWithResults || 0}</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                        {summary.totalStudents > 0
                            ? `${((summary.studentsWithResults / summary.totalStudents) * 100).toFixed(1)}% completed`
                            : '0% completed'}
                    </p>
                </div>

                <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 font-medium">Pending Results</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <FaExclamationTriangle size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{summary.studentsWithoutResults || 0}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Awaiting rank/marks upload</p>
                </div>

                <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 font-medium">Top Ranker (AIR 1)</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                            <FaTrophy size={14} />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-cyan-300 truncate">
                        {summary.topRankers?.[0]?.name || '—'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                        {summary.topRankers?.[0]
                            ? `Roll: ${summary.topRankers[0].rollNo} | ${summary.topRankers[0].centre?.centreName || ''}`
                            : 'No rankings yet'}
                    </p>
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-gray-800 mb-6 overflow-x-auto pb-1">
                <button
                    onClick={() => { setActiveTab('allCentres'); setUploadResponse(null); setUploadError(''); }}
                    className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                        activeTab === 'allCentres'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-gray-400 hover:text-white hover:bg-gray-900'
                    }`}
                >
                    <FaCloudUploadAlt size={16} />
                    All Centres Upload
                </button>

                <button
                    onClick={() => { setActiveTab('centreWise'); setUploadResponse(null); setUploadError(''); }}
                    className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                        activeTab === 'centreWise'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-gray-400 hover:text-white hover:bg-gray-900'
                    }`}
                >
                    <FaBuilding size={14} />
                    Centre-Wise Upload
                </button>

                <button
                    onClick={() => { setActiveTab('singleStudent'); }}
                    className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                        activeTab === 'singleStudent'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-gray-400 hover:text-white hover:bg-gray-900'
                    }`}
                >
                    <FaGraduationCap size={15} />
                    Single Student Result
                </button>

                <button
                    onClick={() => { setActiveTab('resultsDirectory'); }}
                    className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                        activeTab === 'resultsDirectory'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-gray-400 hover:text-white hover:bg-gray-900'
                    }`}
                >
                    <FaFileAlt size={14} />
                    Uploaded Results ({summary.studentsWithResults || 0})
                </button>
            </div>

            {/* TAB CONTENT */}

            {/* 1 & 2: Excel Upload (All Centres or Centre Wise) */}
            {(activeTab === 'allCentres' || activeTab === 'centreWise') && (
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8">
                        
                        {/* Centre selection if centre-wise */}
                        {activeTab === 'centreWise' && (
                            <div className="mb-6 p-4 bg-gray-950/60 border border-gray-800 rounded-2xl">
                                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                                    Select Target Centre
                                </label>
                                <select
                                    value={selectedCentre}
                                    onChange={e => setSelectedCentre(e.target.value)}
                                    className="w-full sm:max-w-md px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                                >
                                    <option value="">— Choose a Centre —</option>
                                    {centres.map(c => (
                                        <option key={c._id} value={c._id}>
                                            {c.centreName} {c.enterCode ? `(${c.enterCode})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-500 mt-2">
                                    Matching will only apply to admitted students enrolled in this centre.
                                </p>
                            </div>
                        )}

                        {/* Drag and drop upload zone */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                                selectedFile
                                    ? 'border-cyan-500/50 bg-cyan-950/10'
                                    : 'border-gray-800 hover:border-gray-700 bg-gray-950/40 hover:bg-gray-950/60'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div className="w-16 h-16 rounded-3xl bg-gray-800/80 border border-gray-700/80 mx-auto flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
                                <FaFileExcel size={30} />
                            </div>

                            {selectedFile ? (
                                <div>
                                    <p className="text-base font-bold text-white mb-1">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload
                                    </p>
                                    <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Click or drop another file to replace
                                    </span>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-base font-bold text-white mb-1">
                                        Click to browse or drag & drop your Excel file here
                                    </p>
                                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                                        Accepts multi-sheet or single-sheet workbooks (.xlsx, .xls). System extracts Roll Number digits and matches with admitted students.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Format guide banner */}
                        <div className="mt-6 p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                            <div className="flex items-start gap-3">
                                <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl mt-0.5">
                                    <FaFileAlt size={16} />
                                </span>
                                <div>
                                    <p className="font-semibold text-gray-200">
                                        Expected Columns in Excel File
                                    </p>
                                    <p className="text-gray-400 mt-0.5">
                                        <code className="text-cyan-400">Name</code>, <code className="text-cyan-400">Roll No</code>, <code className="text-cyan-400">Class</code>, <code className="text-cyan-400">Exam Set</code>, Subject columns (<code className="text-cyan-400">SCIENCE</code>, <code className="text-cyan-400">MATHS</code>, <code className="text-cyan-400">MAT</code>, <code className="text-cyan-400">ENGLISH</code>...), <code className="text-cyan-400">Total Marks</code>, <code className="text-cyan-400">Percentage</code>, <code className="text-cyan-400">Centre Rank</code>, <code className="text-cyan-400">AIR</code>.
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-500">
                                Non-matching roll numbers are skipped without error.
                            </span>
                        </div>

                        {/* Error Alert */}
                        {uploadError && (
                            <div className="mt-4 p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-200 text-xs flex items-center gap-3">
                                <FaTimesCircle className="text-base shrink-0 text-red-400" />
                                <div>
                                    <p className="font-semibold">Upload Failed</p>
                                    <p className="text-red-300 mt-0.5">{uploadError}</p>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-6 flex items-center justify-end gap-3">
                            {selectedFile && (
                                <button
                                    onClick={() => { setSelectedFile(null); setUploadResponse(null); }}
                                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <FaSpinner className="animate-spin text-base" />
                                        Processing & Matching Students...
                                    </>
                                ) : (
                                    <>
                                        <FaCloudUploadAlt className="text-lg" />
                                        Upload & Process Results
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Upload Success Report Banner */}
                    {uploadResponse && (
                        <div className="bg-gray-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                        <FaCheckCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {uploadResponse.message}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Processed {uploadResponse.sheetsProcessed?.length || 0} sheet(s): {uploadResponse.sheetsProcessed?.join(', ')}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveTab('resultsDirectory')}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                                >
                                    View Updated Students →
                                </button>
                            </div>

                            {/* Stat highlights */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800">
                                    <p className="text-xs text-gray-400">Total Scanned Rows</p>
                                    <p className="text-2xl font-extrabold text-white mt-1">{uploadResponse.totalRows}</p>
                                </div>
                                <div className="p-4 bg-gray-950/60 rounded-2xl border border-emerald-500/20">
                                    <p className="text-xs text-emerald-400">Matched & Stored</p>
                                    <p className="text-2xl font-extrabold text-emerald-400 mt-1">{uploadResponse.matchedCount}</p>
                                </div>
                                <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800">
                                    <p className="text-xs text-gray-400">Unmatched / Skipped</p>
                                    <p className="text-2xl font-extrabold text-gray-400 mt-1">{uploadResponse.unmatchedCount}</p>
                                </div>
                            </div>

                            {/* Sample Matched Table */}
                            {uploadResponse.sampleMatched && uploadResponse.sampleMatched.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                        Sample Updated Students ({uploadResponse.sampleMatched.length})
                                    </h4>
                                    <div className="overflow-x-auto rounded-2xl border border-gray-800">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-800/80 text-gray-400 uppercase font-semibold">
                                                <tr>
                                                    <th className="px-4 py-3">Student Name</th>
                                                    <th className="px-4 py-3">DB Roll No</th>
                                                    <th className="px-4 py-3">Excel Roll</th>
                                                    <th className="px-4 py-3 text-center">AIR</th>
                                                    <th className="px-4 py-3 text-center">Centre Rank</th>
                                                    <th className="px-4 py-3 text-center">Total Marks</th>
                                                    <th className="px-4 py-3 text-center">Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {uploadResponse.sampleMatched.map((s, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-800/30">
                                                        <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                                                        <td className="px-4 py-3 text-cyan-400 font-mono">{s.rollNo}</td>
                                                        <td className="px-4 py-3 text-gray-400 font-mono">{s.excelRoll}</td>
                                                        <td className="px-4 py-3 text-center font-bold text-amber-400">#{s.air || '—'}</td>
                                                        <td className="px-4 py-3 text-center font-bold text-cyan-400">#{s.centreRank || '—'}</td>
                                                        <td className="px-4 py-3 text-center font-semibold text-white">{s.totalMarks ?? '—'}</td>
                                                        <td className="px-4 py-3 text-center text-emerald-400 font-semibold">{s.percentage ? `${s.percentage}%` : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Unmatched list toggle */}
                            {uploadResponse.unmatchedCount > 0 && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowUnmatchedList(!showUnmatchedList)}
                                        className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>{showUnmatchedList ? 'Hide' : 'Show'} Sample Unmatched Roll Numbers ({uploadResponse.sampleUnmatched?.length || 0})</span>
                                    </button>

                                    {showUnmatchedList && uploadResponse.sampleUnmatched && (
                                        <div className="mt-3 p-4 bg-gray-950/80 rounded-2xl border border-gray-800 max-h-52 overflow-y-auto">
                                            <p className="text-[11px] text-gray-500 mb-2">
                                                These roll numbers were not found in admitted PNTSE students and were skipped as configured:
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                {uploadResponse.sampleUnmatched.map((item, i) => (
                                                    <div key={i} className="p-2 bg-gray-900 rounded-xl border border-gray-800 text-gray-300 truncate">
                                                        <span className="font-mono text-cyan-400">{item.rollNo}</span>
                                                        <span className="block text-[10px] text-gray-500 truncate">{item.name} ({item.sheet})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 3: Single Student Entry */}
            {activeTab === 'singleStudent' && (
                <div className="space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8">
                        <h2 className="text-base font-bold text-white mb-2">
                            Search & Enter Individual Student Result
                        </h2>
                        <p className="text-xs text-gray-400 mb-6">
                            Type student roll number or name to look up their record and record their exam ranks and subject marks.
                        </p>

                        {/* Search input */}
                        <div className="relative max-w-xl mb-4">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                            <input
                                type="text"
                                placeholder="Search student by Name or Roll No (e.g. 1805017, PATH1805017)..."
                                value={studentSearchQuery}
                                onChange={e => handleSearchStudent(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                            />
                            {searchingStudent && (
                                <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" />
                            )}
                        </div>

                        {/* Search Results Dropdown/List */}
                        {searchResults.length > 0 && (
                            <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden mb-6 max-w-xl shadow-2xl">
                                {searchResults.map(s => (
                                    <div
                                        key={s._id}
                                        onClick={() => handleSelectStudentForSingleEntry(s)}
                                        className="p-3.5 hover:bg-gray-800/60 border-b border-gray-800/60 last:border-none flex items-center justify-between cursor-pointer transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-white">{s.name}</p>
                                            <p className="text-xs text-gray-400">
                                                Roll: <span className="text-cyan-400 font-mono">{s.rollNo}</span> | Class: {s.class?.name || 'Class ' + s.course?.replace(/\D/g, '')} | Centre: {s.centre?.centreName}
                                            </p>
                                        </div>
                                        <button className="px-3 py-1 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold">
                                            Select
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Selected Student Profile & Entry Form */}
                        {selectedStudent ? (
                            <form onSubmit={handleSaveSingleStudent} className="space-y-6 pt-4 border-t border-gray-800">
                                
                                {singleSuccessMsg && (
                                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs flex items-center gap-2">
                                        <FaCheck /> {singleSuccessMsg}
                                    </div>
                                )}
                                {singleErrorMsg && (
                                    <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-200 text-xs flex items-center gap-2">
                                        <FaTimesCircle /> {singleErrorMsg}
                                    </div>
                                )}

                                {/* Selected Student Banner */}
                                <div className="p-5 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                                            Selected Student
                                        </span>
                                        <h3 className="text-lg font-bold text-white mt-0.5">
                                            {selectedStudent.name}
                                        </h3>
                                        <p className="text-xs text-gray-300 mt-1">
                                            <strong>Roll No:</strong> <span className="font-mono text-cyan-300">{selectedStudent.rollNo}</span> | <strong>Centre:</strong> {selectedStudent.centre?.centreName || selectedStudent.centre?.enterCode} | <strong>Class:</strong> {selectedStudent.class?.name}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                        Change Student
                                    </button>
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">AIR (All India Rank)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 25"
                                            value={singleStudentResult.air}
                                            onChange={e => setSingleStudentResult({ ...singleStudentResult, air: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Centre Rank</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 1"
                                            value={singleStudentResult.centreRank}
                                            onChange={e => setSingleStudentResult({ ...singleStudentResult, centreRank: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Total Marks</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 78"
                                            value={singleStudentResult.totalMarks}
                                            onChange={e => setSingleStudentResult({ ...singleStudentResult, totalMarks: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Percentage (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g. 78.00"
                                            value={singleStudentResult.percentage}
                                            onChange={e => setSingleStudentResult({ ...singleStudentResult, percentage: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Exam Set</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. A"
                                            value={singleStudentResult.examSet}
                                            onChange={e => setSingleStudentResult({ ...singleStudentResult, examSet: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white uppercase focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Subject Marks */}
                                <div className="p-5 bg-gray-950/60 border border-gray-800 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                                            Subject Marks
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={handleAddSingleSubject}
                                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                                        >
                                            <FaPlus size={10} /> Add Subject
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {singleStudentResult.subjects.map((sub, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-900/60 p-2 rounded-xl border border-gray-800">
                                                <input
                                                    type="text"
                                                    placeholder="Subject Name"
                                                    value={sub.subjectName}
                                                    onChange={e => handleSingleSubjectChange(i, 'subjectName', e.target.value)}
                                                    className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white uppercase focus:outline-none focus:border-cyan-500"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Marks"
                                                    value={sub.marks}
                                                    onChange={e => handleSingleSubjectChange(i, 'marks', e.target.value)}
                                                    className="w-24 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSingleSubject(i)}
                                                    className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                                                >
                                                    <FaTimesCircle size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="submit"
                                        disabled={savingSingle}
                                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {savingSingle ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                        Save Student Result
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <FaGraduationCap className="text-4xl mx-auto mb-2 opacity-30" />
                                <p className="text-xs">No student selected yet. Use the search bar above to begin.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4: Uploaded Results Directory */}
            {activeTab === 'resultsDirectory' && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Filter by name or roll number..."
                                    value={dirSearchQuery}
                                    onChange={e => setDirSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <select
                                value={dirCentreFilter}
                                onChange={e => setDirCentreFilter(e.target.value)}
                                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                            >
                                <option value="">All Centres</option>
                                {centres.map(c => (
                                    <option key={c._id} value={c._id}>{c.centreName}</option>
                                ))}
                            </select>
                        </div>

                        <span className="text-xs text-gray-400">
                            Showing <strong>{filteredDirectory.length}</strong> record(s)
                        </span>
                    </div>

                    {/* Table */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        {directoryLoading ? (
                            <div className="py-16 text-center text-gray-400 flex items-center justify-center gap-2">
                                <FaSpinner className="animate-spin text-cyan-400 text-xl" />
                                Loading results...
                            </div>
                        ) : filteredDirectory.length === 0 ? (
                            <div className="py-16 text-center text-gray-500">
                                <FaTrophy className="text-3xl mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No results found matching current criteria</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-800/80 text-gray-400 uppercase font-semibold">
                                        <tr>
                                            <th className="px-4 py-3.5">Sl.</th>
                                            <th className="px-4 py-3.5">Student Name</th>
                                            <th className="px-4 py-3.5">Roll No</th>
                                            <th className="px-4 py-3.5">Class</th>
                                            <th className="px-4 py-3.5">Centre</th>
                                            <th className="px-4 py-3.5 text-center">AIR</th>
                                            <th className="px-4 py-3.5 text-center">Centre Rank</th>
                                            <th className="px-4 py-3.5 text-center">Total Marks</th>
                                            <th className="px-4 py-3.5 text-center">Percentage</th>
                                            <th className="px-4 py-3.5 text-center">Result Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {filteredDirectory.map((st, i) => (
                                            <tr key={st._id} className="hover:bg-gray-800/40 transition-colors">
                                                <td className="px-4 py-3.5 text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-3.5 font-semibold text-white">{st.name}</td>
                                                <td className="px-4 py-3.5 font-mono text-cyan-400">{st.rollNo}</td>
                                                <td className="px-4 py-3.5 text-gray-300">{st.class?.name || 'Class ' + st.course?.replace(/\D/g, '')}</td>
                                                <td className="px-4 py-3.5 text-gray-300">{st.centre?.centreName || st.centre?.enterCode}</td>
                                                <td className="px-4 py-3.5 text-center font-bold text-amber-400">
                                                    {st.result?.air ? `#${st.result.air}` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center font-bold text-cyan-400">
                                                    {st.result?.centreRank ? `#${st.result.centreRank}` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center font-semibold text-white">
                                                    {st.result?.totalMarks ?? st.score ?? '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center font-semibold text-emerald-400">
                                                    {st.result?.percentage ? `${st.result.percentage}%` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <button
                                                        onClick={() => setModalStudent(st)}
                                                        className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
                                                    >
                                                        <FaEye size={11} /> Student Result
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal for student result */}
            {modalStudent && (
                <PNTSEStudentResultModal
                    student={modalStudent}
                    onClose={() => setModalStudent(null)}
                    onResultUpdated={(updatedStudent) => {
                        setModalStudent(updatedStudent);
                        fetchSummary();
                        if (activeTab === 'resultsDirectory') {
                            fetchDirectoryStudents();
                        }
                    }}
                />
            )}
        </div>
    );
};

export default PNTSEUploadResultsContent;
