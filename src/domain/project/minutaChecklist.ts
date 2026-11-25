export const PRE_MINUTA_TASK_TITLES = new Set(["NOTULEN", "AKTA RUPS LB", "SK/SP", "NPWP", "NIB"]);

export const LEGACY_MINUTA_TASK_TITLES = new Set([
  "Copy KTP Para Pihak",
  "Copy NPWP Para Pihak",
  "Copy Seluruh Riwayat Akta",
  "Demikianlah Lengkap",
  "Akta Minuta diprint",
  "Surat-Surat Pendukung",
  "Jahit Minuta"
]);

const MINUTA_TASK_TITLE_ALIASES: Record<string, string> = {
  "Copy KTP Para Pihak": "KTP Para Pihak",
  "Copy NPWP Para Pihak": "NPWP Para Pihak",
  "Copy Seluruh Riwayat Akta": "Akta dan SK AHU Terakhir",
  "Demikianlah Lengkap": "Demikianlah"
};

export function getCanonicalMinutaTaskTitle(title: string): string {
  return MINUTA_TASK_TITLE_ALIASES[title] || title;
}

const uniqueTitles = (titles: string[]) => Array.from(new Set(titles));

export function getMinutaDefaultTaskTitles(project: any): string[] {
  const jobType = String(project?.jobType || "").toLowerCase();
  const projectType = String(project?.projectType || "").toLowerCase();
  const projectCategory = String(project?.projectCategory || "").toUpperCase();
  const normalized = `${jobType} ${projectType}`;
  const isPpat = projectCategory === "PPAT" || ["akta_ppat", "ppat", "ajb", "akta_ajb"].includes(jobType);

  if (
    projectCategory === "LEGALIZATION" ||
    ["input_nib", "perbaikan_data_ahu", "buka_blokir"].includes(jobType) ||
    /\b(legalisasi|waarmerking|input nib|perbaikan data ahu|buka blokir)\b/.test(normalized)
  ) {
    return [];
  }

  const isDeedJob = isPpat || ["BODY_LEGAL", "MEETING", "AGREEMENT", "GENERAL_DEED"].includes(projectCategory) ||
    /(pendirian|perubahan|pembubaran|rups|sirkuler|akta|perjanjian|rapat)/.test(normalized);
  if (!isDeedJob) return [];

  const titles = ["KTP Para Pihak", "NPWP Para Pihak", "Demikianlah"];
  const isPt = jobType.includes("pendirian_pt") || jobType.includes("rups") || projectType.includes("pt") || /rups/.test(normalized);
  const isCv = jobType.includes("cv") || projectType.includes("cv");
  const isMeeting = projectCategory === "MEETING" || /rups|rapat|sirkuler/.test(normalized);
  const isFormation = /pendirian/.test(normalized);
  const isChange = /perubahan|rups/.test(normalized);
  const isDissolution = /pembubaran/.test(normalized);

  if (isPpat) {
    titles.push("Sertipikat Asli / Dokumen Hak Objek");
    titles.push("SPPT PBB dan NOP (jika berlaku)");
    if (/jual beli|\bajb\b/.test(normalized)) {
      titles.push("Bukti Pembayaran PPh dan BPHTB (jika berlaku)");
    } else if (/apht|skmht|hak tanggungan/.test(normalized)) {
      titles.push("Perjanjian Kredit (jika berlaku)");
    } else if (/waris/.test(normalized)) {
      titles.push("Dokumen Keterangan Waris");
    } else if (/hibah/.test(normalized)) {
      titles.push("Dokumen Dasar Hibah");
    } else {
      titles.push("Dokumen Dasar Peralihan Hak (sesuai jenis akta)");
    }
    titles.push("Surat Kuasa (jika ada)");
    return uniqueTitles(titles);
  }

  if (isPt || isCv) titles.push("Tanda Hadir CV/PT");

  if (isFormation && isPt) {
    titles.push(
      "Surat Pernyataan Alamat",
      "Surat Pernyataan Setor Saham",
      "Surat Pernyataan Pemilik Manfaat",
      "Akta dan SK AHU Badan Hukum Pendiri (jika pendiri berbadan hukum)",
      "Surat Kuasa (jika ada)"
    );
  } else if (isFormation && isCv) {
    titles.push(
      "Surat Pernyataan Alamat",
      "Akta dan SK AHU Badan Hukum Pendiri (jika pendiri berbadan hukum)",
      "Surat Kuasa (jika ada)"
    );
  } else if ((isChange || isDissolution) && (isPt || isCv)) {
    titles.push(
      isCv ? "Akta dan Pendaftaran CV Terakhir" : "Akta dan SK AHU Terakhir",
      isMeeting ? "Notulen/Risalah Rapat atau Keputusan Sirkuler" : "Keputusan Para Pihak",
      "Surat Kuasa (jika ada)"
    );
    if (isPt && isChange) titles.push("Surat Pernyataan Setor Saham (jika ada perubahan modal)");
    if (isCv && isDissolution) titles.push("Dokumen Penyelesaian/Pembubaran CV");
  } else if (isMeeting) {
    titles.push(
      "Akta dan SK AHU Terakhir (jika badan hukum)",
      isPt || isCv ? "Tanda Hadir CV/PT" : "Tanda Hadir Rapat",
      "Notulen/Risalah Rapat atau Keputusan Sirkuler",
      "Surat Kuasa (jika ada)"
    );
  } else if (projectCategory === "AGREEMENT") {
    titles.push(
      "Naskah Perjanjian Final",
      "Dokumen Dasar/Objek Perjanjian (jika berlaku)",
      "Akta dan SK AHU Pihak Berbadan Hukum (jika berlaku)",
      "Surat Kuasa (jika ada)"
    );
  } else if (projectCategory === "GENERAL_DEED") {
    titles.push(
      "Dokumen Dasar Akta",
      "Akta dan SK AHU Pihak Berbadan Hukum (jika berlaku)",
      "Surat Kuasa (jika ada)"
    );
  } else {
    titles.push("Surat Pernyataan Alamat (jika berlaku)");
    if (isFormation) {
      titles.push("Akta dan SK AHU Badan Hukum Pendiri (jika pendiri berbadan hukum)");
    } else {
      titles.push("Akta dan SK AHU Terakhir (jika badan hukum)");
    }
    titles.push("Dokumen Dasar Akta", "Surat Kuasa (jika ada)");
  }

  return uniqueTitles(titles);
}

export function isMinutaChecklistTaskTitle(title: string, project: any): boolean {
  return LEGACY_MINUTA_TASK_TITLES.has(title) ||
    (!PRE_MINUTA_TASK_TITLES.has(title) && getMinutaDefaultTaskTitles(project).includes(title));
}
