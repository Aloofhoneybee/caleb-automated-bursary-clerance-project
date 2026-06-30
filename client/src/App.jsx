import { useAuth } from './context/AuthContext';
import Login from './views/Login';
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import StudentDashboard from './views/StudentDashboard';
import AdminDashboard from './views/AdminDashboard';
import BursaryOfficerDashboard from './views/BursaryOfficerDashboard';
import CertificateView from './views/CertificateView';
import VerifyCertificate from './views/VerifyCertificate';
import ClearanceQueueView from './views/ClearanceQueueView';
import FeeManagementView from './views/FeeManagementView';
import UserManagementView from './views/UserManagementView';
import CheckoutModal from './components/CheckoutModal';
import DisputesView from './views/DisputesView';
import AdminLogsView from './views/AdminLogsView';
import { getMyClearanceStatus } from './api/clearance';
import { getMyTransactions } from './api/payments';
import { getAllFees } from './api/fees';
import { getMyNotifications } from './api/notifications';
import { getAllHostels } from './api/hostels';

import { 
  FeeStructureView, 
  PaymentHistoryView, 
  WalletView, 
  HelpCentreView, 
  FAQsView,
  NotificationsView,
  BiodataView
} from './views/SupportViews';

function App() {
 const { user, loading, logout } = useAuth();
const [currentRole, setRoleState] = useState('student'); // 'student', 'admin', 'officer'
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchVal, setSearchVal] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutAmt, setCheckoutAmt] = useState(125600);

  // Paystack verification state
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Global Student Profile State
  const [feeStructure, setFeeStructure] = useState(null);
  const [allFeeStructures, setAllFeeStructures] = useState([]);
  const [studentData, setStudentData] = useState({
    name: "",
    matricNo: "",
    programme: "",
    level: "",
    totalFees: 0,
    totalPaid: 0,
    outstanding: 0,
    clearanceStatus: "Not Cleared", // "Cleared", "Not Cleared", "Pending Review"
    clearanceScope: "none",
    session: ""
  });

  // Transactions ledger list
  const [transactions, setTransactions] = useState([]);

  // Admin/Officer Clearance Queue
  const [clearanceRequests, setClearanceRequests] = useState([]);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Hostels state
  const [hostelsList, setHostelsList] = useState([]);

  const fetchNotifications = () => {
    if (!user) return;
    setNotificationsLoading(true);
    getMyNotifications()
      .then((res) => {
        setNotifications(res.data || []);
      })
      .catch((err) => console.error('Failed to load notifications:', err))
      .finally(() => {
        setNotificationsLoading(false);
      });
  };

  const fetchHostels = () => {
    getAllHostels()
      .then((res) => {
        setHostelsList(res.data || []);
      })
      .catch((err) => console.error('Failed to load hostels list:', err));
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchHostels();
    } else {
      setNotifications([]);
      setHostelsList([]);
    }
  }, [user]);

  // Show loading spinner while checking auth
  // Sync Role state on load
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setRoleState('admin');
        setCurrentTab('admin-dashboard');
      } else if (user.role === 'staff') {
        setRoleState('officer');
        setCurrentTab('officer-dashboard');
      } else {
        setRoleState('student');
        setCurrentTab('dashboard');
      }
    }
  }, [user]);

  // Load student dynamic dashboard data
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    // Resolve hostel price dynamically
    const defaultHostelName = user.gender === 'Female' 
      ? 'Mary & Susanna Hall (Female Only) (Standard)'
      : 'Elisha Hall (Shared)';
    const selectedHostelName = user.hostel || defaultHostelName;
    const hostelObj = hostelsList.find(h => h.name === selectedHostelName);
    const hostelAmount = hostelObj ? hostelObj.amount : (user.gender === 'Female' ? 250000 : 270000);

    let feeTotal = 200000 + hostelAmount;
    let feeCat = '100 Level';

    // 1. Fetch Fee Structures
    getAllFees()
      .then((res) => {
        const fees = res.data || [];
        setAllFeeStructures(fees);
        let match = fees.find(f => 
          f.academicSession === user.academicSession && 
          f.department === (user.department || 'Computer Science') && 
          f.studentCategory === (user.level || '100 Level') &&
          f.isActive
        );
        if (!match) {
          match = fees.find(f => 
            f.academicSession === user.academicSession && 
            f.department === (user.department || 'Computer Science') && 
            f.isActive
          );
        }
        if (match) {
          setFeeStructure(match);
          feeTotal = match.totalAmount + hostelAmount;
          feeCat = match.studentCategory;
          setStudentData(prev => ({
            ...prev,
            totalFees: feeTotal,
            level: user.level || match.studentCategory || '100 Level'
          }));
        }
      })
      .catch((err) => console.error('Failed to load fees list:', err))
      .finally(() => {
        // 2. Fetch Transactions
        getMyTransactions()
          .then((res) => {
            const apiTransactions = res.data.map((tx) => ({
              description: tx.paystackReference.startsWith('OVR_')
                ? 'Bursar Manual Override'
                : `School Fees Payment (${tx.channel || 'Paystack'})`,
              ref: tx.paystackReference,
              amount: tx.amount,
              date: new Date(tx.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
              status: tx.status,
              type: 'credit',
            }));
            setTransactions(apiTransactions);

            const totalPaid = res.data
              .filter(t => t.status === 'success')
              .reduce((sum, t) => sum + t.amount, 0);

            // 3. Fetch Clearance Status
            getMyClearanceStatus()
              .then((clearanceRes) => {
                const clearance = clearanceRes.data;
                setStudentData(prev => ({
                  ...prev,
                  name: user.fullName,
                  matricNo: user.matricNumber,
                  programme: user.department || 'Computer Science',
                  session: user.academicSession,
                  level: user.level || prev.level || '100 Level',
                  clearanceStatus: clearance.status === 'cleared'
                    ? 'Cleared'
                    : clearance.status === 'pending_review'
                    ? 'Pending Review'
                    : 'Not Cleared',
                  clearanceScope: clearance.scope || 'none',
                  totalPaid: totalPaid,
                  outstanding: Math.max(0, feeTotal - totalPaid),
                  verificationToken: clearance.verificationToken,
                  clearedAt: clearance.clearedAt,
                }));
              })
              .catch(() => {
                // No clearance record found yet
                setStudentData(prev => ({
                  ...prev,
                  name: user.fullName,
                  matricNo: user.matricNumber,
                  programme: user.department || 'Computer Science',
                  session: user.academicSession,
                  level: user.level || prev.level || '100 Level',
                  clearanceStatus: 'Not Cleared',
                  clearanceScope: 'none',
                  totalPaid: totalPaid,
                  outstanding: Math.max(0, feeTotal - totalPaid)
                }));
              });
          })
          .catch(() => {});
      });
  }, [user, refreshTrigger, hostelsList]);

  // Intercept and handle payment verification callback redirect from Paystack
  useEffect(() => {
    if (window.location.pathname === '/payment/verify') {
      const params = new URLSearchParams(window.location.search);
      const reference = params.get('reference') || params.get('trxref');
      
      if (reference) {
        setCurrentTab('verify-payment');
        
        if (loading || !user) return;

        if (user.role !== 'student') {
          setVerificationResult({
            success: false,
            message: 'Only student accounts can verify payment references.'
          });
          return;
        }

        setVerifyingPayment(true);
        setVerificationResult(null);

        import('./api/payments')
          .then(({ verifyPayment }) => verifyPayment(reference))
          .then((res) => {
            setVerificationResult({
              success: true,
              message: res.message || 'Your payment was successfully verified and your clearance is updated!'
            });
            setRefreshTrigger(prev => prev + 1);
            fetchNotifications();
            setTimeout(() => {
              window.history.replaceState({}, document.title, '/');
              setCurrentTab('payments');
            }, 3000);
          })
          .catch((err) => {
            setVerificationResult({
              success: false,
              message: err.message || 'Payment verification failed. If you were debited, please contact the Bursary.'
            });
            setTimeout(() => {
              window.history.replaceState({}, document.title, '/');
            }, 5000);
          })
          .finally(() => {
            setVerifyingPayment(false);
          });
      }
    }
  }, [user, loading]);
if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Show login if not authenticated
if (!user) {
   return (
    <Login
      onLogin={(userData) => {
        if (userData.role === 'admin') setRoleState('admin');
        else if (userData.role === 'staff') setRoleState('officer');
        else setRoleState('student');
      }}
    />
  );
}

  // Handle Role Switching and reset tabs
  const setRole = (role) => {
    setRoleState(role);
    if (role === 'student') {
      setCurrentTab('dashboard');
    } else if (role === 'admin') {
      setCurrentTab('admin-dashboard');
    } else {
      setCurrentTab('officer-dashboard');
    }
  };

  // Paystack checkout transaction success callback
  const handlePaymentSuccess = (amountPaid) => {
    const newPaid = studentData.totalPaid + amountPaid;
    const newOutstanding = Math.max(0, studentData.totalFees - newPaid);
    const newStatus = newOutstanding <= 0 ? "Cleared" : "Not Cleared";

    setStudentData(prev => ({
      ...prev,
      totalPaid: newPaid,
      outstanding: newOutstanding,
      clearanceStatus: newStatus
    }));

    const txRef = "TXN_" + Math.floor(100000000 + Math.random() * 900000000);
    setTransactions(prev => [
      {
        description: "School Fees Online Payment",
        ref: txRef,
        amount: amountPaid,
        date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        status: "success",
        type: "credit"
      },
      ...prev
    ]);
  };

  // Handlers for manual evidence, overrides, and staff clearance requests removed (out of scope)

  const triggerPaystackCheckout = (amountToPay) => {
    setCheckoutAmt(amountToPay);
    setCheckoutOpen(true);
  };

  // Routing Switchboard
  const renderView = () => {
    // Shared View (Verify Certificate)
    if (currentTab === 'verify') {
      return <VerifyCertificate studentData={studentData} />;
    }

    // Role: Student
    if (currentRole === 'student') {
      switch (currentTab) {
        case 'verify-payment':
          return (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center max-w-[600px] mx-auto space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
              {verifyingPayment ? (
                <div className="py-8 space-y-6">
                  {/* Premium Spinner */}
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-secondary">Verifying Secure Payment</h2>
                    <p className="text-xs text-gray-500">Checking your payment status with Paystack. Please do not close or refresh this page.</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-6">
                  {verificationResult?.success ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100 animate-bounce">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-emerald-600">Payment Verified Successfully!</h2>
                        <p className="text-xs text-gray-600 px-4">{verificationResult.message}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-rose-600">Verification Failed</h2>
                        <p className="text-xs text-rose-500 font-semibold px-4">{verificationResult?.message || 'We could not verify your payment transaction. Please contact Bursary support.'}</p>
                      </div>
                    </>
                  )}
                  
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        window.history.replaceState({}, document.title, '/');
                        setCurrentTab('dashboard');
                      }}
                      className="h-11 px-8 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/10 inline-flex items-center gap-2"
                    >
                      Return to Dashboard
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        case 'dashboard':
          return (
            <StudentDashboard 
              studentData={{ ...studentData, gender: user?.gender || 'Male' }} 
              transactions={transactions} 
              feeStructure={feeStructure}
              openCheckout={(amt) => triggerPaystackCheckout(amt !== undefined ? amt : studentData.outstanding)} 
              setCurrentTab={setCurrentTab}
              hostelsList={hostelsList}
              refreshDashboard={() => setRefreshTrigger(prev => prev + 1)}
            />
          );
        case 'fee-structure':
          return <FeeStructureView feeStructure={feeStructure} allFees={allFeeStructures} studentGender={user?.gender || 'Male'} hostelsList={hostelsList} />;
        case 'payments':
          return (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center max-w-[600px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold text-secondary">Make school fees payment online</h2>
              <p className="text-xs text-gray-500">Fast, secure payment integration via Paystack checkout.</p>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex justify-between items-center max-w-[320px] mx-auto text-sm font-bold text-slate-800">
                <span>Outstanding Balance:</span>
                <span className="text-red-500">₦{studentData.outstanding.toLocaleString()}</span>
              </div>
              <button
                disabled={studentData.outstanding <= 0}
                onClick={() => triggerPaystackCheckout(studentData.outstanding)}
                className={`h-11 px-6 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  studentData.outstanding <= 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-primary hover:bg-primary-dark text-white shadow-primary/10'
                }`}
              >
                {studentData.outstanding <= 0 ? 'Fees Fully Settled' : 'Initiate Checkout'}
              </button>
            </div>
          );
        case 'history':
          return <PaymentHistoryView transactions={transactions} />;
        case 'wallet':
          return <WalletView studentData={studentData} openCheckout={triggerPaystackCheckout} />;
        case 'clearance':
          return (
            <div className="space-y-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Clearance Progress Tracker</h1>
                <p className="text-xs text-gray-500 mt-1">Track departmental, hostel, and bursary clearance checks.</p>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-6 max-w-[600px] mx-auto">
                <div className="relative border-l-2 border-primary-light pl-6 ml-4 space-y-6">
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white border-4 border-white shadow-sm font-bold text-[10px]">✓</div>
                    <h4 className="text-[13px] font-bold text-slate-800">Departmental Clearance</h4>
                    <p className="text-[11px] text-gray-400">Library and faculty audits approved</p>
                  </div>
                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-[35px] w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white border-4 border-white shadow-sm font-bold text-[10px]">✓</div>
                    <h4 className="text-[13px] font-bold text-slate-800">Hostel & Student Affairs</h4>
                    <p className="text-[11px] text-gray-400">Hall checkouts and medical validations complete</p>
                  </div>
                  {/* Step 3 */}
                  <div className="relative">
                    <div className={`absolute -left-[35px] w-6 h-6 rounded-full flex items-center justify-center text-white border-4 border-white shadow-sm font-bold text-[10px] ${
                      studentData.clearanceStatus === 'Cleared' 
                        ? 'bg-primary' 
                        : 'bg-gray-300'
                    }`}>
                      {studentData.clearanceStatus === 'Cleared' ? '✓' : '3'}
                    </div>
                    <h4 className="text-[13px] font-bold text-slate-800">Bursary Clearance</h4>
                    <p className="text-[11px] text-gray-400">
                      {studentData.clearanceStatus === 'Cleared' 
                        ? 'School fees paid and approved' 
                        : 'Outstanding balance payment required.'}
                    </p>
                  </div>
                </div>

                {studentData.clearanceStatus === 'Cleared' && (
                  <div className="pt-4 border-t border-gray-100 text-center">
                    <button
                      onClick={() => setCurrentTab('certificate')}
                      className="h-10 px-5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Clearance Certificate
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        case 'certificate':
          return <CertificateView studentData={studentData} />;
        case 'help':
          return <HelpCentreView />;
        case 'faqs':
          return <FAQsView />;
        case 'notifications':
          return (
            <NotificationsView 
              currentRole={currentRole} 
              notifications={notifications}
              loading={notificationsLoading}
              onRefresh={fetchNotifications}
              setNotifications={setNotifications}
            />
          );
        case 'biodata':
          return <BiodataView currentRole={currentRole} />;
        default:
          return <StudentDashboard studentData={studentData} transactions={transactions} openCheckout={(amt) => triggerPaystackCheckout(amt !== undefined ? amt : studentData.outstanding)} setCurrentTab={setCurrentTab} />;
      }
    }

    // Role: Admin
    if (currentRole === 'admin') {
      switch (currentTab) {
        case 'admin-dashboard':
          return (
            <AdminDashboard />
          );
        case 'admin-users':
          return (
            <UserManagementView />
          );
        case 'admin-fees':
          return (
            <FeeManagementView />
          );
        case 'admin-logs':
          return <AdminLogsView />;
        case 'admin-gateway':
          return (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center max-w-[600px] mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-xl font-bold text-secondary">API Payment Gateway Integrations</h2>
              <p className="text-xs text-gray-500">Verify and monitor API keys, checkout endpoints and webhook configurations for Caleb University collections.</p>
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-2 text-left text-xs text-slate-800">
                <div className="flex justify-between"><span>Integration Provider:</span><span className="font-bold">Paystack Business Dashboard</span></div>
                <div className="flex justify-between"><span>API Environment:</span><span className="font-bold text-orange-600 font-mono">SANDBOX_TEST</span></div>
                <div className="flex justify-between"><span>Callback Webhook:</span><span className="font-mono text-gray-400 text-[10px] break-all">https://api.caleb.edu.ng/bursary/v1/paystack-webhook</span></div>
              </div>
              <button
                onClick={() => alert("Re-pinging Paystack webhook servers... Status 200 OK.")}
                className="h-10 px-5 bg-secondary hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Ping Gateway Webhooks
              </button>
            </div>
          );
        case 'notifications':
          return (
            <NotificationsView 
              currentRole={currentRole} 
              notifications={notifications}
              loading={notificationsLoading}
              onRefresh={fetchNotifications}
              setNotifications={setNotifications}
            />
          );
        case 'biodata':
          return <BiodataView currentRole={currentRole} />;
        default:
          return <AdminDashboard />;
      }
    }

    // Role: Bursary Officer
    if (currentRole === 'officer') {
      switch (currentTab) {
        case 'officer-dashboard':
          return (
            <BursaryOfficerDashboard />
          );
        case 'officer-override':
          return (
            <ClearanceQueueView currentRole={currentRole} />
          );
        case 'officer-disputes':
          return <DisputesView />;
        case 'notifications':
          return (
            <NotificationsView 
              currentRole={currentRole} 
              notifications={notifications}
              loading={notificationsLoading}
              onRefresh={fetchNotifications}
              setNotifications={setNotifications}
            />
          );
        case 'biodata':
          return <BiodataView currentRole={currentRole} />;
        default:
          return <BursaryOfficerDashboard />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex text-slate-800 antialiased select-none">
      
      {/* Sidebar Navigation */}
      <div className="hidden lg:block">
        <Sidebar 
          currentRole={currentRole} 
          currentTab={currentTab} 
          setCurrentTab={setCurrentTab} 
          setRole={setRole}
          studentData={studentData}
        />
      </div>

      {/* Main Content Area wrapper */}
      <div className="flex-1 min-w-0 lg:pl-[280px] flex flex-col min-h-screen">
        
        {/* Top sticky navigation bar */}
        <Topbar 
          currentRole={currentRole} 
          studentData={studentData} 
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          setCurrentTab={setCurrentTab}
          hasUnread={notifications.some(n => n.unread)}
        />

        {/* Content body padding */}
        <main className="flex-grow p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {renderView()}
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-gray-200 bg-white px-8 text-center text-[11px] text-gray-400 font-medium tracking-wide uppercase no-print">
          2026 © Okorie Richard. All rights reserved.
        </footer>
      </div>

      {/* Paystack checkout popup */}
      <CheckoutModal 
        isOpen={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        amount={checkoutAmt} 
        studentCategory={studentData.level}
      />

      {/* Modals */}

      {/* Drawer Sidebar for Mobile view */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden select-none">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          
          {/* Sidebar container */}
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white animate-in slide-in-from-left duration-250 flex flex-col justify-between">
            <Sidebar 
              currentRole={currentRole} 
              currentTab={currentTab} 
              setCurrentTab={(tab) => {
                setCurrentTab(tab);
                setMobileSidebarOpen(false);
              }} 
              setRole={(r) => {
                setRole(r);
                setMobileSidebarOpen(false);
              }}
              studentData={studentData}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
