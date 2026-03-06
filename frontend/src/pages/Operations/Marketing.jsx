import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { FaBullhorn, FaChartLine, FaUsers, FaTasks, FaBook, FaRegImage, FaRegNewspaper, FaSave, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MarketingPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        leaflets: 0,
        banners: 0,
        books: 0
    });
    
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/operations/marketing`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setHistory(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: Math.max(0, parseInt(value) || 0)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/operations/marketing`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                toast.success('Marketing requirements submitted successfully!');
                setFormData({ leaflets: 0, banners: 0, books: 0 });
                fetchHistory();
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to submit requirements');
        } finally {
            setIsLoading(false);
        }
    };

    const cardBg = isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white shadow-sm border border-gray-100';
    const inputBg = isDarkMode ? 'bg-[#131619] border border-gray-700 text-white focus:border-orange-500' : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-orange-500';

    return (
        <Layout activePage="Operations">
            <div className={`p-6 min-h-screen pb-20 ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />
                
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                        Operational Marketing
                    </h1>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Manage marketing campaigns, outreach, requirements, and operational performance.
                    </p>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className={`p-6 rounded-2xl ${cardBg}`}>
                        <FaBullhorn className="text-3xl text-orange-500 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Campaign Tracking</h3>
                        <p className="text-sm text-gray-500 mb-4">Monitor active campaigns and their real-time performance metrics.</p>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: '65%' }}></div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl ${cardBg}`}>
                        <FaUsers className="text-3xl text-blue-500 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Outreach Efficiency</h3>
                        <p className="text-sm text-gray-500 mb-4">Analyze the efficiency of your marketing team's outreach efforts.</p>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: '45%' }}></div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl ${cardBg}`}>
                        <FaChartLine className="text-3xl text-green-500 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Lead Conversion</h3>
                        <p className="text-sm text-gray-500 mb-4">View how operational marketing activities translate into successful leads.</p>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: '80%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Material Requirements Section */}
                <div className={`rounded-3xl p-8 mb-8 ${cardBg}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex flex-col items-center justify-center">
                            <FaTasks className="text-xl text-orange-500" />
                        </div>
                        <h2 className="text-2xl font-bold">Material Requirements Request</h2>
                    </div>
                    <p className={`text-sm mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Submit your exact requirements for marketing materials across different categories.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                            {/* Leaflets */}
                            <div className={`p-8 rounded-3xl border-2 border-dashed transition-all hover:border-orange-500/50 ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-500/20 flex flex-col items-center justify-center mb-6 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                                        <FaRegNewspaper className="text-4xl text-orange-500" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-orange-500">Leaflets</h3>
                                    <p className={`text-xs mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Targeted marketing pamphlets for street distribution</p>
                                    
                                    <div className="w-full">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 text-left">Quantity Required</label>
                                        <input 
                                            type="number"
                                            name="leaflets"
                                            value={formData.leaflets}
                                            onChange={handleInputChange}
                                            className={`w-full p-5 rounded-2xl outline-none transition-all text-center font-bold text-3xl focus:ring-2 focus:ring-orange-500/50 ${inputBg}`}
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Banners */}
                            <div className={`p-8 rounded-3xl border-2 border-dashed transition-all hover:border-blue-500/50 ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-500/20 flex flex-col items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                                        <FaRegImage className="text-4xl text-blue-500" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-blue-500">Banners</h3>
                                    <p className={`text-xs mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Large display flex banners for high-visibility locations</p>
                                    
                                    <div className="w-full">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 text-left">Quantity Required</label>
                                        <input 
                                            type="number"
                                            name="banners"
                                            value={formData.banners}
                                            onChange={handleInputChange}
                                            className={`w-full p-5 rounded-2xl outline-none transition-all text-center font-bold text-3xl focus:ring-2 focus:ring-blue-500/50 ${inputBg}`}
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Books */}
                            <div className={`p-8 rounded-3xl border-2 border-dashed transition-all hover:border-green-500/50 ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-500/20 flex flex-col items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                                        <FaBook className="text-4xl text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-green-500">Books</h3>
                                    <p className={`text-xs mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Detailed promotional or curriculum books</p>
                                    
                                    <div className="w-full">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 text-left">Quantity Required</label>
                                        <input 
                                            type="number"
                                            name="books"
                                            value={formData.books}
                                            onChange={handleInputChange}
                                            className={`w-full p-5 rounded-2xl outline-none transition-all text-center font-bold text-3xl focus:ring-2 focus:ring-green-500/50 ${inputBg}`}
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="submit"
                                disabled={isLoading || (formData.leaflets === 0 && formData.banners === 0 && formData.books === 0)}
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-10 py-4 rounded-xl font-bold flex items-center gap-3 shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
                            >
                                {isLoading ? <FaSpinner className="animate-spin text-xl" /> : <FaSave className="text-xl" />}
                                Submit Requirements
                            </button>
                        </div>
                    </form>
                </div>

                {/* History Section */}
                {history.length > 0 && (
                    <div className={`rounded-3xl p-8 border ${isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white shadow-sm'}`}>
                        <h2 className="text-xl font-bold mb-6">Recent Requests History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={`text-xs uppercase font-bold tracking-wider ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                    <tr>
                                        <th className="p-5 rounded-tl-xl border-b border-gray-200 dark:border-gray-700">Date & Time</th>
                                        <th className="p-5 border-b border-gray-200 dark:border-gray-700">Leaflets</th>
                                        <th className="p-5 border-b border-gray-200 dark:border-gray-700">Banners</th>
                                        <th className="p-5 border-b border-gray-200 dark:border-gray-700">Books</th>
                                        <th className="p-5 rounded-tr-xl border-b border-gray-200 dark:border-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                    {history.map((req) => (
                                        <tr key={req._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-5 text-sm font-medium">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                                <div className="text-xs text-gray-500 mt-1">{new Date(req.createdAt).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-5 font-bold text-orange-500 tabular-nums text-lg">{req.leaflets}</td>
                                            <td className="p-5 font-bold text-blue-500 tabular-nums text-lg">{req.banners}</td>
                                            <td className="p-5 font-bold text-green-500 tabular-nums text-lg">{req.books}</td>
                                            <td className="p-5">
                                                <span className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full flex inline-flex items-center gap-2 ${
                                                    req.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20' :
                                                    req.status === 'Approved' ? 'bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20' :
                                                    'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'Pending' ? 'bg-yellow-500' : req.status === 'Approved' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MarketingPage;
