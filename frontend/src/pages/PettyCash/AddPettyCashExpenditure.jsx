import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { FaPlus, FaTimes, FaFileImage, FaEye } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';

const AddPettyCashExpenditure = () => {
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [centres, setCentres] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [expenditureTypes, setExpenditureTypes] = useState([]);

    const [formData, setFormData] = useState({
        centre: "",
        date: new Date().toISOString().split('T')[0],
        category: "",
        subCategory: "",
        expenditureType: "",
        amount: "",
        description: "",
        approvedBy: "",
        vendorName: "",
        paymentMode: "",
        taxApplicable: false,
        billImage: null
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'pettyCashManagement', 'addExpenditure', 'create');

    // Get user's assigned centres
    const userCentres = user.centres || [];
    const isSuperAdmin = user.role === 'superAdmin';

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [expRes, centresRes, catsRes, typesRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/finance/petty-cash/expenditure`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL}/master-data/category`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL}/master-data/expenditure-type`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setExpenditures(expRes.data);
            setCategories(catsRes.data);
            setExpenditureTypes(typesRes.data);

            // Centre Filtering
            if (isSuperAdmin) {
                setCentres(centresRes.data);
            } else {
                const assignedIds = userCentres.map(c => c._id || c);
                const filtered = centresRes.data.filter(c => assignedIds.includes(c._id));
                setCentres(filtered);

                // Auto-select if only one centre
                if (filtered.length === 1) {
                    setFormData(prev => ({ ...prev, centre: filtered[0]._id }));
                }
            }
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubCategories = async (catId) => {
        if (!catId) {
            setSubCategories([]);
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/subcategory?categoryId=${catId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubCategories(response.data);
        } catch (error) {
            console.error("Failed to load sub-categories");
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'category') fetchSubCategories(value);
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, billImage: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });

        try {
            const token = localStorage.getItem("token");
            await axios.post(`${import.meta.env.VITE_API_URL}/finance/petty-cash/expenditure`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Expenditure submitted for approval");
            setShowModal(false);
            fetchData();
            setFormData({
                centre: "",
                date: new Date().toISOString().split('T')[0],
                category: "",
                subCategory: "",
                expenditureType: "",
                amount: "",
                description: "",
                approvedBy: "",
                vendorName: "",
                paymentMode: "",
                taxApplicable: false,
                billImage: null
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Submission failed");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Layout activePage="Petty Cash Management">
            <div className="flex-1 bg-[#131619] p-6 text-white min-h-screen">
                <ToastContainer theme="dark" />
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Add Petty Cash Expenditure</h2>
                    {canCreate && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors"
                        >
                            <FaPlus /> Add New
                        </button>
                    )}
                </div>

                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-800 text-gray-300">
                                    <th className="p-4 uppercase text-xs">Date</th>
                                    <th className="p-4 uppercase text-xs">Centre</th>
                                    <th className="p-4 uppercase text-xs">Category</th>
                                    <th className="p-4 uppercase text-xs">Sub Category</th>
                                    <th className="p-4 uppercase text-xs">Type</th>
                                    <th className="p-4 uppercase text-xs">Amount</th>
                                    <th className="p-4 uppercase text-xs">Description</th>
                                    <th className="p-4 uppercase text-xs">Payment Mode</th>
                                    <th className="p-4 uppercase text-xs">Status</th>
                                    <th className="p-4 uppercase text-xs">Bill</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan="10" className="p-10 text-center text-gray-500">Loading...</td></tr>
                                ) : expenditures.length === 0 ? (
                                    <tr><td colSpan="10" className="p-10 text-center text-gray-500">No expenditures found.</td></tr>
                                ) : (
                                    expenditures.map((item) => (
                                        <tr key={item._id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-gray-400">{new Date(item.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-medium">{item.centre?.centreName}</td>
                                            <td className="p-4 text-gray-400">{item.category?.name}</td>
                                            <td className="p-4 text-gray-400">{item.subCategory?.name}</td>
                                            <td className="p-4 text-gray-400">{item.expenditureType?.name}</td>
                                            <td className="p-4 font-bold">₹{item.amount}</td>
                                            <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{item.description}</td>
                                            <td className="p-4 text-gray-400">{item.paymentMode}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${item.status === 'approved' ? 'bg-green-900/40 text-green-400 border border-green-800/50' :
                                                    item.status === 'rejected' ? 'bg-red-900/40 text-red-400 border border-red-800/50' :
                                                        'bg-yellow-900/40 text-yellow-500 border border-yellow-800/50'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {item.billImage ? (
                                                    <a href={item.billImage} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                                        <FaEye /> View
                                                    </a>
                                                ) : "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#1a1f24] w-full max-w-2xl rounded-xl border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-[#1a1f24] z-10">
                                <h3 className="text-xl font-bold text-white">Add Expenditure</h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Centre <span className="text-red-500">*</span></label>
                                        <select
                                            name="centre"
                                            value={formData.centre}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            required
                                            disabled={!isSuperAdmin && centres.length === 1}
                                        >
                                            <option value="">Choose centre</option>
                                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Type <span className="text-red-500">*</span></label>
                                        <select
                                            name="expenditureType"
                                            value={formData.expenditureType}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            required
                                        >
                                            <option value="">Choose</option>
                                            {expenditureTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Category <span className="text-red-500">*</span></label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            required
                                        >
                                            <option value="">Choose</option>
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Sub Category <span className="text-red-500">*</span></label>
                                        <select
                                            name="subCategory"
                                            value={formData.subCategory}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            required
                                        >
                                            <option value="">Choose</option>
                                            {subCategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Amount <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 font-bold">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="Optional details..."
                                        rows="2"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Approved By</label>
                                        <input
                                            type="text"
                                            name="approvedBy"
                                            value={formData.approvedBy}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="Approver name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Vendor Name</label>
                                        <input
                                            type="text"
                                            name="vendorName"
                                            value={formData.vendorName}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="Vendor name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Payment Mode</label>
                                        <input
                                            type="text"
                                            name="paymentMode"
                                            value={formData.paymentMode}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="Cash, Card, etc."
                                        />
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="taxApplicable"
                                                checked={formData.taxApplicable}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 bg-[#131619] border-gray-700 text-blue-600 rounded"
                                            />
                                            <span className="text-sm text-gray-400 font-bold">Tax Applicable</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="border border-dashed border-gray-700 rounded-lg p-6 bg-[#131619]">
                                    <label className="block text-sm text-gray-400 mb-2 font-bold">Upload Bill (optional)</label>
                                    <div className="flex items-center gap-4">
                                        <label className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                                            <FaFileImage /> Choose File
                                            <input type="file" onChange={handleFileChange} className="hidden" />
                                        </label>
                                        <span className="text-xs text-gray-500 truncate">
                                            {formData.billImage ? formData.billImage.name : "No file chosen"}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-lg font-bold text-white shadow-lg transition-all"
                                >
                                    Add Expenditure
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AddPettyCashExpenditure;
