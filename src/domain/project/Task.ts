export interface Task {
  id: string;        // Unique identifier for the task
  projectId: string; // Parent project identifier
  title: string;     // Checklist action name, e.g., 'Drafting', 'Review Akta', 'SK Terbit'
  status: 'pending' | 'in_progress' | 'completed' | 'not_required'; // Current checklist status
  assignedTo?: string; // UID of the team member assigned to this specific checklist item
  dueDate?: any;     // Optional deadline for this item
  completedAt?: any; // Timestamp when completed
  completedBy?: string; // UID of the user who completed the task
  createdAt: any;    // Creation timestamp
  updatedAt: any;    // Last modification timestamp
}
