import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermission } from '../../../config/permissions';

const AccountContent = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState(null);
    const [formData, setFormData] = useState({
        accno: "",
        accname: ""
    });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'account', 'create');
    const canEdit = hasPermission(user, 'masterData', 'account', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'account', 'delete');

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/account`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setAccounts(data);
            } else {
                toast.error(data.message || "Failed to fetch accounts");
            }
        } catch (err) {
            toast.error("Server error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (acc = null) => {
        if (acc) {
            setCurrentAccount(acc);
            setFormData({
                accno: acc.accno,
                accname: acc.accname
            });
        } else {
            setCurrentAccount(null);
            setFormData({
                accno: "",
                accname: ""
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentAccount(null);
        setFormData({
            accno: "",
            accname: ""
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentAccount
            ? `${import.meta.env.VITE_API_URL}/master-data/account/${currentAccount._id}`
            : `${import.meta.env.VITE_API_URL}/master-data/account`;
        const method = currentAccount ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(currentAccount ? "Account updated successfully" : "Account created successfully");
                fetchAccounts();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this account?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/account/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Account deleted successfully");
                fetchAccounts();
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Account Master Data</h2>
                {canCreate && (
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <FaPlus /> Add Account
                    </button>
                )}
            </div>

            <div className="bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800 text-gray-300">
                                <th className="p-4 border-b border-gray-700">#</th>
                                <th className="p-4 border-b border-gray-700">Acc No</th>
                                <th className="p-4 border-b border-gray-700">Acc Name</th>
                                <th className="p-4 border-b border-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : accounts.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">No accounts found</td>
                                </tr>
                            ) : (
                                accounts.map((acc, index) => (
                                    <tr key={acc._id} className="master-data-row-wave border-b border-gray-800 transition-colors hover:bg-white/5">
                                        <td className="p-4 text-gray-400">{index + 1}</td>
                                        <td className="p-4 font-medium text-cyan-300">{acc.accno}</td>
                                        <td className="p-4">{acc.accname}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-3 text-lg">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(acc)}
                                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(acc._id)}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-[#1a1f24] p-6 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {currentAccount ? "Edit Account" : "Add New Account"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 mb-1.5 text-sm font-semibold">Account Number (accno)</label>
                                <input
                                    type="text"
                                    name="accno"
                                    value={formData.accno}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                    placeholder="Enter account number"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1.5 text-sm font-semibold">Account Name (accname)</label>
                                <input
                                    type="text"
                                    name="accname"
                                    value={formData.accname}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                    placeholder="Enter account name"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-cyan-900/20"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountContent;
