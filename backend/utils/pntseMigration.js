import PNTSEStudent from '../models/PNTSEStudent.js';

export const migratePNTSECourses = async () => {
    try {
        const courseMap = {
            'PNTSE CLASS 5': 'PNTSE 5',
            'PNTSE CLASS 6': 'PNTSE 6',
            'PNTSE CLASS 7': 'PNTSE 7',
            'PNTSE CLASS 8': 'PNTSE 8',
            'PNTSE CLASS 9': 'PNTSE 9',
            'PNTSE CLASS 10': 'PNTSE 10'
        };

        let totalUpdated = 0;
        for (const [oldCourse, newCourse] of Object.entries(courseMap)) {
            const res = await PNTSEStudent.updateMany(
                { course: oldCourse },
                { $set: { course: newCourse } }
            );
            if (res.modifiedCount > 0) {
                console.log(`[PNTSE Course Migration] Renamed ${res.modifiedCount} student(s) from "${oldCourse}" to "${newCourse}".`);
                totalUpdated += res.modifiedCount;
            }
        }

        if (totalUpdated > 0) {
            console.log(`[PNTSE Course Migration] Successfully updated ${totalUpdated} total student course record(s).`);
        }
    } catch (err) {
        console.error("[PNTSE Course Migration] Error migrating course names:", err);
    }
};
