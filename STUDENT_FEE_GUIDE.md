# 🎓 Student Fee Management & Messaging

## New Features Added

### 1. Student Fees Tab
A new tab **"Student Fees"** has been added to the Finance Dashboard.
- **Comprehensive List**: Shows all students with their total fee, paid amount, remaining due, and next due date.
- **Search**: Easily search for students by name or admission number.

### 2. Detailed Fee View 📋
Clicking **"Details"** on any student opens a popup with:
- **Fee Structure**: Total Fee, **Fee Waiver/Discount**, **Down Payment**, Total Paid, Remaining Due.
- **Installment History**: A complete list of all installments with their status (PAID, PENDING, OVERDUE), due dates, and paid dates.

### 3. Custom Messaging System 💬
From the Details popup, you can now send SMS messages directly to the student:
- **Templates**: Select pre-built templates for "Upcoming Due Reminder" or "Overdue Warning".
- **Custom Text**: Write your own custom message.
- **Preview**: See exactly what message will be sent.

## How to Use
1.  Go to **Finance & Fees** > **Student Fees** tab.
2.  Find a student and click **Details**.
3.  Review their fee breakdown on the left.
4.  On the right, choose **Template** or **Custom Text**.
5.  Click **Send SMS**.

## Technical Notes
- **API Endpoint**: `GET /api/payment-reminder/student-fees`
- **Message Endpoint**: `POST /api/payment-reminder/send-custom-message`
- **Mock Mode**: If `SMS_GATEWAY` is not configured in `.env`, messages will still be logged to the console but not sent to real phones.

---
**Status**: ✅ Implemented & Ready
