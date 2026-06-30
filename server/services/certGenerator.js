const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const generateClearanceCertificate = async (res, clearanceData) => {
  const { fullName, matricNumber, department, academicSession, clearedAt, verificationToken, hostelName, totalFees, scope } = clearanceData;

  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${verificationToken}`;

  // Generate QR code as base64 image
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 150 });
  const qrImageBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

  // Create PDF in Landscape A4 (595.28 x 841.89 points)
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=clearance_${matricNumber}.pdf`);

  doc.pipe(res);

  // Register Unicode-capable fonts so the ₦ (Naira) symbol and rich text renders correctly
  const recieptDir = path.join(__dirname, '..', 'reciept');
  doc.registerFont('DejaVu',             path.join(recieptDir, 'DejaVuSans.ttf'));
  doc.registerFont('DejaVu-Bold',        path.join(recieptDir, 'DejaVuSans-Bold.ttf'));

  const W = 842;
  const H = 595;

  // 1. Fill Background
  doc.rect(0, 0, W, H).fill('#FCFBF7');

  // 2. Thick Gold Outer Border (15pt)
  doc.rect(20, 20, W - 40, H - 40).lineWidth(15).stroke('#D4AF37');

  // 3. Thin Inner Frame Line with Opacity
  doc.save();
  doc.rect(34, 34, W - 68, H - 68).lineWidth(1.2).strokeColor('#EAD598').stroke();
  doc.restore();

  // 4. Caleb Logo Watermark (low opacity centered logo) using the caleb-logo.jpg image matching the web view
  const logoPath = path.join(__dirname, 'caleb-logo.png');
  if (fs.existsSync(logoPath)) {
    doc.save();
    doc.opacity(0.04);
    const wmSize = 350;
    doc.image(logoPath, (W - wmSize) / 2, (H - wmSize) / 2, { width: wmSize, height: wmSize });
    doc.restore();
  }

  // 5. Header Section (Logo + University Name)
  const headerY = 55;
  const logoSize = 48;
  const headerStartX = 250; // Centering the logo & text group

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, headerStartX, headerY, { width: logoSize, height: logoSize });
  }

  doc.fillColor('#0F172A');
  doc.font('Helvetica-Bold').fontSize(22).text('CALEB UNIVERSITY', headerStartX + logoSize + 12, headerY + 6, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748B').text('IMOTA, LAGOS STATE, NIGERIA', headerStartX + logoSize + 12, headerY + 28, { lineBreak: false });

  // 6. Certificate Title
  doc.y = headerY + 65;
  doc.fillColor('#D4AF37');
  doc.font('Helvetica-Bold').fontSize(20).text('BURSARY CLEARANCE CERTIFICATE', 60, doc.y, { align: 'center', width: W - 120, tracking: 1 });

  const dividerY = doc.y + 4;
  doc.moveTo(250, dividerY).lineTo(W - 250, dividerY).lineWidth(1.5).strokeColor('#D4AF37').stroke();

  // 7. Statement Text
  doc.y = dividerY + 24;
  doc.fillColor('#64748B');
  doc.font('Helvetica-Bold').fontSize(9).text('THIS IS TO CERTIFY THAT', 60, doc.y, { align: 'center', width: W - 120, tracking: 1.5 });

  // 8. Student Name (styled in bold serif Times-Bold matching the web's font-serif, non-italic, underlined in Gold)
  const formattedName = fullName ? fullName.replace(/,/g, '').replace(/\s+/g, ' ').trim() : '';
  doc.y = doc.y + 12;
  doc.fillColor('#0F172A');
  doc.font('Times-Bold').fontSize(26);
  
  const nameWidth = doc.widthOfString(formattedName);
  const underlineX1 = (W - nameWidth) / 2 - 10;
  const underlineX2 = underlineX1 + nameWidth + 20;
  
  doc.text(formattedName, 60, doc.y, { align: 'center', width: W - 120 });
  
  const underlineY = doc.y + 4;
  doc.moveTo(underlineX1, underlineY).lineTo(underlineX2, underlineY).lineWidth(2).strokeColor('#D4AF37').stroke();

  // 9. Matric Number (regular weight label with bold value centered together)
  doc.font('Helvetica').fontSize(11);
  const labelWidth = doc.widthOfString('Matriculation Number: ');
  doc.font('Helvetica-Bold').fontSize(11);
  const valueWidth = doc.widthOfString(matricNumber);
  const totalWidth = labelWidth + valueWidth;
  const startX = (W - totalWidth) / 2;

  doc.font('Helvetica').fontSize(11).fillColor('#64748B').text('Matriculation Number: ', startX, underlineY + 8, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(matricNumber, startX + labelWidth, underlineY + 8, { lineBreak: false });

  // 10. Statement & Declared Status Body (Unified paragraph to prevent PDFKit alignment overlaps)
  doc.y = underlineY + 28;
  doc.fillColor('#475569');
  doc.font('Helvetica').fontSize(11.2);
  
  const isFirstSemesterOnly = scope === 'first_semester';
  const cleanDept = department ? department.replace('B.Sc. ', '') : 'Computer Science';
  const cleanHostel = hostelName || 'assigned hall';
  const paragraphWidth = W - 160;
  const paragraphOptions = { align: 'center', width: paragraphWidth, lineGap: 5 };

  const combinedText = isFirstSemesterOnly
    ? `Has successfully fulfilled first semester financial obligations (50% payment threshold) for the ${academicSession} Academic Session, including tuition fees, levies, and accommodation fees in respect of the Department of ${cleanDept}. Accordingly, the student is hereby declared CLEARED (First Semester Only) from the University Bursary. This clearance allows access ONLY for first semester exams and activities. To continue in the second semester, the remaining 50% balance must be fully paid. The student is cleared for accommodation and is assigned to stay in ${cleanHostel}.`
    : `Has successfully fulfilled all financial obligations for the ${academicSession} Academic Session, including tuition fees, levies, and accommodation fees in respect of the Department of ${cleanDept}. Accordingly, the student is hereby declared CLEARED from the University Bursary. The student is cleared for accommodation and is assigned to stay in ${cleanHostel}.`;

  doc.text(combinedText, 80, doc.y, { align: 'center', width: W - 160, lineGap: 5 });

  // 11. Premium Highlight Banner for Status, Hostel Allocation & Total Fees
  const boxY = doc.y + 12;
  const boxHeight = 56;
  const boxWidth = W - 200;
  const boxX = 100;

  doc.save();
  doc.fillColor('#F0FDF4').roundedRect(boxX, boxY, boxWidth, boxHeight, 8).fill();
  doc.strokeColor('#A7F3D0').lineWidth(1).roundedRect(boxX, boxY, boxWidth, boxHeight, 8).stroke();
  doc.restore();

  doc.y = boxY + 12;
  
  // Left Column: Clearance Type
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#065F46')
    .text(isFirstSemesterOnly ? 'STATUS: 50% CLEARANCE (FIRST SEMESTER ONLY)' : 'STATUS: 100% CLEARANCE (FULL ACADEMIC SESSION)', boxX + 20, doc.y, { lineBreak: false });

  // Right Column: Hostel Assignment
  const hostelText = `HOSTEL: ${cleanHostel.toUpperCase()}`;
  const hostelTextWidth = doc.font('Helvetica-Bold').fontSize(9.5).widthOfString(hostelText);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#065F46')
    .text(hostelText, boxX + boxWidth - hostelTextWidth - 20, doc.y, { lineBreak: false });

  // Row 2: Total Fees Paid
  if (totalFees) {
    const row2Y = boxY + 34;
    doc.y = row2Y;
    doc.fillColor('#0F172A');
    doc.font('DejaVu-Bold').fontSize(10.5).text(`Total Bursary Fees Paid: ₦${totalFees.toLocaleString()}`, boxX, doc.y, { align: 'center', width: boxWidth });
  }

  // 12. Signatures and Verification QR Code
  const sigRowY = 415;
  const sigColW = 160;

  // Registrar Signature Column (rendered in Times-BoldItalic to match the web view's font-serif italic style)
  doc.fillColor('#1E293B');
  doc.font('Times-BoldItalic').fontSize(16).text('Adewale A. O.', 100, sigRowY + 15, { width: sigColW, align: 'center' });
  doc.moveTo(100, sigRowY + 33).lineTo(100 + sigColW, sigRowY + 33).lineWidth(0.8).strokeColor('#CBD5E1').stroke();
  doc.fillColor('#94A3B8');
  doc.font('Helvetica-Bold').fontSize(8.5).text('UNIVERSITY REGISTRAR', 100, sigRowY + 38, { width: sigColW, align: 'center' });

  // Bursar Signature Column (rendered in Times-BoldItalic to match the web view's font-serif italic style)
  doc.fillColor('#1E293B');
  doc.font('Times-BoldItalic').fontSize(16).text('Folorunsho I. T.', W - 100 - sigColW, sigRowY + 15, { width: sigColW, align: 'center' });
  doc.moveTo(W - 100 - sigColW, sigRowY + 33).lineTo(W - 100, sigRowY + 33).lineWidth(0.8).strokeColor('#CBD5E1').stroke();
  doc.fillColor('#94A3B8');
  doc.font('Helvetica-Bold').fontSize(8.5).text('UNIVERSITY BURSAR', W - 100 - sigColW, sigRowY + 38, { width: sigColW, align: 'center' });

  // Center QR Code (Lowered Y coordinate to sigRowY + 8 to align perfectly with signatures)
  const qrSize = 60;
  const qrX = (W - qrSize) / 2;
  doc.image(qrImageBuffer, qrX, sigRowY + 8, { width: qrSize, height: qrSize });
  
  // Security Reference token string under QR code
  doc.fillColor('#64748B');
  doc.font('Courier').fontSize(6.5).text(verificationToken, qrX - 58, sigRowY + 63, { width: qrSize + 116, align: 'center' });

  // 13. Footer (Date Issued & Security Code positioned with explicit widths and offsets to prevent overlap)
  const dateIssued = clearedAt
    ? new Date(clearedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  doc.fillColor('#94A3B8');
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text(`DATE ISSUED: ${dateIssued.toUpperCase()}`, 60, 528, { align: 'left', width: 350 });
  doc.text('SECURITY CODE: CU-BC-VERIFY-SECURE', W - 60 - 350, 528, { align: 'right', width: 350 });

  doc.end();
};

module.exports = { generateClearanceCertificate };