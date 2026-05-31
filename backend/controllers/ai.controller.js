
import { generateAIResponse } from "../services/gemini.service.js";
import Student from "../models/Students.js";
import LeadManagement from "../models/LeadManagement.js";
import Admission from "../models/Admission/Admission.js";
import Employee from "../models/HR/Employee.js";
import Expense from "../models/Finance/Expense.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — tells the AI who it is and how to behave
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are "Pathfinder AI" — the official intelligent assistant for Pathfinder ERP, an educational institute management system.

Your capabilities:
- You have been given LIVE data from the ERP database for the current query.
- You analyse the data and provide accurate, insightful, and actionable answers.
- You understand ERP modules: Lead Management, Admissions, Student Enrollment, Finance, HR, and Academics.
- You act as an expert ERP guide and provide exact, step-by-step instructions on how to use the ERP features.

STRICT RULES:
1. For data-related queries, only answer based on the data provided in the context. Do NOT make up numbers or names.
2. If the user asks for instructions on how to perform a task (e.g., "how to add a lead", "how to take an admission"), provide exact step-by-step guidance based on your training.
3. If data is empty, tell the user politely that no records were found.
4. Format answers clearly using bullet points, tables (markdown), or numbered lists where helpful.
5. Be concise yet thorough — avoid waffle but provide all important details.
6. If the user asks for something outside ERP scope, redirect them to ask ERP-related questions.
7. For financial data, always format amounts as ₹ with commas (e.g., ₹1,25,000).
8. Always mention the data time range or filters applied if discussing data.
9. When asked about 'counselled' students, refer to the 'counselled' and 'boardCourseCounselled' counts from Leads data.
10. When asked about 'enrolled students' or 'board course enrolled', refer to the 'enrolled' and 'boardCourseEnrolled' counts from Students/Admissions data.
11. When asked about admissions, use the total admissions, normal admissions, and board admissions data.

LEAD MANAGEMENT MODULE TRAINING:
- Add Lead Workflow: 
  Click the 'Add Lead' button on the Lead Management page. Fill in Contact Information (Name, Email, Phone), Academic Details (Origin School, Target Class, Board, Target Exam), Assignment Details (Target Centre, Lead Priority: HOT/WARM/COLD LEAD), select the Course and Origin Source, and assign it to an Agent (telecaller). Click 'Save Lead'.
- Bulk Operations & Excel Imports: 
  You can bulk import Fresh Leads (added as pending) or Contacted Leads (matched by phone/email, updates remarks and feedback). You can also perform bulk updates, bulk deletes by filter, and export leads or telecaller logs to Excel.
- Follow-ups & Calling (Twilio): 
  Leads have follow-up histories. You can add a follow-up directly from a lead, mark their priority, select feedback (e.g., Interested, Call back later), and schedule the 'Next Follow Up' date. The system supports direct Twilio voice calling from the app, and call recordings are available. A 'Red Flag' system highlights leads with missed follow-ups.
- Conversion to Admission: 
  Leads can be explicitly tagged as "Walk-Ins" via the action menu. To officially admit a lead, click on their action menu: choose 'Normal Counseling' to be redirected to the "Student Registration" page, or 'Board Counseling' to be redirected to the "Board Admissions" page.
- Dashboard & Analytics: 
  The Lead Management module provides extensive analytics, including an overall Lead Dashboard, Centre Analysis, Follow Up Stats, and detailed Telecaller Analytics to monitor agent performance.
- Marketing Planner:
  Campaigns and marketing plans are integrated directly into the lead tracking system.

GENERAL ERP WORKFLOWS:
- Normal Admission: Step 1: Find the lead in Lead Management. Step 2: Navigate to "Student Registration" to create the profile. Step 3: Go to "Student Admission". Step 4: Search the student. Step 5: Fill course/fee details. Step 6: Review and Save.
- Board Admission: Guide them to the "Board Admissions" menu to process it similarly.
`;

// ─────────────────────────────────────────────────────────────
// INTENT DETECTION — maps user message to ERP module
// ─────────────────────────────────────────────────────────────
const detectIntent = (message) => {
    const lower = message.toLowerCase();

    const patterns = {
        leads: [
            "lead", "leads", "follow up", "followup", "telecall", "hot lead", "cold lead",
            "warm lead", "prospect", "enquiry", "inquiry", "potential student", "counselled", "board course counselled", "counsel"
        ],
        students: [
            "student", "students", "enrolled", "enrollment", "active student", "enrolled students", "board course enrolled",
            "deactivated", "inactive student", "student count", "total student"
        ],
        admissions: [
            "admission", "admit", "admissions", "fee", "fees", "installment",
            "payment", "pending payment", "overdue", "paid", "down payment",
            "board admission", "normal admission", "fee collection", "due", "defaulter", "board course admission", "board counseling", "subject", "subjects", "select subjects"
        ],
        finance: [
            "expense", "expenses", "salary expense", "cash", "budget", "petty cash",
            "revenue", "collection", "income", "finance", "financial", "payout",
            "total collection", "today collection", "monthly collection"
        ],
        hr: [
            "employee", "employees", "staff", "hr", "payroll", "designation",
            "department", "joining", "resignation", "leave", "attendance", "training"
        ],
        centre: [
            "centre", "center", "branch", "location", "zone"
        ],
        summary: [
            "summary", "overview", "dashboard", "today", "report", "stats",
            "statistics", "snapshot", "how are we doing", "performance"
        ]
    };

    const detected = new Set();
    for (const [intent, keywords] of Object.entries(patterns)) {
        if (keywords.some(k => lower.includes(k))) {
            detected.add(intent);
        }
    }

    // Default to summary if nothing matches
    if (detected.size === 0) detected.add("summary");
    return Array.from(detected);
};

const extractDateRange = (message) => {
    const lower = message.toLowerCase();
    const now = new Date();
    
    // Check for explicit months first
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    for (let i = 0; i < months.length; i++) {
        if (lower.includes(months[i])) {
            let year = now.getFullYear();
            const yearMatch = lower.match(/\b(20\d{2})\b/);
            if (yearMatch) year = parseInt(yearMatch[1]);
            const startDate = new Date(year, i, 1);
            const endDate = new Date(year, i + 1, 0, 23, 59, 59, 999);
            return { $gte: startDate, $lte: endDate };
        }
    }

    if (lower.includes("yesterday")) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        const start = new Date(d);
        start.setHours(0,0,0,0);
        const end = new Date(d);
        end.setHours(23,59,59,999);
        return { $gte: start, $lte: end };
    } else if (lower.includes("this week")) {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Sunday
        start.setHours(0,0,0,0);
        const end = new Date(now);
        end.setHours(23,59,59,999);
        return { $gte: start, $lte: end };
    } else if (lower.includes("last week")) {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 7);
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23,59,59,999);
        return { $gte: start, $lte: end };
    } else if (lower.includes("this month")) {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { $gte: start, $lte: end };
    } else if (lower.includes("last month")) {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { $gte: start, $lte: end };
    } else if (lower.includes("this year")) {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { $gte: start, $lte: end };
    } else if (lower.includes("last year")) {
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return { $gte: start, $lte: end };
    }

    return null; // fallback to today or unspecified later
};

// ─────────────────────────────────────────────────────────────
// DATA FETCHERS — pulls live data from MongoDB
// ─────────────────────────────────────────────────────────────

const getCentreFilter = async (user, fieldName = "centre") => {
    if (!user) return {};
    const role = (user.role || "").toLowerCase().replace(/\s+/g, "");
    if (["superadmin", "super admin"].includes(role)) return {};

    try {
        const userDoc = await User.findById(user.id || user._id).select("centres");
        if (userDoc && userDoc.centres && userDoc.centres.length > 0) {
            return { [fieldName]: { $in: userDoc.centres } };
        }
    } catch (err) {
        console.error("Error fetching user centres:", err);
    }
    // If no centres or error, restrict to nothing
    return { [fieldName]: null };
};

const fetchLeadData = async (user, dateFilter) => {
    try {
        const centreFilter = await getCentreFilter(user, "centre");
        
        // Time filter defaults to today if not provided
        let timeFilter = dateFilter;
        if (!timeFilter) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            timeFilter = { $gte: startOfDay, $lte: endOfDay };
        }

        const totalLeads = await LeadManagement.countDocuments(centreFilter);
        const hotLeads = await LeadManagement.countDocuments({ ...centreFilter, leadType: "HOT LEAD" });
        const warmLeads = await LeadManagement.countDocuments({ ...centreFilter, leadType: "WARM LEAD" });
        const coldLeads = await LeadManagement.countDocuments({ ...centreFilter, leadType: "COLD LEAD" });
        const counselled = await LeadManagement.countDocuments({ ...centreFilter, isCounseled: true });
        const boardCourseCounselled = await LeadManagement.countDocuments({ ...centreFilter, isCounseled: true, board: { $exists: true, $ne: null } });

        // Leads added in the period
        const periodLeads = await LeadManagement.countDocuments({
            ...centreFilter,
            createdAt: timeFilter
        });

        // Leads needing follow-up in the period
        const followUpDue = await LeadManagement.countDocuments({
            ...centreFilter,
            nextFollowUpDate: timeFilter,
            isCounseled: false
        });

        // Recent 5 leads
        const recentLeads = await LeadManagement.find(centreFilter)
            .sort({ createdAt: -1 })
            .limit(5)
            .select("name phoneNumber leadType source createdAt isCounseled")
            .lean();

        return {
            totalLeads, hotLeads, warmLeads, coldLeads, counselled, boardCourseCounselled,
            periodLeads, followUpDue,
            recentLeads
        };
    } catch (err) {
        console.error("Lead fetch error:", err);
        return null;
    }
};

const fetchStudentData = async (user, dateFilter) => {
    try {
        const centreFilter = await getCentreFilter(user, "studentsDetails.centre");
        const total = await Student.countDocuments(centreFilter);
        const active = await Student.countDocuments({ ...centreFilter, status: "Active" });
        const deactivated = await Student.countDocuments({ ...centreFilter, status: "Deactivated" });
        const enrolled = await Student.countDocuments({ ...centreFilter, isEnrolled: true });

        // Calculate Board Course Enrolled by checking Admissions
        // getCentreFilter returns { "studentsDetails.centre": ... }, we need { "centre": ... } for Admission
        const admissionCentreFilter = await getCentreFilter(user, "centre");
        const boardEnrolledAdmissions = await Admission.find({ ...admissionCentreFilter, admissionType: "BOARD", admissionStatus: "ACTIVE" }).distinct('student');
        const boardCourseEnrolled = boardEnrolledAdmissions.length;

        // Note: Students are generally active/inactive overall, period queries might apply to recent joiners
        let timeFilter = dateFilter;
        if (!timeFilter) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            timeFilter = { $gte: startOfDay, $lte: endOfDay };
        }

        const periodStudents = await Student.countDocuments({
            ...centreFilter,
            createdAt: timeFilter
        });

        // Centre-wise breakdown
        const centreBreakdown = await Student.aggregate([
            { $match: centreFilter },
            {
                $unwind: "$studentsDetails"
            },
            {
                $group: {
                    _id: "$studentsDetails.centre",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Recent 5 students
        const recentStudents = await Student.find(centreFilter)
            .sort({ createdAt: -1 })
            .limit(5)
            .select("studentsDetails.studentName studentsDetails.centre studentsDetails.mobileNum isEnrolled status createdAt")
            .lean();

        return {
            total, active, deactivated, enrolled, boardCourseEnrolled,
            periodStudents,
            centreBreakdown,
            recentStudents
        };
    } catch (err) {
        console.error("Student fetch error:", err);
        return null;
    }
};

const fetchAdmissionData = async (user, dateFilter) => {
    try {
        const centreFilter = await getCentreFilter(user, "centre");
        const total = await Admission.countDocuments(centreFilter);
        const active = await Admission.countDocuments({ ...centreFilter, admissionStatus: "ACTIVE" });
        const cancelled = await Admission.countDocuments({ ...centreFilter, admissionStatus: "CANCELLED" });
        const normalType = await Admission.countDocuments({ ...centreFilter, admissionType: "NORMAL" });
        const boardType = await Admission.countDocuments({ ...centreFilter, admissionType: "BOARD" });

        // Payment status breakdown
        const pendingPayment = await Admission.countDocuments({ ...centreFilter, paymentStatus: "PENDING" });
        const partialPayment = await Admission.countDocuments({ ...centreFilter, paymentStatus: "PARTIAL" });
        const completedPayment = await Admission.countDocuments({ ...centreFilter, paymentStatus: "COMPLETED" });

        // Overdue installments
        const overdueAdmissions = await Admission.countDocuments({
            ...centreFilter,
            "paymentBreakdown.status": "OVERDUE"
        });

        // Time filter defaults to today if not provided
        let timeFilter = dateFilter;
        if (!timeFilter) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            timeFilter = { $gte: startOfDay, $lte: endOfDay };
        }

        // Admissions in period
        const periodAdmissions = await Admission.countDocuments({
            ...centreFilter,
            admissionDate: timeFilter
        });

        // Financial totals
        const financialAgg = await Admission.aggregate([
            { $match: { ...centreFilter, admissionStatus: "ACTIVE" } },
            {
                $group: {
                    _id: null,
                    totalFees: { $sum: "$totalFees" },
                    totalPaid: { $sum: "$totalPaidAmount" },
                    totalRemaining: { $sum: "$remainingAmount" }
                }
            }
        ]);

        // Centre-wise admissions
        const centreBreakdown = await Admission.aggregate([
            { $match: centreFilter },
            { $group: { _id: "$centre", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Recent 5 admissions
        const recentAdmissions = await Admission.find({ ...centreFilter, admissionStatus: "ACTIVE" })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("student", "studentsDetails")
            .select("admissionNumber admissionDate admissionType totalFees totalPaidAmount paymentStatus centre")
            .lean();

        const fin = financialAgg[0] || {};

        return {
            total,
            active,
            cancelled,
            normalType,
            boardType,
            pendingPayment,
            partialPayment,
            completedPayment,
            overdueAdmissions,
            periodAdmissions,
            centreBreakdown,
            totalFeesCharged: fin.totalFees || 0,
            totalAmountCollected: fin.totalPaid || 0,
            totalAmountPending: fin.totalRemaining || 0,
            recentAdmissions
        };
    } catch (err) {
        console.error("Admission fetch error:", err);
        return null;
    }
};

const fetchFinanceData = async (user) => {
    try {
        // Finance is typically global, but leaving placeholder for user parameter
        // Expense summary
        const totalExpenses = await Expense.aggregate([
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const expenseByType = await Expense.aggregate([
            { $group: { _id: "$expenseType", total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        // This month's expenses
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyExpenses = await Expense.aggregate([
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        // Pending salary expenses
        const pendingSalary = await Expense.aggregate([
            { $match: { expenseType: "Salary", financeStatus: "Pending" } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        return {
            totalExpensesAllTime: totalExpenses[0]?.total || 0,
            expenseByType,
            thisMonthExpenses: monthlyExpenses[0]?.total || 0,
            thisMonthExpenseCount: monthlyExpenses[0]?.count || 0,
            pendingSalaryExpense: pendingSalary[0]?.total || 0,
            pendingSalaryCount: pendingSalary[0]?.count || 0
        };
    } catch (err) {
        console.error("Finance fetch error:", err);
        return null;
    }
};

const fetchHRData = async (user) => {
    try {
        // HR is typically global
        const total = await Employee.countDocuments();
        const active = await Employee.countDocuments({ status: "Active" });
        const inactive = await Employee.countDocuments({ status: "Inactive" });
        const resigned = await Employee.countDocuments({ status: "Resigned" });

        // Department breakdown
        const deptBreakdown = await Employee.aggregate([
            { $match: { status: "Active" } },
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "dept"
                }
            },
            { $unwind: { path: "$dept", preserveNullAndEmpty: true } },
            { $group: { _id: "$dept.name", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Salary totals
        const salaryAgg = await Employee.aggregate([
            { $match: { status: "Active" } },
            { $group: { _id: null, totalSalary: { $sum: "$currentSalary" }, avgSalary: { $avg: "$currentSalary" } } }
        ]);

        // Recent joiners (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentJoiners = await Employee.countDocuments({
            dateOfJoining: { $gte: thirtyDaysAgo }
        });

        const salaryData = salaryAgg[0] || {};

        return {
            total,
            active,
            inactive,
            resigned,
            deptBreakdown,
            totalMonthlySalaryBill: salaryData.totalSalary || 0,
            avgSalary: Math.round(salaryData.avgSalary || 0),
            recentJoiners
        };
    } catch (err) {
        console.error("HR fetch error:", err);
        return null;
    }
};

const fetchSummaryData = async (user, dateFilter) => {
    // Fetch lightweight dashboard-level stats
    try {
        const studentFilter = await getCentreFilter(user, "studentsDetails.centre");
        const leadFilter = await getCentreFilter(user, "centre");
        const admissionFilter = await getCentreFilter(user, "centre");

        let timeFilter = dateFilter;
        if (!timeFilter) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            timeFilter = { $gte: startOfDay, $lte: endOfDay };
        }

        const [
            totalStudents, activeStudents,
            totalLeads, hotLeads,
            totalAdmissions, periodAdmissions,
            totalEmployees, activeEmployees
        ] = await Promise.all([
            Student.countDocuments(studentFilter),
            Student.countDocuments({ ...studentFilter, status: "Active" }),
            LeadManagement.countDocuments(leadFilter),
            LeadManagement.countDocuments({ ...leadFilter, leadType: "HOT LEAD" }),
            Admission.countDocuments(admissionFilter),
            Admission.countDocuments({ ...admissionFilter, admissionDate: timeFilter }),
            Employee.countDocuments(), // HR Global
            Employee.countDocuments({ status: "Active" })
        ]);

        // Total revenue collected
        const revenueAgg = await Admission.aggregate([
            { $match: admissionFilter },
            { $group: { _id: null, collected: { $sum: "$totalPaidAmount" }, total: { $sum: "$totalFees" } } }
        ]);
        const rev = revenueAgg[0] || {};

        return {
            students: { total: totalStudents, active: activeStudents },
            leads: { total: totalLeads, hot: hotLeads },
            admissions: { total: totalAdmissions, periodAdmissions },
            employees: { total: totalEmployees, active: activeEmployees },
            revenue: {
                totalCharged: rev.total || 0,
                totalCollected: rev.collected || 0,
                pendingCollection: (rev.total || 0) - (rev.collected || 0)
            }
        };
    } catch (err) {
        console.error("Summary fetch error:", err);
        return null;
    }
};

// ─────────────────────────────────────────────────────────────
// CONTEXT BUILDER — assembles ERP data based on detected intent
// ─────────────────────────────────────────────────────────────
const buildERPContext = async (intents, user, dateFilter) => {
    const context = {};
    const fetchTasks = [];

    if (intents.includes("summary")) {
        fetchTasks.push(fetchSummaryData(user, dateFilter).then(d => { if (d) context.summary = d; }));
    }
    if (intents.includes("leads")) {
        fetchTasks.push(fetchLeadData(user, dateFilter).then(d => { if (d) context.leads = d; }));
    }
    if (intents.includes("students")) {
        fetchTasks.push(fetchStudentData(user, dateFilter).then(d => { if (d) context.students = d; }));
    }
    if (intents.includes("admissions") || intents.includes("finance")) {
        fetchTasks.push(fetchAdmissionData(user, dateFilter).then(d => { if (d) context.admissions = d; }));
    }
    if (intents.includes("finance")) {
        fetchTasks.push(fetchFinanceData(user, dateFilter).then(d => { if (d) context.finance = d; }));
    }
    if (intents.includes("hr")) {
        fetchTasks.push(fetchHRData(user, dateFilter).then(d => { if (d) context.hr = d; }));
    }

    await Promise.all(fetchTasks);
    return context;
};

// ─────────────────────────────────────────────────────────────
// MAIN CONTROLLER — POST /api/ai/chat
// ─────────────────────────────────────────────────────────────
export const chatWithAI = async (req, res) => {
    try {
        const { message, context: pageContext } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Message is required" });
        }

        // 1. Detect what the user is asking about and extract potential date filters
        const intents = detectIntent(message);
        const dateFilter = extractDateRange(message);

        // 2. Fetch relevant live ERP data restricted to user's assigned centres and date
        const erpData = await buildERPContext(intents, req.user, dateFilter);

        // 3. Build the full prompt with context
        const erpDataString = JSON.stringify(erpData, null, 2);
        const currentTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        // Optional: Dynamically load frontend source code if the user asks detailed "how it works" questions
        let sourceCodeContext = "";
        const isInstructional = ["how", "explain", "work", "details", "code", "files"].some(word => message.toLowerCase().includes(word));
        
        if (isInstructional) {
            if (intents.includes("leads")) {
                try {
                    // Read Lead Management frontend components to give the AI exact runtime technical context
                    const leadMgmtPath = path.resolve(__dirname, "../../frontend/src/components/LeadManagement");
                    if (fs.existsSync(leadMgmtPath)) {
                        const files = fs.readdirSync(leadMgmtPath).filter(f => f.endsWith('.jsx'));
                        sourceCodeContext += "\n--- FRONTEND SOURCE CODE (LEAD MANAGEMENT) ---\n";
                        sourceCodeContext += "The user is asking a detailed operational question. Here is the actual source code of the module so you can give an EXACT, non-generic answer based on the real files:\n\n";
                        for (const file of files) {
                            const content = fs.readFileSync(path.join(leadMgmtPath, file), "utf-8");
                            sourceCodeContext += `\n// File: ${file}\n${content.substring(0, 50000)}...\n`; // Cap file size to save tokens
                        }
                        sourceCodeContext += "\n--- END OF SOURCE CODE ---\n";
                    }
                } catch (err) {
                    console.error("Error reading frontend source code for AI context (Leads):", err);
                }
            }
            if (intents.includes("admissions")) {
                try {
                    // Read Admissions frontend components
                    const admissionsPath = path.resolve(__dirname, "../../frontend/src/components/Admissions");
                    if (fs.existsSync(admissionsPath)) {
                        const files = fs.readdirSync(admissionsPath).filter(f => f.endsWith('.jsx'));
                        sourceCodeContext += "\n--- FRONTEND SOURCE CODE (ADMISSIONS & BOARD COUNSELING) ---\n";
                        sourceCodeContext += "The user is asking a detailed operational question. Here is the actual source code of the module so you can give an EXACT, non-generic answer based on the real files (e.g. how to select subjects, etc.):\n\n";
                        for (const file of files) {
                            const content = fs.readFileSync(path.join(admissionsPath, file), "utf-8");
                            sourceCodeContext += `\n// File: ${file}\n${content.substring(0, 50000)}...\n`;
                        }
                        sourceCodeContext += "\n--- END OF SOURCE CODE ---\n";
                    }
                } catch (err) {
                    console.error("Error reading frontend source code for AI context (Admissions):", err);
                }
            }
        }

        const fullPrompt = `
CURRENT DATE & TIME (IST): ${currentTime}
USER IS ON PAGE: ${pageContext || "ERP Dashboard"}
DETECTED QUERY INTENT: ${intents.join(", ")}

--- LIVE ERP DATABASE DATA ---
${erpDataString}
--- END OF ERP DATA ---
${sourceCodeContext}

USER QUESTION: ${message}

Please analyse the above ERP data and answer the user's question accurately. Format your response clearly.
`;

        // 4. Send to Gemini and get the response
        const aiResponse = await generateAIResponse(fullPrompt, SYSTEM_PROMPT);

        return res.json({
            response: aiResponse,
            intents,
            dataFetched: Object.keys(erpData)
        });

    } catch (error) {
        console.error("AI Controller Error:", error);
        return res.status(500).json({
            error: "Internal Server Error during AI processing",
            details: error.message
        });
    }
};

// ─────────────────────────────────────────────────────────────
// ANALYTICS QUERY — POST /api/ai/analyse
// Deep analysis with custom date range and centre filter
// ─────────────────────────────────────────────────────────────
export const analyseERP = async (req, res) => {
    try {
        const { question, module, startDate, endDate, centre } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        let data = {};
        const targetModule = module?.toLowerCase() || "all";

        // Fetch module-specific data with optional date/centre filter
        if (targetModule === "all" || targetModule === "admissions") {
            const admissionQuery = {};
            if (Object.keys(dateFilter).length > 0) admissionQuery.admissionDate = dateFilter;
            if (centre) admissionQuery.centre = { $regex: centre, $options: "i" };

            const admissions = await Admission.find(admissionQuery)
                .sort({ admissionDate: -1 })
                .limit(100)
                .populate("student", "studentsDetails")
                .select("admissionNumber admissionDate admissionType totalFees totalPaidAmount remainingAmount paymentStatus admissionStatus centre")
                .lean();

            const admissionStats = await Admission.aggregate([
                { $match: admissionQuery },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        totalRevenue: { $sum: "$totalFees" },
                        collected: { $sum: "$totalPaidAmount" },
                        pending: { $sum: "$remainingAmount" }
                    }
                }
            ]);

            data.admissions = {
                stats: admissionStats[0] || {},
                records: admissions.slice(0, 20), // Top 20 for context
                totalRecords: admissions.length
            };
        }

        if (targetModule === "all" || targetModule === "leads") {
            const leadQuery = {};
            if (Object.keys(dateFilter).length > 0) leadQuery.createdAt = dateFilter;

            const leadStats = await LeadManagement.aggregate([
                { $match: leadQuery },
                {
                    $group: {
                        _id: "$leadType",
                        count: { $sum: 1 }
                    }
                }
            ]);

            const sourceStats = await LeadManagement.aggregate([
                { $match: leadQuery },
                {
                    $group: {
                        _id: "$source",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            data.leads = { byType: leadStats, bySource: sourceStats };
        }

        if (targetModule === "all" || targetModule === "hr") {
            const hrData = await fetchHRData();
            data.hr = hrData;
        }

        if (targetModule === "all" || targetModule === "finance") {
            const finQuery = {};
            if (Object.keys(dateFilter).length > 0) finQuery.createdAt = dateFilter;

            const expenseStats = await Expense.aggregate([
                { $match: finQuery },
                {
                    $group: {
                        _id: "$expenseType",
                        total: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                }
            ]);

            data.finance = { expenseStats };
        }

        const filters = {
            ...(startDate && { from: startDate }),
            ...(endDate && { to: endDate }),
            ...(centre && { centre }),
            module: targetModule
        };

        const currentTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const prompt = `
CURRENT DATE & TIME (IST): ${currentTime}
APPLIED FILTERS: ${JSON.stringify(filters)}

--- LIVE ERP ANALYSIS DATA ---
${JSON.stringify(data, null, 2)}
--- END OF ERP DATA ---

ANALYTICAL QUESTION: ${question}

Please provide a detailed analysis and insights based on the above ERP data. 
Include trends, anomalies, recommendations, and key metrics in your response.
`;

        const aiResponse = await generateAIResponse(prompt, SYSTEM_PROMPT);

        return res.json({
            response: aiResponse,
            filters,
            dataModules: Object.keys(data)
        });

    } catch (error) {
        console.error("ERP Analysis Error:", error);
        return res.status(500).json({
            error: "Internal Server Error during ERP analysis",
            details: error.message
        });
    }
};

// ─────────────────────────────────────────────────────────────
// STUDENT INSIGHT — POST /api/ai/student-insight
// Gives AI-powered insight on a specific student
// ─────────────────────────────────────────────────────────────
export const getStudentInsight = async (req, res) => {
    try {
        const { studentId, admissionId } = req.body;

        if (!studentId && !admissionId) {
            return res.status(400).json({ error: "studentId or admissionId is required" });
        }

        let studentData = null;
        let admissions = [];

        if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
            studentData = await Student.findById(studentId)
                .select("-__v")
                .lean();
            admissions = await Admission.find({ student: studentId })
                .populate("course", "courseName")
                .lean();
        }

        if (admissionId && mongoose.Types.ObjectId.isValid(admissionId)) {
            const admission = await Admission.findById(admissionId)
                .populate("student", "studentsDetails")
                .populate("course", "courseName")
                .lean();
            if (admission) {
                admissions = [admission];
                studentData = admission.student;
            }
        }

        if (!studentData) {
            return res.status(404).json({ error: "Student not found" });
        }

        const prompt = `
--- STUDENT RECORD ---
${JSON.stringify(studentData, null, 2)}

--- ADMISSION & PAYMENT RECORDS ---
${JSON.stringify(admissions, null, 2)}

Please give a comprehensive student profile summary including:
1. Personal details overview
2. Admission and course information
3. Payment status and history (any overdue installments?)
4. Recommendations or flags (if any payment is overdue, if student is inactive, etc.)
`;

        const aiResponse = await generateAIResponse(prompt, SYSTEM_PROMPT);

        return res.json({ response: aiResponse });

    } catch (error) {
        console.error("Student Insight Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            details: error.message
        });
    }
};
