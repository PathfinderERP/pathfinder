import XLSX from 'xlsx';

const file = 'c:/Users/USER/erp_1/exports_data/abc.xlsx';
const workbook = XLSX.readFile(file);
console.log('Sheet Names:', workbook.SheetNames);
