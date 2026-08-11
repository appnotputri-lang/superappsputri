import { db, handleFirestoreError, OperationType, cleanUndefined } from "../lib/firebase";
import { collection, doc, setDoc, getDoc, getDocs, getDocsFromCache } from "firebase/firestore";
import { Workflow } from "../domain/project/Workflow";

const DEFAULT_NEW_STEPS = [
  "Drafting Notulen/Sirkuler",
  "Review Draft Notulen/Sirkuler",
  "ACC Draft Notulen/Sirkuler",
  "Notulen/Sirkuler Sedang di Tandatangan",
  "Drafting Akta",
  "Akta Sedang di Review",
  "Akta ACC",
  "Akta Telah dibuat",
  "Input AHU",
  "AHU sedang di Tinjau",
  "AHU Selesai",
  "NIB Sedang di Input",
  "NIB Terbit",
  "Selesai"
];

const DEFAULT_RUPSLB_STEPS = [
  "Drafting Notulen",
  "Review Notulen",
  "ACC Notulen",
  "Notulen Diterima PDF",
  "Drafting Akta",
  "Review Draft Akta",
  "ACC Draft Akta",
  "Cetak Akta",
  "Input AHU",
  "SP/SK Terbit",
  "NPWP Terbit",
  "INPUT NIB",
  "NIB TERBIT",
  "SELESAI"
];

const DEFAULT_RUPST_STEPS = [
  "Drafting Notulen",
  "Review Notulen",
  "ACC Notulen",
  "Notulen Diterima PDF",
  "Drafting Akta",
  "Review Draft Akta",
  "ACC Draft Akta",
  "Cetak Akta",
  "Input AHU",
  "SP Terbit",
  "Selesai"
];

const DEFAULT_SEWA_MENYEWA_STEPS = [
  "Pengumpulan Berkas & Klien",
  "Drafting Perjanjian",
  "Review Draft Perjanjian",
  "Persetujuan Draft",
  "Penandatanganan Perjanjian",
  "Cetak & Penyerahan Salinan",
  "Selesai"
];

const DEFAULT_PENDIRIAN_CV_STEPS = [
  "Pemesanan Nama CV",
  "Drafting Akta Pendirian CV",
  "Review Draft Akta",
  "ACC Draft Akta",
  "Tanda Tangan Akta Pendirian",
  "Pendaftaran SABH (SK Kemenkumham)",
  "NPWP CV Terbit",
  "Pendaftaran NIB CV",
  "NIB CV Terbit",
  "Selesai"
];

const DEFAULT_PERUBAHAN_CV_STEPS = [
  "Drafting Akta Perubahan CV",
  "Review Draft",
  "ACC Draft Akta Perubahan",
  "Tanda Tangan Akta Perubahan",
  "Pendaftaran Perubahan SABH",
  "NIB Penyesuaian",
  "Selesai"
];

const DEFAULT_PEMBUBARAN_CV_STEPS = [
  "Drafting Akta Pembubaran CV",
  "Review Draft Akta Pembubaran",
  "ACC Draft Akta Pembubaran",
  "Tanda Tangan Akta Pembubaran",
  "Pencatatan SABH Pembubaran",
  "Selesai"
];

const DEFAULT_PPAT_STEPS = [
  "Pemeriksaan Sertipikat (Pengecekan BPN)",
  "Verifikasi Pajak (PPH & BPHTB)",
  "Drafting Akta PPAT",
  "Review Draft Akta",
  "ACC Draft Akta",
  "Penandatanganan Akta",
  "Proses Balik Nama / Pendaftaran BPN",
  "Sertipikat & Berkas Selesai"
];

export const STATIC_DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: "rups_lb",
    name: "RUPS Luar Biasa",
    steps: DEFAULT_RUPSLB_STEPS,
    description: "Alur kerja standar RUPS LB meliputi penyusunan draft akta, persetujuan, pencetakan akta, pelaporan AHU, dan penyelesaian."
  },
  {
    id: "rups_t",
    name: "RUPST",
    steps: DEFAULT_RUPST_STEPS,
    description: "Alur kerja RUPS Tahunan yang mencakup penyusunan draft, penelaahan laporan keuangan, penandatanganan akta, dan pengarsipan."
  },
  {
    id: "pendirian_pt",
    name: "Pendirian PT",
    steps: DEFAULT_NEW_STEPS,
    description: "Alur kerja pendirian badan hukum PT baru mulai dari pemesanan nama, akta pendirian, pengesahan SK AHU, dan NIB."
  },
  {
    id: "pendirian_cv",
    name: "Pendirian CV",
    steps: DEFAULT_PENDIRIAN_CV_STEPS,
    description: "Alur kerja pendirian CV baru dari pemesanan nama, akta pendirian CV, pendaftaran SABH Kemenkumham, dan NIB."
  },
  {
    id: "perubahan_cv",
    name: "Perubahan CV",
    steps: DEFAULT_PERUBAHAN_CV_STEPS,
    description: "Alur kerja perubahan CV (masuk/keluar pesero, peningkatan modal, perubahan pengurus), pendaftaran SABH Kemenkumham."
  },
  {
    id: "pembubaran_cv",
    name: "Pembubaran CV",
    steps: DEFAULT_PEMBUBARAN_CV_STEPS,
    description: "Alur kerja pembubaran CV dari penyusunan akta pembubaran hingga pemberitahuan dan pencatatan di SABH Kemenkumham."
  },
  {
    id: "sewa_menyewa",
    name: "Perjanjian Sewa Menyewa",
    steps: DEFAULT_SEWA_MENYEWA_STEPS,
    description: "Alur kerja perjanjian sewa menyewa ruko/bangunan/tanah, meliputi input data para pihak, objek sewa, harga, pembayaran, cetak draft akta."
  },
  {
    id: "akta_ppat",
    name: "Akta PPAT",
    steps: DEFAULT_PPAT_STEPS,
    description: "Alur kerja pembuatan Akta PPAT meliputi pengecekan sertipikat di BPN, validasi pajak PPH & BPHTB, penandatanganan akta, hingga pendaftaran balik nama."
  },
  {
    id: "sirkuler",
    name: "RUPST",
    steps: DEFAULT_RUPST_STEPS,
    description: "Alur kerja Keputusan Sirkuler RUPST yang mencakup penyusunan keputusan sirkuler sebagai pengganti RUPS, penelaahan, penandatanganan sirkuler oleh para pemegang saham, dan pengarsipan."
  },
  {
    id: "sirkuler_rupslb",
    name: "Sirkuler RUPS LB",
    steps: DEFAULT_RUPSLB_STEPS,
    description: "Alur kerja Keputusan Sirkuler RUPS LB yang mencakup penyusunan keputusan sirkuler sebagai pengganti RUPS, penelaahan, penandatanganan sirkuler oleh para pemegang saham, dan pengarsipan."
  }
];

export class WorkflowService {
  private static colName = "workflows";

  /**
   * Returns standard static default workflows instantly.
   */
  static getStaticWorkflows(): Workflow[] {
    return STATIC_DEFAULT_WORKFLOWS;
  }

  /**
   * Returns a static workflow definition by ID instantly from memory.
   */
  static getStaticWorkflow(workflowId: string): Workflow | null {
    return STATIC_DEFAULT_WORKFLOWS.find((w) => w.id === workflowId) || null;
  }

  /**
   * Registers or updates a workflow definition in Firestore.
   */
  static async defineWorkflow(workflow: Workflow): Promise<void> {
    const path = `${this.colName}/${workflow.id}`;
    try {
      const docRef = doc(db, this.colName, workflow.id);
      const now = new Date();
      const updatedWorkflow: Workflow = {
        ...workflow,
        createdAt: workflow.createdAt || now,
        updatedAt: now
      };
      await setDoc(docRef, cleanUndefined(updatedWorkflow));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Retrieves a workflow definition by its unique ID (e.g., 'rups_lb').
   * Checks static memory defaults first to avoid network latency.
   */
  static async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const staticWf = this.getStaticWorkflow(workflowId);
    if (staticWf) {
      return staticWf;
    }
    const path = `${this.colName}/${workflowId}`;
    try {
      const docRef = doc(db, this.colName, workflowId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return null;
      }
      return snap.data() as Workflow;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  /**
   * Lists all registered workflows in the database merged with static defaults.
   */
  static async listWorkflows(): Promise<Workflow[]> {
    try {
      const colRef = collection(db, this.colName);
      let querySnap;
      try {
        querySnap = await getDocsFromCache(colRef);
        if (querySnap.empty) {
          querySnap = await getDocs(colRef);
        }
      } catch (e) {
        querySnap = await getDocs(colRef);
      }

      const dbWorkflows = querySnap.docs.map((docSnap) => docSnap.data() as Workflow);
      const map = new Map<string, Workflow>();
      
      STATIC_DEFAULT_WORKFLOWS.forEach(w => map.set(w.id, w));
      dbWorkflows.forEach(w => map.set(w.id, w));
      
      return Array.from(map.values());
    } catch (error) {
      console.warn("[WorkflowService] Fallback to static workflows:", error);
      return STATIC_DEFAULT_WORKFLOWS;
    }
  }

  /**
   * Pre-populates standard default workflows in Firestore if needed.
   * Note: Should NOT be executed during routine page mounts.
   */
  static async seedDefaultWorkflows(): Promise<void> {
    for (const wf of STATIC_DEFAULT_WORKFLOWS) {
      try {
        const docRef = doc(db, this.colName, wf.id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await this.defineWorkflow(wf);
        }
      } catch (e) {
        console.error(`Error seeding default workflow: ${wf.id}`, e);
      }
    }
  }
}

