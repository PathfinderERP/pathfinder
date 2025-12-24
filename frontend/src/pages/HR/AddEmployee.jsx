import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { toast } from "react-toastify";
import { FaPlus, FaTimes } from "react-icons/fa";

const AddEmployee = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
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
        ifscCode: ""
    });

    const [files, setFiles] = useState({});
    const [masterData, setMasterData] = useState({
        centres: [],
        departments: [],
        designations: [],
        managers: []
    });

    useEffect(() => {
        fetchMasterData();
    }, []);

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
            salaryStructure: [...prev.salaryStructure, { effectiveDate: "", amount: 0 }]
        }));
    };

    const removeSalaryStructure = (index) => {
        setFormData(prev => ({
            ...prev,
            salaryStructure: prev.salaryStructure.filter((_, i) => i !== index)
        }));
    };

    const updateSalaryStructure = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            salaryStructure: prev.salaryStructure.map((salary, i) =>
                i === index ? { ...salary, [field]: value } : salary
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const formDataToSend = new FormData();

            // Append all text fields
            Object.keys(formData).forEach(key => {
                if (key === "children" || key === "centres" || key === "workingDays" || key === "salaryStructure") {
                    formDataToSend.append(key, JSON.stringify(formData[key]));
                } else {
                    formDataToSend.append(key, formData[key]);
                }
            });

            // Append files
            Object.keys(files).forEach(key => {
                if (files[key]) {
                    formDataToSend.append(key, files[key]);
                }
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formDataToSend
            });

            if (response.ok) {
                toast.success("Employee created successfully");
                navigate("/hr/employee/list");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to create employee");
            }
        } catch (error) {
            console.error("Error creating employee:", error);
            toast.error("Error creating employee");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Add Employee</h1>

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
                                    required
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
                                    required
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
                                    required
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
                                    required
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
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    placeholder="West Bengal"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
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
                                    Type Of Employment *
                                </label>
                                <select
                                    name="typeOfEmployment"
                                    value={formData.typeOfEmployment}
                                    onChange={handleInputChange}
                                    required
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Profile Image
                                </label>
                                <input
                                    type="file"
                                    name="profileImage"
                                    onChange={handleFileChange}
                                    accept=".jpg,.jpeg,.png"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
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
                                    Creating...
                                </>
                            ) : (
                                "Add"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default AddEmployee;
