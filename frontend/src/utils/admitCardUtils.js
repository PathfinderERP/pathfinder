/**
 * Utility functions for Admit Card generation and file naming.
 */

/**
 * Returns a standardized file name according to student name with class.
 * E.g. "Rahul_Sharma_Class_10_Admit_Card.pdf"
 *
 * @param {Object} student - Student data object
 * @param {string} [examType=''] - Optional exam identifier (e.g. 'PNTSE', 'PMO')
 * @returns {string} Clean, safe filename ending in .pdf
 */
export const getAdmitCardFileName = (student, examType = '') => {
    const rawName = (student?.name || 'Student')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-]/g, '');

    const rawClassVal = student?.class?.name || student?.class || '';
    let rawClass = rawClassVal
        .toString()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-]/g, '');

    // Ensure "Class" is prefixing if it's just a number or Roman numeral
    if (rawClass && !/^class/i.test(rawClass)) {
        rawClass = `Class_${rawClass}`;
    }

    if (rawClass) {
        return `${rawName}_${rawClass}_Admit_Card.pdf`;
    }
    return `${rawName}_Admit_Card.pdf`;
};

/**
 * Formats time string (HH:mm) to 12-hour AM/PM format.
 */
export const formatAdmitCardTime = (timeStr) => {
    if (!timeStr) return '';
    if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(timeStr)) return timeStr;
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1].replace(/[^0-9]/g, '').padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }
    return timeStr;
};
