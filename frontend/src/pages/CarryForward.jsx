import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { FaSearch, FaFilter, FaEye, FaArrowRight, FaMoneyBillWave, FaTimes, FaUserGraduate, FaCheckCircle, FaBook, FaCalendar } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

const CarryForward = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAdmissions, setStudentAdmissions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("carryForward");
    const [enrolledSearchTerm, setEnrolledSearchTerm] = useState("");
    const [searchedStudent, setSearchedStudent] = useState(null);
    const [searchedStudentAdmissions, setSearchedStudentAdmissions] = useState([]);
    const [allAdmissions, setAllAdmissions] = useState([]);

    const apiUrl = import.meta.env.VITE_API_URL;

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [studentsRes, classesRes, admissionsRes] = await Promise.all([
                fetch(`${apiUrl}/normalAdmin/getAllStudents`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/admission`, { headers })
            ]);

            if (studentsRes.ok && admissionsRes.ok) {
                const studentsData = await studentsRes.json();
                const admissionsData = await admissionsRes.json();
                setAllAdmissions(admissionsData);

                // Count admissions per student and group them
                const studentAdmissionMap = {};
                admissionsData.forEach(admission => {
                    const studentId = admission.student?._id || admission.student;
                    if (studentId) {
                        if (!studentAdmissionMap[studentId]) {
                            studentAdmissionMap[studentId] = [];
                        }
                        studentAdmissionMap[studentId].push(admission);
                    }
                });

                // Filter carry forward students: 
                // 1. Students with carry forward balance > 0
                // 2. OR students who have enrolled in multiple courses
                const cfStudents = studentsData.filter(s => {
                    const hasCarryForwardBalance = s.carryForwardBalance && s.carryForwardBalance > 0;
                    const hasMultipleCourses = studentAdmissionMap[s._id]?.length > 1;
                    return hasCarryForwardBalance || hasMultipleCourses;
                });

                // Add admission data to each student
                cfStudents.forEach(student => {
                    student.admissions = studentAdmissionMap[student._id] || [];
                    student.admissionCount = student.admissions.length;
                });

                setStudents(cfStudents);
                setFilteredStudents(cfStudents);

                // Filter enrolled students
                const enrolled = studentsData.filter(s =>
                    s.studentStatus?.[0]?.enrolledStatus === "Enrolled"
                );
                setEnrolledStudents(enrolled);
            } else {
                toast.error("Failed to fetch students");
            }

            if (classesRes.ok) {
                setClasses(await classesRes.json());
            }

        } catch (err) {
            console.error(err);
            toast.error("Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [apiUrl]);

    // Filter carry forward students
    useEffect(() => {
        let result = students;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(student =>
                (student.studentsDetails?.[0]?.studentName?.toLowerCase().includes(lowerTerm)) ||
                (student.studentsDetails?.[0]?.mobileNum?.includes(lowerTerm)) ||
                (student._id?.toLowerCase().includes(lowerTerm))
            );
        }

        if (selectedClass) {
            result = result.filter(student =>
                student.examSchema?.some(exam => exam.class === selectedClass)
            );
        }

        setFilteredStudents(result);
    }, [searchTerm, selectedClass, students]);

    const openStudentModal = async (student) => {
        setSelectedStudent(student);
        setStudentAdmissions(student.admissions || []);
        setIsModalOpen(true);
    };

    const closeStudentModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
        setStudentAdmissions([]);
    };

    const handleEnrollNewCourse = () => {
        if (selectedStudent) {
            navigate(`/admission/${selectedStudent._id}`);
        }
    };

    const handleSearchEnrolledStudent = async () => {
        if (!enrolledSearchTerm.trim()) {
            toast.error("Please enter an admission number to search");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            // Search for admission by admission number
            const matchingAdmissions = allAdmissions.filter(adm =>
                adm.admissionNumber?.toLowerCase().includes(enrolledSearchTerm.toLowerCase())
            );

            if (matchingAdmissions.length > 0) {
                // Get the student from the first matching admission
                const firstAdmission = matchingAdmissions[0];
                const studentId = firstAdmission.student?._id || firstAdmission.student;

                // Fetch full student details
                const studentRes = await fetch(`${apiUrl}/normalAdmin/getStudent/${studentId}`, { headers });

                if (studentRes.ok) {
                    const studentData = await studentRes.json();
                    setSearchedStudent(studentData);

                    // Get all admissions for this student
                    const studentAdmissions = allAdmissions.filter(adm => {
                        const admStudentId = adm.student?._id || adm.student;
                        return admStudentId === studentData._id;
                    });
                    setSearchedStudentAdmissions(studentAdmissions);
                    toast.success(`Found ${studentAdmissions.length} course(s) for this student`);
                } else {
                    toast.error("Student details not found");
                    setSearchedStudent(null);
                    setSearchedStudentAdmissions([]);
                }
            } else {
                toast.error("No admission found with this number");
                setSearchedStudent(null);
                setSearchedStudentAdmissions([]);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error searching for student");
        } finally {
            setLoading(false);
        }
    };

    const getInstallmentStatusColor = (status) => {
        switch (status) {
            case "PAID":
                return "bg-green-500/10 text-green-400";
            case "PENDING_CLEARANCE":
                return "bg-cyan-500/10 text-cyan-400";
            case "OVERDUE":
                return "bg-red-500/10 text-red-400";
            case "PENDING":
                return "bg-yellow-500/10 text-yellow-400";
            default:
                return "bg-gray-500/10 text-gray-400";
        }
    };

    return (
        <Layout activePage="Course Management">
            <div className="flex-1 bg-[#131619] p-4 sm:p-6 overflow-y-auto text-white h-full">
                <ToastContainer position="top-right" theme="dark" />

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-cyan-400">Carry Forward Management</h2>
                        <p className="text-gray-400 text-sm mt-1">Track students who have enrolled in multiple courses or have carry forward balances</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab("carryForward")}
                        className={`px-6 py-3 font-semibold transition-colors relative ${activeTab === "carryForward"
                            ? "text-cyan-400 border-b-2 border-cyan-400"
                            : "text-gray-400 hover:text-gray-300"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <FaMoneyBillWave />
                            Carry Forward Students ({students.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("enrolled")}
                        className={`px-6 py-3 font-semibold transition-colors relative ${activeTab === "enrolled"
                            ? "text-cyan-400 border-b-2 border-cyan-400"
                            : "text-gray-400 hover:text-gray-300"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <FaUserGraduate />
                            Search Enrolled Students
                        </div>
                    </button>
                </div>

                {/* Carry Forward Students Tab */}
                {activeTab === "carryForward" && (
                    <>
                        {/* Filters & Search */}
                        <div className="bg-[#1a1f24] p-4 rounded-lg border border-gray-800 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by Name, Mobile or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 p-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        <option value="">All Classes</option>
                                        {classes.map(cls => (
                                            <option key={cls._id || cls.name} value={cls.name}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-800 text-gray-300">
                                            <th className="p-4 border-b border-gray-700">Student Name</th>
                                            <th className="p-4 border-b border-gray-700">Mobile</th>
                                            <th className="p-4 border-b border-gray-700">Class</th>
                                            <th className="p-4 border-b border-gray-700">Courses</th>
                                            <th className="p-4 border-b border-gray-700">CF Balance</th>
                                            <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading students...</td></tr>
                                        ) : filteredStudents.length === 0 ? (
                                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">No carry forward students found</td></tr>
                                        ) : (
                                            filteredStudents.map(student => {
                                                const details = student.studentsDetails?.[0] || {};
                                                const currentClass = student.examSchema?.[0]?.class || "N/A";
                                                const hasMultipleCourses = student.admissionCount > 1;
                                                const hasCarryForward = student.carryForwardBalance > 0;

                                                return (
                                                    <tr
                                                        key={student._id}
                                                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
                                                        onClick={() => openStudentModal(student)}
                                                    >
                                                        <td className="p-4">
                                                            <div className="font-medium text-white">{details.studentName || "Unknown"}</div>
                                                            <div className="text-xs text-gray-500">{details.studentEmail}</div>
                                                            <div className="flex gap-1 mt-1">
                                                                {hasMultipleCourses && (
                                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                                                        Next Course
                                                                    </span>
                                                                )}
                                                                {hasCarryForward && (
                                                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                                                        CF Balance
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-gray-300">{details.mobileNum || "N/A"}</td>
                                                        <td className="p-4 text-gray-300">
                                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">{currentClass}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                                                                {student.admissionCount || 0}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-yellow-400 font-medium">
                                                            ₹{(student.carryForwardBalance || 0).toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openStudentModal(student);
                                                                }}
                                                                className="text-cyan-400 hover:text-cyan-300 bg-cyan-900/20 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ml-auto"
                                                            >
                                                                View Details <FaEye size={12} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* Enrolled Students Tab - Search Only */}
                {activeTab === "enrolled" && (
                    <>
                        {/* Search Bar */}
                        <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800 mb-6">
                            <p className="text-gray-400 text-sm mb-4">
                                Search for enrolled students by their Admission Number to view details and enroll them in new courses.
                            </p>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <FaSearch className="absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Enter Admission Number (e.g., PATH202300001)..."
                                        value={enrolledSearchTerm}
                                        onChange={(e) => setEnrolledSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchEnrolledStudent()}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 p-3 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <button
                                    onClick={handleSearchEnrolledStudent}
                                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchedStudent && (
                            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {searchedStudent.studentsDetails?.[0]?.studentName}
                                        </h3>
                                        <div className="flex gap-4 text-sm text-gray-400">
                                            <span>Enrollment ID: {searchedStudentAdmissions?.[0]?.admissionNumber || "N/A"}</span>
                                            <span>Mobile: {searchedStudent.studentsDetails?.[0]?.mobileNum}</span>
                                            <span>Email: {searchedStudent.studentsDetails?.[0]?.studentEmail}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/admission/${searchedStudent._id}`)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                                    >
                                        Enroll New Course <FaArrowRight />
                                    </button>
                                </div>

                                {/* Student's Admissions */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                                        <FaBook /> Enrolled Courses ({searchedStudentAdmissions.length})
                                    </h4>
                                    {searchedStudentAdmissions.map((admission, idx) => (
                                        <div key={admission._id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h5 className="text-white font-semibold">{admission.course?.courseName}</h5>
                                                    <p className="text-sm text-gray-400">
                                                        {admission.department?.departmentName} • {admission.academicSession}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded text-xs font-bold ${admission.paymentStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                    admission.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {admission.paymentStatus}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-400">Total Fees:</span>
                                                    <p className="text-white font-semibold">₹{admission.totalFees?.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Paid:</span>
                                                    <p className="text-green-400 font-semibold">₹{admission.totalPaidAmount?.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Pending:</span>
                                                    <p className="text-yellow-400 font-semibold">
                                                        ₹{(admission.totalFees - admission.totalPaidAmount).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Student Details Modal */}
                {isModalOpen && selectedStudent && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1e2329] rounded-xl w-full max-w-6xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-[#1e2329] p-6 border-b border-gray-700 flex justify-between items-center z-10">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">
                                        {selectedStudent.studentsDetails?.[0]?.studentName}
                                    </h3>
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <span>Enrollment ID: {studentAdmissions?.[0]?.admissionNumber || "N/A"}</span>
                                        <span>Mobile: {selectedStudent.studentsDetails?.[0]?.mobileNum}</span>
                                        <span>Email: {selectedStudent.studentsDetails?.[0]?.studentEmail}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleEnrollNewCourse}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                                    >
                                        Enroll New Course <FaArrowRight />
                                    </button>
                                    <button
                                        onClick={closeStudentModal}
                                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
                                    >
                                        <FaTimes size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Carry Forward Balance */}
                                {selectedStudent.carryForwardBalance > 0 && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <FaMoneyBillWave className="text-yellow-400 text-2xl" />
                                            <div>
                                                <p className="text-yellow-400 font-semibold">Carry Forward Balance</p>
                                                <p className="text-2xl font-bold text-yellow-400">
                                                    ₹{selectedStudent.carryForwardBalance.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* All Courses/Admissions */}
                                <div>
                                    <h4 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                                        <FaBook /> All Enrolled Courses ({studentAdmissions.length})
                                    </h4>

                                    <div className="space-y-6">
                                        {studentAdmissions.map((admission, index) => (
                                            <div key={admission._id} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                                                {/* Course Header */}
                                                <div className="bg-gray-800 p-4 flex justify-between items-center">
                                                    <div>
                                                        <h5 className="text-lg font-bold text-white">
                                                            Course {index + 1}: {admission.course?.courseName}
                                                        </h5>
                                                        <p className="text-sm text-gray-400">
                                                            {admission.department?.departmentName} • {admission.academicSession} •
                                                            Admission: {new Date(admission.admissionDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded text-sm font-bold ${admission.paymentStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                        admission.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {admission.paymentStatus}
                                                    </span>
                                                </div>

                                                <div className="p-4 space-y-4">
                                                    {/* Fee Summary */}
                                                    <div className="grid grid-cols-4 gap-4">
                                                        <div className="bg-cyan-500/10 p-3 rounded">
                                                            <p className="text-xs text-gray-400">Total Fees</p>
                                                            <p className="text-lg font-bold text-cyan-400">
                                                                ₹{admission.totalFees?.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-green-500/10 p-3 rounded">
                                                            <p className="text-xs text-gray-400">Total Paid</p>
                                                            <p className="text-lg font-bold text-green-400">
                                                                ₹{admission.totalPaidAmount?.toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-yellow-500/10 p-3 rounded">
                                                            <p className="text-xs text-gray-400">Pending</p>
                                                            <p className="text-lg font-bold text-yellow-400">
                                                                ₹{(admission.totalFees - admission.totalPaidAmount).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="bg-blue-500/10 p-3 rounded">
                                                            <p className="text-xs text-gray-400">Down Payment</p>
                                                            <p className="text-lg font-bold text-blue-400">
                                                                ₹{admission.downPayment?.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Payment Breakdown */}
                                                    <div>
                                                        <h6 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                                            <FaCalendar /> Payment Schedule
                                                        </h6>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-gray-900 text-gray-400">
                                                                        <th className="p-2 text-left">Inst #</th>
                                                                        <th className="p-2 text-left">Due Date</th>
                                                                        <th className="p-2 text-left">Amount</th>
                                                                        <th className="p-2 text-left">Paid</th>
                                                                        <th className="p-2 text-left">Method</th>
                                                                        <th className="p-2 text-left">Status</th>
                                                                        <th className="p-2 text-left">Remarks</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {admission.paymentBreakdown?.map((payment) => (
                                                                        <tr key={payment.installmentNumber} className="border-t border-gray-700">
                                                                            <td className="p-2 text-white">#{payment.installmentNumber}</td>
                                                                            <td className="p-2 text-gray-300">
                                                                                {new Date(payment.dueDate).toLocaleDateString()}
                                                                            </td>
                                                                            <td className="p-2 text-white font-medium">
                                                                                ₹{payment.amount?.toLocaleString()}
                                                                            </td>
                                                                            <td className="p-2 text-green-400">
                                                                                ₹{payment.paidAmount?.toLocaleString() || 0}
                                                                            </td>
                                                                            <td className="p-2 text-gray-300">
                                                                                {payment.paymentMethod || "-"}
                                                                            </td>
                                                                            <td className="p-2">
                                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getInstallmentStatusColor(payment.status)}`}>
                                                                                    {payment.status === "PENDING_CLEARANCE" ? "IN PROCESS" : payment.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="p-2 text-gray-400 text-xs">
                                                                                {payment.remarks || "-"}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CarryForward;
