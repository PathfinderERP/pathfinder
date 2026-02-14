import React, { useState, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import {
    FaBuilding, FaStopwatch,
    FaMapMarkerAlt, FaCalendarCheck, FaBolt, FaCheckCircle, FaCheck
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
    format, startOfYear, endOfYear, eachMonthOfInterval,
    eachDayOfInterval, startOfMonth, endOfMonth, isToday,
    isSameDay, getDay, startOfDay, getMonth
} from "date-fns";
import {
    CartesianGrid,
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { useTheme } from "../../context/ThemeContext";

const ShiftTimer = ({ checkIn, targetHours }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const update = () => {
            const start = new Date(checkIn).getTime();
            const now = Date.now();
            setElapsed(Math.max(0, now - start));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [checkIn]);

    const elapsedHours = elapsed / (1000 * 60 * 60);
    const remaining = Math.max(0, targetHours - elapsedHours);

    const formatTime = (ms) => {
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((ms % (1000 * 60)) / 1000);
        return `${h}h ${m}m ${s}s`;
    };

    const remainingTimeStr = () => {
        if (remaining <= 0) return "Overtime";
        const h = Math.floor(remaining);
        const m = Math.floor((remaining - h) * 60);
        const s = Math.floor(((remaining - h) * 60 - m) * 60);
        return `${h}h ${m}m ${s}s`;
    };

    const progressPercent = Math.min(100, (elapsedHours / targetHours) * 100);

    // Dynamic Color Logic: Red -> Yellow -> Green
    const getProgressColor = () => {
        if (remaining <= 0) return 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]'; // Overtime
        if (progressPercent < 50) return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'; // Initial / Absent range
        if (progressPercent < 90) return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]'; // Half day / Progressing
        return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]'; // Target Met
    };

    return (
        <div className="w-full max-w-md">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">Elapsed</p>
                    <p className="text-gray-900 dark:text-white font-black text-2xl tracking-tighter tabular-nums drop-shadow-md">{formatTime(elapsed)}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">{remaining <= 0 ? 'Overtime' : 'Remaining'}</p>
                    <p className={`font-black text-2xl tracking-tighter tabular-nums drop-shadow-md ${remaining <= 0 ? 'text-indigo-400 animate-pulse' : 'text-gray-600 dark:text-gray-300'}`}>{remainingTimeStr()}</p>
                </div>
            </div>
            {/* Progress Bar Container */}
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner p-[2px]">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
            {/* Markers */}
            <div className="flex justify-between mt-1 px-1">
                <span className="text-[8px] font-black uppercase text-red-500">Start</span>
                <span className="text-[8px] font-black uppercase text-yellow-500">50%</span>
                <span className="text-[8px] font-black uppercase text-emerald-500">Target</span>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    if (active && payload && payload.length) {
        return (
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200 shadow-xl'} border p-3 rounded-[2px]`}>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-xs font-black mb-1 uppercase tracking-wider`}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-[10px] font-bold">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase`}>{entry.name}:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-mono`}>{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const EmployeeAttendance = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [attendanceData, setAttendanceData] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [workingDays, setWorkingDays] = useState({});
    const [workingHours, setWorkingHours] = useState(0);
    const [assignedCentres, setAssignedCentres] = useState(null);
    const [dateOfJoining, setDateOfJoining] = useState(null);
    const [employeeDetails, setEmployeeDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);
    const [year] = useState(new Date().getFullYear());
    const [location, setLocation] = useState(null);

    useEffect(() => {
        fetchAttendance();
        getCurrentLocation();

        // Polling for live updates
        const interval = setInterval(() => {
            fetchAttendance();
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(interval);
    }, [year]);

    const fetchAttendance = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/my-history?year=${year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAttendanceData(data.attendances || []);
                setHolidays(data.holidays || []);
                setWorkingDays(data.workingDays || {});
                setWorkingHours(data.workingHours || 0);
                setAssignedCentres(data.assignedCentres);
                setDateOfJoining(data.dateOfJoining);
                setEmployeeDetails(data.employeeDetails);
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
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Location error:", error);
                    toast.warn("Please enable high-accuracy location access to mark attendance.");
                },
                options
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

                // --- Voice Greeting Logic ---
                const userName = employeeDetails?.name?.split(' ')[0] || "Employee";
                const speak = (text) => {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.rate = 0.9;
                    utterance.pitch = 1.1;
                    window.speechSynthesis.speak(utterance);
                };

                if (type === 'checkIn') {
                    const hour = new Date().getHours();
                    let timeGreeting = "Morning";
                    if (hour >= 12 && hour < 17) timeGreeting = "Afternoon";
                    if (hour >= 17) timeGreeting = "Evening";
                    speak(`Good ${timeGreeting}, ${userName}. Have a productive day at work!`);
                } else if (type === 'checkOut') {
                    speak(`Great job today, ${userName}. Your shift is completed. Have a wonderful evening!`);
                }

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

    const StatusLegend = () => (
        <div className={`flex flex-wrap gap-4 px-6 py-3 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-[2px] shadow-inner mb-6`}>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-[2px]" />
                <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest`}>Absent (&lt;4h)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-[2px]" />
                <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest`}>Half Day (h/2)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-500 rounded-[2px]" />
                <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest`}>Early Leave (1-2h)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-lime-500 rounded-[2px]" />
                <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest`}>Short Leave (30m)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-[2px]" />
                <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest`}>Present (9h)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-[2px]" />
                <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-widest`}>Overtime (9h+) ★</span>
            </div>
        </div>
    );

    const getDayStatus = (date) => {
        const dateStrKey = format(date, "yyyy-MM-dd");
        const record = attendanceData.find(a => format(new Date(a.date), "yyyy-MM-dd") === dateStrKey);

        if (record) {
            return {
                type: "Present",
                checkIn: record.checkIn?.time ? format(new Date(record.checkIn.time), "HH:mm") : null,
                checkOut: record.checkOut?.time ? format(new Date(record.checkOut.time), "HH:mm") : null,
                status: record.status || "Present",
                workingHours: record.workingHours || 0,
                centreName: record.centreId?.centreName || "Office"
            };
        }

        const holiday = holidays.find(h => isSameDay(new Date(h.date), date));
        if (holiday) return { type: "Holiday", name: holiday.title };

        // Before joining date, consider as N/A or just blank
        if (dateOfJoining && date < startOfDay(new Date(dateOfJoining))) {
            return { type: "NA", name: "-" };
        }

        const dayName = format(date, "eeee").toLowerCase();
        const isWorkingDay = workingDays && workingDays[dayName];
        if (!isWorkingDay && dayName) return { type: "Off", name: "Weekly Off" };

        if (date < startOfDay(new Date()) && isWorkingDay) {
            return { type: "Absent", name: "Absent" };
        }

        return { type: "Upcoming" };
    };

    // --- Analytics Logic ---
    const stats = useMemo(() => {
        let absents = 0;
        let presents = 0;
        let holidayCount = 0;
        let offs = 0;

        // Month-wise data for Area/Bar Chart
        const monthsData = Array.from({ length: 12 }, (_, i) => ({
            name: format(new Date(year, i, 1), 'MMM'),
            present: 0,
            absent: 0,
            workingHours: 0
        }));

        const joiningDate = dateOfJoining ? new Date(dateOfJoining) : startOfYear(new Date(year, 0, 1));
        const today = startOfDay(new Date());

        // We only calculate up to today for "Absent" count logic
        // But for "Present" count we can look at actual records (which might be future if system allows, but usually past)

        // Populate based on checking each day from Start of Year (or Joining) to Today
        const start = startOfYear(new Date(year, 0, 1));
        const end = today; // Only calculate stats up to current moment for accurate absent count

        const days = eachDayOfInterval({ start, end });

        days.forEach(day => {
            const status = getDayStatus(day);
            const mIndex = getMonth(day);

            if (status.type === 'Present') {
                presents++;
                monthsData[mIndex].present++;
                // Add hours?
                // Need to find record again or pass it back from getDayStatus? 
                // getDayStatus is optimized for returning UI object.
                // Let's do a quick lookup
                const dateStrKey = format(day, "yyyy-MM-dd");
                const record = attendanceData.find(a => format(new Date(a.date), "yyyy-MM-dd") === dateStrKey);
                if (record && record.checkIn?.time && record.checkOut?.time) {
                    const dur = (new Date(record.checkOut.time) - new Date(record.checkIn.time)) / (1000 * 60 * 60);
                    if (!isNaN(dur)) {
                        monthsData[mIndex].workingHours = parseFloat((monthsData[mIndex].workingHours + dur).toFixed(2));
                    }
                }
            } else if (status.type === 'Absent') {
                absents++;
                monthsData[mIndex].absent++;
            } else if (status.type === 'Holiday') {
                // holidays might be future too, this loop is only till today.
                // So holidays count will be "Holidays Passed". 
                // If we want total holidays in year, we use holidays.length
            }
        });

        // Total holidays (whole year)
        holidayCount = holidays.length;

        // Pie Data
        const pieData = [
            { name: 'Present', value: presents, color: '#10b981' }, // Emerald
            { name: 'Absent', value: absents, color: '#ef4444' }, // Red
            { name: 'Holidays', value: holidayCount, color: '#3b82f6' }, // Blue
            // Offs are tricky to count for whole year without loop, ignore for now
        ];

        return { absents, presents, holidayCount, monthsData, pieData };
    }, [attendanceData, holidays, workingDays, dateOfJoining, year]);


    const getWorkingDaysList = () => {
        if (!workingDays) return [];
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        return days.filter(d => workingDays[d]).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3));
    };

    const todayStrKey = format(new Date(), "yyyy-MM-dd");
    const todayRecord = attendanceData.find(a => format(new Date(a.date), "yyyy-MM-dd") === todayStrKey);

    return (
        <Layout activePage="Employee Center">
            <div className={`p-4 md:p-8 max-w-[1800px] mx-auto space-y-8 transition-colors duration-300 ${isDarkMode ? '' : 'text-gray-800'}`}>

                {/* 1. Header & Actions */}
                <div className={`p-8 rounded-[2rem] border transition-all duration-300 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between">
                        <div>
                            <h1 className={`text-4xl md:text-5xl font-black mb-2 tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Attendance <span className="text-cyan-600">Registry</span>
                            </h1>
                            <p className={`font-bold text-xs md:text-sm uppercase tracking-[0.3em] flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <FaCalendarCheck className="text-cyan-600" /> Track your daily presence
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Legend moved to header area */}
                            <div className={`flex flex-wrap gap-2 md:gap-4 px-4 md:px-6 py-3 border rounded-xl shadow-inner w-full md:w-auto justify-center md:justify-start ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-[1px]" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Absent (&lt;4h)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-[1px]" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Half Day (&lt;4.5h)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-pink-500 rounded-[1px]" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Early Leave (up to 8.5h)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-lime-500 rounded-[1px]" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Short Leave (8.5 - 9h)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-[1px]" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Present (9h)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-[1px]" />
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Overtime (&gt;9h) ★</span>
                                </div>
                            </div>

                            <div className="flex gap-4 w-full md:w-auto">
                                {!todayRecord || !todayRecord.checkIn?.time || todayRecord.status === 'Absent' ? (
                                    <button
                                        onClick={() => handleMarkAttendance('checkIn')}
                                        disabled={marking || loading}
                                        className={`flex-1 md:flex-none flex items-center justify-center gap-4 px-10 py-5 font-black rounded-2xl transition-all shadow-2xl active:scale-95 disabled:opacity-50 ${isDarkMode ? 'bg-cyan-500 hover:bg-cyan-400 text-[#1a1f24] shadow-cyan-500/20' : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20'}`}
                                    >
                                        <FaMapMarkerAlt size={20} className="animate-bounce" />
                                        <span className="uppercase tracking-widest text-sm">Clock In Now</span>
                                    </button>
                                ) : !todayRecord.checkOut ? (
                                    <button
                                        onClick={() => handleMarkAttendance('checkOut')}
                                        disabled={marking || loading}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-4 px-10 py-5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-2xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        <FaBolt size={20} className="animate-pulse" />
                                        <span className="uppercase tracking-widest text-sm">Clock Out Now</span>
                                    </button>
                                ) : (
                                    <div className={`flex-1 md:flex-none flex items-center justify-center gap-4 px-10 py-5 font-black rounded-2xl cursor-not-allowed ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                        <FaCheck size={20} />
                                        <span className="uppercase tracking-widest text-sm">Shift Completed</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Analytical Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* A. Monthly Attendance Trend (Area Chart) */}
                    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-lg'} border rounded-[2px] p-6 shadow-xl relative overflow-hidden`}>
                        <h3 className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-black uppercase tracking-widest text-xs mb-4`}>Monthly Attendance Trend</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.monthsData}>
                                    <defs>
                                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} opacity={0.3} />
                                    <XAxis dataKey="name" stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="present" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* B. Attendance Distribution (Pie Chart) */}
                    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-lg'} border rounded-[2px] p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center`}>
                        <h3 className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-black uppercase tracking-widest text-xs mb-4 w-full text-left`}>Yearly Distribution</h3>
                        <div className="h-48 w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.pieData}
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {stats.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="rect"
                                        iconSize={8}
                                        formatter={(value) => <span className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} ml-1`}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Inner Text */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                <div className="text-center flex flex-col items-center">
                                    {employeeDetails ? (
                                        <>

                                            <span className={`block text-[10px] font-black uppercase tracking-tight max-w-[80px] truncate leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {employeeDetails.name ? employeeDetails.name.split(' ')[0] : 'Employee'}
                                            </span>
                                            <span className={`text-[7px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-bold uppercase tracking-widest`}>{stats.presents} Days</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className={`block text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.presents}</span>
                                            <span className={`text-[8px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-black uppercase`}>Present</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* C. Working Hours Analysis (Bar Chart) */}
                    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-lg'} border rounded-[2px] p-6 shadow-xl relative overflow-hidden`}>
                        <h3 className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-black uppercase tracking-widest text-xs mb-4`}>Working Hours / Month</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.monthsData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} opacity={0.3} vertical={false} />
                                    <XAxis dataKey="name" stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="workingHours" fill="#10b981" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 3. Shift Progress & Key Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Shift Progress Card */}
                    {workingHours > 0 && (
                        <div className={`lg:col-span-2 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-lg'} border rounded-[2px] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center`}>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-[2px] ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'} border flex items-center justify-center text-cyan-500 shadow-inner`}>
                                        <FaStopwatch size={24} />
                                    </div>
                                    <div>
                                        <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-black text-lg uppercase tracking-tighter italic`}>Shift Progress</h3>
                                        <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-[10px] font-black uppercase tracking-[0.3em]`}>Target: <span className="text-cyan-500">{workingHours}h</span></p>
                                    </div>
                                </div>
                                <div className="flex-1 w-full md:w-auto flex flex-col items-center">
                                    {todayRecord?.checkIn && !todayRecord?.checkOut ? (
                                        <ShiftTimer checkIn={todayRecord.checkIn.time} targetHours={workingHours} />
                                    ) : todayRecord?.checkOut ? (
                                        <div className="text-center">
                                            <p className="text-emerald-500 font-black text-2xl tracking-tighter">Completed</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className={`${isDarkMode ? 'text-gray-600' : 'text-gray-300'} font-black text-xl tracking-tighter`}>-- : --</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Summary Cards */}
                    <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                        <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-md'} border p-6 rounded-[2px] hover:border-emerald-500/30 transition-all group`}>
                            <p className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Total Present</p>
                            <p className="text-3xl font-black text-emerald-500 tracking-tighter">{stats.presents}</p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-md'} border p-6 rounded-[2px] hover:border-red-500/30 transition-all group`}>
                            <p className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Total Absences</p>
                            <p className="text-3xl font-black text-red-500 tracking-tighter">{stats.absents}</p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-md'} border p-6 rounded-[2px] hover:border-blue-500/30 transition-all group`}>
                            <p className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Holidays</p>
                            <p className="text-3xl font-black text-blue-500 tracking-tighter">{stats.holidayCount}</p>
                        </div>
                        <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-md'} border p-6 rounded-[2px] hover:border-cyan-500/30 transition-all group`}>
                            <p className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-2`}>Current Year</p>
                            <p className="text-3xl font-black text-cyan-500 tracking-tighter">{year}</p>
                        </div>
                    </div>
                </div>

                {/* 4. Calendar Grid */}
                {loading ? (
                    <div className="flex justify-center p-32"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-cyan-500"></div></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {months.map((month, mIdx) => {
                            const days = eachDayOfInterval({
                                start: startOfMonth(month),
                                end: endOfMonth(month)
                            });

                            return (
                                <div key={mIdx} className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-md'} border rounded-[2px] p-6 shadow-xl relative overflow-hidden group hover:border-gray-700 transition-all`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tighter italic`}>{format(month, 'MMMM')}</h2>
                                        <div className={`w-8 h-8 ${isDarkMode ? 'bg-gray-900 text-gray-700' : 'bg-gray-50 text-gray-400'} rounded-[2px] flex items-center justify-center text-[10px] font-black`}>
                                            {format(month, 'MM')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                            <div key={i} className={`text-center text-[9px] font-black ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} pb-2`}>{d}</div>
                                        ))}

                                        {Array.from({ length: getDay(days[0]) }).map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}

                                        {days.map((day, dIdx) => {
                                            const status = getDayStatus(day);
                                            const isHighlight = isToday(day);

                                            let colorClass = isDarkMode ? "bg-[#1a1f24] text-gray-300 hover:bg-gray-800" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100";
                                            let dotColor = "";
                                            let isOvertime = false;

                                            if (status.type === "Present") {
                                                const hours = status.workingHours || 0;
                                                const s = status.status;

                                                if (s === "Absent" || hours < 4) {
                                                    colorClass = "bg-red-500/20 text-red-500 border border-red-500/30";
                                                    dotColor = "bg-red-500";
                                                } else if (s === "Half Day" || hours < 4.5) {
                                                    colorClass = "bg-orange-500/20 text-orange-400 border border-orange-500/30";
                                                    dotColor = "bg-orange-500";
                                                } else if (s === "Early Leave" || hours < 8) {
                                                    colorClass = "bg-pink-500/20 text-pink-400 border border-pink-500/30";
                                                    dotColor = "bg-pink-500";
                                                } else if (hours < 9) {
                                                    colorClass = "bg-lime-500/20 text-lime-400 border border-lime-500/30";
                                                    dotColor = "bg-lime-500";
                                                } else if (s === "Overtime" || hours > 9.05) {
                                                    colorClass = "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30";
                                                    dotColor = "bg-indigo-500";
                                                    isOvertime = true;
                                                } else if (s === "Forgot to Checkout") {
                                                    colorClass = "bg-orange-900/40 text-orange-600 border border-orange-500/30";
                                                    dotColor = "bg-orange-600";
                                                } else {
                                                    colorClass = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
                                                    dotColor = "bg-emerald-500";
                                                }
                                            } else if (status.type === "Absent") {
                                                colorClass = "bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]";
                                                dotColor = "bg-red-500";
                                            } else if (status.type === "Holiday") {
                                                colorClass = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                                                dotColor = "bg-blue-500";
                                            } else if (status.type === "Off") {
                                                colorClass = isDarkMode ? "bg-[#0f1113] text-gray-700 border border-gray-800/50" : "bg-gray-100/30 text-gray-300 border border-gray-100/50";
                                            } else if (status.type === "NA") {
                                                colorClass = "bg-transparent text-gray-800 dark:text-gray-200";
                                            }

                                            return (
                                                <div
                                                    key={dIdx}
                                                    className={`
                                                        aspect-square flex flex-col items-center justify-center rounded-[2px] text-[10px] font-black transition-all relative
                                                        ${colorClass}
                                                        ${isHighlight ? 'ring-1 ring-cyan-500' : ''}
                                                        group/day cursor-pointer hover:scale-105
                                                    `}
                                                    title={status.name}
                                                >
                                                    {format(day, 'd')}
                                                    {dotColor && <div className={`w-1 h-1 rounded-full absolute bottom-1 ${dotColor}`} />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
            `}</style>
        </Layout>
    );
};

export default EmployeeAttendance;
