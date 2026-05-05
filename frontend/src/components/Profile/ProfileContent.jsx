import React, { useState, useEffect } from "react";
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaMapMarkerAlt, FaLock, FaSave, FaEye, FaEyeSlash } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const ProfileContent = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobNum: "",
        currentPassword: "",
        newPassword: "",
    });

    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/profile/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setProfile(data.user);
                setFormData({
                    name: data.user.name,
                    email: data.user.email,
                    mobNum: data.user.mobNum,
                    currentPassword: "",
                    newPassword: "",
                });
            } else {
                toast.error("Failed to fetch profile");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast.error("Error fetching profile");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem("token");

            // Prepare update data
            const updateData = {
                name: formData.name,
                email: formData.email,
                mobNum: formData.mobNum,
            };

            // Only include password fields if user wants to change password
            if (formData.newPassword) {
                if (!formData.currentPassword) {
                    toast.error("Please enter your current password");
                    setSaving(false);
                    return;
                }
                updateData.currentPassword = formData.currentPassword;
                updateData.newPassword = formData.newPassword;
            }

            const response = await fetch(`${apiUrl}/profile/me`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Profile updated successfully!");

                // Update localStorage with new user data
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const updatedUser = {
                    ...currentUser,
                    name: data.user.name,
                    email: data.user.email,
                    mobNum: data.user.mobNum,
                    profileImage: data.user.profileImage || currentUser.profileImage // Preserve or update image
                };
                localStorage.setItem("user", JSON.stringify(updatedUser));

                // Dispatch event to notify other components (Header/Sidebar)
                window.dispatchEvent(new Event('storage'));

                // If password was changed, logout and redirect to login
                if (formData.newPassword) {
                    toast.info("Password changed! Please login with your new password.");
                    setTimeout(() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        navigate("/login");
                    }, 2000);
                } else {
                    // Refresh profile data
                    fetchProfile();
                }
            } else {
                toast.error(data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Error updating profile");
        } finally {
            setSaving(false);
        }
    };

    const getRoleDisplayName = (role) => {
        if (role === "superAdmin") return "SuperAdmin";
        return role?.charAt(0).toUpperCase() + role?.slice(1);
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            superAdmin: "bg-red-500/20 text-red-400 border-red-500/50",
            admin: "bg-blue-500/20 text-blue-400 border-blue-500/50",
            teacher: "bg-green-500/20 text-green-400 border-green-500/50",
            telecaller: "bg-purple-500/20 text-purple-400 border-purple-500/50",
            counsellor: "bg-orange-500/20 text-orange-400 border-orange-500/50",
        };
        return colors[role] || "bg-gray-500/20 text-gray-400 border-gray-500/50";
    };

    if (loading) {
        return (
            <div className={`flex-1 p-6 overflow-y-auto flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading profile...</div>
            </div>
        );
    }

    return (
        <div className={`flex-1 p-6 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Profile</h2>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>View and update your personal information</p>
                </div>

                {/* Profile Card */}
                <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    {/* Profile Header */}
                    <div className={`p-6 border-b ${isDarkMode ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-gray-800' : 'bg-gradient-to-r from-cyan-50 to-blue-50 border-gray-100'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl border-4 ${isDarkMode ? 'bg-cyan-900 text-cyan-400 border-cyan-500/30' : 'bg-cyan-100 text-cyan-600 border-cyan-200'}`}>
                                {profile?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{profile?.name}</h3>
                                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded border mt-2 ${getRoleBadgeColor(profile?.role)}`}>
                                    {getRoleDisplayName(profile?.role)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Read-only fields */}
                             <div>
                                <label className={`block text-sm mb-2 flex items-center gap-2 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <FaIdCard /> Employee ID
                                </label>
                                <input
                                    type="text"
                                    value={profile?.employeeId || ""}
                                    disabled
                                    className={`w-full border rounded-lg p-3 cursor-not-allowed font-bold ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                />
                            </div>

                            <div>
                                <label className={`block text-sm mb-2 flex items-center gap-2 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <FaMapMarkerAlt /> Centres
                                </label>
                                <input
                                    type="text"
                                    value={profile ? (
                                        (profile.centres && profile.centres.length > 0)
                                            ? profile.centres.map(c => `${c.centreName} (${c.enterCode})`).join(", ")
                                            : (profile.centre ? `${profile.centre.centreName} (${profile.centre.enterCode})` : "N/A")
                                    ) : ""}
                                    disabled
                                    className={`w-full border rounded-lg p-3 cursor-not-allowed font-bold ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                />
                            </div>

                            {/* Editable fields */}
                            <div>
                                <label className={`block text-sm mb-2 flex items-center gap-2 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <FaUser /> Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full border rounded-lg p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                            </div>

                            <div>
                                <label className={`block text-sm mb-2 flex items-center gap-2 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <FaEnvelope /> Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full border rounded-lg p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                            </div>

                            <div>
                                <label className={`block text-sm mb-2 flex items-center gap-2 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <FaPhone /> Mobile Number *
                                </label>
                                <input
                                    type="text"
                                    name="mobNum"
                                    required
                                    value={formData.mobNum}
                                    onChange={handleChange}
                                    className={`w-full border rounded-lg p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                            </div>
                        </div>

                        {/* Password Change Section */}
                        <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <h4 className="text-lg font-bold text-cyan-500 mb-4 uppercase tracking-tighter italic">Change Password <span className={`${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>(Optional)</span></h4>
                            <p className="text-xs text-gray-500 mb-4">Leave blank if you don't want to change your password</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={`block text-sm mb-2 flex items-center gap-2 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <FaLock /> Current Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleChange}
                                            placeholder="Enter current password"
                                            className={`w-full border rounded-lg p-3 pr-10 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm mb-2 flex items-center gap-2 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <FaLock /> New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            placeholder="Enter new password"
                                            className={`w-full border rounded-lg p-3 pr-10 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {formData.newPassword && (
                                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                                        <FaLock />
                                        <span>After changing your password, you will be logged out and need to login with your new password.</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="mt-8 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaSave />
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileContent;
