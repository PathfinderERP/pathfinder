import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaStop, FaClipboardList, FaCheck } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import StudentAttendanceModal from "../../components/Academics/StudentAttendanceModal";

const OngoingClass = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [verifyingId, setVerifyingId] = useState(null);
    const [showStudentAttendance, setShowStudentAttendance] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState(null);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin" || user.role === "superAdmin";
    const isCoordinator = user.role === "Class_Coordinator";
    const isTeacher = user.role === "teacher";

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchClasses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page,
                limit,
                status: "Ongoing",
                search
            });

            const response = await fetch(`${API_URL}/academics/class-schedule/list?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setClasses(data.classes);
                setTotalPages(data.totalPages);
                setTotalRecords(data.total);
            } else {
                toast.error(data.message || "Failed to fetch ongoing classes");
            }
        } catch (error) {
            toast.error("Error fetching ongoing classes");
        } finally {
            setLoading(false);
        }
    };

    const handleEndClass = async (id) => {
        if (!window.confirm("Are you sure you want to end this class?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/end/${id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Class ended successfully!");
                fetchClasses();
            } else {
                toast.error(data.message || "Failed to end class");
            }
        } catch (error) {
            toast.error("Error ending class");
        }
    };

    const handleAttendance = async (classId, centreLat, centreLng, type = 'teacher') => {
        if (verifyingId === classId) return;

        const cLat = parseFloat(centreLat);
        const cLng = parseFloat(centreLng);

        console.log(`${type === 'coordinator' ? 'Coordinator' : 'Teacher'} Attendance Check:`);
        console.log("Centre Coordinates:", cLat, cLng);

        if (isNaN(cLat) || isNaN(cLng)) {
            toast.error("Center location coordinates are invalid or missing.");
            return;
        }

        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }

        setVerifyingId(classId);
        const toastId = toast.loading("Acquiring precise location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const accuracy = position.coords.accuracy || 0;

                console.log(`User Coordinates: ${userLat}, ${userLng} (Accuracy: ${accuracy}m)`);

                const distance = getDistanceFromLatLonInMeters(userLat, userLng, cLat, cLng);
                console.log("Calculated Distance (m):", distance);

                // Allow 20 meters to account for GPS drift
                const MAX_DISTANCE = 20;

                if (distance > MAX_DISTANCE) {
                    let msg = `You are ${Math.round(distance)}m away from center.`;

                    if (accuracy > 100) {
                        msg += ` Warning: Your device accuracy is poor (${Math.round(accuracy)}m). Please use a Mobile Phone with GPS.`;
                    } else {
                        msg += ` Max allowed is ${MAX_DISTANCE}m.`;
                    }

                    toast.update(toastId, {
                        render: msg,
                        type: "error",
                        isLoading: false,
                        autoClose: 8000
                    });
                    setVerifyingId(null);
                    return;
                }

                try {
                    const token = localStorage.getItem("token");
                    const endpoint = type === 'coordinator'
                        ? `${API_URL}/academics/class-schedule/mark-coordinator-attendance/${classId}`
                        : `${API_URL}/academics/class-schedule/mark-attendance/${classId}`;

                    const response = await fetch(endpoint, {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            latitude: userLat,
                            longitude: userLng
                        })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        toast.update(toastId, { render: "Attendance marked successfully!", type: "success", isLoading: false, autoClose: 3000 });
                        fetchClasses();
                    } else {
                        toast.update(toastId, { render: data.message || "Failed to mark attendance", type: "error", isLoading: false, autoClose: 3000 });
                    }
                } catch (error) {
                    toast.update(toastId, { render: "Error marking attendance", type: "error", isLoading: false, autoClose: 3000 });
                } finally {
                    setVerifyingId(null);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMsg = "Unable to retrieve location.";
                if (error.code === 1) errorMsg = "Location access denied. Please enable location permissions.";
                else if (error.code === 2) errorMsg = "Location unavailable. Ensure GPS is on.";
                else if (error.code === 3) errorMsg = "Location request timed out.";

                toast.update(toastId, { render: errorMsg, type: "error", isLoading: false, autoClose: 4000 });
                setVerifyingId(null);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleStartStudy = async (id) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/start-study/${id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Study started successfully!");
                fetchClasses();
            } else {
                toast.error(data.message || "Failed to start study");
            }
        } catch (error) {
            toast.error("Error starting study");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    const TimeRemaining = ({ endTimeString, classDate }) => {
        const [timeLeft, setTimeLeft] = useState("");

        useEffect(() => {
            const timer = setInterval(() => {
                const now = new Date();
                const [hours, minutes] = endTimeString.split(':');
                const end = new Date(classDate);
                end.setHours(parseInt(hours), parseInt(minutes), 0);

                const diff = end - now;
                if (diff <= 0) {
                    setTimeLeft("Time Over");
                } else {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                }
            }, 1000);
            return () => clearInterval(timer);
        }, [endTimeString, classDate]);

        return <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-cyan-400 text-[10px] rounded border border-cyan-500/30 whitespace-nowrap shadow-xl z-20 font-mono tracking-tighter">
            Time Left: {timeLeft}
        </div>;
    };

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white uppercase italic tracking-wider">Ongoing Class</h1>
                </div>

                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-64">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="bg-[#131619] text-white px-4 py-2 pl-10 rounded-lg border border-gray-700 focus:border-blue-500 outline-none w-full"
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-500" />
                        </div>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="bg-[#131619] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                        >
                            <option value="10">10 per page</option>
                            <option value="20">20 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#2a3038] text-gray-300 text-xs uppercase font-bold tracking-wider">
                                    <th className="p-4">Class Name</th>
                                    <th className="p-4">Class Mode</th>
                                    <th className="p-4">Batches</th>
                                    <th className="p-4">Center</th>
                                    <th className="p-4">Allocated Time</th>
                                    <th className="p-4">Actual Start</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4 text-center">Teacher Attendance</th>
                                    <th className="p-4 text-center">Study Status</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan="10" className="p-8 text-center text-gray-500">Loading...</td></tr>
                                ) : classes.length === 0 ? (
                                    <tr><td colSpan="10" className="p-8 text-center text-gray-500 uppercase tracking-widest opacity-50">No classes are currently ongoing</td></tr>
                                ) : (
                                    classes.map((cls) => (
                                        <tr key={cls._id} className="hover:bg-[#252b32] transition-colors text-sm text-gray-300">
                                            <td className="p-4 font-semibold text-white">{cls.className}</td>
                                            <td className="p-4">{cls.classMode}</td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {cls.batchIds && cls.batchIds.length > 0 ? (
                                                        cls.batchIds.map(b => (
                                                            <span key={b._id} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[10px] border border-cyan-500/20">
                                                                {b.batchName || b.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-600">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">{cls.centreId?.centreName || cls.centreId?.name || "-"}</td>
                                            <td className="p-4 text-xs font-bold text-gray-400">
                                                {cls.startTime} - {cls.endTime}
                                            </td>
                                            <td className="p-4">
                                                {cls.actualStartTime ? new Date(cls.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </td>
                                            <td className="p-4">{cls.subjectId?.subjectName || cls.subjectId?.name || "-"}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col gap-2 scale-90">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClassId(cls._id);
                                                            setShowStudentAttendance(true);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 font-bold text-[10px] uppercase transition shadow-lg ${cls.isStudentAttendanceSaved
                                                            ? 'bg-green-600 text-white shadow-green-900/20'
                                                            : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-900/20'
                                                            }`}
                                                    >
                                                        <FaClipboardList />
                                                        {cls.isStudentAttendanceSaved ? 'Students ✓' : 'Students'}
                                                    </button>

                                                    {(isTeacher || isAdmin) && (
                                                        <button
                                                            onClick={() => !cls.teacherAttendance && handleAttendance(cls._id, cls.centreId?.latitude, cls.centreId?.longitude, 'teacher')}
                                                            disabled={!cls.isStudentAttendanceSaved || cls.teacherAttendance}
                                                            className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 font-bold text-[10px] uppercase transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${cls.teacherAttendance
                                                                ? 'bg-green-600 text-white shadow-green-900/20'
                                                                : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-900/20'
                                                                }`}
                                                        >
                                                            <FaCheck />
                                                            {cls.teacherAttendance ? 'Teacher ✓' : 'Teacher'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {cls.studyStartTime ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] font-bold text-green-400 uppercase">Study Started</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            {new Date(cls.studyStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    isTeacher ? (
                                                        <button
                                                            onClick={() => handleStartStudy(cls._id)}
                                                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition shadow-lg shadow-cyan-900/20"
                                                        >
                                                            Start Study
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase italic">Not Started</span>
                                                    )
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="relative group/hover inline-block">
                                                    {(isAdmin || isCoordinator) ? (
                                                        <button
                                                            onClick={() => handleEndClass(cls._id)}
                                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition shadow-lg shadow-red-900/20"
                                                        >
                                                            <FaStop size={10} /> End
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-cyan-400 uppercase italic animate-pulse cursor-help">
                                                            Ongoing
                                                        </span>
                                                    )}
                                                    <div className="invisible group-hover/hover:visible">
                                                        <TimeRemaining endTimeString={cls.endTime} classDate={cls.date} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-6 text-sm text-gray-400">
                        <div>
                            Showing {totalRecords === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
                            >
                                Previous
                            </button>
                            <span> Page {page} of {totalPages} </span>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {showStudentAttendance && selectedClassId && (
                    <StudentAttendanceModal
                        classScheduleId={selectedClassId}
                        onClose={() => {
                            setShowStudentAttendance(false);
                            setSelectedClassId(null);
                        }}
                        onSaveSuccess={fetchClasses}
                    />
                )}
            </div>
        </Layout>
    );
};

const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius of the earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters
    return d;
};

export default OngoingClass;
