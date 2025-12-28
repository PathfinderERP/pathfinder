import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { FaEye, FaPlus, FaSearch, FaEdit, FaTrash, FaFilter, FaSync } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MultiSelectFilter from "../../components/common/MultiSelectFilter";

const TeacherList = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Filter States
    const [filterNames, setFilterNames] = useState([]);
    const [filterEmails, setFilterEmails] = useState([]);
    const [filterEmployeeIds, setFilterEmployeeIds] = useState([]);
    const [filterMobiles, setFilterMobiles] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [filterBoards, setFilterBoards] = useState([]);
    const [filterDesignations, setFilterDesignations] = useState([]);
    const [filterSubjects, setFilterSubjects] = useState([]);
    const [filterTypes, setFilterTypes] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [centres, setCentres] = useState([]);

    // Form Data State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobNum: "",
        employeeId: "",
        subject: "",
        centre: "",
        teacherDepartment: "",
        boardType: "",
        teacherType: "",
        designation: "",
        isDeptHod: false,
        isBoardHod: false,
        isSubjectHod: false
    });

    const API_URL = import.meta.env.VITE_API_URL;

    // Fetch Teachers
    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTeachers(data);
            } else {
                toast.error(data.message || "Failed to fetch teachers");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Error fetching teachers");
        } finally {
            setLoading(false);
        }
    };

    // Fetch Centres (Optional, for dropdown) - assuming endpoint exists or skip
    // We'll try to fetch centres if possible, else just input
    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCentres(data);
            }
        } catch (err) {
            // Ignore if fails
        }
    };

    useEffect(() => {
        fetchTeachers();
        fetchCentres();
    }, []);

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // HOD Mutually Exclusive Logic
        if (["isDeptHod", "isBoardHod", "isSubjectHod"].includes(name) && checked) {
            setFormData(prev => ({
                ...prev,
                isDeptHod: name === "isDeptHod",
                isBoardHod: name === "isBoardHod",
                isSubjectHod: name === "isSubjectHod"
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const [editId, setEditId] = useState(null);

    // Handle Edit population
    const handleEdit = (teacher) => {
        setFormData({
            name: teacher.name,
            email: teacher.email,
            mobNum: teacher.mobNum,
            employeeId: teacher.employeeId,
            subject: teacher.subject,
            centre: teacher.centres?.[0] || "", // Assuming single centre for now from array
            teacherDepartment: teacher.teacherDepartment,
            boardType: teacher.boardType,
            teacherType: teacher.teacherType,
            designation: teacher.designation,
            isDeptHod: teacher.isDeptHod,
            isBoardHod: teacher.isBoardHod,
            isSubjectHod: teacher.isSubjectHod
        });
        setEditId(teacher._id);
        setShowModal(true);
    };

    // Handle Delete
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this teacher?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Teacher deleted successfully");
                fetchTeachers();
            } else {
                toast.error("Failed to delete teacher");
            }
        } catch (error) {
            toast.error("Server error during delete");
        }
    };

    // Handle Submit (Create or Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editId
                ? `${API_URL}/academics/teacher/update/${editId}`
                : `${API_URL}/academics/teacher/create`;

            const method = editId ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(editId ? "Teacher updated successfully!" : "Teacher added successfully!");
                setShowModal(false);
                setEditId(null); // Reset edit state
                fetchTeachers();
                // Reset Form
                setFormData({
                    name: "", email: "", mobNum: "", employeeId: "", subject: "",
                    centre: "", teacherDepartment: "", boardType: "", teacherType: "", designation: "",
                    isDeptHod: false, isBoardHod: false, isSubjectHod: false
                });
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    // Reset form when modal closes or opens for Add
    const openAddModal = () => {
        setFormData({
            name: "", email: "", mobNum: "", employeeId: "", subject: "",
            centre: "", teacherDepartment: "", boardType: "", teacherType: "", designation: "",
            isDeptHod: false, isBoardHod: false, isSubjectHod: false
        });
        setEditId(null);
        setShowModal(true);
    };

    // Extract Options for Filters
    const getOptions = (key) => {
        const unique = [...new Set(teachers.map(t => t[key]).filter(Boolean))];
        return unique.map(val => ({ value: val, label: val }));
    };

    const nameOptions = getOptions('name');
    const emailOptions = getOptions('email');
    const empIdOptions = getOptions('employeeId');
    const mobileOptions = getOptions('mobNum');
    const deptOptions = getOptions('teacherDepartment');
    const boardOptions = getOptions('boardType');
    const desigOptions = getOptions('designation');
    const subjectOptions = getOptions('subject');
    const typeOptions = getOptions('teacherType');

    const filteredTeachers = teachers.filter(t => {
        // Global Search
        const matchesSearch =
            t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

        // Multi-Select Filters
        const matchesName = filterNames.length === 0 || filterNames.includes(t.name);
        const matchesEmail = filterEmails.length === 0 || filterEmails.includes(t.email);
        const matchesEmpId = filterEmployeeIds.length === 0 || filterEmployeeIds.includes(t.employeeId);
        const matchesMobile = filterMobiles.length === 0 || filterMobiles.includes(t.mobNum);
        const matchesDept = filterDepartments.length === 0 || filterDepartments.includes(t.teacherDepartment);
        const matchesBoard = filterBoards.length === 0 || filterBoards.includes(t.boardType);
        const matchesDesig = filterDesignations.length === 0 || filterDesignations.includes(t.designation);
        const matchesSubject = filterSubjects.length === 0 || filterSubjects.includes(t.subject);
        const matchesType = filterTypes.length === 0 || filterTypes.includes(t.teacherType);

        return matchesSearch && matchesName && matchesEmail && matchesEmpId && matchesMobile &&
            matchesDept && matchesBoard && matchesDesig && matchesSubject && matchesType;
    });

    const resetFilters = () => {
        setSearchTerm("");
        setFilterNames([]);
        setFilterEmails([]);
        setFilterEmployeeIds([]);
        setFilterMobiles([]);
        setFilterDepartments([]);
        setFilterBoards([]);
        setFilterDesignations([]);
        setFilterSubjects([]);
        setFilterTypes([]);
    };

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-white min-h-screen">
                <ToastContainer theme="dark" />

                {/* Header */}
                <h1 className="text-2xl font-bold mb-6">Teacher List</h1>

                {/* Filters Section */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <FaFilter /> <span className="font-semibold">Filters</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={resetFilters} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
                                <FaSync /> Reset
                            </button>
                            <button
                                onClick={openAddModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition shadow-md"
                            >
                                <FaPlus /> Add Teacher
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-5 relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Global Search (Name, Email, ID)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        <MultiSelectFilter label="Name" placeholder="All Names" options={nameOptions} selectedValues={filterNames} onChange={setFilterNames} />
                        <MultiSelectFilter label="Email" placeholder="All Emails" options={emailOptions} selectedValues={filterEmails} onChange={setFilterEmails} />
                        <MultiSelectFilter label="Emp ID" placeholder="All IDs" options={empIdOptions} selectedValues={filterEmployeeIds} onChange={setFilterEmployeeIds} />
                        <MultiSelectFilter label="Mobile" placeholder="All Mobiles" options={mobileOptions} selectedValues={filterMobiles} onChange={setFilterMobiles} />
                        <MultiSelectFilter label="Dept" placeholder="All Depts" options={deptOptions} selectedValues={filterDepartments} onChange={setFilterDepartments} />
                        <MultiSelectFilter label="Board" placeholder="All Boards" options={boardOptions} selectedValues={filterBoards} onChange={setFilterBoards} />
                        <MultiSelectFilter label="Desig" placeholder="All Desigs" options={desigOptions} selectedValues={filterDesignations} onChange={setFilterDesignations} />
                        <MultiSelectFilter label="Subject" placeholder="All Subjects" options={subjectOptions} selectedValues={filterSubjects} onChange={setFilterSubjects} />
                        <MultiSelectFilter label="Type" placeholder="All Types" options={typeOptions} selectedValues={filterTypes} onChange={setFilterTypes} />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase border-b border-gray-700 bg-[#131619]">
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Emp ID</th>
                                <th className="p-4 font-semibold">Email</th>
                                <th className="p-4 font-semibold">Mobile</th>
                                <th className="p-4 font-semibold">Subject</th>
                                <th className="p-4 font-semibold">Designation</th>
                                <th className="p-4 font-semibold">Dept</th>
                                <th className="p-4 font-semibold">Board</th>
                                <th className="p-4 font-semibold">Type</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="10" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredTeachers.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500">
                                        No teachers found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredTeachers.map((teacher) => (
                                    <tr
                                        key={teacher._id}
                                        className="border-b border-gray-800 hover:bg-[#2a323c] transition-all duration-200 hover:shadow-lg group"
                                    >
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-700 overflow-hidden flex-shrink-0">
                                                {teacher.profileImage && !teacher.profileImage.startsWith('undefined/') ? (
                                                    <img src={teacher.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-cyan-500 bg-cyan-500/10">
                                                        {teacher.name?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase">
                                                {teacher.name}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            <span className="bg-gray-800/50 font-mono text-xs px-2 py-1 rounded border border-gray-700">
                                                {teacher.employeeId || "N/A"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">{teacher.email}</td>
                                        <td className="p-4 text-gray-400">{teacher.mobNum}</td>
                                        <td className="p-4 text-white">{teacher.subject || "-"}</td>
                                        <td className="p-4 text-gray-300">{teacher.designation || "-"}</td>
                                        <td className="p-4 text-gray-300">{teacher.teacherDepartment || "-"}</td>
                                        <td className="p-4 text-white">{teacher.boardType || "-"}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${teacher.teacherType === 'Full Time' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                                                }`}>
                                                {teacher.teacherType || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm flex gap-3">
                                            <span
                                                className="text-cyan-400 cursor-pointer flex items-center gap-1 hover:text-cyan-300 transition-colors"
                                                title="View Details"
                                                onClick={() => navigate(`/academics/teacher/view/${teacher._id}`)}
                                            >
                                                <FaEye />
                                            </span>
                                            <span
                                                className="text-yellow-400 cursor-pointer flex items-center gap-1 hover:text-yellow-300 transition-colors"
                                                title="Edit"
                                                onClick={() => handleEdit(teacher)}
                                            >
                                                <FaEdit />
                                            </span>
                                            <span
                                                className="text-red-400 cursor-pointer flex items-center gap-1 hover:text-red-300 transition-colors"
                                                title="Delete"
                                                onClick={() => handleDelete(teacher._id)}
                                            >
                                                <FaTrash />
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-[#1e2530] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700 shadow-2xl animate-fade-in custom-scrollbar">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-[#1e2530] z-10">
                                <h2 className="text-xl font-bold text-white">{editId ? "Edit Teacher" : "Add Teacher"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Row 1 */}
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Teacher Name <span className="text-red-500">*</span></label>
                                        <input type="text" name="name" required value={formData.name} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="Enter Teacher Name" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Teacher Email <span className="text-red-500">*</span></label>
                                        <input type="email" name="email" required value={formData.email} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="abc@gmail.com" />
                                    </div>

                                    {/* Row 2 */}
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Phone Number <span className="text-red-500">*</span></label>
                                        <input type="text" name="mobNum" required value={formData.mobNum} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="9733..." />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Subject <span className="text-red-500">*</span></label>
                                        <input type="text" name="subject" required value={formData.subject} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="Select a subject" />
                                    </div>

                                    {/* Row 3 - Centre */}
                                    <div className="md:col-span-2">
                                        <label className="block text-gray-400 text-sm mb-1">Centre <span className="text-red-500">*</span></label>
                                        <select name="centre" required value={formData.centre} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none">
                                            <option value="">Select a Center</option>
                                            {centres.map((c, idx) => (
                                                <option key={idx} value={c._id}>{c.centreName}</option>
                                            ))}
                                            {/* Fallback if no centres fetched */}
                                            {centres.length === 0 && <option value="Kharagpur">Kharagpur (Default)</option>}
                                        </select>
                                    </div>

                                    {/* Row 4 */}
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Teacher Department <span className="text-red-500">*</span></label>
                                        <select name="teacherDepartment" required value={formData.teacherDepartment} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none">
                                            <option value="">Select</option>
                                            <option value="Foundation">Foundation</option>
                                            <option value="Board">Board</option>
                                            <option value="All India">All India</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Board Type <span className="text-red-500">*</span></label>
                                        <select name="boardType" required value={formData.boardType} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none">
                                            <option value="">Select</option>
                                            <option value="CBSE">CBSE</option>
                                            <option value="ICSE">ICSE</option>
                                            <option value="JEE">JEE</option>
                                            <option value="NEET">NEET</option>
                                        </select>
                                    </div>

                                    {/* Row 5 */}
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Teacher Type <span className="text-red-500">*</span></label>
                                        <select name="teacherType" required value={formData.teacherType} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none">
                                            <option value="">Select</option>
                                            <option value="Full Time">Full Time</option>
                                            <option value="Part Time">Part Time</option>
                                        </select>
                                    </div>
                                    <div>
                                        {/* Blank to balance or something else */}
                                    </div>

                                    {/* Row 6 */}
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Employee Id <span className="text-red-500">*</span></label>
                                        <input type="text" name="employeeId" required value={formData.employeeId} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="Enter ID" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Designation <span className="text-red-500">*</span></label>
                                        <input type="text" name="designation" required value={formData.designation} onChange={handleChange}
                                            className="w-full bg-[#13171c] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none" placeholder="Select a designation" />
                                    </div>
                                </div>

                                {/* Checkboxes */}
                                <div className="flex gap-6 mt-4 border-t border-gray-700 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                                        <input type="checkbox" name="isDeptHod" checked={formData.isDeptHod} onChange={handleChange} className="w-4 h-4 rounded" />
                                        <span>Dept Type HOD</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                                        <input type="checkbox" name="isBoardHod" checked={formData.isBoardHod} onChange={handleChange} className="w-4 h-4 rounded" />
                                        <span>Board Type HOD</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                                        <input type="checkbox" name="isSubjectHod" checked={formData.isSubjectHod} onChange={handleChange} className="w-4 h-4 rounded" />
                                        <span>Subject Wise HOD</span>
                                    </label>
                                </div>

                                {/* Footer Buttons */}
                                <div className="mt-8 flex gap-4">
                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg">
                                        {editId ? "Update" : "Add"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TeacherList;