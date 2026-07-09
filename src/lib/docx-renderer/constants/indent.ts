// constants/indent.ts
export const INDENT = {
  // Numbered utama (1., 2., 3., dst) - untuk keputusan dan daftar pemegang saham
  NUMBERED_MAIN: 284,
  NUMBERED_MAIN_HANGING: 284,

  // Numbered untuk pernyataan (DENGAN INI MENYATAKAN)
  NUMBERED_STATEMENT: 284,
  NUMBERED_STATEMENT_HANGING: 284,

  // Bullet level 1 (-) untuk daftar sederhana (seperti "Untuk selanjutnya ...")
  BULLET_LEVEL_1: 284,
  BULLET_LEVEL_1_HANGING: 284,

  // Bullet level 2 (-) untuk sub-daftar (seperti "- Selaku pemilik ...")
  BULLET_LEVEL_2: 720,
  BULLET_LEVEL_2_HANGING: 360,

  // Bullet level 3 (-) untuk sub-sub daftar
  BULLET_LEVEL_3: 1080,
  BULLET_LEVEL_3_HANGING: 360,

  // Bullet level 4 (-)
  BULLET_LEVEL_4: 1440,
  BULLET_LEVEL_4_HANGING: 360,

  // Alpha bullet (a., b., c., dst) untuk alasan audit
  ALPHA_BULLET: 720,
  ALPHA_BULLET_HANGING: 360,

  // Daftar amendment deeds
  AMENDMENT_LIST: 360,
  AMENDMENT_LIST_HANGING: 360,

  // Indent untuk paragraph biasa
  PARAGRAPH_INDENT: 284,
};

export const getLevelFromIndent = (indentLeft: number): number => {
  const map: Record<number, number> = {
    [INDENT.NUMBERED_MAIN]: 0,
    [INDENT.NUMBERED_STATEMENT]: 0,
    [INDENT.BULLET_LEVEL_1]: 0,
    [INDENT.BULLET_LEVEL_2]: 1,
    [INDENT.BULLET_LEVEL_3]: 2,
    [INDENT.BULLET_LEVEL_4]: 3,
    [INDENT.ALPHA_BULLET]: 0,
  };
  return map[indentLeft] ?? 0;
};