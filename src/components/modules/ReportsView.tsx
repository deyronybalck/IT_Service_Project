import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Printer, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Wrench, 
  FileText, 
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<any>(null);
  const [servicesSummary, setServicesSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReports = async () => {
    setLoading(true);
    try {
      const [fin, srv] = await Promise.all([
        api.getFinancialReport({ startDate: startDate || undefined, endDate: endDate || undefined }),
        api.getServicesSummary({ startDate: startDate || undefined, endDate: endDate || undefined }),
      ]);
      setFinancialData(fin);
      setServicesSummary(srv);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!financialData) return;
    const summary = financialData.summary || {};
    const rows = [
      ['Metric', 'Amount (BDT)'],
      ['Billed Revenue', summary.billedRevenue || 0],
      ['Payments Collected', summary.actualPaymentsCollected || 0],
      ['Outstanding Receivables', summary.outstandingReceivables || 0],
      ['Parts Cost', summary.partsCost || 0],
      ['Labor Charge', summary.laborCharge || 0],
      ['Discounts Given', summary.discountsGiven || 0],
      ['VAT Collected', summary.vatCollected || 0],
      ['TA/DA Expenses Disbursed', summary.tadaExpensePaid || 0],
      ['Gross Profit', summary.grossProfit || 0],
      ['Net Profit', summary.netProfit || 0],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ITLab_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = financialData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports & Financial Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Realized cash collections, billed revenues, parts expenditure, technician field costs, and net profit.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official A4 Report</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-blue-900 uppercase">IT LAB SOLUTIONS LIMITED</h1>
        <p className="text-xs text-slate-600 font-semibold">Executive Financial & Operational Performance Report</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Date Period: {startDate || 'Beginning of Records'} to {endDate || 'Present Date'} | Generated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
            />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset to All Time
            </button>
          )}
        </div>

        <button
          onClick={loadReports}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          title="Reload calculations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Executive Financial Statement Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
            Income Statement & Cashflow Summary
          </h3>
          <span className="text-xs text-slate-400 font-medium">Official Ledger Reconciled</span>
        </div>

        {/* Financial KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Billed Service</span>
            <div className="text-xl font-black text-slate-900 mt-1">
              BDT {summary.billedRevenue?.toLocaleString() || 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Total invoices issued</p>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Actual Cash Collected</span>
            <div className="text-xl font-black text-emerald-700 mt-1">
              BDT {summary.actualPaymentsCollected?.toLocaleString() || 0}
            </div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Cash / Bank / bKash realized</p>
          </div>

          <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Outstanding Receivables</span>
            <div className="text-xl font-black text-rose-600 mt-1">
              BDT {summary.outstandingReceivables?.toLocaleString() || 0}
            </div>
            <p className="text-[10px] text-rose-600 mt-0.5">Unpaid client balances</p>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Net Operating Profit</span>
            <div className="text-xl font-black text-blue-700 mt-1">
              BDT {summary.netProfit?.toLocaleString() || 0}
            </div>
            <p className="text-[10px] text-blue-600 mt-0.5">After parts cost & TA/DA expenses</p>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Revenue & Direct Costs */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 uppercase text-[11px]">
              Revenue & Direct Material Costs
            </h4>
            <div className="flex justify-between text-slate-700">
              <span>Billed Workshop Revenue:</span>
              <span className="font-semibold font-mono">BDT {summary.billedRevenue?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Labor / Service Charges:</span>
              <span className="font-semibold font-mono">BDT {summary.laborCharge?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Spare Parts Cost (Inventory COGS):</span>
              <span className="font-semibold font-mono">- BDT {summary.partsCost?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Customer Discounts Applied:</span>
              <span className="font-semibold font-mono">- BDT {summary.discountsGiven?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-2">
              <span>Gross Profit (Revenue - Parts Cost):</span>
              <span className="text-blue-900 font-mono">BDT {summary.grossProfit?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Operational Expenses & Net */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5 text-xs">
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 uppercase text-[11px]">
              Field Expenses & Net Settlement
            </h4>
            <div className="flex justify-between text-slate-700">
              <span>Gross Profit:</span>
              <span className="font-semibold font-mono">BDT {summary.grossProfit?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Technician TA/DA Field Disbursed:</span>
              <span className="font-semibold font-mono">- BDT {summary.tadaExpensePaid?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-amber-700 text-[11px]">
              <span>Approved TA/DA Pending Disbursement:</span>
              <span className="font-mono">BDT {summary.tadaApprovedPendingPayment?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Government VAT / Tax Collected:</span>
              <span className="font-semibold font-mono">+ BDT {summary.vatCollected?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>Net Profit Realized:</span>
              <span className="text-emerald-700 font-mono">BDT {summary.netProfit?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>

        {/* Payment Channels Breakdown */}
        {financialData?.paymentMethods && (
          <div className="border-t border-slate-100 pt-4 text-xs">
            <h4 className="font-bold text-slate-800 mb-2 uppercase text-[11px]">
              Collections by Payment Instrument
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {financialData.paymentMethods.map((m: any, i: number) => (
                <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">{m.method}</span>
                  <div className="font-bold text-slate-900 mt-0.5 font-mono">
                    BDT {m.collected_amount?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category and Technician Breakdowns */}
      {servicesSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Product Category */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h4 className="font-bold text-sm text-slate-900 mb-3">Service Volume by Product Category</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[9px]">
                  <tr>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-center">Units</th>
                    <th className="py-2 px-3 text-right">Billed Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {servicesSummary.byCategory?.map((cat: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-slate-800">{cat.product_category}</td>
                      <td className="py-2 px-3 text-center font-bold text-blue-700">{cat.count}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        BDT {cat.total_bill?.toLocaleString() || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Technician */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h4 className="font-bold text-sm text-slate-900 mb-3">Technician Productivity & Work Output</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[9px]">
                  <tr>
                    <th className="py-2 px-3">Service Engineer</th>
                    <th className="py-2 px-3 text-center">Completed Jobs</th>
                    <th className="py-2 px-3 text-right">Service Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {servicesSummary.byTechnician?.map((t: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-slate-800">{t.assigned_technician_name}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700">{t.jobs_count}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        BDT {t.total_bill?.toLocaleString() || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
