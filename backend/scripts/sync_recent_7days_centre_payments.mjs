import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Admission from '../models/Admission/Admission.js';
import BoardCourseAdmission from '../models/Admission/BoardCourseAdmission.js';
import Payment from '../models/Payment/Payment.js';
import { updateCentreTargetAchieved } from '../services/centreTargetService.js';
import { clearCachePattern } from '../utils/redisCache.js';

async function syncRecent7Days() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    console.log("Looking for admissions & payments updated/created since:", sevenDaysAgo.toISOString());

    // 1. Fetch admissions updated in the last 7 days
    const [recentNormal, recentBoard] = await Promise.all([
      Admission.find({ updatedAt: { $gte: sevenDaysAgo } }, '_id centre student admissionNumber updatedAt').lean(),
      BoardCourseAdmission.find({ updatedAt: { $gte: sevenDaysAgo } }, '_id centre studentId admissionNumber updatedAt').lean()
    ]);

    const admMap = new Map();
    recentNormal.forEach(a => admMap.set(a._id.toString(), { centre: a.centre, admNo: a.admissionNumber, type: 'NORMAL', updatedAt: a.updatedAt }));
    recentBoard.forEach(b => admMap.set(b._id.toString(), { centre: b.centre, admNo: b.admissionNumber, type: 'BOARD', updatedAt: b.updatedAt }));

    const recentAdmIds = Array.from(admMap.keys()).map(id => new mongoose.Types.ObjectId(id));

    // Also get payments created or updated in the last 7 days
    const recentPayments = await Payment.find({
      $or: [
        { admission: { $in: recentAdmIds } },
        { updatedAt: { $gte: sevenDaysAgo } },
        { createdAt: { $gte: sevenDaysAgo } }
      ]
    }).lean();

    console.log(`Checking ${recentPayments.length} candidate payments related to last 7 days...`);

    // If candidate payment has admission not in recentAdmIds, look up that admission's centre too
    const missingAdmIds = recentPayments
      .map(p => p.admission?.toString())
      .filter(id => id && !admMap.has(id));

    if (missingAdmIds.length > 0) {
      const [extraNormal, extraBoard] = await Promise.all([
        Admission.find({ _id: { $in: missingAdmIds } }, '_id centre admissionNumber updatedAt').lean(),
        BoardCourseAdmission.find({ _id: { $in: missingAdmIds } }, '_id centre admissionNumber updatedAt').lean()
      ]);
      extraNormal.forEach(a => admMap.set(a._id.toString(), { centre: a.centre, admNo: a.admissionNumber, type: 'NORMAL', updatedAt: a.updatedAt }));
      extraBoard.forEach(b => admMap.set(b._id.toString(), { centre: b.centre, admNo: b.admissionNumber, type: 'BOARD', updatedAt: b.updatedAt }));
    }

    const updatesToApply = [];
    for (const p of recentPayments) {
      if (!p.admission) continue;
      const adm = admMap.get(p.admission.toString());
      if (adm && adm.centre) {
        const pCentre = (p.centre || '').trim().toUpperCase();
        const admCentre = (adm.centre || '').trim().toUpperCase();
        if (pCentre !== admCentre) {
          // Only update if either admission was updated in last 7 days OR payment was created/updated in last 7 days
          const admRecent = adm.updatedAt && new Date(adm.updatedAt) >= sevenDaysAgo;
          const payRecent = (p.updatedAt && new Date(p.updatedAt) >= sevenDaysAgo) || (p.createdAt && new Date(p.createdAt) >= sevenDaysAgo);

          if (admRecent || payRecent) {
            updatesToApply.push({
              paymentId: p._id,
              billId: p.billId,
              paidAmount: p.paidAmount,
              paidDate: p.paidDate || p.receivedDate || p.createdAt,
              oldCentre: p.centre,
              newCentre: adm.centre,
              admNo: adm.admNo,
              type: adm.type
            });
          }
        }
      }
    }

    console.log(`Found ${updatesToApply.length} payments to update for the last 7 days:`);
    console.log(JSON.stringify(updatesToApply, null, 2));

    let updatedCount = 0;
    for (const item of updatesToApply) {
      // Update Payment centre while keeping all existing dates, billId, amount intact!
      await Payment.updateOne(
        { _id: item.paymentId },
        { $set: { centre: item.newCentre } }
      );
      updatedCount++;

      // Recalculate centre target achievements for both old centre and new centre
      try {
        if (item.oldCentre) {
          await updateCentreTargetAchieved(item.oldCentre, item.paidDate);
        }
        await updateCentreTargetAchieved(item.newCentre, item.paidDate);
      } catch (err) {
        console.error(`Error updating targets for payment ${item.paymentId}:`, err);
      }
    }

    console.log(`Successfully updated ${updatedCount} payment records to their admission's current centre.`);

    // Clear caches
    await clearCachePattern("admissions:list:*");
    await clearCachePattern("dailyCollection*");
    await clearCachePattern("transactions*");
    await clearCachePattern("sales*");
    await clearCachePattern("centreTarget*");
    console.log("Cleared Redis caches.");

  } catch (error) {
    console.error("Sync failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

syncRecent7Days();
