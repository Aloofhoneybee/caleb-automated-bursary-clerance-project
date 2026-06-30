import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentRole, currentTab, setCurrentTab, setRole, studentData }) {
  const { user } = useAuth();
  const isStudent = currentRole === 'student';
  const isAdmin = currentRole === 'admin';
  const isOfficer = currentRole === 'officer';

  const formatStudentName = (name) => {
    if (!name) return '';
    let lastName = '';
    let firstName = '';

    if (name.includes(',')) {
      const parts = name.split(',');
      lastName = parts[0].trim();
      firstName = parts[1].trim();
    } else {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      } else {
        lastName = name;
      }
    }

    const capLastName = lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : '';
    const capFirstName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : '';

    return capFirstName ? `${capLastName} ${capFirstName}` : capLastName;
  };

  const rawName = user?.fullName || (isStudent ? studentData.name : isOfficer ? 'Bursary Officer' : 'System Admin');
  const displayName = isStudent ? formatStudentName(rawName) : rawName;
  const displaySub = isStudent ? (user?.matricNumber || studentData.matricNo) : isOfficer ? 'Dept of Finance' : 'IT Administrator';
  const avatarInitials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Navigation items based on role
  const getNavGroups = () => {
    if (isStudent) {
      return [
        {
          group: 'MAIN',
          items: [
            { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' }
          ]
        },
        {
          group: 'BURSARY',
          items: [
            { id: 'fee-structure', label: 'Fee Structure', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
            { id: 'payments', label: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
            { id: 'history', label: 'Payment History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
          ]
        },
        {
          group: 'CLEARANCE',
          items: [
            { id: 'clearance', label: 'My Clearance', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { id: 'certificate', label: 'Clearance Certificate', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' },
            { id: 'verify', label: 'Verify Certificate', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
          ]
        },
        {
          group: 'SUPPORT',
          items: [
            { id: 'help', label: 'Help Centre', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
            { id: 'faqs', label: 'FAQs', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
          ]
        }
      ];
    } else if (isAdmin) {
      return [
        {
          group: 'ADMIN MAIN',
          items: [
            { id: 'admin-dashboard', label: 'Overview Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
            { id: 'admin-users', label: 'Manage Accounts', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
          ]
        },
        {
          group: 'WORKFLOW & AUDITS',
          items: [
            { id: 'admin-fees', label: 'Manage Fee Structures', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
            { id: 'admin-logs', label: 'Recent Activity Logs', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { id: 'admin-gateway', label: 'Gateway & Integrations', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
          ]
        }
      ];
    } else { // Bursary Officer
      return [
        {
          group: 'OFFICER TASKS',
          items: [
            { id: 'officer-dashboard', label: 'Officer Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
            { id: 'officer-disputes', label: 'Disputes & Refused', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
          ]
        },
        {
          group: 'CLEARANCE',
          items: [
            { id: 'verify', label: 'Verify Certificate', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
          ]
        },
        {
          group: 'MANUAL OVERRIDE',
          items: [
            { id: 'officer-override', label: 'Manual Override Queue', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' }
          ]
        }
      ];
    }
  };

  const navGroups = getNavGroups();

  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 h-screen fixed top-0 left-0 flex flex-col justify-between z-30 select-none">
      <div className="flex-1 overflow-y-auto">
        {/* Sidebar Header with original rectangular logo */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <img 
              src="/cul_logo_rect.png" 
              alt="Caleb University Logo" 
              className="h-14 w-auto object-contain"
            />
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="px-4 pb-6 space-y-6 mt-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <h3 className="px-4 text-[10px] font-bold text-gray-400 tracking-[0.15em] uppercase mb-2">
                {group.group}
              </h3>
              {group.items.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 h-[48px] rounded-xl transition-all duration-200 group text-left ${
                      isActive
                        ? 'bg-primary-light text-primary font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-normal'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={isActive ? "2" : "1.75"}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    <span className="text-[13px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-gray-200 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center font-bold text-primary text-sm shrink-0 uppercase border border-primary/10">
            {avatarInitials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[12px] font-bold text-gray-900 truncate">
              {displayName}
            </h4>
            <p className="text-[10px] text-gray-500 truncate">
              {displaySub}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
