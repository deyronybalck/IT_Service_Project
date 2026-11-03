import React, { useState, useEffect } from 'react';
import { Plus, Check, X, AlertCircle, Clock, ShieldCheck, User } from 'lucide-react';
import { TechnicianServiceRequest, User as UserType } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const TechnicianRequestsView: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TechnicianServiceRequest[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // New Request Modal (for technicians)
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRequestForm, setNewRequestForm] = useState({
    institution_name: '',
    contact_person: '',
    phone: '',
    address: '',
    problem_details: '',
    service_required: '',
    urgency: 'Normal' as any,
    technician_remarks: '',
  });

  // Approval Modal (for Admin)
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<TechnicianServiceRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    assigned_technician_id: '',
    schedule_date: new Date().toISOString().split('T')[0],
    schedule_time: '10:00 AM',
    priority: 'Normal',
    admin_remarks: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, userList] = await Promise.all([
        api.getServiceRequests(),
        api.getUsers(),
      ]);
      setRequests(reqList);
      setTechnicians(userList.filter((u: any) => u.role === 'technician'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.submitServiceRequest(newRequestForm);
      setShowNewModal(false);
      setNewRequestForm({
        institution_name: '',
        contact_person: '',
        phone: '',
        address: '',
        problem_details: '',
        service_required: '',
        urgency: 'Normal',
        technician_remarks: '',
      });
      loadData();
    } catch (err: any) {
      alert(`Error submitting request: ${err.message}`);
    }
  };

  const openApprovalModal = (req: TechnicianServiceRequest) => {
    setSelectedRequestForApproval(req);
    setApprovalForm({
      assigned_technician_id: req.technician_id || '',
      schedule_date: new Date().toISOString().split('T')[0],
      schedule_time: '10:00 AM',
      priority: req.urgency || 'Normal',
      admin_remarks: 'Approved. Dispatched for inspection.',
    });
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForApproval) return;
    try {
      await api.approveServiceRequest(selectedRequestForApproval.id, approvalForm);
      setSelectedRequestForApproval(null);
      loadData();
    } catch (err: any) {
      alert(`Error approving request: ${err.message}`);
    }
  };

  const handleReject = async (reqId: string) => {
    const reason = prompt('Please enter the reason for rejecting this service call:');
    if (reason === null) return;
    try {
      await api.rejectServiceRequest(reqId, { admin_remarks: reason || 'Declined by Admin.' });
      loadData();
    } catch (err: any) {
      alert(`Error rejecting request: ${err.message}`);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isAdmin ? 'Field Service Calls Approval Queue' : 'Submit New Field Service Calls'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Field inquiries discovered by technicians during on-site visits require Admin authorization before scheduling.
          </p>
        </div>

        {user?.role === 'technician' && (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Field Call</span>
          </button>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Request ID</th>
                <th className="py-3 px-4 font-semibold">Institution / Client</th>
                <th className="py-3 px-4 font-semibold">Reported By Tech</th>
                <th className="py-3 px-4 font-semibold">Service Required & Problem</th>
                <th className="py-3 px-4 font-semibold">Urgency</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No field requests in queue.</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{r.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.institution_name}</div>
                      <div className="text-[11px] text-slate-500">{r.contact_person} ({r.phone})</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{r.technician_name}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-900">{r.service_required}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{r.problem_details}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.urgency === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        r.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.status}
                      </span>
                      {r.scheduled_id && (
                        <div className="text-[10px] text-blue-600 font-mono mt-0.5">Sch: {r.scheduled_id}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin && r.status === 'Pending Approval' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openApprovalModal(r)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium"
                          >
                            Approve & Schedule
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">{r.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- NEW REQUEST MODAL (TECHNICIAN) ---------------- */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Submit Discovered Field Service Call</h3>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-600">Institution / Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newRequestForm.institution_name}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, institution_name: e.target.value })}
                  placeholder="e.g. Dhanmondi Government Boys High School"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={newRequestForm.contact_person}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, contact_person: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={newRequestForm.phone}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, phone: e.target.value })}
                    placeholder="+8801..."
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Physical Address *</label>
                <input
                  type="text"
                  required
                  value={newRequestForm.address}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, address: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Service Category Required *</label>
                  <input
                    type="text"
                    required
                    value={newRequestForm.service_required}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, service_required: e.target.value })}
                    placeholder="e.g. Computer Lab, CCTV, Network"
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Urgency</label>
                  <select
                    value={newRequestForm.urgency}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, urgency: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Problem Details Observed *</label>
                <textarea
                  required
                  rows={2}
                  value={newRequestForm.problem_details}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, problem_details: e.target.value })}
                  placeholder="Describe hardware symptoms or requirements..."
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Technician Remarks</label>
                <input
                  type="text"
                  value={newRequestForm.technician_remarks}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, technician_remarks: e.target.value })}
                  placeholder="e.g. Discussed with Principal; recommend visit this Thursday"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Submit for Admin Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADMIN APPROVAL MODAL ---------------- */}
      {selectedRequestForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Approve Field Service Call & Schedule</h3>
              <button onClick={() => setSelectedRequestForApproval(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApprove} className="p-6 space-y-3.5 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <div className="font-bold">{selectedRequestForApproval.institution_name}</div>
                <div className="text-[11px] text-blue-800 mt-0.5">{selectedRequestForApproval.service_required}: {selectedRequestForApproval.problem_details}</div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase">Assign Technician *</label>
                <select
                  required
                  value={approvalForm.assigned_technician_id}
                  onChange={(e) => setApprovalForm({ ...approvalForm, assigned_technician_id: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="" disabled>Select technician...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Confirmed Date *</label>
                  <input
                    type="date"
                    required
                    value={approvalForm.schedule_date}
                    onChange={(e) => setApprovalForm({ ...approvalForm, schedule_date: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Confirmed Time *</label>
                  <input
                    type="text"
                    required
                    value={approvalForm.schedule_time}
                    onChange={(e) => setApprovalForm({ ...approvalForm, schedule_time: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Admin Instructions / Approval Remarks</label>
                <input
                  type="text"
                  value={approvalForm.admin_remarks}
                  onChange={(e) => setApprovalForm({ ...approvalForm, admin_remarks: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedRequestForApproval(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Confirm & Dispatch Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
