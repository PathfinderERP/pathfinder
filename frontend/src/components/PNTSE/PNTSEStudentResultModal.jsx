import React, { useState } from 'react';
import {
    FaTimes,
    FaTrophy,
    FaMedal,
    FaChartLine,
    FaPercent,
    FaBookOpen,
    FaPrint,
    FaEdit,
    FaTrash,
    FaPlus,
    FaCheck,
    FaSpinner,
    FaExclamationCircle,
    FaInfoCircle,
    FaGraduationCap
} from 'react-icons/fa';
import PNTSEReportCardModal from './PNTSEReportCardModal';

const PNTSEStudentResultModal = ({
    student,
    onClose,
    onResultUpdated,
    canEdit = true
}) => {
    if (!student) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [showReportCardModal, setShowReportCardModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const currentResult = student.result || {};
    const hasResult = Boolean(
        currentResult && (
            (currentResult.totalMarks !== null && currentResult.totalMarks !== undefined) ||
            currentResult.air ||
            currentResult.centreRank ||
            (currentResult.subjects && currentResult.subjects.length > 0)
        )
    );

    const NON_SUBJECT_NAMES = new Set([
        'centre', 'center', 'centre name', 'center name', 'centre_name', 'center_name', 'centre code', 'center code',
        'zone', 'zone name', 'school', 'board', 'session', 'course',
        'roll', 'roll no', 'rollno', 'roll number', 'name', 'student name', 'class', 'set', 'exam set',
        'total', 'total marks', 'totalmarks', 'percentage', 'percent', 'air', 'cr', 'centre rank', 'center rank'
    ]);

    const validModalSubjects = (currentResult.subjects || []).filter(s => {
        const name = String(s.subjectName || '').trim().toLowerCase();
        return name && !NON_SUBJECT_NAMES.has(name);
    });

    // Form state for editing or entering result
    const [formData, setFormData] = useState({
        examSet: currentResult.examSet || '',
        totalMarks: currentResult.totalMarks !== null && currentResult.totalMarks !== undefined ? currentResult.totalMarks : '',
        percentage: currentResult.percentage !== null && currentResult.percentage !== undefined ? currentResult.percentage : '',
        centreRank: currentResult.centreRank !== null && currentResult.centreRank !== undefined ? currentResult.centreRank : '',
        air: currentResult.air !== null && currentResult.air !== undefined ? currentResult.air : '',
        subjects: validModalSubjects.length > 0
            ? validModalSubjects.map(s => ({ subjectName: s.subjectName || '', marks: s.marks !== null && s.marks !== undefined ? s.marks : '' }))
            : [
                { subjectName: 'SCIENCE', marks: '' },
                { subjectName: 'MATHS', marks: '' },
                { subjectName: 'MAT', marks: '' },
                { subjectName: 'ENGLISH', marks: '' }
            ]
    });

    const [showRawFields, setShowRawFields] = useState(false);

    // Auto-calculate Total Marks and Percentage if subjects are changed
    const handleSubjectChange = (index, field, value) => {
        const updated = [...formData.subjects];
        updated[index][field] = value;
        setFormData(prev => {
            const next = { ...prev, subjects: updated };
            // Calculate sum of numeric marks
            const numericMarks = updated
                .map(s => Number(s.marks))
                .filter(m => !isNaN(m) && m !== 0);
            if (numericMarks.length > 0) {
                const total = numericMarks.reduce((a, b) => a + b, 0);
                next.totalMarks = total;
            }
            return next;
        });
    };

    const handleAddSubject = () => {
        setFormData(prev => ({
            ...prev,
            subjects: [...prev.subjects, { subjectName: '', marks: '' }]
        }));
    };

    const handleRemoveSubject = (index) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.filter((_, i) => i !== index)
        }));
    };

    const handleSaveResult = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/save-single-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: student._id,
                    examSet: formData.examSet,
                    totalMarks: formData.totalMarks === '' ? null : Number(formData.totalMarks),
                    percentage: formData.percentage === '' ? null : Number(formData.percentage),
                    centreRank: formData.centreRank === '' ? null : Number(formData.centreRank),
                    air: formData.air === '' ? null : Number(formData.air),
                    subjects: formData.subjects.filter(s => s.subjectName.trim() !== '').map(s => ({
                        subjectName: s.subjectName.trim().toUpperCase(),
                        marks: s.marks === '' ? null : (!isNaN(Number(s.marks)) ? Number(s.marks) : s.marks)
                    }))
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to save student result');
            }

            setSuccessMsg('Result saved successfully!');
            setIsEditing(false);
            if (onResultUpdated) {
                onResultUpdated(data.student);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'An error occurred while saving result.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteResult = async () => {
        if (!window.confirm("Are you sure you want to remove this student's result?")) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/pntse/${student._id}/result`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete result');
            }
            if (onResultUpdated) {
                onResultUpdated({ ...student, result: undefined, score: 0, rank: null });
            }
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to delete result.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        setShowReportCardModal(true);
    };

    // Get list of raw excel fields if any
    const rawFieldsObj = currentResult.allFields
        ? (currentResult.allFields instanceof Map ? Object.fromEntries(currentResult.allFields) : currentResult.allFields)
        : {};
    const rawFieldKeys = Object.keys(rawFieldsObj);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-8 print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white">
                
                {/* Header Banner */}
                <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-900 px-6 py-5 text-white flex items-start justify-between border-b border-indigo-800/40 print:bg-white print:text-black print:border-b print:border-gray-300">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 print:border-gray-400 print:text-black">
                                PNTSE Result Card
                            </span>
                            {currentResult.examSet && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 print:text-black">
                                    Set {currentResult.examSet}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white print:text-black flex items-center gap-2">
                            {student.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-200 mt-1 print:text-gray-700">
                            <span><strong>Roll No:</strong> <span className="text-cyan-300 font-mono font-semibold print:text-black">{student.rollNo}</span></span>
                            <span><strong>Class:</strong> {student.class?.name || 'Class ' + student.course?.replace(/\D/g, '')}</span>
                            <span><strong>Centre:</strong> {student.centre?.centreName || student.centre?.enterCode}</span>
                            {student.school && <span><strong>School:</strong> {student.school}</span>}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 print:hidden">
                        {hasResult && !isEditing && (
                            <button
                                onClick={handlePrint}
                                className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm"
                                title="Print Result Card"
                            >
                                <FaPrint size={14} />
                            </button>
                        )}
                        {canEdit && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-amber-400 hover:text-amber-300 transition-all cursor-pointer shadow-sm"
                                title="Edit Result"
                            >
                                <FaEdit size={14} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-all cursor-pointer shadow-sm"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
                            <FaExclamationCircle />
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                            <FaCheck />
                            {successMsg}
                        </div>
                    )}

                    {isEditing ? (
                        /* Edit Form */
                        <form onSubmit={handleSaveResult} className="space-y-5">
                            <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-800 space-y-4">
                                <h3 className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">
                                    Overall Ranks & Scores
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">All India Rank (AIR)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 25"
                                            value={formData.air}
                                            onChange={e => setFormData({ ...formData, air: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Centre Rank</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 1"
                                            value={formData.centreRank}
                                            onChange={e => setFormData({ ...formData, centreRank: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Total Marks</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 78"
                                            value={formData.totalMarks}
                                            onChange={e => setFormData({ ...formData, totalMarks: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Percentage (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g. 78.00"
                                            value={formData.percentage}
                                            onChange={e => setFormData({ ...formData, percentage: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Exam Set</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. A"
                                            value={formData.examSet}
                                            onChange={e => setFormData({ ...formData, examSet: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white uppercase focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subject Marks */}
                            <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">
                                        Subject-wise Marks
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddSubject}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                        <FaPlus size={10} /> Add Subject
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.subjects.map((sub, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Subject Name (e.g. SCIENCE)"
                                                value={sub.subjectName}
                                                onChange={e => handleSubjectChange(i, 'subjectName', e.target.value)}
                                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white uppercase focus:outline-none focus:border-cyan-500"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Marks"
                                                value={sub.marks}
                                                onChange={e => handleSubjectChange(i, 'marks', e.target.value)}
                                                className="w-28 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSubject(i)}
                                                className="p-2 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                                                title="Remove Subject"
                                            >
                                                <FaTimes size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                    Save Result
                                </button>
                            </div>
                        </form>
                    ) : hasResult ? (
                        /* Results Presentation Card */
                        <div className="space-y-6">
                            
                            {/* Key Metrics 4-Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {/* AIR */}
                                <div className="bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-gray-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 print:text-black">All India Rank</span>
                                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center print:hidden">
                                            <FaTrophy size={14} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-extrabold text-white print:text-black">
                                            {currentResult.air ? `#${currentResult.air}` : '—'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-1 print:text-gray-600">AIR Ranking</p>
                                    </div>
                                </div>

                                {/* Centre Rank */}
                                <div className="bg-gradient-to-br from-cyan-950/40 via-cyan-900/20 to-gray-900 border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 print:text-black">Centre Rank</span>
                                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center print:hidden">
                                            <FaMedal size={14} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-extrabold text-white print:text-black">
                                            {currentResult.centreRank ? `#${currentResult.centreRank}` : '—'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-1 print:text-gray-600">In {student.centre?.centreName || 'Centre'}</p>
                                    </div>
                                </div>

                                {/* Total Marks */}
                                <div className="bg-gradient-to-br from-blue-950/40 via-blue-900/20 to-gray-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 print:text-black">Total Marks</span>
                                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center print:hidden">
                                            <FaChartLine size={14} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-extrabold text-white print:text-black">
                                            {currentResult.totalMarks !== null && currentResult.totalMarks !== undefined ? currentResult.totalMarks : '—'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-1 print:text-gray-600">Marks Scored</p>
                                    </div>
                                </div>

                                {/* Percentage */}
                                <div className="bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-gray-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between print:border-gray-300 print:bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 print:text-black">Percentage</span>
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center print:hidden">
                                            <FaPercent size={13} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-extrabold text-white print:text-black">
                                            {currentResult.percentage !== null && currentResult.percentage !== undefined
                                                ? `${Number(currentResult.percentage).toFixed(2)}%`
                                                : '—'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-1 print:text-gray-600">Overall Score</p>
                                    </div>
                                </div>
                            </div>

                            {/* Subject Wise Performance */}
                            {validModalSubjects.length > 0 && (
                                <div className="bg-gray-950/50 border border-gray-800 rounded-2xl p-5 print:border-gray-300 print:bg-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 print:text-black flex items-center gap-2">
                                            <FaBookOpen className="text-cyan-400" />
                                            Subject-wise Breakdown
                                        </h3>
                                        <span className="text-xs text-gray-500">
                                            {validModalSubjects.length} subject(s)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {validModalSubjects.map((sub, i) => (
                                            <div
                                                key={i}
                                                className="bg-gray-900/90 border border-gray-800/80 rounded-xl p-3.5 flex items-center justify-between print:border-gray-300 print:bg-gray-50"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-gray-200 uppercase print:text-black">
                                                        {sub.subjectName}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 print:text-gray-600">
                                                        Subject Score
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-cyan-400 print:text-black">
                                                        {sub.marks !== null && sub.marks !== undefined ? sub.marks : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Expandable Raw Excel Fields */}
                            {rawFieldKeys.length > 0 && (
                                <div className="border border-gray-800 rounded-2xl overflow-hidden print:hidden">
                                    <button
                                        type="button"
                                        onClick={() => setShowRawFields(!showRawFields)}
                                        className="w-full px-5 py-3 bg-gray-900/70 hover:bg-gray-900 flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <span className="flex items-center gap-2">
                                            <FaInfoCircle className="text-indigo-400" />
                                            All Excel Metadata Fields ({rawFieldKeys.length})
                                        </span>
                                        <span className="text-xs font-semibold text-cyan-400">
                                            {showRawFields ? 'Hide' : 'View Details'}
                                        </span>
                                    </button>

                                    {showRawFields && (
                                        <div className="p-4 bg-gray-950/80 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
                                            {rawFieldKeys.map(key => (
                                                <div key={key} className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-800/60">
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate">{key}</p>
                                                    <p className="text-xs font-semibold text-gray-200 mt-0.5 truncate">
                                                        {String(rawFieldsObj[key] ?? '—')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 print:hidden">
                                <div>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteResult}
                                            disabled={loading}
                                            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <FaTrash size={11} /> Clear Result
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                                    >
                                        <FaPrint size={12} /> Print Official Report Card
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Empty state: No result uploaded */
                        <div className="text-center py-10 px-4">
                            <div className="w-16 h-16 rounded-3xl bg-gray-800 border border-gray-700 mx-auto flex items-center justify-center text-gray-500 mb-4 shadow-inner">
                                <FaGraduationCap size={28} />
                            </div>
                            <h3 className="text-base font-bold text-white mb-1">
                                No Result Uploaded Yet
                            </h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
                                Results have not been uploaded for student <strong>{student.name}</strong> (Roll: {student.rollNo}).
                            </p>

                            {canEdit && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 mx-auto cursor-pointer"
                                >
                                    <FaPlus size={12} />
                                    Enter Result Manually
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Official Report Card Modal for Print / PDF */}
            {showReportCardModal && (
                <PNTSEReportCardModal
                    student={student}
                    onClose={() => setShowReportCardModal(false)}
                />
            )}
        </div>
    );
};

export default PNTSEStudentResultModal;
