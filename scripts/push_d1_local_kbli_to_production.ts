import { getLocalD1Database } from '../src/lib/sqlite-d1';

async function pushKbliToProduction() {
  console.log("=================================================");
  console.log("PUSH DATA HISTORIS KBLI LOKAL KE CLOUDFLARE D1 PRODUCTION");
  console.log("=================================================");

  const d1 = getLocalD1Database();

  console.log("1. Membaca data KBLI dari SQLite lokal (.data/d1_local.sqlite)...");
  
  const localMappings = (await d1.prepare("SELECT * FROM kbli_mapping_records ORDER BY id ASC").all())?.results || [];
  const localSuggestions = (await d1.prepare("SELECT * FROM kbli_suggestion_records ORDER BY id ASC").all())?.results || [];

  console.log(`- Local Mapping records: ${localMappings.length}`);
  console.log(`- Local Suggestion records: ${localSuggestions.length}`);

  if (localMappings.length === 0 && localSuggestions.length === 0) {
    console.error("ERROR: Tidak ada data KBLI di SQLite lokal.");
    process.exit(1);
  }

  // Parse raw_data or reconstruct item objects for the import API
  const kbliMappingsPayload = localMappings.map((row: any) => {
    try {
      if (row.raw_data) return JSON.parse(row.raw_data);
    } catch (e) {}
    return {
      id: row.id,
      nama: row.nama,
      kelompok_usaha: row.kelompok_usaha,
      selectedItems: row.selected_items ? JSON.parse(row.selected_items) : [],
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      userId: row.user_id
    };
  });

  const kbliSuggestionsPayload = localSuggestions.map((row: any) => {
    try {
      if (row.raw_data) return JSON.parse(row.raw_data);
    } catch (e) {}
    return {
      id: row.id,
      nama: row.nama,
      kelompok_usaha: row.kelompok_usaha,
      selectedItems: row.selected_items ? JSON.parse(row.selected_items) : [],
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      userId: row.user_id
    };
  });

  console.log("\n2. Mengirim payload ke Cloudflare D1 Production API (https://appsputri.pages.dev/api/migration/d1-import)...");

  const prodImportUrl = "https://appsputri.pages.dev/api/migration/d1-import";
  const res = await fetch(prodImportUrl, {
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

  const responseText = await res.text();
  console.log(`HTTP Status: ${res.status}`);
  
  let jsonRes: any = {};
  try {
    jsonRes = JSON.parse(responseText);
    console.log("Hasil Respons API Production:", JSON.stringify(jsonRes, null, 2));
  } catch (e) {
    console.log("Raw Response Text:", responseText);
  }

  console.log("\n4. Verifikasi Data via API Endpoint Production KBLI...");
  
  const mappingRes = await fetch("https://appsputri.pages.dev/api/kbli/mapping", {
    headers: { "Authorization": `Bearer ${idToken}` }
  });
  const mappingData: any = await mappingRes.json();
  const prodMappingList = mappingData.data || mappingData.mappings || (Array.isArray(mappingData) ? mappingData : []);
  console.log(`- Live Production /api/kbli/mapping returned: ${Array.isArray(prodMappingList) ? prodMappingList.length : typeof prodMappingList} records`);

  const suggestionRes = await fetch("https://appsputri.pages.dev/api/kbli/suggestions", {
    headers: { "Authorization": `Bearer ${idToken}` }
  });
  const suggestionData: any = await suggestionRes.json();
  const prodSuggestionList = suggestionData.data || suggestionData.suggestions || (Array.isArray(suggestionData) ? suggestionData : []);
  console.log(`- Live Production /api/kbli/suggestions returned: ${Array.isArray(prodSuggestionList) ? prodSuggestionList.length : typeof prodSuggestionList} records`);

  console.log("\n=================================================");
  console.log("STATUS FINAL PUSH PRODUCTION:");
  console.log(`- Mapping: ${localMappings.length} -> Production: ${Array.isArray(prodMappingList) ? prodMappingList.length : 'N/A'}`);
  console.log(`- Suggestion: ${localSuggestions.length} -> Production: ${Array.isArray(prodSuggestionList) ? prodSuggestionList.length : 'N/A'}`);
  console.log("=================================================");
}

pushKbliToProduction().catch(console.error);
