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






import React, { useState, useEffect, useRef } from "react";
import { FaBars, FaSignOutAlt, FaUser, FaCheckCircle, FaBell, FaTimes, FaCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ThemeToggle from "../ThemeToggle";
import io from "socket.io-client";

const getSocketURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace('/api', '');
    }
    return "http://localhost:5000";
};

const Header = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = React.useState(JSON.parse(localStorage.getItem("user") || "{}"));
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);

    React.useEffect(() => {
        const handleStorageChange = () => {
            setUserInfo(JSON.parse(localStorage.getItem("user") || "{}"));
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    React.useEffect(() => {
        fetchNotifications();
        
        const socket = io(getSocketURL(), {
            transports: ["websocket", "polling"],
            withCredentials: true
        });

        socket.on("connect", () => {
            socket.emit("join_room", userInfo._id);
        });

        socket.on("new_notification", (notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            // Play a small beep or just glow
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Fetch notifications error:", error);
        }
    };

    const handleMarkAsRead = async (id, post) => {
        try {
            const token = localStorage.getItem("token");
            await fetch(`${import.meta.env.VITE_API_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            
            if (post) {
                navigate("/dashboard");
                // Trigger glowing effect via custom event
                window.dispatchEvent(new CustomEvent('highlight_post', { detail: { postId: post } }));
            }
            setShowNotifications(false);
        } catch (error) {
            console.error("Mark as read error:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem("token");
            await fetch(`${import.meta.env.VITE_API_URL}/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Mark all as read error:", error);
        }
    };

    const handleClearAll = async () => {
        try {
            const token = localStorage.getItem("token");
            await fetch(`${import.meta.env.VITE_API_URL}/notifications/clear`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications([]);
            setUnreadCount(0);
            setShowNotifications(false);
        } catch (error) {
            console.error("Clear all error:", error);
        }
    };

    const userName = userInfo.name || "User";
    const userRole = userInfo.role || "";

    const handleLogout = () => {
        const ConfirmToast = ({ closeToast }) => (
            <div className="flex flex-col gap-3">
                <p className="text-white font-semibold text-base">
                    Are you sure you want to logout?
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => {
                            closeToast();
                            localStorage.removeItem("token");
                            localStorage.removeItem("user");
                            toast.success(
                                <div className="flex items-center gap-2">
                                    <FaCheckCircle className="text-cyan-400 text-xl" />
                                    <span className="font-semibold">Logged out successfully!</span>
                                </div>,
                                {
                                    position: "top-right",
                                    autoClose: 2000,
                                    hideProgressBar: false,
                                    closeOnClick: true,
                                    pauseOnHover: true,
                                    style: {
                                        background: "linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)",
                                        color: "white",
                                        borderRadius: "12px",
                                    }
                                }
                            );
                            setTimeout(() => {
                                navigate("/");
                            }, 500);
                        }}
                        className="px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-400"
                    >Yes</button>
                    <button onClick={closeToast} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">No</button>
                </div>
            </div>
        );

        toast(<ConfirmToast />, {
            position: "top-center",
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: true,
            style: {
                background: "linear-gradient(135deg, #164e63 0%, #0e7490 100%)",
                color: "white",
                borderRadius: "12px",
                minWidth: "320px",
                maxWidth: "90vw"
            }
        });
    };

    const getRoleDisplayName = (role) => {
        if (role === "superAdmin") return "SuperAdmin";
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <>
            {/* Full Screen Glow Effect for Unread Notifications */}
            {unreadCount > 0 && (
                <div className="fixed inset-0 pointer-events-none z-[9998] shadow-[inset_0_0_100px_rgba(6,182,212,0.4)] animate-pulse border-[3px] border-cyan-500/30 transition-opacity duration-1000" />
            )}
            
            <header className="flex items-center justify-between p-4 bg-white dark:bg-[#1a1f24] border-b border-gray-200 dark:border-gray-800 transition-colors relative z-40">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xl">
                        <FaBars />
                    </button>
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>Dashboard</span>
                        <span>›</span>
                        <span className="text-gray-900 dark:text-white font-semibold">Pathfinder ERP</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />

                    {userRole === "superAdmin" ? (
                        <div onClick={() => navigate("/profile")} className="hidden sm:flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 p-2 rounded-lg transition-colors">
                            <div className="w-8 h-8 rounded-full bg-cyan-900 border border-cyan-500/30 flex items-center justify-center overflow-hidden">
                                {userInfo.profileImage && !userInfo.profileImage.startsWith('undefined/') ? (
                                    <img src={userInfo.profileImage.startsWith('http') ? userInfo.profileImage : `${import.meta.env.VITE_API_URL}${userInfo.profileImage}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                ) : null}
                                <span className={`text-cyan-400 font-bold ${userInfo.profileImage && !userInfo.profileImage.startsWith('undefined/') ? 'hidden' : ''}`}>{userName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-900 dark:text-white font-semibold">{userName}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{getRoleDisplayName(userRole)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden sm:flex items-center gap-2 text-sm p-2">
                            <div className="w-8 h-8 rounded-full bg-cyan-900 border border-cyan-500/30 flex items-center justify-center overflow-hidden">
                                {userInfo.profileImage && !userInfo.profileImage.startsWith('undefined/') ? (
                                    <img src={userInfo.profileImage.startsWith('http') ? userInfo.profileImage : `${import.meta.env.VITE_API_URL}${userInfo.profileImage}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                ) : null}
                                <span className={`text-cyan-400 font-bold ${userInfo.profileImage && !userInfo.profileImage.startsWith('undefined/') ? 'hidden' : ''}`}>{userName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-900 dark:text-white font-semibold">{userName}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{getRoleDisplayName(userRole)}</span>
                            </div>
                        </div>
                    )}

                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/50 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-500/30">
                        <FaSignOutAlt />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>

                {/* Notifications - Centered */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" ref={notificationRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative p-3 rounded-full transition-all duration-300 ${unreadCount > 0 ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,1)] scale-110 bg-cyan-500/10' : 'text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                        <FaBell size={26} className={unreadCount > 0 ? "animate-pulse" : ""} />
                        
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-black leading-none text-white bg-red-600 rounded-full border-2 border-white dark:border-[#1a1f24] shadow-xl z-10">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Glowing Popup Banner */}
                    {unreadCount > 0 && !showNotifications && (
                        <div className="absolute top-[130%] left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold px-5 py-2.5 rounded-full text-xs shadow-[0_0_20px_rgba(6,182,212,0.9)] animate-pulse border border-cyan-400/50 pointer-events-none z-[100]">
                            You have {unreadCount > 9 ? '9+' : unreadCount} new notification{unreadCount !== 1 ? 's' : ''}!
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-600 rotate-45 border-l border-t border-cyan-400/50"></div>
                        </div>
                    )}

                {/* Notification Dropdown */}
                {showNotifications && (
                    <div className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 w-[90vw] sm:w-[400px] bg-white dark:bg-[#1a1f24] shadow-2xl rounded-2xl border border-gray-200 dark:border-gray-800 z-[100] overflow-hidden transition-all">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#131619]">
                            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Notifications</h3>
                            <div className="flex gap-3">
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllAsRead} className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">Mark all read</button>
                                )}
                                <button onClick={handleClearAll} className="text-xs font-semibold text-red-500 dark:text-red-400 hover:underline">Clear all</button>
                            </div>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm font-semibold">
                                    No new notifications!
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div 
                                        key={notif._id} 
                                        className={`p-4 border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!notif.isRead ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900 flex-shrink-0 flex items-center justify-center border border-cyan-200 dark:border-cyan-800 shadow-sm">
                                                {notif.sender?.profileImage ? (
                                                    <img src={notif.sender.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm tracking-tighter">{notif.sender?.name?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm tracking-tight ${!notif.isRead ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {notif.message}
                                                </p>
                                                <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mt-1.5 flex justify-between items-center">
                                                    <span>{new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString()}</span>
                                                    <div className="flex gap-3">
                                                        {notif.post && (
                                                            <button onClick={() => handleMarkAsRead(notif._id, notif.post)} className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-bold transition-colors">
                                                                View Details
                                                            </button>
                                                        )}
                                                        {!notif.isRead && !notif.post && (
                                                            <button onClick={() => handleMarkAsRead(notif._id)} className="hover:text-cyan-500 transition-colors">
                                                                Mark Read
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {!notif.isRead && (
                                                <FaCircle className="text-cyan-500 text-[10px] mt-1.5 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
        </>
    );
};

export default Header;
