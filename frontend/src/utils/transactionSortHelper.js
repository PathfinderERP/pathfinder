/**
 * Transaction Sequential Sorting Helper
 * Synchronizes sequential bill number ordering with paid date across:
 * 1. Transaction List (/finance/transaction-list)
 * 2. Daily Collection - Details with Bill tab (/sales/daily-collection)
 *
 * Ensures deterministic ordering:
 * - Natural alphanumeric sequential bill numbers (e.g. 0003458, 0003459, 0003460)
 * - Automatic secondary sorting (if date is primary, bill number is secondary, and vice versa)
 * - Null / invalid bill numbers placed neatly at the bottom
 */

export const compareBillNumbers = (billA, billB, direction = 'asc') => {
    const a = (billA || '').toString().trim();
    const b = (billB || '').toString().trim();
    const isAValid = Boolean(a && a !== '-' && a !== 'undefined' && a !== 'null');
    const isBValid = Boolean(b && b !== '-' && b !== 'undefined' && b !== 'null');

    if (!isAValid && !isBValid) return 0;
    if (!isAValid) return 1; // empty bills placed at bottom
    if (!isBValid) return -1;

    // Natural alphanumeric collation with numeric: true (orders 3458 < 3459 < 3460)
    const res = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    return direction === 'desc' ? -res : res;
};

const getISODateStr = (rawDate) => {
    if (!rawDate) return '';
    if (typeof rawDate === 'string' && rawDate.length >= 10 && rawDate[4] === '-' && rawDate[7] === '-') {
        return rawDate.substring(0, 10);
    }
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return '';
        // Fast IST Date string computation (+05:30)
        const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
        return istDate.toISOString().substring(0, 10);
    } catch (e) {
        return '';
    }
};

export const sortTransactionsSequentially = (items, { sortField = 'date', sortOrder = 'desc' } = {}) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    if (items.length === 1) return items;

    // Schwartzian transform: Pre-compute sort metadata in O(N) time
    const decorated = items.map(item => {
        const rawCreated = item.createdAt || item.updatedAt;
        const created = rawCreated ? new Date(rawCreated).getTime() : 0;

        const rawDate = item.paymentDate || item.date || item.mrDate;
        const time = rawDate ? new Date(rawDate).getTime() : 0;
        const dayStr = getISODateStr(rawDate);

        const bill = (item.receiptNo || item.billId || '').toString().trim();
        const isBillValid = Boolean(bill && bill !== '-' && bill !== 'undefined' && bill !== 'null');

        return { item, created, time, dayStr, bill, isBillValid };
    });

    const isDesc = sortOrder === 'desc';

    decorated.sort((a, b) => {
        if (sortField === 'billNo' || sortField === 'receiptNo' || sortField === 'billId') {
            // Primary: Sequential Bill Number
            if (!a.isBillValid && !b.isBillValid) {
                // fall back to date
            } else if (!a.isBillValid) {
                return 1;
            } else if (!b.isBillValid) {
                return -1;
            } else {
                const billRes = a.bill.localeCompare(b.bill, undefined, { numeric: true, sensitivity: 'base' });
                if (billRes !== 0) return isDesc ? -billRes : billRes;
            }

            // Secondary: Calendar Day
            const dateDiff = isDesc ? b.dayStr.localeCompare(a.dayStr) : a.dayStr.localeCompare(b.dayStr);
            if (dateDiff !== 0) return dateDiff;

            // Tertiary: Creation Date
            return b.created - a.created;
        } else {
            // Primary: Paid Date (Calendar Day level)
            const dateDiff = isDesc ? b.dayStr.localeCompare(a.dayStr) : a.dayStr.localeCompare(b.dayStr);
            if (dateDiff !== 0) return dateDiff;

            // Secondary: Sequential Bill Number
            if (a.isBillValid && b.isBillValid) {
                const billRes = a.bill.localeCompare(b.bill, undefined, { numeric: true, sensitivity: 'base' });
                if (billRes !== 0) return isDesc ? -billRes : billRes;
            } else if (a.isBillValid) {
                return -1;
            } else if (b.isBillValid) {
                return 1;
            }

            // Tertiary: Exact Timestamp
            const exactTimeDiff = isDesc ? b.time - a.time : a.time - b.time;
            if (exactTimeDiff !== 0) return exactTimeDiff;

            // Quaternary: Creation Date
            if (a.created && b.created && a.created !== b.created) {
                return isDesc ? b.created - a.created : a.created - b.created;
            }

            return 0;
        }
    });

    return decorated.map(d => d.item);
};
