import fs from 'fs';

const filePath = 'c:\\Users\\USER\\erp_1\\frontend\\src\\pages\\HR\\AddEmployee.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `newSalaryStructure[index].amount = totalEarnings - totalDeductions;`;
const replacement = `newSalaryStructure[index].amount = totalEarnings;`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Corrected amount assignment in updateSalaryStructure");
} else {
    console.log("Failed to find amount assignment");
}
