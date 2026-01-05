import React from "react";
import Layout from "../components/Layout";
import ExpenseSubCategoryContent from "../components/MasterData/ExpenseSubCategory/ExpenseSubCategoryContent";

export default function MasterDataExpenseSubCategory() {
    return (
        <Layout activePage="Master Data">
            <ExpenseSubCategoryContent />
        </Layout>
    );
}
