import React, { useState } from 'react';
import Sidebar from './Dashboard/Sidebar';
import Header from './Dashboard/Header';

const Layout = ({ children, activePage }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex h-screen bg-[#131619] font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar activePage={activePage} isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6">
                    {children}
                </div>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default Layout;
