import fs from 'fs';

const filePath = 'c:\\Users\\USER\\erp_1\\frontend\\src\\pages\\HR\\AddEmployee.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const modalRegex = /(<div className="p-8 overflow-y-auto flex-1 custom-scrollbar">)(\s*)(<div className="grid grid-cols-1 md:grid-cols-2 gap-10">)/;
const modalReplacement = `$1
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
$2$3`;

if (modalRegex.test(content)) {
    content = content.replace(modalRegex, modalReplacement);
    console.log("Updated Modal JSX");
} else {
    console.log("Failed to find Modal JSX target via Regex");
}

const submitRegex = /(const handleSubmit = async \(e\) => \{\s*e\.preventDefault\(\);)(\s*)(setLoading\(true\);)/;
const submitReplacement = `$1
        // Validate Salary Structure Dates
        if (formData.salaryStructure.some(s => !s.effectiveDate)) {
            toast.error("Please select an Effective Date for all salary entries.");
            setLoading(false);
            return;
        }

$2$3`;

// Note: handleSubmit appears to have setLoading(true) then blank line then try. 
// But waiting, I want to add validation text BEFORE setLoading(true).
// The regex above adds it between preventDefault and setLoading(true).

if (submitRegex.test(content)) {
    content = content.replace(submitRegex, submitReplacement);
    console.log("Updated handleSubmit");
} else {
    console.log("Failed to find handleSubmit target via Regex");
}

fs.writeFileSync(filePath, content, 'utf8');
