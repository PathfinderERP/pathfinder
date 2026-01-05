import React from "react";
import Layout from "../components/Layout";
import ExpenseCategoryContent from "../components/MasterData/ExpenseCategory/ExpenseCategoryContent";

export default function MasterDataExpenseCategory() {
    return (
        <Layout activePage="Master Data">
            <ExpenseCategoryContent />
        </Layout>
    );
}
