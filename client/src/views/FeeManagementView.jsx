import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Building2,
  Calculator, 
  Plus, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  Pencil, 
  Trash2, 
  X,
  Layers,
  GraduationCap,
  Calendar,
  GripVertical,
  Save
} from 'lucide-react';
import { getAllFees, createFeeStructure, updateFeeStructure, deleteFeeStructure } from '../api/fees';
import { getAllHostels, updateHostelRate } from '../api/hostels';

// --- Reusable Premium UI Components ---

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[24px] border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.02)] p-6 md:p-8 transition-all ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, colorClass = 'text-primary bg-primary-light' }) => (
  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex items-center justify-between hover:-translate-y-0.5 transition-all duration-200">
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{title}</span>
      <h3 className="text-xl font-bold text-slate-900 tracking-tight">{value}</h3>
    </div>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass} shrink-0`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

export default function FeeManagementView({ setCurrentTab }) {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState([]);
  const [hostels, setHostels] = useState([]);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFeeForEdit, setSelectedFeeForEdit] = useState(null);

  // Form states
  const [academicSession, setAcademicSession] = useState('2025/2026');
  const [department, setDepartment] = useState('Computer Science');
  const [studentCategory, setStudentCategory] = useState('100 Level');
  const [feeItems, setFeeItems] = useState([
    { description: 'Program Related Fees', amount: 1380000 },
    { description: 'Other Fees', amount: 270000 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadFees = () => {
    setLoading(true);
    getAllFees()
      .then((res) => {
        setFees(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch fees structures:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadHostels = () => {
    getAllHostels()
      .then((res) => {
        setHostels(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch hostels list:', err);
      });
  };

  useEffect(() => {
    loadFees();
    loadHostels();
  }, []);

  const handleToggleActive = (id, currentStatus) => {
    updateFeeStructure(id, { isActive: !currentStatus })
      .then(() => {
        loadFees();
      })
      .catch((err) => {
        alert(err.message || 'Failed to toggle status');
      });
  };

  const handleAddItem = () => {
    setFeeItems([...feeItems, { description: '', amount: 0 }]);
  };

  const handleRemoveItem = (idx) => {
    setFeeItems(feeItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    const updated = feeItems.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          [field]: field === 'amount' ? parseFloat(value) || 0 : value
        };
      }
      return item;
    });
    setFeeItems(updated);
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (feeItems.length === 0) {
      alert('Must include at least one fee component');
      return;
    }
    
    // Ensure all items have description and amount
    const invalid = feeItems.some(i => !i.description.trim() || i.amount <= 0);
    if (invalid) {
      alert('All fee components must have a description and a positive amount');
      return;
    }

    setSubmitting(true);

    const payload = {
      academicSession,
      department,
      studentCategory,
      feeItems,
    };

    if (selectedFeeForEdit) {
      // Edit
      updateFeeStructure(selectedFeeForEdit._id, { feeItems, department, academicSession, studentCategory })
        .then(() => {
          alert('Fee structure updated successfully');
          handleCloseModal();
          loadFees();
        })
        .catch((err) => {
          alert(err.message || 'Failed to update fee structure');
        })
        .finally(() => {
          setSubmitting(false);
        });
    } else {
      // Create
      createFeeStructure(payload)
        .then(() => {
          alert('Fee structure created successfully');
          handleCloseModal();
          loadFees();
        })
        .catch((err) => {
          alert(err.message || 'Failed to create fee structure');
        })
        .finally(() => {
          setSubmitting(false);
        });
    }
  };

  const handleOpenEdit = (fee) => {
    setSelectedFeeForEdit(fee);
    setAcademicSession(fee.academicSession);
    setDepartment(fee.department || 'Computer Science');
    setStudentCategory(fee.studentCategory);
    setFeeItems(fee.feeItems.map(i => ({ description: i.description, amount: i.amount })));
    setShowCreateModal(true);
  };

  const handleCriteriaChange = (newDept, newLevel, newSession) => {
    setDepartment(newDept);
    setStudentCategory(newLevel);
    setAcademicSession(newSession);
    
    // Find matching fee structure for this department, level, and session
    const match = fees.find(f => 
      f.department?.toLowerCase() === newDept?.toLowerCase() && 
      f.studentCategory === newLevel && 
      f.academicSession === newSession
    );
    
    if (match) {
      setSelectedFeeForEdit(match);
      setFeeItems(match.feeItems.map(i => ({ description: i.description, amount: i.amount })));
    } else {
      setSelectedFeeForEdit(null);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setSelectedFeeForEdit(null);
    // Reset defaults
    setAcademicSession('2025/2026');
    setDepartment('Computer Science');
    setStudentCategory('100 Level');
    setFeeItems([
      { description: 'Program Related Fees', amount: 1380000 },
      { description: 'Other Fees', amount: 270000 }
    ]);
  };

  const handleDeleteFee = (id) => {
    if (window.confirm('Are you sure you want to delete this department fee structure? This action cannot be undone.')) {
      deleteFeeStructure(id)
        .then(() => {
          alert('Fee structure deleted successfully');
          loadFees();
        })
        .catch((err) => {
          alert(err.message || 'Failed to delete fee structure');
        });
    }
  };

  // Helper to map department names to beautiful initials and styles
  const getDeptAvatar = (deptName) => {
    const mapping = {
      'Computer Science': { text: 'CS', bg: 'bg-blue-50 text-blue-600 border-blue-100' },
      'Mass Communication': { text: 'MC', bg: 'bg-purple-50 text-purple-600 border-purple-100' },
      'Law': { text: 'LW', bg: 'bg-rose-50 text-rose-600 border-rose-100' },
      'Microbiology': { text: 'MB', bg: 'bg-teal-50 text-teal-600 border-teal-100' },
      'Accounting': { text: 'AC', bg: 'bg-amber-50 text-amber-600 border-amber-100' },
      'Architecture': { text: 'AR', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
    };
    return mapping[deptName] || { text: deptName?.substring(0, 2).toUpperCase() || 'UN', bg: 'bg-slate-50 text-slate-600 border-slate-100' };
  };

  const departmentsList = ['Computer Science', 'Mass Communication', 'Law', 'Microbiology', 'Accounting', 'Architecture'];
  const categoriesList = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate'];
  const sessionsList = ['2024/2025', '2025/2026', '2026/2027'];

  // Global metrics derived dynamically
  const uniqueDepts = Array.from(new Set(fees.map(f => f.department)));
  const totalBilledActive = fees
    .filter(f => f.isActive)
    .reduce((sum, f) => sum + f.totalAmount, 0);

  // Sort fees by level lowest to highest (100 Level, 200 Level, etc.)
  const getLevelRank = (level) => {
    if (!level) return 999;
    const match = level.match(/^(\d+)/);
    if (match) return parseInt(match[1], 10);
    if (level.toLowerCase().includes('postgrad')) return 1000;
    return 999;
  };

  const sortedFees = [...fees].sort((a, b) => {
    const rankA = getLevelRank(a.studentCategory);
    const rankB = getLevelRank(b.studentCategory);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const deptA = a.department || '';
    const deptB = b.department || '';
    if (deptA !== deptB) {
      return deptA.localeCompare(deptB);
    }
    return b.academicSession.localeCompare(a.academicSession);
  });

  if (loading && fees.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-semibold">Loading fee structure schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Responsive Row Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* --- FEE CONFIGURATION --- */}
        <Card className="flex-1 lg:flex-[1.7] w-full">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Calculator className="w-5 h-5" />
                </div>
                <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">Fee Configuration</h2>
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                Configure, modify, and activate departmental schedules of fees and billing criteria.
              </p>
            </div>
            
            <button
              onClick={() => {
                setSelectedFeeForEdit(null);
                setShowCreateModal(true);
              }}
              className="h-11 px-5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-primary/10 flex items-center gap-1.5 shrink-0 self-start sm:self-center hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Configure New Fees
            </button>
          </div>

          {/* Table of Fee Schedules */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200">
                    <th className="pl-3.5 pr-4 py-4">Department</th>
                    <th className="px-6 py-4">Level</th>
                    <th className="px-6 py-4">Session</th>
                    <th className="px-6 py-4 text-right">Total Billed</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fees.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-xs text-slate-400 font-semibold">
                        No active fee structures found. Click "+ Configure New Fees" to create one.
                      </td>
                    </tr>
                  ) : (
                    sortedFees.map((fee) => {
                      const avatar = getDeptAvatar(fee.department);
                      return (
                        <tr key={fee._id} className="hover:bg-slate-50/50 transition-colors duration-150 group">
                          {/* Department Info with avatar */}
                          <td className="pl-3.5 pr-4 py-4.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${avatar.bg}`}>
                                {avatar.text}
                              </div>
                              <span className="font-bold text-slate-800 tracking-tight capitalize block">
                                {fee.department || 'Computer Science'}
                              </span>
                            </div>
                          </td>

                          {/* Level */}
                          <td className="px-6 py-4.5 text-slate-600 font-medium whitespace-nowrap">
                            {fee.studentCategory}
                          </td>

                          {/* Session */}
                          <td className="px-6 py-4.5 text-slate-500 font-semibold font-mono whitespace-nowrap">
                            {fee.academicSession}
                          </td>

                          {/* Total Billed */}
                          <td className="px-6 py-4.5 text-right font-extrabold text-slate-900 font-mono">
                            ₦{fee.totalAmount.toLocaleString()}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4.5 text-center">
                            <button
                              onClick={() => handleToggleActive(fee._id, fee.isActive)}
                              className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full border transition-all uppercase tracking-wide cursor-pointer ${
                                fee.isActive
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                  : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}
                            >
                              {fee.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEdit(fee)}
                                className="h-8 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 hover:text-slate-850 cursor-pointer whitespace-nowrap"
                              >
                                <Pencil className="w-3 h-3 text-slate-400" />
                                Edit Items
                              </button>
                              <button
                                onClick={() => handleDeleteFee(fee._id)}
                                className="h-8 w-8 border border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-rose-600 rounded-lg transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                title="Delete fee structure"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Statistics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
            <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Departments</span>
              <span className="text-xl font-bold text-slate-800 mt-1">{uniqueDepts.length}</span>
            </div>
            <div className="p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Billed Across Active Departments</span>
              <span className="text-xl font-black text-emerald-800 mt-1 font-mono">₦{totalBilledActive.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* --- HOSTEL FEE MANAGEMENT --- */}
        <Card className="flex-1 lg:flex-[1] w-full">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#ECFDF5] text-[#059669] rounded-xl border border-emerald-100">
                  <Building className="w-5 h-5" />
                </div>
                <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">Hostel Fee Management</h2>
              </div>
              <p className="text-xs text-slate-500">
                Configure and update hostel fee structures, accommodation rates and metrics.
              </p>
            </div>
          </div>
          {/* Hostel Summary Table */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hostel Summary</h3>
            <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-[10.5px] lg:text-[11px]">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200">
                    <th className="px-4 py-2.5">Hostel Name</th>
                    <th className="px-4 py-2.5 text-right pr-[28px]">Rate/Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hostels.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-800 capitalize whitespace-nowrap">{row.name}</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-slate-900 font-mono whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <span>₦{row.amount.toLocaleString()}</span>
                          <button
                            onClick={() => {
                              const newRate = window.prompt(`Enter new fee rate for ${row.name}:`, row.amount);
                              if (newRate !== null) {
                                const amt = parseFloat(newRate);
                                if (isNaN(amt) || amt < 0) {
                                  alert('Please enter a rate amount.');
                                  return;
                                }
                                updateHostelRate(row._id, amt)
                                  .then(() => {
                                    alert('Hostel rate updated successfully.');
                                    loadHostels();
                                  })
                                  .catch((err) => {
                                    alert(err.message || 'Failed to update hostel rate.');
                                  });
                              }
                            }}
                            className="p-1 text-[#059669] hover:bg-emerald-50 rounded border border-transparent hover:border-emerald-100 cursor-pointer inline-flex items-center"
                            title="Edit Hostel Fee Rate"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

      </div>

      {/* --- CONFIGURE/EDIT FEE STRUCTURE MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-[24px] border border-slate-200 w-full shadow-[0_20px_50px_rgba(15,23,42,0.12)] p-6 md:p-8 relative flex flex-col space-y-6 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
            style={{ width: '720px', maxWidth: '95vw' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3.5">
                <div 
                  className="w-12 h-12 rounded-[14px] bg-[#ECFDF5] text-[#059669] flex items-center justify-center border border-[#A7F3D0]/20 shrink-0"
                >
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xl md:text-2xl font-extrabold text-[#0F172A] tracking-tight leading-tight">
                    {selectedFeeForEdit ? department : 'Configure New Fees'}
                  </h3>
                  <p className="text-xs md:text-sm text-[#64748B] font-medium">
                    {selectedFeeForEdit 
                      ? 'Configure fee components and amounts for this department.' 
                      : 'Create a new fee structure configuration for a department level.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-10 h-10 bg-[#F8FAFC] hover:bg-[#FEF2F2] border border-[#E2E8F0] text-slate-500 hover:text-red-500 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Department Information Grid */}
              <div className={`grid grid-cols-1 ${selectedFeeForEdit ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
                {/* Department Selection (only shown when creating a new structure) */}
                {!selectedFeeForEdit && (
                  <div className="space-y-1.5">
                    <label className="text-[12px] md:text-[13px] font-bold text-[#64748B] block">
                      Department
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Building2 className="w-4.5 h-4.5" />
                      </div>
                      <select
                        value={department}
                        onChange={(e) => handleCriteriaChange(e.target.value, studentCategory, academicSession)}
                        className="w-full h-[50px] rounded-[12px] border border-[#D9E2EC] bg-white pl-10 pr-8 text-[15px] font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all cursor-pointer appearance-none"
                      >
                        {departmentsList.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Academic Level Selection */}
                <div className="space-y-1.5">
                  <label className="text-[12px] md:text-[13px] font-bold text-[#64748B] block">
                    Academic Level
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <GraduationCap className="w-4.5 h-4.5" />
                    </div>
                    <select
                      value={studentCategory}
                      onChange={(e) => handleCriteriaChange(department, e.target.value, academicSession)}
                      className="w-full h-[50px] rounded-[12px] border border-[#D9E2EC] bg-white pl-10 pr-8 text-[15px] font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all cursor-pointer appearance-none"
                    >
                      {categoriesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {/* Academic Session Selection */}
                <div className="space-y-1.5">
                  <label className="text-[12px] md:text-[13px] font-bold text-[#64748B] block">
                    Academic Session
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <select
                      value={academicSession}
                      onChange={(e) => handleCriteriaChange(department, studentCategory, e.target.value)}
                      className="w-full h-[50px] rounded-[12px] border border-[#D9E2EC] bg-white pl-10 pr-8 text-[15px] font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all cursor-pointer appearance-none font-mono"
                    >
                      {sessionsList.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-[#E5E7EB] my-0.5" />

              {/* Fee Components Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] md:text-[13px] font-extrabold text-[#64748B] uppercase tracking-wider block">
                    FEE COMPONENTS & ITEMS
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[13px] md:text-[14px] text-[#059669] hover:text-[#047857] font-bold flex items-center gap-1 transition-all cursor-pointer bg-transparent border-none active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Add Item Row
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1.5 py-1">
                  {feeItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center animate-in fade-in duration-200">
                      {/* Drag Handle placeholder */}
                      <div className="w-8 flex justify-center text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-600 transition-colors">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* Item description */}
                      <input
                        type="text"
                        placeholder="Item description (e.g. Program Related Fees)"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-1 h-[50px] rounded-[12px] border border-[#D9E2EC] bg-white px-3.5 text-[15px] font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all"
                        required
                      />

                      {/* Currency Input container */}
                      <div className="relative w-[28%] shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-slate-400 select-none">₦</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={item.amount || ''}
                          onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                          className="w-full h-[50px] rounded-[12px] border border-[#D9E2EC] bg-white pl-8 pr-3.5 text-[15px] font-mono font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all"
                          required
                        />
                      </div>

                      {/* Delete Action button */}
                      {feeItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="w-12 h-[50px] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-transparent hover:border-red-100 text-[#EF4444] rounded-[12px] flex items-center justify-center cursor-pointer transition-all shrink-0 hover:scale-105 active:scale-95"
                          title="Delete row"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculated Structure Cost Banner */}
              <div 
                className="h-[74px] bg-[#F0FDF4] border border-[#BBF7D0] rounded-[14px] flex items-center justify-between px-5 shadow-sm select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#DCFCE7] text-[#059669] rounded-[10px] flex items-center justify-center shrink-0">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <span className="text-sm md:text-[15px] font-bold text-[#059669]">
                    Total Calculated Structure Cost
                  </span>
                </div>
                <span className="text-[26px] md:text-[30px] font-extrabold text-[#059669] font-mono">
                  ₦{calculateTotal(feeItems).toLocaleString()}
                </span>
              </div>

              {/* Submit / Publish Action Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[52px] bg-[#059669] hover:bg-[#047857] disabled:bg-slate-300 text-white rounded-[12px] text-[16px] font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-[#059669]/10"
              >
                <Save className="w-4.5 h-4.5" />
                {submitting ? 'Saving and publishing changes...' : 'Save and Publish Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
