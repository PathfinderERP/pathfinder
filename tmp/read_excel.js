import xlsx from "xlsx";
import path from "path";

const filePath = "c:\\Users\\MALAY\\erp_1\\exports_data\\student_data (3)_hw.xlsx";

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  console.log("Columns:", data[0]);
  console.log("First 5 rows of data:");
  console.log(data.slice(1, 6));
} catch (error) {
  console.error("Error reading file:", error.message);
}
