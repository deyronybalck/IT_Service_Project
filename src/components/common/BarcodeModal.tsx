import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, X } from 'lucide-react';
import { Service } from '../../types/index.ts';

interface BarcodeModalProps {
  service: Service | null;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ service, onClose }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (service && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, service.id, {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 13,
          font: 'monospace',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Failed to render barcode:', err);
      }
    }
  }, [service]);

  if (!service) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:w-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm">Product Barcode Sticker</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Barcode Label */}
        <div className="p-6 flex flex-col items-center justify-center text-center bg-white print:p-2">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 w-full max-w-xs bg-slate-50/50 print:border-solid print:border-black print:bg-white">
            <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              IT LAB SOLUTIONS LIMITED
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Workshop Repair Unit</div>

            <div className="my-2 flex justify-center">
              <svg ref={barcodeRef} className="max-w-full h-auto"></svg>
            </div>

            <div className="text-left border-t border-slate-200 pt-2 text-[11px] space-y-0.5 print:border-black">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[160px]">{service.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-800">{service.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-medium text-slate-800 truncate max-w-[160px]">{service.product_category} ({service.brand})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Received:</span>
                <span className="text-slate-700">{service.received_at.split('T')[0]}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 print:hidden">
            Scan this barcode on any USB scanner to instantly open this service file.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-slate-50 border-t border-slate-200 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sticker</span>
          </button>
        </div>
      </div>
    </div>
  );
};
