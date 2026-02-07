import mongoose from "mongoose";
import dotenv from "dotenv";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Employee from "./models/HR/Employee.js";
import CentreSchema from "./models/Master_data/Centre.js";
import Department from "./models/Master_data/Department.js";
import Designation from "./models/Master_data/Designation.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const EXCEL_PATH = "c:/Users/USER/erp_1/uploads/CI AND ZM.xlsx";

const ZONE_MAP = {
    "Zone 1": ["BARUIPUR", "DIAMOND HARBOUR", "BEHALA", "JODHPUR PARK"],
    "Zone 2": ["BARASAT", "DUMDUM", "SHYAMBAZAR", "HABRA", "KALYANI"],
    "Zone 3": ["ARAMBAGH", "BALLY", "BALURGHAT", "COOCH BEHAR", "MALDA", "RAIGANJ", "TARAKESHWAR", "CHANDANNAGAR"],
    "Zone 4": ["CONTAI", "KHARAGPUR", "MIDNAPORE", "KTPP", "TAMLUK", "BAGNAN"],
    "Individual Zone": ["BURDWAN", "BERHAMPORE"]
};

// Normalized zone names for matching
const NORMALIZED_ZONES = {
    "ZONE 1": "Zone 1",
    "ZONE 2": "Zone 2",
    "ZONE 3": "Zone 3",
    "ZONE 4": "Zone 4",
    "ZONE4": "Zone 4", // Seen in Excel
    "INDIVIDUAL ZONE": "Individual Zone"
};

const EMPLOYEE_CENTER_SECTIONS = [
    "holidayList", "holidayCalendar", "markAttendance", "leaveManagement",
    "regularization", "profile", "documents", "training", "feedback",
    "posh", "reimbursement", "resign"
];

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
    营销CRM: ["campaigns", "leads", "communications"],
    marketingCRM: ["campaigns", "leads", "communications"],
    franchiseMgmt: ["franchises", "agreements", "royalties"],
    masterData: ["class", "examTag", "department", "designation", "board", "subject", "centre", "subjects", "batch", "source", "session", "script", "category", "subcategory", "expenditureType", "account", "zone", "followUpFeedback"],
    courseManagement: ["courses", "curriculum", "materials"],
    userManagement: ["users", "roles", "permissions"],
    leadManagement: ["leads", "dashboard"],
    pettyCashManagement: ["pettyCashCentre", "addExpenditure", "expenditureApproval", "addPettyCash", "pettyCashRequestApproval"]
};

// Generate full granular permissions
const FULL_PERMISSIONS = {};
for (const [modKey, sections] of Object.entries(ALL_MODULES)) {
    FULL_PERMISSIONS[modKey] = {};
    for (const section of sections) {
        FULL_PERMISSIONS[modKey][section] = { create: true, edit: true, delete: true };
    }
}

async function migrate() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        // 1. Fetch Centres for ID mapping
        const allCentres = await CentreSchema.find({});
        const centreNameMap = new Map();
        allCentres.forEach(c => {
            centreNameMap.set(c.centreName.toUpperCase().trim(), c._id);
            // Handle KTPP Township match
            if (c.centreName.toUpperCase().includes("KTPP")) {
                centreNameMap.set("KTPP", c._id);
            }
            // Handle Berhampore/Berhampur variations
            if (c.centreName.toUpperCase().includes("BERHAMPUR")) {
                centreNameMap.set("BERHAMPORE", c._id);
            }
        });

        // 2. Setup/Fetch Department & Designations
        let salesDept = await Department.findOne({ departmentName: /Sales/i });
        if (!salesDept) {
            salesDept = await Department.create({ departmentName: "Sales", description: "Sales Department" });
        }

        const getOrCreateDesignation = async (name) => {
            let desig = await Designation.findOne({ name: new RegExp(`^${name}$`, 'i') });
            if (!desig) {
                desig = await Designation.create({ name, department: salesDept._id });
            }
            return desig;
        };

        const zmDesig = await getOrCreateDesignation("Zone Manager");
        const ciDesig = await getOrCreateDesignation("Centre In-Charge");

        // 3. Read Excel
        const workbook = XLSX.readFile(EXCEL_PATH);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        console.log(`Processing ${data.length} records...`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const row of data) {
            const name = row.NAME || row.Name;
            const email = (row.MAIL || row.Mail || "").toString().trim().toLowerCase();
            const designationStr = (row.DESIGNATION || "").toLowerCase();
            const zoneStr = (row.ZONE || "").toString().trim().toUpperCase();
            const centresStr = (row.CENTRES || "").toString().trim();
            const phone = (row["CONTACT NO"] || row["Contact No"] || "0000000000").toString();

            if (!email || email === "resign" || !name) {
                console.log(`Skipping invalid record: ${name} (${email})`);
                skippedCount++;
                continue;
            }

            // Check if user already exists
            let user = await User.findOne({ email });
            if (user) {
                console.log(`User already exists: ${email}. Skipping...`);
                skippedCount++;
                continue;
            }

            // Determine Centre IDs
            const centreIds = [];
            const centreNames = [];

            if (designationStr.includes("zm")) {
                // Zone Manager: Get all centres in the zone
                const normalizedZone = NORMALIZED_ZONES[zoneStr] || zoneStr;
                const mappedCentres = ZONE_MAP[normalizedZone] || [];
                mappedCentres.forEach(cName => {
                    const id = centreNameMap.get(cName.toUpperCase());
                    if (id) {
                        centreIds.push(id);
                        centreNames.push(cName);
                    }
                });
            } else {
                // Centre Incharge or other: Use specific centres column
                const specificCentres = centresStr.split(",").map(c => c.trim().toUpperCase());
                specificCentres.forEach(cName => {
                    const id = centreNameMap.get(cName);
                    if (id) {
                        centreIds.push(id);
                        centreNames.push(cName);
                    } else if (cName) {
                        console.warn(`Centre not found: ${cName} for ${name}`);
                    }
                });
            }

            if (centreIds.length === 0) {
                console.warn(`No centres found for ${name} (${email}). Skipping...`);
                skippedCount++;
                continue;
            }

            // Create Employee Record first (to get employeeId)
            const employee = new Employee({
                name,
                email,
                phoneNumber: phone.includes("/") ? phone.split("/")[0] : phone,
                primaryCentre: centreIds[0],
                centres: centreIds,
                centerArray: centreNames,
                department: salesDept._id,
                designation: designationStr.includes("zm") ? zmDesig._id : ciDesig._id,
                status: "Active"
            });

            await employee.validate(); // Triggers auto-generation of employeeId
            const empId = employee.employeeId;

            // Create User Record
            const hashedPassword = await bcrypt.hash(empId, 10);
            user = await User.create({
                name,
                email,
                employeeId: empId,
                mobNum: phone,
                password: hashedPassword,
                role: "admin", // Using admin role for broad module access
                centres: centreIds,
                granularPermissions: FULL_PERMISSIONS
            });

            // Link User to Employee
            employee.user = user._id;
            await employee.save();

            console.log(`Successfully migrated: ${name} (${empId}) - Centres: ${centreNames.join(", ")}`);
            createdCount++;
        }

        console.log(`--- Migration Summary ---`);
        console.log(`Successfully created: ${createdCount}`);
        console.log(`Skipped/Existing: ${skippedCount}`);

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
