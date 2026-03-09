import mongoose from "mongoose";

/**
 * Generates the next unique Employee ID by checking both Employee and User collections.
 * Format: EMPYYXXXXXX (e.g., EMP26000001)
 */
export const getNextEmployeeId = async () => {
    try {
        const Employee = mongoose.model("Employee");
        const User = mongoose.model("User");

        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const prefix = `EMP${year}`;
        const regex = new RegExp(`^${prefix}`);

        // Find highest sequence in Employee collection
        const lastEmp = await Employee.findOne({ employeeId: regex })
            .sort({ employeeId: -1 })
            .select("employeeId")
            .lean();

        // Find highest sequence in User collection
        const lastUser = await User.findOne({ employeeId: regex })
            .sort({ employeeId: -1 })
            .select("employeeId")
            .lean();

        let sequence = 1;

        const getSeq = (id) => {
            if (!id) return 0;
            const seqPart = id.slice(5); // EMPYY is 5 chars
            const seq = parseInt(seqPart, 10);
            return isNaN(seq) ? 0 : seq;
        };

        const empSeq = lastEmp ? getSeq(lastEmp.employeeId) : 0;
        const userSeq = lastUser ? getSeq(lastUser.employeeId) : 0;

        sequence = Math.max(empSeq, userSeq) + 1;

        return `${prefix}${String(sequence).padStart(6, "0")}`;
    } catch (error) {
        console.error("Error in getNextEmployeeId:", error);
        throw error;
    }
};
