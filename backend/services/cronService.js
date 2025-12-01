import cron from "node-cron";
import { sendOverdueReminders, checkOverduePayments } from "./paymentReminderService.js";

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

    console.log('✅ Payment reminder cron jobs started');
    console.log('   - Daily reminders: 9:00 AM');
    console.log('   - Status updates: Every hour');
};
