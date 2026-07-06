import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaTags, FaLayerGroup, FaChalkboardTeacher, FaMapMarkerAlt, FaMoneyBillWave, FaListAlt, FaSitemap, FaDatabase, FaCalendarAlt, FaCode, FaUsers, FaIdCard, FaGlobe, FaCommentDots, FaSchool } from 'react-icons/fa';

const MasterDataContent = () => {
    const navigate = useNavigate();

    // Get current user's granular permissions
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
    })();
    const isSuperAdmin = typeof user.role === 'string' && user.role.toLowerCase().replace(/\s+/g, '') === 'superadmin';
    const masterDataPerms = user.granularPermissions?.masterData || {};

    // Helper: can user see this section?
    const canView = (sectionKey) => isSuperAdmin || !!masterDataPerms[sectionKey];

    const masterDataItems = [
        {
            title: "Class Management",
            description: "Manage classes and standards",
            icon: <FaChalkboardTeacher className="text-3xl text-cyan-400" />,
            path: "/master-data/class",
            color: "border-cyan-500",
            permissionSection: "class"
        },
        {
            title: "Exam Tags",
            description: "Manage exam categories and tags",
            icon: <FaTags className="text-3xl text-purple-400" />,
            path: "/master-data/exam-tag",
            color: "border-purple-500",
            permissionSection: "examTag"
        },
        {
            title: "Departments",
            description: "Manage organizational departments",
            icon: <FaLayerGroup className="text-3xl text-green-400" />,
            path: "/master-data/department",
            color: "border-green-500",
            permissionSection: "department"
        },
        {
            title: "Designation",
            description: "Manage employee designations",
            icon: <FaIdCard className="text-3xl text-yellow-400" />,
            path: "/master-data/designation",
            color: "border-yellow-500",
            permissionSection: "designation"
        },
        {
            title: "Centre Management",
            description: "Manage centres and branches",
            icon: <FaMapMarkerAlt className="text-3xl text-orange-400" />,
            path: "/master-data/centre",
            color: "border-orange-500",
            permissionSection: "centre"
        },
        {
            title: "Board",
            description: "Manage educational boards",
            icon: <FaSchool className="text-3xl text-blue-400" />,
            path: "/master-data/board",
            color: "border-blue-500",
            permissionSection: "board"
        },
        {
            title: "Board Course Subject",
            description: "Manage board course subjects",
            icon: <FaDatabase className="text-3xl text-sky-400" />,
            path: "/master-data/board-course-subject",
            color: "border-sky-500",
            permissionSection: "boardCourse"
        },
        {
            title: "Subject",
            description: "Manage subjects",
            icon: <FaLayerGroup className="text-3xl text-violet-400" />,
            path: "/master-data/subject",
            color: "border-violet-500",
            permissionSection: "subject"
        },
        {
            title: "Batch",
            description: "Manage batches",
            icon: <FaUsers className="text-3xl text-lime-400" />,
            path: "/master-data/batch",
            color: "border-lime-500",
            permissionSection: "batch"
        },
        {
            title: "Source",
            description: "Manage lead sources",
            icon: <FaGlobe className="text-3xl text-emerald-400" />,
            path: "/master-data/source",
            color: "border-emerald-500",
            permissionSection: "source"
        },
        {
            title: "Session",
            description: "Manage academic sessions",
            icon: <FaCalendarAlt className="text-3xl text-rose-400" />,
            path: "/master-data/session",
            color: "border-rose-500",
            permissionSection: "session"
        },
        {
            title: "Script",
            description: "Manage telecalling scripts",
            icon: <FaCode className="text-3xl text-fuchsia-400" />,
            path: "/master-data/script",
            color: "border-fuchsia-500",
            permissionSection: "script"
        },
        {
            title: "Expenditure Type",
            description: "Manage types of expenditures",
            icon: <FaMoneyBillWave className="text-3xl text-red-400" />,
            path: "/master-data/expenditure-type",
            color: "border-red-500",
            permissionSection: "expenditureType"
        },
        {
            title: "Expense Category",
            description: "Manage main expense categories",
            icon: <FaListAlt className="text-3xl text-pink-400" />,
            path: "/master-data/expense-category",
            color: "border-pink-500",
            permissionSection: "category"
        },
        {
            title: "Expense Sub-Category",
            description: "Manage granular expense items",
            icon: <FaSitemap className="text-3xl text-indigo-400" />,
            path: "/master-data/expense-subcategory",
            color: "border-indigo-500",
            permissionSection: "subcategory"
        },
        {
            title: "Finance Expense Category",
            description: "Manage finance-specific expense categories",
            icon: <FaMoneyBillWave className="text-3xl text-teal-400" />,
            path: "/master-data/finance-expense-category",
            color: "border-teal-500",
            permissionSection: "financeExpenseCategory"
        },
        {
            title: "Account",
            description: "Manage accounts",
            icon: <FaBuilding className="text-3xl text-amber-400" />,
            path: "/master-data/account",
            color: "border-amber-500",
            permissionSection: "account"
        },
        {
            title: "Zone Management",
            description: "Manage zones and territories",
            icon: <FaGlobe className="text-3xl text-cyan-300" />,
            path: "/master-data/zone",
            color: "border-cyan-300",
            permissionSection: "zone"
        },
        {
            title: "Follow-up Feedback",
            description: "Manage follow-up feedback options",
            icon: <FaCommentDots className="text-3xl text-purple-300" />,
            path: "/master-data/follow-up-feedback",
            color: "border-purple-300",
            permissionSection: "followUpFeedback"
        },
        {
            title: "School Data",
            description: "Manage school data records",
            icon: <FaSchool className="text-3xl text-orange-300" />,
            path: "/master-data/school-data",
            color: "border-orange-300",
            permissionSection: "schoolData"
        },
    ];

    // Filter tiles to only show what the user has access to
    const visibleItems = masterDataItems.filter(item => canView(item.permissionSection));

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <h2 className="text-2xl font-bold mb-2 text-white">Master Data Management</h2>
            {!isSuperAdmin && (
                <p className="text-gray-400 text-sm mb-6">
                    Showing <span className="text-cyan-400 font-semibold">{visibleItems.length}</span> sections you have access to.
                </p>
            )}
            {isSuperAdmin && <p className="text-gray-400 text-sm mb-6">Full access — all sections visible.</p>}

            {visibleItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <FaDatabase className="text-5xl mb-4 opacity-30" />
                    <p className="text-lg font-semibold">No Master Data Access</p>
                    <p className="text-sm mt-1">Contact your administrator to get permissions assigned.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleItems.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => navigate(item.path)}
                            className={`bg-[#1a1f24] p-6 rounded-xl border-l-4 ${item.color} border-y border-r border-gray-800 hover:bg-[#252b32] cursor-pointer transition-all group`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-800 rounded-lg group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                            <p className="text-gray-400 text-sm">{item.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MasterDataContent;
