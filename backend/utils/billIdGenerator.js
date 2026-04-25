import Payment from "../models/Payment/Payment.js";
import BillCounter from "../models/Payment/BillCounter.js";

/**
 * Generate a unique sequential bill ID (Receipt Number) using an Atomic Counter
 * Format: PATH/[BRANCH_CODE]/[FINANCIAL_YEAR]/[SEQUENCE_NUMBER]
 * Example: PATH/BAR/2025-26/000001
 * 
 * @param {string} centreCode - The short code for the centre
 * @returns {Promise<string>} - The generated bill ID
 */
export const generateBillId = async (centreCode, requestDate = null) => {
    try {
        const date = requestDate ? new Date(requestDate) : new Date();
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();

        let startYear, endYear;
        // Financial Year is April to March
        if (month >= 3) { // April onwards (April = 3)
            startYear = year;
            endYear = year + 1;
        } else { // Jan-March
            startYear = year - 1;
            endYear = year;
        }

        // Format: YYYY-YY (e.g., 2026-27 for April 2026)
        const yearStr = `${startYear}-${endYear.toString().slice(-2)}`;
        const prefix = `PATH/${centreCode}/${yearStr}/`;

        // 1. Initial attempt to increment the sequence counter
        let counter = await BillCounter.findOneAndUpdate(
            { prefix: prefix },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        let nextNumber = counter.seq;

        // 2. Pad with zeros to ensure 7 digits
        return `${prefix}${nextNumber.toString().padStart(7, '0')}`;

    } catch (error) {
        console.error("Critical error in generateBillId utility sequence generation:", error);
        // Fallback to a unique timestamp-based ID to strictly avoid failing the transaction
        return `PATH/${centreCode || 'GEN'}/${Date.now()}`;
    }
};
