
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaChevronLeft, FaChevronRight, FaBirthdayCake, FaGift, FaCalendarAlt, FaBuilding, FaUserTie, FaMapMarkerAlt, FaSearch, FaFilter } from "react-icons/fa";
import { format, isSameDay, isSameWeek, isSameMonth, addYears, getYear, setYear, isPast, getMonth, isToday, getDate } from "date-fns";
import Layout from "../../components/Layout";

const BirthdayList = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Master Data
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [centres, setCentres] = useState([]);

    // Filters
    const [filterCategory, setFilterCategory] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [filterCentre, setFilterCentre] = useState("");
    const [filterDesig, setFilterDesig] = useState("");
    const [filterMonth, setFilterMonth] = useState("");

    useEffect(() => {
        fetchData();
        fetchMasterData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/hr/birthdays`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching birthdays:", error);
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const [deptRes, desigRes, centreRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                axios.get(`${import.meta.env.VITE_API_URL}/designation`, { headers }),
                axios.get(`${import.meta.env.VITE_API_URL}/centre`, { headers })
            ]);
            setDepartments(deptRes.data);
            setDesignations(desigRes.data);
            setCentres(centreRes.data);
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const getNextBirthday = (dobString) => {
        const dob = new Date(dobString);
        const today = new Date();
        let nextBday = setYear(dob, getYear(today));
        if (isPast(nextBday) && !isSameDay(nextBday, today)) {
            nextBday = addYears(nextBday, 1);
        }
        return nextBday;
    };

    const processBirthdays = () => {
        const today = new Date();
        const currentMonth = getMonth(today);

        let filteredRefs = employees.filter(emp => {
            // Skip employees without valid dateOfBirth
            if (!emp.dateOfBirth) return false;

            const searchMatch = !searchTerm ||
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
            const deptMatch = !filterDept || (emp.department && emp.department._id === filterDept);
            const desigMatch = !filterDesig || (emp.designation && emp.designation._id === filterDesig);
            const centreMatch = !filterCentre || (emp.primaryCentre && emp.primaryCentre._id === filterCentre);

            const dobDate = new Date(emp.dateOfBirth);
            // Validate the date is actually valid
            if (isNaN(dobDate.getTime())) return false;

            const monthMatch = filterMonth === "" || getMonth(dobDate) === parseInt(filterMonth);
            return searchMatch && deptMatch && desigMatch && centreMatch && monthMatch;
        });

        const list = {
            today: [],
            thisWeek: [],
            thisMonth: [],
            upcoming: [],
            all: filteredRefs
        };

        filteredRefs.forEach(emp => {
            const dob = new Date(emp.dateOfBirth);
            const nextBdayStrict = getNextBirthday(emp.dateOfBirth);
            const isMonthMatch = getMonth(dob) === currentMonth;
            const isTodayMatch = getDate(dob) === getDate(today) && getMonth(dob) === currentMonth;
            const currentYearBday = setYear(dob, getYear(today));
            const isWeekMatch = isSameWeek(currentYearBday, today, { weekStartsOn: 1 });

            if (isTodayMatch) list.today.push({ ...emp, nextBirthday: nextBdayStrict });
            if (isWeekMatch) list.thisWeek.push({ ...emp, nextBirthday: currentYearBday });
            if (isMonthMatch) list.thisMonth.push({ ...emp, nextBirthday: currentYearBday });
            list.upcoming.push({ ...emp, nextBirthday: nextBdayStrict });
        });

        const sortFn = (a, b) => {
            const dayA = getDate(new Date(a.dateOfBirth));
            const dayB = getDate(new Date(b.dateOfBirth));
            return dayA - dayB;
        };

        list.today.sort((a, b) => a.name.localeCompare(b.name));
        list.thisWeek.sort((a, b) => getDate(new Date(a.dateOfBirth)) - getDate(new Date(b.dateOfBirth)));
        list.thisMonth.sort((a, b) => getDate(new Date(a.dateOfBirth)) - getDate(new Date(b.dateOfBirth)));
        list.upcoming.sort((a, b) => a.nextBirthday - b.nextBirthday);

        return list;
    };

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 10;

    const birthdayData = processBirthdays();

    let activeList = [];
    if (filterCategory === "Today") activeList = birthdayData.today;
    else if (filterCategory === "This Week") activeList = birthdayData.thisWeek;
    else if (filterCategory === "This Month") activeList = birthdayData.thisMonth;
    else activeList = birthdayData.upcoming;

    // Paginate active list
    const totalRecords = activeList.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedList = activeList.slice((currentPage - 1) * limit, currentPage * limit);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterCategory, searchTerm, filterDept, filterCentre, filterDesig, filterMonth]);


    const renderCard = (emp) => {
        const dob = new Date(emp.dateOfBirth);
        const today = new Date();
        const isBdayMonth = getMonth(dob) === getMonth(today);
        const isBdayToday = getDate(dob) === getDate(today) && isBdayMonth;
        const currentYearBday = setYear(dob, getYear(today));
        const isBdayWeek = isSameWeek(currentYearBday, today, { weekStartsOn: 1 });
        const isSpecial = isBdayMonth || isBdayWeek;

        const borderColor = isBdayToday ? "border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.6)]" :
            isSpecial ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]" : "border-gray-800"; // Less border for normal

        const containerClass = isSpecial ? "transform hover:scale-105 z-10" : "hover:scale-105";

        return (
            <div key={emp._id} className={`bg-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col h-[400px] border-2 ${borderColor} transition-all duration-300 ${containerClass} group relative`}>

                {/* Animation Overlays for Special */}
                {isSpecial && (
                    <>
                        <div className="absolute inset-0 pointer-events-none z-20">
                            <div className="absolute top-4 right-4 text-3xl animate-bounce drop-shadow-md">🎈</div>
                            <div className="absolute top-1/2 left-4 text-2xl animate-spin-slow drop-shadow-md">✨</div>
                        </div>
                    </>
                )}

                {/* --- IMAGE SECTION (80%) --- */}
                <div className="h-[80%] w-full relative group">
                    <img
                        src={emp.profileImage || `https://ui-avatars.com/api/?name=${emp.name}&background=random`}
                        alt={emp.name}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${emp.name}&background=random`;
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* Gradient Overlay for Text Readability at bottom of image if needed, or just specific badge */}
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>

                    {/* Badge: Today/Date */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 z-10">
                        <FaBirthdayCake className={`${isBdayToday ? 'text-pink-500' : 'text-gray-300'}`} />
                        <span className="text-white font-bold text-sm tracking-wide">
                            {emp.dateOfBirth && !isNaN(new Date(emp.dateOfBirth).getTime())
                                ? format(new Date(emp.dateOfBirth), "d MMMM")
                                : "N/A"}
                        </span>
                        {isBdayToday && <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded-full animate-pulse">TODAY</span>}
                    </div>
                </div>

                {/* --- DETAILS SECTION (20%) --- */}
                <div className="h-[20%] w-full bg-[#111827] flex flex-col justify-center px-5 relative z-30 border-t border-gray-700">
                    <h3 className="text-lg font-bold text-white truncate leading-tight flex items-center gap-2">
                        {emp.name}
                        {isBdayToday && <FaGift className="text-pink-500 animate-bounce" />}
                    </h3>
                    <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider mt-1 truncate">
                        {emp.designation?.name || emp.designation?.title || "Employee"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1"><FaBuilding /> {emp.department?.departmentName || "N/A"}</span>
                        <span className="flex items-center gap-1"><FaMapMarkerAlt /> {emp.primaryCentre?.centreName || "H.O"}</span>
                    </div>
                </div>
            </div>
        );
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-pink-500/30">
                <style>{`
                    .animate-spin-slow { animation: spin 4s linear infinite; }
                `}</style>

                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                                Birthdays
                            </span>
                            <span className="text-4xl">🎂</span>
                        </h1>
                    </div>

                    <div className="flex gap-2">
                        {[
                            { label: "Today", val: "Today", count: birthdayData.today.length, col: "bg-pink-600 hover:bg-pink-500" },
                            { label: "This Week", val: "This Week", count: birthdayData.thisWeek.length, col: "bg-purple-600 hover:bg-purple-500" },
                            { label: "This Month", val: "This Month", count: birthdayData.thisMonth.length, col: "bg-indigo-600 hover:bg-indigo-500" },
                            { label: "All", val: "All", count: birthdayData.upcoming.length, col: "bg-gray-700 hover:bg-gray-600" },
                        ].map((stat, i) => (
                            <button
                                key={i}
                                onClick={() => setFilterCategory(stat.val)}
                                className={`px-6 py-3 rounded-2xl ${filterCategory === stat.val ? stat.col : 'bg-gray-800 hover:bg-gray-700'} text-white transition-all font-bold shadow-lg border border-white/5 flex flex-col items-center min-w-[100px]`}
                            >
                                <span className="text-2xl leading-none">{stat.count}</span>
                                <span className="text-[10px] uppercase opacity-70 mt-1">{stat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-gray-900/50 backdrop-blur-xl p-4 rounded-2xl border border-gray-800 mb-8 flex flex-wrap gap-4 items-center shadow-lg">
                    <div className="relative flex-grow max-w-md">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search By Name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 text-gray-100 pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none placeholder-gray-600 font-medium"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar flex-grow">
                        {[
                            { val: filterDept, set: setFilterDept, opts: departments, key: "departmentName", label: "Department" },
                            { val: filterCentre, set: setFilterCentre, opts: centres, key: "centreName", label: "Centre" },
                            { val: filterDesig, set: setFilterDesig, opts: designations, key: "name", label: "Designation" },
                        ].map((f, i) => (
                            <select
                                key={i}
                                value={f.val}
                                onChange={(e) => f.set(e.target.value)}
                                className="bg-gray-950 border border-gray-800 text-gray-300 py-3 px-4 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none min-w-[140px] appearance-none cursor-pointer"
                            >
                                <option value="">All {f.label}s</option>
                                {f.opts.map(o => <option key={o._id} value={o._id}>{o[f.key]}</option>)}
                            </select>
                        ))}
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-gray-950 border border-gray-800 text-gray-300 py-3 px-4 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none min-w-[140px] appearance-none cursor-pointer"
                        >
                            <option value="">By Month</option>
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-32"><div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div></div>
                ) : (
                    <div className="min-h-[400px] flex flex-col justify-between">
                        <div>
                            {paginatedList.length === 0 ? (
                                <div className="text-center py-32 opacity-50">
                                    <FaBirthdayCake className="text-6xl mx-auto mb-4" />
                                    <p className="text-xl font-medium">No celebrations found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                                    {paginatedList.map(emp => renderCard(emp))}
                                </div>
                            )}
                        </div>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-gray-800">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        Showing: {totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, totalRecords)} / {totalRecords} Birthdays
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Go to Page:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={totalPages}
                                            value={currentPage}
                                            onChange={(e) => {
                                                const page = parseInt(e.target.value);
                                                if (page >= 1 && page <= totalPages) {
                                                    setCurrentPage(page);
                                                }
                                            }}
                                            className="w-16 px-3 py-1.5 rounded-xl border border-gray-800 bg-gray-950 text-pink-500 text-[10px] font-black text-center outline-none focus:border-pink-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-pink-500 hover:border-pink-500/30 transition-all disabled:opacity-30 disabled:hover:border-gray-800 disabled:hover:text-gray-400"
                                    >
                                        <FaChevronLeft size={12} />
                                    </button>

                                    {(() => {
                                        const buttons = [];
                                        if (totalPages <= 7) {
                                            for (let i = 1; i <= totalPages; i++) buttons.push(i);
                                        } else {
                                            buttons.push(1);
                                            if (currentPage > 3) buttons.push('...');
                                            const start = Math.max(2, currentPage - 1);
                                            const end = Math.min(totalPages - 1, currentPage + 1);
                                            for (let i = start; i <= end; i++) {
                                                if (!buttons.includes(i)) buttons.push(i);
                                            }
                                            if (currentPage < totalPages - 2) buttons.push('...');
                                            if (!buttons.includes(totalPages)) buttons.push(totalPages);
                                        }

                                        return buttons.map((page, i) => (
                                            page === '...' ? (
                                                <span key={`dots-${i}`} className="px-2 text-[10px] font-black text-gray-700">...</span>
                                            ) : (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === page
                                                        ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20 scale-110"
                                                        : "bg-gray-900 border border-gray-800 text-gray-500 hover:text-white hover:border-gray-700"
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        ));
                                    })()}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-pink-500 hover:border-pink-500/30 transition-all disabled:opacity-30 disabled:hover:border-gray-800 disabled:hover:text-gray-400"
                                    >
                                        <FaChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default BirthdayList;
