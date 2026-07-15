import { SidebarTabId } from '../../types';

export const TAB_ACCENTS: Record<SidebarTabId, {
  iconColor: string;      // Active icon colors
  textColor: string;      // Active text classes
  bgColor: string;        // Active background color (soft theme tints)
  hoverBg: string;        // Soft hover borders/backgrounds
  indicatorBg: string;    // Accent border colors
}> = {
  projects: {
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-900',
    bgColor: 'bg-emerald-50/70',
    hoverBg: 'hover:bg-emerald-50/40 hover:text-emerald-950',
    indicatorBg: 'bg-emerald-600'
  },
  project_detail: {
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-900',
    bgColor: 'bg-emerald-50/70',
    hoverBg: 'hover:bg-emerald-50/40 hover:text-emerald-950',
    indicatorBg: 'bg-emerald-600'
  },
  beranda: {
    iconColor: 'text-blue-600',
    textColor: 'text-blue-900',
    bgColor: 'bg-blue-50/70',
    hoverBg: 'hover:bg-blue-50/40 hover:text-blue-950',
    indicatorBg: 'bg-blue-600'
  },
  company_profile: {
    iconColor: 'text-indigo-600',
    textColor: 'text-indigo-900',
    bgColor: 'bg-indigo-50/70',
    hoverBg: 'hover:bg-indigo-50/40 hover:text-indigo-950',
    indicatorBg: 'bg-indigo-600'
  },
  cv_profile: {
    iconColor: 'text-teal-600',
    textColor: 'text-teal-900',
    bgColor: 'bg-teal-50/70',
    hoverBg: 'hover:bg-teal-50/40 hover:text-teal-950',
    indicatorBg: 'bg-teal-600'
  },
  notulen: {
    iconColor: 'text-orange-600',
    textColor: 'text-orange-900',
    bgColor: 'bg-orange-50/70',
    hoverBg: 'hover:bg-orange-50/40 hover:text-orange-950',
    indicatorBg: 'bg-orange-600'
  },
  rupst: {
    iconColor: 'text-green-600',
    textColor: 'text-green-900',
    bgColor: 'bg-green-50/70',
    hoverBg: 'hover:bg-green-50/40 hover:text-green-950',
    indicatorBg: 'bg-green-600'
  },
  pendirian: {
    iconColor: 'text-pink-600',
    textColor: 'text-pink-900',
    bgColor: 'bg-pink-50/70',
    hoverBg: 'hover:bg-pink-50/40 hover:text-pink-950',
    indicatorBg: 'bg-pink-600'
  },
  kbli_mapping: {
    iconColor: 'text-blue-900',
    textColor: 'text-blue-950',
    bgColor: 'bg-blue-100/55',
    hoverBg: 'hover:bg-blue-100/30 hover:text-blue-950',
    indicatorBg: 'bg-blue-900'
  },
  saran_kbli: {
    iconColor: 'text-lime-600',
    textColor: 'text-lime-900',
    bgColor: 'bg-lime-50/60',
    hoverBg: 'hover:bg-lime-50/35 hover:text-lime-950',
    indicatorBg: 'bg-lime-600'
  },
  perbaikan: {
    iconColor: 'text-red-600',
    textColor: 'text-red-900',
    bgColor: 'bg-red-50/70',
    hoverBg: 'hover:bg-red-50/40 hover:text-red-950',
    indicatorBg: 'bg-red-600'
  },
  panduan: {
    iconColor: 'text-amber-600',
    textColor: 'text-amber-900',
    bgColor: 'bg-amber-50/70',
    hoverBg: 'hover:bg-amber-50/40 hover:text-amber-950',
    indicatorBg: 'bg-amber-600'
  },
  import_kbli: {
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-900',
    bgColor: 'bg-emerald-50/70',
    hoverBg: 'hover:bg-emerald-50/40 hover:text-emerald-950',
    indicatorBg: 'bg-emerald-600'
  },
  draft_akta_rups: {
    iconColor: 'text-slate-600',
    textColor: 'text-slate-905',
    bgColor: 'bg-slate-100',
    hoverBg: 'hover:bg-slate-100 hover:text-slate-905',
    indicatorBg: 'bg-slate-500'
  },
  laporan: {
    iconColor: 'text-fuchsia-600',
    textColor: 'text-fuchsia-900',
    bgColor: 'bg-fuchsia-50/70',
    hoverBg: 'hover:bg-fuchsia-50/40 hover:text-fuchsia-950',
    indicatorBg: 'bg-fuchsia-600'
  },
  whatsapp_settings: {
    iconColor: 'text-rose-600',
    textColor: 'text-rose-900',
    bgColor: 'bg-rose-50/70',
    hoverBg: 'hover:bg-rose-50/40 hover:text-rose-950',
    indicatorBg: 'bg-rose-600'
  },
  user_management: {
    iconColor: 'text-violet-600',
    textColor: 'text-violet-900',
    bgColor: 'bg-violet-50/70',
    hoverBg: 'hover:bg-violet-50/40 hover:text-violet-950',
    indicatorBg: 'bg-violet-600'
  }
};

export const TAB_TO_PATH: Record<string, string> = {
  'beranda': '/',
  'company_profile': '/profile',
  'cv_profile': '/profile-cv',
  'notulen': '/rupslb',
  'pendirian': '/pendirian',
  'rupst': '/rupst',
  'perbaikan': '/perbaikan',
  'draft_akta_rups': '/draft-akta',
  'panduan': '/panduan',
  'sirkuler_laporan': '/sirkuler',
  'rupst_public': '/rupst-public',
  'kbli_mapping': '/kbli-mapping',
  'saran_kbli': '/saran-kbli',
  'import_kbli': '/import-kbli',
  'laporan': '/laporan',
  'whatsapp_settings': '/whatsapp-gateway',
  'projects': '/projects',
  'project_detail': '/projects-detail',
  'user_management': '/user-management'
};

export const PATH_TO_TAB: Record<string, SidebarTabId> = {
  ...Object.fromEntries(
    Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as SidebarTabId])
  ),
  '/profile-cv': 'company_profile' as SidebarTabId
};
