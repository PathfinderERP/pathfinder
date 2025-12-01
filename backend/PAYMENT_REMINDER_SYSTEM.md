# Payment Tracking & Reminder System

## Overview
This system automatically tracks student payments, calculates overdue days, and sends SMS reminders to students with pending payments.

## Features

### 1. **Automatic Overdue Calculation**
- The system automatically calculates how many days a payment is overdue
- Updates payment status from `PENDING` to `OVERDUE` when the due date passes
- Displays real-time overdue days in the Finance dashboard

### 2. **Payment Status Tracking**
- **PENDING**: Payment not yet due or just due
- **OVERDUE**: Payment past the due date
- **PAID**: Payment completed

### 3. **Automated SMS Reminders**
- **Daily Automated Reminders**: Runs every day at 9:00 AM
- **Manual Reminders**: Can be triggered from the Finance dashboard
- **Smart Messaging**: Different messages for:
  - Payments due today
  - Overdue payments (shows number of days overdue)

### 4. **Finance Dashboard Features**
- **Outstanding Dues Tab**: Shows all pending and overdue payments
- **Real-time Statistics**:
  - Total outstanding amount
  - Number of critical overdue payments (7+ days)
  - Payments due today
  - Collection rate
- **Color-coded Status Badges**:
  - 🟡 Yellow: Due today
  - 🟠 Orange: 1-3 days overdue
  - 🔴 Red: 4+ days overdue

## API Endpoints

### Get Overdue Payments
```
GET /api/payment-reminder/overdue
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "admissionId": "...",
      "admissionNumber": "PathStd202500001",
      "studentName": "John Doe",
      "phoneNumber": "9876543210",
      "email": "john@example.com",
      "course": "JEE Main Two Year Program",
      "installmentNumber": 2,
      "dueDate": "2025-11-15",
      "amount": 50000,
      "daysOverdue": 5,
      "status": "OVERDUE"
    }
  ]
}
```

### Send Payment Reminders
```
POST /api/payment-reminder/send-reminders
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Reminders sent successfully",
  "data": {
    "totalOverdue": 15,
    "remindersSent": 15,
    "details": [...]
  }
}
```

### Check Overdue Payments
```
GET /api/payment-reminder/check-overdue
Authorization: Bearer <token>
```

## SMS Message Format

### For Overdue Payments:
```
Dear [Student Name], Your payment of ₹[Amount] was due on [Due Date]. 
You are [Days] day(s) overdue. Please pay immediately to avoid penalties. 
- Pathfinder ERP
```

### For Upcoming Payments:
```
Dear [Student Name], Your payment of ₹[Amount] is due on [Due Date]. 
Please pay on time. - Pathfinder ERP
```

## Cron Jobs

### Daily Reminder Job
- **Schedule**: Every day at 9:00 AM
- **Function**: Checks all overdue payments and sends SMS reminders
- **Prevents Duplicates**: Won't send multiple reminders on the same day

### Hourly Status Update
- **Schedule**: Every hour
- **Function**: Updates payment statuses from PENDING to OVERDUE

## Database Models

### PaymentReminder Model
```javascript
{
  admission: ObjectId,
  student: ObjectId,
  installmentNumber: Number,
  dueDate: Date,
  amount: Number,
  daysOverdue: Number,
  remindersSent: [{
    sentDate: Date,
    method: "SMS" | "EMAIL" | "WHATSAPP",
    status: "SENT" | "FAILED",
    message: String
  }],
  status: "PENDING" | "REMINDED" | "PAID"
}
```

### Admission Model (Payment Breakdown)
```javascript
paymentBreakdown: [{
  installmentNumber: Number,
  dueDate: Date,
  amount: Number,
  status: "PENDING" | "PAID" | "OVERDUE",
  paidDate: Date,
  paidAmount: Number,
  paymentMethod: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE",
  transactionId: String,
  remarks: String
}]
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install node-cron
```

### 2. Configure SMS Gateway (Optional)
Edit `backend/services/smsService.js` to integrate with your SMS provider:
- Twilio
- MSG91
- AWS SNS
- Any other SMS gateway

### 3. Start the Server
```bash
npm run dev
```

The cron jobs will start automatically when the server starts.

## Usage

### From Finance Dashboard:
1. Navigate to **Finance & Fees** section
2. Click on **Outstanding Dues** tab
3. View all overdue payments with:
   - Student details
   - Days overdue
   - Amount due
   - Contact information
4. Click **Send Reminders** to manually trigger SMS reminders

### Automated Process:
- System automatically checks for overdue payments every hour
- Sends SMS reminders every day at 9:00 AM
- No manual intervention required

## Testing

### Test Overdue Calculation:
```bash
# Check overdue payments
curl -X GET http://localhost:5000/api/payment-reminder/check-overdue \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test SMS Reminders:
```bash
# Send reminders manually
curl -X POST http://localhost:5000/api/payment-reminder/send-reminders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Important Notes

1. **SMS Gateway**: The current implementation uses a mock SMS service. Replace it with a real SMS gateway for production.

2. **Timezone**: All dates are stored in UTC. The system uses the server's local timezone for calculations.

3. **Reminder Frequency**: Reminders are sent once per day to avoid spamming students.

4. **Performance**: For large databases, consider adding indexes on:
   - `admission.paymentBreakdown.dueDate`
   - `admission.paymentBreakdown.status`
   - `admission.admissionStatus`

## Future Enhancements

- [ ] WhatsApp integration for reminders
- [ ] Email reminders
- [ ] Customizable reminder schedules
- [ ] Payment link generation in SMS
- [ ] Parent/Guardian notifications
- [ ] Escalation for critical overdue (15+ days)
- [ ] Payment reminder templates
- [ ] Multi-language support

## Support

For issues or questions, contact the development team.
