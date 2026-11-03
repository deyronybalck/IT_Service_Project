import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Barcode, 
  Edit3, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  DollarSign, 
  Phone, 
  Trash2, 
  Send,
  Eye,
  Check,
  X
} from 'lucide-react';
import { Service, ServiceStatus, Customer, Product, User as UserType } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { ReceiptModal } from '../common/ReceiptModal.tsx';
import { BarcodeModal } from '../common/BarcodeModal.tsx';

interface ServicesViewProps {
  initialServiceId?: string | null;
  onClearInitialId?: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ initialServiceId, onClearInitialId }) => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Selected Service for View/Edit modal
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [printReceiptService, setPrintReceiptService] = useState<Service | null>(null);
  const [printBarcodeService, setPrintBarcodeService] = useState<Service | null>(null);

  // Form helpers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // New Service Form State
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', whatsapp: '', address: '', type: 'individual' });
  const [serviceFormData, setServiceFormData] = useState({
    product_category: 'Laptop',
    brand: '',
    model: '',
    serial_number: '',
    accessories: '',
    reported_problems: '',
    physical_condition: '',
    estimated_delivery_date: '',
    estimated_cost: '',
    additional_remarks: '',
    assigned_technician_id: '',
  });

  // Edit / Work Update State
  const [editWorkData, setEditWorkData] = useState<any>({
    status: 'Received',
    assigned_technician_id: '',
    problems_identified: '',
    work_required: '',
    work_completed: '',
    parts_list: [] as any[],
    labor_charge: 0,
    discount: 0,
    vat_amount: 0,
    amount_received: 0,
    customer_approval_status: 'Pending',
    customer_feedback: '',
    actual_delivery_date: '',
    handover_person_name: '',
    handover_person_phone: '',
    return_reason: '',
    additional_remarks: '',
  });

  const categories = [
    'Desktop Computer',
    'Laptop',
    'Monitor',
    'Printer',
    'CCTV',
    'DVR/NVR',
    'Router',
    'Networking Equipment',
    'UPS',
    'Other IT Products',
  ];

  const statuses: ServiceStatus[] = [
    'Received',
    'Under Inspection',
    'Waiting for Customer Approval',
    'In Progress',
    'Waiting for Parts',
    'Pending',
    'Ready for Delivery',
    'Delivered',
    'Returned / Not Repaired',
    'Cancelled',
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [srvList, custList, techList, prodList] = await Promise.all([
        api.getServices({ search, status: statusFilter, overdue30: overdueOnly ? 'true' : undefined }),
        api.getCustomers(),
        api.getUsers(),
        api.getProducts(),
      ]);

      setServices(srvList);
      setCustomers(custList);
      setTechnicians(techList.filter((u: any) => u.role === 'technician'));
      setProducts(prodList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, overdueOnly]);

  // Handle direct opening if passed Service ID (from Barcode scan or notification)
  useEffect(() => {
    if (initialServiceId) {
      api.getService(initialServiceId).then((srv) => {
        if (srv) {
          openEditModal(srv);
        }
      }).catch(console.error);

      if (onClearInitialId) onClearInitialId();
    }
  }, [initialServiceId]);

  const openEditModal = (service: Service) => {
    setActiveService(service);
    setEditWorkData({
      status: service.status,
      assigned_technician_id: service.assigned_technician_id || '',
      problems_identified: service.problems_identified || '',
      work_required: service.work_required || '',
      work_completed: service.work_completed || '',
      parts_list: service.parts || [],
      labor_charge: service.labor_charge,
      discount: service.discount,
      vat_amount: service.vat_amount,
      amount_received: service.amount_received,
      customer_approval_status: service.customer_approval_status || 'Pending',
      customer_feedback: service.customer_feedback || '',
      actual_delivery_date: service.actual_delivery_date || '',
      handover_person_name: service.handover_person_name || '',
      handover_person_phone: service.handover_person_phone || '',
      return_reason: service.return_reason || '',
      additional_remarks: service.additional_remarks || '',
    });
    setShowEditModal(true);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...serviceFormData,
        estimated_cost: Number(serviceFormData.estimated_cost) || 0,
      };

      if (newCustomerMode) {
        payload.new_customer = newCustomerData;
      } else {
        payload.customer_id = selectedCustomerId;
      }

      const res = await api.createService(payload);
      setShowNewModal(false);
      loadData();
      
      // Auto open barcode or receipt for printing
      if (res && res.serviceId) {
        const created = await api.getService(res.serviceId);
        setPrintReceiptService(created);
      }
    } catch (err: any) {
      alert(`Error creating service: ${err.message}`);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService) return;

    try {
      await api.updateService(activeService.id, editWorkData);
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error updating service: ${err.message}`);
    }
  };

  const handleAddPartToWork = (product: Product) => {
    const existing = editWorkData.parts_list.find((p: any) => p.product_id === product.id);
    if (existing) {
      setEditWorkData({
        ...editWorkData,
        parts_list: editWorkData.parts_list.map((p: any) =>
          p.product_id === product.id ? { ...p, quantity: p.quantity + 1, total_price: (p.quantity + 1) * p.unit_price } : p
        ),
      });
    } else {
      setEditWorkData({
        ...editWorkData,
        parts_list: [
          ...editWorkData.parts_list,
          {
            product_id: product.id,
            product_name: `${product.brand} ${product.name}`,
            quantity: 1,
            unit_cost: product.purchase_price || 0,
            unit_price: product.selling_price,
            total_price: product.selling_price,
          },
        ],
      });
    }
  };

  const handleRemovePart = (index: number) => {
    const updated = [...editWorkData.parts_list];
    updated.splice(index, 1);
    setEditWorkData({ ...editWorkData, parts_list: updated });
  };

  // Status Badge Helper
  const getStatusBadge = (status: ServiceStatus) => {
    const styles: Record<ServiceStatus, string> = {
      'Received': 'bg-slate-100 text-slate-800 border-slate-200',
      'Under Inspection': 'bg-blue-50 text-blue-700 border-blue-200',
      'Waiting for Customer Approval': 'bg-amber-50 text-amber-800 border-amber-200',
      'In Progress': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Waiting for Parts': 'bg-orange-50 text-orange-700 border-orange-200',
      'Pending': 'bg-yellow-50 text-yellow-800 border-yellow-200',
      'Ready for Delivery': 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
      'Delivered': 'bg-teal-50 text-teal-800 border-teal-200',
      'Returned / Not Repaired': 'bg-rose-50 text-rose-800 border-rose-200',
      'Cancelled': 'bg-slate-200 text-slate-600 border-slate-300',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Service Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Repair receiving, hardware diagnostics, spare parts replacement, barcode tracking, and handover.
          </p>
        </div>

        {user?.role !== 'technician' && (
          <button
            onClick={() => {
              setNewCustomerMode(false);
              setSelectedCustomerId(customers[0]?.id || '');
              setShowNewModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Receive New Service Item</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Service ID, customer, phone, brand..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span className="text-slate-700 font-medium">&gt; 30 Days Workshop Storage</span>
          </label>
        </div>
      </div>

      {/* Service Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Service ID</th>
                <th className="py-3 px-4 font-semibold">Customer / Phone</th>
                <th className="py-3 px-4 font-semibold">Product & Model</th>
                <th className="py-3 px-4 font-semibold">Technician</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Bill / Due</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading service records...</td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No service records found.</td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-blue-700">{s.id}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(s.received_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.customer_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{s.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{s.product_category}</div>
                      <div className="text-[11px] text-slate-500">{s.brand} - {s.model}</div>
                    </td>
                    <td className="py-3 px-4">
                      {s.assigned_technician_name ? (
                        <span className="text-slate-800 font-medium">{s.assigned_technician_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">BDT {s.total_bill.toLocaleString()}</div>
                      {s.outstanding_balance > 0 ? (
                        <div className="text-[10px] text-rose-600 font-bold">Due: BDT {s.outstanding_balance.toLocaleString()}</div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 font-semibold">Fully Paid</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Open Diagnosis & Work Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPrintReceiptService(s)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Print Customer Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPrintBarcodeService(s)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Print Barcode Sticker"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- NEW SERVICE RECEIVING MODAL ---------------- */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-sm">Service Receiving Intake Form</h3>
                <p className="text-xs text-slate-400">Workshop Hardware Repair & Inspection Registration</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Customer Selection or Quick Create */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">Customer Identification</span>
                  <button
                    type="button"
                    onClick={() => setNewCustomerMode(!newCustomerMode)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    {newCustomerMode ? 'Select Existing Customer' : '+ Add New Customer'}
                  </button>
                </div>

                {newCustomerMode ? (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Customer / Company Name *</label>
                      <input
                        type="text"
                        required
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        placeholder="e.g. Dhaka City College or Rahim Ahmed"
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Mobile Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        placeholder="+88017..."
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">WhatsApp Number</label>
                      <input
                        type="text"
                        value={newCustomerData.whatsapp}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, whatsapp: e.target.value })}
                        placeholder="+88017..."
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">Address *</label>
                      <input
                        type="text"
                        required
                        value={newCustomerData.address}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                        placeholder="Street, Area, City"
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium">Select Existing Customer</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.phone} ({c.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Product Category *</label>
                  <select
                    value={serviceFormData.product_category}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, product_category: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Brand *</label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.brand}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, brand: e.target.value })}
                    placeholder="e.g. Dell, HP, Epson, Hikvision"
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Model *</label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.model}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, model: e.target.value })}
                    placeholder="e.g. Latitude 5420 / L3110"
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Serial Number</label>
                  <input
                    type="text"
                    value={serviceFormData.serial_number}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, serial_number: e.target.value })}
                    placeholder="e.g. SN-884219"
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Accessories Received</label>
                  <input
                    type="text"
                    value={serviceFormData.accessories}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, accessories: e.target.value })}
                    placeholder="e.g. Power adapter, Carry bag, Power cord"
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">Reported Problems *</label>
                <textarea
                  required
                  rows={2}
                  value={serviceFormData.reported_problems}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, reported_problems: e.target.value })}
                  placeholder="Describe customer's reported symptoms or hardware failure..."
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Physical Condition</label>
                  <input
                    type="text"
                    value={serviceFormData.physical_condition}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, physical_condition: e.target.value })}
                    placeholder="e.g. Minor scratches, hinge loose, glass clean"
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={serviceFormData.estimated_delivery_date}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, estimated_delivery_date: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Initial Estimated Cost (BDT)</label>
                  <input
                    type="number"
                    value={serviceFormData.estimated_cost}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, estimated_cost: e.target.value })}
                    placeholder="Optional budget estimate"
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Assign Initial Technician (Optional)</label>
                  <select
                    value={serviceFormData.assigned_technician_id}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, assigned_technician_id: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="">Leave unassigned (Workshop reception pool)</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium">Internal Remarks</label>
                <input
                  type="text"
                  value={serviceFormData.additional_remarks}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, additional_remarks: e.target.value })}
                  placeholder="Storage shelf, priority tag, or client special instructions"
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
                  Save & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- WORKSHOP DIAGNOSTICS & STATUS MODAL ---------------- */}
      {showEditModal && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold text-blue-400">{activeService.id}</span>
                <span className="text-xs font-medium text-slate-300">
                  {activeService.product_category} ({activeService.brand} {activeService.model})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPrintReceiptService(activeService)}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                >
                  Receipt
                </button>
                <button
                  onClick={() => setPrintBarcodeService(activeService)}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                >
                  Barcode
                </button>
                <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateService} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
              {/* Status and Technician Assignment */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Service Lifecycle Status</label>
                  <select
                    value={editWorkData.status}
                    onChange={(e) => setEditWorkData({ ...editWorkData, status: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-blue-800"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Assigned Technician</label>
                  <select
                    disabled={user?.role === 'technician'}
                    value={editWorkData.assigned_technician_id}
                    onChange={(e) => setEditWorkData({ ...editWorkData, assigned_technician_id: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:bg-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Technical Diagnostics */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Hardware Problems Identified (Diagnosis)</label>
                  <textarea
                    rows={2}
                    value={editWorkData.problems_identified}
                    onChange={(e) => setEditWorkData({ ...editWorkData, problems_identified: e.target.value })}
                    placeholder="Findings after bench inspection, multimeter tests, or error diagnostics..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Work Completed / Repairs Done</label>
                  <textarea
                    rows={2}
                    value={editWorkData.work_completed}
                    onChange={(e) => setEditWorkData({ ...editWorkData, work_completed: e.target.value })}
                    placeholder="Component replaced, BIOS reflashed, thermal cleaning, calibration tests..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Spare Parts Used */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">Spare Parts & Components Replaced</span>
                  <div className="flex items-center space-x-2">
                    <select
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        if (prod) handleAddPartToWork(prod);
                        e.target.value = '';
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                      defaultValue=""
                    >
                      <option value="" disabled>+ Add Part from Inventory...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — BDT {p.selling_price} (Stock: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {editWorkData.parts_list.length === 0 ? (
                  <p className="text-slate-400 text-xs py-2 italic text-center">No parts used yet.</p>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {editWorkData.parts_list.map((part: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg text-xs">
                        <div className="font-medium text-slate-800">{part.product_name}</div>
                        <div className="flex items-center space-x-3">
                          <span className="text-slate-500 font-mono">Qty: {part.quantity}</span>
                          <span className="font-semibold text-slate-900">BDT {part.total_price}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePart(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Calculation Fields */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Labour Charge (BDT)</label>
                  <input
                    type="number"
                    value={editWorkData.labor_charge}
                    onChange={(e) => setEditWorkData({ ...editWorkData, labor_charge: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Discount (BDT)</label>
                  <input
                    type="number"
                    value={editWorkData.discount}
                    onChange={(e) => setEditWorkData({ ...editWorkData, discount: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">VAT Amount (BDT)</label>
                  <input
                    type="number"
                    value={editWorkData.vat_amount}
                    onChange={(e) => setEditWorkData({ ...editWorkData, vat_amount: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Amount Received (BDT)</label>
                  <input
                    type="number"
                    value={editWorkData.amount_received}
                    onChange={(e) => setEditWorkData({ ...editWorkData, amount_received: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded text-emerald-700 font-bold"
                  />
                </div>
              </div>

              {/* Handover Details (When Delivered) */}
              {editWorkData.status === 'Delivered' && (
                <div className="border border-emerald-300 bg-emerald-50/50 rounded-xl p-3.5 space-y-2">
                  <span className="font-bold text-emerald-900 text-xs uppercase tracking-wide">
                    Product Handover Record (Required for Delivery)
                  </span>
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    <div>
                      <label className="text-[10px] text-slate-600 font-semibold">Actual Delivery Date *</label>
                      <input
                        type="date"
                        required
                        value={editWorkData.actual_delivery_date}
                        onChange={(e) => setEditWorkData({ ...editWorkData, actual_delivery_date: e.target.value })}
                        className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 font-semibold">Handover Person Name *</label>
                      <input
                        type="text"
                        required
                        value={editWorkData.handover_person_name}
                        onChange={(e) => setEditWorkData({ ...editWorkData, handover_person_name: e.target.value })}
                        placeholder="Person who collected the unit"
                        className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 font-semibold">Handover Phone *</label>
                      <input
                        type="text"
                        required
                        value={editWorkData.handover_person_phone}
                        onChange={(e) => setEditWorkData({ ...editWorkData, handover_person_phone: e.target.value })}
                        placeholder="+8801..."
                        className="w-full mt-1 px-3 py-1 bg-white border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Return Reason (When Returned / Not Repaired) */}
              {editWorkData.status === 'Returned / Not Repaired' && (
                <div className="border border-rose-300 bg-rose-50/50 rounded-xl p-3.5">
                  <label className="text-[11px] font-bold text-rose-900 uppercase">Reason for Return / Unrepaired Status *</label>
                  <textarea
                    required
                    rows={2}
                    value={editWorkData.return_reason}
                    onChange={(e) => setEditWorkData({ ...editWorkData, return_reason: e.target.value })}
                    placeholder="e.g. Spare chip discontinued, client declined estimated repair budget..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-rose-200 rounded"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Save Service Record Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Modals */}
      <ReceiptModal
        service={printReceiptService}
        onClose={() => setPrintReceiptService(null)}
      />
      <BarcodeModal
        service={printBarcodeService}
        onClose={() => setPrintBarcodeService(null)}
      />
    </div>
  );
};
