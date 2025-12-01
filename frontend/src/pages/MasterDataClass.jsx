import React from "react";
import Sidebar from "../components/Dashboard/Sidebar";
import Header from "../components/Dashboard/Header";
import ClassContent from "../components/MasterData/Class/ClassContent";

export default function MasterDataClass() {
    return (
        <div className="flex h-screen bg-[#131619] font-sans overflow-hidden">
            <Sidebar activePage="Master Data" />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <div className="flex flex-1 overflow-hidden">
                    <ClassContent />
                </div>
            </div>
        </div>
    );
}
