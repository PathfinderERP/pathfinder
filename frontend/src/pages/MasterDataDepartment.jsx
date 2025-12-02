import React from "react";
import Layout from "../components/Layout";
import DepartmentContent from "../components/MasterData/Department/DepartmentContent";

export default function MasterDataDepartment() {
    return (
        <Layout activePage="Master Data">
            <DepartmentContent />
        </Layout>
    );
}
