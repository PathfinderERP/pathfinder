import React, { useState, useEffect } from "react";
import { FaFilter, FaPlus, FaSearch, FaDownload, FaEye, FaEdit, FaTrash, FaSync } from "react-icons/fa";
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
    }, [searchQuery, filterCentre, filterBoard, filterExamTag, filterDepartment]);

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
    const uniqueExamTags = [...new Set(students.map(s => s.sessionExamCourse?.[0]?.examTag).filter(Boolean))];

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
        const examTag = sessionExam.examTag || "";

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

        return matchesSearch && matchesCentre && matchesBoard && matchesExamTag && matchesDepartment;
    });



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
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Admissions</h2>
                <div className="flex gap-3">
                    {/* <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800">
                        <FaFilter /> Filter
                    </button> */}

                    {canCreate && (
                        <button
                            onClick={() => {
                                console.log("Navigating to student registration");
                                navigate("/student-registration");
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400"
                        >
                            <FaPlus /> New Registration
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-6">
                {["Counselled Students", "Admissions"].map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            if (tab === "Admissions") {
                                navigate("/enrolled-students");
                            }
                        }}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${index === 0
                            ? "text-cyan-400 border-b-2 border-cyan-400"
                            : "text-gray-400 hover:text-white"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Quick Actions */}
            {/* <div className="grid grid-cols-4 gap-4 mb-8">
                <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
                    Counselor Performance
                </button>
                {canCreate && (
                    <button
                        onClick={() => {
                            console.log("Navigating to student registration");
                            navigate("/student-registration");
                        }}
                        className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium"
                    >
                        Walk-in Registration
                    </button>
                )}
                <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
                    Telecalling Console
                </button>
                <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
                    Admission Enrollment
                </button>
            </div> */}

            {/* KPI Cards Removed */}

            {/* Search & Table Controls */}
            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6">
                <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex-1 relative min-w-[300px]">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, mobile, email, centre, board, exam..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    <MultiSelectFilter
                        label="Centre"
                        placeholder="All Centres"
                        options={uniqueCentres.map(c => ({ value: c, label: c }))}
                        selectedValues={filterCentre}
                        onChange={setFilterCentre}
                    />

                    <MultiSelectFilter
                        label="Board"
                        placeholder="All Boards"
                        options={uniqueBoards.map(b => ({ value: b, label: b }))}
                        selectedValues={filterBoard}
                        onChange={setFilterBoard}
                    />

                    <MultiSelectFilter
                        label="Exam Tag"
                        placeholder="All Exam Tags"
                        options={uniqueExamTags.map(t => ({ value: t, label: t }))}
                        selectedValues={filterExamTag}
                        onChange={setFilterExamTag}
                    />

                    <MultiSelectFilter
                        label="Department"
                        placeholder="All Departments"
                        options={departments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                        selectedValues={filterDepartment}
                        onChange={setFilterDepartment}
                    />

                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-[#131619] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800 hover:text-cyan-400 transition-all"
                        title="Refresh Data & Reset Filters"
                    >
                        <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <ExportButton
                        onExportCSV={handleExportCSV}
                        onExportExcel={handleExportExcel}
                    />
                </div>
            </div>

            {/* Students List Table */}
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-xl font-bold text-white">Registered Students</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        {/* <thead>
                            <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                <th className="p-4 font-medium">Student Name</th>
                                <th className="p-4 font-medium">Class</th>
                                <th className="p-4 font-medium">School</th>
                                <th className="p-4 font-medium">Board</th>
                                <th className="p-4 font-medium">Exam Tag</th>
                                <th className="p-4 font-medium">Mobile</th>
                                <th className="p-4 font-medium">Lead Status</th>
                                <th className="p-4 font-medium">Email</th>
                                <th className="p-4 font-medium">Centre</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead> */}

                        <thead>
                            <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                <th className="p-4 font-medium">Reg. Date</th>
                                <th className="p-4 font-medium">Student Name</th>
                                <th className="p-4 font-medium">Course</th>
                                <th className="p-4 font-medium">Batch</th>
                                <th className="p-4 font-medium">Centre</th>
                                <th className="p-4 font-medium">Department</th>
                                <th className="p-4 font-medium">Counselled By</th>
                                <th className="p-4 font-medium">Email</th>
                                <th className="p-4 font-medium">Class</th>
                                <th className="p-4 font-medium">Mobile</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>



                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-gray-500">Loading students...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-gray-500">
                                        {searchQuery ? "No students found matching your search." : "No students found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((student) => {
                                        const details = student.studentsDetails?.[0] || {};
                                        const exam = student.examSchema?.[0] || {};
                                        const sessionExam = student.sessionExamCourse?.[0] || {};
                                        const isEnrolled = student.isEnrolled;

                                        return (
                                            <tr key={student._id} className="admissions-row-wave transition-colors group">

                                                {/* 1️⃣ REG. DATE */}
                                                <td className="p-4 text-gray-400 text-sm whitespace-nowrap">
                                                    {student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-GB') : "N/A"}
                                                </td>

                                                {/* 2️⃣ STUDENT NAME */}
                                                <td className="p-4 text-white font-medium">
                                                    {details.studentName || "N/A"}
                                                </td>

                                                {/* 3️⃣ COURSE */}
                                                <td className="p-4 text-cyan-400 font-medium">
                                                    {student.course?.courseName || "N/A"}
                                                </td>

                                                {/* 4️⃣ BATCH */}
                                                <td className="p-4 text-yellow-500 text-xs font-semibold">
                                                    {student.batches && student.batches.length > 0
                                                        ? student.batches.map(b => b.batchName).join(", ")
                                                        : "No Batch"}
                                                </td>

                                                {/* 5️⃣ CENTRE */}
                                                <td className="p-4 text-gray-300">
                                                    {details.centre || "N/A"}
                                                </td>

                                                {/* DEPARTMENT */}
                                                <td className="p-4 text-gray-400 text-sm">
                                                    {student.department?.departmentName || "N/A"}
                                                </td>
                                                <td className="p-4 text-yellow-500 font-bold text-sm">
                                                    {student.counselledBy || "N/A"}
                                                </td>

                                                {/* 6️⃣ EMAIL */}
                                                <td className="p-4 text-gray-300">
                                                    {details.studentEmail || "N/A"}
                                                </td>

                                                <td className="p-4 text-gray-300">{exam.class || "N/A"}</td>
                                                <td className="p-4 text-gray-300">{details.mobileNum || "N/A"}</td>

                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex gap-2">
                                                        {isEnrolled ? (
                                                            <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded text-sm font-semibold border border-green-500/20">
                                                                ✓ Enrolled
                                                            </span>
                                                        ) : canCreate ? (
                                                            <button
                                                                onClick={() => navigate(`/admission/${student._id}`)}
                                                                className="px-3 py-1 bg-cyan-500 text-black rounded hover:bg-cyan-400 text-sm font-semibold transition-colors"
                                                            >
                                                                Admit
                                                            </button>
                                                        ) : null}

                                                        <button
                                                            onClick={() => handleViewStudent(student)}
                                                            className="p-2 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                            title="View"
                                                        >
                                                            <FaEye />
                                                        </button>

                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleEditStudent(student)}
                                                                className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                                title="Edit"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                        )}

                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDeleteStudent(student._id)}
                                                                className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                                title="Delete"
                                                            >
                                                                <FaTrash />
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
            </div>

            <Pagination
                currentPage={currentPage}
                totalItems={filteredStudents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Modals */}
            {showDetailsModal && selectedStudent && (
                <StudentDetailsModal
                    student={selectedStudent}
                    canEdit={canEdit}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedStudent(null);
                    }}
                    onEdit={() => {
                        setShowDetailsModal(false);
                        setShowEditModal(true);
                    }}
                />
            )}

            {showEditModal && selectedStudent && (
                <EditStudentModal
                    student={selectedStudent}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedStudent(null);
                    }}
                    onUpdate={handleUpdateSuccess}
                />
            )}
        </div>
    );
};

export default AdmissionsContent;
