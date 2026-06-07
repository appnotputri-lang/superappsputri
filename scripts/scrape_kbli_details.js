const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const COLLECTION_NAME = 'kbli_2025';
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://dpb.unpad.ac.id/wp-json/dpb/v1/kbli2025-detail?kode=';
const ERROR_LOG_FILE = 'errors.json';

/**
 * Initialize Firebase Admin
 * Assumes either GOOGLE_APPLICATION_CREDENTIALS is set 
 * or a serviceAccount.json exists in the current directory.
 */
function initFirebase() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG) {
    admin.initializeApp();
  } else if (fs.existsSync('serviceAccount.json')) {
    const serviceAccount = JSON.parse(fs.readFileSync('serviceAccount.json', 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (fs.existsSync('firebase-applet-config.json')) {
    // Fallback for AI Studio preview environment if project matches
    const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
    admin.initializeApp({
      projectId: config.projectId
    });
  } else {
    console.error('Firebase configuration not found. Please provide serviceAccount.json or set environment variables.');
    process.exit(1);
  }
}

/**
 * Fetch and Parse HTML from API
 */
async function scrapeKbliDetail(kode) {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.get(`${API_BASE_URL}${kode}`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.data || !response.data.success || !response.data.html) {
        throw new Error(`API returned failure for ${kode}`);
      }

      const $ = cheerio.load(response.data.html);
      
      // Helper to extract text by searching for labels
      const extractField = (labelKeywords) => {
        let result = '';
        // Look for common patterns: <td>Label</td><td>Value</td> or <p><strong>Label</strong> Value</p>
        $('strong, b, td, th').each((i, el) => {
          const text = $(el).text().toLowerCase();
          if (labelKeywords.some(kw => text.includes(kw.toLowerCase()))) {
            // Try to find the value in the next sibling or parent's next sibling
            let val = $(el).next().text().trim();
            if (!val || val.length < 2) {
              val = $(el).parent().next().text().trim();
            }
            if (val && val.length > result.length) {
              result = val;
            }
          }
        });
        return result || null;
      };

      // Improved extraction using specific selectors if known, or text-based search
      // Assuming a table-like or definition-list-like structure
      const data = {
        kode: kode,
        judul: extractField(['Judul', 'Nama KBLI']),
        uraian: extractField(['Uraian', 'Keterangan']),
        ruang_lingkup: extractField(['Ruang Lingkup']),
        tingkat_risiko: extractField(['Tingkat Risiko']),
        perizinan_berusaha: extractField(['Perizinan Berusaha', 'Izin Berusaha']),
        skala_usaha: extractField(['Skala Usaha']),
        jangka_waktu: extractField(['Jangka Waktu']),
        kewajiban: extractField(['Kewajiban']),
        kewenangan: extractField(['Kewenangan']),
        ketentuan_khusus: extractField(['Ketentuan Khusus']),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      return data;
    } catch (error) {
      attempt++;
      if (attempt >= MAX_RETRIES) throw error;
      // Exponential backoff
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
}

/**
 * Main Run Logic
 */
async function main() {
  initFirebase();
  const db = admin.firestore();
  
  console.log(`Reading documents from collection: ${COLLECTION_NAME}...`);
  const snapshot = await db.collection(COLLECTION_NAME).get();
  const total = snapshot.size;
  
  if (total === 0) {
    console.log('No documents found in collection. Exiting.');
    return;
  }

  console.log(`Found ${total} documents to process.`);
  
  let processedCount = 0;
  const errors = [];
  const queue = snapshot.docs.map(doc => ({ id: doc.id, code: doc.data().kode }));

  // Process queue with limited concurrency
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        try {
          const detail = await scrapeKbliDetail(item.code);
          await db.collection(COLLECTION_NAME).doc(item.id).update(detail);
          processedCount++;
          console.log(`Processed ${processedCount}/${total} (KODE: ${item.code})`);
        } catch (err) {
          console.error(`Failed to process KODE ${item.code}:`, err.message);
          errors.push({
            kode: item.code,
            docId: item.id,
            error: err.message,
            timestamp: new Date().toISOString()
          });
          // Still increment processedCount to show progress
          processedCount++;
          console.log(`Processed ${processedCount}/${total} (KODE: ${item.code} - FAILED)`);
        }
      }
    })());
  }

  await Promise.all(workers);

  console.log('\n--- Finished ---');
  console.log(`Total Success: ${processedCount - errors.length}`);
  console.log(`Total Errors: ${errors.length}`);

  if (errors.length > 0) {
    fs.writeFileSync(ERROR_LOG_FILE, JSON.stringify(errors, null, 2));
    console.log(`Errors logged to ${ERROR_LOG_FILE}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
