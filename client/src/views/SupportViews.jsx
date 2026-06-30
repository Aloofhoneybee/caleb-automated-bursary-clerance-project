import React, { useState, useEffect } from 'react';
import { 
  getMyNotifications, 
  markAllNotificationsAsRead, 
  clearAllNotifications 
} from '../api/notifications';


// Fee Structure View
export function FeeStructureView({ feeStructure, allFees = [], studentGender = 'Male', hostelsList = [] }) {
  const [selectedDept, setSelectedDept] = useState(feeStructure?.department || 'Computer Science');
  const [displayedFee, setDisplayedFee] = useState(feeStructure);

  // Sync state if initial prop changes
  useEffect(() => {
    if (feeStructure) {
      setSelectedDept(feeStructure.department || 'Computer Science');
      setDisplayedFee(feeStructure);
    }
  }, [feeStructure]);

  const rawFeeItems = displayedFee?.feeItems || [
    { description: 'Program Related Fees', amount: 1200000 },
    { description: 'Other Fees', amount: 250000 },
    { description: 'Hostel Fee (Standard Mary & Susanna - Female Only)', amount: 250000 },
  ];

  const dbHostelItem = rawFeeItems.find(item => item.description.toLowerCase().includes('hostel'));
  const dbHostelAmount = dbHostelItem ? dbHostelItem.amount : 250000;

  const allHostelRatesList = hostelsList.length > 0
    ? hostelsList.map(h => ({ name: h.name, amount: h.amount }))
    : [
        { name: 'Mary & Susanna Hall (Female Only) (Standard)', amount: dbHostelAmount },
        { name: 'Elisha Hall (Shared)', amount: 270000 },
        { name: 'En-suite Room (6 bedded)', amount: 300000 },
        { name: 'En-suite Room (4 bedded)', amount: 320000 },
        { name: 'David Hostel (Premium)', amount: 500000 }
      ];

  const hostelRatesList = studentGender === 'Male'
    ? allHostelRatesList.filter(h => !h.name.toLowerCase().includes('mary'))
    : allHostelRatesList;

  const defaultHostel = hostelRatesList[0]?.name || 'Elisha Hall (Shared)';
  const [selectedHostel, setSelectedHostel] = useState(defaultHostel);

  // Sync selectedHostel if studentGender changes to Male and current selected is female-only
  useEffect(() => {
    if (studentGender === 'Male' && selectedHostel.toLowerCase().includes('mary')) {
      setSelectedHostel('Elisha Hall (Shared)');
    }
  }, [studentGender, selectedHostel]);

  const selectedHostelObj = hostelRatesList.find(h => h.name === selectedHostel) || hostelRatesList[0];

  const baseWithoutHostel = rawFeeItems.filter(item => !item.description.toLowerCase().includes('hostel'));
  const feeItems = [
    ...baseWithoutHostel,
    {
      description: `Hostel Fee (${selectedHostelObj.name})`,
      amount: selectedHostelObj.amount
    }
  ];

  const totalAmount = feeItems.reduce((sum, item) => sum + item.amount, 0);

  const departmentsList = [
    'Computer Science',
    'Mass Communication',
    'Law',
    'Microbiology',
    'Accounting',
    'Architecture'
  ];

  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    const match = allFees.find(
      (f) =>
        f.department === dept &&
        f.academicSession === (feeStructure?.academicSession || '2025/2026')
    );
    if (match) {
      setDisplayedFee(match);
    } else {
      setDisplayedFee(null);
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Academic Fee Structure</h1>
          <p className="text-xs text-gray-500 mt-1 hidden md:block">
            Official schedule of fees and levies for Caleb University {selectedDept} department.
          </p>
        </div>
        
        {/* Dropdown Selector */}
        <div className="flex items-center gap-2.5 shrink-0 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Select Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => handleDeptChange(e.target.value)}
            className="text-xs font-bold text-slate-800 focus:outline-none focus:ring-0 bg-transparent cursor-pointer border-none p-0"
          >
            {departmentsList.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-200 overflow-x-auto shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <table className="w-full text-[13px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 tracking-wider uppercase border-b border-gray-150">
              <th className="px-6 py-4">Fee Category & Details</th>
              <th className="px-6 py-4">Item Code</th>
              <th className="px-6 py-4 text-right">Amount (₦)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {feeItems.map((item, idx) => {
              const isHostel = item.description.includes('Hostel');
              return (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{isHostel ? 'Hostel Fee' : item.description}</h4>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                          {isHostel 
                            ? 'Hostel room allocation type' 
                            : 'Compulsory academic billing component'}
                        </p>
                      </div>
                      
                      {isHostel && (
                        <div className="sm:ml-4">
                          <select
                            value={selectedHostel}
                            onChange={(e) => setSelectedHostel(e.target.value)}
                            className="h-8 rounded-lg px-2 bg-gray-55 text-[11px] font-bold text-slate-700 border border-gray-250 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm cursor-pointer"
                          >
                            {hostelRatesList.map(h => (
                              <option key={h.name} value={h.name}>
                                {h.name} (₦{h.amount.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-400 font-semibold text-[11px]">
                    FEE-{item.description.substring(0, 3).toUpperCase().replace(/[\s\(\)]/g, '')}-{idx + 1}
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-slate-900 font-mono">
                    ₦{item.amount.toLocaleString()}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50/50 font-bold border-t-2 border-gray-200">
              <td className="px-6 py-5 text-secondary font-black text-sm" colSpan="2">Aggregate Program Fees</td>
              <td className="px-6 py-5 text-right text-secondary font-black text-base font-mono">
                ₦{totalAmount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Hostel & Other Information Card */}
      <div className="bg-white rounded-[20px] border border-gray-200 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.05)] space-y-4">
        <h3 className="text-[15px] font-bold text-secondary flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Hostel Rates & Obligatory Fees (2025/2026 Reference)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Hostel Rates */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alternative Hostel Options</h4>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
              {hostelRatesList.map((h) => {
                const isPremium = h.name.includes('Premium');
                const isStandard = h.name.includes('Standard');
                return (
                  <div 
                    key={h.name} 
                    className={`flex justify-between p-3 ${
                      isStandard 
                        ? 'bg-gray-50 font-semibold text-slate-700' 
                        : 'text-gray-650'
                    }`}
                  >
                    <span>{h.name}</span>
                    <span className={`font-mono ${isPremium ? 'font-bold text-primary' : isStandard ? 'font-bold' : ''}`}>
                      ₦{h.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Other Information */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Relevant Charges</h4>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
              <div className="flex justify-between p-3 text-gray-650">
                <span>SIWES Log book (SIWES Students only)</span>
                <span className="font-mono">₦5,000.00</span>
              </div>
              <div className="flex justify-between p-3 text-gray-650">
                <span>CUREC Fee (Final year only)</span>
                <span className="font-mono">₦10,000.00</span>
              </div>
              <div className="flex justify-between p-3 text-gray-650">
                <span>Project Binding Fee (Final year only)</span>
                <span className="font-mono">₦30,000.00</span>
              </div>
              <div className="flex justify-between p-3 text-gray-650">
                <span>Alumni Association (Graduating students)</span>
                <span className="font-mono">₦10,000.00</span>
              </div>
            </div>
            <div className="p-3 bg-green-50/50 border border-success/10 rounded-xl text-[11px] text-[#065F46] leading-relaxed">
              <b>Installment Policy:</b> Full payment of total amount due before resumption is encouraged. Total amount due for the session can also be paid in a maximum of three (3) installments (50% before resumption, 25% before 1st semester exams, and 25% before 2nd semester resumption).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Invoices View
export function InvoicesView({ studentData, feeStructure }) {
  const [downloading, setDownloading] = useState(false);
  const totalAmount = feeStructure?.totalAmount || 200000;
  const invoices = [
    { 
      id: `INV-${studentData.matricNo ? studentData.matricNo.replace('/', '') : '220001'}-01`, 
      title: 'Academic Session Main Invoice', 
      date: 'May 1, 2026', 
      total: totalAmount 
    },
  ];

  const handleDownloadInvoice = async (invId) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payments/invoice', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to download invoice');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Server did not return a PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${studentData.matricNo ? studentData.matricNo.replace('/', '_') : 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Bursary Invoices</h1>
        <p className="text-xs text-gray-500 mt-1 hidden md:block">Generated invoice billing sheets for academic registrations.</p>
      </div>

      <div className="space-y-4">
        {invoices.map((inv, idx) => (
          <div key={idx} className="bg-white rounded-[20px] border border-gray-250 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_8px_24px_rgba(15,23,42,0.05)] hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center text-primary border border-primary/15 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider block">{inv.id}</span>
                <h3 className="text-[15px] font-bold text-secondary">{inv.title}</h3>
                <span className="text-[11px] text-gray-400 block pt-0.5">Billed Date: {inv.date}</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full md:w-auto text-right">
              <div>
                <span className="text-xs text-gray-400 block">Total Amount</span>
                <span className="text-base font-extrabold text-slate-900 block font-mono">₦{inv.total.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Status</span>
                {(() => {
                  const totalPaid = studentData.totalPaid || 0;
                  const isFullyPaid = studentData.clearanceStatus === 'Cleared' || totalPaid >= totalAmount;
                  const isUnpaid = totalPaid <= 0;

                  if (isFullyPaid) {
                    return (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 uppercase border bg-green-50 border-green-100 text-primary">
                        Fully Paid
                      </span>
                    );
                  } else if (isUnpaid) {
                    return (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 uppercase border bg-red-55 border-red-150 text-red-600">
                        Unpaid
                      </span>
                    );
                  } else {
                    return (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 uppercase border bg-orange-50 border-orange-100 text-orange-600">
                        Partially Paid
                      </span>
                    );
                  }
                })()}
              </div>
              <button 
                onClick={() => handleDownloadInvoice(inv.id)}
                disabled={downloading}
                className="w-full md:w-auto h-[42px] px-5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Payment History View
export function PaymentHistoryView({ transactions }) {
  const [downloadingRef, setDownloadingRef] = useState(null);

  const handleDownloadReceipt = async (reference) => {
    setDownloadingRef(reference);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/payments/receipt/${reference}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to download receipt');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Server did not return a PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      setDownloadingRef(null);
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Payment Ledger History</h1>
        <p className="text-xs text-gray-500 mt-1 hidden md:block">Audit log of all tuition and levies payments submitted on the portal.</p>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-250 overflow-x-auto shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <table className="w-full text-[13px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 tracking-wider uppercase border-b border-gray-150">
              <th className="px-6 py-4">Transaction Details</th>
              <th className="px-6 py-4">Reference Code</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Amount (₦)</th>
              <th className="px-6 py-4 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((tx, idx) => {
              const isSuccess = tx.status === 'success';
              const isFailed = tx.status === 'failed';
              const isCancelled = tx.status === 'cancelled';
              return (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSuccess ? 'bg-green-50 text-primary' : isFailed ? 'bg-red-50 text-danger' : isCancelled ? 'bg-slate-100 text-slate-500' : 'bg-orange-50 text-warning'
                      }`}>
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4" />
                        </svg>
                      </div>
                      <span className="font-bold text-slate-800">{tx.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-400 font-semibold text-[11px]">{tx.ref}</td>
                  <td className="px-6 py-4 text-gray-500">{tx.date}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                      isSuccess 
                        ? 'bg-green-50 border-green-100 text-primary' 
                        : isFailed 
                          ? 'bg-red-50 border-red-100 text-danger' 
                          : isCancelled
                            ? 'bg-slate-100 border-slate-200 text-slate-500'
                            : 'bg-orange-50 border-orange-100 text-orange-600'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-slate-900 font-mono">₦{tx.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    {isSuccess ? (
                      <button
                        onClick={() => handleDownloadReceipt(tx.ref)}
                        disabled={downloadingRef !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-slate-700 rounded-lg text-[11px] font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        {downloadingRef === tx.ref ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Download PDF</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs font-semibold">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Wallet View
export function WalletView({ studentData, openCheckout }) {
  const [topUpAmount, setTopUpAmount] = useState('50,000');

  const handleAmountChange = (e) => {
    const val = e.target.value;
    const cleanVal = val.replace(/\D/g, '');
    if (cleanVal === '') {
      setTopUpAmount('');
    } else {
      setTopUpAmount(Number(cleanVal).toLocaleString('en-US'));
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Student Cash Wallet</h1>
        <p className="text-xs text-gray-500 mt-1 hidden md:block">Pre-fund your student account wallet to make instant invoice payments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-primary-dark to-primary rounded-[20px] p-6 text-white flex flex-col justify-between h-[180px] shadow-[0_8px_24px_rgba(15,23,42,0.05)] border border-primary-dark/20">
          <div>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider block">Wallet Balance</span>
            <h2 className="text-2xl font-black font-mono tracking-wide mt-1.5">₦0.00</h2>
          </div>
          <div className="flex justify-between items-center text-[11px] text-white/85 mt-4">
            <span>Matric: {studentData.matricNo}</span>
            <span className="px-2.5 py-1 bg-white/10 rounded-lg font-bold border border-white/15">Active</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-2 bg-white rounded-[20px] border border-gray-250 p-6 flex flex-col justify-between shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="space-y-2">
            <h3 className="text-[15px] font-bold text-secondary">Top-up Wallet</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Add funds directly using a credit card or bank transfer checkout. Funds in your wallet can be used to pay off school bills instantly.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="relative flex items-center max-w-[150px] w-full">
              <span className="absolute left-3.5 text-slate-500 font-bold text-sm select-none">₦</span>
              <input
                type="text"
                inputMode="numeric"
                value={topUpAmount}
                onChange={handleAmountChange}
                className="h-11 pl-8 pr-3 bg-gray-55 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono w-full"
                placeholder="0"
              />
            </div>
            <button
              onClick={() => openCheckout(parseFloat(topUpAmount.replace(/,/g, '')) || 0)}
              className="h-11 px-5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Add Funds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Help Centre View
export function HelpCentreView() {
  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Support Help Centre</h1>
        <p className="text-xs text-gray-500 mt-1 hidden md:block">Get assistance with your school payments, payment approvals and clearance certificates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[20px] border border-gray-200 p-6 space-y-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] text-center">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto border border-primary/15">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-800">Email Support</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">bursary.support@calebuniversity.edu.ng</p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-gray-200 p-6 space-y-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] text-center">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto border border-primary/15">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-800">Bursar Phone Helpline</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">+234 (0) 803 123 4567, Ext: 304</p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-gray-200 p-6 space-y-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] text-center">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto border border-primary/15">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.434 21.2a1.5 1.5 0 01-2.177 0l-4.243-4.543a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-800">Physical Office</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">Bursary Block A, Imota Campus, Lagos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// FAQs View
export function FAQsView() {
  const faqs = [
    { q: 'Can I pay my tuition fees in installments?', a: 'Yes. Caleb University allows structured installment payments. Standard ratios are 60% for the 1st semester and 40% for the 2nd semester. Verify your invoice sheet for accurate balances.' },
    { q: 'What should I do if my Paystack payment fails but I was charged?', a: 'Do not panic. Navigate to the Support page and log a dispute ticket. Include the transaction reference ID, amount, and date. The bursary office will reconcile the logs with the Paystack webhook backend.' }
  ];

  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Frequently Asked Questions</h1>
        <p className="text-xs text-gray-500 mt-1 hidden md:block">Get answers to the most common bursary clearance inquiries.</p>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-250 p-6 space-y-4 divide-y divide-gray-100 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        {faqs.map((faq, idx) => (
          <div key={idx} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} space-y-2`}>
            <h4 className="text-[14px] font-bold text-secondary">{faq.q}</h4>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Notifications View
export function NotificationsView({ 
  currentRole, 
  notifications: propNotifications, 
  loading: propLoading, 
  onRefresh, 
  setNotifications: propSetNotifications 
}) {
  const [localNotifications, setLocalNotifications] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);

  const notifications = propNotifications !== undefined ? propNotifications : localNotifications;
  const loading = propLoading !== undefined ? propLoading : localLoading;
  const setNotifications = propSetNotifications !== undefined ? propSetNotifications : setLocalNotifications;

  const fetchItems = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      setLocalLoading(true);
      try {
        const res = await getMyNotifications();
        setLocalNotifications(res.data || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLocalLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const clearAll = async () => {
    try {
      await clearAllNotifications();
      // Keep only the welcome notification
      setNotifications(prev => prev.filter(n => (n._id === 'welcome-notification-global' || n.id === 'welcome-notification-global')));
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary tracking-tight">System Notifications</h1>
          <p className="text-xs text-gray-500 mt-1 hidden md:block">
            Reconciled payments logs, clearance progress approvals, and server notifications.
          </p>
        </div>
        
        {notifications.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={markAllAsRead}
              className="h-[38px] px-4 bg-white border border-gray-250 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              Mark all as read
            </button>
            <button
              onClick={clearAll}
              className="h-[38px] px-4 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-gray-455 font-medium">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-gray-200 p-12 text-center text-gray-400 flex flex-col items-center justify-center max-w-[600px] mx-auto shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="text-base font-bold text-secondary">No Notifications</h3>
          <p className="text-xs text-gray-450 mt-1">You are all caught up! No recent system updates found.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-[850px]">
          {notifications.map((n) => {
            const nId = n._id || n.id;
            return (
              <div
                key={nId}
                className={`bg-white border rounded-[20px] p-5 flex gap-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all relative ${
                  n.unread ? 'border-primary/20 bg-green-50/10' : 'border-gray-200'
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  n.type === 'clearance' || n.type === 'queue'
                    ? 'bg-green-50 border-green-100 text-primary'
                    : n.type === 'billing' || n.type === 'gateway'
                    ? 'bg-blue-50 border-blue-100 text-blue-600'
                    : 'bg-gray-50 border-gray-100 text-gray-500'
                }`}>
                  {n.type === 'clearance' || n.type === 'queue' ? (
                    <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : n.type === 'billing' || n.type === 'gateway' ? (
                    <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16" />
                    </svg>
                  ) : (
                    <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-[14px]">{n.title}</h4>
                    {n.unread && (
                      <span className="w-2 h-2 rounded-full bg-primary inline-block shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">{n.description}</p>
                  <span className="text-[10px] text-gray-400 font-bold font-mono tracking-wide uppercase block pt-1">
                    {n.createdAt ? formatTimeAgo(n.createdAt) : n.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Biodata View
import { updateProfile } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export function BiodataView({ currentRole }) {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Local state for all fields
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    level: user?.level || '100 Level',
    stateOfOrigin: user?.stateOfOrigin || 'Lagos',
    parentPhoneNumber: user?.parentPhoneNumber || '+234 803 000 0000',
    phoneNumber: user?.phoneNumber || '+234 812 000 0000',
    gender: user?.gender || 'Male',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '2005-01-01',
    department: user?.department || 'Computer Science'
  });

  // Sync state if user context updates
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        level: user.level || '100 Level',
        stateOfOrigin: user.stateOfOrigin || 'Lagos',
        parentPhoneNumber: user.parentPhoneNumber || '+234 803 000 0000',
        phoneNumber: user.phoneNumber || '+234 812 000 0000',
        gender: user.gender || 'Male',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '2005-01-01',
        department: user.department || 'Computer Science'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await updateProfile(formData);
      if (res.status === 'success') {
        setUser(res.data);
        setSuccess('Your profile biodata has been successfully updated.');
        setIsEditing(false);
      } else {
        setError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const formatStudentName = (firstName, lastName, fullName) => {
    if (lastName && firstName) {
      const formattedLast = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
      const formattedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      return `${formattedLast} ${formattedFirst}`;
    }
    if (!fullName) return "";
    const parts = fullName.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const l = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      const f = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
      return `${l} ${f}`;
    }
    return fullName.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  };

  const displayName = formatStudentName(formData.firstName, formData.lastName, user?.fullName);
  const avatarInitials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const isStudent = user?.role === 'student';

  const statesOfOriginList = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ];

  const levelsList = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level'];
  const departmentsList = ['Computer Science', 'Mass Communication', 'Law', 'Microbiology', 'Accounting', 'Architecture'];

  return (
    <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
        {/* Subtle decorative shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full -ml-16 -mb-16 blur-xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 flex items-center justify-center font-black text-2xl md:text-3xl text-emerald-100 border-2 border-white/20 shadow-md">
            {avatarInitials}
          </div>
          <div className="text-center md:text-left space-y-1">
            <h2 className="text-2xl md:text-3xl font-black font-sans tracking-tight">{displayName}</h2>
            <p className="text-emerald-100 text-xs md:text-sm font-semibold tracking-wide uppercase opacity-90">
              {user?.role === 'student' ? `Matric: ${user?.matricNumber || 'N/A'}` : `${user?.role} Profile`}
            </p>
            {isStudent && (
              <span className="inline-block text-[10px] font-black bg-white/10 border border-white/20 px-3 py-1 rounded-full uppercase tracking-wider mt-1.5">
                {user?.academicSession || '2025/2026'} Session
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 relative z-10 flex gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="h-11 px-5 bg-white text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-md hover:bg-emerald-50 flex items-center gap-2"
            >
              <svg className="w-4.5 h-4.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Biodata
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError('');
                  setSuccess('');
                  // reset form
                  setFormData({
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || '',
                    level: user?.level || '100 Level',
                    stateOfOrigin: user?.stateOfOrigin || 'Lagos',
                    parentPhoneNumber: user?.parentPhoneNumber || '+234 803 000 0000',
                    phoneNumber: user?.phoneNumber || '+234 812 000 0000',
                    gender: user?.gender || 'Male',
                    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '2005-01-01',
                    department: user?.department || 'Computer Science'
                  });
                }}
                className="h-11 px-5 bg-white/10 border border-white/20 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving}
                className="h-11 px-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Messaging */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
          <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Personal Profile */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
          <h3 className="text-[15px] font-bold text-secondary flex items-center gap-2 border-b border-gray-100 pb-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personal Information
          </h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">First Name</label>
                <span className="text-xs font-bold text-slate-500 block p-1 bg-gray-50 rounded-xl border border-gray-100">{user?.firstName || 'N/A'}</span>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Last Name</label>
                <span className="text-xs font-bold text-slate-500 block p-1 bg-gray-50 rounded-xl border border-gray-100">{user?.lastName || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Gender</label>
              {isEditing ? (
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-800 block p-1">{formData.gender}</span>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold"
                  required
                />
              ) : (
                <span className="text-xs font-bold text-slate-800 block p-1">{formData.dateOfBirth}</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Academic Profile */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow">
          <h3 className="text-[15px] font-bold text-secondary flex items-center gap-2 border-b border-gray-100 pb-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Academic Information
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">University Email</label>
              <span className="text-xs font-bold text-slate-500 block p-1 bg-gray-50 rounded-xl border border-gray-100">{user?.email}</span>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Department</label>
              {isEditing ? (
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold cursor-pointer"
                >
                  {departmentsList.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-800 block p-1">{formData.department}</span>
              )}
            </div>

            {isStudent && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Level</label>
                  {isEditing ? (
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold cursor-pointer"
                    >
                      {levelsList.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-slate-800 block p-1">{formData.level}</span>
                  )}
                </div>
                <div className="text-center">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1 text-center">Matric Number</label>
                  <span className="text-xs font-bold text-slate-800 block p-1 text-center">{user?.matricNumber || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Contact & Emergency Information */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow md:col-span-2">
          <h3 className="text-[15px] font-bold text-secondary flex items-center gap-2 border-b border-gray-100 pb-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Contact & Parent Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Personal Phone Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold font-mono"
                  required
                />
              ) : (
                <span className="text-xs font-bold text-slate-800 font-mono block p-1">{formData.phoneNumber}</span>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Parent's Phone Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="parentPhoneNumber"
                  value={formData.parentPhoneNumber}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold font-mono"
                  required
                />
              ) : (
                <span className="text-xs font-bold text-slate-800 font-mono block p-1">{formData.parentPhoneNumber}</span>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">State of Origin</label>
              {isEditing ? (
                <select
                  name="stateOfOrigin"
                  value={formData.stateOfOrigin}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold cursor-pointer"
                >
                  {statesOfOriginList.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-800 block p-1">{formData.stateOfOrigin}</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

