import React from "react";
import Layout from "../components/Layout";
import SalesContent from "../components/Sales/SalesContent";

export default function Sales() {
    return (
        <Layout activePage="Sales">
            <SalesContent />
        </Layout>
    );
}
