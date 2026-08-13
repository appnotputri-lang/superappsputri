import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';

export const FirestoreQuotaBanner: React.FC = () => {
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setQuotaExceeded(true);
    };

    window.addEventListener('firestore_quota_exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore_quota_exceeded', handleQuotaExceeded);
    };
  }, []);

  if (!quotaExceeded || dismissed) return null;

  const dbUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

  return (
    <div className="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-50 border-b border-amber-600">
      <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
        <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
        <span>
          <strong>Batas Kuota Firestore Terlampaui (Free Tier Database Limit Exceeded).</strong> Aplikasi berjalan menggunakan data cache/lokal.
        </span>
        <a
          href={dbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-amber-950 text-amber-100 hover:bg-black px-2.5 py-1 rounded font-semibold transition-colors shrink-0 ml-2"
        >
          <span>Upgrade / Atur Billing</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-950 hover:text-black p-1 rounded shrink-0 ml-2 cursor-pointer"
        title="Tutup Notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
