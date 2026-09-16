import TeacherTrainTiming from "../../models/Academics/TeacherTrainTiming.js";
import User from "../../models/User.js";
import Centre from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

// Helper to deduce day of week from date string (DD-MM-YYYY, DD-MM-YY, YYYY-MM-DD)
const getDayFromDate = (dateStr) => {
    if (!dateStr) return "Monday";
    try {
        const parts = String(dateStr).trim().split(/[-/]/);
        let parsedDate = null;
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                parsedDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
            } else {
                // DD-MM-YYYY or DD-MM-YY
                let year = parts[2];
                if (year.length === 2) year = "20" + year;
                parsedDate = new Date(`${year}-${parts[1]}-${parts[0]}`);
            }
        } else {
            parsedDate = new Date(dateStr);
        }
        if (parsedDate && !isNaN(parsedDate.getTime())) {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            return days[parsedDate.getDay()];
        }
    } catch (e) {
        // fallback
    }
    return "Monday";
};

// Create a new Train Timing allocation / Ticket Requisition
export const createTrainTiming = async (req, res) => {
    try {
        const {
            teacherId,
            teacherName,
            sex,
            age,
            dateOfJourney,
            centreId,
            day,
            date,
            trainName,
            trainNumber,
            journeyType,
            fromStation,
            toStation,
            travelClass,
            boardingStation,
            phoneNo,
            departureTime,
            arrivalTime,
            classStartTime,
            classEndTime,
            status,
            remarks
        } = req.body;

        if (!trainName || !fromStation || !toStation) {
            return res.status(400).json({
                success: false,
                message: "Train Name, From Station, and To Station are required"
            });
        }

        let resolvedTeacherId = teacherId || null;
        let resolvedTeacherName = (teacherName || "").trim();
        let resolvedPhoneNo = (phoneNo || "").trim();

        // If teacherId provided, retrieve details
        if (resolvedTeacherId && mongoose.Types.ObjectId.isValid(resolvedTeacherId)) {
            const teacher = await User.findById(resolvedTeacherId);
            if (teacher) {
                if (!resolvedTeacherName) resolvedTeacherName = teacher.name;
                if (!resolvedPhoneNo && teacher.mobNum) resolvedPhoneNo = teacher.mobNum;
            }
        } else if (resolvedTeacherName || resolvedPhoneNo) {
            // Attempt to link to existing User by phone or name
            const query = [];
            if (resolvedPhoneNo) query.push({ mobNum: resolvedPhoneNo });
            if (resolvedTeacherName) query.push({ name: new RegExp(`^${resolvedTeacherName}$`, "i") });
            if (query.length > 0) {
                const existingTeacher = await User.findOne({ $or: query });
                if (existingTeacher) {
                    resolvedTeacherId = existingTeacher._id;
                    if (!resolvedTeacherName) resolvedTeacherName = existingTeacher.name;
                    if (!resolvedPhoneNo) resolvedPhoneNo = existingTeacher.mobNum;
                }
            }
        }

        if (!resolvedTeacherId && !resolvedTeacherName) {
            return res.status(400).json({ success: false, message: "Teacher name or selection is required" });
        }

        // Derive day of week if not explicitly given
        const resolvedDay = day || getDayFromDate(dateOfJourney);

        const newTiming = new TeacherTrainTiming({
            teacherId: resolvedTeacherId,
            teacherName: resolvedTeacherName,
            sex: (sex || "M").trim(),
            age: age ? Number(age) : null,
            dateOfJourney: (dateOfJourney || "").trim(),
            centreId: centreId || null,
            day: resolvedDay,
            date: date || null,
            trainName: trainName.trim(),
            trainNumber: (trainNumber || "").trim(),
            journeyType: journeyType || "UP",
            fromStation: fromStation.trim(),
            toStation: toStation.trim(),
            travelClass: (travelClass || "AC").trim(),
            boardingStation: (boardingStation || "").trim(),
            phoneNo: resolvedPhoneNo,
            departureTime: (departureTime || "").trim(),
            arrivalTime: (arrivalTime || "").trim(),
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
            message: "Train timing recorded successfully",
            data: populated
        });
    } catch (error) {
        console.error("Error creating train timing:", error);
        res.status(500).json({ success: false, message: "Failed to record train timing", error: error.message });
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
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean();

        // Search filter
        if (search && search.trim()) {
            const searchLower = search.toLowerCase().trim();
            timings = timings.filter(t => {
                const teacherName = (t.teacherName || t.teacherId?.name || "").toLowerCase();
                const empId = (t.teacherId?.employeeId || "").toLowerCase();
                const phone = (t.phoneNo || t.teacherId?.mobNum || "").toLowerCase();
                const train = (t.trainName || "").toLowerCase();
                const trainNum = (t.trainNumber || "").toLowerCase();
                const from = (t.fromStation || "").toLowerCase();
                const to = (t.toStation || "").toLowerCase();
                const bording = (t.boardingStation || "").toLowerCase();
                const travelCls = (t.travelClass || "").toLowerCase();
                const dateJourney = (t.dateOfJourney || "").toLowerCase();
                const centre = (t.centreId?.centreName || "").toLowerCase();

                return (
                    teacherName.includes(searchLower) ||
                    empId.includes(searchLower) ||
                    phone.includes(searchLower) ||
                    train.includes(searchLower) ||
                    trainNum.includes(searchLower) ||
                    from.includes(searchLower) ||
                    to.includes(searchLower) ||
                    bording.includes(searchLower) ||
                    travelCls.includes(searchLower) ||
                    dateJourney.includes(searchLower) ||
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

        // If teacherId is updated, update teacherName/phone if empty
        if (updates.teacherId && mongoose.Types.ObjectId.isValid(updates.teacherId)) {
            const teacher = await User.findById(updates.teacherId);
            if (teacher) {
                if (!updates.teacherName) updates.teacherName = teacher.name;
                if (!updates.phoneNo && teacher.mobNum) updates.phoneNo = teacher.mobNum;
            }
        }

        if (updates.dateOfJourney && !updates.day) {
            updates.day = getDayFromDate(updates.dateOfJourney);
        }

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
        const timings = Array.isArray(req.body) ? req.body : req.body.timings;
        if (!Array.isArray(timings) || timings.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or empty timings array" });
        }

        const stats = { inserted: 0, failed: 0, errors: [] };
        const teacherCache = {};
        const centreCache = {};

        for (let i = 0; i < timings.length; i++) {
            const item = timings[i];
            try {
                // Extract possible field aliases
                const teacherName = (item.teacherName || item.NAME || item.name || item.passengerName || "").toString().trim();
                const sex = (item.sex || item.SEX || item.gender || "M").toString().trim();
                const age = item.age || item.AGE ? Number(item.age || item.AGE) : null;
                const dateOfJourney = (item.dateOfJourney || item["DATE OF JOURNEY"] || item.journeyDate || item.date || "").toString().trim();
                const fromStation = (item.fromStation || item.FROM || item.from || "").toString().trim();
                const toStation = (item.toStation || item.TO || item.to || "").toString().trim();
                const travelClass = (item.travelClass || item.CLASS || item.class || "AC").toString().trim();
                const trainName = (item.trainName || item["TRAIN NAME"] || item.train || "Express").toString().trim();
                const boardingStation = (item.boardingStation || item["BORDING STN"] || item["BOARDING STN"] || item.bordingStn || "").toString().trim();
                const phoneNo = (item.phoneNo || item["PHONE NO."] || item["PHONE NO"] || item.phone || item.mobile || "").toString().trim();
                const trainNumber = (item.trainNumber || item["TRAIN NO"] || "").toString().trim();
                const departureTime = (item.departureTime || item["DEP TIME"] || "").toString().trim();
                const arrivalTime = (item.arrivalTime || item["ARR TIME"] || "").toString().trim();
                const remarks = (item.remarks || item.REMARKS || "").toString().trim();

                if (!fromStation || !toStation) {
                    stats.failed++;
                    stats.errors.push(`Row ${i + 1}: Missing From or To Station`);
                    continue;
                }

                if (!teacherName && !item.teacherId) {
                    stats.failed++;
                    stats.errors.push(`Row ${i + 1}: Missing Teacher / Passenger Name`);
                    continue;
                }

                // Resolve teacherId if possible
                let teacherId = item.teacherId || null;
                const lookupKey = (item.employeeId || phoneNo || teacherName).toLowerCase();

                if (!teacherId && lookupKey) {
                    if (teacherCache[lookupKey] !== undefined) {
                        teacherId = teacherCache[lookupKey];
                    } else {
                        let foundUser = null;
                        if (item.employeeId) {
                            foundUser = await User.findOne({ employeeId: item.employeeId });
                        }
                        if (!foundUser && phoneNo) {
                            foundUser = await User.findOne({ mobNum: phoneNo });
                        }
                        if (!foundUser && teacherName) {
                            foundUser = await User.findOne({ name: new RegExp(`^${teacherName}$`, "i") });
                        }

                        if (foundUser) {
                            teacherId = foundUser._id;
                            teacherCache[lookupKey] = teacherId;
                        } else {
                            teacherCache[lookupKey] = null;
                        }
                    }
                }

                // Resolve centre if centreName given
                let centreId = item.centreId || null;
                const centreName = item.centreName || item.centre || item.CENTRE;
                if (!centreId && centreName) {
                    const cKey = centreName.toString().toLowerCase().trim();
                    if (!centreCache[cKey]) {
                        const foundCentre = await Centre.findOne({ centreName: new RegExp(`^${cKey}$`, "i") });
                        if (foundCentre) centreCache[cKey] = foundCentre._id;
                    }
                    centreId = centreCache[cKey] || null;
                }

                const day = item.day || getDayFromDate(dateOfJourney);

                await TeacherTrainTiming.create({
                    teacherId: teacherId || null,
                    teacherName: teacherName || (teacherId ? "Teacher" : "Passenger"),
                    sex: sex || "M",
                    age: age,
                    dateOfJourney: dateOfJourney,
                    centreId: centreId,
                    day: day,
                    trainName: trainName,
                    trainNumber: trainNumber,
                    journeyType: item.journeyType || "UP",
                    fromStation: fromStation,
                    toStation: toStation,
                    travelClass: travelClass,
                    boardingStation: boardingStation,
                    phoneNo: phoneNo,
                    departureTime: departureTime,
                    arrivalTime: arrivalTime,
                    classStartTime: item.classStartTime || "",
                    classEndTime: item.classEndTime || "",
                    status: item.status || "Active",
                    remarks: remarks,
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
            importedCount: stats.inserted,
            message: `Import finished. ${stats.inserted} inserted, ${stats.failed} failed.`,
            stats
        });
    } catch (error) {
        console.error("Bulk import error:", error);
        res.status(500).json({ success: false, message: "Bulk import failed", error: error.message });
    }
};

