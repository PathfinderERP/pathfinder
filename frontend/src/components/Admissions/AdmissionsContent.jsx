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

const AdmissionsContent = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLeadStatus, setFilterLeadStatus] = useState([]);
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterBoard, setFilterBoard] = useState([]);
    const [filterExamTag, setFilterExamTag] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterLeadStatus, filterCentre, filterBoard, filterExamTag]);

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
                setStudents(data.reverse());
            } else {
                console.error("Failed to fetch students");
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setSearchQuery("");
        setCurrentPage(1);
        setFilterLeadStatus([]);
        setFilterCentre([]);
        setFilterBoard([]);
        setFilterExamTag([]);
        setLoading(true);
        fetchStudents();
        toast.info("Refreshed data and filters");
    };

    // Extract unique values for filters
    const uniqueCentres = [...new Set(students.map(s => s.studentsDetails?.[0]?.centre).filter(Boolean))];
    const uniqueBoards = [...new Set(students.map(s => s.studentsDetails?.[0]?.board).filter(Boolean))];
    const uniqueExamTags = [...new Set(students.map(s => s.sessionExamCourse?.[0]?.examTag).filter(Boolean))];

    // Filter students based on search query and filters
    const filteredStudents = students.filter(student => {
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
            leadStatus.toLowerCase().includes(query) ||
            board.toLowerCase().includes(query) ||
            examTag.toLowerCase().includes(query);

        const matchesLeadStatus = filterLeadStatus.length === 0 || filterLeadStatus.includes(leadStatus);
        const matchesCentre = filterCentre.length === 0 || filterCentre.includes(centre);
        const matchesBoard = filterBoard.length === 0 || filterBoard.includes(board);
        const matchesExamTag = filterExamTag.length === 0 || filterExamTag.includes(examTag);

        return matchesSearch && matchesLeadStatus && matchesCentre && matchesBoard && matchesExamTag;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case "Hot": return "bg-red-500/10 text-red-400";
            case "Cold": return "bg-blue-500/10 text-blue-400";
            case "Negative": return "bg-gray-500/10 text-gray-400";
            default: return "bg-gray-500/10 text-gray-400";
        }
    };

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
            { label: 'Student Name', key: 'studentsDetails.0.studentName' },
            { label: 'Centre', key: 'studentsDetails.0.centre' },
            { label: 'Email', key: 'studentsDetails.0.studentEmail' },
            { label: 'Class', key: 'examSchema.0.class' },
            { label: 'School', key: 'studentsDetails.0.schoolName' },
            { label: 'Board', key: 'studentsDetails.0.board' },
            { label: 'Exam Tag', key: 'sessionExamCourse.0.examTag' },
            { label: 'Mobile', key: 'studentsDetails.0.mobileNum' },
            { label: 'Lead Status', key: 'studentStatus.-1.status' },
        ];

        const exportData = filteredStudents.map(student => ({
            studentsDetails: [{
                studentName: student.studentsDetails?.[0]?.studentName || 'N/A',
                centre: student.studentsDetails?.[0]?.centre || 'N/A',
                studentEmail: student.studentsDetails?.[0]?.studentEmail || 'N/A',
                schoolName: student.studentsDetails?.[0]?.schoolName || 'N/A',
                board: student.studentsDetails?.[0]?.board || 'N/A',
                mobileNum: student.studentsDetails?.[0]?.mobileNum || 'N/A',
            }],
            examSchema: [{
                class: student.examSchema?.[0]?.class || 'N/A',
            }],
            sessionExamCourse: [{
                examTag: student.sessionExamCourse?.[0]?.examTag || 'N/A',
            }],
            studentStatus: [student.studentStatus?.[student.studentStatus?.length - 1] || { status: 'N/A' }],
        }));

        downloadCSV(exportData, headers, 'admissions_students');
        toast.success('CSV exported successfully!');
    };

    const handleExportExcel = () => {
        const headers = [
            { label: 'Student Name', key: 'studentsDetails.0.studentName' },
            { label: 'Centre', key: 'studentsDetails.0.centre' },
            { label: 'Email', key: 'studentsDetails.0.studentEmail' },
            { label: 'Class', key: 'examSchema.0.class' },
            { label: 'School', key: 'studentsDetails.0.schoolName' },
            { label: 'Board', key: 'studentsDetails.0.board' },
            { label: 'Exam Tag', key: 'sessionExamCourse.0.examTag' },
            { label: 'Mobile', key: 'studentsDetails.0.mobileNum' },
            { label: 'Lead Status', key: 'studentStatus.-1.status' },
        ];

        const exportData = filteredStudents.map(student => ({
            studentsDetails: [{
                studentName: student.studentsDetails?.[0]?.studentName || 'N/A',
                centre: student.studentsDetails?.[0]?.centre || 'N/A',
                studentEmail: student.studentsDetails?.[0]?.studentEmail || 'N/A',
                schoolName: student.studentsDetails?.[0]?.schoolName || 'N/A',
                board: student.studentsDetails?.[0]?.board || 'N/A',
                mobileNum: student.studentsDetails?.[0]?.mobileNum || 'N/A',
            }],
            examSchema: [{
                class: student.examSchema?.[0]?.class || 'N/A',
            }],
            sessionExamCourse: [{
                examTag: student.sessionExamCourse?.[0]?.examTag || 'N/A',
            }],
            studentStatus: [student.studentStatus?.[student.studentStatus?.length - 1] || { status: 'N/A' }],
        }));

        downloadExcel(exportData, headers, 'admissions_students');
        toast.success('Excel exported successfully!');
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Admissions & Sales Engine</h2>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800">
                        <FaFilter /> Filter
                    </button>

                    <button
                        onClick={() => {
                            console.log("Navigating to student registration");
                            navigate("/student-registration");
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400"
                    >
                        <FaPlus /> New Lead
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-6">
                {["All Leads (8)", "Today's Follow-ups (41)", "Walk-ins", "Admissions", "Telecalling"].map((tab, index) => (
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
            <div className="grid grid-cols-4 gap-4 mb-8">
                <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
                    Counselor Performance
                </button>
                <button
                    onClick={() => {
                        console.log("Navigating to student registration");
                        navigate("/student-registration");
                    }}
                    className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium"
                >
                    Walk-in Registration
                </button>
                <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
                    Telecalling Console
                </button>
                <button className="bg-[#1a1f24] text-gray-300 py-3 px-4 rounded-lg border border-gray-700 hover:bg-[#252b32] hover:border-gray-600 transition-all text-sm font-medium">
                    Admission Enrollment
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Hot Leads */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-red-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Hot Leads</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        {students.filter(s => s.studentStatus?.[s.studentStatus?.length - 1]?.status === "Hot").length}
                    </p>
                    <p className="text-gray-500 text-xs">
                        {students.length > 0
                            ? `${((students.filter(s => s.studentStatus?.[s.studentStatus?.length - 1]?.status === "Hot").length / students.length) * 100).toFixed(1)}% of total`
                            : "0% of total"}
                    </p>
                </div>

                {/* Cold Leads */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-blue-400 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Cold Leads</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        {students.filter(s => s.studentStatus?.[s.studentStatus?.length - 1]?.status === "Cold").length}
                    </p>
                    <p className="text-gray-500 text-xs">
                        {students.length > 0
                            ? `${((students.filter(s => s.studentStatus?.[s.studentStatus?.length - 1]?.status === "Cold").length / students.length) * 100).toFixed(1)}% of total`
                            : "0% of total"}
                    </p>
                </div>

                {/* Negative */}
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-gray-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Negative</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        {students.filter(s => s.studentStatus?.[s.studentStatus?.length - 1]?.status === "Negative").length}
                    </p>
                    <p className="text-gray-500 text-xs">
                        {students.length > 0
                            ? `${((students.filter(s => s.studentStatus?.[s.studentStatus?.length - 1]?.status === "Negative").length / students.length) * 100).toFixed(1)}% of total`
                            : "0% of total"}
                    </p>
                </div>
            </div>

            {/* Search & Table Controls */}
            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6">
                <div className="flex gap-4 flex-wrap items-center">
                    <div className="flex-1 relative min-w-[300px]">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, mobile, email, centre, lead status, board, exam..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    <MultiSelectFilter
                        label="Lead Status"
                        placeholder="All Status"
                        options={[
                            { value: "Hot", label: "Hot" },
                            { value: "Cold", label: "Cold" },
                            { value: "Negative", label: "Negative" },
                            { value: "Lead", label: "Lead" }
                        ]}
                        selectedValues={filterLeadStatus}
                        onChange={setFilterLeadStatus}
                    />

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
                    <table className="w-full text-left border-collapse">
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
                                {/* 1️⃣ Student Name */}
                                <th className="p-4 font-medium">Student Name</th>

                                {/* 2️⃣ Centre */}
                                <th className="p-4 font-medium">Centre</th>

                                {/* 3️⃣ Email */}
                                <th className="p-4 font-medium">Email</th>

                                {/* Remaining columns (unchanged order from updated tbody) */}
                                <th className="p-4 font-medium">Class</th>
                                <th className="p-4 font-medium">School</th>
                                <th className="p-4 font-medium">Board</th>
                                <th className="p-4 font-medium">Exam Tag</th>
                                <th className="p-4 font-medium">Mobile</th>
                                <th className="p-4 font-medium">Lead Status</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>


                        {/* <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500">Loading students...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500">
                                        {searchQuery ? "No students found matching your search." : "No students found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => {
                                    const details = student.studentsDetails?.[0] || {};
                                    const exam = student.examSchema?.[0] || {};
                                    const studentStatusList = student.studentStatus || [];
                                    const currentStatusObj = studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};
                                    const status = currentStatusObj.status || "N/A";
                                    const enrolledStatus = currentStatusObj.enrolledStatus || "Not Enrolled";
                                    const scienceMathPercent = exam.scienceMathParcent || "N/A";
                                    const sessionExam = student.sessionExamCourse?.[0] || {};

                                    const isEnrolled = enrolledStatus === "Enrolled";

                                    return (
                                        <tr key={student._id} className="hover:bg-[#252b32] transition-colors group">
                                            <td className="p-4 text-white font-medium">{details.studentName || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{exam.class || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{details.schoolName || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{details.board || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{sessionExam.examTag || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{details.mobileNum || "N/A"}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-300">{details.studentEmail || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{details.centre || "N/A"}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {isEnrolled ? (
                                                        <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded text-sm font-semibold border border-green-500/20">
                                                            ✓ Enrolled
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => navigate(`/admission/${student._id}`)}
                                                            className="px-3 py-1 bg-cyan-500 text-black rounded hover:bg-cyan-400 text-sm font-semibold transition-colors"
                                                        >
                                                            Admit
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleViewStudent(student)}
                                                        className="p-2 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="View"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditStudent(student)}
                                                        className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStudent(student._id)}
                                                        className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody> */}
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500">Loading students...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500">
                                        {searchQuery ? "No students found matching your search." : "No students found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((student) => {
                                        const details = student.studentsDetails?.[0] || {};
                                        const exam = student.examSchema?.[0] || {};
                                        const studentStatusList = student.studentStatus || [];
                                        const currentStatusObj =
                                            studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};
                                        const status = currentStatusObj.status || "N/A";
                                        const enrolledStatus = currentStatusObj.enrolledStatus || "Not Enrolled";
                                        const sessionExam = student.sessionExamCourse?.[0] || {};

                                        const isEnrolled = enrolledStatus === "Enrolled";

                                        return (
                                            <tr key={student._id} className="hover:bg-[#252b32] transition-colors group">

                                                {/* 1️⃣ STUDENT NAME */}
                                                <td className="p-4 text-white font-medium">
                                                    {details.studentName || "N/A"}
                                                </td>

                                                {/* 2️⃣ CENTRE */}
                                                <td className="p-4 text-gray-300">
                                                    {details.centre || "N/A"}
                                                </td>

                                                {/* 3️⃣ EMAIL */}
                                                <td className="p-4 text-gray-300">
                                                    {details.studentEmail || "N/A"}
                                                </td>

                                                {/* Rest of the columns (UNCHANGED) */}
                                                <td className="p-4 text-gray-300">{exam.class || "N/A"}</td>
                                                <td className="p-4 text-gray-300">{details.schoolName || "N/A"}</td>
                                                <td className="p-4 text-gray-300">{details.board || "N/A"}</td>
                                                <td className="p-4 text-gray-300">{sessionExam.examTag || "N/A"}</td>
                                                <td className="p-4 text-gray-300">{details.mobileNum || "N/A"}</td>

                                                <td className="p-4">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                                                            status
                                                        )}`}
                                                    >
                                                        {status}
                                                    </span>
                                                </td>

                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        {isEnrolled ? (
                                                            <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded text-sm font-semibold border border-green-500/20">
                                                                ✓ Enrolled
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => navigate(`/admission/${student._id}`)}
                                                                className="px-3 py-1 bg-cyan-500 text-black rounded hover:bg-cyan-400 text-sm font-semibold transition-colors"
                                                            >
                                                                Admit
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleViewStudent(student)}
                                                            className="p-2 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="View"
                                                        >
                                                            <FaEye />
                                                        </button>

                                                        <button
                                                            onClick={() => handleEditStudent(student)}
                                                            className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Edit"
                                                        >
                                                            <FaEdit />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDeleteStudent(student._id)}
                                                            className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Delete"
                                                        >
                                                            <FaTrash />
                                                        </button>
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
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedStudent(null);
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
