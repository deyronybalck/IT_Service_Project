import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  Send, 
  UserCheck, 
  FileText, 
  Receipt, 
  Plus, 
  MessageSquare,
  TrendingUp,
  PackageCheck,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

interface DashboardViewProps {
  onOpenService: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenService }) => {
  const { user, setActiveView } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringReminder, setTriggeringReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user?.role]);

  const handleManualReminderSweep = async () => {
    setTriggeringReminder(true);
    setReminderMsg(null);
    try {
      const res = await api.triggerWhatsAppReminders(true); // force simulation/dispatch
      setReminderMsg(res.message || 'Sweep completed successfully.');
      loadStats();
      setTimeout(() => setReminderMsg(null), 5000);
    } catch (err: any) {
      setReminderMsg(`Error: ${err.message}`);
    } finally {
      setTriggeringReminder(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading operational metrics from database...</span>
        </div>
      </div>
    );
  }

  const role = user?.role || 'admin';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <span>IT Lab Solutions Limited</span>
            <span>•</span>
            <span className="capitalize">{role} Workspace</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">Welcome back, {user?.name}</h2>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            {role === 'admin' 
              ? 'Complete business oversight: monitor service workflows, field dispatches, quotations, collections, and TA/DA expenses.' 
              : role === 'hr'
              ? 'Human resources & follow-up command: monitor technician schedules, customer communications, and staff expenses.'
              : role === 'receptionist'
              ? 'Front desk service counter: handle customer intake, delivery ready inspections, and quick barcode inquiries.'
              : 'Technician workstation: manage your field assignments, workshop service repairs, and submit daily work reports.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {role === 'admin' && (
            <button
              onClick={() => setActiveView('services')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Receive New Service</span>
            </button>
          )}

          {role === 'technician' && (
            <button
              onClick={() => setActiveView('technician-requests')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Field Call</span>
            </button>
          )}

          {role === 'receptionist' && (
            <button
              onClick={() => setActiveView('services')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Receive Product</span>
            </button>
          )}

          <button
            onClick={loadStats}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 30-Day WhatsApp Reminder Banner (Admin & Reception) */}
      {(role === 'admin' || role === 'receptionist') && stats?.overdueServices > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {stats.overdueServices} Product{stats.overdueServices > 1 ? 's' : ''} in Workshop &gt; 30 Days (Storage Alert)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Eligible undelivered products require automated WhatsApp collection reminders according to workshop storage policy.
              </p>
              {reminderMsg && (
                <p className="text-xs font-semibold text-emerald-800 mt-1">{reminderMsg}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setActiveView('services')}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-medium transition"
            >
              View Overdue Items
            </button>
            {role === 'admin' && (
              <button
                onClick={handleManualReminderSweep}
                disabled={triggeringReminder}
                className="flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{triggeringReminder ? 'Sending...' : 'Trigger WhatsApp Sweep'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------------- ADMIN DASHBOARD ---------------- */}
      {role === 'admin' && stats && (
        <>
          {/* Top KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Total Services</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Wrench className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.totalServices}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                <span className="text-blue-600 font-semibold">{stats.activeServices} active</span>
                <span>in workshop</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Ready For Delivery</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><PackageCheck className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-emerald-600">{stats.readyForDelivery}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                <span>Awaiting customer pickup</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Today's Field Visits</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Calendar className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-purple-600">{stats.todaySchedules}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                <span>Scheduled for today</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Approvals Pending</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-rose-600">
                {stats.pendingRequests + stats.tadaPending}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                <span>{stats.pendingRequests} Field Calls, {stats.tadaPending} TA/DA</span>
              </div>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Billed Revenue</span>
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                BDT {stats.totalBilled?.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">From workshop repairs & orders</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payments Collected</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">
                BDT {stats.totalReceived?.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Realized payments in cash/banks/mobile</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer Receivables</span>
                <Clock className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600">
                BDT {stats.totalOutstanding?.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Outstanding dues to be collected upon delivery</p>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveView('services')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">Workshop Intake</div>
                <div className="text-[11px] text-slate-500">New Repair Order</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </button>

            <button
              onClick={() => setActiveView('schedules')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">Dispatch Tech</div>
                <div className="text-[11px] text-slate-500">Create Field Schedule</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </button>

            <button
              onClick={() => setActiveView('quotations')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">New Quotation</div>
                <div className="text-[11px] text-slate-500">Hardware & Services</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </button>

            <button
              onClick={() => setActiveView('reports')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-slate-800">Financial Reports</div>
                <div className="text-[11px] text-slate-500">Profit & Loss Analysis</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </button>
          </div>
        </>
      )}

      {/* ---------------- HR DASHBOARD ---------------- */}
      {role === 'hr' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Active Staff Directory</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalStaff} Members</div>
              <p className="text-[11px] text-slate-500 mt-1">Engineers, Technicians, Reception & HR</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Today's Staff Schedules</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{stats.todaySchedulesCount} Visits</div>
              <p className="text-[11px] text-slate-500 mt-1">Field operations scheduled today</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Customer Follow-ups Due</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{stats.followupsDueCount} Calls</div>
              <p className="text-[11px] text-slate-500 mt-1">Pending telephone feedback</p>
            </div>
          </div>

          {/* Today's Technician Visits Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Today's Technician Field Schedule</h3>
              <button onClick={() => setActiveView('schedules')} className="text-xs text-blue-600 hover:underline">
                View all schedules
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Schedule ID</th>
                    <th className="py-2.5 px-4 font-semibold">Client / Institution</th>
                    <th className="py-2.5 px-4 font-semibold">Assigned Technician</th>
                    <th className="py-2.5 px-4 font-semibold">Time</th>
                    <th className="py-2.5 px-4 font-semibold">Priority</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.todaySchedules?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">No field visits scheduled for today.</td>
                    </tr>
                  ) : (
                    stats.todaySchedules?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-medium text-blue-700">{s.id}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{s.customer_name}</td>
                        <td className="py-2.5 px-4 text-slate-700">{s.assigned_technician_name || 'Unassigned'}</td>
                        <td className="py-2.5 px-4 text-slate-600">{s.schedule_time}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {s.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- RECEPTIONIST DASHBOARD ---------------- */}
      {role === 'receptionist' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Ready for Customer Delivery</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{stats.pendingDeliveryCount} Units</div>
              <p className="text-[11px] text-slate-500 mt-1">Inspected, repaired, ready for handover</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Today's Field Dispatches</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{stats.todayVisits?.length || 0} Visits</div>
              <p className="text-[11px] text-slate-500 mt-1">Technicians on call today</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Follow-up Calls Due</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{stats.followupsDue?.length || 0} Customers</div>
              <p className="text-[11px] text-slate-500 mt-1">Customer check-in calls scheduled</p>
            </div>
          </div>

          {/* Units Ready For Handover Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Products Ready for Handover at Reception</h3>
              <button onClick={() => setActiveView('services')} className="text-xs text-blue-600 hover:underline">
                View all workshop records
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Service ID</th>
                    <th className="py-2.5 px-4 font-semibold">Customer</th>
                    <th className="py-2.5 px-4 font-semibold">Product</th>
                    <th className="py-2.5 px-4 font-semibold">Total Bill</th>
                    <th className="py-2.5 px-4 font-semibold">Due Balance</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.readyForDeliveryList?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">No units currently pending delivery.</td>
                    </tr>
                  ) : (
                    stats.readyForDeliveryList?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-medium text-blue-700">{s.id}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">{s.customer_name}</div>
                          <div className="text-[11px] text-slate-500">{s.phone}</div>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-700">{s.product_category} ({s.brand} {s.model})</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">BDT {s.total_bill?.toLocaleString()}</td>
                        <td className="py-2.5 px-4">
                          <span className={`font-bold ${s.outstanding_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            BDT {s.outstanding_balance?.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => onOpenService(s.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium"
                          >
                            Open File / Handover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TECHNICIAN DASHBOARD ---------------- */}
      {role === 'technician' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Today's Assigned Visits</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{stats.todayAssignedCount} Visits</div>
              <p className="text-[11px] text-slate-500 mt-1">Field schedules assigned to you today</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Workshop Jobs In Queue</span>
              <div className="text-2xl font-black text-purple-600 mt-1">{stats.assignedServicesCount} Jobs</div>
              <p className="text-[11px] text-slate-500 mt-1">Hardware repairs in diagnostics or progress</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">My Expense Claims</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats.myClaims?.length || 0} Claims</div>
              <p className="text-[11px] text-slate-500 mt-1">TA/DA claims submitted</p>
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Field schedules */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-sm text-slate-900">Today's Assigned Visits</h3>
                <button onClick={() => setActiveView('schedules')} className="text-xs text-blue-600 hover:underline">
                  All schedules
                </button>
              </div>

              {stats.todayAssigned?.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No field schedules assigned for today.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.todayAssigned?.map((item: any) => (
                    <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-900">{item.customer_name}</span>
                        <span className="font-semibold text-blue-600">{item.schedule_time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{item.location_address}</p>
                      <p className="text-xs text-slate-700 mt-1 font-medium">{item.problem_description}</p>
                      <div className="mt-3 flex justify-between items-center text-xs">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                          {item.status}
                        </span>
                        <button
                          onClick={() => setActiveView('technician-reports')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium"
                        >
                          Submit Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Workshop Repair Queue */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="font-bold text-sm text-slate-900">Assigned Workshop Repair Jobs</h3>
                <button onClick={() => setActiveView('services')} className="text-xs text-blue-600 hover:underline">
                  All services
                </button>
              </div>

              {stats.assignedServices?.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active workshop repairs assigned to you right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.assignedServices?.map((item: any) => (
                    <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono font-bold text-blue-700">{item.id}</span>
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1">
                        {item.product_category} ({item.brand} {item.model})
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">Client: {item.customer_name}</p>
                      <p className="text-xs text-slate-700 mt-1 italic">{item.reported_problems}</p>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => onOpenService(item.id)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium"
                        >
                          Update Diagnosis & Parts
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
