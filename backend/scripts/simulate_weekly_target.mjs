import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models/Master_data/Centre.js';
import CentreTarget from '../models/Sales/CentreTarget.js';
import Centre from '../models/Master_data/Centre.js';

dotenv.config();

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Replicate buildWeeks
const buildWeeks = (year, monthIndex) => {
    const jsDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const colHdr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const weeks = [];
    let day = 1;
    let weekNum = 1;

    while (day <= daysInMonth) {
        const days = [];
        const firstDow = new Date(year, monthIndex, day).getDay();
        const startCol = firstDow === 0 ? 6 : firstDow - 1;

        for (let i = 0; i < startCol; i++) {
            days.push({
                day: null, dayName: null,
                colName: colHdr[i],
                isWeekend: colHdr[i] === "Sat" || colHdr[i] === "Sun",
                isEmpty: true
            });
        }

        while (day <= daysInMonth && days.length < 7) {
            const date = new Date(year, monthIndex, day);
            const dow = date.getDay();
            const colIdx = days.length;
            days.push({
                day,
                dayName: jsDay[dow],
                colName: colHdr[colIdx],
                isWeekend: dow === 0 || dow === 6,
                isEmpty: false
            });
            day++;
        }

        while (days.length < 7) {
            days.push({
                day: null, dayName: null,
                colName: colHdr[days.length],
                isWeekend: colHdr[days.length] === "Sat" || colHdr[days.length] === "Sun",
                isEmpty: true
            });
        }

        const actualDays = days.filter(d => !d.isEmpty).length;
        const startDay = days.find(d => !d.isEmpty)?.day ?? null;
        const endDay = [...days].reverse().find(d => !d.isEmpty)?.day ?? null;

        weeks.push({ weekNumber: weekNum, startDay, endDay, actualDays, days });
        weekNum++;
    }

    return weeks;
};

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const centre = await Centre.findOne({ centreName: { $regex: /baruipur/i } });
        console.log("Centre:", centre.centreName, centre._id);

        const targetRecord = await CentreTarget.findOne({
            centre: centre._id,
            year: 2026,
            month: "September"
        });

        console.log("TargetRecord:", JSON.stringify(targetRecord, null, 2));

        const weeks = buildWeeks(2026, 8); // September is monthIndex 8
        console.log("\n=== Weeks structure for September 2026 ===");
        weeks.forEach(w => {
            console.log(`Week ${w.weekNumber}: Days ${w.startDay} to ${w.endDay} (Actual days: ${w.actualDays})`);
            console.log("  Days:", w.days.map(d => d.isEmpty ? `[Empty ${d.colName}]` : `${d.day} (${d.colName})`).join(", "));
        });

        // Check Week 1 calculation
        const week1 = weeks[0];
        const daysInMonth = 30;
        const monthlyTargetExclGST = targetRecord ? targetRecord.targetAmount : 0;
        const baseWeeklyTargetExclGST = (week1.actualDays / daysInMonth) * monthlyTargetExclGST;
        const overrideVal = targetRecord?.weeklyTargetsOverride?.[1];

        console.log(`\nMonthly Target Excl GST: ${monthlyTargetExclGST}`);
        console.log(`Week 1 baseWeeklyTargetExclGST: ${baseWeeklyTargetExclGST}`);
        console.log(`Week 1 overrideVal: ${overrideVal}`);

        const weeklyTargetExclGST = overrideVal !== undefined && overrideVal !== null ? overrideVal : baseWeeklyTargetExclGST;
        const weeklyTargetWithGST = weeklyTargetExclGST * 1.18;
        console.log(`Week 1 weeklyTargetExclGST: ${weeklyTargetExclGST}`);
        console.log(`Week 1 weeklyTargetWithGST: ${weeklyTargetWithGST}`);

        // Weekdays in week 1
        const actualWeekdayCount = week1.days.filter(d => !d.isEmpty && !['Sat', 'Sun'].includes(d.colName)).length;
        const hasSat = week1.days.some(d => !d.isEmpty && d.colName === 'Sat');
        const hasSun = week1.days.some(d => !d.isEmpty && d.colName === 'Sun');
        const weekdayShare = actualWeekdayCount > 0 && (hasSat || hasSun) ? 0.5 : 1.0;
        const perWeekdayTargetWithGST = (weekdayShare * weeklyTargetWithGST) / actualWeekdayCount;
        const perWeekdayTargetExclGST = perWeekdayTargetWithGST / 1.18;

        console.log(`Week 1 actualWeekdayCount: ${actualWeekdayCount} (Tue Sep 1 to Fri Sep 4)`);
        console.log(`perWeekdayTarget (With GST): ${perWeekdayTargetWithGST}`);
        console.log(`perWeekdayTarget (Excl GST): ${perWeekdayTargetExclGST}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
