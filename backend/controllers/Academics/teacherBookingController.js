import TeacherBooking from "../../models/Academics/TeacherBooking.js";
import TeacherRoutine from "../../models/Academics/TeacherRoutine.js";
import User from "../../models/User.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ─── TELECALLER: Get all teacher routines with FREE GAP slots ─────────────────
export const getTeacherScheduleForTelecaller = async (req, res) => {
    try {
        // 1. Get all teacher routines
        const routines = await TeacherRoutine.find()
            .populate("teacherId", "name email mobNum employeeId subject")
            .populate("centreId", "centreName")
            .populate("subjectId", "subName")
            .populate("classId", "name")
            .sort({ teacherId: 1, day: 1, startTime: 1 });

        // 2. Get all existing bookings
        const bookings = await TeacherBooking.find()
            .populate("bookedBy", "name employeeId")
            .populate("students.leadId", "name phoneNumber");

        // 3. Build booking map: teacherId_day_startTime -> [bookings]
        const bookingMap = {};
        bookings.forEach(b => {
            const key = `${b.teacherId}_${b.day}_${b.startTime}`;
            if (!bookingMap[key]) bookingMap[key] = [];
            bookingMap[key].push(b);
        });

        // 4. Time helpers
        const timeToMins = (t) => {
            if (!t) return 0;
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
        };
        const minsToTime = (m) => {
            const h = Math.floor(m / 60).toString().padStart(2, "0");
            const min = (m % 60).toString().padStart(2, "0");
            return `${h}:${min}`;
        };

        const WORK_START = 8 * 60;  // 08:00
        const WORK_END   = 22 * 60; // 22:00
        const MIN_FREE   = 30;      // minimum gap (mins) to show a free slot

        // 5. Group routines by teacher
        const groupedMap = new Map();
        for (const routine of routines) {
            const teacherId = routine.teacherId?._id?.toString();
            if (!teacherId) continue;

            if (!groupedMap.has(teacherId)) {
                const emptyDays = {};
                DAYS.forEach(d => (emptyDays[d] = { classSessions: [], freeSlots: [] }));
                groupedMap.set(teacherId, {
                    teacher: {
                        _id: teacherId,
                        name: routine.teacherId.name,
                        employeeId: routine.teacherId.employeeId,
                        email: routine.teacherId.email,
                        mobNum: routine.teacherId.mobNum,
                        subject: routine.teacherId.subject,
                    },
                    days: emptyDays
                });
            }

            groupedMap.get(teacherId).days[routine.day].classSessions.push({
                _id: routine._id,
                centre: routine.centreId?.map(c => c?.centreName).filter(Boolean).join(", "),
                startTime: routine.startTime,
                endTime: routine.endTime,
                class: routine.classId?.map(c => c?.name).filter(Boolean).join(", "),
                subject: routine.subjectId?.map(s => s?.subName).filter(Boolean).join(", "),
                className: routine.className,
                classHours: routine.classHours,
            });
        }

        // 6. Compute FREE gap slots for each teacher per day
        for (const [teacherId, data] of groupedMap.entries()) {
            for (const day of DAYS) {
                const sessions = data.days[day].classSessions;

                const sorted = sessions
                    .filter(s => s.startTime && s.endTime)
                    .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

                const freeSlots = [];
                let cursor = WORK_START;

                const pushFree = (start, end) => {
                    if (end - start < MIN_FREE) return;
                    const st = minsToTime(start);
                    const et = minsToTime(end);
                    const key = `${teacherId}_${day}_${st}`;
                    const slotBookings = bookingMap[key] || [];
                    const totalStudents = slotBookings.reduce((acc, b) => acc + (b.students?.length || 0), 0);
                    freeSlots.push({
                        startTime: st,
                        endTime: et,
                        durationMins: end - start,
                        bookings: slotBookings,
                        totalStudentsBooked: totalStudents,
                        isBooked: slotBookings.length > 0,
                    });
                };

                for (const session of sorted) {
                    const sStart = timeToMins(session.startTime);
                    const sEnd   = timeToMins(session.endTime);
                    pushFree(cursor, sStart);
                    cursor = Math.max(cursor, sEnd);
                }

                // Gap after last class (or full day if teacher has no classes)
                pushFree(cursor, WORK_END);

                data.days[day].freeSlots = freeSlots;
            }
        }

        res.status(200).json(Array.from(groupedMap.values()));
    } catch (error) {
        console.error("Get Teacher Schedule For Telecaller Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ─── TELECALLER: Book a teacher slot ─────────────────────────────────────────
export const bookTeacherSlot = async (req, res) => {
    try {
        const {
            teacherId, routineId, centreId, day,
            startTime, endTime, subject, className,
            students, notes
        } = req.body;

        if (!teacherId || !day || !startTime || !endTime) {
            return res.status(400).json({ message: "teacherId, day, startTime, endTime are required" });
        }

        const newBooking = new TeacherBooking({
            teacherId,
            routineId: routineId || null,
            centreId: centreId || null,
            day,
            startTime,
            endTime,
            subject,
            className,
            bookedBy: req.user._id,
            students: students || [],
            notes,
            status: "pending",
            createdBy: req.user._id
        });

        await newBooking.save();

        const populated = await TeacherBooking.findById(newBooking._id)
            .populate("teacherId", "name email mobNum employeeId")
            .populate("bookedBy", "name employeeId");

        res.status(201).json({ message: "Booking created successfully", booking: populated });
    } catch (error) {
        console.error("Book Teacher Slot Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ─── TEACHER: Get all bookings assigned to the logged-in teacher ──────────────
export const getBookingsForTeacher = async (req, res) => {
    try {
        const teacherId = req.user._id;

        const bookings = await TeacherBooking.find({ teacherId })
            .populate("bookedBy", "name employeeId email mobNum")
            .populate("centreId", "centreName")
            .populate("students.leadId", "name phoneNumber email")
            .sort({ createdAt: -1 });

        // Group by day for easier frontend rendering
        const grouped = {};
        DAYS.forEach(d => (grouped[d] = []));

        bookings.forEach(b => {
            if (grouped[b.day] !== undefined) {
                grouped[b.day].push(b);
            }
        });

        res.status(200).json({ bookings, grouped });
    } catch (error) {
        console.error("Get Bookings For Teacher Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ─── ADMIN/HOD: Get all bookings ──────────────────────────────────────────────
export const getAllBookings = async (req, res) => {
    try {
        const { teacherId, status, day, centreId } = req.query;
        const query = {};
        if (teacherId) query.teacherId = teacherId;
        if (status) query.status = status;
        if (day) query.day = day;
        if (centreId) query.centreId = centreId;

        const bookings = await TeacherBooking.find(query)
            .populate("teacherId", "name email mobNum employeeId")
            .populate("bookedBy", "name employeeId email")
            .populate("centreId", "centreName")
            .populate("students.leadId", "name phoneNumber email")
            .sort({ createdAt: -1 });

        res.status(200).json({ bookings, total: bookings.length });
    } catch (error) {
        console.error("Get All Bookings Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ─── UPDATE BOOKING ───────────────────────────────────────────────────────────
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updatedBy: req.user._id };

        const booking = await TeacherBooking.findByIdAndUpdate(id, updates, { new: true })
            .populate("teacherId", "name email mobNum employeeId")
            .populate("bookedBy", "name employeeId");

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        res.status(200).json({ message: "Booking updated successfully", booking });
    } catch (error) {
        console.error("Update Booking Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ─── DELETE BOOKING ───────────────────────────────────────────────────────────
export const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TeacherBooking.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Booking not found" });
        res.status(200).json({ message: "Booking deleted successfully" });
    } catch (error) {
        console.error("Delete Booking Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
