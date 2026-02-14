import LeadManagement from "../../models/LeadManagement.js";
import XLSX from "xlsx";
import mongoose from "mongoose";

export const exportTelecallerLogs = async (req, res) => {
    try {
        const { telecallerName, fromDate, toDate, startTime, endTime } = req.query;

        if (!telecallerName) {
            return res.status(400).json({ message: "Telecaller name is required" });
        }

        // Build follow-up filter
        const followUpFilter = {};
        if (fromDate || toDate) {
            followUpFilter["followUps.date"] = {};
            if (fromDate) followUpFilter["followUps.date"].$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                followUpFilter["followUps.date"].$lte = end;
            }
        }

        const buildTimeMatch = () => {
            if (!startTime && !endTime) return {};

            const match = { $and: [] };
            if (startTime) {
                const [h, m] = startTime.split(':').map(Number);
                const startMinutes = h * 60 + (m || 0);
                match.$and.push({
                    $gte: [
                        { $add: [{ $multiply: [{ $hour: "$followUps.date" }, 60] }, { $minute: "$followUps.date" }] },
                        startMinutes - 330
                    ]
                });
            }
            if (endTime) {
                const [h, m] = endTime.split(':').map(Number);
                const endMinutes = h * 60 + (m || 0);
                match.$and.push({
                    $lte: [
                        { $add: [{ $multiply: [{ $hour: "$followUps.date" }, 60] }, { $minute: "$followUps.date" }] },
                        endMinutes - 330
                    ]
                });
            }
            return { $expr: match };
        };

        const timeMatch = buildTimeMatch();

        const logs = await LeadManagement.aggregate([
            { $match: { leadResponsibility: { $regex: new RegExp(`^${telecallerName}$`, "i") } } },
            { $unwind: "$followUps" },
            {
                $match: {
                    ...followUpFilter,
                    ...timeMatch
                }
            },
            {
                $project: {
                    _id: 0,
                    leadName: "$name",
                    phoneNumber: "$phoneNumber",
                    email: "$email",
                    date: "$followUps.date",
                    feedback: "$followUps.feedback",
                    remarks: "$followUps.remarks",
                    status: { $ifNull: ["$followUps.status", "$leadType"] },
                    duration: "$followUps.callDuration",
                    updatedBy: "$followUps.updatedBy"
                }
            },
            { $sort: { date: -1 } }
        ]);

        if (logs.length === 0) {
            return res.status(404).json({ message: "No logs found for the selected filters" });
        }

        const data = logs.map((log, index) => ({
            "Sl No.": index + 1,
            "Lead Name": log.leadName,
            "Phone": log.phoneNumber,
            "Date": new Date(log.date).toLocaleDateString('en-GB'),
            "Time": new Date(log.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            "Feedback": log.feedback,
            "Status": log.status,
            "Duration": log.duration || "N/A",
            "Remarks": log.remarks || "N/A",
            "Updated By": log.updatedBy || "N/A"
        }));

        if (req.query.format === 'json') {
            return res.status(200).json(data);
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Telecaller Logs");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Telecaller_${telecallerName.replace(/\s+/g, '_')}_Logs.xlsx`);
        res.send(buffer);

    } catch (err) {
        console.error("Telecaller export error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
