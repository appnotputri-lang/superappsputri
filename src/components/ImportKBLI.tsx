import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import kbliData from '../../kbli_2025.json';
import { PageContainer, PageHeader } from './ui/PageLayout';
import { Database, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * ImportKBLI Component
 * Handles the migration of KBLI 2025 JSON data to Firestore collection "kbli_2025"
 * Uses efficient write batches and provides real-time progress feedback.
 */
const ImportKBLI: React.FC = () => {
    const [status, setStatus] = useState<string>('Ready');
    const [progress, setProgress] = useState({ total: 0, current: 0, percent: 0 });
    const [isImporting, setIsImporting] = useState(false);

    const handleImport = async () => {
        if (!kbliData || !kbliData.data) {
            setStatus('Error: JSON data invalid or empty.');
            return;
        }

        const data = kbliData.data;
        const total = data.length;
        setIsImporting(true);
        setStatus('Importing documents to Firestore...');
        setProgress({ total, current: 0, percent: 0 });

        let batch = writeBatch(db);
        let count = 0;
        const BATCH_SIZE = 400; // Optimal batch size for Firestore

        try {
            for (let i = 0; i < total; i++) {
                const item = data[i];
                if (!item.kode) continue;

                // Use "kode" as the Document ID for guaranteed uniqueness and easy lookup
                const docRef = doc(db, 'kbli_2025', item.kode);
                
                // Set data with merge: true to avoid overwriting unrelated fields if they exist
                batch.set(docRef, {
                    kode: item.kode,
                    judul: item.judul,
                    uraian: item.uraian,
                    level: item.level,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                count++;
                
                // Commit the batch every 400 items or at the end of the total set
                if (count % BATCH_SIZE === 0 || i === total - 1) {
                    await batch.commit();
                    batch = writeBatch(db); // Create a new batch for the next set
                    
                    // Update progress state
                    const percent = Math.round((count / total) * 100);
                    setProgress({ total, current: count, percent });
                }
            }
            setStatus(`Import selesai. Total ${count} dokumen.`);
        } catch (error) {
            console.error('KBLI Import Error:', error);
            setStatus('Error: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <PageContainer>
            <PageHeader
                icon={<Database className="w-5 h-5 text-white" />}
                title="Migrasi Data KBLI 2025 ke Firestore"
                description="Import dan sinkronisasi database klasifikasi KBLI 2025 ke koleksi Firestore."
            />

            <div className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Metode Sinkronisasi</h3>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                        <li>• Source: <code className="bg-white px-1.5 py-0.5 border rounded text-xs font-mono">kbli_2025.json</code></li>
                        <li>• Destination: Collection <code className="bg-white px-1.5 py-0.5 border rounded text-xs font-mono text-blue-600">kbli_2025</code></li>
                        <li>• ID Strategi: Menggunakan field <span className="font-semibold text-slate-900">kode</span> sebagai Document ID</li>
                        <li>• Batching: Commit setiap <span className="font-semibold text-slate-900">400 dokumen</span></li>
                    </ul>
                </div>

                {progress.total > 0 && (
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">Progress Transaksi</span>
                            <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{progress.current.toLocaleString()} / {progress.total.toLocaleString()} Data</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <div 
                                className="bg-[#0c2444] h-full rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${progress.percent}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-xs font-bold text-slate-400">
                            {progress.percent}% LENGKAP
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                    <button
                        onClick={handleImport}
                        disabled={isImporting}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                            isImporting 
                                ? 'bg-slate-400 cursor-not-allowed' 
                                : 'bg-[#0c2444] hover:bg-[#16365f]'
                        }`}
                    >
                        {isImporting ? (
                            <>
                                <RefreshCw className="animate-spin h-4 w-4 text-white" />
                                Migrating Data...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Import KBLI ke Firestore
                            </>
                        )}
                    </button>
                    
                    <div className={`text-xs px-3 py-1.5 rounded-full font-bold ${
                        status.includes('Error') ? 'bg-red-50 text-red-600' : 
                        status.includes('selesai') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                    }`}>
                        {status}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
};

export default ImportKBLI;
