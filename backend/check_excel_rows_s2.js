import XLSX from 'xlsx';

const file = 'c:/Users/USER/erp_1/exports_data/abc.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets['data (2)'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
for (let i = 0; i < 6; i++) {
    console.log(`Row ${i}:`, data[i]);
}
