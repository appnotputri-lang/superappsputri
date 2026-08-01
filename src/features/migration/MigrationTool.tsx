import React, { useState } from 'react';
import { Database, Upload } from 'lucide-react';
import { PageContainer, PageHeader } from '../../components/ui/PageLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export default function MigrationTool() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importFiles, setImportFiles] = useState<{ deeds?: any[]; private_deeds?: any[]; outgoing_mails?: any[] }>({});

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
    console.log(msg);
  };

  const runMigration = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    addLog(`=== STARTING MIGRATION (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    try {
      const companyProfileCache: Record<string, string> = {};
      const unmappedProfiles = new Set<string>();
      let totalMigrated = 0;

      // Load existing profiles
      addLog("Loading existing profiles...");
      const snap = await getDocs(collection(db, 'profiles'));
      snap.forEach(d => {
        const data = d.data();
        if (data.companyName) {
          companyProfileCache[data.companyName.toLowerCase().trim()] = d.id;
        }
      });
      addLog(`Loaded ${Object.keys(companyProfileCache).length} profiles into cache.`);

      const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const findCompanyProfileId = (rawData: any) => {
        let companyName = rawData.companyName || rawData.namaPt || rawData.targetCompanyName || '';
        if (typeof companyName !== 'string' || companyName.trim() === '') {
          return 'UNMAPPED_PROFILE';
        }
        
        // Use clean title logic similar to ProjectDetail for matching
        const cleanTitle = companyName.includes(' — ') 
          ? companyName.split(' — ')[1].trim() 
          : companyName.includes(' - ') 
            ? companyName.split(' - ')[1].trim() 
            : companyName.trim();

        const cacheKey = cleanTitle.toLowerCase();
        if (companyProfileCache[cacheKey]) {
          return companyProfileCache[cacheKey];
        }

        // Fallback to exact match if clean failed or wasn't needed
        const exactKey = companyName.toLowerCase().trim();
        if (companyProfileCache[exactKey]) {
          return companyProfileCache[exactKey];
        }
        
        unmappedProfiles.add(companyName);
        return 'UNMAPPED_PROFILE';
      };

      const getJobType = (collectionName: string, rawData: any) => {
        if (collectionName === 'pendirian_projects') return 'pendirian_pt';
        if (collectionName === 'rupst_projects' || collectionName === 'rupst_public_projects') {
          return rawData.documentType === 'Sirkuler' ? 'sirkuler' : 'rups_t';
        }
        if (collectionName === 'projects') {
          const docType = String(rawData.documentType || '').toUpperCase();
          if (docType === 'RUPSLB') return 'rups_lb';
          if (docType === 'PENDIRIAN') return 'pendirian_pt';
          if (docType === 'RUPST') return 'rups_t';
          if (docType === 'SIRKULER') return 'sirkuler';
          return 'rups_lb';
        }
        return 'rups_lb'; 
      };

      const getStatus = (rawData: any) => {
        const docStatus = String(rawData.documentStatus || rawData.status || '').toUpperCase();
        if (docStatus === 'COMPLETED' || docStatus === 'SELESAI') return 'completed';
        if (rawData.isArchived) {
          // If it was already completed, keep it completed. If not, default to completed for archived items 
          // unless explicitly marked as something else, to avoid 'cancelled' confusion.
          return 'completed';
        }
        if (docStatus === 'CANCELLED' || rawData.isCancelled) return 'cancelled';
        return 'draft';
      };

      const getTitle = (rawData: any) => {
        let name = rawData.companyName || rawData.namaPt || rawData.targetCompanyName || 'Unknown Company';
        if (typeof name !== 'string' || name.trim() === '') name = 'Unknown Company';
        return name.trim();
      };

      const getRedirectPath = (jobType: string) => {
        switch (jobType) {
          case 'rups_lb': return '/rupslb';
          case 'rups_t': return '/rupst';
          case 'pendirian_pt': return '/pendirian';
          case 'sirkuler': return '/rupst';
          case 'sirkuler_rupslb': return '/rupslb';
          default: return '/';
        }
      };

      const processCollection = async (collectionName: string) => {
        addLog(`\n=== Analyzing Collection: ${collectionName} ===`);
        const snapshot = await getDocs(collection(db, collectionName));
        addLog(`Found ${snapshot.size} documents.`);
        
        let batch = writeBatch(db);
        let count = 0;

        for (const d of snapshot.docs) {
          const data = d.data();
          const clientId = findCompanyProfileId(data);
          const jobType = getJobType(collectionName, data);
          
          let companyName = data.companyName || data.namaPt || data.targetCompanyName || 'Unknown Company';
          if (typeof companyName !== 'string' || companyName.trim() === '') companyName = 'Unknown Company';
          
          const title = getTitle(data);
          const status = getStatus(data);
          
          const newProjectRef = doc(db, 'office_projects', d.id);
          const projectData = {
            projectId: d.id,
            clientId: clientId,
            jobType: jobType,
            title: title,
            status: status,
            currentStep: 'draft', 
            assignedTo: 'unassigned',
            metadata: {
              migratedFrom: collectionName,
              ...data
            },
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          };
          
          const docRefId = generateId();
          const docRef = doc(db, 'office_projects', d.id, 'documents', docRefId);
          const documentData = {
            id: docRefId,
            name: title,
            url: getRedirectPath(jobType),
            refId: d.id,
            type: 'form',
            uploadedBy: 'migration',
            uploadedAt: new Date().toISOString()
          };

          if (!isDryRun) {
            batch.set(newProjectRef, projectData);
            batch.set(docRef, documentData);
          } else {
             if (count < 3) {
               addLog(`[DRY RUN] Mapping for ${d.id}: Title=${projectData.title}, JobType=${projectData.jobType}`);
             }
          }
          
          count++;
          totalMigrated++;
          
          if (!isDryRun && count % 100 === 0) {
            await batch.commit();
            addLog(`Committed ${count} / ${snapshot.size} items...`);
            batch = writeBatch(db);
          }
        }
        
        if (!isDryRun && count % 100 !== 0) {
          await batch.commit();
        }
        
        addLog(`${isDryRun ? '[DRY RUN] ' : ''}Processed ${count} items from ${collectionName}.`);
      };

      await processCollection('projects');
      await processCollection('rupst_projects');
      await processCollection('rupst_public_projects');
      await processCollection('pendirian_projects');
      
      addLog('\n=== MIGRATION SUMMARY ===');
      addLog(`Total projects processed: ${totalMigrated}`);
      addLog(`Unmapped Company Profiles (${unmappedProfiles.size}):`);
      Array.from(unmappedProfiles).slice(0, 10).forEach(p => addLog(`  - ${p}`));
      if (unmappedProfiles.size > 10) addLog(`  ... and ${unmappedProfiles.size - 10} more`);

    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // NORMALISASI DATA NOTARIS (Akta / Legalisasi & Waarmerking / Surat Keluar)
  //
  // superappsputri dan "copy-of-notaris-putri" (app lama) memakai Firebase
  // project & nama collection Firestore YANG SAMA (deeds, private_deeds,
  // outgoing_mails) — jadi ini BUKAN migrasi antar-database, tapi menulis
  // ulang di tempat (id dokumen sama) dokumen yang masih memakai nama field
  // lama supaya bisa terbaca oleh menu Buku Daftar Akta / Buku Legalisasi &
  // Waarmerking / Laporan Notaris di superappsputri. Dokumen yang sudah
  // pakai nama field baru dilewati otomatis (tidak ditimpa).
  // ============================================================================

  const runNotaryMigration = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    addLog(`=== STARTING NOTARY DATA NORMALIZATION (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    try {
      const toIso = (val: any): string => {
        if (typeof val === 'number') return new Date(val).toISOString();
        if (typeof val === 'string' && val) return val;
        return new Date().toISOString();
      };

      let totalChanged = 0;
      let totalSkipped = 0;

      // --- deeds (Buku Daftar Akta) ---
      addLog('\n=== Scanning collection: deeds ===');
      const deedsSnap = await getDocs(collection(db, 'deeds'));
      addLog(`Found ${deedsSnap.size} documents.`);
      let deedsBatch = writeBatch(db);
      let deedsBatchCount = 0;
      let deedsChanged = 0;

      for (const d of deedsSnap.docs) {
        const data: any = d.data();
        const isLegacyShape = !data.number && (data.deedNumber || data.deedDate || data.deedTitle);
        if (!isLegacyShape) { totalSkipped++; continue; }

        const notesParts: string[] = [];
        if (data.clientName) notesParts.push(`Klien: ${data.clientName}`);
        if (data.notes) notesParts.push(String(data.notes));

        const createdAtIso = toIso(data.createdAt);
        const newData: any = {
          ...data,
          number: data.deedNumber ?? '',
          date: data.deedDate ?? '',
          title: data.deedTitle ?? '',
          category: data.category ?? data.jobName ?? '',
          orderNumber: data.orderNumber ?? '',
          appearers: data.appearers ?? [],
          picName: data.picName ?? '',
          notes: notesParts.join(' | ') || data.notes || undefined,
          createdAt: createdAtIso,
          updatedAt: toIso(data.updatedAt) || createdAtIso,
        };

        if (isDryRun) {
          if (deedsChanged < 3) {
            addLog(`[DRY RUN] deeds/${d.id}: deedNumber="${data.deedNumber}" -> number="${newData.number}", deedDate -> date="${newData.date}"`);
          }
        } else {
          deedsBatch.set(doc(db, 'deeds', d.id), newData);
          deedsBatchCount++;
          if (deedsBatchCount % 400 === 0) {
            await deedsBatch.commit();
            deedsBatch = writeBatch(db);
          }
        }
        deedsChanged++;
        totalChanged++;
      }
      if (!isDryRun && deedsBatchCount % 400 !== 0) await deedsBatch.commit();
      addLog(`${isDryRun ? '[DRY RUN] ' : ''}Normalized ${deedsChanged} / ${deedsSnap.size} deed(s).`);

      // --- private_deeds (Buku Legalisasi & Waarmerking) ---
      addLog('\n=== Scanning collection: private_deeds ===');
      const pdSnap = await getDocs(collection(db, 'private_deeds'));
      addLog(`Found ${pdSnap.size} documents.`);
      let pdBatch = writeBatch(db);
      let pdBatchCount = 0;
      let pdChanged = 0;

      for (const d of pdSnap.docs) {
        const data: any = d.data();
        const isLegacyShape = !data.registrationDate && (data.regNumber || data.regDate || data.contentSummary);
        if (!isLegacyShape) { totalSkipped++; continue; }

        const notesParts: string[] = [];
        if (data.docDate) notesParts.push(`Tanggal Dokumen: ${data.docDate}`);
        if (data.notes) notesParts.push(String(data.notes));

        const createdAtIso = toIso(data.createdAt);
        const newData: any = {
          ...data,
          number: data.number ?? data.regNumber ?? '',
          registrationDate: data.regDate ?? '',
          type: data.type ?? '',
          description: data.description ?? data.contentSummary ?? '',
          parties: data.parties ?? data.signatories ?? [],
          picName: data.picName ?? '',
          notes: notesParts.join(' | ') || data.notes || undefined,
          createdAt: createdAtIso,
          updatedAt: toIso(data.updatedAt) || createdAtIso,
        };

        if (isDryRun) {
          if (pdChanged < 3) {
            addLog(`[DRY RUN] private_deeds/${d.id}: regNumber="${data.regNumber}" -> number="${newData.number}", type="${newData.type}"`);
          }
        } else {
          pdBatch.set(doc(db, 'private_deeds', d.id), newData);
          pdBatchCount++;
          if (pdBatchCount % 400 === 0) {
            await pdBatch.commit();
            pdBatch = writeBatch(db);
          }
        }
        pdChanged++;
        totalChanged++;
      }
      if (!isDryRun && pdBatchCount % 400 !== 0) await pdBatch.commit();
      addLog(`${isDryRun ? '[DRY RUN] ' : ''}Normalized ${pdChanged} / ${pdSnap.size} private deed(s).`);

      // --- outgoing_mails (Surat Keluar) ---
      addLog('\n=== Scanning collection: outgoing_mails ===');
      const mailSnap = await getDocs(collection(db, 'outgoing_mails'));
      addLog(`Found ${mailSnap.size} documents.`);
      let mailBatch = writeBatch(db);
      let mailBatchCount = 0;
      let mailChanged = 0;

      for (const d of mailSnap.docs) {
        const data: any = d.data();
        const isLegacyShape = !data.mailNumber && (data.fullNumber || data.referenceNumber);
        if (!isLegacyShape) { totalSkipped++; continue; }

        const notesParts: string[] = [];
        if (data.referenceNumber) notesParts.push(`No. Urut: ${data.referenceNumber}`);
        if (data.notes) notesParts.push(String(data.notes));

        const createdAtIso = toIso(data.createdAt);
        const newData: any = {
          ...data,
          mailNumber: data.fullNumber ?? '',
          date: data.date ?? '',
          recipient: data.recipient ?? '',
          subject: data.subject ?? '',
          notes: notesParts.join(' | ') || data.notes || undefined,
          createdAt: createdAtIso,
          updatedAt: toIso(data.updatedAt) || createdAtIso,
        };

        if (isDryRun) {
          if (mailChanged < 3) {
            addLog(`[DRY RUN] outgoing_mails/${d.id}: fullNumber="${data.fullNumber}" -> mailNumber="${newData.mailNumber}"`);
          }
        } else {
          mailBatch.set(doc(db, 'outgoing_mails', d.id), newData);
          mailBatchCount++;
          if (mailBatchCount % 400 === 0) {
            await mailBatch.commit();
            mailBatch = writeBatch(db);
          }
        }
        mailChanged++;
        totalChanged++;
      }
      if (!isDryRun && mailBatchCount % 400 !== 0) await mailBatch.commit();
      addLog(`${isDryRun ? '[DRY RUN] ' : ''}Normalized ${mailChanged} / ${mailSnap.size} outgoing mail(s).`);

      addLog('\n=== NOTARY DATA NORMALIZATION SUMMARY ===');
      addLog(`Total documents rewritten: ${totalChanged}`);
      addLog(`Total documents already in new format (skipped): ${totalSkipped}`);

    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // IMPORT LANGSUNG DARI FILE JSON (hasil export dari app lama notarisputri.web.id)
  //
  // Dipakai kalau data akta/waarmerking/surat keluar app lama TIDAK ditemukan
  // lewat "Normalisasi Data Notaris" di atas (artinya app lama live pakai
  // Firestore/project yang beda dari yang dipakai superappsputri sekarang).
  // Upload file export_deeds.json / export_private_deeds.json /
  // export_outgoing_mails.json (hasil export dari app lama), lalu proses ini
  // akan memetakan field lama ke field baru dan menuliskannya ke Firestore
  // superappsputri (project yang dipakai app ini sekarang), pakai id dokumen
  // yang sama seperti aslinya supaya aman dijalankan ulang tanpa duplikat.
  // ============================================================================

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'deeds' | 'private_deeds' | 'outgoing_mails') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('File harus berisi array JSON.');
      setImportFiles(prev => ({ ...prev, [key]: parsed }));
      addLog(`File ${file.name} dimuat: ${parsed.length} dokumen.`);
    } catch (err: any) {
      alert(`Gagal membaca file: ${err.message}`);
    }
  };

  const runJsonImport = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    addLog(`=== STARTING JSON IMPORT (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    try {
      const toIso = (val: any): string => {
        if (typeof val === 'number') return new Date(val).toISOString();
        if (typeof val === 'string' && val) return val;
        return new Date().toISOString();
      };

      let totalImported = 0;

      // --- deeds ---
      if (importFiles.deeds && importFiles.deeds.length > 0) {
        addLog(`\n=== Importing ${importFiles.deeds.length} deeds ===`);
        let batch = writeBatch(db);
        let count = 0;
        for (const raw of importFiles.deeds) {
          const createdAtIso = toIso(raw.createdAt);
          const notesParts: string[] = [];
          if (raw.clientName) notesParts.push(`Klien: ${raw.clientName}`);
          if (raw.jobName) notesParts.push(`Pekerjaan: ${raw.jobName}`);

          const newData: any = {
            id: raw.id,
            number: raw.deedNumber ?? raw.number ?? '',
            date: raw.deedDate ?? raw.date ?? '',
            title: raw.deedTitle ?? raw.title ?? '',
            orderNumber: raw.orderNumber ?? '',
            category: raw.category ?? '',
            // appearers dari app lama (role, grantors bersarang, bertindakSebagai, mewakili)
            // sudah kompatibel dengan skema baru, dibawa apa adanya:
            appearers: raw.appearers ?? [],
            picName: raw.picName ?? '',
            notes: notesParts.join(' | ') || undefined,
            createdAt: createdAtIso,
            updatedAt: createdAtIso,
          };

          if (isDryRun) {
            if (count < 3) addLog(`[DRY RUN] deeds/${raw.id}: No.${newData.number} Urut ${newData.orderNumber} - ${newData.title?.slice(0, 40)}...`);
          } else {
            batch.set(doc(db, 'deeds', raw.id), newData);
            count++;
            if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
          }
          totalImported++;
        }
        if (!isDryRun) await batch.commit();
        addLog(`${isDryRun ? '[DRY RUN] ' : ''}Imported ${importFiles.deeds.length} deed(s).`);
      }

      // --- private_deeds ---
      if (importFiles.private_deeds && importFiles.private_deeds.length > 0) {
        addLog(`\n=== Importing ${importFiles.private_deeds.length} private deeds ===`);
        let batch = writeBatch(db);
        let count = 0;
        for (const raw of importFiles.private_deeds) {
          const createdAtIso = toIso(raw.createdAt);
          const notesParts: string[] = [];
          if (raw.docDate) notesParts.push(`Tanggal Dokumen: ${raw.docDate}`);

          const newData: any = {
            id: raw.id,
            number: raw.regNumber ?? raw.number ?? '',
            registrationDate: raw.regDate ?? raw.registrationDate ?? '',
            type: raw.type ?? '',
            description: raw.contentSummary ?? raw.description ?? '',
            parties: raw.signatories ?? raw.parties ?? [],
            picName: raw.picName ?? '',
            notes: notesParts.join(' | ') || undefined,
            createdAt: createdAtIso,
            updatedAt: createdAtIso,
          };

          if (isDryRun) {
            if (count < 3) addLog(`[DRY RUN] private_deeds/${raw.id}: No.${newData.number} - ${newData.type}`);
          } else {
            batch.set(doc(db, 'private_deeds', raw.id), newData);
            count++;
            if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
          }
          totalImported++;
        }
        if (!isDryRun) await batch.commit();
        addLog(`${isDryRun ? '[DRY RUN] ' : ''}Imported ${importFiles.private_deeds.length} private deed(s).`);
      }

      // --- outgoing_mails ---
      if (importFiles.outgoing_mails && importFiles.outgoing_mails.length > 0) {
        addLog(`\n=== Importing ${importFiles.outgoing_mails.length} outgoing mails ===`);
        let batch = writeBatch(db);
        let count = 0;
        for (const raw of importFiles.outgoing_mails) {
          const createdAtIso = toIso(raw.createdAt);
          const notesParts: string[] = [];
          if (raw.referenceNumber) notesParts.push(`No. Urut: ${raw.referenceNumber}`);

          const newData: any = {
            id: raw.id,
            mailNumber: raw.fullNumber ?? raw.mailNumber ?? '',
            date: raw.date ?? '',
            recipient: raw.recipient ?? '',
            subject: raw.subject ?? '',
            notes: notesParts.join(' | ') || undefined,
            createdAt: createdAtIso,
            updatedAt: createdAtIso,
          };

          if (isDryRun) {
            if (count < 3) addLog(`[DRY RUN] outgoing_mails/${raw.id}: ${newData.mailNumber} - ${newData.subject?.slice(0, 40)}...`);
          } else {
            batch.set(doc(db, 'outgoing_mails', raw.id), newData);
            count++;
            if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
          }
          totalImported++;
        }
        if (!isDryRun) await batch.commit();
        addLog(`${isDryRun ? '[DRY RUN] ' : ''}Imported ${importFiles.outgoing_mails.length} outgoing mail(s).`);
      }

      if (totalImported === 0) {
        addLog('\nTidak ada file yang diupload. Upload minimal 1 file JSON dulu.');
      } else {
        addLog(`\n=== IMPORT SUMMARY ===`);
        addLog(`Total dokumen ${isDryRun ? 'akan diimpor' : 'diimpor'}: ${totalImported}`);
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        icon={<Database className="w-5 h-5 text-white" />}
        title="Migration Tool"
        description="Legacy Projects to Office Projects migration utility"
      />

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex gap-4">
          <button 
            onClick={() => runMigration(true)} 
            disabled={loading} 
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run
          </button>
          <button 
            onClick={() => runMigration(false)} 
            disabled={loading} 
            className="px-4 py-2 bg-[#0c2444] text-white rounded-lg hover:bg-[#16365f] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Migration
          </button>
        </div>
        
        <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto whitespace-pre-wrap border border-slate-800">
          {logs.length === 0 ? "Click 'Run Dry Run' to preview changes..." : logs.join('\n')}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6 mt-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Normalisasi Data Akta / Legalisasi & Waarmerking / Surat Keluar</h3>
          <p className="text-xs text-slate-500 mt-1">
            Menyamakan field lama dari aplikasi Copy Notaris (deedNumber, regNumber, fullNumber, dst) ke format yang
            dipakai menu Buku Daftar Akta / Buku Legalisasi & Waarmerking / Laporan Notaris di superappsputri. Koleksi
            Firestore-nya SAMA (deeds, private_deeds, outgoing_mails) — proses ini hanya menulis ulang dokumen yang
            masih pakai nama field lama; dokumen yang sudah format baru dilewati otomatis.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => runNotaryMigration(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run (Notary Data)
          </button>
          <button
            onClick={() => runNotaryMigration(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#0c2444] text-white rounded-lg hover:bg-[#16365f] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Migration (Notary Data)
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6 mt-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Import Data dari JSON Export (App Lama)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Kalau data akta/waarmerking/surat keluar tidak muncul di panel "Normalisasi" di atas (berarti app lama
            live memakai Firestore yang berbeda), upload file <code>export_deeds.json</code>,{' '}
            <code>export_private_deeds.json</code>, dan/atau <code>export_outgoing_mails.json</code> hasil export dari
            app lama di sini. Aman dijalankan ulang — id dokumen dipertahankan sama seperti aslinya, jadi tidak akan
            dobel kalau diupload lagi.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['deeds', 'private_deeds', 'outgoing_mails'] as const).map((key) => (
            <label key={key} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-all">
              <Upload size={18} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                {key === 'deeds' ? 'export_deeds.json' : key === 'private_deeds' ? 'export_private_deeds.json' : 'export_outgoing_mails.json'}
              </span>
              <span className="text-[11px] text-slate-500">
                {importFiles[key] ? `${importFiles[key]!.length} dokumen dimuat` : 'Klik untuk upload'}
              </span>
              <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, key)} />
            </label>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => runJsonImport(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run (Import JSON)
          </button>
          <button
            onClick={() => runJsonImport(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#0c2444] text-white rounded-lg hover:bg-[#16365f] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Import (JSON)
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
