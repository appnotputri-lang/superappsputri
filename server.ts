import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { firestoreRest } from "./src/lib/firestore-rest";
import { DriveFolderService } from "./src/services/DriveFolderService";
import { CompanyService } from "./src/services/CompanyService";
import { driveRest } from "./src/lib/drive-rest";
import { authMiddleware } from "./src/middlewares/auth";
import { ProjectController } from "./src/controllers/ProjectController";
import { DriveController } from "./src/controllers/DriveController";
import { DocumentController } from "./src/controllers/DocumentController";
import { verifyForeignFirebaseIdToken } from "./src/lib/foreignTokenVerify";
import { mintFirebaseCustomToken } from "./src/lib/customTokenSigner";
import { normalizeCompanyName, getUniqueClientKey } from "./src/utils/sanitize";
import { getLocalD1Database } from "./src/lib/sqlite-d1";
import { processD1JsonMigration, ensureD1TablesExist } from "./src/services/d1MigrationService";
import {
  getAllInvoicesD1,
  getInvoiceByIdD1,
  getInvoiceByPublicTokenD1,
  createInvoiceD1,
  updateInvoiceD1,
  deleteInvoiceD1
} from "./src/lib/d1InvoiceRepository";
import {
  getAllKbliMappingD1,
  getKbliMappingByIdD1,
  createKbliMappingD1,
  updateKbliMappingD1,
  deleteKbliMappingD1,
  getAllKbliSuggestionsD1,
  getKbliSuggestionByIdD1,
  createKbliSuggestionD1,
  updateKbliSuggestionD1,
  deleteKbliSuggestionD1
} from "./src/lib/d1KbliRepository";
import {
  getAllGeneralDocumentsD1,
  getGeneralDocumentByIdD1,
  getGeneralDocumentByPublicTokenD1,
  createGeneralDocumentD1,
  updateGeneralDocumentD1,
  deleteGeneralDocumentD1
} from "./src/lib/d1GeneralDocumentRepository";
import {
  getAllDepositNotesD1,
  getDepositNoteByIdD1,
  createDepositNoteD1,
  updateDepositNoteD1,
  deleteDepositNoteD1,
  fetchNextDepositNumberD1
} from "./src/lib/d1DepositNoteRepository";
import {
  getAllDeedsD1,
  getDeedByIdD1,
  createDeedD1,
  updateDeedD1,
  deleteDeedD1,
  fetchLatestDeedNumbersD1
} from "./src/lib/d1DeedRepository";
import {
  getAllPrivateDeedsD1,
  getPrivateDeedByIdD1,
  createPrivateDeedD1,
  updatePrivateDeedD1,
  deletePrivateDeedD1
} from "./src/lib/d1PrivateDeedRepository";
import {
  getAllIncomingMailsD1,
  getIncomingMailByIdD1,
  createIncomingMailD1,
  updateIncomingMailD1,
  deleteIncomingMailD1
} from "./src/lib/d1IncomingMailRepository";
import {
  getAllOutgoingMailsD1,
  getOutgoingMailByIdD1,
  createOutgoingMailD1,
  updateOutgoingMailD1,
  deleteOutgoingMailD1
} from "./src/lib/d1OutgoingMailRepository";
import {
  getAllQuotationsD1,
  getQuotationByIdD1,
  createQuotationD1,
  updateQuotationD1,
  deleteQuotationD1
} from "./src/lib/d1QuotationRepository";
import {
  getAllProductsD1,
  getProductByIdD1,
  createProductD1,
  updateProductD1,
  deleteProductD1
} from "./src/lib/d1ProductRepository";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  console.log("Server starting in REST mode (Cloudflare compatible architecture)...");

  // CORS Middleware to support Cloudflare deployments
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "REST" });
  });

  app.get("/api/d1-test", async (req, res) => {
    try {
      const envDb = (process.env as any).DB;
      let resultVal = 1;
      if (envDb && typeof envDb.prepare === "function") {
        const row: any = await envDb.prepare("SELECT 1 AS ok").first();
        if (row && typeof row.ok !== "undefined") {
          resultVal = Number(row.ok);
        }
      }
      res.json({
        success: true,
        database: "d1",
        result: resultVal,
      });
    } catch (err: any) {
      console.error("[D1 Test API] Server Error:", err);
      res.status(500).json({ success: false, error: err?.message || "D1 query failed" });
    }
  });

  // D1 JSON Migration Endpoint (Invoices, Quotations, Products, KBLI Mappings, KBLI Suggestions)
  app.post("/api/migration/d1-import", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      console.log(`[D1 Migration API] Received migration request: ${payload.invoices?.length || 0} invoices, ${payload.quotations?.length || 0} quotations, ${payload.products?.length || 0} products, ${payload.kbliMappings?.length || 0} KBLI mappings, ${payload.kbliSuggestions?.length || 0} KBLI suggestions.`);
      
      const result = await processD1JsonMigration(db, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[D1 Migration API] Migration failed:", err);
      res.status(500).json({ success: false, error: err?.message || "Migration process failed" });
    }
  });

  // D1 Migration Stats Endpoint
  app.get("/api/migration/d1-stats", async (req, res) => {
    try {
      const db = getLocalD1Database();
      await ensureD1TablesExist(db);
      
      const invoicesCount = (await db.prepare("SELECT count(*) as cnt FROM invoices").first())?.cnt || 0;
      const quotationsCount = (await db.prepare("SELECT count(*) as cnt FROM quotations").first())?.cnt || 0;
      const productsCount = (await db.prepare("SELECT count(*) as cnt FROM products").first())?.cnt || 0;
      const clientsCount = (await db.prepare("SELECT count(*) as cnt FROM client_directory").first())?.cnt || 0;

      res.json({
        success: true,
        counts: {
          invoices: Number(invoicesCount),
          quotations: Number(quotationsCount),
          products: Number(productsCount),
          clients: Number(clientsCount)
        }
      });
    } catch (err: any) {
      console.error("[D1 Stats API] Failed to fetch stats:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch stats" });
    }
  });

  // D1 Clients Endpoint (matching Cloudflare Pages function)
  app.get("/api/clients", async (req, res) => {
    try {
      const db = getLocalD1Database();
      await ensureD1TablesExist(db);

      const limitVal = Math.min(Math.max(1, parseInt(String(req.query.limit || '15'))), 50);
      const offsetVal = Math.max(0, parseInt(String(req.query.offset || '0')));
      const clientType = req.query.clientType ? String(req.query.clientType) : null;
      const archived = req.query.archived ? String(req.query.archived) : null;
      const searchVal = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : null;

      let sql = `SELECT * FROM client_directory`;
      const conditions: string[] = [];
      const params: any[] = [];

      if (clientType) {
        conditions.push(`client_type = ?`);
        params.push(clientType);
      }

      if (archived === 'false') {
        conditions.push(`is_archived = 0`);
      } else if (archived === 'true') {
        conditions.push(`is_archived = 1`);
      }

      if (searchVal) {
        const words = searchVal.trim().toLowerCase().split(/\s+/).filter(Boolean);
        for (const word of words) {
          conditions.push(`(LOWER(company_name) LIKE ? OR LOWER(search_name) LIKE ? OR LOWER(client_type) LIKE ?)`);
          params.push(`%${word}%`, `%${word}%`, `%${word}%`);
        }
      }

      if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(' AND ');
      }

      sql += ` ORDER BY company_name ASC LIMIT ? OFFSET ?`;
      params.push(limitVal, offsetVal);

      const queryRes = await db.prepare(sql).bind(...params).all();
      const rows = queryRes.results || [];

      const formattedRows = rows.map((row: any) => {
        let searchTokens = [];
        try { if (row.search_tokens) searchTokens = JSON.parse(row.search_tokens); } catch (e) {}
        let kbliItems = [];
        try { if (row.kbli_items) kbliItems = JSON.parse(row.kbli_items); } catch (e) {}

        return {
          id: row.id,
          clientId: row.client_id,
          companyName: row.company_name,
          searchName: row.search_name,
          searchTokens,
          clientType: row.client_type,
          companyType: row.company_type,
          domicile: row.domicile,
          establishmentDeedDate: row.establishment_deed_date,
          establishmentYear: row.establishment_year,
          updatedAt: row.updated_at,
          isArchived: row.is_archived === 1,
          npwp: row.npwp,
          kbliItems
        };
      });

      res.json({
        success: true,
        count: formattedRows.length,
        limit: limitVal,
        offset: offsetVal,
        clients: formattedRows
      });
    } catch (err: any) {
      console.error("[Clients D1 API] Query failed:", err);
      res.status(500).json({ success: false, error: err?.message || "Query failed" });
    }
  });

  // D1 Invoices Endpoints
  app.get("/api/invoices", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;

      const result = await getAllInvoicesD1(db, { limit, offset, search, status });
      res.json(result);
    } catch (err: any) {
      console.error("[Invoices D1 API] Error fetching invoices:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/public/:token", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const token = req.params.token;
      if (!token) {
        return res.status(400).json({ success: false, error: "Token is required" });
      }

      const result = await getInvoiceByPublicTokenD1(db, token);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Invoices D1 API] Error fetching invoice by public token:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch invoice" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Invoice ID is required" });
      }

      const result = await getInvoiceByIdD1(db, id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Invoices D1 API] Error fetching invoice by ID:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createInvoiceD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Invoices D1 API] Error creating invoice:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Invoice ID is required" });
      }

      const payload = req.body || {};
      const result = await updateInvoiceD1(db, id, payload);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Invoices D1 API] Error updating invoice:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Invoice ID is required" });
      }

      const result = await deleteInvoiceD1(db, id);
      res.json(result);
    } catch (err: any) {
      console.error("[Invoices D1 API] Error deleting invoice:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to delete invoice" });
    }
  });

  // ==================================================
  // D1 GENERAL DOCUMENTS ENDPOINTS (Surat Jalan & Tanda Terima)
  // ==================================================
  app.get("/api/general-documents", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const limitParam = req.query.limit !== undefined ? String(req.query.limit) : undefined;
      let limit: number | undefined = undefined;
      if (limitParam !== undefined) {
        const lower = limitParam.toLowerCase();
        if (lower === 'all' || lower === '-1' || lower === '0' || lower === 'semua') {
          limit = -1;
        } else {
          const parsed = parseInt(limitParam, 10);
          limit = isNaN(parsed) ? 10 : parsed;
        }
      }
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const type = (req.query.type || req.query.docType) ? String(req.query.type || req.query.docType) : undefined;
      const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
      const order = (String(req.query.order || 'desc')).toLowerCase() as 'asc' | 'desc';

      const result = await getAllGeneralDocumentsD1(db, { limit, offset, search, type, sortBy, order });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[General Documents D1 API] Error fetching documents:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch general documents" });
    }
  });

  app.get("/api/general-documents/public/:token", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const token = req.params.token;
      if (!token) {
        return res.status(400).json({ success: false, error: "Token is required" });
      }

      const document = await getGeneralDocumentByPublicTokenD1(db, token);
      if (!document) {
        return res.status(404).json({ success: false, error: `Public document with token '${token}' not found.` });
      }
      res.json({ success: true, data: document });
    } catch (err: any) {
      console.error("[General Documents D1 API] Error fetching public document by token:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch public document" });
    }
  });

  app.get("/api/general-documents/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Document ID is required" });
      }

      const document = await getGeneralDocumentByIdD1(db, id);
      if (!document) {
        return res.status(404).json({ success: false, error: `General document with ID '${id}' not found.` });
      }
      res.json({ success: true, data: document });
    } catch (err: any) {
      console.error("[General Documents D1 API] Error fetching document by ID:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch document" });
    }
  });

  app.post("/api/general-documents", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createGeneralDocumentD1(db, payload);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      console.error("[General Documents D1 API] Error creating document:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to create document" });
    }
  });

  app.put("/api/general-documents/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Document ID is required" });
      }

      const payload = req.body || {};
      const result = await updateGeneralDocumentD1(db, id, payload);
      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("[General Documents D1 API] Error updating document:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to update document" });
    }
  });

  app.delete("/api/general-documents/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Document ID is required" });
      }

      const result = await deleteGeneralDocumentD1(db, id);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[General Documents D1 API] Error deleting document:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to delete document" });
    }
  });

  // ==================================================
  // D1 DEPOSIT NOTES (PENITIPAN UANG) ENDPOINTS
  // ==================================================
  app.get("/api/deposit-notes", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const search = req.query.search ? String(req.query.search) : undefined;
      const clientId = req.query.clientId ? String(req.query.clientId) : undefined;

      const result = await getAllDepositNotesD1(db, { limit, offset, search, clientId });
      res.json(result);
    } catch (err: any) {
      console.error("[Deposit Notes D1 API] Error fetching deposit notes:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch deposit notes" });
    }
  });

  app.get("/api/deposit-notes/next-number", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
      const result = await fetchNextDepositNumberD1(db, year);
      res.json(result);
    } catch (err: any) {
      console.error("[Deposit Notes D1 API] Error fetching next deposit number:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch next deposit number" });
    }
  });

  app.get("/api/deposit-notes/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Deposit note ID is required" });
      }

      const result = await getDepositNoteByIdD1(db, id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Deposit Notes D1 API] Error fetching deposit note:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch deposit note" });
    }
  });

  app.post("/api/deposit-notes", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createDepositNoteD1(db, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Deposit Notes D1 API] Error creating deposit note:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to create deposit note" });
    }
  });

  app.put("/api/deposit-notes/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Deposit note ID is required" });
      }

      const payload = req.body || {};
      const result = await updateDepositNoteD1(db, id, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Deposit Notes D1 API] Error updating deposit note:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to update deposit note" });
    }
  });

  app.delete("/api/deposit-notes/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Deposit note ID is required" });
      }

      const result = await deleteDepositNoteD1(db, id);
      res.json(result);
    } catch (err: any) {
      console.error("[Deposit Notes D1 API] Error deleting deposit note:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to delete deposit note" });
    }
  });

  // ==================================================
  // D1 DEEDS (BUKU DAFTAR AKTA) ENDPOINTS
  // ==================================================
  app.get("/api/deeds/next-numbers", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const targetDate = (req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10));
      const result = await fetchLatestDeedNumbersD1(db, targetDate);
      res.json(result);
    } catch (err: any) {
      console.error("[Deeds D1 API] Error fetching next deed numbers:", err);
      res.status(500).json({ error: err?.message || "Failed to calculate next deed numbers" });
    }
  });

  app.get("/api/deeds", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
      const month = req.query.month ? parseInt(String(req.query.month), 10) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
      const order = (String(req.query.order || 'desc').toLowerCase()) as 'asc' | 'desc';

      const result = await getAllDeedsD1(db, { year, month, limit, offset, search, sortBy, order });
      res.json(result);
    } catch (err: any) {
      console.error("[Deeds D1 API] Error fetching deeds:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch deeds" });
    }
  });

  app.get("/api/deeds/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const document = await getDeedByIdD1(db, id);
      if (!document) {
        return res.status(404).json({ error: `Deed with ID '${id}' not found.` });
      }
      res.json(document);
    } catch (err: any) {
      console.error("[Deeds D1 API] Error fetching deed by ID:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch deed" });
    }
  });

  app.post("/api/deeds", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createDeedD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Deeds D1 API] Error creating deed:", err);
      res.status(500).json({ error: err?.message || "Failed to create deed" });
    }
  });

  app.put("/api/deeds/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const payload = req.body || {};
      const result = await updateDeedD1(db, id, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Deeds D1 API] Error updating deed:", err);
      res.status(500).json({ error: err?.message || "Failed to update deed" });
    }
  });

  app.delete("/api/deeds/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const result = await deleteDeedD1(db, id);
      res.json({ success: result });
    } catch (err: any) {
      console.error("[Deeds D1 API] Error deleting deed:", err);
      res.status(500).json({ error: err?.message || "Failed to delete deed" });
    }
  });

  // ==================================================
  // D1 PRIVATE DEEDS (BUKU DAFTAR AKTA DI BAWAH TANGAN) ENDPOINTS
  // ==================================================
  app.get("/api/private-deeds", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
      const month = req.query.month ? parseInt(String(req.query.month), 10) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const order = (String(req.query.order || 'desc').toLowerCase()) as 'asc' | 'desc';

      const result = await getAllPrivateDeedsD1(db, { year, month, type, limit, offset, search, order });
      res.json(result);
    } catch (err: any) {
      console.error("[Private Deeds D1 API] Error fetching private deeds:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch private deeds" });
    }
  });

  app.get("/api/private-deeds/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const document = await getPrivateDeedByIdD1(db, id);
      if (!document) {
        return res.status(404).json({ error: `Private deed with ID '${id}' not found.` });
      }
      res.json(document);
    } catch (err: any) {
      console.error("[Private Deeds D1 API] Error fetching private deed by ID:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch private deed" });
    }
  });

  app.post("/api/private-deeds", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createPrivateDeedD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Private Deeds D1 API] Error creating private deed:", err);
      res.status(500).json({ error: err?.message || "Failed to create private deed" });
    }
  });

  app.put("/api/private-deeds/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const payload = req.body || {};
      const result = await updatePrivateDeedD1(db, id, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Private Deeds D1 API] Error updating private deed:", err);
      res.status(500).json({ error: err?.message || "Failed to update private deed" });
    }
  });

  app.delete("/api/private-deeds/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const result = await deletePrivateDeedD1(db, id);
      res.json({ success: result });
    } catch (err: any) {
      console.error("[Private Deeds D1 API] Error deleting private deed:", err);
      res.status(500).json({ error: err?.message || "Failed to delete private deed" });
    }
  });

  // ==================================================
  // D1 INCOMING MAILS (BUKU SURAT MASUK) ENDPOINTS
  // ==================================================
  app.get("/api/incoming-mails", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
      const month = req.query.month ? parseInt(String(req.query.month), 10) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const order = (String(req.query.order || 'desc').toLowerCase()) as 'asc' | 'desc';

      const result = await getAllIncomingMailsD1(db, { year, month, limit, offset, search, order });
      res.json(result);
    } catch (err: any) {
      console.error("[Incoming Mails D1 API] Error fetching incoming mails:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch incoming mails" });
    }
  });

  app.get("/api/incoming-mails/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const document = await getIncomingMailByIdD1(db, id);
      if (!document) {
        return res.status(404).json({ error: `Incoming mail with ID '${id}' not found.` });
      }
      res.json(document);
    } catch (err: any) {
      console.error("[Incoming Mails D1 API] Error fetching incoming mail by ID:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch incoming mail" });
    }
  });

  app.post("/api/incoming-mails", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createIncomingMailD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Incoming Mails D1 API] Error creating incoming mail:", err);
      res.status(500).json({ error: err?.message || "Failed to create incoming mail" });
    }
  });

  app.put("/api/incoming-mails/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const payload = req.body || {};
      const result = await updateIncomingMailD1(db, id, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Incoming Mails D1 API] Error updating incoming mail:", err);
      res.status(500).json({ error: err?.message || "Failed to update incoming mail" });
    }
  });

  app.delete("/api/incoming-mails/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const result = await deleteIncomingMailD1(db, id);
      res.json({ success: result });
    } catch (err: any) {
      console.error("[Incoming Mails D1 API] Error deleting incoming mail:", err);
      res.status(500).json({ error: err?.message || "Failed to delete incoming mail" });
    }
  });

  // ==================================================
  // D1 OUTGOING MAILS (BUKU SURAT KELUAR) ENDPOINTS
  // ==================================================
  app.get("/api/outgoing-mails", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const year = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
      const month = req.query.month ? parseInt(String(req.query.month), 10) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const order = (String(req.query.order || 'desc').toLowerCase()) as 'asc' | 'desc';

      const result = await getAllOutgoingMailsD1(db, { year, month, limit, offset, search, order });
      res.json(result);
    } catch (err: any) {
      console.error("[Outgoing Mails D1 API] Error fetching outgoing mails:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch outgoing mails" });
    }
  });

  app.get("/api/outgoing-mails/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const document = await getOutgoingMailByIdD1(db, id);
      if (!document) {
        return res.status(404).json({ error: `Outgoing mail with ID '${id}' not found.` });
      }
      res.json(document);
    } catch (err: any) {
      console.error("[Outgoing Mails D1 API] Error fetching outgoing mail by ID:", err);
      res.status(500).json({ error: err?.message || "Failed to fetch outgoing mail" });
    }
  });

  app.post("/api/outgoing-mails", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createOutgoingMailD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Outgoing Mails D1 API] Error creating outgoing mail:", err);
      res.status(500).json({ error: err?.message || "Failed to create outgoing mail" });
    }
  });

  app.put("/api/outgoing-mails/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const payload = req.body || {};
      const result = await updateOutgoingMailD1(db, id, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Outgoing Mails D1 API] Error updating outgoing mail:", err);
      res.status(500).json({ error: err?.message || "Failed to update outgoing mail" });
    }
  });

  app.delete("/api/outgoing-mails/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const result = await deleteOutgoingMailD1(db, id);
      res.json({ success: result });
    } catch (err: any) {
      console.error("[Outgoing Mails D1 API] Error deleting outgoing mail:", err);
      res.status(500).json({ error: err?.message || "Failed to delete outgoing mail" });
    }
  });

  // ==================================================
  // D1 QUOTATIONS ENDPOINTS
  // ==================================================
  app.get("/api/quotations", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;

      const result = await getAllQuotationsD1(db, { limit, offset, search, status });
      res.json(result);
    } catch (err: any) {
      console.error("[Quotations D1 API] Error fetching quotations:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const quotation = await getQuotationByIdD1(db, id);
      if (!quotation) {
        return res.status(404).json({ success: false, error: `Quotation with ID '${id}' not found.` });
      }
      res.json({ success: true, quotation });
    } catch (err: any) {
      console.error("[Quotations D1 API] Error fetching quotation by ID:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch quotation" });
    }
  });

  app.post("/api/quotations", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createQuotationD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Quotations D1 API] Error creating quotation:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to create quotation" });
    }
  });

  app.put("/api/quotations/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const payload = req.body || {};
      const result = await updateQuotationD1(db, id, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Quotations D1 API] Error updating quotation:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to update quotation" });
    }
  });

  app.delete("/api/quotations/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const result = await deleteQuotationD1(db, id);
      res.json({ success: result });
    } catch (err: any) {
      console.error("[Quotations D1 API] Error deleting quotation:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to delete quotation" });
    }
  });

  // ==================================================
  // D1 PRODUCTS ENDPOINTS
  // ==================================================
  app.get("/api/products", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;
      const category = req.query.category ? String(req.query.category) : undefined;

      const result = await getAllProductsD1(db, { limit, offset, search, category });
      res.json(result);
    } catch (err: any) {
      console.error("[Products D1 API] Error fetching products:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const product = await getProductByIdD1(db, id);
      if (!product) {
        return res.status(404).json({ success: false, error: `Product with ID '${id}' not found.` });
      }
      res.json({ success: true, product });
    } catch (err: any) {
      console.error("[Products D1 API] Error fetching product by ID:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createProductD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Products D1 API] Error creating product:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const payload = req.body || {};
      const result = await updateProductD1(db, id, payload);
      res.json(result);
    } catch (err: any) {
      console.error("[Products D1 API] Error updating product:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      const result = await deleteProductD1(db, id);
      res.json({ success: result });
    } catch (err: any) {
      console.error("[Products D1 API] Error deleting product:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to delete product" });
    }
  });

  // ==================================================
  // D1 KBLI MAPPING ENDPOINTS
  // ==================================================
  app.get("/api/kbli/mapping", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;

      const result = await getAllKbliMappingD1(db, { limit, offset, search });
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Mapping D1 API] Error fetching mapping records:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch KBLI mapping records" });
    }
  });

  app.get("/api/kbli/mapping/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Record ID is required" });
      }

      const result = await getKbliMappingByIdD1(db, id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Mapping D1 API] Error fetching mapping record by ID:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch KBLI mapping record" });
    }
  });

  app.post("/api/kbli/mapping", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createKbliMappingD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[KBLI Mapping D1 API] Error creating mapping record:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to create KBLI mapping record" });
    }
  });

  app.put("/api/kbli/mapping/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Record ID is required" });
      }

      const payload = req.body || {};
      const result = await updateKbliMappingD1(db, id, payload);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Mapping D1 API] Error updating mapping record:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to update KBLI mapping record" });
    }
  });

  app.delete("/api/kbli/mapping/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Record ID is required" });
      }

      const result = await deleteKbliMappingD1(db, id);
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Mapping D1 API] Error deleting mapping record:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to delete KBLI mapping record" });
    }
  });

  // ==================================================
  // D1 KBLI SUGGESTIONS ENDPOINTS
  // ==================================================
  app.get("/api/kbli/suggestions", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const search = (req.query.search || req.query.q) ? String(req.query.search || req.query.q) : undefined;

      const result = await getAllKbliSuggestionsD1(db, { limit, offset, search });
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Suggestions D1 API] Error fetching suggestion records:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch KBLI suggestion records" });
    }
  });

  app.get("/api/kbli/suggestions/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Record ID is required" });
      }

      const result = await getKbliSuggestionByIdD1(db, id);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Suggestions D1 API] Error fetching suggestion record by ID:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to fetch KBLI suggestion record" });
    }
  });

  app.post("/api/kbli/suggestions", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const payload = req.body || {};
      const result = await createKbliSuggestionD1(db, payload);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[KBLI Suggestions D1 API] Error creating suggestion record:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to create KBLI suggestion record" });
    }
  });

  app.put("/api/kbli/suggestions/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Record ID is required" });
      }

      const payload = req.body || {};
      const result = await updateKbliSuggestionD1(db, id, payload);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Suggestions D1 API] Error updating suggestion record:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to update KBLI suggestion record" });
    }
  });

  app.delete("/api/kbli/suggestions/:id", async (req, res) => {
    try {
      const db = getLocalD1Database();
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: "Record ID is required" });
      }

      const result = await deleteKbliSuggestionD1(db, id);
      res.json(result);
    } catch (err: any) {
      console.error("[KBLI Suggestions D1 API] Error deleting suggestion record:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to delete KBLI suggestion record" });
    }
  });

  const APP2_PROJECT_ID = "notarisputri-cecab";
  const DEFAULT_ALLOWED_EMAILS = [
    "notarisppatputri@gmail.com",
    "rdyndi@gmail.com",
    "appnotputri@gmail.com"
  ];
  const envAllowedEmails = (process.env.ALLOWED_EMAILS || process.env.APP2_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const COMBINED_ALLOWED_EMAILS = Array.from(new Set([...DEFAULT_ALLOWED_EMAILS, ...envAllowedEmails]));
  const DEFAULT_SSO_ORIGINS = [
    "https://notarisputri.web.id",
    "https://app.notarisputri.web.id",
    "https://notarisputri-cecab.web.app",
    "https://notarisputri-cecab.firebaseapp.com",
    "https://appsputri.pages.dev"
  ];
  const envOrigins = (process.env.ALLOWED_SSO_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ALLOWED_SSO_ORIGINS = Array.from(new Set([...DEFAULT_SSO_ORIGINS, ...envOrigins]));

  app.get("/api/sso/debug-self-verify", async (req, res) => {
    try {
      const serviceAccountEmail = process.env.FIREBASE_SA_CLIENT_EMAIL || '';
      const privateKey = process.env.FIREBASE_SA_PRIVATE_KEY || '';

      if (!serviceAccountEmail || !privateKey) {
        return res.status(500).json({ error: 'Env var belum lengkap' });
      }

      // 1. Mint token pakai fungsi yang sama persis dengan /api/sso/exchange
      const testUid = 'debug_test_uid_12345';
      const token = await mintFirebaseCustomToken(testUid, serviceAccountEmail, privateKey);

      const [headerB64, payloadB64, signatureB64] = token.split('.');

      // 2. Decode header & payload untuk inspeksi visual
      const decodeB64url = (s: string) => {
        let base64 = s.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        return Buffer.from(base64, 'base64').toString('utf8');
      };
      const decodedHeader = JSON.parse(decodeB64url(headerB64));
      const decodedPayload = JSON.parse(decodeB64url(payloadB64));

      // 3. Ambil public cert Google untuk service account ini, lalu verifikasi ulang
      //    tanda tangan yang baru dibuat -- ini persis yang dilakukan Firebase Auth
      //    di belakang layar saat menerima custom token.
      const certUrl = `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(serviceAccountEmail)}`;
      const certResp = await fetch(certUrl);
      const certData = await certResp.json() as Record<string, string>;
      const certPem = Object.values(certData)[0]; // ambil sertifikat pertama

      let selfVerifyResult = 'belum dicoba';
      let selfVerifyError = null;

      try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${headerB64}.${payloadB64}`);
        const sigBuffer = Buffer.from(signatureB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        const isValid = verifier.verify(certPem, sigBuffer);
        selfVerifyResult = isValid ? 'VALID - signature cocok dengan public cert' : 'INVALID - signature TIDAK cocok dengan public cert';
      } catch (e: any) {
        selfVerifyError = e.message;
      }

      res.json({
        tokenLength: token.length,
        signatureB64Length: signatureB64.length,
        decodedHeader,
        decodedPayload,
        certFound: !!certPem,
        selfVerifyResult,
        selfVerifyError,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  app.post("/api/sso/exchange", async (req, res) => {
    try {
      const origin = req.headers.origin || "";
      const isAllowedOrigin =
        !origin ||
        ALLOWED_SSO_ORIGINS.includes("*") ||
        ALLOWED_SSO_ORIGINS.includes(origin) ||
        origin.endsWith(".run.app") ||
        origin.endsWith(".web.id") ||
        origin.endsWith(".web.app") ||
        origin.endsWith(".firebaseapp.com") ||
        origin.endsWith(".pages.dev");

      if (!isAllowedOrigin) {
        console.warn(`[SSO Exchange] Origin ditolak: ${origin}`);
        return res.status(403).json({ error: "Origin tidak diizinkan untuk SSO exchange." });
      }
      const { idToken } = req.body || {};
      if (!idToken || typeof idToken !== "string") {
        return res.status(400).json({ error: "idToken wajib diisi." });
      }
      const { email, uid } = await verifyForeignFirebaseIdToken(idToken, APP2_PROJECT_ID);
      const userEmailLower = (email || "").toLowerCase();
      const isEmailAllowed =
        COMBINED_ALLOWED_EMAILS.includes("*") ||
        COMBINED_ALLOWED_EMAILS.includes(userEmailLower);

      if (!isEmailAllowed) {
        console.warn(`[SSO Exchange] Email tidak di allowlist: ${email}`);
        return res.status(403).json({ error: `Email (${email}) tidak terdaftar untuk mengakses superappsputri.` });
      }
      const serviceAccountEmail = process.env.FIREBASE_SA_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_SA_PRIVATE_KEY;
      if (!serviceAccountEmail || !privateKey) {
        console.error("[SSO Exchange] FIREBASE_SA_CLIENT_EMAIL / FIREBASE_SA_PRIVATE_KEY belum di-set di server.");
        return res.status(500).json({ error: "Konfigurasi server SSO belum lengkap (Service Account belum di-set). Hubungi admin." });
      }
      const targetUid = `app2_${uid}`;
      const customToken = await mintFirebaseCustomToken(targetUid, serviceAccountEmail, privateKey);
      return res.json({ customToken });
    } catch (err: any) {
      console.error("[SSO Exchange] Error:", err.message);
      return res.status(401).json({ error: err.message || "Gagal melakukan SSO exchange." });
    }
  });

  app.post("/api/v2/drive/ensure-client-folder", authMiddleware, async (req, res) => {
    try {
      const { clientId, companyName, clientType } = req.body;
      if (!clientId || !companyName) {
        return res.status(400).json({ error: "Missing clientId or companyName" });
      }

      console.log(`[Drive API] Ensuring client folder for: ${companyName} (${clientType || 'PT'})`);
      const companyFolder = await DriveFolderService.ensureCompanyFolder(companyName, clientType || 'PT', process.env);
      
      // Save driveFolderId and driveFolderUrl into the client document
      await firestoreRest.updateDocument('profiles', clientId, {
        clientType: clientType || 'PT',
        driveFolderId: companyFolder.folderId,
        driveFolderUrl: companyFolder.folderUrl
      }, process.env);

      res.json({ success: true, folderId: companyFolder.folderId, folderUrl: companyFolder.folderUrl });
    } catch (error: any) {
      console.error("[Drive API] Error ensuring client folder:", error);
      res.status(500).json({ error: error.message || "Failed to ensure client folder" });
    }
  });

  app.post("/api/v2/drive/rename-client-folder", authMiddleware, async (req, res) => {
    try {
      const { oldCompanyName, newCompanyName, clientType } = req.body;
      if (!oldCompanyName || !newCompanyName) {
        return res.status(400).json({ error: "Missing oldCompanyName or newCompanyName" });
      }

      console.log(`[Drive API] Renaming client folder from: ${oldCompanyName} to ${newCompanyName} (${clientType || 'PT'})`);
      await DriveFolderService.renameCompanyFolder(oldCompanyName, newCompanyName, clientType || 'PT', process.env);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Drive API] Error renaming client folder:", error);
      res.status(500).json({ error: error.message || "Failed to rename client folder" });
    }
  });

  app.post("/api/v2/drive/delete-client-folder", authMiddleware, async (req, res) => {
    try {
      const { clientId, companyName, clientType, driveFolderId: passedFolderId } = req.body;
      if (!clientId) {
        return res.status(400).json({ error: "Missing clientId" });
      }

      console.log(`[Drive API] Request to delete client folder for clientId: ${clientId}, name: ${companyName}`);

      // 1. Fetch client doc from Firestore to get stored folderId and companyName if not passed
      const clientDoc = await firestoreRest.getDocument('profiles', clientId, process.env);
      const targetName = companyName || clientDoc?.companyName;
      const targetType = clientType || clientDoc?.clientType || 'PT';
      let folderIdToDelete = passedFolderId || clientDoc?.driveFolderId;

      let normalized = '';
      if (targetName) {
        normalized = DriveFolderService.normalizeCompanyName(targetName);
      }

      // 2. Check drive_folder_map if folderIdToDelete is still missing
      if (!folderIdToDelete && normalized) {
        const mapDoc = await firestoreRest.getDocument('drive_folder_map', normalized, process.env);
        if (mapDoc && mapDoc.driveFolderId) {
          folderIdToDelete = mapDoc.driveFolderId;
        }
      }

      // 3. Fallback: Search drive directly if still missing
      if (!folderIdToDelete && targetName) {
        try {
          const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_REPORT_FOLDER_ID;
          if (rootFolderId) {
            const companyProfileFolderId = await DriveFolderService.getOrCreateFolderByName("COMPANY PROFILE", rootFolderId, process.env);
            const typeFolderMap: Record<string, string> = {
              'PT': 'PT',
              'CV': 'CV',
              'YAYASAN': 'YAYASAN',
              'PERKUMPULAN': 'PERKUMPULAN',
              'FIRMA': 'PERSEKUTUAN FIRMA',
              'PERDATA': 'PERSEKUTUAN PERDATA',
              'KOPERASI': 'KOPERASI',
              'PMA': 'PMA',
              'PERORANGAN': 'PERORANGAN'
            };
            const typeFolderName = typeFolderMap[targetType] || 'LAINNYA';
            const typeFolderId = await DriveFolderService.getOrCreateFolderByName(typeFolderName, companyProfileFolderId, process.env);
            
            const q = `'${typeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            const allFolders = await driveRest.listFiles(q, 'files(id, name)', 1000, process.env);
            const existing = allFolders.find(f => DriveFolderService.normalizeCompanyName(f.name) === normalized);
            if (existing) {
              folderIdToDelete = existing.id;
            }
          }
        } catch (e: any) {
          console.warn(`[Drive API] Search fallback failed:`, e?.message);
        }
      }

      // 4. Delete the folder from Google Drive
      if (folderIdToDelete) {
        try {
          console.log(`[Drive API] Deleting Google Drive folder ID: ${folderIdToDelete}`);
          await driveRest.deleteFile(folderIdToDelete, process.env);
        } catch (driveErr: any) {
          console.warn(`[Drive API] Could not delete folder ${folderIdToDelete} from Drive:`, driveErr?.message || driveErr);
        }
      } else {
        console.log(`[Drive API] No Drive folder found for client ${targetName || clientId}`);
      }

      // 5. Clean up drive_folder_map Firestore entry
      if (normalized) {
        try {
          await firestoreRest.deleteDocument('drive_folder_map', normalized, process.env);
        } catch (mapErr) {
          // ignore if map doc doesn't exist
        }
      }

      res.json({ success: true, message: "Client folder deleted successfully" });
    } catch (error: any) {
      console.error("[Drive API] Error in delete-client-folder:", error);
      res.status(500).json({ error: error.message || "Failed to delete client folder" });
    }
  });

  app.post("/api/v2/drive/ensure-project-folder", authMiddleware, async (req, res) => {
    try {
      const { project } = req.body;
      if (!project || !project.projectId || !project.clientId) {
        return res.status(400).json({ error: "Missing valid project object" });
      }

      console.log(`[Drive API] Ensuring project folder for project ID: ${project.projectId}`);
      await DriveFolderService.handleNewProject(project, process.env);

      res.json({ success: true, message: "Project folder ensured successfully" });
    } catch (error: any) {
      console.error("[Drive API] Error ensuring project folder:", error);
      res.status(500).json({ error: error.message || "Failed to ensure project folder" });
    }
  });

  app.post("/api/sync-drive-clients", authMiddleware, async (req, res) => {
    try {
      const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_REPORT_FOLDER_ID;
      if (!rootFolderId) {
        return res.status(500).json({ error: "GOOGLE_DRIVE_ROOT_FOLDER_ID or GOOGLE_DRIVE_REPORT_FOLDER_ID is not configured in settings." });
      }

      const clientTypeFilter = req.query.clientType as string;

      console.log(`[Sync Drive Clients] Ensuring COMPANY PROFILE folder exists...`);
      const companyProfileId = await DriveFolderService.getOrCreateFolderByName("COMPANY PROFILE", rootFolderId, process.env);
      
      // 1. List all type folders inside COMPANY PROFILE in one request
      const qTypes = `'${companyProfileId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const typeFolders = await driveRest.listFiles(qTypes, 'files(id, name)', 100, process.env);
      
      const typeFoldersMapping = [
        { folder: 'PT', type: 'PT' },
        { folder: 'CV', type: 'CV' },
        { folder: 'YAYASAN', type: 'YAYASAN' },
        { folder: 'PERKUMPULAN', type: 'PERKUMPULAN' },
        { folder: 'KOPERASI', type: 'KOPERASI' },
        { folder: 'PERSEKUTUAN FIRMA', type: 'FIRMA' },
        { folder: 'PERSEKUTUAN PERDATA', type: 'PERDATA' },
        { folder: 'PMA', type: 'PMA' },
        { folder: 'PERORANGAN', type: 'PERORANGAN' },
        { folder: 'LAINNYA', type: 'LAINNYA' }
      ].filter(m => !clientTypeFilter || m.type === clientTypeFilter);

      let allFolders: any[] = [];
      for (const mapping of typeFoldersMapping) {
        let typeFolderId = typeFolders.find(f => f.name.toUpperCase() === mapping.folder.toUpperCase())?.id;
        
        if (!typeFolderId) {
          console.log(`[Sync Drive Clients] Type folder ${mapping.folder} not found, creating...`);
          typeFolderId = await DriveFolderService.getOrCreateFolderByName(mapping.folder, companyProfileId, process.env);
        }

        if (typeFolderId) {
          const q = `'${typeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
          const folders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, process.env);
          allFolders.push(...folders.map(f => ({ ...f, clientType: mapping.type })));
        }
      }

      console.log(`[Sync Drive Clients] Found total ${allFolders.length} folders across all types.`);

      // Fetch existing clients (profiles collection)
      const { documents: existingProfiles } = await firestoreRest.listDocuments("profiles", 1000, undefined, process.env);
      
      // Duplicate detection using (Type + Normalized Name)
      const existingKeys = new Set(
        existingProfiles.map((p: any) => {
          const name = p.fields?.companyName?.stringValue || p.companyName || "";
          const type = p.fields?.clientType?.stringValue || p.clientType || "PT";
          return getUniqueClientKey(type, name);
        })
      );

      const stripTypePrefix = (name: string, type: string): string => {
        let clean = name.toUpperCase().trim();
        const typePrefixMap: Record<string, string[]> = {
          'PT': ['PT ', 'PT.'],
          'CV': ['CV ', 'CV.'],
          'YAYASAN': ['YAYASAN '],
          'PERKUMPULAN': ['PERKUMPULAN '],
          'KOPERASI': ['KOPERASI '],
          'FIRMA': ['PERSEKUTUAN FIRMA ', 'FIRMA '],
          'PERDATA': ['PERSEKUTUAN PERDATA ', 'PERDATA '],
          'PMA': ['PMA '],
          'PERORANGAN': ['PERORANGAN ']
        };
        const prefixes = typePrefixMap[type] || [];
        for (const p of prefixes) {
          if (clean.startsWith(p)) {
            clean = clean.substring(p.length).trim();
            break;
          }
        }
        return clean;
      };

      let createdCount = 0;
      let existingCount = 0;
      let skippedDuplicateCount = 0;
      let errorCount = 0;
      const createdClients: string[] = [];
      const MAX_CREATION_PER_SYNC = 40; // Limit for dev server

      // Group existing profiles by key at the start of sync to support "Existing client tanpa unique lock"
      const existingProfilesGroups = new Map<string, string[]>();
      for (const p of existingProfiles) {
        const name = p.companyName || "";
        const type = p.clientType || "PT";
        const pKey = getUniqueClientKey(type, name);
        if (!existingProfilesGroups.has(pKey)) {
          existingProfilesGroups.set(pKey, []);
        }
        existingProfilesGroups.get(pKey)!.push(p.id);
      }

      // Iterate through folders and create/sync clients atomically
      for (const folder of allFolders) {
        try {
          const folderName = folder.name.trim();
          const clientType = folder.clientType;
          const cleanCompanyName = stripTypePrefix(folderName, clientType);
          const key = getUniqueClientKey(clientType, cleanCompanyName);

          console.log(`[DriveSync] Processing folder "${folderName}" -> name: "${cleanCompanyName}", type: "${clientType}", uniqueKey: "${key}"`);

          // 1. Check if unique lock already exists
          let existingLock = await firestoreRest.getDocument("client_unique_keys", key, process.env);
          let clientId: string | null = null;

          if (existingLock) {
            clientId = existingLock.clientId;
            console.log(`[DriveSync] uniqueKey "${key}" already locked. lock: EXISTING, clientId: "${clientId}"`);
          } else {
            console.log(`[DriveSync] uniqueKey "${key}" lock: NOT FOUND. Checking existing client without lock...`);
            // Check if client exists in profiles database but has no lock yet
            const matchIds = existingProfilesGroups.get(key) || [];
            if (matchIds.length > 1) {
              console.warn(`[DriveSync] DUPLICATE_CLIENT_REQUIRES_REVIEW for key: "${key}" (${matchIds.join(', ')}). Skipping.`);
              skippedDuplicateCount++;
              continue;
            } else if (matchIds.length === 1) {
              clientId = matchIds[0];
              console.log(`[DriveSync] Existing client found without lock: "${clientId}". Creating atomic lock.`);
              // Claim the lock atomically for this existing client
              const uniqueKeyDoc = {
                clientId: clientId,
                clientType: clientType,
                normalizedName: normalizeCompanyName(cleanCompanyName),
                companyName: cleanCompanyName,
                createdAt: new Date().toISOString()
              };
              const claimResult = await firestoreRest.createDocumentIfMissing("client_unique_keys", key, uniqueKeyDoc, process.env);
              if (claimResult === null) {
                console.log(`[DriveSync] Atomic lock conflict for key: "${key}" while locking existing client. Skipping.`);
                skippedDuplicateCount++;
                continue;
              }
              console.log(`[DriveSync] Successfully locked existing client: "${clientId}" under key: "${key}"`);
            } else {
              // Genuinely brand new client!
              if (createdCount >= MAX_CREATION_PER_SYNC) {
                console.log(`[DriveSync] MAX_CREATION_PER_SYNC (${MAX_CREATION_PER_SYNC}) reached. Skipping new client creation.`);
                continue;
              }

              clientId = crypto.randomUUID();
              console.log(`[DriveSync] Creating new client. Generated UUID: "${clientId}". Attempting atomic lock claim.`);

              const uniqueKeyDoc = {
                clientId: clientId,
                clientType: clientType,
                normalizedName: normalizeCompanyName(cleanCompanyName),
                companyName: cleanCompanyName,
                createdAt: new Date().toISOString()
              };

              // Try to create unique key atomically
              const claimResult = await firestoreRest.createDocumentIfMissing("client_unique_keys", key, uniqueKeyDoc, process.env);

              if (claimResult === null) {
                console.log(`[DriveSync] Atomic lock conflict for key: "${key}". Skipping.`);
                skippedDuplicateCount++;
                continue;
              }

              console.log(`[DriveSync] lock: CLAIMED successfully for key: "${key}" and clientId: "${clientId}"`);

              // Pre-fill only companyName (Nama Perseroan) and basic default values
              const newProfile = {
                id: clientId,
                companyName: cleanCompanyName,
                clientType: clientType,
                companyType: clientType === 'CV' ? 'CV' : 'SWASTA NASIONAL',
                documentType: 'CIRCULAR',
                duration: 'TIDAK TERBATAS',
                status: 'AKTIF',
                isArchived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                updatedBy: (req as any).user?.email || 'System (Drive Sync)'
              };

              // Create directory entry
              const searchTokens = CompanyService.generateSearchTokens(cleanCompanyName);
              const newDirectoryEntry = {
                id: clientId,
                clientId: clientId,
                companyName: cleanCompanyName,
                searchName: cleanCompanyName.toLowerCase(),
                searchTokens: searchTokens,
                clientType: clientType,
                companyType: clientType === 'CV' ? 'CV' : 'SWASTA NASIONAL',
                domicile: '',
                establishmentDeedDate: '',
                establishmentYear: '',
                updatedAt: new Date().toISOString(),
                isArchived: false,
                npwp: '',
                kbliItems: []
              };

              // Create profile and directory atomically (1:1 with safe rollback)
              try {
                console.log(`[DriveSync] Creating profiles/${clientId}...`);
                await firestoreRest.setDocument("profiles", clientId, newProfile, process.env);
                console.log(`[DriveSync] Creating client_directory/${clientId}...`);
                await firestoreRest.setDocument("client_directory", clientId, newDirectoryEntry, process.env);
                
                createdClients.push(`${clientType} ${cleanCompanyName}`);
                createdCount++;
                console.log(`[DriveSync] Client profile and directory created successfully for clientId: "${clientId}"`);
              } catch (err) {
                console.error(`[DriveSync] Failed to write profiles/directory for "${key}" with clientId: "${clientId}". Rolling back lock!`, err);
                // Rollback / release unique lock
                await firestoreRest.deleteDocument("client_unique_keys", key, process.env).catch((rollbackErr) => {
                  console.error(`[DriveSync] CRITICAL: Failed to rollback/delete lock for key: "${key}"`, rollbackErr);
                });
                errorCount++;
                continue;
              }
            }
          }

          if (clientId) {
            // Check and ensure both profile and directory exist (1:1 synchronization & recovery)
            const profileSnap = await firestoreRest.getDocument("profiles", clientId, process.env);
            const directorySnap = await firestoreRest.getDocument("client_directory", clientId, process.env);

            let profileUpdated = false;
            let directoryUpdated = false;

            if (!profileSnap) {
              console.log(`[DriveSync] profiles/${clientId} missing during check. Backfilling...`);
              const backfillProfile = {
                id: clientId,
                companyName: cleanCompanyName,
                clientType: clientType,
                companyType: clientType === 'CV' ? 'CV' : 'SWASTA NASIONAL',
                documentType: 'CIRCULAR',
                duration: 'TIDAK TERBATAS',
                status: 'AKTIF',
                isArchived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                updatedBy: (req as any).user?.email || 'System (Drive Sync)'
              };
              await firestoreRest.setDocument("profiles", clientId, backfillProfile, process.env);
              profileUpdated = true;
            }

            if (!directorySnap) {
              console.log(`[DriveSync] client_directory/${clientId} missing during check. Backfilling...`);
              const searchTokens = CompanyService.generateSearchTokens(cleanCompanyName);
              const backfillDirectory = {
                id: clientId,
                clientId: clientId,
                companyName: cleanCompanyName,
                searchName: cleanCompanyName.toLowerCase(),
                searchTokens: searchTokens,
                clientType: clientType,
                companyType: clientType === 'CV' ? 'CV' : 'SWASTA NASIONAL',
                domicile: '',
                establishmentDeedDate: '',
                establishmentYear: '',
                updatedAt: new Date().toISOString(),
                isArchived: false,
                npwp: '',
                kbliItems: []
              };
              await firestoreRest.setDocument("client_directory", clientId, backfillDirectory, process.env);
              directoryUpdated = true;
            }

            if (profileUpdated || directoryUpdated) {
              console.log(`[DriveSync] 1:1 sync recovery completed for clientId: "${clientId}"`);
            }

            // Since it's an existing client (and now fully synced), record it as existing
            // If it wasn't just created in this request, it counts as existing
            if (!createdClients.includes(`${clientType} ${cleanCompanyName}`)) {
              existingCount++;
            }
          }

        } catch (err: any) {
          console.error(`[DriveSync] Error processing folder:`, err);
          errorCount++;
        }
      }

      res.json({
        success: true,
        totalFoldersCount: allFolders.length,
        createdClients,
        createdCount,
        existingCount,
        skippedDuplicateCount,
        errorCount,
        message: createdCount >= MAX_CREATION_PER_SYNC ? "Limit tercapai. Silakan klik lagi untuk sisa klien." : "Sinkronisasi selesai."
      });

    } catch (error: any) {
      console.error("[Sync Drive Clients] Error matching & syncing clients:", error);
      res.status(500).json({ error: error.message || "Failed to sync drive clients" });
    }
  });

  // V2 Architecture Routes (Phase 1 wiring)
  app.post("/api/v2/projects", authMiddleware, ProjectController.createProject);
  app.get("/api/v2/projects", authMiddleware, ProjectController.listProjects);
  app.get("/api/v2/projects/:id", authMiddleware, ProjectController.getProject);
  
  app.post("/api/v2/drive/ensure-folder", authMiddleware, DriveController.ensureFolder);
  app.get("/api/v2/drive/files", authMiddleware, DriveController.listFiles);
  app.get("/api/v2/drive/list-project-files/:projectId", authMiddleware, DriveController.listProjectFiles);
  app.post("/api/v2/drive/upload-file", authMiddleware, DriveController.uploadFile);
  app.delete("/api/v2/drive/delete-file/:fileId", authMiddleware, DriveController.deleteFile);
  app.post("/api/v2/drive/trash-folder/:folderId", authMiddleware, async (req, res) => {
    try {
      const folderId = String(req.params.folderId || '');
      if (!folderId) return res.status(400).json({ error: "Missing folderId" });
      await driveRest.deleteFile(folderId, process.env);
      res.json({ success: true, message: "Folder deleted from Drive" });
    } catch (err: any) {
      console.warn(`[Drive API] Failed to delete folder ${req.params.folderId}:`, err?.message);
      res.status(500).json({ error: err.message || "Failed to delete folder" });
    }
  });
  
  app.post("/api/v2/documents/upload", authMiddleware, DocumentController.uploadDocument);

  app.post("/api/upload-document", async (req, res) => {
    const { projectId, name, fileName, fileType, base64, uploadedBy } = req.body;

    if (!projectId || !name || !fileName || !fileType || !base64) {
      return res.status(400).json({ error: "Missing required fields: projectId, name, fileName, fileType, base64" });
    }

    try {
      // 1. Get project document from Firestore REST
      const project = await firestoreRest.getDocument("office_projects", projectId, process.env);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // 2. Ensure Google Drive folders exist on-demand
      let driveFolderId = project.metadata?.driveFolderId;
      if (!driveFolderId) {
        console.log(`[Upload API] Project ${projectId} does not have a Google Drive folder. Creating on-demand...`);
        await DriveFolderService.handleNewProject(project, process.env);
        
        // Fetch the updated project to get the newly created driveFolderId
        const updatedProject = await firestoreRest.getDocument("office_projects", projectId, process.env);
        driveFolderId = updatedProject?.metadata?.driveFolderId;
        
        if (!driveFolderId) {
          throw new Error("Failed to ensure Google Drive folder for this project. Please check service account configuration.");
        }
      }

      // 3. Upload file to Google Drive
      console.log(`[Upload API] Uploading ${fileName} (${fileType}) to Google Drive folder: ${driveFolderId}...`);
      const uploadResult = await driveRest.uploadFile(fileName, fileType, driveFolderId, base64, process.env);
      const driveFileUrl = uploadResult.webViewLink;

      if (!driveFileUrl) {
        throw new Error("Google Drive did not return a webViewLink.");
      }

      // 4. Save metadata back to Firestore documents subcollection for this project
      const docId = crypto.randomUUID();
      const now = new Date();
      
      const newDoc = {
        id: docId,
        name: name,
        type: fileName.split('.').pop() || 'other',
        url: driveFileUrl,
        uploadedBy: uploadedBy || "staff_notaris",
        uploadedAt: now.toISOString()
      };

      console.log(`[Upload API] Registering document ${docId} in Firestore...`);
      await firestoreRest.setDocument("office_projects", `${projectId}/documents/${docId}`, newDoc, process.env);

      // 5. Add a timeline entry for auditing
      const timelineId = crypto.randomUUID();
      const timelineDoc = {
        id: timelineId,
        title: "Dokumen Administrasi Diunggah",
        description: `Dokumen "${name}" (${fileName}) berhasil diunggah ke Google Drive.`,
        createdBy: uploadedBy || "staff_notaris",
        createdAt: now.toISOString()
      };
      await firestoreRest.setDocument("office_projects", `${projectId}/timelines/${timelineId}`, timelineDoc, process.env);

      res.json({ success: true, document: newDoc });
    } catch (error: any) {
      console.error("[Upload API] Error uploading document:", error);
      res.status(500).json({ error: error.message || "Failed to upload document" });
    }
  });

  app.post("/api/send-whatsapp", async (req, res) => {
    const { target, message } = req.body;
    let FONNTE_TOKEN = process.env.FONNTE_TOKEN;

    if (!FONNTE_TOKEN) {
      try {
        const doc = await firestoreRest.getDocument('settings', 'whatsapp', process.env);
        if (doc && doc.token && typeof doc.token === 'string' && doc.token.trim()) {
          FONNTE_TOKEN = doc.token.trim();
        }
      } catch (err) {
        console.warn('[Fonnte Server] Gagal baca settings/whatsapp dari Firestore:', err);
      }
    }

    if (!FONNTE_TOKEN) {
      return res.status(500).json({ error: "FONNTE_TOKEN is not configured" });
    }

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target,
          message,
        }),
      });

      const data = await response.json();
      res.json({
        success: data.status === true,
        error: data.status === true ? undefined : (data.reason || data.detail || 'Gagal mengirim pesan.'),
        detail: data.detail,
        id: data.id,
        target: data.target,
        raw: data,
      });
    } catch (error) {
      console.error("WhatsApp Send Error:", error);
      res.status(500).json({ error: "Failed to send WhatsApp message" });
    }
  });

  app.post("/api/whatsapp-status", async (req, res) => {
    const { token: reqToken } = req.body;
    let FONNTE_TOKEN = reqToken;

    if (!FONNTE_TOKEN) {
      FONNTE_TOKEN = process.env.FONNTE_TOKEN;
    }

    if (!FONNTE_TOKEN) {
      try {
        const doc = await firestoreRest.getDocument('settings', 'whatsapp', process.env);
        if (doc && doc.token && typeof doc.token === 'string' && doc.token.trim()) {
          FONNTE_TOKEN = doc.token.trim();
        }
      } catch (err) {
        console.warn('[Fonnte Server] Gagal baca settings/whatsapp dari Firestore:', err);
      }
    }

    if (!FONNTE_TOKEN) {
      return res.status(400).json({ error: "Token Fonnte belum diatur di Pengaturan." });
    }

    try {
      const response = await fetch("https://api.fonnte.com/device", {
        method: "POST",
        headers: {
          Authorization: FONNTE_TOKEN,
        },
      });

      const data = await response.json();
      if (data.status !== true) {
        return res.json({
          connected: false,
          message: data.reason || 'Token tidak valid atau device tidak ditemukan.'
        });
      }

      res.json({
        connected: data.device_status === 'connect',
        device_status: data.device_status,
        message: data.device_status === 'connect'
          ? `Terhubung sebagai ${data.device || data.name}`
          : 'Device terputus, scan ulang QR di dashboard Fonnte.',
      });
    } catch (error) {
      console.error("WhatsApp Status Error:", error);
      res.status(500).json({ error: "Failed to check WhatsApp status" });
    }
  });

  app.post("/api/whatsapp-groups", authMiddleware, async (req, res) => {
    let FONNTE_TOKEN = process.env.FONNTE_TOKEN;

    if (!FONNTE_TOKEN) {
      try {
        const doc = await firestoreRest.getDocument('settings', 'whatsapp', process.env);
        if (doc && doc.token && typeof doc.token === 'string' && doc.token.trim()) {
          FONNTE_TOKEN = doc.token.trim();
        }
      } catch (err) {
        console.warn('[Fonnte Server] Gagal baca settings/whatsapp dari Firestore:', err);
      }
    }

    if (!FONNTE_TOKEN) {
      return res.status(400).json({ error: "Token Fonnte belum diatur di Pengaturan." });
    }

    try {
      const response = await fetch('https://api.fonnte.com/get-whatsapp-group', {
        method: 'POST',
        headers: { Authorization: FONNTE_TOKEN },
      });
      const data = (await response.json()) as any;

      res.json({ 
        groups: data.status ? (data.data || []) : [] 
      });
    } catch (err: any) {
      console.error('[WhatsApp Groups] Error:', err);
      res.status(500).json({ error: 'Gagal menghubungi server Fonnte.' });
    }
  });

  app.post("/api/whatsapp-groups-sync", authMiddleware, async (req, res) => {
    let FONNTE_TOKEN = process.env.FONNTE_TOKEN;

    if (!FONNTE_TOKEN) {
      try {
        const doc = await firestoreRest.getDocument('settings', 'whatsapp', process.env);
        if (doc && doc.token && typeof doc.token === 'string' && doc.token.trim()) {
          FONNTE_TOKEN = doc.token.trim();
        }
      } catch (err) {
        console.warn('[Fonnte Server] Gagal baca settings/whatsapp dari Firestore:', err);
      }
    }

    if (!FONNTE_TOKEN) {
      return res.status(400).json({ error: "Token Fonnte belum diatur di Pengaturan." });
    }

    try {
      const response = await fetch('https://api.fonnte.com/fetch-group', {
        method: 'POST',
        headers: { Authorization: FONNTE_TOKEN },
      });
      const data = (await response.json()) as any;

      res.json({
        success: data.status === true,
        message: data.status === true ? 'Sinkronisasi berhasil.' : (data.detail || 'Sinkronisasi gagal.'),
      });
    } catch (err: any) {
      console.error('[WhatsApp Groups Sync] Error:', err);
      res.status(500).json({ error: 'Gagal menghubungi server Fonnte.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
