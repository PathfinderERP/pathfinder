import React from 'react';

export const BaseSkeleton = ({ className = "" }) => (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-[2px] ${className}`} />
);

export const CardSkeleton = ({ isDarkMode }) => (
    <div className={`p-6 rounded-[2px] border relative overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex justify-between items-start relative z-10">
            <div className="flex-1 space-y-3">
                <BaseSkeleton className="h-3 w-20" />
                <BaseSkeleton className="h-8 w-12" />
                <BaseSkeleton className="h-2 w-24" />
            </div>
            <BaseSkeleton className="h-10 w-10 rounded-[2px]" />
        </div>
    </div>
);

export const TableRowSkeleton = ({ isDarkMode, columns = 11 }) => (
    <tr className={isDarkMode ? 'border-gray-800' : 'border-gray-200'}>
        {[...Array(columns)].map((_, i) => (
            <td key={i} className="px-6 py-4">
                <div className="space-y-2">
                    <BaseSkeleton className="h-3 w-full max-w-[100px]" />
                    {i === 1 || i === 2 || i === 3 || i === 9 ? <BaseSkeleton className="h-2 w-16" /> : null}
                </div>
            </td>
        ))}
    </tr>
);

export const FeedItemSkeleton = ({ isDarkMode }) => (
    <div className={`p-3 border-b last:border-0 ${isDarkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
        <div className="flex justify-between items-start mb-2">
            <BaseSkeleton className="h-3 w-20" />
            <BaseSkeleton className="h-3 w-4" />
        </div>
        <BaseSkeleton className="h-2 w-full mb-2" />
        <div className="flex justify-between items-center">
            <BaseSkeleton className="h-2 w-12" />
            <BaseSkeleton className="h-2 w-8" />
        </div>
    </div>
);

export const ChartSkeleton = () => {
    const heights = [40, 70, 45, 90, 65, 80, 50, 75];
    return (
        <div className="h-[60px] w-full max-w-[200px] min-w-[120px] ml-4 bg-transparent mt-0 flex items-end gap-1 px-2">
            {heights.map((height, i) => (
                <div
                    key={i}
                    className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-t-[1px] animate-pulse"
                    style={{ height: `${height}%` }}
                />
            ))}
        </div>
    );
};

export const BoxSkeleton = ({ className = "" }) => (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-[2px] ${className}`} />
);

export const ListSkeleton = ({ count = 5 }) => (
    <div className="space-y-4 w-full">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
                <BaseSkeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                    <BaseSkeleton className="h-3 w-1/3" />
                    <BaseSkeleton className="h-2 w-1/4" />
                </div>
            </div>
        ))}
    </div>
);
