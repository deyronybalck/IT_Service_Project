import React, { useState, useEffect } from 'react';
import { Plus, PhoneCall, MessageSquare, Clock, AlertTriangle, Calendar, User, X } from 'lucide-react';
import { CustomerFollowup, Customer, Service, Quotation } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const FollowupsView: React.FC = () => {
  const { user } = useAuth();
  const [followups, setFollowups] = useState<CustomerFollowup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    related_type: 'SERVICE',
    related_id: '',
    contact_method: 'Phone Call',
    customer_response: '',
    notes: '',
    next_follow_up_date: '',
    status: 'Completed' as any,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fList, cList] = await Promise.all([
        api.getFollowups({ overdue: overdueOnly ? 'true' : undefined }),
        api.getCustomers(),
      ]);
      setFollowups(fList);
      setCustomers(cList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [overdueOnly]);

  const handleCustomerSelect = (custId: string) => {
    const c = customers.find((cust) => cust.id === custId);
    if (c) {
      setForm({ ...form, customer_id: c.id, customer_name: c.name });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFollowup(form);
      setShowModal(false);
      setForm({
        customer_id: '',
        customer_name: '',
        related_type: 'SERVICE',
        related_id: '',
        contact_method: 'Phone Call',
        customer_response: '',
        notes: '',
        next_follow_up_date: '',
        status: 'Completed',
      });
      loadData();
    } catch (err: any) {
      alert(`Error recording follow-up: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Communication & Follow-up Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log telephone conversations, customer WhatsApp responses, scheduled next visits, and feedback tracking.
          </p>
        </div>

        <button
          onClick={() => {
            if (customers.length > 0) handleCustomerSelect(customers[0].id);
            setShowModal(true);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Follow-up Call / Note</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded text-blue-600 focus:ring-0"
          />
          <span>Show Overdue Follow-ups Only (Due Today or Earlier)</span>
        </label>
      </div>

      {/* Follow-up Timeline Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Client Name</th>
                <th className="py-3 px-4 font-semibold">Method & Reference</th>
                <th className="py-3 px-4 font-semibold">Staff Caller</th>
                <th className="py-3 px-4 font-semibold">Customer Response & Notes</th>
                <th className="py-3 px-4 font-semibold">Next Follow-up</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading follow-ups...</td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No follow-up records found.</td>
                </tr>
              ) : (
                followups.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{f.follow_up_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{f.customer_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{f.contact_method}</span>
                      {f.related_id && (
                        <div className="text-[10px] font-mono text-blue-600">{f.related_id}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{f.employee_name}</td>
                    <td className="py-3 px-4 max-w-sm">
                      {f.customer_response && (
                        <div className="font-medium text-slate-900">"{f.customer_response}"</div>
                      )}
                      <p className="text-[11px] text-slate-600 mt-0.5">{f.notes}</p>
                    </td>
                    <td className="py-3 px-4 text-blue-800 font-semibold font-mono">
                      {f.next_follow_up_date || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- NEW FOLLOW-UP MODAL ---------------- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Record Customer Communication Note</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-600">Select Customer *</label>
                <select
                  required
                  value={form.customer_id}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="" disabled>Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Contact Method</label>
                  <select
                    value={form.contact_method}
                    onChange={(e) => setForm({ ...form, contact_method: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Phone Call">Telephone Call</option>
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="Email">Email Communication</option>
                    <option value="In-Person">In-Person at Counter</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Related Entity ID (Optional)</label>
                  <input
                    type="text"
                    value={form.related_id}
                    onChange={(e) => setForm({ ...form, related_id: e.target.value })}
                    placeholder="e.g. SRV-2026-0002 or QUO-2026-0001"
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Customer's Response / Stated Intention</label>
                <input
                  type="text"
                  value={form.customer_response}
                  onChange={(e) => setForm({ ...form, customer_response: e.target.value })}
                  placeholder="e.g. Will collect product this Saturday afternoon; verified quote"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Detailed Internal Communication Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Record what was discussed with the client..."
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Scheduled Next Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={form.next_follow_up_date}
                  onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Save Follow-up Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
