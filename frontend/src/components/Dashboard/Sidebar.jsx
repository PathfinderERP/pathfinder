
import React, { useState, useEffect, useMemo } from "react";
import {
    FaCalendarAlt,
    FaChartBar, FaBullseye, FaBook, FaMoneyBillWave, FaUserTie, FaCogs, FaMobileAlt,
    FaBullhorn, FaThLarge, FaDatabase, FaChevronDown, FaChevronUp, FaTimes, FaUsers,
    FaShoppingCart, FaCalendarCheck, FaBuilding, FaIdCard, FaMapMarkerAlt, FaToggleOn,
    FaChalkboardTeacher, FaTable, FaFileUpload, FaCommentDots, FaMoneyCheckAlt, FaUserMinus,
    FaBirthdayCake, FaPizzaSlice, FaGlassCheers, FaCalendarTimes, FaHandshake, FaRegFileAlt, FaWindowClose, FaExclamationCircle
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

import { hasModuleAccess, hasPermission } from "../../config/permissions";

const Sidebar = ({ activePage, isOpen, toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));

    useEffect(() => {
        const handleStorageChange = () => {
            setUser(JSON.parse(localStorage.getItem("user") || "{}"));
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const userPermissions = user.permissions || [];
    const granularPermissions = user.granularPermissions || {};
    const isSuperAdmin = user.role === "superAdmin";

    const menuItems = useMemo(() => [
        { name: "Lead Management", icon: <FaBullseye />, path: "/lead-management", permissionModule: "leadManagement" },
        { name: "CEO Control Tower", icon: <FaChartBar />, path: "/dashboard", permissionModule: "ceoControlTower" },
        {
            name: "Admissions",
            icon: <FaBullseye />,
            permissionModule: "admissions",
            subItems: [
                { name: "All Leads", path: "/admissions", permissionSection: "allLeads" },
                { name: "Admissions", path: "/enrolled-students", permissionSection: "enrolledStudents" },
                { name: "Walk-in Registration", path: "/student-registration", permissionSection: "allLeads" },
                { name: "Telecalling Console", path: "/admissions/telecalling-console", permissionSection: "allLeads" },
            ]
        },
        {
            name: "Academics",
            icon: <FaBook />,
            permissionModule: "academics",
            subItems: [
                { name: "Teacher List", path: "/academics/teacher-list", permissionSection: "teachers" },
                { name: "Student Teacher Review", path: "/academics/student-teacher-review", permissionSection: "studentTeacherReview" },
                { name: "Live Class Review", path: "/academics/live-class-review", permissionSection: "liveClassReview" },
                { name: "CC Teacher Review", path: "/academics/cc-teacher-review", permissionSection: "ccTeacherReview" },
                { name: "HoD List", path: "/academics/hod-list", permissionSection: "hodList" },
                // { name: "Centre Management", path: "/academics/centre-management", permissionSection: "centreManagement" },
                { name: "RM List", path: "/academics/rm-list", permissionSection: "rmList" },
                { name: "Class Coordinator", path: "/academics/class-coordinator", permissionSection: "classCoordinator" },
                {
                    name: "Classes",
                    permissionSection: "classes",
                    subItems: [
                        { name: "Class List", path: "/academics/classes", permissionSection: "classes" },
                        { name: "Class Add", path: "/academics/class/add", permissionSection: "classes" },
                        { name: "Upcoming Class", path: "/academics/upcoming-class", permissionSection: "upcomingClass" },
                        { name: "Ongoing Class", path: "/academics/ongoing-class", permissionSection: "ongoingClass" },
                        { name: "Previous Class", path: "/academics/previous-class", permissionSection: "previousClass" },
                    ]
                },
                { name: "Mental Session Table", path: "/academics/mental-session-table", permissionSection: "mentalSessionTable" },
                {
                    name: "Class Management",
                    permissionSection: "classManagement",
                    subItems: [
                        { name: "Create Class", path: "/academics/class-list", permissionSection: "classManagement" },
                        { name: "Create Subject", path: "/academics/create-subject", permissionSection: "classManagement" },
                        { name: "Create Chapter", path: "/academics/create-chapter", permissionSection: "classManagement" },
                        { name: "Create Topic", path: "/academics/create-topic", permissionSection: "classManagement" },
                    ]
                },
                { name: "Section Leader Board", path: "/academics/section-leader-board", permissionSection: "sectionLeaderBoard" },
                { name: "Exam Leader Board", path: "/academics/exam-leader-board", permissionSection: "examLeaderBoard" },
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
                { name: "Cancel Cheque Payment", path: "/finance/cancel-cheque", permissionSection: "cancelCheque" },
                { name: "Cash Report", path: "/finance/cash/report", permissionSection: "cashReport" },
                { name: "Cash Transfer", path: "/finance/cash/transfer", permissionSection: "cashTransfer" },
                { name: "Cash Receive", path: "/finance/cash/receive", permissionSection: "cashReceive" },
                { name: "Transaction List", path: "/finance/transaction-list", permissionSection: "transactionReport" },
            ]
        },
        {
            name: "Sales",
            icon: <FaShoppingCart />,
            permissionModule: "sales",
            subItems: [
                { name: "Centre Target", path: "/sales/centre-target", permissionSection: "centreTarget" },
                { name: "Centre Rank", path: "/sales/centre-rank", permissionSection: "centreRank" },
                { name: "Target Achievement Report", path: "/sales/target-achievement-report", permissionSection: "targetAchievementReport" },
                { name: "Admission Report", path: "/sales/admission-report", permissionSection: "admissionReport" },
                { name: "Course Report", path: "/sales/course-report", permissionSection: "courseReport" },
                { name: "Discount Report Analysis", path: "/sales/discount-report", permissionSection: "discountReport" },
                { name: "Transaction Report", path: "/sales/transaction-report", permissionSection: "transactionReport" },
            ]
        },
        {
            name: "Employee Center",
            icon: <FaUserTie />,
            permissionModule: "employeeCenter",
            subItems: [
                { name: "Holiday List", path: "/hr/attendance/holiday-list", icon: <FaPizzaSlice /> },
                { name: "Holiday Calender", path: "/hr/attendance/holiday-management", icon: <FaGlassCheers /> },
                { name: "Mark Attendance", path: "/employee/attendance", icon: <FaMapMarkerAlt /> },
                { name: "Leave Management", path: "/hr/attendance/leave-request", icon: <FaCalendarTimes /> },
                { name: "Regularize Table", path: "/employee/regularization", icon: <FaHandshake /> },
                { name: "My Profile", path: "/employee/details", icon: <FaIdCard /> },
                { name: "Document Center", path: "/employee/documents", icon: <FaRegFileAlt /> },
                { name: "Training Center", path: "/employee/training", icon: <FaChalkboardTeacher /> },
                { name: "Feedback & Self Evaluation", path: "/hr/feedback", icon: <FaCommentDots /> },
                { name: "POSH Complaint", path: "/employee/posh", icon: <FaExclamationCircle /> },
                {
                    name: "Reimbursement Management",
                    icon: <FaCalendarCheck />,
                    subItems: [
                        { name: "Add Reimbursement", path: "/hr/reimbursement/add" },
                        // { name: "Reimbursement List", path: "/hr/reimbursement" },
                    ]
                },
                {
                    name: "Resign",
                    icon: <FaWindowClose />,
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
            restrictedToSuperAdmin: true,
            subItems: [
                // { name: "Overview", path: "/hr", icon: <FaThLarge />, permissionSection: "overview" },
                { name: "Employee Management", path: "/hr/employee/list", icon: <FaUsers />, permissionSection: "employees" },
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
                        { name: "Employees Attendance", path: "/hr/attendance/employee-logs", icon: <FaUsers /> },
                        //     { name: "Daily Attendance", path: "/hr/attendance/daily" },
                        //     { name: "Monthly Report", path: "/hr/attendance/monthly" },
                    ]
                },
                { name: "Training List", path: "/hr/training", icon: <FaChalkboardTeacher />, permissionSection: "training" },
                { name: "POSH Table", path: "/hr/posh-table", icon: <FaTable />, permissionSection: "posh" },
                { name: "Upload File", path: "/hr/documents/upload", icon: <FaFileUpload />, permissionSection: "upload" },
                { name: "All Feedback", path: "/hr/feedback", icon: <FaCommentDots />, permissionSection: "feedback" },
                { name: "Reimbursement List", path: "/hr/reimbursement", icon: <FaMoneyCheckAlt />, permissionSection: "reimbursement" },
                { name: "Resign Request", path: "/hr/resign-request", icon: <FaUserMinus />, permissionSection: "resign" },
                { name: "Birthday Lists", path: "/hr/birthday", icon: <FaBirthdayCake />, permissionSection: "birthday" },
            ]
        },
        { name: "Operations", icon: <FaCogs />, path: "#", permissionModule: "operations" },
        {
            name: "Master Data",
            icon: <FaDatabase />,
            permissionModule: "masterData",
            subItems: [
                { name: "Class", path: "/master-data/class", permissionSection: "class" },
                { name: "Exam Tag", path: "/master-data/exam-tag", permissionSection: "examTag" },
                { name: "Department", path: "/master-data/department", permissionSection: "department" },
                { name: "Designation", path: "/master-data/designation", permissionSection: "designation" },
                { name: "Centre", path: "/master-data/centre", permissionSection: "centre" },
                { name: "Batch", path: "/master-data/batch", permissionSection: "batch" },
                { name: "Source", path: "/master-data/source", permissionSection: "source" },
                { name: "Session", path: "/master-data/session", permissionSection: "session" },
                { name: "Script", path: "/master-data/script", permissionSection: "script" },
                { name: "Expense Category", path: "/master-data/expense-category", permissionSection: "category" },
                { name: "Expense Sub-Category", path: "/master-data/expense-subcategory", permissionSection: "subcategory" },
                { name: "Expenditure Type", path: "/master-data/expenditure-type", permissionSection: "expenditureType" },
            ],
        },
        {
            name: "Course Management",
            icon: <FaBook />,
            permissionModule: "courseManagement",
            subItems: [
                { name: "Course List", path: "/course-management", permissionSection: "courses" },
                { name: "Carry Forward", path: "/course-management/carry-forward", permissionSection: "courses" },
                { name: "Course Transfer", path: "/course-management/course-transfer", permissionSection: "courses" },
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
        const autoExpand = () => {
            const currentPath = location.pathname;
            const newOpenMenus = { ...openMenus };
            let changed = false;

            const traverse = (items) => {
                items.forEach(item => {
                    if (item.subItems) {
                        const isInside = item.subItems.some(sub =>
                            sub.path === currentPath ||
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
            if (changed) setOpenMenus(newOpenMenus);
        };

        autoExpand();
    }, [location.pathname, menuItems]);

    const toggleMenu = (name) =>
        setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));

    // Filter menu items based on permissions
    const filteredMenuItems = menuItems.filter(item => {
        if (isSuperAdmin) return true;
        if (item.permissionModule === 'employeeCenter') return true;

        if (item.permissionModule) {
            if (item.permissionSection) {
                const section = granularPermissions[item.permissionModule]?.[item.permissionSection];
                if (section) return true;
            }
            else if (hasModuleAccess(user, item.permissionModule)) {
                if (item.subItems) {
                    const accessibleSubItems = item.subItems.filter(sub => {
                        const section = granularPermissions[item.permissionModule]?.[sub.permissionSection];
                        return !!section;
                    });
                    if (accessibleSubItems.length > 0) return true;
                    if (item.permissionModule === 'employeeCenter') return true;
                    return false;
                }
                return true;
            }
        }
        return userPermissions.includes(item.name);
    }).map(item => {
        if (item.subItems && !isSuperAdmin) {
            const filteredSubItems = item.subItems.filter(sub => {
                if (sub.permissionSection) {
                    const section = granularPermissions[item.permissionModule]?.[sub.permissionSection];
                    return !!section;
                }
                return true;
            }).map(sub => {
                if (sub.subItems && !isSuperAdmin) {
                    const filteredNestedSubItems = sub.subItems.filter(nestedSub => {
                        if (nestedSub.permissionSection) {
                            const section = granularPermissions[item.permissionModule]?.[nestedSub.permissionSection];
                            return !!section;
                        }
                        return true;
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
            bg-[#1a1f24] text-gray-400 h-screen flex flex-col border-r border-gray-800 transition-all duration-300
            ${isOpen ? "w-64" : "w-0"} overflow-hidden fixed inset-y-0 left-0 z-50 lg:relative
        `}
        >
            {/* Logo + Close */}
            <div className="p-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                    <div className="bg-gray-700 p-2 rounded-lg">
                        <FaChartBar className="text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-wide text-cyan-400">Pathfinder ERP</h1>
                        <p className="text-xs text-gray-500">Education Cloud</p>
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
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${item.name === activePage
                                ? "bg-cyan-500 text-black font-semibold"
                                : "hover:bg-gray-800 hover:text-white"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-sm">{item.name}</span>
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
                                                    className="p-2 rounded-lg cursor-pointer text-sm transition-colors hover:text-white hover:bg-gray-800/50 flex justify-between items-center"
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
                                                                className={`p-2 rounded-lg cursor-pointer text-sm transition-colors ${location.pathname === nestedSub.path
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
                                                className={`p-2 rounded-lg cursor-pointer text-sm transition-colors flex items-center gap-2 ${location.pathname === sub.path
                                                    ? "text-cyan-400 font-semibold bg-gray-800"
                                                    : "hover:text-white hover:bg-gray-800/50"
                                                    }`}
                                            >
                                                {sub.icon && <span className="opacity-70">{sub.icon}</span>}
                                                <span>{sub.name}</span>
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
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold overflow-hidden shadow-lg shadow-cyan-500/10">
                        {user.profileImage && !user.profileImage.startsWith('undefined/') ? (
                            <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span>{user.name ? user.name.charAt(0).toUpperCase() : "U"}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{user.name || "User"}</p>
                        <p className="text-xs text-gray-500 truncate">{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Role"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
