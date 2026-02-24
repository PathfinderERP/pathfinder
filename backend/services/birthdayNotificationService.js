import Employee from "../models/HR/Employee.js";
import Student from "../models/Students.js";
import emailService from "../utils/emailService.js";

/**
 * Checks for employees and students celebrating birthdays today and sends them a greeting email.
 */
export const checkAndSendBirthdayGreetings = async () => {
    console.log("🎂 Checking for birthdays today...");
    try {
        // Get current date in IST (UTC+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);

        const currentMonth = istTime.getUTCMonth() + 1; // JS months are 0-indexed
        const currentDate = istTime.getUTCDate();

        console.log(`📅 Today (IST): ${istTime.toISOString()} | Month: ${currentMonth}, Day: ${currentDate}`);

        const results = {
            success: 0,
            failed: 0,
            details: []
        };

        // 1. Process Employee Birthdays
        const birthdayEmployees = await Employee.aggregate([
            {
                $match: {
                    status: "Active",
                    dateOfBirth: { $exists: true, $ne: null }
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    month: { $month: { date: "$dateOfBirth", timezone: "Asia/Kolkata" } },
                    day: { $dayOfMonth: { date: "$dateOfBirth", timezone: "Asia/Kolkata" } }
                }
            },
            {
                $match: {
                    month: currentMonth,
                    day: currentDate
                }
            }
        ]);

        console.log(`🎉 Found ${birthdayEmployees.length} employee(s) with birthday today.`);

        for (const emp of birthdayEmployees) {
            console.log(`🎈 Processing employee birthday for: ${emp.name}`);
            if (!emp.email) {
                console.warn(`⚠️ Skipping employee ${emp.name} - No email found.`);
                results.failed++;
                results.details.push({ name: emp.name, type: 'Employee', status: "No Email" });
                continue;
            }

            try {
                await emailService.sendBirthdayWish(emp);
                console.log(`✅ Sent birthday wish to employee: ${emp.name} (${emp.email})`);
                results.success++;
                results.details.push({ name: emp.name, type: 'Employee', status: "Success" });
            } catch (mailError) {
                console.error(`❌ Failed to send email to employee ${emp.name}:`, mailError.message);
                results.failed++;
                results.details.push({ name: emp.name, type: 'Employee', status: "Error", message: mailError.message });
            }
        }

        // 2. Process Student Birthdays
        const mStr = currentMonth.toString().padStart(2, '0');
        const dStr = currentDate.toString().padStart(2, '0');
        const searchStr = `-${mStr}-${dStr}`; // Matches -MM-DD in YYYY-MM-DD string

        const studentsInDb = await Student.find({
            status: "Active",
            'studentsDetails.dateOfBirth': { $regex: searchStr }
        });

        const birthdayStudents = [];
        const seenEmails = new Set();

        studentsInDb.forEach(s => {
            if (s.studentsDetails && Array.isArray(s.studentsDetails)) {
                s.studentsDetails.forEach(sd => {
                    if (sd.dateOfBirth && sd.dateOfBirth.endsWith(searchStr)) {
                        const email = sd.studentEmail ? sd.studentEmail.toLowerCase().trim() : null;
                        if (email && !seenEmails.has(email)) {
                            birthdayStudents.push({
                                name: sd.studentName,
                                email: email
                            });
                            seenEmails.add(email);
                        }
                    }
                });
            }
        });

        console.log(`🎉 Found ${birthdayStudents.length} student(s) with birthday today.`);

        for (const student of birthdayStudents) {
            console.log(`🎈 Processing student birthday for: ${student.name}`);
            try {
                await emailService.sendStudentBirthdayWish(student);
                console.log(`✅ Sent birthday wish to student: ${student.name} (${student.email})`);
                results.success++;
                results.details.push({ name: student.name, type: 'Student', status: "Success" });
            } catch (mailError) {
                console.error(`❌ Failed to send email to student ${student.name}:`, mailError.message);
                results.failed++;
                results.details.push({ name: student.name, type: 'Student', status: "Error", message: mailError.message });
            }
        }

        return results;
    } catch (error) {
        console.error("❌ Error in birthday notification service:", error);
        throw error;
    }
};
