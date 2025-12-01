import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBuilding, FaTags, FaLayerGroup, FaChalkboardTeacher, FaMapMarkerAlt } from 'react-icons/fa';

const MasterDataContent = () => {
    const navigate = useNavigate();

    const masterDataItems = [
        {
            title: "Class Management",
            description: "Manage classes and standards",
            icon: <FaChalkboardTeacher className="text-3xl text-cyan-400" />,
            path: "/master-data/class",
            color: "border-cyan-500"
        },
        {
            title: "Exam Tags",
            description: "Manage exam categories and tags",
            icon: <FaTags className="text-3xl text-purple-400" />,
            path: "/master-data/exam-tag",
            color: "border-purple-500"
        },
        {
            title: "Departments",
            description: "Manage organizational departments",
            icon: <FaLayerGroup className="text-3xl text-green-400" />,
            path: "/master-data/department",
            color: "border-green-500"
        },
        {
            title: "Centre Management",
            description: "Manage centres and branches",
            icon: <FaMapMarkerAlt className="text-3xl text-orange-400" />,
            path: "/master-data/centre",
            color: "border-orange-500"
        }
    ];

    return (
        <div className="flex-1 bg-[#131619] p-6 overflow-y-auto text-white">
            <h2 className="text-2xl font-bold mb-6 text-white">Master Data Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {masterDataItems.map((item, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(item.path)}
                        className={`bg-[#1a1f24] p-6 rounded-xl border-l-4 ${item.color} border-y border-r border-gray-800 hover:bg-[#252b32] cursor-pointer transition-all group`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-800 rounded-lg group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MasterDataContent;
