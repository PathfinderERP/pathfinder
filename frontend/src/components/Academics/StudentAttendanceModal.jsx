import React, { useState, useEffect } from "react";
import { FaTimes, FaCheck, FaUserGraduate, FaIdCard, FaBuilding, FaBook } from "react-icons/fa";
import { toast } from "react-toastify";

const StudentAttendanceModal = ({ classScheduleId, onClose, onSaveSuccess }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [batchWiseStudents, setBatchWiseStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: "Present" | "Absent" }
    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchStudents();
    }, [classScheduleId]);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/student-attendance/${classScheduleId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setBatchWiseStudents(data.batchWiseStudents);

                // Initialize attendance map
                const initialMap = {};
                // If attendance was already saved, use that
                if (data.existingAttendance && data.existingAttendance.length > 0) {
                    data.existingAttendance.forEach(att => {
                        initialMap[att.studentId] = att.status;
                    });
                } else {
                    // Default everyone to Absent as per requirement (unchecked = absent)
                    data.batchWiseStudents.forEach(batch => {
                        batch.students.forEach(student => {
                            if (!initialMap[student._id]) initialMap[student._id] = "Absent";
                        });
                    });
                }
                setAttendanceMap(initialMap);
            } else {
                toast.error(data.message || "Failed to fetch students");
            }
        } catch (error) {
            toast.error("Error fetching students");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAttendance = (studentId) => {
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: prev[studentId] === "Present" ? "Absent" : "Present"
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const attendanceData = [];

            batchWiseStudents.forEach(batch => {
                batch.students.forEach(student => {
                    attendanceData.push({
                        studentId: student._id,
                        batchId: batch.batchId,
                        status: attendanceMap[student._id] || "Absent"
                    });
                });
            });

            const response = await fetch(`${API_URL}/academics/class-schedule/student-attendance/save/${classScheduleId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ attendanceData })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Student attendance saved successfully");
                onSaveSuccess();
                onClose();
            } else {
                toast.error(data.message || "Failed to save attendance");
            }
        } catch (error) {
            toast.error("Error saving attendance");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-gray-100">
            <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#252b32]">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FaUserGraduate className="text-cyan-400" />
                            Student Attendance
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold italic">Mark present students for this class</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-500 text-gray-400 rounded-xl transition-all">
                        <FaTimes size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                            <p className="text-gray-400 animate-pulse">Loading students list...</p>
                        </div>
                    ) : batchWiseStudents.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 italic">No students found for allocated batches.</div>
                    ) : (
                        batchWiseStudents.map((batch) => (
                            <div key={batch.batchId} className="bg-[#131619] rounded-xl border border-gray-800 overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-[#252b32] p-4 border-b border-gray-800 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                                        <FaBuilding className="text-gray-500" />
                                        Batch: {batch.batchName}
                                    </h3>
                                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full font-bold uppercase border border-cyan-500/20">
                                        {batch.students.length} Students
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-[#1a1f24] text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                                <th className="p-4">Student Name</th>
                                                <th className="p-4">Admission ID</th>
                                                <th className="p-4">Course</th>
                                                <th className="p-4">Centre</th>
                                                <th className="p-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/50">
                                            {batch.students.map((student) => {
                                                const details = student.studentsDetails?.[0] || {};
                                                // Used backend-provided admissionNumber
                                                const admissionNo = student.admissionNumber || "N/A";
                                                const isPresent = attendanceMap[student._id] === "Present";

                                                return (
                                                    <tr key={student._id} className="hover:bg-cyan-500/5 transition-colors group">
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-semibold group-hover:text-cyan-400 transition-colors">{details.studentName}</span>
                                                                <span className="text-[10px] text-gray-500">Gender: {details.gender}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono text-xs text-yellow-500/80">
                                                            <div className="flex items-center gap-2">
                                                                <FaIdCard className="text-gray-600" />
                                                                {admissionNo}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                <FaBook className="text-gray-600" />
                                                                {student.course?.courseName || student.course?.name || "N/A"}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs text-gray-400">
                                                            {details.centre || "N/A"}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <button
                                                                onClick={() => handleToggleAttendance(student._id)}
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPresent
                                                                    ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                                                    : 'bg-gray-800 text-gray-600 border border-gray-700 hover:border-gray-500'
                                                                    }`}
                                                            >
                                                                <FaCheck />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-[#252b32] flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
                            Checked = Present
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-gray-800 border border-gray-700 rounded-sm"></span>
                            Unchecked = Absent
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all uppercase text-sm tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading || batchWiseStudents.length === 0}
                            className="px-10 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 uppercase text-sm tracking-wider"
                        >
                            {saving ? "Saving..." : "Save Attendance"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendanceModal;
