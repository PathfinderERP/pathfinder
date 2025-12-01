import React from "react";
import Sidebar from "../components/Dashboard/Sidebar";
import Header from "../components/Dashboard/Header";
import MasterDataContent from "../components/MasterData/MasterDataContent";

export default function MasterData() {
    return (
        <div className="flex h-screen bg-[#131619] font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar activePage="Master Data" />

            {/* Main Layout */}
            <div className="flex-1 flex flex-col min-w-0">
                <Header />

                <div className="flex flex-1 overflow-hidden">
                    <MasterDataContent />
                </div>
            </div>
        </div>
    );
}
