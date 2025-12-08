import React from "react";
import Layout from "../components/Layout";
import LeadManagementContent from "../components/LeadManagement/LeadManagementContent";

export default function LeadManagement() {
    return (
        <Layout activePage="Lead Management">
            <LeadManagementContent />
        </Layout>
    );
}
