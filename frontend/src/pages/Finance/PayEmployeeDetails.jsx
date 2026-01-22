import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaPrint, FaArrowLeft, FaCalendarAlt } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import logo from "../../assets/logo-1.svg"; // Assuming path, check if exists or use placeholder

const PayEmployeeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    // Date Selection
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
        { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
        { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
        { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
    ];

    const [logoBase64, setLogoBase64] = useState(null);
    const [workedDays, setWorkedDays] = useState(26); // Default 26
    const [sundays, setSundays] = useState(4); // Default 4
    const [baseGrossSalary, setBaseGrossSalary] = useState(0);
    const [calculatedSalary, setCalculatedSalary] = useState(null);

    useEffect(() => {
        // Preload logo and convert to PNG base64 for jsPDF
        const loadLogo = async () => {
            try {
                const img = new Image();
                img.src = logo;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    setLogoBase64(canvas.toDataURL('image/png'));
                };
            } catch (error) {
                console.error("Error loading logo:", error);
            }
        };
        loadLogo();
    }, []);

    useEffect(() => {
        fetchEmployeeDetails();
    }, [id, selectedMonth, selectedYear]);

    useEffect(() => {
        if (employee) {
            let baseStructure = employee.salaryStructure?.[0];

            // If no structure exists, generate a logical fallback from baseGrossSalary
            if (!baseStructure && baseGrossSalary > 0) {
                baseStructure = calculateSalaryBreakdown(baseGrossSalary);
            } else if (baseStructure && baseGrossSalary !== (employee.salaryStructure?.[0]?.totalEarnings || 0)) {
                // If user edited the base salary, override the structure components
                baseStructure = calculateSalaryBreakdown(baseGrossSalary);
            }

            if (baseStructure) {
                calculateProRatedSalary(baseStructure);
            } else {
                setCalculatedSalary(null);
            }
        }
    }, [employee, workedDays, sundays, baseGrossSalary]);

    const calculateSalaryBreakdown = (grossAmount) => {
        if (!grossAmount) return {
            basic: 0, hra: 0, conveyance: 0, specialAllowance: 0, cca: 0, adjustment: 0,
            pf: 0, esi: 0, pTax: 0, tds: 0, lossOfPay: 0, totalEarnings: 0, totalDeductions: 0, netSalary: 0
        };

        const gross = parseFloat(grossAmount);
        const basic = Math.round(gross * 0.50);
        const hra = Math.round(basic * 0.50);
        const conveyance = Math.round(basic * 0.25);
        const specialAllowance = gross - (basic + hra + conveyance);

        // Deductions
        let pf = basic <= 15000 ? Math.round(basic * 0.12) : 1800;
        let esi = gross <= 21000 ? Math.ceil(gross * 0.0075) : 0;
        let pTax = 0;
        if (gross > 10000 && gross <= 15000) pTax = 110;
        else if (gross > 15000 && gross <= 25000) pTax = 130;
        else if (gross > 25000 && gross <= 40000) pTax = 150;
        else if (gross > 40000) pTax = 200;

        const totalDeductions = pf + esi + pTax;

        return {
            basic, hra, conveyance, specialAllowance, cca: 0, adjustment: 0,
            pf, esi, pTax, tds: 0, lossOfPay: 0,
            totalEarnings: gross,
            totalDeductions,
            netSalary: gross - totalDeductions
        };
    };

    const calculateProRatedSalary = (baseStructure) => {
        const holidays = sundays;
        const payableDays = Number(workedDays) + holidays;
        const ratio = payableDays / 30;

        const newEarnings = {
            basic: Math.round(baseStructure.basic * ratio),
            hra: Math.round(baseStructure.hra * ratio),
            conveyance: Math.round(baseStructure.conveyance * ratio),
            specialAllowance: Math.round(baseStructure.specialAllowance * ratio),
            cca: Math.round((baseStructure.cca || 0) * ratio)
        };

        const totalEarnings = Object.values(newEarnings).reduce((a, b) => a + b, 0);

        // Recalculate Deductions Logically (PF, ESI, P.Tax based on pro-rated earnings)
        let pf = newEarnings.basic <= 15000 ? Math.round(newEarnings.basic * 0.12) : 1800;
        let esi = totalEarnings <= 21000 ? Math.ceil(totalEarnings * 0.0075) : 0;
        let pTax = 0;
        if (totalEarnings > 10000 && totalEarnings <= 15000) pTax = 110;
        else if (totalEarnings > 15000 && totalEarnings <= 25000) pTax = 130;
        else if (totalEarnings > 25000 && totalEarnings <= 40000) pTax = 150;
        else if (totalEarnings > 40000) pTax = 200;

        // Keep other deductions fixed from structure if they exist
        const extraDeductions = (parseFloat(baseStructure.tds) || 0) + (parseFloat(baseStructure.lossOfPay) || 0);
        const totalDeductions = pf + esi + pTax + extraDeductions;
        const netSalary = Math.round(totalEarnings - totalDeductions);

        setCalculatedSalary({
            ...baseStructure,
            ...newEarnings,
            pf,
            esi,
            pTax,
            totalEarnings,
            totalDeductions,
            netSalary
        });
    };

    const fetchEmployeeDetails = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/payroll/employee/${id}?month=${selectedMonth}&year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setEmployee(data);
                setBaseGrossSalary(data.currentSalary || (data.salaryStructure?.[0]?.totalEarnings) || 0);
                if (data.attendanceCount !== undefined) {
                    setWorkedDays(data.attendanceCount > 0 ? data.attendanceCount : 26);
                }
                if (data.sundaysCount !== undefined) {
                    setSundays(data.sundaysCount || 4);
                }
                // initial calculation triggered by useEffect
            } else {
                toast.error(data.message || "Failed to fetch employee details");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const generateSalarySlip = async () => {
        if (!employee || !calculatedSalary) return;

        const doc = new jsPDF();

        // --- Header ---
        if (logoBase64) {
            try {
                // Adjust position/size as needed
                doc.addImage(logoBase64, 'PNG', 15, 10, 40, 12);
            } catch (e) {
                console.warn("Could not add logo", e);
            }
        }

        // Header Text - Moved Right to avoid overlap
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        // doc.text("PATHFINDER EDUCATIONAL CENTER LLP", 105, 20, { align: "center" }); // Overlaps
        // Trying to clear overlap - either move down or rely on logo?
        // Let's move text down to Y=25 and 30

        doc.text("PATHFINDER EDUCATIONAL CENTER LLP", 115, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("96K, S.P Mukherjee Road, Hazra More, Kolkata-700 026", 115, 26, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`Salary Slip for ${months.find(m => m.value == selectedMonth)?.label} ${selectedYear}`, 105, 36, { align: "center" });

        // --- Employee Details Box ---
        doc.setLineWidth(0.1);
        doc.rect(15, 45, 180, 40); // Increased height for extra fields

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Emp Code:", 20, 52);
        doc.setFont("helvetica", "normal");
        doc.text(employee.employeeId || "-", 50, 52);

        doc.setFont("helvetica", "bold");
        doc.text("Name:", 20, 58);
        doc.setFont("helvetica", "normal");
        doc.text(employee.name?.toUpperCase() || "-", 50, 58);

        doc.setFont("helvetica", "bold");
        doc.text("Designation:", 20, 64);
        doc.setFont("helvetica", "normal");
        doc.text(employee.designation?.name || "-", 50, 64);

        doc.setFont("helvetica", "bold");
        doc.text("Department:", 20, 70);
        doc.setFont("helvetica", "normal");
        doc.text(employee.department?.departmentName || "-", 50, 70);

        // Right Side
        doc.setFont("helvetica", "bold");
        doc.text("Date of Joining:", 110, 52);
        doc.setFont("helvetica", "normal");
        doc.text(employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : "-", 145, 52);

        doc.setFont("helvetica", "bold");
        doc.text("PAN No:", 110, 58);
        doc.setFont("helvetica", "normal");
        doc.text(employee.panNumber || "-", 145, 58);

        doc.setFont("helvetica", "bold");
        doc.text("Bank A/C:", 110, 64);
        doc.setFont("helvetica", "normal");
        doc.text(employee.accountNumber || "-", 145, 64);

        // Days Info
        doc.setFont("helvetica", "bold");
        doc.text("Total Days:", 110, 70);
        doc.setFont("helvetica", "normal");
        doc.text("30", 145, 70);

        doc.setFont("helvetica", "bold");
        doc.text("Worked Days:", 110, 76);
        doc.setFont("helvetica", "normal");
        doc.text(String(workedDays), 145, 76);

        doc.setFont("helvetica", "bold");
        doc.text("Paid Holidays:", 155, 76); // Same line, offset
        doc.setFont("helvetica", "normal");
        doc.text(String(sundays), 180, 76);

        // --- Salary Table ---
        const startY = 95; // Adjusted down
        const col1 = 15;
        const col2 = 105;
        const rowHeight = 8;

        // Headers
        doc.setFillColor(230, 230, 230);
        doc.rect(col1, startY, 90, rowHeight, "F");
        doc.rect(col2, startY, 90, rowHeight, "F");

        doc.rect(col1, startY, 90, rowHeight);
        doc.rect(col2, startY, 90, rowHeight);

        doc.setFont("helvetica", "bold");
        doc.text("EARNINGS", col1 + 5, startY + 5);
        doc.text("AMOUNT (Rs)", col1 + 85, startY + 5, { align: "right" });

        doc.text("DEDUCTIONS", col2 + 5, startY + 5);
        doc.text("AMOUNT (Rs)", col2 + 85, startY + 5, { align: "right" });

        // Rows
        const structure = calculatedSalary;
        const earnings = [
            { label: "Basic Salary", val: structure.basic },
            { label: "HRA", val: structure.hra },
            { label: "Conveyance", val: structure.conveyance },
            { label: "Special Allowance", val: structure.specialAllowance },
            { label: "City Compensatory", val: structure.cca },
        ];

        const deductions = [
            { label: "Provident Fund", val: structure.pf },
            { label: "Professional Tax", val: structure.pTax },
            { label: "TDS", val: structure.tds },
            { label: "ESI", val: structure.esi },
            { label: "Loss of Pay", val: structure.lossOfPay },
        ];

        const maxRows = Math.max(earnings.length, deductions.length);
        let currentY = startY + rowHeight;

        for (let i = 0; i < maxRows; i++) {
            // Draw Box Col 1
            doc.rect(col1, currentY, 90, rowHeight);
            if (earnings[i]) {
                doc.setFont("helvetica", "normal");
                doc.text(earnings[i].label, col1 + 5, currentY + 5);
                doc.text(String(earnings[i].val || 0), col1 + 85, currentY + 5, { align: "right" });
            }

            // Draw Box Col 2
            doc.rect(col2, currentY, 90, rowHeight);
            if (deductions[i]) {
                doc.setFont("helvetica", "normal");
                doc.text(deductions[i].label, col2 + 5, currentY + 5);
                doc.text(String(deductions[i].val || 0), col2 + 85, currentY + 5, { align: "right" });
            }

            currentY += rowHeight;
        }

        // --- Totals ---
        doc.setFont("helvetica", "bold");
        doc.rect(col1, currentY, 90, rowHeight);
        doc.text("Gross Earnings", col1 + 5, currentY + 5);
        doc.text(String(structure.totalEarnings || 0), col1 + 85, currentY + 5, { align: "right" });

        doc.rect(col2, currentY, 90, rowHeight);
        doc.text("Total Deductions", col2 + 5, currentY + 5);
        doc.text(String(structure.totalDeductions || 0), col2 + 85, currentY + 5, { align: "right" });

        currentY += rowHeight + 5;

        // --- Net Pay ---
        doc.setFillColor(240, 248, 255); // Light Blue
        doc.rect(15, currentY, 180, 12, "F");
        doc.rect(15, currentY, 180, 12);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("NET SALARY PAYABLE", 20, currentY + 8);
        doc.setFontSize(14);
        doc.text(`Rs. ${structure.netSalary || 0}`, 190, currentY + 8, { align: "right" });

        currentY += 20;
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(`Amount in words: ${convertNumberToWords(structure.netSalary || 0)} Only`, 20, currentY);

        // Footer
        doc.setFont("helvetica", "normal");
        doc.text("This is a computer-generated payslip and does not require a signature.", 105, 280, { align: "center" });

        doc.save(`${employee.name}_Payslip_${months.find(m => m.value == selectedMonth)?.label}_${selectedYear}.pdf`);
        toast.success("Payslip Generated Successfully!");
    };

    const convertNumberToWords = (amount) => {
        // Simple placeholder, real implementation can use a library
        return "Rupees..."; // You might want to add a utility for this
    }

    if (loading) {
        return (
            <Layout activePage="Finance & Fees">
                <div className="flex h-screen items-center justify-center text-white">Loading...</div>
            </Layout>
        );
    }

    if (!employee) return null;

    // Use calculated salary for display, or fallback
    const salary = calculatedSalary || employee.salaryStructure?.[0] || {};
    // Ensure numeric
    salary.netSalary = salary.netSalary || 0;

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 space-y-6">
                <ToastContainer position="top-right" theme="dark" />

                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition">
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Generate Payslip</h1>
                        <p className="text-gray-400 text-xs mt-1">Review details and process salary for {employee.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Employee Card & Selector */}
                    <div className="space-y-6">
                        <div className="bg-[#1a1f24] p-6 rounded-2xl border border-gray-800 shadow-xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                            <div className="w-24 h-24 mx-auto bg-gray-800 rounded-full border-4 border-gray-700 overflow-hidden mb-4 shadow-lg">
                                {employee.profileImage ? (
                                    <img src={employee.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="flex items-center justify-center h-full text-3xl font-bold text-gray-500">{employee.name.charAt(0)}</span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">{employee.name}</h2>
                            <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-4">{employee.designation?.name}</p>

                            <div className="grid grid-cols-2 gap-4 text-left bg-gray-900/50 p-4 rounded-xl text-sm border border-gray-800">
                                <div>
                                    <p className="text-gray-500 text-[10px] uppercase">Emp ID</p>
                                    <p className="text-white font-mono">{employee.employeeId}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-[10px] uppercase">Department</p>
                                    <p className="text-white">{employee.department?.departmentName || "-"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1a1f24] p-6 rounded-2xl border border-gray-800 shadow-xl">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <FaCalendarAlt className="text-green-400" /> Payroll Period
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-500 text-[10px] font-bold uppercase block mb-2">Month</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none"
                                    >
                                        {months.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] font-bold uppercase block mb-2">Year</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none"
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-gray-500 text-[10px] font-bold uppercase block mb-2">Base Gross Salary</label>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-gray-500 font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={baseGrossSalary}
                                            onChange={(e) => setBaseGrossSalary(Number(e.target.value))}
                                            placeholder="Enter Gross Salary"
                                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-gray-500 text-[10px] font-bold uppercase block mb-2">Worked Days</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={workedDays}
                                            onChange={(e) => setWorkedDays(Number(e.target.value))}
                                            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none font-bold"
                                            min="0"
                                            max="31"
                                        />
                                        <span className="text-gray-500 text-xs">Days</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 italic">
                                        (Net Pay = (Gross / 30) * ({Number(workedDays)} Worked + {sundays} Sundays) - Deductions)
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={generateSalarySlip}
                                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <FaPrint size={16} /> Generate Payslip
                            </button>
                        </div>
                    </div>

                    {/* Right: Salary Breakdown */}
                    <div className="lg:col-span-2 bg-[#1a1f24] p-6 rounded-2xl border border-gray-800 shadow-xl">
                        <h3 className="text-lg font-black text-white mb-6 border-b border-gray-800 pb-4">Salary Structure Information</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Earnings */}
                            <div>
                                <h4 className="text-green-400 text-xs font-black uppercase tracking-widest mb-4">Earnings</h4>
                                <div className="space-y-3">
                                    <Row label="Basic Salary" value={salary.basic} />
                                    <Row label="HRA" value={salary.hra} />
                                    <Row label="Conveyance" value={salary.conveyance} />
                                    <Row label="Special Allowance" value={salary.specialAllowance} />
                                    <Row label="City Compensatory (CCA)" value={salary.cca} />
                                    <div className="pt-3 border-t border-gray-800 mt-3">
                                        <Row label="Total Earnings" value={salary.totalEarnings} highlight />
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div>
                                <h4 className="text-red-400 text-xs font-black uppercase tracking-widest mb-4">Deductions</h4>
                                <div className="space-y-3">
                                    <Row label="Provident Fund" value={salary.pf} />
                                    <Row label="Professional Tax" value={salary.pTax} />
                                    <Row label="ESI" value={salary.esi} />
                                    <Row label="TDS" value={salary.tds} />
                                    <Row label="Loss of Pay" value={salary.lossOfPay} />
                                    <div className="pt-3 border-t border-gray-800 mt-3">
                                        <Row label="Total Deductions" value={salary.totalDeductions} highlight />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-700 bg-gray-900/50 -mx-6 -mb-6 p-6 rounded-b-2xl flex justify-between items-center">
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase">Net Salary Payable</p>
                                <p className="text-gray-500 text-[10px]">Total Earnings - Total Deductions</p>
                            </div>
                            <div className="text-3xl font-black text-white">
                                ₹{salary.netSalary?.toLocaleString('en-IN') || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

const Row = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-center ${highlight ? "text-white font-bold" : "text-gray-300 text-sm"}`}>
        <span>{label}</span>
        <span className="font-mono">{value?.toLocaleString('en-IN') || 0}</span>
    </div>
);

export default PayEmployeeDetails;
