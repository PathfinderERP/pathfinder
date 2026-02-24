import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CentreCallBarChart = ({ data, isDarkMode, loading }) => {
    if (loading) return (
        <div className="h-[60px] w-full max-w-[500px] bg-gray-800/20 animate-pulse rounded-[2px] ml-4 hidden xl:block"></div>
    );
    if (!data || data.length === 0) return null;

    // Filter and prepare data: show more centres (top 12)
    const chartData = data
        .sort((a, b) => b.totalFollowUps - a.totalFollowUps)
        .slice(0, 12)
        .map(item => ({
            name: item.centreName,
            calls: item.totalFollowUps
        }));

    return (
        <div className="h-[60px] w-full max-w-[600px] min-w-[300px] ml-4 bg-transparent hidden xl:block group relative">
            <div className="absolute -top-4 left-0 text-[8px] font-black uppercase tracking-widest text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Centre Call Distribution
            </div>
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={50}>
                <BarChart data={chartData}>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDarkMode ? '#131619' : '#fff',
                            borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
                            borderRadius: '2px',
                            fontSize: '9px',
                            padding: '4px 8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        itemStyle={{ color: '#06b6d4', fontWeight: '900', textTransform: 'uppercase' }}
                        labelStyle={{ color: isDarkMode ? '#9ca3af' : '#4b5563', marginBottom: '2px', fontWeight: 'bold' }}
                        cursor={{ fill: 'transparent' }}
                    />
                    <Bar
                        dataKey="calls"
                        radius={[2, 2, 0, 0]}
                        barSize={20}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={index === 0 ? '#06b6d4' : '#06b6d480'}
                                className="hover:fill-cyan-400 transition-all duration-300"
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CentreCallBarChart;
