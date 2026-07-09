export interface DocumentReference {
  id: string;
  name: string;
  url?: string;
  refId?: string;
  type: string; // e.g., 'docx', 'pdf', 'doc', 'other'
  uploadedBy?: string;
  uploadedAt: any; // Date, Firestore Timestamp, or ISO string
}

export interface Project {
  projectId: string; // Unique Identifier (Document ID in Firestore)
  clientId: string;  // Reference to CompanyProfile document (profiles/{id})
  jobType: string;   // Type of job, e.g., 'rups_lb', 'rups_t', 'pendirian_pt', etc.
  title: string;     // Title of the project/company
  status: string;    // Core state of the project
  currentStep: string; // Current step name in the workflow sequence
  assignedTo?: string; // UID of the assigned user/notary
  createdAt: any;    // Timestamp when project was created
  updatedAt: any;    // Timestamp of the last status or detail update
  metadata?: Record<string, any>; // Highly extensible metadata block
  documents?: DocumentReference[]; // Associated document registry
}
