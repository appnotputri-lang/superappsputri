export interface Env {
  DB: D1Database;
  GOOGLE_DRIVE_CLIENT_ID?: string;
  GOOGLE_DRIVE_CLIENT_SECRET?: string;
  GOOGLE_DRIVE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_ROOT_FOLDER_ID?: string;
  GOOGLE_DRIVE_REPORT_FOLDER_ID?: string;
  FONNTE_TOKEN?: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL?: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  AUTOMATION_WHATSAPP_TARGET?: string;
  CRON_SECRET?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  type: string;
  enabled: number;
  schedule?: string;
  timezone?: string;
  recipient?: string | null;
  template?: string;
  created_at: string;
  updated_at: string;
  last_run_at?: string | null;
  last_status?: string | null;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  run_key: string;
  started_at: string;
  finished_at?: string | null;
  status: string;
  recipient?: string | null;
  message?: string | null;
  provider?: string | null;
  provider_response?: string | null;
  error_message?: string | null;
}

export interface ProjectReportItem {
  id: string;
  namaPt: string;
  picName: string;
  pekerjaan: string;
  projectCategory: string;
  projectType: string;
  status: string;
  metadata?: any;
  updatedAt?: any;
  lastTransitionComment?: string;
  changeAgendas?: string[];
  meetingSubject?: string;
}

export interface GroupedReport {
  id: string;
  namaPt: string;
  picName: string;
  items: Array<{
    pekerjaan: string;
    status: string;
    metadata?: any;
    updatedAt?: any;
    id: string;
    lastTransitionComment?: string;
    picName: string;
    changeAgendas?: string[];
    meetingSubject?: string;
  }>;
}
