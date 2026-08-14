import { Invoice, PaymentRecord } from '../../types';

export function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => chars[b % chars.length]).join('');
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function mapRowToInvoice(row: any): Invoice {
  if (!row) return row;

  let rawObj: any = {};
  if (row.raw_data) {
    try {
      rawObj = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
    } catch (e) {
      rawObj = {};
    }
  }

  let items = [];
  try {
    items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
  } catch (e) {
    items = rawObj.items || [];
  }

  let projectIds = undefined;
  try {
    if (row.project_ids) {
      projectIds = typeof row.project_ids === 'string' ? JSON.parse(row.project_ids) : row.project_ids;
    }
  } catch (e) {}
  if (!projectIds && rawObj.projectIds) projectIds = rawObj.projectIds;

  let projectTitles = undefined;
  try {
    if (row.project_titles) {
      projectTitles = typeof row.project_titles === 'string' ? JSON.parse(row.project_titles) : row.project_titles;
    }
  } catch (e) {}
  if (!projectTitles && rawObj.projectTitles) projectTitles = rawObj.projectTitles;

  let bankDetails = undefined;
  try {
    if (row.bank_details) {
      bankDetails = typeof row.bank_details === 'string' ? JSON.parse(row.bank_details) : row.bank_details;
    }
  } catch (e) {}
  if (!bankDetails && rawObj.bankDetails) bankDetails = rawObj.bankDetails;

  let paymentHistory: PaymentRecord[] = [];
  try {
    if (row.payment_history) {
      paymentHistory = typeof row.payment_history === 'string' ? JSON.parse(row.payment_history) : row.payment_history;
    }
  } catch (e) {}
  if ((!paymentHistory || paymentHistory.length === 0) && Array.isArray(rawObj.paymentHistory)) {
    paymentHistory = rawObj.paymentHistory;
  }

  const invoice: Invoice = {
    ...rawObj,
    id: row.id,
    invoiceNumber: row.invoice_number || rawObj.invoiceNumber || '',
    clientId: row.client_id || rawObj.clientId || undefined,
    clientName: row.client_name || rawObj.clientName || '',
    clientSource: (row.client_source || rawObj.clientSource || 'local') as 'local' | 'superapps',
    clientEmail: row.client_email || rawObj.clientEmail || undefined,
    clientPhone: row.client_phone || rawObj.clientPhone || undefined,
    clientAddress: row.client_address || rawObj.clientAddress || undefined,
    issueDate: row.issue_date || rawObj.issueDate || '',
    dueDate: row.due_date || rawObj.dueDate || undefined,
    status: (row.status || rawObj.status || 'UNPAID') as any,
    items,
    subtotal: Number(row.subtotal !== undefined && row.subtotal !== null ? row.subtotal : (rawObj.subtotal || 0)),
    taxAmount: Number(row.tax_amount !== undefined && row.tax_amount !== null ? row.tax_amount : (rawObj.taxAmount || 0)),
    taxRate: row.tax_rate !== null && row.tax_rate !== undefined ? Number(row.tax_rate) : rawObj.taxRate,
    discount: row.discount !== null && row.discount !== undefined ? Number(row.discount) : rawObj.discount,
    totalAmount: Number(row.total_amount !== undefined && row.total_amount !== null ? row.total_amount : (rawObj.totalAmount || 0)),
    paidAmount: Number(row.paid_amount !== undefined && row.paid_amount !== null ? row.paid_amount : (rawObj.paidAmount || 0)),
    balanceDue: Number(row.balance_due !== undefined && row.balance_due !== null ? row.balance_due : (rawObj.balanceDue || 0)),
    currency: row.currency || rawObj.currency || 'IDR',
    projectId: row.project_id || rawObj.projectId || undefined,
    projectTitle: row.project_title || rawObj.projectTitle || undefined,
    projectIds,
    projectTitles,
    language: (row.language || rawObj.language || 'id') as any,
    notes: row.notes || rawObj.notes || undefined,
    terms: row.terms || rawObj.terms || undefined,
    bankDetails,
    paymentHistory: Array.isArray(paymentHistory) ? paymentHistory : [],
    publicToken: row.public_token || rawObj.publicToken || undefined,
    legacyPublicUrl: row.legacy_public_url || rawObj.legacyPublicUrl || undefined,
    quotationId: row.quotation_id || rawObj.quotationId || undefined,
    quotationNumber: row.quotation_number || rawObj.quotationNumber || undefined,
    createdAt: row.created_at || rawObj.createdAt || undefined,
    updatedAt: row.updated_at || rawObj.updatedAt || undefined
  };

  return invoice;
}

export function mapInvoiceToRow(invoice: Partial<Invoice> & { id: string }): Record<string, any> {
  const now = new Date().toISOString();
  const balance = invoice.balanceDue !== undefined 
    ? invoice.balanceDue 
    : Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));

  return {
    id: invoice.id,
    invoice_number: invoice.invoiceNumber || '',
    client_id: invoice.clientId || null,
    client_name: invoice.clientName || '',
    client_source: invoice.clientSource || 'local',
    client_email: invoice.clientEmail || null,
    client_phone: invoice.clientPhone || null,
    client_address: invoice.clientAddress || null,
    issue_date: invoice.issueDate || now.split('T')[0],
    due_date: invoice.dueDate || null,
    status: invoice.status || 'UNPAID',
    items: JSON.stringify(invoice.items || []),
    subtotal: invoice.subtotal || 0,
    tax_amount: invoice.taxAmount || 0,
    tax_rate: invoice.taxRate !== undefined ? invoice.taxRate : null,
    discount: invoice.discount || 0,
    total_amount: invoice.totalAmount || 0,
    paid_amount: invoice.paidAmount || 0,
    balance_due: balance,
    currency: invoice.currency || 'IDR',
    project_id: invoice.projectId || null,
    project_title: invoice.projectTitle || null,
    project_ids: invoice.projectIds ? JSON.stringify(invoice.projectIds) : null,
    project_titles: invoice.projectTitles ? JSON.stringify(invoice.projectTitles) : null,
    quotation_id: invoice.quotationId || null,
    quotation_number: invoice.quotationNumber || null,
    language: invoice.language || 'id',
    notes: invoice.notes || null,
    terms: invoice.terms || null,
    bank_details: invoice.bankDetails ? JSON.stringify(invoice.bankDetails) : null,
    payment_history: invoice.paymentHistory ? JSON.stringify(invoice.paymentHistory) : JSON.stringify([]),
    public_token: invoice.publicToken || null,
    legacy_public_url: invoice.legacyPublicUrl || null,
    created_at: invoice.createdAt || now,
    updated_at: invoice.updatedAt || now,
    raw_data: JSON.stringify(invoice)
  };
}
