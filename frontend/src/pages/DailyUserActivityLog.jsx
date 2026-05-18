import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import {
    FaUserTie, FaArrowLeft, FaPhoneAlt, FaUsers, FaUserGraduate,
    FaMoneyBillWave, FaCalendarAlt, FaIdCard, FaReceipt,
    FaFire, FaSnowflake, FaThermometerHalf, FaCheckCircle, FaSearch
} from 'react-icons/fa';
import { toast } from "react-toastify";

const LEAD_TYPE_CONFIG = {
    'HOT LEAD':  { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: <FaFire />,            label: 'HOT'  },
    'WARM LEAD': { color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  icon: <FaThermometerHalf />, label: 'WARM' },
    'COLD LEAD': { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   icon: <FaSnowflake />,       label: 'COLD' },
    'UNTAGGED':  { color: 'text-gray-400',    bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   icon: <FaPhoneAlt />,        label: '-'    },
};

const getLeadConfig = (type) => {
    const key = (type || '').toUpperCase();
    if (key.includes('HOT'))  return LEAD_TYPE_CONFIG['HOT LEAD'];
    if (key.includes('WARM')) return LEAD_TYPE_CONFIG['WARM LEAD'];
    if (key.includes('COLD')) return LEAD_TYPE_CONFIG['COLD LEAD'];
    return LEAD_TYPE_CONFIG['UNTAGGED'];
};

const DailyUserActivityLog = () => {
    const { userId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const queryParams = new URLSearchParams(location.search);
    const initialDate = new Date().toISOString().split('T')[0];

    const [fromDate, setFromDate] = useState(queryParams.get('fromDate') || queryParams.get('date') || initialDate);
    const [toDate, setToDate]     = useState(queryParams.get('toDate')   || queryParams.get('date') || initialDate);
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [callSearch, setCallSearch] = useState('');
    const [callTypeFilter, setCallTypeFilter] = useState('ALL'); // ALL | FRESH | FOLLOW-UP
    const [leadTypeFilter, setLeadTypeFilter] = useState('ALL'); // ALL | HOT | WARM | COLD

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                const apiUrl = import.meta.env.VITE_API_URL;
                const response = await fetch(
                    `${apiUrl}/operations/daily-tracking/user/${userId}?fromDate=${fromDate}&toDate=${toDate}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const result = await response.json();
                if (response.ok) setData(result);
                else toast.error("Failed to fetch activity log");
            } catch (error) {
                console.error("Error fetching activity log:", error);
                toast.error("Error fetching activity log");
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [userId, fromDate, toDate]);

    const card = isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm';
    const subText = isDark ? 'text-gray-400' : 'text-gray-500';
    const mainText = isDark ? 'text-gray-100' : 'text-gray-900';
    const rowHover = isDark ? 'hover:bg-black/10' : 'hover:bg-gray-50';
    const theadBg = isDark ? 'bg-black/20 text-gray-500' : 'bg-gray-50 text-gray-500';
    const divider = isDark ? 'divide-gray-800' : 'divide-gray-100';

    if (loading) return (
        <Layout activePage="Daily Center Tracking">
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
            </div>
        </Layout>
    );

    if (!data) return (
        <Layout activePage="Daily Center Tracking">
            <div className="p-6 text-center text-gray-500">Activity log not found.</div>
        </Layout>
    );

    // Filtered call list
    const filteredCalls = (data.callDetails || []).filter(call => {
        const matchSearch = callSearch === '' ||
            call.studentName.toLowerCase().includes(callSearch.toLowerCase()) ||
            call.phoneNumber.includes(callSearch) ||
            (call.feedback || '').toLowerCase().includes(callSearch.toLowerCase());
        const matchType   = callTypeFilter === 'ALL' || call.callType === callTypeFilter;
        const cfg         = getLeadConfig(call.leadType);
        const matchLead   = leadTypeFilter === 'ALL' || cfg.label === leadTypeFilter;
        return matchSearch && matchType && matchLead;
    });

    const totalCalls = data.leads.totalFollowUps;
    const collectionTotal = (data.collections.freshAdmissionTotal || 0) + (data.collections.installmentTotal || 0);

    return (
        <Layout activePage="Daily Center Tracking">
            <div className={`p-4 md:p-6 min-h-screen ${isDark ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className={`mb-4 flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <FaArrowLeft /> Back to Center Details
                    </button>

                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/30">
                                <FaUserTie className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tight">{data.userName}</h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{data.role}</span>
                                    <span className={subText}>•</span>
                                    <span className={`text-xs font-medium flex items-center gap-1 ${subText}`}>
                                        <FaCalendarAlt />
                                        {new Date(fromDate).toLocaleDateString('en-GB')} – {new Date(toDate).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Date Pickers */}
                        <div className={`flex flex-wrap items-center gap-3 p-2 rounded-lg border ${isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="flex items-center gap-2 px-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>From:</label>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                    className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]" />
                            </div>
                            <div className={`h-4 w-[1px] ${isDark ? 'bg-gray-700' : 'bg-gray-300'} hidden md:block`} />
                            <div className="flex items-center gap-2 px-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>To:</label>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                    className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total Calls',   value: totalCalls,                  color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   icon: <FaPhoneAlt /> },
                        { label: 'Counselled',    value: data.counselled.total,        color: 'text-purple-400', bg: 'bg-purple-500/10', icon: <FaUsers /> },
                        { label: 'Admissions',    value: data.admissions.total,        color: 'text-green-400',  bg: 'bg-green-500/10',  icon: <FaUserGraduate /> },
                        { label: 'Collection',    value: `₹${collectionTotal.toLocaleString('en-IN')}`, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <FaMoneyBillWave /> },
                    ].map((kpi, i) => (
                        <div key={i} className={`p-5 rounded-xl border ${card} flex items-center gap-4`}>
                            <div className={`p-3 rounded-lg ${kpi.bg} ${kpi.color} text-lg`}>{kpi.icon}</div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>{kpi.label}</p>
                                <p className={`text-2xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* HOT / WARM / COLD breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Hot Leads',  value: data.leads.hot,  cfg: LEAD_TYPE_CONFIG['HOT LEAD']  },
                        { label: 'Warm Leads', value: data.leads.warm, cfg: LEAD_TYPE_CONFIG['WARM LEAD'] },
                        { label: 'Cold Leads', value: data.leads.cold, cfg: LEAD_TYPE_CONFIG['COLD LEAD'] },
                    ].map((item, i) => {
                        const pct = totalCalls > 0 ? Math.round((item.value / totalCalls) * 100) : 0;
                        return (
                            <div key={i} className={`p-5 rounded-xl border ${card} flex items-center justify-between gap-4`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg text-lg ${item.cfg.bg} ${item.cfg.color}`}>{item.cfg.icon}</div>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>{item.label}</p>
                                        <p className={`text-3xl font-black tracking-tighter ${item.cfg.color}`}>{item.value}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-black ${item.cfg.color} ${item.cfg.bg} px-2 py-1 rounded-full border ${item.cfg.border}`}>
                                        {pct}%
                                    </span>
                                    <p className={`text-[10px] mt-1 ${subText}`}>of total calls</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Calls Detail Table */}
                <div className={`rounded-xl border overflow-hidden mb-6 ${card}`}>
                    {/* Table Header + Filters */}
                    <div className={`p-5 border-b flex flex-wrap items-center gap-4 justify-between ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400"><FaPhoneAlt /></div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em]">
                                Call Activity Log
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    {filteredCalls.length} / {data.callDetails?.length || 0}
                                </span>
                            </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${isDark ? 'bg-black/20 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <FaSearch className={`text-[10px] ${subText}`} />
                                <input
                                    type="text"
                                    placeholder="Search name, phone, feedback..."
                                    value={callSearch}
                                    onChange={e => setCallSearch(e.target.value)}
                                    className="bg-transparent outline-none w-44 text-xs"
                                />
                            </div>
                            {/* Call Type Filter */}
                            <div className={`flex rounded-lg overflow-hidden border text-[10px] font-black uppercase ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                {['ALL', 'FRESH', 'FOLLOW-UP'].map(f => (
                                    <button key={f} onClick={() => setCallTypeFilter(f)}
                                        className={`px-3 py-1.5 transition-all ${callTypeFilter === f
                                            ? 'bg-cyan-500 text-white'
                                            : isDark ? 'bg-black/20 text-gray-400 hover:bg-gray-800' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            {/* Lead Type Filter */}
                            <div className={`flex rounded-lg overflow-hidden border text-[10px] font-black uppercase ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                {['ALL', 'HOT', 'WARM', 'COLD'].map(f => {
                                    const cfgMap = { HOT: LEAD_TYPE_CONFIG['HOT LEAD'], WARM: LEAD_TYPE_CONFIG['WARM LEAD'], COLD: LEAD_TYPE_CONFIG['COLD LEAD'] };
                                    const active = leadTypeFilter === f;
                                    const cfg = cfgMap[f];
                                    return (
                                        <button key={f} onClick={() => setLeadTypeFilter(f)}
                                            className={`px-3 py-1.5 transition-all ${active
                                                ? (cfg ? `${cfg.bg} ${cfg.color} border-0` : 'bg-gray-500/20 text-gray-300')
                                                : isDark ? 'bg-black/20 text-gray-400 hover:bg-gray-800' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                            {f}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] uppercase tracking-widest ${theadBg}`}>
                                    <th className="px-5 py-3 font-black">#</th>
                                    <th className="px-5 py-3 font-black">Student</th>
                                    <th className="px-5 py-3 font-black">Phone</th>
                                    <th className="px-5 py-3 font-black text-center">Call Type</th>
                                    <th className="px-5 py-3 font-black text-center">Lead Status</th>
                                    <th className="px-5 py-3 font-black">Feedback</th>
                                    <th className="px-5 py-3 font-black">Remarks</th>
                                    <th className="px-5 py-3 font-black text-center">Counselled</th>
                                    <th className="px-5 py-3 font-black">Next Follow-up</th>
                                    <th className="px-5 py-3 font-black">Date</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${divider}`}>
                                {filteredCalls.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className={`px-6 py-12 text-center text-sm italic ${subText}`}>
                                            No call records found for the selected filters.
                                        </td>
                                    </tr>
                                ) : filteredCalls.map((call, idx) => {
                                    const cfg = getLeadConfig(call.leadType);
                                    const isFresh = call.callType === 'FRESH';
                                    return (
                                        <tr key={idx} className={`${rowHover} transition-colors`}>
                                            <td className={`px-5 py-3 text-xs font-black ${subText}`}>{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-sm font-black uppercase tracking-tight ${mainText}`}>{call.studentName}</span>
                                            </td>
                                            <td className={`px-5 py-3 text-xs font-mono ${subText}`}>{call.phoneNumber}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                    isFresh
                                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                }`}>
                                                    {call.callType}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td className={`px-5 py-3 text-xs max-w-[160px] truncate ${subText}`} title={call.feedback}>
                                                {call.feedback || '-'}
                                            </td>
                                            <td className={`px-5 py-3 text-xs max-w-[160px] truncate ${subText}`} title={call.remarks}>
                                                {call.remarks || '-'}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {call.isCounseled
                                                    ? <FaCheckCircle className="text-green-400 mx-auto" />
                                                    : <span className={`text-xs ${subText}`}>–</span>}
                                            </td>
                                            <td className={`px-5 py-3 text-xs whitespace-nowrap ${call.nextFollowUpDate ? 'text-amber-400 font-bold' : subText}`}>
                                                {call.nextFollowUpDate
                                                    ? new Date(call.nextFollowUpDate).toLocaleDateString('en-GB')
                                                    : '-'}
                                            </td>
                                            <td className={`px-5 py-3 text-xs whitespace-nowrap ${subText}`}>
                                                {new Date(call.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Collection Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className={`p-5 rounded-xl border border-l-4 border-l-cyan-500 ${card}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${subText}`}>Fresh Admission Collection</p>
                                <h2 className="text-3xl font-black tracking-tighter text-cyan-400">₹{data.collections.freshAdmissionTotal.toLocaleString('en-IN')}</h2>
                            </div>
                            <div className="p-4 rounded-lg bg-cyan-500/10 text-cyan-400 text-2xl"><FaUserGraduate /></div>
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border border-l-4 border-l-amber-500 ${card}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${subText}`}>Installment Collection</p>
                                <h2 className="text-3xl font-black tracking-tighter text-amber-400">₹{data.collections.installmentTotal.toLocaleString('en-IN')}</h2>
                            </div>
                            <div className="p-4 rounded-lg bg-amber-500/10 text-amber-400 text-2xl"><FaReceipt /></div>
                        </div>
                    </div>
                </div>

                {/* Collection Detail Table */}
                {data.collections.details.length > 0 && (
                    <div className={`rounded-xl border overflow-hidden ${card}`}>
                        <div className={`p-5 border-b flex items-center gap-3 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400"><FaMoneyBillWave /></div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em]">Transaction Detail</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] uppercase tracking-widest ${theadBg}`}>
                                        <th className="px-6 py-3 font-black">Student</th>
                                        <th className="px-6 py-3 font-black text-center">Type</th>
                                        <th className="px-6 py-3 font-black text-center">Method</th>
                                        <th className="px-6 py-3 font-black text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${divider}`}>
                                    {data.collections.details.map((col, idx) => (
                                        <tr key={idx} className={rowHover}>
                                            <td className="px-6 py-3">
                                                <p className={`text-sm font-black uppercase ${mainText}`}>{col.studentName}</p>
                                                <p className={`text-[10px] flex items-center gap-1 ${subText}`}><FaIdCard className="text-[8px]" />{col.admissionNumber}</p>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black border ${col.isFresh ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                    {col.type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-3 text-center text-xs font-bold uppercase ${subText}`}>{col.method}</td>
                                            <td className={`px-6 py-3 text-right text-lg font-black tracking-tighter ${col.isFresh ? 'text-cyan-400' : 'text-amber-400'}`}>
                                                ₹{col.amount.toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className={isDark ? 'bg-black/30' : 'bg-gray-50'}>
                                    <tr className="font-black">
                                        <td colSpan="2" className="px-6 py-3 text-sm uppercase tracking-widest">Total</td>
                                        <td className={`px-6 py-3 text-center text-xs ${subText}`}>{data.collections.details.length} Txns</td>
                                        <td className="px-6 py-3 text-right text-xl tracking-tighter text-amber-400">
                                            ₹{collectionTotal.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default DailyUserActivityLog;
