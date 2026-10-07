import mongoose from "mongoose";
import BillCounter from "../models/Payment/BillCounter.js";

/**
 * Generate a guaranteed unique, sequential Admission Number across Normal Admissions and Board Admissions.
 * Format: PATH{YY}{000000} (e.g. PATH26007727)
 *
 * Uses an atomic MongoDB counter (BillCounter collection) to prevent race conditions when multiple
 * branches/users submit admission forms concurrently.
 *
 * @param {string} [yearPrefix] - Optional 2-digit year (e.g. "26")
 * @returns {Promise<string>} - The generated unique admission number
 */
export const getNextAdmissionNumber = async (yearPrefix = null) => {
    const year = yearPrefix || new Date().getFullYear().toString().slice(-2);
    const prefix = `PATH${year}`;
    const counterKey = `ADMISSION_${prefix}`;

    let Admission;
    let BoardCourseAdmission;
    try {
        Admission = mongoose.model("Admission");
    } catch (e) {
        Admission = null;
    }
    try {
        BoardCourseAdmission = mongoose.model("BoardCourseAdmission");
    } catch (e) {
        BoardCourseAdmission = null;
    }

    // 1. Ensure the counter document exists initialized to at least the current DB maximum
    const existingCounter = await BillCounter.findOne({ prefix: counterKey }).lean();
    if (!existingCounter) {
        const maxDbSeq = await getMaxDbSequence(prefix, Admission, BoardCourseAdmission);
        // Atomically insert counter initialized to maxDbSeq
        await BillCounter.updateOne(
            { prefix: counterKey },
            { $setOnInsert: { seq: maxDbSeq } },
            { upsert: true }
        );
    }

    // 2. Atomically increment the sequence counter
    let counter = await BillCounter.findOneAndUpdate(
        { prefix: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    let currentSeq = counter.seq;

    // 3. Double-check if the sequence is behind existing DB records (e.g. if an admission was imported manually)
    const maxDbSeq = await getMaxDbSequence(prefix, Admission, BoardCourseAdmission);
    if (currentSeq <= maxDbSeq) {
        // Try to atomically advance counter to maxDbSeq + 1
        const bumped = await BillCounter.findOneAndUpdate(
            { prefix: counterKey, seq: { $lte: maxDbSeq } },
            { $set: { seq: maxDbSeq + 1 } },
            { new: true }
        );
        if (bumped) {
            currentSeq = bumped.seq;
        } else {
            // Another parallel process already bumped it, so increment from the new bumped value
            const reInc = await BillCounter.findOneAndUpdate(
                { prefix: counterKey },
                { $inc: { seq: 1 } },
                { new: true }
            );
            currentSeq = reInc.seq;
        }
    }

    // 4. Guaranteed Collision Check: If candidate number already exists in DB, keep advancing
    let candidate = `${prefix}${String(currentSeq).padStart(6, '0')}`;
    let exists = await checkAdmissionNumberExists(candidate, Admission, BoardCourseAdmission);

    while (exists) {
        counter = await BillCounter.findOneAndUpdate(
            { prefix: counterKey },
            { $inc: { seq: 1 } },
            { new: true }
        );
        currentSeq = counter.seq;
        candidate = `${prefix}${String(currentSeq).padStart(6, '0')}`;
        exists = await checkAdmissionNumberExists(candidate, Admission, BoardCourseAdmission);
    }

    return candidate;
};

async function getMaxDbSequence(prefix, Admission, BoardCourseAdmission) {
    const standardRegex = new RegExp(`^${prefix}\\d{6}$`);
    const [lastNormal, lastBoard] = await Promise.all([
        Admission ? Admission.findOne({ admissionNumber: standardRegex }).sort({ admissionNumber: -1 }).lean() : Promise.resolve(null),
        BoardCourseAdmission ? BoardCourseAdmission.findOne({ admissionNumber: standardRegex }).sort({ admissionNumber: -1 }).lean() : Promise.resolve(null)
    ]);

    let seqNormal = 0;
    let seqBoard = 0;
    if (lastNormal && lastNormal.admissionNumber) {
        seqNormal = parseInt(lastNormal.admissionNumber.slice(6), 10) || 0;
    }
    if (lastBoard && lastBoard.admissionNumber) {
        seqBoard = parseInt(lastBoard.admissionNumber.slice(6), 10) || 0;
    }

    return Math.max(seqNormal, seqBoard);
}

async function checkAdmissionNumberExists(candidate, Admission, BoardCourseAdmission) {
    const checks = [];
    if (Admission) {
        checks.push(Admission.exists({ admissionNumber: candidate }));
    }
    if (BoardCourseAdmission) {
        checks.push(BoardCourseAdmission.exists({ admissionNumber: candidate }));
    }
    const results = await Promise.all(checks);
    return results.some(Boolean);
}

export default getNextAdmissionNumber;
