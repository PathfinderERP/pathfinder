
import React, { useState } from "react";
import {
    FaChartBar, FaBullseye, FaBook, FaMoneyBillWave, FaUserTie, FaCogs, FaMobileAlt,
    FaBullhorn, FaThLarge, FaDatabase, FaChevronDown, FaChevronUp, FaTimes, FaUsers, FaShoppingCart
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

import { hasModuleAccess, hasPermission } from "../../config/permissions";

const Sidebar = ({ activePage, isOpen, toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userPermissions = user.permissions || [];
    const granularPermissions = user.granularPermissions || {};
    const isSuperAdmin = user.role === "superAdmin";

    const [openMenus, setOpenMenus] = useState({
        "Master Data": activePage === "Master Data",
    });

    const menuItems = [
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
                { name: "Telecalling Console", path: "/admissions", permissionSection: "allLeads" },
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
                { name: "Centre Management", path: "/academics/centre-management", permissionSection: "centreManagement" },
                { name: "RM List", path: "/academics/rm-list", permissionSection: "rmList" },
                { name: "Class Coordinator", path: "/academics/class-coordinator", permissionSection: "classCoordinator" },
                {
                    name: "Classes",
                    permissionSection: "classes",
                    subItems: [
                        { name: "Class List", path: "/academics/classes", permissionSection: "classes" },
                        { name: "Class Add", path: "/academics/class/add", permissionSection: "classes" },
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
        { name: "Finance & Fees", icon: <FaMoneyBillWave />, path: "/finance", permissionModule: "financeFees" },
        // Removed duplicate Finance & Fees line if present in original, but sticking to replacing block.
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
        { name: "HR & Manpower", icon: <FaUserTie />, path: "/hr", permissionModule: "hrManpower" },
        { name: "Operations", icon: <FaCogs />, path: "#", permissionModule: "operations" },
        { name: "Digital Portal", icon: <FaMobileAlt />, path: "#", permissionModule: "digitalPortal" },
        { name: "Marketing & CRM", icon: <FaBullhorn />, path: "#", permissionModule: "marketingCRM" },
        { name: "Franchise Mgmt", icon: <FaThLarge />, path: "#", permissionModule: "franchiseMgmt" },
        {
            name: "Master Data",
            icon: <FaDatabase />,
            permissionModule: "masterData",
            subItems: [
                { name: "Class", path: "/master-data/class", permissionSection: "class" },
                { name: "Exam Tag", path: "/master-data/exam-tag", permissionSection: "examTag" },
                { name: "Department", path: "/master-data/department", permissionSection: "department" },
                { name: "Centre", path: "/master-data/centre", permissionSection: "centre" },
                { name: "Batch", path: "/master-data/batch", permissionSection: "batch" }, // Assuming 'batch' permission key
                { name: "Source", path: "/master-data/source", permissionSection: "source" },
                { name: "Session", path: "/master-data/session", permissionSection: "session" },
                { name: "Script", path: "/master-data/script", permissionSection: "script" },
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
        { name: "User Management", icon: <FaUsers />, path: "/user-management", permissionModule: "userManagement" },
    ];

    const toggleMenu = (name) =>
        setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));

    // Filter menu items based on permissions
    const filteredMenuItems = menuItems.filter(item => {
        // SuperAdmin sees everything
        if (isSuperAdmin) return true;

        // Check granular permissions first
        if (item.permissionModule) {
            // Special case for items that map to a specific section (like Course Management)
            if (item.permissionSection) {
                // Check if user has access to this section (existence implies at least view access)
                const section = granularPermissions[item.permissionModule]?.[item.permissionSection];
                if (section) {
                    return true;
                }
            }
            // Standard module check
            else if (hasModuleAccess(user, item.permissionModule)) {
                // For Master Data, check if any sub-items are accessible
                if (item.subItems) {
                    const accessibleSubItems = item.subItems.filter(sub => {
                        const section = granularPermissions[item.permissionModule]?.[sub.permissionSection];
                        return !!section;
                    });
                    // Only show parent if at least one child is accessible
                    if (accessibleSubItems.length > 0) {
                        // We'll filter subItems later in the render or modify the item copy here
                        // For now, just return true if module is accessible, but better to be precise
                        return true;
                    }
                    return false;
                }
                return true;
            }
        }

        // Fallback to legacy permissions
        return userPermissions.includes(item.name);
    }).map(item => {
        // Filter sub-items if they exist
        if (item.subItems && !isSuperAdmin) {
            const filteredSubItems = item.subItems.filter(sub => {
                const section = granularPermissions[item.permissionModule]?.[sub.permissionSection];
                return !!section;
            });
            return { ...item, subItems: filteredSubItems };
        }
        return item;
    });

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
                            {item.badge && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {item.badge}
                                </span>
                            )}
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
                                            /* Nested Sub Menu (e.g. Class Management) */
                                            <div>
                                                <div
                                                    onClick={() => toggleMenu(sub.name)}
                                                    className="p-2 rounded-lg cursor-pointer text-sm transition-colors hover:text-white hover:bg-gray-800/50 flex justify-between items-center"
                                                >
                                                    <span>{sub.name}</span>
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
                                            /* Standard Sub Item */
                                            <div
                                                onClick={() => navigate(sub.path)}
                                                className={`p-2 rounded-lg cursor-pointer text-sm transition-colors ${location.pathname === sub.path
                                                    ? "text-cyan-400 font-semibold bg-gray-800"
                                                    : "hover:text-white hover:bg-gray-800/50"
                                                    }`}
                                            >
                                                {sub.name}
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
                    <div className="w-10 h-10 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400 font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                        <p className="text-white text-sm font-semibold">{user.name || "User"}</p>
                        <p className="text-xs text-gray-500">{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Role"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
