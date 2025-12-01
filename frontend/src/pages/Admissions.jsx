import React from "react";
import Layout from "../components/Layout";
import AdmissionsContent from "../components/Admissions/AdmissionsContent";

export default function Admissions() {
    return (
        <Layout activePage="Admissions & Sales">
            <AdmissionsContent />
        </Layout>
    );
}
