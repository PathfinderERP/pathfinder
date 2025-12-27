import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUploadDir } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateAppointmentLetter = async (employee, data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const fileName = `appointment_letter_${employee.employeeId}_${Date.now()}.pdf`;
            const filePath = path.join(getUploadDir(), fileName);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            const logoPath = path.join(__dirname, '../../assets/logo.png');
            // Header - Logo and Text Centered
            const pageWidth = 595.28;
            const logoWidth = 120;
            const logoX = (pageWidth - logoWidth) / 2;

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, logoX, 40, { width: logoWidth });
            }

            const textY = 90;
            doc.fillColor('#800000').fontSize(16).font('Helvetica-Bold')
                .text('PATHFINDER EDUCATIONAL CENTRE', 0, textY, { align: 'center', width: pageWidth });

            doc.fontSize(9).font('Helvetica').fillColor('#333')
                .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', 0, textY + 20, { align: 'center', width: pageWidth });

            doc.moveTo(50, textY + 40).lineTo(545, textY + 40).lineWidth(1).strokeColor('#808080').stroke();



            doc.moveDown(1);
            doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
            doc.text(`Ref. No :- ............`, 50, 125);
            const currentDate = new Date().toLocaleDateString('en-GB');
            doc.text(`Date: ${currentDate}`, 430, 125);

            doc.moveDown(2);
            doc.font('Helvetica-Bold').text('To,', 50, 150);
            doc.text(`${employee.name.toUpperCase()}`, 50, 165);
            doc.font('Helvetica').text(`ADD - ${employee.address || 'N/A'}`, 50, 180, { width: 250 });
            doc.text(`Cont. : ${employee.phoneNumber || ''}`, 50, 205);
            doc.text(`Ph. :`, 50, 220);

            doc.moveDown(2);
            const designationName = employee.designation?.name || 'N/A';
            doc.fontSize(11).font('Helvetica-Bold').text(`Sub: Appointment Letter for the Post of ${designationName}`, { align: 'center', underline: true });

            doc.moveDown(1.5);
            doc.fontSize(10).font('Helvetica');
            doc.text(`Dear `, { continued: true }).font('Helvetica-Bold').text(`${employee.name.toUpperCase()}`, { continued: true }).font('Helvetica').text(`,`);

            doc.moveDown(1);
            doc.text(`With reference to your discussion with us, we are pleased to appoint you as ........ on the following terms and conditions: -`, { align: 'justify' });

            doc.moveDown(1);
            const salary = employee.currentSalary || 0;
            const joiningDate = new Date(employee.dateOfJoining).toLocaleDateString('en-CA'); // YYYY-MM-DD

            const terms = [
                `Your appointment as "${designationName}" will take effect from the date: ${joiningDate}`,
                'Your appointment is based on the information furnished by you in your application and your subsequent interview with us.',
                'If any of the information/documents/testimonials furnished/submitted by you found to be false and or incorrect at any point of time, your service would be liable to be terminated without any notice.',
                `Your gross remuneration would be Rs. ${salary} (Rupees Only) per month.`,
                'On acceptance of this offer, you shall have to abide by the terms and conditions and the Rules and Regulations of this organization in force. You shall agree to accept the emoluments and the assignments as offered to you at the discretion of the Appropriate Authority in the organization.',
                'You shall follow the instructions and directions as may be given by CEO and other appropriate authorities and discharge your duties accordingly.',
                'The organization may utilize your service in any of its center by way of transfer /deputation / promotion as and when required.',
                "Your appointment may be terminated by serving Two months' notice or Two month's salary in lieu thereof at the discretion of the organization without assigning any reason whatsoever. However, in Probation, termination can be without notice.",
                'Your service may be discontinued with immediate effect in case of violation of any of the Clauses of the Employment Contract and Rules and Regulations of the Organization.',
                "In case you want to resign from the job, you are required to serve Two months' notice to the organization, failing which the salary for Two month's shall be payable."
            ];

            terms.forEach((term, index) => {
                const currentY = doc.y;
                doc.font('Helvetica-Bold').text(`${index + 1}. `, 50, currentY);
                doc.font('Helvetica').text(term, 65, currentY, { align: 'justify', width: 480 });
                doc.moveDown(0.5);
            });

            doc.moveDown(1);
            doc.text('If the above points are agreed upon, you are requested to sign the duplicate copy of this letter as token of acceptance of the offer and submit along with the enclosed information sheet duly filled-in for our record and necessary action.', { align: 'justify' });

            doc.moveDown(2);
            doc.font('Helvetica-Bold').text('Yours Faithfully,');
            doc.text('For PATHFINDER EDUCATIONAL CENTRE');

            doc.moveDown(3);
            doc.text('Madhuparna Sreemany (CEO)');

            doc.moveDown(2);
            doc.font('Helvetica').text('I accept the offer. I have joined/shall be joining on ............................. which may please be allowed.');

            doc.moveDown(2);
            doc.text('----------------------------------');
            doc.font('Helvetica-Bold').text('Signature');

            doc.moveDown(1);
            doc.text('----------------------------------');
            doc.text(`${employee.name.toUpperCase()}`);

            doc.end();
            stream.on('finish', () => resolve({ filePath, fileName }));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};
