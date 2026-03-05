import XLSX from "xlsx";

const EXCEL_FILES = [
    "c:\\Users\\USER\\erp_1\\exports_data\\student_data5m.xlsx",
    "c:\\Users\\USER\\erp_1\\exports_data\\student_data5mn.xlsx",
    "c:\\Users\\USER\\erp_1\\exports_data\\student_data5mn0.xlsx",
    "c:\\Users\\USER\\erp_1\\exports_data\\student_datauptp5m.xlsx",
    "c:\\Users\\USER\\erp_1\\exports_data\\student_datahz.xlsx"
];

const analyzeExcel = () => {
    let report = {
        missingEnroll: 0,
        shortPhone: [],
        missingCourse: 0,
        missingSession: 0,
        duplicatesInFiles: new Set(),
        allEnrollments: new Set()
    };

    EXCEL_FILES.forEach(filePath => {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            data.forEach((row, idx) => {
                const enroll = row['Enroll No']?.toString().trim();
                const phone = row['Phone']?.toString().replace(/\D/g, '');
                const course = row['Course Name'];
                const session = row['Session'];

                if (!enroll) {
                    report.missingEnroll++;
                } else {
                    if (report.allEnrollments.has(enroll)) {
                        report.duplicatesInFiles.add(enroll);
                    }
                    report.allEnrollments.add(enroll);
                }

                if (phone && phone.length < 10) {
                    report.shortPhone.push({ enroll, phone, file: filePath.split('\\').pop() });
                }

                if (!course) report.missingCourse++;
                if (!session) report.missingSession++;
            });
        } catch (e) {
            console.error(`Error reading ${filePath}: ${e.message}`);
        }
    });

    console.log("--- Excel Data Analysis ---");
    console.log(`Missing Enrollment Numbers: ${report.missingEnroll}`);
    console.log(`Missing Course Names: ${report.missingCourse}`);
    console.log(`Missing Sessions: ${report.missingSession}`);
    console.log(`Duplicate Enrollments across/within files: ${report.duplicatesInFiles.size}`);
    console.log(`Short Phone Numbers (<10 digits): ${report.shortPhone.length}`);
    if (report.shortPhone.length > 0) {
        console.log("Examples of short phone numbers:");
        report.shortPhone.slice(0, 10).forEach(p => console.log(`  - Enroll: ${p.enroll}, Phone: ${p.phone} (${p.file})`));
    }
};

analyzeExcel();
