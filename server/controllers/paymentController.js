const crypto = require('crypto');
const User = require('../models/User');
const FeeStructure = require('../models/FeeStructure');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { initializeTransaction, verifyTransaction } = require('../services/paystack');
const { runClearanceEngine } = require('../services/clearanceEngine');
const { generateInvoicePDF } = require('../services/invoiceGenerator');
const { generateReceiptPDF } = require('../services/receiptGenerator');

// @route  POST /api/payments/initialize
// @access Student only
const initializePayment = async (req, res) => {
  try {
    const student = await User.findById(req.user._id);

    // Get the applicable fee structure for this student
    const feeStructure = await FeeStructure.findOne({
      academicSession: student.academicSession,
      studentCategory: req.body.studentCategory,
      department: student.department,
      isActive: true,
    });

    if (!feeStructure) {
      return res.status(404).json({
        status: 'error',
        message: 'No active fee structure found for your session and category',
      });
    }

    // Find the student's selected hostel or gender-based default
    const Hostel = require('../models/Hostel');
    const defaultHostelName = student.gender === 'Female' 
      ? 'Mary & Susanna Hall (Female Only) (Standard)'
      : 'Elisha Hall (Shared)';
    const selectedHostelName = student.hostel || defaultHostelName;
    const hostel = await Hostel.findOne({ name: selectedHostelName });
    const hostelAmount = hostel ? hostel.amount : (student.gender === 'Female' ? 250000 : 270000);

    const calculatedTotal = feeStructure.totalAmount + hostelAmount;

    // Use custom requested amount if provided, otherwise default to calculatedTotal
    let checkAmount = req.body.amount;
    if (typeof checkAmount === 'undefined' || isNaN(checkAmount) || checkAmount <= 0) {
      checkAmount = calculatedTotal;
    }

    // Generate a unique reference
    const reference = `BCS-${student.matricNumber.replace(/\//g, '-')}-${Date.now()}`;

    // Determine the dynamic client origin from headers (supports localhost, 127.0.0.1, Vercel preview domains)
    const clientOrigin = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';

    // Initialize with Paystack
    const paystackResponse = await initializeTransaction({
      email: student.email,
      amount: checkAmount,
      reference,
      callbackUrl: `${clientOrigin}/payment/verify`,
      metadata: {
        studentId: student._id.toString(),
        matricNumber: student.matricNumber,
        academicSession: student.academicSession,
        studentCategory: req.body.studentCategory,
        feeStructureId: feeStructure._id.toString(),
      },
    });

    // Save a pending transaction record
    await Transaction.create({
      student: student._id,
      paystackReference: reference,
      amount: checkAmount,
      status: 'pending',
      academicSession: student.academicSession,
    });

    await AuditLog.create({
      eventType: 'payment',
      actingUser: student._id,
      description: `Payment initialized for ${student.matricNumber} - ₦${checkAmount.toLocaleString()}`,
      metadata: { reference, amount: checkAmount },
    });

    await Notification.create({
      user: student._id,
      title: 'Payment Transaction Initiated',
      description: `A school fees online payment of ₦${checkAmount.toLocaleString()} has been initiated. Reference: ${reference}`,
      type: 'billing',
      unread: true,
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment initialized',
      data: {
        authorizationUrl: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        amount: feeStructure.totalAmount,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

const reconcilePendingTransactions = async (studentId) => {
  try {
    const pendingTransactions = await Transaction.find({
      student: studentId,
      status: 'pending'
    });

    for (const transaction of pendingTransactions) {
      try {
        const paystackResponse = await verifyTransaction(transaction.paystackReference);
        
        if (paystackResponse.status && paystackResponse.data.status === 'success') {
          const { channel, paid_at } = paystackResponse.data;
          transaction.status = 'success';
          transaction.channel = channel;
          transaction.paidAt = new Date(paid_at);
          transaction.paystackResponse = paystackResponse.data;
          await transaction.save();

          // Create Notification & Log
          await AuditLog.create({
            eventType: 'payment',
            actingUser: studentId,
            description: `Reconciled pending payment to success - reference: ${transaction.paystackReference}`,
            metadata: { reference: transaction.paystackReference, amount: transaction.amount },
          });

          await Notification.create({
            user: studentId,
            title: 'School Fees Payment Successful',
            description: `Your payment of ₦${transaction.amount.toLocaleString()} was confirmed successfully.`,
            type: 'billing',
            unread: true,
          });

          await runClearanceEngine(studentId, transaction.academicSession, transaction._id);
        } else {
          const status = paystackResponse.data?.status;
          const timeElapsedMs = Date.now() - new Date(transaction.createdAt).getTime();
          // If Paystack explicitly reports failed/abandoned, or if it has been pending for over 5 minutes
          if (status === 'failed' || status === 'abandoned' || timeElapsedMs > 5 * 60 * 1000) {
            const isCancelled = status === 'abandoned' || status === 'cancelled' || timeElapsedMs > 5 * 60 * 1000;
            transaction.status = isCancelled ? 'cancelled' : 'failed';
            transaction.paystackResponse = paystackResponse.data;
            await transaction.save();

            await Notification.create({
              user: studentId,
              title: `School Fees Payment ${isCancelled ? 'Cancelled' : 'Failed'}`,
              description: `Your payment of ₦${transaction.amount.toLocaleString()} has been ${isCancelled ? 'cancelled' : 'failed'}. Reference: ${transaction.paystackReference}`,
              type: 'billing',
              unread: true,
            });
          }
        }
      } catch (innerErr) {
        // If Paystack returns 404/error (e.g. transaction not found on Paystack because it wasn't even initialized fully or user didn't proceed at all)
        // Check if it's older than 5 minutes, mark as cancelled (abandoned)
        const timeElapsedMs = Date.now() - new Date(transaction.createdAt).getTime();
        if (timeElapsedMs > 5 * 60 * 1000) {
          transaction.status = 'cancelled';
          await transaction.save();
        }
        console.error(`Reconcile single transaction error for ${transaction.paystackReference}:`, innerErr.message);
      }
    }
  } catch (err) {
    console.error('Reconcile pending transactions error:', err.message);
  }
};

// @route  GET /api/payments/my-transactions
// @access Student only
const getMyTransactions = async (req, res) => {
  try {
    await reconcilePendingTransactions(req.user._id);
    const transactions = await Transaction.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      results: transactions.length,
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// @route  GET /api/payments/all
// @access Admin, Staff
const getAllTransactions = async (req, res) => {
  try {
    // Reconcile all pending transactions in the system
    const pendingTransactions = await Transaction.find({ status: 'pending' });
    for (const tx of pendingTransactions) {
      try {
        const paystackResponse = await verifyTransaction(tx.paystackReference);
        if (paystackResponse.status && paystackResponse.data.status === 'success') {
          const { channel, paid_at } = paystackResponse.data;
          tx.status = 'success';
          tx.channel = channel;
          tx.paidAt = new Date(paid_at);
          tx.paystackResponse = paystackResponse.data;
          await tx.save();
          await runClearanceEngine(tx.student, tx.academicSession, tx._id);
        } else {
          const status = paystackResponse.data?.status;
          const timeElapsedMs = Date.now() - new Date(tx.createdAt).getTime();
          if (status === 'failed' || status === 'abandoned' || timeElapsedMs > 5 * 60 * 1000) {
            const isCancelled = status === 'abandoned' || status === 'cancelled' || timeElapsedMs > 5 * 60 * 1000;
            tx.status = isCancelled ? 'cancelled' : 'failed';
            tx.paystackResponse = paystackResponse.data;
            await tx.save();
          }
        }
      } catch (innerErr) {
        const timeElapsedMs = Date.now() - new Date(tx.createdAt).getTime();
        if (timeElapsedMs > 5 * 60 * 1000) {
          tx.status = 'cancelled';
          await tx.save();
        }
      }
    }

    const transactions = await Transaction.find()
      .populate('student', 'fullName matricNumber email academicSession')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: transactions.length,
      data: transactions,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// @route  GET /api/payments/verify/:reference
// @access Student only
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    // 1. Get the transaction record
    const transaction = await Transaction.findOne({ paystackReference: reference });
    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found',
      });
    }

    // 2. If already success, return immediately
    if (transaction.status === 'success') {
      return res.status(200).json({
        status: 'success',
        message: 'Payment already successfully verified',
        data: transaction,
      });
    }

    // 3. Call Paystack API to verify
    const paystackResponse = await verifyTransaction(reference);

    if (paystackResponse.status && paystackResponse.data.status === 'success') {
      const { channel, paid_at, amount } = paystackResponse.data;

      // 4. Update transaction status
      transaction.status = 'success';
      transaction.channel = channel;
      transaction.paidAt = new Date(paid_at);
      transaction.paystackResponse = paystackResponse.data;
      await transaction.save();

      // 5. Create Audit Log
      await AuditLog.create({
        eventType: 'payment',
        actingUser: transaction.student,
        description: `Payment confirmed via verification route - reference: ${reference}`,
        metadata: { reference, amount: amount / 100, channel },
      });

      // 6. Create Notification
      await Notification.create({
        user: transaction.student,
        title: 'School Fees Payment Successful',
        description: `Your payment of ₦${transaction.amount.toLocaleString()} was confirmed successfully via ${channel || 'Paystack'}.`,
        type: 'billing',
        unread: true,
      });

      // 7. Run Clearance Engine
      await runClearanceEngine(transaction.student, transaction.academicSession, transaction._id);

      return res.status(200).json({
        status: 'success',
        message: 'Payment verified successfully',
        data: transaction,
      });
    } else {
      const status = paystackResponse.data?.status;
      const isCancelled = status === 'abandoned' || status === 'cancelled';
      transaction.status = isCancelled ? 'cancelled' : 'failed';
      transaction.paystackResponse = paystackResponse.data;
      await transaction.save();

      // Create Notification
      await Notification.create({
        user: transaction.student,
        title: `School Fees Payment ${isCancelled ? 'Cancelled' : 'Failed'}`,
        description: `Your payment of ₦${transaction.amount.toLocaleString()} has been ${isCancelled ? 'cancelled' : 'failed'}. Reference: ${reference}`,
        type: 'billing',
        unread: true,
      });

      return res.status(400).json({
        status: 'error',
        message: `Payment ${isCancelled ? 'cancelled' : 'failed'}. Status: ${status || 'failed'}`,
      });
    }
  } catch (err) {
    console.error('Verify payment error:', err.message);

    // Handle case where Paystack returns 404/400 (e.g. no attempts made / reference not found)
    const isPaystackCancel = err.response && (err.response.status === 404 || err.response.status === 400);
    if (isPaystackCancel) {
      try {
        const transaction = await Transaction.findOne({ paystackReference: reference });
        if (transaction && transaction.status === 'pending') {
          transaction.status = 'cancelled';
          await transaction.save();

          await Notification.create({
            user: transaction.student,
            title: 'School Fees Payment Cancelled',
            description: `Your payment of ₦${transaction.amount.toLocaleString()} was cancelled. Reference: ${reference}`,
            type: 'billing',
            unread: true,
          });

          return res.status(400).json({
            status: 'error',
            message: 'Payment cancelled by user (no attempts made).',
          });
        }
      } catch (dbErr) {
        console.error('Error updating transaction to cancelled in catch block:', dbErr.message);
      }
    }

    res.status(500).json({ status: 'error', message: err.message });
  }
};

// @route  GET /api/payments/invoice
// @access Student only
const downloadInvoice = async (req, res) => {
  try {
    const student = await User.findById(req.user._id);

    // Get the applicable fee structure for this student
    const feeStructure = await FeeStructure.findOne({
      academicSession: student.academicSession,
      department: student.department,
      isActive: true,
    });

    if (!feeStructure) {
      return res.status(404).json({
        status: 'error',
        message: 'No active fee structure found for your session and department',
      });
    }

    // Get student's selected hostel rate
    const Hostel = require('../models/Hostel');
    const defaultHostelName = student.gender === 'Female' 
      ? 'Mary & Susanna Hall (Female Only) (Standard)'
      : 'Elisha Hall (Shared)';
    const selectedHostelName = student.hostel || defaultHostelName;
    const hostel = await Hostel.findOne({ name: selectedHostelName });
    const hostelAmount = hostel ? hostel.amount : (student.gender === 'Female' ? 250000 : 270000);

    const dynamicFeeItems = [
      ...feeStructure.feeItems,
      {
        description: `Hostel Fee (${selectedHostelName})`,
        amount: hostelAmount
      }
    ];

    const totalRequired = feeStructure.totalAmount + hostelAmount;

    // Get all successful transactions to compute total paid and outstanding
    const successfulTransactions = await Transaction.find({
      student: student._id,
      academicSession: student.academicSession,
      status: 'success',
    });

    const totalPaid = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    const outstanding = Math.max(0, totalRequired - totalPaid);
    const status = outstanding <= 0 ? 'Fully Paid' : 'Partially Paid';

    const invoiceId = `INV-${student.matricNumber.replace(/\//g, '')}-01`;
    const invoiceDate = new Date(student.createdAt || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    await generateInvoicePDF(res, {
      fullName: student.fullName,
      matricNumber: student.matricNumber,
      department: student.department,
      academicSession: student.academicSession,
      invoiceId,
      invoiceDate,
      feeItems: dynamicFeeItems,
      totalAmount: totalRequired,
      totalPaid,
      outstanding,
      status,
      email: student.email,
      phoneNumber: student.phoneNumber,
      level: student.level,
    });

  } catch (err) {
    console.error('Download invoice error:', err.message);
    res.status(550).json({ status: 'error', message: err.message });
  }
};

// @route  GET /api/payments/receipt/:reference
// @access Student only
const downloadReceipt = async (req, res) => {
  try {
    const { reference } = req.params;

    // 1. Get the transaction record and populate student info
    const transaction = await Transaction.findOne({ paystackReference: reference, status: 'success' })
      .populate('student');

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Successful transaction not found',
      });
    }

    const student = transaction.student;

    // 2. Format Date and Time from paidAt or updatedAt
    const paymentDateObj = transaction.paidAt || transaction.updatedAt || new Date();
    const paymentDate = paymentDateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-'); // e.g. "26-Jun-2025"
    
    const paymentTime = paymentDateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // 3. Generate dynamic receipt number using last 6 chars of transaction _id
    const receiptNo = `SRCPT/01/${transaction._id.toString().substring(18).toUpperCase()}`;

    // 4. Build dynamic breakdown items list (single item as per user request)
    const breakdownItems = [
      {
        description: 'Payment of school fees',
        amount: transaction.amount
      }
    ];

    // 5. Build data payload for the receipt generator
    const receiptData = {
      studentName: student.fullName,
      matricNo: student.matricNumber || 'N/A',
      department: student.department || 'Computer Science',
      level: student.level || 'N/A',
      phoneNumber: student.phoneNumber || 'N/A',
      email: student.email,
      receiptNo,
      transactionId: transaction.paystackReference,
      paymentDate,
      paymentTime,
      paymentMethod: transaction.channel ? (transaction.channel.charAt(0).toUpperCase() + transaction.channel.slice(1)) : 'Card Payment',
      paymentChannel: 'Paystack',
      amount: transaction.amount,
      breakdownItems,
      signedBy: 'Bursary Department'
    };

    await generateReceiptPDF(res, receiptData);

  } catch (err) {
    console.error('Download receipt error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = { initializePayment, getMyTransactions, getAllTransactions, verifyPayment, downloadInvoice, downloadReceipt };