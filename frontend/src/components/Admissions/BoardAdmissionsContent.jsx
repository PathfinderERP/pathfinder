import React, { useState, useEffect } from "react";
import { FaFilter, FaPlus, FaSearch, FaDownload, FaEye, FaEdit, FaTrash, FaSync, FaSun, FaMoon, FaUserGraduate, FaCheckCircle } from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
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
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const initialTab = searchParams.get("tab") || "Counselling";

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterBoard, setFilterBoard] = useState([]);
    const [filterSubject, setFilterSubject] = useState([]);
    const [filterProgramme, setFilterProgramme] = useState([]);
    const [filterExamTag, setFilterExamTag] = useState([]);
    const [filterDepartment, setFilterDepartment] = useState([]);
    const [filterClass, setFilterClass] = useState([]);
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

    const [activeTab, setActiveTab] = useState(initialTab); // "Counselling" | "Enrolled"
    const [boardAdmissions, setBoardAdmissions] = useState([]);
    const [counselledStudents, setCounselledStudents] = useState([]);
    const [enrolledLoading, setEnrolledLoading] = useState(false);
    const [counsellingLoading, setCounsellingLoading] = useState(false);
    const [boards, setBoards] = useState([]);
    const [showCounsellingModal, setShowCounsellingModal] = useState(false);
    const [editingCounsellingId, setEditingCounsellingId] = useState(null);
    // Duplicate contact check state
    const [mobileCheck, setMobileCheck] = useState({ checking: false, taken: false, name: "" });
    const [emailCheck, setEmailCheck] = useState({ checking: false, taken: false, name: "" });
    const [counsellingForm, setCounsellingForm] = useState({
        studentId: "",
        studentName: "",
        mobileNum: "",
        whatsappNumber: "",
        studentEmail: "",
        dateOfBirth: "",
        gender: "",
        centre: "",
        board: "",
        state: "",
        schoolName: "",
        pincode: "",
        address: "",
        guardianName: "",
        guardianMobile: "",
        guardianEmail: "",
        occupation: "",
        lastClass: "",
        examStatus: "",
        markAggregate: "",
        scienceMathPercent: "",
        examName: "",
        boardId: "",
        selectedSubjectIds: [],
        remarks: ""
    });

    const [examTags, setExamTags] = useState([]);
    const [classes, setClasses] = useState([]);
    const [boardCourseSubjects, setBoardCourseSubjects] = useState([]);
    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
        "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

    const fetchExamTags = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/examTag/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setExamTags(data);
        } catch (error) { console.error("Error fetching exam tags:", error); }
    };

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/class/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setClasses(data);
        } catch (error) { console.error("Error fetching classes:", error); }
    };

    const fetchBoardCourseSubjects = React.useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board-course-subject`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setBoardCourseSubjects(data);
        } catch (error) {
            console.error("Error fetching board course subjects:", error);
        }
    }, []);

    const fetchBoards = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setBoards(data);
        } catch (error) {
            console.error("Error fetching boards:", error);
        }
    };

    const fetchCounselledStudents = async () => {
        setCounsellingLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board-admission/counsel/all`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setCounselledStudents(data);
        } catch (error) {
            console.error("Error fetching counselled students:", error);
        } finally {
            setCounsellingLoading(false);
        }
    };

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

    // Effect to catch incoming leadData from Lead Management redirection
    useEffect(() => {
        if (location.state && location.state.leadData && !showCounsellingModal) {
            const leadData = location.state.leadData;
            setCounsellingForm({
                studentId: leadData._id || "",
                studentName: leadData.studentName || leadData.name || "",
                mobileNum: leadData.mobileNum || leadData.phoneNumber || "",
                whatsappNumber: leadData.secondaryMobile || leadData.whatsappNumber || leadData.phoneNumber || "",
                studentEmail: leadData.studentEmail || leadData.email || "",
                dateOfBirth: leadData.dob ? new Date(leadData.dob).toISOString().split('T')[0] : 
                            (leadData.dateOfBirth ? new Date(leadData.dateOfBirth).toISOString().split('T')[0] : ""),
                gender: leadData.gender || "",
                centre: leadData.centre?.centreName || leadData.centre || (allowedCentres && allowedCentres.length > 0 ? allowedCentres[0] : ""),
                programme: leadData.programme || "",
                board: leadData.board?.boardName || leadData.board?.boardCourse || leadData.board || "",
                state: leadData.state || "",
                schoolName: leadData.schoolName || "",
                pincode: leadData.pincode || "",
                address: leadData.address || "",
                guardianName: leadData.fatherName || leadData.parentName || leadData.guardianName || "",
                guardianMobile: leadData.fatherMobile || leadData.parentMobile || leadData.guardianMobile || "",
                guardianEmail: leadData.guardianEmail || "",
                occupation: leadData.fatherOccupation || leadData.parentOccupation || leadData.occupation || "",
                lastClass: leadData.className?.name || leadData.className || leadData.lastClass || "",
                examStatus: "",
                markAggregate: "",
                scienceMathPercent: "",
                examName: leadData.examName || leadData.course?.courseName || "",
                boardId: leadData.board?._id || "",
                selectedSubjectIds: [],
                remarks: leadData.remarks || ""
            });
            setShowCounsellingModal(true);

            // Optional: prevent loop if modal is closed and re-opened
            navigate(location.pathname + location.search, { replace: true, state: {} });
        }
    }, [location.state, showCounsellingModal, allowedCentres, navigate, location.pathname, location.search]);

    // Auto-match boardId if board name is present but boardId is not
    useEffect(() => {
        if (counsellingForm.board && !counsellingForm.boardId && boards.length > 0) {
            const matchedBoard = boards.find(b => 
                (b.boardCourse && b.boardCourse.toLowerCase() === counsellingForm.board.toLowerCase()) ||
                (b.boardName && b.boardName.toLowerCase() === counsellingForm.board.toLowerCase())
            );
            if (matchedBoard) {
                setCounsellingForm(prev => ({ ...prev, boardId: matchedBoard._id }));
            }
        }
    }, [boards, counsellingForm.board, counsellingForm.boardId]);

    const filteredBoardAdmissions = React.useMemo(() => {
        return boardAdmissions.filter(admission => {
            // Search Query
            const searchLower = searchQuery.toLowerCase();
            const studentName = (admission.studentId?.studentsDetails?.[0]?.studentName || admission.studentName || "").toLowerCase();
            const admissionNo = (admission.admissionNumber || "").toLowerCase();
            const mobile = (admission.studentId?.studentsDetails?.[0]?.mobileNum || admission.mobileNum || "").toLowerCase();
            const courseName = (admission.boardCourseName || "").toLowerCase();

            const matchesSearch = !searchQuery ||
                studentName.includes(searchLower) ||
                admissionNo.includes(searchLower) ||
                mobile.includes(searchLower) ||
                courseName.includes(searchLower);

            // Centre Filter
            const matchesCentre = filterCentre.length === 0 || filterCentre.includes(admission.centre);

            // Board Filter
            const bName = admission.boardId?.boardCourse || admission.boardId;
            const matchesBoard = filterBoard.length === 0 || filterBoard.includes(bName);

            // Subject Filter
            const admissionSubjects = admission.selectedSubjects?.map(s => s.subjectId?.subName || s.name) || [];
            const matchesSubject = filterSubject.length === 0 || filterSubject.some(sub => admissionSubjects.includes(sub));

            // Programme Filter
            const matchesProgramme = filterProgramme.length === 0 || filterProgramme.includes(admission.programme);

            // Class Filter
            const matchesClass = filterClass.length === 0 || filterClass.includes(admission.lastClass);

            // Date Filter
            const admissionDate = new Date(admission.admissionDate || admission.createdAt);
            const matchesStartDate = !startDate || admissionDate >= new Date(startDate);
            const matchesEndDate = !endDate || admissionDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999));

            return matchesSearch && matchesCentre && matchesBoard && matchesSubject && matchesProgramme && matchesClass && matchesStartDate && matchesEndDate;
        });
    }, [boardAdmissions, searchQuery, filterCentre, filterBoard, filterSubject, filterProgramme, filterClass, startDate, endDate]);

    const handleExportEnrolled = () => {
        const exportData = filteredBoardAdmissions.map(adm => ({
            "Admission No": adm.admissionNumber,
            "Admission Date": new Date(adm.admissionDate || adm.createdAt).toLocaleDateString('en-GB'),
            "Student Name": adm.studentId?.studentsDetails?.[0]?.studentName || adm.studentName,
            "UID": adm.studentId?._id || "N/A",
            "Mobile": adm.studentId?.studentsDetails?.[0]?.mobileNum || adm.mobileNum,
            "Email": adm.studentId?.studentsDetails?.[0]?.studentEmail || adm.studentEmail,
            "Centre": adm.centre,
            "Board": adm.boardId?.boardCourse || "N/A",
            "Class": adm.lastClass,
            "Programme": adm.programme,
            "Session": adm.academicSession,
            "Course Name": adm.boardCourseName,
            "Total Expected": adm.totalExpectedAmount,
            "Total Paid": adm.totalPaidAmount,
            "Admission Fee": adm.admissionFee,
            "Exam Fee": adm.examFee,
            "Exam Fee Paid": adm.examFeePaid,
            "Exam Fee Status": adm.examFeeStatus,
            "Subjects": adm.selectedSubjects?.map(s => s.subjectId?.subName || s.name).join(', '),
            "Admitted By": adm.createdBy?.name || "Admin",
            "Remarks": adm.remarks
        }));
        downloadExcel(exportData, `Enrolled_Board_Admissions_${new Date().toLocaleDateString()}`);
    };

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
                setAllowedCentres(centres.map(c => c.centreName).sort((a, b) => a.localeCompare(b)));
            } else {
                const userCentres = currentUser.centres || [];
                const userCentreNames = userCentres.map(c => c.centreName || c.name || c).filter(Boolean);
                setAllowedCentres(userCentreNames.sort((a, b) => a.localeCompare(b)));
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
            if (response.ok) {
                const visibleDepts = Array.isArray(data) ? data.filter(dept => dept.showInAdmission !== false) : [];
                setDepartments(visibleDepts);
            }
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
        setFilterClass([]);
        setFilterDepartment([]);
        setStartDate("");
        setEndDate("");
        setLoading(true);
        fetchStudents();
        fetchDepartments();
        fetchBoardAdmissions();
        fetchCounselledStudents();
        fetchBoards();
        fetchBoardCourseSubjects();
        fetchExamTags();
        fetchClasses();
        toast.info("Refreshed data and filters");
    };

    // Handle Tab Click to update URL
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        setSearchParams({ tab: tabName });
    };

    useEffect(() => {
        if (activeTab === "Enrolled") {
            fetchBoardAdmissions();
        } else if (activeTab === "Counselling") {
            fetchCounselledStudents();
        }
    }, [activeTab]);

    useEffect(() => {
        fetchAllowedCentres();
        fetchStudents();
        fetchDepartments();
        fetchBoards();
        fetchExamTags();
        fetchClasses();
        fetchBoardCourseSubjects();
        fetchCounselledStudents();
        fetchBoardAdmissions();
    }, [fetchAllowedCentres, fetchStudents, fetchDepartments]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterCentre, filterBoard, filterExamTag, filterDepartment, filterClass, startDate, endDate, activeTab]);

    const visibleStudents = activeTab === "Potential"
        ? students.filter(s => {
            if (isSuperAdmin) return true;
            if (allowedCentres.length === 0) return false;
            const studentCentre = s.studentsDetails?.[0]?.centre;
            return allowedCentres.includes(studentCentre);
        })
        : activeTab === "Enrolled"
            ? boardAdmissions.filter(ba => {
                if (isSuperAdmin) return true;
                if (allowedCentres.length === 0) return false;
                const studentCentre = ba.studentId?.studentsDetails?.[0]?.centre;
                return allowedCentres.includes(studentCentre);
            })
            : counselledStudents.filter(cs => {
                // Hide if student is already in enrolledBoard list (Strong check: ID, UID, or Name+Mobile)
                const isAlreadyEnrolled = boardAdmissions.some(ba => {
                    // 1. Direct ID Check
                    const baId = (ba.studentId?._id || ba.studentId || "").toString();
                    const csId = (cs.studentId?._id || cs.studentId || "").toString();
                    if (baId && csId && baId === csId) return true;

                    // 2. UID Check (derived from ID)
                    const baUID = baId.slice(-8).toUpperCase();
                    const csUID = csId.slice(-8).toUpperCase();
                    if (baUID && csUID && baUID === csUID) return true;

                    // 3. Fallback Name + Mobile check (strict stringification to prevent type mismatch)
                    // We specifically check the document's explicitly stored studentName and mobileNum, NOT the nested student profile.
                    // This bypasses any database Mongoose populate references mismatches (from old buggy enrollments).
                    const baName = String(ba.studentName || "").toLowerCase().trim();
                    const csName = String(cs.studentName || "").toLowerCase().trim();
                    const baMobile = String(ba.mobileNum || "").trim();
                    const csMobile = String(cs.mobileNum || "").trim();

                    return baName && baMobile && baName === csName && baMobile === csMobile;
                });
                if (isAlreadyEnrolled) return false;

                if (isSuperAdmin) return true;
                if (allowedCentres.length === 0) return false;
                const studentIdObj = cs.studentId;
                const studentCentre = (studentIdObj?.studentsDetails?.[0]?.centre) || cs.centre;
                return allowedCentres.includes(studentCentre);
            });

    const uniqueCentres = [...new Set(visibleStudents.map(s => (activeTab === "Potential" ? s : s.studentId)?.studentsDetails?.[0]?.centre).filter(Boolean))];
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

            const matchesClass = filterClass.length === 0 || filterClass.includes(details.lastClass || exam.class || "");

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

            return matchesSearch && matchesCentre && matchesBoard && matchesExamTag && matchesDepartment && matchesClass && matchesDate;
        })
        : activeTab === "Enrolled"
            ? visibleStudents.filter(ba => {
                const details = ba.studentId?.studentsDetails?.[0] || {};
                const studentName = ba.studentName || details.studentName || "";
                const mobile = ba.mobileNum || details.mobileNum || "";
                const boardName = ba.boardId?.boardCourse || "";

                const queries = searchQuery.toLowerCase().split(',').map(q => q.trim()).filter(Boolean);
                const matchesSearch = queries.length === 0 || queries.some(query =>
                    studentName.toLowerCase().includes(query) ||
                    mobile.includes(query) ||
                    boardName.toLowerCase().includes(query)
                );

                const matchesCentre = filterCentre.length === 0 || filterCentre.includes(details.centre);
                const matchesClass = filterClass.length === 0 || filterClass.includes(ba.lastClass);
                return matchesSearch && matchesCentre && matchesClass;
            })
            : visibleStudents.filter(cs => {
                const details = cs.studentId?.studentsDetails?.[0] || {};
                const studentName = cs.studentName || details.studentName || "";
                const mobile = cs.mobileNum || details.mobileNum || "";
                const boardName = cs.boardId?.boardCourse || "";

                const queries = searchQuery.toLowerCase().split(',').map(q => q.trim()).filter(Boolean);
                const matchesSearch = queries.length === 0 || queries.some(query =>
                    studentName.toLowerCase().includes(query) ||
                    mobile.includes(query) ||
                    boardName.toLowerCase().includes(query)
                );

                const matchesCentre = filterCentre.length === 0 || filterCentre.includes(details.centre);
                const matchesClass = filterClass.length === 0 || filterClass.includes(cs.lastClass);
                return matchesSearch && matchesCentre && matchesClass;
            });

    const totalStudents = filteredStudents.length;
    const conversionRate = students.length > 0 ? (students.filter(s => s.isEnrolled).length / students.length * 100).toFixed(1) : "0.0";
    const todaysNew = students.filter(s => {
        if (!s.createdAt) return false;
        const d = new Date(s.createdAt);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }).length;

    // Debounced duplicate check for mobile number
    useEffect(() => {
        const mobile = counsellingForm.mobileNum;
        if (!mobile || mobile.length < 10) {
            setMobileCheck({ checking: false, taken: false, name: "" });
            return;
        }
        setMobileCheck(prev => ({ ...prev, checking: true }));
        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem("token");
                const excludeId = counsellingForm.studentId || "";
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/board-admission/counsel/check-duplicate?mobile=${mobile}${excludeId ? `&excludeStudentId=${excludeId}` : ""}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await res.json();
                setMobileCheck({ checking: false, taken: !!data.mobileTaken, name: data.mobileStudentName || "" });
            } catch { setMobileCheck({ checking: false, taken: false, name: "" }); }
        }, 600);
        return () => clearTimeout(timer);
    }, [counsellingForm.mobileNum, counsellingForm.studentId]);

    // Debounced duplicate check for email
    useEffect(() => {
        const email = counsellingForm.studentEmail;
        if (!email || !email.includes("@")) {
            setEmailCheck({ checking: false, taken: false, name: "" });
            return;
        }
        setEmailCheck(prev => ({ ...prev, checking: true }));
        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem("token");
                const excludeId = counsellingForm.studentId || "";
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/board-admission/counsel/check-duplicate?email=${encodeURIComponent(email)}${excludeId ? `&excludeStudentId=${excludeId}` : ""}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const data = await res.json();
                setEmailCheck({ checking: false, taken: !!data.emailTaken, name: data.emailStudentName || "" });
            } catch { setEmailCheck({ checking: false, taken: false, name: "" }); }
        }, 600);
        return () => clearTimeout(timer);
    }, [counsellingForm.studentEmail, counsellingForm.studentId]);

    const handleOpenNewCounselling = () => {
        setCounsellingForm({
            studentId: "",
            studentName: "",
            mobileNum: "",
            whatsappNumber: "",
            studentEmail: "",
            dateOfBirth: "",
            gender: "",
            centre: allowedCentres[0] || "",
            programme: "",
            board: "",
            state: "",
            schoolName: "",
            pincode: "",
            address: "",
            guardianName: "",
            guardianMobile: "",
            guardianEmail: "",
            occupation: "",
            lastClass: "",
            examStatus: "",
            markAggregate: "",
            scienceMathPercent: "",
            examName: "",
            boardId: "",
            selectedSubjectIds: [],
            remarks: ""
        });
        setEditingCounsellingId(null);
        setMobileCheck({ checking: false, taken: false, name: "" });
        setEmailCheck({ checking: false, taken: false, name: "" });
        setShowCounsellingModal(true);
    };

    const handleEditCounselling = (item) => {
        setEditingCounsellingId(item._id);
        setMobileCheck({ checking: false, taken: false, name: "" });
        setEmailCheck({ checking: false, taken: false, name: "" });
        const studentObj = item.studentId;
        const details = studentObj?.studentsDetails?.[0] || {};
        setCounsellingForm({
            studentId: studentObj?._id || "",
            studentName: item.studentName || details.studentName || "",
            mobileNum: item.mobileNum || details.mobileNum || "",
            whatsappNumber: details.whatsappNumber || item.mobileNum || "",
            studentEmail: details.studentEmail || "",
            dateOfBirth: details.dateOfBirth ? new Date(details.dateOfBirth).toISOString().split('T')[0] : "",
            gender: details.gender || "",
            centre: item.centre || details.centre || allowedCentres[0] || "",
            programme: item.programme || "",
            board: item.boardId?.boardCourse || details.board || "",
            state: details.state || "",
            schoolName: details.schoolName || "",
            pincode: details.pincode || "",
            address: details.address || "",
            guardianName: details.guardianName || "",
            guardianMobile: details.guardianMobile || "",
            guardianEmail: details.guardianEmail || "",
            occupation: details.occupation || "",
            lastClass: item.lastClass || "",
            examStatus: "",
            markAggregate: "",
            scienceMathPercent: "",
            examName: "",
            boardId: item.boardId?._id || "",
            selectedSubjectIds: item.selectedSubjects?.map(s => s.subjectId?._id || s.subjectId).filter(Boolean) || [],
            remarks: item.remarks || ""
        });
        setShowCounsellingModal(true);
    };

    const handleOpenCounsellingModal = (student) => {
        const details = student?.studentsDetails?.[0] || {};
        const exam = student?.examSchema?.[0] || {};
        const sessionExam = student?.sessionExamCourse?.[0] || {};

        setCounsellingForm({
            studentId: student._id,
            studentName: details.studentName || "",
            mobileNum: details.mobileNum || "",
            whatsappNumber: details.whatsappNumber || "",
            studentEmail: details.studentEmail || "",
            dateOfBirth: details.dateOfBirth ? new Date(details.dateOfBirth).toISOString().split('T')[0] : "",
            gender: details.gender || "",
            centre: details.centre || allowedCentres[0] || "",
            programme: details.programme || "",
            board: details.board || "",
            state: details.state || "",
            schoolName: details.schoolName || "",
            pincode: details.pincode || "",
            address: details.address || "",
            guardianName: details.guardianName || "",
            guardianMobile: details.guardianMobile || "",
            guardianEmail: details.guardianEmail || "",
            occupation: details.occupation || "",
            lastClass: details.lastClass || "",
            examStatus: details.examStatus || "",
            markAggregate: details.markAggregate || details.markAgregate || "",
            scienceMathPercent: details.scienceMathPercent || details.scienceMathParcent || "",
            examName: sessionExam.examTag || exam.examName || details.programme || "",
            boardId: "",
            selectedSubjectIds: [],
            remarks: ""
        });
        setShowCounsellingModal(true);
    };

    const handleAddToCounselling = async () => {
        const {
            studentId, studentName, mobileNum, whatsappNumber, studentEmail, dateOfBirth, gender,
            centre, programme, board, state, schoolName, pincode, address,
            guardianName, guardianMobile, guardianEmail, occupation,
            lastClass, examStatus, markAggregate, scienceMathPercent, examName,
            boardId, selectedSubjectIds, remarks
        } = counsellingForm;

        if (!studentId && (!studentName || !mobileNum || !centre)) {
            return toast.error("Please provide student details (Name, Mobile, Centre)");
        }
        if (!programme) return toast.error("Please select a programme (CRP/NCRP)");
        if (!lastClass) return toast.error("Please specify the student's last class");
        if (!boardId) return toast.error("Please select a board");
        if (selectedSubjectIds.length === 0) return toast.error("Please select at least one subject");

        // Block if mobile is taken by another student
        if (mobileCheck.taken) {
            return toast.error(`Mobile number already registered to ${mobileCheck.name}. Please use a different number.`);
        }
        if (emailCheck.taken) {
            return toast.error(`Email already registered to ${emailCheck.name}. Please use a different email.`);
        }

        try {
            const token = localStorage.getItem("token");
            const isEditing = !!editingCounsellingId;
            const url = isEditing
                ? `${import.meta.env.VITE_API_URL}/board-admission/counsel/${editingCounsellingId}`
                : `${import.meta.env.VITE_API_URL}/board-admission/counsel/create`;
            const method = isEditing ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId, studentName, mobileNum, whatsappNumber, studentEmail, dateOfBirth, gender,
                    centre, programme, board, state, schoolName, pincode, address,
                    guardianName, guardianMobile, guardianEmail, occupation,
                    lastClass, examStatus, markAggregate, scienceMathPercent, examName,
                    boardId, selectedSubjectIds, remarks
                })
            });

            if (response.ok) {
                toast.success(isEditing ? "Counselling record updated!" : "Board counselling recorded!");
                setShowCounsellingModal(false);
                setEditingCounsellingId(null);
                fetchCounselledStudents();
                fetchBoardAdmissions();
            } else {
                const data = await response.json();
                // Handle 409 conflict - highlight the specific field that is taken
                if (response.status === 409) {
                    if (data.field === "mobileNum") {
                        setMobileCheck({ checking: false, taken: true, name: data.takenBy || "Another student" });
                    } else if (data.field === "studentEmail") {
                        setEmailCheck({ checking: false, taken: true, name: data.takenBy || "Another student" });
                    }
                }
                toast.error(data.message || "Failed to save counselling");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleDeleteCounselling = async (id) => {
        if (!window.confirm("Are you sure you want to remove this from counselling?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/board-admission/counsel/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Counselling record removed");
                fetchCounselledStudents();
            }
        } catch (error) {
            toast.error("Failed to delete record");
        }
    };

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
        fetchCounselledStudents();
    };
    
    // Statistics Calculations
    const statsMetrics = React.useMemo(() => {
        const today = new Date().toDateString();
        // Today's total WITHIN the filtered set
        const todayTotalFiltered = filteredBoardAdmissions.filter(ba => (new Date(ba.admissionDate || ba.createdAt)).toDateString() === today).length;
        
        // Class Distribution (from FILTERED board admissions)
        const classDist = filteredBoardAdmissions.reduce((acc, ba) => {
            const cls = ba.lastClass || "N/A";
            acc[cls] = (acc[cls] || 0) + 1;
            return acc;
        }, {});

        // Subject Distribution (from FILTERED board admissions)
        const subDist = filteredBoardAdmissions.reduce((acc, ba) => {
            const subjects = ba.selectedSubjects?.map(s => s.subjectId?.subName || s.name) || [];
            subjects.forEach(sub => {
                acc[sub] = (acc[sub] || 0) + 1;
            });
            return acc;
        }, {});

        // Sort distributions for better display
        const sortedClassDist = Object.entries(classDist).sort((a, b) => b[1] - a[1]);
        const sortedSubDist = Object.entries(subDist).sort((a, b) => b[1] - a[1]);

        return {
            todayTotal: todayTotalFiltered,
            grandTotal: filteredBoardAdmissions.length,
            classDist: sortedClassDist,
            subDist: sortedSubDist
        };
    }, [filteredBoardAdmissions]);

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
                            <ResponsiveContainer width="100%" height="100%" minHeight={40}>
                                <AreaChart data={chartData || []}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="count" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} isAnimationActive={false} />
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

                    <button
                        onClick={handleOpenNewCounselling}
                        className={`p-3 rounded-[4px] border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-cyan-500 hover:bg-cyan-500 hover:text-black' : 'bg-white border-gray-200 text-indigo-500 hover:bg-indigo-500 hover:text-white'}`}
                    >
                        <FaPlus />
                        <span>Add Counselling</span>
                    </button>

                    <button onClick={toggleTheme} className={`p-3 rounded-[4px] border transition-all text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}>
                        {isDarkMode ? <FaSun /> : <FaMoon />}
                    </button>
                </div>
            </div>

            <div className="flex gap-1 mb-8 p-1 bg-black/20 rounded-lg w-fit">
                {["Counselling", "Enrolled"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                : "text-gray-500 hover:text-white"
                            }`}
                    >
                        {tab === "Counselling" ? "COUNSELLED" : "ENROLLED BOARD"}
                    </button>
                ))}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Daily Total Card */}
                <div className={`p-6 rounded-xl border relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/50' : 'bg-white border-gray-200 hover:shadow-xl hover:shadow-cyan-500/5'}`}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-700"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Admissions (Filtered)</p>
                            <h4 className={`text-4xl font-black italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{statsMetrics.grandTotal}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                            <FaCheckCircle />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded">TODAY: {statsMetrics.todayTotal}</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider italic opacity-60 ml-auto">Reacting to active filters</span>
                    </div>
                </div>

                {/* Top Classes Card */}
                <div className={`p-6 rounded-xl border transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FaUserGraduate className="text-purple-500 text-[10px]" />
                        Top Performing Classes
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {statsMetrics.classDist.slice(0, 5).map(([className, count], idx) => (
                            <div key={idx} className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-3 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-400 hover:border-purple-500/30' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-500/30'}`}>
                                <span>{className}</span>
                                <span className="w-1 h-3 bg-gray-700 rounded-full"></span>
                                <span className={isDarkMode ? 'text-white' : 'text-black'}>{count}</span>
                            </div>
                        ))}
                        {statsMetrics.classDist.length === 0 && <p className="text-[9px] text-gray-500 italic opacity-60">No class data recorded yet</p>}
                    </div>
                </div>

                {/* Popular Subjects Card */}
                <div className={`p-6 rounded-xl border transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FaFilter className="text-cyan-500 text-[10px]" />
                        Popular Subscriptions
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {statsMetrics.subDist.slice(0, 5).map(([sub, count], idx) => (
                            <div key={idx} className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-100 text-cyan-600'}`}>
                                <span>{sub}</span>
                                <span className="bg-cyan-500/20 px-1.5 rounded">{count}</span>
                            </div>
                        ))}
                         {statsMetrics.subDist.length === 0 && <p className="text-[9px] text-gray-500 italic opacity-60">No subject data recorded yet</p>}
                    </div>
                </div>
            </div>

            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-6 rounded-[4px] border mb-8`}>
                <div className="flex flex-col gap-6">
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
                        {activeTab === "Enrolled" && (
                            <button
                                onClick={handleExportEnrolled}
                                className={`flex items-center gap-2 px-6 py-3 rounded-[4px] border text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500 hover:text-black' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-600 hover:text-white'}`}
                            >
                                <FaDownload /> Export to Excel
                            </button>
                        )}
                    </div>

                    {activeTab !== "Potential" && (
                        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-800/10 dark:border-gray-800">
                            <MultiSelectFilter
                                label="Boards"
                                options={activeTab === "Enrolled" 
                                    ? [...new Set(boardAdmissions.map(a => a.boardId?.boardCourse).filter(Boolean))]
                                    : [...new Set(counselledStudents.map(cs => cs.boardId?.boardCourse).filter(Boolean))]
                                }
                                selectedValues={filterBoard}
                                onChange={setFilterBoard}
                                theme={theme}
                            />
                            {activeTab === "Enrolled" && (
                                <MultiSelectFilter
                                    label="Subjects"
                                    options={[...new Set(boardAdmissions.flatMap(a => a.selectedSubjects?.map(s => s.subjectId?.subName || s.name)).filter(Boolean))]}
                                    selectedValues={filterSubject}
                                    onChange={setFilterSubject}
                                    theme={theme}
                                />
                            )}
                            <MultiSelectFilter
                                label="Centres"
                                options={uniqueCentres}
                                selectedValues={filterCentre}
                                onChange={setFilterCentre}
                                theme={theme}
                            />
                            <MultiSelectFilter
                                label="Classes"
                                options={activeTab === "Enrolled"
                                    ? [...new Set(boardAdmissions.map(a => a.lastClass).filter(Boolean))]
                                    : [...new Set(counselledStudents.map(cs => cs.lastClass).filter(Boolean))]
                                }
                                selectedValues={filterClass}
                                onChange={setFilterClass}
                                theme={theme}
                            />
                            <MultiSelectFilter
                                label="Programmes"
                                options={activeTab === "Enrolled"
                                    ? [...new Set(boardAdmissions.map(a => a.programme).filter(Boolean))]
                                    : [...new Set(counselledStudents.map(cs => cs.programme).filter(Boolean))]
                                }
                                selectedValues={filterProgramme}
                                onChange={setFilterProgramme}
                                theme={theme}
                            />

                            <div className="flex items-center gap-2 ml-auto">
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`pl-8 pr-2 py-2 rounded border text-[10px] font-bold outline-none ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-gray-500">From</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`pl-8 pr-2 py-2 rounded border text-[10px] font-bold outline-none ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-gray-500">To</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setFilterCentre([]);
                                        setFilterBoard([]);
                                        setFilterSubject([]);
                                        setFilterProgramme([]);
                                        setFilterClass([]);
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className={`p-2 rounded hover:bg-gray-800 text-gray-500 transition-colors`}
                                    title="Reset All Filters"
                                >
                                    <FaSync size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} rounded-[4px] border overflow-hidden transition-all`}>
                <div className="p-6 border-b flex justify-between items-center border-gray-200 dark:border-gray-800">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activeTab === "Potential" ? "Board Records" : activeTab === "Counselling" ? "Counselled Students" : "Enrolled Board Students"}
                    </h3>
                    <span className="text-[10px] font-black px-3 py-1 rounded-[4px] bg-cyan-500/10 text-cyan-500">
                        {activeTab === "Enrolled" ? filteredBoardAdmissions.length : filteredStudents.length} {activeTab === "Potential" ? "Candidates" : activeTab === "Counselling" ? "Counselled" : "Admissions"}
                    </span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                <th className="p-4">{activeTab === "Potential" ? "Reg. Date" : activeTab === "Counselling" ? "Counsel Date" : "Addon Date"}</th>
                                <th className="p-4">Student Name</th>
                                <th className="p-4">
                                    {activeTab === "Potential" ? "Board" : activeTab === "Counselling" ? "Counselling For" : "Admission No"}
                                </th>
                                <th className="p-4">
                                    {activeTab === "Potential" ? "Programme" : activeTab === "Counselling" ? "Remarks" : "Course Name"}
                                </th>
                                <th className="p-4">Class</th>
                                {activeTab === "Potential" && <th className="p-4">Exam Tag</th>}
                                <th className="p-4">Centre</th>
                                <th className="p-4">Mobile</th>
                                {activeTab === "Counselling" && <th className="p-4">Counselled By</th>}
                                {activeTab === "Enrolled" && <th className="p-4">Fees Status</th>}
                                {activeTab === "Enrolled" && <th className="p-4">Admitted By</th>}
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                            {(activeTab === "Potential" ? loading :
                                activeTab === "Counselling" ? counsellingLoading :
                                    enrolledLoading) ? (
                                <tr><td colSpan="9" className="p-12 text-center text-[10px] font-black uppercase text-gray-500">Loading...</td></tr>
                            ) : (activeTab === "Enrolled" ? filteredBoardAdmissions : filteredStudents).length === 0 ? (
                                <tr><td colSpan="9" className="p-12 text-center text-[10px] font-black uppercase text-gray-500">No {activeTab === "Potential" ? "Board Students" : "Enrolled Students"} Found</td></tr>
                            ) : (
                                (activeTab === "Enrolled" ? filteredBoardAdmissions : filteredStudents).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => {
                                    const student = activeTab === "Potential" ? item : item.studentId;
                                    const details = student?.studentsDetails?.[0] || {};
                                    const exam = student?.examSchema?.[0] || {};
                                    const sessionExam = student?.sessionExamCourse?.[0] || {};

                                    return (
                                        <tr key={item._id} className={`transition-all group ${isDarkMode ? 'hover:bg-cyan-500/[0.03]' : 'hover:bg-gray-50'}`}>
                                            <td className="p-4 font-bold text-[10px] text-gray-400">
                                                {new Date(item.counselledDate || item.createdAt).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`text-[11px] font-black uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {item.studentName || details.studentName || "N/A"}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 font-bold uppercase">UID: {(student?._id || item.studentId || "").toString().slice(-8).toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-[11px] font-black italic tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                    {activeTab === "Potential" ? (details.board || "N/A") :
                                                        activeTab === "Counselling" ? `${item.boardId?.boardCourse || "N/A"} Class ${item.lastClass || ""}` :
                                                            (item.admissionNumber || "PENDING")}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-[11px] font-bold uppercase ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                    {activeTab === "Potential" ? (details.programme || "N/A") :
                                                        activeTab === "Counselling" ? (item.remarks || "No Remarks") :
                                                            (item.boardCourseName || item.boardId?.boardCourse || "N/A")}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-[11px] font-black uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {item.lastClass || details.lastClass || "N/A"}
                                                </span>
                                            </td>
                                            {activeTab === "Potential" && <td className="p-4"><span className="text-[11px] font-bold uppercase text-gray-400">{sessionExam.examTag || exam.examName || "N/A"}</span></td>}
                                            <td className="p-4"><span className={`text-[11px] font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.centre || details.centre || "N/A"}</span></td>
                                            <td className="p-4"><span className={`text-[11px] font-black tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{item.mobileNum || details.mobileNum || "N/A"}</span></td>

                                            {activeTab === "Counselling" && (
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] text-cyan-500 font-black border border-cyan-500/20">
                                                            {(item.counselledBy?.name || "A").charAt(0)}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase text-gray-500 truncate max-w-[100px]">{item.counselledBy?.name || "Admin"}</span>
                                                    </div>
                                                </td>
                                            )}

                                            {activeTab === "Enrolled" && (
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-black uppercase text-gray-500">Paid: ₹{item.totalPaidAmount}</span>
                                                        <span className="text-[9px] font-black uppercase text-cyan-500">Bal: ₹{item.totalExpectedAmount - item.totalPaidAmount}</span>
                                                    </div>
                                                </td>
                                            )}

                                            {activeTab === "Enrolled" && (
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] text-cyan-500 font-black border border-cyan-500/20">
                                                            {(item.createdBy?.name || "A").charAt(0)}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase text-gray-500 truncate max-w-[100px]">{item.createdBy?.name || "Admin"}</span>
                                                    </div>
                                                </td>
                                            )}

                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {activeTab === "Potential" ? (
                                                        <>
                                                            <button onClick={() => handleViewStudent(student)} title="View Details" className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-gray-700 hover:border-cyan-500 text-gray-400 hover:text-white transition-all"><FaEye size={12} /></button>
                                                            <button
                                                                onClick={() => handleOpenCounsellingModal(student)}
                                                                className="px-3 h-8 flex items-center justify-center gap-1.5 rounded-[4px] border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                                                            >
                                                                <span>Counsel</span>
                                                            </button>
                                                            {canCreate && (
                                                                <button
                                                                    onClick={() => navigate(`/board-course-admission/${student._id}`)}
                                                                    className="px-3 h-8 flex items-center justify-center gap-1.5 rounded-[4px] border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                                                                >
                                                                    <FaUserGraduate size={10} />
                                                                    <span>Enroll</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : activeTab === "Counselling" ? (
                                                        <>
                                                            <button onClick={() => handleViewStudent(student)} title="View Details" className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-gray-700 hover:border-cyan-500 text-gray-400 hover:text-white transition-all"><FaEye size={12} /></button>
                                                            {canEdit && (
                                                                <button
                                                                    onClick={() => handleEditCounselling(item)}
                                                                    title="Edit Counselling"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black transition-all"
                                                                >
                                                                    <FaEdit size={11} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => navigate(`/board-course-admission/${item._id}`)}
                                                                className="px-3 h-8 flex items-center justify-center gap-1.5 rounded-[4px] border border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                                                            >
                                                                <FaUserGraduate size={10} />
                                                                <span>Enroll Now</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCounselling(item._id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                            >
                                                                <FaTrash size={10} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleViewStudent(item.studentId)} 
                                                                title="View Details" 
                                                                className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-gray-700 hover:border-cyan-500 text-gray-400 hover:text-white transition-all"
                                                            >
                                                                <FaEye size={12} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditProfile(item.studentId)} 
                                                                title="Edit Profile" 
                                                                className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-gray-700 hover:border-amber-500 text-gray-400 hover:text-amber-500 transition-all"
                                                            >
                                                                <FaEdit size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(`/manage-board-admission/${item._id}`)}
                                                                className="px-3 h-8 flex items-center justify-center gap-1.5 rounded-[4px] border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                                                            >
                                                                <FaSync size={10} />
                                                                <span>Manage</span>
                                                            </button>
                                                        </div>
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
                        totalItems={activeTab === "Enrolled" ? filteredBoardAdmissions.length : filteredStudents.length}
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

            {showCounsellingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border p-6 md:p-8 shadow-2xl ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                    {editingCounsellingId ? 'Edit Counselling Record' : 'Board Course Counselling'}
                                </h3>
                                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1 italic">
                                    {editingCounsellingId ? 'Updating counselling details' : 'Adding details for board enrolment workflow'}
                                </p>
                            </div>
                            <button onClick={() => { setShowCounsellingModal(false); setEditingCounsellingId(null); setMobileCheck({ checking: false, taken: false, name: "" }); setEmailCheck({ checking: false, taken: false, name: "" }); }} className="text-gray-500 hover:text-white transition-colors p-2"><FaSync className="rotate-45" /></button>
                        </div>

                        <div className="space-y-8 flex-1 overflow-y-auto px-1 custom-scrollbar">
                            {/* Section 1: Personal & Identification */}
                            <div>
                                <h4 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4 border-l-4 border-cyan-500 pl-3">I. Personal Identification</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Student Name *</label>
                                        <input
                                            type="text"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="FULL LEGAL NAME"
                                            value={counsellingForm.studentName}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, studentName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Mobile Number *</label>
                                        <input
                                            type="text"
                                            maxLength="10"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${
                                                mobileCheck.taken
                                                    ? 'border-red-500 bg-red-500/5 text-red-400'
                                                    : isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'
                                            }`}
                                            placeholder="10-DIGIT MOBILE"
                                            value={counsellingForm.mobileNum}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, mobileNum: e.target.value.replace(/\D/g, ''), whatsappNumber: e.target.value.replace(/\D/g, '') })}
                                        />
                                        {mobileCheck.checking && <p className="text-[8px] text-gray-500 mt-1 font-bold">Checking...</p>}
                                        {!mobileCheck.checking && mobileCheck.taken && (
                                            <p className="text-[8px] text-red-400 mt-1 font-black uppercase tracking-wider">⚠ Already registered to: {mobileCheck.name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">WhatsApp Number</label>
                                        <input
                                            type="text"
                                            maxLength="10"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="MESSAGING CONTACT"
                                            value={counsellingForm.whatsappNumber}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Email Address</label>
                                        <input
                                            type="email"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${
                                                emailCheck.taken
                                                    ? 'border-red-500 bg-red-500/5 text-red-400'
                                                    : isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'
                                            }`}
                                            placeholder="E.G. MAIL@DOMAIN.COM"
                                            value={counsellingForm.studentEmail}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, studentEmail: e.target.value })}
                                        />
                                        {emailCheck.checking && <p className="text-[8px] text-gray-500 mt-1 font-bold">Checking...</p>}
                                        {!emailCheck.checking && emailCheck.taken && (
                                            <p className="text-[8px] text-red-400 mt-1 font-black uppercase tracking-wider">⚠ Already registered to: {emailCheck.name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Date of Birth</label>
                                        <input
                                            type="date"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            value={counsellingForm.dateOfBirth}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, dateOfBirth: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Gender</label>
                                        <select
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            value={counsellingForm.gender}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, gender: e.target.value })}
                                        >
                                            <option value="">SELECT GENDER</option>
                                            <option value="Male">MALE</option>
                                            <option value="Female">FEMALE</option>
                                            <option value="Other">OTHER</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Centre *</label>
                                        <select
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            value={counsellingForm.centre}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, centre: e.target.value })}
                                        >
                                            <option value="">SELECT CENTRE</option>
                                            {allowedCentres.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Programme *</label>
                                        <select
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            value={counsellingForm.programme}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, programme: e.target.value })}
                                        >
                                            <option value="">SELECT PROGRAMME</option>
                                            <option value="CRP">CRP</option>
                                            <option value="NCRP">NCRP</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">State</label>
                                        <select
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            value={counsellingForm.state}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, state: e.target.value })}
                                        >
                                            <option value="">SELECT STATE</option>
                                            {indianStates.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Pincode</label>
                                        <input
                                            type="text"
                                            maxLength="6"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="ZIP CODE"
                                            value={counsellingForm.pincode}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, pincode: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Full Address</label>
                                    <textarea
                                        className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase h-16 resize-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                        placeholder="COMPLETE PHYSICAL LOCATION"
                                        value={counsellingForm.address}
                                        onChange={(e) => setCounsellingForm({ ...counsellingForm, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Guardian Details */}
                            <div>
                                <h4 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4 border-l-4 border-cyan-500 pl-3">II. Guardian Oversight</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Guardian Name</label>
                                        <input
                                            type="text"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="NAME"
                                            value={counsellingForm.guardianName}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, guardianName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Guardian Mobile</label>
                                        <input
                                            type="text"
                                            maxLength="10"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="PRIMARY CONTACT"
                                            value={counsellingForm.guardianMobile}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, guardianMobile: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Guardian Email</label>
                                        <input
                                            type="email"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="EMAIL"
                                            value={counsellingForm.guardianEmail}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, guardianEmail: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Occupation</label>
                                        <input
                                            type="text"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="SECTOR"
                                            value={counsellingForm.occupation}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, occupation: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Academic Matrix */}
                            <div>
                                <h4 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4 border-l-4 border-cyan-500 pl-3">III. Academic Performance Matrix</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Last Class *</label>
                                        <select
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            value={counsellingForm.lastClass}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, lastClass: e.target.value })}
                                        >
                                            <option value="">SELECT</option>
                                            {classes.map(c => <option key={c._id} value={c.name || c.className}>{(c.name || c.className).toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Exam Identifier</label>
                                        <select
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            value={counsellingForm.examName}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, examName: e.target.value })}
                                        >
                                            <option value="">SELECT TAG</option>
                                            {examTags.map(tag => <option key={tag._id} value={tag.name}>{tag.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Result Status</label>
                                        <input
                                            type="text"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="PASSED/APPEARING"
                                            value={counsellingForm.examStatus}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, examStatus: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Aggregate %</label>
                                        <input
                                            type="text"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="TOTAL SCORE"
                                            value={counsellingForm.markAggregate}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, markAggregate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">STEM %</label>
                                        <input
                                            type="text"
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            placeholder="SCI & MATH"
                                            value={counsellingForm.scienceMathPercent}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, scienceMathPercent: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Current Institution</label>
                                    <input
                                        type="text"
                                        className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                        placeholder="SCHOOL / COLLEGE NAME"
                                        value={counsellingForm.schoolName}
                                        onChange={(e) => setCounsellingForm({ ...counsellingForm, schoolName: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Section 4: Board & Course Logistics */}
                            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20 shadow-lg shadow-cyan-500/5' : 'bg-cyan-50 border-cyan-100 shadow-sm'}`}>
                                <h4 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-4 border-l-4 border-cyan-500 pl-3">IV. Board & Course Logistics</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-cyan-600 mb-1.5">Primary Target Board *</label>
                                            <select
                                                className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                value={counsellingForm.boardId}
                                                onChange={(e) => setCounsellingForm({ ...counsellingForm, boardId: e.target.value, lastClass: "", selectedSubjectIds: [] })}
                                            >
                                                <option value="">CHOOSE BOARD SYSTEM...</option>
                                                {boards
                                                    .filter(b => boardCourseSubjects.some(bcs => (bcs.boardId?._id || bcs.boardId) === b._id))
                                                    .map(b => <option key={b._id} value={b._id}>{b.boardCourse.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-cyan-600 mb-1.5">Target Class *</label>
                                            <select
                                                className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                value={counsellingForm.lastClass}
                                                onChange={(e) => setCounsellingForm({ ...counsellingForm, lastClass: e.target.value, selectedSubjectIds: [] })}
                                                disabled={!counsellingForm.boardId}
                                            >
                                                <option value="">CHOOSE TARGET CLASS...</option>
                                                {boardCourseSubjects
                                                    .filter(bcs => (bcs.boardId?._id || bcs.boardId) === counsellingForm.boardId)
                                                    .map(bcs => {
                                                        const clsName = bcs.classId?.name || bcs.classId?.className || "";
                                                        return (
                                                            <option key={bcs.classId?._id} value={clsName}>
                                                                {clsName.toUpperCase()}
                                                            </option>
                                                        );
                                                    })
                                                }
                                            </select>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-1">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Strategy & Remarks</label>
                                        <textarea
                                            className={`w-full p-2.5 rounded-[4px] border text-[10px] font-bold uppercase h-[105px] transition-all resize-none ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 focus:border-indigo-500'}`}
                                            placeholder="ENTER COUNSELLING NOTES AND STRATEGY..."
                                            value={counsellingForm.remarks}
                                            onChange={(e) => setCounsellingForm({ ...counsellingForm, remarks: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-cyan-600 mb-1.5">Module Selection (Subjects) *</label>
                                        <div className={`grid grid-cols-1 gap-2 h-fit max-h-[160px] overflow-y-auto custom-scrollbar p-1 border rounded ${isDarkMode ? 'border-gray-800 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                                            {counsellingForm.boardId && counsellingForm.lastClass ? (
                                                boardCourseSubjects.find(bcs =>
                                                    (bcs.boardId?._id || bcs.boardId) === counsellingForm.boardId &&
                                                    (bcs.classId?.name || bcs.classId?.className) === counsellingForm.lastClass
                                                )?.subjects.map(s => (
                                                    <div
                                                        key={s.subjectId?._id}
                                                        onClick={() => {
                                                            const sid = s.subjectId?._id;
                                                            const ids = counsellingForm.selectedSubjectIds.includes(sid)
                                                                ? counsellingForm.selectedSubjectIds.filter(id => id !== sid)
                                                                : [...counsellingForm.selectedSubjectIds, sid];
                                                            setCounsellingForm({ ...counsellingForm, selectedSubjectIds: ids });
                                                        }}
                                                        className={`p-2.5 rounded-[4px] border cursor-pointer transition-all flex items-center justify-between group ${counsellingForm.selectedSubjectIds.includes(s.subjectId?._id)
                                                                ? 'bg-cyan-500 border-cyan-500 text-black shadow-md shadow-cyan-500/20'
                                                                : isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-500 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <span className="text-[9px] font-black uppercase truncate w-3/4">{s.subjectId?.subName}</span>
                                                        <span className={`text-[8px] font-black ${counsellingForm.selectedSubjectIds.includes(s.subjectId?._id) ? 'text-black/60' : 'text-cyan-500'}`}>₹{s.amount}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest italic leading-relaxed">
                                                        {!counsellingForm.boardId ? "Step 1: Select Board" : "Step 2: Select Class"}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 pb-2">
                                <button
                                    onClick={handleAddToCounselling}
                                    className="w-full py-4 bg-cyan-500 text-black font-black text-[12px] uppercase tracking-[0.3em] rounded-[4px] hover:bg-cyan-400 shadow-2xl shadow-cyan-500/30 transition-all transform active:scale-[0.98]"
                                >
                                    AUTHORIZE & RECORD COUNSELLING
                                </button>
                                <p className="text-[8px] text-center text-gray-500 font-bold uppercase tracking-[0.2em] mt-4 italic">
                                    Secure entry into board flow <span className="mx-2">|</span> ID: {counsellingForm.studentId || "NEW_LEAD"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoardAdmissionsContent;
