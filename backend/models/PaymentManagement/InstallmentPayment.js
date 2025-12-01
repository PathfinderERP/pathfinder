import mongoose from "mongoose";

const installmentPaymentSchema = new mongoose.Schema({
    installment:{
        type:String,
        required:true,
    },
    amount:{
        type:Number,
        required:true,
    },
    lastDateOfPayment:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        enum:['paid','notPaid'],
    },
    paymentDetails:{
        
    }
})