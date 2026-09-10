export type AgendaType = 
  | 'Penandatanganan'
  | 'Meeting'
  | 'Deadline'
  | 'Follow Up'
  | 'Pemeriksaan'
  | 'RUPS'
  | 'Lainnya';

export type AgendaStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface AgendaItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (e.g. "09:00", "11:30", "14:00")
  type: AgendaType;
  clientOrProject?: string;
  notes?: string;
  status: AgendaStatus;
  source?: 'manual' | 'project_task' | 'project_deadline' | 'ppat_transaction' | 'invoice_payment';
  sourceId?: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}
