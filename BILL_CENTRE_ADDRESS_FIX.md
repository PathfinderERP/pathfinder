# Bill Centre Address Fix - Summary

## Problem
Bills were showing the default "47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026" address for ALL students, instead of showing each student's specific centre address.

## Root Cause
The centre names stored in admissions (e.g., "Kolkata", "Howrah", "Siliguri") did not match the centre names in the database (e.g., "Kolkata Main Campus", "Howrah Maidan", "Siliguri Hill Cart Road").

When the backend couldn't find a matching centre, it fell back to the default hardcoded address.

## Solution Applied

### 1. Updated Admission Centre Names
Ran `updateAdmissionCentres.js` to map old centre names to new ones:
- "Howrah" → "Howrah Maidan" (1 admission)
- "Asansol" → "Asansol GT Road" (2 admissions)
- "Kolkata" → "Kolkata Main Campus" (1 admission)
- "Siliguri" → "Siliguri Hill Cart Road" (1 admission)
- "Durgapur" → "Durgapur City Centre" (1 admission)
- "Siliguri Sevoke Road" → "Siliguri Hill Cart Road" (1 admission)

### 2. Backend Already Configured Correctly
The backend (`generateBill.js`) was already set up to:
- Fetch the centre details from the database based on `admission.centre`
- Return the centre's full address in `billData.centre.address`

### 3. Frontend Already Configured Correctly
The frontend (`BillGenerator.jsx` lines 141-143) was already set up to:
- Display `billData.centre.address` below "PATHFINDER"
- Use text wrapping to handle long addresses

## Result
✅ Each student's bill now shows their specific centre's address below "PATHFINDER"
✅ Different students from different centres will see different addresses
✅ No more hardcoded "Kalidas Patitundi Lane" for all students

## Example
- Student from "Kolkata Main Campus" → Shows: "12B, Park Street, Mullick Bazar, Park Street area, Kolkata, West Bengal 700017"
- Student from "Siliguri Hill Cart Road" → Shows: "Sevoke Road, Ward 10, Janta Nagar, Siliguri, West Bengal 734001"
- Student from "Howrah Maidan" → Shows: "45, GT Road, Howrah Maidan, Howrah, West Bengal 711101"

## Files Modified
1. `backend/controllers/Payment/generateBill.js` - Added corporate office fields to fallback
2. Created `backend/checkCentreMatching.js` - Diagnostic script
3. Created `backend/updateAdmissionCentres.js` - Migration script
4. `backend/seedCentres.js` - Already seeded with 10 West Bengal centres

## Testing
Run `node checkCentreMatching.js` to verify all admission centres match database centres.
Result: ✅ All centres match!
