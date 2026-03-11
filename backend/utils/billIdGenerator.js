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
export const generateBillId = async (centreCode) => {
    try {
        const date = new Date();
        const month = date.getMonth(); // 0-11
        const year = date.getFullYear();

        let startYear, endYear;
        // Financial Year is April to March
        if (month >= 3) { // April onwards
            startYear = year;
            endYear = year + 1;
        } else { // Jan-March
            startYear = year - 1;
            endYear = year;
        }

        // Format: YYYY-YY (e.g., 2025-26)
        const yearStr = `${startYear}-${endYear.toString().slice(-2)}`;
        const prefix = `PATH/${centreCode}/${yearStr}/`;

        // Atomically increment the sequence counter for this exact prefix
        let counter = await BillCounter.findOneAndUpdate(
            { prefix: prefix },
            { $inc: { seq: 1 } },
            { new: true, upsert: true } // upsert creates it if it doesn't exist
        );

        let nextNumber = counter.seq;

        // Self-Healing / Initialization Logic: 
        // If this is the VERY FIRST time this prefix is generated via the counter (seq === 1),
        // we must check the legacy Payment table to see if numbers already exist to avoid resetting to 1.
        if (nextNumber === 1) {
            // Find the true highest existing sequence in the DB for this prefix using regex.
            // We pull all matching bills to find the integer maximum, bypassing createdAt sorting flaws.
            const existingBills = await Payment.find({
                billId: { $regex: new RegExp(`^${prefix.replace(/\//g, '\\/')}\\d+$`) }
            }).select('billId').lean();

            if (existingBills.length > 0) {
                let maxSeq = 0;
                existingBills.forEach(b => {
                    const parts = b.billId.split('/');
                    const seqNum = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(seqNum) && seqNum > maxSeq) {
                        maxSeq = seqNum;
                    }
                });

                if (maxSeq > 0) {
                    // Update the counter to (maxSeq + 1)
                    nextNumber = maxSeq + 1;
                    await BillCounter.updateOne({ prefix: prefix }, { $set: { seq: nextNumber } });
                }
            }
        }

        // Pad with zeros to ensure 6 digits
        return `${prefix}${nextNumber.toString().padStart(6, '0')}`;

    } catch (error) {
        console.error("Critical error in generateBillId utility sequence generation:", error);
        // Fallback to a timestamp-based ID to strictly avoid failing the transaction
        return `PATH/${centreCode || 'GEN'}/${Date.now()}`;
    }
};
