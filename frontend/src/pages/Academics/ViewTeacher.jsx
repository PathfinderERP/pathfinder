import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { toast } from "react-toastify";
import {
    FaArrowLeft, FaEdit, FaPhone, FaEnvelope,
    FaMapMarkerAlt, FaCalendarAlt, FaIdCard,
    FaUserShield, FaBook, FaChalkboardTeacher,
    FaBriefcase, FaBuilding
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";

const ViewTeacher = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeacher();
    }, [id]);

    const fetchTeacher = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/academics/teacher/fetch/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTeacher(data);
            } else {
                toast.error("Failed to fetch teacher details");
                navigate("/academics/teacher-list");
            }
        } catch (error) {
            console.error("Error fetching teacher:", error);
            toast.error("Error fetching teacher details");
            navigate("/academics/teacher-list");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout activePage="Academics">
                <div className={`flex items-center justify-center h-[60vh] transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-[#f8fafc]'}`}>
                    <div className="relative">
                        <div className={`w-16 h-16 border-4 border-t-cyan-500 rounded-full animate-spin ${isDarkMode ? 'border-cyan-500/20' : 'border-cyan-200'}`}></div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!teacher) return null;

    const SectionCard = ({ title, icon, children }) => (
        <div className={`group rounded-2xl border p-4 sm:p-6 transition-all duration-300 shadow-xl ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:border-cyan-400 shadow-md'}`}>
            <div className={`flex items-center gap-3 mb-6 border-b pb-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                    {icon}
                </div>
                <h3 className={`text-lg sm:text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {children}
            </div>
        </div>
    );

    const DataField = ({ label, value, subValue }) => (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
            <p className={`text-sm sm:text-base font-semibold break-words ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{value || "—"}</p>
            {subValue && <p className={`text-[10px] sm:text-xs font-medium ${isDarkMode ? 'text-cyan-500/70' : 'text-cyan-600'}`}>{subValue}</p>}
        </div>
    );

    return (
        <Layout activePage="Academics">
            <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-[#f8fafc]'}`}>
                <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-16 px-4 pt-4">

                    {/* Header Section */}
                    <div className={`relative rounded-2xl sm:rounded-3xl border overflow-hidden shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-r via-cyan-600/10 to-transparent ${isDarkMode ? 'from-blue-600/20' : 'from-blue-100'}`}></div>

                        <div className="relative pt-6 sm:pt-12 pb-6 sm:pb-8 px-6 sm:px-8">
                            <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-end">
                                {/* Profile Mockup or Image */}
                                <div className="relative shrink-0 group">
                                    <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                    <div className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 overflow-hidden shadow-2xl flex items-center justify-center ${isDarkMode ? 'border-[#1a1f24] bg-[#131619]' : 'border-white bg-gray-100'}`}>
                                        {teacher.profileImage && !teacher.profileImage.startsWith('undefined/') ? (
                                            <img
                                                src={teacher.profileImage}
                                                alt={teacher.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    console.error("Profile image failed to load:", teacher.profileImage);
                                                    e.target.style.display = 'none';
                                                    e.target.parentNode.querySelector('.fallback-initials').style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className={`fallback-initials ${teacher.profileImage && !teacher.profileImage.startsWith('undefined/') ? 'hidden' : 'flex'} w-full h-full items-center justify-center text-4xl sm:text-5xl font-bold ${isDarkMode ? 'text-cyan-500/30 bg-[#131619]' : 'text-cyan-500 bg-gray-100'}`}
                                        >
                                            {(teacher.name || "T").charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className={`absolute bottom-2 right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 bg-green-500 shadow-lg ${isDarkMode ? 'border-[#1a1f24]' : 'border-white'}`}></div>
                                </div>

                                <div className="flex-1 text-center md:text-left space-y-3 sm:space-y-2">
                                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 mb-2">
                                        <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {teacher.name}
                                        </h1>
                                        <span className={`px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border transition-all ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                            Teacher
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-4 sm:gap-x-6">
                                        <div className="flex items-center gap-2">
                                            <FaChalkboardTeacher className="text-cyan-500/70" />
                                            <span className={`text-base sm:text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{teacher.subject}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaIdCard className="text-cyan-500/70" />
                                            <span className={`font-mono text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500 font-bold'}`}>{teacher.employeeId}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaBuilding className="text-cyan-500/70" />
                                            <span className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.teacherDepartment} Dept</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex w-full md:w-auto gap-3 shrink-0">
                                    <button
                                        onClick={() => navigate("/academics/teacher-list")}
                                        className={`flex-1 md:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold transition-all border flex items-center justify-center gap-2 shadow-sm text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        <FaArrowLeft /> Back
                                    </button>
                                    <button
                                        onClick={() => navigate(`/academics/teacher-list`, { state: { editTeacher: teacher } })}
                                        className="flex-1 md:flex-none px-4 sm:px-5 py-2 sm:py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-extrabold transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 text-sm"
                                    >
                                        <FaEdit /> Edit
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className={`grid grid-cols-2 md:grid-cols-4 border-t backdrop-blur-sm ${isDarkMode ? 'border-gray-800 bg-[#131619]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                            <div className={`p-3 sm:p-4 text-center border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Type</p>
                                <p className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teacher.teacherType || "—"}</p>
                            </div>
                            <div className={`p-3 sm:p-4 text-center border-b md:border-b-0 border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Designation</p>
                                <p className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teacher.designation || "—"}</p>
                            </div>
                            <div className={`p-3 sm:p-4 text-center border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Subject</p>
                                <p className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{teacher.subject}</p>
                            </div>
                            <div className="p-3 sm:p-4 text-center">
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Board</p>
                                <p className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teacher.boardType || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-6 sm:space-y-8">
                        {/* Basic Info */}
                        <SectionCard title="Contact Information" icon={<FaUserShield />}>
                            <DataField label="Full Name" value={teacher.name} />
                            <DataField label="Official Email" value={teacher.email} />
                            <DataField label="Mobile Number" value={teacher.mobNum} />
                            <DataField label="Employee ID" value={teacher.employeeId} />
                            <DataField label="Password Reset" value="********" subValue="Default: password123" />
                        </SectionCard>

                        {/* Academic Role */}
                        <SectionCard title="Academic Role & Hierarchy" icon={<FaBook />}>
                            <DataField label="Department" value={teacher.teacherDepartment} />
                            <DataField label="Board/Division" value={teacher.boardType} />
                            <DataField label="Primary Subject" value={teacher.subject} />
                            <DataField label="Employment Type" value={teacher.teacherType} />
                            <DataField label="Designation" value={teacher.designation} />
                            <div className="sm:col-span-2 lg:col-span-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Administrative Responsibilities</p>
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {teacher.isDeptHod && <span className="px-3 sm:px-4 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] sm:text-xs font-bold">Department HOD</span>}
                                    {teacher.isBoardHod && <span className="px-3 sm:px-4 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] sm:text-xs font-bold">Board HOD</span>}
                                    {teacher.isSubjectHod && <span className="px-3 sm:px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-[10px] sm:text-xs font-bold">Subject HOD</span>}
                                    {!teacher.isDeptHod && !teacher.isBoardHod && !teacher.isSubjectHod && <span className="text-xs sm:text-sm text-gray-500 italic font-medium">No specialized HOD roles assigned</span>}
                                </div>
                            </div>
                        </SectionCard>

                        {/* Assigned Centres */}
                        <SectionCard title="Assigned Work Locations" icon={<FaMapMarkerAlt />}>
                            <div className="sm:col-span-3 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
                                {teacher.centres?.length > 0 ? teacher.centres.map((centre, idx) => (
                                    <div key={idx} className={`p-3 sm:p-4 border rounded-2xl flex items-center gap-3 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 group-hover:border-cyan-500/50' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
                                        <div className={`shrink-0 p-2 rounded-lg ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                                            <FaBuilding size={16} />
                                        </div>
                                        <span className={`text-xs sm:text-sm font-bold truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{centre.centreName}</span>
                                    </div>
                                )) : (
                                    <p className="text-xs sm:text-sm text-gray-500 italic col-span-full">No active centres assigned</p>
                                )}
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1a1f24; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333d47; border-radius: 10px; }
                @media (max-width: 480px) {
                    .xs\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }
            `}} />
        </Layout>
    );
};

export default ViewTeacher;
