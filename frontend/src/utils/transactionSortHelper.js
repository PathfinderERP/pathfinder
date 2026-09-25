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

export const sortTransactionsSequentially = (items, { sortField = 'date', sortOrder = 'desc' } = {}) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    return [...items].sort((itemA, itemB) => {
        const rawDateA = itemA.paymentDate || itemA.date || itemA.mrDate || itemA.createdAt;
        const rawDateB = itemB.paymentDate || itemB.date || itemB.mrDate || itemB.createdAt;
        const timeA = rawDateA ? new Date(rawDateA).getTime() : 0;
        const timeB = rawDateB ? new Date(rawDateB).getTime() : 0;

        const billA = itemA.receiptNo || itemA.billId || '';
        const billB = itemB.receiptNo || itemB.billId || '';

        if (sortField === 'billNo' || sortField === 'receiptNo' || sortField === 'billId') {
            // Primary: Sequential Bill Number
            const billResult = compareBillNumbers(billA, billB, sortOrder);
            if (billResult !== 0) return billResult;

            // Secondary: Paid Date (descending)
            return timeB - timeA;
        } else {
            // Primary: Paid Date (MR Date)
            const dateDiff = sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
            if (dateDiff !== 0) return dateDiff;

            // Secondary: Sequential Bill Number
            // If date is desc, higher bill no comes first (desc); if date is asc, lower bill no first (asc)
            return compareBillNumbers(billA, billB, sortOrder);
        }
    });
};
