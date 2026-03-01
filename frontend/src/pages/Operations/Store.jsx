import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { 
    FaSearch, FaFilter, FaSync, FaUserGraduate, 
    FaBoxOpen, FaClipboardList, FaCheckCircle, 
    FaUser, FaPhoneAlt, FaBuilding, FaBook, FaShoppingBag, FaTshirt, FaPenNib
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MultiSelectFilter from '../../components/common/MultiSelectFilter';
import Pagination from '../../components/common/Pagination';
import { TableRowSkeleton } from '../../components/common/Skeleton';

const StorePage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const apiUrl = import.meta.env.VITE_API_URL;

    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterCourse, setFilterCourse] = useState([]);
    const [filterBoard, setFilterBoard] = useState([]);
    const [filterGender, setFilterGender] = useState([]);
    const [filterAllocationStatus, setFilterAllocationStatus] = useState([]);
    
    // Master Data
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [masterCourses, setMasterCourses] = useState([]);
    const [masterBoards, setMasterBoards] = useState([]);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Allocation Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [allocationData, setAllocationData] = useState({
        items: []
    });

    const user = React.useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
    const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch centres, courses and students
            const [centresRes, coursesRes, studentsRes] = await Promise.all([
                fetch(`${apiUrl}/centre`, { headers }),
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/admission`, { headers })
            ]);

            const centres = centresRes.ok ? await centresRes.ok && await centresRes.json() : [];
            const courses = coursesRes.ok ? await coursesRes.ok && await coursesRes.json() : [];
            const admissions = studentsRes.ok ? await studentsRes.ok && await studentsRes.json() : [];

            // Filter centres based on user permissions if not superadmin
            if (!isSuperAdmin) {
                const userCentres = user.centres || [];
                const userCentreNames = userCentres.map(c => c.centreName || c.name || c).filter(Boolean);
                setAllowedCentres(userCentreNames);
            } else {
                setAllowedCentres(centres.map(c => c.centreName));
            }

            setMasterCourses(courses);

            // Group admissions by student similar to EnrolledStudentsContent
            const studentMap = {};
            admissions.forEach(admission => {
                const studentId = admission.student?._id;
                if (studentId) {
                    if (!studentMap[studentId]) {
                        studentMap[studentId] = {
                            student: admission.student,
                            admissions: [],
                            latestAdmission: admission
                        };
                    }
                    studentMap[studentId].admissions.push(admission);
                    // Update latest admission if newer
                    if (new Date(admission.admissionDate) > new Date(studentMap[studentId].latestAdmission.admissionDate)) {
                        studentMap[studentId].latestAdmission = admission;
                    }
                }
            });

            const studentsArray = Object.values(studentMap);
            setStudents(studentsArray);
            setFilteredStudents(studentsArray);
        } catch (error) {
            console.error("Error fetching store data:", error);
            toast.error("Failed to load student data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = students;

        // Apply filters
        if (!isSuperAdmin && allowedCentres.length > 0) {
            result = result.filter(item => {
                const studentCentre = item.student?.studentsDetails?.[0]?.centre;
                return allowedCentres.includes(studentCentre);
            });
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => {
                const s = item.student?.studentsDetails?.[0] || {};
                return (s.studentName || "").toLowerCase().includes(query) ||
                       (s.mobileNum || "").includes(query) ||
                       (item.latestAdmission?.admissionNumber || "").toLowerCase().includes(query);
            });
        }

        if (filterCentre.length > 0) {
            result = result.filter(item => {
                const studentCentre = item.student?.studentsDetails?.[0]?.centre;
                return filterCentre.includes(studentCentre);
            });
        }

        if (filterCourse.length > 0) {
            result = result.filter(item => {
                return item.admissions.some(a => {
                    const courseName = a.course?.courseName || a.boardCourseName || "";
                    return filterCourse.includes(courseName);
                });
            });
        }

        if (filterBoard.length > 0) {
            result = result.filter(item => {
                const studentBoard = item.student?.studentsDetails?.[0]?.board;
                return filterBoard.includes(studentBoard);
            });
        }

        if (filterGender.length > 0) {
            result = result.filter(item => {
                const studentGender = item.student?.studentsDetails?.[0]?.gender;
                return filterGender.includes(studentGender);
            });
        }

        if (filterAllocationStatus.length > 0) {
            result = result.filter(item => {
                const hasAllocations = item.student?.allocatedItems?.length > 0;
                if (filterAllocationStatus.includes('allotted') && hasAllocations) return true;
                if (filterAllocationStatus.includes('not_allotted') && !hasAllocations) return true;
                return false;
            });
        }

        setFilteredStudents(result);
        setCurrentPage(1);
    }, [searchQuery, filterCentre, filterCourse, filterBoard, filterGender, filterAllocationStatus, students, allowedCentres, isSuperAdmin]);

    const handleAllocate = (student) => {
        setSelectedStudent(student);
        setIsAllocationModalOpen(true);
        // Reset allocation data
        setAllocationData({ items: [] });
    };

    const toggleItem = (item) => {
        setAllocationData(prev => {
            const exists = prev.items.includes(item);
            if (exists) {
                return { ...prev, items: prev.items.filter(i => i !== item) };
            } else {
                return { ...prev, items: [...prev.items, item] };
            }
        });
    };

    const handleAllocationSubmit = async () => {
        if (allocationData.items.length === 0) {
            toast.warning("Please select at least one item to allocate");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/inventory/allocation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: selectedStudent.student._id,
                    admissionId: selectedStudent.latestAdmission._id,
                    items: allocationData.items.map(name => ({ itemName: name, quantity: 1 }))
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`Allocated ${allocationData.items.join(', ')} to ${selectedStudent.student.studentsDetails[0].studentName}`);
                setIsAllocationModalOpen(false);
                setSelectedStudent(null);
                fetchInitialData(); // Refresh to update allocation status
            } else {
                toast.error(data.message || "Failed to save allocation");
            }
        } catch (error) {
            console.error("Allocation Error:", error);
            toast.error("Failed to save allocation due to network error");
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

    const availableItems = [
        { id: 'dress', name: 'Dress', icon: <FaTshirt className="text-pink-500" /> },
        { id: 'books', name: 'Academic Books', icon: <FaBook className="text-blue-500" /> },
        { id: 'pens', name: 'Pens', icon: <FaPenNib className="text-purple-500" /> },
        { id: 'bags', name: 'Bags', icon: <FaShoppingBag className="text-orange-500" /> },
    ];

    return (
        <Layout activePage="Operations">
            <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Store & Inventory
                        </h1>
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Manage student allocations and inventory distribution
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchInitialData}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm border border-gray-200'
                            }`}
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className={`p-6 rounded-2xl mb-8 ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Search */}
                        <div className="relative">
                            <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Search Student
                            </label>
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Name, Phone or Admission #"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all outline-none ${
                                        isDarkMode 
                                        ? 'bg-[#0f1214] border-gray-700 focus:border-cyan-500 text-white' 
                                        : 'bg-gray-50 border-gray-200 focus:border-blue-500 text-gray-900'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Centre Filter */}
                        <MultiSelectFilter
                            label="Filter by Centre"
                            options={allowedCentres.map(c => ({ value: c, label: c.toUpperCase() }))}
                            selectedValues={filterCentre}
                            onChange={setFilterCentre}
                            placeholder="All Centres"
                        />

                        {/* Course Filter */}
                        <MultiSelectFilter
                            label="Filter by Course"
                            options={[...new Set(masterCourses.map(c => c.courseName).filter(Boolean))].map(c => ({ value: c, label: c.toUpperCase() }))}
                            selectedValues={filterCourse}
                            onChange={setFilterCourse}
                            placeholder="All Courses"
                        />

                        {/* Board Filter */}
                        <MultiSelectFilter
                            label="Filter by Board"
                            options={[...new Set(students.map(item => item.student?.studentsDetails?.[0]?.board).filter(Boolean))].map(b => ({ value: b, label: b.toUpperCase() }))}
                            selectedValues={filterBoard}
                            onChange={setFilterBoard}
                            placeholder="All Boards"
                        />

                        {/* Gender Filter */}
                        <MultiSelectFilter
                            label="Filter by Gender"
                            options={['Male', 'Female', 'Other'].map(g => ({ value: g, label: g.toUpperCase() }))}
                            selectedValues={filterGender}
                            onChange={setFilterGender}
                            placeholder="All Genders"
                        />

                        {/* Allocation Status Filter */}
                        <MultiSelectFilter
                            label="Allocation Status"
                            options={[
                                { value: 'allotted', label: 'ALLOTTED' },
                                { value: 'not_allotted', label: 'NOT ALLOTTED' }
                            ]}
                            selectedValues={filterAllocationStatus}
                            onChange={setFilterAllocationStatus}
                            placeholder="All Status"
                        />

                        {/* Stats Summary */}
                        <div className={`p-4 rounded-xl flex items-center justify-between ${isDarkMode ? 'bg-[#0f1214]' : 'bg-gray-50'}`}>
                            <div>
                                <p className={`text-xs font-medium uppercase tracking-tighter ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Total Students</p>
                                <p className="text-2xl font-bold text-cyan-500">{filteredStudents.length}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-cyan-500/10">
                                <FaUserGraduate className="text-cyan-500 text-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Students Table */}
                <div className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-[#1e252b]' : 'bg-gray-50'} border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                    <th className="p-4 font-semibold text-sm">Student Info</th>
                                    <th className="p-4 font-semibold text-sm">Latest Course & Centre</th>
                                    <th className="p-4 font-semibold text-sm">Contact</th>
                                    <th className="p-4 font-semibold text-sm text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(5)].map((_, i) => <TableRowSkeleton key={i} columns={4} />)
                                ) : currentItems.length > 0 ? (
                                    currentItems.map((item, idx) => {
                                        const s = item.student?.studentsDetails?.[0] || {};
                                        return (
                                            <tr key={idx} className={`border-b transition-colors ${
                                                isDarkMode ? 'border-gray-800 hover:bg-[#1e252b]' : 'border-gray-100 hover:bg-gray-50'
                                            }`}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/10">
                                                            {s.studentName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm flex items-center gap-2">
                                                                {s.studentName}
                                                                {item.student?.allocatedItems?.length > 0 ? (
                                                                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">Allotted</span>
                                                                ) : (
                                                                    <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">Not Allotted</span>
                                                                )}
                                                            </p>
                                                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                ID: {item.latestAdmission?.admissionNumber || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <FaBook className="text-cyan-500" />
                                                            <span className="font-medium">{item.latestAdmission?.course?.courseName || item.latestAdmission?.boardCourseName || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <FaBuilding className="text-amber-500" />
                                                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{s.centre || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <FaPhoneAlt className="text-green-500" />
                                                            <span>{s.mobileNum}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                                            {s.studentEmail}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center">
                                                        <button 
                                                            onClick={() => handleAllocate(item)}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                                                isDarkMode 
                                                                ? 'bg-cyan-500 hover:bg-cyan-400 text-[#0f1214] shadow-cyan-500/20' 
                                                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                                            }`}
                                                        >
                                                            <FaBoxOpen />
                                                            Allocate Items
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-50">
                                                <FaSearch className="text-4xl mb-2" />
                                                <p className="text-lg font-medium">No students found</p>
                                                <p className="text-sm">Try adjusting your filters or search query</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredStudents.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>

                {/* Allocation Modal */}
                {isAllocationModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white'}`}>
                            {/* Modal Header */}
                            <div className="p-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white relative">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <FaBoxOpen />
                                    Allocate Items
                                </h3>
                                <p className="text-cyan-100 text-xs mt-1">Student: {selectedStudent?.student?.studentsDetails[0]?.studentName}</p>
                                <button 
                                    onClick={() => setIsAllocationModalOpen(false)}
                                    className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
                                >
                                    <FaSync className="rotate-45" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8">
                                <p className={`text-sm mb-6 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Select the items you want to allocate to this student.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    {availableItems.map(item => (
                                        <div 
                                            key={item.id}
                                            onClick={() => toggleItem(item.name)}
                                            className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex flex-col items-center gap-3 ${
                                                allocationData.items.includes(item.name)
                                                ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500' : 'bg-blue-50 border-blue-500')
                                                : (isDarkMode ? 'bg-gray-800/50 border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-100 hover:border-gray-200')
                                            }`}
                                        >
                                            <div className={`text-2xl p-3 rounded-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
                                                {item.icon}
                                            </div>
                                            <span className="text-sm font-bold">{item.name}</span>
                                            
                                            {allocationData.items.includes(item.name) && (
                                                <div className="absolute top-2 right-2">
                                                    <FaCheckCircle className="text-cyan-500" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        onClick={() => setIsAllocationModalOpen(false)}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                                            isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAllocationSubmit}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                                            isDarkMode 
                                            ? 'bg-cyan-500 text-[#0f1214] hover:bg-cyan-400 shadow-cyan-500/20' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                                        }`}
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <ToastContainer />
            </div>
        </Layout>
    );
};

export default StorePage;
