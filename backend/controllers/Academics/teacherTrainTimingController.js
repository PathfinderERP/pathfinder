import TeacherTrainTiming from "../../models/Academics/TeacherTrainTiming.js";
import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

// Create a new Train Timing allocation
export const createTrainTiming = async (req, res) => {
    try {
        const {
            teacherId,
            centreId,
            day,
            date,
            trainName,
            trainNumber,
            journeyType,
            fromStation,
            toStation,
            departureTime,
            arrivalTime,
            classStartTime,
            classEndTime,
            status,
            remarks
        } = req.body;

        if (!teacherId) {
            return res.status(400).json({ success: false, message: "Teacher is required" });
        }

        if (!trainName || !fromStation || !toStation || !departureTime || !arrivalTime) {
            return res.status(400).json({
                success: false,
                message: "Train Name, From Station, To Station, Departure Time, and Arrival Time are required"
            });
        }

        // Validate teacher exists
        const teacher = await User.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        const newTiming = new TeacherTrainTiming({
            teacherId,
            centreId: centreId || null,
            day: day || "Monday",
            date: date || null,
            trainName: trainName.trim(),
            trainNumber: (trainNumber || "").trim(),
            journeyType: journeyType || "UP",
            fromStation: fromStation.trim(),
            toStation: toStation.trim(),
            departureTime: departureTime.trim(),
            arrivalTime: arrivalTime.trim(),
            classStartTime: (classStartTime || "").trim(),
            classEndTime: (classEndTime || "").trim(),
            status: status || "Active",
            remarks: (remarks || "").trim(),
            createdBy: req.user?._id,
            updatedBy: req.user?._id
        });

        await newTiming.save();

        const populated = await TeacherTrainTiming.findById(newTiming._id)
            .populate("teacherId", "name employeeId email mobNum subject centres teacherDepartment")
            .populate("centreId", "centreName");

        res.status(201).json({
            success: true,
            message: "Train timing allocated successfully",
            data: populated
        });
    } catch (error) {
        console.error("Error creating train timing:", error);
        res.status(500).json({ success: false, message: "Failed to allocate train timing", error: error.message });
    }
};

// Get all Train Timings with filtering and search
export const getAllTrainTimings = async (req, res) => {
    try {
        const {
            teacherId,
            centreId,
            day,
            journeyType,
            status,
            search
        } = req.query;

        let query = {};

        if (teacherId) {
            if (mongoose.Types.ObjectId.isValid(teacherId)) {
                query.teacherId = teacherId;
            }
        }

        if (centreId) {
            if (mongoose.Types.ObjectId.isValid(centreId)) {
                query.centreId = centreId;
            }
        }

        if (day && day !== "All") {
            query.day = day;
        }

        if (journeyType && journeyType !== "All") {
            query.journeyType = journeyType;
        }

        if (status && status !== "All") {
            query.status = status;
        }

        let timings = await TeacherTrainTiming.find(query)
            .populate("teacherId", "name employeeId email mobNum subject centres teacherDepartment")
            .populate("centreId", "centreName")
            .populate("createdBy", "name")
            .populate("updatedBy", "name")
            .sort({ updatedAt: -1 })
            .lean();

        // If search term provided, filter in-memory across teacher fields and train details
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            timings = timings.filter(t => {
                const teacherName = t.teacherId?.name?.toLowerCase() || "";
                const empId = t.teacherId?.employeeId?.toLower0Case() || "";
                const train = t.trainName?.toLowerCase() || "";
                const trainNum = t.trainNumber?.toLowerCase() || "";
                const from = t.fromStation?.toLowerCase() || "";
                const to = t.toStation?.toLowerCase() || "";
                const centre = t.centreId?.centreName?.toLowerCase() || "";

                return (
                    teacherName.includes(searchLower) ||
                    empId.includes(searchLower) ||
                    train.includes(searchLower) ||
                    trainNum.includes(searchLower) ||
                    from.includes(searchLower) ||
                    to.includes(searchLower) ||
                    centre.includes(searchLower)
                );
            });
        }

        res.status(200).json({
            success: true,
            count: timings.length,
            data: timings
        });
    } catch (error) {
        console.error("Error fetching train timings:", error);
        res.status(500).json({ success: false, message: "Failed to fetch train timings", error: error.message });
    }
};

// Get single Train Timing by ID
export const getTrainTimingById = async (req, res) => {
    try {
        const { id } = req.params;
        const timing = await TeacherTrainTiming.findById(id)
            .populate("teacherId", "name employeeId email mobNum subject centres teacherDepartment")
            .populate("centreId", "centreName")
            .populate("createdBy", "name")
            .populate("updatedBy", "name");

        if (!timing) {
            return res.status(404).json({ success: false, message: "Train timing not found" });
        }

        res.status(200).json({ success: true, data: timing });
    } catch (error) {
        console.error("Error fetching timing by ID:", error);
        res.status(500).json({ success: false, message: "Failed to fetch timing", error: error.message });
    }
};

// Update Train Timing
export const updateTrainTiming = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updatedBy: req.user?._id };

        const updated = await TeacherTrainTiming.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
            .populate("teacherId", "name employeeId email mobNum subject centres teacherDepartment")
            .populate("centreId", "centreName");

        if (!updated) {
            return res.status(404).json({ success: false, message: "Train timing not found" });
        }

        res.status(200).json({
            success: true,
            message: "Train timing updated successfully",
            data: updated
        });
    } catch (error) {
        console.error("Error updating train timing:", error);
        res.status(500).json({ success: false, message: "Failed to update train timing", error: error.message });
    }
};

// Delete Train Timing
export const deleteTrainTiming = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TeacherTrainTiming.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Train timing not found" });
        }

        res.status(200).json({
            success: true,
            message: "Train timing deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting train timing:", error);
        res.status(500).json({ success: false, message: "Failed to delete train timing", error: error.message });
    }
};

// Bulk Import Train Timings
export const bulkImportTrainTimings = async (req, res) => {
    try {
        const { timings } = req.body;
        if (!Array.isArray(timings) || timings.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or empty timings array" });
        }

        const stats = { inserted: 0, failed: 0, errors: [] };
        const teacherCache = {};
        const centreCache = {};

        for (let i = 0; i < timings.length; i++) {
            const item = timings[i];
            try {
                let teacherId = item.teacherId;

                // Resolve teacher by employeeId or email if teacherId not directly provided
                if (!teacherId && (item.employeeId || item.email)) {
                    const cacheKey = item.employeeId || item.email;
                    if (!teacherCache[cacheKey]) {
                        const query = item.employeeId ? { employeeId: item.employeeId } : { email: item.email };
                        const foundTeacher = await User.findOne(query);
                        if (foundTeacher) teacherCache[cacheKey] = foundTeacher._id;
                    }
                    teacherId = teacherCache[cacheKey];
                }

                if (!teacherId) {
                    stats.failed++;
                    stats.errors.push(`Row ${i + 1}: Teacher not found (${item.employeeId || item.teacherName || "N/A"})`);
                    continue;
                }

                // Resolve centre if centreName given
                let centreId = item.centreId;
                if (!centreId && item.centreName) {
                    const cKey = item.centreName.toLowerCase().trim();
                    if (!centreCache[cKey]) {
                        const foundCentre = await Centre.findOne({ centreName: new RegExp(`^${cKey}$`, "i") });
                        if (foundCentre) centreCache[cKey] = foundCentre._id;
                    }
                    centreId = centreCache[cKey];
                }

                await TeacherTrainTiming.create({
                    teacherId,
                    centreId: centreId || null,
                    day: item.day || "Monday",
                    trainName: item.trainName || "Express / Local",
                    trainNumber: item.trainNumber || "",
                    journeyType: item.journeyType || "UP",
                    fromStation: item.fromStation || "",
                    toStation: item.toStation || "",
                    departureTime: item.departureTime || "",
                    arrivalTime: item.arrivalTime || "",
                    classStartTime: item.classStartTime || "",
                    classEndTime: item.classEndTime || "",
                    status: item.status || "Active",
                    remarks: item.remarks || "",
                    createdBy: req.user?._id,
                    updatedBy: req.user?._id
                });

                stats.inserted++;
            } catch (err) {
                stats.failed++;
                stats.errors.push(`Row ${i + 1}: ${err.message}`);
            }
        }

        res.status(200).json({
            success: true,
            message: `Import finished. ${stats.inserted} inserted, ${stats.failed} failed.`,
            stats
        });
    } catch (error) {
        console.error("Bulk import error:", error);
        res.status(500).json({ success: false, message: "Bulk import failed", error: error.message });
    }
};
