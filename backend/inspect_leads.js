import XLSX from 'xlsx';
const filePath = 'c:/Users/USER/erp_1/uploads/leads/Lead_Import_Template (4)2.xlsx';
try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Headers:', Object.keys(data[0] || {}));
    console.log('First 2 rows:', JSON.stringify(data.slice(0, 2), null, 2));
} catch (err) {
    console.error('Error reading file:', err.message);
}
