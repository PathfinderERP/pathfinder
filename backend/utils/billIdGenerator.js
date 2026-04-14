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

        // 2. STRICTURE SEQUENTIALITY CHECK (Self-Correction)
        // We ALWAYS verify against the Payment table to ensure no overlaps exist, 
        // especially if the counter was reset or manually tampered with.
        
        // Use a regex that matches strictly: PATH/CODE/YEAR/000...
        const prefixRegex = new RegExp(`^${prefix.replace(/\//g, '\\/')}\\d+$`);
        
        // Find the absolute highest existing sequence in the DB for this prefix
        const highestBill = await Payment.findOne({
            billId: { $regex: prefixRegex }
        })
        .select('billId')
        .sort({ billId: -1 }) // Sort lexicographically (works for padded numbers)
        .lean();

        if (highestBill) {
            const parts = highestBill.billId.split('/');
            const dbMaxSeq = parseInt(parts[parts.length - 1], 10);
            
            if (!isNaN(dbMaxSeq) && dbMaxSeq >= nextNumber) {
                // The counter is lagging behind the actual records in Payment.
                // Heal the counter and skip to the next available number.
                nextNumber = dbMaxSeq + 1;
                
                // Update the counter to stay in sync for the next call
                await BillCounter.updateOne(
                    { prefix: prefix },
                    { $set: { seq: nextNumber } }
                );
            }
        }

        // Pad with zeros to ensure 7 digits
        return `${prefix}${nextNumber.toString().padStart(7, '0')}`;

    } catch (error) {
        console.error("Critical error in generateBillId utility sequence generation:", error);
        // Fallback to a unique timestamp-based ID to strictly avoid failing the transaction
        return `PATH/${centreCode || 'GEN'}/${Date.now()}`;
    }
};
