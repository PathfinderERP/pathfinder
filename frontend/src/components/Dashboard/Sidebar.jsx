
import React, { useState } from "react";
import {
    FaChartBar, FaBullseye, FaBook, FaMoneyBillWave, FaUserTie, FaCogs, FaMobileAlt,
    FaBullhorn, FaThLarge, FaDatabase, FaChevronDown, FaChevronUp, FaTimes, FaUsers
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = ({ activePage, isOpen, toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userPermissions = user.permissions || [];
    const isSuperAdmin = user.role === "superAdmin";

    const [openMenus, setOpenMenus] = useState({
        "Master Data": activePage === "Master Data",
    });

    const menuItems = [
        { name: "CEO Control Tower", icon: <FaChartBar />, path: "/dashboard" },
        { name: "Admissions", icon: <FaBullseye />, path: "/admissions" },
        { name: "Academics", icon: <FaBook />, path: "/academics" },
        { name: "Finance & Fees", icon: <FaMoneyBillWave />, path: "/finance" },
        { name: "HR & Manpower", icon: <FaUserTie />, path: "/hr" },
        { name: "Operations", icon: <FaCogs />, path: "#" },
        { name: "Digital Portal", icon: <FaMobileAlt />, path: "#" },
        { name: "Marketing & CRM", icon: <FaBullhorn />, path: "#" },
        { name: "Franchise Mgmt", icon: <FaThLarge />, path: "#" },
        {
            name: "Master Data",
            icon: <FaDatabase />,
            subItems: [
                { name: "Class", path: "/master-data/class" },
                { name: "Exam Tag", path: "/master-data/exam-tag" },
                { name: "Department", path: "/master-data/department" },
                { name: "Centre", path: "/master-data/centre" },
            ],
        },
        { name: "Course Management", icon: <FaBook />, path: "/course-management" },
        { name: "User Management", icon: <FaUsers />, path: "/user-management" },
    ];

    const toggleMenu = (name) =>
        setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));

    // Filter menu items based on permissions
    const filteredMenuItems = menuItems.filter(item => {
        // SuperAdmin sees everything
        if (isSuperAdmin) return true;
        // Check if user has permission for this menu item
        return userPermissions.includes(item.name);
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
