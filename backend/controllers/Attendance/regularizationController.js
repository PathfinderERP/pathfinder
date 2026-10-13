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
                const dateOnlyStr = format(regDate, "yyyy-MM-dd");
                const effFromTime = fromTime || regularization.fromTime;
                const effToTime = toTime || regularization.toTime;

                const employee = await Employee.findById(regularization.employeeId);
                const targetHours = getTargetWorkingHours(employee?.workingHours);

                let cIn = null;
                let cOut = null;
                let calculatedWorkingHours = 0;

                if (effFromTime && effToTime) {
                    cIn = new Date(`${dateOnlyStr}T${effFromTime}:00+05:30`);
                    cOut = new Date(`${dateOnlyStr}T${effToTime}:00+05:30`);

                    if (isNaN(cIn.getTime())) {
                        const [fromHours, fromMinutes] = effFromTime.split(':').map(Number);
                        cIn = new Date(regDate);
                        cIn.setHours(fromHours, fromMinutes, 0, 0);
                    }
                    if (isNaN(cOut.getTime())) {
                        const [toHours, toMinutes] = effToTime.split(':').map(Number);
                        cOut = new Date(regDate);
                        cOut.setHours(toHours, toMinutes, 0, 0);
                    }

                    const diffMs = cOut.getTime() - cIn.getTime();
                    if (diffMs > 0) {
                        calculatedWorkingHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
                    }
                }

                if (calculatedWorkingHours <= 0) {
                    calculatedWorkingHours = targetHours;
                }

                const finalStatus = determineAttendanceStatus(calculatedWorkingHours, targetHours);
                const finalRemarks = `Regularized ${calculatedWorkingHours}h (${regularization.type}): ${regularization.reason || reviewRemark || ''}`.trim();

                const localStart = startOfDay(regDate);
                const localEnd = endOfDay(regDate);
                const utcStart = new Date(dateOnlyStr + "T00:00:00.000Z");
                const utcEnd = new Date(dateOnlyStr + "T23:59:59.999Z");
                const qStart = localStart < utcStart ? localStart : utcStart;
                const qEnd = localEnd > utcEnd ? localEnd : utcEnd;

                let attendance = await EmployeeAttendance.findOne({
                    $or: [
                        { employeeId: regularization.employeeId },
                        { user: employee?.user }
                    ],
                    date: {
                        $gte: qStart,
                        $lte: qEnd
                    }
                });

                const centreId = attendance?.centreId || employee?.primaryCentre || employee?.centres?.[0];

                if (attendance) {
                    attendance.status = finalStatus;
                    attendance.workingHours = calculatedWorkingHours;
                    attendance.remarks = finalRemarks;

                    if (cIn) {
                        attendance.checkIn = {
                            time: cIn,
                            address: regularization.locationAddress || attendance.checkIn?.address || 'Regularized',
                            latitude: regularization.latitude || attendance.checkIn?.latitude,
                            longitude: regularization.longitude || attendance.checkIn?.longitude,
                            centreId: attendance.checkIn?.centreId || centreId
                        };
                    }
                    if (cOut) {
                        attendance.checkOut = {
                            time: cOut,
                            address: regularization.locationAddress || attendance.checkOut?.address || 'Regularized',
                            latitude: regularization.latitude || attendance.checkOut?.latitude,
                            longitude: regularization.longitude || attendance.checkOut?.longitude,
                            centreId: attendance.checkOut?.centreId || centreId
                        };
                    }
                    if (!attendance.centreId && centreId) attendance.centreId = centreId;
                    if (!attendance.user && employee?.user) attendance.user = employee.user;

                    await attendance.save();
                } else {
                    if (employee) {
                        const newAttendance = new EmployeeAttendance({
                            user: employee.user,
                            employeeId: regularization.employeeId,
                            centreId: centreId,
                            date: utcStart,
                            status: finalStatus,
                            workingHours: calculatedWorkingHours,
                            remarks: finalRemarks,
                            checkIn: { 
                                time: cIn, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude,
                                centreId: centreId
                            },
                            checkOut: { 
                                time: cOut, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude,
                                centreId: centreId
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
                const dateOnlyStr = format(regDate, "yyyy-MM-dd");
                const employee = await Employee.findById(regularization.employeeId);
                const targetHours = getTargetWorkingHours(employee?.workingHours);

                let checkInDate = null;
                let checkOutDate = null;
                let calculatedWorkingHours = 0;

                if (regularization.fromTime && regularization.toTime) {
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

                    const diffMs = checkOutDate.getTime() - checkInDate.getTime();
                    if (diffMs > 0) {
                        calculatedWorkingHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
                    }
                }

                if (calculatedWorkingHours <= 0) {
                    calculatedWorkingHours = targetHours;
                }

                const finalStatus = determineAttendanceStatus(calculatedWorkingHours, targetHours);
                const newRemark = `Regularized ${calculatedWorkingHours}h (${regularization.type}): ${regularization.reason || reviewRemark || ''}`.trim();

                const localStart = startOfDay(regDate);
                const localEnd = endOfDay(regDate);
                const utcStart = new Date(dateOnlyStr + "T00:00:00.000Z");
                const utcEnd = new Date(dateOnlyStr + "T23:59:59.999Z");
                const qStart = localStart < utcStart ? localStart : utcStart;
                const qEnd = localEnd > utcEnd ? localEnd : utcEnd;

                let attendance = await EmployeeAttendance.findOne({
                    $or: [
                        { employeeId: regularization.employeeId },
                        { user: employee?.user }
                    ],
                    date: {
                        $gte: qStart,
                        $lte: qEnd
                    }
                });

                const centreId = attendance?.centreId || employee?.primaryCentre || employee?.centres?.[0];

                if (attendance) {
                    attendance.status = finalStatus;
                    attendance.workingHours = calculatedWorkingHours;
                    attendance.remarks = newRemark;

                    if (checkInDate) {
                        attendance.checkIn = {
                            time: checkInDate,
                            address: regularization.locationAddress || attendance.checkIn?.address || 'Regularized',
                            latitude: regularization.latitude || attendance.checkIn?.latitude,
                            longitude: regularization.longitude || attendance.checkIn?.longitude,
                            centreId: attendance.checkIn?.centreId || centreId
                        };
                    }
                    if (checkOutDate) {
                        attendance.checkOut = {
                            time: checkOutDate,
                            address: regularization.locationAddress || attendance.checkOut?.address || 'Regularized',
                            latitude: regularization.latitude || attendance.checkOut?.latitude,
                            longitude: regularization.longitude || attendance.checkOut?.longitude,
                            centreId: attendance.checkOut?.centreId || centreId
                        };
                    }
                    if (!attendance.centreId && centreId) attendance.centreId = centreId;
                    if (!attendance.user && employee?.user) attendance.user = employee.user;

                    await attendance.save();
                } else {
                    if (employee) {
                        const newAttendance = new EmployeeAttendance({
                            user: employee.user,
                            employeeId: regularization.employeeId,
                            centreId: centreId,
                            date: utcStart,
                            status: finalStatus,
                            workingHours: calculatedWorkingHours,
                            remarks: newRemark,
                            checkIn: { 
                                time: checkInDate, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude,
                                centreId: centreId
                            },
                            checkOut: { 
                                time: checkOutDate, 
                                address: regularization.locationAddress || 'Regularized',
                                latitude: regularization.latitude,
                                longitude: regularization.longitude,
                                centreId: centreId
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
