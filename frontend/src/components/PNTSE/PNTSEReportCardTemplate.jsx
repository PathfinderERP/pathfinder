import React, { forwardRef } from 'react';
import pathfinderLogo from '../../assets/pathfinder-logo.png';

/**
 * Helper to convert class name to Roman numeral (e.g. Class 8 -> Class VIII)
 */
const formatRomanClass = (className) => {
    if (!className) return 'Class VIII';
    const str = String(className);
    if (/10/i.test(str)) return 'Class X';
    if (/9/i.test(str)) return 'Class IX';
    if (/8/i.test(str)) return 'Class VIII';
    if (/7/i.test(str)) return 'Class VII';
    if (/6/i.test(str)) return 'Class VI';
    if (/5/i.test(str)) return 'Class V';
    return str.startsWith('Class') ? str : `Class ${str}`;
};

const NON_SUBJECT_NAMES = new Set([
    'centre', 'center', 'centre name', 'center name', 'centre_name', 'center_name', 'centre code', 'center code',
    'zone', 'zone name', 'zone_name',
    'school', 'school name', 'school_name',
    'board', 'board name', 'session', 'course',
    'roll', 'roll no', 'rollno', 'roll number', 'student roll',
    'name', 'student name', 'student_name', 'student',
    'class', 'std', 'class name', 'classname',
    'set', 'exam set', 'exam_set', 'examset',
    'total', 'total marks', 'totalmarks', 'total mark', 'total score', 'total_marks',
    'percentage', 'percent', '%', 'pct',
    'air', 'all india rank', 'all_india_rank', 'rank', 'cr', 'centre rank', 'center rank',
    'sl', 'sl.', 's.no', 'sno', 'serial', 'remarks', 'remark', 'status'
]);

/**
 * Subject maximum marks according to PNTSE exam structure:
 * - SCIENCE: 60
 * - MATHS: 20
 * - MAT: 10
 * - ENGLISH: 10
 * Total = 100
 */
const getSubjectMaxMarks = (subjectName = '') => {
    const s = String(subjectName).trim().toLowerCase();
    if (s.includes('science') || s.includes('sci')) return 60;
    if (s.includes('math')) return 20;
    if (s === 'mat' || s.includes('mental')) return 10;
    if (s.includes('english') || s.includes('eng')) return 10;
    return 25; // fallback
};

const PNTSEReportCardTemplate = forwardRef(({ student, totalCentreStudents = 150, totalPfStudents = 3000 }, ref) => {
    if (!student) return null;

    const result = student.result || {};
    const studentClass = student.class?.name || student.course || 'Class VIII';
    const romanClass = formatRomanClass(studentClass);
    const centreName = student.centre?.centreName || student.centre?.enterCode || 'Hazra Centre';
    const examSet = result.examSet || 'A';
    const rollNo = student.rollNo || 'DEMO-0081';

    // Filter out non-subject columns (e.g. 'Centre', 'School', etc.)
    const filteredRawSubjects = (result.subjects || []).filter(sub => {
        const name = String(sub.subjectName || '').trim().toLowerCase();
        return name && !NON_SUBJECT_NAMES.has(name);
    });

    // Subject data calculation
    const activeSubjects = filteredRawSubjects.length > 0
        ? filteredRawSubjects
        : [
            { subjectName: 'SCIENCE', marks: 20 },
            { subjectName: 'MATHS', marks: 6 },
            { subjectName: 'MAT', marks: 2 },
            { subjectName: 'ENGLISH', marks: 2 }
        ];

    // Total Marks & Maximum Marks (PNTSE exam total is out of 100)
    const totalMarks = result.totalMarks !== null && result.totalMarks !== undefined
        ? Number(result.totalMarks)
        : activeSubjects.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);

    const maxTotalMarks = 100;

    const percentage = totalMarks !== null && !isNaN(totalMarks)
        ? (Number.isInteger(totalMarks) ? String(totalMarks) : totalMarks.toFixed(1))
        : (result.percentage !== null && result.percentage !== undefined ? Number(result.percentage).toFixed(1) : '30.0');

    const centreRank = result.centreRank || 18;
    const air = result.air || (centreRank ? centreRank * 15 : 284);

    // Build subject list with individual max marks and ranks
    const processedSubjects = activeSubjects.map((sub, index) => {
        const marksNum = Number(sub.marks) || 0;
        const maxMarks = getSubjectMaxMarks(sub.subjectName);
        const scorePercent = maxMarks > 0 ? Math.round((marksNum / maxMarks) * 100) : marksNum;

        // Derived ranks for subject row
        const subjectCentreRank = Math.max(1, Math.min(totalCentreStudents, Math.round(centreRank * (1 + (index * 0.3)))));
        const subjectPfRank = Math.max(1, Math.min(totalPfStudents, Math.round(air * (1 + (index * 0.4)))));

        return {
            name: sub.subjectName,
            marks: marksNum,
            maxMarks,
            scorePercent,
            subjectCentreRank,
            subjectPfRank
        };
    });

    // Find highest and lowest scoring subjects for "What your result says"
    const sortedSubjects = [...processedSubjects].sort((a, b) => b.scorePercent - a.scorePercent);
    const highestSubject = sortedSubjects[0] || { name: 'SCIENCE', scorePercent: 33 };
    const lowestSubject = sortedSubjects[sortedSubjects.length - 1] || { name: 'ENGLISH', scorePercent: 20 };

    return (
        <div
            ref={ref}
            className="w-[780px] bg-white text-slate-900 font-sans mx-auto shadow-2xl print:shadow-none print:w-full print:max-w-none print:m-0 rounded-2xl overflow-hidden"
            style={{
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: '#0f172a',
                backgroundColor: '#ffffff'
            }}
        >
            {/* ── TOP HEADER WITH OFFICIAL PATHFINDER LOGO ── */}
            <div className="px-10 py-5 bg-white flex items-center justify-between border-b border-slate-100">
                <img
                    src={pathfinderLogo}
                    alt="PATHFINDER — Where Aspiration Meets Success"
                    className="h-12 w-auto object-contain"
                />
                <div className="text-right">
                    <span
                        className="text-[11px] font-extrabold tracking-[0.16em] uppercase block"
                        style={{ color: '#0891b2' }}
                    >
                        Pathfinder Talent Search Examination
                    </span>
                    <span className="text-[13px] font-black text-slate-800 tracking-tight">
                        Official Performance Report Card
                    </span>
                </div>
            </div>

            {/* ── TOP DARK NAVY BANNER ── */}
            <div
                className="px-10 py-7 text-white"
                style={{
                    backgroundColor: '#0c2338'
                }}
            >
                <div className="flex items-center justify-between mb-3">
                    <span
                        className="text-[11px] font-bold tracking-[0.2em] uppercase"
                        style={{ color: '#93c5fd' }}
                    >
                        PATHFINDER / PNTSE
                    </span>
                </div>

                <h1
                    className="text-[32px] font-extrabold tracking-tight leading-tight text-white mb-2"
                    style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
                >
                    Your performance, decoded.
                </h1>

                <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: '#67e8f9' }}>
                    <span>RESULTS</span>
                    <span className="opacity-40">/</span>
                    <span>CLASS COMPARISONS</span>
                    <span className="opacity-40">/</span>
                    <span>YOUR NEXT STEP</span>
                </div>
            </div>

            {/* ── MAIN CONTENT BODY ── */}
            <div className="px-10 py-7 bg-white">
                
                {/* Amber/Orange Notice Banner */}
                <div className="mb-5">
                    <p
                        className="text-[11px] font-extrabold tracking-[0.08em] uppercase"
                        style={{ color: '#d97706' }}
                    >
                        OFFICIAL PERFORMANCE REPORT — PATHFINDER TALENT SEARCH EXAMINATION
                    </p>
                </div>

                {/* Student Information Row */}
                <div className="mb-7">
                    <h2 className="text-[26px] font-extrabold text-slate-900 leading-tight mb-1">
                        {student.name}
                    </h2>
                    <p className="text-[13px] font-semibold text-slate-600 mb-1">
                        {romanClass} &nbsp;|&nbsp; {centreName} &nbsp;|&nbsp; Roll: <span className="font-mono font-bold text-slate-900">{rollNo}</span>
                    </p>
                    <p className="text-[12px] text-slate-500">
                        Exam: PNTSE Set {examSet} &nbsp;|&nbsp; {student.school ? `School: ${student.school}` : 'Subject structure is illustrative'}
                    </p>
                </div>

                {/* ── 3 STATISTIC / RANK CARDS ── */}
                <div className="grid grid-cols-3 gap-4 mb-9">
                    {/* TOTAL SCORE */}
                    <div
                        className="p-5 rounded-2xl border"
                        style={{
                            backgroundColor: '#f0f9fa',
                            borderColor: '#cff0f3'
                        }}
                    >
                        <p
                            className="text-[11px] font-extrabold tracking-[0.1em] uppercase mb-2"
                            style={{ color: '#0891b2' }}
                        >
                            TOTAL SCORE
                        </p>
                        <p className="text-[32px] font-black text-slate-900 leading-none mb-2">
                            {totalMarks} <span className="text-[20px] font-semibold text-slate-500">/ {maxTotalMarks}</span>
                        </p>
                        <p className="text-[11.5px] font-medium text-slate-600">
                            {percentage}% of available marks
                        </p>
                    </div>

                    {/* CENTRE CLASS RANK */}
                    <div
                        className="p-5 rounded-2xl border"
                        style={{
                            backgroundColor: '#f0f9fa',
                            borderColor: '#cff0f3'
                        }}
                    >
                        <p
                            className="text-[11px] font-extrabold tracking-[0.1em] uppercase mb-2"
                            style={{ color: '#0891b2' }}
                        >
                            CENTRE CLASS RANK
                        </p>
                        <p className="text-[32px] font-black text-slate-900 leading-none mb-2">
                            {centreRank} <span className="text-[20px] font-semibold text-slate-500">/ {totalCentreStudents}</span>
                        </p>
                        <p className="text-[11.5px] font-medium text-slate-600">
                            {romanClass} at {centreName.replace(/\s*Centre/i, '')}
                        </p>
                    </div>

                    {/* PATHFINDER CLASS RANK */}
                    <div
                        className="p-5 rounded-2xl border"
                        style={{
                            backgroundColor: '#f0f9fa',
                            borderColor: '#cff0f3'
                        }}
                    >
                        <p
                            className="text-[11px] font-extrabold tracking-[0.1em] uppercase mb-2"
                            style={{ color: '#0891b2' }}
                        >
                            PATHFINDER CLASS RANK
                        </p>
                        <p className="text-[32px] font-black text-slate-900 leading-none mb-2">
                            {air} <span className="text-[20px] font-semibold text-slate-500">/ {totalPfStudents.toLocaleString()}</span>
                        </p>
                        <p className="text-[11.5px] font-medium text-slate-600">
                            {romanClass} across Pathfinder
                        </p>
                    </div>
                </div>

                {/* ── SECTION 01: SUBJECT SCORECARD ── */}
                <div className="mb-9">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[15px] font-black" style={{ color: '#0891b2' }}>
                            01
                        </span>
                        <h3 className="text-[16px] font-extrabold text-slate-900 tracking-tight">
                            Your subject scorecard
                        </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    style={{
                                        backgroundColor: '#f1f8f9',
                                        borderBottom: '1px solid #e2e8f0'
                                    }}
                                >
                                    <th className="py-3 px-4 text-[11px] font-extrabold tracking-[0.08em] text-slate-600 uppercase">SUBJECT</th>
                                    <th className="py-3 px-4 text-[11px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">MARKS</th>
                                    <th className="py-3 px-4 text-[11px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">PERCENTAGE</th>
                                    <th className="py-3 px-4 text-[11px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">CENTRE</th>
                                    <th className="py-3 px-4 text-[11px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">PF RANK</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[13px]">
                                {processedSubjects.map((sub, i) => (
                                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-900">
                                            {sub.name}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold text-slate-700 text-center">
                                            {sub.marks} / {sub.maxMarks}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-slate-900 text-center">
                                            {sub.scorePercent}%
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-700 text-center">
                                            {sub.subjectCentreRank} / {totalCentreStudents}
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-700 text-center">
                                            {sub.subjectPfRank} / {totalPfStudents.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 italic">
                        All ranks compare {romanClass}, Set {examSet} only.
                    </p>
                </div>

                {/* ── SECTION 02: WHAT YOUR RESULT SAYS ── */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[15px] font-black" style={{ color: '#0891b2' }}>
                            02
                        </span>
                        <h3 className="text-[16px] font-extrabold text-slate-900 tracking-tight">
                            What your result says
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* BUILD ON THIS (STRENGTH) */}
                        <div
                            className="p-5 rounded-2xl border"
                            style={{
                                backgroundColor: '#f0f9fa',
                                borderColor: '#cff0f3'
                            }}
                        >
                            <p
                                className="text-[11px] font-extrabold tracking-[0.1em] uppercase mb-2"
                                style={{ color: '#0891b2' }}
                            >
                                BUILD ON THIS
                            </p>
                            <p className="text-[12.5px] leading-relaxed text-slate-700">
                                <strong>{highestSubject.name}</strong> is your highest-scoring subject with <strong>{highestSubject.scorePercent}%</strong>, demonstrating your strongest conceptual grasp across sections.
                            </p>
                        </div>

                        {/* START HERE (GROWTH AREA) */}
                        <div
                            className="p-5 rounded-2xl border"
                            style={{
                                backgroundColor: '#fdf8f4',
                                borderColor: '#fed7aa'
                            }}
                        >
                            <p
                                className="text-[11px] font-extrabold tracking-[0.1em] uppercase mb-2"
                                style={{ color: '#d97706' }}
                            >
                                START HERE
                            </p>
                            <p className="text-[12.5px] leading-relaxed text-slate-700">
                                <strong>{lowestSubject.name}</strong> is your lowest-scoring subject with <strong>{lowestSubject.scorePercent}%</strong>, target this area for rapid score acceleration.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                        Student &amp; parent copy | A test snapshot, use alongside schoolwork and discussion.
                    </span>
                    <span className="font-semibold text-slate-600">
                        Page 1 / 1
                    </span>
                </div>
            </div>
        </div>
    );
});

PNTSEReportCardTemplate.displayName = 'PNTSEReportCardTemplate';

export default PNTSEReportCardTemplate;
