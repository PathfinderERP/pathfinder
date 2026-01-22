import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config({ path: "backend/.env" });

const MONGO_URL = process.env.MONGO_URL;

const EMPLOYEE_CENTER_SECTIONS = [
    "holidayList", "holidayCalendar", "markAttendance", "leaveManagement",
    "regularization", "profile", "documents", "training", "feedback",
    "posh", "reimbursement", "resign"
];

// Major modules and some key sections for SuperAdmin migration
const ALL_MODULES = {
    sales: ["admissionReport", "centreRank", "centreTarget", "courseReport", "discountReport", "targetAchievementReport", "transactionReport", "boardReport"],
    ceoControlTower: ["dashboard", "analytics", "reports"],
    admissions: ["allLeads", "enrolledStudents", "sectionAllotment", "telecallingConsole"],
    academics: ["courses", "classes", "students", "teachers", "studentTeacherReview", "liveClassReview", "ccTeacherReview", "hodList", "centreManagement", "rmList", "classCoordinator", "mentalSessionTable", "classManagement", "sectionLeaderBoard", "examLeaderBoard", "upcomingClass", "ongoingClass", "previousClass"],
    financeFees: ["feeManagement", "installmentPayment", "feeDueList", "chequeManagement", "cancelCheque", "payments", "paymentReminders", "cashReport", "cashTransfer", "cashReceive", "financialAnalysis", "centerTagging", "budget", "cashCentre", "partTimeTeachers", "financePerson", "vendorManagement", "payEmployee", "paymentAnalysis", "budgetAnalysis"],
    hrManpower: ["employees", "attendance", "holidayManagement", "holidayList", "leaveType", "leaveManagement", "leaveRequest", "regularizeTable", "department", "designation", "center", "centerDetails", "training", "posh", "upload", "feedback", "reimbursement", "resign", "birthday", "overview", "payroll"],
    employeeCenter: EMPLOYEE_CENTER_SECTIONS,
    operations: ["centres", "inventory", "facilities"],
    digitalPortal: ["studentPortal", "teacherPortal", "parentPortal"],
    营销CRM: ["campaigns", "leads", "communications"], // Note: marketingCRM in config, but I'll use common keys
    marketingCRM: ["campaigns", "leads", "communications"],
    franchiseMgmt: ["franchises", "agreements", "royalties"],
    masterData: ["class", "examTag", "department", "designation", "board", "subject", "centre", "subjects", "batch", "source", "session", "script", "category", "subcategory", "expenditureType", "account", "zone", "followUpFeedback"],
    courseManagement: ["courses", "curriculum", "materials"],
    userManagement: ["users", "roles", "permissions"],
    leadManagement: ["leads", "dashboard"],
    pettyCashManagement: ["pettyCashCentre", "addExpenditure", "expenditureApproval", "addPettyCash", "pettyCashRequestApproval"]
};

async function migratePermissions() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        const users = await User.find({});
        console.log(`Found ${users.length} users to migrate`);

        let updatedCount = 0;

        for (const user of users) {
            let changed = false;

            if (!user.granularPermissions) {
                user.granularPermissions = {};
                changed = true;
            }

            // 1. All users get Employee Center
            if (!user.granularPermissions.employeeCenter) {
                user.granularPermissions.employeeCenter = {};
                changed = true;
            }

            for (const section of EMPLOYEE_CENTER_SECTIONS) {
                if (!user.granularPermissions.employeeCenter[section] ||
                    user.granularPermissions.employeeCenter[section].create !== true) {
                    user.granularPermissions.employeeCenter[section] = {
                        create: true,
                        edit: true,
                        delete: true
                    };
                    changed = true;
                }
            }

            // 2. SuperAdmin gets EVERYTHING
            if (user.role === "superAdmin") {
                for (const [modKey, sections] of Object.entries(ALL_MODULES)) {
                    if (!user.granularPermissions[modKey]) {
                        user.granularPermissions[modKey] = {};
                        changed = true;
                    }
                    for (const section of sections) {
                        if (!user.granularPermissions[modKey][section] ||
                            user.granularPermissions[modKey][section].create !== true) {
                            user.granularPermissions[modKey][section] = {
                                create: true,
                                edit: true,
                                delete: true
                            };
                            changed = true;
                        }
                    }
                }
            }

            if (changed) {
                user.markModified('granularPermissions');
                await user.save();
                updatedCount++;
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} users.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migratePermissions();
