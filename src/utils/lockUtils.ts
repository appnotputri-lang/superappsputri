export const SUPER_ADMIN_EMAIL = 'rdyndi@gmail.com';

export const isSuperAdmin = (userEmail?: string | null): boolean => {
  if (!userEmail) return false;
  return userEmail.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
};

// Record terkunci setelah tanggal 20 bulan BERIKUTNYA dari tanggal record.
export const isRecordLocked = (
  recordDateStr: string | Date | undefined | null,
  userEmail?: string | null
): boolean => {
  if (isSuperAdmin(userEmail)) return false;
  if (!recordDateStr) return false;
  const rDate = new Date(recordDateStr);
  if (isNaN(rDate.getTime())) return false;

  const recordYear = rDate.getFullYear();
  const recordMonth = rDate.getMonth();
  const cutoffYear = recordMonth === 11 ? recordYear + 1 : recordYear;
  const cutoffMonth = recordMonth === 11 ? 0 : recordMonth + 1;
  const cutoffDate = new Date(cutoffYear, cutoffMonth, 20, 23, 59, 59, 999);

  return new Date() > cutoffDate;
};

export const getLockDeadlineMessage = (recordDateStr: string | Date | undefined | null): string => {
  if (!recordDateStr) return '';
  const rDate = new Date(recordDateStr);
  if (isNaN(rDate.getTime())) return '';
  const recordYear = rDate.getFullYear();
  const recordMonth = rDate.getMonth();
  const cutoffYear = recordMonth === 11 ? recordYear + 1 : recordYear;
  const cutoffMonth = recordMonth === 11 ? 0 : recordMonth + 1;
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `20 ${monthNames[cutoffMonth]} ${cutoffYear}`;
};
