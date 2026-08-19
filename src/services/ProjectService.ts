import { db, handleFirestoreError, OperationType, cleanUndefined, isQuotaExceeded } from "../lib/firebase";
import { FirestoreTracker } from "../lib/firestoreTracker";
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
  getDocsFromCache,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { Project, DocumentReference, ClientSnapshot, ProjectChangeSnapshot, ProjectActivity, ProjectActivityType, ProjectTask } from "../domain/project/Project";
import { Timeline } from "../domain/project/Timeline";
import { Task } from "../domain/project/Task";
import { StatusEngine } from "../domain/project/ProjectStatus";
import { WorkflowService } from "./WorkflowService";
import { AuthService } from "./AuthService";
import { formatChangesSummary, FieldChange } from "../lib/diffUtils";

export const COMPLETED_STATUS_LIST = [
  'completed',
  'selesai',
  'SELESAI',
  'Selesai',
  'archived',
  'Selesai & Diserahkan',
  'selesai & diserahkan'
];

export const isProjectCompletedStatus = (status: string) => {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s === 'completed' ||
    s === 'archived' ||
    s === 'selesai' ||
    s === 'selesai & diserahkan' ||
    s.includes('selesai')
  );
};

export class ProjectService {
  private static projectsCol = "office_projects";
  private static projectsCache: Project[] | null = null;
  private static activeProjectsCache: Project[] | null = null;
  private static minutaProjectsCache: Project[] | null = null;
  private static completedProjectsCache: Project[] | null = null;

  static clearCache(): void {
    ProjectService.projectsCache = null;
    ProjectService.activeProjectsCache = null;
    ProjectService.minutaProjectsCache = null;
    ProjectService.completedProjectsCache = null;
    FirestoreTracker.cacheInvalidate('dashboard_stats');
    FirestoreTracker.cacheInvalidate('dashboard_recent');
    FirestoreTracker.cacheInvalidate('active_projects');
  }

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
        updatedAt: now,
        lastTransitionComment: `Proyek '${projectData.title}' telah berhasil diinisialisasi.`
      };

      // Set document in Firestore
      await setDoc(docRef, cleanUndefined(newProject));
      ProjectService.clearCache();

      // Automatically generate a "Project dibuat" timeline entry
      await this.addTimeline(projectId, {
        status: projectData.status,
        title: "Project dibuat",
        description: `Proyek '${projectData.title}' telah berhasil diinisialisasi dengan jenis pekerjaan '${projectData.jobType}'.`,
        createdBy: projectData.assignedTo || "system"
      });

      // If RUPS LB or Sirkuler RUPSLB, automatically create default task checklist
      if (projectData.jobType === 'rups_lb' || projectData.jobType === 'sirkuler_rupslb') {
        const defaultTaskTitles = ["NOTULEN", "AKTA RUPS LB", "SK/SP", "NPWP", "NIB"];
        for (const title of defaultTaskTitles) {
          try {
            await this.createTask(projectId, {
              title,
              status: 'pending'
            });
          } catch (e) {
            console.warn("[ProjectService] Failed to create default task during initialization:", title, e);
          }
        }
      }

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
      const lastComment = comment || `Status proyek beralih dari '${oldStatus}' menuju '${newStatus}'.`;
      
      // Update status on Firestore
      await updateDoc(projectRef, {
        status: newStatus,
        currentStep: newStatus,
        updatedAt: now,
        lastTransitionComment: lastComment
      });
      ProjectService.clearCache();

      // Generate a milestone timeline entry
      await this.addTimeline(projectId, {
        status: newStatus,
        title: `Status diubah ke ${newStatus.toUpperCase()}`,
        description: lastComment,
        createdBy: userId
      });

      // Master Client HANYA BOLEH berubah ketika workflow mencapai status AHU APPROVED (AHU Selesai, SP/SK Terbit, SP Terbit, atau NIB TERBIT)
      const isClientUpdateStatus = 
        newStatus === "AHU Selesai" || 
        newStatus === "SP/SK Terbit" || 
        newStatus === "SP Terbit" || 
        newStatus === "NIB TERBIT" || 
        newStatus === "NIB TERBIT".toUpperCase() || 
        newStatus === "NIB CV Terbit" || 
        newStatus === "Selesai";

      if (isClientUpdateStatus) {
        const afterSnap = project.changeSnapshot?.after || project.clientSnapshot;
        const targetProjClientId = project.clientId || (project as any).selectedProfileId;
        if (afterSnap && targetProjClientId && targetProjClientId !== 'undefined') {
          const clientRef = doc(db, "profiles", targetProjClientId);
          const clientSnap = await getDoc(clientRef);
          
          if (clientSnap.exists()) {
            const clientData = clientSnap.data() as any;
            
            // Compare and record differences for versionHistory
            const changes: { field: string; before: any; after: any }[] = [];
            
            const fieldsToCompare = [
              { key: 'companyName', label: 'Nama Perusahaan' },
              { key: 'fullAddress', label: 'Alamat Lengkap' },
              { key: 'authorizedCapital', label: 'Modal Dasar' },
              { key: 'paidUpCapital', label: 'Modal Disetor' }
            ];

            fieldsToCompare.forEach(({ key, label }) => {
              const beforeVal = clientData[key] || '';
              const afterVal = (afterSnap as any)[key] || '';
              if (String(beforeVal) !== String(afterVal)) {
                changes.push({
                  field: label,
                  before: beforeVal,
                  after: afterVal
                });
              }
            });

            const uuid = Math.random().toString(36).substring(2, 15);
            const finalDeedNumber = afterSnap.establishmentDeedNumber || 
                                    afterSnap.latestAmendmentDeedNumber || 
                                    (afterSnap as any).number || 
                                    project.metadata?.deedNumber || 
                                    '';
            const finalAhuNumber = project.metadata?.skSpNumber || 'AHU APPROVED';

            const revision: any = {
              revisionId: uuid,
              changedAt: new Date().toISOString(),
              changedBy: userId,
              projectCauseId: projectId,
              reason: `Persetujuan AHU - Proyek ${project.title}`,
              changes,
              deedNumber: finalDeedNumber,
              ahuNumber: finalAhuNumber
            };

            const existingHistory = clientData.versionHistory || [];
            
            const updates: any = {
              companyName: afterSnap.companyName || clientData.companyName,
              fullAddress: afterSnap.fullAddress || clientData.fullAddress || '',
              targetCapitalBase: afterSnap.authorizedCapital || clientData.targetCapitalBase || 0,
              targetCapitalPaid: afterSnap.paidUpCapital || clientData.targetCapitalPaid || 0,
              versionHistory: [...existingHistory, revision],
              updatedAt: new Date().toISOString()
            };

            // Propagate deed details to master profile fields based on jobType
            if (project.jobType !== 'pendirian_pt') {
              if (project.metadata?.deedNumber) {
                updates.latestAmendmentDeedNumber = project.metadata.deedNumber.trim();
              }
              if (project.metadata?.deedDate) {
                updates.latestAmendmentDeedDate = project.metadata.deedDate;
              }
              if (project.metadata?.notaryName) {
                updates.latestAmendmentNotary = project.metadata.notaryName.trim();
              }
              if (project.metadata?.skSpNumber) {
                updates.latestAmendmentSkNumber = project.metadata.skSpNumber.trim();
                updates.latestAmendmentSkDate = project.metadata.skSpDate || project.metadata.deedDate || '';
              }
            } else {
              if (project.metadata?.deedNumber) {
                updates.establishmentDeedNumber = project.metadata.deedNumber.trim();
              }
              if (project.metadata?.deedDate) {
                updates.establishmentDeedDate = project.metadata.deedDate;
              }
              if (project.metadata?.notaryName) {
                updates.establishmentNotary = project.metadata.notaryName.trim();
              }
              if (project.metadata?.skSpNumber) {
                updates.establishmentSkNumber = project.metadata.skSpNumber.trim();
                updates.establishmentSkDate = project.metadata.skSpDate || project.metadata.deedDate || '';
              }
            }

            if (afterSnap.shareholders && afterSnap.shareholders.length > 0) {
              updates.shareholders = afterSnap.shareholders.map((sh: any) => ({
                ...sh,
                id: sh.id || Math.random().toString(36).substring(7),
                sharesOwned: Number(sh.sharesOwned ?? sh.finalShares ?? sh.shares ?? 0)
              }));
              updates.finalShareholders = updates.shareholders;
            }

            if (afterSnap.managementItems && afterSnap.managementItems.length > 0) {
              updates.newManagementItems = afterSnap.managementItems.map((m: any) => ({
                ...m,
                id: m.id || Math.random().toString(36).substring(7),
                name: m.name || '',
                position: m.position || 'DIREKTUR',
                nik: m.nik || ''
              }));
            }

            await updateDoc(clientRef, cleanUndefined(updates));
            try {
              const companyProfileRef = doc(db, 'company_profiles', targetProjClientId);
              await updateDoc(companyProfileRef, cleanUndefined(updates));
            } catch (e) {
              console.warn('Could not sync company_profiles in ProjectService:', e);
            }
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  static async updateProjectSnapshots(
    projectId: string,
    snapshots: { clientSnapshot?: ClientSnapshot; changeSnapshot?: ProjectChangeSnapshot }
  ): Promise<void> {
    try {
      const projectRef = doc(db, this.projectsCol, projectId);
      await updateDoc(projectRef, cleanUndefined(snapshots));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.projectsCol}/${projectId}`);
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
    docData: Omit<DocumentReference, "id" | "uploadedAt"> & { changes?: FieldChange[] }
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
      const { changes, ...docDataClean } = docData;
      const newDoc: DocumentReference = {
        ...docDataClean,
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
      let timelineDescription = isUpdate 
        ? `Berkas '${newDoc.name}' telah diperbarui dalam berkas proyek.`
        : `Berkas '${newDoc.name}' berformat '${newDoc.type}' telah didaftarkan ke berkas proyek.`;

      if (isUpdate && changes && changes.length > 0) {
        const summary = formatChangesSummary(changes);
        if (summary) {
          timelineDescription = summary;
        }
      }

      await this.addTimeline(projectId, {
        status: isUpdate ? "document_updated" : "document_added",
        title: isUpdate ? `Dokumen diperbarui: ${newDoc.name}` : `Dokumen ditambahkan: ${newDoc.name}`,
        description: timelineDescription,
        createdBy: newDoc.uploadedBy || "system",
        changes: isUpdate && changes && changes.length > 0 ? changes : undefined
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
    status: 'pending' | 'in_progress' | 'completed' | 'not_required' | boolean
  ): Promise<void> {
    const path = `${this.projectsCol}/${projectId}/tasks/${taskId}`;
    try {
      const taskRef = doc(db, this.projectsCol, projectId, "tasks", taskId);
      const now = new Date();
      let finalStatus: 'pending' | 'in_progress' | 'completed' | 'not_required';
      if (typeof status === 'boolean') {
        finalStatus = status ? 'completed' : 'pending';
      } else {
        finalStatus = status;
      }

      await updateDoc(taskRef, {
        status: finalStatus,
        completedAt: finalStatus === 'completed' ? now : null,
        updatedAt: now
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * Deletes a task from projects/{projectId}/tasks/{taskId}
   */
  static async deleteTask(projectId: string, taskId: string): Promise<void> {
    const path = `${this.projectsCol}/${projectId}/tasks/${taskId}`;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const taskRef = doc(db, this.projectsCol, projectId, "tasks", taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Adds an activity log/comment to projects/{projectId}/activities and updates the project document.
   */
  static async addProjectActivity(
    projectId: string,
    activityData: Omit<ProjectActivity, "id" | "projectId" | "createdAt">
  ): Promise<ProjectActivity> {
    const path = `${this.projectsCol}/${projectId}/activities`;
    try {
      const colRef = collection(db, this.projectsCol, projectId, "activities");
      const newDocRef = doc(colRef);
      const id = newDocRef.id;
      const now = new Date().toISOString();

      const newActivity: ProjectActivity = {
        ...activityData,
        id,
        projectId,
        createdAt: now
      };

      await setDoc(newDocRef, cleanUndefined(newActivity));

      // Also update array and counter on parent project document
      const projectRef = doc(db, this.projectsCol, projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const pData = projectSnap.data();
        const currentActivities = pData.activities || [];
        const updatedActivities = [newActivity, ...currentActivities].slice(0, 20);
        const newCount = (pData.activitiesCount || currentActivities.length) + 1;

        await updateDoc(projectRef, {
          activities: updatedActivities,
          activitiesCount: newCount,
          updatedAt: now
        });
      }

      return newActivity;
    } catch (error) {
      console.error('[ProjectService] Error adding project activity:', error);
      // Return optimistic fallback object if Firestore error occurs
      return {
        ...activityData,
        id: Math.random().toString(),
        projectId,
        createdAt: new Date().toISOString()
      };
    }
  }

  /**
   * Adds a task to projects/{projectId}/tasks and generates a task_created activity.
   */
  static async addProjectTaskItem(
    projectId: string,
    taskData: {
      title: string;
      description?: string;
      assignedTo?: string;
      assignedToName?: string;
      deadline?: string;
      user: { uid: string; name: string };
    }
  ): Promise<ProjectTask> {
    try {
      const colRef = collection(db, this.projectsCol, projectId, "tasks");
      const newDocRef = doc(colRef);
      const id = newDocRef.id;
      const now = new Date().toISOString();

      const newTask: ProjectTask = {
        id,
        projectId,
        title: taskData.title,
        description: taskData.description || '',
        assignedTo: taskData.assignedTo || '',
        assignedToName: taskData.assignedToName || '',
        deadline: taskData.deadline || '',
        status: 'open',
        createdBy: taskData.user.uid,
        createdByName: taskData.user.name,
        createdAt: now
      };

      await setDoc(newDocRef, cleanUndefined(newTask));

      // Generate task_created activity
      await this.addProjectActivity(projectId, {
        type: 'task_created',
        message: `Membuat tugas baru: "${newTask.title}"${newTask.assignedToName ? ` untuk ${newTask.assignedToName}` : ''}`,
        userId: taskData.user.uid,
        userName: taskData.user.name,
        taskId: newTask.id,
        taskTitle: newTask.title,
        assignedTo: newTask.assignedTo,
        assignedToName: newTask.assignedToName,
        deadline: newTask.deadline
      });

      // Update tasks array on parent project
      const projectRef = doc(db, this.projectsCol, projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const pData = projectSnap.data();
        const currentTasks = pData.tasks || [];
        const updatedTasks = [newTask, ...currentTasks];
        const activeCount = updatedTasks.filter(t => t.status === 'open').length;

        await updateDoc(projectRef, {
          tasks: updatedTasks,
          activeTasksCount: activeCount,
          updatedAt: now
        });
      }

      return newTask;
    } catch (error) {
      console.error('[ProjectService] Error adding task item:', error);
      return {
        id: Math.random().toString(),
        projectId,
        title: taskData.title,
        description: taskData.description,
        assignedTo: taskData.assignedTo,
        assignedToName: taskData.assignedToName,
        deadline: taskData.deadline,
        status: 'open',
        createdBy: taskData.user.uid,
        createdByName: taskData.user.name,
        createdAt: new Date().toISOString()
      };
    }
  }

  /**
   * Toggles task status ('open' <-> 'completed') and creates task_completed activity when completed.
   */
  static async toggleProjectTaskItem(
    projectId: string,
    taskId: string,
    currentStatus: 'open' | 'completed',
    user: { uid: string; name: string }
  ): Promise<'open' | 'completed'> {
    const newStatus: 'open' | 'completed' = currentStatus === 'open' ? 'completed' : 'open';
    const now = new Date().toISOString();

    try {
      const taskRef = doc(db, this.projectsCol, projectId, "tasks", taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: now
      });

      // Update project parent document
      const projectRef = doc(db, this.projectsCol, projectId);
      const projectSnap = await getDoc(projectRef);
      let taskTitle = 'Tugas';
      if (projectSnap.exists()) {
        const pData = projectSnap.data();
        const currentTasks: ProjectTask[] = pData.tasks || [];
        const updatedTasks = currentTasks.map(t => {
          if (t.id === taskId) {
            taskTitle = t.title;
            return { ...t, status: newStatus };
          }
          return t;
        });

        const activeCount = updatedTasks.filter(t => t.status === 'open').length;

        await updateDoc(projectRef, {
          tasks: updatedTasks,
          activeTasksCount: activeCount,
          updatedAt: now
        });
      }

      if (newStatus === 'completed') {
        await this.addProjectActivity(projectId, {
          type: 'task_completed',
          message: `Menyelesaikan tugas: "${taskTitle}"`,
          userId: user.uid,
          userName: user.name,
          taskId
        });
      }

      return newStatus;
    } catch (error) {
      console.error('[ProjectService] Error toggling task item:', error);
      return newStatus;
    }
  }

  /**
   * Realtime listener for recent projects sorted by last activity / update.
   */
  static subscribeTimelineProjects(
    onUpdate: (projects: Project[]) => void,
    onError?: (error: unknown) => void
  ): () => void {
    try {
      const colRef = collection(db, this.projectsCol);
      const q = query(colRef, limit(30));
      return onSnapshot(
        q,
        (snapshot) => {
          const list: Project[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({ ...data, projectId: docSnap.id } as Project);
          });
          // Sort by lastActivityAt or updatedAt or createdAt descending
          list.sort((a, b) => {
            const getTimeVal = (val: any) => {
              if (!val) return 0;
              if (typeof val.toDate === 'function') return val.toDate().getTime();
              if (typeof val.seconds === 'number') return val.seconds * 1000;
              return new Date(val).getTime() || 0;
            };
            const timeA = getTimeVal(a.lastActivityAt) || getTimeVal(a.updatedAt) || getTimeVal(a.createdAt);
            const timeB = getTimeVal(b.lastActivityAt) || getTimeVal(b.updatedAt) || getTimeVal(b.createdAt);
            return timeB - timeA;
          });
          onUpdate(list);
        },
        (error) => {
          console.error('[ProjectService] Error in subscribeTimelineProjects:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('[ProjectService] Error setting up timeline listener:', error);
      return () => {};
    }
  }

  /**
   * Realtime listener for activities & comments of a specific project.
   */
  static subscribeProjectActivitiesAndComments(
    projectId: string,
    onUpdate: (activities: ProjectActivity[]) => void,
    onError?: (error: unknown) => void
  ): () => void {
    let currentActivities: ProjectActivity[] = [];
    let currentComments: ProjectActivity[] = [];

    const notifyCombined = () => {
      const combinedMap = new Map<string, ProjectActivity>();
      [...currentActivities, ...currentComments].forEach(item => {
        if (item.id) combinedMap.set(item.id, item);
      });
      const unified = Array.from(combinedMap.values());
      unified.sort((a, b) => {
        const getTimeVal = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (typeof val.seconds === 'number') return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };
        const timeA = getTimeVal(a.createdAt);
        const timeB = getTimeVal(b.createdAt);
        return timeA - timeB; // Ascending order (oldest to newest thread)
      });
      onUpdate(unified);
    };

    try {
      const actRef = collection(db, this.projectsCol, projectId, "activities");
      const unsubAct = onSnapshot(
        actRef,
        (snap) => {
          currentActivities = snap.docs.map(docSnap => ({
            ...docSnap.data(),
            id: docSnap.id,
            projectId
          } as ProjectActivity));
          notifyCombined();
        },
        (err) => {
          console.error('[ProjectService] Activities listener error:', err);
          if (onError) onError(err);
        }
      );

      const commRef = collection(db, this.projectsCol, projectId, "comments");
      const unsubComm = onSnapshot(
        commRef,
        (snap) => {
          currentComments = snap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              projectId,
              type: (data.type || 'comment') as ProjectActivityType,
              message: data.content || data.message || '',
              content: data.content || data.message || '',
              userId: data.userId || '',
              userName: data.userName || 'User',
              userInitials: data.userInitials || (data.userName ? data.userName.substring(0, 2).toUpperCase() : 'US'),
              mentions: data.mentions || [],
              parentCommentId: data.parentCommentId || null,
              attachmentUrl: data.attachmentUrl || undefined,
              attachmentName: data.attachmentName || undefined,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            } as ProjectActivity;
          });
          notifyCombined();
        },
        (err) => {
          console.error('[ProjectService] Comments listener error:', err);
          if (onError) onError(err);
        }
      );

      return () => {
        unsubAct();
        unsubComm();
      };
    } catch (error) {
      console.error('[ProjectService] Error setting up activities listener:', error);
      return () => {};
    }
  }

  /**
   * Adds a permanent comment to both `comments` and `activities` subcollections
   * and updates project's `lastActivityAt`, `lastActivityType`, `lastActivityText`.
   */
  static async addProjectTimelineComment(
    projectId: string,
    commentData: {
      userId: string;
      userName: string;
      content: string;
      mentions?: string[];
      parentCommentId?: string | null;
      attachmentUrl?: string;
      attachmentName?: string;
    }
  ): Promise<ProjectActivity> {
    const userInitials = commentData.userName
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'US';

    const commentPayload = {
      projectId,
      userId: commentData.userId,
      userName: commentData.userName,
      userInitials,
      content: commentData.content,
      type: 'comment',
      parentCommentId: commentData.parentCommentId || null,
      mentions: commentData.mentions || [],
      attachmentUrl: commentData.attachmentUrl || null,
      attachmentName: commentData.attachmentName || null,
      createdAt: serverTimestamp(),
      updatedAt: null
    };

    try {
      // 1. Save into comments subcollection
      const commRef = collection(db, this.projectsCol, projectId, "comments");
      const newCommDoc = await addDoc(commRef, cleanUndefined(commentPayload));

      // 2. Save into activities subcollection
      const actRef = collection(db, this.projectsCol, projectId, "activities");
      const actPayload: ProjectActivity = {
        id: newCommDoc.id,
        projectId,
        type: 'comment',
        message: commentData.content,
        content: commentData.content,
        userId: commentData.userId,
        userName: commentData.userName,
        userInitials,
        mentions: commentData.mentions || [],
        parentCommentId: commentData.parentCommentId || null,
        attachmentUrl: commentData.attachmentUrl || undefined,
        attachmentName: commentData.attachmentName || undefined,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(actRef, newCommDoc.id), cleanUndefined(actPayload));

      // 3. Update parent project document metadata
      const projectRef = doc(db, this.projectsCol, projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const pData = projectSnap.data();
        const currentCount = pData.activitiesCount || (pData.activities?.length || 0);
        await updateDoc(projectRef, {
          lastActivityAt: serverTimestamp(),
          lastActivityType: 'comment',
          lastActivityText: `${commentData.userName}: ${commentData.content}`,
          activitiesCount: currentCount + 1,
          updatedAt: new Date().toISOString()
        });
      }

      return actPayload;
    } catch (error) {
      console.error('[ProjectService] Error adding timeline comment:', error);
      handleFirestoreError(error, OperationType.WRITE, `${this.projectsCol}/${projectId}/comments`);
      throw error;
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
      const project = { ...projectSnap.data(), projectId: projectSnap.id } as Project;
      
      // Auto-populate for backward compatibility
      if (!project.projectCategory) {
        if (project.jobType === 'rups_lb' || project.jobType === 'sirkuler_rupslb') {
          project.projectCategory = 'MEETING';
          project.projectType = 'RUPS-LB';
        } else if (project.jobType === 'rups_t' || project.jobType === 'sirkuler') {
          project.projectCategory = 'MEETING';
          project.projectType = 'RUPST';
        } else if (project.jobType === 'pendirian_pt') {
          project.projectCategory = 'BODY_LEGAL';
          project.projectType = 'Pendirian';
        } else {
          project.projectCategory = 'BODY_LEGAL';
          project.projectType = 'Pendirian';
        }
      }
      return project;
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

  static subscribeProjects(callback: (data: Project[]) => void, limitCount?: number): () => void {
    const colRef = collection(db, this.projectsCol);
    const q = limitCount
      ? query(colRef, orderBy("updatedAt", "desc"), limit(limitCount))
      : query(colRef, orderBy("updatedAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const project = { ...docSnap.data(), projectId: docSnap.id } as Project;
          
          // Auto-populate for backward compatibility
          if (!project.projectCategory) {
            if (project.jobType === 'rups_lb' || project.jobType === 'sirkuler_rupslb') {
              project.projectCategory = 'MEETING';
              project.projectType = 'RUPS-LB';
            } else if (project.jobType === 'rups_t' || project.jobType === 'sirkuler') {
              project.projectCategory = 'MEETING';
              project.projectType = 'RUPST';
            } else if (project.jobType === 'pendirian_pt') {
              project.projectCategory = 'BODY_LEGAL';
              project.projectType = 'Pendirian';
            } else {
              project.projectCategory = 'BODY_LEGAL';
              project.projectType = 'Pendirian';
            }
          }
          return project;
        });
        
        const getDocTime = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'object' && val.seconds !== undefined) {
            return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
          }
          if (val instanceof Date) {
            return val.getTime();
          }
          if (typeof val.toDate === 'function') {
            return val.toDate().getTime();
          }
          const parsed = Date.parse(val);
          return isNaN(parsed) ? 0 : parsed;
        };

        const sorted = list.sort((a, b) => {
          const timeA = Math.max(getDocTime(a.updatedAt), getDocTime(a.createdAt));
          const timeB = Math.max(getDocTime(b.updatedAt), getDocTime(b.createdAt));
          return timeB - timeA;
        });

        callback(sorted);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, this.projectsCol);
      }
    );
  }

  static subscribeRecentProjects(limitCount = 10, callback: (data: Project[]) => void): () => void {
    return this.subscribeProjects(callback, limitCount);
  }

  private static parseProjectDoc(docSnap: any): Project {
    const project = { ...docSnap.data(), projectId: docSnap.id } as Project;
    if (!project.projectCategory) {
      if (project.jobType === 'rups_lb' || project.jobType === 'sirkuler_rupslb') {
        project.projectCategory = 'MEETING';
        project.projectType = 'RUPS-LB';
      } else if (project.jobType === 'rups_t' || project.jobType === 'sirkuler') {
        project.projectCategory = 'MEETING';
        project.projectType = 'RUPST';
      } else if (project.jobType === 'pendirian_pt') {
        project.projectCategory = 'BODY_LEGAL';
        project.projectType = 'Pendirian';
      } else {
        project.projectCategory = 'BODY_LEGAL';
        project.projectType = 'Pendirian';
      }
    }
    return project;
  }

  /**
   * Lightweight parser for project lists (Table View).
   * Strips out heavy nested objects like shareholders, managementItems, kbliItems,
   * changeSnapshot, parties, documents, workflows, timelines, etc. to minimize
   * memory footprint and initial payload size.
   */
  private static parseProjectListItem(docSnap: any): Project {
    const data = docSnap.data() || {};
    
    // Extract only lightweight client snapshot info needed for client name & type display
    let clientSnapshotLight: ClientSnapshot | undefined = undefined;
    if (data.clientSnapshot) {
      clientSnapshotLight = {
        id: data.clientSnapshot.id || data.clientId || '',
        companyName: data.clientSnapshot.companyName || '',
        companyType: data.clientSnapshot.companyType || ''
      };
    }

    const project: Project = {
      projectId: docSnap.id,
      clientId: data.clientId || '',
      title: data.title || '',
      jobType: data.jobType || '',
      status: data.status || '',
      currentStep: data.currentStep || '',
      assignedTo: data.assignedTo || '',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastTransitionComment: data.lastTransitionComment || '',
      minutaNotes: data.minutaNotes || '',
      projectCategory: data.projectCategory,
      projectType: data.projectType,
      meetingSubject: data.meetingSubject,
      metadata: data.metadata,
      clientSnapshot: clientSnapshotLight
    };

    if (!project.projectCategory) {
      if (project.jobType === 'rups_lb' || project.jobType === 'sirkuler_rupslb') {
        project.projectCategory = 'MEETING';
        project.projectType = 'RUPS-LB';
      } else if (project.jobType === 'rups_t' || project.jobType === 'sirkuler') {
        project.projectCategory = 'MEETING';
        project.projectType = 'RUPST';
      } else if (project.jobType === 'pendirian_pt') {
        project.projectCategory = 'BODY_LEGAL';
        project.projectType = 'Pendirian';
      } else {
        project.projectCategory = 'BODY_LEGAL';
        project.projectType = 'Pendirian';
      }
    }

    return project;
  }

  private static sortProjectsByDate(list: Project[]): Project[] {
    const getDocTime = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'object' && val.seconds !== undefined) {
        return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
      }
      if (val instanceof Date) {
        return val.getTime();
      }
      if (typeof val.toDate === 'function') {
        return val.toDate().getTime();
      }
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    return list.sort((a, b) => {
      const timeA = Math.max(getDocTime(a.updatedAt), getDocTime(a.createdAt));
      const timeB = Math.max(getDocTime(b.updatedAt), getDocTime(b.createdAt));
      return timeB - timeA;
    });
  }

  /**
   * Lightweight method for dropdowns/selectors: fetches limited active projects with deduplication and caching.
   * Parameter-sensitive cache key prevents cross-parameter collision.
   */
  static async getActiveProjectsForSelect(options?: { limitCount?: number; search?: string; clientId?: string }): Promise<Project[]> {
    const limitVal = options?.limitCount || 20;
    const clientIdVal = options?.clientId?.trim() || '';
    const searchVal = options?.search?.trim() || '';
    const cacheKey = `active_projects_select:limit=${limitVal}&client=${clientIdVal}&search=${searchVal}`;

    const list = await FirestoreTracker.fetchCached<Project[]>(
      cacheKey,
      'Project Selector',
      this.projectsCol,
      async () => {
        const colRef = collection(db, this.projectsCol);
        let q = clientIdVal
          ? query(colRef, where('clientId', '==', clientIdVal), where('status', 'not-in', COMPLETED_STATUS_LIST), limit(limitVal))
          : query(colRef, where('status', 'not-in', COMPLETED_STATUS_LIST), limit(limitVal));

        let querySnap;
        try {
          querySnap = await getDocsFromCache(q);
          if (!querySnap || querySnap.empty) {
            querySnap = await getDocs(q);
          }
        } catch (err) {
          querySnap = await getDocs(q);
        }
        if (!querySnap) return [];
        const items = querySnap.docs.map((docSnap) => this.parseProjectListItem(docSnap));
        return this.sortProjectsByDate(items);
      },
      5 * 60 * 1000
    );

    if (searchVal) {
      const searchStr = searchVal.toLowerCase();
      return list.filter(p =>
        (p.title && p.title.toLowerCase().includes(searchStr)) ||
        (p.clientSnapshot?.companyName && p.clientSnapshot.companyName.toLowerCase().includes(searchStr)) ||
        (p.projectId && p.projectId.toLowerCase().includes(searchStr))
      );
    }

    return list;
  }

  /**
   * Cursor-based pagination for project lists (20 items per page).
   */
  static async getProjectsPaginated(options: {
    statusCategory: 'active' | 'minuta' | 'completed';
    pageSize?: number;
    startAfterDoc?: DocumentSnapshot | null;
  }): Promise<{ projects: Project[]; lastVisible: DocumentSnapshot | null; hasMore: boolean }> {
    const pageSize = options.pageSize || 20;
    const colRef = collection(db, this.projectsCol);

    let q;
    if (options.statusCategory === 'active') {
      q = options.startAfterDoc
        ? query(colRef, where('status', 'not-in', COMPLETED_STATUS_LIST), startAfter(options.startAfterDoc), limit(pageSize + 1))
        : query(colRef, where('status', 'not-in', COMPLETED_STATUS_LIST), limit(pageSize + 1));
    } else {
      q = options.startAfterDoc
        ? query(colRef, where('status', 'in', COMPLETED_STATUS_LIST), startAfter(options.startAfterDoc), limit(pageSize + 1))
        : query(colRef, where('status', 'in', COMPLETED_STATUS_LIST), limit(pageSize + 1));
    }

    try {
      let querySnap;
      try {
        querySnap = await getDocsFromCache(q);
        if (!querySnap || querySnap.empty) {
          querySnap = await getDocs(q);
        }
      } catch (err) {
        querySnap = await getDocs(q);
      }

      if (!querySnap || querySnap.empty) {
        return { projects: [], lastVisible: null, hasMore: false };
      }

      const docs = querySnap.docs;
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
      const lastVisible = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : null;

      let items = resultDocs.map((docSnap) => this.parseProjectListItem(docSnap));

      if (options.statusCategory === 'minuta') {
        items = items.filter(p => p.metadata?.minutaCheckedAll === false || !p.metadata?.minutaCheckedAll);
      } else if (options.statusCategory === 'completed') {
        items = items.filter(p => p.metadata?.minutaCheckedAll === true);
      }

      items = this.sortProjectsByDate(items);

      FirestoreTracker.logQuery({
        collectionName: this.projectsCol,
        operation: 'list',
        limit: pageSize,
        resultCount: items.length,
        cacheStatus: 'MISS',
        network: true
      });

      return {
        projects: items,
        lastVisible,
        hasMore
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.projectsCol);
      return { projects: [], lastVisible: null, hasMore: false };
    }
  }

  /**
   * Retrieves active projects only (WHERE status NOT IN completed statuses).
   */
  static async listActiveProjects(options?: { forceRefresh?: boolean; limitCount?: number }): Promise<Project[]> {
    if (!options?.forceRefresh && ProjectService.activeProjectsCache && ProjectService.activeProjectsCache.length > 0) {
      return ProjectService.activeProjectsCache;
    }

    const path = this.projectsCol;
    try {
      const colRef = collection(db, this.projectsCol);
      const limitVal = options?.limitCount;
      const q = limitVal 
        ? query(colRef, where('status', 'not-in', COMPLETED_STATUS_LIST), limit(limitVal))
        : query(colRef, where('status', 'not-in', COMPLETED_STATUS_LIST));

      let querySnap;
      try {
        querySnap = await getDocsFromCache(q);
        if (!querySnap || querySnap.empty) {
          if (options?.forceRefresh || !ProjectService.activeProjectsCache) {
            querySnap = await getDocs(q);
          }
        }
      } catch (cacheErr) {
        querySnap = await getDocs(q);
      }

      if (!querySnap) {
        return ProjectService.activeProjectsCache || [];
      }

      const list = querySnap.docs.map((docSnap) => this.parseProjectListItem(docSnap));
      const sorted = this.sortProjectsByDate(list);

      ProjectService.activeProjectsCache = sorted;
      return sorted;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return ProjectService.activeProjectsCache || [];
    }
  }

  /**
   * Retrieves N most recent projects ordered by createdAt desc.
   */
  static async listRecentProjects(limitCount = 10): Promise<Project[]> {
    const path = this.projectsCol;
    try {
      const colRef = collection(db, this.projectsCol);
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
      let snap;
      try {
        snap = await getDocs(q);
      } catch (err) {
        if (isQuotaExceeded(err)) {
          console.warn('[ProjectService] Quota exceeded on listRecentProjects, skipping fallback');
          return [];
        }
        console.warn('[ProjectService] Error in listRecentProjects with orderBy, falling back:', err);
        const fallbackQ = query(colRef, limit(limitCount));
        snap = await getDocs(fallbackQ);
      }
      return snap.docs.map((docSnap) => this.parseProjectListItem(docSnap));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  /**
   * Retrieves finished projects (WHERE status IN completed statuses) and splits into Minuta & Selesai.
   */
  static async listMinutaAndCompletedProjects(options?: { forceRefresh?: boolean }): Promise<{ minuta: Project[]; completed: Project[] }> {
    if (
      !options?.forceRefresh &&
      ProjectService.minutaProjectsCache !== null &&
      ProjectService.completedProjectsCache !== null
    ) {
      return {
        minuta: ProjectService.minutaProjectsCache,
        completed: ProjectService.completedProjectsCache
      };
    }

    const path = this.projectsCol;
    try {
      const colRef = collection(db, this.projectsCol);
      const q = query(colRef, where('status', 'in', COMPLETED_STATUS_LIST));

      let querySnap;
      try {
        querySnap = await getDocsFromCache(q);
        if (!querySnap || querySnap.empty) {
          querySnap = await getDocs(q);
        }
      } catch (cacheErr) {
        querySnap = await getDocs(q);
      }

      if (!querySnap) {
        return {
          minuta: ProjectService.minutaProjectsCache || [],
          completed: ProjectService.completedProjectsCache || []
        };
      }

      const list = querySnap.docs.map((docSnap) => this.parseProjectListItem(docSnap));
      const sorted = this.sortProjectsByDate(list);

      const minuta: Project[] = [];
      const completed: Project[] = [];

      sorted.forEach((p) => {
        if (p.metadata?.minutaCheckedAll === true) {
          completed.push(p);
        } else {
          minuta.push(p);
        }
      });

      ProjectService.minutaProjectsCache = minuta;
      ProjectService.completedProjectsCache = completed;

      return { minuta, completed };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return {
        minuta: ProjectService.minutaProjectsCache || [],
        completed: ProjectService.completedProjectsCache || []
      };
    }
  }

  static async listMinutaProjects(options?: { forceRefresh?: boolean }): Promise<Project[]> {
    if (!options?.forceRefresh && ProjectService.minutaProjectsCache !== null) {
      return ProjectService.minutaProjectsCache;
    }
    const res = await this.listMinutaAndCompletedProjects(options);
    return res.minuta;
  }

  static async listCompletedProjects(options?: { forceRefresh?: boolean }): Promise<Project[]> {
    if (!options?.forceRefresh && ProjectService.completedProjectsCache !== null) {
      return ProjectService.completedProjectsCache;
    }
    const res = await this.listMinutaAndCompletedProjects(options);
    return res.completed;
  }

  /**
   * Retrieves all projects from Firestore with multi-layer cache prioritization.
   */
  static async listProjects(options?: { forceRefresh?: boolean }): Promise<Project[]> {
    if (!options?.forceRefresh && ProjectService.projectsCache && ProjectService.projectsCache.length > 0) {
      return ProjectService.projectsCache;
    }

    const path = this.projectsCol;
    try {
      const colRef = collection(db, this.projectsCol);
      const q = query(colRef, orderBy("updatedAt", "desc"));
      
      let querySnap;
      try {
        if (options?.forceRefresh) {
          querySnap = await getDocs(q);
        } else {
          querySnap = await getDocsFromCache(q);

          if (!querySnap || querySnap.empty) {
            querySnap = await getDocs(q);
          }
        }
      } catch (cacheErr) {
        querySnap = await getDocs(q);
      }

      if (!querySnap) {
        return ProjectService.projectsCache || [];
      }

      const list = querySnap.docs.map((docSnap) => {
        const project = { ...docSnap.data(), projectId: docSnap.id } as Project;
        
        // Auto-populate for backward compatibility
        if (!project.projectCategory) {
          if (project.jobType === 'rups_lb' || project.jobType === 'sirkuler_rupslb') {
            project.projectCategory = 'MEETING';
            project.projectType = 'RUPS-LB';
          } else if (project.jobType === 'rups_t' || project.jobType === 'sirkuler') {
            project.projectCategory = 'MEETING';
            project.projectType = 'RUPST';
          } else if (project.jobType === 'pendirian_pt') {
            project.projectCategory = 'BODY_LEGAL';
            project.projectType = 'Pendirian';
          } else {
            project.projectCategory = 'BODY_LEGAL';
            project.projectType = 'Pendirian';
          }
        }
        return project;
      });
      
      const getDocTime = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'object' && val.seconds !== undefined) {
          return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
        }
        if (val instanceof Date) {
          return val.getTime();
        }
        if (typeof val.toDate === 'function') {
          return val.toDate().getTime();
        }
        const parsed = Date.parse(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      const sorted = list.sort((a, b) => {
        const timeA = Math.max(getDocTime(a.updatedAt), getDocTime(a.createdAt));
        const timeB = Math.max(getDocTime(b.updatedAt), getDocTime(b.createdAt));
        return timeB - timeA;
      });

      ProjectService.projectsCache = sorted;
      return sorted;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return ProjectService.projectsCache || [];
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
      
      // 1. Fetch project data to retrieve driveFolderId before deletion
      let driveFolderId: string | undefined = undefined;
      try {
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = projectSnap.data() as any;
          driveFolderId = projectData?.metadata?.driveFolderId || projectData?.driveFolderId;
        }
      } catch (e) {
        console.warn("[ProjectService] Failed to fetch project metadata prior to deletion:", e);
      }

      // 2. Cleanup subcollections: timelines, tasks, documents
      const subcollections = ['timelines', 'tasks', 'documents'];
      
      for (const sub of subcollections) {
        const colRef = collection(db, this.projectsCol, projectId, sub);
        const snapshot = await getDocs(colRef);
        for (const docSnap of snapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
      }

      // 3. Cleanup project_uploaded_documents
      try {
        const uploadedCol = collection(db, 'project_uploaded_documents');
        const q = query(uploadedCol, where('projectId', '==', projectId));
        const uploadedSnap = await getDocs(q);
        for (const uSnap of uploadedSnap.docs) {
          await deleteDoc(uSnap.ref);
        }
      } catch (e) {
        console.warn("[ProjectService] Failed to cleanup project_uploaded_documents:", e);
      }

      // 4. Cascading delete for linked document projects (RUPS, RUPST, Pendirian, etc.)
      // These usually use the same ID as the parent project ID
      await deleteDoc(doc(db, 'office_projects', projectId)).catch(() => {});
      await deleteDoc(doc(db, 'projects', projectId)).catch(() => {});
      await deleteDoc(doc(db, 'rupst_projects', projectId)).catch(() => {});
      await deleteDoc(doc(db, 'rupst_public_projects', projectId)).catch(() => {});
      await deleteDoc(doc(db, 'pendirian_projects', projectId)).catch(() => {});

      // 5. Finally delete the parent project document
      try {
        await deleteDoc(projectRef);
      } catch (e) {
        // ignore if already deleted
      }
      ProjectService.clearCache();

      // 5. If driveFolderId exists, trash the Drive folder in Google Drive (non-blocking)
      if (driveFolderId) {
        try {
          const token = await AuthService.getToken();
          const response = await fetch(getApiUrl(`/api/v2/drive/trash-folder/${driveFolderId}`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) {
            const errText = await response.text();
            console.warn(`[ProjectService] Warning: Failed to trash Drive folder '${driveFolderId}':`, errText);
          }
        } catch (e) {
          console.warn(`[ProjectService] Warning: Error trashing Drive folder '${driveFolderId}':`, e);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ==========================================
  // Notary Project Services (Sprint 5)
  // ==========================================

  static listenToRupsLb(callback: (data: any[]) => void): () => void {
    const getDocTime = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'object' && val.seconds !== undefined) {
        return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
      }
      if (val instanceof Date) {
        return val.getTime();
      }
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const sortNewestFirst = (list: any[]) => {
      return list.sort((a, b) => {
        const timeA = Math.max(
          getDocTime(a.updatedAt),
          getDocTime(a.createdAt),
          getDocTime(a.signingDate),
          getDocTime(a.establishmentDeedDate)
        );
        const timeB = Math.max(
          getDocTime(b.updatedAt),
          getDocTime(b.createdAt),
          getDocTime(b.signingDate),
          getDocTime(b.establishmentDeedDate)
        );
        return timeB - timeA;
      });
    };

    return onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(sortNewestFirst(loaded));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'projects');
      }
    );
  }

  static listenToRupst(callback: (data: any[]) => void): () => void {
    const getDocTime = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'object' && val.seconds !== undefined) {
        return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
      }
      if (val instanceof Date) {
        return val.getTime();
      }
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const sortNewestFirst = (list: any[]) => {
      return list.sort((a, b) => {
        const timeA = Math.max(
          getDocTime(a.updatedAt),
          getDocTime(a.createdAt),
          getDocTime(a.signingDate),
          getDocTime(a.establishmentDeedDate)
        );
        const timeB = Math.max(
          getDocTime(b.updatedAt),
          getDocTime(b.createdAt),
          getDocTime(b.signingDate),
          getDocTime(b.establishmentDeedDate)
        );
        return timeB - timeA;
      });
    };

    return onSnapshot(
      collection(db, 'rupst_projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(sortNewestFirst(loaded));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rupst_projects');
      }
    );
  }

  static listenToRupstPublic(callback: (data: any[]) => void): () => void {
    const getDocTime = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'object' && val.seconds !== undefined) {
        return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
      }
      if (val instanceof Date) {
        return val.getTime();
      }
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const sortNewestFirst = (list: any[]) => {
      return list.sort((a, b) => {
        const timeA = Math.max(
          getDocTime(a.updatedAt),
          getDocTime(a.createdAt),
          getDocTime(a.signingDate),
          getDocTime(a.establishmentDeedDate)
        );
        const timeB = Math.max(
          getDocTime(b.updatedAt),
          getDocTime(b.createdAt),
          getDocTime(b.signingDate),
          getDocTime(b.establishmentDeedDate)
        );
        return timeB - timeA;
      });
    };

    return onSnapshot(
      collection(db, 'rupst_public_projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(sortNewestFirst(loaded));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rupst_public_projects');
      }
    );
  }

  static listenToPendirian(callback: (data: any[]) => void): () => void {
    const getDocTime = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'object' && val.seconds !== undefined) {
        return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
      }
      if (val instanceof Date) {
        return val.getTime();
      }
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    const sortNewestFirst = (list: any[]) => {
      return list.sort((a, b) => {
        const timeA = Math.max(
          getDocTime(a.updatedAt),
          getDocTime(a.createdAt),
          getDocTime(a.signingDate),
          getDocTime(a.establishmentDeedDate)
        );
        const timeB = Math.max(
          getDocTime(b.updatedAt),
          getDocTime(b.createdAt),
          getDocTime(b.signingDate),
          getDocTime(b.establishmentDeedDate)
        );
        return timeB - timeA;
      });
    };

    return onSnapshot(
      collection(db, 'pendirian_projects'),
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        callback(sortNewestFirst(loaded));
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
