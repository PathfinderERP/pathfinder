const mongoose = require('mongoose');

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/pathfinder_erp');
    const Payment = mongoose.model('Payment', new mongoose.Schema({}), 'payments');
    
    // Fill to force memory error? No, just check options
    try {
        const agg = Payment.aggregate([ { $sort: { createdAt: -1 } } ]);
        agg.allowDiskUse(true);
        console.log('Options:', agg.options);
    } catch(e) { console.log('Err1', e.message); }
    
    process.exit();
}
run();
