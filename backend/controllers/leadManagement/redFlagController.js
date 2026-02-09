import User from "../../models/User.js";
import LeadManagement from "../../models/LeadManagement.js";

export const resetRedFlags = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(
            userId,
            { redFlags: 0 },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Red flags reset successfully",
            redFlags: user.redFlags
        });
    } catch (error) {
        console.error("Error resetting red flags:", error);
        res.status(500).json({ message: "Server error resetting red flags" });
    }
};

export const processDailyPenalty = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const telecallers = await User.find({ role: 'telecaller' });

        for (const tc of telecallers) {
            // Skip if already penalized today
            if (tc.lastPenaltyDate && new Date(tc.lastPenaltyDate) >= today) continue;

            // Count follow-ups made by this telecaller today
            const completedToday = await LeadManagement.countDocuments({
                "followUps.updatedBy": tc.name,
                "followUps.date": { $gte: today }
            });

            if (completedToday < 50) {
                await User.findByIdAndUpdate(tc._id, {
                    $inc: { redFlags: 1 },
                    $set: { lastPenaltyDate: new Date() }
                });
                // Ensure max flags is 5
                const updatedUser = await User.findById(tc._id);
                if (updatedUser.redFlags > 5) {
                    await User.findByIdAndUpdate(tc._id, { redFlags: 5 });
                }
            }
        }

        res.status(200).json({ message: "Daily penalties processed successfully" });
    } catch (error) {
        console.error("Error processing daily penalties:", error);
        res.status(500).json({ message: "Server error processing penalties" });
    }
};
