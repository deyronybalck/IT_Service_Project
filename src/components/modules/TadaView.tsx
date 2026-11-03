import React, { useState, useEffect } from 'react';
import { Plus, Check, X, DollarSign, Receipt, AlertCircle, Calendar, ArrowRight, User } from 'lucide-react';
import { TADAClaim, ServiceSchedule } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const TadaView: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<TADAClaim[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedClaimForReview, setSelectedClaimForReview] = useState<TADAClaim | null>(null);

  // Claim Form State
  const [claimForm, setClaimForm] = useState({
    schedule_id: '',
    customer_or_institution: '',
    travel_date: new Date().toISOString().split('T')[0],
    from_location: 'Paltan Main Office',
    to_location: '',
    transport_expense: 0,
    food_allowance: 0,
    daily_allowance: 0,
    other_expense: 0,
    explanation: '',
    attachment_name: '',
  });

  const totalCalculated =
    Number(claimForm.transport_expense) +
    Number(claimForm.food_allowance) +
    Number(claimForm.daily_allowance) +
    Number(claimForm.other_expense);

  const loadData = async () => {
    setLoading(true);
    try {
      const [claimList, schList] = await Promise.all([
        api.getTadaClaims({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        api.getSchedules(),
      ]);
      setClaims(claimList);
      setSchedules(schList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSelectSchedule = (schId: string) => {
    const s = schedules.find((sch) => sch.id === schId);
    if (s) {
      setClaimForm({
        ...claimForm,
        schedule_id: s.id,
        customer_or_institution: s.customer_name,
        travel_date: s.schedule_date,
        to_location: s.location_address,
      });
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTadaClaim(claimForm);
      setShowNewModal(false);
      setClaimForm({
        schedule_id: '',
        customer_or_institution: '',
        travel_date: new Date().toISOString().split('T')[0],
        from_location: 'Paltan Main Office',
        to_location: '',
        transport_expense: 0,
        food_allowance: 0,
        daily_allowance: 0,
        other_expense: 0,
        explanation: '',
        attachment_name: '',
      });
      loadData();
    } catch (err: any) {
      alert(`Error submitting claim: ${err.message}`);
    }
  };

  const handleReviewDecision = async (claimId: string, status: 'Approved' | 'Rejected') => {
    const remarks = prompt(`Enter review remarks for ${status}:`);
    if (remarks === null) return;
    try {
      await api.reviewTadaClaim(claimId, { status, review_remarks: remarks });
      loadData();
    } catch (err: any) {
      alert(`Error reviewing claim: ${err.message}`);
    }
  };

  const handleMarkPaid = async (claimId: string) => {
    if (!confirm('Disburse payment for this approved TA/DA claim?')) return;
    try {
      await api.payTadaClaim(claimId);
      loadData();
    } catch (err: any) {
      alert(`Error marking paid: ${err.message}`);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">TA/DA Expense Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Technician field travel allowances, transport expenses, meal reimbursements, and administrative approval workflow.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Submit TA/DA Claim</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted (Under Review)</option>
            <option value="Approved">Approved (Awaiting Payment)</option>
            <option value="Paid">Disbursed / Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Claim ID</th>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Travel Date</th>
                <th className="py-3 px-4 font-semibold">Route & Destination</th>
                <th className="py-3 px-4 font-semibold">Transport / Food / Daily</th>
                <th className="py-3 px-4 font-semibold">Total Claim</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading claims...</td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No TA/DA expense claims found.</td>
                </tr>
              ) : (
                claims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{c.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.employee_name}</td>
                    <td className="py-3 px-4 text-slate-600">{c.travel_date}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{c.customer_or_institution}</div>
                      <div className="text-[11px] text-slate-500">{c.from_location} → {c.to_location}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      BDT {c.transport_expense} / {c.food_allowance} / {c.daily_allowance}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      BDT {c.total_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        c.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'Approved'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : c.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin && c.status === 'Submitted' && c.employee_id !== user?.id && (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleReviewDecision(c.id, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewDecision(c.id, 'Rejected')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {isAdmin && c.status === 'Approved' && (
                        <button
                          onClick={() => handleMarkPaid(c.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium"
                        >
                          Disburse / Pay
                        </button>
                      )}
                      {c.status === 'Paid' && (
                        <span className="text-[11px] text-emerald-700 font-medium">Disbursed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- NEW CLAIM MODAL ---------------- */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Submit Field TA/DA Expense Claim</h3>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-600">Link to Field Schedule (Optional)</label>
                <select
                  value={claimForm.schedule_id}
                  onChange={(e) => handleSelectSchedule(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">No specific schedule link</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>{s.id} — {s.customer_name} ({s.schedule_date})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Customer / Institution Destination *</label>
                <input
                  type="text"
                  required
                  value={claimForm.customer_or_institution}
                  onChange={(e) => setClaimForm({ ...claimForm, customer_or_institution: e.target.value })}
                  placeholder="e.g. Dhaka City College"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-600">Travel Date *</label>
                  <input
                    type="date"
                    required
                    value={claimForm.travel_date}
                    onChange={(e) => setClaimForm({ ...claimForm, travel_date: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600">From Location *</label>
                  <input
                    type="text"
                    required
                    value={claimForm.from_location}
                    onChange={(e) => setClaimForm({ ...claimForm, from_location: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600">To Location *</label>
                  <input
                    type="text"
                    required
                    value={claimForm.to_location}
                    onChange={(e) => setClaimForm({ ...claimForm, to_location: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-700">Transport (CNG/Bus)</label>
                  <input
                    type="number"
                    value={claimForm.transport_expense}
                    onChange={(e) => setClaimForm({ ...claimForm, transport_expense: Number(e.target.value) })}
                    className="w-full mt-1 px-2 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700">Food / Lunch</label>
                  <input
                    type="number"
                    value={claimForm.food_allowance}
                    onChange={(e) => setClaimForm({ ...claimForm, food_allowance: Number(e.target.value) })}
                    className="w-full mt-1 px-2 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700">Daily Allowance</label>
                  <input
                    type="number"
                    value={claimForm.daily_allowance}
                    onChange={(e) => setClaimForm({ ...claimForm, daily_allowance: Number(e.target.value) })}
                    className="w-full mt-1 px-2 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700">Other Approved</label>
                  <input
                    type="number"
                    value={claimForm.other_expense}
                    onChange={(e) => setClaimForm({ ...claimForm, other_expense: Number(e.target.value) })}
                    className="w-full mt-1 px-2 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900 font-bold">
                <span>Total Claimed Amount:</span>
                <span className="text-base font-black">BDT {totalCalculated.toLocaleString()}</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Explanation / Trip Justification</label>
                <textarea
                  rows={2}
                  value={claimForm.explanation}
                  onChange={(e) => setClaimForm({ ...claimForm, explanation: e.target.value })}
                  placeholder="Details of transport taken or emergency toll..."
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Submit Claim for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
