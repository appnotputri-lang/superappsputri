import { db, handleFirestoreError, OperationType, cleanUndefined } from "../lib/firebase";
import { getApiUrl } from "../lib/api";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  arrayUnion,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import { Project, DocumentReference } from "../domain/project/Project";
import { Timeline } from "../domain/project/Timeline";
import { Task } from "../domain/project/Task";
import { StatusEngine } from "../domain/project/ProjectStatus";
import { WorkflowService } from "./WorkflowService";

export class ProjectService {
  private static projectsCol = "office_projects";

  /**
   * Helper to convert Firestore dates/timestamps to Date or standard ISO string format.
   */
  private static parseTimestamp(ts: any): Date {
    if (!ts) return new Date();
    if (ts instanceof Timestamp) return ts.toDate();
    if (ts.toDate && typeof ts.toDate === "function") return ts.toDate();
    return new Date(ts);
  }

  /**
   * 1. createProject
   * Creates a brand new Project document in Firestore.
   * Generates a unique document ID, initial timelines, empty document array, and saves it.
   */
  static async createProject(
    projectData: Omit<Project, "projectId" | "createdAt" | "updatedAt" | "documents">
  ): Promise<Project> {
    const path = this.projectsCol;
    try {
      const docRef = doc(collection(db, this.projectsCol));
      const projectId = docRef.id;
      const now = new Date();

      const newProject: Project = {
        ...projectData,
        projectId,
        createdAt: now,
        updatedAt: now
      };

      // Set document in Firestore
      await setDoc(docRef, cleanUndefined(newProject));

      // Automatically generate a "Project dibuat" timeline entry
      await this.addTimeline(projectId, {
        status: projectData.status,
        title: "Project dibuat",
        description: `Proyek '${projectData.title}' telah berhasil diinisialisasi dengan jenis pekerjaan '${projectData.jobType}'.`,
        createdBy: projectData.assignedTo || "system"
      });

      // Ensure the project folder in Google Drive
      try {
        const { auth } = await import('../lib/firebase');
        let token = '';
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
        await fetch(getApiUrl('/api/v2/drive/ensure-project-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            project: newProject
          })
        });
      } catch (e) {
        console.warn("[ProjectService] Failed to ensure drive folder for new project:", e);
      }

      return newProject;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  /**
   * 2. updateStatus
   * Modifies a project's status/step.
   * It retrieves the active workflow definition using WorkflowService, checks viability with StatusEngine,
   * updates the project's current status and currentStep, and appends a transition history timeline record.
   */
  static async updateStatus(
    projectId: string,
    newStatus: string,
    userId: string,
    comment?: string,
    strict: boolean = true
  ): Promise<void> {
    const path = `${this.projectsCol}/${projectId}`;
    try {
      const projectRef = doc(db, this.projectsCol, projectId);
      const projectSnap = await getDoc(projectRef);

      if (!projectSnap.exists()) {
        throw new Error(`Project with ID ${projectId} does not exist.`);
      }

      const project = projectSnap.data() as Project;
      const oldStatus = project.status;

      // Try fetching the Workflow definition dynamically
      const workflow = await WorkflowService.getWorkflow(project.jobType);
      
      if (workflow) {
        // Run validations via status engine
        const isAllowed = StatusEngine.canMove(project, newStatus, workflow, strict);
        if (!isAllowed) {
          throw new Error(
            `Invalid status transition from '${oldStatus}' to '${newStatus}' in workflow '${workflow.name}'.`
          );
        }
      }

      const now = new Date();
      // Update status on Firestore
      await updateDoc(projectRef, {
        status: newStatus,
        currentStep: newStatus,
        updatedAt: now
      });

      // Generate a milestone timeline entry
      await this.addTimeline(projectId, {
        status: newStatus,
        title: `Status diubah ke ${newStatus.toUpperCase()}`,
        description: comment || `Status proyek beralih dari '${oldStatus}' menuju '${newStatus}'.`,
        createdBy: userId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * 3. addTimeline
   * Appends an event record under the project's subcollection: projects/{projectId}/timelines
   * Subcollections are highly scalable and securely guarded using relational access.
   */
  static async addTimeline(
    projectId: string,
    timelineData: Omit<Timeline, "id" | "projectId" | "createdAt">
  ): Promise<Timeline> {
    const path = `${this.projectsCol}/${projectId}/timelines`;
    try {
      const timelinesColRef = collection(db, this.projectsCol, projectId, "timelines");
      const docRef = doc(timelinesColRef);
      const id = docRef.id;
      const now = new Date();

      const newTimeline: Timeline = {
        ...timelineData,
        id,
        projectId,
        createdAt: now
      };

      await setDoc(docRef, cleanUndefined(newTimeline));
      return newTimeline;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  /**
   * 4. addDocument
   * Appends a document metadata reference to the project's documents subcollection.
   */
  static async addDocument(
    projectId: string,
    docData: Omit<DocumentReference, "id" | "uploadedAt">
  ): Promise<DocumentReference> {
    const path = `${this.projectsCol}/${projectId}/documents`;
    let isUpdate = false;
    try {
      const documentsColRef = collection(db, this.projectsCol, projectId, "documents");
      
      let docRef;
      let docId;

      if (docData.refId) {
        // Check if document with same refId and url already exists
        const q = query(documentsColRef, where("refId", "==", docData.refId), where("url", "==", docData.url));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          docRef = snap.docs[0].ref;
          docId = snap.docs[0].id;
          isUpdate = true;
        }
      }

      if (!docRef) {
        docRef = doc(documentsColRef);
        docId = docRef.id;
      }

      const now = new Date();
      const newDoc: DocumentReference = {
        ...docData,
        id: docId,
        uploadedAt: now
      };

      await setDoc(docRef, cleanUndefined(newDoc));

      // Update project updatedAt timestamp
      const projectRef = doc(db, this.projectsCol, projectId);
      await updateDoc(projectRef, {
        updatedAt: now
      });

      // Also create a timeline log for document registration
      await this.addTimeline(projectId, {
        status: isUpdate ? "document_updated" : "document_added",
        title: isUpdate ? `Dokumen diperbarui: ${newDoc.name}` : `Dokumen ditambahkan: ${newDoc.name}`,
        description: isUpdate 
          ? `Berkas '${newDoc.name}' telah diperbarui dalam berkas proyek.`
          : `Berkas '${newDoc.name}' berformat '${newDoc.type}' telah didaftarkan ke berkas proyek.`,
        createdBy: newDoc.uploadedBy || "system"
      });

      return newDoc;
    } catch (error) {
      handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  }

  /**
   * Deletes a document metadata reference from the project's documents subcollection.
   */
  static async deleteDocument(projectId: string, docId: string): Promise<void> {
    const path = `${this.projectsCol}/${projectId}/documents/${docId}`;
    try {
      const docRef = doc(db, this.projectsCol, projectId, "documents", docId);
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(docRef);

      const now = new Date();
      const projectRef = doc(db, this.projectsCol, projectId);
      await updateDoc(projectRef, {
        updatedAt: now
      });

      await this.addTimeline(projectId, {
        status: "Updated",
        title: "Dokumen dihapus",
        description: `Sebuah dokumen telah dihapus dari proyek ini.`,
        createdBy: "system"
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Deletes a document metadata reference by its refId.
   */
  static async deleteDocumentByRefId(projectId: string, refId: string): Promise<void> {
    const path = `${this.projectsCol}/${projectId}/documents`;
    try {
      const documentsColRef = collection(db, this.projectsCol, projectId, "documents");
      const q = query(documentsColRef, where("refId", "==", refId));
      const snap = await getDocs(q);
      const { deleteDoc } = await import('firebase/firestore');

      if (!snap.empty) {
        for (const document of snap.docs) {
          await deleteDoc(document.ref);
        }

        const now = new Date();
        const projectRef = doc(db, this.projectsCol, projectId);
        await updateDoc(projectRef, {
          updatedAt: now
        });

        await this.addTimeline(projectId, {
          status: "Updated",
          title: "Dokumen dihapus",
          description: `Dokumen dengan referensi terhapus dari proyek ini.`,
          createdBy: "system"
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Retrieves documents of a project from subcollection.
   */
  static async getProjectDocuments(projectId: string): Promise<DocumentReference[]> {
    const path = `${this.projectsCol}/${projectId}/documents`;
    try {
      const documentsColRef = collection(db, this.projectsCol, projectId, "documents");
      const querySnap = await getDocs(documentsColRef);
      return querySnap.docs.map((docSnap) => docSnap.data() as DocumentReference);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * 5. createTask
   * Generates an actionable checklist task item under the project's subcollection: projects/{projectId}/tasks
   */
  static async createTask(
    projectId: string,
    taskData: Omit<Task, "id" | "projectId" | "createdAt" | "updatedAt">
  ): Promise<Task> {
    const path = `${this.projectsCol}/${projectId}/tasks`;
    try {
      const tasksColRef = collection(db, this.projectsCol, projectId, "tasks");
      const docRef = doc(tasksColRef);
      const id = docRef.id;
      const now = new Date();

      const newTask: Task = {
        ...taskData,
        id,
        projectId,
        createdAt: now,
        updatedAt: now
      };

      await setDoc(docRef, cleanUndefined(newTask));
      return newTask;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  /**
   * Updates a task's completion status.
   */
  static async updateTaskStatus(
    projectId: string,
    taskId: string,
    isCompleted: boolean
  ): Promise<void> {
    const path = `${this.projectsCol}/${projectId}/tasks/${taskId}`;
    try {
      const taskRef = doc(db, this.projectsCol, projectId, "tasks", taskId);
      const now = new Date();
      await updateDoc(taskRef, {
        status: isCompleted ? 'completed' : 'pending',
        completedAt: isCompleted ? now : null,
        updatedAt: now
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * Retrieves full details of a project from Firestore.
   */
  static async getProject(projectId: string): Promise<Project | null> {
    const path = `${this.projectsCol}/${projectId}`;
    try {
      const projectRef = doc(db, this.projectsCol, projectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) return null;
      return projectSnap.data() as Project;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  /**
   * Retrieves timelines of a project sorted chronologically.
   */
  static async getProjectTimelines(projectId: string): Promise<Timeline[]> {
    const path = `${this.projectsCol}/${projectId}/timelines`;
    try {
      const timelinesColRef = collection(db, this.projectsCol, projectId, "timelines");
      const q = query(timelinesColRef, orderBy("createdAt", "desc"));
      const querySnap = await getDocs(q);
      return querySnap.docs.map((docSnap) => docSnap.data() as Timeline);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Retrieves tasks/checklist of a project.
   */
  static async getProjectTasks(projectId: string): Promise<Task[]> {
    const path = `${this.projectsCol}/${projectId}/tasks`;
    try {
      const tasksColRef = collection(db, this.projectsCol, projectId, "tasks");
      const querySnap = await getDocs(tasksColRef);
      return querySnap.docs.map((docSnap) => docSnap.data() as Task);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Retrieves all projects from Firestore.
   */
  static async listProjects(): Promise<Project[]> {
    const path = this.projectsCol;
    try {
      const colRef = collection(db, this.projectsCol);
      const q = query(colRef, orderBy("createdAt", "desc"));
      const querySnap = await getDocs(q);
      return querySnap.docs.map((docSnap) => docSnap.data() as Project);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * 6. deleteProject
   * Permanently deletes a project document and its associated subcollections.
   */
  static async deleteProject(projectId: string): Promise<void> {
    const path = `${this.projectsCol}/${projectId}`;
    try {
      const { deleteDoc, collection, getDocs } = await import('firebase/firestore');
      const projectRef = doc(db, this.projectsCol, projectId);
      
      // Cleanup subcollections: timelines, tasks, documents
      const subcollections = ['timelines', 'tasks', 'documents'];
      
      for (const sub of subcollections) {
        const colRef = collection(db, this.projectsCol, projectId, sub);
        const snapshot = await getDocs(colRef);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
      }

      // Cascading delete for linked document projects (RUPS, RUPST, Pendirian, etc.)
      // These usually use the same ID as the parent project ID
      await deleteDoc(doc(db, 'projects', projectId));
      await deleteDoc(doc(db, 'rupst_projects', projectId));
      await deleteDoc(doc(db, 'rupst_public_projects', projectId));
      await deleteDoc(doc(db, 'pendirian_projects', projectId));

      // Finally delete the parent project document
      await deleteDoc(projectRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ==========================================
  // Notary Project Services (Sprint 5)
  // ==========================================

  static listenToRupsLb(callback: (data: any[]) => void): () => void {
    return onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'projects');
      }
    );
  }

  static listenToRupst(callback: (data: any[]) => void): () => void {
    return onSnapshot(
      collection(db, 'rupst_projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rupst_projects');
      }
    );
  }

  static listenToRupstPublic(callback: (data: any[]) => void): () => void {
    return onSnapshot(
      collection(db, 'rupst_public_projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rupst_public_projects');
      }
    );
  }

  static listenToPendirian(callback: (data: any[]) => void): () => void {
    return onSnapshot(
      collection(db, 'pendirian_projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pendirian_projects');
      }
    );
  }

  // General CRUD for notary projects
  static async saveRupsLb(projectId: string, data: any): Promise<void> {
    try {
      await setDoc(doc(db, 'projects', projectId), cleanUndefined(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${projectId}`);
      throw error;
    }
  }

  static async saveRupst(projectId: string, data: any): Promise<void> {
    try {
      await setDoc(doc(db, 'rupst_projects', projectId), cleanUndefined(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rupst_projects/${projectId}`);
      throw error;
    }
  }

  static async saveRupstPublic(projectId: string, data: any): Promise<void> {
    try {
      await setDoc(doc(db, 'rupst_public_projects', projectId), cleanUndefined(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rupst_public_projects/${projectId}`);
      throw error;
    }
  }

  static async savePendirian(projectId: string, data: any): Promise<void> {
    try {
      await setDoc(doc(db, 'pendirian_projects', projectId), cleanUndefined(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `pendirian_projects/${projectId}`);
      throw error;
    }
  }

  static async deleteRupsLb(projectId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
      throw error;
    }
  }

  static async deleteRupst(projectId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'rupst_projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rupst_projects/${projectId}`);
      throw error;
    }
  }

  static async deleteRupstPublic(projectId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'rupst_public_projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rupst_public_projects/${projectId}`);
      throw error;
    }
  }

  static async deletePendirian(projectId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'pendirian_projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `pendirian_projects/${projectId}`);
      throw error;
    }
  }

  // Server-side Orchestration Methods (to be implemented in Phase 5)
  static async serverCreateProject(projectData: any, firebaseIdToken: string): Promise<any> {
    // Phase 1 placeholder
    return { success: true };
  }

  static async serverUpdateProjectStatus(
    projectId: string,
    newStatus: string,
    userId: string,
    comment: string,
    firebaseIdToken: string
  ): Promise<void> {
    // Phase 1 placeholder
  }
}
