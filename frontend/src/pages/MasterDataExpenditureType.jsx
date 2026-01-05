import React from "react";
import Layout from "../components/Layout";
import ExpenditureTypeContent from "../components/MasterData/ExpenditureType/ExpenditureTypeContent";

export default function MasterDataExpenditureType() {
    return (
        <Layout activePage="Master Data">
            <ExpenditureTypeContent />
        </Layout>
    );
}
