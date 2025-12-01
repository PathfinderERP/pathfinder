import React from "react";
import Sidebar from "../components/Dashboard/Sidebar";
import Header from "../components/Dashboard/Header";
import ExamTagContent from "../components/MasterData/ExamTag/ExamTagContent";

export default function MasterDataExamTag() {
    return (
        <div className="flex h-screen bg-[#131619] font-sans overflow-hidden">
            <Sidebar activePage="Master Data" />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <div className="flex flex-1 overflow-hidden">
                    <ExamTagContent />
                </div>
            </div>
        </div>
    );
}
