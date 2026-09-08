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
 * Generate Page 1 Thumbnail PNG directly from the exact same jsPDF document.
 * Single Source of Truth architecture: Invoice Data -> createInvoiceJsPdf -> Page 1 Canvas -> PNG.
 * Strictly avoids alternative/fallback designs to ensure WhatsApp preview matches the actual PDF invoice.
 */
export async function generateInvoicePage1Thumbnail(
  invoice: Invoice,
  publicUrl?: string
): Promise<{ buffer: Buffer; contentType: string }> {
  // If the invoice already has a pre-rendered base64 thumbnail of Page 1, use it directly
  const storedBase64 = invoice.thumbnailBase64 || (invoice as any).previewImage;
  if (storedBase64 && typeof storedBase64 === 'string' && storedBase64.length > 100) {
    const cleanBase64 = storedBase64.includes('base64,') ? storedBase64.split('base64,')[1] : storedBase64;
    return {
      buffer: Buffer.from(cleanBase64, 'base64'),
      contentType: 'image/png',
    };
  }

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

    // Render page 1 at scale 1.8 for crisp high-DPI text on WhatsApp preview (approx 1071 x 1515)
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
  } catch (err: any) {
    console.error('[InvoiceThumbnailService] Error generating PDF page 1 thumbnail:', err);
    throw new Error(`Failed to generate PDF Page 1 thumbnail for invoice ${invoice.invoiceNumber || invoice.id}: ${err?.message || String(err)}`);
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
