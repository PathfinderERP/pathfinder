import fs from 'fs';
import PDFParser from 'pdf2json';

const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    fs.writeFileSync("./exports_data_extracted.txt", pdfParser.getRawTextContent());
    console.log("Success");
});

pdfParser.loadPDF("c:\\Users\\MALAY\\erp_1\\exports_data\\RazorpayPOS_P2P_SDK_DQR.pdf");
