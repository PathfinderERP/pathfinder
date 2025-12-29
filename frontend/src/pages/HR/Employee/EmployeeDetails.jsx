import React, { useState, useEffect, useRef } from "react";
import Layout from "../../../components/Layout";
import { toast } from "react-toastify";
import {
    FaUser, FaBuilding, FaPhone, FaMapMarkerAlt, FaUniversity,
    FaFileAlt, FaCamera, FaEdit, FaEnvelope, FaCalendarAlt,
    FaIdCard, FaBriefcase, FaMoneyBillWave, FaDownload, FaUpload
} from "react-icons/fa";

const EmployeeDetails = () => {
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // Toggle Edit Mode
    const fileInputRef = useRef(null);

    // Form state
    const [formData, setFormData] = useState({});
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [documentFiles, setDocumentFiles] = useState({});

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Profile Data:", data);
                setEmployee(data);
                initializeForm(data);

                // Sync with localStorage so Header and Sidebar update
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const updatedUser = {
                    ...currentUser,
                    name: data.name,
                    profileImage: data.profileImage
                };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                window.dispatchEvent(new Event('storage'));
            } else {
                toast.error("Failed to load profile");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error loading profile");
        } finally {
            setLoading(false);
        }
    };

    const initializeForm = (data) => {
        setFormData({
            name: data.name,
            spouseName: data.spouseName || "",
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : "",
            gender: data.gender,
            phoneNumber: data.phoneNumber,
            whatsappNumber: data.whatsappNumber || "",
            alternativeNumber: data.alternativeNumber || "",
            state: data.state || "",
            city: data.city || "",
            pinCode: data.pinCode || "",
            address: data.address || "",
            bankName: data.bankName || "",
            branchName: data.branchName || "",
            accountNumber: data.accountNumber || "",
            ifscCode: data.ifscCode || ""
        });
        setPreviewImage(data.profileImage);
        setProfileImageFile(null);
        setDocumentFiles({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageClick = () => {
        if (isEditing) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImageFile(file);
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleDocumentChange = (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            console.log(`File selected for ${name}:`, files[0].name);
            setDocumentFiles(prev => ({ ...prev, [name]: files[0] }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const data = new FormData();

            // Append text fields
            Object.keys(formData).forEach(key => {
                const value = formData[key];
                if (value !== null && value !== undefined && value !== "") {
                    data.append(key, value);
                }
            });

            // Append profile image if new one selected
            if (profileImageFile) {
                data.append("profileImage", profileImageFile);
            }

            // Append document files
            Object.keys(documentFiles).forEach(key => {
                data.append(key, documentFiles[key]);
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/me`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: data
            });

            if (response.ok) {
                toast.success("Profile updated successfully");
                setIsEditing(false);
                fetchProfile(); // Refresh
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to update profile");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Layout><div className="flex justify-center items-center h-screen animate-pulse text-blue-500 font-bold">Loading Profile...</div></Layout>;
    if (!employee) return <Layout><div className="p-6 text-center text-red-500 font-bold">Profile not found. Please contact HR.</div></Layout>;

    return (
        <Layout activePage="Employee Center">
            <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">

                {/* HEADER CARD */}
                <div className="bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#111827] rounded-3xl overflow-hidden shadow-xl text-white relative hover:shadow-2xl hover:scale-[1.005] transition-all duration-500 group border border-gray-800">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:bg-purple-500/20 transition-all duration-700"></div>

                    <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-10 relative z-10">
                        {/* Profile Image */}
                        <div className="relative">
                            <div className={`w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-[#374151] group-hover:border-blue-500/50 overflow-hidden bg-gray-800 shadow-2xl ${isEditing ? 'cursor-pointer' : ''} transition-all duration-300`}
                                onClick={handleImageClick}>
                                {previewImage ? (
                                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-5xl text-gray-600"><FaUser /></div>
                                )}
                            </div>
                            {isEditing && (
                                <div className="absolute bottom-2 right-2 bg-blue-600 p-3 rounded-full cursor-pointer shadow-lg hover:bg-blue-500 hover:scale-110 transition-all"
                                    onClick={handleImageClick}>
                                    <FaCamera className="text-white text-lg" />
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>

                        {/* Text Info */}
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-2">
                                <FaBuilding /> Employee Center
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white group-hover:text-blue-100 transition-colors">{employee.name}</h1>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-bold uppercase tracking-wide text-gray-400">
                                <span className="flex items-center gap-2 bg-gray-800/50 px-3 py-1 rounded-lg border border-gray-700"><FaBriefcase className="text-blue-400" /> {employee.designation?.name || "N/A"}</span>
                                <span className="flex items-center gap-2 bg-gray-800/50 px-3 py-1 rounded-lg border border-gray-700"><FaIdCard className="text-purple-400" /> {employee.employeeId}</span>
                                <span className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${employee.status === 'Active' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${employee.status === 'Active' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                                    {employee.status || 'Inactive'}
                                </span>
                            </div>

                            <div className="pt-6 flex flex-wrap justify-center md:justify-start gap-8 text-sm">
                                <div>
                                    <span className="block text-xs uppercase text-gray-500 font-bold mb-1">Joining Date</span>
                                    <span className="text-lg font-bold text-gray-200">{new Date(employee.dateOfJoining).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-gray-500 font-bold mb-1">Department</span>
                                    <span className="text-lg font-bold text-gray-200">{employee.department?.departmentName || "-"}</span>
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-gray-500 font-bold mb-1">Manager</span>
                                    <span className="text-lg font-bold text-gray-200">{employee.manager?.name || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex flex-col gap-3">
                            {!isEditing ? (
                                <button onClick={() => setIsEditing(true)}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-blue-900/40 hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">
                                    <FaEdit /> Edit Profile
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3 w-full">
                                    <button onClick={handleSubmit} disabled={saving}
                                        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-green-900/20 hover:-translate-y-0.5 transition-all">
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                    <button onClick={() => { setIsEditing(false); initializeForm(employee); }}
                                        className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold uppercase tracking-wider hover:-translate-y-0.5 transition-all">
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Personal Info */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* PERSONAL DETAILS */}
                        <section className="bg-white dark:bg-[#1a1f24] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                            <h2 className="text-lg font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-gray-800 dark:text-white border-b pb-4 dark:border-gray-700">
                                <FaUser className="text-blue-500" /> Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Full Legal Name" name="name" value={formData.name} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="Spouse Name" name="spouseName" value={formData.spouseName} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} disabled={!isEditing} />
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <InputField label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="WhatsApp Number" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="Alternative Contact" name="alternativeNumber" value={formData.alternativeNumber} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="Email Address" value={employee.email} disabled={true} />
                            </div>
                            <div className="mt-6">
                                <InputField label="Present Address" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} type="textarea" />
                            </div>
                        </section>

                        {/* FINANCIAL PROFILE */}
                        <section className="bg-white dark:bg-[#1a1f24] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                            <h2 className="text-lg font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-gray-800 dark:text-white border-b pb-4 dark:border-gray-700">
                                <FaUniversity className="text-purple-500" /> Financial Profile (Editable)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="Branch Name" name="branchName" value={formData.branchName} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleChange} disabled={!isEditing} />
                                <InputField label="IFSC Code" name="ifscCode" value={formData.ifscCode} onChange={handleChange} disabled={!isEditing} />
                            </div>
                        </section>

                        {/* DETAILED SALARY BREAKDOWN (NEW) */}
                        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                            <h2 className="text-lg font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-emerald-400 border-b border-gray-700 pb-4 relative z-10">
                                <FaMoneyBillWave /> Detailed Salary Breakdown
                            </h2>

                            {employee.salaryStructure && employee.salaryStructure.length > 0 ? (
                                (() => {
                                    // Get latest salary structure by sorting effectiveDate descending
                                    const latest = [...employee.salaryStructure].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))[0];

                                    // Define Earnings
                                    const earnings = [
                                        { label: "Basic Salary", val: latest.basic },
                                        { label: "HRA", val: latest.hra },
                                        { label: "Conveyance", val: latest.conveyance },
                                        { label: "Special Allowance", val: latest.specialAllowance },
                                    ];

                                    const activeEarnings = earnings.filter(e => e.val > 0);

                                    // Define Deductions - exactly matching HR view order and labels
                                    const deductions = [
                                        { label: "Provident Fund (PF)", val: latest.pf },
                                        { label: "ESI Contribution", val: latest.esi },
                                        { label: "Professional Tax", val: latest.pTax || 0 },
                                        { label: "TDS / Income Tax", val: latest.tds || 0 },
                                        { label: "Loss of Pay", val: latest.lossOfPay || 0 },
                                        { label: "Adjustment", val: latest.adjustment || 0 },
                                    ].filter(d => Math.abs(d.val) > 0); // Include if non-zero (positive or negative)

                                    // Use stored totals from DB for consistency
                                    const totalEarnings = latest.totalEarnings || activeEarnings.reduce((sum, item) => sum + item.val, 0);
                                    const totalDeductions = latest.totalDeductions || deductions.reduce((sum, item) => sum + item.val, 0);
                                    const netSalary = latest.netSalary || (totalEarnings - totalDeductions);
                                    const ctc = latest.amount;

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                            {/* Earnings */}
                                            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                                                <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-xs mb-4">Earnings (Monthly)</h3>
                                                <div className="space-y-3">
                                                    {activeEarnings.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span className="text-gray-400">{item.label}</span>
                                                            <span className="font-bold">₹{item.val.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                    {activeEarnings.length === 0 && <div className="text-gray-500 text-xs italic">No components defined</div>}
                                                    <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between text-sm font-bold text-white">
                                                        <span>Gross Earnings</span>
                                                        <span>₹{totalEarnings.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Deductions & Net */}
                                            <div className="space-y-6">
                                                {deductions.length > 0 ? (
                                                    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                                                        <h3 className="text-red-400 font-bold uppercase tracking-wider text-xs mb-4">Deductions (Monthly)</h3>
                                                        <div className="space-y-3">
                                                            {deductions.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between text-sm">
                                                                    <span className="text-gray-400">{item.label}</span>
                                                                    <span className="font-bold text-red-300">- ₹{item.val.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                            <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between text-sm font-bold text-white">
                                                                <span>Total Deductions</span>
                                                                <span className="text-red-400">- ₹{totalDeductions.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 border-dashed flex items-center justify-center min-h-[140px]">
                                                        <span className="text-gray-500 text-xs italic text-center">No deductions applicable</span>
                                                    </div>
                                                )}

                                                <div className="bg-emerald-600/20 rounded-2xl p-6 border border-emerald-500/30 flex justify-between items-center group hover:bg-emerald-600/30 transition-colors">
                                                    <div>
                                                        <span className="block text-emerald-400 text-xs font-black uppercase tracking-widest">Net Salary On Hand</span>
                                                        <p className="text-[10px] text-gray-500 font-medium">Effective from {new Date(latest.effectiveDate).toLocaleDateString('en-GB')}</p>
                                                    </div>
                                                    <div className="text-3xl font-black text-white">
                                                        ₹{(netSalary > 0 ? netSalary : ctc).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="text-center text-gray-500 py-8">Salary details not available.</div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT COLUMN: Official & Documents */}
                    <div className="space-y-8">
                        {/* Official & Identity */}
                        <section className="bg-gray-900 text-white rounded-3xl p-8 shadow-lg relative overflow-hidden group hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all"></div>
                            <h2 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-blue-400 border-b border-gray-700 pb-2">
                                <FaIdCard /> Official & Identity
                            </h2>
                            <div className="space-y-5">
                                <ReadOnlyField label="Aadhar Number" value={employee.aadharNumber} />
                                <ReadOnlyField label="PAN Number" value={employee.panNumber} />
                                <ReadOnlyField label="Reports To" value={employee.manager?.name || "CEO"} />
                            </div>
                        </section>

                        {/* Work (Read Only) */}
                        <section className="bg-white dark:bg-[#1a1f24] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                            <h2 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                                <FaBriefcase /> Work & Compensation
                            </h2>
                            <div className="space-y-5">
                                <ReadOnlyField label="Current Salary (CTC)" value={`₹${employee.currentSalary?.toLocaleString()}`} />
                                <ReadOnlyField label="Daily Working Hours" value={`${employee.totalDailyHours || 9} Hrs`} />
                                <ReadOnlyField label="Probation Status" value={employee.probationPeriod ? "On Probation" : "Confirmed"} />
                            </div>
                        </section>

                        {/* Documents (Editable) */}
                        <section className="bg-white dark:bg-[#1a1f24] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h2 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                                <FaFileAlt /> Digital Documents
                            </h2>
                            <div className="space-y-6">
                                <DocumentRow label="Aadhar Card" url={employee.aadharProof} name="aadharProof" isEditing={isEditing} onChange={handleDocumentChange} newFile={documentFiles.aadharProof} />
                                <DocumentRow label="PAN Card" url={employee.panProof} name="panProof" isEditing={isEditing} onChange={handleDocumentChange} newFile={documentFiles.panProof} />
                                <DocumentRow label="Bank Statement" url={employee.bankStatement} name="bankStatement" isEditing={isEditing} onChange={handleDocumentChange} newFile={documentFiles.bankStatement} />
                                <DocumentRow label="Qualification Doc 1" url={employee.educationalQualification1} name="educationalQualification1" isEditing={isEditing} onChange={handleDocumentChange} newFile={documentFiles.educationalQualification1} />
                                <DocumentRow label="Qualification Doc 2" url={employee.educationalQualification2} name="educationalQualification2" isEditing={isEditing} onChange={handleDocumentChange} newFile={documentFiles.educationalQualification2} />
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

const InputField = ({ label, name, type = "text", value, onChange, disabled }) => (
    <div className="space-y-1">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
        {type === 'textarea' ? (
            <textarea name={name} value={value} onChange={onChange} disabled={disabled} rows="3"
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed resize-none" />
        ) : (
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl font-bold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            />
        )}
    </div>
);

const ReadOnlyField = ({ label, value }) => (
    <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
        <div className="font-bold text-lg text-gray-200">{value || "-"}</div>
    </div>
);

const DocumentRow = ({ label, url, name, isEditing, onChange, newFile }) => {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-bold text-gray-500 dark:text-gray-400">
                <span>{label}</span>
                {newFile && <span className="text-green-500 text-xs">New Pending Upload</span>}
            </div>

            {/* Download Link */}
            {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                            <FaFileAlt />
                        </div>
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">View/Download</span>
                    </div>
                    <FaDownload className="text-gray-400 group-hover:text-blue-500" />
                </a>
            ) : (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-400 italic text-center">
                    No document uploaded
                </div>
            )}

            {/* Upload Input */}
            {isEditing && (
                <div className="relative pt-1">
                    <input type="file" name={name} onChange={onChange} className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-800 dark:file:text-gray-300 transition-all" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
            )}
        </div>
    );
}

export default EmployeeDetails;
