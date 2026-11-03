import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, X, Download } from 'lucide-react';
import { Service } from '../../types/index.ts';

interface ReceiptModalProps {
  service: Service | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ service, onClose }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (service && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, service.id, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          font: 'monospace',
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [service]);

  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:my-0 print:border-none print:shadow-none print:max-w-none print:rounded-none">
        {/* Modal Controls (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm">Official Customer Service Receipt</span>
            <span className="text-xs text-slate-400">({service.id})</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 text-slate-800 print:p-4 text-xs font-sans print-page">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-5">
            <div>
              <div className="text-2xl font-black tracking-tight text-blue-900 uppercase">
                IT LAB SOLUTIONS LIMITED
              </div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                Professional IT Service Management & Hardware Workshop
              </div>
              <div className="text-[11px] text-slate-500 mt-1 max-w-md leading-relaxed">
                Suite 7B, Al-Razi Complex, 166-167 Shahid Syed Nazrul Islam Sarani, Purana Paltan, Dhaka-1000<br />
                Hotline: +880 2 223389012, +880 1711 000001 | Email: support@itlabsolutions.com
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="px-2.5 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded">
                SERVICE RECEIPT
              </span>
              <div className="mt-2">
                <svg ref={barcodeRef}></svg>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Date: <span className="font-semibold text-slate-800">{new Date(service.received_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Customer & Product Information Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Customer Box */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 print:bg-white print:border-slate-300">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
                Customer Details
              </div>
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900">{service.customer_name}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Phone:</span>
                  <span className="font-mono text-slate-800 font-medium">{service.phone}</span>
                </div>
                {service.whatsapp && (
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">WhatsApp:</span>
                    <span className="font-mono text-slate-800">{service.whatsapp}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Address:</span>
                  <span className="text-slate-700">{service.address}</span>
                </div>
              </div>
            </div>

            {/* Product Box */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 print:bg-white print:border-slate-300">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
                Product Details
              </div>
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Category:</span>
                  <span className="font-semibold text-blue-900">{service.product_category}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Brand & Model:</span>
                  <span className="font-medium text-slate-800">{service.brand} - {service.model}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Serial No:</span>
                  <span className="font-mono text-slate-800">{service.serial_number || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">Accessories:</span>
                  <span className="text-slate-700">{service.accessories || 'None'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Problem & Diagnostics Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 w-1/3">Reported Problem / Condition</th>
                  <th className="py-2.5 px-4 w-1/3">Diagnostic Findings & Work</th>
                  <th className="py-2.5 px-4 w-1/3">Service Status & Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 align-top">
                    <div className="font-semibold text-slate-800">Problem Reported:</div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{service.reported_problems}</p>
                    {service.physical_condition && (
                      <div className="mt-2 text-[11px]">
                        <span className="font-medium text-slate-500">Physical Condition:</span>{' '}
                        <span className="text-slate-700">{service.physical_condition}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 align-top">
                    <div className="font-semibold text-slate-800">Technical Findings:</div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {service.problems_identified || 'Under initial workshop inspection'}
                    </p>
                    {service.work_completed && (
                      <div className="mt-2 text-[11px]">
                        <span className="font-medium text-slate-500">Work Performed:</span>{' '}
                        <span className="text-emerald-700 font-medium">{service.work_completed}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 align-top">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Current Status:</span>
                      <span className="font-bold text-blue-700">{service.status}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Est. Delivery:</span>
                      <span className="font-medium text-slate-800">{service.estimated_delivery_date || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Received By:</span>
                      <span className="text-slate-700">{service.received_by}</span>
                    </div>
                    {service.assigned_technician_name && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500">Technician:</span>
                        <span className="text-slate-700">{service.assigned_technician_name}</span>
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-end mb-6">
            <div className="w-72 border border-slate-200 rounded-lg p-3 bg-slate-50/50 print:bg-white">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Parts Cost:</span>
                  <span>BDT {service.parts_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Service / Labour Charge:</span>
                  <span>BDT {service.labor_charge.toLocaleString()}</span>
                </div>
                {service.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>- BDT {service.discount.toLocaleString()}</span>
                  </div>
                )}
                {service.vat_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>VAT / Tax:</span>
                    <span>+ BDT {service.vat_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1.5">
                  <span>Total Bill:</span>
                  <span>BDT {service.total_bill.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>Amount Received:</span>
                  <span>BDT {service.amount_received.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-700 border-t border-slate-200 pt-1">
                  <span>Outstanding Balance:</span>
                  <span>BDT {service.outstanding_balance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Signatures */}
          <div className="border-t border-slate-200 pt-4">
            <div className="text-[10px] text-slate-500 space-y-1 mb-10 leading-normal">
              <p className="font-bold text-slate-700">Terms & Conditions:</p>
              <p>1. Please bring this original receipt at the time of delivery.</p>
              <p>2. IT Lab Solutions is not responsible for data loss. Customers are strongly advised to keep data backups.</p>
              <p>3. Goods not collected within 30 days of service completion notice may be subject to warehousing fees.</p>
              <p>4. Serviced hardware warranty applies only to the specific parts replaced as documented.</p>
            </div>

            <div className="grid grid-cols-2 gap-16 pt-8 text-center text-xs">
              <div className="border-t border-slate-400 pt-2 font-medium text-slate-700">
                Authorized Signature & Seal<br />
                <span className="text-[10px] text-slate-400">IT Lab Solutions Limited</span>
              </div>
              <div className="border-t border-slate-400 pt-2 font-medium text-slate-700">
                Customer Signature & Date<br />
                <span className="text-[10px] text-slate-400">I agree to the service terms and inspection notes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
