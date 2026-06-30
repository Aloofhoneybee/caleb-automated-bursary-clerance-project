import React from 'react';
import { downloadCertificate } from '../api/clearance';
import { useAuth } from '../context/AuthContext';

export default function CertificateView({ studentData }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = React.useState(false);
  const isCleared = studentData.clearanceStatus === 'Cleared';
  const token = studentData.verificationToken || '';
  const verifyUrl = `${window.location.origin}/verify/${token}`;
  
  const dateIssued = studentData.clearedAt
    ? new Date(studentData.clearedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const defaultHostel = user?.gender === 'Female' ? 'Mary & Susanna Hall (Female Only) (Standard)' : 'Elisha Hall (Shared)';
  const hostelName = user?.hostel || defaultHostel;

  const handlePrint = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      await downloadCertificate();
    } catch (err) {
      alert('Failed to download PDF certificate: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!isCleared) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center max-w-[600px] mx-auto select-none space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="w-16 h-16 bg-red-50 text-danger rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-secondary">Certificate Locked</h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Your clearance has not yet been approved. Complete your school fees payment or submit your payment evidence to unlock your official clearance certificate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Clearance Certificate</h1>
          <p className="text-xs text-gray-500 mt-1 hidden md:block">Official proof of financial clearance from Caleb University Bursary.</p>
        </div>
        <button
          disabled={downloading}
          onClick={handlePrint}
          className={`h-[46px] px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            downloading 
              ? 'bg-gray-400 text-gray-100 cursor-not-allowed shadow-none' 
              : 'bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/10'
          }`}
        >
          {downloading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-100 border-t-transparent rounded-full animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF Certificate
            </>
          )}
        </button>
      </div>

      {/* Certificate Frame wrapper */}
      <div className="bg-slate-100/50 p-4 md:p-6 rounded-3xl border border-gray-250 overflow-x-auto flex justify-start lg:justify-center no-print">
        {/* Printable Area starts */}
        <div className="printable-area min-w-[1000px] w-[1000px] h-[707px] bg-[#FCFBF7] border-[20px] border-[#D4AF37] p-[40px] flex flex-col justify-between relative shadow-xl text-center select-text">
          
          {/* Decorative Corner borders inside frame */}
          <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-[#D4AF37]/40 pointer-events-none" />

          {/* Header section */}
          <div className="space-y-4">
            {/* Caleb Logo representation */}
            <div className="flex justify-center items-center gap-3">
              <img
                src="/caleb-logo.png"
                alt="Caleb Logo"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid #E2E8F0',
                  flexShrink: 0,
                }}
              />
              <div>
                <h1 className="text-2xl font-black text-secondary tracking-tight uppercase">Caleb University</h1>
                <p className="text-[9px] font-bold text-gray-500 tracking-[0.2em] uppercase">Imota, Lagos State, Nigeria</p>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[#D4AF37] uppercase font-serif tracking-wide">Bursary Clearance Certificate</h2>
              <div className="h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent w-2/3 mx-auto" />
            </div>
          </div>

          {/* Main Statement */}
          <div className="my-6 space-y-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider uppercase">This is to certify that</p>
            
            <div>
              <h3 className="text-3xl font-serif font-extrabold text-secondary tracking-wide underline decoration-[#D4AF37] decoration-2 underline-offset-8">
                {studentData.name ? studentData.name.replace(/,/g, '').replace(/\s+/g, ' ').trim() : ''}
              </h3>
              <p className="text-xs text-gray-500 font-semibold mt-2.5">Matriculation Number: <span className="text-secondary font-bold font-mono">{studentData.matricNo}</span></p>
            </div>

            <p className="text-sm text-gray-600 max-w-[800px] mx-auto leading-relaxed">
              {studentData.clearanceScope === 'first_semester' ? (
                <>
                  Has successfully fulfilled first semester financial obligations <b className="text-[#059669] font-bold">(50% payment threshold)</b> for the <b className="text-secondary font-bold">{studentData.session}</b> Academic Session, including tuition fees, levies, and accommodation fees in respect of the Department of <b className="text-secondary font-bold">{studentData.programme ? studentData.programme.replace('B.Sc. ', '') : 'Computer Science'}</b>. Accordingly, the student is hereby declared <span className="text-[#059669] font-extrabold uppercase text-[12px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50 whitespace-nowrap">CLEARED (First Semester Only)</span> from the University Bursary. This clearance allows access <span className="text-secondary font-bold underline decoration-[#D4AF37]/50 underline-offset-2">ONLY for first semester exams and activities</span>. To continue in the second semester, the remaining 50% balance must be fully paid. The student is cleared for accommodation and is assigned to stay in <b className="text-[#059669] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50 whitespace-nowrap">{hostelName}</b>.
                </>
              ) : (
                <>
                  Has successfully fulfilled all financial obligations for the <b className="text-secondary font-bold">{studentData.session}</b> Academic Session, including tuition fees, levies, and accommodation fees in respect of the Department of <b className="text-secondary font-bold">{studentData.programme ? studentData.programme.replace('B.Sc. ', '') : 'Computer Science'}</b>. Accordingly, the student is hereby declared <span className="text-[#059669] font-extrabold uppercase text-[12px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50 whitespace-nowrap">Cleared</span> from the University Bursary. The student is cleared for accommodation and is assigned to stay in <b className="text-[#059669] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50 whitespace-nowrap">{hostelName}</b>.
                </>
              )}
            </p>

            <p className="text-xs font-bold text-slate-800 tracking-wide uppercase mt-1">
              Total Bursary Fees Paid: <span className="text-primary font-mono font-black text-sm">₦{studentData.totalPaid?.toLocaleString()}</span>
            </p>
          </div>

          {/* Signatures & Verification Row */}
          <div className="grid grid-cols-3 gap-6 items-end border-t border-[#D4AF37]/20 pt-6">
            
            {/* Signature 1: Registrar */}
            <div className="flex flex-col items-center">
              <div className="h-10 flex items-center justify-center">
                <span className="font-serif italic text-lg text-slate-700 font-semibold">Adewale A. O.</span>
              </div>
              <div className="h-px bg-gray-300 w-36 my-1" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">University Registrar</span>
            </div>

            {/* Verification QR */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm w-16 h-16 flex items-center justify-center shrink-0">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`}
                  alt="Verification QR"
                  className="w-14 h-14"
                />
              </div>
              <span className="text-[7px] font-mono text-gray-500 font-bold block max-w-[180px] truncate" title={token}>
                {token}
              </span>
            </div>

            {/* Signature 2: Bursar */}
            <div className="flex flex-col items-center">
              <div className="h-10 flex items-center justify-center">
                <span className="font-serif italic text-lg text-slate-700 font-semibold">Folorunsho I. T.</span>
              </div>
              <div className="h-px bg-gray-300 w-36 my-1" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">University Bursar</span>
            </div>
          </div>
          
          {/* Tiny bottom detail */}
          <div className="flex justify-between items-center text-[8px] text-gray-400 font-semibold uppercase tracking-wider mt-4">
            <span>Date Issued: {dateIssued}</span>
            <span>Security Code: CU-BC-VERIFY-SECURE</span>
          </div>

        </div>
        {/* Printable Area ends */}
      </div>

    </div>
  );
}
