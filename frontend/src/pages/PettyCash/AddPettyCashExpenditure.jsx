import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { FaPlus, FaTimes, FaCamera, FaImages, FaEye, FaFilePdf } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasPermission } from '../../config/permissions';

// Client-side image auto-compression utility (ensures files are under 1MB)
const compressImage = (file) => {
    return new Promise((resolve) => {
        if (!file.type.startsWith("image/")) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.8;
                const convert = (q) => {
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        if (blob.size > 1024 * 1024 && q > 0.1) {
                            convert(q - 0.15);
                        } else {
                            const compressedFile = new File([blob], file.name, {
                                type: "image/jpeg",
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        }
                    }, "image/jpeg", q);
                };
                convert(quality);
            };
            img.onerror = () => {
                resolve(file);
            };
        };
        reader.onerror = () => {
            resolve(file);
        };
    });
};

const AddPettyCashExpenditure = () => {
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [centres, setCentres] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [expenditureTypes, setExpenditureTypes] = useState([]);

    // Refs for file inputs
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const [formData, setFormData] = useState({
        centre: "",
        date: new Date().toISOString().split('T')[0],
        category: "",
        subCategory: "",
        expenditureType: "",
        amount: "",
        description: "",
        vendorName: "",
        paymentMode: "Cash",
        taxApplicable: false,
        billImage: null
    });
    const [files, setFiles] = useState([]);

    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setLoading(true);
        toast.info("Compressing files, please wait...");
        
        const compressedList = [];
        for (const file of selectedFiles) {
            const compressed = await compressImage(file);
            compressedList.push(compressed);
        }
        
        setFiles(prev => [...prev, ...compressedList]);
        setLoading(false);
        toast.success(`${selectedFiles.length} file(s) compressed and added!`);
        e.target.value = "";
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

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
            setExpenditures(Array.isArray(expRes.data.expenditures) ? expRes.data.expenditures : []);
            setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
            setExpenditureTypes(Array.isArray(typesRes.data) ? typesRes.data : []);

            // Centre Filtering
            const rawCentres = Array.isArray(centresRes.data) ? centresRes.data : [];
            if (isSuperAdmin) {
                setCentres(rawCentres);
            } else {
                const assignedIds = userCentres.map(c => c._id || c);
                const filtered = rawCentres.filter(c => assignedIds.includes(c._id));
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
            const data = Array.isArray(response.data) ? response.data : [];
            setSubCategories(data);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key !== 'billImage') {
                data.append(key, formData[key]);
            }
        });
        if (files.length > 0) {
            files.forEach(f => data.append("billImage", f));
        }

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
                vendorName: "",
                paymentMode: "Cash",
                taxApplicable: false,
                billImage: null
            });
            setFiles([]);
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
                                    <th className="p-4 uppercase text-xs">Created By</th>
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
                                            <td className="p-4 text-gray-400 font-bold">{item.requestedBy?.name || "-"}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${item.status === 'approved' ? 'bg-green-900/40 text-green-400 border border-green-800/50' :
                                                    item.status === 'rejected' ? 'bg-red-900/40 text-red-400 border border-red-800/50' :
                                                        'bg-yellow-900/40 text-yellow-500 border border-yellow-800/50'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {item.billImages && item.billImages.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {item.billImages.map((img, idx) => (
                                                            <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]" title={`Bill ${idx + 1}`}>
                                                                <FaEye /> View {item.billImages.length > 1 ? `#${idx + 1}` : ''}
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : item.billImage ? (
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
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Category</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        >
                                            <option value="">Choose</option>
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Sub Category</label>
                                        <select
                                            name="subCategory"
                                            value={formData.subCategory}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
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
                                    <label className="block text-xs text-gray-400 mb-1 font-bold">Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                        placeholder="Description Details (Required)..."
                                        rows="2"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Vendor/Staff Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="vendorName"
                                            value={formData.vendorName}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="Vendor/Staff Name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-bold">Payment Mode</label>
                                        <input
                                            type="text"
                                            name="paymentMode"
                                            value="Cash"
                                            disabled
                                            className="w-full bg-[#131619]/50 border border-gray-700 rounded-lg p-3 text-gray-400 outline-none cursor-not-allowed"
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
                                    <label className="block text-sm text-gray-400 mb-3 font-bold">Upload Bill (optional, Multiple Allowed)</label>

                                    {/* Hidden file inputs */}
                                    <input
                                        ref={cameraInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <input
                                        ref={galleryInputRef}
                                        type="file"
                                        accept="image/*,application/pdf"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />

                                    {/* Two action buttons */}
                                    <div className="flex gap-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-blue-700 bg-blue-900/20 text-blue-400 font-bold text-xs uppercase tracking-widest hover:bg-blue-800/30 hover:border-blue-500 transition-all"
                                        >
                                            <FaCamera className="text-base" />
                                            Camera
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-gray-700 bg-[#1a1f24] text-gray-300 font-bold text-xs uppercase tracking-widest hover:border-gray-500 hover:text-white transition-all"
                                        >
                                            <FaImages className="text-base" />
                                            Upload Photo
                                        </button>
                                    </div>

                                    {files.length > 0 && (
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                                            {files.length} file(s) selected — all compressed to under 1 MB
                                        </p>
                                    )}

                                    {/* Preview Grid */}
                                    {files.length > 0 && (
                                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {files.map((file, idx) => {
                                                const previewUrl = URL.createObjectURL(file);
                                                return (
                                                    <div key={idx} className="relative border border-gray-800 rounded-xl p-2 flex flex-col items-center bg-[#1a1f24]">
                                                        {file.type === "application/pdf" ? (
                                                            <div className="w-full h-24 flex flex-col items-center justify-center bg-[#241a1a] border border-[#402020] rounded-lg mb-2 text-red-500">
                                                                <FaFilePdf size={36} />
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={previewUrl}
                                                                alt="preview"
                                                                className="w-full h-24 object-cover rounded-lg mb-2"
                                                            />
                                                        )}
                                                        <span className="text-[9px] font-bold text-gray-400 truncate max-w-full block" title={file.name}>
                                                            {file.name}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-500">
                                                             {(file.size / 1024 / 1024).toFixed(2)} MB
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(idx)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors w-6 h-6 flex items-center justify-center text-xs shadow-lg"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
