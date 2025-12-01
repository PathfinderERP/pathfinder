# 🚀 Quick Start Guide - Send Real SMS

## Current Status
✅ SMS service code is ready
⚠️ Currently in MOCK mode (messages only logged to console)

---

## 🎯 Option 1: Quick Test with Twilio (5 minutes)

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Click "Sign up for free"
3. Enter your details
4. **Verify your phone number** (important!)
5. You'll get **$15 free credit**

### Step 2: Get Your Credentials
After login, go to Console Dashboard:
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxx` (copy this)
- **Auth Token**: Click "Show" and copy
- **Phone Number**: Get a free number (click "Get a Trial Number")

### Step 3: Update .env File
Open `backend/.env` and add:
```env
SMS_GATEWAY=TWILIO
TWILIO_ACCOUNT_SID=AC your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 4: Install Twilio Package
```bash
cd backend
npm install twilio
```

### Step 5: Restart Server
The server will auto-restart (nodemon) and you'll see:
```
✅ Twilio SMS service initialized
```

### Step 6: Test It!
1. Go to Finance dashboard
2. Click "Send Test Reminders (All)"
3. Check your phone! 📱

---

## 🇮🇳 Option 2: MSG91 (Best for India - Production)

### Step 1: Create Account
1. Go to https://msg91.com/signup
2. Sign up with your details
3. Verify email and phone

### Step 2: Get API Key
1. Login to dashboard
2. Go to "API" section
3. Copy your **Auth Key**

### Step 3: Create Sender ID
1. Go to "Sender ID" section
2. Create new sender ID (e.g., "PATHFN")
3. Wait for approval (1-2 days)

### Step 4: Update .env
```env
SMS_GATEWAY=MSG91
MSG91_AUTH_KEY=your_auth_key_here
MSG91_SENDER_ID=PATHFN
```

### Step 5: Restart and Test
Server will auto-restart, then test from Finance dashboard.

---

## 💰 Option 3: Fast2SMS (Cheapest)

### Step 1: Create Account
1. Go to https://www.fast2sms.com/
2. Sign up
3. Verify phone

### Step 2: Get API Key
1. Go to "Dev API" section
2. Copy your API key

### Step 3: Update .env
```env
SMS_GATEWAY=FAST2SMS
FAST2SMS_API_KEY=your_api_key_here
```

### Step 4: Restart and Test

---

## 🧪 Test SMS Endpoint

You can test SMS without going through the full flow:

### Using Postman/Thunder Client:
```
POST http://localhost:5000/api/payment-reminder/test-sms
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "phoneNumber": "9876543210"
}
```

### Using curl:
```bash
curl -X POST http://localhost:5000/api/payment-reminder/test-sms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210"}'
```

---

## 📱 Phone Number Format

### India Numbers:
- ✅ `9876543210` (will auto-add +91)
- ✅ `+919876543210`
- ❌ `09876543210` (don't use leading 0)
- ❌ `91 9876543210` (no spaces)

---

## 🔍 Troubleshooting

### "Twilio credentials missing"
- Check .env file has correct values
- Restart server after adding credentials
- Make sure no extra spaces in .env

### "Unverified number" (Twilio Trial)
- Twilio trial can only send to verified numbers
- Go to Twilio Console → Phone Numbers → Verified Caller IDs
- Add your phone number

### "SMS not received"
- Check phone number format
- Check console logs for errors
- Verify SMS gateway credentials
- Check SMS gateway dashboard for delivery status

### "Module not found: twilio"
- Run: `npm install twilio` in backend folder
- Restart server

---

## 💡 Recommendations

### For Testing (Right Now):
**Use Twilio**
- ✅ Works immediately
- ✅ Free $15 credit
- ✅ Easy setup
- ⚠️ Trial: Only sends to verified numbers

### For Production (India):
**Use MSG91**
- ✅ Cheaper (₹0.15-0.25 per SMS)
- ✅ Better for bulk SMS
- ✅ India-focused
- ⚠️ Sender ID approval takes 1-2 days

---

## 📊 Cost Comparison

| Gateway | Cost per SMS | Setup Time | Best For |
|---------|-------------|------------|----------|
| Twilio | ₹0.50-1.00 | 5 minutes | Testing |
| MSG91 | ₹0.15-0.25 | 1-2 days | Production |
| Fast2SMS | ₹0.10-0.20 | 10 minutes | Budget |

---

## ✅ Checklist

- [ ] Choose SMS gateway (Twilio recommended for testing)
- [ ] Create account and get credentials
- [ ] Add credentials to `.env` file
- [ ] Install required package (`npm install twilio`)
- [ ] Restart server
- [ ] Check console for "SMS service initialized"
- [ ] Test with test endpoint
- [ ] Test from Finance dashboard
- [ ] Verify SMS received on phone

---

## 🎉 Once Configured

After setup, the system will:
- ✅ Send real SMS to student phones
- ✅ Track delivery status
- ✅ Log all SMS in console
- ✅ Work with automated daily reminders
- ✅ Work with manual reminder buttons

---

**Need Help?**
1. Check console logs for detailed error messages
2. Verify credentials in .env
3. Test with test endpoint first
4. Check SMS gateway dashboard for delivery status

**Ready to start? Choose Twilio and follow the 5-minute setup!** 🚀
