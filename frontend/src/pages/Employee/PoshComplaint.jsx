import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaBuilding, FaUserTie, FaUsers, FaExclamationCircle, FaPaperPlane, FaUpload, FaImage, FaFilePdf } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";

const PoshComplaint = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [centres, setCentres] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [selectedCentre, setSelectedCentre] = useState("");
    const [selectedDept, setSelectedDept] = useState("");
    const [selectedDesig, setSelectedDesig] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState("");

    const [complaintDetails, setComplaintDetails] = useState("");
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        if (selectedCentre && selectedDept && selectedDesig) {
            fetchFilteredEmployees();
        } else {
            setEmployees([]);
        }
    }, [selectedCentre, selectedDept, selectedDesig]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centreRes, deptRes, desigRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/designation`, { headers })
            ]);

            if (centreRes.ok) setCentres(await centreRes.json());
            if (deptRes.ok) setDepartments(await deptRes.json());
            if (desigRes.ok) setDesignations(await desigRes.json());

        } catch (error) {
            console.error("Error fetching master data:", error);
            toast.error("Failed to load selection options");
        }
    };

    const fetchFilteredEmployees = async () => {
        try {
            const token = localStorage.getItem("token");
            const query = new URLSearchParams({
                centreId: selectedCentre,
                departmentId: selectedDept,
                designationId: selectedDesig
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/posh/employees?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setEmployees(await response.json());
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 5) {
            toast.error("You can upload a maximum of 5 files.");
            return;
        }
        setFiles(selectedFiles);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee || !complaintDetails.trim()) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append("accused", selectedEmployee);
        formData.append("centre", selectedCentre);
        formData.append("department", selectedDept);
        formData.append("designation", selectedDesig);
        formData.append("complaintDetails", complaintDetails);
        files.forEach(file => formData.append("files", file));

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/posh/create`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                toast.success("Complaint submitted successfully. HR will review it shortly.");
                // Reset form
                setSelectedCentre("");
                setSelectedDept("");
                setSelectedDesig("");
                setSelectedEmployee("");
                setComplaintDetails("");
                setFiles([]);
            } else {
                toast.error("Failed to submit complaint.");
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("An error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    const getSelectedEmployeeDetails = () => employees.find(e => e._id === selectedEmployee);

    return (
        <Layout activePage="Employee Center">
            <div className={`p-4 md:p-10 max-w-[1400px] mx-auto min-h-screen transition-colors duration-300 ${isDarkMode ? '' : 'text-gray-800'}`}>
                <div className="text-center mb-12">
                    <h1 className={`text-5xl font-black italic uppercase tracking-tighter mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        POSH <span className="text-red-500">Complaint</span> Portal
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                        Confidential & Secure Reporting Mechanism
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Selection Panel */}
                    <div className="space-y-8">
                        {/* Step 1: Filters */}
                        <div className={`border rounded-[2rem] p-8 shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <h3 className={`text-xl font-black uppercase tracking-tight italic mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isDarkMode ? 'bg-cyan-500/20 text-cyan-500' : 'bg-cyan-100 text-cyan-600'}`}>1</span>
                                Select Details
                            </h3>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Centre</label>
                                    <div className="relative">
                                        <FaBuilding className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                        <select
                                            value={selectedCentre}
                                            onChange={(e) => setSelectedCentre(e.target.value)}
                                            className={`w-full border rounded-xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-cyan-500 transition-all appearance-none ${isDarkMode ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                        >
                                            <option value="">Select Centre</option>
                                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Department</label>
                                    <div className="relative">
                                        <FaUsers className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                        <select
                                            value={selectedDept}
                                            onChange={(e) => setSelectedDept(e.target.value)}
                                            className={`w-full border rounded-xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-cyan-500 transition-all appearance-none ${isDarkMode ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d._id} value={d._id}>{d.departmentName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Designation</label>
                                    <div className="relative">
                                        <FaUserTie className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                        <select
                                            value={selectedDesig}
                                            onChange={(e) => setSelectedDesig(e.target.value)}
                                            className={`w-full border rounded-xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-cyan-500 transition-all appearance-none ${isDarkMode ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                        >
                                            <option value="">Select Designation</option>
                                            {designations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Employee Selection */}
                        <div className={`border rounded-[2rem] p-8 shadow-2xl transition-all duration-500 ${selectedDesig ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4 pointer-events-none'} ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <h3 className={`text-xl font-black uppercase tracking-tight italic mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isDarkMode ? 'bg-cyan-500/20 text-cyan-500' : 'bg-cyan-100 text-cyan-600'}`}>2</span>
                                Select Employee
                            </h3>

                            <div className="relative">
                                <select
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    className={`w-full border rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-cyan-500 transition-all appearance-none ${isDarkMode ? 'bg-black/40 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                >
                                    <option value="">Select the person involved</option>
                                    {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>)}
                                </select>
                            </div>

                            {/* Selected Employee Preview */}
                            {selectedEmployee && getSelectedEmployeeDetails() && (
                                <div className={`mt-8 p-6 rounded-2xl border flex items-center gap-6 animate-fadeIn ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <img
                                        src={getSelectedEmployeeDetails().profileImage || "https://ui-avatars.com/api/?name=" + getSelectedEmployeeDetails().name}
                                        alt="Employee"
                                        className={`w-20 h-20 rounded-2xl object-cover border-2 ${isDarkMode ? 'border-gray-700' : 'border-white shadow-sm'}`}
                                    />
                                    <div>
                                        <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{getSelectedEmployeeDetails().name}</h4>
                                        <p className="text-cyan-600 text-xs font-black uppercase tracking-widest">{getSelectedEmployeeDetails().employeeId}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Complaint Form */}
                    <div className={`border rounded-[3rem] p-10 shadow-3xl h-fit flex flex-col justify-between transition-all duration-500 ${selectedEmployee ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-4 pointer-events-none'} ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <FaExclamationCircle className="text-red-500" />
                                    Report Details
                                </h3>

                                <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Description of Incident</label>
                                <textarea
                                    className={`w-full border rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:border-red-500/50 min-h-[200px] transition-all resize-none ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                    placeholder="Please describe the incident in detail..."
                                    value={complaintDetails}
                                    onChange={(e) => setComplaintDetails(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Evidence Upload (Images/PDF)</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`w-full border border-dashed rounded-2xl p-6 text-center group-hover:border-gray-500 transition-all ${isDarkMode ? 'bg-black/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <FaUpload className={`mx-auto mb-2 transition-colors ${isDarkMode ? 'text-gray-500 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-600'}`} size={24} />
                                        <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{files.length > 0 ? `${files.length} files selected` : "Click to upload files"}</p>
                                    </div>
                                </div>
                                {files.length > 0 && (
                                    <div className="flex gap-2 mt-4 flex-wrap">
                                        {files.map((f, i) => (
                                            <div key={i} className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                                {f.type.includes('pdf') ? <FaFilePdf className="text-red-400 text-xs" /> : <FaImage className="text-blue-400 text-xs" />}
                                                <span className={`text-[10px] font-bold truncate max-w-[100px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{f.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-6 bg-red-600 text-white font-black uppercase text-sm tracking-[0.3em] rounded-[2rem] hover:bg-red-700 transition-all flex items-center justify-center gap-4 group disabled:opacity-50 shadow-lg shadow-red-900/20"
                            >
                                {submitting ? "Submitting..." : (
                                    <>
                                        Raise Complaint
                                        <FaPaperPlane className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PoshComplaint;
