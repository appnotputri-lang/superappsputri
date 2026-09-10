import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AgendaItem, AgendaStatus } from '../types/agenda';
import { Project } from '../domain/project/Project';

const AGENDAS_COLLECTION = 'agendas';
const LOCAL_STORAGE_KEY = 'notaris_local_agendas_v1';

export class AgendaService {
  /**
   * Helper to get today's date string in YYYY-MM-DD format (local timezone)
   */
  static getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Load local cached agendas
   */
  static getLocalAgendas(): AgendaItem[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse local agendas:', e);
    }
    return [];
  }

  /**
   * Save local cached agendas
   */
  static setLocalAgendas(agendas: AgendaItem[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(agendas));
    } catch (e) {
      console.warn('Failed to store local agendas:', e);
    }
  }

  /**
   * Subscribe to manual agendas in Firestore in real-time
   */
  static subscribeAgendas(
    onData: (agendas: AgendaItem[]) => void,
    onError?: (err: any) => void
  ): () => void {
    try {
      const colRef = collection(db, AGENDAS_COLLECTION);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const items: AgendaItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              title: data.title || '',
              date: data.date || '',
              time: data.time || '09:00',
              type: data.type || 'Lainnya',
              clientOrProject: data.clientOrProject || '',
              notes: data.notes || '',
              status: data.status || 'scheduled',
              source: data.source || 'manual',
              sourceId: data.sourceId,
              projectId: data.projectId,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              createdBy: data.createdBy
            });
          });

          // Sync to localStorage
          AgendaService.setLocalAgendas(items);
          onData(items);
        },
        (error) => {
          console.warn('Agendas realtime subscription error, using local cache:', error);
          if (onError) onError(error);
          onData(AgendaService.getLocalAgendas());
        }
      );
    } catch (e) {
      console.warn('Failed to setup Firestore subscription for agendas:', e);
      onData(AgendaService.getLocalAgendas());
      return () => {};
    }
  }

  /**
   * Create a new agenda item
   */
  static async createAgenda(
    agenda: Omit<AgendaItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AgendaItem> {
    const id = 'agenda_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    const newItem: AgendaItem = {
      ...agenda,
      id,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Update local storage immediately for zero-latency UX
    const local = AgendaService.getLocalAgendas();
    AgendaService.setLocalAgendas([newItem, ...local]);

    // Save to Firestore
    try {
      const docRef = doc(db, AGENDAS_COLLECTION, id);
      await setDoc(docRef, {
        ...newItem,
        firestoreCreatedAt: serverTimestamp(),
        firestoreUpdatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Could not save agenda to Firestore (stored locally):', e);
    }

    return newItem;
  }

  /**
   * Update an existing agenda item
   */
  static async updateAgenda(
    id: string,
    updates: Partial<AgendaItem>
  ): Promise<void> {
    const local = AgendaService.getLocalAgendas();
    const updated = local.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    AgendaService.setLocalAgendas(updated);

    try {
      const docRef = doc(db, AGENDAS_COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        firestoreUpdatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Could not update agenda in Firestore:', e);
    }
  }

  /**
   * Delete an agenda item
   */
  static async deleteAgenda(id: string): Promise<void> {
    const local = AgendaService.getLocalAgendas();
    AgendaService.setLocalAgendas(local.filter((item) => item.id !== id));

    try {
      const docRef = doc(db, AGENDAS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Could not delete agenda in Firestore:', e);
    }
  }

  /**
   * Extract active agendas from existing project tasks, deadlines, and transactions
   */
  static extractAgendasFromProjects(projects: Project[]): AgendaItem[] {
    if (!Array.isArray(projects)) return [];

    const extracted: AgendaItem[] = [];

    projects.forEach((proj) => {
      const clientName = proj.clientSnapshot?.companyName || proj.title || 'Proyek Kantor';

      // 1. Project tasks with deadlines
      if (Array.isArray(proj.tasks)) {
        proj.tasks.forEach((task) => {
          if (task.status === 'open' && task.deadline) {
            const rawDeadline = String(task.deadline).trim();
            // Expected format: YYYY-MM-DD or YYYY-MM-DDTHH:mm or DD/MM/YYYY
            let date = '';
            let time = '17:00';

            if (rawDeadline.includes('T')) {
              const [d, t] = rawDeadline.split('T');
              date = d;
              if (t) time = t.substring(0, 5);
            } else if (rawDeadline.length === 10 && rawDeadline.includes('-')) {
              date = rawDeadline;
            }

            if (date) {
              extracted.push({
                id: `task_${proj.projectId}_${task.id}`,
                title: task.title,
                date,
                time,
                type: 'Deadline',
                clientOrProject: clientName,
                notes: task.description || `Tugas proyek ${proj.title}`,
                status: 'scheduled',
                source: 'project_task',
                sourceId: task.id,
                projectId: proj.projectId
              });
            }
          }
        });
      }

      // 2. PPAT Deeds Signing date
      if (proj.ppatData?.akta?.tanggalAkta) {
        const rawDate = String(proj.ppatData.akta.tanggalAkta).trim();
        if (rawDate && rawDate.length >= 8) {
          extracted.push({
            id: `ppat_akta_${proj.projectId}`,
            title: `Penandatanganan Akta ${proj.ppatData.akta.jenisAkta || ''}`.trim(),
            date: rawDate,
            time: '09:30',
            type: 'Penandatanganan',
            clientOrProject: clientName,
            notes: proj.ppatData.akta.notes || `No. Akta: ${proj.ppatData.akta.nomorAkta || '-'}`,
            status: 'scheduled',
            source: 'ppat_transaction',
            sourceId: proj.projectId,
            projectId: proj.projectId
          });
        }
      }

      // 3. PPAT Transaction date
      if (proj.ppatData?.transaction?.transactionDate) {
        const rawDate = String(proj.ppatData.transaction.transactionDate).trim();
        if (rawDate && rawDate.length >= 8) {
          extracted.push({
            id: `ppat_trans_${proj.projectId}`,
            title: `Pemeriksaan Berkas Transaksi PPAT`,
            date: rawDate,
            time: '14:00',
            type: 'Pemeriksaan',
            clientOrProject: clientName,
            notes: proj.ppatData.transaction.notes || '',
            status: 'scheduled',
            source: 'ppat_transaction',
            sourceId: proj.projectId,
            projectId: proj.projectId
          });
        }
      }

      // 4. RUPS Meeting date
      if (proj.metadata?.meetingDate || proj.metadata?.tanggalRapat) {
        const rawDate = String(proj.metadata.meetingDate || proj.metadata.tanggalRapat).trim();
        if (rawDate && rawDate.length >= 8) {
          extracted.push({
            id: `meeting_${proj.projectId}`,
            title: proj.meetingSubject ? `RUPS: ${proj.meetingSubject}` : `Rapat RUPS: ${clientName}`,
            date: rawDate,
            time: proj.metadata?.meetingTime || '10:00',
            type: 'RUPS',
            clientOrProject: clientName,
            notes: proj.minutaNotes || '',
            status: 'scheduled',
            source: 'project_deadline',
            sourceId: proj.projectId,
            projectId: proj.projectId
          });
        }
      }
    });

    return extracted;
  }

  /**
   * Combine manual agendas with extracted agendas from projects,
   * de-duplicate, and filter out completed or cancelled agendas.
   */
  static getCombinedAgendas(
    manualAgendas: AgendaItem[],
    projects: Project[]
  ): AgendaItem[] {
    const extracted = AgendaService.extractAgendasFromProjects(projects);
    const combinedMap = new Map<string, AgendaItem>();

    // Add manual agendas first
    manualAgendas.forEach((item) => {
      combinedMap.set(item.id, item);
    });

    // Add extracted agendas if not already overwritten by manual
    extracted.forEach((item) => {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    });

    const list = Array.from(combinedMap.values());

    // Filter out completed and cancelled agendas (only active agendas)
    return list.filter(
      (item) => item.status !== 'completed' && item.status !== 'cancelled'
    );
  }

  /**
   * Get agendas specifically for today, sorted by time
   */
  static getTodayAgendas(
    manualAgendas: AgendaItem[],
    projects: Project[]
  ): AgendaItem[] {
    const today = AgendaService.getTodayDateString();
    const allActive = AgendaService.getCombinedAgendas(manualAgendas, projects);

    const todayItems = allActive.filter((item) => {
      if (!item.date) return false;
      const normalizedItemDate = item.date.trim().substring(0, 10);
      return normalizedItemDate === today;
    });

    // Sort by time ascending (e.g. 09:00, 11:30, 14:00)
    todayItems.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });

    return todayItems;
  }
}
