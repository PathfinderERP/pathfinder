import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

const EditEnrolledStudentModal = ({ admission, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        // Student Details
        studentName: admission.student?.studentsDetails?.[0]?.studentName || '',
        studentEmail: admission.student?.studentsDetails?.[0]?.studentEmail || '',
        mobileNum: admission.student?.studentsDetails?.[0]?.mobileNum || '',
        whatsappNumber: admission.student?.studentsDetails?.[0]?.whatsappNumber || '',
        dateOfBirth: admission.student?.studentsDetails?.[0]?.dateOfBirth || '',
        gender: admission.student?.studentsDetails?.[0]?.gender || '',
        schoolName: admission.student?.studentsDetails?.[0]?.schoolName || '',
        address: admission.student?.studentsDetails?.[0]?.address || '',
        pincode: admission.student?.studentsDetails?.[0]?.pincode || '',
        state: admission.student?.studentsDetails?.[0]?.state || '',
        board: admission.student?.studentsDetails?.[0]?.board || '',
        centre: admission.student?.studentsDetails?.[0]?.centre || '',

        // Guardian Details
        guardianName: admission.student?.guardians?.[0]?.guardianName || '',
        guardianEmail: admission.student?.guardians?.[0]?.guardianEmail || '',
        guardianMobile: admission.student?.guardians?.[0]?.guardianMobile || '',
        qualification: admission.student?.guardians?.[0]?.qualification || '',
        occupation: admission.student?.guardians?.[0]?.occupation || '',
        annualIncome: admission.student?.guardians?.[0]?.annualIncome || '',
        organizationName: admission.student?.guardians?.[0]?.organizationName || '',
        designation: admission.student?.guardians?.[0]?.designation || '',
        officeAddress: admission.student?.guardians?.[0]?.officeAddress || '',
    });

    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [examTags, setExamTags] = useState([]);

    // Indian States
    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
        "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

    useEffect(() => {
        fetchCentres();
        fetchExamTags();
    }, []);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre/getAllCentre`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            }
        } catch (error) {
            console.error('Error fetching centres:', error);
        }
    };

    const fetchExamTags = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/examTag/getAllExamTag`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setExamTags(data);
            }
        } catch (error) {
            console.error('Error fetching exam tags:', error);
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
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/normalAdmin/updateStudent/${admission.student._id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        studentsDetails: [{
                            studentName: formData.studentName,
                            studentEmail: formData.studentEmail,
                            mobileNum: formData.mobileNum,
                            whatsappNumber: formData.whatsappNumber,
                            dateOfBirth: formData.dateOfBirth,
                            gender: formData.gender,
                            schoolName: formData.schoolName,
                            address: formData.address,
                            pincode: formData.pincode,
                            state: formData.state,
                            board: formData.board,
                            centre: formData.centre,
                            source: admission.student?.studentsDetails?.[0]?.source || 'Walk-in',
                            guardians: [{
                                guardianName: formData.guardianName,
                                qualification: formData.qualification,
                                guardianEmail: formData.guardianEmail,
                                guardianMobile: formData.guardianMobile,
                                occupation: formData.occupation,
                                annualIncome: formData.annualIncome,
                                organizationName: formData.organizationName,
                                designation: formData.designation,
                                officeAddress: formData.officeAddress
                            }],
                            examSchema: admission.student?.studentsDetails?.[0]?.examSchema || []
                        }],
                        guardians: [{
                            guardianName: formData.guardianName,
                            qualification: formData.qualification,
                            guardianEmail: formData.guardianEmail,
                            guardianMobile: formData.guardianMobile,
                            occupation: formData.occupation,
                            annualIncome: formData.annualIncome,
                            organizationName: formData.organizationName,
                            designation: formData.designation,
                            officeAddress: formData.officeAddress
                        }],
                        examSchema: admission.student?.examSchema || [],
                        section: admission.student?.section || [],
                        sessionExamCourse: admission.student?.sessionExamCourse || [],
                        studentStatus: admission.student?.studentStatus || []
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {
                toast.success('Student details updated successfully!');
                onUpdate();
                onClose();
            } else {
                toast.error(data.message || 'Failed to update student details');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            toast.error('Error updating student details');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-[#1a1f24] rounded-lg w-full max-w-4xl border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1f24] border-b border-gray-700 p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Edit Student Details</h2>
                        <p className="text-cyan-400 font-mono text-sm mt-1">{admission.admissionNumber}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Student Information */}
                    <div className="bg-[#131619] p-6 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-3 mb-4">
                            <FaUser className="text-cyan-400" />
                            <h3 className="text-xl font-semibold text-white">Student Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Email *</label>
                                <input
                                    type="email"
                                    name="studentEmail"
                                    value={formData.studentEmail}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Mobile *</label>
                                <input
                                    type="tel"
                                    name="mobileNum"
                                    value={formData.mobileNum}
                                    onChange={handleChange}
                                    pattern="[0-9]{10}"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">WhatsApp Number *</label>
                                <input
                                    type="tel"
                                    name="whatsappNumber"
                                    value={formData.whatsappNumber}
                                    onChange={handleChange}
                                    pattern="[0-9]{10}"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Date of Birth *</label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Gender *</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">School Name *</label>
                                <input
                                    type="text"
                                    name="schoolName"
                                    value={formData.schoolName}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Board *</label>
                                <input
                                    type="text"
                                    name="board"
                                    value={formData.board}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Centre *</label>
                                <select
                                    name="centre"
                                    value={formData.centre}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                >
                                    <option value="">Select Centre</option>
                                    {centres.map((centre) => (
                                        <option key={centre._id} value={centre.centreName}>
                                            {centre.centreName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">State *</label>
                                <select
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                >
                                    <option value="">Select State</option>
                                    {indianStates.map((state) => (
                                        <option key={state} value={state}>
                                            {state}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Pincode *</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    pattern="[0-9]{6}"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-gray-400 text-sm mb-2">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guardian Information */}
                    <div className="bg-[#131619] p-6 rounded-lg border border-gray-800">
                        <h3 className="text-xl font-semibold text-white mb-4">Guardian Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Guardian Name *</label>
                                <input
                                    type="text"
                                    name="guardianName"
                                    value={formData.guardianName}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Guardian Email *</label>
                                <input
                                    type="email"
                                    name="guardianEmail"
                                    value={formData.guardianEmail}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Guardian Mobile *</label>
                                <input
                                    type="tel"
                                    name="guardianMobile"
                                    value={formData.guardianMobile}
                                    onChange={handleChange}
                                    pattern="[0-9]{10}"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Qualification *</label>
                                <input
                                    type="text"
                                    name="qualification"
                                    value={formData.qualification}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Occupation *</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Annual Income *</label>
                                <input
                                    type="text"
                                    name="annualIncome"
                                    value={formData.annualIncome}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Organization Name</label>
                                <input
                                    type="text"
                                    name="organizationName"
                                    value={formData.organizationName}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Designation</label>
                                <input
                                    type="text"
                                    name="designation"
                                    value={formData.designation}
                                    onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-gray-400 text-sm mb-2">Office Address</label>
                                <textarea
                                    name="officeAddress"
                                    value={formData.officeAddress}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Note about payment details */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <p className="text-yellow-400 text-sm">
                            <strong>Note:</strong> Payment and financial details cannot be edited through this form.
                            Please use the payment management section to update payment information.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default EditEnrolledStudentModal;
