export interface Workflow {
  id: string; // E.g., 'rups_lb', 'rups_t', 'pendirian_pt'
  name: string; // E.g., 'RUPS LB Standard Workflow'
  steps: string[]; // List of sequential status/step names, e.g., ['draft', 'approval', 'print', 'ahu', 'completed']
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}
