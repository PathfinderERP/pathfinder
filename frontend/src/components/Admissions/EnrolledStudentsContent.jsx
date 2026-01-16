import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaDownload, FaFilter, FaUserGraduate, FaSync, FaTimes, FaBook, FaCalendar, FaMoneyBillWave, FaFileInvoice, FaCheckCircle, FaExclamationCircle, FaUser, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaSchool, FaHistory, FaUsers, FaIdCard, FaBirthdayCake, FaVenusMars, FaPassport } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdmissionDetailsModal from './AdmissionDetailsModal';
import EditEnrolledStudentModal from './EditEnrolledStudentModal';
import ExportButton from '../common/ExportButton';
import MultiSelectFilter from '../common/MultiSelectFilter';
import Pagination from '../common/Pagination';
import { downloadCSV, downloadExcel } from '../../utils/exportUtils';
import './AdmissionsWave.css';
import { hasPermission } from '../../config/permissions';
import BillGenerator from '../Finance/BillGenerator';

const EnrolledStudentsContent = () => {
    const navigate = useNavigate();
    const [admissions, setAdmissions] = useState([]);
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState([]);
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterDepartment, setFilterDepartment] = useState([]);
    const [filterCourse, setFilterCourse] = useState([]);
    const [filterClass, setFilterClass] = useState([]);
    const [filterSession, setFilterSession] = useState([]);

    // Master Data States
    const [masterCentres, setMasterCentres] = useState([]);
    const [masterDepartments, setMasterDepartments] = useState([]);
    const [masterCourses, setMasterCourses] = useState([]);
    const [masterClasses, setMasterClasses] = useState([]);
    const [masterSessions, setMasterSessions] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAdmissions, setStudentAdmissions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentData, setPaymentData] = useState({
        paidAmount: 0,
        paymentMethod: "CASH",
        transactionId: "",
        accountHolderName: "",
        chequeDate: "",
        remarks: "",
        carryForward: false
    });
    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [viewMode, setViewMode] = useState('Active'); // 'Active' or 'Deactivated'

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role === "superAdmin";
    const canCreate = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'create');
    const canEdit = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'edit');
    const canDelete = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'delete');
    const canDeactivate = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'deactivate');

    const apiUrl = import.meta.env.VITE_API_URL;

    // Helper to format date as DD/MM/YYYY (en-GB standard)
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString('en-GB');
    };

    useEffect(() => {
        fetchAllowedCentres();
        fetchAdmissions();
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [deptRes, courseRes, classRes, sessionRes] = await Promise.all([
                fetch(`${apiUrl}/department`, { headers }),
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/session/list`, { headers })
            ]);

            if (deptRes.ok) setMasterDepartments(await deptRes.json());
            if (courseRes.ok) setMasterCourses(await courseRes.json());
            if (classRes.ok) setMasterClasses(await classRes.json());
            if (sessionRes.ok) setMasterSessions(await sessionRes.json());
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    };

    const fetchAllowedCentres = async () => {
        try {
            const token = localStorage.getItem("token");

            // Fetch current user data to get latest centre assignments
            const userResponse = await fetch(`${apiUrl}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!userResponse.ok) {
                console.error("Failed to fetch user profile");
                return;
            }

            const responseData = await userResponse.json();
            const currentUser = responseData.user; // API returns { user: {...} }

            console.log("Current user data:", currentUser); // Debug log

            // If superAdmin, fetch all centres
            if (currentUser.role === 'superAdmin') {
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const centres = await response.json();
                setAllowedCentres(centres.map(c => c.centreName));
            } else {
                // For non-superAdmin, use populated centres from profile
                // The profile API populates centres with full objects
                const userCentres = currentUser.centres || [];
                console.log("User centres from profile:", userCentres); // Debug log

                if (userCentres.length > 0) {
                    // Centres are already populated with centreName
                    const userCentreNames = userCentres.map(c => c.centreName);
                    console.log("Allowed centre names:", userCentreNames); // Debug log
                    setAllowedCentres(userCentreNames);
                } else {
                    console.log("No centres assigned to user"); // Debug log
                    setAllowedCentres([]);
                }
            }
        } catch (error) {
            console.error("Error fetching allowed centres:", error);
        }
    };

    const fetchAdmissions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setAdmissions(data);
                groupStudents(data);
            } else {
                toast.error("Failed to fetch admissions");
            }
        } catch (error) {
            toast.error("Error fetching admissions");
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const groupStudents = (admissionsData) => {
        // Group admissions by student
        const studentMap = {};
        admissionsData.forEach(admission => {
            const studentId = admission.student?._id;
            if (studentId) {
                if (!studentMap[studentId]) {
                    studentMap[studentId] = {
                        student: admission.student,
                        admissions: [],
                        totalCourses: 0,
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
            item.totalCourses = item.admissions.length;
            return item;
        });

        setStudents(studentsArray);
        setFilteredStudents(studentsArray);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, filterCentre, filterDepartment, filterCourse, filterClass, filterSession]);

    // Filter students
    useEffect(() => {
        let result = students;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => {
                const student = item.student?.studentsDetails?.[0] || {};
                const studentName = student.studentName || "";
                const mobile = student.mobileNum || "";
                const email = student.studentEmail || "";

                // Check if any admission matches
                const admissionMatch = item.admissions.some(admission => {
                    const admissionNumber = admission.admissionNumber || "";
                    const courseName = admission.course?.courseName || "";
                    const centre = admission.centre || student.centre || "";
                    return admissionNumber.toLowerCase().includes(query) ||
                        courseName.toLowerCase().includes(query) ||
                        centre.toLowerCase().includes(query);
                });

                return studentName.toLowerCase().includes(query) ||
                    mobile.includes(query) ||
                    email.toLowerCase().includes(query) ||
                    admissionMatch;
            });
        }

        if (filterStatus.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => filterStatus.includes(admission.admissionStatus))
            );
        }

        if (filterCentre.length > 0) {
            result = result.filter(item => {
                const student = item.student?.studentsDetails?.[0] || {};
                return item.admissions.some(admission => {
                    const centre = admission.centre || student.centre || admission.department?.departmentName || "";
                    return filterCentre.includes(centre);
                });
            });
        }

        if (filterDepartment.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const deptName = admission.department?.departmentName || "";
                    return filterDepartment.includes(deptName);
                })
            );
        }

        if (filterCourse.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const courseName = admission.course?.courseName || "";
                    return filterCourse.includes(courseName);
                })
            );
        }

        if (filterClass.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const className = admission.class?.className || admission.class?.name || "";
                    return filterClass.includes(className);
                })
            );
        }

        if (filterSession.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => filterSession.includes(admission.academicSession))
            );
        }

        // Filter by student status (viewMode)
        result = result.filter(item => {
            if (viewMode === 'Board') {
                return item.admissions.some(a => a.admissionType === 'BOARD') && (item.student?.status || 'Active') === 'Active';
            }
            const status = item.student?.status || 'Active';
            return status === viewMode && item.admissions.some(a => a.admissionType === 'NORMAL');
        });

        setFilteredStudents(result);
    }, [searchQuery, filterStatus, filterCentre, filterDepartment, filterCourse, filterClass, filterSession, students, viewMode]);

    const filteredAdmissions = filteredStudents.flatMap(s => s.admissions);
    const totalCollected = filteredAdmissions.reduce((sum, a) => sum + (a.totalPaidAmount || 0), 0);
    const pendingPaymentCount = filteredAdmissions.filter(a => a.paymentStatus === "PENDING" || a.paymentStatus === "PARTIAL").length;

    const handleRefresh = () => {
        setSearchQuery("");
        setFilterStatus([]);
        setFilterCentre([]);
        setFilterDepartment([]);
        setFilterCourse([]);
        setFilterClass([]);
        setFilterSession([]);
        setCurrentPage(1);
        setLoading(true);
        fetchAdmissions();
        toast.info("Refreshed data and filters");
    };

    const uniqueCentres = allowedCentres;

    const uniqueDepartments = [...new Set(admissions
        .map(a => a.department?.departmentName)
        .filter(Boolean))].sort();

    const uniqueCourses = [...new Set(admissions
        .map(a => a.course?.courseName)
        .filter(Boolean))].sort();

    const getStatusColor = (status) => {
        switch (status) {
            case "ACTIVE":
                return "bg-green-500/10 text-green-400 border-green-500/20";
            case "INACTIVE":
                return "bg-gray-500/10 text-gray-400 border-gray-500/20";
            case "CANCELLED":
                return "bg-red-500/10 text-red-400 border-red-500/20";
            case "COMPLETED":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            default:
                return "bg-gray-500/10 text-gray-400 border-gray-500/20";
        }
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case "COMPLETED":
                return "bg-green-500/10 text-green-400";
            case "PARTIAL":
                return "bg-yellow-500/10 text-yellow-400";
            case "PENDING":
                return "bg-red-500/10 text-red-400";
            default:
                return "bg-gray-500/10 text-gray-400";
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

    const openStudentModal = (studentItem) => {
        setSelectedStudent(studentItem.student);
        setStudentAdmissions(studentItem.admissions);
        setIsModalOpen(true);
    };

    const closeStudentModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
        setStudentAdmissions([]);
    };

    const openPaymentModal = (admission, installment) => {
        setSelectedAdmission(admission);
        setSelectedInstallment(installment);
        setPaymentData({
            paidAmount: installment.amount,
            paymentMethod: "CASH",
            transactionId: "",
            accountHolderName: "",
            chequeDate: new Date().toISOString().split('T')[0],
            receivedDate: new Date().toISOString().split('T')[0],
            remarks: "",
            carryForward: false
        });
        setShowPaymentModal(true);
    };


    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        const onlinePaymentMethods = ["UPI", "CARD", "BANK_TRANSFER"];
        const isOnlinePayment = onlinePaymentMethods.includes(paymentData.paymentMethod);

        if (isOnlinePayment && !paymentData.transactionId.trim()) {
            toast.error("Transaction ID is required for online payment methods");
            return;
        }

        setProcessingPayment(true);
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `${apiUrl}/admission/${selectedAdmission._id}/payment/${selectedInstallment.installmentNumber}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(paymentData)
                }
            );

            const data = await response.json();

            if (response.ok) {
                toast.success("Payment updated successfully");
                if (paymentData.paidAmount < selectedInstallment.amount) {
                    toast.info("Partial payment recorded. Remaining amount carried forward.");
                }
                setShowPaymentModal(false);

                // Show bill generator after payment
                setBillModal({
                    show: true,
                    admission: data.admission || selectedAdmission,
                    installment: {
                        ...selectedInstallment,
                        paidAmount: paymentData.paidAmount,
                        paymentMethod: paymentData.paymentMethod,
                        receivedDate: paymentData.receivedDate,
                        status: paymentData.paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID"
                    }
                });

                setSelectedInstallment(null);
                setSelectedAdmission(null);
                fetchAdmissions();
            } else {
                toast.error(data.message || "Failed to update payment");
            }
        } catch (err) {
            console.error(err);
            toast.error("Server error during payment processing");
        } finally {
            setProcessingPayment(false);
        }
    };


    const handleToggleStatus = async (studentId, currentStatus) => {
        const newStatus = currentStatus === 'Active' ? 'Deactivated' : 'Active';
        if (!window.confirm(`Are you sure you want to ${newStatus === 'Active' ? 'reactivate' : 'deactivate'} this student?`)) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/student/${studentId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                fetchAdmissions();
            } else {
                toast.error(data.message || "Failed to update status");
            }
        } catch (error) {
            toast.error("Error updating status");
            console.error("Error:", error);
        }
    };


    const prepareExportData = () => {
        // Use visible students' admissions to respect filters
        const exportAdmissions = filteredStudents.length > 0
            ? filteredStudents.flatMap(s => s.admissions)
            : [];

        if (exportAdmissions.length === 0) {
            return { headers: [], exportData: [] };
        }

        // Helper to formatting date as DD/MM/YYYY
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // Fallback if invalid
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        // Calculate max installments dynamically
        const maxInstallments = exportAdmissions.reduce((max, adm) =>
            Math.max(max, adm.paymentBreakdown?.length || 0), 0);

        const baseHeaders = [
            // Student Details
            { label: 'Student Name', key: 'student.studentsDetails.0.studentName' },
            { label: 'DOB', key: 'student.studentsDetails.0.dateOfBirth' },
            { label: 'Gender', key: 'student.studentsDetails.0.gender' },
            { label: 'Centre', key: 'centre' },
            { label: 'Board', key: 'student.studentsDetails.0.board' },
            { label: 'State', key: 'student.studentsDetails.0.state' },
            { label: 'Email', key: 'student.studentsDetails.0.studentEmail' },
            { label: 'Mobile', key: 'student.studentsDetails.0.mobileNum' },
            { label: 'WhatsApp', key: 'student.studentsDetails.0.whatsappNumber' },
            { label: 'School', key: 'student.studentsDetails.0.schoolName' },
            { label: 'Address', key: 'student.studentsDetails.0.address' },

            // Guardian Details
            { label: 'Guardian Name', key: 'student.guardians.0.guardianName' },
            { label: 'Guardian Mobile', key: 'student.guardians.0.guardianMobile' },
            { label: 'Guardian Email', key: 'student.guardians.0.guardianEmail' },

            // Academic Info
            { label: 'Class', key: 'class.className' },
            { label: 'Session', key: 'academicSession' },
            { label: 'Exam Tag', key: 'examTag.name' },

            // Admission Details
            { label: 'Enrollment ID', key: 'admissionNumber' },
            { label: 'Admission Date', key: 'admissionDate' },
            { label: 'Admission Status', key: 'admissionStatus' },
            { label: 'Admitted By', key: 'createdBy' },

            // Course & Dept
            { label: 'Course', key: 'course.courseName' },
            { label: 'Department', key: 'department.departmentName' },

            // Financials
            { label: 'Total Fees', key: 'totalFees' },
            { label: 'Paid Amount', key: 'totalPaidAmount' },
            { label: 'Pending Amount', key: 'remainingAmount' },
            { label: 'Payment Status', key: 'paymentStatus' },
            { label: 'Down Payment', key: 'downPayment' },
            { label: 'Down Payment Status', key: 'downPaymentStatus' },
            { label: 'No. of Installments', key: 'numberOfInstallments' }
        ];

        // Dynamic Installment Headers
        const installmentHeaders = [];
        for (let i = 1; i <= maxInstallments; i++) {
            installmentHeaders.push(
                { label: `Inst ${i} Due Date`, key: `installments.${i - 1}.dueDate` },
                { label: `Inst ${i} Amount`, key: `installments.${i - 1}.amount` },
                { label: `Inst ${i} Paid`, key: `installments.${i - 1}.paidAmount` },
                { label: `Inst ${i} Status`, key: `installments.${i - 1}.status` },
                { label: `Inst ${i} Paid Date`, key: `installments.${i - 1}.paidDate` }
            );
        }

        const headers = [...baseHeaders, ...installmentHeaders];

        const exportData = exportAdmissions.map(admission => {
            const student = admission.student || {};
            const details = student.studentsDetails?.[0] || {};
            const guardian = student.guardians?.[0] || {};
            const centre = admission.centre || details.centre || "N/A";

            // Map Installments
            const installments = admission.paymentBreakdown?.map(inst => ({
                dueDate: formatDate(inst.dueDate),
                amount: inst.amount || 0,
                paidAmount: inst.paidAmount || 0,
                status: inst.status || '',
                paidDate: formatDate(inst.paidDate)
            })) || [];

            return {
                student: {
                    studentsDetails: [{
                        studentName: details.studentName || '',
                        dateOfBirth: formatDate(details.dateOfBirth),
                        gender: details.gender || '',
                        board: details.board || '',
                        state: details.state || '',
                        studentEmail: details.studentEmail || '',
                        mobileNum: details.mobileNum || '',
                        whatsappNumber: details.whatsappNumber || '',
                        schoolName: details.schoolName || '',
                        address: details.address || ''
                    }],
                    guardians: [{
                        guardianName: guardian.guardianName || '',
                        guardianMobile: guardian.guardianMobile || '',
                        guardianEmail: guardian.guardianEmail || ''
                    }]
                },
                centre: centre,
                class: { className: admission.class?.className || '' },
                academicSession: admission.academicSession || '',
                examTag: { name: admission.examTag?.name || '' },
                admissionNumber: admission.admissionNumber || '',
                admissionDate: formatDate(admission.admissionDate),
                admissionStatus: admission.admissionStatus || '',
                createdBy: admission.createdBy?.name || '',
                course: { courseName: admission.course?.courseName || '' },
                department: { departmentName: admission.department?.departmentName || '' },
                totalFees: admission.totalFees || 0,
                totalPaidAmount: admission.totalPaidAmount || 0,
                remainingAmount: admission.remainingAmount || 0,
                paymentStatus: admission.paymentStatus || '',
                downPayment: admission.downPayment || 0,
                downPaymentStatus: admission.downPaymentStatus || '',
                numberOfInstallments: admission.numberOfInstallments || 0,
                installments: installments
            };
        });

        return { headers, exportData };
    };

    const handleExportCSV = () => {
        const { headers, exportData } = prepareExportData();
        if (exportData.length === 0) {
            toast.warning("No data to export");
            return;
        }
        downloadCSV(exportData, headers, 'enrolled_students_full');
        toast.success('Full enrolled student details exported to CSV!');
    };

    const handleExportExcel = () => {
        const { headers, exportData } = prepareExportData();
        if (exportData.length === 0) {
            toast.warning("No data to export");
            return;
        }
        downloadExcel(exportData, headers, 'enrolled_students_full');
        toast.success('Full enrolled student details exported to Excel!');
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FaUserGraduate className="text-cyan-400 text-3xl" />
                    <h2 className="text-2xl font-bold text-white">Enrolled Students</h2>
                </div>
                <div className="flex gap-3">
                    <ExportButton
                        onExportCSV={handleExportCSV}
                        onExportExcel={handleExportExcel}
                    />
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800 hover:text-cyan-400 transition-all"
                        title="Refresh Data & Reset Filters"
                    >
                        <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-green-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Students</h3>
                    <p className="text-4xl font-bold text-white mb-2">{filteredStudents.length}</p>
                    <p className="text-gray-500 text-xs">Matching current view</p>
                </div>

                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Courses</h3>
                    <p className="text-4xl font-bold text-white mb-2">{filteredAdmissions.length}</p>
                    <p className="text-gray-500 text-xs">Associated with current view</p>
                </div>

                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-yellow-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Pending Payment</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        {pendingPaymentCount}
                    </p>
                    <p className="text-gray-500 text-xs">Incomplete in current view</p>
                </div>

                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-blue-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Collected</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        ₹{totalCollected.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs">Fees from current view</p>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setViewMode('Active')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${viewMode === 'Active'
                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                        : "bg-[#1a1f24] text-gray-400 border border-gray-700 hover:text-white"
                        }`}
                >
                    Active Students
                </button>
                <button
                    onClick={() => setViewMode('Board')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${viewMode === 'Board'
                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                        : "bg-[#1a1f24] text-gray-400 border border-gray-700 hover:text-white"
                        }`}
                >
                    Board Courses
                </button>
                <button
                    onClick={() => setViewMode('Deactivated')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${viewMode === 'Deactivated'
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                        : "bg-[#1a1f24] text-gray-400 border border-gray-700 hover:text-white"
                        }`}
                >
                    Deactivated Students
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, centre, course, mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                    <MultiSelectFilter
                        label="Status"
                        placeholder="All Status"
                        options={[
                            { value: "ACTIVE", label: "Active" },
                            { value: "INACTIVE", label: "Inactive" },
                            { value: "COMPLETED", label: "Completed" }
                        ]}
                        selectedValues={filterStatus}
                        onChange={setFilterStatus}
                    />

                    <MultiSelectFilter
                        label="Centre"
                        placeholder="All Centres"
                        options={uniqueCentres.map(c => ({ value: c, label: c }))}
                        selectedValues={filterCentre}
                        onChange={setFilterCentre}
                    />

                    <MultiSelectFilter
                        label="Dept"
                        placeholder="All Departments"
                        options={masterDepartments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                        selectedValues={filterDepartment}
                        onChange={setFilterDepartment}
                    />

                    <MultiSelectFilter
                        label="Course"
                        placeholder="All Courses"
                        options={masterCourses.map(c => ({ value: c.courseName, label: c.courseName }))}
                        selectedValues={filterCourse}
                        onChange={setFilterCourse}
                    />

                    <MultiSelectFilter
                        label="Class"
                        placeholder="All Classes"
                        options={masterClasses.map(c => ({ value: c.className || c.name, label: c.className || c.name }))}
                        selectedValues={filterClass}
                        onChange={setFilterClass}
                    />

                    <MultiSelectFilter
                        label="Session"
                        placeholder="All Sessions"
                        options={masterSessions.map(s => ({ value: s.sessionName || s.name, label: s.sessionName || s.name }))}
                        selectedValues={filterSession}
                        onChange={setFilterSession}
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

            {/* Students Table */}
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-xl font-bold text-white">Student Records</h3>
                    <p className="text-sm text-gray-400 mt-1">Click on any student to view all their course details</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Department</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Latest Course</th>
                                <th className="p-4 font-medium">Total Courses</th>
                                <th className="p-4 font-medium">Latest Status</th>
                                <th className="p-4 font-medium">Admitted By</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr className="animate-pulse">
                                    <td colSpan="8" className="p-8 text-center text-gray-500">Loading students...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        {searchQuery ? "No students found matching your search." : "No students found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((studentItem) => {
                                        const student = studentItem.student?.studentsDetails?.[0] || {};
                                        const latestAdmission = studentItem.latestAdmission;
                                        const studentImage = student.studentImage || null;

                                        return (
                                            <tr
                                                key={studentItem.student._id}
                                                className={`admissions-row-wave transition-colors group cursor-pointer ${studentItem.student.status === 'Deactivated' ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-gray-800/50'}`}
                                                onClick={() => openStudentModal(studentItem)}
                                            >
                                                <td className="p-4">
                                                    <span className="text-sm text-gray-300 font-medium bg-gray-800 px-2 py-1 rounded border border-gray-700">
                                                        {latestAdmission?.department?.departmentName || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                                            {studentImage ? (
                                                                <img src={studentImage} alt={student.studentName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.studentName?.charAt(0).toUpperCase() || "S"
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-white font-medium">{student.studentName || "N/A"}</p>
                                                                {studentItem.student.status === 'Deactivated' && (
                                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20 uppercase">
                                                                        Deactivated
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-400 text-xs">{student.studentEmail || ""}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300">{student.mobileNum || "N/A"}</td>
                                                <td className="p-4">
                                                    <div className="text-white font-medium">{latestAdmission?.course?.courseName || "N/A"}</div>
                                                    <div className="text-xs text-gray-400">{latestAdmission?.academicSession || ""}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                                                        {studentItem.totalCourses}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(latestAdmission?.admissionStatus)}`}>
                                                            {latestAdmission?.admissionStatus}
                                                        </span>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPaymentStatusColor(latestAdmission?.paymentStatus)}`}>
                                                            {latestAdmission?.paymentStatus}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20 text-xs">
                                                            {latestAdmission?.createdBy?.name
                                                                ? latestAdmission.createdBy.name.charAt(0).toUpperCase()
                                                                : (latestAdmission?.createdBy ? "U" : "A")}
                                                        </div>
                                                        <span className="text-gray-300 text-sm">
                                                            {latestAdmission?.createdBy?.name || (latestAdmission?.createdBy ? "Unknown User" : "System")}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openStudentModal(studentItem);
                                                            }}
                                                            className="p-2 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-opacity"
                                                            title="View Details"
                                                        >
                                                            <FaEye />
                                                        </button>

                                                        {canDeactivate && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleStatus(studentItem.student._id, studentItem.student.status || 'Active');
                                                                }}
                                                                className={`p-2 rounded transition-all ${studentItem.student.status === 'Deactivated'
                                                                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                                                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                                    }`}
                                                                title={studentItem.student.status === 'Deactivated' ? "Reactivate Student" : "Deactivate Student"}
                                                            >
                                                                {studentItem.student.status === 'Deactivated' ? <FaCheckCircle /> : <FaTimes />}
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

            {/* Student Details Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e2329] rounded-xl w-full max-w-6xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-[#1e2329] p-6 border-b border-gray-700 flex justify-between items-center z-10">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                    <FaUserGraduate className="text-cyan-400" />
                                    {selectedStudent.studentsDetails?.[0]?.studentName}
                                </h3>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1.5"><FaPhoneAlt size={12} className="text-cyan-500" /> {selectedStudent.studentsDetails?.[0]?.mobileNum}</span>
                                    <span className="flex items-center gap-1.5"><FaEnvelope size={12} className="text-cyan-500" /> {selectedStudent.studentsDetails?.[0]?.studentEmail}</span>
                                    <span className="flex items-center gap-1.5"><FaMapMarkerAlt size={12} className="text-cyan-500" /> {selectedStudent.studentsDetails?.[0]?.centre}</span>
                                    {studentAdmissions[0]?.department?.departmentName && (
                                        <span className="flex items-center gap-1.5"><FaHistory size={12} className="text-orange-500" /> {studentAdmissions[0].department.departmentName}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={closeStudentModal}
                                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Deactivation Warning Banner */}
                            {selectedStudent.status === 'Deactivated' && (
                                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-center gap-3 animate-pulse">
                                    <FaExclamationCircle className="text-red-500 text-xl" />
                                    <div>
                                        <h4 className="text-red-500 font-bold">STUDENT DEACTIVATED</h4>
                                        <p className="text-red-400/80 text-sm">All financial operations and bill generation are restricted for this student.</p>
                                    </div>
                                </div>
                            )}
                            {/* Student Info Sections */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Personal Information */}
                                <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                                    <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                                        <FaUser className="text-cyan-400" />
                                        <h4 className="font-bold text-white uppercase tracking-wider text-sm">Personal Information</h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                        <div>
                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1"><FaBirthdayCake size={10} /> Date of Birth</p>
                                            <p className="text-gray-200 font-medium">{formatDate(selectedStudent.studentsDetails?.[0]?.dateOfBirth)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1"><FaVenusMars size={10} /> Gender</p>
                                            <p className="text-gray-200 font-medium">{selectedStudent.studentsDetails?.[0]?.gender || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1"><FaPassport size={10} /> WhatsApp</p>
                                            <p className="text-gray-200 font-medium">{selectedStudent.studentsDetails?.[0]?.whatsappNumber || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1"><FaIdCard size={10} /> Source</p>
                                            <p className="text-gray-200 font-medium">{selectedStudent.studentsDetails?.[0]?.source || "Walk-in"}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1 flex items-center gap-1"><FaMapMarkerAlt size={10} /> Residential Address</p>
                                            <p className="text-gray-200 font-medium">
                                                {selectedStudent.studentsDetails?.[0]?.address}, {selectedStudent.studentsDetails?.[0]?.state} - {selectedStudent.studentsDetails?.[0]?.pincode}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Information */}
                                <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                                    <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                                        <FaSchool className="text-cyan-400" />
                                        <h4 className="font-bold text-white uppercase tracking-wider text-sm">Academic Information</h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 gap-y-4 text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Current School</p>
                                                <p className="text-gray-200 font-medium">{selectedStudent.studentsDetails?.[0]?.schoolName || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Board</p>
                                                <p className="text-gray-200 font-medium">{selectedStudent.studentsDetails?.[0]?.board || "N/A"}</p>
                                            </div>
                                        </div>

                                        {selectedStudent.examSchema && selectedStudent.examSchema.length > 0 && (
                                            <div className="mt-2 text-xs">
                                                <p className="text-cyan-400 font-bold uppercase mb-2 text-[10px] tracking-widest border-b border-gray-700 pb-1">Previous Academic Records</p>
                                                <div className="space-y-3">
                                                    {selectedStudent.examSchema.map((exam, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-gray-900/40 p-2 rounded border border-gray-700/50">
                                                            <div>
                                                                <p className="text-white font-bold">{exam.examName}</p>
                                                                <p className="text-gray-500">Class: {exam.class}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-cyan-400 font-bold">{exam.markAgregate}%</p>
                                                                <p className="text-gray-500">S/M: {exam.scienceMathParcent}%</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Guardian Information */}
                                <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden lg:col-span-2">
                                    <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                                        <FaUsers className="text-cyan-400" />
                                        <h4 className="font-bold text-white uppercase tracking-wider text-sm">Guardian Information</h4>
                                    </div>
                                    <div className="p-4">
                                        {selectedStudent.guardians && selectedStudent.guardians.length > 0 ? (
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                                {selectedStudent.guardians.map((guardian, idx) => (
                                                    <React.Fragment key={idx}>
                                                        <div>
                                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Guardian Name</p>
                                                            <p className="text-white font-bold">{guardian.guardianName || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Contact No.</p>
                                                            <p className="text-gray-200 font-medium">{guardian.guardianMobile || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Occupation</p>
                                                            <p className="text-gray-200 font-medium">{guardian.occupation || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Annual Income</p>
                                                            <p className="text-white font-bold">₹{guardian.annualIncome || "0"}</p>
                                                        </div>
                                                        <div className="lg:col-span-2">
                                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Email</p>
                                                            <p className="text-gray-200 font-medium">{guardian.guardianEmail || "N/A"}</p>
                                                        </div>
                                                        <div className="lg:col-span-2">
                                                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Qualification</p>
                                                            <p className="text-gray-200 font-medium">{guardian.qualification || "N/A"}</p>
                                                        </div>
                                                        {guardian.organizationName && (
                                                            <div className="lg:col-span-4 bg-black/20 p-3 rounded mt-2 border border-gray-700/30">
                                                                <h6 className="text-[10px] text-cyan-400 font-bold uppercase mb-2 flex items-center gap-2"><FaHistory size={10} /> Professional Details</h6>
                                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                                                    <div>
                                                                        <p className="text-gray-500 mb-0.5">Organization</p>
                                                                        <p className="text-gray-300">{guardian.organizationName}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-gray-500 mb-0.5">Designation</p>
                                                                        <p className="text-gray-300">{guardian.designation}</p>
                                                                    </div>
                                                                    <div className="lg:col-span-1">
                                                                        <p className="text-gray-500 mb-0.5">Office Address</p>
                                                                        <p className="text-gray-300">{guardian.officeAddress || "N/A"}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic text-center py-4">No guardian information found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* All Courses/Admissions */}
                            <div>
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-2">
                                    <FaBook className="text-cyan-400" /> All Enrolled Courses ({studentAdmissions.length})
                                </h4>

                                <div className="space-y-6">
                                    {[...studentAdmissions].sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate)).map((admission, index) => (
                                        <div key={admission._id} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                                            {/* Course Header */}
                                            <div className="bg-gray-800 p-4 flex justify-between items-center">
                                                <div>
                                                    <h5 className="text-lg font-bold text-white">
                                                        Course {index + 1}: {admission.course?.courseName}
                                                    </h5>
                                                    <p className="text-sm text-gray-400">
                                                        Enrollment ID: <span className="text-cyan-400 font-mono font-semibold">{admission.admissionNumber}</span> •
                                                        <span className="text-orange-400 font-semibold mx-1">{admission.admissionType === 'BOARD' ? (admission.board?.boardCourse || 'Board Course') : admission.department?.departmentName}</span> •
                                                        Academic: {admission.academicSession} •
                                                        Admission: {formatDate(admission.admissionDate)} • Admitted By: <span className="text-white font-semibold">{admission.createdBy?.name || (admission.createdBy ? "Unknown User" : "System")}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded text-sm font-bold ${admission.paymentStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                        admission.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {admission.paymentStatus}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded text-sm font-bold border ${getStatusColor(admission.admissionStatus)}`}>
                                                        {admission.admissionStatus}
                                                    </span>
                                                    {admission.admissionType === 'BOARD' ? (
                                                        <button
                                                            onClick={() => navigate(`/edit-board-subjects/${admission._id}`)}
                                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                                                        >
                                                            <FaMoneyBillWave /> Manage Monthly Bill
                                                        </button>
                                                    ) : (
                                                        canEdit && (
                                                            <button
                                                                onClick={() => {
                                                                    if (selectedStudent.status === 'Deactivated') {
                                                                        toast.error("This student is deactivated. Updates are restricted.");
                                                                        return;
                                                                    }
                                                                    setIsModalOpen(false);
                                                                    setSelectedStudent(null);
                                                                    setStudentAdmissions([]);
                                                                    // Open edit modal for this admission
                                                                    window.location.href = `/enrolled-students?edit=${admission._id}`;
                                                                }}
                                                                disabled={selectedStudent.status === 'Deactivated'}
                                                                className={`p-2 rounded transition-all ${selectedStudent.status === 'Deactivated'
                                                                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                                                    : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'}`}
                                                                title={selectedStudent.status === 'Deactivated' ? "Student is deactivated" : "Edit Admission"}
                                                            >
                                                                <FaSync />
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                {/* Fee Summary */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                                                    <div className="bg-blue-500/10 p-3 rounded relative group">
                                                        <p className="text-xs text-gray-400">Down Payment</p>
                                                        <p className="text-lg font-bold text-blue-400">
                                                            ₹{admission.downPayment?.toLocaleString()}
                                                        </p>
                                                        {admission.downPayment > 0 && (
                                                            <button
                                                                onClick={() => selectedStudent.status !== 'Deactivated' && setBillModal({
                                                                    show: true,
                                                                    admission: admission,
                                                                    installment: {
                                                                        installmentNumber: 0,
                                                                        status: admission.downPaymentStatus || "PAID"
                                                                    }
                                                                })}
                                                                disabled={selectedStudent.status === 'Deactivated'}
                                                                className={`mt-2 text-[10px] px-2 py-1 rounded flex items-center gap-1 w-full justify-center transition-colors shadow-sm ${selectedStudent.status === 'Deactivated' ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-400 text-white'}`}
                                                                title={selectedStudent.status === 'Deactivated' ? "Student is deactivated" : "Download Down Payment Receipt"}
                                                            >
                                                                <FaFileInvoice /> Receipt
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Payment Breakdown / Monthly Breakdown */}
                                                <div>
                                                    <h6 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                                        <FaCalendar /> {admission.admissionType === 'BOARD' ? 'Monthly Payment History' : 'Payment Schedule'}
                                                    </h6>
                                                    <div className="overflow-x-auto">
                                                        {admission.admissionType === 'BOARD' ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {admission.monthlySubjectHistory?.length > 0 ? (
                                                                    admission.monthlySubjectHistory.sort((a, b) => a.month.localeCompare(b.month)).map((history, hIdx) => {
                                                                        const isFirstMonth = hIdx === 0;
                                                                        const displayPaid = history.isPaid || (isFirstMonth && admission.totalPaidAmount >= (history.totalAmount - 10));

                                                                        const getMonthName = (mKey) => {
                                                                            try {
                                                                                const [year, month] = mKey.split('-').map(Number);
                                                                                return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                                                            } catch (e) { return mKey; }
                                                                        };

                                                                        return (
                                                                            <div key={hIdx} className={`p-4 rounded-lg border flex flex-col h-full transition-all group ${displayPaid ? 'bg-green-500/5 border-green-500/20' : 'bg-gray-800 border-gray-700 hover:border-cyan-500/30'}`}>
                                                                                <div className="flex justify-between items-center mb-3">
                                                                                    <div>
                                                                                        <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Month {hIdx + 1} / {admission.courseDurationMonths}</span>
                                                                                        <span className="text-white font-bold">{getMonthName(history.month)}</span>
                                                                                    </div>
                                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${displayPaid ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                                                                                        {displayPaid ? 'PAID' : 'PENDING'}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="space-y-1 mb-4 flex-grow">
                                                                                    {history.subjects?.map((sub, sIdx) => (
                                                                                        <div key={sIdx} className="flex justify-between text-xs">
                                                                                            <span className="text-gray-400">{sub.name}</span>
                                                                                            <span className="text-gray-300">₹{sub.price}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <div className="pt-3 border-t border-gray-700">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-gray-400 text-xs font-bold">TOTAL</span>
                                                                                        <span className="text-cyan-400 font-bold">₹{history.totalAmount?.toLocaleString()}</span>
                                                                                    </div>
                                                                                    {displayPaid && (
                                                                                        <button
                                                                                            onClick={() => setBillModal({
                                                                                                show: true,
                                                                                                admission: admission,
                                                                                                installment: {
                                                                                                    installmentNumber: 0,
                                                                                                    billingMonth: history.month,
                                                                                                    status: "PAID"
                                                                                                }
                                                                                            })}
                                                                                            className="mt-3 w-full py-1 bg-gray-700 hover:bg-gray-600 text-cyan-400 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                                                                        >
                                                                                            <FaFileInvoice /> View Bill
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="col-span-full py-6 text-center text-gray-500 italic">
                                                                        No monthly bills generated yet.
                                                                        <button
                                                                            onClick={() => navigate(`/edit-board-subjects/${admission._id}`)}
                                                                            className="ml-2 text-cyan-400 hover:underline"
                                                                        >
                                                                            Generate First Bill
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-gray-900 text-gray-400">
                                                                        <th className="p-2 text-left">Inst #</th>
                                                                        <th className="p-2 text-left">Due Date</th>
                                                                        <th className="p-2 text-left">Original Amount</th>
                                                                        <th className="p-2 text-left">Adjustments</th>
                                                                        <th className="p-2 text-left">Current Amount</th>
                                                                        <th className="p-2 text-left">Paid</th>
                                                                        <th className="p-2 text-left">Method</th>
                                                                        <th className="p-2 text-left">Status</th>
                                                                        {canEdit && <th className="p-2 text-left">Action</th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {admission.paymentBreakdown?.map((payment, paymentIndex) => {
                                                                        const isPaid = ["PAID", "COMPLETED"].includes(payment.status);
                                                                        // Check if all previous installments are paid
                                                                        const previousPaid = paymentIndex === 0 || admission.paymentBreakdown
                                                                            .slice(0, paymentIndex)
                                                                            .every(p => ["PAID", "COMPLETED"].includes(p.status));

                                                                        // Calculate original amount (before adjustments)
                                                                        const baseInstallmentAmount = Math.ceil(admission.remainingAmount / admission.numberOfInstallments);

                                                                        // Parse remarks to extract adjustment info
                                                                        const remarks = payment.remarks || "";
                                                                        const arrearsMatch = remarks.match(/Includes ₹([\d,]+) arrears from Inst #(\d+)/);
                                                                        const creditMatch = remarks.match(/Credit of ₹([\d,]+) from Inst #(\d+)/);
                                                                        const carryForwardMatch = remarks.match(/Carried Forward Arrears: ₹([\d,]+)/);

                                                                        let adjustmentText = null;
                                                                        let adjustmentColor = "";

                                                                        if (arrearsMatch) {
                                                                            const amount = arrearsMatch[1].replace(/,/g, '');
                                                                            const fromInst = arrearsMatch[2];
                                                                            adjustmentText = `+₹${parseFloat(amount).toLocaleString()} from Inst #${fromInst}`;
                                                                            adjustmentColor = "text-red-400";
                                                                        } else if (creditMatch) {
                                                                            const amount = creditMatch[1].replace(/,/g, '');
                                                                            const fromInst = creditMatch[2];
                                                                            adjustmentText = `-₹${parseFloat(amount).toLocaleString()} from Inst #${fromInst}`;
                                                                            adjustmentColor = "text-green-400";
                                                                        }

                                                                        return (
                                                                            <tr key={payment.installmentNumber} className="border-t border-gray-700 hover:bg-gray-800/30">
                                                                                <td className="p-2 text-white font-semibold">#{payment.installmentNumber}</td>
                                                                                <td className="p-2 text-gray-300">
                                                                                    {formatDate(payment.dueDate)}
                                                                                </td>
                                                                                <td className="p-2 text-gray-400">
                                                                                    ₹{baseInstallmentAmount.toLocaleString()}
                                                                                </td>
                                                                                <td className="p-2">
                                                                                    {adjustmentText ? (
                                                                                        <span className={`${adjustmentColor} font-medium text-xs`}>
                                                                                            {adjustmentText}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-gray-600">-</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-2 text-white font-bold">
                                                                                    ₹{payment.amount?.toLocaleString()}
                                                                                </td>
                                                                                <td className="p-2 text-green-400 font-medium">
                                                                                    ₹{payment.paidAmount?.toLocaleString() || 0}
                                                                                </td>
                                                                                <td className="p-2 text-gray-300">
                                                                                    {payment.paymentMethod || "-"}
                                                                                </td>
                                                                                <td className="p-2">
                                                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getInstallmentStatusColor(payment.status)}`}>
                                                                                        {payment.status === "PENDING_CLEARANCE" ? "IN PROCESS" : payment.status}
                                                                                    </span>
                                                                                    {carryForwardMatch && (
                                                                                        <div className="mt-1">
                                                                                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                                                                                CF: ₹{carryForwardMatch[1]}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                                {canEdit && (
                                                                                    <td className="p-2">
                                                                                        {(!isPaid && payment.status !== "PENDING_CLEARANCE") ? (
                                                                                            <button
                                                                                                onClick={() => selectedStudent.status !== 'Deactivated' && openPaymentModal(admission, payment)}
                                                                                                disabled={!previousPaid || selectedStudent.status === 'Deactivated'}
                                                                                                className={`px-3 py-1 text-white text-sm rounded transition-colors ${(!previousPaid || selectedStudent.status === 'Deactivated')
                                                                                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                                                                    : 'bg-cyan-600 hover:bg-cyan-500'
                                                                                                    }`}
                                                                                                title={selectedStudent.status === 'Deactivated' ? "Student is deactivated" : (!previousPaid ? "Complete previous installment first" : "Pay Now")}
                                                                                            >
                                                                                                Pay Now
                                                                                            </button>
                                                                                        ) : (
                                                                                            <button
                                                                                                onClick={() => selectedStudent.status !== 'Deactivated' && setBillModal({ show: true, admission: admission, installment: payment })}
                                                                                                disabled={selectedStudent.status === 'Deactivated'}
                                                                                                className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-1 ${selectedStudent.status === 'Deactivated' ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-cyan-400'}`}
                                                                                            >
                                                                                                <FaFileInvoice /> {payment.status === "PENDING_CLEARANCE" ? " Receipt" : " Bill"}
                                                                                            </button>
                                                                                        )}
                                                                                    </td>
                                                                                )}
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Grand Total Summary */}
                            <div className="border-t border-gray-700 pt-6 mt-6">
                                <h4 className="text-xl font-bold text-white mb-4">Grand Total Summary</h4>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-cyan-900/20 p-4 rounded-xl border border-cyan-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Total Course Amount</p>
                                        <p className="text-3xl font-bold text-cyan-400">
                                            ₹{studentAdmissions.reduce((sum, ad) => sum + (ad.totalFees || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-green-900/20 p-4 rounded-xl border border-green-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Total Paid Amount</p>
                                        <p className="text-3xl font-bold text-green-400">
                                            ₹{studentAdmissions.reduce((sum, ad) => sum + (ad.totalPaidAmount || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-yellow-900/20 p-4 rounded-xl border border-yellow-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Total Pending Amount</p>
                                        <p className="text-3xl font-bold text-yellow-400">
                                            ₹{studentAdmissions.reduce((sum, ad) => sum + ((ad.totalFees || 0) - (ad.totalPaidAmount || 0)), 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            )}

            {/* Payment Modal */}
            {
                showPaymentModal && selectedInstallment && selectedAdmission && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                        <div className="bg-[#1e2329] rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Process Payment - Installment #{selectedInstallment.installmentNumber}</h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {selectedAdmission.course?.courseName} • {selectedAdmission.student?.studentsDetails?.[0]?.studentName}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Installment Amount
                                        </label>
                                        <input
                                            type="number"
                                            value={selectedInstallment.amount}
                                            disabled
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Paid Amount <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={paymentData.paidAmount}
                                            onChange={(e) => setPaymentData({ ...paymentData, paidAmount: parseFloat(e.target.value) || 0 })}
                                            required
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>

                                {/* Payment Difference Indicator */}
                                {(() => {
                                    const diff = selectedInstallment.amount - paymentData.paidAmount;
                                    if (diff > 0) {
                                        return (
                                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FaExclamationCircle className="text-yellow-400" />
                                                    <div className="flex-1">
                                                        <p className="text-yellow-400 font-semibold text-sm">Partial Payment</p>
                                                        <p className="text-gray-300 text-xs">
                                                            Remaining <span className="font-bold">₹{diff.toLocaleString()}</span> will be added to the next installment
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (diff < 0) {
                                        return (
                                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FaCheckCircle className="text-green-400" />
                                                    <div className="flex-1">
                                                        <p className="text-green-400 font-semibold text-sm">Overpayment</p>
                                                        <p className="text-gray-300 text-xs">
                                                            Excess <span className="font-bold">₹{Math.abs(diff).toLocaleString()}</span> will be credited to the next installment
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FaCheckCircle className="text-cyan-400" />
                                                    <p className="text-cyan-400 font-semibold text-sm">Exact Payment</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                })()}

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Payment Method <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={paymentData.paymentMethod}
                                        onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                                        required
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">Card</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Received Date <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentData.receivedDate}
                                        onChange={(e) => setPaymentData({ ...paymentData, receivedDate: e.target.value })}
                                        required
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">The actual date money was received</p>
                                </div>

                                {/* Conditional Fields for Online Payments */}
                                {["UPI", "CARD", "BANK_TRANSFER"].includes(paymentData.paymentMethod) && (
                                    <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Transaction ID <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={paymentData.transactionId}
                                                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                                                required
                                                placeholder="Enter transaction ID"
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Conditional Fields for Cheque */}
                                {paymentData.paymentMethod === "CHEQUE" && (
                                    <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Bank Name <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={paymentData.accountHolderName}
                                                    onChange={(e) => setPaymentData({ ...paymentData, accountHolderName: e.target.value })}
                                                    required
                                                    placeholder="Enter name on cheque"
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Cheque Number <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={paymentData.transactionId}
                                                    onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                                                    required
                                                    placeholder="Enter cheque number"
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Cheque Date <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={paymentData.chequeDate}
                                                onChange={(e) => setPaymentData({ ...paymentData, chequeDate: e.target.value })}
                                                required
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Remarks
                                    </label>
                                    <textarea
                                        value={paymentData.remarks}
                                        onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                        rows={3}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                        placeholder="Add any additional notes..."
                                    />
                                </div>

                                {/* Carry Forward Checkbox - Only show for partial payment on last installment */}
                                {(() => {
                                    const diff = selectedInstallment.amount - paymentData.paidAmount;
                                    const isLastInstallment = selectedInstallment.installmentNumber === selectedAdmission.numberOfInstallments;

                                    if (diff > 0 && isLastInstallment) {
                                        return (
                                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                                <label className="flex items-start gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={paymentData.carryForward}
                                                        onChange={(e) => setPaymentData({ ...paymentData, carryForward: e.target.checked })}
                                                        className="w-5 h-5 mt-0.5 text-yellow-600 bg-gray-800 border-gray-700 rounded focus:ring-yellow-500"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-yellow-400 font-bold text-sm block">Carry Forward Balance</span>
                                                        <span className="text-gray-300 text-xs block mt-1">
                                                            This is the last installment. Check this to carry forward the remaining ₹{diff.toLocaleString()} to the student's balance for future course enrollment.
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={processingPayment}
                                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {processingPayment ? (
                                            <>
                                                <FaSync className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <FaCheckCircle />
                                                Submit Payment
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentModal(false)}
                                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Bill Generator Modal */}
            {
                billModal.show && billModal.admission && billModal.installment && (
                    <BillGenerator
                        admission={billModal.admission}
                        installment={billModal.installment}
                        onClose={() => setBillModal({ show: false, admission: null, installment: null })}
                    />
                )
            }
        </div >

    );
};

export default EnrolledStudentsContent;
