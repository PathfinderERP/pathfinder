import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaSearch, FaFilter, FaSync, FaCheckSquare, FaSquare, FaUsers, FaPlus, FaTimes, FaUserGraduate } from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MultiSelectFilter from "../common/MultiSelectFilter";
import Pagination from "../common/Pagination";
import { TableRowSkeleton } from "../common/Skeleton";
import "./AdmissionsWave.css";

const BatchAllocationContent = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const apiUrl = import.meta.env.VITE_API_URL;

    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    // Selection state
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [selectedBatchIds, setSelectedBatchIds] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterCourse, setFilterCourse] = useState([]);
    const [filterClass, setFilterClass] = useState([]);
    const [filterProgramme, setFilterProgramme] = useState([]);
    const [filterSession, setFilterSession] = useState([]);
    const [filterBatch, setFilterBatch] = useState([]);

    // Master Data for filters
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // Master data for filters
    const [masterClasses, setMasterClasses] = useState([]);
    const [masterCourses, setMasterCourses] = useState([]);
    const [masterSessions, setMasterSessions] = useState([]);

    const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
    const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";

    const fetchBatches = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/batch/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setBatches(data);
            }
        } catch (error) {
            console.error("Error fetching batches:", error);
        }
    }, [apiUrl]);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            // Fetch from /admission to get populated course data
            const response = await fetch(`${apiUrl}/admission`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const admissionsData = await response.json();
                
                // Group admissions by student (similar to EnrolledStudentsContent)
                const studentMap = {};
                admissionsData.forEach(admission => {
                    const studentId = admission.student?._id;
                    if (studentId) {
                        if (!studentMap[studentId]) {
                            studentMap[studentId] = {
                                ...admission.student,
                                admissions: [],
                                latestAdmission: null
                            };
                        }
                        studentMap[studentId].admissions.push(admission);
                    }
                });

                // Convert to array and add metadata
                const studentsArray = Object.values(studentMap).map(item => {
                    // Sort admissions by date (newest first)
                    item.admissions.sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate));
                    item.latestAdmission = item.admissions[0];
                    return item;
                });

                setStudents(studentsArray);
            } else {
                toast.error("Failed to fetch students");
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    const fetchAllowedCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const profileResponse = await fetch(`${apiUrl}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let currentUser = user;
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                currentUser = profileData.user;
            }

            if (currentUser.role === 'superAdmin' || currentUser.role === 'Super Admin') {
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const centres = response.ok ? await response.json() : [];
                setAllowedCentres(centres.map(c => c.centreName));
            } else {
                const userCentres = currentUser.centres || [];
                setAllowedCentres(userCentres.map(c => c.centreName || c.name || c).filter(Boolean));
            }
        } catch (error) {
            console.error("Error fetching allowed centres:", error);
        }
    }, [apiUrl, user]);

    const fetchMasterData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Classes
            const classRes = await fetch(`${apiUrl}/class`, { headers });
            if (classRes.ok) setMasterClasses(await classRes.json());

            // Fetch Courses
            const courseRes = await fetch(`${apiUrl}/course`, { headers });
            if (courseRes.ok) setMasterCourses(await courseRes.json());

            // Fetch Sessions
            const sessionRes = await fetch(`${apiUrl}/session/list`, { headers });
            if (sessionRes.ok) setMasterSessions(await sessionRes.json());
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchAllowedCentres();
        fetchMasterData();
        fetchBatches();
        fetchStudents();
    }, [fetchAllowedCentres, fetchMasterData, fetchBatches, fetchStudents]);

    // Filtering logic
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const details = student.studentsDetails?.[0] || {};
            const centre = details.centre || "";
            // Use latestAdmission course if available
            const course = student.latestAdmission?.course?.courseName || student.latestAdmission?.boardCourseName || "";
            const className = student.latestAdmission?.class?.name || student.latestAdmission?.class?.className || "";
            const programme = details.programme || "";
            const session = student.latestAdmission?.academicSession || "";
            const name = details.studentName || "";
            const mobile = details.mobileNum || "";

            // Access control
            if (!isSuperAdmin && !allowedCentres.includes(centre)) return false;

            const matchesSearch = !searchQuery || 
                name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                mobile.includes(searchQuery) ||
                (student.latestAdmission?.admissionNumber && student.latestAdmission.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCentre = filterCentre.length === 0 || filterCentre.includes(centre);
            const matchesCourse = filterCourse.length === 0 || filterCourse.includes(course);
            const matchesClass = filterClass.length === 0 || filterClass.includes(className);
            const matchesProgramme = filterProgramme.length === 0 || filterProgramme.includes(programme);
            const matchesSession = filterSession.length === 0 || filterSession.includes(session);
            
            const studentBatchIds = student.batches?.map(b => b._id?.toString() || b.toString()) || [];
            const matchesBatch = filterBatch.length === 0 || filterBatch.some(bid => studentBatchIds.includes(bid));

            return matchesSearch && matchesCentre && matchesCourse && matchesClass && matchesProgramme && matchesSession && matchesBatch;
        });
    }, [students, searchQuery, filterCentre, filterCourse, filterClass, filterProgramme, filterSession, filterBatch, allowedCentres, isSuperAdmin]);

    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredStudents, currentPage]);

    const uniqueValues = useMemo(() => {
        const centres = new Set();
        const courses = new Set();
        const classes = new Set();
        const programmes = new Set();
        const sessions = new Set();

        students.forEach(s => {
            const details = s.studentsDetails?.[0] || {};
            if (details.centre) centres.add(details.centre);
            
            const course = s.latestAdmission?.course?.courseName || s.latestAdmission?.boardCourseName;
            const className = s.latestAdmission?.class?.name || s.latestAdmission?.class?.className;
            const programme = details.programme;
            const session = s.latestAdmission?.academicSession;

            if (course) courses.add(course);
            if (className) classes.add(className);
            if (programme) programmes.add(programme);
            if (session) sessions.add(session);
        });

        return {
            centres: Array.from(centres).sort(),
            courses: masterCourses.length > 0 
                ? masterCourses.map(c => c.courseName).sort() 
                : Array.from(courses).sort(),
            classes: masterClasses.length > 0 
                ? masterClasses.map(c => c.name || c.className).sort() 
                : Array.from(classes).sort(),
            programmes: Array.from(programmes).sort(),
            sessions: masterSessions.length > 0 
                ? masterSessions.map(s => s.sessionName).sort() 
                : Array.from(sessions).sort()
        };
    }, [students, masterClasses, masterCourses, masterSessions]);

    const handleSelectAll = () => {
        if (selectedStudentIds.length === paginatedStudents.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(paginatedStudents.map(s => s._id));
        }
    };

    const handleSelectStudent = (id) => {
        setSelectedStudentIds(prev => 
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleBulkAssign = async () => {
        if (selectedBatchIds.length === 0) {
            toast.error("Please select at least one batch");
            return;
        }
        if (selectedStudentIds.length === 0) {
            toast.error("Please select at least one student");
            return;
        }

        setProcessing(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/batch/assign`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentIds: selectedStudentIds,
                    batchIds: selectedBatchIds
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                setSelectedStudentIds([]);
                setSelectedBatchIds([]); // Clear batch selection after success
                fetchStudents(); // Refresh to see updated batches
            } else {
                toast.error(data.message || "Failed to assign batch");
            }
        } catch (error) {
            console.error("Bulk assign error:", error);
            toast.error("Error connecting to server");
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveBatch = async (studentId, batchId) => {
        if (!window.confirm("Are you sure you want to remove this batch assignment?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/batch/remove/${studentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ batchId })
            });

            if (response.ok) {
                toast.success("Batch removed successfully");
                fetchStudents();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to remove batch");
            }
        } catch (error) {
            console.error("Remove batch error:", error);
            toast.error("Error connecting to server");
        }
    };

    return (
        <div className={`flex-1 p-6 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Batch Allocation
                    </h2>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Allocate batches to admitted students
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className={`flex items-center gap-3 p-1.5 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="min-w-[250px]">
                            <MultiSelectFilter
                                label="Batch"
                                placeholder="Select Batches"
                                options={batches.map(b => ({ 
                                    value: b._id, 
                                    label: `${b.batchName} (${b.centreId?.centreName || 'No Centre'})` 
                                }))}
                                selectedValues={selectedBatchIds}
                                onChange={setSelectedBatchIds}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                        <button 
                            onClick={handleBulkAssign}
                            disabled={processing || selectedStudentIds.length === 0 || selectedBatchIds.length === 0}
                            className="px-6 py-2.5 bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest rounded-[4px] hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {processing ? "Assigning..." : "Assign Bulk"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border mb-8`}>
                <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex-1 relative min-w-[250px]">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME, MOBILE OR ADMISSION NO..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className={`w-full pl-12 pr-4 py-3 rounded-[4px] border text-[10px] font-black tracking-widest uppercase outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                        />
                    </div>

                    <MultiSelectFilter
                        label="Centre"
                        placeholder="All Centres"
                        options={uniqueValues.centres.map(c => ({ value: c, label: c.toUpperCase() }))}
                        selectedValues={filterCentre}
                        onChange={setFilterCentre}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <MultiSelectFilter
                        label="Course"
                        placeholder="All Courses"
                        options={uniqueValues.courses.map(c => ({ value: c, label: c.toUpperCase() }))}
                        selectedValues={filterCourse}
                        onChange={setFilterCourse}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <MultiSelectFilter
                        label="Class"
                        placeholder="All Classes"
                        options={uniqueValues.classes.map(c => ({ value: c, label: c.toUpperCase() }))}
                        selectedValues={filterClass}
                        onChange={setFilterClass}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <MultiSelectFilter
                        label="Programme"
                        placeholder="All Programmes"
                        options={uniqueValues.programmes.map(p => ({ value: p, label: p.toUpperCase() }))}
                        selectedValues={filterProgramme}
                        onChange={setFilterProgramme}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <MultiSelectFilter
                        label="In Batch"
                        placeholder="Filter by Batch"
                        options={batches.map(b => ({ 
                            value: b._id, 
                            label: `${b.batchName} (${b.centreId?.centreName || 'No Centre'})`.toUpperCase() 
                        }))}
                        selectedValues={filterBatch}
                        onChange={setFilterBatch}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setFilterCentre([]);
                            setFilterCourse([]);
                            setFilterClass([]);
                            setFilterProgramme([]);
                            setFilterSession([]);
                            setFilterBatch([]);
                            setCurrentPage(1);
                            fetchStudents();
                            toast.info("Filters reset");
                        }}
                        className={`p-3 rounded-[4px] border transition-all flex items-center gap-2 group ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-500 hover:text-cyan-400' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900'}`}
                    >
                        <FaSync className={`text-[10px] ${loading ? "animate-spin" : ""}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
                    </button>
                </div>
            </div>

            {/* Students Table */}
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-[4px] border overflow-hidden`}>
                <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Enrolled Students</h3>
                    <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-[4px] ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-100 text-cyan-600'}`}>
                            {selectedStudentIds.length} Selected
                        </span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-[4px] ${isDarkMode ? 'bg-purple-500/10 text-purple-500' : 'bg-purple-100 text-purple-600'}`}>
                            {filteredStudents.length} Total
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                <th className="p-4 w-12">
                                    <button onClick={handleSelectAll} className="text-lg">
                                        {selectedStudentIds.length === paginatedStudents.length && paginatedStudents.length > 0 ? 
                                            <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-700 hover:text-gray-500" />}
                                    </button>
                                </th>
                                <th className="p-4">Student Name</th>
                                <th className="p-4">Admission No</th>
                                <th className="p-4">Class</th>
                                <th className="p-4">Centre/Course</th>
                                <th className="p-4">Current Batches</th>
                                <th className="p-4 text-right">Assign</th>
                            </tr>
                        </thead>
                        <tbody className={isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-100'}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <TableRowSkeleton key={i} columns={7} />)
                            ) : paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center opacity-30">
                                        <FaUsers size={40} className="mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No enrolled students found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map(student => {
                                    const details = student.studentsDetails?.[0] || {};
                                    return (
                                        <tr key={student._id} className={`transition-all hover:bg-cyan-500/[0.02] ${selectedStudentIds.includes(student._id) ? 'bg-cyan-500/[0.05]' : ''}`}>
                                            <td className="p-4">
                                                <button onClick={() => handleSelectStudent(student._id)} className="text-lg">
                                                    {selectedStudentIds.includes(student._id) ? 
                                                        <FaCheckSquare className="text-cyan-500" /> : <FaSquare className="text-gray-700 hover:text-gray-500" />}
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${isDarkMode ? 'bg-gray-800 text-cyan-400' : 'bg-gray-100 text-cyan-600'}`}>
                                                        {details.studentName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{details.studentName}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">{details.mobileNum}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black font-mono ${isDarkMode ? 'bg-gray-800 text-yellow-500' : 'bg-yellow-50 text-yellow-700'}`}>
                                                    {student.latestAdmission?.admissionNumber || "PENDING"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                    {student.latestAdmission?.class?.name || student.latestAdmission?.class?.className || "N/A"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <p className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{details.centre}</p>
                                                <p className="text-[10px] text-gray-500 font-bold">
                                                    {student.latestAdmission?.course?.courseName || 
                                                     student.latestAdmission?.boardCourseName || 
                                                     student.latestAdmission?.board?.boardCourse || 
                                                     "No Course"}
                                                </p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {student.batches && student.batches.length > 0 ? (
                                                        student.batches.map(batch => (
                                                            <span key={batch._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase">
                                                                {batch.batchName}
                                                                <button onClick={() => handleRemoveBatch(student._id, batch._id)} className="hover:text-red-500">
                                                                    <FaTimes size={10} />
                                                                </button>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[9px] text-gray-600 font-bold italic">NOT ASSIGNED</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    disabled={selectedBatchIds.length === 0 || processing}
                                                    onClick={() => {
                                                        setSelectedStudentIds([student._id]);
                                                        // Note: setSelectedStudentIds is async, but here we just need to set it 
                                                        // so that clicking "Assign Bulk" or another trigger works.
                                                        // For a quick single-row assign, we can trigger handleBulkAssign directly after setting IDs
                                                        // but standard React state management makes that tricky in one tick.
                                                        // Instead, we just enable the Bulk Assign button for the selected students.
                                                    }}
                                                    className={`p-2 rounded hover:bg-cyan-500/20 text-cyan-400 transition-all ${selectedBatchIds.length === 0 ? 'opacity-0' : 'opacity-100'}`}
                                                    title="Select this student for assignment"
                                                >
                                                    <FaPlus />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredStudents.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />
                </div>
            </div>
        </div>
    );
};

export default BatchAllocationContent;
