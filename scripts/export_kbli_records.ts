import fs from 'fs';
import { getLocalD1Database } from '../src/lib/sqlite-d1';

async function exportKbliRecords() {
  const db = getLocalD1Database();

  const mappings = (await db.prepare("SELECT * FROM kbli_mapping_records ORDER BY id ASC").all())?.results || [];
  const suggestions = (await db.prepare("SELECT * FROM kbli_suggestion_records ORDER BY id ASC").all())?.results || [];

  console.log(`Exporting ${mappings.length} mapping records and ${suggestions.length} suggestion records...`);

  const kbliMappings = mappings.map((row: any) => {
    try {
      if (row.raw_data) return JSON.parse(row.raw_data);
    } catch (e) {}
    return {
      id: row.id,
      nama: row.nama,
      kelompok_usaha: row.kelompok_usaha,
      selected_items: row.selected_items ? JSON.parse(row.selected_items) : [],
      updated_at: row.updated_at,
      user_id: row.user_id,
      created_at: row.created_at
    };
  });

  const kbliSuggestions = suggestions.map((row: any) => {
    try {
      if (row.raw_data) return JSON.parse(row.raw_data);
    } catch (e) {}
    return {
      id: row.id,
      nama: row.nama,
      kelompok_usaha: row.kelompok_usaha,
      selected_items: row.selected_items ? JSON.parse(row.selected_items) : [],
      updated_at: row.updated_at,
      user_id: row.user_id,
      created_at: row.created_at
    };
  });

  const content = `// Auto-generated historical KBLI records extracted from local D1 SQLite backup
export const HISTORICAL_KBLI_MAPPINGS = ${JSON.stringify(kbliMappings, null, 2)};

export const HISTORICAL_KBLI_SUGGESTIONS = ${JSON.stringify(kbliSuggestions, null, 2)};
`;

  fs.mkdirSync('src/data', { recursive: true });
  fs.writeFileSync('src/data/kbliHistoricalRecords.ts', content, 'utf8');
  console.log("✓ Successfully saved src/data/kbliHistoricalRecords.ts!");
}

exportKbliRecords().catch(console.error);
