import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { FaPrint, FaArrowLeft, FaCalendarAlt } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import logo from "../../assets/logo-1.svg"; 
import { useTheme } from "../../context/ThemeContext";

const PayEmployeeDetails = () => {
    const { isDarkMode } = useTheme();
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

    const calculateProRatedSalary = useCallback((baseStructure) => {
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
    }, [workedDays, sundays]);

    const fetchEmployeeDetails = useCallback(async () => {
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
            } else {
                toast.error(data.message || "Failed to fetch employee details");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [id, selectedMonth, selectedYear]);

    useEffect(() => {
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
    }, [fetchEmployeeDetails]);

    useEffect(() => {
        if (employee) {
            let baseStructure = employee.salaryStructure?.[0];

            if (!baseStructure && baseGrossSalary > 0) {
                baseStructure = calculateSalaryBreakdown(baseGrossSalary);
            } else if (baseStructure && baseGrossSalary !== (employee.salaryStructure?.[0]?.totalEarnings || 0)) {
                baseStructure = calculateSalaryBreakdown(baseGrossSalary);
            }

            if (baseStructure) {
                calculateProRatedSalary(baseStructure);
            } else {
                setCalculatedSalary(null);
            }
        }
    }, [employee, workedDays, sundays, baseGrossSalary, calculateProRatedSalary]);

    const generateSalarySlip = async () => {
        if (!employee || !calculatedSalary) return;

        const doc = new jsPDF();
        if (logoBase64) {
            try {
                const logoWidth = 50;
                const logoHeight = 15;
                doc.addImage(logoBase64, 'PNG', (210 - logoWidth) / 2, 10, logoWidth, logoHeight);
            } catch (e) {
                console.warn("Could not add logo", e);
            }
        }

        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text("PATHFINDER EDUCATIONAL CENTER LLP", 105, 32, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("96K, S.P Mukherjee Road, Hazra More, Kolkata-700 026", 105, 38, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`Salary Slip for ${months.find(m => m.value == selectedMonth)?.label} ${selectedYear}`, 105, 50, { align: "center" });

        doc.setLineWidth(0.1);
        doc.rect(15, 60, 180, 40);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Emp Code:", 20, 67);
        doc.setFont("helvetica", "normal");
        doc.text(employee.employeeId || "-", 50, 67);

        doc.setFont("helvetica", "bold");
        doc.text("Name:", 20, 73);
        doc.setFont("helvetica", "normal");
        doc.text(employee.name?.toUpperCase() || "-", 50, 73);

        doc.setFont("helvetica", "bold");
        doc.text("Designation:", 20, 79);
        doc.setFont("helvetica", "normal");
        doc.text(employee.designation?.name || "-", 50, 79);

        doc.setFont("helvetica", "bold");
        doc.text("Department:", 20, 85);
        doc.setFont("helvetica", "normal");
        doc.text(employee.department?.departmentName || "-", 50, 85);

        doc.setFont("helvetica", "bold");
        doc.text("Date of Joining:", 110, 67);
        doc.setFont("helvetica", "normal");
        doc.text(employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : "-", 145, 67);

        doc.setFont("helvetica", "bold");
        doc.text("PAN No:", 110, 73);
        doc.setFont("helvetica", "normal");
        doc.text(employee.panNumber || "-", 145, 73);

        doc.setFont("helvetica", "bold");
        doc.text("Bank A/C:", 110, 79);
        doc.setFont("helvetica", "normal");
        doc.text(employee.accountNumber || "-", 145, 79);

        doc.setFont("helvetica", "bold");
        doc.text("Total Days:", 110, 85);
        doc.setFont("helvetica", "normal");
        doc.text("30", 145, 85);

        doc.setFont("helvetica", "bold");
        doc.text("Worked Days:", 110, 91);
        doc.setFont("helvetica", "normal");
        doc.text(String(workedDays), 145, 91);

        doc.setFont("helvetica", "bold");
        doc.text("Paid Holidays:", 155, 91);
        doc.setFont("helvetica", "normal");
        doc.text(String(sundays), 180, 91);

        const startY = 110;
        const col1 = 15;
        const col2 = 105;
        const rowHeight = 8;

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
            doc.rect(col1, currentY, 90, rowHeight);
            if (earnings[i]) {
                doc.setFont("helvetica", "normal");
                doc.text(earnings[i].label, col1 + 5, currentY + 5);
                doc.text(String(earnings[i].val || 0), col1 + 85, currentY + 5, { align: "right" });
            }

            doc.rect(col2, currentY, 90, rowHeight);
            if (deductions[i]) {
                doc.setFont("helvetica", "normal");
                doc.text(deductions[i].label, col2 + 5, currentY + 5);
                doc.text(String(deductions[i].val || 0), col2 + 85, currentY + 5, { align: "right" });
            }
            currentY += rowHeight;
        }

        doc.setFont("helvetica", "bold");
        doc.rect(col1, currentY, 90, rowHeight);
        doc.text("Gross Earnings", col1 + 5, currentY + 5);
        doc.text(String(structure.totalEarnings || 0), col1 + 85, currentY + 5, { align: "right" });

        doc.rect(col2, currentY, 90, rowHeight);
        doc.text("Total Deductions", col2 + 5, currentY + 5);
        doc.text(String(structure.totalDeductions || 0), col2 + 85, currentY + 5, { align: "right" });

        currentY += rowHeight + 5;
        doc.setFillColor(240, 248, 255);
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

        doc.setFont("helvetica", "normal");
        doc.text("This is a computer-generated payslip and does not require a signature.", 105, 280, { align: "center" });

        doc.save(`${employee.name}_Payslip_${months.find(m => m.value == selectedMonth)?.label}_${selectedYear}.pdf`);
        toast.success("Payslip Generated Successfully!");
    };

    const convertNumberToWords = (amount) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

        const convert = (n) => {
            if (n < 10) return ones[n];
            if (n < 20) return teens[n - 10];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
            if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
            if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
            if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
            return 'Large Amount';
        };

        if (amount === 0) return 'Zero';
        return convert(amount);
    }

    if (loading) {
        return (
            <Layout activePage="Finance & Fees">
                <div className={`flex h-screen items-center justify-center font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Syncing Node...</div>
            </Layout>
        );
    }

    if (!employee) return null;

    const baseSalary = calculatedSalary || employee.salaryStructure?.[0] || {};
    const salary = { ...baseSalary, netSalary: baseSalary.netSalary || 0 };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header with Back Button */}
                <div className="flex items-center gap-6 mb-10">
                    <button 
                        onClick={() => navigate(-1)} 
                        className={`p-4 border rounded-2xl transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm'}`}
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Process <span className="text-emerald-500">Payroll</span></h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Review fiscal metrics and authorize salary dispatch for <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{employee.name}</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Employee Card & Selector */}
                    <div className="space-y-8">
                        <div className={`border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                            <div className={`w-28 h-28 mx-auto rounded-[2rem] border-4 overflow-hidden mb-6 shadow-2xl transition-all ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-100 border-white'}`}>
                                {employee.profileImage ? (
                                    <img src={employee.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="flex items-center justify-center h-full text-4xl font-black text-gray-400 italic">{employee.name.charAt(0)}</span>
                                )}
                            </div>
                            <h2 className={`text-2xl font-black italic uppercase tracking-tight text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{employee.name}</h2>
                            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] text-center mb-8 mt-2">{employee.designation?.name}</p>

                            <div className={`grid grid-cols-1 gap-3 p-6 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                <div className="flex justify-between items-center">
                                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Employee Node</p>
                                    <p className={`font-mono text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{employee.employeeId}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Division</p>
                                    <p className={`text-xs font-black italic ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{employee.department?.departmentName || "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`border p-8 rounded-[2.5rem] shadow-2xl space-y-8 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <h3 className={`font-black uppercase italic text-sm flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                    <FaCalendarAlt size={16} />
                                </div>
                                Dispatch Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Cycle Month</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className={`w-full border rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500 appearance-none transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                    >
                                        {months.map(m => (
                                            <option key={m.value} value={m.value} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Fiscal Year</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className={`w-full border rounded-xl px-4 py-3 text-xs font-black tracking-widest focus:outline-none focus:border-emerald-500 appearance-none transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Base Liquidity (Gross)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">₹</span>
                                        <input
                                            type="number"
                                            value={baseGrossSalary}
                                            onChange={(e) => setBaseGrossSalary(Number(e.target.value))}
                                            className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm font-black tracking-tight focus:outline-none focus:border-emerald-500 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Operational Days</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            value={workedDays}
                                            onChange={(e) => setWorkedDays(Number(e.target.value))}
                                            className={`w-full border rounded-xl px-4 py-3 text-sm font-black tracking-widest focus:outline-none focus:border-emerald-500 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            min="0"
                                            max="31"
                                        />
                                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Days</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 mt-2 italic leading-relaxed font-bold uppercase tracking-tight">
                                        Formula: (Gross / 30) * ({Number(workedDays)} Active + {sundays} Statutory) - Deductions
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={generateSalarySlip}
                                className="w-full mt-4 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <FaPrint size={14} /> Authorize & Dispatch
                            </button>
                        </div>
                    </div>

                    {/* Right: Salary Breakdown */}
                    <div className={`lg:col-span-2 border p-10 rounded-[3rem] shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-10 pb-6 border-b ${isDarkMode ? 'text-white border-gray-800' : 'text-gray-900 border-gray-100'}`}>Fiscal Architecture</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Earnings */}
                            <div className="space-y-6">
                                <h4 className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em] mb-8 italic">Asset Allocation</h4>
                                <div className="space-y-4">
                                    <Row label="Basic Salary" value={salary.basic} isDarkMode={isDarkMode} />
                                    <Row label="HRA" value={salary.hra} isDarkMode={isDarkMode} />
                                    <Row label="Conveyance" value={salary.conveyance} isDarkMode={isDarkMode} />
                                    <Row label="Special Allowance" value={salary.specialAllowance} isDarkMode={isDarkMode} />
                                    <Row label="CCA" value={salary.cca} isDarkMode={isDarkMode} />
                                    <div className={`pt-6 border-t mt-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <Row label="Gross Earnings" value={salary.totalEarnings} highlight isDarkMode={isDarkMode} />
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div className="space-y-6">
                                <h4 className="text-red-500 text-[11px] font-black uppercase tracking-[0.3em] mb-8 italic">Liability Assessment</h4>
                                <div className="space-y-4">
                                    <Row label="Provident Fund" value={salary.pf} isDarkMode={isDarkMode} />
                                    <Row label="Professional Tax" value={salary.pTax} isDarkMode={isDarkMode} />
                                    <Row label="ESI" value={salary.esi} isDarkMode={isDarkMode} />
                                    <Row label="TDS" value={salary.tds} isDarkMode={isDarkMode} />
                                    <Row label="Loss of Pay" value={salary.lossOfPay} isDarkMode={isDarkMode} />
                                    <div className={`pt-6 border-t mt-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <Row label="Gross Liabilities" value={salary.totalDeductions} highlight isDarkMode={isDarkMode} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`mt-12 p-10 rounded-[2.5rem] border flex flex-col md:flex-row justify-between items-center transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                            <div className="text-center md:text-left mb-6 md:mb-0">
                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.3em] mb-1">Final Settlement</p>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Assets minus assessed liabilities</p>
                            </div>
                            <div className={`text-5xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                ₹{salary.netSalary?.toLocaleString('en-IN') || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

const Row = ({ label, value, highlight, isDarkMode }) => (
    <div className={`flex justify-between items-center transition-all ${highlight ? `${isDarkMode ? 'text-white' : 'text-gray-900'} font-black text-lg` : `${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs font-bold uppercase tracking-wider`}`}>
        <span>{label}</span>
        <span className="font-black tabular-nums tracking-tighter">{value?.toLocaleString('en-IN') || 0}</span>
    </div>
);

export default PayEmployeeDetails;
