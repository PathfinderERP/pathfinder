import React, { forwardRef } from 'react';
import pathfinderLogo from '../../assets/pathfinder-logo.png';

/**
 * Helper to convert class name to Roman numeral (e.g. Class 8 -> Class VIII)
 */
const formatRomanClass = (className) => {
    if (!className) return 'Class VIII';
    const str = String(className);
    if (/10|\bx\b/i.test(str)) return 'Class X';
    if (/9|\bix\b/i.test(str)) return 'Class IX';
    if (/8|\bviii\b/i.test(str)) return 'Class VIII';
    if (/7|\bvii\b/i.test(str)) return 'Class VII';
    if (/6|\bvi\b/i.test(str)) return 'Class VI';
    if (/5|\bv\b/i.test(str)) return 'Class V';
    return str.startsWith('Class') ? str : `Class ${str}`;
};

export const STATIC_AIR_TOTAL_BY_CLASS = {
    5: 5723,
    6: 8283,
    7: 7689,
    8: 8203,
    9: 7908,
    10: 6632
};

/**
 * Extract integer class number (5, 6, 7, 8, 9, 10)
 */
export const getClassNumber = (className = '') => {
    if (!className) return 8;
    const str = String(className).toLowerCase();
    if (/10|\bx\b/i.test(str)) return 10;
    if (/9|\bix\b/i.test(str)) return 9;
    if (/8|\bviii\b/i.test(str)) return 8;
    if (/7|\bvii\b/i.test(str)) return 7;
    if (/6|\bvi\b/i.test(str)) return 6;
    if (/5|\bv\b/i.test(str)) return 5;
    const m = str.match(/\d+/);
    return m ? parseInt(m[0], 10) : 8;
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

const PNTSEReportCardTemplate = forwardRef(({
    student,
    totalCentreStudents: propTotalCentre,
    totalPfStudents: propTotalPf
}, ref) => {
    if (!student) return null;

    const result = student.result || {};
    const studentClass = student.class?.name || student.course || 'Class VIII';
    const romanClass = formatRomanClass(studentClass);
    const classNum = getClassNumber(studentClass);
    const centreName = student.centre?.centreName || student.centre?.enterCode || 'Hazra Centre';
    const rollNo = student.rollNo || 'DEMO-0081';

    // Separate Set out cleanly (e.g. from "PNTSE SET A" or "Set A" -> "A")
    const rawExamSet = result.examSet || student.examSet || student.set || result.set || 'A';
    const cleanSet = String(rawExamSet)
        .replace(/pntse/i, '')
        .replace(/set/i, '')
        .replace(/[-_:]/g, '')
        .trim() || 'A';

    // Filter out non-subject columns
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

    const centreRank = result.centreRank || 18;
    const air = result.air || (centreRank ? centreRank * 15 : 284);

    // Resolve dynamic counts of students who gave the exam (encompassing Set A and Set B across centre and all centres)
    const dynamicCentre = Number(
        propTotalCentre ||
        student.totalCentreStudents ||
        result.totalCentreStudents ||
        0
    );
    const dynamicPf = Number(
        propTotalPf ||
        student.totalPfStudents ||
        result.totalPfStudents ||
        0
    );

    // Ensure total is at least as large as the student's rank
    const totalCentreStudents = dynamicCentre > 0
        ? Math.max(dynamicCentre, Number(centreRank) || 0)
        : (Number(centreRank) || 1);

    const staticAirTotal = STATIC_AIR_TOTAL_BY_CLASS[classNum];

    // All India Rank (AIR) total count is static for Class 5-10, else dynamic
    const totalPfStudents = (staticAirTotal !== undefined && staticAirTotal !== null)
        ? staticAirTotal
        : (dynamicPf > 0 ? Math.max(dynamicPf, Number(air) || 0) : (Number(air) || 1));

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

    // Recommendation text based on class
    const recommendationText = classNum === 10
        ? "Join our all india course to improve your science section."
        : "join our foundation course to improve your science foundation";

    return (
        <div
            ref={ref}
            className="pntse-report-card-root w-[740px] bg-white text-slate-900 font-sans mx-auto shadow-2xl print:shadow-none print:w-full print:max-w-none print:m-0 rounded-2xl overflow-hidden"
            style={{
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: '#0f172a',
                backgroundColor: '#ffffff'
            }}
        >
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 4mm 6mm;
                }
                @media print {
                    html, body {
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        overflow: hidden !important;
                    }
                    .pntse-report-card-root {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}</style>

            {/* ── TOP HEADER WITH OFFICIAL PATHFINDER LOGO ── */}
            <div className="px-8 py-3 bg-white flex items-center justify-between border-b border-slate-100">
                <img
                    src={pathfinderLogo}
                    alt="PATHFINDER — Where Aspiration Meets Success"
                    className="h-10 w-auto object-contain"
                />
                <div className="text-right">
                    <span
                        className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase block"
                        style={{ color: '#0891b2' }}
                    >
                        Pathfinder National Talent Search Examination
                    </span>
                    <span className="text-[12px] font-black text-slate-800 tracking-tight">
                        Official Performance Report Card
                    </span>
                </div>
            </div>

            {/* ── TOP DARK NAVY BANNER ── */}
            <div
                className="px-8 py-3.5 text-white"
                style={{
                    backgroundColor: '#0c2338'
                }}
            >
                <div className="flex items-center justify-between mb-1.5">
                    <span
                        className="text-[10px] font-bold tracking-[0.2em] uppercase"
                        style={{ color: '#93c5fd' }}
                    >
                        PATHFINDER / PNTSE
                    </span>
                </div>

                <h1
                    className="text-[25px] font-extrabold tracking-tight leading-tight text-white mb-1.5"
                    style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}
                >
                    Your performance decoded.
                </h1>

                <div className="flex items-center gap-3 text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: '#67e8f9' }}>
                    <span>RESULTS</span>
                    <span className="opacity-40">/</span>
                    <span>CLASS COMPARISONS</span>
                    <span className="opacity-40">/</span>
                    <span>YOUR NEXT STEP</span>
                </div>
            </div>

            {/* ── MAIN CONTENT BODY ── */}
            <div className="px-8 py-4 bg-white">
                
                {/* Notice Banner */}
                <div className="mb-2.5">
                    <p
                        className="text-[10px] font-extrabold tracking-[0.08em] uppercase"
                        style={{ color: '#d97706' }}
                    >
                        OFFICIAL PERFORMANCE REPORT — PATHFINDER NATIONAL TALENT SEARCH EXAMINATION
                    </p>
                </div>

                {/* Student Information Row */}
                <div className="mb-4">
                    <h2 className="text-[22px] font-extrabold text-slate-900 leading-tight mb-0.5">
                        {student.name}
                    </h2>
                    <p className="text-[12px] font-semibold text-slate-600 mb-0.5">
                        {romanClass} &nbsp;|&nbsp; {centreName} &nbsp;|&nbsp; Roll: <span className="font-mono font-bold text-slate-900">{rollNo}</span>
                    </p>
                    <p className="text-[11.5px] text-slate-500">
                        Exam: PNTSE &nbsp;|&nbsp; Set: {cleanSet} &nbsp;|&nbsp; {student.school ? `School: ${student.school}` : 'School: -'}
                    </p>
                </div>

                {/* ── 3 STATISTIC / RANK CARDS ── */}
                <div className="grid grid-cols-3 gap-3.5 mb-4">
                    {/* TOTAL SCORE */}
                    <div
                        className="p-3.5 rounded-xl border flex flex-col justify-center"
                        style={{
                            backgroundColor: '#f0f9fa',
                            borderColor: '#cff0f3'
                        }}
                    >
                        <p
                            className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1"
                            style={{ color: '#0891b2' }}
                        >
                            TOTAL SCORE
                        </p>
                        <p className="text-[28px] font-black text-slate-900 leading-none">
                            {totalMarks} <span className="text-[18px] font-semibold text-slate-500">/ {maxTotalMarks}</span>
                        </p>
                    </div>

                    {/* CENTRE RANK */}
                    <div
                        className="p-3.5 rounded-xl border flex flex-col justify-between"
                        style={{
                            backgroundColor: '#f0f9fa',
                            borderColor: '#cff0f3'
                        }}
                    >
                        <div>
                            <p
                                className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1"
                                style={{ color: '#0891b2' }}
                            >
                                CENTRE RANK
                            </p>
                            <p className="text-[28px] font-black text-slate-900 leading-none mb-1">
                                {centreRank} <span className="text-[18px] font-semibold text-slate-500">/ {totalCentreStudents.toLocaleString()}</span>
                            </p>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 truncate" title={`${romanClass} at ${centreName.replace(/\s*Centre/i, '')}`}>
                            {romanClass} at {centreName.replace(/\s*Centre/i, '')}
                        </p>
                    </div>

                    {/* ALL INDIA RANK */}
                    <div
                        className="p-3.5 rounded-xl border flex flex-col justify-between"
                        style={{
                            backgroundColor: '#f0f9fa',
                            borderColor: '#cff0f3'
                        }}
                    >
                        <div>
                            <p
                                className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1"
                                style={{ color: '#0891b2' }}
                            >
                                ALL INDIA RANK
                            </p>
                            <p className="text-[28px] font-black text-slate-900 leading-none mb-1">
                                {air} <span className="text-[18px] font-semibold text-slate-500">/ {totalPfStudents.toLocaleString()}</span>
                            </p>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600">
                            {romanClass} across all centres
                        </p>
                    </div>
                </div>

                {/* ── SECTION 01: SUBJECT SCORECARD ── */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[14px] font-black" style={{ color: '#0891b2' }}>
                            01
                        </span>
                        <h3 className="text-[14px] font-extrabold text-slate-900 tracking-tight">
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
                                    <th className="py-2.5 px-3.5 text-[10px] font-extrabold tracking-[0.08em] text-slate-600 uppercase">SUBJECT</th>
                                    <th className="py-2.5 px-3.5 text-[10px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">MARKS</th>
                                    <th className="py-2.5 px-3.5 text-[10px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">PERCENTAGE</th>
                                    <th className="py-2.5 px-3.5 text-[10px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">CENTRE RANK</th>
                                    <th className="py-2.5 px-3.5 text-[10px] font-extrabold tracking-[0.08em] text-slate-600 uppercase text-center">ALL INDIA RANK</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[12px]">
                                {processedSubjects.map((sub, i) => (
                                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2 px-3.5 font-bold text-slate-900">
                                            {sub.name}
                                        </td>
                                        <td className="py-2 px-3.5 font-semibold text-slate-700 text-center">
                                            {sub.marks} / {sub.maxMarks}
                                        </td>
                                        <td className="py-2 px-3.5 font-bold text-slate-900 text-center">
                                            {sub.scorePercent}%
                                        </td>
                                        <td className="py-2 px-3.5 font-medium text-slate-700 text-center">
                                            {sub.subjectCentreRank} / {totalCentreStudents.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-3.5 font-medium text-slate-700 text-center">
                                            {sub.subjectPfRank} / {totalPfStudents.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── SECTION 02: WHAT YOUR RESULT SAYS ── */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[14px] font-black" style={{ color: '#0891b2' }}>
                            02
                        </span>
                        <h3 className="text-[14px] font-extrabold text-slate-900 tracking-tight">
                            What your result says
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                        {/* BUILD ON THIS (STRENGTH) */}
                        <div
                            className="p-3.5 rounded-xl border"
                            style={{
                                backgroundColor: '#f0f9fa',
                                borderColor: '#cff0f3'
                            }}
                        >
                            <p
                                className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1"
                                style={{ color: '#0891b2' }}
                            >
                                BUILD ON THIS
                            </p>
                            <p className="text-[11.5px] leading-relaxed text-slate-700">
                                <strong>{highestSubject.name}</strong> is your highest-scoring subject with <strong>{highestSubject.scorePercent}%</strong>, demonstrating your strongest conceptual grasp across sections.
                            </p>
                        </div>

                        {/* START HERE (GROWTH AREA) */}
                        <div
                            className="p-3.5 rounded-xl border"
                            style={{
                                backgroundColor: '#fdf8f4',
                                borderColor: '#fed7aa'
                            }}
                        >
                            <p
                                className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1"
                                style={{ color: '#d97706' }}
                            >
                                START HERE
                            </p>
                            <p className="text-[11.5px] leading-relaxed text-slate-700">
                                <strong>{lowestSubject.name}</strong> is your lowest-scoring subject with <strong>{lowestSubject.scorePercent}%</strong>, target this area for rapid score acceleration.
                            </p>
                        </div>
                    </div>

                    {/* Section 02 Conclusion Recommendation */}
                    <div
                        className="mt-2.5 p-2.5 px-3.5 rounded-xl border flex items-center justify-between gap-3"
                        style={{
                            backgroundColor: '#f0f9fa',
                            borderColor: '#cff0f3'
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#0891b2' }}></span>
                            <p className="text-[11px] font-bold text-slate-800">
                                {recommendationText}
                            </p>
                        </div>
                        <span
                            className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
                            style={{
                                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                                color: '#0891b2'
                            }}
                        >
                            Next Step
                        </span>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
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
