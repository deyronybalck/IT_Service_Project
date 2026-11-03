import React, { useState, useEffect } from 'react';
import { Plus, School, Calendar, CheckCircle2, AlertTriangle, Printer, X, History } from 'lucide-react';
import { FreeLabService, Customer } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const FreeLabView: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<FreeLabService[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    institution_name: '',
    customer_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    total_computers: 30,
    working_computers: 25,
    non_working_computers: 5,
    problems_found: '',
    work_completed: '',
    required_parts: '',
    lab_condition: 'Well Ventilated, Needs AC Dusting',
    next_visit_recommendation: '',
    photo_notes: '',
    remarks: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, custList] = await Promise.all([
        api.getFreeLabRecords(),
        api.getCustomers({ type: 'institution' }),
      ]);
      setRecords(list);
      setCustomers(custList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFreeLabRecord(form);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error saving free lab report: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Free Computer Lab Service Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Community & Institutional ICT Support: regular preventive maintenance for school and college computer labs.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Free Lab Inspection</span>
        </button>
      </div>

      {/* Grid of Lab Records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">Loading lab records...</div>
        ) : records.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">No computer lab service records recorded yet.</div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700">{r.id}</span>
                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{r.visit_date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{r.institution_name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500">Tech: {r.technician_name}</span>
                </div>
              </div>

              {/* Computer Stats */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total PCs</div>
                  <div className="text-base font-bold text-slate-800">{r.total_computers}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-700 uppercase font-semibold">Working</div>
                  <div className="text-base font-bold text-emerald-600">{r.working_computers}</div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-700 uppercase font-semibold">Faulty</div>
                  <div className="text-base font-bold text-rose-600">{r.non_working_computers}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {r.problems_found && (
                  <div>
                    <span className="font-semibold text-slate-700">Problems Diagnosed: </span>
                    <span className="text-slate-600">{r.problems_found}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-700">Work Completed: </span>
                  <span className="text-emerald-700 font-medium">{r.work_completed}</span>
                </div>
                {r.required_parts && (
                  <div>
                    <span className="font-semibold text-slate-700">Required Parts: </span>
                    <span className="text-slate-600">{r.required_parts}</span>
                  </div>
                )}
                {r.next_visit_recommendation && (
                  <div>
                    <span className="font-semibold text-blue-700">Next Recommended Visit: </span>
                    <span className="text-slate-700">{r.next_visit_recommendation}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Free Computer Lab Maintenance Report</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-600">Institution / School Name *</label>
                <input
                  type="text"
                  required
                  value={form.institution_name}
                  onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
                  placeholder="e.g. Motijheel Model High School & College"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-600">Visit Date *</label>
                  <input
                    type="date"
                    required
                    value={form.visit_date}
                    onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600">Total PCs</label>
                  <input
                    type="number"
                    value={form.total_computers}
                    onChange={(e) => setForm({ ...form, total_computers: Number(e.target.value) })}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600">Working</label>
                  <input
                    type="number"
                    value={form.working_computers}
                    onChange={(e) => setForm({ ...form, working_computers: Number(e.target.value) })}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600">Non-working</label>
                  <input
                    type="number"
                    value={form.non_working_computers}
                    onChange={(e) => setForm({ ...form, non_working_computers: Number(e.target.value) })}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Problems Found</label>
                <textarea
                  rows={2}
                  value={form.problems_found}
                  onChange={(e) => setForm({ ...form, problems_found: e.target.value })}
                  placeholder="OS corruption, RAM dust, CMOS battery drained..."
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Work Completed *</label>
                <textarea
                  required
                  rows={2}
                  value={form.work_completed}
                  onChange={(e) => setForm({ ...form, work_completed: e.target.value })}
                  placeholder="Blower cleaning of all 30 PCs, Windows reload on 4 systems..."
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Parts Recommended</label>
                  <input
                    type="text"
                    value={form.required_parts}
                    onChange={(e) => setForm({ ...form, required_parts: e.target.value })}
                    placeholder="e.g. 2x 256GB SSD, 5x CMOS batteries"
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Next Recommended Visit</label>
                  <input
                    type="text"
                    value={form.next_visit_recommendation}
                    onChange={(e) => setForm({ ...form, next_visit_recommendation: e.target.value })}
                    placeholder="e.g. In 60 Days (Preventive cleaning)"
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
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
                  Save Free Lab Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
