'use strict';

const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

// ── Brand tokens (from design spec) ────────────────────────────────────────
const COLORS = {
  primary:       '#0C9A5B',
  primaryDark:   '#08764A',
  primaryLight:  '#EAF8F1',
  secondary:     '#0F172A',
  border:        '#DCE7E2',
  text:          '#1E293B',
  textSecondary: '#64748B',
  background:    '#FFFFFF',
  cardBg:        '#F8FCFA',
  tableHeaderBg: '#F4FAF6',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function numToWords(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function say(n) {
    if (n === 0)  return '';
    if (n < 20)   return ones[n];
    if (n < 100)  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + say(n % 100) : '');
    if (n < 1e6)  return say(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ', ' + say(n % 1000) : '');
    if (n < 1e9)  return say(Math.floor(n / 1e6)) + ' Million' + (n % 1e6 ? ', ' + say(n % 1e6) : '');
    return String(n);
  }

  const naira = Math.floor(n);
  return say(naira) + ' Naira' + (n % 1 ? ' Only' : ' Only');
}

function fmtMoney(n) {
  return n.toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

/** Draw a labeled field as a single inline row: "Label:   Value". Returns height used. */
function drawFieldInline(doc, label, value, x, y, labelWidth, totalWidth) {
  const valueX = x + labelWidth;
  const valueWidth = totalWidth - labelWidth;
  doc.font('DejaVu').fontSize(9.5).fillColor(COLORS.text)
     .text(label, x, y, { width: labelWidth });
  doc.font('DejaVu').fontSize(9.5).fillColor(COLORS.text)
     .text(value || '-', valueX, y, { width: valueWidth });
  const h = Math.max(
    doc.heightOfString(label, { width: labelWidth, fontSize: 9.5 }),
    doc.heightOfString(value || '-', { width: valueWidth, fontSize: 9.5 })
  );
  return h + 8; // row height + gap
}

/** Small circular icon badge with a simple vector glyph inside. type: 'user' | 'receipt' | 'list' | 'shield' */
function drawIconBadge(doc, type, cx, cy, r) {
  doc.save();
  doc.circle(cx, cy, r).fill(COLORS.primaryLight);
  doc.fillColor(COLORS.primary).strokeColor(COLORS.primary);

  if (type === 'user') {
    // head
    doc.circle(cx, cy - r * 0.28, r * 0.32).fill(COLORS.primary);
    // body (rounded rect arc approximation via pie-ish shape)
    doc.save();
    doc.moveTo(cx - r * 0.45, cy + r * 0.55)
       .bezierCurveTo(cx - r * 0.45, cy + r * 0.05, cx + r * 0.45, cy + r * 0.05, cx + r * 0.45, cy + r * 0.55)
       .fill(COLORS.primary);
    doc.restore();
  } else if (type === 'receipt') {
    const w = r * 0.9, h = r * 1.1;
    doc.lineWidth(1.3);
    doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 1.5).stroke();
    [0.2, 0, -0.2].forEach(off => {
      doc.moveTo(cx - w / 2 + 3, cy + off * h).lineTo(cx + w / 2 - 3, cy + off * h).stroke();
    });
  } else if (type === 'list') {
    const w = r * 0.95;
    doc.lineWidth(1.3);
    [-0.35, 0, 0.35].forEach(off => {
      doc.circle(cx - w / 2, cy + off * r, 1.3).fill(COLORS.primary);
      doc.moveTo(cx - w / 2 + 6, cy + off * r).lineTo(cx + w / 2, cy + off * r).stroke();
    });
  } else if (type === 'shield') {
    const w = r * 0.85, h = r * 1.05;
    doc.lineWidth(1.3);
    doc.moveTo(cx, cy - h / 2)
       .lineTo(cx + w / 2, cy - h / 2 + h * 0.18)
       .lineTo(cx + w / 2, cy + h * 0.12)
       .quadraticCurveTo(cx + w / 2, cy + h / 2, cx, cy + h / 2 + 2)
       .quadraticCurveTo(cx - w / 2, cy + h / 2, cx - w / 2, cy + h * 0.12)
       .lineTo(cx - w / 2, cy - h / 2 + h * 0.18)
       .closePath()
       .stroke();
    // checkmark
    doc.moveTo(cx - w * 0.22, cy).lineTo(cx - w * 0.05, cy + h * 0.16).lineTo(cx + w * 0.25, cy - h * 0.14)
       .lineWidth(1.4).stroke();
  }
  doc.restore();
}

/** Draw a labeled field (label above, value below). Returns the height used. */
function drawField(doc, label, value, x, y, width) {
  doc.font('DejaVu').fontSize(9).fillColor(COLORS.textSecondary)
     .text(label, x, y, { width });
  doc.font('DejaVu-Bold').fontSize(11).fillColor(COLORS.text)
     .text(value || '-', x, y + 13, { width });
  const valueHeight = doc.heightOfString(value || '-', { width, fontSize: 11 });
  return 13 + Math.max(valueHeight, 14) + 8; // label offset + value height + gap
}

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generate a Caleb University payment receipt (card-based design).
 *
 * @param {object} data
 * @param {string} outputPath
 * @param {string} logoPath
 */
function generateReceipt(data, outputPath, logoPath) {
  return new Promise((resolve, reject) => {
    const W = 595.28, H = 841.89; // A4 portrait in points
    const MARGIN = 40;
    const CONTENT_W = W - MARGIN * 2;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: `Payment Receipt - ${data.studentName}`, Author: 'Caleb University Bursary' },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);

    // Register Unicode-capable fonts so the ₦ (Naira) symbol renders correctly
    // (PDFKit's built-in Helvetica does not include this glyph).
    const fontsDir = path.join(__dirname, 'fonts');
    doc.registerFont('DejaVu',             path.join(fontsDir, 'DejaVuSans.ttf'));
    doc.registerFont('DejaVu-Bold',        path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
    doc.registerFont('DejaVu-Oblique',     path.join(fontsDir, 'DejaVuSans-Oblique.ttf'));
    doc.registerFont('DejaVu-BoldOblique', path.join(fontsDir, 'DejaVuSans-BoldOblique.ttf'));

    // ── WATERMARK (centered logo, low opacity) ────────────────────────────
    if (logoPath && fs.existsSync(logoPath)) {
      doc.save();
      doc.opacity(0.05);
      const wmSize = 450;
      doc.image(logoPath, (W - wmSize) / 2, (H - wmSize) / 2, { width: wmSize, height: wmSize });
      doc.restore();
    }

    let y = MARGIN;

    // ── HEADER ───────────────────────────────────────────────────────────────
    const headerHeight = 78;
    const logoSize = 60;

    if (logoPath && fs.existsSync(logoPath)) {
      doc.image(logoPath, MARGIN, y, { width: logoSize, height: logoSize });
    }
    const titleColW = 250;
    doc.font('DejaVu-Bold').fontSize(18).fillColor(COLORS.primaryDark)
       .text('CALEB UNIVERSITY', MARGIN + logoSize + 14, y + 12, { width: titleColW });
    doc.font('DejaVu').fontSize(9).fillColor(COLORS.textSecondary)
       .text('IMOTA, LAGOS, NIGERIA', MARGIN + logoSize + 14, y + 36, { width: titleColW });

    // vertical divider
    const dividerX = MARGIN + logoSize + 14 + titleColW + 10;
    doc.moveTo(dividerX, y).lineTo(dividerX, y + headerHeight - 20)
       .lineWidth(1).strokeColor(COLORS.border).stroke();

    // right side title
    doc.font('DejaVu-Bold').fontSize(16).fillColor(COLORS.primary)
       .text('PAYMENT RECEIPT', dividerX + 16, y + 4, { width: W - dividerX - 16 - MARGIN, align: 'left' });
    doc.font('DejaVu').fontSize(8.5).fillColor(COLORS.textSecondary)
       .text('This is to officially confirm that payment has been received as detailed below.',
             dividerX + 16, y + 40, { width: W - dividerX - 16 - MARGIN });

    y += headerHeight;
    doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).lineWidth(1.5).strokeColor(COLORS.primary).stroke();
    y += 24;

    // ── BODY: TWO COLUMNS (Paid By | Receipt Details) ────────────────────────
    const colGap = 24;
    const leftColW  = (CONTENT_W - colGap) * 0.45;
    const rightColW = (CONTENT_W - colGap) * 0.55;
    const rightColX = MARGIN + leftColW + colGap;

    const sectionTop = y;

    // -- Left column: Paid By --
    drawIconBadge(doc, 'user', MARGIN + 11, y + 11, 11);
    doc.font('DejaVu-Bold').fontSize(12).fillColor(COLORS.primaryDark)
       .text('Paid By', MARGIN + 30, y + 4);
    y += 26;

    const leftFields = [
      ['Name:', data.studentName],
      ['Matric Number:', data.matricNo],
      ['Department:', data.department],
      ['Faculty:', data.faculty],
      ['Level:', data.level],
      ['Phone Number:', data.phoneNumber],
      ['Email Address:', data.email],
    ];
    const leftLabelW = 100;
    let fieldY = y;
    leftFields.forEach(([label, value]) => {
      const used = drawFieldInline(doc, label, value, MARGIN, fieldY, leftLabelW, leftColW);
      fieldY += used;
    });
    const leftColBottom = fieldY;

    // -- Right column: Receipt Details card --
    const cardX = rightColX;
    const cardY = sectionTop;
    const cardW = rightColW;
    const rFields = [
      ['Receipt Number:', data.receiptNo],
      ['Transaction ID:', data.transactionId],
      ['Payment Date:', data.paymentDate],
      ['Payment Time:', data.paymentTime],
      ['Payment Method:', data.paymentMethod],
      ['Payment Channel:', data.paymentChannel],
    ];
    const cardPadding = 14;
    const rLabelW = 100;
    const rFieldWidth = cardW - cardPadding * 2;
    let fieldsHeight = 0;
    rFields.forEach(([label, value]) => {
      const h = Math.max(
        doc.heightOfString(label, { width: rLabelW, fontSize: 9.5 }),
        doc.heightOfString(value || '-', { width: rFieldWidth - rLabelW, fontSize: 9.5 })
      );
      fieldsHeight += h + 11;
    });
    const amountWordsText = data.amountInWords || numToWords(data.amount);
    const amountBoxPad = 14;
    const wordsHeight = doc.heightOfString(amountWordsText, { width: cardW - cardPadding * 2 - amountBoxPad * 2, fontSize: 9 });
    const amountBoxHeight = amountBoxPad * 2 + 20 + 8 + 11 + wordsHeight;
    const cardH = 34 + fieldsHeight + 12 + amountBoxHeight + cardPadding * 2;

    doc.roundedRect(cardX, cardY, cardW, cardH, 12).fill(COLORS.cardBg);
    doc.roundedRect(cardX, cardY, cardW, cardH, 12).lineWidth(1).strokeColor(COLORS.border).stroke();

    let ry = cardY + cardPadding;
    drawIconBadge(doc, 'receipt', cardX + cardPadding + 11, ry + 7, 11);
    doc.font('DejaVu-Bold').fontSize(12).fillColor(COLORS.primaryDark)
       .text('Receipt Details', cardX + cardPadding + 30, ry);
    ry += 24;

    rFields.forEach(([label, value]) => {
      const used = drawFieldInline(doc, label, value, cardX + cardPadding, ry, rLabelW, rFieldWidth);
      ry += used;
    });

    // Amount paid box (inside the card)
    ry += 6;
    const amtBoxW = cardW - cardPadding * 2;
    doc.roundedRect(cardX + cardPadding, ry, amtBoxW, amountBoxHeight, 10).fill(COLORS.primary);
    doc.font('DejaVu-Bold').fontSize(10.5).fillColor('#FFFFFF')
       .text('Amount Paid', cardX + cardPadding + amountBoxPad, ry + amountBoxPad);
    doc.font('DejaVu-Bold').fontSize(17).fillColor('#FFFFFF')
       .text(`\u20A6${fmtMoney(data.amount)}`, cardX + cardPadding + amountBoxPad + 90, ry + amountBoxPad - 3,
             { width: amtBoxW - amountBoxPad * 2 - 90, align: 'right' });

    const wordsY = ry + amountBoxPad + 24;
    doc.font('DejaVu').fontSize(8.5).fillColor('#E8F5EE')
       .text('Amount in Words:', cardX + cardPadding + amountBoxPad, wordsY);
    doc.font('DejaVu-Bold').fontSize(9).fillColor('#FFFFFF')
       .text(amountWordsText, cardX + cardPadding + amountBoxPad, wordsY + 13,
             { width: amtBoxW - amountBoxPad * 2 });

    const cardBottom = cardY + cardH;
    y = Math.max(leftColBottom, cardBottom) + 20;

    // ── PAYMENT BREAKDOWN TABLE ──────────────────────────────────────────────
    drawIconBadge(doc, 'list', MARGIN + 11, y + 11, 11);
    doc.font('DejaVu-Bold').fontSize(12).fillColor(COLORS.primaryDark)
       .text('Payment Breakdown', MARGIN + 30, y + 4);
    y += 26;

    const tableX = MARGIN;
    const colSN = 50, colDesc = 350, colAmt = CONTENT_W - 50 - 350;
    const rowH = 22;

    // header row
    doc.rect(tableX, y, CONTENT_W, rowH).fill(COLORS.tableHeaderBg);
    doc.font('DejaVu-Bold').fontSize(9).fillColor(COLORS.primaryDark)
       .text('S/N', tableX + 14, y + 8, { width: colSN - 14 });
    doc.text('Description', tableX + colSN, y + 8, { width: colDesc });
    doc.text('Amount (\u20A6)', tableX + colSN + colDesc, y + 8, { width: colAmt - 14, align: 'right' });
    y += rowH;

    const items = data.breakdownItems || [];
    items.forEach((item, idx) => {
      doc.font('DejaVu').fontSize(9.5).fillColor(COLORS.text)
         .text(String(idx + 1), tableX + 14, y + 7, { width: colSN - 14 });
      doc.text(item.description, tableX + colSN, y + 7, { width: colDesc });
      doc.text(fmtMoney(item.amount), tableX + colSN + colDesc, y + 7, { width: colAmt - 14, align: 'right' });
      y += rowH;
      if (idx < items.length - 1) {
        doc.moveTo(tableX, y).lineTo(tableX + CONTENT_W, y)
           .dash(2, { space: 2 }).strokeColor(COLORS.border).lineWidth(0.6).stroke();
        doc.undash();
      }
    });

    y += 6;
    doc.moveTo(tableX, y).lineTo(tableX + CONTENT_W, y).strokeColor(COLORS.border).lineWidth(1).stroke();
    y += 10;

    // total row (no fill, just bold text like reference)
    doc.font('DejaVu-Bold').fontSize(10.5).fillColor(COLORS.primary)
       .text('Total Paid', tableX + 14, y, { width: colDesc });
    doc.text(`\u20A6${fmtMoney(data.amount)}`, tableX + colSN + colDesc, y,
              { width: colAmt - 14, align: 'right' });
    y += 22;

    // ── VERIFICATION SECTION ─────────────────────────────────────────────────
    const verifyColGap = 20;
    const verifyLeftW = CONTENT_W * 0.5;
    const verifyRightW = CONTENT_W - verifyLeftW - verifyColGap;
    const verifyRightX = MARGIN + verifyLeftW + verifyColGap;
    const verifyMsg = 'This payment has been successfully received and recorded in the Caleb University Bursary System.\n\nNo further action is required.';
    const verifyMsgH = doc.heightOfString(verifyMsg, { width: verifyLeftW - 64, fontSize: 8.5 });
    const verifyH = Math.max(95, 36 + verifyMsgH);

    // left card
    doc.roundedRect(MARGIN, y, verifyLeftW, verifyH, 10).fill(COLORS.tableHeaderBg);
    doc.roundedRect(MARGIN, y, verifyLeftW, verifyH, 10).lineWidth(1).strokeColor(COLORS.border).stroke();
    drawIconBadge(doc, 'shield', MARGIN + 27, y + 27, 11);
    doc.font('DejaVu-Bold').fontSize(11).fillColor(COLORS.primaryDark)
       .text('Payment Verified', MARGIN + 46, y + 20);
    doc.font('DejaVu').fontSize(8.5).fillColor(COLORS.textSecondary)
       .text(verifyMsg, MARGIN + 22, y + 44, { width: verifyLeftW - 44 });

    // right: signature line (no signature image — left blank for ink/digital sign)
    doc.font('DejaVu').fontSize(8).fillColor(COLORS.textSecondary)
       .text(data.paymentDate || '', verifyRightX, y, { width: verifyRightW, align: 'right' });
    doc.moveTo(verifyRightX, y + verifyH - 28).lineTo(verifyRightX + verifyRightW, y + verifyH - 28)
       .strokeColor(COLORS.textSecondary).lineWidth(0.7).stroke();
    doc.font('DejaVu-Bold').fontSize(9.5).fillColor(COLORS.text)
       .text(data.signedBy || 'Bursary Department', verifyRightX, y + verifyH - 22, { width: verifyRightW, align: 'right' });
    doc.font('DejaVu').fontSize(8).fillColor(COLORS.textSecondary)
       .text('Caleb University, Imota', verifyRightX, y + verifyH - 10, { width: verifyRightW, align: 'right' });

    y += verifyH + 14;

    // ── FOOTER ───────────────────────────────────────────────────────────────
    const footerH = 36;
    doc.rect(0, H - footerH, W, footerH).fill(COLORS.primary);
    doc.font('DejaVu').fontSize(8).fillColor('#FFFFFF')
       .text('This receipt is computer-generated and valid without a signature.',
             MARGIN, H - footerH + 13, { width: CONTENT_W, align: 'center' });

    doc.end();
  });
}

module.exports = { generateReceipt, numToWords };


// ── Standalone test ────────────────────────────────────────────────────────
if (require.main === module) {
  const OUT  = path.join(__dirname, 'test-receipt-v2.pdf');
  const LOGO = path.join(__dirname, '..', 'caleb-logo.jpg');

  generateReceipt({
    studentName:     'Moses Azuoru',
    matricNo:        'CU/2023/06146',
    department:      'Computer Science',
    faculty:         'Faculty of Natural and Applied Sciences',
    level:           '400',
    phoneNumber:     '+234 803 123 4567',
    email:           'moses.azuoru@calebuniversity.edu.ng',
    receiptNo:       'SRCPT/01/142079',
    transactionId:   'PSK-REF-20250626-001',
    paymentDate:     '26-Jun-2025',
    paymentTime:     '10:42 AM',
    paymentMethod:   'Card Payment',
    paymentChannel:  'Paystack',
    amount:          125000.00,
    breakdownItems: [
      { description: 'School Fees',        amount: 100000.00 },
      { description: 'Development Levy',   amount: 15000.00 },
      { description: 'ICT Levy',           amount: 5000.00 },
      { description: 'Student Welfare',    amount: 5000.00 },
    ],
    signedBy: 'Bursary Department',
  }, OUT, LOGO)
    .then(p => console.log('Receipt generated:', p))
    .catch(console.error);
}
