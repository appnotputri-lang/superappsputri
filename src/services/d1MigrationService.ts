export async function ensureD1TablesExist(db: any) {
  // Invoices table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      client_id TEXT,
      client_name TEXT NOT NULL,
      client_source TEXT DEFAULT 'local',
      client_email TEXT,
      client_phone TEXT,
      client_address TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'IDR',
      project_id TEXT,
      project_title TEXT,
      project_ids TEXT,
      project_titles TEXT,
      quotation_id TEXT,
      quotation_number TEXT,
      language TEXT DEFAULT 'id',
      notes TEXT,
      terms TEXT,
      bank_details TEXT,
      payment_history TEXT,
      public_token TEXT,
      legacy_public_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_client_name ON invoices(client_name);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);`).run();

  // Quotations table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quotation_number TEXT NOT NULL,
      date TEXT NOT NULL,
      valid_until TEXT,
      client_id TEXT,
      client_name TEXT NOT NULL,
      client_address TEXT,
      client_phone TEXT,
      client_email TEXT,
      client_source TEXT DEFAULT 'local',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_rate REAL,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      notes TEXT,
      job_title TEXT,
      public_token TEXT,
      invoice_id TEXT,
      invoice_number TEXT,
      project_id TEXT,
      project_title TEXT,
      project_ids TEXT,
      project_titles TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_client_name ON quotations(client_name);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date);`).run();

  // Products table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      description TEXT,
      is_taxed INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`).run();

  // Client directory table (for completeness)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS client_directory (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      search_name TEXT,
      search_tokens TEXT,
      client_type TEXT,
      company_type TEXT,
      domicile TEXT,
      establishment_deed_date TEXT,
      establishment_year TEXT,
      updated_at TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      npwp TEXT,
      kbli_items TEXT
    );
  `).run();

  // KBLI Mapping Records table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS kbli_mapping_records (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      kelompok_usaha TEXT,
      selected_items TEXT NOT NULL,
      updated_at TEXT,
      user_id TEXT,
      created_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_mapping_nama ON kbli_mapping_records(nama);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_mapping_updated_at ON kbli_mapping_records(updated_at);`).run();

  // KBLI Suggestion Records table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS kbli_suggestion_records (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      kelompok_usaha TEXT,
      selected_items TEXT NOT NULL,
      updated_at TEXT,
      user_id TEXT,
      created_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_suggestion_nama ON kbli_suggestion_records(nama);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_suggestion_updated_at ON kbli_suggestion_records(updated_at);`).run();

  // General Documents table (Surat Jalan & Tanda Terima)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS general_documents (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      reference_no TEXT,
      date TEXT,
      client_id TEXT,
      client_name TEXT,
      client_source TEXT,
      client_pic TEXT,
      client_address TEXT,
      client_contact TEXT,
      officer_name TEXT,
      destination TEXT,
      delivery_method TEXT,
      tracking_number TEXT,
      notes TEXT,
      items TEXT,
      public_token TEXT,
      created_at TEXT,
      updated_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_doc_type ON general_documents(doc_type);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_reference_no ON general_documents(reference_no);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_client_id ON general_documents(client_id);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_date ON general_documents(date);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_public_token ON general_documents(public_token);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_created_at ON general_documents(created_at);`).run();
}

export function selectValidationIndices(totalCount: number): { index: number; type: 'FIRST' | 'RANDOM' | 'LAST' }[] {
  if (totalCount <= 0) return [];
  if (totalCount <= 30) {
    return Array.from({ length: totalCount }, (_, i) => ({
      index: i,
      type: i < 10 ? 'FIRST' : i >= totalCount - 10 ? 'LAST' : 'RANDOM'
    }));
  }

  const first10 = Array.from({ length: 10 }, (_, i) => i);
  const last10 = Array.from({ length: 10 }, (_, i) => totalCount - 10 + i);

  const middlePool = Array.from({ length: totalCount - 20 }, (_, i) => i + 10);
  const random10: number[] = [];
  while (random10.length < 10 && middlePool.length > 0) {
    const r = Math.floor(Math.random() * middlePool.length);
    const [val] = middlePool.splice(r, 1);
    random10.push(val);
  }
  random10.sort((a, b) => a - b);

  return [
    ...first10.map(i => ({ index: i, type: 'FIRST' as const })),
    ...random10.map(i => ({ index: i, type: 'RANDOM' as const })),
    ...last10.map(i => ({ index: i, type: 'LAST' as const }))
  ];
}

export async function processD1JsonMigration(db: any, payload: {
  invoices?: any[];
  quotations?: any[];
  products?: any[];
  kbliMappings?: any[];
  kbliSuggestions?: any[];
  generalDocuments?: any[];
}) {
  const rawInvoices = Array.isArray(payload.invoices) ? payload.invoices : [];
  const rawQuotations = Array.isArray(payload.quotations) ? payload.quotations : [];
  const rawProducts = Array.isArray(payload.products) ? payload.products : [];
  const rawKbliMappings = Array.isArray(payload.kbliMappings) ? payload.kbliMappings : [];
  const rawKbliSuggestions = Array.isArray(payload.kbliSuggestions) ? payload.kbliSuggestions : [];
  const rawGeneralDocuments = Array.isArray(payload.generalDocuments) ? payload.generalDocuments : [];

  await ensureD1TablesExist(db);

  const nowIso = new Date().toISOString();

  // 1. INVOICES UPSERT
  let invoicesMigrated = 0;
  let invoicesFailed = 0;
  const invoiceUpsertSql = `
    INSERT INTO invoices (
      id, invoice_number, client_id, client_name, client_source, client_email, client_phone, client_address,
      issue_date, due_date, status, items, subtotal, tax_amount, tax_rate, discount, total_amount, paid_amount, balance_due,
      currency, project_id, project_title, project_ids, project_titles, quotation_id, quotation_number,
      language, notes, terms, bank_details, payment_history, public_token, legacy_public_url, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      invoice_number=excluded.invoice_number,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      client_source=excluded.client_source,
      client_email=excluded.client_email,
      client_phone=excluded.client_phone,
      client_address=excluded.client_address,
      issue_date=excluded.issue_date,
      due_date=excluded.due_date,
      status=excluded.status,
      items=excluded.items,
      subtotal=excluded.subtotal,
      tax_amount=excluded.tax_amount,
      tax_rate=excluded.tax_rate,
      discount=excluded.discount,
      total_amount=excluded.total_amount,
      paid_amount=excluded.paid_amount,
      balance_due=excluded.balance_due,
      currency=excluded.currency,
      project_id=excluded.project_id,
      project_title=excluded.project_title,
      project_ids=excluded.project_ids,
      project_titles=excluded.project_titles,
      quotation_id=excluded.quotation_id,
      quotation_number=excluded.quotation_number,
      language=excluded.language,
      notes=excluded.notes,
      terms=excluded.terms,
      bank_details=excluded.bank_details,
      payment_history=excluded.payment_history,
      public_token=excluded.public_token,
      legacy_public_url=excluded.legacy_public_url,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  const CHUNK_SIZE = 50;
  for (let i = 0; i < rawInvoices.length; i += CHUNK_SIZE) {
    const chunk = rawInvoices.slice(i, i + CHUNK_SIZE);
    const stmts: any[] = [];

    for (const item of chunk) {
      const id = String(item.id || item._id || crypto.randomUUID());
      const invNum = String(item.invoiceNumber || item.invoice_number || item.number || 'INV-0000');
      const clientName = String(item.clientName || item.client_name || item.companyName || 'Unknown Client');
      const clientId = item.clientId || item.client_id || null;
      const clientSource = String(item.clientSource || item.client_source || 'local');
      const clientEmail = item.clientEmail || item.client_email || null;
      const clientPhone = item.clientPhone || item.client_phone || null;
      const clientAddress = item.clientAddress || item.client_address || null;
      const issueDate = String(item.issueDate || item.issue_date || item.date || nowIso.split('T')[0]);
      const dueDate = item.dueDate || item.due_date || null;
      const status = String(item.status || 'UNPAID').toUpperCase();
      const itemsJson = typeof item.items === 'string' ? item.items : JSON.stringify(item.items || []);
      const subtotal = Number(item.subtotal || 0);
      const taxAmount = Number(item.taxAmount || item.tax_amount || 0);
      const taxRate = typeof item.taxRate !== 'undefined' ? Number(item.taxRate) : (typeof item.tax_rate !== 'undefined' ? Number(item.tax_rate) : null);
      const discount = Number(item.discount || 0);
      const totalAmount = Number(item.totalAmount || item.total_amount || item.total || 0);
      const paidAmount = Number(item.paidAmount || item.paid_amount || 0);
      const balanceDue = Number(item.balanceDue || item.balance_due || (totalAmount - paidAmount));
      const currency = String(item.currency || 'IDR');
      const projectId = item.projectId || item.project_id || null;
      const projectTitle = item.projectTitle || item.project_title || null;
      const projectIds = item.projectIds ? (typeof item.projectIds === 'string' ? item.projectIds : JSON.stringify(item.projectIds)) : null;
      const projectTitles = item.projectTitles ? (typeof item.projectTitles === 'string' ? item.projectTitles : JSON.stringify(item.projectTitles)) : null;
      const quotationId = item.quotationId || item.quotation_id || null;
      const quotationNumber = item.quotationNumber || item.quotation_number || null;
      const language = String(item.language || 'id');
      const notes = item.notes || null;
      const terms = item.terms || null;
      const bankDetails = item.bankDetails ? (typeof item.bankDetails === 'string' ? item.bankDetails : JSON.stringify(item.bankDetails)) : null;
      const paymentHistory = item.paymentHistory ? (typeof item.paymentHistory === 'string' ? item.paymentHistory : JSON.stringify(item.paymentHistory)) : null;
      const publicToken = item.publicToken || item.public_token || null;
      const legacyPublicUrl = item.legacyPublicUrl || item.legacy_public_url || null;
      const createdAt = String(item.createdAt || item.created_at || nowIso);
      const updatedAt = String(item.updatedAt || item.updated_at || nowIso);
      const rawData = JSON.stringify(item);

      stmts.push(db.prepare(invoiceUpsertSql).bind(
        id, invNum, clientId, clientName, clientSource, clientEmail, clientPhone, clientAddress,
        issueDate, dueDate, status, itemsJson, subtotal, taxAmount, taxRate, discount, totalAmount, paidAmount, balanceDue,
        currency, projectId, projectTitle, projectIds, projectTitles, quotationId, quotationNumber,
        language, notes, terms, bankDetails, paymentHistory, publicToken, legacyPublicUrl, createdAt, updatedAt, rawData
      ));
    }

    try {
      await db.batch(stmts);
      invoicesMigrated += chunk.length;
    } catch (err: any) {
      console.error("[D1 Migration] Invoices batch error:", err);
      invoicesFailed += chunk.length;
    }
  }

  // 2. QUOTATIONS UPSERT
  let quotationsMigrated = 0;
  let quotationsFailed = 0;
  const quotationUpsertSql = `
    INSERT INTO quotations (
      id, quotation_number, date, valid_until, client_id, client_name, client_address, client_phone, client_email,
      client_source, items, subtotal, tax_amount, tax_rate, discount, total_amount, status, notes, job_title,
      public_token, invoice_id, invoice_number, project_id, project_title, project_ids, project_titles,
      created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      quotation_number=excluded.quotation_number,
      date=excluded.date,
      valid_until=excluded.valid_until,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      client_address=excluded.client_address,
      client_phone=excluded.client_phone,
      client_email=excluded.client_email,
      client_source=excluded.client_source,
      items=excluded.items,
      subtotal=excluded.subtotal,
      tax_amount=excluded.tax_amount,
      tax_rate=excluded.tax_rate,
      discount=excluded.discount,
      total_amount=excluded.total_amount,
      status=excluded.status,
      notes=excluded.notes,
      job_title=excluded.job_title,
      public_token=excluded.public_token,
      invoice_id=excluded.invoice_id,
      invoice_number=excluded.invoice_number,
      project_id=excluded.project_id,
      project_title=excluded.project_title,
      project_ids=excluded.project_ids,
      project_titles=excluded.project_titles,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawQuotations.length; i += CHUNK_SIZE) {
    const chunk = rawQuotations.slice(i, i + CHUNK_SIZE);
    const stmts: any[] = [];

    for (const item of chunk) {
      const id = String(item.id || item._id || crypto.randomUUID());
      const quoteNum = String(item.quotationNumber || item.quotation_number || item.number || 'QUO-0000');
      const date = String(item.date || item.issueDate || item.issue_date || nowIso.split('T')[0]);
      const validUntil = item.validUntil || item.valid_until || null;
      const clientId = String(item.clientId || item.client_id || '');
      const clientName = String(item.clientName || item.client_name || item.companyName || 'Unknown Client');
      const clientAddress = String(item.clientAddress || item.client_address || '');
      const clientPhone = item.clientPhone || item.client_phone || null;
      const clientEmail = item.clientEmail || item.client_email || null;
      const clientSource = String(item.clientSource || item.client_source || 'local');
      const itemsJson = typeof item.items === 'string' ? item.items : JSON.stringify(item.items || []);
      const subtotal = Number(item.subtotal || 0);
      const taxAmount = Number(item.taxAmount || item.tax_amount || 0);
      const taxRate = typeof item.taxRate !== 'undefined' ? Number(item.taxRate) : (typeof item.tax_rate !== 'undefined' ? Number(item.tax_rate) : null);
      const discount = Number(item.discount || 0);
      const totalAmount = Number(item.totalAmount || item.total_amount || item.total || 0);
      const status = String(item.status || 'DRAFT').toUpperCase();
      const notes = item.notes || null;
      const jobTitle = item.jobTitle || item.job_title || null;
      const publicToken = item.publicToken || item.public_token || null;
      const invoiceId = item.invoiceId || item.invoice_id || null;
      const invoiceNumber = item.invoiceNumber || item.invoice_number || null;
      const projectId = item.projectId || item.project_id || null;
      const projectTitle = item.projectTitle || item.project_title || null;
      const projectIds = item.projectIds ? (typeof item.projectIds === 'string' ? item.projectIds : JSON.stringify(item.projectIds)) : null;
      const projectTitles = item.projectTitles ? (typeof item.projectTitles === 'string' ? item.projectTitles : JSON.stringify(item.projectTitles)) : null;
      const createdAt = String(item.createdAt || item.created_at || nowIso);
      const updatedAt = String(item.updatedAt || item.updated_at || nowIso);
      const rawData = JSON.stringify(item);

      stmts.push(db.prepare(quotationUpsertSql).bind(
        id, quoteNum, date, validUntil, clientId, clientName, clientAddress, clientPhone, clientEmail,
        clientSource, itemsJson, subtotal, taxAmount, taxRate, discount, totalAmount, status, notes, jobTitle,
        publicToken, invoiceId, invoiceNumber, projectId, projectTitle, projectIds, projectTitles,
        createdAt, updatedAt, rawData
      ));
    }

    try {
      await db.batch(stmts);
      quotationsMigrated += chunk.length;
    } catch (err: any) {
      console.error("[D1 Migration] Quotations batch error:", err);
      quotationsFailed += chunk.length;
    }
  }

  // 3. PRODUCTS UPSERT
  let productsMigrated = 0;
  let productsFailed = 0;
  const productUpsertSql = `
    INSERT INTO products (
      id, name, unit_price, description, is_taxed, category, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      unit_price=excluded.unit_price,
      description=excluded.description,
      is_taxed=excluded.is_taxed,
      category=excluded.category,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawProducts.length; i += CHUNK_SIZE) {
    const chunk = rawProducts.slice(i, i + CHUNK_SIZE);
    const stmts: any[] = [];

    for (const item of chunk) {
      const id = String(item.id || item._id || crypto.randomUUID());
      const name = String(item.name || item.productName || item.title || 'Produk Baru');
      const unitPrice = Number(item.unitPrice || item.unit_price || item.price || 0);
      const description = item.description || null;
      const isTaxed = item.isTaxed || item.is_taxed ? 1 : 0;
      const category = item.category || null;
      const createdAt = String(item.createdAt || item.created_at || nowIso);
      const updatedAt = String(item.updatedAt || item.updated_at || nowIso);
      const rawData = JSON.stringify(item);

      stmts.push(db.prepare(productUpsertSql).bind(
        id, name, unitPrice, description, isTaxed, category, createdAt, updatedAt, rawData
      ));
    }

    try {
      await db.batch(stmts);
      productsMigrated += chunk.length;
    } catch (err: any) {
      console.error("[D1 Migration] Products batch error:", err);
      productsFailed += chunk.length;
    }
  }

  // 3.5. KBLI MAPPINGS UPSERT
  let kbliMappingsMigrated = 0;
  let kbliMappingsFailed = 0;
  const kbliMappingUpsertSql = `
    INSERT INTO kbli_mapping_records (
      id, nama, kelompok_usaha, selected_items, updated_at, user_id, created_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      nama=excluded.nama,
      kelompok_usaha=excluded.kelompok_usaha,
      selected_items=excluded.selected_items,
      updated_at=excluded.updated_at,
      user_id=excluded.user_id,
      created_at=excluded.created_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawKbliMappings.length; i += CHUNK_SIZE) {
    const chunk = rawKbliMappings.slice(i, i + CHUNK_SIZE);
    const stmts: any[] = [];

    for (const item of chunk) {
      const id = String(item.id || item._id || crypto.randomUUID());
      const nama = String(item.nama || item.name || item.namaPT || item.nama_pt || 'TANPA NAMA');
      const kelompokUsaha = item.kelompok_usaha || item.kelompokUsaha || null;
      const selectedItemsJson = typeof item.selectedItems === 'string'
        ? item.selectedItems
        : (typeof item.selected_items === 'string'
            ? item.selected_items
            : JSON.stringify(item.selectedItems || item.selected_items || item.selectedMappings || item.selectedKblis || []));
      const updatedAt = String(item.updatedAt || item.updated_at || nowIso);
      const createdAt = String(item.createdAt || item.created_at || nowIso);
      const userId = item.userId || item.user_id || null;
      const rawData = JSON.stringify(item);

      stmts.push(db.prepare(kbliMappingUpsertSql).bind(
        id, nama, kelompokUsaha, selectedItemsJson, updatedAt, userId, createdAt, rawData
      ));
    }

    try {
      await db.batch(stmts);
      kbliMappingsMigrated += chunk.length;
    } catch (err: any) {
      console.error("[Migration] KBLI Mappings batch error:", err);
      kbliMappingsFailed += chunk.length;
    }
  }

  // 3.6. KBLI SUGGESTIONS UPSERT
  let kbliSuggestionsMigrated = 0;
  let kbliSuggestionsFailed = 0;
  const kbliSuggestionUpsertSql = `
    INSERT INTO kbli_suggestion_records (
      id, nama, kelompok_usaha, selected_items, updated_at, user_id, created_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      nama=excluded.nama,
      kelompok_usaha=excluded.kelompok_usaha,
      selected_items=excluded.selected_items,
      updated_at=excluded.updated_at,
      user_id=excluded.user_id,
      created_at=excluded.created_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawKbliSuggestions.length; i += CHUNK_SIZE) {
    const chunk = rawKbliSuggestions.slice(i, i + CHUNK_SIZE);
    const stmts: any[] = [];

    for (const item of chunk) {
      const id = String(item.id || item._id || crypto.randomUUID());
      const nama = String(item.nama || item.name || item.namaPT || item.nama_pt || 'TANPA NAMA');
      const kelompokUsaha = item.kelompok_usaha || item.kelompokUsaha || null;
      const selectedItemsJson = typeof item.selectedItems === 'string'
        ? item.selectedItems
        : (typeof item.selected_items === 'string'
            ? item.selected_items
            : JSON.stringify(item.selectedItems || item.selected_items || item.selectedMappings || item.selectedKblis || []));
      const updatedAt = String(item.updatedAt || item.updated_at || nowIso);
      const createdAt = String(item.createdAt || item.created_at || nowIso);
      const userId = item.userId || item.user_id || null;
      const rawData = JSON.stringify(item);

      stmts.push(db.prepare(kbliSuggestionUpsertSql).bind(
        id, nama, kelompokUsaha, selectedItemsJson, updatedAt, userId, createdAt, rawData
      ));
    }

    try {
      await db.batch(stmts);
      kbliSuggestionsMigrated += chunk.length;
    } catch (err: any) {
      console.error("[Migration] KBLI Suggestions batch error:", err);
      kbliSuggestionsFailed += chunk.length;
    }
  }

  // 3.7. GENERAL DOCUMENTS UPSERT
  let generalDocsMigrated = 0;
  let generalDocsFailed = 0;
  const generalDocUpsertSql = `
    INSERT INTO general_documents (
      id, doc_type, reference_no, date, client_id, client_name, client_source,
      client_pic, client_address, client_contact, officer_name, destination,
      delivery_method, tracking_number, notes, items, public_token, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      doc_type=excluded.doc_type,
      reference_no=excluded.reference_no,
      date=excluded.date,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      client_source=excluded.client_source,
      client_pic=excluded.client_pic,
      client_address=excluded.client_address,
      client_contact=excluded.client_contact,
      officer_name=excluded.officer_name,
      destination=excluded.destination,
      delivery_method=excluded.delivery_method,
      tracking_number=excluded.tracking_number,
      notes=excluded.notes,
      items=excluded.items,
      public_token=excluded.public_token,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawGeneralDocuments.length; i += CHUNK_SIZE) {
    const chunk = rawGeneralDocuments.slice(i, i + CHUNK_SIZE);
    const stmts: any[] = [];

    for (const item of chunk) {
      const id = String(item.id || item._id || crypto.randomUUID());
      const docType = String(item.docType || item.doc_type || 'RECEIPT').toUpperCase();
      const referenceNo = String(item.referenceNo || item.reference_no || '');
      const date = String(item.date || nowIso.split('T')[0]);
      const clientId = item.clientId || item.client_id || '';
      const clientName = String(item.clientName || item.client_name || '');
      const clientSource = String(item.clientSource || item.client_source || 'local');
      const clientPic = item.clientPic || item.client_pic || '';
      const clientAddress = item.clientAddress || item.client_address || '';
      const clientContact = item.clientContact || item.client_contact || '';
      const officerName = String(item.officerName || item.officer_name || '');
      const destination = item.destination || '';
      const deliveryMethod = item.deliveryMethod || item.delivery_method || '';
      const trackingNumber = item.trackingNumber || item.tracking_number || '';
      const notes = item.notes || '';
      const itemsJson = typeof item.items === 'string' ? item.items : JSON.stringify(item.items || []);
      const publicToken = item.publicToken || item.public_token || '';
      const createdAt = String(item.createdAt || item.created_at || nowIso);
      const updatedAt = String(item.updatedAt || item.updated_at || nowIso);
      const rawData = JSON.stringify(item);

      stmts.push(db.prepare(generalDocUpsertSql).bind(
        id, docType, referenceNo, date, clientId, clientName, clientSource,
        clientPic, clientAddress, clientContact, officerName, destination,
        deliveryMethod, trackingNumber, notes, itemsJson, publicToken, createdAt, updatedAt, rawData
      ));
    }

    try {
      await db.batch(stmts);
      generalDocsMigrated += chunk.length;
    } catch (err: any) {
      console.error("[Migration] General Documents batch error:", err);
      generalDocsFailed += chunk.length;
    }
  }

  // 4. QUERY COUNTS & PERFORM COMPARISONS
  const d1InvoicesCountRes = await db.prepare("SELECT count(*) as cnt FROM invoices").first();
  const d1InvoicesCount = Number(d1InvoicesCountRes?.cnt || 0);

  const d1QuotationsCountRes = await db.prepare("SELECT count(*) as cnt FROM quotations").first();
  const d1QuotationsCount = Number(d1QuotationsCountRes?.cnt || 0);

  const d1ProductsCountRes = await db.prepare("SELECT count(*) as cnt FROM products").first();
  const d1ProductsCount = Number(d1ProductsCountRes?.cnt || 0);

  const d1KbliMappingsCountRes = await db.prepare("SELECT count(*) as cnt FROM kbli_mapping_records").first();
  const d1KbliMappingsCount = Number(d1KbliMappingsCountRes?.cnt || 0);

  const d1KbliSuggestionsCountRes = await db.prepare("SELECT count(*) as cnt FROM kbli_suggestion_records").first();
  const d1KbliSuggestionsCount = Number(d1KbliSuggestionsCountRes?.cnt || 0);

  const d1GeneralDocsCountRes = await db.prepare("SELECT count(*) as cnt FROM general_documents").first();
  const d1GeneralDocsCount = Number(d1GeneralDocsCountRes?.cnt || 0);

  const d1InvoicesAll = (await db.prepare("SELECT * FROM invoices ORDER BY id ASC").all())?.results || [];
  const d1QuotationsAll = (await db.prepare("SELECT * FROM quotations ORDER BY id ASC").all())?.results || [];
  const d1ProductsAll = (await db.prepare("SELECT * FROM products ORDER BY id ASC").all())?.results || [];
  const d1KbliMappingsAll = (await db.prepare("SELECT * FROM kbli_mapping_records ORDER BY id ASC").all())?.results || [];
  const d1KbliSuggestionsAll = (await db.prepare("SELECT * FROM kbli_suggestion_records ORDER BY id ASC").all())?.results || [];
  const d1GeneralDocsAll = (await db.prepare("SELECT * FROM general_documents ORDER BY id ASC").all())?.results || [];

  const sortedJsonInvoices = [...rawInvoices].sort((a, b) => String(a.id || a._id).localeCompare(String(b.id || b._id)));
  const sortedJsonQuotations = [...rawQuotations].sort((a, b) => String(a.id || a._id).localeCompare(String(b.id || b._id)));
  const sortedJsonProducts = [...rawProducts].sort((a, b) => String(a.id || a._id).localeCompare(String(b.id || b._id)));
  const sortedJsonKbliMappings = [...rawKbliMappings].sort((a, b) => String(a.id || a._id).localeCompare(String(b.id || b._id)));
  const sortedJsonKbliSuggestions = [...rawKbliSuggestions].sort((a, b) => String(a.id || a._id).localeCompare(String(b.id || b._id)));
  const sortedJsonGeneralDocs = [...rawGeneralDocuments].sort((a, b) => String(a.id || a._id).localeCompare(String(b.id || b._id)));

  // --- Invoices Validation ---
  const invSamples = selectValidationIndices(sortedJsonInvoices.length);
  const invoiceComparisons = invSamples.map(({ index, type }) => {
    const jItem = sortedJsonInvoices[index];
    const jId = String(jItem.id || jItem._id);
    const dRow = d1InvoicesAll.find((r: any) => r.id === jId);

    if (!dRow) {
      return { index, type, id: jId, match: false, reason: "Row not found in D1", mismatches: [{ field: 'id', json: jId, d1: 'MISSING' }] };
    }

    const diffs: any[] = [];
    const checkField = (field: string, jVal: any, dVal: any) => {
      if (String(jVal ?? '') !== String(dVal ?? '')) {
        diffs.push({ field, json: jVal, d1: dVal });
      }
    };

    checkField('invoiceNumber', jItem.invoiceNumber || jItem.invoice_number, dRow.invoice_number);
    checkField('clientName', jItem.clientName || jItem.client_name, dRow.client_name);
    checkField('totalAmount', Number(jItem.totalAmount || jItem.total_amount || 0), Number(dRow.total_amount));
    checkField('status', String(jItem.status || 'UNPAID').toUpperCase(), String(dRow.status).toUpperCase());

    return {
      index,
      type,
      id: jId,
      match: diffs.length === 0,
      mismatches: diffs
    };
  });

  // --- Quotations Validation ---
  const quoSamples = selectValidationIndices(sortedJsonQuotations.length);
  const quotationComparisons = quoSamples.map(({ index, type }) => {
    const jItem = sortedJsonQuotations[index];
    const jId = String(jItem.id || jItem._id);
    const dRow = d1QuotationsAll.find((r: any) => r.id === jId);

    if (!dRow) {
      return { index, type, id: jId, match: false, reason: "Row not found in D1", mismatches: [{ field: 'id', json: jId, d1: 'MISSING' }] };
    }

    const diffs: any[] = [];
    const checkField = (field: string, jVal: any, dVal: any) => {
      if (String(jVal ?? '') !== String(dVal ?? '')) {
        diffs.push({ field, json: jVal, d1: dVal });
      }
    };

    checkField('quotationNumber', jItem.quotationNumber || jItem.quotation_number, dRow.quotation_number);
    checkField('clientName', jItem.clientName || jItem.client_name, dRow.client_name);
    checkField('totalAmount', Number(jItem.totalAmount || jItem.total_amount || 0), Number(dRow.total_amount));
    checkField('status', String(jItem.status || 'DRAFT').toUpperCase(), String(dRow.status).toUpperCase());

    return {
      index,
      type,
      id: jId,
      match: diffs.length === 0,
      mismatches: diffs
    };
  });

  // --- Products Validation ---
  const prodSamples = selectValidationIndices(sortedJsonProducts.length);
  const productComparisons = prodSamples.map(({ index, type }) => {
    const jItem = sortedJsonProducts[index];
    const jId = String(jItem.id || jItem._id);
    const dRow = d1ProductsAll.find((r: any) => r.id === jId);

    if (!dRow) {
      return { index, type, id: jId, match: false, reason: "Row not found in D1", mismatches: [{ field: 'id', json: jId, d1: 'MISSING' }] };
    }

    const diffs: any[] = [];
    const checkField = (field: string, jVal: any, dVal: any) => {
      if (String(jVal ?? '') !== String(dVal ?? '')) {
        diffs.push({ field, json: jVal, d1: dVal });
      }
    };

    checkField('name', jItem.name || jItem.productName, dRow.name);
    checkField('unitPrice', Number(jItem.unitPrice || jItem.unit_price || 0), Number(dRow.unit_price));

    return {
      index,
      type,
      id: jId,
      match: diffs.length === 0,
      mismatches: diffs
    };
  });

  // --- KBLI Mappings Validation ---
  const kbliMapSamples = selectValidationIndices(sortedJsonKbliMappings.length);
  const kbliMappingComparisons = kbliMapSamples.map(({ index, type }) => {
    const jItem = sortedJsonKbliMappings[index];
    const jId = String(jItem.id || jItem._id);
    const dRow = d1KbliMappingsAll.find((r: any) => r.id === jId);

    if (!dRow) {
      return { index, type, id: jId, match: false, reason: "Row not found in D1", mismatches: [{ field: 'id', json: jId, d1: 'MISSING' }] };
    }

    const diffs: any[] = [];
    const checkField = (field: string, jVal: any, dVal: any) => {
      if (String(jVal ?? '') !== String(dVal ?? '')) {
        diffs.push({ field, json: jVal, d1: dVal });
      }
    };

    checkField('nama', String(jItem.nama || jItem.name || jItem.namaPT || '').trim().toUpperCase(), String(dRow.nama || '').trim().toUpperCase());

    return {
      index,
      type,
      id: jId,
      match: diffs.length === 0,
      mismatches: diffs
    };
  });

  // --- KBLI Suggestions Validation ---
  const kbliSuggSamples = selectValidationIndices(sortedJsonKbliSuggestions.length);
  const kbliSuggestionComparisons = kbliSuggSamples.map(({ index, type }) => {
    const jItem = sortedJsonKbliSuggestions[index];
    const jId = String(jItem.id || jItem._id);
    const dRow = d1KbliSuggestionsAll.find((r: any) => r.id === jId);

    if (!dRow) {
      return { index, type, id: jId, match: false, reason: "Row not found in D1", mismatches: [{ field: 'id', json: jId, d1: 'MISSING' }] };
    }

    const diffs: any[] = [];
    const checkField = (field: string, jVal: any, dVal: any) => {
      if (String(jVal ?? '') !== String(dVal ?? '')) {
        diffs.push({ field, json: jVal, d1: dVal });
      }
    };

    checkField('nama', String(jItem.nama || jItem.name || jItem.namaPT || '').trim().toUpperCase(), String(dRow.nama || '').trim().toUpperCase());

    return {
      index,
      type,
      id: jId,
      match: diffs.length === 0,
      mismatches: diffs
    };
  });

  // --- General Documents Validation ---
  const genDocSamples = selectValidationIndices(sortedJsonGeneralDocs.length);
  const generalDocComparisons = genDocSamples.map(({ index, type }) => {
    const jItem = sortedJsonGeneralDocs[index];
    const jId = String(jItem.id || jItem._id);
    const dRow = d1GeneralDocsAll.find((r: any) => r.id === jId);

    if (!dRow) {
      return { index, type, id: jId, match: false, reason: "Row not found in D1", mismatches: [{ field: 'id', json: jId, d1: 'MISSING' }] };
    }

    const diffs: any[] = [];
    const checkField = (field: string, jVal: any, dVal: any) => {
      if (String(jVal ?? '') !== String(dVal ?? '')) {
        diffs.push({ field, json: jVal, d1: dVal });
      }
    };

    checkField('referenceNo', jItem.referenceNo || jItem.reference_no, dRow.reference_no);
    checkField('docType', String(jItem.docType || jItem.doc_type || 'RECEIPT').toUpperCase(), String(dRow.doc_type).toUpperCase());

    return {
      index,
      type,
      id: jId,
      match: diffs.length === 0,
      mismatches: diffs
    };
  });

  const invoicesValidated = invoiceComparisons.filter(c => c.match).length;
  const quotationsValidated = quotationComparisons.filter(c => c.match).length;
  const productsValidated = productComparisons.filter(c => c.match).length;
  const kbliMappingsValidated = kbliMappingComparisons.filter(c => c.match).length;
  const kbliSuggestionsValidated = kbliSuggestionComparisons.filter(c => c.match).length;
  const generalDocsValidated = generalDocComparisons.filter(c => c.match).length;

  const invoicesValid = (rawInvoices.length === 0 || invoicesValidated === invoiceComparisons.length) && (rawInvoices.length <= d1InvoicesCount);
  const quotationsValid = (rawQuotations.length === 0 || quotationsValidated === quotationComparisons.length) && (rawQuotations.length <= d1QuotationsCount);
  const productsValid = (rawProducts.length === 0 || productsValidated === productComparisons.length) && (rawProducts.length <= d1ProductsCount);
  const kbliMappingsValid = (rawKbliMappings.length === 0 || kbliMappingsValidated === kbliMappingComparisons.length) && (rawKbliMappings.length <= d1KbliMappingsCount);
  const kbliSuggestionsValid = (rawKbliSuggestions.length === 0 || kbliSuggestionsValidated === kbliSuggestionComparisons.length) && (rawKbliSuggestions.length <= d1KbliSuggestionsCount);
  const generalDocsValid = (rawGeneralDocuments.length === 0 || generalDocsValidated === generalDocComparisons.length) && (rawGeneralDocuments.length <= d1GeneralDocsCount);

  const isAllSuccessful = invoicesValid && quotationsValid && productsValid && kbliMappingsValid && kbliSuggestionsValid && generalDocsValid &&
    (invoicesFailed === 0 && quotationsFailed === 0 && productsFailed === 0 && kbliMappingsFailed === 0 && kbliSuggestionsFailed === 0 && generalDocsFailed === 0);

  return {
    success: isAllSuccessful,
    firestoreReadCount: 0, // Zero Firestore Read Guarantee!
    invoices: {
      jsonCount: rawInvoices.length,
      d1Count: d1InvoicesCount,
      migrated: invoicesMigrated,
      failed: invoicesFailed,
      validatedCount: `${invoicesValidated} / ${invoiceComparisons.length} samples (${invoiceComparisons.length} checked: 10 First, 10 Random, 10 Last)`,
      isValid: invoicesValid,
      samples: invoiceComparisons
    },
    quotations: {
      jsonCount: rawQuotations.length,
      d1Count: d1QuotationsCount,
      migrated: quotationsMigrated,
      failed: quotationsFailed,
      validatedCount: `${quotationsValidated} / ${quotationComparisons.length} samples (${quotationComparisons.length} checked: 10 First, 10 Random, 10 Last)`,
      isValid: quotationsValid,
      samples: quotationComparisons
    },
    products: {
      jsonCount: rawProducts.length,
      d1Count: d1ProductsCount,
      migrated: productsMigrated,
      failed: productsFailed,
      validatedCount: `${productsValidated} / ${productComparisons.length} samples (${productComparisons.length} checked: 10 First, 10 Random, 10 Last)`,
      isValid: productsValid,
      samples: productComparisons
    },
    kbliMappings: {
      jsonCount: rawKbliMappings.length,
      d1Count: d1KbliMappingsCount,
      migrated: kbliMappingsMigrated,
      failed: kbliMappingsFailed,
      validatedCount: `${kbliMappingsValidated} / ${kbliMappingComparisons.length} samples`,
      isValid: kbliMappingsValid,
      samples: kbliMappingComparisons
    },
    kbliSuggestions: {
      jsonCount: rawKbliSuggestions.length,
      d1Count: d1KbliSuggestionsCount,
      migrated: kbliSuggestionsMigrated,
      failed: kbliSuggestionsFailed,
      validatedCount: `${kbliSuggestionsValidated} / ${kbliSuggestionComparisons.length} samples`,
      isValid: kbliSuggestionsValid,
      samples: kbliSuggestionComparisons
    },
    generalDocuments: {
      jsonCount: rawGeneralDocuments.length,
      d1Count: d1GeneralDocsCount,
      migrated: generalDocsMigrated,
      failed: generalDocsFailed,
      validatedCount: `${generalDocsValidated} / ${generalDocComparisons.length} samples`,
      isValid: generalDocsValid,
      samples: generalDocComparisons
    }
  };
}
