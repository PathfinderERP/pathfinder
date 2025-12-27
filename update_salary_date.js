import fs from 'fs';

const filePath = 'c:\\Users\\USER\\erp_1\\frontend\\src\\pages\\HR\\AddEmployee.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update handleSubmit
const handleSubmitOld = `    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");`;

const handleSubmitNew = `    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate Salary Structure Dates
        if (formData.salaryStructure.some(s => !s.effectiveDate)) {
            toast.error("Please select an Effective Date for all salary entries.");
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");`;

// Update Modal JSX
const modalStartOld = `<div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">`;

const modalStartNew = `<div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Effective Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={salaryModal.tempData?.effectiveDate ? new Date(salaryModal.tempData.effectiveDate).toISOString().split('T')[0] : ""}
                                    onChange={(e) => handleSalaryModalInputChange("effectiveDate", e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white transition-all outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">`;

if (content.includes(handleSubmitOld)) {
    content = content.replace(handleSubmitOld, handleSubmitNew);
    console.log("Updated handleSubmit");
} else {
    console.log("Failed to find handleSubmit target");
}

if (content.includes(modalStartOld)) {
    content = content.replace(modalStartOld, modalStartNew);
    console.log("Updated Modal JSX");
} else {
    console.log("Failed to find Modal JSX target");
}

fs.writeFileSync(filePath, content, 'utf8');
