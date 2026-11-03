import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Phone, 
  MessageSquare, 
  Mail, 
  MapPin, 
  DollarSign, 
  CreditCard, 
  BookOpen, 
  Wrench, 
  X, 
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Customer } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const CustomersView: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Customer Profile Detail State
  const [activeCustomerDetail, setActiveCustomerDetail] = useState<any | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // New Customer Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCustForm, setNewCustForm] = useState({
    name: '',
    type: 'individual' as any,
    contact_person: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    notes: '',
  });

  // Collect Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    reference_id: '',
    description: '',
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const list = await api.getCustomers({ search, type: typeFilter !== 'all' ? typeFilter : undefined });
      setCustomers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, typeFilter]);

  const openCustomerProfile = async (custId: string) => {
    try {
      const full = await api.getCustomer(custId);
      setActiveCustomerDetail(full);
      setShowDetailDrawer(true);
    } catch (err: any) {
      alert(`Error loading customer profile: ${err.message}`);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomer(newCustForm);
      setShowNewModal(false);
      setNewCustForm({
        name: '',
        type: 'individual',
        contact_person: '',
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        notes: '',
      });
      loadCustomers();
    } catch (err: any) {
      alert(`Error creating customer: ${err.message}`);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomerDetail) return;

    try {
      await api.recordPayment(activeCustomerDetail.id, paymentForm);
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_method: 'Cash', reference_id: '', description: '' });
      // Refresh customer profile
      const full = await api.getCustomer(activeCustomerDetail.id);
      setActiveCustomerDetail(full);
      loadCustomers();
    } catch (err: any) {
      alert(`Error recording payment: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Management & Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized client directory, running accounts ledger, debit/credit entries, and direct collections.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, contact person, mobile, WhatsApp..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
          >
            <option value="all">All Types</option>
            <option value="individual">Individual</option>
            <option value="institution">Educational / Institution</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold">Name & Type</th>
                <th className="py-3 px-4 font-semibold">Contact Person</th>
                <th className="py-3 px-4 font-semibold">Phone / WhatsApp</th>
                <th className="py-3 px-4 font-semibold">Address</th>
                <th className="py-3 px-4 font-semibold text-right">Profile & Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No customers found.</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{c.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-slate-100 text-slate-600">
                        {c.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{c.contact_person || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800">{c.phone}</div>
                      {c.whatsapp && (
                        <div className="text-[10px] text-emerald-700 flex items-center space-x-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{c.whatsapp}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{c.address}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCustomerProfile(c.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition ml-auto"
                      >
                        <span>View Ledger</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- CUSTOMER PROFILE & LEDGER DRAWER ---------------- */}
      {showDetailDrawer && activeCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
              <div>
                <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">{activeCustomerDetail.id}</span>
                <h3 className="text-base font-bold text-white">{activeCustomerDetail.name}</h3>
                <p className="text-xs text-slate-400">{activeCustomerDetail.contact_person} • {activeCustomerDetail.phone}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Collect Payment</span>
                </button>
                <button onClick={() => setShowDetailDrawer(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Billed</span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  BDT {activeCustomerDetail.stats?.totalBilled?.toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase">Total Collected</span>
                <div className="text-base font-black text-emerald-600 mt-0.5">
                  BDT {activeCustomerDetail.stats?.totalPaid?.toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-semibold text-rose-700 uppercase">Outstanding Due</span>
                <div className="text-base font-black text-rose-600 mt-0.5">
                  BDT {activeCustomerDetail.stats?.outstandingBalance?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  Customer Financial Ledger
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Reference / Description</th>
                        <th className="py-2 px-3 text-right">Debit (Billed)</th>
                        <th className="py-2 px-3 text-right">Credit (Paid)</th>
                        <th className="py-2 px-3 text-right">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeCustomerDetail.ledger?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">No transactions recorded.</td>
                        </tr>
                      ) : (
                        activeCustomerDetail.ledger?.map((entry: any) => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{entry.transaction_date}</td>
                            <td className="py-2 px-3">
                              <div className="font-medium text-slate-800">{entry.description}</div>
                              {entry.reference_id && (
                                <span className="font-mono text-[10px] text-blue-600">{entry.reference_id}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900 font-mono">
                              {entry.debit > 0 ? `BDT ${entry.debit.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-emerald-600 font-mono">
                              {entry.credit > 0 ? `BDT ${entry.credit.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 text-[11px]">
                              {entry.payment_method || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Workshop Services */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                  Service History ({activeCustomerDetail.services?.length || 0})
                </h4>
                <div className="space-y-2">
                  {activeCustomerDetail.services?.map((srv: any) => (
                    <div key={srv.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-700">{srv.id}</span>
                          <span className="font-semibold text-slate-800">{srv.product_category}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{srv.brand} - {srv.model}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                          {srv.status}
                        </span>
                        <div className="text-slate-900 font-bold mt-1">BDT {srv.total_bill?.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- NEW CUSTOMER MODAL ---------------- */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Register Customer Account</h3>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-600">Customer / Entity Name *</label>
                <input
                  type="text"
                  required
                  value={newCustForm.name}
                  onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                  placeholder="e.g. Apex Footwear IT Cell or Dr. Hasan Ali"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Account Type</label>
                  <select
                    value={newCustForm.type}
                    onChange={(e) => setNewCustForm({ ...newCustForm, type: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="individual">Individual</option>
                    <option value="institution">Educational / Institution</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Contact Person Name</label>
                  <input
                    type="text"
                    value={newCustForm.contact_person}
                    onChange={(e) => setNewCustForm({ ...newCustForm, contact_person: e.target.value })}
                    placeholder="Full name of representative"
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={newCustForm.phone}
                    onChange={(e) => setNewCustForm({ ...newCustForm, phone: e.target.value })}
                    placeholder="+8801..."
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600">WhatsApp Number</label>
                  <input
                    type="text"
                    value={newCustForm.whatsapp}
                    onChange={(e) => setNewCustForm({ ...newCustForm, whatsapp: e.target.value })}
                    placeholder="+8801..."
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Email Address</label>
                <input
                  type="email"
                  value={newCustForm.email}
                  onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Physical Address *</label>
                <input
                  type="text"
                  required
                  value={newCustForm.address}
                  onChange={(e) => setNewCustForm({ ...newCustForm, address: e.target.value })}
                  placeholder="Office / Home address"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Internal Remarks</label>
                <input
                  type="text"
                  value={newCustForm.notes}
                  onChange={(e) => setNewCustForm({ ...newCustForm, notes: e.target.value })}
                  placeholder="Special client agreements or requirements"
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
                  Save Customer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- RECORD PAYMENT MODAL ---------------- */}
      {showPaymentModal && activeCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Post Payment Collection</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-3.5 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <div className="font-bold">{activeCustomerDetail.name}</div>
                <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
                  Current Due: BDT {activeCustomerDetail.stats?.outstandingBalance?.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase">Payment Amount (BDT) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Enter collected amount"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-emerald-700 font-bold text-base"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Payment Method *</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="bKash">bKash Merchant</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Bank Transfer">Bank Transfer (EFT / RTGS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Reference / Service ID (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.reference_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_id: e.target.value })}
                  placeholder="e.g. SRV-2026-0002 or Bank Txn ID"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600">Description / Note</label>
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  placeholder="e.g. Final settlement for workstation repair"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Post Payment to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
