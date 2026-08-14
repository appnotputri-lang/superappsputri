import React, { useState } from 'react';
import { Database, Upload, Users } from 'lucide-react';
import { PageContainer, PageHeader } from '../../components/ui/PageLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { generateShortPublicToken } from '../../services/QuotationService';
import { CompanyService } from '../../services/CompanyService';
import { getApiUrl, getAuthHeaders } from '../../lib/api';

export default function MigrationTool() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importFiles, setImportFiles] = useState<{ deeds?: any[]; private_deeds?: any[]; outgoing_mails?: any[]; invoices?: any[]; documents?: any[]; quotations?: any[]; products?: any[] }>({});

  const [d1MigrationResult, setD1MigrationResult] = useState<any>(null);
  const [d1JsonResult, setD1JsonResult] = useState<any>(null);
  const [d1Loading, setD1Loading] = useState(false);
  const [d1JsonLoading, setD1JsonLoading] = useState(false);
  const [apiTestResults, setApiTestResults] = useState<any[]>([]);
  const [apiTesting, setApiTesting] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
    console.log(msg);
  };

  const runD1JsonMigration = async () => {
    setD1JsonLoading(true);
    setLogs([]);
    addLog("=== MEMULAI MIGRASI JSON -> CLOUDFLARE D1 (INVOICES, QUOTATIONS, PRODUCTS) ===");
    addLog("Sumber data: JSON File Export (Firestore Read = 0)");
    
    try {
      const invCount = importFiles.invoices?.length || 0;
      const quoCount = importFiles.quotations?.length || 0;
      const prodCount = importFiles.products?.length || 0;

      if (invCount === 0 && quoCount === 0 && prodCount === 0) {
        addLog("Peringatan: Belum ada file JSON (invoices, quotations, products) yang dimuat. Silakan upload file JSON atau klik 'Muat Contoh JSON'.");
      }

      addLog(`Mengirim payload ke API: ${invCount} invoices, ${quoCount} quotations, ${prodCount} products...`);
      
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/migration/d1-import'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoices: importFiles.invoices || [],
          quotations: importFiles.quotations || [],
          products: importFiles.products || []
        })
      });

      const result = await response.json() as any;
      if (!response.ok) {
        throw new Error(result.error || "Gagal menjalankan import D1");
      }

      setD1JsonResult(result);
      addLog("\n=======================================================");
      addLog("=== LAPORAN HASIL MIGRASI JSON -> CLOUDFLARE D1 ===");
      addLog("=======================================================");
      addLog(`Total Firestore Reads: ${result.firestoreReadCount} (GARANSI 0 READS)`);
      
      addLog("\n[INVOICES]");
      addLog(`JSON count: ${result.invoices.jsonCount}`);
      addLog(`D1 count: ${result.invoices.d1Count}`);
      addLog(`Migrated: ${result.invoices.migrated}`);
      addLog(`Failed: ${result.invoices.failed}`);
      addLog(`Validated: ${result.invoices.validatedCount}`);

      addLog("\n[QUOTATIONS]");
      addLog(`JSON count: ${result.quotations.jsonCount}`);
      addLog(`D1 count: ${result.quotations.d1Count}`);
      addLog(`Migrated: ${result.quotations.migrated}`);
      addLog(`Failed: ${result.quotations.failed}`);
      addLog(`Validated: ${result.quotations.validatedCount}`);

      addLog("\n[PRODUCTS]");
      addLog(`JSON count: ${result.products.jsonCount}`);
      addLog(`D1 count: ${result.products.d1Count}`);
      addLog(`Migrated: ${result.products.migrated}`);
      addLog(`Failed: ${result.products.failed}`);
      addLog(`Validated: ${result.products.validatedCount}`);

      addLog(`\nStatus Migrasi Keseluruhan: ${result.success ? "✓ SEMPURNA & VALID" : "✗ PERIKSA LOG/SAMPEL"}`);

    } catch (err: any) {
      addLog(`ERROR MIGRASI D1: ${err.message}`);
    } finally {
      setD1JsonLoading(false);
    }
  };

  const loadSampleJsonData = () => {
    const sampleProducts = Array.from({ length: 35 }, (_, i) => ({
      id: `prod-sample-${i + 1}`,
      name: `Produk Jasa Hukum ${i + 1}`,
      unitPrice: 500000 + i * 150000,
      description: `Deskripsi layanan hukum dan kenotariatan paket ${i + 1}`,
      isTaxed: i % 2 === 0,
      category: i % 3 === 0 ? 'Notaris' : i % 3 === 1 ? 'PPAT' : 'Konsultasi',
      createdAt: new Date(Date.now() - (35 - i) * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - (35 - i) * 86400000).toISOString()
    }));

    const sampleQuotations = Array.from({ length: 35 }, (_, i) => ({
      id: `quo-sample-${i + 1}`,
      quotationNumber: `QUO-2025-${String(i + 1).padStart(4, '0')}`,
      date: new Date(Date.now() - (35 - i) * 86400000).toISOString().split('T')[0],
      validUntil: new Date(Date.now() + (30 + i) * 86400000).toISOString().split('T')[0],
      clientId: `client-${(i % 10) + 1}`,
      clientName: `PT Nusantara Sukses ${i + 1}`,
      clientAddress: `Jl. Jenderal Sudirman No. ${i + 10}, Jakarta`,
      clientPhone: `0812345678${String(i).padStart(2, '0')}`,
      clientEmail: `info@nusantara${i + 1}.co.id`,
      clientSource: 'local',
      items: [
        { id: `item-1`, description: `Akta Pendirian PT ${i + 1}`, quantity: 1, unitPrice: 7500000 + i * 500000, amount: 7500000 + i * 500000 }
      ],
      subtotal: 7500000 + i * 500000,
      taxAmount: (7500000 + i * 500000) * 0.11,
      taxRate: 0.11,
      discount: 0,
      totalAmount: (7500000 + i * 500000) * 1.11,
      status: i % 4 === 0 ? 'DRAFT' : i % 4 === 1 ? 'SENT' : i % 4 === 2 ? 'ACCEPTED' : 'REJECTED',
      notes: `Penawaran harga pekerjaan notariat ke-${i + 1}`,
      jobTitle: `Pendirian PT Nusantara ${i + 1}`,
      createdAt: new Date(Date.now() - (35 - i) * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - (35 - i) * 86400000).toISOString()
    }));

    const sampleInvoices = Array.from({ length: 35 }, (_, i) => ({
      id: `inv-sample-${i + 1}`,
      invoiceNumber: `INV-2025-${String(i + 1).padStart(4, '0')}`,
      clientId: `client-${(i % 10) + 1}`,
      clientName: `PT Nusantara Sukses ${i + 1}`,
      clientSource: 'local',
      clientEmail: `finance@nusantara${i + 1}.co.id`,
      clientPhone: `0812345678${String(i).padStart(2, '0')}`,
      clientAddress: `Jl. Jenderal Sudirman No. ${i + 10}, Jakarta`,
      issueDate: new Date(Date.now() - (35 - i) * 86400000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: i % 3 === 0 ? 'PAID' : i % 3 === 1 ? 'UNPAID' : 'PARTIALLY_PAID',
      items: [
        { id: `inv-item-1`, description: `Jasa Pembuatan Akta & SK Kemenkumham ${i + 1}`, quantity: 1, unitPrice: 7500000 + i * 500000, amount: 7500000 + i * 500000 }
      ],
      subtotal: 7500000 + i * 500000,
      taxAmount: (7500000 + i * 500000) * 0.11,
      taxRate: 0.11,
      discount: 0,
      totalAmount: (7500000 + i * 500000) * 1.11,
      paidAmount: i % 3 === 0 ? (7500000 + i * 500000) * 1.11 : 0,
      balanceDue: i % 3 === 0 ? 0 : (7500000 + i * 500000) * 1.11,
      currency: 'IDR',
      quotationNumber: `QUO-2025-${String(i + 1).padStart(4, '0')}`,
      createdAt: new Date(Date.now() - (35 - i) * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - (35 - i) * 86400000).toISOString()
    }));

    setImportFiles(prev => ({
      ...prev,
      invoices: sampleInvoices,
      quotations: sampleQuotations,
      products: sampleProducts
    }));
    addLog("Berhasil memuat 35 Contoh Invoices, 35 Contoh Quotations, dan 35 Contoh Products untuk simulasi migrasi D1.");
  };

  const runD1Migration = async () => {
    setD1Loading(true);
    setLogs([]);
    addLog("=== STARTING CLOUDFLARE D1 MIGRATION ===");
    addLog("Triggering Firestore to Cloudflare D1 migration API...");
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/clients/migrate'), {
        method: 'POST',
        headers
      });
      const result = await response.json() as any;
      if (!response.ok) {
        throw new Error(result.error || "Failed to execute migration API");
      }
      setD1MigrationResult(result);
      addLog("=== CLOUDFLARE D1 MIGRATION SUCCESS ===");
      addLog(`Firestore Count: ${result.firestoreCount}`);
      addLog(`D1 Count: ${result.d1Count}`);
      addLog(`Total Firestore Reads: ${result.firestoreReadCount}`);
      addLog(`Is Identical? ${result.success ? "YES (Counts & Fields Match)" : "NO"}`);
      if (result.sampleComparisons && result.sampleComparisons.length > 0) {
        addLog(`Compared ${result.sampleComparisons.length} samples (first, random, last):`);
        result.sampleComparisons.forEach((c: any) => {
          addLog(`- [${c.type}] id: ${c.id}, match: ${c.match ? "OK" : "MISMATCH"}`);
          if (!c.match && c.mismatches) {
            c.mismatches.forEach((m: any) => {
              addLog(`   * Field [${m.field}] Mismatch - Firestore: ${JSON.stringify(m.firestore)}, D1: ${JSON.stringify(m.d1)}`);
            });
          }
        });
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setD1Loading(false);
    }
  };

  const runApiTests = async () => {
    setApiTesting(true);
    setLogs([]);
    addLog("=== STARTING CLOUDFLARE D1 API ENDPOINT TEST ===");
    const tests = [
      { name: "GET /api/clients?limit=15", url: '/api/clients?limit=15' },
      { name: "GET /api/clients/search?q=putri&limit=15", url: '/api/clients/search?q=putri&limit=15' },
      { name: "GET /api/clients/search?q=pt&limit=15", url: '/api/clients/search?q=pt&limit=15' },
      { name: "GET /api/clients?archived=false&limit=15", url: '/api/clients?archived=false&limit=15' },
      { name: "GET /api/clients?clientType=PT&limit=15", url: '/api/clients?clientType=PT&limit=15' }
    ];

    const results: any[] = [];
    try {
      for (const test of tests) {
        addLog(`Running: ${test.name}`);
        const headers = await getAuthHeaders();
        const response = await fetch(getApiUrl(test.url), { headers });
        const data = await response.json() as any;
        results.push({
          name: test.name,
          status: response.status,
          ok: response.ok,
          count: data.count || 0,
          sampleData: data.clients ? data.clients.slice(0, 3) : []
        });
        addLog(`Result: status ${response.status}, count: ${data.count || 0}`);
      }
      setApiTestResults(results);
      addLog("=== CLOUDFLARE D1 API TEST COMPLETED ===");
    } catch (err: any) {
      addLog(`API TEST ERROR: ${err.message}`);
    } finally {
      setApiTesting(false);
    }
  };

  const handleClientDirectoryMigration = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    try {
      await CompanyService.runClientDirectoryMigration(isDryRun, addLog);
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfillSearchTokens = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    try {
      await CompanyService.backfillSearchTokens(isDryRun, addLog);
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateLockBackfill = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    try {
      await CompanyService.runDuplicateAuditAndBackfill(isDryRun, addLog);
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'deeds' | 'private_deeds' | 'outgoing_mails' | 'invoices' | 'documents' | 'quotations' | 'products') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('File harus berisi array JSON.');
      setImportFiles(prev => ({ ...prev, [key]: parsed }));
      addLog(`File ${file.name} dimuat: ${parsed.length} dokumen (${key}).`);
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

  const runInvoiceJsonImport = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    addLog(`=== STARTING INVOICE IMPORT (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    const LEGACY_INVOICE_DOMAIN = 'https://notarisputri.web.id'; // sesuaikan domain app lama yang sebenarnya
    const OLD_TAX_RATE = 0.025; // tarif pajak tetap yang dipakai app lama

    try {
      if (!importFiles.invoices || importFiles.invoices.length === 0) {
        addLog('Upload export_invoices.json dulu.');
        return;
      }

      // Ambil semua profil klien sekali untuk pencocokan nama
      const [profilesSnap, cvSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'cv_profiles')),
      ]);
      const normalize = (s: string) => (s || '').toUpperCase().trim().replace(/\s+/g, ' ');
      const profileIndex = new Map<string, string>(); // normalizedName -> id
      profilesSnap.docs.forEach((d) => {
        const name = d.data().companyName || d.data().name || '';
        if (name) profileIndex.set(normalize(name), d.id);
      });
      cvSnap.docs.forEach((d) => {
        const name = d.data().companyName || d.data().name || '';
        if (name) profileIndex.set(normalize(name), d.id);
      });

      const unmatchedClients = new Set<string>();
      let batch = writeBatch(db);
      let count = 0;
      let imported = 0;

      for (const raw of importFiles.invoices) {
        const items = (raw.items || []).map((it: any, idx: number) => {
          const baseAmount = it.amount ?? (it.price || 0) * (it.quantity || 1);
          let grossAmount = baseAmount;
          let itemTax = 0;
          if (it.isTaxed) {
            grossAmount = Math.floor(baseAmount / (1 - OLD_TAX_RATE));
            itemTax = Math.floor(grossAmount - baseAmount);
          }
          return {
            id: `item_${idx}_${raw.id}`,
            description: it.description || '',
            quantity: it.quantity ?? 1,
            unitPrice: it.price ?? baseAmount,
            amount: grossAmount,
            isTaxed: !!it.isTaxed,
            taxRate: it.isTaxed ? OLD_TAX_RATE : undefined,
            _itemTax: itemTax, // dipakai sementara buat jumlah di bawah, tidak ikut disimpan
          };
        });

        const subtotal = items.reduce((sum: number, it: any) => sum + it.amount, 0);
        const taxAmount = items.reduce((sum: number, it: any) => sum + it._itemTax, 0);
        const totalAmount = raw.totalAmount ?? (subtotal - taxAmount);
        const paidAmount = raw.paymentAmount ?? (raw.paymentHistory || []).reduce((s: number, p: any) => s + (p.amount || 0), 0) ?? 0;
        const balanceDue = Math.max(0, totalAmount - paidAmount);

        const cleanItems = items.map(({ _itemTax, ...rest }: any) => rest);

        const normalizedName = normalize(raw.clientName);
        const matchedId = profileIndex.get(normalizedName);
        if (!matchedId && raw.clientName) unmatchedClients.add(raw.clientName);

        const numericPart = (raw.invoiceNumber || '').replace(/\D/g, '');
        const slug = numericPart || raw.invoiceNumber;
        const legacyPublicUrl = `${LEGACY_INVOICE_DOMAIN}/INV/${encodeURIComponent(slug)}`;

        const createdAtIso = typeof raw.createdAt === 'number' ? new Date(raw.createdAt).toISOString() : new Date().toISOString();

        const newData: any = {
          id: raw.id,
          invoiceNumber: raw.invoiceNumber,
          clientName: raw.clientName,
          clientId: matchedId || undefined,
          clientSource: matchedId ? 'superapps' : 'local',
          clientAddress: raw.clientAddress || '',
          issueDate: raw.date,
          dueDate: raw.dueDate,
          status: raw.status,
          items: cleanItems,
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount,
          balanceDue,
          language: raw.language || 'id',
          notes: raw.notes,
          paymentHistory: raw.paymentHistory || [],
          legacyPublicUrl,
          createdAt: createdAtIso,
          updatedAt: createdAtIso,
        };

        if (isDryRun) {
          if (imported < 3) {
            addLog(`[DRY RUN] invoices/${raw.id}: ${newData.invoiceNumber} - ${newData.clientName} (${matchedId ? 'klien cocok' : 'klien TIDAK cocok'}) - Total Rp${totalAmount.toLocaleString('id-ID')}`);
          }
        } else {
          batch.set(doc(db, 'invoices', raw.id), newData);
          count++;
          if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
        }
        imported++;
      }
      if (!isDryRun) await batch.commit();

      addLog(`\n${isDryRun ? '[DRY RUN] ' : ''}Imported ${imported} invoice(s).`);
      if (unmatchedClients.size > 0) {
        addLog(`\n=== Klien TIDAK ditemukan di daftar Klien superappsputri (${unmatchedClients.size}) ===`);
        addLog('Invoice-invoice ini tetap terimpor dengan nama klien apa adanya (clientSource: local), hanya belum terhubung ke profil:');
        Array.from(unmatchedClients).forEach((name) => addLog(`  - ${name}`));
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDocumentJsonImport = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    addLog(`=== STARTING DOCUMENT IMPORT (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    try {
      if (!importFiles.documents || importFiles.documents.length === 0) {
        addLog('Upload export_documents.json dulu.');
        return;
      }

      // Ambil semua profil klien sekali untuk pencocokan nama
      const [profilesSnap, cvSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'cv_profiles')),
      ]);
      const normalize = (s: string) => (s || '').toUpperCase().trim().replace(/\s+/g, ' ');
      const profileIndex = new Map<string, string>(); // normalizedName -> id
      profilesSnap.docs.forEach((d) => {
        const name = d.data().companyName || d.data().name || '';
        if (name) profileIndex.set(normalize(name), d.id);
      });
      cvSnap.docs.forEach((d) => {
        const name = d.data().companyName || d.data().name || '';
        if (name) profileIndex.set(normalize(name), d.id);
      });

      const unmatchedClients = new Set<string>();
      let batch = writeBatch(db);
      let count = 0;
      let imported = 0;

      for (const raw of importFiles.documents) {
        const normalizedName = normalize(raw.clientName);
        const matchedId = profileIndex.get(normalizedName);
        if (!matchedId && raw.clientName) unmatchedClients.add(raw.clientName);

        const createdAtIso = typeof raw.createdAt === 'number' 
          ? new Date(raw.createdAt).toISOString() 
          : (raw.createdAt || raw.date || new Date().toISOString());
          
        const docTypeMap = {
          'DELIVERY': 'DELIVERY',
          'RECEIPT': 'RECEIPT'
        };
        const docType = docTypeMap[raw.type as keyof typeof docTypeMap] || raw.type || 'DELIVERY';

        const newData: any = {
          id: raw.id,
          docType: docType,
          referenceNo: raw.referenceNo || '',
          date: raw.date || '',
          clientId: matchedId || raw.clientId || undefined,
          clientName: raw.clientName || '',
          clientSource: matchedId ? 'superapps' : 'local',
          clientPic: raw.clientPic || '',
          clientAddress: raw.clientAddress || '',
          clientContact: raw.clientContact || '',
          items: raw.items || [],
          officerName: raw.officerName || '',
          destination: raw.destination || '',
          notes: raw.notes || undefined,
          createdAt: createdAtIso,
          updatedAt: raw.updatedAt || createdAtIso,
        };

        if (docType === 'DELIVERY') {
          newData.deliveryMethod = raw.deliveryMethod || '';
          newData.trackingNumber = raw.trackingNumber || '';
        }

        if (isDryRun) {
          if (imported < 3) {
            addLog(`[DRY RUN] general_documents/${raw.id}: ${newData.referenceNo} - ${newData.docType} - ${newData.clientName} (${matchedId ? 'klien cocok' : 'klien TIDAK cocok'})`);
          }
        } else {
          batch.set(doc(db, 'general_documents', raw.id), newData);
          count++;
          if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
        }
        imported++;
      }
      if (!isDryRun) await batch.commit();

      addLog(`\n${isDryRun ? '[DRY RUN] ' : ''}Imported ${imported} document(s).`);
      if (unmatchedClients.size > 0) {
        addLog(`\n=== Klien TIDAK ditemukan di daftar Klien superappsputri (${unmatchedClients.size}) ===`);
        addLog('Document ini tetap terimpor dengan nama klien apa adanya (clientSource: local), hanya belum terhubung ke profil:');
        Array.from(unmatchedClients).forEach((name) => addLog(`  - ${name}`));
      }
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runQuotationJsonImport = async (isDryRun: boolean) => {
    setLoading(true);
    setLogs([]);
    addLog(`=== STARTING QUOTATION IMPORT (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    try {
      if (!importFiles.quotations || importFiles.quotations.length === 0) {
        addLog('Upload export_quotations.json dulu.');
        return;
      }

      // Ambil semua profil klien sekali untuk pencocokan nama
      const [profilesSnap, cvSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'cv_profiles')),
      ]);
      const normalize = (s: string) => (s || '').toUpperCase().trim().replace(/\s+/g, ' ');
      const profileIndex = new Map<string, any>(); // normalizedName -> profile data
      profilesSnap.docs.forEach((d) => {
        const name = d.data().companyName || d.data().name || '';
        if (name) profileIndex.set(normalize(name), { id: d.id, ...d.data() });
      });
      cvSnap.docs.forEach((d) => {
        const name = d.data().companyName || d.data().name || '';
        if (name) profileIndex.set(normalize(name), { id: d.id, ...d.data() });
      });

      const unmatchedClients = new Set<string>();
      let batch = writeBatch(db);
      let count = 0;
      let imported = 0;

      for (const raw of importFiles.quotations) {
        const normalizedName = normalize(raw.clientName);
        const matchedProfile = profileIndex.get(normalizedName);
        if (!matchedProfile && raw.clientName) unmatchedClients.add(raw.clientName);

        const createdAtIso = typeof raw.createdAt === 'number' 
          ? new Date(raw.createdAt).toISOString() 
          : (raw.createdAt || new Date().toISOString());

        const items = raw.items || [];
        const subtotal = items.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
        const totalAmount = raw.totalAmount || 0;
        const taxAmount = Math.max(0, totalAmount - subtotal);
        const publicToken = generateShortPublicToken();

        const newData: any = {
          id: raw.id,
          quotationNumber: raw.quotationNumber || '',
          date: raw.date || '',
          validUntil: raw.validUntil || '',
          clientId: matchedProfile?.id || raw.clientId || undefined,
          clientName: raw.clientName || '',
          clientAddress: raw.clientAddress || '',
          clientPhone: matchedProfile?.phone || matchedProfile?.picPhone || undefined,
          clientEmail: matchedProfile?.email || undefined,
          clientSource: matchedProfile ? 'superapps' : 'local',
          items: items,
          subtotal,
          taxAmount,
          totalAmount,
          status: raw.status || 'DRAFT',
          notes: raw.notes || '',
          jobTitle: raw.jobTitle || '',
          publicToken,
          createdAt: createdAtIso,
          updatedAt: createdAtIso,
        };

        if (isDryRun) {
          if (imported < 3) {
            addLog(`[DRY RUN] quotations/${raw.id}: ${newData.quotationNumber} - ${newData.clientName} (${matchedProfile ? 'klien cocok' : 'klien TIDAK cocok'}) - Total Rp${totalAmount.toLocaleString('id-ID')}`);
          }
        } else {
          batch.set(doc(db, 'quotations', raw.id), newData);
          count++;
          if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
        }
        imported++;
      }
      if (!isDryRun) await batch.commit();

      addLog(`\n${isDryRun ? '[DRY RUN] ' : ''}Imported ${imported} quotation(s).`);
      if (unmatchedClients.size > 0) {
        addLog(`\n=== Klien TIDAK ditemukan di daftar Klien superappsputri (${unmatchedClients.size}) ===`);
        addLog('Penawaran-penawaran ini tetap terimpor dengan nama klien apa adanya (clientSource: local), hanya belum terhubung ke profil:');
        Array.from(unmatchedClients).forEach((name) => addLog(`  - ${name}`));
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

      {/* D1 JSON MIGRATION CARD (INVOICES, QUOTATIONS, PRODUCTS) */}
      <div className="bg-white p-6 rounded-xl border-2 border-indigo-200 shadow-sm space-y-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-800">
                Migrasi Invoices, Quotations, & Products ke Cloudflare D1
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sumber data <strong>murni dari file JSON</strong> (Bukan Firestore). Firestore Read saat migrasi = <strong>0</strong>. 
              Menggunakan skema D1 (SQLite), memelihara ID dokumen asli dari JSON, dan mendukung Idempotent Upsert.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Firestore Read: 0
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Cloudflare D1 Ready
            </span>
          </div>
        </div>

        {/* File Upload Slots */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${importFiles.invoices ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:bg-slate-50'}`}>
            <Upload className={`w-5 h-5 mb-2 ${importFiles.invoices ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-xs font-bold text-slate-800">export_invoices.json</span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              {importFiles.invoices ? `✓ ${importFiles.invoices.length} invoices siap diimpor` : 'Klik untuk upload file JSON Invoices'}
            </span>
            <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, 'invoices')} />
          </label>

          <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${importFiles.quotations ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:bg-slate-50'}`}>
            <Upload className={`w-5 h-5 mb-2 ${importFiles.quotations ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-xs font-bold text-slate-800">export_quotations.json</span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              {importFiles.quotations ? `✓ ${importFiles.quotations.length} quotations siap diimpor` : 'Klik untuk upload file JSON Quotations'}
            </span>
            <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, 'quotations')} />
          </label>

          <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all text-center ${importFiles.products ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:bg-slate-50'}`}>
            <Upload className={`w-5 h-5 mb-2 ${importFiles.products ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-xs font-bold text-slate-800">export_products.json</span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              {importFiles.products ? `✓ ${importFiles.products.length} products siap diimpor` : 'Klik untuk upload file JSON Products'}
            </span>
            <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, 'products')} />
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runD1JsonMigration}
            disabled={d1JsonLoading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {d1JsonLoading ? "Memproses Migrasi & Validasi..." : "Jalankan Migrasi & Validasi D1 (JSON Source)"}
          </button>

          <button
            onClick={loadSampleJsonData}
            disabled={d1JsonLoading}
            className="px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            Muat Contoh Data Uji (Demo / Testing)
          </button>
        </div>

        {/* Report Output Box */}
        {d1JsonResult && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between bg-slate-900 text-white p-3.5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${d1JsonResult.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="text-xs font-bold">
                  Status Migrasi: {d1JsonResult.success ? "BERHASIL & VALID 100%" : "PERINGATAN / GAGAL"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                Firestore Reads: {d1JsonResult.firestoreReadCount}
              </span>
            </div>

            {/* Summary Format Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Invoices Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">INVOICES</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${d1JsonResult.invoices.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {d1JsonResult.invoices.isValid ? 'VALID' : 'INVALID'}
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>JSON count:</span> <strong className="font-bold">{d1JsonResult.invoices.jsonCount}</strong></div>
                  <div className="flex justify-between"><span>D1 count:</span> <strong className="font-bold">{d1JsonResult.invoices.d1Count}</strong></div>
                  <div className="flex justify-between text-emerald-700"><span>Migrated:</span> <strong>{d1JsonResult.invoices.migrated}</strong></div>
                  <div className="flex justify-between text-rose-600"><span>Failed:</span> <strong>{d1JsonResult.invoices.failed}</strong></div>
                  <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                    Validated: <strong>{d1JsonResult.invoices.validatedCount}</strong>
                  </div>
                </div>
              </div>

              {/* Quotations Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">QUOTATIONS</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${d1JsonResult.quotations.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {d1JsonResult.quotations.isValid ? 'VALID' : 'INVALID'}
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>JSON count:</span> <strong className="font-bold">{d1JsonResult.quotations.jsonCount}</strong></div>
                  <div className="flex justify-between"><span>D1 count:</span> <strong className="font-bold">{d1JsonResult.quotations.d1Count}</strong></div>
                  <div className="flex justify-between text-emerald-700"><span>Migrated:</span> <strong>{d1JsonResult.quotations.migrated}</strong></div>
                  <div className="flex justify-between text-rose-600"><span>Failed:</span> <strong>{d1JsonResult.quotations.failed}</strong></div>
                  <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                    Validated: <strong>{d1JsonResult.quotations.validatedCount}</strong>
                  </div>
                </div>
              </div>

              {/* Products Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">PRODUCTS</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${d1JsonResult.products.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {d1JsonResult.products.isValid ? 'VALID' : 'INVALID'}
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1 text-slate-700">
                  <div className="flex justify-between"><span>JSON count:</span> <strong className="font-bold">{d1JsonResult.products.jsonCount}</strong></div>
                  <div className="flex justify-between"><span>D1 count:</span> <strong className="font-bold">{d1JsonResult.products.d1Count}</strong></div>
                  <div className="flex justify-between text-emerald-700"><span>Migrated:</span> <strong>{d1JsonResult.products.migrated}</strong></div>
                  <div className="flex justify-between text-rose-600"><span>Failed:</span> <strong>{d1JsonResult.products.failed}</strong></div>
                  <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                    Validated: <strong>{d1JsonResult.products.validatedCount}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Breakdown Preview */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <h5 className="font-bold text-slate-700 mb-2">Sampel Validasi Otomatis (10 Awal, 10 Acak, 10 Akhir):</h5>
              <div className="space-y-1 font-mono text-[11px] max-h-48 overflow-y-auto bg-white p-3 rounded border border-slate-200">
                <div className="font-bold text-indigo-700 mb-1">Invoices ({d1JsonResult.invoices.samples.length} sampel):</div>
                {d1JsonResult.invoices.samples.map((s: any, idx: number) => (
                  <div key={idx} className={`flex items-center gap-2 ${s.match ? 'text-emerald-700' : 'text-rose-600'}`}>
                    <span>[{s.type}]</span>
                    <span>ID: {s.id}</span>
                    <span>- {s.match ? '✓ COCOK' : `✗ MISMATCH (${s.mismatches?.map((m: any) => m.field).join(', ')})`}</span>
                  </div>
                ))}

                <div className="font-bold text-indigo-700 mt-2 mb-1">Quotations ({d1JsonResult.quotations.samples.length} sampel):</div>
                {d1JsonResult.quotations.samples.map((s: any, idx: number) => (
                  <div key={idx} className={`flex items-center gap-2 ${s.match ? 'text-emerald-700' : 'text-rose-600'}`}>
                    <span>[{s.type}]</span>
                    <span>ID: {s.id}</span>
                    <span>- {s.match ? '✓ COCOK' : `✗ MISMATCH (${s.mismatches?.map((m: any) => m.field).join(', ')})`}</span>
                  </div>
                ))}

                <div className="font-bold text-indigo-700 mt-2 mb-1">Products ({d1JsonResult.products.samples.length} sampel):</div>
                {d1JsonResult.products.samples.map((s: any, idx: number) => (
                  <div key={idx} className={`flex items-center gap-2 ${s.match ? 'text-emerald-700' : 'text-rose-600'}`}>
                    <span>[{s.type}]</span>
                    <span>ID: {s.id}</span>
                    <span>- {s.match ? '✓ COCOK' : `✗ MISMATCH (${s.mismatches?.map((m: any) => m.field).join(', ')})`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6 mt-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-600" />
            Tahap 1: Migrasi Client Directory ke Cloudflare D1
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Membangun fondasi migrasi <code>client_directory</code> dari Firestore ke Cloudflare D1 (SQLite). 
            Ini memigrasikan data Firestore ke database Cloudflare D1, melakukan verifikasi jumlah data, 
            dan menjalankan pencocokan sample data (10 data pertama, 10 data acak, dan 10 data terakhir). 
            Firestore tetap menjadi SOURCE OF TRUTH utama aplikasi saat ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={runD1Migration}
            disabled={d1Loading || apiTesting}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {d1Loading ? "Migrating..." : "Jalankan Migrasi & Validasi D1"}
          </button>
          
          <button
            onClick={runApiTests}
            disabled={d1Loading || apiTesting}
            className="px-4 py-2 bg-[#0c2444] hover:bg-[#16365f] text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {apiTesting ? "Testing..." : "Jalankan Pengujian API D1"}
          </button>
        </div>

        {d1MigrationResult && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Hasil Migrasi & Validasi:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                <span className="text-[11px] text-slate-500 block">Status Validasi</span>
                <span className={`font-bold ${d1MigrationResult.success ? "text-emerald-600" : "text-rose-600"}`}>
                  {d1MigrationResult.success ? "✓ IDENTIK / COCOK" : "✗ GAGAL / MISMATCH"}
                </span>
              </div>
              <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                <span className="text-[11px] text-slate-500 block">Jumlah Data Firestore</span>
                <span className="font-bold text-slate-700">{d1MigrationResult.firestoreCount}</span>
              </div>
              <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                <span className="text-[11px] text-slate-500 block">Jumlah Data Cloudflare D1</span>
                <span className="font-bold text-slate-700">{d1MigrationResult.d1Count}</span>
              </div>
              <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                <span className="text-[11px] text-slate-500 block">Firestore Reads</span>
                <span className="font-bold text-slate-700">{d1MigrationResult.firestoreReadCount}</span>
              </div>
            </div>
          </div>
        )}

        {apiTestResults.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Hasil Pengujian Endpoint API D1:</h4>
            <div className="space-y-2">
              {apiTestResults.map((res, i) => (
                <div key={i} className="bg-white p-3 rounded-md border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="space-y-1">
                    <span className="font-mono font-semibold text-[#0c2444]">{res.name}</span>
                    <div className="flex gap-4 text-[11px] text-slate-500">
                      <span>HTTP Status: <strong className={res.ok ? "text-emerald-600" : "text-rose-600"}>{res.status}</strong></span>
                      <span>Returned Rows: <strong>{res.count}</strong></span>
                    </div>
                  </div>
                  {res.sampleData && res.sampleData.length > 0 && (
                    <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100 font-mono text-slate-600 max-w-lg overflow-x-auto">
                      Sample: {res.sampleData.map((c: any) => `${c.clientType} ${c.companyName}`).join(' | ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6 mt-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Sinkronisasi Client Directory (Optimasi Menu Klien)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Membangun/memperbarui koleksi ringan <code>client_directory</code> dari data master <code>profiles</code>.
            Ini memastikan Menu Klien membaca daftar ringan tanpa melakukan read pada seluruh dokumen profile lengkap.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => handleClientDirectoryMigration(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run (Client Directory)
          </button>
          <button
            onClick={() => handleClientDirectoryMigration(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#0c2444] text-white rounded-lg hover:bg-[#16365f] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Migration (Client Directory)
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6 mt-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Backfill Search Tokens (Optimasi Pencarian Kata Nama Klien)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Mengisi kembali field <code>searchTokens</code> pada seluruh dokumen <code>client_directory</code> yang sudah ada
            agar pencarian kata di dalam nama (misal mencari "BETA" untuk menemukan "PT BETA INDONESIA") berfungsi untuk seluruh klien lama.
            Proses ini 100% aman, idempotent, dan hanya mengubah dokumen yang memang belum memiliki token yang sesuai.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => handleBackfillSearchTokens(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run (Backfill Search Tokens)
          </button>
          <button
            onClick={() => handleBackfillSearchTokens(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Backfill (Live)
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6 mt-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            Audit Duplikat & Backfill Unique Keys (Pencegahan Duplikat Klien)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Mendeteksi klien duplikat di Firestore, menggabungkan data/project/akta mereka secara aman (auto-merge),
            dan melakukan backfill unique locks (<code>client_unique_keys</code>) untuk menjamin tidak akan ada duplikat baru.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => handleDuplicateLockBackfill(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Audit (Dry Run)
          </button>
          <button
            onClick={() => handleDuplicateLockBackfill(false)}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold transition-all cursor-pointer"
          >
            Execute Audit & Auto-Merge (Live)
          </button>
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
            Kalau data akta/waarmerking/surat keluar/invoice tidak muncul di panel "Normalisasi" di atas (berarti app lama
            live memakai Firestore yang berbeda), upload file <code>export_deeds.json</code>,{' '}
            <code>export_private_deeds.json</code>, <code>export_outgoing_mails.json</code>, dan/atau{' '}
            <code>export_invoices.json</code> hasil export dari app lama di sini. Aman dijalankan ulang — id dokumen
            dipertahankan sama seperti aslinya, jadi tidak akan dobel kalau diupload lagi.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          {(['deeds', 'private_deeds', 'outgoing_mails', 'invoices', 'documents', 'quotations'] as const).map((key) => (
            <label key={key} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-all">
              <Upload size={18} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                {key === 'deeds' ? 'export_deeds.json' : key === 'private_deeds' ? 'export_private_deeds.json' : key === 'outgoing_mails' ? 'export_outgoing_mails.json' : key === 'invoices' ? 'export_invoices.json' : key === 'documents' ? 'export_documents.json' : 'export_quotations.json'}
              </span>
              <span className="text-[11px] text-slate-500">
                {importFiles[key] ? `${importFiles[key]!.length} dokumen dimuat` : 'Klik untuk upload'}
              </span>
              <input type="file" accept=".json" className="hidden" onChange={(e) => handleFileUpload(e, key)} />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
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
          
          <div className="w-px bg-slate-200 self-stretch my-1 hidden sm:block" />

          <button
            onClick={() => runInvoiceJsonImport(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run (Import Invoice)
          </button>
          <button
            onClick={() => runInvoiceJsonImport(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#0c2444] text-white rounded-lg hover:bg-[#16365f] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Import (Invoice)
          </button>

          <div className="w-px bg-slate-200 self-stretch my-1 hidden sm:block" />

          <button
            onClick={() => runDocumentJsonImport(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run (Import Documents)
          </button>
          <button
            onClick={() => runDocumentJsonImport(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#0c2444] text-white rounded-lg hover:bg-[#16365f] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Import (Documents)
          </button>

          <div className="w-px bg-slate-200 self-stretch my-1 hidden sm:block" />

          <button
            onClick={() => runQuotationJsonImport(true)}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Run Dry Run (Import Quotations)
          </button>
          <button
            onClick={() => runQuotationJsonImport(false)}
            disabled={loading}
            className="px-4 py-2 bg-[#0c2444] text-white rounded-lg hover:bg-[#16365f] text-xs font-bold transition-all cursor-pointer"
          >
            Execute Import (Quotations)
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
