import Regularization from '../../models/Attendance/Regularization.js';
import EmployeeAttendance from '../../models/Attendance/EmployeeAttendance.js';
import Employee from '../../models/HR/Employee.js';
import { uploadToR2, getSignedFileUrl } from '../../utils/r2Upload.js';
import { startOfDay, format } from 'date-fns';
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
            }).select('checkIn checkOut workingHours status');

            if (existingAttendance) {
                regObj.existingAttendance = existingAttendance;
            }

            return regObj;
        }));

        res.status(200).json(signedRegularizations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateRegularizationStatus = async (req, res) => {
    try {
        const { status, reviewRemark, fromTime, toTime } = req.body;

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

            // If Approved, update the actual Attendance Record
            if (status === 'Approved') {
                const regDate = new Date(regularization.date);
                const startOfRegDay = new Date(regDate);
                startOfRegDay.setHours(0, 0, 0, 0);

                const endOfRegDay = new Date(regDate);
                endOfRegDay.setHours(23, 59, 59, 999);

                let attendance = await EmployeeAttendance.findOne({
                    employeeId: regularization.employeeId,
                    date: {
                        $gte: startOfRegDay,
                        $lte: endOfRegDay
                    }
                });

                const employee = await Employee.findById(regularization.employeeId);
                const targetHours = getTargetWorkingHours(employee?.workingHours);

                // 1. Calculate regularized hours from fromTime & toTime
                let regHours = targetHours;
                let checkInDate = null;
                let checkOutDate = null;

                if (regularization.fromTime && regularization.toTime) {
                    const dateOnlyStr = format(new Date(regularization.date), "yyyy-MM-dd");
                    checkInDate = new Date(`${dateOnlyStr}T${regularization.fromTime}:00+05:30`);
                    checkOutDate = new Date(`${dateOnlyStr}T${regularization.toTime}:00+05:30`);

                    if (isNaN(checkInDate.getTime())) {
                        const [fromHours, fromMinutes] = regularization.fromTime.split(':').map(Number);
                        checkInDate = new Date(regDate);
                        checkInDate.setHours(fromHours, fromMinutes, 0, 0);
                    }
                    if (isNaN(checkOutDate.getTime())) {
                        const [toHours, toMinutes] = regularization.toTime.split(':').map(Number);
                        checkOutDate = new Date(regDate);
                        checkOutDate.setHours(toHours, toMinutes, 0, 0);
                    }

                    const diffMs = checkOutDate - checkInDate;
                    if (diffMs > 0) {
                        regHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
                    }
                }

                // 2. Calculate physical checkin-checkout hours if existing and NOT identical to regularization times
                let existingWh = 0;
                const isOngoingShift = Boolean(attendance && attendance.checkIn?.time && !attendance.checkOut?.time);

                if (attendance && !isOngoingShift) {
                    const isSameCheckIn = checkInDate && attendance.checkIn?.time && Math.abs(new Date(attendance.checkIn.time).getTime() - checkInDate.getTime()) < 60000;
                    const isSameCheckOut = checkOutDate && attendance.checkOut?.time && Math.abs(new Date(attendance.checkOut.time).getTime() - checkOutDate.getTime()) < 60000;

                    if (!isSameCheckIn && !isSameCheckOut) {
                        if (attendance.checkIn?.time && attendance.checkOut?.time) {
                            const dur = (new Date(attendance.checkOut.time) - new Date(attendance.checkIn.time)) / (1000 * 60 * 60);
                            if (!isNaN(dur) && dur > 0) existingWh = Number(dur.toFixed(2));
                        }
                        if (existingWh === 0 && typeof attendance.workingHours === 'number' && attendance.workingHours > 0) {
                            existingWh = attendance.workingHours;
                        }
                    }
                }

                // 3. Combined hours: Add regularized duration to existing separate logged attendance hours
                let calculatedWorkingHours = regHours;
                if (existingWh > 0) {
                    calculatedWorkingHours = Number((existingWh + regHours).toFixed(2));
                }

                const finalStatus = determineAttendanceStatus(calculatedWorkingHours, targetHours);

                if (attendance) {
                    if (isOngoingShift) {
                        // Employee is actively on shift! Do NOT prematurely set checkOut and do NOT mark Absent.
                        // Their hours will be combined when they clock out at end of shift.
                        const newRemark = `Regularized ${regHours}h (${regularization.type}): ${regularization.reason}`;
                        attendance.remarks = attendance.remarks
                            ? `${attendance.remarks} | ${newRemark}`
                            : newRemark;

                        await attendance.save();
                    } else {
                        attendance.status = finalStatus;
                        attendance.workingHours = calculatedWorkingHours;

                        // Preserve or set check-in/check-out
                        if (checkInDate && !attendance.checkIn?.time) {
                            attendance.checkIn = { 
                                time: checkInDate, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude
                            };
                        }
                        if (checkOutDate && !attendance.checkOut?.time) {
                            attendance.checkOut = { 
                                time: checkOutDate, 
                                address: regularization.locationAddress || 'Regularized'
                            };
                        }

                        // Append remark
                        const newRemark = `Regularized ${regHours}h (${regularization.type}): ${regularization.reason}`;
                        attendance.remarks = attendance.remarks
                            ? `${attendance.remarks} | ${newRemark}`
                            : newRemark;

                        await attendance.save();
                    }
                } else {
                    // Find employee to get User and Primary Centre
                    if (employee) {
                        const newAttendance = new EmployeeAttendance({
                            user: employee.user,
                            employeeId: regularization.employeeId,
                            centreId: employee.primaryCentre,
                            date: startOfRegDay,
                            status: finalStatus,
                            workingHours: calculatedWorkingHours,
                            remarks: `Regularization (${regularization.type}): ${regularization.reason}`,
                            checkIn: { 
                                time: checkInDate, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude
                            },
                            checkOut: { 
                                time: checkOutDate, 
                                address: regularization.locationAddress || 'Regularized'
                            }
                        });
                        await newAttendance.save();
                    }
                }
            }

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
        const regularization = await Regularization.findByIdAndDelete(req.params.id);
        if (!regularization) return res.status(404).json({ message: 'Regularization not found' });
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

            if (regularization && status === 'Approved') {
                const regDate = new Date(regularization.date);
                const startOfRegDay = new Date(regDate);
                startOfRegDay.setHours(0, 0, 0, 0);

                const endOfRegDay = new Date(regDate);
                endOfRegDay.setHours(23, 59, 59, 999);

                let attendance = await EmployeeAttendance.findOne({
                    employeeId: regularization.employeeId,
                    date: {
                        $gte: startOfRegDay,
                        $lte: endOfRegDay
                    }
                });

                const employee = await Employee.findById(regularization.employeeId);
                const targetHours = getTargetWorkingHours(employee?.workingHours);

                // 1. Calculate regularized hours from fromTime & toTime
                let regHours = targetHours;
                let checkInDate = null;
                let checkOutDate = null;

                if (regularization.fromTime && regularization.toTime) {
                    const dateOnlyStr = format(new Date(regularization.date), "yyyy-MM-dd");
                    checkInDate = new Date(`${dateOnlyStr}T${regularization.fromTime}:00+05:30`);
                    checkOutDate = new Date(`${dateOnlyStr}T${regularization.toTime}:00+05:30`);

                    if (isNaN(checkInDate.getTime())) {
                        const [fromHours, fromMinutes] = regularization.fromTime.split(':').map(Number);
                        checkInDate = new Date(regDate);
                        checkInDate.setHours(fromHours, fromMinutes, 0, 0);
                    }
                    if (isNaN(checkOutDate.getTime())) {
                        const [toHours, toMinutes] = regularization.toTime.split(':').map(Number);
                        checkOutDate = new Date(regDate);
                        checkOutDate.setHours(toHours, toMinutes, 0, 0);
                    }

                    const diffMs = checkOutDate - checkInDate;
                    if (diffMs > 0) {
                        regHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
                    }
                }

                // 2. Calculate physical checkin-checkout hours if existing and NOT identical to regularization times
                let existingWh = 0;
                const isOngoingShift = Boolean(attendance && attendance.checkIn?.time && !attendance.checkOut?.time);

                if (attendance && !isOngoingShift) {
                    const isSameCheckIn = checkInDate && attendance.checkIn?.time && Math.abs(new Date(attendance.checkIn.time).getTime() - checkInDate.getTime()) < 60000;
                    const isSameCheckOut = checkOutDate && attendance.checkOut?.time && Math.abs(new Date(attendance.checkOut.time).getTime() - checkOutDate.getTime()) < 60000;

                    if (!isSameCheckIn && !isSameCheckOut) {
                        if (attendance.checkIn?.time && attendance.checkOut?.time) {
                            const dur = (new Date(attendance.checkOut.time) - new Date(attendance.checkIn.time)) / (1000 * 60 * 60);
                            if (!isNaN(dur) && dur > 0) existingWh = Number(dur.toFixed(2));
                        }
                        if (existingWh === 0 && typeof attendance.workingHours === 'number' && attendance.workingHours > 0) {
                            existingWh = attendance.workingHours;
                        }
                    }
                }

                // 3. Combined hours: Add regularized duration to existing separate logged attendance hours
                let calculatedWorkingHours = regHours;
                if (existingWh > 0) {
                    calculatedWorkingHours = Number((existingWh + regHours).toFixed(2));
                }

                const finalStatus = determineAttendanceStatus(calculatedWorkingHours, targetHours);

                if (attendance) {
                    if (isOngoingShift) {
                        // Employee is actively on shift! Do NOT prematurely set checkOut and do NOT mark Absent.
                        // Their hours will be combined when they clock out at end of shift.
                        const newRemark = `Regularized ${regHours}h (${regularization.type}): ${regularization.reason}`;
                        attendance.remarks = attendance.remarks
                            ? `${attendance.remarks} | ${newRemark}`
                            : newRemark;

                        await attendance.save();
                    } else {
                        attendance.status = finalStatus;
                        attendance.workingHours = calculatedWorkingHours;

                        // Preserve or set check-in/check-out
                        if (checkInDate && !attendance.checkIn?.time) {
                            attendance.checkIn = { 
                                time: checkInDate, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude
                            };
                        }
                        if (checkOutDate && !attendance.checkOut?.time) {
                            attendance.checkOut = { 
                                time: checkOutDate, 
                                address: regularization.locationAddress || 'Regularized'
                            };
                        }

                        const newRemark = `Regularized ${regHours}h (${regularization.type}): ${regularization.reason}`;
                        attendance.remarks = attendance.remarks
                            ? `${attendance.remarks} | ${newRemark}`
                            : newRemark;

                        await attendance.save();
                    }
                } else {
                    if (employee) {
                        const newAttendance = new EmployeeAttendance({
                            user: employee.user,
                            employeeId: regularization.employeeId,
                            centreId: employee.primaryCentre,
                            date: startOfRegDay,
                            status: finalStatus,
                            workingHours: calculatedWorkingHours,
                            remarks: `Regularization (${regularization.type}): ${regularization.reason}`,
                            checkIn: { 
                                time: checkInDate, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude
                            },
                            checkOut: { 
                                time: checkOutDate, 
                                address: regularization.locationAddress || 'Regularized'
                            }
                        });
                        await newAttendance.save();
                    }
                }
            }
            if (regularization) results.push(regularization._id);
        }

        res.status(200).json({ message: `Successfully ${status.toLowerCase()} ${results.length} regularization requests`, count: results.length });
    } catch (error) {
        console.error("Error bulk updating regularization status:", error);
        res.status(500).json({ message: error.message });
    }
};
