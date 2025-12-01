import React, { useState, useEffect } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

const EditStudentModal = ({ student, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        studentName: student.studentsDetails?.[0]?.studentName || '',
        studentEmail: student.studentsDetails?.[0]?.studentEmail || '',
        mobileNum: student.studentsDetails?.[0]?.mobileNum || '',
        whatsappNumber: student.studentsDetails?.[0]?.whatsappNumber || '',
        dateOfBirth: student.studentsDetails?.[0]?.dateOfBirth || '',
        gender: student.studentsDetails?.[0]?.gender || '',
        centre: student.studentsDetails?.[0]?.centre || '',
        board: student.studentsDetails?.[0]?.board || '',
        state: student.studentsDetails?.[0]?.state || '',
        schoolName: student.studentsDetails?.[0]?.schoolName || '',
        address: student.studentsDetails?.[0]?.address || '',
        pincode: student.studentsDetails?.[0]?.pincode || '',
        class: student.examSchema?.[0]?.class || '',
        scienceMathParcent: student.examSchema?.[0]?.scienceMathParcent || '',
        markAgregate: student.examSchema?.[0]?.markAgregate || '',
        examTag: student.sessionExamCourse?.[0]?.examTag || '',
        targetExams: student.sessionExamCourse?.[0]?.targetExams || '',
        session: student.sessionExamCourse?.[0]?.session || '',
        status: student.studentStatus?.[student.studentStatus?.length - 1]?.status || '',
        guardianName: student.guardians?.[0]?.guardianName || '',
        guardianEmail: student.guardians?.[0]?.guardianEmail || '',
        guardianMobile: student.guardians?.[0]?.guardianMobile || '',
        occupation: student.guardians?.[0]?.occupation || '',
        annualIncome: student.guardians?.[0]?.annualIncome || '',
        qualification: student.guardians?.[0]?.qualification || '',
    });

    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [examTags, setExamTags] = useState([]);

    useEffect(() => {
        fetchCentres();
        fetchExamTags();
    }, []);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            } else {
                console.error("Failed to fetch centres");
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchExamTags = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/examTag/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setExamTags(data);
            } else {
                console.error("Failed to fetch exam tags");
            }
        } catch (error) {
            console.error("Error fetching exam tags:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;

            // Construct the update payload matching the Student schema structure
            const updatePayload = {
                studentsDetails: [{
                    studentName: formData.studentName,
                    studentEmail: formData.studentEmail,
                    mobileNum: formData.mobileNum,
                    whatsappNumber: formData.whatsappNumber,
                    dateOfBirth: formData.dateOfBirth,
                    gender: formData.gender,
                    centre: formData.centre,
                    board: formData.board,
                    state: formData.state,
                    schoolName: formData.schoolName,
                    address: formData.address,
                    pincode: formData.pincode,
                    source: student.studentsDetails?.[0]?.source || '',
                }],
                examSchema: [{
                    examName: student.examSchema?.[0]?.examName || '',
                    class: formData.class,
                    examStatus: student.examSchema?.[0]?.examStatus || '',
                    markAgregate: formData.markAgregate,
                    scienceMathParcent: formData.scienceMathParcent,
                }],
                sessionExamCourse: [{
                    examTag: formData.examTag,
                    targetExams: formData.targetExams,
                    session: formData.session,
                }],
                studentStatus: [{
                    status: formData.status,
                    enrolledStatus: student.studentStatus?.[student.studentStatus?.length - 1]?.enrolledStatus || 'Not Enrolled',
                }],
                guardians: [{
                    guardianName: formData.guardianName,
                    guardianEmail: formData.guardianEmail,
                    guardianMobile: formData.guardianMobile,
                    occupation: formData.occupation,
                    annualIncome: formData.annualIncome,
                    qualification: formData.qualification,
                    organizationName: student.guardians?.[0]?.organizationName || '',
                    designation: student.guardians?.[0]?.designation || '',
                    officeAddress: student.guardians?.[0]?.officeAddress || '',
                }],
                section: student.section || [],
            };

            const response = await fetch(`${apiUrl}/normalAdmin/updateStudent/${student._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updatePayload),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Student updated successfully!');
                onUpdate();
            } else {
                toast.error(data.message || 'Failed to update student');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            toast.error('Error updating student');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1f24] border-b border-gray-800 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Edit Student Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <FaTimes className="text-gray-400 text-xl" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Student Name *</label>
                                <input
                                    type="text"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Date of Birth *</label>
                                <input
                                    type="text"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Gender *</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Centre *</label>
                                <select
                                    name="centre"
                                    value={formData.centre}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">Select Centre</option>
                                    {centres.map((centre) => (
                                        <option key={centre._id} value={centre.centreName}>{centre.centreName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Email *</label>
                                <input
                                    type="email"
                                    name="studentEmail"
                                    value={formData.studentEmail}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Mobile *</label>
                                <input
                                    type="text"
                                    name="mobileNum"
                                    value={formData.mobileNum}
                                    onChange={handleChange}
                                    required
                                    pattern="[0-9]{10}"
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">WhatsApp *</label>
                                <input
                                    type="text"
                                    name="whatsappNumber"
                                    value={formData.whatsappNumber}
                                    onChange={handleChange}
                                    required
                                    pattern="[0-9]{10}"
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Pincode *</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-gray-400 text-sm mb-2">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    required
                                    rows="2"
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">Academic Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">School Name *</label>
                                <input
                                    type="text"
                                    name="schoolName"
                                    value={formData.schoolName}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Board *</label>
                                <input
                                    type="text"
                                    name="board"
                                    value={formData.board}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Class *</label>
                                <input
                                    type="text"
                                    name="class"
                                    value={formData.class}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">State *</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Science/Math %</label>
                                <input
                                    type="text"
                                    name="scienceMathParcent"
                                    value={formData.scienceMathParcent}
                                    onChange={handleChange}
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Aggregate Marks</label>
                                <input
                                    type="text"
                                    name="markAgregate"
                                    value={formData.markAgregate}
                                    onChange={handleChange}
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Exam & Course Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">Exam & Course Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Exam Tag</label>
                                <select
                                    name="examTag"
                                    value={formData.examTag}
                                    onChange={handleChange}
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">Select Exam Tag</option>
                                    {examTags.map((tag) => (
                                        <option key={tag._id} value={tag.name}>{tag.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Target Exams</label>
                                <input
                                    type="text"
                                    name="targetExams"
                                    value={formData.targetExams}
                                    onChange={handleChange}
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Session</label>
                                <input
                                    type="text"
                                    name="session"
                                    value={formData.session}
                                    onChange={handleChange}
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Lead Status *</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="">Select Status</option>
                                    <option value="Hot">Hot</option>
                                    <option value="Cold">Cold</option>
                                    <option value="Negative">Negative</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Guardian Information */}
                    <div className="bg-[#131619] p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-white mb-4">Guardian Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Guardian Name *</label>
                                <input
                                    type="text"
                                    name="guardianName"
                                    value={formData.guardianName}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Guardian Mobile *</label>
                                <input
                                    type="text"
                                    name="guardianMobile"
                                    value={formData.guardianMobile}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Guardian Email *</label>
                                <input
                                    type="email"
                                    name="guardianEmail"
                                    value={formData.guardianEmail}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Occupation *</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Annual Income *</label>
                                <input
                                    type="text"
                                    name="annualIncome"
                                    value={formData.annualIncome}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Qualification *</label>
                                <input
                                    type="text"
                                    name="qualification"
                                    value={formData.qualification}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1a1f24] text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"
                        >
                            <FaSave />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditStudentModal;
