import React, { useState, useEffect } from 'react';
import { useTheme } from "../../context/ThemeContext";
import { FaSearch, FaEye, FaEdit, FaDownload, FaFilter, FaUserGraduate, FaSync, FaTimes, FaBook, FaCalendar, FaMoneyBillWave, FaFileInvoice, FaCheckCircle, FaExclamationCircle, FaUser, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaSchool, FaHistory, FaUsers, FaIdCard, FaBirthdayCake, FaVenusMars, FaPassport, FaBuilding, FaSun, FaMoon, FaPlus, FaCopy, FaTools, FaPen, FaSave, FaTrash } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdmissionDetailsModal from './AdmissionDetailsModal';
import EditEnrolledStudentModal from './EditEnrolledStudentModal';
import ExportButton from '../common/ExportButton';
import MultiSelectFilter from '../common/MultiSelectFilter';
import Pagination from '../common/Pagination';
import { TableRowSkeleton } from '../common/Skeleton';
import { downloadCSV, downloadExcel } from '../../utils/exportUtils';
import './AdmissionsWave.css';
import { hasPermission } from '../../config/permissions';
import BillGenerator from '../Finance/BillGenerator';
import RazorpayPOSModal from '../Finance/RazorpayPOSModal';

const EnrolledStudentsContent = () => {
    const navigate = useNavigate();
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
    const [filterBoard, setFilterBoard] = useState([]);
    const [filterExamTag, setFilterExamTag] = useState([]);
    const [filterProgramme, setFilterProgramme] = useState([]);
    const [filterMode, setFilterMode] = useState([]);
    const [filterCourseType, setFilterCourseType] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Display helper: always show ceiling (whole rupee) — stored values stay exact
    const fmt = (n) => Math.ceil(Number(n) || 0).toLocaleString('en-IN');

    // Master Data States
    const [masterDepartments, setMasterDepartments] = useState([]);
    const [masterCourses, setMasterCourses] = useState([]);
    const [masterClasses, setMasterClasses] = useState([]);
    const [masterSessions, setMasterSessions] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAdmissions, setStudentAdmissions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editAdmission, setEditAdmission] = useState(null);
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
    const [newInstallmentCount, setNewInstallmentCount] = useState("");
    const [isDividing, setIsDividing] = useState(false);
    const [showPOSModal, setShowPOSModal] = useState(false);

    // Enrollment number inline edit state
    const [editingEnrollmentId, setEditingEnrollmentId] = useState(null);
    const [editingEnrollmentValue, setEditingEnrollmentValue] = useState("");
    const [isSavingEnrollment, setIsSavingEnrollment] = useState(false);

    // Permanent delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, studentItem: null, inputValue: '' });
    const [isDeleting, setIsDeleting] = useState(false);

    // Permission checks
    // Memoize user to prevent infinite re-renders when used in dependency arrays
    const user = React.useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
    const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";
    const canEdit = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'edit');
    const canDeactivate = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'deactivate');
    const canDelete = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'delete');

    const apiUrl = import.meta.env.VITE_API_URL;

    // Helper to format date as DD/MM/YYYY (en-GB standard)
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString('en-GB');
    };

    const handleCopy = (e, text, type = "Enrollment ID") => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard!`, {
            position: "bottom-right",
            autoClose: 2000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: isDarkMode ? "dark" : "light"
        });
    };

    const fetchMasterData = React.useCallback(async () => {
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
    }, [apiUrl]);

    const fetchAllowedCentres = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");

            // Fetch current user data to get latest centre assignments
            const profileResponse = await fetch(`${apiUrl}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let currentUser = user;
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                currentUser = profileData.user;
            }

            // If superAdmin, fetch all centres
            if (currentUser.role === 'superAdmin' || currentUser.role === 'Super Admin') {
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const centres = response.ok ? await response.json() : [];
                setAllowedCentres(centres.map(c => c.centreName));
            } else {
                // For non-superAdmin, use centres from profile
                const userCentres = currentUser.centres || [];
                const userCentreNames = userCentres.map(c => c.centreName || c.name || c).filter(Boolean);
                setAllowedCentres(userCentreNames);
            }
        } catch (error) {
            console.error("Error fetching allowed centres:", error);
        }
    }, [apiUrl, user]);

    const groupStudents = React.useCallback((admissionsData) => {
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
    }, []);

    const fetchAdmissions = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
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
    }, [apiUrl, groupStudents]);

    useEffect(() => {
        fetchAllowedCentres();
        fetchAdmissions();
        fetchMasterData();
    }, [fetchAllowedCentres, fetchAdmissions, fetchMasterData]);

    const [showCorrectionId, setShowCorrectionId] = useState(null);
    const [correctionData, setCorrectionData] = useState({
        totalFees: 0,
        totalPaidAmount: 0,
        numberOfInstallments: 1
    });
    const [isCorrecting, setIsCorrecting] = useState(false);

    const handleUpdateEnrollmentNumber = async (admissionId) => {
        if (!editingEnrollmentValue.trim()) {
            toast.error("Enrollment number cannot be empty.");
            return;
        }
        setIsSavingEnrollment(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/${admissionId}/enrollment-number`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ admissionNumber: editingEnrollmentValue.trim().toUpperCase() })
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Enrollment number updated successfully!");
                // Update local modal state immediately
                setStudentAdmissions(prev =>
                    prev.map(ad =>
                        ad._id === admissionId
                            ? { ...ad, admissionNumber: data.admission.admissionNumber }
                            : ad
                    )
                );
                // Also refresh the main list so the table reflects the change
                fetchAdmissions();
                setEditingEnrollmentId(null);
                setEditingEnrollmentValue("");
            } else {
                toast.error(data.message || "Failed to update enrollment number.");
            }
        } catch (err) {
            console.error("updateEnrollmentNumber error:", err);
            toast.error("Network error. Please try again.");
        } finally {
            setIsSavingEnrollment(false);
        }
    };

    const handlePermanentDelete = async () => {
        const studentItem = deleteConfirm.studentItem;
        if (!studentItem) return;
        const studentName = studentItem.student?.studentsDetails?.[0]?.studentName || '';
        if (deleteConfirm.inputValue.trim().toUpperCase() !== studentName.trim().toUpperCase()) {
            toast.error('Name does not match. Please type the student name exactly to confirm deletion.');
            return;
        }
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/admission/student/${studentItem.student._id}/permanent`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success(`Student permanently deleted (${data.deletedAdmissions} admission(s) removed).`);
                setDeleteConfirm({ show: false, studentItem: null, inputValue: '' });
                fetchAdmissions();
            } else {
                toast.error(data.message || 'Failed to delete student.');
            }
        } catch (err) {
            console.error('permanentDelete error:', err);
            toast.error('Network error. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleManualCorrection = async (admissionId) => {
        if (!isSuperAdmin) {
            toast.error("Unauthorized: Super Admin access required.");
            return;
        }

        setIsCorrecting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/${admissionId}/manual-adjustment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(correctionData)
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                setShowCorrectionId(null);
                fetchAdmissions();
                if (data.admission) {
                    setStudentAdmissions(prev => prev.map(ad =>
                        ad._id === data.admission._id ? data.admission : ad
                    ));
                }
            } else {
                toast.error(data.message || "Correction failed");
            }
        } catch (error) {
            console.error("Manual correction error:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setIsCorrecting(false);
        }
    };

    const handleDivideInstallments = async (admissionId) => {
        if (!newInstallmentCount || parseInt(newInstallmentCount) < 1) {
            toast.error("Please enter a valid number of installments.");
            return;
        }

        setIsDividing(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission/${admissionId}/divide-installments`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ numberOfNewInstallments: parseInt(newInstallmentCount) })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                setNewInstallmentCount("");
                // Refresh data
                fetchAdmissions();
                // Also update the selected student modal data if it's open
                if (data.admission) {
                    const updatedAdmissions = studentAdmissions.map(ad =>
                        ad._id === data.admission._id ? data.admission : ad
                    );
                    setStudentAdmissions(updatedAdmissions);
                }
            } else {
                toast.error(data.message || "Failed to re-divide installments");
            }
        } catch (error) {
            console.error("Error dividing installments:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setIsDividing(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, filterCentre, filterDepartment, filterCourse, filterClass, filterSession, filterBoard, filterExamTag, filterProgramme, filterMode, filterCourseType]);

    // Filter students
    useEffect(() => {
        let result = students;

        // Restriction: Only show students from allowed centres for non-superAdmins
        if (!isSuperAdmin && allowedCentres.length > 0) {
            result = result.filter(item => {
                const studentCentre = item.student?.studentsDetails?.[0]?.centre;
                return allowedCentres.includes(studentCentre);
            });
        }

        if (searchQuery) {
            const queries = searchQuery.toLowerCase().split(',').map(q => q.trim()).filter(Boolean);
            result = result.filter(item => {
                const student = item.student?.studentsDetails?.[0] || {};
                const studentName = (student.studentName || "").toLowerCase();
                const mobile = student.mobileNum || "";
                const email = (student.studentEmail || "").toLowerCase();

                // Check if any of the comma-separated terms match
                return queries.some(query => {
                    // Check if any admission matches this specific term
                    const admissionMatch = item.admissions.some(admission => {
                        const admissionNumber = (admission.admissionNumber || "").toLowerCase();
                        const courseName = (admission.course?.courseName || admission.boardCourseName || "").toLowerCase();
                        const centre = (admission.centre || student.centre || "").toLowerCase();
                        return admissionNumber.includes(query) ||
                            courseName.includes(query) ||
                            centre.includes(query);
                    });

                    return studentName.includes(query) ||
                        mobile.includes(query) ||
                        email.includes(query) ||
                        admissionMatch;
                });
            });
        }

        if (filterStatus.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission =>
                    filterStatus.includes(admission.admissionStatus) ||
                    filterStatus.includes(admission.paymentStatus)
                )
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
                    const courseName = admission.course?.courseName || admission.boardCourseName || "";
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

        if (filterBoard.length > 0) {
            result = result.filter(item => {
                const board = item.student?.studentsDetails?.[0]?.board || "";
                return filterBoard.includes(board);
            });
        }

        if (filterExamTag.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const tag = admission.examTag?.name || "";
                    return filterExamTag.includes(tag);
                })
            );
        }

        if (filterProgramme.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const prog = admission.course?.programme || "";
                    return filterProgramme.includes(prog);
                })
            );
        }

        if (filterMode.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const mode = admission.course?.mode || "";
                    return filterMode.includes(mode);
                })
            );
        }

        if (filterCourseType.length > 0) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const type = admission.course?.courseType || "";
                    return filterCourseType.includes(type);
                })
            );
        }

        if (startDate) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const admDate = new Date(admission.admissionDate);
                    const start = new Date(startDate);
                    return admDate >= start;
                })
            );
        }

        if (endDate) {
            result = result.filter(item =>
                item.admissions.some(admission => {
                    const admDate = new Date(admission.admissionDate);
                    const end = new Date(endDate);
                    // Set end date to end of day to include the full day
                    end.setHours(23, 59, 59, 999);
                    return admDate <= end;
                })
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
    }, [searchQuery, filterStatus, filterCentre, filterDepartment, filterCourse, filterClass, filterSession, filterBoard, filterExamTag, filterProgramme, filterMode, filterCourseType, startDate, endDate, students, viewMode, allowedCentres, isSuperAdmin]);

    const filteredAdmissions = filteredStudents.flatMap(s =>
        s.admissions.filter(a => {
            if (viewMode === 'Board') return a.admissionType === 'BOARD';
            return a.admissionType === 'NORMAL';
        })
    );
    const totalCollected = filteredAdmissions.reduce((sum, a) => sum + (a.totalPaidAmount || 0), 0);

    // Count students with pending payments, not admissions, for consistency with the list
    const pendingPaymentCount = filteredStudents.filter(s =>
        s.admissions.some(a => {
            const isMatch = viewMode === 'Board' ? a.admissionType === 'BOARD' : a.admissionType === 'NORMAL';
            return isMatch && (a.paymentStatus === "PENDING" || a.paymentStatus === "PARTIAL");
        })
    ).length;

    const handleRefresh = () => {
        setSearchQuery("");
        setFilterStatus([]);
        setFilterCentre([]);
        setFilterDepartment([]);
        setFilterCourse([]);
        setFilterClass([]);
        setFilterSession([]);
        setFilterBoard([]);
        setFilterExamTag([]);
        setFilterProgramme([]);
        setFilterMode([]);
        setFilterCourseType([]);
        setStartDate("");
        setEndDate("");
        setCurrentPage(1);
        setLoading(true);
        fetchAdmissions();
        toast.info("Refreshed data and filters");
    };

    const uniqueCentres = allowedCentres;
    const uniqueBoards = [...new Set(students.map(item => item.student?.studentsDetails?.[0]?.board).filter(Boolean))];
    const uniqueExamTags = [...new Set(students.flatMap(item => item.admissions.map(a => a.examTag?.name)).filter(Boolean))];
    const uniqueProgrammes = [...new Set(masterCourses.map(c => c.programme).filter(Boolean))];
    const uniqueModes = [...new Set(masterCourses.map(c => c.mode).filter(Boolean))];
    const uniqueCourseTypes = [...new Set(masterCourses.map(c => c.courseType).filter(Boolean))];

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

    const handleEditProfile = (studentItem) => {
        setEditAdmission(studentItem.latestAdmission);
        setShowEditModal(true);
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

                // Update local state for immediate reflection
                setStudentAdmissions(prev => prev.map(adm => {
                    if (adm._id === (data.admission?._id || selectedAdmission._id)) {
                        return data.admission || {
                            ...selectedAdmission,
                            paymentBreakdown: selectedAdmission.paymentBreakdown.map(inst =>
                                inst.installmentNumber === selectedInstallment.installmentNumber
                                    ? { ...inst, paidAmount: paymentData.paidAmount, paidDate: paymentData.receivedDate, status: paymentData.paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID", paymentMethod: paymentData.paymentMethod }
                                    : inst
                            ),
                            totalPaidAmount: (selectedAdmission.totalPaidAmount || 0) + paymentData.paidAmount
                        };
                    }
                    return adm;
                }));

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
            { label: 'Programme', key: 'course.programme' },
            { label: 'Mode', key: 'course.mode' },
            { label: 'Station Type', key: 'course.courseType' },
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
                course: {
                    courseName: admission.course?.courseName || '',
                    programme: admission.course?.programme || '',
                    mode: admission.course?.mode || '',
                    courseType: admission.course?.courseType || ''
                },
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
        <div className={`flex-1 p-6 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-[4px] ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-100 text-cyan-600'}`}>
                        <FaUserGraduate size={24} />
                    </div>
                    <div>
                        <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Students
                        </h2>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Enrolled Lifecycle Management
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-[4px] border transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}
                    >
                        {isDarkMode ? <><FaSun /> Day</> : <><FaMoon /> Night</>}
                    </button>

                    <button
                        onClick={handleRefresh}
                        className={`p-3 rounded-[4px] border transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest group ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-500 hover:text-cyan-400' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 shadow-sm'}`}
                        title="Refresh Data & Reset Filters"
                    >
                        <FaSync className={`${loading ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>

                    <ExportButton
                        onExportCSV={handleExportCSV}
                        onExportExcel={handleExportExcel}
                        theme={isDarkMode ? 'dark' : 'light'}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-green-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Students</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{filteredStudents.length}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Active in view</p>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-cyan-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Courses</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{filteredAdmissions.length}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Active Enrollments</p>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-yellow-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Pending Payment</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pendingPaymentCount}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Action Required</p>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border-l-4 border-blue-500 hover:scale-[1.02] transition-all`}>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Total Collected</h3>
                    <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{totalCollected.toLocaleString()}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2">Net Revenue</p>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div className={`flex border-b mb-8 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                {[
                    { label: 'Active Students', id: 'Active', color: 'cyan' },
                    { label: 'Board Courses', id: 'Board', color: 'purple' },
                    { label: 'Deactivated', id: 'Deactivated', color: 'red' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === tab.id
                            ? `text-${tab.color}-500 border-b-2 border-${tab.color}-500`
                            : isDarkMode ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-900"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search & Filter */}
            {/* Search & Filter Area */}
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border mb-8`}>
                <div className="flex flex-col gap-6">
                    {/* Search Row */}
                    <div className="relative group">
                        <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-gray-900'}`} />
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME, ID, CENTRE, COURSE, MOBILE..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 rounded-[4px] border transition-all font-bold text-[10px] uppercase tracking-widest focus:outline-none ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400 shadow-inner'}`}
                        />
                    </div>

                    {/* Filters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        <div className="w-full">
                            <MultiSelectFilter
                                label="Status"
                                placeholder="ALL STATUS"
                                options={[
                                    { value: "ACTIVE", label: "ACTIVE" },
                                    { value: "INACTIVE", label: "INACTIVE" },
                                    { value: "COMPLETED", label: "COMPLETED" }
                                ]}
                                selectedValues={filterStatus}
                                onChange={setFilterStatus}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Centre"
                                placeholder="ALL CENTRES"
                                options={Array.from(new Set(uniqueCentres)).filter(Boolean).map(c => ({ value: c, label: c.toUpperCase() }))}
                                selectedValues={filterCentre}
                                onChange={setFilterCentre}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Board"
                                placeholder="ALL BOARDS"
                                options={Array.from(new Set(uniqueBoards)).filter(Boolean).map(b => ({ value: b, label: b.toUpperCase() }))}
                                selectedValues={filterBoard}
                                onChange={setFilterBoard}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Exam Tag"
                                placeholder="ALL TAGS"
                                options={Array.from(new Set(uniqueExamTags)).filter(Boolean).map(t => ({ value: t, label: t.toUpperCase() }))}
                                selectedValues={filterExamTag}
                                onChange={setFilterExamTag}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Dept"
                                placeholder="ALL DEPTS"
                                options={Array.from(new Set(masterDepartments.map(d => d.departmentName))).filter(Boolean).map(name => ({ value: name, label: name.toUpperCase() }))}
                                selectedValues={filterDepartment}
                                onChange={setFilterDepartment}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Course"
                                placeholder="ALL COURSES"
                                options={Array.from(new Set(masterCourses.map(c => c.courseName))).filter(Boolean).map(name => ({ value: name, label: name.toUpperCase() }))}
                                selectedValues={filterCourse}
                                onChange={setFilterCourse}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Class"
                                placeholder="ALL CLASSES"
                                options={Array.from(new Set(masterClasses.map(c => c.className || c.name))).filter(Boolean).map(name => ({ value: name, label: name.toUpperCase() }))}
                                selectedValues={filterClass}
                                onChange={setFilterClass}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Session"
                                placeholder="ALL SESSIONS"
                                options={Array.from(new Set(masterSessions.map(s => s.sessionName || s.name))).filter(Boolean).map(name => ({ value: name, label: name.toUpperCase() }))}
                                selectedValues={filterSession}
                                onChange={setFilterSession}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Prog"
                                placeholder="PROGRAMME"
                                options={uniqueProgrammes.map(p => ({ value: p, label: p.toUpperCase() }))}
                                selectedValues={filterProgramme}
                                onChange={setFilterProgramme}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Mode"
                                placeholder="MODES"
                                options={uniqueModes.map(m => ({ value: m, label: m.toUpperCase() }))}
                                selectedValues={filterMode}
                                onChange={setFilterMode}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="w-full">
                            <MultiSelectFilter
                                label="Type"
                                placeholder="STATION"
                                options={uniqueCourseTypes.map(t => ({ value: t, label: t.toUpperCase() }))}
                                selectedValues={filterCourseType}
                                onChange={setFilterCourseType}
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-800/20">
                        <div className={`flex items-center rounded-[4px] border overflow-hidden ${isDarkMode ? 'border-gray-800 bg-[#131619]' : 'border-gray-200 bg-gray-50'}`}>
                            <div className={`px-4 py-2 border-r text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'border-gray-800 text-gray-500 bg-[#1a1f24]' : 'border-gray-200 text-gray-400 bg-gray-100'}`}>
                                Period
                            </div>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`px-4 py-2 text-[10px] font-bold uppercase focus:outline-none ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-white text-gray-900'}`}
                            />
                            <div className="px-2 text-gray-500 font-bold">-</div>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`px-4 py-2 text-[10px] font-bold uppercase focus:outline-none ${isDarkMode ? 'bg-[#131619] text-white' : 'bg-white text-gray-900'}`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-[4px] border overflow-hidden transition-all`}>
                <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                    <h3 className={`text-xl font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Student Records</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Manage lifecycle and financial status</p>
                </div>
                <div className={`overflow-x-auto custom-scrollbar ${isDarkMode ? 'custom-scrollbar-dark' : 'custom-scrollbar-light'}`}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-[#131619] text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Enrollment ID</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Session</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Class</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Department</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Centre</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Student</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Mobile</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Latest Course</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-center">Courses</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Admitted By</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                            {loading ? (
                                [...Array(10)].map((_, i) => (
                                    <TableRowSkeleton key={i} isDarkMode={isDarkMode} columns={12} />
                                ))
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">
                                        {searchQuery ? "No matches found" : "No records available"}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((studentItem) => {
                                        const student = studentItem.student?.studentsDetails?.[0] || {};
                                        const relevantAdmissions = studentItem.admissions.filter(a => {
                                            if (viewMode === 'Board') return a.admissionType === 'BOARD';
                                            return a.admissionType === 'NORMAL';
                                        });
                                        const latestAdmission = relevantAdmissions[0] || studentItem.latestAdmission;
                                        const studentImage = student.studentImage || null;

                                        return (
                                            <tr
                                                key={studentItem.student._id}
                                                className={`transition-all group cursor-pointer ${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'} ${studentItem.student.status === 'Deactivated' ? (isDarkMode ? 'bg-red-500/5' : 'bg-red-50') : ''}`}
                                                onClick={() => openStudentModal(studentItem)}
                                            >
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-[4px] border ${isDarkMode ? 'bg-cyan-400/5 text-cyan-400 border-cyan-400/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                                                            {latestAdmission?.admissionNumber || "N/A"}
                                                        </span>
                                                        {latestAdmission?.admissionNumber && (
                                                            <button
                                                                onClick={(e) => handleCopy(e, latestAdmission.admissionNumber, "Enrollment ID")}
                                                                className={`p-1.5 rounded-[4px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-gray-700' : 'bg-white text-gray-400 hover:text-cyan-600 hover:bg-gray-100 border border-gray-100 shadow-sm'}`}
                                                                title="Copy ID"
                                                            >
                                                                <FaCopy size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-[4px] border ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                                                        {latestAdmission?.academicSession || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-[4px] border ${isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                                        {latestAdmission?.class?.className || latestAdmission?.class?.name || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-[4px] border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                                                        {latestAdmission?.department?.departmentName || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-[4px] border ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                                                        {latestAdmission?.centre || student.centre || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center font-black overflow-hidden border ${isDarkMode ? 'border-gray-800 bg-gradient-to-br from-cyan-900 to-blue-900' : 'border-gray-200 bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md'}`}>
                                                            {studentImage ? (
                                                                <img src={studentImage} alt={student.studentName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-white text-lg">{student.studentName?.charAt(0).toUpperCase() || "S"}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.studentName || "N/A"}</p>
                                                                {studentItem.student.status === 'Deactivated' && (
                                                                    <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-[4px] uppercase tracking-tighter">
                                                                        Deactivated
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide">{student.studentEmail || ""}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`p-4 text-[11px] font-black tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{student.mobileNum || "N/A"}</td>
                                                <td className="p-4">
                                                    <div className={`font-black uppercase tracking-widest text-[10px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {latestAdmission?.course?.courseName ||
                                                            latestAdmission?.boardCourseName ||
                                                            latestAdmission?.board?.boardCourse ||
                                                            (typeof latestAdmission?.course === 'string' ? latestAdmission.course : "N/A")}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-3 py-1 rounded-[4px] text-[10px] font-black border ${isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                                        {relevantAdmissions.length}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={`px-3 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest border text-center ${getStatusColor(latestAdmission?.admissionStatus)}`}>
                                                            {latestAdmission?.admissionStatus}
                                                        </span>
                                                        <span className={`px-3 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest text-center ${getPaymentStatusColor(latestAdmission?.paymentStatus)}`}>
                                                            {latestAdmission?.paymentStatus}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center font-black text-[10px] border ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                                                            {latestAdmission?.createdBy?.name
                                                                ? latestAdmission.createdBy.name.charAt(0).toUpperCase()
                                                                : (latestAdmission?.createdBy ? "U" : "A")}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {latestAdmission?.createdBy?.name || (latestAdmission?.createdBy ? "Unknown" : "System")}
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
                                                            className={`p-2 rounded-[4px] transition-all ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black' : 'bg-cyan-100 text-cyan-600 hover:bg-cyan-500 hover:text-white shadow-sm'}`}
                                                            title="View Details"
                                                        >
                                                            <FaEye size={14} />
                                                        </button>

                                                        {canEdit && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditProfile(studentItem);
                                                                }}
                                                                className={`p-2 rounded-[4px] transition-all ${isDarkMode ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-500 hover:text-white shadow-sm'}`}
                                                                title="Edit Profile"
                                                            >
                                                                <FaEdit size={14} />
                                                            </button>
                                                        )}

                                                        {canDeactivate && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleStatus(studentItem.student._id, studentItem.student.status || 'Active');
                                                                }}
                                                                className={`p-2 rounded-[4px] transition-all ${studentItem.student.status === 'Deactivated'
                                                                    ? (isDarkMode ? "bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black" : "bg-green-100 text-green-600 hover:bg-green-500 hover:text-white shadow-sm")
                                                                    : (isDarkMode ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-black" : "bg-red-100 text-red-600 hover:bg-red-500 hover:text-white shadow-sm")
                                                                    }`}
                                                                title={studentItem.student.status === 'Deactivated' ? "Reactivate Student" : "Deactivate Student"}
                                                            >
                                                                {studentItem.student.status === 'Deactivated' ? <FaCheckCircle size={14} /> : <FaTimes size={14} />}
                                                            </button>
                                                        )}

                                                        {/* Permanent Delete — only in Deactivated view */}
                                                        {viewMode === 'Deactivated' && canDelete && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteConfirm({ show: true, studentItem, inputValue: '' });
                                                                }}
                                                                className={`p-2 rounded-[4px] transition-all border ${isDarkMode
                                                                    ? 'bg-red-900/20 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white hover:border-red-500'
                                                                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white shadow-sm'
                                                                    }`}
                                                                title="Permanently Delete Student"
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
            </div>

            <div className="mt-8">
                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredStudents.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    theme={isDarkMode ? 'dark' : 'light'}
                />
            </div>

            {/* Student Details Modal */}
            {/* Student Details Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className={`${isDarkMode ? 'bg-[#1e2329] border-gray-700' : 'bg-white border-gray-200'} rounded-[4px] w-full max-w-6xl border shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-[#1e2329]' : 'border-gray-100 bg-gray-50'}`}>
                            <div>
                                <h3 className={`text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-[4px]">
                                        <FaUserGraduate size={20} />
                                    </div>
                                    {selectedStudent.studentsDetails?.[0]?.studentName}
                                </h3>
                                <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest mt-2 text-gray-500">
                                    <span className="flex items-center gap-1.5"><FaPhoneAlt size={10} className="text-cyan-500" /> {selectedStudent.studentsDetails?.[0]?.mobileNum}</span>
                                    <span className="flex items-center gap-1.5"><FaEnvelope size={10} className="text-cyan-500" /> {selectedStudent.studentsDetails?.[0]?.studentEmail}</span>
                                    <span className="flex items-center gap-1.5"><FaMapMarkerAlt size={10} className="text-cyan-500" /> {selectedStudent.studentsDetails?.[0]?.centre}</span>
                                    {studentAdmissions[0]?.department?.departmentName && (
                                        <span className="flex items-center gap-1.5"><FaHistory size={10} className="text-orange-500" /> {studentAdmissions[0].department.departmentName}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-1 justify-center">
                                {/* Enrollment Number Badge */}
                                {studentAdmissions.length > 0 && (() => {
                                    const primaryAdmission = studentAdmissions[0];
                                    const isEditingHeader = editingEnrollmentId === `header_${primaryAdmission._id}`;
                                    return (
                                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-[4px] border ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200 shadow-sm'}`}>
                                            <FaIdCard className="text-cyan-500 shrink-0" size={14} />
                                            {isEditingHeader ? (
                                                <span className="flex items-center gap-1.5">
                                                    <input
                                                        autoFocus
                                                        value={editingEnrollmentValue}
                                                        onChange={e => setEditingEnrollmentValue(e.target.value.toUpperCase())}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleUpdateEnrollmentNumber(primaryAdmission._id);
                                                            if (e.key === 'Escape') { setEditingEnrollmentId(null); setEditingEnrollmentValue(''); }
                                                        }}
                                                        className={`px-2 py-0.5 text-sm font-black uppercase tracking-[0.2em] rounded-[4px] border focus:outline-none w-44 ${isDarkMode ? 'bg-[#131619] border-cyan-500/50 text-cyan-400 focus:border-cyan-400' : 'bg-white border-cyan-400 text-cyan-700 focus:border-cyan-600'}`}
                                                        disabled={isSavingEnrollment}
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateEnrollmentNumber(primaryAdmission._id)}
                                                        disabled={isSavingEnrollment}
                                                        className="p-1.5 rounded-[4px] bg-green-500 text-white hover:bg-green-400 transition-all disabled:opacity-50"
                                                        title="Save"
                                                    >
                                                        {isSavingEnrollment ? <FaSync className="animate-spin" size={10} /> : <FaSave size={10} />}
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingEnrollmentId(null); setEditingEnrollmentValue(''); }}
                                                        disabled={isSavingEnrollment}
                                                        className="p-1.5 rounded-[4px] bg-red-500/80 text-white hover:bg-red-400 transition-all"
                                                        title="Cancel"
                                                    >
                                                        <FaTimes size={10} />
                                                    </button>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <span className={`text-xl font-black tracking-[0.15em] uppercase ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                        {primaryAdmission.admissionNumber || 'N/A'}
                                                    </span>
                                                    {primaryAdmission.admissionNumber && (
                                                        <button
                                                            onClick={(e) => handleCopy(e, primaryAdmission.admissionNumber)}
                                                            className={`p-1.5 rounded-[4px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-gray-700' : 'bg-white text-gray-400 hover:text-cyan-600 hover:bg-gray-100 border border-gray-200'}`}
                                                            title="Copy Enrollment Number"
                                                        >
                                                            <FaCopy size={11} />
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingEnrollmentId(`header_${primaryAdmission._id}`);
                                                                setEditingEnrollmentValue(primaryAdmission.admissionNumber || '');
                                                            }}
                                                            className={`p-1.5 rounded-[4px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-yellow-400 hover:bg-gray-700' : 'bg-white text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 border border-gray-200'}`}
                                                            title="Edit Enrollment Number"
                                                        >
                                                            <FaPen size={10} />
                                                        </button>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {canEdit && (
                                    <button
                                        onClick={() => {
                                            const studentItem = students.find(s => s.student._id === selectedStudent._id);
                                            if (studentItem) handleEditProfile(studentItem);
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500/20' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-500 hover:text-white border border-yellow-200'}`}
                                    >
                                        <FaEdit size={12} /> Edit Profile
                                    </button>
                                )}
                                <button
                                    onClick={closeStudentModal}
                                    className={`p-2 rounded-[4px] transition-all ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>
                        </div>

                        <div className={`p-6 space-y-8 overflow-y-auto custom-scrollbar ${isDarkMode ? 'custom-scrollbar-dark' : 'custom-scrollbar-light'}`}>
                            {/* Deactivation Warning Banner */}
                            {selectedStudent.status === 'Deactivated' && (
                                <div className={`p-4 rounded-[4px] border flex items-center gap-4 animate-pulse ${isDarkMode ? 'bg-red-500/10 border-red-500/50' : 'bg-red-50 border-red-200'}`}>
                                    <FaExclamationCircle className="text-red-500 text-2xl" />
                                    <div>
                                        <h4 className="text-red-500 font-black uppercase tracking-widest text-xs">STUDENT DEACTIVATED</h4>
                                        <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-widest mt-1">Lifecycle operations and financial transactions are restricted.</p>
                                    </div>
                                </div>
                            )}

                            {/* Student Info Sections */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Personal Information */}
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100 shadow-sm'} rounded-[4px] border overflow-hidden`}>
                                    <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'}`}>
                                        <FaUser className="text-cyan-500" size={14} />
                                        <h4 className={`font-black uppercase tracking-widest text-[10px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Personal Profile</h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-y-6 gap-x-6">
                                        <div>
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FaBirthdayCake size={10} /> Date of Birth</p>
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formatDate(selectedStudent.studentsDetails?.[0]?.dateOfBirth)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FaVenusMars size={10} /> Gender</p>
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedStudent.studentsDetails?.[0]?.gender || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FaPassport size={10} /> WhatsApp</p>
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedStudent.studentsDetails?.[0]?.whatsappNumber || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FaIdCard size={10} /> Acquisition Source</p>
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedStudent.studentsDetails?.[0]?.source || "Walk-in"}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FaMapMarkerAlt size={10} /> Residential Address</p>
                                            <p className={`font-black uppercase tracking-widest text-[11px] leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                {selectedStudent.studentsDetails?.[0]?.address}, {selectedStudent.studentsDetails?.[0]?.state} - {selectedStudent.studentsDetails?.[0]?.pincode}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Information */}
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} rounded-[4px] border overflow-hidden`}>
                                    <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'}`}>
                                        <FaSchool className="text-cyan-500" size={14} />
                                        <h4 className={`font-black uppercase tracking-widest text-[10px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Academic Profile</h4>
                                    </div>
                                    <div className="p-4 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Last School Attended</p>
                                                <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedStudent.studentsDetails?.[0]?.schoolName || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Affiliation Board</p>
                                                <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedStudent.studentsDetails?.[0]?.board || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Academic Programme</p>
                                                <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedStudent.studentsDetails?.[0]?.programme || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Exam Tag</p>
                                                <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{selectedStudent.sessionExamCourse?.[0]?.examTag || "N/A"}</p>
                                            </div>
                                        </div>

                                        {selectedStudent.examSchema && selectedStudent.examSchema.length > 0 && (
                                            <div>
                                                <p className="text-cyan-500 font-black uppercase mb-3 text-[9px] tracking-widest border-b border-gray-800/10 pb-1">Historical Records</p>
                                                <div className="space-y-2">
                                                    {selectedStudent.examSchema.map((exam, idx) => (
                                                        <div key={idx} className={`flex justify-between items-center p-3 rounded-[4px] border ${isDarkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-gray-100'}`}>
                                                            <div>
                                                                <p className={`font-black uppercase tracking-widest text-[10px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exam.examName}</p>
                                                                <p className="text-gray-500 text-[9px] font-bold uppercase">GRADE {exam.class}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-cyan-500 font-black text-[11px] tracking-widest italic">{exam.markAgregate}%</p>
                                                                <p className="text-gray-500 text-[8px] font-bold uppercase tracking-tighter">S/M: {exam.scienceMathParcent}%</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Guardian Information */}
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100 shadow-sm'} rounded-[4px] border overflow-hidden lg:col-span-2`}>
                                    <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'}`}>
                                        <FaUsers className="text-cyan-500" size={14} />
                                        <h4 className={`font-black uppercase tracking-widest text-[10px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Guardian Information</h4>
                                    </div>
                                    <div className="p-4">
                                        {selectedStudent.guardians && selectedStudent.guardians.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                                {selectedStudent.guardians.map((guardian, idx) => (
                                                    <React.Fragment key={idx}>
                                                        <div>
                                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Legal Guardian</p>
                                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{guardian.guardianName || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Contact Vector</p>
                                                            <p className={`font-black tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{guardian.guardianMobile || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Professional Status</p>
                                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{guardian.occupation || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Annual Yield</p>
                                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{guardian.annualIncome || "0"}</p>
                                                        </div>
                                                        <div className="lg:col-span-2">
                                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">E-Mail Address</p>
                                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{guardian.guardianEmail || "N/A"}</p>
                                                        </div>
                                                        <div className="lg:col-span-2">
                                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1.5">Academic Credentials</p>
                                                            <p className={`font-black uppercase tracking-widest text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{guardian.qualification || "N/A"}</p>
                                                        </div>
                                                        {guardian.organizationName && (
                                                            <div className={`lg:col-span-4 p-4 rounded-[4px] border border-dashed ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                                                <h6 className="text-[8px] text-cyan-500 font-black uppercase mb-3 flex items-center gap-2"><FaHistory size={10} /> Corporate Nexus</h6>
                                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                                    <div>
                                                                        <p className="text-gray-500 text-[8px] font-black uppercase mb-1">Entity Name</p>
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{guardian.organizationName}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-gray-500 text-[8px] font-black uppercase mb-1">Designation</p>
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{guardian.designation}</p>
                                                                    </div>
                                                                    <div className="lg:col-span-1">
                                                                        <p className="text-gray-500 text-[8px] font-black uppercase mb-1">Locational Node</p>
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{guardian.officeAddress || "N/A"}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center">
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] italic">Guardian metadata not available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* All Courses/Admissions */}
                            <div className="pt-8 border-t border-gray-800/10">
                                <h4 className={`text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-[4px]">
                                        <FaBook size={18} />
                                    </div>
                                    Enrollment Registry ({studentAdmissions.length})
                                </h4>

                                <div className="space-y-8">
                                    {[...studentAdmissions].sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate)).map((admission, index) => (
                                        <div key={admission._id} className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200 shadow-sm'} rounded-[4px] border overflow-hidden`}>
                                            {/* Course Header */}
                                            <div className={`p-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4 ${isDarkMode ? 'bg-[#1a1f24] border-b border-gray-800' : 'bg-white border-b border-gray-100'}`}>
                                                <div>
                                                    <h5 className={`text-lg font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        COURSE {index + 1}: {admission.course?.courseName || admission.boardCourseName || "UNSPECIFIED"}
                                                    </h5>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                        {/* ── Inline-editable Enrollment Number ── */}
                                                        {editingEnrollmentId === admission._id ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Enrollment:</span>
                                                                <input
                                                                    autoFocus
                                                                    value={editingEnrollmentValue}
                                                                    onChange={e => setEditingEnrollmentValue(e.target.value.toUpperCase())}
                                                                    onKeyDown={e => {
                                                                        if (e.key === "Enter") handleUpdateEnrollmentNumber(admission._id);
                                                                        if (e.key === "Escape") { setEditingEnrollmentId(null); setEditingEnrollmentValue(""); }
                                                                    }}
                                                                    className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-[4px] border focus:outline-none w-36 ${isDarkMode
                                                                        ? 'bg-[#131619] border-cyan-500/50 text-cyan-400 focus:border-cyan-400'
                                                                        : 'bg-white border-cyan-400 text-cyan-700 focus:border-cyan-600'
                                                                        }`}
                                                                    disabled={isSavingEnrollment}
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdateEnrollmentNumber(admission._id)}
                                                                    disabled={isSavingEnrollment}
                                                                    className="p-1 rounded-[4px] bg-green-500 text-white hover:bg-green-400 transition-all disabled:opacity-50"
                                                                    title="Save"
                                                                >
                                                                    {isSavingEnrollment ? <FaSync className="animate-spin" size={9} /> : <FaSave size={9} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => { setEditingEnrollmentId(null); setEditingEnrollmentValue(""); }}
                                                                    disabled={isSavingEnrollment}
                                                                    className="p-1 rounded-[4px] bg-red-500/80 text-white hover:bg-red-400 transition-all disabled:opacity-50"
                                                                    title="Cancel"
                                                                >
                                                                    <FaTimes size={9} />
                                                                </button>
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 group/enroll">
                                                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">
                                                                    Enrollment: <span className="text-cyan-500">{admission.admissionNumber || "N/A"}</span>
                                                                </span>
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingEnrollmentId(admission._id);
                                                                            setEditingEnrollmentValue(admission.admissionNumber || "");
                                                                        }}
                                                                        className={`opacity-0 group-hover/enroll:opacity-100 transition-all p-0.5 rounded-[4px] ${isDarkMode
                                                                            ? 'text-cyan-500 hover:bg-cyan-500/10'
                                                                            : 'text-cyan-600 hover:bg-cyan-50'
                                                                            }`}
                                                                        title="Edit Enrollment Number"
                                                                    >
                                                                        <FaPen size={8} />
                                                                    </button>
                                                                )}
                                                            </span>
                                                        )}
                                                        <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Division: <span className="text-orange-500">{admission.admissionType === 'BOARD' ? (admission.board?.boardCourse || 'Board') : (admission.department?.departmentName || admission.centre)}</span></span>
                                                        <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                                                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Cohort: {admission.academicSession}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${admission.paymentStatus === 'COMPLETED' ? (isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200') :
                                                        admission.paymentStatus === 'PARTIAL' ? (isDarkMode ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-50 text-yellow-600 border-yellow-200') :
                                                            (isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200')
                                                        }`}>
                                                        PAYMENT: {admission.paymentStatus}
                                                    </span>
                                                    <div className={`px-4 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${getStatusColor(admission.admissionStatus)}`}>
                                                        {admission.admissionStatus}
                                                    </div>
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => {
                                                                if (showCorrectionId === admission._id) {
                                                                    setShowCorrectionId(null);
                                                                } else {
                                                                    setShowCorrectionId(admission._id);
                                                                    setCorrectionData({
                                                                        totalFees: admission.totalFees,
                                                                        totalPaidAmount: admission.totalPaidAmount,
                                                                        numberOfInstallments: (admission.totalFees - admission.totalPaidAmount) > 0 ? 1 : 0
                                                                    });
                                                                }
                                                            }}
                                                            className={`p-2 rounded-[4px] transition-all shadow-sm ${showCorrectionId === admission._id
                                                                ? 'bg-red-500 text-white border border-red-500'
                                                                : (isDarkMode ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500 hover:text-black' : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-500 hover:text-white')}`}
                                                            title="Manual Financial Correction"
                                                        >
                                                            <FaTools size={14} />
                                                        </button>
                                                    )}
                                                    {admission.admissionType === 'BOARD' ? (
                                                        <button
                                                            onClick={() => navigate(`/edit-board-subjects/${admission._id}`)}
                                                            className="px-6 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-[4px] transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                                                        >
                                                            <FaMoneyBillWave /> BILLING
                                                        </button>
                                                    ) : (
                                                        canEdit && (
                                                            <button
                                                                onClick={() => {
                                                                    if (selectedStudent.status === 'Deactivated') {
                                                                        toast.error("Lifecycle locked for deactivated students.");
                                                                        return;
                                                                    }
                                                                    setIsModalOpen(false);
                                                                    setSelectedStudent(null);
                                                                    setStudentAdmissions([]);
                                                                    window.location.href = `/enrolled-students?edit=${admission._id}`;
                                                                }}
                                                                disabled={selectedStudent.status === 'Deactivated'}
                                                                className={`p-2 rounded-[4px] transition-all shadow-sm ${selectedStudent.status === 'Deactivated'
                                                                    ? (isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-300')
                                                                    : (isDarkMode ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500 hover:text-black' : 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-500 hover:text-white')}`}
                                                                title={selectedStudent.status === 'Deactivated' ? "Deactivated" : "Edit Registry"}
                                                            >
                                                                <FaSync size={14} />
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                {showCorrectionId === admission._id && (
                                                    <div className={`p-5 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'} shadow-inner mb-6`}>
                                                        <div className="flex items-center gap-3 mb-5">
                                                            <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-[4px]">
                                                                <FaTools size={16} />
                                                            </div>
                                                            <div>
                                                                <h6 className="text-[11px] font-black uppercase tracking-widest text-cyan-500">Super Admin Overrider</h6>
                                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Manual correction for imported or migration data</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Total Fees (Input New Value)</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-[10px]">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        value={correctionData.totalFees}
                                                                        onChange={(e) => setCorrectionData({ ...correctionData, totalFees: e.target.value })}
                                                                        className={`w-full pl-7 pr-3 py-2 rounded border text-[11px] font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Total Paid (Input New Value)</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-[10px]">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        value={correctionData.totalPaidAmount}
                                                                        onChange={(e) => setCorrectionData({ ...correctionData, totalPaidAmount: e.target.value })}
                                                                        className={`w-full pl-7 pr-3 py-2 rounded border text-[11px] font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Split Remaining (Months)</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={correctionData.numberOfInstallments}
                                                                    onChange={(e) => setCorrectionData({ ...correctionData, numberOfInstallments: e.target.value })}
                                                                    className={`w-full px-3 py-2 rounded border text-[11px] font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 outline-none transition-all'}`}
                                                                    placeholder="e.g. 5"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-6 pt-5 border-t border-gray-500/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Remaining Balance</span>
                                                                    <span className="text-[13px] font-black text-cyan-400 tracking-widest">₹{fmt(correctionData.totalFees - correctionData.totalPaidAmount)}</span>
                                                                </div>
                                                                <div className="w-px h-8 bg-gray-500/20"></div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">New Installment</span>
                                                                    <span className="text-[13px] font-black text-purple-400 tracking-widest">
                                                                        ₹{correctionData.numberOfInstallments > 0 ? fmt((correctionData.totalFees - correctionData.totalPaidAmount) / correctionData.numberOfInstallments) : "0"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => setShowCorrectionId(null)}
                                                                    className={`px-6 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest border transition-all ${isDarkMode ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => handleManualCorrection(admission._id)}
                                                                    disabled={isCorrecting}
                                                                    className="px-10 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-[4px] transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                                                                >
                                                                    {isCorrecting ? 'Applying Overrides...' : 'Commit Changes'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Fee Summary */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <div className="bg-cyan-500/10 p-3 rounded">
                                                        <p className="text-xs text-gray-400">Total Fees</p>
                                                        <p className="text-lg font-bold text-cyan-400">
                                                            ₹{fmt(admission.totalFees)}
                                                        </p>
                                                    </div>
                                                    <div className="bg-green-500/10 p-3 rounded">
                                                        <p className="text-xs text-gray-400">Total Paid</p>
                                                        <p className="text-lg font-bold text-green-400">
                                                            ₹{fmt(admission.totalPaidAmount)}
                                                        </p>
                                                    </div>
                                                    <div className="bg-yellow-500/10 p-3 rounded">
                                                        <p className="text-xs text-gray-400">Pending</p>
                                                        <p className="text-lg font-bold text-yellow-400">
                                                            ₹{fmt(admission.totalFees - admission.totalPaidAmount)}
                                                        </p>
                                                    </div>
                                                    <div className="bg-blue-500/10 p-3 rounded relative group">
                                                        <p className="text-xs text-gray-400">Down Payment</p>
                                                        <p className="text-lg font-bold text-blue-400">
                                                            ₹{fmt(admission.downPayment)}
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

                                                {/* Installment Division Tool */}
                                                {!["COMPLETED"].includes(admission.paymentStatus) && admission.admissionType !== 'BOARD' && (
                                                    <div className={`p-4 rounded-[4px] border border-dashed flex flex-col md:flex-row items-center justify-between gap-4 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded">
                                                                <FaPlus size={12} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase text-cyan-500">Recalibrate Payment Schedule</p>
                                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Split remaining balance into new installments</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full md:w-auto">
                                                            <input
                                                                type="number"
                                                                placeholder="COUNT"
                                                                value={newInstallmentCount}
                                                                onChange={(e) => setNewInstallmentCount(e.target.value)}
                                                                className={`w-20 p-2 rounded-[4px] border text-[10px] font-black uppercase tracking-widest focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                            />
                                                            <button
                                                                onClick={() => handleDivideInstallments(admission._id)}
                                                                disabled={isDividing || selectedStudent?.status === 'Deactivated'}
                                                                className={`px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-black uppercase tracking-widest rounded-[4px] transition-all flex items-center gap-2 shadow-sm ${isDividing || selectedStudent?.status === 'Deactivated' ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                                            >
                                                                {isDividing ? <FaSync size={10} className="animate-spin" /> : <FaPlus size={10} />} DIVIDE NOW
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Payment Breakdown / Monthly Breakdown */}
                                                <div>
                                                    <h6 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        <FaCalendar /> {admission.admissionType === 'BOARD' ? 'Monthly Payment History' : 'Payment Schedule'}
                                                    </h6>
                                                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
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
                                                                            } catch { return mKey; }
                                                                        };

                                                                        return (
                                                                            <div key={hIdx} className={`p-4 rounded-lg border flex flex-col h-full transition-all group ${displayPaid
                                                                                ? 'bg-green-500/5 border-green-500/20'
                                                                                : isDarkMode
                                                                                    ? 'bg-gray-800 border-gray-700 hover:border-cyan-500/30'
                                                                                    : 'bg-white border-gray-200 hover:border-cyan-500/30 shadow-sm'
                                                                                }`}>
                                                                                <div className="flex justify-between items-center mb-3">
                                                                                    <div>
                                                                                        <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Month {hIdx + 1} / {admission.courseDurationMonths}</span>
                                                                                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{getMonthName(history.month)}</span>
                                                                                    </div>
                                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${displayPaid ? 'bg-green-500 text-white' : (history.status === "PENDING_CLEARANCE" ? 'bg-cyan-500 text-white' : 'bg-yellow-500 text-black')}`}>
                                                                                        {history.status === "PENDING_CLEARANCE" ? "IN PROCESS" : (displayPaid ? 'PAID' : 'PENDING')}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="space-y-1 mb-4 flex-grow">
                                                                                    {history.subjects?.map((sub, sIdx) => (
                                                                                        <div key={sIdx} className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wide">
                                                                                            <span className="text-gray-500">{sub.name}</span>
                                                                                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>₹{fmt(sub.price)}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <div className={`pt-3 border-t flex justify-between items-center ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                                                    <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Aggregate</span>
                                                                                    <span className="text-cyan-500 font-black text-[11px] tracking-widest italic">₹{fmt(history.totalAmount)}</span>
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
                                                                                        className={`mt-4 w-full py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'bg-gray-800 text-cyan-400 hover:bg-gray-700' : 'bg-gray-100 text-cyan-600 hover:bg-gray-200 shadow-sm'}`}
                                                                                    >
                                                                                        <FaFileInvoice size={10} /> Extract Bill
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="col-span-full py-12 text-center">
                                                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic mb-4 text-center">No financial cycles initiated</p>
                                                                        <button
                                                                            onClick={() => navigate(`/edit-board-subjects/${admission._id}`)}
                                                                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-[4px] shadow-lg shadow-purple-500/20"
                                                                        >
                                                                            GENERATE PRIMARY BILL
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto custom-scrollbar">
                                                                <table className="w-full text-left">
                                                                    <thead>
                                                                        <tr className={`${isDarkMode ? 'bg-[#131619] text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Inst #</th>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Expiral Date</th>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Base Fee</th>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Variance</th>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Final Amount</th>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Liquidated</th>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Vector</th>
                                                                            <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em]">Status</th>
                                                                            {canEdit && <th className="p-4 text-[9px] font-black uppercase tracking-[0.2em] text-center">Action</th>}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                                                        {admission.paymentBreakdown?.map((payment, paymentIndex) => {
                                                                            const isPaid = ["PAID", "COMPLETED"].includes(payment.status);
                                                                            const previousPaid = paymentIndex === 0 || admission.paymentBreakdown
                                                                                .slice(0, paymentIndex)
                                                                                .every(p => ["PAID", "COMPLETED"].includes(p.status));

                                                                            const baseInstallmentAmount = admission.installmentAmount || Math.ceil((admission.totalFees - admission.downPayment) / (admission.numberOfInstallments || 1));
                                                                            const remarks = payment.remarks || "";
                                                                            const arrearsMatch = remarks.match(/Includes ₹([\d,]+) arrears from Inst #(\d+)/);
                                                                            const creditMatch = remarks.match(/Credit of ₹([\d,]+) from Inst #(\d+)/);
                                                                            const carryForwardMatch = remarks.match(/Carried Forward Arrears: ₹([\d,]+)/);

                                                                            let adjustmentText = null;
                                                                            let adjustmentColor = "";

                                                                            if (arrearsMatch) {
                                                                                const amount = arrearsMatch[1].replace(/,/g, '');
                                                                                const fromInst = arrearsMatch[2];
                                                                                adjustmentText = `+₹${fmt(amount)} from Inst #${fromInst}`;
                                                                                adjustmentColor = "text-red-500";
                                                                            } else if (creditMatch) {
                                                                                const amount = creditMatch[1].replace(/,/g, '');
                                                                                const fromInst = creditMatch[2];
                                                                                adjustmentText = `-₹${fmt(amount)} from Inst #${fromInst}`;
                                                                                adjustmentColor = "text-green-500";
                                                                            }

                                                                            return (
                                                                                <tr key={payment.installmentNumber} className={`transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                                                                    <td className={`p-4 font-black text-[10px] tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>#{payment.installmentNumber}</td>
                                                                                    <td className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{formatDate(payment.dueDate)}</td>
                                                                                    <td className="p-4 text-[11px] font-black tracking-widest text-gray-400">₹{fmt(baseInstallmentAmount)}</td>
                                                                                    <td className="p-4">
                                                                                        {adjustmentText ? (
                                                                                            <span className={`${adjustmentColor} font-black text-[9px] uppercase tracking-tighter`}>
                                                                                                {adjustmentText}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-gray-600">-</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className={`p-4 font-black text-[11px] tracking-widest italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{fmt(payment.amount)}</td>
                                                                                    <td className="p-4 text-green-500 font-black text-[11px] tracking-widest italic">₹{fmt(payment.paidAmount)}</td>
                                                                                    <td className="p-4 text-[9px] font-black uppercase tracking-widest text-gray-500">{payment.paymentMethod || "UNSET"}</td>
                                                                                    <td className="p-4">
                                                                                        <div className="flex flex-col gap-1">
                                                                                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-tighter border text-center ${getInstallmentStatusColor(payment.status)}`}>
                                                                                                {payment.status === "PENDING_CLEARANCE" ? "IN PROCESS" : payment.status}
                                                                                            </span>
                                                                                            {carryForwardMatch && (
                                                                                                <span className="px-2 py-0.5 bg-yellow-500 text-white rounded-[4px] text-[8px] font-black uppercase tracking-tighter text-center">
                                                                                                    CF: ₹{fmt(carryForwardMatch[1])}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    {canEdit && (
                                                                                        <td className="p-4 text-center">
                                                                                            {(!isPaid && payment.status !== "PENDING_CLEARANCE") ? (
                                                                                                <button
                                                                                                    onClick={() => selectedStudent.status !== 'Deactivated' && openPaymentModal(admission, payment)}
                                                                                                    disabled={!previousPaid || selectedStudent.status === 'Deactivated'}
                                                                                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[4px] transition-all shadow-sm ${(!previousPaid || selectedStudent.status === 'Deactivated')
                                                                                                        ? (isDarkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed')
                                                                                                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95'
                                                                                                        }`}
                                                                                                    title={selectedStudent.status === 'Deactivated' ? "LOCKED" : (!previousPaid ? "PRIOR DEBT" : "PROCESS")}
                                                                                                >
                                                                                                    Pay Now
                                                                                                </button>
                                                                                            ) : (
                                                                                                <button
                                                                                                    onClick={() => selectedStudent.status !== 'Deactivated' && setBillModal({ show: true, admission: admission, installment: payment })}
                                                                                                    disabled={selectedStudent.status === 'Deactivated'}
                                                                                                    className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[4px] transition-all flex items-center justify-center gap-2 mx-auto ${selectedStudent.status === 'Deactivated' ? (isDarkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed') : (isDarkMode ? 'bg-gray-800 text-cyan-400 hover:bg-gray-700' : 'bg-gray-100 text-cyan-600 hover:bg-gray-200 shadow-sm')}`}
                                                                                                >
                                                                                                    <FaFileInvoice size={10} /> {payment.status === "PENDING_CLEARANCE" ? "REC" : "BILL"}
                                                                                                </button>
                                                                                            )}
                                                                                        </td>
                                                                                    )}
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Grand Total Summary */}
                            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-gradient-to-r from-[#131619] to-[#1a1f24] border-gray-800' : 'bg-gradient-to-r from-gray-50 to-white border-gray-100 shadow-sm'} mt-12`}>
                                <h4 className={`text-xl font-black uppercase tracking-widest mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Aggregated Financial Exposure</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className={`p-6 rounded-[4px] border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-black/20 border-cyan-500/20' : 'bg-white border-cyan-200'}`}>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Total Commitment</p>
                                        <p className="text-4xl font-black italic tracking-tighter text-cyan-500">
                                            ₹{studentAdmissions.reduce((sum, ad) => sum + (ad.totalFees || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`p-6 rounded-[4px] border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-black/20 border-green-500/20' : 'bg-white border-green-200'}`}>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Capital Realized</p>
                                        <p className="text-4xl font-black italic tracking-tighter text-green-500">
                                            ₹{studentAdmissions.reduce((sum, ad) => sum + (ad.totalPaidAmount || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`p-6 rounded-[4px] border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-black/20 border-yellow-500/20' : 'bg-white border-yellow-200'}`}>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Outstanding Asset</p>
                                        <p className="text-4xl font-black italic tracking-tighter text-yellow-500">
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
            {showPaymentModal && selectedInstallment && selectedAdmission && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className={`${isDarkMode ? 'bg-[#1e2329] border-gray-700' : 'bg-white border-gray-200'} rounded-[4px] w-full max-w-2xl border shadow-2xl overflow-hidden`}>
                        <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-[#1e2329]' : 'border-gray-100 bg-gray-50'}`}>
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>PROCESS REVENUE - INST #{selectedInstallment.installmentNumber}</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 italic">
                                    {selectedAdmission.course?.courseName} • {selectedAdmission.student?.studentsDetails?.[0]?.studentName}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className={`p-2 rounded-[4px] transition-all ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                                        TARGET AMOUNT
                                    </label>
                                    <div className={`p-3 rounded-[4px] border font-black text-lg tracking-widest ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                        ₹{selectedInstallment.amount}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                                        ACQUISITION AMOUNT <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={paymentData.paidAmount}
                                        onChange={(e) => setPaymentData({ ...paymentData, paidAmount: parseFloat(e.target.value) || 0 })}
                                        required
                                        className={`w-full p-3 rounded-[4px] border font-black text-lg tracking-widest focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500/50 shadow-inner'}`}
                                    />
                                </div>
                            </div>

                            {/* Payment Delta Indicator */}
                            {(() => {
                                const diff = selectedInstallment.amount - paymentData.paidAmount;
                                if (diff > 0) {
                                    return (
                                        <div className={`p-4 rounded-[4px] border flex items-center gap-4 ${isDarkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                                            <FaExclamationCircle className="text-yellow-500 text-xl" />
                                            <div>
                                                <p className="text-yellow-500 font-black uppercase tracking-widest text-[10px]">PARTIAL LIQUIDATION DETECTED</p>
                                                <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-1">Delta of ₹{diff.toLocaleString()} will be rolled over to the next cycle.</p>
                                            </div>
                                        </div>
                                    );
                                } else if (diff < 0) {
                                    return (
                                        <div className={`p-4 rounded-[4px] border flex items-center gap-4 ${isDarkMode ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                                            <FaCheckCircle className="text-green-500 text-xl" />
                                            <div>
                                                <p className="text-green-500 font-black uppercase tracking-widest text-[10px]">EXCESS LIQUIDATION DETECTED</p>
                                                <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mt-1">Surplus of ₹{Math.abs(diff).toLocaleString()} will be credited to the next cycle.</p>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className={`p-4 rounded-[4px] border flex items-center gap-4 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
                                            <FaCheckCircle className="text-cyan-500 text-xl" />
                                            <p className="text-cyan-500 font-black uppercase tracking-widest text-[10px]">OPTIMAL BALANCE REALIZED</p>
                                        </div>
                                    );
                                }
                            })()}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                                        REVENUE VECTOR <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={paymentData.paymentMethod}
                                        onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                                        required
                                        className={`w-full p-3 rounded-[4px] border font-black uppercase tracking-widest text-[11px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    >
                                        <option value="CASH">HARD CURRENCY (CASH)</option>
                                        <option value="UPI">DIGITAL VECTOR (UPI)</option>
                                        <option value="CARD">CREDIT/DEBIT CARD</option>
                                        <option value="BANK_TRANSFER">BANK WIRE TRANSFER</option>
                                        <option value="CHEQUE">BANK CHEQUE</option>
                                        <option value="RAZORPAY_POS">RAZORPAY POS (TERMINAL)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                                        REALIZATION DATE <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentData.receivedDate}
                                        onChange={(e) => setPaymentData({ ...paymentData, receivedDate: e.target.value })}
                                        required
                                        className={`w-full p-3 rounded-[4px] border font-black text-[11px] uppercase focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                    />
                                </div>
                            </div>

                            {/* Conditional Meta-Data Fields */}
                            {["UPI", "CARD", "BANK_TRANSFER"].includes(paymentData.paymentMethod) && (
                                <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                                    <label className="block text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2">
                                        TRANSACTION HASH / ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentData.transactionId}
                                        onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                                        required
                                        placeholder="EX: REF123456789"
                                        className={`w-full p-3 rounded-[4px] border font-black uppercase tracking-widest text-[11px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                    />
                                </div>
                            )}

                            {paymentData.paymentMethod === "CHEQUE" && (
                                <div className={`p-4 rounded-[4px] border space-y-4 ${isDarkMode ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-100'}`}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2">
                                                BANK ENTITY <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={paymentData.accountHolderName}
                                                onChange={(e) => setPaymentData({ ...paymentData, accountHolderName: e.target.value })}
                                                required
                                                placeholder="BANK NAME"
                                                className={`w-full p-2.5 rounded-[4px] border font-black uppercase tracking-widest text-[10px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-900'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2">
                                                CHEQUE SERIAL <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={paymentData.transactionId}
                                                onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                                                required
                                                placeholder="6-DIGIT CODE"
                                                className={`w-full p-2.5 rounded-[4px] border font-black uppercase tracking-widest text-[10px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-900'}`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-purple-500 uppercase tracking-[0.2em] mb-2">
                                            INSTRUMENT DATE <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={paymentData.chequeDate}
                                            onChange={(e) => setPaymentData({ ...paymentData, chequeDate: e.target.value })}
                                            required
                                            className={`w-full p-2.5 rounded-[4px] border font-black text-[10px] uppercase focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-purple-500/50' : 'bg-white border-gray-200 text-gray-900'}`}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                                    NARRATIVE / REMARKS
                                </label>
                                <textarea
                                    value={paymentData.remarks}
                                    onChange={(e) => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                    rows={3}
                                    className={`w-full p-3 rounded-[4px] border font-bold uppercase tracking-widest text-[10px] focus:outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                    placeholder="OPTIONAL CONTEXTUAL METADATA..."
                                />
                            </div>

                            {/* Rolling Balance Opt-in */}
                            {(() => {
                                const diff = selectedInstallment.amount - paymentData.paidAmount;
                                const isLastInstallment = selectedInstallment.installmentNumber === selectedAdmission.numberOfInstallments;

                                if (diff > 0 && isLastInstallment) {
                                    return (
                                        <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                                            <label className="flex items-start gap-4 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={paymentData.carryForward}
                                                    onChange={(e) => setPaymentData({ ...paymentData, carryForward: e.target.checked })}
                                                    className={`w-5 h-5 mt-1 border transition-all ${isDarkMode ? 'bg-gray-900 border-gray-700 checked:bg-yellow-500' : 'bg-white border-gray-300 checked:bg-yellow-500'}`}
                                                />
                                                <div className="flex-1">
                                                    <span className="text-yellow-500 font-black uppercase tracking-widest text-[10px] block">CARRY FORWARD FINAL BALANCE</span>
                                                    <span className="text-gray-500 text-[9px] font-bold uppercase tracking-widest block mt-1 leading-relaxed">
                                                        This is the terminal installment. Check to roll over the remaining ₹{diff.toLocaleString()} to global student credit balance.
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (paymentData.paymentMethod === 'RAZORPAY_POS') {
                                            setShowPOSModal(true);
                                        } else {
                                            handlePaymentSubmit({ preventDefault: () => { } });
                                        }
                                    }}
                                    disabled={processingPayment}
                                    className={`flex-1 py-4 font-black uppercase tracking-[0.2em] text-[11px] rounded-[4px] transition-all flex items-center justify-center gap-3 shadow-lg ${processingPayment ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20 active:scale-95'}`}
                                >
                                    {processingPayment ? (
                                        <><FaSync className="animate-spin" /> SYNCHRONIZING...</>
                                    ) : (
                                        <><FaCheckCircle size={14} /> AUTHORIZE TRANSACTION</>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className={`px-8 py-4 font-black uppercase tracking-[0.2em] text-[11px] rounded-[4px] transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    ABORT
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {showEditModal && editAdmission && (
                <EditEnrolledStudentModal
                    admission={editAdmission}
                    isDarkMode={isDarkMode}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditAdmission(null);
                    }}
                    onUpdate={() => {
                        fetchAdmissions();
                    }}
                />
            )}

            {/* Bill Generator Modal */}
            {billModal.show && billModal.admission && billModal.installment && (
                <BillGenerator
                    admission={billModal.admission}
                    installment={billModal.installment}
                    onClose={() => setBillModal({ show: false, admission: null, installment: null })}
                />
            )}

            {/* ── Permanent Delete Confirmation Modal ── */}
            {deleteConfirm.show && deleteConfirm.studentItem && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className={`w-full max-w-md rounded-[4px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#1e2329] border-red-900/50' : 'bg-white border-red-200'}`}>
                        {/* Header */}
                        <div className="p-5 bg-red-600 flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-[4px]">
                                <FaTrash className="text-white" size={18} />
                            </div>
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest text-sm">Permanent Deletion</h3>
                                <p className="text-red-200 text-[10px] font-bold uppercase tracking-widest mt-0.5">This action is irreversible</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                                <p className={`text-[11px] font-bold leading-relaxed ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                    You are about to <strong>permanently delete</strong> student&nbsp;
                                    <span className="font-black uppercase">
                                        {deleteConfirm.studentItem.student?.studentsDetails?.[0]?.studentName}
                                    </span>
                                    &nbsp;and ALL of their admission records from the database.
                                    This cannot be undone.
                                </p>
                            </div>

                            <div>
                                <label className={`block text-[9px] font-black uppercase tracking-[0.25em] mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Type student name to confirm
                                    <span className={`ml-2 font-black uppercase ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                        {deleteConfirm.studentItem.student?.studentsDetails?.[0]?.studentName}
                                    </span>
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="TYPE NAME HERE..."
                                    value={deleteConfirm.inputValue}
                                    onChange={e => setDeleteConfirm(prev => ({ ...prev, inputValue: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handlePermanentDelete();
                                        if (e.key === 'Escape') setDeleteConfirm({ show: false, studentItem: null, inputValue: '' });
                                    }}
                                    className={`w-full px-4 py-3 rounded-[4px] border text-[11px] font-bold uppercase tracking-widest focus:outline-none transition-all ${isDarkMode
                                        ? 'bg-[#131619] border-gray-700 text-white focus:border-red-500 placeholder-gray-600'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-red-400 placeholder-gray-400'
                                        }`}
                                    disabled={isDeleting}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handlePermanentDelete}
                                    disabled={isDeleting || deleteConfirm.inputValue.trim().toUpperCase() !== (deleteConfirm.studentItem.student?.studentsDetails?.[0]?.studentName || '').trim().toUpperCase()}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[10px] rounded-[4px] transition-all"
                                >
                                    {isDeleting ? <><FaSync className="animate-spin" size={12} /> Deleting...</> : <><FaTrash size={12} /> Permanently Delete</>}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm({ show: false, studentItem: null, inputValue: '' })}
                                    disabled={isDeleting}
                                    className={`px-6 py-3 rounded-[4px] font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-40 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Razorpay POS Modal */}
            <RazorpayPOSModal
                isOpen={showPOSModal}
                onClose={() => setShowPOSModal(false)}
                amount={paymentData.paidAmount}
                invoiceId={`POS-${Date.now()}`}
                studentInfo={selectedStudent}
                onPaymentSuccess={(posData) => {
                    setPaymentData(prev => ({
                        ...prev,
                        transactionId: posData.p2pRequestId,
                        remarks: (prev.remarks ? prev.remarks + " | " : "") + "Razorpay POS Authorized"
                    }));
                    setShowPOSModal(false);
                    // Manually trigger submit after POS success
                    handlePaymentSubmit({ preventDefault: () => { } });
                }}
            />
        </div >

    );
};

export default EnrolledStudentsContent;
