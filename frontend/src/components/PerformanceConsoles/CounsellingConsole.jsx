import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend, PieChart, Pie, Cell, LabelList } from 'recharts';
import { FaUsers, FaPhoneAlt, FaUserCheck, FaPercentage, FaChartLine, FaChartPie, FaChartBar, FaFileExcel, FaUserTie, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CounsellingConsole = ({ mainTheme = 'light', performanceData = [], monthlyTrends = [], timePeriod = 'daily' }) => {
    const isDarkMode = mainTheme === 'dark';

    // Aggregate summary from performanceData
    const totalCalls = performanceData.reduce((acc, curr) => acc + (curr.currentCalls || 0), 0);
    const totalAdmissions = performanceData.reduce((acc, curr) => acc + (curr.admissions || 0), 0);
    const totalCounselled = performanceData.reduce((acc, curr) => acc + (curr.counselledCount || 0), 0);

    // Target Calculations
    const targetCallsPerDay = 30 * (performanceData.length || 1);
    const targetAdmissionsPerWeek = 5 * (performanceData.length || 1);

    const avgConversion = totalCalls > 0
        ? ((totalAdmissions / totalCalls) * 100).toFixed(1)
        : "0.0";

    // Format for comparative bar chart (Today vs Yesterday)
    const dailyComparisonData = performanceData
        .map(curr => ({
            name: curr.name.split(' ')[0],
            today: curr.todayCalls || 0,
            yesterday: curr.yesterdayCalls || 0
        }));

    // Format for comparative bar chart (This Month vs Last Month)
    const monthlyComparisonData = performanceData
        .map(curr => ({
            name: curr.name.split(' ')[0],
            thisMonth: curr.thisMonthCalls || 0,
            lastMonth: curr.lastMonthCalls || 0
        }));

    // Format for Counsellor Performance (Calls vs Admissions vs Counselled)
    const chartData = performanceData
        .map(curr => ({
            name: curr.name.split(' ')[0],
            calls: curr.currentCalls || 0,
            admissions: curr.admissions || 0,
            counselled: curr.counselledCount || 0
        }));

    // Center-wise counsellor distribution
    const centerWiseCounsellors = (() => {
        const counts = {};
        performanceData.forEach(p => {
            const list = p.centres || p.centers || [];
            list.forEach(c => {
                const name = c.centreName || c;
                counts[name] = (counts[name] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([name, count], idx) => ({ name, count, id: name + idx })) // Added id for unique key
            .sort((a, b) => b.count - a.count);
    })();

    const exportToExcel = () => {
        const exportData = performanceData.map(p => {
            const row = {
                'Counsellor Name': p.name,
                'Role': p.role,
                'Centers': (p.centres || p.centers || []).map(c => c.centreName || c).join(', ') || 'N/A',
            };

            if (timePeriod === 'daily') {
                row['Today Calls'] = p.todayCalls || 0;
                row['Yesterday Calls'] = p.yesterdayCalls || 0;
            } else if (timePeriod === 'weekly') {
                row['This Week Calls'] = p.currentCalls || 0;
                row['Last Week Calls'] = p.previousCalls || 0;
            } else if (timePeriod === 'monthly') {
                row['This Month Calls'] = p.thisMonthCalls || 0;
                row['Last Month Calls'] = p.lastMonthCalls || 0;
            } else {
                row['Current Period Calls'] = p.currentCalls || 0;
                row['Previous Period Calls'] = p.previousCalls || 0;
            }

            row['Counselled'] = p.counselledCount || 0;
            row['Admissions'] = p.admissions || 0;
            row['Conversion %'] = p.currentCalls > 0 ? ((p.admissions / p.currentCalls) * 100).toFixed(2) + '%' : '0%';
            row['Report Type'] = timePeriod.toUpperCase();

            return row;
        });

        if (exportData.length === 0) return alert("No data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Counselling Performance");
        XLSX.writeFile(workbook, `Counselling_Detailed_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            {/* Target Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} relative overflow-hidden group`}>
                    <div className="relative z-10">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Total Counsellors</p>
                        <div className="flex items-end gap-2 mt-2">
                            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{performanceData.length}</h3>
                            <FaUsers className="text-orange-500 mb-1" size={12} />
                        </div>
                        <p className="text-[8px] text-orange-500 font-black mt-2 uppercase tracking-tighter">Active Squad Size</p>
                    </div>
                    <div className="absolute -right-2 -bottom-2 text-orange-500/10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                        <FaUsers size={64} />
                    </div>
                </div>
                <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} relative overflow-hidden group`}>
                    <div className="relative z-10">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Daily Call Target</p>
                        <div className="flex items-end gap-2 mt-2">
                            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalCalls}</h3>
                            <span className="text-[10px] text-gray-500 font-bold mb-1">/ {targetCallsPerDay}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, (totalCalls / targetCallsPerDay) * 100)}%` }}></div>
                        </div>
                    </div>
                    <FaPhoneAlt className="absolute -right-2 -bottom-2 text-blue-500/10" size={60} />
                </div>

                <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} relative overflow-hidden group`}>
                    <div className="relative z-10">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Weekly Admission Target</p>
                        <div className="flex items-end gap-2 mt-2">
                            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalAdmissions}</h3>
                            <span className="text-[10px] text-gray-500 font-bold mb-1">/ {targetAdmissionsPerWeek}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, (totalAdmissions / targetAdmissionsPerWeek) * 100)}%` }}></div>
                        </div>
                    </div>
                    <FaUserCheck className="absolute -right-2 -bottom-2 text-emerald-500/10" size={60} />
                </div>

                <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} relative overflow-hidden group`}>
                    <div className="relative z-10">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Students Counselled</p>
                        <div className="flex items-end gap-2 mt-2">
                            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalCounselled}</h3>
                            <FaCheckCircle className="text-cyan-500 mb-1" size={12} />
                        </div>
                        <p className="text-[8px] text-cyan-500 font-black mt-2 uppercase tracking-tighter">Active Engagement Focus</p>
                    </div>
                    <FaUserTie className="absolute -right-2 -bottom-2 text-cyan-500/10" size={60} />
                </div>

                <div className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} relative overflow-hidden group`}>
                    <div className="relative z-10">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Average Conversion</p>
                        <div className="flex items-end gap-1 mt-2">
                            <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{avgConversion}</h3>
                            <span className="text-lg font-black text-purple-500">%</span>
                        </div>
                        <p className="text-[8px] text-purple-500 font-black mt-2 uppercase tracking-tighter">Call to Enrollment Efficiency</p>
                    </div>
                    <FaPercentage className="absolute -right-2 -bottom-2 text-purple-500/10" size={60} />
                </div>
            </div>

            {/* Center-wise Distribution Row */}
            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-500/10 rounded">
                        <FaChartPie className="text-orange-500" />
                    </div>
                    <div>
                        <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Center-wise Agent Distribution</h4>
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Counsellor headcount per operational region</p>
                    </div>
                </div>
                <div className="h-[120px] overflow-y-auto custom-scrollbar">
                    <ResponsiveContainer width="100%" height={Math.max(100, centerWiseCounsellors.length * 30)} minHeight={100}>
                        <BarChart layout="vertical" data={centerWiseCounsellors} margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#333' : '#eee'} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke={isDarkMode ? '#666' : '#999'}
                                fontSize={8}
                                fontWeight="black"
                                width={120}
                                tickFormatter={(val) => val.toUpperCase()}
                            />
                            <Tooltip
                                cursor={{ fill: isDarkMode ? '#ffffff05' : '#00000005' }}
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                    borderRadius: '2px',
                                    fontSize: '9px',
                                    fontWeight: '900'
                                }}
                            />
                            <Bar dataKey="count" name="Counsellors" fill="#f97316" radius={[0, 2, 2, 0]} barSize={12}>
                                <LabelList dataKey="count" position="right" style={{ fill: '#f97316', fontSize: 9, fontWeight: 900 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Individual Comparative Bar Chart - Today vs Yesterday */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Daily Call Comparison</h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                                <span className="text-[8px] font-black text-gray-500 uppercase">Today</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                                <span className="text-[8px] font-black text-gray-500 uppercase">Yesterday</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] overflow-x-auto overflow-y-hidden custom-scrollbar">
                        <div style={{ minWidth: `${Math.max(100, dailyComparisonData.length * 60)}px`, height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <BarChart data={dailyComparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                    <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 9, fontWeight: 900 }} />
                                    <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 900 }} />
                                    <Tooltip
                                        cursor={{ fill: isDarkMode ? '#ffffff05' : '#00000005' }}
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                            borderRadius: '2px',
                                            fontSize: '11px',
                                            fontWeight: '900'
                                        }}
                                    />
                                    <Bar dataKey="today" name="Calls Today" fill="#06b6d4" radius={[2, 2, 0, 0]} barSize={15}>
                                        <LabelList dataKey="today" position="top" style={{ fill: isDarkMode ? '#06b6d4' : '#0e7490', fontSize: 9, fontWeight: 900 }} />
                                    </Bar>
                                    <Bar dataKey="yesterday" name="Calls Yesterday" fill="#4b5563" radius={[2, 2, 0, 0]} barSize={15}>
                                        <LabelList dataKey="yesterday" position="top" style={{ fill: '#666', fontSize: 9, fontWeight: 900 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Individual Comparative Bar Chart - This Month vs Last Month */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Call Comparison</h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[8px] font-black text-gray-500 uppercase">This Month</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-900"></span>
                                <span className="text-[8px] font-black text-gray-500 uppercase">Last Month</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] overflow-x-auto overflow-y-hidden custom-scrollbar">
                        <div style={{ minWidth: `${Math.max(100, monthlyComparisonData.length * 60)}px`, height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <BarChart data={monthlyComparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                    <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 9, fontWeight: 900 }} />
                                    <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 900 }} />
                                    <Tooltip
                                        cursor={{ fill: isDarkMode ? '#ffffff05' : '#00000005' }}
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                            borderRadius: '2px',
                                            fontSize: '11px',
                                            fontWeight: '900'
                                        }}
                                    />
                                    <Bar dataKey="thisMonth" name="This Month" fill="#10b981" radius={[2, 2, 0, 0]} barSize={15}>
                                        <LabelList dataKey="thisMonth" position="top" style={{ fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                                    </Bar>
                                    <Bar dataKey="lastMonth" name="Last Month" fill="#064e3b" radius={[2, 2, 0, 0]} barSize={15}>
                                        <LabelList dataKey="lastMonth" position="top" style={{ fill: '#064e3b', fontSize: 9, fontWeight: 900 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Mix Chart - Moved out of grid for full width */}
            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'} mb-6`}>
                <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance Distribution</h4>
                <div className="h-[400px] overflow-x-auto overflow-y-hidden custom-scrollbar">
                    <div style={{ minWidth: `${Math.max(100, chartData.length * 80)}px`, height: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                                <defs>
                                    <linearGradient id="colorCallsCounselling" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorAdmsCounselling" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#333' : '#eee'} vertical={false} />
                                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 9, fontWeight: 900 }} />
                                <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '2px',
                                        fontSize: '11px',
                                        fontWeight: '900'
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Area type="monotone" dataKey="calls" name="Calls" stroke="#3b82f6" fill="url(#colorCallsCounselling)" strokeWidth={3} />
                                <Area type="monotone" dataKey="counselled" name="Counselled" stroke="#a855f7" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                                <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#10b981" fill="url(#colorAdmsCounselling)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Counselled Breakdown & Targets */}
            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h4 className={`text-lg font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaChartBar className="text-cyan-500" /> Detailed Squad Analytics
                        </h4>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Comparison of individual counsellor targets and output</p>
                    </div>
                    <button
                        onClick={exportToExcel}
                        className={`px-6 py-2 rounded-[2px] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 hover:bg-cyan-500 hover:text-white' : 'bg-cyan-50 text-cyan-600 border border-cyan-200 hover:bg-cyan-500 hover:text-white'}`}
                    >
                        <FaFileExcel /> Export Performance Data
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {performanceData.map((p, idx) => (
                        <div key={idx} className={`p-4 rounded-[4px] border ${isDarkMode ? 'bg-[#0f1216] border-gray-800' : 'bg-gray-50 border-gray-200'} transition-all hover:border-cyan-500/50`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-black">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h5 className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</h5>
                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{p.role}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-500 uppercase">Calls Today</span>
                                    <span className={`text-xs font-black ${p.todayCalls >= 30 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                        {p.todayCalls} / 30
                                    </span>
                                </div>
                                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${p.todayCalls >= 30 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, (p.todayCalls / 30) * 100)}%` }}></div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-500 uppercase">Counselled</span>
                                    <span className="text-xs font-black text-white">{p.counselledCount}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-500 uppercase">Admissions</span>
                                    <span className={`text-xs font-black ${p.admissions >= 5 ? 'text-emerald-500' : 'text-blue-500'}`}>
                                        {p.admissions} / 5
                                    </span>
                                </div>
                                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div className={`h-full bg-blue-500 transition-all duration-1000`} style={{ width: `${Math.min(100, (p.admissions / 5) * 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Conv Rate</span>
                                <span className="text-[10px] font-black text-cyan-500">
                                    {p.currentCalls > 0 ? ((p.admissions / p.currentCalls) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Global Admission Trends */}
            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                <h4 className={`text-sm font-black uppercase tracking-widest mb-10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Performance Evolution</h4>
                <div className="h-[350px] overflow-x-auto overflow-y-hidden custom-scrollbar">
                    <div style={{ minWidth: `${Math.max(100, monthlyTrends.length * 80)}px`, height: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <BarChart data={monthlyTrends} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                <XAxis dataKey="month" tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 900 }} />
                                <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip
                                    cursor={{ fill: isDarkMode ? '#ffffff05' : '#00000005' }}
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '2px',
                                        fontSize: '11px',
                                        fontWeight: '900'
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                                <Bar dataKey="calls" name="Monthly Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30}>
                                    <LabelList dataKey="calls" position="top" style={{ fill: '#3b82f6', fontSize: 10, fontWeight: 900 }} />
                                </Bar>
                                <Bar dataKey="admissions" name="Monthly Admissions" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30}>
                                    <LabelList dataKey="admissions" position="top" style={{ fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CounsellingConsole;

