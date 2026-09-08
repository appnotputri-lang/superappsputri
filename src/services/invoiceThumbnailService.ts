import path from 'path';
import * as canvas from '@napi-rs/canvas';
import { Invoice } from '../types';
import { createInvoiceJsPdf, formatNum, formatDate } from '../utils/invoiceHtmlGenerator';

// Polyfill canvas globals for pdfjs-dist in Node.js environment
if (typeof globalThis !== 'undefined') {
  if (!globalThis.Path2D) globalThis.Path2D = canvas.Path2D as any;
  if (!globalThis.DOMMatrix) globalThis.DOMMatrix = canvas.DOMMatrix as any;
  if (!globalThis.DOMPoint) globalThis.DOMPoint = canvas.DOMPoint as any;
  if (!globalThis.DOMRect) globalThis.DOMRect = canvas.DOMRect as any;
  if (!globalThis.ImageData) globalThis.ImageData = canvas.ImageData as any;
}

interface CachedThumbnail {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}

// In-memory cache for fast WhatsApp preview responses (< 1ms)
const thumbnailCache = new Map<string, CachedThumbnail>();

/**
 * Construct cache key based on invoice identity and versioned properties.
 * If totalAmount, balanceDue, or updatedAt change, the cache key changes immediately.
 */
export function getInvoiceThumbnailCacheKey(invoice: Invoice, token: string): string {
  const version = invoice.updatedAt || invoice.createdAt || 'v1';
  return `${token}:${version}:${invoice.totalAmount}:${invoice.balanceDue ?? ''}`;
}

export function invalidateInvoiceThumbnailCache(token?: string, invoiceId?: string) {
  if (token) {
    for (const key of thumbnailCache.keys()) {
      if (key.startsWith(`${token}:`)) {
        thumbnailCache.delete(key);
      }
    }
  }
  if (invoiceId) {
    for (const key of thumbnailCache.keys()) {
      if (key.includes(invoiceId)) {
        thumbnailCache.delete(key);
      }
    }
  }
}

/**
 * Generate a clean fallback PNG image if PDF page 1 rendering ever encounters an error.
 * Ensures WhatsApp preview never displays a broken image.
 */
export function generateFallbackInvoiceImage(invoice: Invoice): Buffer {
  const width = 1200;
  const height = 630;
  const c = canvas.createCanvas(width, height);
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = '#f8fafc'; // slate-50
  ctx.fillRect(0, 0, width, height);

  // Top header bar
  ctx.fillStyle = '#1e3a8a'; // blue-900
  ctx.fillRect(0, 0, width, 110);

  // Brand Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('NOTARIS/PPAT NUKANTINI PUTRI PARINCHA, SH., M.Kn', 50, 65);

  // Main Card
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(50, 150, width - 100, height - 190, 16);
  ctx.fill();
  ctx.stroke();

  // Invoice Title & Number
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('INVOICE TAGIHAN RESMI', 90, 220);

  ctx.fillStyle = '#2563eb';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(invoice.invoiceNumber || 'INV/2026/...', 90, 275);

  // Client Name
  ctx.fillStyle = '#64748b';
  ctx.font = '22px sans-serif';
  ctx.fillText('Tagihan Kepada:', 90, 335);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(invoice.clientName || 'Klien', 90, 375);

  // Date
  ctx.fillStyle = '#64748b';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Tanggal: ${formatDate(invoice.issueDate)}  •  Jatuh Tempo: ${formatDate(invoice.dueDate)}`, 90, 425);

  // Total Amount Box
  ctx.fillStyle = '#eff6ff';
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(90, 465, width - 180, 85, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('TOTAL TAGIHAN', 120, 505);

  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 34px sans-serif';
  const totalText = `Rp ${formatNum(invoice.totalAmount)}`;
  ctx.fillText(totalText, 120, 540);

  return c.toBuffer('image/png');
}

/**
 * Generate Page 1 Thumbnail PNG directly from the exact same jsPDF document.
 * Single Source of Truth architecture: Invoice Data -> createInvoiceJsPdf -> Page 1 Canvas -> PNG.
 */
export async function generateInvoicePage1Thumbnail(
  invoice: Invoice,
  publicUrl?: string
): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    // 1. Generate the exact same jsPDF document (Single Source of Truth)
    const doc = await createInvoiceJsPdf(invoice, publicUrl, invoice.language || 'id');
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer);

    // 2. Load with pdfjs-dist
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');

    let standardFontsPath: string | undefined = undefined;
    try {
      const pdfjsPkg = require.resolve('pdfjs-dist/package.json');
      standardFontsPath = path.join(path.dirname(pdfjsPkg), 'standard_fonts') + path.sep;
    } catch {
      standardFontsPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');
    }

    const loadingTask = pdfjs.getDocument({
      data: pdfUint8Array,
      standardFontDataUrl: standardFontsPath,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);

    // Render page 1 at scale 1.8 for crisp high-DPI text on WhatsApp preview
    const viewport = page.getViewport({ scale: 1.8 });

    const c = canvas.createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = c.getContext('2d');

    // Solid white background for paper appearance
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    await page.render({
      canvasContext: ctx as any,
      viewport: viewport,
    }).promise;

    const pngBuffer = c.toBuffer('image/png');

    return {
      buffer: pngBuffer,
      contentType: 'image/png',
    };
  } catch (err) {
    console.error('[InvoiceThumbnailService] Error generating PDF page 1 thumbnail:', err);
    // Safe fallback: clean designed invoice card
    const fallbackBuffer = generateFallbackInvoiceImage(invoice);
    return {
      buffer: fallbackBuffer,
      contentType: 'image/png',
    };
  }
}

/**
 * Retrieve cached thumbnail or generate on demand.
 */
export async function getOrGenerateInvoiceThumbnail(
  invoice: Invoice,
  token: string,
  publicUrl?: string
): Promise<{ buffer: Buffer; contentType: string; fromCache: boolean }> {
  const cacheKey = getInvoiceThumbnailCacheKey(invoice, token);

  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return {
      buffer: cached.buffer,
      contentType: cached.contentType,
      fromCache: true,
    };
  }

  const result = await generateInvoicePage1Thumbnail(invoice, publicUrl);
  thumbnailCache.set(cacheKey, {
    buffer: result.buffer,
    contentType: result.contentType,
    timestamp: Date.now(),
  });

  return {
    buffer: result.buffer,
    contentType: result.contentType,
    fromCache: false,
  };
}
