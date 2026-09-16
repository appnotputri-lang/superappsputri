import { getLocalD1Database } from '../src/lib/sqlite-d1';
import { createKbliMappingD1, createKbliSuggestionD1 } from '../src/lib/d1KbliRepository';

export async function pullProductionD1Data() {
  console.log("=================================================");
  console.log("PULL DATA CLOUDFLARE D1 PRODUCTION -> STUDIO AI LOCAL SQLITE");
  console.log("=================================================\n");

  const db = getLocalD1Database();

  // 1. PULL MAPPING
  try {
    const res = await fetch("https://appsputri.pages.dev/api/kbli/mapping?limit=1000");
    const data: any = await res.json();
    const records = data.records || [];
    console.log(`Ditemukan ${records.length} data Pemetaan KBLI dari production.`);

    let imported = 0;
    for (const item of records) {
      await createKbliMappingD1(db, item);
      imported++;
    }
    console.log(`Berhasil mengimpor ${imported} data Pemetaan KBLI ke SQLite lokal.`);
  } catch (err) {
    console.error("Gagal menarik data Pemetaan KBLI:", err);
  }

  // 2. PULL SUGGESTIONS
  try {
    const res = await fetch("https://appsputri.pages.dev/api/kbli/suggestions?limit=1000");
    const data: any = await res.json();
    const records = data.records || [];
    console.log(`Ditemukan ${records.length} data Saran KBLI dari production.`);

    let imported = 0;
    for (const item of records) {
      await createKbliSuggestionD1(db, item);
      imported++;
    }
    console.log(`Berhasil mengimpor ${imported} data Saran KBLI ke SQLite lokal.`);
  } catch (err) {
    console.error("Gagal menarik data Saran KBLI:", err);
  }

  console.log("\nSinkronisasi selesai!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  pullProductionD1Data().then(() => process.exit(0)).catch(err => {
    console.error("Error during sync:", err);
    process.exit(1);
  });
}
