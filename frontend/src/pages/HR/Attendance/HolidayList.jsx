import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaChevronLeft, FaChevronRight, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";

const HolidayList = () => {
    const [currentDate, setCurrentDate] = useState(new Date()); // Default to today
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHolidays();
    }, [currentDate]);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const year = currentDate.getFullYear();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/holidays?year=${year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setHolidays(data);
            }
        } catch (error) {
            toast.error("Failed to load holiday calendar");
        } finally {
            setLoading(false);
        }
    };

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);
        const prevMonthDays = daysInMonth(year, month - 1);

        const calendarDays = [];

        // Previous month padding
        for (let i = firstDay - 1; i >= 0; i--) {
            calendarDays.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
        }

        // Current month
        for (let i = 1; i <= days; i++) {
            calendarDays.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
        }

        // Next month padding
        const totalCells = 42;
        const nextPadding = totalCells - calendarDays.length;
        for (let i = 1; i <= nextPadding; i++) {
            calendarDays.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
        }

        return calendarDays;
    };

    const getHoliday = (date) => {
        return holidays.find(h => {
            const hDate = new Date(h.date);
            return hDate.getDate() === date.getDate() &&
                hDate.getMonth() === date.getMonth() &&
                hDate.getFullYear() === date.getFullYear();
        });
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const resetToToday = () => setCurrentDate(new Date());

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 space-y-6 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131619] border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl">
                    <div>
                        <h2 className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Schedule View</h2>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Holiday <span className="text-gray-500">List</span></h1>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1a1f24] rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    {/* Calendar Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/10">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={resetToToday} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all border dark:border-gray-700">Today</button>
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700">
                                <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all text-gray-600 dark:text-gray-400"><FaChevronLeft size={12} /></button>
                                <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all text-gray-600 dark:text-gray-400"><FaChevronRight size={12} /></button>
                            </div>
                        </div>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/20">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-4 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest border-r border-gray-100 dark:border-gray-800/50 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 border-t border-gray-100 dark:border-gray-800">
                        {loading ? (
                            <div className="col-span-7 py-40 text-center"><FaSpinner className="animate-spin mx-auto text-blue-600" size={40} /></div>
                        ) : renderCalendar().map((item, idx) => {
                            const holiday = getHoliday(item.date);
                            const isToday = new Date().toDateString() === item.date.toDateString();

                            return (
                                <div
                                    key={idx}
                                    className={`min-h-[140px] p-4 border-r border-b border-gray-100 dark:border-gray-800 transition-all hover:bg-gray-50/50 dark:hover:bg-blue-500/5 group relative
                                        ${!item.currentMonth ? 'opacity-30' : ''}
                                        ${idx % 7 === 6 ? 'border-r-0' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-lg font-black tracking-tighter ${isToday ? 'w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full' :
                                            item.currentMonth ? 'text-gray-800 dark:text-white' : 'text-gray-400'
                                            }`}>
                                            {item.day}
                                        </span>
                                    </div>

                                    {holiday && (
                                        <div className={`mt-2 p-3 rounded-2xl text-[10px] font-bold shadow-xl border animate-fade-in relative overflow-hidden ${holiday.type === 'Public' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                            holiday.type === 'Office' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                                'bg-purple-500/10 border-purple-500/20 text-purple-500'
                                            }`}>
                                            <div className="relative z-10">
                                                <p className="uppercase leading-tight line-clamp-2 mb-1">{holiday.name}</p>
                                                <span className="opacity-60 text-[8px] block tracking-wider font-black">{holiday.type}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-4">Color Legends</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/20"></div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-tight">Public Holiday</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20"></div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-tight">Office Event</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-purple-500 shadow-lg shadow-purple-500/20"></div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-tight">Optional</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default HolidayList;
