export const KBLI_2025_CATEGORIES: Record<string, string> = {
  'A': 'PERTANIAN, KEHUTANAN, DAN PERIKANAN',
  'B': 'PERTAMBANGAN DAN PENGGALIAN',
  'C': 'INDUSTRI',
  'D': 'PENYEDIAAN LISTRIK, GAS, UAP/AIR PANAS, DAN UDARA DINGIN',
  'E': 'PENYEDIAAN AIR; PENGELOLAAN AIR LIMBAH, PENANGANAN LIMBAH, DAN REMEDIASI',
  'F': 'KONSTRUKSI',
  'G': 'PERDAGANGAN BESAR DAN ECERAN',
  'H': 'TRANSPORTASI DAN PENYIMPANAN',
  'I': 'AKTIVITAS PENYEDIAAN AKOMODASI DAN MAKAN MINUM',
  'J': 'AKTIVITAS PENERBITAN, PENYIARAN, SERTA PRODUKSI DAN DISTRIBUSI KONTEN',
  'K': 'AKTIVITAS TELEKOMUNIKASI, PEMROGRAMAN KOMPUTER, KONSULTANSI, INFRASTRUKTUR KOMPUTASI, DAN JASA INFORMASI LAINNYA',
  'L': 'AKTIVITAS KEUANGAN DAN ASURANSI',
  'M': 'AKTIVITAS REAL ESTAT',
  'N': 'AKTIVITAS PROFESIONAL, ILMIAH, DAN TEKNIS',
  'O': 'AKTIVITAS ADMINISTRATIF DAN PENUNJANG USAHA',
  'P': 'ADMINISTRASI PEMERINTAHAN DAN PERTAHANAN, SERTA JAMINAN SOSIAL WAJIB',
  'Q': 'PENDIDIKAN',
  'R': 'AKTIVITAS KESEHATAN MANUSIA DAN AKTIVITAS SOSIAL',
  'S': 'KESENIAN, OLAHRAGA, DAN REKREASI',
  'T': 'AKTIVITAS JASA LAINNYA',
  'U': 'AKTIVITAS RUMAH TANGGA SEBAGAI PEMBERI KERJA DAN AKTIVITAS PRODUKSI',
  'V': 'AKTIVITAS BADAN INTERNASIONAL DAN BADAN EKSTRA INTERNASIONAL LAINNYA'
};

export function formatKbliCategory(letter?: string, name?: string): string {
  if (!letter) return (name || "").toUpperCase();
  const officialName = KBLI_2025_CATEGORIES[letter.toUpperCase()];
  if (officialName) {
    return `${letter.toUpperCase()} - ${officialName}`;
  }
  return `${letter.toUpperCase()} - ${(name || "").toUpperCase()}`;
}

export interface ParsedKbliLine {
  isBullet: boolean;
  text: string;
}

export function parseKbliDescription(description: string | undefined): ParsedKbliLine[] {
  const rawDesc = (description || "").trim();
  if (!rawDesc) return [];

  let normalized = rawDesc;
  if (!normalized.includes("\n")) {
    normalized = normalized.replace(/\s+-\s+(?=[A-Za-zÀ-ÿ])/g, "\n- ");
  }

  const proseWords = [
    "Kelompok", "Subgolongan", "Golongan", "Kegiatan", "Aktivitas", "Usaha", 
    "Jasa", "Selanjutnya", "Selain", "Namun", "Sedangkan", "Dalam", "Untuk", 
    "Termasuk", "Penyelenggaraan", "Penyediaan", "Pelaksanaan", "Pengelolaan", 
    "Pengembangan", "Produksi",
  ];

  const isNarrative = (text: string) => {
    const t = text.trim();
    return proseWords.some(w => t.startsWith(w + " ") || t.startsWith(w + ",") || t.startsWith(w + "."));
  };

  const lines: ParsedKbliLine[] = [];

  for (const line of normalized.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!trimmed.startsWith("-")) {
      lines.push({ isBullet: false, text: trimmed });
      continue;
    }

    let bullet = trimmed.substring(1).trim();
    while (true) {
      const dot = bullet.indexOf(". ");
      if (dot === -1) break;
      const after = bullet.substring(dot + 2).trim();
      if (!after) break;
      if (!isNarrative(after)) break;

      const bulletPart = bullet.substring(0, dot + 1).trim();
      lines.push({ isBullet: true, text: bulletPart });
      lines.push({ isBullet: false, text: after });
      bullet = "";
      break;
    }

    if (bullet) {
      lines.push({ isBullet: true, text: bullet });
    }
  }

  return lines;
}
