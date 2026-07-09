import { TabStopType, LeaderType } from "docx";

export const FONT_FAMILY = "Century Gothic";
export const FONT_SIZE = 20; // 10pt
export const LINE_SPACING = 480; // 2.0 spacing

export const PAGE_WIDTH = 11906;
export const PAGE_HEIGHT = 16838;

export const MARGINS = {
  SIRKULER: { left: 1440, right: 1440, top: 1440, bottom: 1440 },
  AKTA: { left: 2268, right: 618, top: 1418, bottom: 1418 },
  NOTULEN: { left: 1440, right: 1440, top: 1440, bottom: 1440 },
};

export const CONTENT_WIDTH = {
  SIRKULER: PAGE_WIDTH - 2880,
  AKTA: PAGE_WIDTH - MARGINS.AKTA.left - MARGINS.AKTA.right,
  NOTULEN: PAGE_WIDTH - MARGINS.NOTULEN.left - MARGINS.NOTULEN.right,
};

export const TAB_KANAN = {
  SIRKULER: { type: TabStopType.RIGHT, position: PAGE_WIDTH - 2880, leader: LeaderType.NONE },
  AKTA: { type: TabStopType.RIGHT, position: CONTENT_WIDTH.AKTA, leader: LeaderType.HYPHEN },
  AKTA_NO_LEADER: { type: TabStopType.RIGHT, position: CONTENT_WIDTH.AKTA, leader: LeaderType.NONE },
  NOTULEN: { type: TabStopType.RIGHT, position: CONTENT_WIDTH.NOTULEN, leader: LeaderType.NONE },
};

export const NOTARIS_TAB_STOPS = [
  { type: TabStopType.LEFT, position: 4395 },
  TAB_KANAN.AKTA,
];

export const W = {
  AKTA: {
    normal: 44.0,
    list1: 42.5,
    list2: 41.0,
    list3: 39.5,
    list4: 38.0,
    numbered: 41.5,
    subnr: 41.0,
    rcenter: 20.5,
    indent284: 42.6,
    indent426: 41.9,
    indent850: 39.8,
  },
  NOTULEN: {
    normal: 44.0,
    peserta0: 42.0,
    peserta1: 40.0,
    peserta2: 38.0,
    kep0: 42.5,
    kep1: 40.5,
    numbered: 44.0,
    subnr: 43.5,
    rcenter: 22.0,
    list1: 42.5,
    list2: 41.0,
    list3: 39.5,
    list4: 38.0,
  }
};

export const DOCX_CONSTANTS = {
  SIRKULER: { MARGINS: MARGINS.SIRKULER, WIDTH: CONTENT_WIDTH.SIRKULER, TAB_KANAN: TAB_KANAN.SIRKULER },
  AKTA: { MARGINS: MARGINS.AKTA, WIDTH: CONTENT_WIDTH.AKTA, W: W.AKTA, TAB_KANAN: TAB_KANAN.AKTA, TAB_KANAN_NO_LEADER: TAB_KANAN.AKTA_NO_LEADER, NOTARIS_TAB_STOPS: NOTARIS_TAB_STOPS },
  NOTULEN: { MARGINS: MARGINS.NOTULEN, WIDTH: CONTENT_WIDTH.NOTULEN, W: W.NOTULEN, TAB_KANAN: TAB_KANAN.NOTULEN },
};