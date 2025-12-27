import fs from 'fs';

const filePath = 'c:\\Users\\USER\\erp_1\\frontend\\src\\pages\\HR\\AddEmployee.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update updateSalaryStructure (Forward Calculation in List)
const updateSalaryRegex = /(if \(field === "amount" \|\| field === "netSalary"\) \{[\s\S]*?else \{[\s\S]*?)(const totalEarnings = \(parseFloat\(s\.basic\) \|\| 0\) \+[\s\S]*?)(const totalDeductions[\s\S]*?)(newSalaryStructure\[index\]\.totalEarnings = totalEarnings;)/m;
const updateSalaryReplacement = `if (field === "amount" || field === "netSalary") {
                const amountValue = parseFloat(value) || 0;
                // Forward calculation: Input is Gross
                const breakdown = calculateSalaryBreakdown(amountValue);
                newSalaryStructure[index] = {
                    ...updatedSalary,
                    ...breakdown,
                    amount: amountValue, // Amount is Gross
                    netSalary: breakdown.netSalary
                };
            } else {
                newSalaryStructure[index] = updatedSalary;

                // Recalculate totals and dependent deductions if components change
                const s = newSalaryStructure[index];
                
                const basic = parseFloat(s.basic) || 0;
                const totalEarnings = basic +
                    (parseFloat(s.conveyance) || 0) +
                    (parseFloat(s.hra) || 0) +
                    (parseFloat(s.specialAllowance) || 0);

                // PF
                let pf;
                if (basic <= 15000) {
                    pf = Math.round(basic * 0.12);
                } else {
                    pf = 1800;
                }

                // ESI
                let esi;
                if (totalEarnings <= 21000) {
                    esi = Math.ceil(totalEarnings * 0.0075);
                } else {
                    esi = 0;
                }

                // P.Tax
                let pTax = 0;
                if (totalEarnings <= 10000) pTax = 0;
                else if (totalEarnings <= 15000) pTax = 110;
                else if (totalEarnings <= 25000) pTax = 130;
                else if (totalEarnings <= 40000) pTax = 150;
                else pTax = 200;

                const totalDeductions = pf + esi + pTax +
                    (parseFloat(s.tds) || 0) +
                    (parseFloat(s.lossOfPay) || 0) +
                    (parseFloat(s.adjustment) || 0);
                
                newSalaryStructure[index].pf = pf;
                newSalaryStructure[index].esi = esi;
                newSalaryStructure[index].pTax = pTax;
                $4`; // $4 is "newSalaryStructure[index].totalEarnings = totalEarnings;" which starts the assignment block

if (updateSalaryRegex.test(content)) {
    content = content.replace(updateSalaryRegex, updateSalaryReplacement);
    console.log("Updated updateSalaryStructure");
} else {
    console.log("Failed to match updateSalaryStructure");
}


// 2. Update calculateSalaryBreakdown (Forward Calculation Logic)
const calcBreakdownRegex = /const calculateSalaryBreakdown = \(netAmount\) => \{[\s\S]*?return \{[\s\S]*?\};[\s\S]*?\};/m;
const calcBreakdownNew = `const calculateSalaryBreakdown = (grossAmount) => {
        if (!grossAmount) return {};
        
        const gross = parseFloat(grossAmount);
        
        // Basic: 50% of Gross
        const basic = Math.round(gross * 0.50);
        
        // HRA: 50% of Basic
        const hra = Math.round(basic * 0.50);
        
        // Conveyance: 25% of Basic
        const conveyance = Math.round(basic * 0.25);
        
        // Special Allowance: Balance to match Gross
        const currentEarnings = basic + hra + conveyance;
        const specialAllowance = gross - currentEarnings;
        
        // Deductions
        // PF
        let pf;
        if (basic <= 15000) {
            pf = Math.round(basic * 0.12);
        } else {
            pf = 1800;
        }
        
        // ESI
        let esi;
        if (gross <= 21000) {
            esi = Math.ceil(gross * 0.0075);
        } else {
            esi = 0;
        }
        
        // P. Tax
        let pTax = 0;
        if (gross <= 10000) pTax = 0;
        else if (gross <= 15000) pTax = 110;
        else if (gross <= 25000) pTax = 130;
        else if (gross <= 40000) pTax = 150;
        else pTax = 200;
        
        const totalDeductions = pf + esi + pTax;
        
        return {
            basic,
            hra,
            conveyance,
            specialAllowance,
            adjustment: 0,
            totalEarnings: gross,
            pf,
            esi,
            pTax,
            tds: 0,
            lossOfPay: 0,
            totalDeductions,
            netSalary: gross - totalDeductions
        };
    };`;

if (calcBreakdownRegex.test(content)) {
    content = content.replace(calcBreakdownRegex, calcBreakdownNew);
    console.log("Updated calculateSalaryBreakdown");
} else {
    console.log("Failed to match calculateSalaryBreakdown");
}


// 3. Update handleSalaryModalInputChange (Recalculate Dependents)
const handleModalRegex = /const handleSalaryModalInputChange = \(field, value\) => \{[\s\S]*?if \(field === "amount" \|\| field === "netSalary"\) \{[\s\S]*?return \{[\s\S]*?\};[\s\S]*?\};[\s\S]*?return \{[\s\S]*?\};[\s\S]*?\};[\s\S]*?\};/m;
// The regex is tricky for the whole function. Let's try replacing the body.
const handleModalBodyOld = `        setSalaryModal(prev => {
            const updated = { ...prev.tempData, [field]: val };

            if (field === "amount" || field === "netSalary") {
                const breakdown = calculateSalaryBreakdown(val);
                return {
                    ...prev,
                    tempData: { ...updated, ...breakdown, netSalary: val, amount: val }
                };
            }

            // Recalculate totals
            const totalEarnings = (parseFloat(updated.basic) || 0) +
                (parseFloat(updated.conveyance) || 0) +
                (parseFloat(updated.hra) || 0) +
                (parseFloat(updated.specialAllowance) || 0);

            const totalDeductions = (parseFloat(updated.pf) || 0) +
                (parseFloat(updated.esi) || 0) +
                (parseFloat(updated.pTax) || 0) +
                (parseFloat(updated.tds) || 0) +
                (parseFloat(updated.lossOfPay) || 0) +
                (parseFloat(updated.adjustment) || 0);

            return {
                ...prev,
                tempData: {
                    ...updated,
                    totalEarnings,
                    totalDeductions,
                    netSalary: totalEarnings - totalDeductions,
                    amount: totalEarnings - totalDeductions
                }
            };
        });`;

const handleModalBodyNew = `        setSalaryModal(prev => {
            const updated = { ...prev.tempData, [field]: val };

            if (field === "amount" || field === "grossSalary") {
                const breakdown = calculateSalaryBreakdown(val);
                return {
                    ...prev,
                    tempData: { 
                        ...updated, 
                        ...breakdown, 
                        effectiveDate: updated.effectiveDate, // Preserve Date
                        amount: breakdown.totalEarnings 
                    }
                };
            }

            // Recalculate everything
            const basic = parseFloat(updated.basic) || 0;
            const totalEarnings = basic +
                (parseFloat(updated.conveyance) || 0) +
                (parseFloat(updated.hra) || 0) +
                (parseFloat(updated.specialAllowance) || 0);

            // PF
            let pf;
            if (basic <= 15000) {
                pf = Math.round(basic * 0.12);
            } else {
                pf = 1800;
            }

            // ESI
            let esi;
            if (totalEarnings <= 21000) {
                esi = Math.ceil(totalEarnings * 0.0075);
            } else {
                esi = 0;
            }

            // P.Tax
            let pTax = 0;
            if (totalEarnings <= 10000) pTax = 0;
            else if (totalEarnings <= 15000) pTax = 110;
            else if (totalEarnings <= 25000) pTax = 130;
            else if (totalEarnings <= 40000) pTax = 150;
            else pTax = 200;

            const totalDeductions = pf + esi + pTax +
                (parseFloat(updated.tds) || 0) +
                (parseFloat(updated.lossOfPay) || 0) +
                (parseFloat(updated.adjustment) || 0);

            return {
                ...prev,
                tempData: {
                    ...updated,
                    pf,
                    esi,
                    pTax,
                    totalEarnings,
                    totalDeductions,
                    netSalary: totalEarnings - totalDeductions,
                    amount: totalEarnings
                }
            };
        });`;

// Try to find unique part of body to replace or replace whole function if regex matches
if (content.includes("if (field === \"amount\" || field === \"netSalary\") {")) {
    // We'll replace the block inside setSalaryModal
    // Finding the specific block is safer with exact string match of a large chunk if possible
    // But whitespace might vary. 
    // Let's use the provided content from read_file as 'handleModalBodyOld' source of truth
    // Actually, I can use the previous view_file output to construct regex

    // Let's rely on the replace_file_content logic I used in regex above, but applying to the whole file content string
    // I already prepared regex for other parts. For this, let's try a regex for the body.
    const handleModalRegex2 = /setSalaryModal\(prev => \{[\s\S]*?\}\);/m;
    const match = content.match(handleModalRegex2);
    if (match) {
        // Double check it contains "netSalary" key logic to be sure it's the right one
        if (match[0].includes("field === \"netSalary\"")) {
            content = content.replace(match[0], handleModalBodyNew);
            console.log("Updated handleSalaryModalInputChange");
        } else {
            console.log("Matched setSalaryModal but didn't look like target");
        }
    } else {
        console.log("Failed to match handleSalaryModalInputChange body");
    }
}

// 4. Update Quick Update Input
const quickUpdateRegex = /placeholder="Enter Net Salary"[\s\S]*?onChange=\{\(e\) => handleSalaryModalInputChange\("netSalary", e\.target\.value\)\}/;
const quickUpdateReplacement = `placeholder="Enter Gross Salary"
                                            onChange={(e) => handleSalaryModalInputChange("grossSalary", e.target.value)}`;

if (quickUpdateRegex.test(content)) {
    content = content.replace(quickUpdateRegex, quickUpdateReplacement);
    console.log("Updated Quick Update Input");
} else {
    console.log("Failed to match Quick Update Input");
}

fs.writeFileSync(filePath, content, 'utf8');
