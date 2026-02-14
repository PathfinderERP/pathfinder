import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartSkeleton } from '../common/Skeleton';

const LeadTrendChart = ({ data, isDarkMode, loading }) => {
    if (loading) return <ChartSkeleton />;
    if (!data || data.length === 0) return null;

    return (
        <div className="h-[60px] w-full max-w-[200px] min-w-[120px] ml-0 sm:ml-4 bg-transparent mt-2 sm:mt-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                            borderRadius: '4px',
                            fontSize: '10px',
                            padding: '4px 8px'
                        }}
                        itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                        labelStyle={{ display: 'none' }}
                        cursor={{ stroke: '#06b6d4', strokeWidth: 1 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LeadTrendChart;
