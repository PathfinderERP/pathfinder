
import React, { useState, useEffect, useMemo } from "react";
import {
    FaCalendarAlt, FaHistory, FaBars, FaTimes, FaTasks,
    FaChartBar, FaBullseye, FaBook, FaMoneyBillWave, FaUserTie, FaCogs, FaMobileAlt,
    FaBullhorn, FaThLarge, FaDatabase, FaChevronDown, FaChevronUp, FaUsers,
    FaShoppingCart, FaCalendarCheck, FaBuilding, FaIdCard, FaMapMarkerAlt, FaToggleOn,
    FaChalkboardTeacher, FaTable, FaFileUpload, FaCommentDots, FaMoneyCheckAlt, FaUserMinus,
    FaBirthdayCake, FaPizzaSlice, FaGlassCheers, FaCalendarTimes, FaHandshake, FaRegFileAlt, FaWindowClose, FaExclamationCircle,
    FaFlag, FaGraduationCap
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

import { hasModuleAccess, hasPermission } from "../../config/permissions";

const Sidebar = ({ activePage, isOpen, toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
    const [unviewedCount, setUnviewedCount] = useState(0);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        const currentUser = JSON.stringify(data.user);
                        const storedUser = localStorage.getItem("user");

                        // Only update if data actually changed to avoid unnecessary re-renders
                        if (currentUser !== storedUser) {
                            localStorage.setItem("user", currentUser);
                            setUser(data.user);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to refresh user profile", err);
            }
        };

        fetchUserProfile();

        const handleStorageChange = () => {
            setUser(JSON.parse(localStorage.getItem("user") || "{}"));
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const userPermissions = user.permissions || [];
    const granularPermissions = user.granularPermissions || {};
    const isSuperAdmin = Array.isArray(user.role)
        ? user.role.some(r => typeof r === "string" && (r.toLowerCase().replace(/\s+/g, "") === "superadmin"))
        : typeof user.role === "string" && (user.role.toLowerCase().replace(/\s+/g, "") === "superadmin");

    const isDigital = Array.isArray(user.role)
        ? user.role.some(r => typeof r === "string" && (r.toLowerCase() === "digital"))
        : typeof user.role === "string" && (user.role.toLowerCase() === "digital");

    useEffect(() => {
        const fetchUnviewedCount = async () => {
            if (location.pathname === "/task-workflow/tasks") {
                setUnviewedCount(0);
                return;
            }
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await fetch(`${import.meta.env.VITE_API_URL}/task-workflow/tasks/unviewed-count`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUnviewedCount(data.count || 0);
                }
            } catch (err) {
                console.error("Failed to fetch unviewed tasks count", err);
            }
        };

        fetchUnviewedCount();

        const intervalId = setInterval(fetchUnviewedCount, 30000);

        const handleTasksUpdated = () => {
            fetchUnviewedCount();
        };
        window.addEventListener("tasks-updated", handleTasksUpdated);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("tasks-updated", handleTasksUpdated);
        };
    }, [location.pathname]);

    const menuItems = useMemo(() => [
        { name: "Dashboard", icon: <FaThLarge />, path: "/dashboard" },
        {
            name: "Task Workflow",
            icon: <FaTasks />,
            permissionModule: "taskWorkflow",
            subItems: [
                { name: "Tasks", path: "/task-workflow/tasks", permissionSection: "tasks" },
                { name: "Assign Task", path: "/task-workflow/assign-task", permissionSection: "assignTask" }
            ]
        },
        {
            name: "Tracking & Flagging",
            icon: <FaFlag />,
            permissionModule: "trackingFlagging",
            subItems: [
                { name: "Daily Center Tracking", path: "/daily-center-tracking", permissionSection: "dailyCenterTracking" },
                //{ name: "Red Flag Desk", path: "/red-flag-desk", permissionSection: "redFlagDesk" }
            ]
        },
        {
            name: "Daily Tracking Log",
            icon: <FaHistory />,
            permissionModule: "dailyTrackingLog",
            subItems: [
                {
                    name: "My Daily Log",
                    path: "/daily-tracking-log?tab=myLog",
                    icon: <FaTasks />,
                    permissionModule: "dailyTrackingLog",
                    permissionSection: "myDailyLog"
                },
                {
                    name: "Log Tracking",
                    path: "/daily-tracking-log?tab=deptBoard",
                    icon: <FaBuilding />,
                    permissionModule: "dailyTrackingLog",
                    permissionSection: "logTracking"
                }
            ]
        },
        // { name: "Community", icon: <FaUsers />, path: "/community" },
        {
            name: "Lead Management",
            icon: <FaBullseye />,
            permissionModule: "leadManagement",
            subItems: [
                { name: "All Leads", path: "/lead-management", permissionSection: "leads" },
                { name: "Conversion Report", path: "/lead-management/conversion-report", permissionSection: "leads" },
                { name: "Teacher Schedule", path: "/lead-management/teacher-schedule", permissionSection: "leads" },
                { name: "Campaigns/Ads", path: "/lead-management/campaigns", permissionSection: "campaignAds" },
            ]
        },
        { name: "Marketing & CRM", icon: <FaBullhorn />, path: "/marketing-crm", permissionModule: "marketingCRM" },
        { name: "CEO Control Tower", icon: <FaChartBar />, path: "/ceo-control-tower", permissionModule: "ceoControlTower" },
        {
            name: "Admissions",
            icon: <FaBullseye />,
            permissionModule: "admissions",
            subItems: [
                { name: "Counselled Students", path: "/admissions", permissionSection: "allLeads" },
                { name: "Board Course Admission", path: "/board-admissions", permissionSection: "boardCourseAdmission" },
                //{ name: "Board Admission Analysis", path: "/admissions/board-analysis", permissionSection: "boardCourseAdmission" },
                { name: "Enrolled Students", path: "/enrolled-students", permissionSection: "enrolledStudents" },
                //{ name: "Section Allotment", path: "/admissions/section-allotment", permissionSection: "sectionAllotment" },
                // { name: "Walk-in Registration", path: "/student-registration", permissionSection: "allLeads" },
                //{ name: "Telecalling Console", path: "/admissions/telecalling-console", permissionSection: "telecallingConsole" },

                {
                    name: "PNTSE",
                    icon: <FaGraduationCap />,
                    permissionModule: "pntse",
                    subItems: [
                        { name: "All Students", path: "/pntse/all-students", permissionSection: "allStudents" },
                        { name: "Add Student", path: "/pntse/add-student", permissionSection: "addStudent" },
                    ]
                },
            ]
        },
        {
            name: "Academics",
            icon: <FaBook />,
            permissionModule: "academics",
            subItems: [
                { name: "Teacher List", path: "/academics/teacher-list", permissionSection: "teachers" },
                //{ name: "Student Teacher Review", path: "/academics/student-teacher-review", permissionSection: "studentTeacherReview" },
                // { name: "Live Class Review", path: "/academics/live-class-review", permissionSection: "liveClassReview" },
                // { name: "CC Teacher Review", path: "/academics/cc-teacher-review", permissionSection: "ccTeacherReview" },
                { name: "HoD List", path: "/academics/hod-list", permissionSection: "hodList" },
                // { name: "Centre Management", path: "/academics/centre-management", permissionSection: "centreManagement" },
                // { name: "RM List", path: "/academics/rm-list", permissionSection: "rmList" },
                // { name: "Class Coordinator", path: "/academics/class-coordinator", permissionSection: "classCoordinator" },
                {
                    name: "Classes",
                    permissionSection: "classes",
                    subItems: [
                        { name: "Class List", path: "/academics/classes", permissionSection: "classes" },
                        { name: "Class Add", path: "/academics/class/add", permissionSection: "classes", permissionAction: "create" },
                        { name: "Upcoming Class", path: "/academics/upcoming-class", permissionSection: "upcomingClass" },
                        { name: "Ongoing Class", path: "/academics/ongoing-class", permissionSection: "ongoingClass" },
                        { name: "Previous Class", path: "/academics/previous-class", permissionSection: "previousClass" },
                    ]
                },
                // { name: "Mental Session Table", path: "/academics/mental-session-table", permissionSection: "mentalSessionTable" },
                {
                    name: "Class Management",
                    permissionSection: "classManagement",
                    subItems: [
                        { name: "Create Class", path: "/academics/class-list", permissionSection: "classManagement", permissionAction: "create" },
                        { name: "Create Subject", path: "/academics/create-subject", permissionSection: "classManagement" },
                        { name: "Create Chapter", path: "/academics/create-chapter", permissionSection: "classManagement" },
                        { name: "Create Topic", path: "/academics/create-topic", permissionSection: "classManagement" },
                    ]
                },
                // { name: "Section Leader Board", path: "/academics/section-leader-board", permissionSection: "sectionLeaderBoard" },
                // { name: "Exam Leader Board", path: "/academics/exam-leader-board", permissionSection: "examLeaderBoard" },
                { name: "Teacher Routine Schedule", path: "/academics/teacher-routine", permissionSection: "teacherRoutine" },
                { name: "Students Schedule", path: "/academics/students-schedule", permissionSection: "teacherRoutine" },
            ]
        },

        {
            name: "Finance & Fees",
            icon: <FaMoneyBillWave />,
            permissionModule: "financeFees",
            subItems: [
                { name: "Installment Payment", path: "/finance/installment-payment", permissionSection: "installmentPayment" },
                { name: "Fee Due List", path: "/finance/fee-due-list", permissionSection: "feeDueList" },
                { name: "Cheque Management", path: "/finance/cheque-management", permissionSection: "chequeManagement" },
                { name: "Cheque Deposit Entry", path: "/finance/cheque-deposit-entry", permissionSection: "chequeDepositEntry" },
                { name: "Cancel Cheque Payment", path: "/finance/cancel-cheque", permissionSection: "cancelCheque" },
                { name: "Cash Report", path: "/finance/cash/report", permissionSection: "cashReport" },
                { name: "Cash Transfer", path: "/finance/cash/transfer", permissionSection: "cashTransfer" },
                { name: "Cash Receive", path: "/finance/cash/receive", permissionSection: "cashReceive" },
                { name: "Transaction List", path: "/finance/transaction-list", permissionSection: "transactionReport" },
                { name: "Expense Category", path: "/master-data/finance-expense-category", permissionSection: "financeExpenseCategory" },
                { name: "Expenses", path: "/finance/expenses", permissionSection: "expense" },
                { name: "Add Expense", path: "/finance/expense/create", permissionSection: "addExpense" },
                //{ name: "Analysis", path: "/finance/analysis", permissionSection: "financialAnalysis" },
                //{ name: "Center Tagging", path: "/finance/center-tagging", permissionSection: "centerTagging" },
                //{ name: "Budget", path: "/finance/budget", permissionSection: "budget" },
                // { name: "Cash Centre", path: "/finance/cash-centre", permissionSection: "cashCentre" },
                { name: "Part Time Teachers", path: "/finance/part-time-teachers", permissionSection: "partTimeTeachers" },
                // { name: "Finance Person", path: "/finance/finance-person", permissionSection: "financePerson" },
                // { name: "Vendor Management", path: "/finance/vendor-management", permissionSection: "vendorManagement" },
                { name: "Pay Employee", path: "/finance/pay-employee", permissionSection: "payEmployee" },
                { name: "Payment Analysis", path: "/finance/payment-analysis", permissionSection: "paymentAnalysis" },
                // { name: "Budget Analysis", path: "/finance/budget-analysis", permissionSection: "budgetAnalysis" },
            ]
        },
        {
            name: "Sales",
            icon: <FaShoppingCart />,
            permissionModule: "sales",
            subItems: [
                { name: "Centre Target", path: "/sales/centre-target", permissionSection: "centreTarget" },
                { name: "Comparison Analysis", path: "/sales/comparison-analysis", permissionSection: "centreTarget" },
                //{ name: "Weekly Weekends Target", path: "/sales/weekly-target", permissionSection: "centreTarget" },
                { name: "Weekends Target", path: "/sales/final-weekend-target", permissionSection: "centreTarget" },
                { name: "Course Target", path: "/sales/course-target", permissionSection: "centreTarget" },
                { name: "Centre Rank", path: "/sales/centre-rank", permissionSection: "centreRank" },
                { name: "User Rank", path: "/sales/user-rank", permissionSection: "centreRank" },
                //{ name: "Target Achievement Report", path: "/sales/target-achievement-report", permissionSection: "targetAchievementReport" },
                //{ name: "Admission Report", path: "/sales/admission-report", permissionSection: "admissionReport" },
                //{ name: "Course Report", path: "/sales/course-report", permissionSection: "courseReport" },
                { name: "Admission & Course Report", path: "/sales/admission-course-report", permissionSection: "admissionReport" },
                { name: "Average Admission Fee", path: "/sales/average-admission-fee", permissionSection: "admissionReport" },
                { name: "Discount Report Analysis", path: "/sales/discount-report", permissionSection: "discountReport" },
                { name: "Discount Comparison Analysis", path: "/sales/discount-comparison", permissionSection: "discountReport" },
                //{ name: "Transaction Report", path: "/sales/transaction-report", permissionSection: "transactionReport" },
                { name: "Daily Collection", path: "/sales/daily-collection", permissionSection: "transactionReport" },
            ]
        },
        {
            name: "Employee Center",
            icon: <FaUserTie />,
            permissionModule: "employeeCenter",
            subItems: [
                { name: "Mark Attendance", path: "/employee/attendance", icon: <FaMapMarkerAlt />, permissionSection: "markAttendance" },

                { name: "Holiday List", path: "/hr/attendance/holiday-list", icon: <FaPizzaSlice />, permissionSection: "holidayList" },
                // { name: "Holiday Calender", path: "/hr/attendance/holiday-management", icon: <FaGlassCheers />, permissionSection: "holidayCalendar" },
                { name: "Leave Management", path: "/hr/attendance/leave-request", icon: <FaCalendarTimes />, permissionSection: "leaveManagement" },
                { name: "Regularize Table", path: "/employee/regularization", icon: <FaHandshake />, permissionSection: "regularization" },
                { name: "Team Regularization", path: "/employee/team-regularization", icon: <FaUsers />, permissionSection: "regularization" },
                { name: "My Profile", path: "/employee/details", icon: <FaIdCard />, permissionSection: "profile" },
                { name: "Document Center", path: "/employee/documents", icon: <FaRegFileAlt />, permissionSection: "documents" },
                { name: "Training Center", path: "/employee/training", icon: <FaChalkboardTeacher />, permissionSection: "training" },
                { name: "Feedback & Self Evaluation", path: "/employee/feedback", icon: <FaCommentDots />, permissionSection: "feedback" },
                { name: "POSH Complaint", path: "/employee/posh", icon: <FaExclamationCircle />, permissionSection: "posh" },
                {
                    name: "Reimbursement Management",
                    icon: <FaCalendarCheck />,
                    permissionSection: "reimbursement",
                    subItems: [
                        { name: "Add Reimbursement", path: "/hr/reimbursement/add" },
                        // { name: "Reimbursement List", path: "/hr/reimbursement" },
                    ]
                },
                {
                    name: "Resign",
                    icon: <FaWindowClose />,
                    permissionSection: "resign",
                    subItems: [
                        { name: "Resign Button", path: "/hr/resign/button" },
                        { name: "My Request Status", path: "/hr/resign/button" },
                    ]
                }
            ]
        },
        {
            name: "HR & Manpower",
            icon: <FaUserTie />,
            permissionModule: "hrManpower",
            subItems: [
                // { name: "Overview", path: "/hr", icon: <FaThLarge />, permissionSection: "overview" },
                {
                    name: "Employee Management",
                    icon: <FaUsers />,
                    permissionSection: "employees",
                    subItems: [
                        { name: "Normal Staff", path: "/hr/employee/list?tab=staff" },
                        { name: "Teachers", path: "/hr/employee/list?tab=teacher" },
                        { name: "HODs", path: "/hr/employee/list?tab=hod" },
                    ]
                },
                { name: "Candidate Hiring", path: "/hr/candidate-hiring", icon: <FaUserTie />, permissionSection: "candidateHiring" },
                {
                    name: "Attendance Management",
                    icon: <FaCalendarCheck />,
                    subItems: [
                        { name: "Holiday Management", path: "/hr/attendance/holiday-management", permissionSection: "holidayManagement" },
                        { name: "Holiday List", path: "/hr/attendance/holiday-list", permissionSection: "holidayList" },
                        { name: "Leaves Type", path: "/hr/attendance/leave-type", permissionSection: "leaveType" },
                        { name: "Leave Management", path: "/hr/attendance/leave-management", permissionSection: "leaveManagement" },
                        { name: "Leave Request", path: "/hr/attendance/leave-request", permissionSection: "leaveRequest" },
                        { name: "Regularize Table", path: "/hr/attendance/regularize-table", permissionSection: "regularizeTable" },
                        { name: "Employees Attendance", path: "/hr/attendance/employee-logs", icon: <FaUsers />, permissionSection: "attendance" },
                        //     { name: "Daily Attendance", path: "/hr/attendance/daily" },
                        //     { name: "Monthly Report", path: "/hr/attendance/monthly" },
                    ]
                },
                { name: "Training List", path: "/hr/training", icon: <FaChalkboardTeacher />, permissionSection: "training" },
                { name: "POSH Table", path: "/hr/posh-table", icon: <FaTable />, permissionSection: "posh" },
                { name: "Upload File", path: "/hr/documents/upload", icon: <FaFileUpload />, permissionSection: "upload" },
                { name: "All Feedback", path: "/hr/feedback", icon: <FaCommentDots />, permissionSection: "feedback" },
                { name: "Reimbursement List", path: "/hr/reimbursement", icon: <FaMoneyCheckAlt />, permissionSection: "reimbursement" },
                { name: "Salary Expense", path: "/hr/salary-expense", icon: <FaMoneyBillWave />, permissionSection: "salaryExpense" },
                { name: "Resign Request", path: "/hr/resign-request", icon: <FaUserMinus />, permissionSection: "resign" },
                { name: "Birthday Lists", path: "/hr/birthday", icon: <FaBirthdayCake />, permissionSection: "birthday" },
            ]
        },
        {
            name: "Operations",
            icon: <FaCogs />,
            permissionModule: "operations",
            subItems: [
                { name: "Store", path: "/operations/store", permissionSection: "store" },
                { name: "Marketing", path: "/operations/marketing", permissionSection: "marketing" },
                { name: "Academics", path: "/operations/academics", permissionSection: "academics" },
            ]
        },
        {
            name: "Master Data",
            icon: <FaDatabase />,
            permissionModule: "masterData",
            subItems: [
                { name: "Class", path: "/master-data/class", permissionSection: "class" },
                { name: "Exam Tag", path: "/master-data/exam-tag", permissionSection: "examTag" },
                { name: "Department", path: "/master-data/department", permissionSection: "department" },
                { name: "Designation", path: "/master-data/designation", permissionSection: "designation" },
                { name: "Board", path: "/master-data/board", permissionSection: "board" },
                { name: "Board Course Subject", path: "/master-data/board-course-subject", permissionSection: "boardCourse" },
                { name: "Subject", path: "/master-data/subject", permissionSection: "subject" },
                { name: "Centre", path: "/master-data/centre", permissionSection: "centre" },
                { name: "Batch", path: "/master-data/batch", permissionSection: "batch" },
                { name: "Source", path: "/master-data/source", permissionSection: "source" },
                { name: "Session", path: "/master-data/session", permissionSection: "session" },
                { name: "Script", path: "/master-data/script", permissionSection: "script" },
                { name: "Expense Category", path: "/master-data/expense-category", permissionSection: "category" },
                { name: "Expense Sub-Category", path: "/master-data/expense-subcategory", permissionSection: "subcategory" },
                { name: "Expenditure Type", path: "/master-data/expenditure-type", permissionSection: "expenditureType" },
                { name: "Account", path: "/master-data/account", permissionSection: "account" },
                { name: "Zone Management", path: "/master-data/zone", permissionSection: "zone" },
                { name: "Follow-up Feedback", path: "/master-data/follow-up-feedback", permissionSection: "followUpFeedback" },
                { name: "School Data", path: "/master-data/school-data", permissionSection: "schoolData" },
            ],
        },
        {
            name: "Course Management",
            icon: <FaBook />,
            permissionModule: "courseManagement",
            subItems: [
                { name: "Course List", path: "/course-management", permissionSection: "courses" },
                { name: "Carry Forward", path: "/course-management/carry-forward", permissionSection: "courses" },
                //{ name: "Course Transfer", path: "/course-management/course-transfer", permissionSection: "courses" },
            ]
        },
        {
            name: "Center Petty Cash Management",
            icon: <FaMoneyBillWave />,
            permissionModule: "pettyCashManagement",
            subItems: [
                { name: "Petty Cash centre", path: "/petty-cash/centre", permissionSection: "pettyCashCentre" },
                { name: "Add Petty Cash", path: "/petty-cash/add-cash", permissionSection: "addPettyCash" },
                { name: "Petty Cash Approval", path: "/petty-cash/request-approval", permissionSection: "pettyCashRequestApproval" },
                { name: "Add Petty Cash Expenditure", path: "/petty-cash/add-expenditure", permissionSection: "addExpenditure" },
                { name: "Petty Cash Expenditure Approval", path: "/petty-cash/approval", permissionSection: "expenditureApproval" },
            ]
        },

        { name: "User Management", icon: <FaUsers />, path: "/user-management", permissionModule: "userManagement" },
    ], []);

    const [openMenus, setOpenMenus] = useState({});

    useEffect(() => {
        const currentPath = location.pathname + location.search;
        setOpenMenus(prev => {
            const newOpenMenus = { ...prev };
            let changed = false;

            const traverse = (items) => {
                items.forEach(item => {
                    if (item.subItems) {
                        const isInside = item.subItems.some(sub =>
                            sub.path === currentPath ||
                            (sub.path === "/daily-tracking-log?tab=myLog" && currentPath === "/daily-tracking-log") ||
                            (sub.subItems && sub.subItems.some(nested => nested.path === currentPath))
                        );
                        if (isInside && !newOpenMenus[item.name]) {
                            newOpenMenus[item.name] = true;
                            changed = true;
                        }
                        traverse(item.subItems);
                    }
                });
            };

            traverse(menuItems);
            return changed ? newOpenMenus : prev;
        });
    }, [location.pathname, location.search, menuItems]);

    const toggleMenu = (name) =>
        setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));

    // Filter menu items based on permissions
    const filteredMenuItems = menuItems.filter(item => {
        if (item.name === "Dashboard" || item.name === "Community" || item.name === "Employee Center" || item.name === "PNTSE") return true;
        if (item.restrictedToSuperAdmin && !isSuperAdmin) return false;
        if (isSuperAdmin) return true;
        // if (item.permissionModule === 'employeeCenter') return true; // Removed legacy override

        if (item.permissionModule) {
            if (item.permissionSection) {
                if (item.permissionAction) {
                    return hasPermission(user, item.permissionModule, item.permissionSection, item.permissionAction);
                }
                const section = granularPermissions[item.permissionModule]?.[item.permissionSection];
                return !!section;
            }
            else if (hasModuleAccess(user, item.permissionModule)) {
                if (item.subItems) {
                    const accessibleSubItems = item.subItems.filter(sub => {
                        if (isDigital && item.permissionModule === 'courseManagement') return true;
                        if (sub.permissionAction) {
                            return hasPermission(user, item.permissionModule, sub.permissionSection, sub.permissionAction);
                        }
                        const section = granularPermissions[item.permissionModule]?.[sub.permissionSection];
                        return !!section;
                    });
                    if (accessibleSubItems.length > 0) return true;
                    // if (item.permissionModule === 'employeeCenter') return true; // Removed legacy override
                    return false;
                }
                return true;
            }

            // Strict Mode: If granular permissions are active (object exists), 
            // do NOT fall back to legacy permissions for modules that are granularly controlled.
            if (Object.keys(granularPermissions).length > 0) {
                return false;
            }
        }
        return userPermissions.includes(item.name);
    }).map(item => {
        if (item.subItems && !isSuperAdmin) {
            const filteredSubItems = item.subItems.filter(sub => {
                if (sub.restrictedToSuperAdmin && !isSuperAdmin) return false;
                if (sub.name === "Reimbursement Management") return true;
                const permModule = sub.permissionModule || item.permissionModule;
                if (permModule) {
                    if (sub.permissionSection) {
                        if (isDigital && permModule === 'courseManagement') return true;
                        if (sub.permissionAction) {
                            return hasPermission(user, permModule, sub.permissionSection, sub.permissionAction);
                        }
                        const section = granularPermissions[permModule]?.[sub.permissionSection];
                        return !!section;
                    }
                    return hasModuleAccess(user, permModule);
                }
                return userPermissions.includes(sub.name);
            }).map(sub => {
                if (sub.subItems && !isSuperAdmin) {
                    const filteredNestedSubItems = sub.subItems.filter(nestedSub => {
                        if (nestedSub.name === "Add Reimbursement") return true;
                        const nestedPermModule = nestedSub.permissionModule || sub.permissionModule || item.permissionModule;
                        if (nestedPermModule) {
                            if (nestedSub.permissionSection) {
                                if (nestedSub.permissionAction) {
                                    return hasPermission(user, nestedPermModule, nestedSub.permissionSection, nestedSub.permissionAction);
                                }
                                const section = granularPermissions[nestedPermModule]?.[nestedSub.permissionSection];
                                return !!section;
                            }
                            return hasModuleAccess(user, nestedPermModule);
                        }
                        return userPermissions.includes(nestedSub.name);
                    });
                    if (filteredNestedSubItems.length > 0) {
                        return { ...sub, subItems: filteredNestedSubItems };
                    }
                    return null;
                }
                return sub;
            }).filter(Boolean);

            if (filteredSubItems.length > 0) {
                return { ...item, subItems: filteredSubItems };
            }
            return null;
        }
        return item;
    }).filter(Boolean);

    return (
        <div
            className={`
            bg-white dark:bg-[#1a1f24] text-gray-600 dark:text-gray-400 h-screen flex flex-col border-r border-gray-200 dark:border-gray-800 transition-all duration-300
            ${isOpen ? "w-64" : "w-0"} overflow-hidden fixed inset-y-0 left-0 z-50 lg:relative
        `}
        >
            {/* Logo + Close */}
            <div className="p-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-gray-700 p-2 rounded">
                        <FaChartBar className="text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide text-cyan-600 dark:text-cyan-400">Pathfinder ERP</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Education Cloud</p>
                    </div>
                </div>

                <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
                    <FaTimes />
                </button>
            </div>

            {/* Menu */}
            <nav className="flex-1 overflow-y-auto px-4 space-y-2">
                {filteredMenuItems.map((item, i) => (
                    <div key={i}>
                        <div
                            onClick={() =>
                                item.subItems ? toggleMenu(item.name) : navigate(item.path)
                            }
                            className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${item.name === activePage
                                ? "bg-cyan-500 text-white dark:text-black font-semibold shadow-lg shadow-cyan-500/20"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-sm">{item.name}</span>
                                {item.name === "Task Workflow" && unviewedCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse flex items-center justify-center min-w-[18px] h-[18px] ml-2">
                                        {unviewedCount}
                                    </span>
                                )}
                            </div>
                            {item.subItems && (
                                <span className="text-xs">
                                    {openMenus[item.name] ? <FaChevronUp /> : <FaChevronDown />}
                                </span>
                            )}
                        </div>

                        {item.subItems && openMenus[item.name] && (
                            <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-2">
                                {item.subItems.map((sub, idx) => (
                                    <div key={idx}>
                                        {sub.subItems ? (
                                            <div>
                                                <div
                                                    onClick={() => toggleMenu(sub.name)}
                                                    className="p-2 rounded cursor-pointer text-sm transition-colors hover:text-white hover:bg-gray-800/50 flex justify-between items-center"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {sub.icon && <span className="opacity-70">{sub.icon}</span>}
                                                        <span>{sub.name}</span>
                                                    </div>
                                                    <span className="text-xs">
                                                        {openMenus[sub.name] ? <FaChevronUp /> : <FaChevronDown />}
                                                    </span>
                                                </div>
                                                {openMenus[sub.name] && (
                                                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-2">
                                                        {sub.subItems.map((nestedSub, nestedIdx) => (
                                                            <div
                                                                key={nestedIdx}
                                                                onClick={() => navigate(nestedSub.path)}
                                                                className={`p-2 rounded cursor-pointer text-sm transition-colors ${(location.pathname + location.search) === nestedSub.path
                                                                    ? "text-cyan-400 font-semibold bg-gray-800"
                                                                    : "hover:text-white hover:bg-gray-800/50"
                                                                    }`}
                                                            >
                                                                {nestedSub.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => navigate(sub.path)}
                                                className={`p-2 rounded cursor-pointer text-sm transition-colors flex items-center justify-between ${(location.pathname + location.search) === sub.path || (sub.path === "/daily-tracking-log?tab=myLog" && (location.pathname + location.search) === "/daily-tracking-log")
                                                    ? "text-cyan-400 font-semibold bg-gray-800"
                                                    : "hover:text-white hover:bg-gray-800/50"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {sub.icon && <span className="opacity-70">{sub.icon}</span>}
                                                    <span>{sub.name}</span>
                                                </div>
                                                {sub.name === "Tasks" && unviewedCount > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse flex items-center justify-center min-w-[18px] h-[18px]">
                                                        {unviewedCount}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* Profile */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold overflow-hidden shadow-lg shadow-cyan-500/10">
                        {user.profileImage && !user.profileImage.startsWith('undefined/') ? (
                            <img
                                src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL}${user.profileImage}`}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <span className={user.profileImage && !user.profileImage.startsWith('undefined/') ? 'hidden' : ''}>
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">{user.name || "User"}</p>
                        {/* <p className="text-xs text-gray-500 truncate">
                            {user.role ? (() => {
                                const roles = Array.isArray(user.role) ? user.role : [user.role];
                                return roles.map(r => {
                                    if (r === 'centerIncharge') return 'Center Incharge';
                                    if (r === 'zonalManager') return 'Zonal Manager';
                                    if (r === 'HOD') return 'HOD';
                                    if (r === 'superAdmin') return 'SuperAdmin';
                                    if (r === 'hr') return 'HR';
                                    return (typeof r === 'string' && r.length > 0) ? r.charAt(0).toUpperCase() + r.slice(1) : r;
                                }).join(", ");
                            })() : "Role"}
                        </p> */}
                        {user.designation && (
                            <p className="text-[10px] text-cyan-500 dark:text-cyan-400 font-medium truncate mt-0.5">
                                {user.designation}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
