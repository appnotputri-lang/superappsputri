// numbering.ts
import { LevelFormat } from "docx";
import { FONT_FAMILY, FONT_SIZE } from "./constants";
import { INDENT } from "./constants/indent";

// Konfigurasi untuk akta (tidak diubah)
export const buildAktaNumberingConfig = () => [
  {
    reference: "akta-numbered",
    levels: [
      {
        level: 0,
        format: LevelFormat.UPPER_ROMAN,
        text: "%1.",
        alignment: "right",
        style: {
          run: { bold: true, size: FONT_SIZE, font: FONT_FAMILY },
          paragraph: { indent: { left: 720, hanging: 360 } },
        },
      },
    ],
  },
  {
    reference: "akta-subnumbered",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 426, hanging: 426 } } },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: { paragraph: { indent: { left: 780, hanging: 354 } } },
      },
    ],
  },
  {
    reference: "akta-list",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 426, hanging: 426 } } },
      },
      {
        level: 1,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 780, hanging: 354 } } },
      },
    ],
  },
  {
    reference: "akta-rupst-preamble",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  },
  {
    reference: "akta-rupst-attendance",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  },
  {
    reference: "akta-rupst-attendance-ltr",
    levels: [
      {
        level: 0,
        format: LevelFormat.LOWER_LETTER,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      },
    ],
  },
  {
    reference: "akta-rupst-general",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  },
  {
    reference: "akta-rupst-decisions",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  },
  {
    reference: "akta-rupst-saksi",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 425, hanging: 425 } } },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 850, hanging: 425 } } },
      },
    ],
  },
];

// Konfigurasi notulen (tidak diubah)
export const buildNotulenNumberingConfig = (
  letterSubConfigs: any[] = [],
  font: string = FONT_FAMILY,
  size: number = FONT_SIZE
) => [
  {
    reference: "section-num",
    levels: [
      {
        level: 0,
        format: LevelFormat.UPPER_ROMAN,
        text: "%1.",
        alignment: "right",
        style: {
          run: { bold: true, size: size, font: font },
          paragraph: { indent: { left: 720, hanging: 360 } },
        },
      },
    ],
  },
  {
    reference: "peserta-num",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 426, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "sh-dash",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 426, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "hadir-dash",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 709, hanging: 283 } } },
      },
    ],
  },
  {
    reference: "para-dash",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 284, hanging: 284 } } },
      },
    ],
  },
  {
    reference: "keputusan-num",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { paragraph: { indent: { left: 426, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "agenda-dash",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { run: { size: size, font: font }, paragraph: { indent: { left: 426, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "amendment-dash",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 426, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "deed-num",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  },
  {
    reference: "res-num",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: { run: { size: size, font: font }, paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  },
  {
    reference: "kbli-sub-1",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "1)",
        alignment: "left",
        style: { run: { size: size, font: font }, paragraph: { indent: { left: 851, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "kbli-sub-2",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "2)",
        alignment: "left",
        style: { run: { size: size, font: font }, paragraph: { indent: { left: 851, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "kbli-sub",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1)",
        alignment: "left",
        style: { run: { size: size, font: font }, paragraph: { indent: { left: 851, hanging: 426 } } },
      },
    ],
  },
  {
    reference: "kbli-item",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 1134, hanging: 283 } } },
      },
    ],
  },
  {
    reference: "detail-dash",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 993, hanging: 284 } } },
      },
    ],
  },
  {
    reference: "mgmt-dash",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: { paragraph: { indent: { left: 1146, hanging: 360 } } },
      },
    ],
  },
  ...letterSubConfigs,
];

// KONFIGURASI SIRKULER (DIUBAH)
export const buildSirkulerNumberingConfig = (font: string = FONT_FAMILY, size: number = FONT_SIZE) => [
  // Single bullet reference untuk semua bullet "-" (tanpa pool)
  {
    reference: "sirkuler-bullet",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.BULLET_LEVEL_1, hanging: INDENT.BULLET_LEVEL_1_HANGING } },
        },
      },
      {
        level: 1,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.BULLET_LEVEL_2, hanging: INDENT.BULLET_LEVEL_2_HANGING } },
        },
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.BULLET_LEVEL_3, hanging: INDENT.BULLET_LEVEL_3_HANGING } },
        },
      },
      {
        level: 3,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.BULLET_LEVEL_4, hanging: INDENT.BULLET_LEVEL_4_HANGING } },
        },
      },
    ],
  },
  {
    reference: "sirkuler-amendment",
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.AMENDMENT_LIST, hanging: INDENT.AMENDMENT_LIST_HANGING } },
        },
      },
    ],
  },
  // Numbered untuk keputusan
  {
    reference: "sirkuler-numbered-decision",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.NUMBERED_MAIN, hanging: INDENT.NUMBERED_MAIN_HANGING } },
        },
      },
      {
        level: 1,
        format: LevelFormat.DECIMAL,
        text: "%1.%2.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1080, hanging: 360 } },
        },
      },
      {
        level: 2,
        format: LevelFormat.LOWER_LETTER,
        text: "%3.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1440, hanging: 360 } },
        },
      },
      {
        level: 3,
        format: LevelFormat.DECIMAL,
        text: "%4.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1800, hanging: 360 } },
        },
      },
    ],
  },
  // Alpha untuk keputusan (a., b., c.)
  {
    reference: "sirkuler-numbered-alpha-decision",
    levels: [
      {
        level: 0,
        format: LevelFormat.LOWER_LETTER,
        text: "%1.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.ALPHA_BULLET, hanging: INDENT.ALPHA_BULLET_HANGING } },
        },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_ROMAN,
        text: "%2.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1080, hanging: 360 } },
        },
      },
      {
        level: 2,
        format: LevelFormat.DECIMAL,
        text: "%3.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1440, hanging: 360 } },
        },
      },
      {
        level: 3,
        format: LevelFormat.LOWER_LETTER,
        text: "%4.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1800, hanging: 360 } },
        },
      },
    ],
  },
  // Numbered untuk daftar pemegang saham
  {
    reference: "sirkuler-numbered-attendee",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.NUMBERED_MAIN, hanging: INDENT.NUMBERED_MAIN_HANGING } },
        },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1080, hanging: 360 } },
        },
      },
      {
        level: 2,
        format: LevelFormat.LOWER_ROMAN,
        text: "%3.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1440, hanging: 360 } },
        },
      },
      {
        level: 3,
        format: LevelFormat.DECIMAL,
        text: "%4.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1800, hanging: 360 } },
        },
      },
    ],
  },
  // Numbered untuk statement (DENGAN INI MENYATAKAN)
  {
    reference: "sirkuler-numbered-statement",
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.NUMBERED_STATEMENT, hanging: INDENT.NUMBERED_STATEMENT_HANGING } },
        },
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: "%2.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1080, hanging: 360 } },
        },
      },
      {
        level: 2,
        format: LevelFormat.LOWER_ROMAN,
        text: "%3.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1440, hanging: 360 } },
        },
      },
      {
        level: 3,
        format: LevelFormat.DECIMAL,
        text: "%4.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1800, hanging: 360 } },
        },
      },
    ],
  },
  // Alpha untuk statement (jika ada)
  {
    reference: "sirkuler-numbered-alpha-statement",
    levels: [
      {
        level: 0,
        format: LevelFormat.LOWER_LETTER,
        text: "%1.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: INDENT.ALPHA_BULLET, hanging: INDENT.ALPHA_BULLET_HANGING } },
        },
      },
      {
        level: 1,
        format: LevelFormat.DECIMAL,
        text: "%2.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 720, hanging: 360 } },
        },
      },
      {
        level: 2,
        format: LevelFormat.LOWER_ROMAN,
        text: "%3.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1080, hanging: 360 } },
        },
      },
      {
        level: 3,
        format: LevelFormat.DECIMAL,
        text: "%4.",
        alignment: "left",
        style: {
          run: { font, size },
          paragraph: { indent: { left: 1440, hanging: 360 } },
        },
      },
    ],
  },
];

// HAPUS fungsi buildSirkulerBulletPoolConfig - tidak digunakan lagi