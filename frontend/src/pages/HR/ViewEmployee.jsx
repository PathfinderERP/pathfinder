import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { toast } from "react-toastify";
import {
    FaArrowLeft, FaEdit, FaDownload, FaPhone, FaEnvelope,
    FaWhatsapp, FaMapMarkerAlt, FaCalendarAlt, FaIdCard,
    FaUniversity, FaBriefcase, FaUserShield, FaFileAlt
} from "react-icons/fa";

const ViewEmployee = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployee();
    }, [id]);

    const fetchEmployee = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Debug - Employee Data:", data);
                setEmployee(data);
            } else {
                toast.error("Failed to fetch employee details");
                navigate("/hr/employee/list");
            }
        } catch (error) {
            console.error("Error fetching employee:", error);
            toast.error("Error fetching employee details");
            navigate("/hr/employee/list");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout activePage="HR & Manpower">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-cyan-500/10 border-b-cyan-500 rounded-full animate-spin-reverse"></div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!employee) return null;

    const SectionCard = ({ title, icon, children }) => (
        <div className="group bg-[#1a1f24] rounded-2xl border border-gray-800 p-6 hover:border-cyan-500/30 transition-all duration-300 shadow-xl">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children}
            </div>
        </div>
    );

    const DataField = ({ label, value, subValue }) => (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-base text-gray-100 font-medium">{value || "—"}</p>
            {subValue && <p className="text-xs text-cyan-500/70">{subValue}</p>}
        </div>
    );

    const DocCard = ({ label, url }) => {
        if (!url) return null;
        return (
            <div className="flex items-center justify-between p-4 bg-[#131619] rounded-xl border border-gray-800 hover:border-cyan-500/50 transition-all group">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg text-gray-400 group-hover:text-cyan-400">
                        <FaFileAlt size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{label}</span>
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                    title="Download/View"
                >
                    <FaDownload />
                </a>
            </div>
        );
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16 px-4">

                {/* Modern Header / Hero Section */}
                <div className="relative bg-[#1a1f24] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                    {/* Cover Pattern Overlay */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-cyan-600/20 via-blue-600/10 to-transparent"></div>

                    <div className="relative pt-12 pb-8 px-8">
                        <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
                            {/* Animated Profile Image Ring */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <div className="relative w-40 h-40 rounded-full border-4 border-[#1a1f24] overflow-hidden bg-[#131619] shadow-2xl flex items-center justify-center">
                                    {employee.profileImage ? (
                                        <img
                                            src={employee.profileImage}
                                            alt={employee.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.error("Profile image failed to load:", employee.profileImage);
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`${employee.profileImage ? 'hidden' : 'flex'} w-full h-full items-center justify-center text-4xl font-bold text-cyan-500/30 bg-[#131619]`}
                                    >
                                        {employee.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className={`absolute bottom-2 right-4 w-6 h-6 rounded-full border-4 border-[#1a1f24] ${employee.status === "Active" ? "bg-green-500" : "bg-red-500"
                                    } shadow-lg`}></div>
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-2">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                                    <h1 className="text-4xl font-extrabold text-white tracking-tight">
                                        {employee.name}
                                    </h1>
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${employee.status === "Active"
                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                        }`}>
                                        {employee.status}
                                    </span>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-6 text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <FaBriefcase className="text-cyan-500/70" />
                                        <span className="text-lg font-medium text-gray-300">{employee.designation?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaIdCard className="text-cyan-500/70" />
                                        <span className="font-mono">{employee.employeeId}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaMapMarkerAlt className="text-cyan-500/70" />
                                        <span>{employee.city}, {employee.state}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => navigate("/hr/employee/list")}
                                    className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition-all border border-gray-700 flex items-center gap-2"
                                >
                                    <FaArrowLeft /> Back
                                </button>
                                <button
                                    onClick={() => navigate(`/hr/employee/edit/${id}`)}
                                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                                >
                                    <FaEdit /> Edit Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Toolbar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-gray-800 bg-[#131619]/50 backdrop-blur-sm">
                        <div className="p-4 text-center border-r border-gray-800">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Joining Date</p>
                            <p className="text-sm font-bold text-white">
                                {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB') : "—"}
                            </p>
                        </div>
                        <div className="p-4 text-center border-r border-gray-800">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Department</p>
                            <p className="text-sm font-bold text-white">{employee.department?.departmentName || "General"}</p>
                        </div>
                        <div className="p-4 text-center border-r border-gray-800">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Company Primary Center</p>
                            <p className="text-sm font-bold text-cyan-400">{employee.primaryCentre?.centreName || "—"}</p>
                        </div>
                        <div className="p-4 text-center">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Employment Type</p>
                            <p className="text-sm font-bold text-white">{employee.typeOfEmployment}</p>
                        </div>
                    </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-8">

                    {/* Personal Details */}
                    <SectionCard title="Personal Information" icon={<FaUserShield />}>
                        <DataField label="Full Legal Name" value={employee.name} />
                        <DataField label="Gender" value={employee.gender} />
                        <DataField label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-GB') : "—"} />
                        <DataField label="Email Address" value={employee.email} />
                        <div className="flex items-center gap-3 mt-1">
                            <DataField label="Phone Number" value={employee.phoneNumber} />
                        </div>
                        <DataField label="WhatsApp" value={employee.whatsappNumber} />
                        <DataField label="Spouse Name" value={employee.spouseName} />
                        <DataField label="Alternative Contact" value={employee.alternativeNumber} />
                        <div className="md:col-span-3">
                            <DataField label="Residential Address" value={employee.address} subValue={`${employee.city}, ${employee.state} - ${employee.pinCode}`} />
                        </div>
                    </SectionCard>

                    {/* Official & Identity */}
                    <SectionCard title="Official & Identity" icon={<FaIdCard />}>
                        <DataField label="Aadhar Number" value={employee.aadharNumber} />
                        <DataField label="PAN Number" value={employee.panNumber} />
                        <DataField label="Reports To (Manager)" value={employee.manager?.name} subValue={employee.manager?.employeeId} />
                        <div className="md:col-span-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned Centers</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-bold">
                                    {employee.primaryCentre?.centreName} (Primary)
                                </span>
                                {employee.centres?.filter(c => c._id !== employee.primaryCentre?._id).map(c => (
                                    <span key={c._id} className="px-3 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg text-xs font-medium">
                                        {c.centreName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </SectionCard>

                    {/* Work & Salary */}
                    <SectionCard title="Work & Compensation" icon={<FaBriefcase />}>
                        <DataField label="Current Salary" value={`₹${employee.currentSalary?.toLocaleString()}`} subValue="Per Month" />
                        <DataField label="Working Hours" value={`${employee.workingHours} Hrs`} subValue="Daily Average" />
                        <DataField label="Probation" value={employee.probationPeriod ? "On Probation" : "Confirmed"} />
                        <div className="md:col-span-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Weekly Work Schedule</p>
                            <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                    <div key={day} className={`flex flex-col items-center min-w-[60px] p-2 rounded-xl border transition-all ${employee.workingDays?.[day]
                                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                        : "bg-[#131619] border-gray-800 text-gray-600"
                                        }`}>
                                        <span className="text-[10px] font-bold uppercase mb-1">{day.slice(0, 3)}</span>
                                        <div className={`w-2 h-2 rounded-full ${employee.workingDays?.[day] ? "bg-cyan-500" : "bg-gray-800"}`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Salary Breakdown Table */}
                        {employee.salaryStructure && employee.salaryStructure.length > 0 && (
                            <div className="md:col-span-3 mt-6">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-cyan-500 rounded-full"></span>
                                    Latest Salary Structure Breakdown
                                </p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 bg-[#131619] rounded-2xl border border-gray-800">
                                    {/* Earnings */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-400 border-b border-gray-800 pb-2 flex justify-between">
                                            <span>EARNINGS</span>
                                            <span className="text-cyan-400 tracking-wider">AMOUNT (₹)</span>
                                        </h4>
                                        <div className="space-y-2.5">
                                            {[
                                                { label: "Basic Salary", value: employee.salaryStructure[0]?.basic },
                                                { label: "HRA", value: employee.salaryStructure[0]?.hra },
                                                { label: "Conveyance", value: employee.salaryStructure[0]?.conveyance },
                                                { label: "Special Allowance", value: employee.salaryStructure[0]?.specialAllowance }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm py-0.5">
                                                    <span className="text-gray-500">{item.label}</span>
                                                    <span className="text-gray-300 font-medium">{item.value?.toLocaleString() || 0}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-sm font-bold pt-3 mt-2 border-t border-gray-800/50">
                                                <span className="text-gray-200">TOTAL EARNINGS (GROSS)</span>
                                                <span className="text-cyan-400">₹ {employee.salaryStructure[0]?.totalEarnings?.toLocaleString() || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deductions */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-400 border-b border-gray-800 pb-2 flex justify-between">
                                            <span>DEDUCTIONS</span>
                                            <span className="text-red-400 tracking-wider">AMOUNT (₹)</span>
                                        </h4>
                                        <div className="space-y-2.5">
                                            {[
                                                { label: "Provident Fund (PF)", value: employee.salaryStructure[0]?.pf },
                                                { label: "ESI Contribution", value: employee.salaryStructure[0]?.esi },
                                                { label: "Professional Tax", value: employee.salaryStructure[0]?.pTax },
                                                { label: "TDS / Income Tax", value: employee.salaryStructure[0]?.tds },
                                                { label: "Loss of Pay", value: employee.salaryStructure[0]?.lossOfPay },
                                                { label: "Adjustment", value: employee.salaryStructure[0]?.adjustment }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm py-0.5">
                                                    <span className="text-gray-500">{item.label}</span>
                                                    <span className="text-gray-300 font-medium">{item.value?.toLocaleString() || 0}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-sm font-bold pt-3 mt-2 border-t border-gray-800/50">
                                                <span className="text-gray-200">TOTAL DEDUCTIONS</span>
                                                <span className="text-red-400">₹ {employee.salaryStructure[0]?.totalDeductions?.toLocaleString() || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final Net */}
                                    <div className="lg:col-span-2 mt-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex justify-between items-center group hover:bg-cyan-500/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-[#1a1f24]">
                                                <FaUniversity size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em]">Net Take-Home Salary</p>
                                                <p className="text-xs text-gray-500 font-medium">Effective from {new Date(employee.salaryStructure[0]?.effectiveDate).toLocaleDateString('en-GB')}</p>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform">
                                            ₹ {employee.salaryStructure[0]?.netSalary?.toLocaleString() || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Bank Details */}
                    <SectionCard title="Financial Profile" icon={<FaUniversity />}>
                        <DataField label="Bank Name" value={employee.bankName} />
                        <DataField label="Account Number" value={employee.accountNumber} />
                        <DataField label="IFSC Code" value={employee.ifscCode} />
                        <DataField label="Branch" value={employee.branchName} />
                    </SectionCard>

                    {/* Documents Grid */}
                    <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <FaFileAlt />
                            </div>
                            <h3 className="text-xl font-bold text-white">Digital Documents Folder</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <DocCard label="Aadhar Document" url={employee.aadharProof} />
                            <DocCard label="PAN Card" url={employee.panProof} />
                            <DocCard label="Bank Statement" url={employee.bankStatement} />
                            <DocCard label="Form 16" url={employee.form16} />
                            <DocCard label="Insurance Paper" url={employee.insuranceDocument} />
                            <DocCard label="TDS Certificate" url={employee.tdsCertificate} />
                            <DocCard label="Education Proof 1" url={employee.educationalQualification1} />
                            <DocCard label="Education Proof 2" url={employee.educationalQualification2} />
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin-reverse {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                .animate-spin-reverse {
                    animation: spin-reverse 1.5s linear infinite;
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </Layout>
    );
};

export default ViewEmployee;
