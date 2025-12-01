import React from "react";
import Layout from "../components/Layout";
import FinanceContent from "../components/Finance/FinanceContent";

export default function Finance() {
    return (
        <Layout activePage="Finance & Fees">
            <FinanceContent />
        </Layout>
    );
}
