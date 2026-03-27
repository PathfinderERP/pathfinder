import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

let dataBuffer = fs.readFileSync('c:\\Users\\MALAY\\erp_1\\exports_data\\RazorpayPOS_P2P_SDK_DQR.pdf');

pdf(dataBuffer).then(function(data) {
  fs.writeFileSync('c:\\Users\\MALAY\\erp_1\\exports_data\\RazorpayPOS_P2P_SDK_DQR.txt', data.text);
}).catch(console.error);
