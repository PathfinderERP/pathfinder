import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUploadDir } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateVirtualId = async (employee, data) => {
    try {
        const doc = new PDFDocument({ size: [153, 243], margin: 0 });
        const fileName = `virtual_id_${employee.employeeId}_${Date.now()}.pdf`;
        const filePath = path.join(getUploadDir(), fileName);
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // White Background
        doc.rect(0, 0, 153, 243).fill('#ffffff');

        const logoPath = path.join(__dirname, '../../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 26, 15, { width: 100 });
        }

        // Profile Picture Position
        const centerX = 153 / 2;
        const centerY = 85;
        const radius = 35;

        // Fetch and draw profile image
        if (employee.profileImage) {
            try {
                const response = await fetch(employee.profileImage);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const imageBuffer = Buffer.from(arrayBuffer);

                    doc.save();
                    doc.circle(centerX, centerY, radius).clip();
                    doc.image(imageBuffer, centerX - radius, centerY - radius, {
                        cover: [radius * 2, radius * 2],
                        align: 'center',
                        valign: 'center'
                    });
                    doc.restore();
                    // Add border
                    doc.circle(centerX, centerY, radius).lineWidth(0.5).stroke('#4a90e2');
                } else {
                    throw new Error('Failed to fetch image');
                }
            } catch (error) {
                console.error("Error embedding profile image:", error);
                // Fallback to placeholder
                doc.circle(centerX, centerY, radius).lineWidth(0.5).stroke('#4a90e2');
                doc.fontSize(6).fillColor('#999').text('Profile Picture', centerX - 20, centerY - 3, { width: 40, align: 'center' });
            }
        } else {
            // Placeholder if no image
            doc.circle(centerX, centerY, radius).lineWidth(0.5).stroke('#4a90e2');
            doc.fontSize(6).fillColor('#999').text('Profile Picture', centerX - 20, centerY - 3, { width: 40, align: 'center' });
        }

        // Employee Name
        doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
        doc.text(employee.name.toUpperCase(), 0, 140, { align: 'center', width: 153 });

        // Designation
        doc.fontSize(7).font('Helvetica').fillColor('#666');
        doc.text(employee.designation?.name || 'Employee', 0, 153, { align: 'center', width: 153 });

        // Horizontal Line
        doc.moveTo(15, 168).lineTo(138, 168).lineWidth(0.2).stroke('#cccccc');

        // Contact Details
        const infoY = 178;
        doc.fontSize(6).fillColor('#333');

        doc.font('Helvetica-Bold').text(`Email: `, 15, infoY, { continued: true })
            .font('Helvetica').text(employee.email || 'N/A');

        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').text(`Phone: `, 15, doc.y, { continued: true })
            .font('Helvetica').text(employee.phoneNumber || 'N/A');

        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').text(`ID Number: `, 15, doc.y, { continued: true })
            .font('Helvetica').text(employee.employeeId);

        doc.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve({ filePath, fileName }));
            stream.on('error', (err) => reject(err));
        });
    } catch (error) {
        throw error;
    }
};
