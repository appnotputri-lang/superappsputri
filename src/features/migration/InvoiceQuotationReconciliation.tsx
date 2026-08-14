import React, { useState } from 'react';
import { getApiUrl } from '../../lib/api';
import { auth } from '../../lib/firebase';

export const InvoiceQuotationReconciliation: React.FC = () => {
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async () => {
    setLoadingAudit(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Anda harus login.");

      const res = await fetch(getApiUrl('/api/migration/reconcile-invoices-quotations'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
         const err = await res.text();
         throw new Error(err);
      }
      const data = await res.json();
      setAuditResult(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleImport = async () => {
    setLoadingImport(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Anda harus login.");

      const res = await fetch(getApiUrl('/api/migration/import-invoices-quotations'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
         const err = await res.text();
         throw new Error(err);
      }
      await handleAudit(); // Refresh audit
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoadingImport(false);
    }
  };

  const isAllSynced = auditResult && 
    auditResult.invoices.onlyInFirestore.length === 0 && 
    auditResult.invoices.fieldMismatches.length === 0 &&
    auditResult.quotations.onlyInFirestore.length === 0 && 
    auditResult.quotations.fieldMismatches.length === 0;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-800">Audit Invoice & Quotation</h3>
        <p className="text-xs text-slate-500 mt-1">
          Rekonsiliasi data antara Firestore dan Cloudflare D1. Server-side only.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold border border-red-100">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button 
          onClick={handleAudit} 
          disabled={loadingAudit || loadingImport}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
        >
          {loadingAudit ? 'Memeriksa...' : 'Audit Data'}
        </button>

        {auditResult && !isAllSynced && (
          <button 
            onClick={handleImport} 
            disabled={loadingImport || loadingAudit} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            {loadingImport ? 'Mengimpor...' : 'Import Data yang Belum Ada'}
          </button>
        )}
      </div>

      {auditResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 text-sm">INVOICE</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600"><span>Firestore:</span> <span className="font-mono font-bold text-slate-800">{auditResult.invoices.firestoreCount}</span></div>
              <div className="flex justify-between text-slate-600"><span>D1:</span> <span className="font-mono font-bold text-slate-800">{auditResult.invoices.d1Count}</span></div>
              <div className="flex justify-between text-red-600 font-medium"><span>Belum di D1:</span> <span className="font-mono">{auditResult.invoices.onlyInFirestore.length}</span></div>
              <div className="flex justify-between text-orange-600 font-medium"><span>Berbeda:</span> <span className="font-mono">{auditResult.invoices.fieldMismatches.length}</span></div>
              <div className="flex justify-between text-blue-600 font-medium"><span>Extra di D1:</span> <span className="font-mono">{auditResult.invoices.onlyInD1.length}</span></div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 text-sm">QUOTATION</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600"><span>Firestore:</span> <span className="font-mono font-bold text-slate-800">{auditResult.quotations.firestoreCount}</span></div>
              <div className="flex justify-between text-slate-600"><span>D1:</span> <span className="font-mono font-bold text-slate-800">{auditResult.quotations.d1Count}</span></div>
              <div className="flex justify-between text-red-600 font-medium"><span>Belum di D1:</span> <span className="font-mono">{auditResult.quotations.onlyInFirestore.length}</span></div>
              <div className="flex justify-between text-orange-600 font-medium"><span>Berbeda:</span> <span className="font-mono">{auditResult.quotations.fieldMismatches.length}</span></div>
              <div className="flex justify-between text-blue-600 font-medium"><span>Extra di D1:</span> <span className="font-mono">{auditResult.quotations.onlyInD1.length}</span></div>
            </div>
          </div>
        </div>
      )}

      {auditResult && isAllSynced && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 text-xs font-semibold mt-4">
          ✅ Migrasi selesai. Seluruh data sudah sinkron dan identik.
        </div>
      )}
      {auditResult && !isAllSynced && (
        <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 text-xs font-semibold mt-4">
          ⚠️ Masih terdapat perbedaan data. Klik Import untuk menyinkronkan.
        </div>
      )}
    </div>
  );
};
