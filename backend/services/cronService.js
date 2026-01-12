import cron from "node-cron";
import { sendOverdueReminders, checkOverduePayments } from "./paymentReminderService.js";
import { performAutoCheckout } from "./attendanceAutoCheckout.js";

// Run every day at 9:00 AM to check overdue payments and send reminders
export const startPaymentReminderCron = () => {
    // Check overdue payments every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('🔔 Running daily payment reminder check...');
        try {
            const result = await sendOverdueReminders();
            console.log(`✅ Payment reminders sent: ${result.remindersSent} out of ${result.totalOverdue}`);
        } catch (error) {
            console.error('❌ Error in payment reminder cron job:', error);
        }
    });

    // Update overdue status every hour
    cron.schedule('0 * * * *', async () => {
        console.log('🔄 Updating overdue payment statuses...');
        try {
            const overduePayments = await checkOverduePayments();
            console.log(`✅ Updated ${overduePayments.length} overdue payments`);
        } catch (error) {
            console.error('❌ Error updating overdue payments:', error);
        }
    });

    // Auto-checkout at 9:00 PM every day
    cron.schedule('0 21 * * *', async () => {
        console.log('🕒 Running daily auto-checkout for attendance...');
        try {
            const count = await performAutoCheckout();
            console.log(`✅ Auto-checkout completed for ${count} records`);
        } catch (error) {
            console.error('❌ Error in auto-checkout cron job:', error);
        }
    });

    console.log('✅ Cron jobs started');
    console.log('   - Daily reminders: 9:00 AM');
    console.log('   - Attendance Auto-Checkout: 9:00 PM');
    console.log('   - Status updates: Every hour');
};
