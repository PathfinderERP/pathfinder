import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaMapMarkerAlt, FaCalendarCheck, FaClock, FaCheckCircle,
    FaTimesCircle, FaSun, FaUmbrellaBeach, FaBolt
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
    format, startOfYear, endOfYear, eachMonthOfInterval,
    eachDayOfInterval, startOfMonth, endOfMonth, isToday,
    isSameDay, isWeekend, getDay, startOfDay
} from "date-fns";

const EmployeeAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [workingDays, setWorkingDays] = useState({});
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);
    const [year] = useState(new Date().getFullYear());
    const [location, setLocation] = useState(null);

    useEffect(() => {
        fetchAttendance();
        getCurrentLocation();
    }, [year]);

    const fetchAttendance = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/my-history?year=${year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAttendanceData(data.attendances);
                setHolidays(data.holidays);
                setWorkingDays(data.workingDays);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Location error:", error);
                    toast.warn("Please enable location access to mark attendance.");
                }
            );
        }
    };

    const handleMarkAttendance = async (type) => {
        if (!location) {
            toast.error("Location data not available. Please allow location access.");
            getCurrentLocation();
            return;
        }

        setMarking(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/mark`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ...location, type })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                fetchAttendance();
            } else {
                toast.error(data.message || "Failed to mark attendance");
            }
        } catch (error) {
            console.error("Mark error:", error);
            toast.error("Network error");
        } finally {
            setMarking(false);
        }
    };

    const months = eachMonthOfInterval({
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1))
    });

    const getDayStatus = (date) => {
        const dateStr = format(date, "yyyy-MM-dd");

        // Is Holiday?
        const holiday = holidays.find(h => isSameDay(new Date(h.date), date));
        if (holiday) return { type: "Holiday", name: holiday.title };

        // Is it a working day? (day names are lowercase in model)
        const dayName = format(date, "eeee").toLowerCase();
        const isWorkingDay = workingDays[dayName];
        if (!isWorkingDay) return { type: "Off", name: "Weekly Off" };

        // Attendance Record
        const record = attendanceData.find(a => isSameDay(new Date(a.date), date));

        if (record) {
            return {
                type: "Present",
                checkIn: record.checkIn?.time ? format(new Date(record.checkIn.time), "HH:mm") : null,
                checkOut: record.checkOut?.time ? format(new Date(record.checkOut.time), "HH:mm") : null,
                status: record.status
            };
        }

        // If not present and it's in the past
        if (date < startOfDay(new Date()) && isWorkingDay) {
            return { type: "Absent", name: "Absent" };
        }

        return { type: "Upcoming" };
    };

    const todayRecord = attendanceData.find(a => isSameDay(new Date(a.date), new Date()));

    return (
        <Layout activePage="Employee Center">
            <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row gap-8 mb-12 items-start xl:items-center justify-between">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">
                            Attendance <span className="text-cyan-500">Registry</span>
                        </h1>
                        <p className="text-gray-500 font-bold text-xs md:text-sm uppercase tracking-[0.3em] flex items-center gap-2">
                            <FaCalendarCheck className="text-cyan-500" /> Track your daily presence and check-in logs
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                        {!todayRecord || !todayRecord.checkIn ? (
                            <button
                                onClick={() => handleMarkAttendance('checkIn')}
                                disabled={marking || loading}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-4 px-10 py-5 bg-cyan-500 hover:bg-cyan-600 text-[#1a1f24] font-black rounded-[2rem] transition-all shadow-2xl shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                            >
                                <FaMapMarkerAlt size={20} className="animate-bounce" />
                                <span className="uppercase tracking-widest text-sm">Clock In Now</span>
                            </button>
                        ) : !todayRecord.checkOut ? (
                            <button
                                onClick={() => handleMarkAttendance('checkOut')}
                                disabled={marking || loading}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-4 px-10 py-5 bg-red-500 hover:bg-red-600 text-white font-black rounded-[2rem] transition-all shadow-2xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                            >
                                <FaBolt size={20} className="animate-pulse" />
                                <span className="uppercase tracking-widest text-sm">Clock Out Now</span>
                            </button>
                        ) : (
                            <div className="px-10 py-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black rounded-[2rem] flex items-center gap-4 uppercase tracking-widest text-sm">
                                <FaCheckCircle size={20} /> Shift Completed
                            </div>
                        )}
                    </div>
                </div>

                {/* Yearly Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12">
                    {[
                        { label: 'Present', val: attendanceData.length, color: 'emerald' },
                        { label: 'Absences', val: 0, color: 'red' }, // Logic can be improved
                        { label: 'Holidays', val: holidays.length, color: 'blue' },
                        { label: 'Year', val: year, color: 'cyan' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-[#131619] border border-gray-800 p-6 rounded-[2rem] hover:border-gray-700 transition-all group">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-gray-300 transition-colors">{stat.label}</p>
                            <p className={`text-3xl md:text-4xl font-black text-${stat.color}-500 tracking-tighter`}>{stat.val}</p>
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                {loading ? (
                    <div className="flex justify-center p-32"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-cyan-500"></div></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                        {months.map((month, mIdx) => {
                            const days = eachDayOfInterval({
                                start: startOfMonth(month),
                                end: endOfMonth(month)
                            });

                            return (
                                <div key={mIdx} className="bg-[#131619] border border-gray-800 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group hover:border-gray-700 transition-all">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">{format(month, 'MMMM')}</h2>
                                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-xs font-black text-gray-700">
                                            {format(month, 'MM')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                            <div key={i} className="text-center text-[9px] font-black text-gray-600 pb-2">{d}</div>
                                        ))}

                                        {/* Empty cells for start of month */}
                                        {Array.from({ length: getDay(days[0]) }).map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}

                                        {days.map((day, dIdx) => {
                                            const status = getDayStatus(day);
                                            const isHighlight = isToday(day);

                                            let colorClass = "bg-[#1a1f24] text-gray-700";
                                            let dotColor = "";

                                            if (status.type === "Present") {
                                                colorClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                                                dotColor = "bg-emerald-500";
                                            } else if (status.type === "Absent") {
                                                colorClass = "bg-red-500/10 text-red-500 border border-red-500/20";
                                                dotColor = "bg-red-500";
                                            } else if (status.type === "Holiday") {
                                                colorClass = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                                                dotColor = "bg-blue-500";
                                            } else if (status.type === "Off") {
                                                colorClass = "bg-gray-800/20 text-gray-600";
                                            }

                                            return (
                                                <div
                                                    key={dIdx}
                                                    className={`
                                                        aspect-square flex flex-col items-center justify-center rounded-xl text-[10px] font-black transition-all relative
                                                        ${colorClass}
                                                        ${isHighlight ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-[#131619]' : ''}
                                                        group/day cursor-pointer hover:scale-110
                                                    `}
                                                    title={status.name || (status.checkIn ? `In: ${status.checkIn} | Out: ${status.checkOut || 'N/A'}` : '')}
                                                >
                                                    {format(day, 'd')}
                                                    {dotColor && <div className={`w-1 h-1 rounded-full absolute bottom-1.5 ${dotColor} animate-pulse`} />}

                                                    {/* Hover Details Tooltip */}
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg opacity-0 group-hover/day:opacity-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-2xl">
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-white mb-0.5">
                                                            {format(day, 'eee, MMM d')}
                                                        </div>
                                                        <div className="text-[7px] text-gray-500 font-bold uppercase">
                                                            {status.type === "Present" ? `Clocked In: ${status.checkIn}` : status.name || 'Available'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Legend */}
                <div className="mt-12 flex flex-wrap gap-8 p-8 bg-[#131619] border border-gray-800 rounded-[2.5rem] justify-center shadow-inner">
                    {[
                        { color: 'bg-emerald-500', label: 'Present' },
                        { color: 'bg-red-500', label: 'Absent' },
                        { color: 'bg-blue-500', label: 'Holiday' },
                        { color: 'bg-gray-800', label: 'Week Off' },
                        { color: 'bg-cyan-500 ring-2 ring-cyan-500/20', label: 'Today' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-md ${item.color}`} />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
            `}</style>
        </Layout>
    );
};

export default EmployeeAttendance;
