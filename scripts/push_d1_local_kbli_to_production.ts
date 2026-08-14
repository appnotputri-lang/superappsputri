import { getLocalD1Database } from '../src/lib/sqlite-d1';

async function pushKbliToProduction() {
  console.log("=================================================");
  console.log("PUSH DATA KBLI LOCAL SQLITE -> CLOUDFLARE D1 PRODUCTION");
  console.log("=================================================\n");

  const d1 = getLocalD1Database();

  // 1. READ LOCAL DATA
  const localMappingsRows = (await d1.prepare("SELECT * FROM kbli_mapping_records ORDER BY id ASC").all())?.results || [];
  const localSuggestionsRows = (await d1.prepare("SELECT * FROM kbli_suggestion_records ORDER BY id ASC").all())?.results || [];

  const localMappingIds = localMappingsRows.map((r: any) => String(r.id)).sort();
  const localSuggestionIds = localSuggestionsRows.map((r: any) => String(r.id)).sort();

  console.log("LOCAL SQLITE:");
  console.log(`Mapping: ${localMappingIds.length}`);
  console.log(`Suggestion: ${localSuggestionIds.length}\n`);

  if (localMappingIds.length === 0 && localSuggestionIds.length === 0) {
    console.error("ERROR: Tidak ada data KBLI di SQLite lokal.");
    process.exit(1);
  }

  // 2. CHECK PRODUCTION D1 BEFORE PUSH
  let prodMappingBefore: any[] = [];
  let prodSuggestionBefore: any[] = [];

  try {
    const mapBeforeRes = await fetch("https://appsputri.pages.dev/api/kbli/mapping");
    const mapBeforeData: any = await mapBeforeRes.json();
    prodMappingBefore = mapBeforeData.records || mapBeforeData.data || (Array.isArray(mapBeforeData) ? mapBeforeData : []);
  } catch (e) {
    console.error("Error fetching production mapping before:", e);
  }

  try {
    const suggBeforeRes = await fetch("https://appsputri.pages.dev/api/kbli/suggestions");
    const suggBeforeData: any = await suggBeforeRes.json();
    prodSuggestionBefore = suggBeforeData.records || suggBeforeData.data || (Array.isArray(suggBeforeData) ? suggBeforeData : []);
  } catch (e) {
    console.error("Error fetching production suggestion before:", e);
  }

  console.log("PRODUCTION D1 BEFORE:");
  console.log(`Mapping: ${prodMappingBefore.length}`);
  console.log(`Suggestion: ${prodSuggestionBefore.length}\n`);

  // Prepare Payloads using raw_data if available or reconstruct record
  const kbliMappingsPayload = localMappingsRows.map((row: any) => {
    try {
      if (row.raw_data) {
        const parsed = JSON.parse(row.raw_data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {
      id: row.id,
      nama: row.nama,
      kelompok_usaha: row.kelompok_usaha,
      selected_items: row.selected_items,
      selectedItems: row.selected_items ? JSON.parse(row.selected_items) : [],
      updated_at: row.updated_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      createdAt: row.created_at,
      user_id: row.user_id,
      userId: row.user_id
    };
  });

  const kbliSuggestionsPayload = localSuggestionsRows.map((row: any) => {
    try {
      if (row.raw_data) {
        const parsed = JSON.parse(row.raw_data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {
      id: row.id,
      nama: row.nama,
      kelompok_usaha: row.kelompok_usaha,
      selected_items: row.selected_items,
      selectedItems: row.selected_items ? JSON.parse(row.selected_items) : [],
      updated_at: row.updated_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      createdAt: row.created_at,
      user_id: row.user_id,
      userId: row.user_id
    };
  });

  // 3. PUSH DATA TO PRODUCTION API
  console.log("Mengirim payload data ke Production API (/api/migration/d1-import)...");
  const prodImportUrl = "https://appsputri.pages.dev/api/migration/d1-import";
  const importRes = await fetch(prodImportUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-migration-key": "notaris-putri-kbli-migration-2026"
    },
    body: JSON.stringify({
      kbliMappings: kbliMappingsPayload,
      kbliSuggestions: kbliSuggestionsPayload
    })
  });

  const importResponseText = await importRes.text();
  let importJson: any = {};
  try {
    importJson = JSON.parse(importResponseText);
  } catch (e) {
    console.error("Non-JSON Response from migration import:", importResponseText);
  }

  if (importRes.status !== 200 || !importJson.success) {
    console.error("\n❌ MIGRATION FAILED ON POST REQUEST");
    console.error(`HTTP Status: ${importRes.status}`);
    console.error(`Response:`, importJson);
    process.exit(1);
  }

  // 4. VERIFY PRODUCTION DATA AFTER PUSH
  let prodMappingAfter: any[] = [];
  let prodSuggestionAfter: any[] = [];

  const mapAfterRes = await fetch("https://appsputri.pages.dev/api/kbli/mapping");
  const mapAfterData: any = await mapAfterRes.json();
  prodMappingAfter = mapAfterData.records || mapAfterData.data || (Array.isArray(mapAfterData) ? mapAfterData : []);

  const suggAfterRes = await fetch("https://appsputri.pages.dev/api/kbli/suggestions");
  const suggAfterData: any = await suggAfterRes.json();
  prodSuggestionAfter = suggAfterData.records || suggAfterData.data || (Array.isArray(suggAfterData) ? suggAfterData : []);

  console.log("\nPRODUCTION D1 AFTER:");
  console.log(`Mapping: ${prodMappingAfter.length}`);
  console.log(`Suggestion: ${prodSuggestionAfter.length}\n`);

  // 5. VALIDATE IDs MATCHING
  const prodMappingIds = prodMappingAfter.map((r: any) => String(r.id)).sort();
  const prodSuggestionIds = prodSuggestionAfter.map((r: any) => String(r.id)).sort();

  const matchingMapIds = localMappingIds.filter(id => prodMappingIds.includes(id));
  const matchingSuggIds = localSuggestionIds.filter(id => prodSuggestionIds.includes(id));

  console.log("Validation:");
  console.log(`Mapping IDs: ${matchingMapIds.length}/${localMappingIds.length}`);
  console.log(`Suggestion IDs: ${matchingSuggIds.length}/${localSuggestionIds.length}\n`);

  console.log("Firestore Reads: 0\n");

  const isMappingValid = prodMappingAfter.length === localMappingIds.length && matchingMapIds.length === localMappingIds.length;
  const isSuggestionValid = prodSuggestionAfter.length === localSuggestionIds.length && matchingSuggIds.length === localSuggestionIds.length;

  if (isMappingValid && isSuggestionValid) {
    console.log("Status:\n");
    console.log("PRODUCTION VERIFIED");
  } else {
    console.error("Status:\n");
    console.error("MIGRATION FAILED");
    process.exit(1);
  }
}

pushKbliToProduction().catch(console.error);

