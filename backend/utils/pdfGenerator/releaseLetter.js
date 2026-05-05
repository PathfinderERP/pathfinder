// import PDFDocument from 'pdfkit';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { getUploadDir } from './index.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const generateReleaseLetter = async (employee, data) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const doc = new PDFDocument({ margin: 50, size: 'A4' });
//             const fileName = `release_letter_${employee.employeeId}_${Date.now()}.pdf`;
//             const filePath = path.join(getUploadDir(), fileName);
//             const stream = fs.createWriteStream(filePath);

//             doc.pipe(stream);

//             const logoPath = path.join(__dirname, '../../assets/logo.png');
//             // --- Header ---
//             const pageWidth = 595.28;
//             const logoWidth = 120;
//             const logoX = (pageWidth - logoWidth) / 2;

//             if (fs.existsSync(logoPath)) {
//                 doc.image(logoPath, logoX, 40, { width: logoWidth });
//             }

//             const textY = 90;
//             doc.fillColor('#800000').fontSize(16).font('Helvetica-Bold')
//                 .text('PATHFINDER EDUCATIONAL CENTRE', 0, textY, { align: 'center', width: pageWidth });

//             doc.fontSize(9).font('Helvetica').fillColor('#333')
//                 .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', 0, textY + 20, { align: 'center', width: pageWidth });

//             // Line separator
//             const lineY = textY + 45;
//             doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(1).strokeColor('#808080').stroke();

//             // Ref and Date Row
//             const metaY = lineY + 15;
//             doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
//             doc.text('Ref. No :- ............', 50, metaY); // Left aligned
//             doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 430, metaY); // Right aligned

//             // --- To Section ---
//             doc.moveDown(5);
//             doc.font('Helvetica-Bold').fontSize(10).text('To,', 50);
//             doc.text(`Mr./Ms. ${employee.name.toUpperCase()}`, 50);
//             doc.text(`ADD - ${employee.address || 'N/A'}`, { width: 300 });
//             doc.text(`Cont. : ${employee.phoneNumber || ''}`);

//             // --- Subject ---
//             doc.moveDown(4);
//             doc.fontSize(12).font('Helvetica-Bold').text('SUB- Relieving Letter', 0, doc.y, { align: 'center', width: pageWidth, underline: true });

//             // --- Body ---
//             doc.moveDown(3);
//             doc.fontSize(11).font('Helvetica');

//             const startDate = employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB') : 'N/A';
//             const endDate = data.endDate ? new Date(data.endDate).toLocaleDateString('en-GB') : 'N/A';
//             const lastWorkingDay = data.lastWorkingDay ? new Date(data.lastWorkingDay).toLocaleDateString('en-GB') : 'N/A';
//             const jobTitle = employee.designation?.name || 'Employee';

//             doc.text(`This is to formally confirm that `, { continued: true, align: 'center', width: 495 })
//                 .font('Helvetica-Bold').text(`${employee.name} `, { continued: true })
//                 .font('Helvetica').text(`, who was employed with Pathfinder Educational Centre in the capacity of `, { continued: true })
//                 .font('Helvetica-Bold').text(`${jobTitle} `, { continued: true })
//                 .font('Helvetica').text(` from `, { continued: true })
//                 .font('Helvetica-Bold').text(`${startDate} `, { continued: true })
//                 .font('Helvetica').text(` to `, { continued: true })
//                 .font('Helvetica-Bold').text(`${endDate} `, { continued: true })
//                 .font('Helvetica').text(`, has been relieved of their duties with effect from the close of business on `, { continued: true })
//                 .font('Helvetica-Bold').text(`${lastWorkingDay} `, { continued: true })
//                 .font('Helvetica').text(`.`);

//             doc.moveDown(1);
//             doc.text(`We further confirm that `, { continued: true, align: 'center', width: 495 })
//                 .font('Helvetica-Bold').text(`${employee.name} `, { continued: true })
//                 .font('Helvetica').text(` has satisfactorily completed all assigned responsibilities and has duly handed over all official duties, documents, and company assets in accordance with the organization’s policies and procedures. There are no outstanding obligations pending from their end.`, { align: 'center', width: 495 });

//             doc.moveDown(1);
//             doc.text(`The management places on record its appreciation for the contributions made by `, { continued: true, align: 'center', width: 495 })
//                 .font('Helvetica-Bold').text(`${employee.name} `, { continued: true })
//                 .font('Helvetica').text(` during their tenure and acknowledges their professional conduct throughout their association with the organization.`, { align: 'center', width: 495 });

//             doc.moveDown(1);
//             doc.text(`We wish them every success in their future professional endeavors.`, { align: 'center', width: 495 });

//             // --- Signature ---
//             doc.moveDown(4);
//             doc.text('Yours Sincerely,', 50, doc.y, { width: 495 });

//             if (data.signatureImage) {
//                 try {
//                     doc.image(data.signatureImage, 50, doc.y, { width: 100 });
//                     doc.moveDown(4);
//                 } catch (sigError) {
//                     console.error("Error adding signature to PDF:", sigError);
//                     doc.moveDown(4);
//                     doc.text('..........................', 50, doc.y, { width: 495 });
//                 }
//             } else {
//                 doc.moveDown(2);
//                 doc.text('..........................', 50, doc.y, { width: 495 });
//             }
//             doc.font('Helvetica-Bold').text('Deputy Manager HR', 50, doc.y, { width: 495 });
//             doc.text('Pathfinder Educational Centre', 50, doc.y, { width: 495 });

//             // --- Footer ---
//             doc.moveTo(50, 750).lineTo(545, 750).lineWidth(1).strokeColor('#808080').stroke();
//             doc.fontSize(8).font('Helvetica').fillColor('#666')
//                 .text('Corporate Office: 47, Kalidasa Patitundi Lane, Kalighat, Kolkata-700026. Ph.: 033 2455 1840', 0, 760, { align: 'center', width: pageWidth });
//             doc.text('e-mail: pathfinderllp@pathfinder.edu.in | website: www.pathfinder.edu.in', 0, 775, { align: 'center', width: pageWidth });

//             doc.end();
//             stream.on('finish', () => resolve({ filePath, fileName }));
//             stream.on('error', (err) => reject(err));
//         } catch (error) {
//             reject(error);
//         }
//     });
// };

// import PDFDocument from 'pdfkit';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { getUploadDir } from './index.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const generateReleaseLetter = async (employee, data) => {
//     return new Promise((resolve, reject) => {
//         try {
//             const doc = new PDFDocument({ margin: 50, size: 'A4' });
//             const fileName = `release_letter_${employee.employeeId}_${Date.now()}.pdf`;
//             const filePath = path.join(getUploadDir(), fileName);
//             const stream = fs.createWriteStream(filePath);

//             doc.pipe(stream);

//             const pageWidth = doc.page.width;
//             const contentWidth = 450; // center block width
//             const centerX = (pageWidth - contentWidth) / 2;

//             const logoPath = path.join(__dirname, '../../assets/logo.png');

//             // ---------------- HEADER ----------------
//             if (fs.existsSync(logoPath)) {
//                 doc.image(logoPath, pageWidth / 2 - 60, 40, { width: 120 });
//             }

//             doc.moveDown(3);

//             doc.fillColor('#800000')
//                 .fontSize(16)
//                 .font('Helvetica-Bold')
//                 .text('PATHFINDER EDUCATIONAL CENTRE', centerX, doc.y, {
//                     width: contentWidth,
//                     align: 'center'
//                 });

//             doc.moveDown(0.5);

//             doc.fontSize(9)
//                 .font('Helvetica')
//                 .fillColor('#333')
//                 .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', centerX, doc.y, {
//                     width: contentWidth,
//                     align: 'center'
//                 });

//             // Line
//             doc.moveDown(1);
//             doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();

//             // ---------------- META ----------------
//             doc.moveDown(1);

//             doc.fontSize(10).font('Helvetica-Bold');
//             doc.text('Ref. No :- ............', 50);
//             doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 150);

//             // ---------------- TO SECTION ----------------
//             doc.moveDown(2);

//             doc.font('Helvetica-Bold').fontSize(11)
//                 .text('To,', centerX, doc.y, { width: contentWidth, align: 'left' });

//             doc.font('Helvetica-Bold')
//                 .text(`Mr./Ms. ${employee.name.toUpperCase()}`, centerX, doc.y, { width: contentWidth })
//                 .text(`ADD - ${employee.address || 'N/A'}`, centerX, doc.y, { width: contentWidth })
//                 .text(`Cont. : ${employee.phoneNumber || ''}`, centerX, doc.y, { width: contentWidth });

//             // ---------------- SUBJECT ----------------
//             doc.moveDown(2);

//             doc.fontSize(12)
//                 .font('Helvetica-Bold')
//                 .text('SUB- Relieving Letter', centerX, doc.y, {
//                     width: contentWidth,
//                     align: 'center',
//                     underline: true
//                 });

//             // ---------------- BODY ----------------
//             doc.moveDown(2);

//             doc.fontSize(11).font('Helvetica');

//             const startDate = employee.dateOfJoining
//                 ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB')
//                 : 'N/A';

//             const endDate = data.endDate
//                 ? new Date(data.endDate).toLocaleDateString('en-GB')
//                 : 'N/A';

//             const lastWorkingDay = data.lastWorkingDay
//                 ? new Date(data.lastWorkingDay).toLocaleDateString('en-GB')
//                 : 'N/A';

//             const jobTitle = employee.designation?.name || 'Employee';

//             const paragraphOptions = {
//                 width: contentWidth,
//                 align: 'center',
//                 lineGap: 4
//             };

//             doc.text(
//                 `This is to formally confirm that ${employee.name}, who was employed with Pathfinder Educational Centre in the capacity of ${jobTitle} from ${startDate} to ${endDate}, has been relieved of their duties with effect from the close of business on ${lastWorkingDay}.`,
//                 centerX,
//                 doc.y,
//                 paragraphOptions
//             );

//             doc.moveDown(1.5);

//             doc.text(
//                 `We further confirm that ${employee.name} has satisfactorily completed all assigned responsibilities and has duly handed over all official duties, documents, and company assets. There are no outstanding obligations pending from their end.`,
//                 centerX,
//                 doc.y,
//                 paragraphOptions
//             );

//             doc.moveDown(1.5);

//             doc.text(
//                 `The management appreciates the contributions made by ${employee.name} during their tenure and acknowledges their professional conduct.`,
//                 centerX,
//                 doc.y,
//                 paragraphOptions
//             );

//             doc.moveDown(1.5);

//             doc.text(
//                 `We wish them every success in their future professional endeavors.`,
//                 centerX,
//                 doc.y,
//                 paragraphOptions
//             );

//             // ---------------- SIGNATURE ----------------
//             doc.moveDown(3);

//             doc.font('Helvetica').text('Yours Sincerely,', centerX, doc.y, {
//                 width: contentWidth,
//                 align: 'left'
//             });

//             doc.moveDown(1);

//             if (data.signatureImage) {
//                 try {
//                     doc.image(data.signatureImage, centerX, doc.y, { width: 100 });
//                     doc.y += 50; // Advance cursor to avoid overlap
//                 } catch (err) {
//                     doc.text('..........................', centerX, doc.y);
//                     doc.moveDown(1);
//                 }
//             } else {
//                 doc.text('..........................', centerX, doc.y);
//                 doc.moveDown(1);
//             }

//             doc.moveDown(1);
//             doc.font('Helvetica-Bold')
//                 .text('Sanchita Dutta', centerX, doc.y, { width: contentWidth, align: 'left' });

//             doc.font('Helvetica-Bold')
//                 .text('Head HR', centerX, doc.y, { width: contentWidth, align: 'left' });

//             doc.font('Helvetica-Bold')
//                 .text('Pathfinder Educational Centre', centerX, doc.y, {
//                     width: contentWidth,
//                     align: 'left'
//                 });

//             // ---------------- FOOTER ----------------
//             doc.moveTo(50, 750).lineTo(pageWidth - 50, 750).stroke();

//             doc.fontSize(8)
//                 .fillColor('#666')
//                 .text(
//                     'Corporate Office: 47, Kalidasa Patitundi Lane, Kalighat, Kolkata-700026. Ph.: 033 2455 1840',
//                     centerX,
//                     760,
//                     { width: contentWidth, align: 'center' }
//                 );

//             doc.text(
//                 'e-mail: pathfinderllp@pathfinder.edu.in | website: www.pathfinder.edu.in',
//                 centerX,
//                 775,
//                 { width: contentWidth, align: 'center' }
//             );

//             doc.end();

//             stream.on('finish', () => resolve({ filePath, fileName }));
//             stream.on('error', (err) => reject(err));

//         } catch (error) {
//             reject(error);
//         }
//     });
// };


import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUploadDir } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateReleaseLetter = async (employee, data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });

            const fileName = `release_letter_${employee.employeeId}_${Date.now()}.pdf`;
            const filePath = path.join(getUploadDir(), fileName);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            const pageWidth = doc.page.width;
            const contentWidth = 450;
            const centerX = (pageWidth - contentWidth) / 2;

            const logoPath = path.join(__dirname, '../../assets/logo.png');

            // ---------------- HEADER ----------------
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, pageWidth / 2 - 60, 40, { width: 120 });
            }

            doc.moveDown(3);

            doc.fillColor('#800000')
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('PATHFINDER EDUCATIONAL CENTRE', centerX, doc.y, {
                    width: contentWidth,
                    align: 'center'
                });

            doc.moveDown(0.5);

            doc.fontSize(9)
                .font('Helvetica')
                .fillColor('#333')
                .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', centerX, doc.y, {
                    width: contentWidth,
                    align: 'center'
                });

            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();

            // ---------------- META ----------------
            doc.moveDown(1);

            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Ref. No :- ............', 50);
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 150);

            // ---------------- TO SECTION ----------------
            doc.moveDown(2);

            doc.font('Helvetica-Bold').fontSize(11)
                .text('To,', centerX, doc.y, { width: contentWidth });

            const salutation = employee.gender === 'Male' ? 'Mr. ' : (employee.gender === 'Female' ? 'Ms. ' : 'Mr./Ms. ');
            doc.font('Helvetica')
                .text(salutation, centerX, doc.y, { width: contentWidth, continued: true })
                .font('Helvetica-Bold').text(employee.name.toUpperCase());

            doc.font('Helvetica')
                .text('ADD - ', centerX, doc.y, { width: contentWidth, continued: true })
                .font('Helvetica-Bold').text(employee.address || 'N/A');

            doc.font('Helvetica')
                .text('Cont. : ', centerX, doc.y, { width: contentWidth, continued: true })
                .font('Helvetica-Bold').text(employee.phoneNumber || '');

            // ---------------- SUBJECT ----------------
            doc.moveDown(2);

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('SUB- Relieving Letter', centerX, doc.y, {
                    width: contentWidth,
                    align: 'center',
                    underline: true
                });

            // ---------------- BODY (FIXED) ----------------
            doc.moveDown(2);

            const startDate = employee.dateOfJoining
                ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB')
                : 'N/A';

            const endDate = data.endDate
                ? new Date(data.endDate).toLocaleDateString('en-GB')
                : 'N/A';

            const lastWorkingDay = data.lastWorkingDay
                ? new Date(data.lastWorkingDay).toLocaleDateString('en-GB')
                : 'N/A';

            const jobTitle = employee.designation?.name || 'Employee';

            const options = {
                width: contentWidth,
                align: 'left',
                lineGap: 4
            };

            // Paragraph 1
            doc.font('Helvetica')
                .text('This is to formally confirm that ', centerX, doc.y, { ...options, continued: true })
                .font('Helvetica-Bold').text(employee.name, { continued: true })
                .font('Helvetica').text(', who was employed with Pathfinder Educational Centre in the capacity of ', { continued: true })
                .font('Helvetica-Bold').text(jobTitle, { continued: true })
                .font('Helvetica').text(' from ', { continued: true })
                .font('Helvetica-Bold').text(startDate, { continued: true })
                .font('Helvetica').text(' to ', { continued: true })
                .font('Helvetica-Bold').text(endDate, { continued: true })
                .font('Helvetica').text(', has been relieved of their duties with effect from the close of business on ', { continued: true })
                .font('Helvetica-Bold').text(lastWorkingDay + '.', options);

            // Paragraph 2
            doc.moveDown(1.5);

            doc.font('Helvetica')
                .text('We further confirm that ', centerX, doc.y, { ...options, continued: true })
                .font('Helvetica-Bold').text(employee.name, { continued: true })
                .font('Helvetica').text(' has satisfactorily completed all assigned responsibilities and has duly handed over all official duties, documents, and company assets. There are no outstanding obligations pending from their end.', options);

            // Paragraph 3
            doc.moveDown(1.5);

            doc.font('Helvetica')
                .text('The management appreciates the contributions made by ', centerX, doc.y, { ...options, continued: true })
                .font('Helvetica-Bold').text(employee.name, { continued: true })
                .font('Helvetica').text(' during their tenure and acknowledges their professional conduct.', options);

            // Paragraph 4
            doc.moveDown(1.5);

            doc.text(
                'We wish them every success in their future professional endeavors.',
                centerX,
                doc.y,
                options
            );

            // ---------------- SIGNATURE + STAMP ----------------
            doc.moveDown(3);

            doc.text('Yours Sincerely,', centerX, doc.y, {
                width: contentWidth,
                align: 'left'
            });

            doc.moveDown(1);

            const sigStampY = doc.y;

            // Signature (left side)
            if (data.signatureImage) {
                try {
                    doc.image(data.signatureImage, centerX, sigStampY, { width: 100, height: 50, fit: [100, 50] });
                } catch {
                    doc.text('..........................', centerX, sigStampY);
                }
            } else {
                doc.text('..........................', centerX, sigStampY);
            }

            // Stamp (right side, aligned with signature)
            if (data.stampImage) {
                try {
                    doc.image(data.stampImage, centerX + contentWidth - 100, sigStampY, { width: 90, height: 50, fit: [90, 50] });
                } catch (stampErr) {
                    console.error('Error adding stamp to releaseLetter PDF:', stampErr);
                }
            }

            doc.y = sigStampY + 55;

            doc.font('Helvetica-Bold')
                .text('Sanchita Dutta', centerX, doc.y, { width: contentWidth });

            doc.text('Head HR', centerX, doc.y, { width: contentWidth });

            doc.text('Pathfinder Educational Centre', centerX, doc.y, {
                width: contentWidth
            });

            // ---------------- FOOTER ----------------
            doc.moveTo(50, 750).lineTo(pageWidth - 50, 750).stroke();

            doc.fontSize(8)
                .fillColor('#666')
                .text(
                    'Corporate Office: 47, Kalidasa Patitundi Lane, Kalighat, Kolkata-700026. Ph.: 033 2455 1840',
                    centerX,
                    760,
                    { width: contentWidth, align: 'center' }
                );

            doc.text(
                'e-mail: pathfinderllp@pathfinder.edu.in | website: www.pathfinder.edu.in',
                centerX,
                775,
                { width: contentWidth, align: 'center' }
            );

            doc.end();

            stream.on('finish', () => resolve({ filePath, fileName }));
            stream.on('error', reject);

        } catch (error) {
            reject(error);
        }
    });
};