import Course from '../models/Master_data/Courses.js';

export const migrateBookCourses = async () => {
    try {
        const res = await Course.updateMany(
            { 
                courseName: { $regex: /vso|key to success/i },
                isBookCourse: { $ne: true }
            },
            { $set: { isBookCourse: true } }
        );
        if (res.modifiedCount > 0) {
            console.log(`[Book Course Migration] Marked ${res.modifiedCount} course(s) as Book Courses.`);
        }
    } catch (err) {
        console.error("[Book Course Migration] Error:", err);
    }
};
