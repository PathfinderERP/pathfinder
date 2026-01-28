import React, { useState, useEffect } from "react";
import { FaFilter, FaPlus, FaSearch, FaDownload, FaEye, FaEdit, FaTrash, FaSync, FaSun, FaMoon } from "react-icons/fa";
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

const AdmissionsContent = () => {
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
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role === "superAdmin";
    const canCreate = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'allLeads', 'create');
    const canEdit = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'allLeads', 'edit');
    const canDelete = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'allLeads', 'delete');

    useEffect(() => {
        fetchAllowedCentres();
        fetchStudents();
        fetchDepartments();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterCentre, filterBoard, filterExamTag, filterDepartment, startDate, endDate]);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/getAllStudents`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                // Reverse the array to show newest students first
                setStudents(data);
            } else {
                console.error("Failed to fetch students");
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllowedCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const currentUser = data.user;

                if (currentUser.role === 'superAdmin') {
                    // If superAdmin, fetch all centres to populate allowed list
                    // Or we can just leave it empty and handle "Access All" logic
                    // But for consistency with filters, let's fetch all
                    const centreRes = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (centreRes.ok) {
                        const allCentres = await centreRes.json();
                        setAllowedCentres(allCentres.map(c => c.centreName));
                    }
                } else {
                    const userCentres = currentUser.centres || [];
                    const userCentreNames = userCentres.map(c => c.centreName || c.name); // Handle potential population differences
                    setAllowedCentres(userCentreNames);
                }
            }
        } catch (error) {
            console.error("Error fetching allowed centres:", error);
        }
    };

    const fetchDepartments = async () => {
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
    };

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
        toast.info("Refreshed data and filters");
    };

    // Extract unique values for filters based on visible students
    // First, filter students by allowed centres to ensure safety
    const visibleStudents = students.filter(s => {
        if (allowedCentres.length === 0) return true; // Loading or issue, might want to block or allow pending check. For now assuming superadmin if empty or fetch pending.
        // Actually best to rely on 'isSuperAdmin' flag or non-empty allowedCentres.
        // If allowedCentres is populated, strict check.
        if (isSuperAdmin) return true;

        const studentCentre = s.studentsDetails?.[0]?.centre;
        return allowedCentres.includes(studentCentre);
    });

    const uniqueCentres = [...new Set(visibleStudents.map(s => s.studentsDetails?.[0]?.centre).filter(Boolean))];
    const uniqueBoards = [...new Set(students.map(s => s.studentsDetails?.[0]?.board).filter(Boolean))];
    const uniqueExamTags = [...new Set(visibleStudents.map(s => s.sessionExamCourse?.[0]?.examTag || s.examSchema?.[0]?.examName || s.studentsDetails?.[0]?.programme).filter(Boolean))];

    // Filter students based on search query and filters
    const filteredStudents = visibleStudents.filter(student => {
        const details = student.studentsDetails?.[0] || {};
        const exam = student.examSchema?.[0] || {};
        const studentStatusList = student.studentStatus || [];
        const currentStatusObj = studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};
        const leadStatus = currentStatusObj.status || "";
        const sessionExam = student.sessionExamCourse?.[0] || {};

        const studentName = details.studentName || "";
        const mobile = details.mobileNum || "";
        const email = details.studentEmail || "";
        const centre = details.centre || "";
        const school = details.schoolName || "";
        const board = details.board || "";
        const examTag = sessionExam.examTag || exam.examName || details.programme || "";

        const query = searchQuery.toLowerCase();
        const matchesSearch =
            studentName.toLowerCase().includes(query) ||
            mobile.includes(query) ||
            email.toLowerCase().includes(query) ||
            centre.toLowerCase().includes(query) ||
            school.toLowerCase().includes(query) ||
            board.toLowerCase().includes(query) ||
            examTag.toLowerCase().includes(query);

        const matchesCentre = filterCentre.length === 0 || filterCentre.includes(centre);
        const matchesBoard = filterBoard.length === 0 || filterBoard.includes(board);
        const matchesExamTag = filterExamTag.length === 0 || filterExamTag.includes(examTag);

        const departmentName = student.department?.departmentName || "";
        const matchesDepartment = filterDepartment.length === 0 || filterDepartment.includes(departmentName);

        // Date Range Filter
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
                if (endDate && matchesDate) { // optimization
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (regDate > end) matchesDate = false;
                }
            }
        }

        return matchesSearch && matchesCentre && matchesBoard && matchesExamTag && matchesDepartment && matchesDate;
    });

    // Analysis for visible filtered students
    const totalStudents = filteredStudents.length;
    const enrolledCount = filteredStudents.filter(s => s.isEnrolled).length;
    const pendingEnrolment = totalStudents - enrolledCount;
    const uniqueCoursesCount = new Set(filteredStudents.map(s => s.course?.courseName).filter(Boolean)).size;
    const conversionRate = totalStudents > 0 ? ((enrolledCount / totalStudents) * 100).toFixed(1) : "0.0";
    const todaysNew = filteredStudents.filter(s => {
        if (!s.createdAt) return false;
        const d = new Date(s.createdAt);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    }).length;

    // Prepare Chart Data
    const chartData = React.useMemo(() => {
        const dateMap = {};
        filteredStudents.forEach(student => {
            if (student.createdAt) {
                const date = new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                dateMap[date] = (dateMap[date] || 0) + 1;
            }
        });

        // Convert to array and sort by date (approximation by creation order would be better but simple string sort might fail for '01 Jan' vs '02 Feb', 
        // essentially we rely on the filteredStudents being sorted by date already or we sort by raw date)
        // Better: Process sorted students
        const data = [];
        const processedDates = new Set();

        // filteredStudents is sorted desc in fetch, but we need asc for chart usually? 
        // Re-sorting filteredStudents asc for chart generation
        const sortedForChart = [...filteredStudents].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        sortedForChart.forEach(student => {
            if (student.createdAt) {
                const rawDate = new Date(student.createdAt);
                const dateLabel = rawDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                const existing = data.find(d => d.date === dateLabel);
                if (existing) {
                    existing.count += 1;
                } else {
                    data.push({ date: dateLabel, count: 1, fullDate: rawDate });
                }
            }
        });

        return data;
    }, [filteredStudents]);

    const handleViewStudent = (student) => {
        setSelectedStudent(student);
        setShowDetailsModal(true);
    };

    const handleEditStudent = (student) => {
        setSelectedStudent(student);
        setShowEditModal(true);
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/normalAdmin/deleteStudent/${studentId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Student deleted successfully!');
                fetchStudents(); // Refresh the list
            } else {
                toast.error(data.message || 'Failed to delete student');
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            toast.error('Error deleting student');
        }
    };

    const handleUpdateSuccess = () => {
        setShowEditModal(false);
        setSelectedStudent(null);
        fetchStudents(); // Refresh the list
    };

    const handleExportCSV = () => {
        const headers = [
            // Student Details
            { label: 'Student Name', key: 'studentsDetails.0.studentName' },
            { label: 'DOB', key: 'studentsDetails.0.dateOfBirth' },
            { label: 'Gender', key: 'studentsDetails.0.gender' },
            { label: 'Centre', key: 'studentsDetails.0.centre' },
            { label: 'Board', key: 'studentsDetails.0.board' },
            { label: 'State', key: 'studentsDetails.0.state' },
            { label: 'Email', key: 'studentsDetails.0.studentEmail' },
            { label: 'Mobile', key: 'studentsDetails.0.mobileNum' },
            { label: 'WhatsApp', key: 'studentsDetails.0.whatsappNumber' },
            { label: 'School', key: 'studentsDetails.0.schoolName' },
            { label: 'Pincode', key: 'studentsDetails.0.pincode' },
            { label: 'Source', key: 'studentsDetails.0.source' },
            { label: 'Address', key: 'studentsDetails.0.address' },

            // Guardian Details
            { label: 'Guardian Name', key: 'guardians.0.guardianName' },
            { label: 'Qualification', key: 'guardians.0.qualification' },
            { label: 'Guardian Email', key: 'guardians.0.guardianEmail' },
            { label: 'Guardian Mobile', key: 'guardians.0.guardianMobile' },
            { label: 'Occupation', key: 'guardians.0.occupation' },
            { label: 'Annual Income', key: 'guardians.0.annualIncome' },
            { label: 'Organization', key: 'guardians.0.organizationName' },
            { label: 'Designation', key: 'guardians.0.designation' },
            { label: 'Office Address', key: 'guardians.0.officeAddress' },

            // Exam Details
            { label: 'Exam Name', key: 'examSchema.0.examName' },
            { label: 'Class', key: 'examSchema.0.class' },
            { label: 'Exam Status', key: 'examSchema.0.examStatus' },
            { label: 'Mark Aggregate', key: 'examSchema.0.markAgregate' },
            { label: 'Science/Math %', key: 'examSchema.0.scienceMathParcent' },

            // Other Academic Info
            { label: 'Section Type', key: 'section.0.type' },
            { label: 'Session', key: 'sessionExamCourse.0.session' },
            { label: 'Exam Tag', key: 'sessionExamCourse.0.examTag' },
            { label: 'Target Exams', key: 'sessionExamCourse.0.targetExams' },

            // References & Status
            { label: 'Course', key: 'courseName' },
            { label: 'Department', key: 'departmentName' },
            { label: 'Batches', key: 'batchNames' },
            { label: 'Enrolled', key: 'isEnrolled' },
            { label: 'Carry Forward Balance', key: 'carryForwardBalance' },
            { label: 'Marked For Carry Forward', key: 'markedForCarryForward' },
            { label: 'Counselled By', key: 'counselledBy' },
            { label: 'Registration Date', key: 'createdAt' }
        ];

        const exportData = filteredStudents.map(student => {
            const details = student.studentsDetails?.[0] || {};
            const guardian = student.guardians?.[0] || {};
            const exam = student.examSchema?.[0] || {};
            const section = student.section?.[0] || {};
            const sessionExam = student.sessionExamCourse?.[0] || {};

            return {
                studentsDetails: [{
                    studentName: details.studentName || '',
                    dateOfBirth: details.dateOfBirth || '',
                    gender: details.gender || '',
                    centre: details.centre || '',
                    board: details.board || '',
                    state: details.state || '',
                    studentEmail: details.studentEmail || '',
                    mobileNum: details.mobileNum || '',
                    whatsappNumber: details.whatsappNumber || '',
                    schoolName: details.schoolName || '',
                    pincode: details.pincode || '',
                    source: details.source || '',
                    address: details.address || ''
                }],
                guardians: [{
                    guardianName: guardian.guardianName || '',
                    qualification: guardian.qualification || '',
                    guardianEmail: guardian.guardianEmail || '',
                    guardianMobile: guardian.guardianMobile || '',
                    occupation: guardian.occupation || '',
                    annualIncome: guardian.annualIncome || '',
                    organizationName: guardian.organizationName || '',
                    designation: guardian.designation || '',
                    officeAddress: guardian.officeAddress || ''
                }],
                examSchema: [{
                    examName: exam.examName || '',
                    class: exam.class || '',
                    examStatus: exam.examStatus || '',
                    markAgregate: exam.markAgregate || '',
                    scienceMathParcent: exam.scienceMathParcent || ''
                }],
                section: [{
                    type: section.type || ''
                }],
                sessionExamCourse: [{
                    session: sessionExam.session || '',
                    examTag: sessionExam.examTag || '',
                    targetExams: sessionExam.targetExams || ''
                }],
                courseName: student.course?.courseName || '',
                departmentName: student.department?.departmentName || '',
                batchNames: student.batches?.map(b => b.batchName).join(', ') || '',
                isEnrolled: student.isEnrolled ? 'Yes' : 'No',
                carryForwardBalance: student.carryForwardBalance || 0,
                markedForCarryForward: student.markedForCarryForward ? 'Yes' : 'No',
                counselledBy: student.counselledBy || 'N/A',
                createdAt: student.createdAt ? new Date(student.createdAt).toLocaleDateString() : ''
            };
        });

        downloadCSV(exportData, headers, 'all_student_details');
        toast.success('Full student details exported to CSV!');
    };

    const handleExportExcel = () => {
        const headers = [
            // Student Details
            { label: 'Student Name', key: 'studentsDetails.0.studentName' },
            { label: 'DOB', key: 'studentsDetails.0.dateOfBirth' },
            { label: 'Gender', key: 'studentsDetails.0.gender' },
            { label: 'Centre', key: 'studentsDetails.0.centre' },
            { label: 'Board', key: 'studentsDetails.0.board' },
            { label: 'State', key: 'studentsDetails.0.state' },
            { label: 'Email', key: 'studentsDetails.0.studentEmail' },
            { label: 'Mobile', key: 'studentsDetails.0.mobileNum' },
            { label: 'WhatsApp', key: 'studentsDetails.0.whatsappNumber' },
            { label: 'School', key: 'studentsDetails.0.schoolName' },
            { label: 'Pincode', key: 'studentsDetails.0.pincode' },
            { label: 'Source', key: 'studentsDetails.0.source' },
            { label: 'Address', key: 'studentsDetails.0.address' },

            // Guardian Details
            { label: 'Guardian Name', key: 'guardians.0.guardianName' },
            { label: 'Qualification', key: 'guardians.0.qualification' },
            { label: 'Guardian Email', key: 'guardians.0.guardianEmail' },
            { label: 'Guardian Mobile', key: 'guardians.0.guardianMobile' },
            { label: 'Occupation', key: 'guardians.0.occupation' },
            { label: 'Annual Income', key: 'guardians.0.annualIncome' },
            { label: 'Organization', key: 'guardians.0.organizationName' },
            { label: 'Designation', key: 'guardians.0.designation' },
            { label: 'Office Address', key: 'guardians.0.officeAddress' },

            // Exam Details
            { label: 'Exam Name', key: 'examSchema.0.examName' },
            { label: 'Class', key: 'examSchema.0.class' },
            { label: 'Exam Status', key: 'examSchema.0.examStatus' },
            { label: 'Mark Aggregate', key: 'examSchema.0.markAgregate' },
            { label: 'Science/Math %', key: 'examSchema.0.scienceMathParcent' },

            // Other Academic Info
            { label: 'Section Type', key: 'section.0.type' },
            { label: 'Session', key: 'sessionExamCourse.0.session' },
            { label: 'Exam Tag', key: 'sessionExamCourse.0.examTag' },
            { label: 'Target Exams', key: 'sessionExamCourse.0.targetExams' },

            // References & Status
            { label: 'Course', key: 'courseName' },
            { label: 'Department', key: 'departmentName' },
            { label: 'Batches', key: 'batchNames' },
            { label: 'Enrolled', key: 'isEnrolled' },
            { label: 'Carry Forward Balance', key: 'carryForwardBalance' },
            { label: 'Marked For Carry Forward', key: 'markedForCarryForward' },
            { label: 'Counselled By', key: 'counselledBy' },
            { label: 'Registration Date', key: 'createdAt' }
        ];

        const exportData = filteredStudents.map(student => {
            const details = student.studentsDetails?.[0] || {};
            const guardian = student.guardians?.[0] || {};
            const exam = student.examSchema?.[0] || {};
            const section = student.section?.[0] || {};
            const sessionExam = student.sessionExamCourse?.[0] || {};

            return {
                studentsDetails: [{
                    studentName: details.studentName || '',
                    dateOfBirth: details.dateOfBirth || '',
                    gender: details.gender || '',
                    centre: details.centre || '',
                    board: details.board || '',
                    state: details.state || '',
                    studentEmail: details.studentEmail || '',
                    mobileNum: details.mobileNum || '',
                    whatsappNumber: details.whatsappNumber || '',
                    schoolName: details.schoolName || '',
                    pincode: details.pincode || '',
                    source: details.source || '',
                    address: details.address || ''
                }],
                guardians: [{
                    guardianName: guardian.guardianName || '',
                    qualification: guardian.qualification || '',
                    guardianEmail: guardian.guardianEmail || '',
                    guardianMobile: guardian.guardianMobile || '',
                    occupation: guardian.occupation || '',
                    annualIncome: guardian.annualIncome || '',
                    organizationName: guardian.organizationName || '',
                    designation: guardian.designation || '',
                    officeAddress: guardian.officeAddress || ''
                }],
                examSchema: [{
                    examName: exam.examName || '',
                    class: exam.class || '',
                    examStatus: exam.examStatus || '',
                    markAgregate: exam.markAgregate || '',
                    scienceMathParcent: exam.scienceMathParcent || ''
                }],
                section: [{
                    type: section.type || ''
                }],
                sessionExamCourse: [{
                    session: sessionExam.session || '',
                    examTag: sessionExam.examTag || '',
                    targetExams: sessionExam.targetExams || ''
                }],
                courseName: student.course?.courseName || '',
                departmentName: student.department?.departmentName || '',
                batchNames: student.batches?.map(b => b.batchName).join(', ') || '',
                isEnrolled: student.isEnrolled ? 'Yes' : 'No',
                carryForwardBalance: student.carryForwardBalance || 0,
                markedForCarryForward: student.markedForCarryForward ? 'Yes' : 'No',
                counselledBy: student.counselledBy || 'N/A',
                createdAt: student.createdAt ? new Date(student.createdAt).toLocaleDateString() : ''
            };
        });

        downloadExcel(exportData, headers, 'all_student_details');
        toast.success('Full student details exported to Excel!');
    };

    return (
        <div className={`flex-1 p-6 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-8">
                    <div>
                        <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Counselled Students
                        </h2>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Student Lifecycle Management
                        </p>
                    </div>

                    {/* Small Area Chart Analysis */}
                    {chartData.length > 0 && (
                        <div className={`hidden md:block h-[50px] w-[200px] rounded-[4px] border p-1 relative overflow-hidden group ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="absolute top-1 left-2 text-[10px] text-gray-400 font-bold uppercase z-10">Trend</div>
                            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={40}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: isDarkMode ? '#1a1f24' : '#fff', border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb', borderRadius: '4px', fontSize: '10px' }}
                                        itemStyle={{ color: '#06b6d4' }}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Additional Analyis Metrics */}
                    <div className="hidden md:flex gap-3">
                        <div className={`rounded-[4px] border px-4 py-1 h-[50px] flex flex-col justify-center min-w-[100px] ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Conversion</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{conversionRate}%</span>
                            </div>
                        </div>

                        <div className={`rounded-[4px] border px-4 py-1 h-[50px] flex flex-col justify-center min-w-[100px] ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Today</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>+{todaysNew}</span>
                                <span className="text-[10px] text-cyan-500 font-black uppercase">New</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-[4px] border transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}
                    >
                        {isDarkMode ? <><FaSun /> Day</> : <><FaMoon /> Night</>}
                    </button>

                    {canCreate && (
                        <button
                            onClick={() => navigate("/student-registration")}
                            className="px-6 py-3 bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest rounded-[4px] hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all flex items-center gap-2"
                        >
                            <FaPlus /> New Registration
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex border-b mb-8 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                {["Counselled Students", "Admissions"].map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            if (tab === "Admissions") {
                                navigate("/enrolled-students");
                            }
                        }}
                        className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${index === 0
                            ? "text-cyan-500 border-b-2 border-cyan-500"
                            : isDarkMode ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-cyan-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Registrations</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStudents}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Active Filters</p>
                </div>
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-green-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Enrolled</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{enrolledCount}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Students admitted</p>
                </div>
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-yellow-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Pending</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pendingEnrolment}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Awaiting action</p>
                </div>
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-purple-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Courses</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{uniqueCoursesCount}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Live Programmes</p>
                </div>
            </div>

            {/* Search & Table Controls */}
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border mb-8`}>
                <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex-1 relative min-w-[300px]">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="SEARCH STUDENTS..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3 rounded-[4px] border text-[10px] font-black tracking-widest uppercase outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                        />
                    </div>

                    <MultiSelectFilter
                        label="Centre"
                        placeholder="All Centres"
                        options={uniqueCentres.map(c => ({ value: c, label: c }))}
                        selectedValues={filterCentre}
                        onChange={setFilterCentre}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <MultiSelectFilter
                        label="Board"
                        placeholder="All Boards"
                        options={uniqueBoards.map(b => ({ value: b, label: b }))}
                        selectedValues={filterBoard}
                        onChange={setFilterBoard}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <MultiSelectFilter
                        label="Exam Tag"
                        placeholder="All Tags"
                        options={uniqueExamTags.map(t => ({ value: t, label: t }))}
                        selectedValues={filterExamTag}
                        onChange={setFilterExamTag}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <MultiSelectFilter
                        label="Dept"
                        placeholder="All Depts"
                        options={departments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                        selectedValues={filterDepartment}
                        onChange={setFilterDepartment}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />

                    <div className={`flex border rounded-[4px] overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`px-4 py-3 border-r text-[10px] font-black uppercase tracking-widest flex items-center ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-500' : 'bg-white border-gray-200 text-gray-400'}`}>
                            Period
                        </div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`px-4 py-3 focus:outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-gray-50 text-gray-900'}`}
                        />
                        <div className={`px-2 py-3 flex items-center ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`}>-</div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`px-4 py-3 focus:outline-none text-[10px] font-bold ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-gray-50 text-gray-900'}`}
                        />
                    </div>

                    <button
                        onClick={handleRefresh}
                        className={`p-3 rounded-[4px] border transition-all flex items-center gap-2 group ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-500 hover:text-cyan-400' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900'}`}
                    >
                        <FaSync className={`text-[10px] ${loading ? "animate-spin" : ""}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
                    </button>

                    <ExportButton
                        onExportCSV={handleExportCSV}
                        onExportExcel={handleExportExcel}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />
                </div>
            </div>

            {/* Students List Table */}
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-[4px] border overflow-hidden transition-all`}>
                <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Registered Students</h3>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-[4px] ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-100 text-cyan-600'}`}>{filteredStudents.length} Records</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1500px]">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                <th className="p-4">Reg. Date</th>
                                <th className="p-4">Student Name</th>
                                <th className="p-4">Programme</th>
                                <th className="p-4">Exam Tag</th>
                                <th className="p-4">Course</th>
                                <th className="p-4">Batch</th>
                                <th className="p-4">Centre</th>
                                <th className="p-4">Department</th>
                                <th className="p-4">Counselled By</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Class</th>
                                <th className="p-4">Mobile</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan="13" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Retrieving Enrollment Data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <FaSearch size={40} className="text-gray-500 mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">No matching student records found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((student) => {
                                        const details = student.studentsDetails?.[0] || {};
                                        const exam = student.examSchema?.[0] || {};
                                        const sessionExam = student.sessionExamCourse?.[0] || {};
                                        return (
                                            <tr key={student._id} className={`transition-all group ${isDarkMode ? 'hover:bg-cyan-500/[0.03]' : 'hover:bg-gray-50'}`}>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {new Date(student.createdAt).toLocaleDateString('en-GB')}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>
                                                            {details.studentName}
                                                        </span>
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">UID: {student._id.slice(-8)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                        {details.programme || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {sessionExam.examTag || exam.examName || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-cyan-500' : 'text-cyan-600'}`}>
                                                        {student.course?.courseName || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {student.batches?.map((b, i) => (
                                                            <span key={i} className={`text-[8px] font-black px-2 py-0.5 rounded-[2px] uppercase ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                                                {b.batchName}
                                                            </span>
                                                        )) || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {details.centre || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {student.department?.departmentName || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                                        {student.counselledBy || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {details.studentEmail || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                        {exam.class || details.class || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {details.mobileNum || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewStudent(student)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-[4px] border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-cyan-500' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:border-cyan-500 shadow-sm'}`}
                                                            title="View Profile"
                                                        >
                                                            <FaEye size={12} />
                                                        </button>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleEditStudent(student)}
                                                                className={`w-8 h-8 flex items-center justify-center rounded-[4px] border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-500' : 'bg-white border-gray-200 text-gray-400 hover:text-cyan-600 hover:border-cyan-500 shadow-sm'}`}
                                                                title="Edit Record"
                                                            >
                                                                <FaEdit size={12} />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDeleteStudent(student._id)}
                                                                className={`w-8 h-8 flex items-center justify-center rounded-[4px] border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-500 shadow-sm'}`}
                                                                title="Delete Permanently"
                                                            >
                                                                <FaTrash size={12} />
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

                {/* Pagination */}
                <div className={`p-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredStudents.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />
                </div>
            </div>

            {/* Modals */}
            {showDetailsModal && selectedStudent && (
                <StudentDetailsModal
                    student={selectedStudent}
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedStudent(null);
                    }}
                    isDarkMode={isDarkMode}
                />
            )}

            {showEditModal && selectedStudent && (
                <EditStudentModal
                    student={selectedStudent}
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedStudent(null);
                    }}
                    onUpdateSuccess={handleUpdateSuccess}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

export default AdmissionsContent;
