import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

const EditLeadModal = ({ lead, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        schoolName: "",
        className: "",
        centre: "",
        course: "",
        source: "",
        targetExam: "",
        leadType: "",
        leadResponsibility: ""
    });
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sources, setSources] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [courseFilters, setCourseFilters] = useState({
        class: "",
        mode: "",
        examTag: "",
        type: ""
    });

    const filteredCourses = courses.filter(course => {
        return (
            (!courseFilters.class || (course.class?._id || course.class) === courseFilters.class) &&
            (!courseFilters.mode || course.mode === courseFilters.mode) &&
            (!courseFilters.examTag || (course.examTag?._id || course.examTag) === courseFilters.examTag) &&
            (!courseFilters.type || course.courseType === courseFilters.type)
        );
    });

    useEffect(() => {
        if (lead) {
            setFormData({
                name: lead.name || "",
                email: lead.email || "",
                phoneNumber: lead.phoneNumber || "",
                schoolName: lead.schoolName || "",
                className: lead.className?._id || "",
                centre: lead.centre?._id || "",
                course: lead.course?._id || "",
                source: lead.source || "",
                targetExam: lead.targetExam || "",
                leadType: lead.leadType || "",
                leadResponsibility: lead.leadResponsibility || ""
            });
        }
        fetchDropdownData();
    }, [lead]);

    const fetchDropdownData = async () => {
        try {
            const token = localStorage.getItem("token");

            // Fetch current user data for accurate centre assignments and role
            const userProfileRes = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const profileData = await userProfileRes.json();
            const currentUser = profileData.user || JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin";

            // Fetch classes
            const classResponse = await fetch(`${import.meta.env.VITE_API_URL}/class`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const classData = await classResponse.json();
            if (classResponse.ok) setClasses(Array.isArray(classData) ? classData : []);

            // Fetch centres
            const centreResponse = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const centreData = await centreResponse.json();
            if (centreResponse.ok) {
                let list = Array.isArray(centreData) ? centreData : [];
                if (!isSuperAdmin) {
                    const userCentreIds = currentUser.centres?.map(c => c._id || c) || [];
                    list = list.filter(c => userCentreIds.includes(c._id));

                    // Ensure the current lead's centre is in the list even if user access changed
                    if (lead?.centre?._id && !list.find(c => c._id === lead.centre._id)) {
                        list.push(lead.centre);
                    }
                }
                setCentres(list);
            }

            // Fetch courses
            const courseResponse = await fetch(`${import.meta.env.VITE_API_URL}/course`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const courseData = await courseResponse.json();
            if (courseResponse.ok) setCourses(Array.isArray(courseData) ? courseData : []);

            // Fetch sources
            const sourceResponse = await fetch(`${import.meta.env.VITE_API_URL}/source`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const sourceData = await sourceResponse.json();
            if (sourceResponse.ok) setSources(sourceData.sources || []);

            // Fetch telecallers
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userResponse.json();
            if (userResponse.ok) {
                let telecallerUsers = (userData.users || []).filter(u => u.role === "telecaller");

                if (currentUser.role === "telecaller") {
                    telecallerUsers = telecallerUsers.filter(u => u.name === currentUser.name);
                    if (telecallerUsers.length === 0) {
                        telecallerUsers = [{ _id: currentUser._id, name: currentUser.name }];
                    }
                }

                setTelecallers(telecallerUsers);
            }

            // Fetch exam tags
            const examTagResponse = await fetch(`${import.meta.env.VITE_API_URL}/examTag`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const examTagData = await examTagResponse.json();
            if (examTagResponse.ok) setExamTags(Array.isArray(examTagData) ? examTagData : []);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
            toast.error("Error loading form data");
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/${lead._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Lead updated successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update lead");
            }
        } catch (error) {
            console.error("Error updating lead:", error);
            toast.error("Error updating lead");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1a1f24] rounded-xl w-full max-w-3xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#1a1f24] z-10">
                    <h3 className="text-xl font-bold text-white">Edit Lead</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Enter Name *</label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Student Name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Enter Email *</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="abc@gmail.com"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Enter phone number *</label>
                            <input
                                type="text"
                                name="phoneNumber"
                                placeholder="Phone no"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Enter school Name</label>
                            <input
                                type="text"
                                name="schoolName"
                                placeholder="School"
                                required
                                value={formData.schoolName}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Enter class *</label>
                            <select
                                name="className"
                                required
                                value={formData.className}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Class</option>
                                {classes.map((cls) => (
                                    <option key={cls._id} value={cls._id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Enter Target Exam</label>
                            <input
                                type="text"
                                name="targetExam"
                                placeholder="Exam"
                                value={formData.targetExam}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Centre *</label>
                            <select
                                name="centre"
                                required
                                value={formData.centre}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Choose center</option>
                                {centres.map((centre) => (
                                    <option key={centre._id} value={centre._id}>
                                        {centre.centreName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-cyan-400 font-bold uppercase">Filter Courses</label>
                                <button
                                    type="button"
                                    onClick={() => setCourseFilters({ class: "", mode: "", examTag: "", type: "" })}
                                    className="text-xs text-gray-400 hover:text-white"
                                >
                                    Reset Filters
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <select
                                    value={courseFilters.type}
                                    onChange={(e) => setCourseFilters({ ...courseFilters, type: e.target.value })}
                                    className="bg-[#1a1f24] border border-gray-600 rounded p-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                                >
                                    <option value="">All Types</option>
                                    <option value="INSTATION">Instation</option>
                                    <option value="OUTSTATION">Outstation</option>
                                </select>
                                <select
                                    value={courseFilters.mode}
                                    onChange={(e) => setCourseFilters({ ...courseFilters, mode: e.target.value })}
                                    className="bg-[#1a1f24] border border-gray-600 rounded p-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                                >
                                    <option value="">All Modes</option>
                                    <option value="ONLINE">Online</option>
                                    <option value="OFFLINE">Offline</option>
                                </select>
                                <select
                                    value={courseFilters.class}
                                    onChange={(e) => setCourseFilters({ ...courseFilters, class: e.target.value })}
                                    className="bg-[#1a1f24] border border-gray-600 rounded p-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                                >
                                    <option value="">All Classes</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                                <select
                                    value={courseFilters.examTag}
                                    onChange={(e) => setCourseFilters({ ...courseFilters, examTag: e.target.value })}
                                    className="bg-[#1a1f24] border border-gray-600 rounded p-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                                >
                                    <option value="">All Exam Tags</option>
                                    {examTags.map(tag => <option key={tag._id} value={tag._id}>{tag.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Course ({filteredCourses.length})</label>
                            <select
                                name="course"
                                value={formData.course}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Choose course</option>
                                {filteredCourses.map((course) => (
                                    <option key={course._id} value={course._id}>
                                        {course.courseName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Enter source</label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Choose</option>
                                {sources.map((source) => (
                                    <option key={source._id} value={source.sourceName}>
                                        {source.sourceName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Lead Type</label>
                            <select
                                name="leadType"
                                value={formData.leadType}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Choose</option>
                                <option value="HOT LEAD">HOT LEAD</option>
                                <option value="COLD LEAD">COLD LEAD</option>
                                <option value="NEGATIVE">NEGATIVE</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Lead Responsibility</label>
                            <select
                                name="leadResponsibility"
                                value={formData.leadResponsibility}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Name</option>
                                {telecallers.map((telecaller) => (
                                    <option key={telecaller._id} value={telecaller.name}>
                                        {telecaller.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400"
                        >
                            {loading ? "Updating..." : "Update Lead"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditLeadModal;
