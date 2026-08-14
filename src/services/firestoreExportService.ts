import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type NotaryCollectionKey = 
  | 'deeds'
  | 'private_deeds'
  | 'incoming_mails'
  | 'outgoing_mails'
  | 'general_documents'
  | 'protest_cheques';

export interface NotaryCollectionMeta {
  key: NotaryCollectionKey;
  label: string;
  sublabel: string;
  defaultFilename: string;
}

export const NOTARY_EXPORT_COLLECTIONS: NotaryCollectionMeta[] = [
  {
    key: 'deeds',
    label: 'Buku Daftar Akta (Deeds)',
    sublabel: 'Akta Notaris, Komparisi, Penghadap, Order Number',
    defaultFilename: 'export_deeds.json',
  },
  {
    key: 'private_deeds',
    label: 'Buku Akta Di Bawah Tangan (Private Deeds)',
    sublabel: 'Legalisasi, Waarmerking, Pihak Terlibat',
    defaultFilename: 'export_private_deeds.json',
  },
  {
    key: 'incoming_mails',
    label: 'Buku Surat Masuk (Incoming Mails)',
    sublabel: 'Nomor Surat, Pengirim, Perihal, Tanggal Masuk',
    defaultFilename: 'export_incoming_mails.json',
  },
  {
    key: 'outgoing_mails',
    label: 'Buku Surat Keluar (Outgoing Mails)',
    sublabel: 'Nomor Surat, Penerima, Perihal, Lampiran',
    defaultFilename: 'export_outgoing_mails.json',
  },
  {
    key: 'general_documents',
    label: 'General Documents (Tanda Terima & Surat Jalan)',
    sublabel: 'Dokumen Fisik, Ekspedisi, Delivery, Receipt',
    defaultFilename: 'export_general_documents.json',
  },
  {
    key: 'protest_cheques',
    label: 'Buku Protes Cek / Wesel (Protest Cheques)',
    sublabel: 'Penolakan Cek, Bank, Pemohon, Nominal',
    defaultFilename: 'export_protest_cheques.json',
  },
];

/**
 * Deep converter to transform Firestore types (Timestamp, Date, nested objects)
 * into JSON-serializable primitives (ISO 8601 strings, clean values).
 */
export function serializeFirestoreValue(val: any): any {
  if (val === undefined || val === null) {
    return null;
  }

  // Handle Javascript Date objects
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Handle Firestore Timestamp instances (with .toDate() method or seconds/nanoseconds)
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch {
        // fallback to seconds if toDate fails
      }
    }
    if (typeof val.seconds === 'number' && (typeof val.nanoseconds === 'number' || val._nanoseconds !== undefined)) {
      try {
        const ms = val.seconds * 1000 + Math.round((val.nanoseconds || val._nanoseconds || 0) / 1e6);
        return new Date(ms).toISOString();
      } catch {
        // fallback
      }
    }
  }

  // Handle Arrays
  if (Array.isArray(val)) {
    return val.map(serializeFirestoreValue);
  }

  // Handle plain objects and dictionaries
  if (typeof val === 'object') {
    // If it's a special class or object with prototype not Object
    if (val.constructor && val.constructor.name !== 'Object') {
      // Check if it has a string representation or custom serializable form
      if (typeof val.toISOString === 'function') {
        return val.toISOString();
      }
    }

    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      const propVal = val[key];
      if (propVal !== undefined) {
        cleanObj[key] = serializeFirestoreValue(propVal);
      }
    }
    return cleanObj;
  }

  return val;
}

export interface CollectionExportResult {
  collection: NotaryCollectionKey;
  count: number;
  records: any[];
  exportedAt: string;
}

export interface FullNotaryExportResult {
  exportedAt: string;
  source: string;
  totalCollections: number;
  totalRecords: number;
  deeds: any[];
  private_deeds: any[];
  incoming_mails: any[];
  outgoing_mails: any[];
  general_documents: any[];
  protest_cheques: any[];
  counts: Record<NotaryCollectionKey, number>;
}

export class FirestoreExportService {
  /**
   * Export a single Firestore collection with exactly ONE getDocs() read call.
   * Guarantees 100% read-only behavior with 0 mutations to Firestore.
   */
  static async exportSingleCollection(collectionKey: NotaryCollectionKey): Promise<CollectionExportResult> {
    const colRef = collection(db, collectionKey);
    const snapshot = await getDocs(colRef);
    
    const records = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const serialized = serializeFirestoreValue(data);
      // Ensure the original Firestore document ID is strictly preserved
      return {
        id: docSnap.id,
        ...serialized,
      };
    });

    return {
      collection: collectionKey,
      count: records.length,
      records,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Export all 6 notary historical collections in sequence.
   * Total Firestore reads = exactly 1 per collection (6 reads total).
   */
  static async exportAllNotaryCollections(
    onProgress?: (key: NotaryCollectionKey, status: 'reading' | 'done' | 'error', count?: number, errorMsg?: string) => void
  ): Promise<FullNotaryExportResult> {
    const results: Record<NotaryCollectionKey, any[]> = {
      deeds: [],
      private_deeds: [],
      incoming_mails: [],
      outgoing_mails: [],
      general_documents: [],
      protest_cheques: [],
    };

    const counts: Record<NotaryCollectionKey, number> = {
      deeds: 0,
      private_deeds: 0,
      incoming_mails: 0,
      outgoing_mails: 0,
      general_documents: 0,
      protest_cheques: 0,
    };

    let totalRecords = 0;

    for (const meta of NOTARY_EXPORT_COLLECTIONS) {
      const key = meta.key;
      try {
        if (onProgress) {
          onProgress(key, 'reading');
        }

        const res = await this.exportSingleCollection(key);
        results[key] = res.records;
        counts[key] = res.count;
        totalRecords += res.count;

        if (onProgress) {
          onProgress(key, 'done', res.count);
        }
      } catch (err: any) {
        console.error(`[FirestoreExportService] Error exporting ${key}:`, err);
        if (onProgress) {
          onProgress(key, 'error', 0, err?.message || String(err));
        }
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      source: 'Firestore (Read-Only Export)',
      totalCollections: NOTARY_EXPORT_COLLECTIONS.length,
      totalRecords,
      deeds: results.deeds,
      private_deeds: results.private_deeds,
      incoming_mails: results.incoming_mails,
      outgoing_mails: results.outgoing_mails,
      general_documents: results.general_documents,
      protest_cheques: results.protest_cheques,
      counts,
    };
  }

  /**
   * Triggers client-side browser file download of JSON data.
   */
  static triggerJsonDownload(data: any, fileName: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
