import { db, handleFirestoreError, OperationType, cleanUndefined } from "../lib/firebase";
import { collection, doc, setDoc, getDoc, getDocs } from "firebase/firestore";
import { Workflow } from "../domain/project/Workflow";

export class WorkflowService {
  private static colName = "workflows";

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
   * If not found, returns null.
   */
  static async getWorkflow(workflowId: string): Promise<Workflow | null> {
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
   * Lists all registered workflows in the database.
   */
  static async listWorkflows(): Promise<Workflow[]> {
    const path = this.colName;
    try {
      const colRef = collection(db, this.colName);
      const querySnap = await getDocs(colRef);
      return querySnap.docs.map((docSnap) => docSnap.data() as Workflow);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Pre-populates standard default workflows (RUPS LB, RUPS Tahunan, and Pendirian PT)
   * in Firestore if they do not already exist, securing the systemic data foundation.
   */
  static async seedDefaultWorkflows(): Promise<void> {
    const newSteps = [
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

        const rupslbSteps = [
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

    const rupstSteps = [
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

    const sewaMenyewaSteps = [
      "Pengumpulan Berkas & Klien",
      "Drafting Perjanjian",
      "Review Draft Perjanjian",
      "Persetujuan Draft",
      "Penandatanganan Perjanjian",
      "Cetak & Penyerahan Salinan",
      "Selesai"
    ];

    const pendirianCvSteps = [
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

    const perubahanCvSteps = [
      "Drafting Akta Perubahan CV",
      "Review Draft",
      "ACC Draft Akta Perubahan",
      "Tanda Tangan Akta Perubahan",
      "Pendaftaran Perubahan SABH",
      "NIB Penyesuaian",
      "Selesai"
    ];

    const pembubaranCvSteps = [
      "Drafting Akta Pembubaran CV",
      "Review Draft Akta Pembubaran",
      "ACC Draft Akta Pembubaran",
      "Tanda Tangan Akta Pembubaran",
      "Pencatatan SABH Pembubaran",
      "Selesai"
    ];

    const defaults: Workflow[] = [
      {
        id: "rups_lb",
        name: "RUPS Luar Biasa",
        steps: rupslbSteps,
        description: "Alur kerja standar RUPS LB meliputi penyusunan draft akta, persetujuan, pencetakan akta, pelaporan AHU, dan penyelesaian."
      },
      {
        id: "rups_t",
        name: "RUPST",
        steps: rupstSteps,
        description: "Alur kerja RUPS Tahunan yang mencakup penyusunan draft, penelaahan laporan keuangan, penandatanganan akta, dan pengarsipan."
      },
      {
        id: "pendirian_pt",
        name: "Pendirian PT",
        steps: newSteps,
        description: "Alur kerja pendirian badan hukum PT baru mulai dari pemesanan nama, akta pendirian, pengesahan SK AHU, dan NIB."
      },
      {
        id: "pendirian_cv",
        name: "Pendirian CV",
        steps: pendirianCvSteps,
        description: "Alur kerja pendirian CV baru dari pemesanan nama, akta pendirian CV, pendaftaran SABH Kemenkumham, dan NIB."
      },
      {
        id: "perubahan_cv",
        name: "Perubahan CV",
        steps: perubahanCvSteps,
        description: "Alur kerja perubahan CV (masuk/keluar pesero, peningkatan modal, perubahan pengurus), pendaftaran SABH Kemenkumham."
      },
      {
        id: "pembubaran_cv",
        name: "Pembubaran CV",
        steps: pembubaranCvSteps,
        description: "Alur kerja pembubaran CV dari penyusunan akta pembubaran hingga pemberitahuan dan pencatatan di SABH Kemenkumham."
      },
      {
        id: "sewa_menyewa",
        name: "Perjanjian Sewa Menyewa",
        steps: sewaMenyewaSteps,
        description: "Alur kerja perjanjian sewa menyewa ruko/bangunan/tanah, meliputi input data para pihak, objek sewa, harga, pembayaran, cetak draft akta."
      },
      {
        id: "sirkuler",
        name: "RUPST",
        steps: rupstSteps,
        description: "Alur kerja Keputusan Sirkuler RUPST yang mencakup penyusunan keputusan sirkuler sebagai pengganti RUPS, penelaahan, penandatanganan sirkuler oleh para pemegang saham, dan pengarsipan."
      },
      {
        id: "sirkuler_rupslb",
        name: "Sirkuler RUPS LB",
        steps: rupslbSteps,
        description: "Alur kerja Keputusan Sirkuler RUPS LB yang mencakup penyusunan keputusan sirkuler sebagai pengganti RUPS, penelaahan, penandatanganan sirkuler oleh para pemegang saham, dan pengarsipan."
      }
    ];

    for (const wf of defaults) {
      try {
        const existing = await this.getWorkflow(wf.id);
        if (!existing || JSON.stringify(existing.steps) !== JSON.stringify(wf.steps) || existing.name !== wf.name) {
          await this.defineWorkflow(wf);
        }
      } catch (e) {
        console.error(`Error seeding default workflow: ${wf.id}`, e);
      }
    }
  }
}
