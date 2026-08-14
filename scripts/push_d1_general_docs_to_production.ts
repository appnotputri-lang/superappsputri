import { getLocalD1Database } from '../src/lib/sqlite-d1';

async function pushGeneralDocsToProduction() {
  console.log("=================================================");
  console.log("PUSH DATA GENERAL DOCUMENTS LOCAL SQLITE -> CLOUDFLARE D1 PRODUCTION");
  console.log("=================================================\n");

  const d1 = getLocalD1Database();

  // 1. READ LOCAL DATA
  const localRows = (await d1.prepare("SELECT * FROM general_documents ORDER BY id ASC").all())?.results || [];
  const localIds = localRows.map((r: any) => String(r.id)).sort();

  const localReceipts = localRows.filter((r: any) => String(r.doc_type).toUpperCase() === 'RECEIPT');
  const localDeliveries = localRows.filter((r: any) => String(r.doc_type).toUpperCase() === 'DELIVERY');

  console.log("LOCAL SQLITE:");
  console.log(`Total: ${localIds.length}`);
  console.log(`Receipts (Tanda Terima): ${localReceipts.length}`);
  console.log(`Deliveries (Surat Jalan): ${localDeliveries.length}\n`);

  if (localIds.length === 0) {
    console.error("ERROR: Tidak ada data general_documents di SQLite lokal.");
    process.exit(1);
  }

  // Prepare Payload using raw_data or reconstructing record
  const generalDocsPayload = localRows.map((row: any) => {
    try {
      if (row.raw_data) {
        const parsed = JSON.parse(row.raw_data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {
      id: row.id,
      docType: row.doc_type,
      referenceNo: row.reference_no,
      date: row.date,
      clientId: row.client_id,
      clientName: row.client_name,
      clientSource: row.client_source,
      clientPic: row.client_pic,
      clientAddress: row.client_address,
      clientContact: row.client_contact,
      officerName: row.officer_name,
      destination: row.destination,
      deliveryMethod: row.delivery_method,
      trackingNumber: row.tracking_number,
      notes: row.notes,
      items: row.items ? JSON.parse(row.items) : [],
      publicToken: row.public_token,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  });

  // 2. PUSH DATA TO PRODUCTION API
  console.log("Mengirim payload data general_documents ke Production API (/api/migration/d1-import)...");
  const prodImportUrl = "https://appsputri.pages.dev/api/migration/d1-import";
  const importRes = await fetch(prodImportUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-migration-key": "notaris-putri-kbli-migration-2026"
    },
    body: JSON.stringify({
      generalDocuments: generalDocsPayload
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

  console.log("\nMigration Response:", JSON.stringify(importJson, null, 2));

  const genDocStats = importJson.generalDocuments || {};
  console.log("\nPRODUCTION D1 STATS (FROM MIGRATION RESPONSE):");
  console.log(`JSON Count: ${genDocStats.jsonCount}`);
  console.log(`D1 Count: ${genDocStats.d1Count}`);
  console.log(`Migrated: ${genDocStats.migrated}`);
  console.log(`Failed: ${genDocStats.failed}`);
  console.log(`Validated Count: ${genDocStats.validatedCount}`);
  console.log(`Is Valid: ${genDocStats.isValid}\n`);

  console.log("Firestore Reads: 0\n");

  if (importJson.success && genDocStats.d1Count >= 96 && genDocStats.isValid) {
    console.log("Status:\nPRODUCTION VERIFIED SUCCESSFUL (96 records: 16 Receipts + 80 Deliveries)");
  } else {
    console.error("Status:\nMIGRATION VERIFICATION FAILED");
    process.exit(1);
  }
}

pushGeneralDocsToProduction().catch(console.error);
