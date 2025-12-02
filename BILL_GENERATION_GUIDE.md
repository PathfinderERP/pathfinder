# Bill Generation Feature - Quick Start Guide

## 🎯 Overview

The bill generation feature automatically creates detailed bills for every payment with CGST and SGST calculations.

## 📋 How to Use

### Step 1: Make a Payment

1. Go to **Admissions** section
2. Select a student admission
3. Record a payment for an installment
4. Mark the installment as **PAID**

**What happens automatically:**

- System creates a Payment record
- Calculates CGST (9%) and SGST (9%)
- Stores all bill data (course fee, taxes, total amount)

### Step 2: Generate Bill

1. Go to **Finance** → **Student Fees**
2. Search for the student
3. Click **Details** button
4. In the installment history, find the PAID installment
5. Click **Generate Bill** button

### Step 3: Download or Print

1. Review the bill preview
2. Click **Download PDF** to save the bill
3. Or click **Print** to print directly

## 💰 Tax Calculation

The system automatically calculates:

- **Course Fee**: The paid amount
- **CGST**: 9% of course fee
- **SGST**: 9% of course fee
- **Total Amount**: Course Fee + CGST + SGST

**Example:**

```
Course Fee:    ₹10,000
CGST (9%):     ₹   900
SGST (9%):     ₹   900
─────────────────────
Total Amount:  ₹11,800
```

## 📄 Bill Contents

Each bill includes:

- **Bill ID**: Unique identifier
- **Bill Date**: Payment date
- **Student Details**: Name, admission number, ID, phone, email
- **Course Details**: Course name, department, exam tag, class
- **Payment Details**: Installment number, payment method, transaction ID
- **Fee Breakdown**: Course fee, CGST, SGST, total amount

## 🔑 Key Features

✅ **Automatic Creation**: Bills are auto-generated when payments are made
✅ **Professional PDF**: Download formatted PDF bills
✅ **Print Ready**: Direct print option available
✅ **Unique Bill ID**: Each bill has a unique identifier
✅ **Tax Compliant**: Includes CGST and SGST breakdown
✅ **Complete Details**: All student, course, and payment information

## 🚀 Quick Access

### From Finance Module:

```
Finance → Student Fees → Select Student → Details → Generate Bill
```

### From Admissions:

After recording a payment, the bill can be generated from the Finance module.

## 📱 Mobile Friendly

The bill generator works on all devices:

- Desktop computers
- Tablets
- Mobile phones

## 🔒 Security

- All bill endpoints require authentication
- Only authorized staff can generate bills
- Bills are linked to specific admissions and payments

## ❓ FAQs

**Q: Can I generate a bill multiple times?**
A: Yes, you can regenerate bills for the same payment. The system will use the same bill ID.

**Q: What if I need to change the tax rates?**
A: Currently, tax rates are fixed at 9% each. Contact the development team to make them configurable.

**Q: Can I generate bills for pending payments?**
A: No, bills can only be generated for PAID installments.

**Q: Where are the bills stored?**
A: Bill data is stored in the database. PDFs are generated on-demand when you click download.

## 🛠️ Technical Details

For developers and technical staff, see the detailed implementation document:
`BILL_GENERATION_IMPLEMENTATION.md`

## 📞 Support

For any issues or questions about bill generation, contact the system administrator or development team.

---

**Last Updated**: December 2025
**Version**: 1.0
