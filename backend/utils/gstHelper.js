/**
 * Helper to determine if a student / admission / billing record is GST-exempt (0% GST).
 * 
 * Rules for GST Exemption:
 * 1. Centre is PHSPS (centre name contains /phsps/i).
 * 2. Student is enrolled in a TAAT batch (batch name matches /taat/i) AND assigned board is WBCHSE (/wbchse/i).
 */
export const isGstExempt = ({ centreName, batches, boardName, admission, student }) => {
    // 1. PHSPS Centre check
    const centre = (
        centreName ||
        admission?.centre ||
        admission?.student?.studentsDetails?.[0]?.centre ||
        student?.studentsDetails?.[0]?.centre ||
        ''
    ).toString().trim();

    if (centre && /phsps/i.test(centre)) {
        return true;
    }

    // 2. Board check (WBCHSE)
    const board = (
        boardName ||
        admission?.board?.boardCourse ||
        admission?.boardId?.boardCourse ||
        admission?.boardCourseName ||
        admission?.board ||
        admission?.student?.studentsDetails?.[0]?.board ||
        student?.studentsDetails?.[0]?.board ||
        ''
    ).toString().trim();

    const isWbchse = /^wbchse$/i.test(board) || /wbchse/i.test(board);

    if (isWbchse) {
        // 3. Batch check (TAAT)
        const batchList = (
            batches ||
            student?.batches ||
            admission?.student?.batches ||
            admission?.studentId?.batches ||
            []
        );

        const hasTaatBatch = Array.isArray(batchList) && batchList.some(b => {
            if (!b) return false;
            const bName = typeof b === 'string' ? b : (b.batchName || b.name || '');
            return /\btaat\b/i.test(bName) || /^taat/i.test(bName);
        });

        if (hasTaatBatch) {
            return true;
        }
    }

    return false;
};

export default isGstExempt;
