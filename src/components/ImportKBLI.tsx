import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import kbliData from '../../kbli_2025.json';

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
        <div className="p-6 bg-white rounded-lg shadow-md border border-slate-200 max-w-2xl mx-auto my-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Migration Tool: KBLI 2025 to Firestore</h2>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider">Metode Sinkronisasi</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                        <li>• Source: <code className="bg-white px-1 border rounded text-xs font-mono">kbli_2025.json</code></li>
                        <li>• Destination: Collection <code className="bg-white px-1 border rounded text-xs font-mono text-blue-600">kbli_2025</code></li>
                        <li>• ID Strategi: Menggunakan field <span className="font-medium text-slate-900">kode</span> sebagai Document ID</li>
                        <li>• Batching: Commit setiap <span className="font-medium text-slate-900">400 dokumen</span></li>
                    </ul>
                </div>

                {progress.total > 0 && (
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">Progress Transaksi</span>
                            <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{progress.current.toLocaleString()} / {progress.total.toLocaleString()} Data</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <div 
                                className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out" 
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
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-md font-bold text-white shadow-lg transition-all ${
                            isImporting 
                                ? 'bg-slate-400 cursor-not-allowed transform-none' 
                                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                        }`}
                    >
                        {isImporting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Migrating Data...
                            </>
                        ) : (
                            'Import KBLI ke Firestore'
                        )}
                    </button>
                    
                    <div className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                        status.includes('Error') ? 'bg-red-50 text-red-600' : 
                        status.includes('selesai') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                    }`}>
                        {status}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportKBLI;
