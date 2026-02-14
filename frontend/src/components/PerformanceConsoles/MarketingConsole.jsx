import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { FaBullhorn, FaUsers, FaChartLine, FaMoneyBillWave, FaChartPie, FaChartBar, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const MarketingConsole = ({ mainTheme = 'light', performanceData = [], monthlyTrends = [], admissionDetail = { bySource: [], byCenter: [] } }) => {
    const isDarkMode = mainTheme === 'dark';
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Aggregate summary from performanceData
    const totalLeads = performanceData.reduce((acc, curr) => acc + (curr.currentCalls || 0), 0);
    const totalConversions = performanceData.reduce((acc, curr) => acc + (curr.hotLeads || 0), 0);
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : "0.0";

    // Format for chart
    const chartData = performanceData
        .slice(0, 5)
        .map(curr => ({
            name: curr.name.split(' ')[0],
            leads: curr.currentCalls || 0,
            conversions: curr.hotLeads || 0
        }));

    // Use monthlyTrends from prop if available
    const chartTrends = monthlyTrends.length > 0 ? monthlyTrends : [
        { month: 'Jan', leads: 0, admissions: 0 },
        { month: 'Feb', leads: 0, admissions: 0 },
        { month: 'Mar', leads: 0, admissions: 0 },
        { month: 'Apr', leads: 0, admissions: 0 },
        { month: 'May', leads: Number(totalLeads) || 0, admissions: Number(totalConversions) || 0 },
    ];

    const exportToExcel = () => {
        const exportData = [
            ...admissionDetail.bySource.map(s => ({ Type: 'Source', Name: s.name, Count: s.value })),
            ...admissionDetail.byCenter.map(c => ({ Type: 'Center', Name: c.name, Count: c.value }))
        ];
        if (exportData.length === 0) return alert("No data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Marketing Admissions");
        XLSX.writeFile(workbook, `Marketing_Admission_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-6 rounded-[4px] border flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Leads</p>
                        <h3 className={`text-2xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalLeads.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 rounded-full bg-orange-500/10 text-orange-500">
                        <FaBullhorn size={20} />
                    </div>
                </div>

                <div className={`p-6 rounded-[4px] border flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Conversions</p>
                        <h3 className={`text-2xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalConversions.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                        <FaUsers size={20} />
                    </div>
                </div>

                <div className={`p-6 rounded-[4px] border flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Conv Rate</p>
                        <h3 className={`text-2xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{conversionRate}%</h3>
                    </div>
                    <div className="p-3 rounded-full bg-red-500/10 text-red-500">
                        <FaChartLine size={20} />
                    </div>
                </div>

                <div className={`p-6 rounded-[4px] border flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Team ROI</p>
                        <h3 className={`text-2xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{Number(conversionRate) * 12}%</h3>
                    </div>
                    <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-500">
                        <FaMoneyBillWave size={20} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campaign Performance Bar Chart */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Squad Performance</h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                <XAxis type="number" tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip
                                    cursor={{ fill: isDarkMode ? '#374151' : '#f3f4f6', opacity: 0.2 }}
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                <Bar dataKey="leads" name="Leads Generated" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} />
                                <Bar dataKey="conversions" name="Admissions" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Overall Growth Trend */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Lead Growth</h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartTrends}>
                                <defs>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="1 1" stroke={isDarkMode ? '#333' : '#eee'} />
                                <XAxis dataKey="month" tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Area type="monotone" dataKey="leads" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLeads)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Admission Analysis (Common with Counselling but filtered for marketing if data allows, currently global) */}
            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className={`text-lg font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaChartPie className="text-orange-500" /> Conversion Analysis
                        </h4>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Lead source and regional conversion metrics</p>
                    </div>
                    <button
                        onClick={exportToExcel}
                        className={`px-6 py-2 rounded-[2px] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-black' : 'bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-500 hover:text-white shadow-sm'}`}
                    >
                        <FaFileExcel /> Export Campaign Report
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Center Wise Reach</h5>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={admissionDetail.byCenter}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                                    <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                                    <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#fff' }} />
                                    <Bar dataKey="value" name="Conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Attribution</h5>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={admissionDetail.bySource}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {admissionDetail.bySource.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#fff' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketingConsole;
