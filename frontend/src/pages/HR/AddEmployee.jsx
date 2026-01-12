import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { toast } from "react-toastify";
import { FaPlus, FaTimes } from "react-icons/fa";

const AddEmployee = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        // Personal Details
        name: "",
        spouseName: "",
        dateOfBirth: "",
        gender: "",
        children: [],
        email: "",
        phoneNumber: "",
        whatsappNumber: "",
        alternativeNumber: "",

        // Official Details
        dateOfJoining: "",
        primaryCentre: "",
        centres: [],
        department: "",
        designation: "",
        manager: "",
        state: "",
        city: "",
        pinCode: "",
        address: "",
        aadharNumber: "",
        panNumber: "",

        // Work Details
        typeOfEmployment: "",
        workingHours: 0,
        workingDays: {
            sunday: false,
            monday: false,
            tuesday: false,
            wednesday: false,
            thursday: false,
            friday: false,
            saturday: false
        },
        probationPeriod: false,
        salaryStructure: [],

        // Bank Details
        bankName: "",
        branchName: "",
        accountNumber: "",
        ifscCode: "",
        ifceCode: "",
        specialAllowance: 0
    });

    const [files, setFiles] = useState({});
    const [masterData, setMasterData] = useState({
        centres: [],
        departments: [],
        designations: [],
        managers: []
    });

    const [salaryModal, setSalaryModal] = useState({
        isOpen: false,
        index: -1,
        tempData: null
    });

    useEffect(() => {
        fetchMasterData();
        if (id) {
            setIsEditMode(true);
            fetchEmployeeData();
        }
    }, [id]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centreRes, deptRes, desigRes, managerRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/designation`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/hr/employee/dropdown`, { headers })
            ]);

            setMasterData({
                centres: centreRes.ok ? await centreRes.json() : [],
                departments: deptRes.ok ? await deptRes.json() : [],
                designations: desigRes.ok ? await desigRes.json() : [],
                managers: managerRes.ok ? await managerRes.json() : []
            });
        } catch (error) {
            console.error("Error fetching master data:", error);
            toast.error("Failed to load form data");
        }
    };

    const fetchEmployeeData = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Format dates for input fields
                const formattedData = {
                    ...data,
                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : "",
                    dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining).toISOString().split('T')[0] : "",
                    primaryCentre: data.primaryCentre?._id || "",
                    centres: data.centres?.map(c => c._id) || [],
                    department: data.department?._id || "",
                    designation: data.designation?._id || "",
                    manager: data.manager?._id || "",
                    salaryStructure: data.salaryStructure?.map(s => ({
                        ...s,
                        effectiveDate: s.effectiveDate ? new Date(s.effectiveDate).toISOString().split('T')[0] : ""
                    })) || [],
                    branch: data.branch || "",
                    ifceCode: data.ifceCode || "",
                    spouse: data.spouse || "",
                    whatsAppNumber: data.whatsAppNumber || "",
                    alternatePhoneNumber: data.alternatePhoneNumber || "",
                    specialAllowance: data.specialAllowance || 0,
                    workingDays: {
                        sunday: data.workingDays?.sunday || data.workingDaysList?.some(d => d.toLowerCase() === "sunday") || false,
                        monday: data.workingDays?.monday || data.workingDaysList?.some(d => d.toLowerCase() === "monday") || false,
                        tuesday: data.workingDays?.tuesday || data.workingDaysList?.some(d => d.toLowerCase() === "tuesday") || false,
                        wednesday: data.workingDays?.wednesday || data.workingDaysList?.some(d => d.toLowerCase() === "wednesday") || false,
                        thursday: data.workingDays?.thursday || data.workingDaysList?.some(d => d.toLowerCase() === "thursday") || false,
                        friday: data.workingDays?.friday || data.workingDaysList?.some(d => d.toLowerCase() === "friday") || false,
                        saturday: data.workingDays?.saturday || data.workingDaysList?.some(d => d.toLowerCase() === "saturday") || false,
                    }
                };
                setFormData(formattedData);
            } else {
                toast.error("Failed to fetch employee data");
                navigate("/hr/employee/list");
            }
        } catch (error) {
            console.error("Error fetching employee data:", error);
            toast.error("Error fetching employee data");
            navigate("/hr/employee/list");
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleWorkingDayChange = (day) => {
        setFormData(prev => ({
            ...prev,
            workingDays: {
                ...prev.workingDays,
                [day]: !prev.workingDays[day]
            }
        }));
    };

    const handleCentreSelection = (centreId) => {
        setFormData(prev => {
            const centres = prev.centres.includes(centreId)
                ? prev.centres.filter(id => id !== centreId)
                : [...prev.centres, centreId];
            return { ...prev, centres };
        });
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles && selectedFiles[0]) {
            setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
        }
    };

    const addChild = () => {
        setFormData(prev => ({
            ...prev,
            children: [...prev.children, { name: "", age: "" }]
        }));
    };

    const removeChild = (index) => {
        setFormData(prev => ({
            ...prev,
            children: prev.children.filter((_, i) => i !== index)
        }));
    };

    const updateChild = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            children: prev.children.map((child, i) =>
                i === index ? { ...child, [field]: value } : child
            )
        }));
    };

    const addSalaryStructure = () => {
        setFormData(prev => ({
            ...prev,
            salaryStructure: [...prev.salaryStructure, {
                effectiveDate: new Date().toISOString().split('T')[0],
                amount: 0
            }]
        }));
    };

    const removeSalaryStructure = (index) => {
        setFormData(prev => ({
            ...prev,
            salaryStructure: prev.salaryStructure.filter((_, i) => i !== index)
        }));
    };

    const updateSalaryStructure = (index, field, value) => {
        setFormData(prev => {
            const newSalaryStructure = [...prev.salaryStructure];
            const updatedSalary = { ...newSalaryStructure[index], [field]: value };

            // If Net Salary (amount) is changed, auto-calculate breakdown
            if (field === "amount" || field === "netSalary") {
                const amountValue = parseFloat(value) || 0;
                // Forward calculation: Input is Gross
                const breakdown = calculateSalaryBreakdown(amountValue);
                newSalaryStructure[index] = {
                    ...updatedSalary,
                    ...breakdown,
                    amount: amountValue, // Amount is Gross
                    netSalary: breakdown.netSalary
                };
            } else {
                newSalaryStructure[index] = updatedSalary;

                // Recalculate totals and dependent deductions if components change
                const s = newSalaryStructure[index];

                const basic = parseFloat(s.basic) || 0;
                const totalEarnings = basic +
                    (parseFloat(s.conveyance) || 0) +
                    (parseFloat(s.hra) || 0) +
                    (parseFloat(s.specialAllowance) || 0);

                // PF
                let pf;
                if (basic <= 15000) {
                    pf = Math.round(basic * 0.12);
                } else {
                    pf = 1800;
                }

                // ESI
                let esi;
                if (totalEarnings <= 21000) {
                    esi = Math.ceil(totalEarnings * 0.0075);
                } else {
                    esi = 0;
                }

                // P.Tax
                let pTax = 0;
                if (totalEarnings <= 10000) pTax = 0;
                else if (totalEarnings <= 15000) pTax = 110;
                else if (totalEarnings <= 25000) pTax = 130;
                else if (totalEarnings <= 40000) pTax = 150;
                else pTax = 200;

                const totalDeductions = pf + esi + pTax +
                    (parseFloat(s.tds) || 0) +
                    (parseFloat(s.lossOfPay) || 0) +
                    (parseFloat(s.adjustment) || 0);

                newSalaryStructure[index].pf = pf;
                newSalaryStructure[index].esi = esi;
                newSalaryStructure[index].pTax = pTax;
                newSalaryStructure[index].totalEarnings = totalEarnings;
                newSalaryStructure[index].totalDeductions = totalDeductions;
                newSalaryStructure[index].netSalary = totalEarnings - totalDeductions;
                newSalaryStructure[index].amount = totalEarnings;
            }

            return { ...prev, salaryStructure: newSalaryStructure };
        });
    };

    const calculateSalaryBreakdown = (grossAmount) => {
        if (!grossAmount) return {};

        const gross = parseFloat(grossAmount);

        // Basic: 50% of Gross
        const basic = Math.round(gross * 0.50);

        // HRA: 50% of Basic
        const hra = Math.round(basic * 0.50);

        // Conveyance: 25% of Basic
        const conveyance = Math.round(basic * 0.25);

        // Special Allowance: Balance to match Gross
        const currentEarnings = basic + hra + conveyance;
        const specialAllowance = gross - currentEarnings;

        // Deductions
        // PF
        let pf;
        if (basic <= 15000) {
            pf = Math.round(basic * 0.12);
        } else {
            pf = 1800;
        }

        // ESI
        let esi;
        if (gross <= 21000) {
            esi = Math.ceil(gross * 0.0075);
        } else {
            esi = 0;
        }

        // P. Tax
        let pTax = 0;
        if (gross <= 10000) pTax = 0;
        else if (gross <= 15000) pTax = 110;
        else if (gross <= 25000) pTax = 130;
        else if (gross <= 40000) pTax = 150;
        else pTax = 200;

        const totalDeductions = pf + esi + pTax;

        return {
            basic,
            hra,
            conveyance,
            specialAllowance,
            adjustment: 0,
            totalEarnings: gross,
            pf,
            esi,
            pTax,
            tds: 0,
            lossOfPay: 0,
            totalDeductions,
            netSalary: gross - totalDeductions
        };
    };

    const openSalaryModal = (index) => {
        setSalaryModal({
            isOpen: true,
            index,
            tempData: { ...formData.salaryStructure[index] }
        });
    };

    const closeSalaryModal = (save = false) => {
        if (save) {
            setFormData(prev => ({
                ...prev,
                salaryStructure: prev.salaryStructure.map((s, i) =>
                    i === salaryModal.index ? salaryModal.tempData : s
                )
            }));
        }
        setSalaryModal({ isOpen: false, index: -1, tempData: null });
    };

    const handleSalaryModalInputChange = (field, value) => {
        const val = field === "effectiveDate" ? value : (parseFloat(value) || 0);

        setSalaryModal(prev => {
            const updated = { ...prev.tempData, [field]: val };

            if (field === "amount" || field === "grossSalary") {
                const breakdown = calculateSalaryBreakdown(val);
                return {
                    ...prev,
                    tempData: {
                        ...updated,
                        ...breakdown,
                        effectiveDate: updated.effectiveDate, // Preserve Date
                        amount: breakdown.totalEarnings
                    }
                };
            }

            // Recalculate everything
            const basic = parseFloat(updated.basic) || 0;
            const totalEarnings = basic +
                (parseFloat(updated.conveyance) || 0) +
                (parseFloat(updated.hra) || 0) +
                (parseFloat(updated.specialAllowance) || 0);

            // PF
            let pf;
            if (basic <= 15000) {
                pf = Math.round(basic * 0.12);
            } else {
                pf = 1800;
            }

            // ESI
            let esi;
            if (totalEarnings <= 21000) {
                esi = Math.ceil(totalEarnings * 0.0075);
            } else {
                esi = 0;
            }

            // P.Tax
            let pTax = 0;
            if (totalEarnings <= 10000) pTax = 0;
            else if (totalEarnings <= 15000) pTax = 110;
            else if (totalEarnings <= 25000) pTax = 130;
            else if (totalEarnings <= 40000) pTax = 150;
            else pTax = 200;

            const totalDeductions = pf + esi + pTax +
                (parseFloat(updated.tds) || 0) +
                (parseFloat(updated.lossOfPay) || 0) +
                (parseFloat(updated.adjustment) || 0);

            return {
                ...prev,
                tempData: {
                    ...updated,
                    pf,
                    esi,
                    pTax,
                    totalEarnings,
                    totalDeductions,
                    netSalary: totalEarnings - totalDeductions,
                    amount: totalEarnings
                }
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validate Salary Structure Dates
        if (formData.salaryStructure.some(s => !s.effectiveDate)) {
            toast.error("Please select an Effective Date for all salary entries.");
            setLoading(false);
            return;
        }


        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const formDataToSend = new FormData();

            const fileFields = [
                "aadharProof", "panProof", "bankStatement",
                "educationalQualification1", "educationalQualification2", "educationalQualification3",
                "form16", "insuranceDocument", "tdsCertificate", "profileImage"
            ];

            // Append all text fields
            Object.keys(formData).forEach(key => {
                if (key === "children" || key === "centres" || key === "workingDays" || key === "salaryStructure") {
                    formDataToSend.append(key, JSON.stringify(formData[key]));
                } else if (!fileFields.includes(key) && key !== "_id" && key !== "__v" && key !== "createdAt" && key !== "updatedAt" && key !== "employeeId") {
                    formDataToSend.append(key, formData[key]);
                }
            });

            // Append files
            Object.keys(files).forEach(key => {
                if (files[key]) {
                    formDataToSend.append(key, files[key]);
                }
            });

            const url = isEditMode
                ? `${import.meta.env.VITE_API_URL}/hr/employee/${id}`
                : `${import.meta.env.VITE_API_URL}/hr/employee`;

            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formDataToSend
            });

            if (response.ok) {
                toast.success(isEditMode ? "Employee updated successfully" : "Employee created successfully");
                navigate("/hr/employee/list");
            } else {
                const error = await response.json();
                toast.error(error.message || `Failed to ${isEditMode ? "update" : "create"} employee`);
            }
        } catch (error) {
            console.error(`Error ${isEditMode ? "updating" : "creating"} employee:`, error);
            toast.error(`Error ${isEditMode ? "updating" : "creating"} employee`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {isEditMode ? "Edit Employee" : "Add Employee"}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Details */}
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
                            Personal Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter full name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Date of Birth *
                                </label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Gender *
                                </label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Choose</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Spouse Name
                                </label>
                                <input
                                    type="text"
                                    name="spouseName"
                                    value={formData.spouseName}
                                    onChange={handleInputChange}
                                    placeholder="Enter spouse name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter email"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Enter phone number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    WhatsApp Number
                                </label>
                                <input
                                    type="tel"
                                    name="whatsappNumber"
                                    value={formData.whatsappNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter WhatsApp number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Alternative Number
                                </label>
                                <input
                                    type="tel"
                                    name="alternativeNumber"
                                    value={formData.alternativeNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter alternative number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Alternate Phone (CSV)
                                </label>
                                <input
                                    type="tel"
                                    name="alternatePhoneNumber"
                                    value={formData.alternatePhoneNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter alternate phone"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Blood Group
                                </label>
                                <input
                                    type="text"
                                    name="bloodGroup"
                                    value={formData.bloodGroup}
                                    onChange={handleInputChange}
                                    placeholder="Enter blood group"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Spouse (CSV)
                                </label>
                                <input
                                    type="text"
                                    name="spouse"
                                    value={formData.spouse}
                                    onChange={handleInputChange}
                                    placeholder="Enter spouse name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Aadhaar Number (CSV)
                                </label>
                                <input
                                    type="text"
                                    name="aadhaarNumber"
                                    value={formData.aadhaarNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter aadhaar number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Children Section */}
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Children
                                </label>
                                <button
                                    type="button"
                                    onClick={addChild}
                                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                >
                                    <FaPlus /> Add Child
                                </button>
                            </div>
                            {formData.children.map((child, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <input
                                        type="text"
                                        placeholder="Child name"
                                        value={child.name}
                                        onChange={(e) => updateChild(index, "name", e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Age"
                                        value={child.age}
                                        onChange={(e) => updateChild(index, "age", e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeChild(index)}
                                        className="text-red-600 hover:text-red-800 flex items-center justify-center gap-1"
                                    >
                                        <FaTimes /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Official Details */}
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
                            Official Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Date of Joining *
                                </label>
                                <input
                                    type="date"
                                    name="dateOfJoining"
                                    value={formData.dateOfJoining}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Primary Centre *
                                </label>
                                <select
                                    name="primaryCentre"
                                    value={formData.primaryCentre}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Choose</option>
                                    {masterData.centres.map(centre => (
                                        <option key={centre._id} value={centre._id}>{centre.centreName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Department *
                                </label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Choose</option>
                                    {masterData.departments.map(dept => (
                                        <option key={dept._id} value={dept._id}>{dept.departmentName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Designation *
                                </label>
                                <select
                                    name="designation"
                                    value={formData.designation}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Choose</option>
                                    {masterData.designations.map(desig => (
                                        <option key={desig._id} value={desig._id}>{desig.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Manager
                                </label>
                                <select
                                    name="manager"
                                    value={formData.manager}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Select manager</option>
                                    {masterData.managers.map(mgr => (
                                        <option key={mgr._id} value={mgr._id}>{mgr.name} ({mgr.employeeId})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    State
                                </label>
                                <select
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Select State</option>
                                    {[
                                        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                                        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
                                        "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
                                        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
                                        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
                                        "Uttar Pradesh", "Uttarakhand", "West Bengal",
                                        "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
                                        "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
                                    ].map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    City
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    placeholder="city"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Pin Code
                                </label>
                                <input
                                    type="text"
                                    name="pinCode"
                                    value={formData.pinCode}
                                    onChange={handleInputChange}
                                    placeholder="000000"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Address
                                </label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Address"
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Aadhar Number
                                </label>
                                <input
                                    type="text"
                                    name="aadharNumber"
                                    value={formData.aadharNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter Aadhar Number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    PAN Number
                                </label>
                                <input
                                    type="text"
                                    name="panNumber"
                                    value={formData.panNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter PAN Number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>




                        </div>

                        {/* Centres Multi-Select */}
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Centre *
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                {masterData.centres.map(centre => (
                                    <label key={centre._id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.centres.includes(centre._id)}
                                            onChange={() => handleCentreSelection(centre._id)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{centre.centreName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* File Uploads */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Aadhar Proof
                                </label>
                                <input
                                    type="file"
                                    name="aadharProof"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">Use pdf of front and back side</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Pan Proof
                                </label>
                                <input
                                    type="file"
                                    name="panProof"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">Use pdf of front and back side</p>
                            </div>
                        </div>
                    </div>

                    {/* Work Details */}
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
                            Work details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Type Of Employment
                                </label>
                                <select
                                    name="typeOfEmployment"
                                    value={formData.typeOfEmployment}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                >
                                    <option value="">Choose</option>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Intern">Intern</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Salary
                                </label>
                                <input
                                    type="number"
                                    name="salary"
                                    value={formData.salary}
                                    onChange={handleInputChange}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Special Allowance
                                </label>
                                <input
                                    type="number"
                                    name="specialAllowance"
                                    value={formData.specialAllowance}
                                    onChange={handleInputChange}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Working Hours
                                </label>
                                <input
                                    type="number"
                                    name="workingHours"
                                    value={formData.workingHours}
                                    onChange={handleInputChange}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Working Days */}
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Select Working Days
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(day => (
                                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.workingDays[day]}
                                            onChange={() => handleWorkingDayChange(day)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{day}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Probation Period */}
                        <div className="mt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="probationPeriod"
                                    checked={formData.probationPeriod}
                                    onChange={handleInputChange}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Probatation Period</span>
                            </label>
                        </div>

                        {/* Salary Structure */}
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Salary
                                </label>
                                <button
                                    type="button"
                                    onClick={addSalaryStructure}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                                >
                                    <FaPlus /> Add Salary Structure
                                </button>
                            </div>
                            {formData.salaryStructure.map((salary, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <input
                                        type="date"
                                        placeholder="Effective Date"
                                        value={salary.effectiveDate}
                                        onChange={(e) => updateSalaryStructure(index, "effectiveDate", e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={salary.amount}
                                        onChange={(e) => updateSalaryStructure(index, "amount", e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => openSalaryModal(index)}
                                        className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors text-gray-700 dark:text-gray-200"
                                    >
                                        Edit Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeSalaryStructure(index)}
                                        className="text-red-600 hover:text-red-800 flex items-center justify-center gap-1"
                                    >
                                        <FaTimes /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
                            Bank details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bank Name
                                </label>
                                <input
                                    type="text"
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleInputChange}
                                    placeholder="Enter bank name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Branch Name
                                </label>
                                <input
                                    type="text"
                                    name="branchName"
                                    value={formData.branchName}
                                    onChange={handleInputChange}
                                    placeholder="Enter branch name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Account Number
                                </label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter account number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ifsc Code
                                </label>
                                <input
                                    type="text"
                                    name="ifscCode"
                                    value={formData.ifscCode}
                                    onChange={handleInputChange}
                                    placeholder="Enter Ifsc Code"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Branch (CSV)
                                </label>
                                <input
                                    type="text"
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleInputChange}
                                    placeholder="Enter branch"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ifce Code (CSV)
                                </label>
                                <input
                                    type="text"
                                    name="ifceCode"
                                    value={formData.ifceCode}
                                    onChange={handleInputChange}
                                    placeholder="Enter ifce code"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bank Statement
                                </label>
                                <input
                                    type="file"
                                    name="bankStatement"
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Files area */}
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
                            Files area
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Education Qualification one
                                </label>
                                <input
                                    type="file"
                                    name="educationalQualification1"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Educational Qualification two
                                </label>
                                <input
                                    type="file"
                                    name="educationalQualification2"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Educational Qualification Three
                                </label>
                                <input
                                    type="file"
                                    name="educationalQualification3"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Form 16
                                </label>
                                <input
                                    type="file"
                                    name="form16"
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Insurance Document
                                </label>
                                <input
                                    type="file"
                                    name="insuranceDocument"
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    TDS Certificate
                                </label>
                                <input
                                    type="file"
                                    name="tdsCertificate"
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                            </div>
                            <div className="flex flex-col gap-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Profile Image
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                                        {files.profileImage ? (
                                            <img
                                                src={URL.createObjectURL(files.profileImage)}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : formData.profileImage ? (
                                            <img
                                                src={formData.profileImage}
                                                alt="Existing"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <FaPlus className="text-gray-400" />
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        name="profileImage"
                                        onChange={handleFileChange}
                                        accept=".jpg,.jpeg,.png"
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate("/hr/employee/list")}
                            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    {isEditMode ? "Updating..." : "Creating..."}
                                </>
                            ) : (
                                isEditMode ? "Update Employee" : "Add Employee"
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Salary Breakdown Modal */}
            {salaryModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col scale-in">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Salary Details</h2>
                            <button onClick={() => closeSalaryModal()} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Effective Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={salaryModal.tempData?.effectiveDate ? new Date(salaryModal.tempData.effectiveDate).toISOString().split('T')[0] : ""}
                                    onChange={(e) => handleSalaryModalInputChange("effectiveDate", e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Earnings Column */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                                        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Earnings</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Basic", field: "basic" },
                                            { label: "Conveyance", field: "conveyance" },
                                            { label: "HRA", field: "hra" },
                                            { label: "Special Allowance", field: "specialAllowance" }
                                        ].map(item => (
                                            <div key={item.field} className="flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 ml-1">{item.label}</label>
                                                <div className="relative group">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium group-focus-within:text-blue-500 transition-colors">₹</span>
                                                    <input
                                                        type="number"
                                                        value={salaryModal.tempData?.[item.field] || 0}
                                                        onChange={(e) => handleSalaryModalInputChange(item.field, e.target.value)}
                                                        className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white font-medium"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Deductions Column */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                                        <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Deductions</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: "P.F. (Employee's Contribution)", field: "pf" },
                                            { label: "ESI (Employee's Contribution)", field: "esi" },
                                            { label: "P Tax", field: "pTax" },
                                            { label: "TDS", field: "tds" },
                                            { label: "Loss Of Pay", field: "lossOfPay" },
                                            { label: "Adjustment", field: "adjustment" }
                                        ].map(item => (
                                            <div key={item.field} className="flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 ml-1">{item.label}</label>
                                                <div className="relative group">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium group-focus-within:text-red-500 transition-colors">₹</span>
                                                    <input
                                                        type="number"
                                                        value={salaryModal.tempData?.[item.field] || 0}
                                                        onChange={(e) => handleSalaryModalInputChange(item.field, e.target.value)}
                                                        className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all dark:text-white font-medium"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Totals Section */}
                            <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100/50 dark:border-blue-500/10 flex justify-between items-center">
                                    <span className="font-bold text-blue-700 dark:text-blue-400">Total Earnings</span>
                                    <span className="font-bold text-xl text-blue-800 dark:text-blue-300">₹ {salaryModal.tempData?.totalEarnings || 0}</span>
                                </div>
                                <div className="p-4 bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100/50 dark:border-red-500/10 flex justify-between items-center">
                                    <span className="font-bold text-red-700 dark:text-red-400">Total Deductions</span>
                                    <span className="font-bold text-xl text-red-800 dark:text-red-300">₹ {salaryModal.tempData?.totalDeductions || 0}</span>
                                </div>
                            </div>

                            {/* Net Salary Section */}
                            <div className="mt-6 p-5 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20 flex justify-between items-center transform transition-transform hover:scale-[1.01]">
                                <div className="flex flex-col">
                                    <span className="text-emerald-50 text-sm font-semibold uppercase tracking-wider opacity-90">Net Salary</span>
                                    <div className="text-3xl font-black text-white mt-1">₹ {salaryModal.tempData?.netSalary || 0}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <label className="text-emerald-50 text-xs font-bold uppercase tracking-widest opacity-80">Quick Update</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-200">₹</span>
                                        <input
                                            type="number"
                                            placeholder="Enter Gross Salary"
                                            onChange={(e) => handleSalaryModalInputChange("grossSalary", e.target.value)}
                                            className="w-40 pl-7 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:bg-white/20 outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                            <button
                                onClick={() => closeSalaryModal()}
                                className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => closeSalaryModal(true)}
                                className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                            >
                                Save Salary Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default AddEmployee;
