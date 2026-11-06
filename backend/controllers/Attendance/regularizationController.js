import Regularization from '../../models/Attendance/Regularization.js';
import EmployeeAttendance from '../../models/Attendance/EmployeeAttendance.js';
import Employee from '../../models/HR/Employee.js';
import { uploadToR2, getSignedFileUrl } from '../../utils/r2Upload.js';
import { startOfDay, endOfDay, format } from 'date-fns';
import { determineAttendanceStatus, getTargetWorkingHours } from './employeeAttendanceController.js';

export const createRegularization = async (req, res) => {
    try {
        let empId = req.body.employeeId;
        
        // Handle case where employeeId might be null or "null" string
        if (!empId || empId === "null" || empId === "undefined" || empId === "") {
            const employee = await Employee.findOne({ user: req.user.id });
            if (!employee) return res.status(404).json({ message: "Employee profile not found for this user" });
            empId = employee._id;
        }

        const regularizationData = { ...req.body, employeeId: empId };

        // Handle Multiple Photo Uploads
        if (req.files && req.files.length > 0) {
            const photoPromises = req.files.map(file => uploadToR2(file, 'regularization/photos'));
            regularizationData.photos = await Promise.all(photoPromises);
        }

        const regularization = new Regularization(regularizationData);
        await regularization.save();
        res.status(201).json(regularization);
    } catch (error) {
        console.error("Create Regularization Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getRegularizations = async (req, res) => {
    try {
        const { employeeId, status, managerView } = req.query;
        let query = {};
        
        if (managerView === 'true') {
            const managerEmployee = await Employee.findOne({ user: req.user.id });
            if (!managerEmployee) {
                return res.status(200).json([]);
            }
            const reportees = await Employee.find({ manager: managerEmployee._id }).select('_id');
            const reporteeIds = reportees.map(e => e._id);
            query.employeeId = { $in: reporteeIds };
        } else if (employeeId) {
            query.employeeId = employeeId;
        }

        if (status) query.status = status;

        const regularizations = await Regularization.find(query)
            .populate({
                path: 'employeeId',
                select: 'name employeeId profileImage primaryCentre centerArray centres',
                populate: { path: 'primaryCentre' }
            })
            .populate({
                path: 'reviewedBy',
                select: 'name'
            })
            .sort({ createdAt: -1 });

        // Sign photo URLs (Array)
        const signedRegularizations = await Promise.all(regularizations.map(async (reg) => {
            const regObj = reg.toObject();
            if (regObj.photos && regObj.photos.length > 0) {
                const signedPhotos = await Promise.all(regObj.photos.map(photo => getSignedFileUrl(photo)));
                regObj.photos = signedPhotos;
            }
            if (regObj.employeeId && regObj.employeeId.profileImage) {
                regObj.employeeId.profileImage = await getSignedFileUrl(regObj.employeeId.profileImage);
            }

            // Fetch existing attendance for this specific day
            const startOfRegDay = new Date(regObj.date);
            startOfRegDay.setHours(0, 0, 0, 0);
            const endOfRegDay = new Date(regObj.date);
            endOfRegDay.setHours(23, 59, 59, 999);

            const existingAttendance = await EmployeeAttendance.findOne({
                employeeId: regObj.employeeId._id,
                date: {
                    $gte: startOfRegDay,
                    $lte: endOfRegDay
                }
            }).select('checkIn checkOut workingHours regularizedHours status remarks');

            if (existingAttendance) {
                regObj.existingAttendance = existingAttendance;
            }

            if (regObj.fromTime && regObj.toTime) {
                const [fh, fm] = regObj.fromTime.split(':').map(Number);
                const [th, tm] = regObj.toTime.split(':').map(Number);
                if (!isNaN(fh) && !isNaN(fm) && !isNaN(th) && !isNaN(tm)) {
                    let mins = (th * 60 + tm) - (fh * 60 + fm);
                    if (mins < 0) mins += 24 * 60;
                    regObj.durationHours = Number((mins / 60).toFixed(2));
                }
            }

            return regObj;
        }));

        res.status(200).json(signedRegularizations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Shared helper to recalculate and sync EmployeeAttendance when regularizations change.
 * Sums ALL approved regularizations on that date so multiple requests for the same day
 * correctly add up in workingHours and regularizedHours.
 */
export const applyRegularizationsToAttendance = async (employeeId, date, options = {}) => {
    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) return null;

        const regDate = new Date(date);
        const dateOnlyStr = format(regDate, "yyyy-MM-dd");
        const localStart = startOfDay(regDate);
        const localEnd = endOfDay(regDate);
        const utcStart = new Date(dateOnlyStr + "T00:00:00.000Z");
        const utcEnd = new Date(dateOnlyStr + "T23:59:59.999Z");
        const qStart = localStart < utcStart ? localStart : utcStart;
        const qEnd = localEnd > utcEnd ? localEnd : utcEnd;

        const targetHours = getTargetWorkingHours(employee?.workingHours);

        // Find ALL Approved regularizations for this employee on this date
        const approvedRegs = await Regularization.find({
            employeeId: employee._id,
            date: { $gte: qStart, $lte: qEnd },
            status: 'Approved'
        }).sort({ fromTime: 1, createdAt: 1 });

        let totalRegularizedHours = 0;
        let earliestRegIn = null;
        let latestRegOut = null;
        let regCheckInObj = null;
        let regCheckOutObj = null;
        const remarksList = [];

        for (const reg of approvedRegs) {
            let durHours = 0;
            let rIn = null;
            let rOut = null;

            if (reg.fromTime && reg.toTime) {
                const [fh, fm] = reg.fromTime.split(':').map(Number);
                const [th, tm] = reg.toTime.split(':').map(Number);
                if (!isNaN(fh) && !isNaN(fm) && !isNaN(th) && !isNaN(tm)) {
                    let durMinutes = (th * 60 + tm) - (fh * 60 + fm);
                    if (durMinutes < 0) {
                        durMinutes += 24 * 60; // overnight span
                    }
                    if (durMinutes > 0) {
                        durHours = Number((durMinutes / 60).toFixed(2));
                    }

                    rIn = new Date(`${dateOnlyStr}T${reg.fromTime}:00+05:30`);
                    rOut = new Date(`${dateOnlyStr}T${reg.toTime}:00+05:30`);
                    if (isNaN(rIn.getTime())) {
                        rIn = new Date(regDate);
                        rIn.setHours(fh, fm, 0, 0);
                    }
                    if (isNaN(rOut.getTime())) {
                        rOut = new Date(regDate);
                        rOut.setHours(th, tm, 0, 0);
                    }
                    if (rOut < rIn) {
                        rOut = new Date(rOut.getTime() + 24 * 60 * 60 * 1000);
                    }
                }
            }

            if (durHours <= 0) {
                durHours = targetHours;
            }

            totalRegularizedHours += durHours;

            if (rIn) {
                if (!earliestRegIn || rIn < earliestRegIn) {
                    earliestRegIn = rIn;
                    regCheckInObj = {
                        time: rIn,
                        address: reg.locationAddress || 'Regularized',
                        latitude: reg.latitude,
                        longitude: reg.longitude
                    };
                }
            }
            if (rOut) {
                if (!latestRegOut || rOut > latestRegOut) {
                    latestRegOut = rOut;
                    regCheckOutObj = {
                        time: rOut,
                        address: reg.locationAddress || 'Regularized',
                        latitude: reg.latitude,
                        longitude: reg.longitude
                    };
                }
            }

            const desc = `+${durHours}h (${reg.type}): ${reg.reason || reg.reviewRemark || ''}`.trim();
            remarksList.push(desc);
        }

        totalRegularizedHours = Number(totalRegularizedHours.toFixed(2));

        let attendance = await EmployeeAttendance.findOne({
            $or: [
                { employeeId: employee._id },
                { user: employee?.user }
            ],
            date: {
                $gte: qStart,
                $lte: qEnd
            }
        });

        const centreId = attendance?.centreId || employee?.primaryCentre || employee?.centres?.[0];

        // Determine base logged hours (biometric / physical punch or manual marking)
        let baseLoggedHours = 0;
        if (attendance) {
            if (attendance.baseWorkedHours !== undefined && attendance.baseWorkedHours !== null && attendance.baseWorkedHours > 0) {
                baseLoggedHours = attendance.baseWorkedHours;
            } else {
                const prevWorking = Number(attendance.workingHours) || 0;
                const prevReg = Number(attendance.regularizedHours) || 0;
                if (prevWorking > prevReg) {
                    baseLoggedHours = Number((prevWorking - prevReg).toFixed(2));
                } else {
                    baseLoggedHours = 0;
                }
            }
        }

        const totalWorkingHours = Number((baseLoggedHours + totalRegularizedHours).toFixed(2));

        if (!attendance) {
            if (approvedRegs.length === 0) return null;

            const isWeekOff = remarksList.some(r => /weekly?\s*off/i.test(r));
            const finalStatus = (isWeekOff && totalWorkingHours < targetHours)
                ? 'Week Off'
                : determineAttendanceStatus(totalWorkingHours, targetHours);

            attendance = new EmployeeAttendance({
                user: employee.user,
                employeeId: employee._id,
                centreId: centreId,
                date: utcStart,
                status: finalStatus,
                baseWorkedHours: 0,
                workingHours: totalWorkingHours,
                regularizedHours: totalRegularizedHours,
                remarks: `Regularized ${totalRegularizedHours}h: ${remarksList.join(' | ')}`,
                checkIn: regCheckInObj ? {
                    time: regCheckInObj.time,
                    address: regCheckInObj.address || 'Regularized',
                    latitude: regCheckInObj.latitude,
                    longitude: regCheckInObj.longitude,
                    centreId: centreId
                } : undefined,
                checkOut: regCheckOutObj ? {
                    time: regCheckOutObj.time,
                    address: regCheckOutObj.address || 'Regularized',
                    latitude: regCheckOutObj.latitude,
                    longitude: regCheckOutObj.longitude,
                    centreId: centreId
                } : undefined
            });
            await attendance.save();
            return attendance;
        }

        // Attendance exists
        attendance.baseWorkedHours = baseLoggedHours;
        attendance.regularizedHours = totalRegularizedHours;
        attendance.workingHours = totalWorkingHours;

        if (totalWorkingHours === 0 && approvedRegs.length === 0) {
            if (attendance.status !== 'Week Off' && attendance.status !== 'Holiday' && attendance.status !== 'Leave') {
                attendance.status = 'Absent';
            }
        } else {
            const isWeekOff = attendance.status === 'Week Off' || remarksList.some(r => /weekly?\s*off/i.test(r));
            if (isWeekOff && totalWorkingHours < targetHours) {
                attendance.status = 'Week Off';
            } else {
                attendance.status = determineAttendanceStatus(totalWorkingHours, targetHours);
            }
        }

        // Preserve earliest checkIn & latest checkOut
        if (regCheckInObj) {
            if (!attendance.checkIn?.time || (regCheckInObj.time && new Date(regCheckInObj.time) < new Date(attendance.checkIn.time))) {
                attendance.checkIn = {
                    time: regCheckInObj.time,
                    address: regCheckInObj.address || attendance.checkIn?.address || 'Regularized',
                    latitude: regCheckInObj.latitude || attendance.checkIn?.latitude,
                    longitude: regCheckInObj.longitude || attendance.checkIn?.longitude,
                    centreId: attendance.checkIn?.centreId || centreId
                };
            }
        }
        if (regCheckOutObj) {
            if (!attendance.checkOut?.time || (regCheckOutObj.time && new Date(regCheckOutObj.time) > new Date(attendance.checkOut.time))) {
                attendance.checkOut = {
                    time: regCheckOutObj.time,
                    address: regCheckOutObj.address || attendance.checkOut?.address || 'Regularized',
                    latitude: regCheckOutObj.latitude || attendance.checkOut?.latitude,
                    longitude: regCheckOutObj.longitude || attendance.checkOut?.longitude,
                    centreId: attendance.checkOut?.centreId || centreId
                };
            }
        }

        if (remarksList.length > 0) {
            attendance.remarks = `Regularized ${totalRegularizedHours}h: ${remarksList.join(' | ')}`;
        }

        if (!attendance.centreId && centreId) attendance.centreId = centreId;
        if (!attendance.user && employee?.user) attendance.user = employee.user;

        await attendance.save();
        return attendance;
    } catch (err) {
        console.error("Error in applyRegularizationsToAttendance:", err);
        throw err;
    }
};

export const updateRegularizationStatus = async (req, res) => {
    try {
        const { status, reviewRemark, fromTime, toTime, attendanceMode } = req.body;

        // Prepare update object
        const updateData = {
            status,
            reviewRemark,
            reviewedBy: req.user.id
        };

        // Allow HR to update/set timings during review
        if (fromTime) updateData.fromTime = fromTime;
        if (toTime) updateData.toTime = toTime;

        const regularization = await Regularization.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate({
            path: 'reviewedBy',
            select: 'name'
        });

        if (!regularization) return res.status(404).json({ message: 'Regularization not found' });

        // Recalculate attendance for this employee and date (properly adds all approved regularizations for the day)
        await applyRegularizationsToAttendance(regularization.employeeId, regularization.date, { attendanceMode });

        res.status(200).json(regularization);
    } catch (error) {
        console.error("Error updating regularization:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateRegularization = async (req, res) => {
    try {
        const regularization = await Regularization.findById(req.params.id);
        if (!regularization) return res.status(404).json({ message: 'Regularization request not found' });
        
        if (regularization.status === 'Approved') {
            return res.status(400).json({ message: 'Approved regularization requests cannot be edited.' });
        }

        const { type, reason, fromTime, toTime, date } = req.body;
        if (type) regularization.type = type;
        if (reason) regularization.reason = reason;
        if (fromTime !== undefined) regularization.fromTime = fromTime;
        if (toTime !== undefined) regularization.toTime = toTime;
        if (date) regularization.date = date;

        if (req.files && req.files.length > 0) {
            const photoPromises = req.files.map(file => uploadToR2(file, 'regularization/photos'));
            const newPhotos = await Promise.all(photoPromises);
            regularization.photos = [...(regularization.photos || []), ...newPhotos];
        }

        await regularization.save();

        const regObj = regularization.toObject();
        if (regObj.photos && regObj.photos.length > 0) {
            regObj.photos = await Promise.all(regObj.photos.map(p => getSignedFileUrl(p)));
        }

        res.status(200).json(regObj);
    } catch (error) {
        console.error("Update Regularization Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteRegularization = async (req, res) => {
    try {
        const regularization = await Regularization.findById(req.params.id);
        if (!regularization) return res.status(404).json({ message: 'Regularization not found' });
        if (regularization.status === 'Approved') {
            return res.status(400).json({ message: 'Cannot delete an already approved regularization request' });
        }
        await Regularization.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Regularization deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const bulkUpdateRegularizationStatus = async (req, res) => {
    try {
        const { ids, status, reviewRemark } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No regularization IDs provided" });
        }

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value. Must be Approved or Rejected." });
        }

        const results = [];
        const affectedPairs = new Map();

        for (const id of ids) {
            const updateData = {
                status,
                reviewRemark: reviewRemark || `Bulk ${status}`,
                reviewedBy: req.user.id
            };

            const regularization = await Regularization.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            );

            if (regularization) {
                results.push(regularization._id);
                const dateKey = `${regularization.employeeId.toString()}_${format(new Date(regularization.date), "yyyy-MM-dd")}`;
                affectedPairs.set(dateKey, {
                    employeeId: regularization.employeeId,
                    date: regularization.date
                });
            }
        }

        // Recalculate attendance for all affected employees and dates
        for (const pair of affectedPairs.values()) {
            await applyRegularizationsToAttendance(pair.employeeId, pair.date);
        }

        res.status(200).json({ message: `Successfully ${status.toLowerCase()} ${results.length} regularization requests`, count: results.length });
    } catch (error) {
        console.error("Error bulk updating regularization status:", error);
        res.status(500).json({ message: error.message });
    }
};
