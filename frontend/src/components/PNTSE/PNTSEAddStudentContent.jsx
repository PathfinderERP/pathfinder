import React, { useState } from 'react';
import {
    FaUserPlus, FaGraduationCap, FaPhoneAlt, FaMapMarkerAlt,
    FaSchool, FaCalendarAlt, FaSave, FaTimes, FaCheckCircle
} from 'react-icons/fa';

const INITIAL_FORM = {
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    dob: '',
    gender: '',
    class: '',
    school: '',
    centre: '',
    session: '',
    guardianName: '',
    guardianMobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    examDate: '',
    rollNo: '',
    remarks: '',
};

const PNTSEAddStudentContent = () => {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const centres = ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Allahabad', 'Gorakhpur'];
    const classes = ['6th', '7th', '8th', '9th', '10th'];
    const sessions = ['2025-26', '2026-27'];
    const genders = ['Male', 'Female', 'Other'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = 'First name is required';
        if (!form.lastName.trim()) errs.lastName = 'Last name is required';
        if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) errs.mobile = 'Valid 10-digit mobile is required';
        if (!form.class) errs.class = 'Class is required';
        if (!form.centre) errs.centre = 'Centre is required';
        if (!form.session) errs.session = 'Session is required';
        if (!form.gender) errs.gender = 'Gender is required';
        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        // TODO: API call here
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setForm(INITIAL_FORM);
        }, 3000);
    };

    const handleReset = () => {
        setForm(INITIAL_FORM);
        setErrors({});
    };

    const Field = ({ label, name, type = 'text', placeholder, options, required }) => (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {options ? (
                <select
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 focus:outline-none focus:ring-1 transition-all cursor-pointer
                        ${errors[name] ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                >
                    <option value="">Select {label}</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={`px-4 py-2.5 bg-gray-800 border rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 transition-all
                        ${errors[name] ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/30'}`}
                />
            )}
            {errors[name] && (
                <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                    <FaTimes className="text-[10px]" /> {errors[name]}
                </p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <FaUserPlus className="text-white text-lg" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Add PNTSE Student</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Register a new student for PNTSE examination</p>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {submitted && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/30 animate-bounce">
                    <FaCheckCircle className="text-lg" />
                    <span className="font-medium">Student registered successfully!</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
                {/* Personal Information */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <FaGraduationCap className="text-cyan-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Personal Information</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Field label="First Name" name="firstName" placeholder="Enter first name" required />
                        <Field label="Last Name" name="lastName" placeholder="Enter last name" required />
                        <Field label="Date of Birth" name="dob" type="date" required={false} />
                        <Field label="Gender" name="gender" options={genders} required />
                        <Field label="Mobile" name="mobile" placeholder="10-digit mobile number" required />
                        <Field label="Email" name="email" type="email" placeholder="student@example.com" />
                    </div>
                </div>

                {/* Academic Information */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <FaSchool className="text-violet-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Academic Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Field label="Class" name="class" options={classes} required />
                        <Field label="School Name" name="school" placeholder="Name of school" />
                        <Field label="Centre" name="centre" options={centres} required />
                        <Field label="Session" name="session" options={sessions} required />
                        <Field label="Exam Date" name="examDate" type="date" />
                        <Field label="Roll No." name="rollNo" placeholder="Leave blank to auto-generate" />
                    </div>
                </div>

                {/* Guardian Information */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <FaPhoneAlt className="text-amber-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Guardian Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Guardian Name" name="guardianName" placeholder="Parent / Guardian name" />
                        <Field label="Guardian Mobile" name="guardianMobile" placeholder="10-digit mobile number" />
                    </div>
                </div>

                {/* Address */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <FaMapMarkerAlt className="text-emerald-400 text-sm" />
                        </div>
                        <h2 className="text-sm font-semibold text-white">Address Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Address</label>
                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Street address..."
                                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
                            />
                        </div>
                        <Field label="City" name="city" placeholder="City" />
                        <Field label="State" name="state" placeholder="State" />
                        <Field label="Pincode" name="pincode" placeholder="6-digit pincode" />
                    </div>
                </div>

                {/* Remarks */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remarks / Notes</label>
                        <textarea
                            name="remarks"
                            value={form.remarks}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Any additional notes about this student..."
                            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pb-8">
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25"
                    >
                        <FaSave />
                        Register Student
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-all duration-200 border border-gray-700"
                    >
                        <FaTimes />
                        Reset Form
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PNTSEAddStudentContent;
