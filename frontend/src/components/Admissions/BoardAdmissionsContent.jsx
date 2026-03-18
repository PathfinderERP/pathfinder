import React, { useState, useEffect } from "react";
import { FaFilter, FaPlus, FaSearch, FaDownload, FaEye, FaEdit, FaTrash, FaSync, FaSun, FaMoon, FaUserGraduate } from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import StudentDetailsModal from './StudentDetailsModal';
import EditStudentModal from './EditStudentModal';
import ExportButton from '../common/ExportButton';
import MultiSelectFilter from '../common/MultiSelectFilter';
import Pagination from '../common/Pagination';
import { downloadCSV, downloadExcel } from '../../utils/exportUtils';
import './AdmissionsWave.css';
import { hasPermission } from '../../config/permissions';

const BoardAdmissionsContent = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterBoard, setFilterBoard] = useState([]);
    const [filterExamTag, setFilterExamTag] = useState([]);
    const [filterDepartment, setFilterDepartment] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState([]); // Store allowed centres for the user
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const itemsPerPage = 10;

    // Permission checks
    const user = React.useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
    const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";
    const canCreate = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'allLeads', 'create');
    const canEdit = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'allLeads', 'edit');
    const canDelete = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'allLeads', 'delete');

    const [activeTab, setActiveTab] = useState("Potential"); // "Potential" | "Enrolled"
    const [boardAdmissions, setBoardAdmissions] = useState([]);
    const [enrolledLoading, setEnrolledLoading] = useState(false);

    const fetchBoardAdmissions = async () => {
        setEnrolledLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board-admission/all`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setBoardAdmissions(data);
        } catch (error) {
            console.error("Error fetching board admissions:", error);
        } finally {
            setEnrolledLoading(false);
        }
    };

    const fetchStudents = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/getAllStudents`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setStudents(data);
            } else {
                console.error("Failed to fetch students");
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAllowedCentres = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
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
                const userCentreNames = userCentres.map(c => c.centreName || c.name || c).filter(Boolean);
                setAllowedCentres(userCentreNames);
            }
        } catch (error) {
            console.error("Error fetching allowed centres:", error);
        }
    }, [user]);

    const fetchDepartments = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/department`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setDepartments(data);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    }, []);

    const handleRefresh = () => {
        setSearchQuery("");
        setCurrentPage(1);
        setFilterCentre([]);
        setFilterBoard([]);
        setFilterExamTag([]);
        setFilterDepartment([]);
        setStartDate("");
        setEndDate("");
        setLoading(true);
        fetchStudents();
        fetchDepartments();
        fetchBoardAdmissions();
        toast.info("Refreshed data and filters");
    };

    useEffect(() => {
        fetchAllowedCentres();
        fetchStudents();
        fetchDepartments();
        fetchBoardAdmissions();
    }, [fetchAllowedCentres, fetchStudents, fetchDepartments]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterCentre, filterBoard, filterExamTag, filterDepartment, startDate, endDate, activeTab]);

    const visibleStudents = activeTab === "Potential" 
        ? students.filter(s => {
            if (isSuperAdmin) return true;
            if (allowedCentres.length === 0) return false;
            const studentCentre = s.studentsDetails?.[0]?.centre;
            return allowedCentres.includes(studentCentre);
          })
        : boardAdmissions.filter(ba => {
            if (isSuperAdmin) return true;
            if (allowedCentres.length === 0) return false;
            const studentCentre = ba.studentId?.studentsDetails?.[0]?.centre;
            return allowedCentres.includes(studentCentre);
          });

    const uniqueCentres = [...new Set(visibleStudents.map(s => (activeTab === "Potential" ? s : s.studentId).studentsDetails?.[0]?.centre).filter(Boolean))];
    const uniqueBoards = [...new Set(students.map(s => s.studentsDetails?.[0]?.board).filter(Boolean))];

    const filteredStudents = activeTab === "Potential" 
        ? visibleStudents.filter(student => {
            if (student.isEnrolled) return false;

            const details = student.studentsDetails?.[0] || {};
            const exam = student.examSchema?.[0] || {};
            const sessionExam = student.sessionExamCourse?.[0] || {};

            const board = details.board || "";
            const examTag = sessionExam.examTag || exam.examName || details.programme || "";
            
            // BOARD STUDENT FILTER: Only show students who have a board selected or board keywords in tags
            const isBoardStudent = board !== "" || examTag.toLowerCase().includes("board");
            if (!isBoardStudent) return false;

            const studentName = details.studentName || "";
            const mobile = details.mobileNum || "";
            const email = details.studentEmail || "";
            const centre = details.centre || "";
            const school = details.schoolName || "";

            const queries = searchQuery.toLowerCase().split(',').map(q => q.trim()).filter(Boolean);
            const matchesSearch = queries.length === 0 || queries.some(query =>
                studentName.toLowerCase().includes(query) ||
                mobile.includes(query) ||
                email.toLowerCase().includes(query) ||
                centre.toLowerCase().includes(query) ||
                school.toLowerCase().includes(query) ||
                board.toLowerCase().includes(query) ||
                examTag.toLowerCase().includes(query)
            );

            const matchesCentre = filterCentre.length === 0 || filterCentre.includes(centre);
            const matchesBoard = filterBoard.length === 0 || filterBoard.includes(board);
            const matchesExamTag = filterExamTag.length === 0 || filterExamTag.includes(examTag);
            const departmentName = student.department?.departmentName || "";
            const matchesDepartment = filterDepartment.length === 0 || filterDepartment.includes(departmentName);

            let matchesDate = true;
            if (startDate || endDate) {
                const regDate = student.createdAt ? new Date(student.createdAt) : null;
                if (!regDate) {
                    matchesDate = false;
                } else {
                    if (startDate) {
                        const start = new Date(startDate);
                        if (regDate < start) matchesDate = false;
                    }
                    if (endDate && matchesDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (regDate > end) matchesDate = false;
                    }
                }
            }

            return matchesSearch && matchesCentre && matchesBoard && matchesExamTag && matchesDepartment && matchesDate;
        })
        : visibleStudents.filter(ba => {
            const details = ba.studentId?.studentsDetails?.[0] || {};
            const studentName = details.studentName || "";
            const mobile = details.mobileNum || "";
            const boardName = ba.boardId?.boardCourse || "";

            const queries = searchQuery.toLowerCase().split(',').map(q => q.trim()).filter(Boolean);
            const matchesSearch = queries.length === 0 || queries.some(query =>
                studentName.toLowerCase().includes(query) ||
                mobile.includes(query) ||
                boardName.toLowerCase().includes(query)
            );

            const matchesCentre = filterCentre.length === 0 || filterCentre.includes(details.centre);
            return matchesSearch && matchesCentre;
        });

    const totalStudents = filteredStudents.length;
    const conversionRate = students.length > 0 ? (students.filter(s => s.isEnrolled).length / students.length * 100).toFixed(1) : "0.0";
    const todaysNew = students.filter(s => {
        if (!s.createdAt) return false;
        const d = new Date(s.createdAt);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }).length;

    const chartData = React.useMemo(() => {
        const data = [];
        const basePool = activeTab === "Potential" ? filteredStudents : boardAdmissions;
        const sorted = [...basePool].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        sorted.forEach(item => {
            const createdAt = item.createdAt;
            if (createdAt) {
                const dateLabel = new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                const existing = data.find(d => d.date === dateLabel);
                if (existing) existing.count += 1;
                else data.push({ date: dateLabel, count: 1 });
            }
        });
        return data;
    }, [filteredStudents, activeTab, boardAdmissions]);

    const handleViewStudent = (student) => {
        setSelectedStudent(student);
        setShowDetailsModal(true);
    };

    const handleEditProfile = (student) => {
        setSelectedStudent(student);
        setShowEditModal(true);
    };

    const handleUpdateSuccess = () => {
        setShowEditModal(false);
        setSelectedStudent(null);
        fetchStudents();
        fetchBoardAdmissions();
    };

    return (
        <div className={`flex-1 p-6 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-8">
                    <div>
                        <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Board Course Admission
                        </h2>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Students eligible for Board Courses
                        </p>
                    </div>

                    {chartData.length > 0 && (
                        <div className={`hidden md:block h-[50px] w-[200px] rounded-[4px] border p-1 relative overflow-hidden group ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="absolute top-1 left-2 text-[10px] text-gray-400 font-bold uppercase z-10">Trend</div>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="count" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="hidden md:flex gap-3">
                        <div className={`rounded-[4px] border px-4 py-1 h-[50px] flex flex-col justify-center min-w-[100px] ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Conversion</span>
                            <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{conversionRate}%</span>
                        </div>
                        <div className={`rounded-[4px] border px-4 py-1 h-[50px] flex flex-col justify-center min-w-[100px] ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Today</span>
                            <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>+{todaysNew}</span>
                        </div>
                    </div>

                    <button onClick={toggleTheme} className={`p-3 rounded-[4px] border transition-all text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}>
                        {isDarkMode ? <FaSun /> : <FaMoon />}
                    </button>
                </div>
            </div>

            <div className="flex gap-1 mb-8 p-1 bg-black/20 rounded-lg w-fit">
                {["Potential", "Enrolled"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab
                                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                : "text-gray-500 hover:text-white"
                        }`}
                    >
                        {tab === "Potential" ? "BOARD RECORDS" : "ENROLLED BOARD"}
                    </button>
                ))}
            </div>

            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border mb-8`}>
                <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex-1 relative min-w-[300px]">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder={activeTab === "Potential" ? "SEARCH BOARD STUDENTS..." : "SEARCH ENROLLED BOARD..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[4px] border text-[10px] font-black tracking-widest uppercase outline-none ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                        />
                    </div>
                </div>
            </div>

            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-[4px] border overflow-hidden transition-all`}>
                <div className="p-6 border-b flex justify-between items-center border-gray-200 dark:border-gray-800">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activeTab === "Potential" ? "Board Records" : "Enrolled Board Students"}
                    </h3>
                    <span className="text-[10px] font-black px-3 py-1 rounded-[4px] bg-cyan-500/10 text-cyan-500">{filteredStudents.length} {activeTab === "Potential" ? "Candidates" : "Admissions"}</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                <th className="p-4">{activeTab === "Potential" ? "Reg. Date" : "Addon Date"}</th>
                                <th className="p-4">Student Name</th>
                                <th className="p-4">{activeTab === "Potential" ? "Board" : "Admission No"}</th>
                                <th className="p-4">{activeTab === "Potential" ? "Programme" : "Course Name"}</th>
                                {activeTab === "Potential" && <th className="p-4">Exam Tag</th>}
                                <th className="p-4">Centre</th>
                                <th className="p-4">Mobile</th>
                                {activeTab === "Enrolled" && <th className="p-4">Fees Status</th>}
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                            {(loading || enrolledLoading) ? (
                                <tr><td colSpan="9" className="p-12 text-center text-[10px] font-black uppercase text-gray-500">Loading...</td></tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr><td colSpan="9" className="p-12 text-center text-[10px] font-black uppercase text-gray-500">No {activeTab === "Potential" ? "Board Students" : "Enrolled Students"} Found</td></tr>
                            ) : (
                                filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => {
                                    const student = activeTab === "Potential" ? item : item.studentId;
                                    const details = student?.studentsDetails?.[0] || {};
                                    const exam = student?.examSchema?.[0] || {};
                                    const sessionExam = student?.sessionExamCourse?.[0] || {};
                                    
                                    return (
                                        <tr key={item._id} className={`transition-all group ${isDarkMode ? 'hover:bg-cyan-500/[0.03]' : 'hover:bg-gray-50'}`}>
                                            <td className="p-4 font-bold text-[10px] text-gray-400">
                                                {new Date(item.createdAt).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`text-[11px] font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{details.studentName}</span>
                                                    <span className="text-[9px] text-gray-500 font-bold uppercase">UID: {student?._id.slice(-8)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-[10px] font-black uppercase text-purple-400">
                                                    {activeTab === "Potential" ? (details.board || "N/A") : (item.admissionNumber || "PENDING")}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-[10px] font-black uppercase text-cyan-400">
                                                    {activeTab === "Potential" ? (details.programme || "N/A") : (item.boardCourseName || item.boardId?.boardCourse || "N/A")}
                                                </span>
                                            </td>
                                            {activeTab === "Potential" && <td className="p-4"><span className="text-[10px] font-bold uppercase text-gray-400">{sessionExam.examTag || exam.examName || "N/A"}</span></td>}
                                            <td className="p-4"><span className="text-[10px] font-bold uppercase text-gray-400">{details.centre || "N/A"}</span></td>
                                            <td className="p-4"><span className="text-[10px] font-bold text-gray-400">{details.mobileNum || "N/A"}</span></td>
                                            
                                            {activeTab === "Enrolled" && (
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-black uppercase text-gray-500">Paid: ₹{item.totalPaidAmount}</span>
                                                        <span className="text-[9px] font-black uppercase text-cyan-500">Bal: ₹{item.totalExpectedAmount - item.totalPaidAmount}</span>
                                                    </div>
                                                </td>
                                            )}

                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {activeTab === "Potential" ? (
                                                        <>
                                                            <button onClick={() => handleViewStudent(student)} className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-gray-700 hover:border-cyan-500 text-gray-400 hover:text-white transition-all"><FaEye size={12} /></button>
                                                            {canCreate && (
                                                                <button 
                                                                    onClick={() => navigate(`/board-course-admission/${student._id}`)}
                                                                    className="px-3 h-8 flex items-center justify-center gap-1.5 rounded-[4px] border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                                                                >
                                                                    <FaUserGraduate size={10} />
                                                                    <span>Admit Board</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => navigate(`/manage-board-admission/${item._id}`)}
                                                            className="px-3 h-8 flex items-center justify-center gap-1.5 rounded-[4px] border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                                                        >
                                                            <FaEdit size={10} />
                                                            <span>Manage</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredStudents.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />
                </div>
            </div>

            {showDetailsModal && selectedStudent && (
                <StudentDetailsModal
                    student={selectedStudent}
                    isOpen={showDetailsModal}
                    onClose={() => { setShowDetailsModal(false); setSelectedStudent(null); }}
                    isDarkMode={isDarkMode}
                />
            )}

            {showEditModal && selectedStudent && (
                <EditStudentModal
                    student={selectedStudent}
                    isOpen={showEditModal}
                    onClose={() => { setShowEditModal(false); setSelectedStudent(null); }}
                    onSuccess={handleUpdateSuccess}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

export default BoardAdmissionsContent;
