import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaEye, FaFilter } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../MasterDataWave.css';
import { hasPermission } from '../../../config/permissions';

const CourseContent = () => {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [currentCourse, setCurrentCourse] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // Permission checks - pass full user object for SuperAdmin support
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'courseManagement', 'courses', 'create');
    const canEdit = hasPermission(user, 'courseManagement', 'courses', 'edit');
    const canDelete = hasPermission(user, 'courseManagement', 'courses', 'delete');

    // Filter states
    const [filters, setFilters] = useState({
        mode: "",
        courseType: "",
        class: "",
        department: "",
        examTag: "",
        courseSession: ""
    });

    const [formData, setFormData] = useState({
        courseName: "",
        examTag: "",
        courseDuration: "",
        coursePeriod: "Yearly",
        class: "",
        department: "",
        courseSession: "",
        mode: "OFFLINE",
        courseType: "INSTATION",
        feesStructure: [{ feesType: "", value: "", discount: "" }]
    });

    const apiUrl = import.meta.env.VITE_API_URL;

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [coursesRes, classesRes, deptsRes, tagsRes, sessionsRes] = await Promise.all([
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/department`, { headers }),
                fetch(`${apiUrl}/examTag`, { headers }),
                fetch(`${apiUrl}/session/list`, { headers })
            ]);

            if (coursesRes.ok) {
                const coursesData = await coursesRes.json();
                setCourses(coursesData);
                setFilteredCourses(coursesData);
            }
            if (classesRes.ok) setClasses(await classesRes.json());
            if (deptsRes.ok) setDepartments(await deptsRes.json());
            if (tagsRes.ok) setExamTags(await tagsRes.json());
            if (sessionsRes.ok) setSessions(await sessionsRes.json());

        } catch (err) {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Apply filters
    const applyFilters = () => {
        let filtered = [...courses];

        if (filters.mode) {
            filtered = filtered.filter(c => c.mode === filters.mode);
        }
        if (filters.courseType) {
            filtered = filtered.filter(c => c.courseType === filters.courseType);
        }
        if (filters.class) {
            filtered = filtered.filter(c => c.class?._id === filters.class);
        }
        if (filters.department) {
            filtered = filtered.filter(c => c.department?._id === filters.department);
        }
        if (filters.examTag) {
            filtered = filtered.filter(c => c.examTag?._id === filters.examTag);
        }
        if (filters.courseSession) {
            filtered = filtered.filter(c => c.courseSession === filters.courseSession);
        }

        setFilteredCourses(filtered);
    };

    useEffect(() => {
        applyFilters();
    }, [filters, courses]);

    const handleFilterChange = (name, value) => {
        setFilters({ ...filters, [name]: value });
    };

    const clearFilters = () => {
        setFilters({
            mode: "",
            courseType: "",
            class: "",
            department: "",
            examTag: "",
            courseSession: ""
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFeeChange = (index, field, value) => {
        const updatedFees = [...formData.feesStructure];
        updatedFees[index][field] = value;
        setFormData({ ...formData, feesStructure: updatedFees });
    };

    const addFeeRow = () => {
        setFormData({
            ...formData,
            feesStructure: [...formData.feesStructure, { feesType: "", value: "", discount: "" }]
        });
    };

    const removeFeeRow = (index) => {
        const updatedFees = formData.feesStructure.filter((_, i) => i !== index);
        setFormData({ ...formData, feesStructure: updatedFees });
    };

    const openModal = (course = null) => {
        if (course) {
            setCurrentCourse(course);
            setFormData({
                courseName: course.courseName,
                examTag: course.examTag?._id || course.examTag,
                courseDuration: course.courseDuration,
                coursePeriod: course.coursePeriod,
                class: course.class?._id || course.class,
                department: course.department?._id || course.department,
                courseSession: course.courseSession,
                mode: course.mode,
                courseType: course.courseType,
                feesStructure: course.feesStructure.length > 0 ? course.feesStructure : [{ feesType: "", value: "", discount: "" }]
            });
        } else {
            setCurrentCourse(null);
            setFormData({
                courseName: "",
                examTag: "",
                courseDuration: "",
                coursePeriod: "Yearly",
                class: "",
                department: "",
                courseSession: "",
                mode: "OFFLINE",
                courseType: "INSTATION",
                feesStructure: [{ feesType: "", value: "", discount: "" }]
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCourse(null);
    };

    const openDetailModal = (course) => {
        setSelectedCourse(course);
        setIsDetailModalOpen(true);
    };

    const closeDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedCourse(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentCourse
            ? `${apiUrl}/course/${currentCourse._id}`
            : `${apiUrl}/course/create`;
        const method = currentCourse ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(currentCourse ? "Course updated successfully" : "Course created successfully");
                fetchData();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this course?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${apiUrl}/course/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Course deleted successfully");
                fetchData();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    return (
        <div className="flex-1 bg-[#131619] p-3 sm:p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-cyan-400">Course Master Data</h2>
                {canCreate && (
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
                    >
                        <FaPlus /> Add Course
                    </button>
                )}
            </div>

            {/* Filter Section */}
            <div className="bg-[#1a1f24] p-3 sm:p-4 rounded-lg border border-gray-800 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <FaFilter className="text-cyan-400 text-sm sm:text-base" />
                    <h3 className="text-base sm:text-lg font-semibold text-white">Filters</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                    <div>
                        <label className="block text-gray-400 mb-1 text-xs sm:text-sm">Mode</label>
                        <select
                            value={filters.mode}
                            onChange={(e) => handleFilterChange('mode', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">All Modes</option>
                            <option value="ONLINE">ONLINE</option>
                            <option value="OFFLINE">OFFLINE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1 text-xs sm:text-sm">Course Type</label>
                        <select
                            value={filters.courseType}
                            onChange={(e) => handleFilterChange('courseType', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">All Types</option>
                            <option value="INSTATION">INSTATION</option>
                            <option value="OUTSTATION">OUTSTATION</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1 text-xs sm:text-sm">Class</label>
                        <select
                            value={filters.class}
                            onChange={(e) => handleFilterChange('class', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">All Classes</option>
                            {classes.map(cls => <option key={cls._id} value={cls._id}>{cls.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1 text-xs sm:text-sm">Department</label>
                        <select
                            value={filters.department}
                            onChange={(e) => handleFilterChange('department', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept._id} value={dept._id}>{dept.departmentName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1 text-xs sm:text-sm">Exam Tag</label>
                        <select
                            value={filters.examTag}
                            onChange={(e) => handleFilterChange('examTag', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">All Exam Tags</option>
                            {examTags.map(tag => <option key={tag._id} value={tag._id}>{tag.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1 text-xs sm:text-sm">Session</label>
                        <select
                            value={filters.courseSession}
                            onChange={(e) => handleFilterChange('courseSession', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                        >
                            <option value="">All Sessions</option>
                            {sessions.map(sess => (
                                <option key={sess._id} value={sess.sessionName}>{sess.sessionName}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Desktop Table View - Hidden on Mobile */}
            <div className="hidden lg:block bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-gray-300">
                            <th className="p-4 border-b border-gray-700">Course Name</th>
                            <th className="p-4 border-b border-gray-700">Department</th>
                            <th className="p-4 border-b border-gray-700">Class</th>
                            <th className="p-4 border-b border-gray-700">Exam Tag</th>
                            <th className="p-4 border-b border-gray-700">Mode</th>
                            <th className="p-4 border-b border-gray-700">Type</th>
                            <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="p-4 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : filteredCourses.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-4 text-center text-gray-500">No courses found</td>
                            </tr>
                        ) : (
                            filteredCourses.map((course) => (
                                <tr key={course._id} className="master-data-row-wave border-b border-gray-800 transition-colors">
                                    <td className="p-4 font-medium">{course.courseName}</td>
                                    <td className="p-4 text-gray-400">{course.department?.departmentName || "-"}</td>
                                    <td className="p-4 text-gray-400">{course.class?.name || "-"}</td>
                                    <td className="p-4 text-gray-400">{course.examTag?.name || "-"}</td>
                                    <td className="p-4 text-gray-400">
                                        <span className={`px-2 py-1 rounded text-xs ${course.mode === 'ONLINE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {course.mode}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400">
                                        <span className={`px-2 py-1 rounded text-xs ${course.courseType === 'INSTATION' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {course.courseType}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => openDetailModal(course)}
                                            className="text-cyan-400 hover:text-cyan-300 mr-3"
                                            title="View Details"
                                        >
                                            <FaEye />
                                        </button>
                                        {canEdit && (
                                            <button
                                                onClick={() => openModal(course)}
                                                className="text-blue-400 hover:text-blue-300 mr-3"
                                                title="Edit"
                                            >
                                                <FaEdit />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(course._id)}
                                                className="text-red-400 hover:text-red-300"
                                                title="Delete"
                                            >
                                                <FaTrash />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View - Shown on Mobile/Tablet */}
            <div className="lg:hidden space-y-3">
                {loading ? (
                    <div className="bg-[#1a1f24] p-4 rounded-lg border border-gray-800 text-center text-gray-500 text-sm">
                        Loading...
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="bg-[#1a1f24] p-4 rounded-lg border border-gray-800 text-center text-gray-500 text-sm">
                        No courses found
                    </div>
                ) : (
                    filteredCourses.map((course) => (
                        <div key={course._id} className="master-data-card-wave bg-[#1a1f24] p-3 sm:p-4 rounded-lg border border-gray-800 transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="text-sm sm:text-base font-bold text-white mb-1">{course.courseName}</h3>
                                    <p className="text-xs text-gray-400">{course.department?.departmentName || "-"}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openDetailModal(course)}
                                        className="text-cyan-400 hover:text-cyan-300 p-2"
                                        title="View"
                                    >
                                        <FaEye size={14} />
                                    </button>
                                    {canEdit && (
                                        <button
                                            onClick={() => openModal(course)}
                                            className="text-blue-400 hover:text-blue-300 p-2"
                                            title="Edit"
                                        >
                                            <FaEdit size={14} />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(course._id)}
                                            className="text-red-400 hover:text-red-300 p-2"
                                            title="Delete"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">Class:</span>
                                    <p className="text-gray-300">{course.class?.name || "-"}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Exam Tag:</span>
                                    <p className="text-gray-300">{course.examTag?.name || "-"}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Mode:</span>
                                    <p>
                                        <span className={`px-2 py-0.5 rounded text-xs ${course.mode === 'ONLINE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {course.mode}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Type:</span>
                                    <p>
                                        <span className={`px-2 py-0.5 rounded text-xs ${course.courseType === 'INSTATION' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {course.courseType}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-2xl border border-gray-700 shadow-xl my-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {currentCourse ? "Edit Course" : "Add New Course"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Course Name</label>
                                    <input type="text" name="courseName" value={formData.courseName} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500" required />
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Course Session</label>
                                    <select
                                        name="courseSession"
                                        value={formData.courseSession}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                        required
                                    >
                                        <option value="">Select Session</option>
                                        {sessions.map(sess => (
                                            <option key={sess._id} value={sess.sessionName}>{sess.sessionName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Department</label>
                                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500" required>
                                        <option value="">Select Department</option>
                                        {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.departmentName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Class</label>
                                    <select name="class" value={formData.class} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500">
                                        <option value="">Select Class</option>
                                        {classes.map(cls => <option key={cls._id} value={cls._id}>{cls.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Exam Tag</label>
                                    <select name="examTag" value={formData.examTag} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500" required>
                                        <option value="">Select Exam Tag</option>
                                        {examTags.map(tag => <option key={tag._id} value={tag._id}>{tag.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Course Duration</label>
                                    <input type="text" name="courseDuration" value={formData.courseDuration} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500" required />
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Course Period</label>
                                    <select name="coursePeriod" value={formData.coursePeriod} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500" required>
                                        <option value="Yearly">Yearly</option>
                                        <option value="Monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Mode</label>
                                    <select name="mode" value={formData.mode} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500" required>
                                        <option value="OFFLINE">OFFLINE</option>
                                        <option value="ONLINE">ONLINE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1 text-sm">Course Type</label>
                                    <select name="courseType" value={formData.courseType} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500" required>
                                        <option value="INSTATION">INSTATION</option>
                                        <option value="OUTSTATION">OUTSTATION</option>
                                    </select>
                                </div>
                            </div>

                            {/* Fees Structure */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-gray-400 text-sm">Fees Structure</label>
                                    <button type="button" onClick={addFeeRow} className="text-xs text-cyan-400 hover:text-cyan-300">+ Add Fee</button>
                                </div>
                                {formData.feesStructure.map((fee, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <input type="text" placeholder="Type (e.g. Tuition)" value={fee.feesType} onChange={(e) => handleFeeChange(index, 'feesType', e.target.value)} className="w-1/3 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm" required />
                                        <input type="number" placeholder="Value" value={fee.value} onChange={(e) => handleFeeChange(index, 'value', e.target.value)} className="w-1/3 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm" required />
                                        <input type="text" placeholder="Discount (e.g. 10%)" value={fee.discount} onChange={(e) => handleFeeChange(index, 'discount', e.target.value)} className="w-1/4 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm" required />
                                        {formData.feesStructure.length > 1 && (
                                            <button type="button" onClick={() => removeFeeRow(index)} className="text-red-400 hover:text-red-300">
                                                <FaTimes />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {isDetailModalOpen && selectedCourse && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-3xl border border-gray-700 shadow-xl my-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-cyan-400">{selectedCourse.courseName}</h3>
                            <button onClick={closeDetailModal} className="text-gray-400 hover:text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Department</label>
                                    <p className="text-white font-medium">{selectedCourse.department?.departmentName || "-"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Class</label>
                                    <p className="text-white font-medium">{selectedCourse.class?.name || "-"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Exam Tag</label>
                                    <p className="text-white font-medium">{selectedCourse.examTag?.name || "-"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Course Session</label>
                                    <p className="text-white font-medium">{selectedCourse.courseSession}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Duration</label>
                                    <p className="text-white font-medium">{selectedCourse.courseDuration}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Course Period</label>
                                    <p className="text-white font-medium">{selectedCourse.coursePeriod}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Mode</label>
                                    <p>
                                        <span className={`px-3 py-1 rounded ${selectedCourse.mode === 'ONLINE' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {selectedCourse.mode}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Course Type</label>
                                    <p>
                                        <span className={`px-3 py-1 rounded ${selectedCourse.courseType === 'INSTATION' ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {selectedCourse.courseType}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 border-t border-gray-700 pt-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Fees Structure</h4>
                            <div className="bg-gray-800 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-900">
                                            <th className="p-3 text-left text-gray-400 text-sm">Fee Type</th>
                                            <th className="p-3 text-left text-gray-400 text-sm">Amount</th>
                                            <th className="p-3 text-left text-gray-400 text-sm">Discount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedCourse.feesStructure.map((fee, index) => (
                                            <tr key={index} className="border-t border-gray-700">
                                                <td className="p-3 text-white">{fee.feesType}</td>
                                                <td className="p-3 text-white">₹{fee.value.toLocaleString()}</td>
                                                <td className="p-3 text-green-400">{fee.discount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            {canEdit && (
                                <button
                                    onClick={() => {
                                        closeDetailModal();
                                        openModal(selectedCourse);
                                    }}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                                >
                                    Edit Course
                                </button>
                            )}
                            <button
                                onClick={closeDetailModal}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseContent;
