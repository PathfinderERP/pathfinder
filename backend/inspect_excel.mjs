import XLSX from 'xlsx';

const filePath = 'c:\\Users\\MALAY\\erp_1\\exports_data\\Students list of Bally_Not.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

for(let i=0; i<data.length; i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
}
