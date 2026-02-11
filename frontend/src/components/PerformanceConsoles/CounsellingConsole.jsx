import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { FaPhoneAlt, FaUserCheck, FaPercentage, FaChartLine, FaChartPie, FaChartBar, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CounsellingConsole = ({ mainTheme = 'light', performanceData = [], monthlyTrends = [], admissionDetail = { bySource: [], byCenter: [] } }) => {
    const isDarkMode = mainTheme === 'dark';

    // Aggregate summary from performanceData
    const totalCalls = performanceData.reduce((acc, curr) => acc + (curr.currentCalls || 0), 0);
    const totalAdmissions = performanceData.reduce((acc, curr) => acc + (curr.hotLeads || 0), 0);
    const avgConversion = totalCalls > 0
        ? ((totalAdmissions / totalCalls) * 100).toFixed(1)
        : "0.0";

    // Format for chart
    const chartData = performanceData
        .slice(0, 5) // Show top 5 for the bar chart
        .map(curr => ({
            name: curr.name.split(' ')[0],
            calls: curr.currentCalls || 0,
            admissions: curr.hotLeads || 0
        }));

    // Use monthlyTrends from prop if available
    const chartTrends = monthlyTrends.length > 0 ? monthlyTrends : [
        { month: 'Jan', calls: 0, admissions: 0 },
        { month: 'Feb', calls: 0, admissions: 0 },
        { month: 'Mar', calls: 0, admissions: 0 },
        { month: 'Apr', calls: 0, admissions: 0 },
        { month: 'May', calls: Number(totalCalls) || 0, admissions: Number(totalAdmissions) || 0 },
    ];

    const exportToExcel = () => {
        const exportData = [
            ...admissionDetail.bySource.map(s => ({ Type: 'Source', Name: s.name, Count: s.value })),
            ...admissionDetail.byCenter.map(c => ({ Type: 'Center', Name: c.name, Count: c.value }))
        ];
        if (exportData.length === 0) return alert("No data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions Report");
        XLSX.writeFile(workbook, `Counselling_Admission_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Key Metrics */}
                <div className={`p-6 rounded-[4px] border flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Students Called</p>
                        <h3 className={`text-3xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalCalls.toLocaleString()}</h3>
                    </div>
                    <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
                        <FaPhoneAlt size={24} />
                    </div>
                </div>

                <div className={`p-6 rounded-[4px] border flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Admissions Taken</p>
                        <h3 className={`text-3xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalAdmissions.toLocaleString()}</h3>
                    </div>
                    <div className="p-4 rounded-full bg-green-500/10 text-green-500">
                        <FaUserCheck size={24} />
                    </div>
                </div>

                <div className={`p-6 rounded-[4px] border flex items-center justify-between ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Conversion Rate</p>
                        <h3 className={`text-3xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{avgConversion}%</h3>
                    </div>
                    <div className="p-4 rounded-full bg-purple-500/10 text-purple-500">
                        <FaPercentage size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Counsellor Performance Chart */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Counsellor Performance</h4>
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
                                <Bar dataKey="calls" name="Calls Made" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
                                <Bar dataKey="admissions" name="Admissions Taken" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Trends Chart */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Admission Trends</h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartTrends}>
                                <defs>
                                    <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                                <Area type="monotone" dataKey="admissions" stroke="#10b981" fillOpacity={1} fill="url(#colorAdmissions)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Admission Report Section */}
            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className={`text-lg font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaChartLine className="text-cyan-500" /> Global Admission Analysis
                        </h4>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Real-time breakdown of conversion channels</p>
                    </div>
                    <button
                        onClick={exportToExcel}
                        className={`px-6 py-2 rounded-[2px] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-black' : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white shadow-sm'}`}
                    >
                        <FaFileExcel /> Export Global Report
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Admissions by Center (Bar Chart) */}
                    <div className="space-y-4">
                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Center-wise Admissions</h5>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={admissionDetail.byCenter}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                                    <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                                    <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#fff' }} />
                                    <Bar dataKey="value" name="Admissions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Admissions by Source (Pie Chart) */}
                    <div className="space-y-4">
                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source-wise Admissions</h5>
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

            {/* Admission Volume Area Chart for every Counsellor */}
            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className={`text-sm font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaChartLine className="text-cyan-500" /> Individual Counsellor Admission Volume
                        </h4>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Comparative admission contribution across the squad</p>
                    </div>
                </div>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceData.map(c => ({ name: c.name.split(' ')[0], admissions: c.hotLeads || 0 }))}>
                            <defs>
                                <linearGradient id="colorCounsellorAdmissions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }}
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                            <Tooltip
                                contentStyle={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                                itemStyle={{ color: '#06b6d4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="admissions"
                                name="Admissions Taken"
                                stroke="#06b6d4"
                                fillOpacity={1}
                                fill="url(#colorCounsellorAdmissions)"
                                strokeWidth={3}
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default CounsellingConsole;
