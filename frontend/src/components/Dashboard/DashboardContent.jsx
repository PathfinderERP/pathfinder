import React from "react";
import { FaExclamationTriangle, FaLightbulb, FaRocket, FaChartLine, FaRobot } from "react-icons/fa";

const DashboardContent = () => {
    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            <div className="flex items-center gap-3 mb-6">
                <FaRobot className="text-2xl text-white" />
                <h2 className="text-xl font-bold text-white">AI-Powered Insights & Recommendations</h2>
            </div>

            <div className="space-y-4">
                {/* Card 1: Warning */}
                <div className="bg-[#1a1f24] rounded-xl p-6 border-l-4 border-red-500 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 mb-2">
                            <FaExclamationTriangle className="text-red-500 text-xl" />
                            <h3 className="text-lg font-semibold text-white">Malda Center Performance Declining</h3>
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 pl-8">
                        45% below target. Conversion rate dropped from 23% to 18% in last 2 weeks.
                    </p>
                    <div className="bg-[#252b32] p-3 rounded-lg flex items-center gap-3 ml-8 border border-gray-700">
                        <FaLightbulb className="text-yellow-400" />
                        <span className="text-sm text-gray-300">
                            <span className="font-bold text-yellow-400">AI Recommendation:</span> Deploy senior counselor from Salt Lake for 1 week training
                        </span>
                    </div>
                </div>

                {/* Card 2: Opportunity */}
                <div className="bg-[#1a1f24] rounded-xl p-6 border-l-4 border-orange-500 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 mb-2">
                            <FaRocket className="text-cyan-400 text-xl" />
                            <h3 className="text-lg font-semibold text-white">Salt Lake Has Capacity for 50 More Students</h3>
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 pl-8">
                        Operating at 78% capacity. Strong demand in area. Can increase revenue by ₹4.2L
                    </p>
                    <div className="bg-[#252b32] p-3 rounded-lg flex items-center gap-3 ml-8 border border-gray-700">
                        <FaLightbulb className="text-yellow-400" />
                        <span className="text-sm text-gray-300">
                            <span className="font-bold text-yellow-400">AI Recommendation:</span> Launch targeted Meta campaign in 5km radius
                        </span>
                    </div>
                </div>

                {/* Card 3: Forecast */}
                <div className="bg-[#1a1f24] rounded-xl p-6 border-l-4 border-cyan-500 shadow-lg">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 mb-2">
                            <FaChartLine className="text-purple-400 text-xl" />
                            <h3 className="text-lg font-semibold text-white">Q4 Revenue Forecast: ₹8.4 Cr</h3>
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 pl-8">
                        22% growth predicted based on current trends and seasonal patterns.
                    </p>
                    <div className="bg-[#252b32] p-3 rounded-lg flex items-center gap-3 ml-8 border border-gray-700">
                        <FaLightbulb className="text-yellow-400" />
                        <span className="text-sm text-gray-300">
                            <span className="font-bold text-yellow-400">AI Insight:</span> Focus on early bird admissions to secure cash flow
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
