import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import B2BComparison from "../models/MarketingCRM/B2BComparison.js";
import SchoolForTask from "../models/Master_data/SchoolForTask.js";
import Centre from "../models/Master_data/Centre.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val)) return val;
    if (typeof val === "number") {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return isNaN(date.getTime()) ? null : date;
    }
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed || trimmed === "—" || trimmed === "-") return null;
        const parsed = new Date(trimmed);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

const normalizeSchoolName = (str) => {
    return String(str || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const resolveDataFilePath = () => {
    const dataDir = path.resolve(__dirname, "../data");
    if (!fs.existsSync(dataDir)) return null;
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".xlsx") && !f.startsWith("~$"));
    if (files.length === 0) return null;
    const sorted = files.sort((a, b) => {
        const statA = fs.statSync(path.join(dataDir, a)).mtimeMs;
        const statB = fs.statSync(path.join(dataDir, b)).mtimeMs;
        return statB - statA;
    });
    return path.join(dataDir, sorted[0]);
};

export const syncB2BComparisonFromExcel = async (customFilePath) => {
    try {
        const targetPath = customFilePath || resolveDataFilePath();
        if (!targetPath || !fs.existsSync(targetPath)) {
            throw new Error(`Excel file not found at: ${targetPath}`);
        }

        console.log(`Reading B2B Comparison Excel file: ${targetPath}`);
        const wb = xlsx.readFile(targetPath);

        // Pre-load all schools and centres
        const [schools, centres] = await Promise.all([
            SchoolForTask.find().populate("centerName").lean(),
            Centre.find().lean()
        ]);

        const schoolMap = new Map();
        schools.forEach((s) => {
            if (s.schoolName) {
                const key = normalizeSchoolName(s.schoolName);
                if (!schoolMap.has(key)) schoolMap.set(key, []);
                schoolMap.get(key).push(s);
            }
        });

        const centreMap = new Map();
        centres.forEach((c) => {
            if (c.centreName) {
                centreMap.set(c.centreName.trim().toLowerCase(), c);
            }
        });

        const findSchoolRef = (schoolName, centerName) => {
            if (!schoolName) return null;
            const sKey = normalizeSchoolName(schoolName);
            const candidates = schoolMap.get(sKey) || [];
            if (candidates.length === 1) return candidates[0]._id;
            if (candidates.length > 1 && centerName) {
                const cKey = centerName.trim().toLowerCase();
                const matched = candidates.find((cand) => {
                    const candCenterName = cand.centerName?.centreName || cand.centerName;
                    return typeof candCenterName === "string" && candCenterName.trim().toLowerCase() === cKey;
                });
                if (matched) return matched._id;
                return candidates[0]._id;
            }
            return candidates[0]?._id || null;
        };

        const findCenterRef = (centerName) => {
            if (!centerName) return null;
            const cKey = centerName.trim().toLowerCase();
            return centreMap.get(cKey)?._id || null;
        };

        // Build global visit registry across all sheets
        const visitRegistry = new Map();
        const registerVisit = (name, vDate, exec, center) => {
            if (!name) return;
            const parsedDate = parseExcelDate(vDate);
            const execName = String(exec || "").trim();
            if (!parsedDate && !execName) return;

            const nKey = normalizeSchoolName(name);
            const existing = visitRegistry.get(nKey);
            if (!existing || (parsedDate && (!existing.lastVisitDate || parsedDate > existing.lastVisitDate))) {
                visitRegistry.set(nKey, {
                    lastVisitDate: parsedDate,
                    lastExecutive: execName || existing?.lastExecutive || "",
                    center: center || ""
                });
            }
        };

        // Collect from Sheet 5: 5 Pending Visits
        if (wb.Sheets["5 Pending Visits"]) {
            const ws = wb.Sheets["5 Pending Visits"];
            const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
            for (let i = 5; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;
                if (row[2]) registerVisit(row[2], row[1], row[5], row[0]);
                if (row[3]) registerVisit(row[3], row[1], row[5], row[0]);
            }
        }

        // Collect from other sheets
        for (let sName of ["1 Lost Tie-ups", "2 New Tie-ups", "4 P1 Schools"]) {
            if (!wb.Sheets[sName]) continue;
            const ws = wb.Sheets[sName];
            const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
            const headers = rows[4] || [];
            const dCol = headers.findIndex(x => x && (x.includes("Visit") || x.includes("Date")) && !x.includes("Visited") && !x.includes("Approved") && !x.includes("Pending"));
            const eCol = headers.findIndex(x => x && x.includes("Executive"));

            for (let i = 5; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row[1]) continue;
                const dt = dCol !== -1 ? row[dCol] : null;
                const ex = eCol !== -1 ? row[eCol] : null;
                if (dt || ex) {
                    registerVisit(row[1], dt, ex, row[0]);
                }
            }
        }

        console.log(`Global visit registry contains ${visitRegistry.size} schools with visit records.`);

        const recordsToInsert = [];

        // Sheet 1: 1 Lost Tie-ups
        if (wb.Sheets["1 Lost Tie-ups"]) {
            const ws = wb.Sheets["1 Lost Tie-ups"];
            const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
            for (let i = 5; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row[1]) continue;
                const centerName = String(row[0] || "").trim();
                const schoolName = String(row[1] || "").trim();
                const reg = visitRegistry.get(normalizeSchoolName(schoolName)) || {};

                const directDate = parseExcelDate(row[7]);
                const directExec = String(row[8] || "").trim();
                const lastVisitDate = directDate || reg.lastVisitDate || null;
                const lastExecutive = directExec || reg.lastExecutive || "";
                const visitedThisYear = (directDate || reg.lastVisitDate) ? "Yes" : String(row[6] || "No").trim();

                recordsToInsert.push({
                    centerName,
                    schoolName,
                    category: "Lost Tie-ups",
                    sourceSheet: "1 Lost Tie-ups",
                    schoolRef: findSchoolRef(schoolName, centerName),
                    centerRef: findCenterRef(centerName),
                    lastYearTieUp: String(row[2] || "").trim(),
                    studentsAppearedLastYear: Number(row[3]) || 0,
                    currentMockTieUp: String(row[4] || "Not confirmed").trim(),
                    currentStatus: String(row[5] || "").trim(),
                    visitedThisYear,
                    lastVisitDate,
                    lastExecutive,
                    hoHelpNeeded: String(row[9] || "No").trim(),
                    actionStage: String(row[11] || "").trim(),
                    nextAction: String(row[12] || "").trim(),
                    simpleInference: String(row[13] || "").trim()
                });
            }
        }

        // Sheet 2: 2 New Tie-ups
        if (wb.Sheets["2 New Tie-ups"]) {
            const ws = wb.Sheets["2 New Tie-ups"];
            const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
            for (let i = 5; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row[1]) continue;
                const centerName = String(row[0] || "").trim();
                const schoolName = String(row[1] || "").trim();
                const reg = visitRegistry.get(normalizeSchoolName(schoolName)) || {};

                const directDate = parseExcelDate(row[9]);
                const directExec = String(row[10] || "").trim();
                const lastVisitDate = directDate || reg.lastVisitDate || null;
                const lastExecutive = directExec || reg.lastExecutive || "";

                recordsToInsert.push({
                    centerName,
                    schoolName,
                    category: "New Tie-ups",
                    sourceSheet: "2 New Tie-ups",
                    schoolRef: findSchoolRef(schoolName, centerName),
                    centerRef: findCenterRef(centerName),
                    lastYearTieUp: String(row[2] || "").trim(),
                    historicHighTurnout: String(row[3] || "").trim(),
                    currentMockTieUp: String(row[4] || "Confirmed").trim(),
                    currentStatus: String(row[5] || "").trim(),
                    tier: String(row[6] || "A").trim(),
                    schoolAccess: String(row[7] || "YES").trim(),
                    mockTieUpApproach: String(row[8] || "").trim(),
                    lastVisitDate,
                    lastExecutive,
                    potentialDateStatus: String(row[11] || "").trim(),
                    simpleInference: String(row[12] || "").trim()
                });
            }
        }

        // Sheet 3: 3 High Turnout No Visit
        if (wb.Sheets["3 High Turnout No Visit"]) {
            const ws = wb.Sheets["3 High Turnout No Visit"];
            const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
            for (let i = 5; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row[1]) continue;
                const centerName = String(row[0] || "").trim();
                const schoolName = String(row[1] || "").trim();
                const reg = visitRegistry.get(normalizeSchoolName(schoolName)) || {};

                const lastVisitDate = reg.lastVisitDate || null;
                const lastExecutive = reg.lastExecutive || "";
                const visitedThisYear = lastVisitDate ? "Yes" : String(row[8] || "No").trim();

                recordsToInsert.push({
                    centerName,
                    schoolName,
                    category: "High Turnout No Visit",
                    sourceSheet: "3 High Turnout No Visit",
                    schoolRef: findSchoolRef(schoolName, centerName),
                    centerRef: findCenterRef(centerName),
                    studentsAppearedLastYear: Number(row[2]) || 0,
                    lastYearTieUp: String(row[3] || "").trim(),
                    currentMockTieUp: String(row[4] || "Not confirmed").trim(),
                    activeRelationship: String(row[5] || "").trim(),
                    currentStatus: String(row[6] || "").trim(),
                    mockTieUpApproach: String(row[7] || "").trim(),
                    visitedThisYear,
                    lastVisitDate,
                    lastExecutive,
                    currentApproachEvidence: String(row[9] || "").trim(),
                    tier: String(row[10] || "A").trim(),
                    schoolAccess: String(row[11] || "YES").trim(),
                    hoHelpNeeded: String(row[12] || "No").trim(),
                    nextAction: String(row[14] || "").trim()
                });
            }
        }

        // Sheet 4: 4 P1 Schools
        if (wb.Sheets["4 P1 Schools"]) {
            const ws = wb.Sheets["4 P1 Schools"];
            const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
            for (let i = 5; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row[1]) continue;
                const centerName = String(row[0] || "").trim();
                const schoolName = String(row[1] || "").trim();
                const reg = visitRegistry.get(normalizeSchoolName(schoolName)) || {};

                const directDate = parseExcelDate(row[13]);
                const directExec = String(row[14] || "").trim();
                const lastVisitDate = directDate || reg.lastVisitDate || null;
                const lastExecutive = directExec || reg.lastExecutive || "";
                const visitedThisYear = (directDate || reg.lastVisitDate) ? "Yes" : String(row[7] || "No").trim();

                recordsToInsert.push({
                    centerName,
                    schoolName,
                    category: "P1 Schools",
                    sourceSheet: "4 P1 Schools",
                    schoolRef: findSchoolRef(schoolName, centerName),
                    centerRef: findCenterRef(centerName),
                    actionStage: String(row[2] || "").trim(),
                    lastYearTieUp: String(row[3] || row[4] || "").trim(),
                    historicHighTurnout: String(row[5] || "").trim(),
                    currentMockTieUp: String(row[6] || "Not confirmed").trim(),
                    visitedThisYear,
                    tier: String(row[10] || "A").trim(),
                    schoolAccess: String(row[11] || "YES").trim(),
                    hoHelpNeeded: String(row[12] || "No").trim(),
                    lastVisitDate,
                    lastExecutive,
                    currentStatus: String(row[15] || "").trim(),
                    nextAction: String(row[16] || "").trim(),
                    simpleInference: String(row[17] || "").trim()
                });
            }
        }

        // Sheet 5: 5 Pending Visits
        if (wb.Sheets["5 Pending Visits"]) {
            const ws = wb.Sheets["5 Pending Visits"];
            const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
            for (let i = 5; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row[2]) continue;
                const centerName = String(row[0] || "").trim();
                const schoolName = String(row[2] || "").trim();
                const vDate = parseExcelDate(row[1]);
                const exec = String(row[5] || "").trim();

                recordsToInsert.push({
                    centerName,
                    schoolName,
                    category: "Pending Visits",
                    sourceSheet: "5 Pending Visits",
                    schoolRef: findSchoolRef(schoolName, centerName),
                    centerRef: findCenterRef(centerName),
                    visitDate: vDate,
                    lastVisitDate: vDate,
                    originalInstitutionEntered: String(row[3] || "").trim(),
                    matchMethod: String(row[4] || "").trim(),
                    lastExecutive: exec,
                    visitedThisYear: "Yes",
                    visitNotes: String(row[6] || "").trim(),
                    leads: Number(row[7]) || 0,
                    approvalStatus: String(row[8] || "Pending").trim(),
                    approvedBy: String(row[9] || "").trim(),
                    currentMockTieUp: String(row[10] || "Not confirmed").trim(),
                    currentStatus: String(row[11] || "").trim(),
                    nextAction: String(row[13] || "").trim()
                });
            }
        }

        // Clear existing B2BComparison data and re-insert
        await B2BComparison.deleteMany({});
        const inserted = await B2BComparison.insertMany(recordsToInsert);

        console.log(`✅ Synced ${inserted.length} B2B comparison records successfully with normalized visit registry.`);
        return { success: true, count: inserted.length };
    } catch (error) {
        console.error("❌ Error syncing B2B comparison data:", error);
        throw error;
    }
};
