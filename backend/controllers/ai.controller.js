
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
- You act as an expert ERP guide and provide EXACT, step-by-step button-click instructions for every ERP feature.

STRICT RULES:
1. For data-related queries, only answer based on the data provided in the context. Do NOT make up numbers or names.
2. If the user asks HOW TO do something, provide EXACT step-by-step guidance using the EXACT button names shown on screen (e.g., click the green 'Admit' button, click 'Add Counselling').
3. If data is empty, tell the user politely that no records were found.
4. Format answers clearly using bullet points, numbered steps, or tables where helpful.
5. Be concise yet thorough — avoid waffle but provide all important details.
6. If the user asks for something outside ERP scope, redirect them to ERP-related questions.
7. For financial data, always format amounts as ₹ with commas (e.g., ₹1,25,000).
8. Always mention the data time range or filters applied if discussing data.
9. When asked about 'counselled' students, refer to the 'counselled' and 'boardCourseCounselled' counts from Leads data.
10. When asked about 'enrolled students' or 'board course enrolled', refer to the 'enrolled' and 'boardCourseEnrolled' counts from Students/Admissions data.
11. When asked about admissions, use the total admissions, normal admissions, and board admissions data.

═══════════════════════════════════════════════
SIDEBAR / NAVIGATION MENU — EXACT MENU ITEMS
═══════════════════════════════════════════════
The left sidebar has a section called "Admissions" (click to expand). Sub-items under it:
- "Counselled Students" → URL: /admissions (Normal admissions pipeline)
- "Admissions" → URL: /enrolled-students (Enrolled / formally admitted students)
- "Board Course Admission" → URL: /board-admissions (Board admissions pipeline)
- "Batch Allocation" → URL: /batch-allocation
- "Section Allotment" → URL: /section-allotment

═══════════════════════════════════════════════
MODULE 1 — COUNSELLED STUDENTS (Normal Admissions Pipeline)
Page URL: /admissions   Component: AdmissionsContent
Page Title shown on screen: "Counselled Students"
═══════════════════════════════════════════════

PURPOSE: Manages students who have been counselled / registered but not yet formally admitted.

TABS at the top:
- "Counselled Students" tab — shows registered students NOT yet enrolled (this is the default active tab)
- "Admissions" tab — clicking this tab takes you directly to the Enrolled Students page (/enrolled-students)

KPI CARDS (4 cards below tabs):
- Total Registrations, Enrolled, Pending, Courses

HEADER BUTTONS (top-right area of the page):
1. "Night" / "Day" toggle button (moon / sun icon) — switches between dark and light mode
2. "New Registration" button (CYAN/teal color, + icon) — navigates to /student-registration to create a brand-new student profile

FILTER BAR (below KPI cards):
- Search box: placeholder "SEARCH STUDENTS..." — search by name, mobile, email, centre, school, board, or exam tag
- "Centre" multi-select dropdown filter
- "Board" multi-select dropdown filter
- "Exam Tag" multi-select dropdown filter
- "Dept" multi-select dropdown filter
- "Period" date range (two date pickers: start date and end date)
- "Reset" button (circular arrows icon) — clears all filters and refreshes the data
- "Export" button — exports the visible student list to CSV or Excel

TABLE COLUMNS: Reg. Date | Student Name | Programme | Exam Tag | Course | Batch | Centre | Department | Counselled By | Email | Class | Mobile | Actions

TABLE ROW ACTION BUTTONS (in the Actions column, per row):
1. Eye icon button (👁) — opens a "Student Details" popup modal to view the student's full profile
2. "Admit" button (GREEN color, graduation cap icon) — navigates to /admission/{studentId} to open the Student Admission Form and formally admit the student
3. Pencil / Edit icon button — opens an "Edit Student" modal to update the student's details
4. Trash icon button (🗑) — permanently deletes the student record (requires permission)

WORKFLOW — HOW TO DO A NORMAL (ALL-INDIA / FOUNDATION) ADMISSION:
Step 1: In the left sidebar, click "Admissions" to expand the menu, then click "Counselled Students".
Step 2: If the student is not yet in the system, click the cyan "New Registration" button (top right). This opens the Student Registration Form.
Step 3: Fill in all required fields in the Student Registration Form (name, mobile, email, address, board, class, programme, centre, guardian details, etc.) and click the "Register" or "Save" button at the bottom of the form.
Step 4: The student now appears in the Counselled Students table. Use the search box to find them if the list is long.
Step 5: In the student's row, click the GREEN "Admit" button (graduation cap icon). This opens the Student Admission Form at /admission/{studentId}.
Step 6: On the Admission Form: select the course/exam, set the total fee, choose the payment mode (Cash/UPI/Cheque/Online), enter the amount paid, and configure the installment plan if applicable.
Step 7: Click "Confirm Admission" or the "Save" button to complete the admission. The student is now enrolled and moves to the Enrolled Students page.

═══════════════════════════════════════════════
MODULE 2 — BOARD COURSE ADMISSION
Page URL: /board-admissions   Component: BoardAdmissionsContent
Page Title shown on screen: "Board Course Admission"
═══════════════════════════════════════════════

PURPOSE: Full pipeline management for Board Course admissions — from initial counselling through formal board enrollment.

TABS (pill-style tab bar below the header):
- "COUNSELLED" tab — shows students who have been counselled for a board course (not yet enrolled). This is the default.
- "ENROLLED BOARD" tab — shows students formally enrolled in a board course
- "DEACTIVATED" tab — shows deactivated/cancelled board admissions (tab appears in red)

HEADER BUTTONS (top-right area):
1. "Add Counselling" button (with + icon, cyan/indigo color) — opens the Add Board Counselling modal to record that a student has been counselled for a board course
2. Light/dark mode toggle button (sun / moon icon)

STATS SECTION (3 cards below tabs): shows Total Admissions/Counselled count (filtered), Top Performing Classes, and Popular Subscriptions — all react live to active filters.

FILTERS (shown in the filter row, depend on active tab):
- "Boards" multi-select dropdown — filter by board course name (available on all tabs)
- "Subjects" multi-select dropdown — filter by subject (only on Enrolled and Deactivated tabs)
- "Centres" multi-select dropdown — filter by centre (available on all tabs)
- "Classes" multi-select dropdown — filter by class (available on all tabs)
- "Programmes" multi-select dropdown — filter by programme (available on all tabs)
- "Lead By" multi-select dropdown — filter by who generated the lead (only on Enrolled and Deactivated tabs)
- "Counselled By" multi-select dropdown — filter by counsellor name (only on Enrolled and Deactivated tabs)
- "Admitted By" multi-select dropdown — filter by who processed the admission (only on Enrolled and Deactivated tabs)
- "From" date picker and "To" date picker — date range filter
- Reset icon button (circular arrows icon) — resets ALL filters at once
- "Export to Excel" button (GREEN, download icon) — visible ONLY on Enrolled and Deactivated tabs, exports filtered data to Excel

TABLE ROW ACTIONS — on the "COUNSELLED" tab:
1. Eye icon button — opens Student Details modal
2. "Counsel" button (CYAN/teal color) — opens the counselling modal to update/add counselling remarks for this student
3. "Enroll" button (GREEN color, graduation cap icon) — navigates to /board-course-admission/{counsellingId} to open the formal Board Course Enrollment Form

TABLE ROW ACTIONS — on the "ENROLLED BOARD" tab:
1. Eye icon button — opens Student Details modal
2. Pencil / Edit icon button (AMBER/yellow color) — opens the Edit Enrollment modal to update admission details
3. Deactivate button (RED) — deactivates the student's board enrollment

TABLE ROW ACTIONS — on the "DEACTIVATED" tab:
1. Eye icon button — opens Student Details modal
2. Reactivate button (GREEN) — reactivates the student's board enrollment

WORKFLOW — HOW TO DO A BOARD COURSE ADMISSION:
Step 1: In the left sidebar, click "Admissions" to expand, then click "Board Course Admission".
Step 2: You will land on the "COUNSELLED" tab. If the student does not appear here, click the "Add Counselling" button (top right, + icon) to create a new counselling record.
Step 3: In the "Add Counselling" modal that opens, fill in: student name or mobile (or select an existing student), Board, Class, Programme, selected Subjects, Remarks, and Centre. Click the "Add Counselling" or "Save" button in the modal to save.
Step 4: The student now appears in the "COUNSELLED" tab table. Find their row (use the search box if needed).
Step 5: In that student's row, click the GREEN "Enroll" button (graduation cap icon). This navigates to /board-course-admission/{id} — the Board Course Enrollment Form.
Step 6: On the Enrollment Form: review the pre-filled student and board details, select the final subjects, enter fees (Admission Fee, Exam Fee, total expected amount), set payment mode, and enter the down payment amount.
Step 7: Click the "Confirm" or "Save Admission" button to complete the board enrollment. The student now appears on the "ENROLLED BOARD" tab.

HOW TO EDIT A BOARD COURSE COUNSELLING RECORD:
Step 1: Go to "Board Course Admission" in the sidebar.
Step 2: On the "COUNSELLED" tab, find the student's row.
Step 3: Click the AMBER pencil/edit icon button in that row. An Edit Counselling modal opens.
Step 4: Update the required fields and click "Save" or "Update".

HOW TO VIEW ENROLLED BOARD STUDENTS:
Step 1: Go to "Board Course Admission" in the sidebar.
Step 2: Click the "ENROLLED BOARD" tab (the middle tab).
Step 3: All formally enrolled board students are listed. Use the Boards, Subjects, Centres, Classes, Programmes, Lead By, Counselled By, or Admitted By filter dropdowns to narrow down the list.
Step 4: Use the "From" and "To" date pickers to filter by admission date.
Step 5: Click "Export to Excel" (green button) to download the filtered data.

═══════════════════════════════════════════════
MODULE 3 — ENROLLED STUDENTS (Normal Admissions — Enrolled)
Page URL: /enrolled-students   Component: EnrolledStudentsContent
═══════════════════════════════════════════════

PURPOSE: Shows all normally admitted (non-board) students who are formally enrolled.

NAVIGATION to reach this page:
- From the sidebar: click "Admissions" → click "Admissions" (sub-item)
- OR from the Counselled Students page: click the "Admissions" tab in the tab bar at the top

FILTERS available on this page:
- Search box — search by name, enrollment number, mobile, email
- Filters for Centre, Department, Course, Exam Tag, Status
- Date range pickers (From / To)
- "Export to Excel" button — downloads filtered enrolled student data
- "Reset" or refresh button — clears all filters

TABLE ROW ACTION BUTTONS:
1. Eye icon — opens the Student Admission Details modal (shows all fee, installment, and academic details)
2. Pencil/Edit icon — opens the Edit Enrolled Student modal
3. Receipt/Download icon — opens/downloads the payment receipt

═══════════════════════════════════════════════
MODULE 4 — LEAD MANAGEMENT (Upstream of Admissions)
Page URL: /lead-management
═══════════════════════════════════════════════

WORKFLOW — HOW TO CONVERT A LEAD TO A NORMAL ADMISSION:
Step 1: In the sidebar, click "Lead Management".
Step 2: Find the lead in the list. Click the action menu (three-dot icon or action button) on the lead's row.
Step 3: Select "Normal Counseling" from the action menu. This redirects you to the Counselled Students page with the lead's data pre-filled.
Step 4: The Add Counselling or Student Registration flow will start. Follow Module 1 steps from Step 3 onwards.

WORKFLOW — HOW TO CONVERT A LEAD TO A BOARD COURSE ADMISSION:
Step 1: In the sidebar, click "Lead Management".
Step 2: Find the lead. Click the action menu button on the lead's row.
Step 3: Select "Board Counseling" from the action menu. This redirects you to the Board Course Admission page and automatically opens the "Add Counselling" modal with the lead's data pre-filled.
Step 4: Review/complete the counselling form and click "Save" or "Add Counselling".
Step 5: Find the student on the "COUNSELLED" tab and click the green "Enroll" button to complete the board admission.

WORKFLOW — HOW TO ADD A NEW LEAD:
Step 1: In the sidebar, click "Lead Management".
Step 2: Click the "Add Lead" button (top right).
Step 3: Fill in: Contact Information (Name, Email, Phone), Academic Details (School, Target Class, Board, Target Exam), Assignment Details (Target Centre, Lead Priority: HOT/WARM/COLD LEAD), Course, Origin Source, and assign to an Agent (telecaller).
Step 4: Click "Save Lead".

WORKFLOW — HOW TO ADD A FOLLOW-UP TO A LEAD:
Step 1: Find the lead in Lead Management.
Step 2: Click the action menu or the follow-up icon on the lead row.
Step 3: Add remarks/feedback, select the Next Follow-Up Date, and set priority.
Step 4: Click "Save Follow Up".

═══════════════════════════════════════════════
FILTERS & DATA TIPS
═══════════════════════════════════════════════
- All multi-select dropdowns in the ERP allow selecting MULTIPLE values — checkboxes appear inside the dropdown.
- The reset / sync icon button (circular arrows ↺) always clears ALL active filters at once.
- Stats cards on the Board Course Admission page react LIVE to whatever filters are active.
- The "Export to Excel" button always exports ONLY the currently filtered/visible data, not all records.
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
            { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
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
        const isInstructional = [
            "how", "explain", "work", "details", "code", "files",
            "where", "which", "button", "click", "navigate", "go to",
            "add", "create", "register", "admit", "enroll", "counsel",
            "step", "process", "procedure", "guide", "show me", "what to",
            "tell me", "do i", "should i", "where do", "how do"
        ].some(word => message.toLowerCase().includes(word));
        
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
const parseDurationToSeconds = (durationStr) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
};

// ─────────────────────────────────────────────────────────────
// ANALYTICS QUERY — POST /api/ai/analyse
// Deep analysis with custom date range and centre filter
// ─────────────────────────────────────────────────────────────
export const analyseERP = async (req, res) => {
    try {
        let { question, module, startDate, endDate, centre, contextData } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        let dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        // If no explicit dates passed, try to parse date expression from question
        if (Object.keys(dateFilter).length === 0) {
            const parsedFilter = extractDateRange(question);
            if (parsedFilter) {
                dateFilter = parsedFilter;
                if (parsedFilter.$gte) startDate = parsedFilter.$gte.toISOString();
                if (parsedFilter.$lte) endDate = parsedFilter.$lte.toISOString();
            }
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
            const userCentreFilter = await getCentreFilter(req.user, "centre");
            const leadQuery = { ...userCentreFilter };
            if (centre) {
                try {
                    leadQuery.centre = new mongoose.Types.ObjectId(centre);
                } catch (e) {
                    leadQuery.centre = centre;
                }
            }
            if (Object.keys(dateFilter).length > 0) leadQuery.createdAt = dateFilter;

            const followUpMatch = { ...userCentreFilter };
            if (centre) {
                try {
                    followUpMatch.centre = new mongoose.Types.ObjectId(centre);
                } catch (e) {
                    followUpMatch.centre = centre;
                }
            }

            const followUpPipeline = [
                { $match: followUpMatch },
                { $unwind: "$followUps" }
            ];

            if (Object.keys(dateFilter).length > 0) {
                const followUpDateFilter = {};
                if (dateFilter.$gte) followUpDateFilter.$gte = dateFilter.$gte;
                if (dateFilter.$lte) followUpDateFilter.$lte = dateFilter.$lte;
                followUpPipeline.push({ $match: { "followUps.date": followUpDateFilter } });
            }

            // Admission filters
            const admissionMatch = {};
            if (Object.keys(dateFilter).length > 0) {
                admissionMatch.admissionDate = dateFilter;
            }
            if (centre) {
                admissionMatch.centre = { $regex: centre, $options: "i" };
            }

            const [
                basicCounts,
                sourceLeads,
                telecallerLeads,
                followUpsAgg,
                dailyTrend,
                centerLeads,
                classLeads,
                recentFollowUps,
                admissionsBySource,
                admissionsByTelecaller,
                admissionsByCentre,
                admissionsByClass
            ] = await Promise.all([
                // 1. Basic Counts
                LeadManagement.aggregate([
                    { $match: leadQuery },
                    {
                        $group: {
                            _id: null,
                            totalLeads: { $sum: 1 },
                            hotLeads: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                            warmLeads: { $sum: { $cond: [{ $eq: ["$leadType", "WARM LEAD"] }, 1, 0] } },
                            coldLeads: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                            neutralLeads: { $sum: { $cond: [{ $eq: ["$leadType", "NEUTRAL LEAD"] }, 1, 0] } },
                            invalidLeads: { $sum: { $cond: [{ $eq: ["$leadType", "INVALID LEAD"] }, 1, 0] } },
                            counselledLeads: { $sum: { $cond: ["$isCounseled", 1, 0] } },
                            walkInLeads: { $sum: { $cond: ["$isWalkIn", 1, 0] } }
                        }
                    }
                ]),

                // 2. Source Breakdown (leads)
                LeadManagement.aggregate([
                    { $match: leadQuery },
                    {
                        $group: {
                            _id: "$source",
                            leadsAdded: { $sum: 1 },
                            counselled: { $sum: { $cond: ["$isCounseled", 1, 0] } }
                        }
                    }
                ]),

                // 3. Telecaller Assignment Metrics (leads assigned in timeframe)
                LeadManagement.aggregate([
                    { $match: leadQuery },
                    {
                        $group: {
                            _id: "$leadResponsibility",
                            assigned: { $sum: 1 }
                        }
                    }
                ]),

                // 4. Calls Volume & Duration metrics
                LeadManagement.aggregate([
                    ...followUpPipeline,
                    {
                        $group: {
                            _id: "$followUps.updatedBy",
                            totalCalls: { $sum: 1 },
                            callsWithDuration: { $sum: { $cond: [{ $ifNull: ["$followUps.callDuration", false] }, 1, 0] } },
                            durations: { $push: "$followUps.callDuration" }
                        }
                    },
                    { $sort: { totalCalls: -1 } },
                    { $limit: 20 }
                ]),

                // 5. Daily Lead Trend
                LeadManagement.aggregate([
                    {
                        $match: (() => {
                            if (Object.keys(dateFilter).length > 0) return leadQuery;
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return { ...leadQuery, createdAt: { $gte: thirtyDaysAgo } };
                        })()
                    },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            leadsAdded: { $sum: 1 },
                            counselled: { $sum: { $cond: ["$isCounseled", 1, 0] } }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),

                // 6. Centre Breakdown (leads)
                LeadManagement.aggregate([
                    { $match: leadQuery },
                    {
                        $group: {
                            _id: "$centre",
                            total: { $sum: 1 },
                            counselled: { $sum: { $cond: ["$isCounseled", 1, 0] } }
                        }
                    },
                    {
                        $lookup: {
                            from: "centreschemas",
                            localField: "_id",
                            foreignField: "_id",
                            as: "centreInfo"
                        }
                    },
                    { $unwind: { path: "$centreInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            centreName: { $ifNull: ["$centreInfo.centreName", "Unknown Center"] },
                            total: 1,
                            counselled: 1
                        }
                    }
                ]),

                // 7. Class Breakdown (leads)
                LeadManagement.aggregate([
                    { $match: leadQuery },
                    {
                        $group: {
                            _id: "$className",
                            total: { $sum: 1 },
                            counselled: { $sum: { $cond: ["$isCounseled", 1, 0] } }
                        }
                    },
                    {
                        $lookup: {
                            from: "classes",
                            localField: "_id",
                            foreignField: "_id",
                            as: "classInfo"
                        }
                    },
                    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            className: { $ifNull: ["$classInfo.name", "Unknown Class"] },
                            total: 1,
                            counselled: 1
                        }
                    }
                ]),

                // 8. Recent Follow-Up Logs
                LeadManagement.aggregate([
                    ...followUpPipeline,
                    { $sort: { "followUps.date": -1 } },
                    { $limit: 5 },
                    {
                        $project: {
                            leadName: "$name",
                            date: "$followUps.date",
                            feedback: "$followUps.feedback",
                            remarks: "$followUps.remarks",
                            telecaller: "$followUps.updatedBy"
                        }
                    }
                ]),

                // 9. Admissions grouped by Lead Source
                Admission.aggregate([
                    { $match: admissionMatch },
                    {
                        $lookup: {
                            from: "students",
                            localField: "student",
                            foreignField: "_id",
                            as: "studentInfo"
                        }
                    },
                    { $unwind: "$studentInfo" },
                    {
                        $lookup: {
                            from: "leadmanagements",
                            localField: "studentInfo.studentsDetails.mobileNum",
                            foreignField: "phoneNumber",
                            as: "leadInfo"
                        }
                    },
                    { $unwind: { path: "$leadInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: "$leadInfo.source",
                            admissionsCount: { $sum: 1 },
                            totalFees: { $sum: "$totalFees" },
                            totalPaid: { $sum: "$totalPaidAmount" }
                        }
                    }
                ]),

                // 10. Admissions grouped by Lead Responsibility (Telecaller)
                Admission.aggregate([
                    { $match: admissionMatch },
                    {
                        $lookup: {
                            from: "students",
                            localField: "student",
                            foreignField: "_id",
                            as: "studentInfo"
                        }
                    },
                    { $unwind: "$studentInfo" },
                    {
                        $lookup: {
                            from: "leadmanagements",
                            localField: "studentInfo.studentsDetails.mobileNum",
                            foreignField: "phoneNumber",
                            as: "leadInfo"
                        }
                    },
                    { $unwind: { path: "$leadInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: "$leadInfo.leadResponsibility",
                            admissionsCount: { $sum: 1 },
                            totalFees: { $sum: "$totalFees" },
                            totalPaid: { $sum: "$totalPaidAmount" }
                        }
                    }
                ]),

                // 11. Admissions grouped by Centre
                Admission.aggregate([
                    { $match: admissionMatch },
                    {
                        $group: {
                            _id: "$centre",
                            admissionsCount: { $sum: 1 },
                            totalFees: { $sum: "$totalFees" },
                            totalPaid: { $sum: "$totalPaidAmount" }
                        }
                    }
                ]),

                // 12. Admissions grouped by Class
                Admission.aggregate([
                    { $match: admissionMatch },
                    {
                        $group: {
                            _id: "$class",
                            admissionsCount: { $sum: 1 },
                            totalFees: { $sum: "$totalFees" },
                            totalPaid: { $sum: "$totalPaidAmount" }
                        }
                    },
                    {
                        $lookup: {
                            from: "classes",
                            localField: "_id",
                            foreignField: "_id",
                            as: "classInfo"
                        }
                    },
                    { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            className: { $ifNull: ["$classInfo.name", "Unknown Class"] },
                            admissionsCount: 1,
                            totalFees: 1,
                            totalPaid: 1
                        }
                    }
                ])
            ]);

            const processedCallsActivity = followUpsAgg.map(tc => {
                let totalSecs = 0;
                let count = 0;
                tc.durations.forEach(d => {
                    if (d) {
                        totalSecs += parseDurationToSeconds(d);
                        count++;
                    }
                });
                const avgSecs = count > 0 ? totalSecs / count : 0;
                return {
                    telecaller: tc._id || "Unknown",
                    totalCalls: tc.totalCalls,
                    callsWithDuration: tc.callsWithDuration,
                    totalCallDurationSeconds: totalSecs,
                    avgCallDurationSeconds: Math.round(avgSecs)
                };
            });

            // 1. Source Breakdown Merge
            const sourceMap = {};
            const getSource = (name) => {
                const clean = name || "Unknown Source";
                if (!sourceMap[clean]) sourceMap[clean] = { source: clean, leadsAdded: 0, counselled: 0, admissions: 0, totalAdmissionFees: 0, totalFeesCollected: 0 };
                return sourceMap[clean];
            };
            sourceLeads.forEach(item => {
                const entry = getSource(item._id);
                entry.leadsAdded = item.leadsAdded;
                entry.counselled = item.counselled;
            });
            admissionsBySource.forEach(item => {
                const entry = getSource(item._id);
                entry.admissions = item.admissionsCount;
                entry.totalAdmissionFees = Math.round(item.totalFees);
                entry.totalFeesCollected = Math.round(item.totalPaid);
            });
            const finalSourcePerformance = Object.values(sourceMap)
                .sort((a, b) => b.leadsAdded - a.leadsAdded)
                .slice(0, 20);

            // 2. Telecaller Performance Merge
            const telecallerMap = {};
            const getTelecaller = (name) => {
                const clean = name || "Unknown";
                if (!telecallerMap[clean]) {
                    telecallerMap[clean] = {
                        telecaller: clean,
                        leadsAssigned: 0,
                        callsMade: 0,
                        conversions: 0, // lead counselling conversions
                        totalDurationSeconds: 0,
                        avgDurationSeconds: 0,
                        admissions: 0, // formally admitted
                        totalAdmissionFees: 0,
                        totalFeesCollected: 0
                    };
                }
                return telecallerMap[clean];
            };
            telecallerLeads.forEach(item => {
                const entry = getTelecaller(item._id);
                entry.leadsAssigned = item.assigned;
            });
            processedCallsActivity.forEach(item => {
                const entry = getTelecaller(item.telecaller);
                entry.callsMade = item.totalCalls;
                entry.totalDurationSeconds = item.totalCallDurationSeconds;
                entry.avgDurationSeconds = item.avgCallDurationSeconds;
            });
            admissionsByTelecaller.forEach(item => {
                const entry = getTelecaller(item._id);
                entry.admissions = item.admissionsCount;
                entry.totalAdmissionFees = Math.round(item.totalFees);
                entry.totalFeesCollected = Math.round(item.totalPaid);
            });
            // Look up conversions using updatedAt: dateFilter
            const conversionsMap = {};
            // Let's run a separate query to fetch conversion counts by lead responsibility during date filter
            const conversionsData = await LeadManagement.aggregate([
                {
                    $match: {
                        ...userCentreFilter,
                        isCounseled: true,
                        ...(centre && { centre: typeof centre === 'string' && centre.length === 24 ? new mongoose.Types.ObjectId(centre) : centre }),
                        ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter })
                    }
                },
                {
                    $group: {
                        _id: "$leadResponsibility",
                        conversions: { $sum: 1 }
                    }
                }
            ]);
            conversionsData.forEach(item => {
                const entry = getTelecaller(item._id);
                entry.conversions = item.conversions;
            });
            const finalTelecallerPerformance = Object.values(telecallerMap)
                .sort((a, b) => (b.conversions - a.conversions) || (b.callsMade - a.callsMade))
                .slice(0, 20);

            // 3. Centre Breakdown Merge
            const centreMap = {};
            const getCentre = (name) => {
                const clean = name || "Unknown Center";
                if (!centreMap[clean]) centreMap[clean] = { centre: clean, totalLeads: 0, counselled: 0, admissions: 0, totalAdmissionFees: 0, totalFeesCollected: 0 };
                return centreMap[clean];
            };
            centerLeads.forEach(item => {
                const entry = getCentre(item.centreName);
                entry.totalLeads = item.total;
                entry.counselled = item.counselled;
            });
            admissionsByCentre.forEach(item => {
                const entry = getCentre(item._id);
                entry.admissions = item.admissionsCount;
                entry.totalAdmissionFees = Math.round(item.totalFees);
                entry.totalFeesCollected = Math.round(item.totalPaid);
            });
            const finalCentrePerformance = Object.values(centreMap)
                .sort((a, b) => b.totalLeads - a.totalLeads);

            // 4. Class Breakdown Merge
            const classMap = {};
            const getClass = (name) => {
                const clean = name || "Unknown Class";
                if (!classMap[clean]) classMap[clean] = { class: clean, totalLeads: 0, counselled: 0, admissions: 0, totalAdmissionFees: 0, totalFeesCollected: 0 };
                return classMap[clean];
            };
            classLeads.forEach(item => {
                const entry = getClass(item.className);
                entry.totalLeads = item.total;
                entry.counselled = item.counselled;
            });
            admissionsByClass.forEach(item => {
                const entry = getClass(item.className);
                entry.admissions = item.admissionsCount;
                entry.totalAdmissionFees = Math.round(item.totalFees);
                entry.totalFeesCollected = Math.round(item.totalPaid);
            });
            const finalClassPerformance = Object.values(classMap)
                .sort((a, b) => b.totalLeads - a.totalLeads);

            let overallCallsCount = 0;
            let overallDurationSecs = 0;
            let overallDurationCount = 0;
            processedCallsActivity.forEach(tc => {
                overallCallsCount += tc.totalCalls;
                overallDurationSecs += tc.totalCallDurationSeconds;
                overallDurationCount += tc.callsWithDuration;
            });
            const overallAvgDurationSecs = overallDurationCount > 0 ? overallDurationSecs / overallDurationCount : 0;

            data.leads = {
                summary: basicCounts[0] || {
                    totalLeads: 0,
                    hotLeads: 0,
                    warmLeads: 0,
                    coldLeads: 0,
                    neutralLeads: 0,
                    invalidLeads: 0,
                    counselledLeads: 0,
                    walkInLeads: 0
                },
                sourcePerformance: finalSourcePerformance,
                telecallerPerformance: finalTelecallerPerformance,
                callsVolumeSummary: {
                    totalCallsMade: overallCallsCount,
                    totalDurationSeconds: overallDurationSecs,
                    avgDurationSeconds: Math.round(overallAvgDurationSecs)
                },
                dailyTrend: dailyTrend,
                centreBreakdown: finalCentrePerformance,
                classBreakdown: finalClassPerformance,
                recentFollowUpNotes: recentFollowUps
            };
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

${contextData ? `--- CLIENT ON-SCREEN CONTEXT DATA ---
${JSON.stringify(contextData, null, 2)}
--- END OF CLIENT DATA ---` : ''}

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
