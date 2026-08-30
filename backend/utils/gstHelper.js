import mongoose from 'mongoose';

/**
 * Helper to determine if a student / admission / billing record is GST-exempt (0% GST).
 * 
 * Rules for GST Exemption:
 * 1. Centre is PHSPS (centre name contains /phsps/i).
 * 2. Student is enrolled in a TAAT batch (batch name matches /taat/i) AND assigned board is WBCHSE (/wbchse/i).
 */
export const isGstExempt = ({ centreName, batches, boardName, admission, student, courseName, programme }) => {
    // 1. PHSPS Centre check
    const centre = (
        centreName ||
        admission?.centre ||
        admission?.student?.studentsDetails?.[0]?.centre ||
        admission?.studentId?.studentsDetails?.[0]?.centre ||
        student?.studentsDetails?.[0]?.centre ||
        ''
    ).toString().trim();

    if (centre && /phsps/i.test(centre)) {
        return true;
    }

    // 2. Board check (WBCHSE)
    const board = (
        boardName ||
        admission?.boardCourseName ||
        admission?.board?.boardCourse ||
        admission?.board?.name ||
        admission?.boardId?.boardCourse ||
        admission?.boardId?.name ||
        admission?.board ||
        admission?.student?.studentsDetails?.[0]?.board ||
        admission?.studentId?.studentsDetails?.[0]?.board ||
        student?.studentsDetails?.[0]?.board ||
        student?.examSchema?.[0]?.board ||
        ''
    ).toString().trim();

    const isWbchse = /^wbchse$/i.test(board) || /wbchse/i.test(board);

    if (isWbchse) {
        // 3. Batch check (TAAT)
        // Extract all possible batch candidates
        const rawBatchCandidates = [];
        
        if (batches) {
            if (Array.isArray(batches)) rawBatchCandidates.push(...batches);
            else rawBatchCandidates.push(batches);
        }
        if (student?.batches) {
            if (Array.isArray(student.batches)) rawBatchCandidates.push(...student.batches);
            else rawBatchCandidates.push(student.batches);
        }
        if (admission?.student?.batches) {
            if (Array.isArray(admission.student.batches)) rawBatchCandidates.push(...admission.student.batches);
            else rawBatchCandidates.push(admission.student.batches);
        }
        if (admission?.studentId?.batches) {
            if (Array.isArray(admission.studentId.batches)) rawBatchCandidates.push(...admission.studentId.batches);
            else rawBatchCandidates.push(admission.studentId.batches);
        }
        if (admission?.batches) {
            if (Array.isArray(admission.batches)) rawBatchCandidates.push(...admission.batches);
            else rawBatchCandidates.push(admission.batches);
        }
        if (admission?.batch) rawBatchCandidates.push(admission.batch);
        if (admission?.batchId) rawBatchCandidates.push(admission.batchId);
        if (admission?.batchName) rawBatchCandidates.push(admission.batchName);

        // Check if any candidate name matches TAAT
        const hasTaatBatch = rawBatchCandidates.some(b => {
            if (!b) return false;
            let bName = "";
            if (typeof b === 'string') {
                bName = b;
            } else if (typeof b === 'object') {
                bName = b.batchName || b.name || b.batch || b.title || '';
            }
            return /\btaat\b/i.test(bName) || /^taat/i.test(bName) || /taat/i.test(bName);
        });

        if (hasTaatBatch) {
            return true;
        }

        // Also check if programme / course / examSchema / remarks contain TAAT
        const extraStrings = [
            programme,
            courseName,
            admission?.programme,
            admission?.course?.courseName,
            admission?.courseName,
            admission?.boardCourseName,
            admission?.remarks,
            student?.studentsDetails?.[0]?.programme,
            student?.studentsDetails?.[0]?.batch,
            student?.examSchema?.[0]?.batch,
            student?.examSchema?.[0]?.course,
            student?.examSchema?.[0]?.programme,
            student?.remarks
        ];

        const hasTaatInExtra = extraStrings.some(str => str && typeof str === 'string' && /taat/i.test(str));
        if (hasTaatInExtra) {
            return true;
        }
    }

    return false;
};

export default isGstExempt;
