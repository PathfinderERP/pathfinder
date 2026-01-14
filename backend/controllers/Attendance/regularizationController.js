import Regularization from '../../models/Attendance/Regularization.js';
import EmployeeAttendance from '../../models/Attendance/EmployeeAttendance.js';
import Employee from '../../models/HR/Employee.js';
import { uploadToR2, getSignedFileUrl } from '../../utils/r2Upload.js';
import { startOfDay } from 'date-fns';

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

        // Handle Photo Upload
        if (req.file) {
            regularizationData.photo = await uploadToR2(req.file, 'regularization/photos');
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
        const { employeeId, status } = req.query;
        let query = {};
        if (employeeId) query.employeeId = employeeId;
        if (status) query.status = status;

        const regularizations = await Regularization.find(query)
            .populate('employeeId', 'name employeeId profileImage')
            .sort({ createdAt: -1 });

        // Sign photo URLs
        const signedRegularizations = await Promise.all(regularizations.map(async (reg) => {
            const regObj = reg.toObject();
            if (regObj.photo) {
                regObj.photo = await getSignedFileUrl(regObj.photo);
            }
            if (regObj.employeeId && regObj.employeeId.profileImage) {
                regObj.employeeId.profileImage = await getSignedFileUrl(regObj.employeeId.profileImage);
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
        );

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

            // Logic to calculate working hours if times are present
            let calculatedWorkingHours = 9; // Default
            let checkInDate = null;
            let checkOutDate = null;

            if (regularization.fromTime && regularization.toTime) {
                const [fromHours, fromMinutes] = regularization.fromTime.split(':').map(Number);
                const [toHours, toMinutes] = regularization.toTime.split(':').map(Number);

                checkInDate = new Date(regDate);
                checkInDate.setHours(fromHours, fromMinutes, 0, 0);

                checkOutDate = new Date(regDate);
                checkOutDate.setHours(toHours, toMinutes, 0, 0);

                // Calculate difference in hours
                const diffMs = checkOutDate - checkInDate;
                if (diffMs > 0) {
                    calculatedWorkingHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
                }
            }

            if (attendance) {
                attendance.status = 'Present'; // Or 'Half Day' based on hours? Stick to Present for now.
                attendance.workingHours = calculatedWorkingHours;

                if (checkInDate) attendance.checkIn.time = checkInDate;
                if (checkOutDate) attendance.checkOut.time = checkOutDate;

                // Append remark
                const newRemark = `Regularized (${regularization.type}): ${regularization.reason}`;
                attendance.remarks = attendance.remarks
                    ? `${attendance.remarks} | ${newRemark}`
                    : newRemark;

                await attendance.save();
            } else {
                // Find employee to get User and Primary Centre
                const employee = await Employee.findById(regularization.employeeId);
                if (employee) {
                    const newAttendance = new EmployeeAttendance({
                        user: employee.user,
                        employeeId: regularization.employeeId,
                        centreId: employee.primaryCentre,
                        date: startOfRegDay,
                        status: 'Present',
                        workingHours: calculatedWorkingHours,
                        remarks: `Regularization (${regularization.type}): ${regularization.reason}`,
                        checkIn: { 
                            time: checkInDate, 
                            address: 'Regularized',
                            latitude: regularization.latitude,
                            longitude: regularization.longitude
                        },
                        checkOut: { 
                            time: checkOutDate, 
                            address: 'Regularized'
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

export const deleteRegularization = async (req, res) => {
    try {
        const regularization = await Regularization.findByIdAndDelete(req.params.id);
        if (!regularization) return res.status(404).json({ message: 'Regularization not found' });
        res.status(200).json({ message: 'Regularization deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
