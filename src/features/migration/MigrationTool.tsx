import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export default function MigrationTool() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="m-8 max-w-4xl mx-auto border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">Migration Tool - Legacy Projects to Office Projects</h2>
      </div>
      <div className="p-6">
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => runMigration(true)} 
            disabled={loading} 
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
          >
            Run Dry Run
          </button>
          <button 
            onClick={() => runMigration(false)} 
            disabled={loading} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Execute Migration
          </button>
        </div>
        
        <div className="bg-slate-900 text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto whitespace-pre-wrap">
          {logs.length === 0 ? "Click 'Run Dry Run' to preview changes..." : logs.join('\n')}
        </div>
      </div>
    </div>
  );
}
