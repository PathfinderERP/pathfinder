import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  const payments = await mongoose.connection.collection('payments').find({ billId: { $ne: null } }).sort({ _id: -1 }).limit(10).toArray();
  console.log('Sample payments:');
  payments.forEach(p => console.log(JSON.stringify({ billId: p.billId, paidDate: p.paidDate, amount: p.amount, baseAmount: p.baseAmount, totalAmount: p.totalAmount, cgst: p.cgst, sgst: p.sgst, paymentMethod: p.paymentMethod })));
  
  const centres = await mongoose.connection.collection('centres').find({}).limit(10).toArray();
  console.log('Sample centres:');
  centres.forEach(c => console.log(JSON.stringify({ centreName: c.centreName, centreCode: c.centreCode, enterCode: c.enterCode })));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
