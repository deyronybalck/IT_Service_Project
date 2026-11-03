import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  AlertTriangle, 
  FileText, 
  Printer, 
  CheckCircle, 
  X, 
  Check, 
  Send 
} from 'lucide-react';
import { ServiceSchedule, ScheduleStatus, Customer, User as UserType } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const SchedulesView: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedScheduleForReport, setSelectedScheduleForReport] = useState<ServiceSchedule | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Schedule Form State
  const [scheduleForm, setScheduleForm] = useState({
    customer_id: '',
    customer_name: '',
    customer_type: 'institution',
    location_address: '',
    contact_person: '',
    contact_phone: '',
    service_category: 'Networking & CCTV',
    problem_description: '',
    assigned_technician_id: '',
    schedule_date: new Date().toISOString().split('T')[0],
    schedule_time: '10:00 AM',
    priority: 'Normal' as any,
    admin_instructions: '',
    expected_duration: '2 Hours',
  });

  // Technician Daily Report Form State
  const [reportForm, setReportForm] = useState({
    arrival_time: '10:00 AM',
    departure_time: '01:00 PM',
    work_performed: '',
    problems_found: '',
    work_completed: '',
    service_charge: 0,
    amount_collected: 0,
    handover_person_name: '',
    handover_person_phone: '',
    customer_feedback: '',
    follow_up_required: false,
    recommended_next_visit: '',
    remarks: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [schList, custList, userList] = await Promise.all([
        api.getSchedules({ date: dateFilter || undefined, status: statusFilter !== 'all' ? statusFilter : undefined }),
        api.getCustomers(),
        api.getUsers(),
      ]);

      setSchedules(schList);
      setCustomers(custList);
      setTechnicians(userList.filter((u: any) => u.role === 'technician'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, statusFilter]);

  const handleCustomerSelect = (custId: string) => {
    const c = customers.find((cust) => cust.id === custId);
    if (c) {
      setScheduleForm({
        ...scheduleForm,
        customer_id: c.id,
        customer_name: c.name,
        customer_type: c.type,
        location_address: c.address,
        contact_person: c.contact_person || c.name,
        contact_phone: c.phone,
      });
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictWarning(null);
    try {
      const res = await api.createSchedule(scheduleForm);
      if (res.conflictWarning) {
        setConflictWarning(res.conflictWarning);
        loadData();
      } else {
        setShowNewModal(false);
        loadData();
      }
    } catch (err: any) {
      alert(`Error creating schedule: ${err.message}`);
    }
  };

  const openReportModal = (sch: ServiceSchedule) => {
    setSelectedScheduleForReport(sch);
    setReportForm({
      arrival_time: '10:00 AM',
      departure_time: '01:00 PM',
      work_performed: '',
      problems_found: '',
      work_completed: '',
      service_charge: 0,
      amount_collected: 0,
      handover_person_name: sch.contact_person,
      handover_person_phone: sch.contact_phone,
      customer_feedback: '',
      follow_up_required: false,
      recommended_next_visit: '',
      remarks: '',
    });
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleForReport) return;

    try {
      await api.submitWorkReport(selectedScheduleForReport.id, reportForm);
      setShowReportModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error submitting report: ${err.message}`);
    }
  };

  const handlePrintScheduleSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {user?.role === 'technician' ? 'My Assigned Field Visits' : 'Service Schedule Management'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Field service scheduling, technician dispatch, work completion reports, and route coordination.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintScheduleSheet}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Schedule Sheet</span>
          </button>

          {user?.role !== 'technician' && (
            <button
              onClick={() => {
                if (customers.length > 0) handleCustomerSelect(customers[0].id);
                setShowNewModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Field Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Sheet Header (Only on print) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-bold uppercase text-blue-900">IT Lab Solutions Limited</h1>
        <p className="text-xs text-slate-600">Technician Dispatch & Daily Schedule Sheet</p>
        <p className="text-[11px] text-slate-500">
          Generated on {new Date().toLocaleDateString()} for field deployment
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Filter Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-xs text-blue-600 hover:underline">
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
            >
              <option value="all">All</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schedules List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Schedule ID</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Customer / Location</th>
                <th className="py-3 px-4 font-semibold">Contact Person</th>
                <th className="py-3 px-4 font-semibold">Category & Task</th>
                <th className="py-3 px-4 font-semibold">Technician</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">Loading schedules...</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No field schedules found for criteria.</td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{s.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.schedule_date}</div>
                      <div className="text-[11px] text-slate-500">{s.schedule_time || '10:00 AM'}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900">{s.customer_name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{s.location_address}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{s.contact_person}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{s.contact_phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{s.service_category}</div>
                      <div className="text-[11px] text-slate-600 line-clamp-1">{s.problem_description}</div>
                    </td>
                    <td className="py-3 px-4">
                      {s.assigned_technician_name ? (
                        <span className="font-semibold text-blue-900">{s.assigned_technician_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        s.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : s.status === 'In Progress'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right print:hidden">
                      {s.status !== 'Completed' ? (
                        <button
                          onClick={() => openReportModal(s)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          Submit Report
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- CREATE SCHEDULE MODAL ---------------- */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-sm">Create Field Service Schedule & Dispatch</h3>
                <p className="text-xs text-slate-400">Technician visit coordination with conflict prevention</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {conflictWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Technician Conflict Warning:</span> {conflictWarning}
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Schedule was created, but please verify technician travel time or reassign.
                    </p>
                  </div>
                </div>
              )}

              {/* Customer selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase">Select Client / Institution *</label>
                <select
                  required
                  value={scheduleForm.customer_id}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="" disabled>Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone} ({c.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.contact_person}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, contact_person: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.contact_phone}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, contact_phone: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">Service Location / Address *</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.location_address}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, location_address: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Service Category *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.service_category}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, service_category: e.target.value })}
                    placeholder="e.g. CCTV, Server, Computer Lab, Networking"
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Priority *</label>
                  <select
                    value={scheduleForm.priority}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent (Same-day dispatch)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">Problem Description / Scope of Work *</label>
                <textarea
                  required
                  rows={2}
                  value={scheduleForm.problem_description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, problem_description: e.target.value })}
                  placeholder="Describe reported failure or required installation..."
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              {/* Technician and Date Time */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Assigned Technician *</label>
                  <select
                    value={scheduleForm.assigned_technician_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, assigned_technician_id: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded font-medium"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Schedule Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.schedule_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_date: e.target.value })}
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Time & Duration</label>
                  <input
                    type="text"
                    value={scheduleForm.schedule_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_time: e.target.value })}
                    placeholder="e.g. 11:00 AM"
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">Admin Instructions for Technician</label>
                <input
                  type="text"
                  value={scheduleForm.admin_instructions}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, admin_instructions: e.target.value })}
                  placeholder="e.g. Bring crimping tool, Cat6 patch leads, test 12V adapter"
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
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
                  Dispatch & Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- TECHNICIAN DAILY WORK REPORT MODAL ---------------- */}
      {showReportModal && selectedScheduleForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-sm">Technician Daily Field Work Report</h3>
                <p className="text-xs text-slate-400">
                  {selectedScheduleForReport.id} — {selectedScheduleForReport.customer_name}
                </p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Arrival Time</label>
                  <input
                    type="text"
                    value={reportForm.arrival_time}
                    onChange={(e) => setReportForm({ ...reportForm, arrival_time: e.target.value })}
                    placeholder="e.g. 10:15 AM"
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Departure Time</label>
                  <input
                    type="text"
                    value={reportForm.departure_time}
                    onChange={(e) => setReportForm({ ...reportForm, departure_time: e.target.value })}
                    placeholder="e.g. 01:30 PM"
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase">Problems Found on Site</label>
                <textarea
                  rows={2}
                  value={reportForm.problems_found}
                  onChange={(e) => setReportForm({ ...reportForm, problems_found: e.target.value })}
                  placeholder="Root cause identified at location..."
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase">Work Performed & Completed *</label>
                <textarea
                  required
                  rows={2}
                  value={reportForm.work_completed}
                  onChange={(e) => setReportForm({ ...reportForm, work_completed: e.target.value, work_performed: e.target.value })}
                  placeholder="Describe cables re-terminated, firmware updated, camera aligned, etc..."
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Service Charge (BDT)</label>
                  <input
                    type="number"
                    value={reportForm.service_charge}
                    onChange={(e) => setReportForm({ ...reportForm, service_charge: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 text-emerald-800">Amount Collected on Site (BDT)</label>
                  <input
                    type="number"
                    value={reportForm.amount_collected}
                    onChange={(e) => setReportForm({ ...reportForm, amount_collected: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Handover Person's Name</label>
                  <input
                    type="text"
                    value={reportForm.handover_person_name}
                    onChange={(e) => setReportForm({ ...reportForm, handover_person_name: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Handover Person's Phone</label>
                  <input
                    type="text"
                    value={reportForm.handover_person_phone}
                    onChange={(e) => setReportForm({ ...reportForm, handover_person_phone: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium">Customer Feedback / Remarks</label>
                <input
                  type="text"
                  value={reportForm.customer_feedback}
                  onChange={(e) => setReportForm({ ...reportForm, customer_feedback: e.target.value })}
                  placeholder="e.g. Satisfied with resolution; requested quotation for additional cameras"
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Submit Final Visit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
