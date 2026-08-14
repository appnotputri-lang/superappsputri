// Safe loader for historical records that supports dynamic globbing and fallback
// This guarantees that build tools (Vite, Rollup, Cloudflare Pages) will never fail even if optional static data files are being synced.

const notaryModules = import.meta.glob<{
  HISTORICAL_DEEDS?: any[];
  HISTORICAL_PRIVATE_DEEDS?: any[];
  HISTORICAL_INCOMING_MAILS?: any[];
  HISTORICAL_OUTGOING_MAILS?: any[];
  HISTORICAL_PROTEST_CHEQUES?: any[];
  HISTORICAL_GENERAL_DOCUMENTS?: any[];
}>('./notaryHistoricalRecords.ts', { eager: true });

const kbliModules = import.meta.glob<{
  HISTORICAL_KBLI_MAPPINGS?: any[];
  HISTORICAL_KBLI_SUGGESTIONS?: any[];
}>('./kbliHistoricalRecords.ts', { eager: true });

const genDocModules = import.meta.glob<{
  HISTORICAL_GENERAL_DOCUMENTS?: any[];
}>('./generalDocumentsHistorical.ts', { eager: true });

// Extract notary module if present
const notaryData = Object.values(notaryModules)[0] || {};
const kbliData = Object.values(kbliModules)[0] || {};
const genDocData = Object.values(genDocModules)[0] || {};

export const HISTORICAL_DEEDS = notaryData.HISTORICAL_DEEDS || [];
export const HISTORICAL_PRIVATE_DEEDS = notaryData.HISTORICAL_PRIVATE_DEEDS || [];
export const HISTORICAL_INCOMING_MAILS = notaryData.HISTORICAL_INCOMING_MAILS || [];
export const HISTORICAL_OUTGOING_MAILS = notaryData.HISTORICAL_OUTGOING_MAILS || [];
export const HISTORICAL_PROTEST_CHEQUES = notaryData.HISTORICAL_PROTEST_CHEQUES || [];
export const HISTORICAL_GENERAL_DOCUMENTS = notaryData.HISTORICAL_GENERAL_DOCUMENTS || genDocData.HISTORICAL_GENERAL_DOCUMENTS || [];

export const HISTORICAL_KBLI_MAPPINGS = kbliData.HISTORICAL_KBLI_MAPPINGS || [];
export const HISTORICAL_KBLI_SUGGESTIONS = kbliData.HISTORICAL_KBLI_SUGGESTIONS || [];
