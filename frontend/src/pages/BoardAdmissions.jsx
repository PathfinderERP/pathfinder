import React from "react";
import Layout from "../components/Layout";
import BoardAdmissionsContent from "../components/Admissions/BoardAdmissionsContent";

export default function BoardAdmissions() {
    return (
        <Layout activePage="Admissions & Sales">
            <BoardAdmissionsContent />
        </Layout>
    );
}
