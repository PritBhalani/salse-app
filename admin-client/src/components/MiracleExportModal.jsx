import React, { useState } from 'react';
import { FileSpreadsheet, Download, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { miracleAPI } from '../services/api';

export const MiracleExportModal = ({ isOpen, onClose }) => {
  const [billType, setBillType] = useState('ALL');
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadSales = () => {
    setDownloading(true);
    const url = miracleAPI.downloadSalesExcelUrl(billType === 'ALL' ? '' : billType);
    window.open(url, '_blank');
    setTimeout(() => setDownloading(false), 1200);
  };

  const handleDownloadReceipts = () => {
    setDownloading(true);
    const url = miracleAPI.downloadReceiptsExcelUrl(billType === 'ALL' ? '' : billType);
    window.open(url, '_blank');
    setTimeout(() => setDownloading(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Miracle Accounting Export</h3>
            <p className="text-xs text-slate-400">Generate standard Excel files formatted for Miracle software import</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Select Billing Book Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setBillType('ALL')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                billType === 'ALL'
                  ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setBillType('GST')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                billType === 'GST'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              GST Tax Bills
            </button>
            <button
              onClick={() => setBillType('NON_GST')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                billType === 'NON_GST'
                  ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              Without GST (Rough)
            </button>
          </div>
        </div>

        {/* Export Actions */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm text-slate-200">1. Sales Orders & Invoices</div>
              <div className="text-xs text-slate-400">Exports Party Name, GSTIN, Items, Quantities, Rates & Taxes</div>
            </div>
            <button
              onClick={handleDownloadSales}
              disabled={downloading}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export Sales</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm text-slate-200">2. Payment Receipts</div>
              <div className="text-xs text-slate-400">Exports Cash, Cheque No, Bank, UPI References & Settled Vouchers</div>
            </div>
            <button
              onClick={handleDownloadReceipts}
              disabled={downloading}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export Receipts</span>
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 flex items-start space-x-2 text-xs text-slate-400 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            The downloaded Excel spreadsheets match Miracle Software’s Voucher Import structure. Open Miracle &gt; Utilities &gt; Excel Import to sync instantly.
          </span>
        </div>
      </div>
    </div>
  );
};
