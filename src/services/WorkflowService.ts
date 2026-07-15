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

    const defaults: Workflow[] = [
      {
        id: "rups_lb",
        name: "RUPS Luar Biasa",
        steps: newSteps,
        description: "Alur kerja standar RUPS LB meliputi penyusunan draft akta, persetujuan, pencetakan akta, pelaporan AHU, dan penyelesaian."
      },
      {
        id: "rups_t",
        name: "RUPS Tahunan",
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
        id: "sirkuler",
        name: "Keputusan Sirkuler RUPST",
        steps: rupstSteps,
        description: "Alur kerja Keputusan Sirkuler RUPST yang mencakup penyusunan keputusan sirkuler sebagai pengganti RUPS, penelaahan, penandatanganan sirkuler oleh para pemegang saham, dan pengarsipan."
      },
      {
        id: "sirkuler_rupslb",
        name: "Sirkuler RUPS LB",
        steps: newSteps,
        description: "Alur kerja Keputusan Sirkuler RUPS LB yang mencakup penyusunan keputusan sirkuler sebagai pengganti RUPS, penelaahan, penandatanganan sirkuler oleh para pemegang saham, dan pengarsipan."
      }
    ];

    for (const wf of defaults) {
      try {
        const existing = await this.getWorkflow(wf.id);
        if (!existing || JSON.stringify(existing.steps) !== JSON.stringify(wf.steps)) {
          await this.defineWorkflow(wf);
        }
      } catch (e) {
        console.error(`Error seeding default workflow: ${wf.id}`, e);
      }
    }
  }
}
