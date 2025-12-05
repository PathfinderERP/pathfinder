// import React from "react";
// import { FaBolt, FaBell, FaRobot, FaMicrophone, FaMoon, FaSyncAlt, FaFileExport, FaBars } from "react-icons/fa";

// const Header = ({ toggleSidebar, sidebarOpen }) => {
//     return (
//         <header className="flex items-center justify-between p-6 bg-[#1a1f24] border-b border-gray-800">
//             {/* Hamburger Menu & Breadcrumbs */}
//             <div className="flex items-center gap-4">
//                 {/* Hamburger Button - Visible on mobile OR when sidebar is closed on desktop */}
//                 <button 
//                     onClick={toggleSidebar}
//                     className={`text-gray-400 hover:text-white transition-colors text-xl ${
//                         sidebarOpen ? 'md:hidden' : ''
//                     }`}
//                     title="Toggle sidebar"
//                 >
//                     <FaBars />
//                 </button>

//                 {/* Breadcrumbs */}
//                 <div className="flex items-center gap-2 text-sm text-gray-400">
//                     <span>Dashboard</span>
//                     <span>›</span>
//                     <span className="text-white font-semibold">CEO Control Tower</span>
//                 </div>
//             </div>

//             {/* Right Actions */}
//             <div className="flex items-center gap-6">
//                 {/* Online Users */}
//                 <div className="flex items-center gap-[-10px]">
//                     <div className="flex -space-x-2">
//                         <div className="w-8 h-8 rounded-full bg-cyan-600 border-2 border-[#1a1f24] flex items-center justify-center text-xs text-white font-bold">RK</div>
//                         <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-[#1a1f24] flex items-center justify-center text-xs text-white font-bold">PD</div>
//                         <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-[#1a1f24] flex items-center justify-center text-xs text-white font-bold">AD</div>
//                     </div>
//                     <span className="ml-2 text-xs text-gray-400">+3 online</span>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex items-center gap-3">
//                     <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-cyan-400 rounded-lg text-sm hover:bg-gray-700 transition-colors border border-gray-700">
//                         <FaSyncAlt /> Refresh
//                     </button>
//                     <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg text-sm hover:bg-cyan-400 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)]">
//                         <FaFileExport /> Export Report
//                     </button>
//                 </div>

//                 {/* Icons */}
//                 <div className="flex items-center gap-4 text-gray-400">
//                     <FaBolt className="hover:text-yellow-400 cursor-pointer" />
//                     <FaBell className="hover:text-white cursor-pointer" />
//                     <FaRobot className="hover:text-cyan-400 cursor-pointer" />
//                     <FaMicrophone className="hover:text-white cursor-pointer" />
//                     <FaMoon className="hover:text-white cursor-pointer" />
//                 </div>
//             </div>
//         </header>
//     );
// };

// export default Header;






import React from "react";
import { FaBars, FaSignOutAlt, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Header = ({ toggleSidebar }) => {
    const navigate = useNavigate();

    // Get logged-in user info
    const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
    const userName = userInfo.name || "User";
    const userRole = userInfo.role || "";

    const handleLogout = () => {
        // Clear all localStorage data
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Redirect to login page
        navigate("/login");
    };

    const getRoleDisplayName = (role) => {
        if (role === "superAdmin") return "SuperAdmin";
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <header className="flex items-center justify-between p-4 bg-[#1a1f24] border-b border-gray-800">
            <div className="flex items-center gap-4">
                {/* Hamburger Menu */}
                <button
                    onClick={toggleSidebar}
                    className="text-gray-400 hover:text-white transition-colors text-xl"
                    title="Toggle sidebar"
                >
                    <FaBars />
                </button>

                {/* Breadcrumb */}
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                    <span>Dashboard</span>
                    <span>›</span>
                    <span className="text-white font-semibold">Pathfinder ERP</span>
                </div>
            </div>

            {/* Right Section - User Info & Logout */}
            <div className="flex items-center gap-4">
                {/* User Info - Clickable ONLY for SuperAdmin */}
                {userRole === "superAdmin" ? (
                    <div
                        onClick={() => navigate("/profile")}
                        className="hidden sm:flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
                        title="View Profile"
                    >
                        <div className="w-8 h-8 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400 font-bold">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-semibold">{userName}</span>
                            <span className="text-xs text-gray-400">{getRoleDisplayName(userRole)}</span>
                        </div>
                    </div>
                ) : (
                    <div
                        className="hidden sm:flex items-center gap-2 text-sm p-2"
                        title="Profile access restricted to Super Admins"
                    >
                        <div className="w-8 h-8 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400 font-bold">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-semibold">{userName}</span>
                            <span className="text-xs text-gray-400">{getRoleDisplayName(userRole)}</span>
                        </div>
                    </div>
                )}

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors"
                    title="Logout"
                >
                    <FaSignOutAlt />
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
