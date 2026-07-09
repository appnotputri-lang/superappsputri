const fs = require('fs');
let content = fs.readFileSync('src/lib/docx-renderer/constants.ts', 'utf8');

// Insert SIRKULER values
content = content.replace(/export const MARGINS = \{/, `export const MARGINS = {
  SIRKULER: { left: 1440, right: 1440, top: 1440, bottom: 1440 },`);
  
content = content.replace(/export const CONTENT_WIDTH = \{/, `export const CONTENT_WIDTH = {
  SIRKULER: PAGE_WIDTH - 2880,`);

content = content.replace(/export const TAB_KANAN = \{/, `export const TAB_KANAN = {
  SIRKULER: { type: TabStopType.RIGHT, position: PAGE_WIDTH - 2880, leader: LeaderType.NONE },`);

content = content.replace(/export const DOCX_CONSTANTS = \{/, `export const DOCX_CONSTANTS = {
  SIRKULER: { MARGINS: MARGINS.SIRKULER, WIDTH: CONTENT_WIDTH.SIRKULER, TAB_KANAN: TAB_KANAN.SIRKULER },`);

fs.writeFileSync('src/lib/docx-renderer/constants.ts', content);
