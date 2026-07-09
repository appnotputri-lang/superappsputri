export interface Timeline {
  id: string;        // Unique identifier for the timeline entry
  projectId: string; // Associated project identifier
  status: string;    // The project status or step at which this occurred
  title: string;     // Title describing the action, e.g., 'Project dibuat', 'Draft selesai'
  description?: string; // Optional detailed logs or comments
  createdBy?: string; // UID of the user who performed the action
  createdAt: any;    // Timestamp when the event occurred
}
