import { Holiday } from '../types/ppat';

export const OFFICIAL_INDONESIAN_HOLIDAYS: Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // --- TAHUN 2026 ---
  { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-01-16', name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-02-18', name: 'Cuti Bersama Tahun Baru Imlek', type: 'COLLECTIVE_LEAVE', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-03-20', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 Hijriah (Hari Ke-1)', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-03-22', name: 'Hari Raya Idul Fitri 1447 Hijriah (Hari Ke-2)', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-03-23', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'COLLECTIVE_LEAVE', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-03-24', name: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', type: 'COLLECTIVE_LEAVE', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-04-03', name: 'Wafat Yesus Kristus', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-04-05', name: 'Hari Paskah', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 Hijriah', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-06-16', name: 'Tahun Baru Islam 1448 Hijriah', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-08-17', name: 'Hari Kemerdekaan Republik Indonesia ke-81', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-12-25', name: 'Hari Raya Natal', type: 'NATIONAL', year: 2026, source: 'OFFICIAL', isActive: true },
  { date: '2026-12-26', name: 'Cuti Bersama Hari Raya Natal', type: 'COLLECTIVE_LEAVE', year: 2026, source: 'OFFICIAL', isActive: true },

  // --- TAHUN 2025 ---
  { date: '2025-01-01', name: 'Tahun Baru 2025 Masehi', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-01-27', name: 'Isra Mi\'raj Nabi Muhammad SAW', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-01-29', name: 'Tahun Baru Imlek 2576 Kongzili', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-03-29', name: 'Hari Suci Nyepi Tahun Baru Saka 1947', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-03-31', name: 'Hari Raya Idul Fitri 1446 H (Hari Ke-1)', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-04-01', name: 'Hari Raya Idul Fitri 1446 H (Hari Ke-2)', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-04-02', name: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', type: 'COLLECTIVE_LEAVE', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-04-03', name: 'Cuti Bersama Hari Raya Idul Fitri 1446 H', type: 'COLLECTIVE_LEAVE', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-04-18', name: 'Wafat Yesus Kristus', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-05-01', name: 'Hari Buruh Internasional', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-05-12', name: 'Hari Raya Waisak 2569 BE', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-05-29', name: 'Kenaikan Yesus Kristus', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-06-01', name: 'Hari Lahir Pancasila', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-06-06', name: 'Hari Raya Idul Adha 1446 Hijriah', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-06-27', name: 'Tahun Baru Islam 1447 Hijriah', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-08-17', name: 'Hari Kemerdekaan RI ke-80', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-12-25', name: 'Hari Raya Natal', type: 'NATIONAL', year: 2025, source: 'OFFICIAL', isActive: true },
  { date: '2025-12-26', name: 'Cuti Bersama Hari Raya Natal', type: 'COLLECTIVE_LEAVE', year: 2025, source: 'OFFICIAL', isActive: true }
];

export function getOfficialHolidaysByYear(year: number): Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>[] {
  return OFFICIAL_INDONESIAN_HOLIDAYS.filter(h => h.year === year);
}
