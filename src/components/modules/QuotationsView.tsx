import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  FileSpreadsheet, 
  Calendar, 
  X,
  Edit,
  Eye
} from 'lucide-react';
import { Quotation, QuotationItem, QuotationStatus, Customer, Product } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const QuotationsView: React.FC = () => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);

  // New Quotation Form State
  const [formCustomer, setFormCustomer] = useState({ id: '', name: '', contact_person: '', phone: '', address: '' });
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<QuotationItem[]>([
    {
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
      vat_percent: 5,
      tax_percent: 0,
      warranty_period: '1 Year',
      total_price: 0,
    },
  ]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [vatRate, setVatRate] = useState(5);
  const [vatType, setVatType] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [terms, setTerms] = useState(
    '1. Prices valid for 15 days.\n2. 50% advance with work order, balance upon delivery.\n3. Official hardware warranty covered with on-site support.'
  );
  const [deliveryTime, setDeliveryTime] = useState('2-3 Business Days');
  const [paymentTerms, setPaymentTerms] = useState('Cash / Bank / Cheque / Net 15');

  const loadData = async () => {
    setLoading(true);
    try {
      const [qList, cList, pList] = await Promise.all([
        api.getQuotations({ search, status: statusFilter !== 'all' ? statusFilter : undefined }),
        api.getCustomers(),
        api.getProducts(),
      ]);
      setQuotations(qList);
      setCustomers(cList);
      setProducts(pList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleSelectCustomer = (custId: string) => {
    const c = customers.find((cust) => cust.id === custId);
    if (c) {
      setFormCustomer({
        id: c.id,
        name: c.name,
        contact_person: c.contact_person || c.name,
        phone: c.phone,
        address: c.address,
      });
    }
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product_id: prod.id,
      product_name: `${prod.brand} ${prod.name}`,
      description: prod.description || '',
      unit_price: prod.selling_price,
      vat_percent: prod.vat_percent || 5,
      warranty_period: prod.warranty_period || '1 Year',
      total_price: updated[index].quantity * prod.selling_price,
    };
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;
    const q = Number(updated[index].quantity) || 1;
    const p = Number(updated[index].unit_price) || 0;
    const d = Number(updated[index].discount) || 0;
    updated[index].total_price = Math.max(0, q * p - d);
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        product_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        vat_percent: 5,
        tax_percent: 0,
        warranty_period: '1 Year',
        total_price: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const totalDiscount = discountType === 'percent' ? (subtotal * discountValue) / 100 : discountValue;
  const taxable = Math.max(0, subtotal - totalDiscount);
  const vatAmount = vatType === 'inclusive' 
    ? taxable - taxable / (1 + vatRate / 100) 
    : (taxable * vatRate) / 100;
  const grandTotal = vatType === 'inclusive' ? taxable : taxable + vatAmount;

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createQuotation({
        customer_id: formCustomer.id || null,
        customer_name: formCustomer.name,
        contact_person: formCustomer.contact_person,
        phone: formCustomer.phone,
        address: formCustomer.address,
        valid_until: validUntil,
        items,
        discount_type: discountType,
        discount_value: discountValue,
        vat_rate: vatRate,
        vat_type: vatType,
        terms_and_conditions: terms,
        delivery_time: deliveryTime,
        payment_terms: paymentTerms,
        status: 'Sent',
      });
      setShowNewModal(false);
      loadData();
    } catch (err: any) {
      alert(`Error creating quotation: ${err.message}`);
    }
  };

  const handleStatusChange = async (quoId: string, status: QuotationStatus) => {
    let rejectionReason = '';
    if (status === 'Rejected') {
      const r = prompt('Reason for rejection:');
      if (r === null) return;
      rejectionReason = r;
    }
    try {
      await api.updateQuotationStatus(quoId, { status, rejection_reason: rejectionReason });
      loadData();
      if (viewQuotation && viewQuotation.id === quoId) {
        setViewQuotation({ ...viewQuotation, status });
      }
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleConvertToService = async (quoId: string) => {
    if (!confirm('Convert this Won Quotation into an official Service / Sales Order?')) return;
    try {
      const res = await api.convertQuotationToService(quoId);
      alert(`Quotation converted! Service order created: ${res.serviceId}`);
      loadData();
      if (viewQuotation) setViewQuotation(null);
    } catch (err: any) {
      alert(`Error converting: ${err.message}`);
    }
  };

  const getStatusBadge = (status: QuotationStatus) => {
    const badges: Record<QuotationStatus, string> = {
      'Draft': 'bg-slate-100 text-slate-700',
      'Sent': 'bg-blue-50 text-blue-700 border-blue-200',
      'Follow-up Required': 'bg-amber-50 text-amber-800 border-amber-200',
      'Under Discussion': 'bg-purple-50 text-purple-700 border-purple-200',
      'Approved': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Completed / Won': 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
      'Closed / Lost': 'bg-rose-50 text-rose-700 border-rose-200',
      'Rejected': 'bg-rose-50 text-rose-700 border-rose-200',
      'Expired': 'bg-slate-200 text-slate-600',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badges[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quotation Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hardware quotation builder, inclusive/exclusive VAT, warranty, follow-ups, and one-click order conversion.
          </p>
        </div>

        <button
          onClick={() => {
            if (customers.length > 0) handleSelectCustomer(customers[0].id);
            setShowNewModal(true);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Quotation</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation number, client name, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Under Discussion">Under Discussion</option>
            <option value="Approved">Approved</option>
            <option value="Completed / Won">Completed / Won</option>
            <option value="Closed / Lost">Closed / Lost</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Quote ID</th>
                <th className="py-3 px-4 font-semibold">Customer / Contact</th>
                <th className="py-3 px-4 font-semibold">Issue Date</th>
                <th className="py-3 px-4 font-semibold">Valid Until</th>
                <th className="py-3 px-4 font-semibold">Grand Total</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading quotations...</td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No quotations found.</td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{q.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{q.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{q.contact_person} ({q.phone})</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{q.quotation_date}</td>
                    <td className="py-3 px-4 text-slate-600">{q.valid_until}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">BDT {q.grand_total.toLocaleString()}</td>
                    <td className="py-3 px-4">{getStatusBadge(q.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={async () => {
                            const full = await api.getQuotation(q.id);
                            setViewQuotation(full);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                        >
                          View / Print
                        </button>
                        {q.status !== 'Completed / Won' ? (
                          <button
                            onClick={() => handleStatusChange(q.id, 'Completed / Won')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold"
                            title="Mark as Won"
                          >
                            Mark Won
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConvertToService(q.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium"
                            title="Convert to active Service Order"
                          >
                            Convert to Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- NEW QUOTATION MODAL ---------------- */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="font-bold text-sm">Create Hardware & Service Quotation</h3>
                <p className="text-xs text-slate-400">Official commercial proposal with VAT & warranty breakdown</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
              {/* Customer selection */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="col-span-1">
                  <label className="text-[11px] font-bold text-slate-700">Select Customer *</label>
                  <select
                    value={formCustomer.id}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="">Choose...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formCustomer.contact_person}
                    onChange={(e) => setFormCustomer({ ...formCustomer, contact_person: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formCustomer.phone}
                    onChange={(e) => setFormCustomer({ ...formCustomer, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-100 flex items-center justify-between border-b border-slate-200 font-bold text-slate-800">
                  <span>Hardware Products & Services</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <select
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs mb-1"
                          defaultValue=""
                        >
                          <option value="" disabled>Select from Product DB...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.brand} {p.name} (BDT {p.selling_price})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          value={item.product_name}
                          onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                          placeholder="Item Name"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-slate-400">Warranty</label>
                        <input
                          type="text"
                          value={item.warranty_period}
                          onChange={(e) => handleItemChange(idx, 'warranty_period', e.target.value)}
                          placeholder="e.g. 1 Year"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[9px] text-slate-400">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-semibold"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-slate-400">Unit Price (BDT)</label>
                        <input
                          type="number"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-semibold"
                        />
                      </div>

                      <div className="col-span-2 text-right">
                        <label className="text-[9px] text-slate-400 block">Line Total</label>
                        <span className="font-bold text-slate-900 text-xs">BDT {item.total_price.toLocaleString()}</span>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculations Box */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">VAT Calculation Mode</label>
                      <select
                        value={vatType}
                        onChange={(e) => setVatType(e.target.value as any)}
                        className="w-full mt-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded"
                      >
                        <option value="exclusive">Exclusive (+ {vatRate}% VAT)</option>
                        <option value="inclusive">Inclusive (VAT inside total)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">VAT Rate (%)</label>
                      <input
                        type="number"
                        value={vatRate}
                        onChange={(e) => setVatRate(Number(e.target.value))}
                        className="w-full mt-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Quotation-level Discount</label>
                    <div className="flex space-x-2 mt-1">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded"
                      >
                        <option value="fixed">Fixed BDT</option>
                        <option value="percent">Percentage %</option>
                      </select>
                      <input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span>BDT {subtotal.toLocaleString()}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Total Discount:</span>
                      <span>- BDT {totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>VAT ({vatRate}% {vatType}):</span>
                    <span>BDT {vatAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
                    <span>Grand Total:</span>
                    <span className="text-blue-900">BDT {grandTotal.toLocaleString()}</span>
                  </div>
                </div>
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
                  Save & Issue Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- VIEW / PRINT QUOTATION MODAL ---------------- */}
      {viewQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:my-0 print:border-none print:shadow-none print:max-w-none print:rounded-none">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
              <span className="font-bold text-sm">Official Commercial Quotation: {viewQuotation.id}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print A4 Quotation</span>
                </button>
                <button onClick={() => setViewQuotation(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable A4 Body */}
            <div className="p-8 text-slate-800 print:p-4 text-xs font-sans print-page">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5">
                <div>
                  <h1 className="text-2xl font-black text-blue-900 uppercase">IT LAB SOLUTIONS LIMITED</h1>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">Hardware Sales, Commercial IT Infrastructure & Systems</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Suite 7B, Al-Razi Complex, 166-167 Shahid Syed Nazrul Islam Sarani, Purana Paltan, Dhaka-1000<br />
                    Phone: +880 2 223389012, +880 1711 000001 | Email: support@itlabsolutions.com
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded uppercase">
                    PRICE QUOTATION
                  </span>
                  <div className="font-mono font-bold text-sm text-blue-800 mt-2">{viewQuotation.id}</div>
                  <div className="text-slate-500 text-[11px] mt-1">Date: {viewQuotation.quotation_date}</div>
                  <div className="text-slate-500 text-[11px]">Valid Until: {viewQuotation.valid_until}</div>
                </div>
              </div>

              {/* Client Info */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 mb-5 print:bg-white">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
                  Client Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Customer Name: </span>
                    <span className="font-bold text-slate-900">{viewQuotation.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Contact Person: </span>
                    <span className="font-medium text-slate-800">{viewQuotation.contact_person}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone: </span>
                    <span className="font-mono text-slate-800">{viewQuotation.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Address: </span>
                    <span className="text-slate-700">{viewQuotation.address || 'Dhaka'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3">Warranty</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total (BDT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewQuotation.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {item.product_name}
                          {item.description && <p className="text-[11px] text-slate-500">{item.description}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{item.warranty_period}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">BDT {item.unit_price.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono">BDT {item.total_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Box */}
              <div className="flex justify-end mb-6">
                <div className="w-64 space-y-1.5 text-xs border border-slate-200 rounded-lg p-3 bg-slate-50/50 print:bg-white">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>BDT {viewQuotation.subtotal.toLocaleString()}</span>
                  </div>
                  {viewQuotation.total_discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>- BDT {viewQuotation.total_discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>VAT ({viewQuotation.vat_rate}% {viewQuotation.vat_type}):</span>
                    <span>BDT {viewQuotation.vat_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1.5">
                    <span>Grand Total:</span>
                    <span className="text-blue-900">BDT {viewQuotation.grand_total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Signatures */}
              <div className="border-t border-slate-200 pt-4">
                <div className="text-[10px] text-slate-600 space-y-1 mb-12">
                  <p className="font-bold text-slate-800">Terms & Conditions:</p>
                  <p>{viewQuotation.terms_and_conditions}</p>
                </div>

                <div className="grid grid-cols-2 gap-16 pt-8 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2 font-medium text-slate-700">
                    Prepared By: {viewQuotation.prepared_by}<br />
                    <span className="text-[10px] text-slate-400">IT Lab Solutions Limited</span>
                  </div>
                  <div className="border-t border-slate-400 pt-2 font-medium text-slate-700">
                    Accepted By Client & Seal<br />
                    <span className="text-[10px] text-slate-400">Authorized Signature & Date</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
