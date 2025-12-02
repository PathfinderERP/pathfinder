import React from "react";
import Layout from "../components/Layout";
import CourseContent from "../components/MasterData/Course/CourseContent";

export default function MasterDataCourse() {
    return (
        <Layout activePage="Course Management">
            <CourseContent />
        </Layout>
    );
}
