import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { INDIAN_STATES } from "../../../constants/states";

const AddCentreModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        centreName: "",
        enterCode: "",
        state: "",
        email: "",
        phoneNumber: "",
        salesPassword: "",
        location: "",
        address: "",
        locationPreview: "",
        enterGstNo: "",
        enterCorporateOfficeAddress: "",
        enterCorporateOfficePhoneNumber: ""
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Centre added successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to add centre");
            }
        } catch (error) {
            console.error("Error adding centre:", error);
            toast.error("Error adding centre");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1a1f24] rounded-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#1a1f24] z-10">
                    <h3 className="text-xl font-bold text-white">Add New Centre</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Centre Name *</label>
                            <input type="text" name="centreName" required value={formData.centreName} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Centre Code *</label>
                            <input type="text" name="enterCode" required value={formData.enterCode} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">State *</label>
                            <select
                                name="state"
                                required
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map((state) => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Email *</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Phone Number *</label>
                            <input type="text" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Sales Password *</label>
                            <input type="text" name="salesPassword" required value={formData.salesPassword} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">GST No</label>
                            <input type="text" name="enterGstNo" value={formData.enterGstNo} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Address</label>
                            <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Location Map URL</label>
                            <input type="text" name="locationPreview" value={formData.locationPreview} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div className="md:col-span-2">
                            <h4 className="text-cyan-400 font-semibold mt-2 mb-2">Corporate Office Details</h4>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Address</label>
                            <textarea name="enterCorporateOfficeAddress" value={formData.enterCorporateOfficeAddress} onChange={handleChange} rows="2" className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"></textarea>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                            <input type="text" name="enterCorporateOfficePhoneNumber" value={formData.enterCorporateOfficePhoneNumber} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400">
                            {loading ? "Adding..." : "Add Centre"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCentreModal;
