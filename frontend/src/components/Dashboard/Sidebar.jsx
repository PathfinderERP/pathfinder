
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
        { name: "CEO Control Tower", icon: <FaChartBar />, path: "/dashboard", permissionModule: "ceoControlTower" },
        { name: "Admissions", icon: <FaBullseye />, path: "/admissions", permissionModule: "admissionsSales" },
        { name: "Academics", icon: <FaBook />, path: "/academics", permissionModule: "academics" },
        { name: "Finance & Fees", icon: <FaMoneyBillWave />, path: "/finance", permissionModule: "financeFees" },
        { name: "Sales", icon: <FaShoppingCart />, path: "/sales", permissionModule: "admissionsSales" },
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
            ],
        },
        { name: "Course Management", icon: <FaBook />, path: "/course-management", permissionModule: "courseManagement", permissionSection: "courses" },
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
                // Check if user has ANY access (create, edit, or delete) to this section
                const section = granularPermissions[item.permissionModule]?.[item.permissionSection];
                if (section && (section.create || section.edit || section.delete)) {
                    return true;
                }
            } 
            // Standard module check
            else if (hasModuleAccess(user, item.permissionModule)) {
                // For Master Data, check if any sub-items are accessible
                if (item.subItems) {
                    const accessibleSubItems = item.subItems.filter(sub => {
                        const section = granularPermissions[item.permissionModule]?.[sub.permissionSection];
                        return section && (section.create || section.edit || section.delete);
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
                return section && (section.create || section.edit || section.delete);
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
                                    <div
                                        key={idx}
                                        onClick={() => navigate(sub.path)}
                                        className={`p-2 rounded-lg cursor-pointer text-sm transition-colors ${location.pathname === sub.path
                                            ? "text-cyan-400 font-semibold bg-gray-800"
                                            : "hover:text-white hover:bg-gray-800/50"
                                            }`}
                                    >
                                        {sub.name}
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
