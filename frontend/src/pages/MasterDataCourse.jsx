import React from "react";
import Sidebar from "../components/Dashboard/Sidebar";
import Header from "../components/Dashboard/Header";
import CourseContent from "../components/MasterData/Course/CourseContent";

export default function MasterDataCourse() {
    return (
        <div className="flex h-screen bg-[#131619] font-sans overflow-hidden">
            <Sidebar activePage="Course Management" />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <div className="flex flex-1 overflow-hidden">
                    <CourseContent />
                </div>
            </div>
        </div>
    );
}
