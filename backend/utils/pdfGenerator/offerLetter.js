import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { numberToWords } from '../numberToWords.js';
import { getUploadDir } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateOfferLetter = async (employee, data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const fileName = `offer_letter_${employee.employeeId}_${Date.now()}.pdf`;
            const filePath = path.join(getUploadDir(), fileName);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // Assets
            const logoPath = path.join(__dirname, '../../assets/logo.png');

            // Header - Logo and Text Centered
            const pageWidth = 595.28; // A4 width in points
            const logoWidth = 120; // Slightly smaller logo
            const logoX = (pageWidth - logoWidth) / 2;

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, logoX, 40, { width: logoWidth });
            }

            const headerY = 95;
            doc.fillColor('#800000').fontSize(18).font('Helvetica-Bold')
                .text('PATHFINDER EDUCATIONAL CENTRE', 0, headerY, { align: 'center', width: pageWidth });

            doc.fontSize(8.5).font('Helvetica').fillColor('#333')
                .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', 0, headerY + 22, { align: 'center', width: pageWidth });

            doc.moveTo(50, headerY + 38).lineTo(545, headerY + 38).lineWidth(1.5).strokeColor('#800000').stroke();

            // Ref No and Date
            doc.fillColor('black').fontSize(9).font('Helvetica-Bold');
            doc.text(`Ref. No :- ............`, 50, headerY + 48);
            const currentDate = new Date().toLocaleDateString('en-GB');
            doc.text(`Date: ${currentDate}`, 440, headerY + 48);

            // To section
            doc.moveDown(2);
            doc.font('Helvetica-Bold').text('To,', 50, 170);
            doc.text(`Mr./Ms. ${employee.name.toUpperCase()}`, 50, 185);
            doc.font('Helvetica').text(`${employee.address || 'N/A'}`, 50, 200, { width: 250 });
            doc.font('Helvetica-Bold').text(`Cont. : ${employee.phoneNumber || ''}`, 50, 230);

            // Title
            doc.moveDown(3);
            doc.fontSize(12).font('Helvetica-Bold').text('LETTER OF INTENT', { align: 'center', underline: true });

            // Salutation
            doc.moveDown(2);
            doc.fontSize(10).font('Helvetica').text(`Dear ${employee.name.toUpperCase()},`, 50);

            // Body
            doc.moveDown(1);
            doc.text('Congratulations!! We are excited to extend an invitation for you to rejoin our team to work for Pathfinder Educational Group. We are delighted to make you the following job offer.', { align: 'justify' });

            doc.moveDown(1);
            const designationName = employee.designation?.name || 'Employee';
            const departmentName = (employee.department?.name && employee.department.name !== 'N/A') ? employee.department.name : null;
            const centerName = (employee.primaryCentre?.name && employee.primaryCentre.name !== 'N/A') ? employee.primaryCentre.name : null;

            let positionTitle = designationName;
            if (departmentName) positionTitle += ` - ${departmentName}`;
            if (centerName) positionTitle += `, ${centerName}`;

            doc.text(`The position we are offering you is that of `, { continued: true })
                .font('Helvetica-Bold').fontSize(9.5).text(`${positionTitle}.`);
            doc.fontSize(10); // Reset for next lines

            doc.moveDown(1);
            const salary = employee.currentSalary || 0;
            const salaryWords = numberToWords(salary);
            doc.font('Helvetica').text(`Your gross salary would be `, { continued: true })
                .font('Helvetica-Bold').text(`${salary} /- Rupees ${salaryWords} per month `, { continued: true })
                .font('Helvetica').text(`which is mutually discussed with management authority.`);

            doc.moveDown(1);
            const joiningDateValue = data.joiningDate || employee.dateOfJoining;
            const joiningDateObj = new Date(joiningDateValue);
            const day = joiningDateObj.getDate();
            const month = joiningDateObj.toLocaleDateString('en-GB', { month: 'short' });
            const year = joiningDateObj.getFullYear();

            let suffix = 'th';
            if (day % 10 === 1 && day !== 11) suffix = 'st';
            else if (day % 10 === 2 && day !== 12) suffix = 'nd';
            else if (day % 10 === 3 && day !== 13) suffix = 'rd';

            const formattedJoiningDate = `${day}${suffix} ${month}, ${year}`;

            doc.text(`Your Joining date will be on `, { continued: true })
                .font('Helvetica-Bold').text(`${formattedJoiningDate}.`);

            doc.moveDown(1);
            doc.font('Helvetica').text(`During 6 months' probation period, `, { continued: true })
                .font('Helvetica-Bold').text(`30 (Thirty days) `, { continued: true })
                .font('Helvetica').text(`prior notice will be required for non-employment.`);

            if (data.manualContent) {
                doc.moveDown(2);
                doc.font('Helvetica').fontSize(10).text(data.manualContent, { align: 'justify' });
            }

            doc.moveDown(2);
            doc.text('Yours Sincerely,');

            if (data.signatureImage) {
                try {
                    // signatureImage can be a path or a buffer
                    doc.image(data.signatureImage, 50, doc.y, { width: 100 });
                    doc.moveDown(4);
                } catch (sigError) {
                    console.error("Error adding signature to PDF:", sigError);
                    doc.moveDown(4);
                    doc.text('..........................');
                }
            } else {
                doc.moveDown(4);
                doc.text('..........................');
            }

            doc.font('Helvetica-Bold').text('Deputy Manager HR');
            doc.text('Pathfinder Educational Centre');

            // Footer
            doc.moveTo(50, 700).lineTo(545, 700).lineWidth(1).strokeColor('#000').stroke();
            doc.fontSize(7).font('Helvetica').fillColor('#666')
                .text('47, Kalidasa Patitundi Lane, Kalighat, Kolkata-700026. Ph.: 033 2455 1840 / 2454 4817 / 4668', 50, 710, { align: 'center' });
            doc.text('e-mail: pathfinderllp@pathfinder.edu.in website: www.pathfinder.edu.in LLPIN: AAA-8934 - GSTIN: 19AABFP9636KIZM', 50, 720, { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                resolve({ filePath, fileName });
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
};
