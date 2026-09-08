import { getInvoiceByPublicTokenD1 } from '../../../../../src/lib/d1InvoiceRepository';
import { getOrGenerateInvoiceThumbnail, getInvoiceThumbnailCacheKey } from '../../../../../src/services/invoiceThumbnailService';

export const onRequestGet = async (context: any) => {
  const { env, params, request } = context;
  const db = env?.DB;
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : (rawToken as string);

  if (!token) {
    return new Response(JSON.stringify({ error: "Token is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const result = db ? await getInvoiceByPublicTokenD1(db, token) : null;
    if (!result || !result.success || !result.invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const invoice = result.invoice;
    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") || url.host || "app.notarisputri.web.id";
    const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(':', '') || "https";
    const origin = `${proto}://${host}`;
    const publicUrl = invoice.legacyPublicUrl || `${origin}/${token}`;

    const { buffer, contentType } = await getOrGenerateInvoiceThumbnail(invoice, token, publicUrl);
    const cacheKey = getInvoiceThumbnailCacheKey(invoice, token);

    // If D1 is available and thumbnailBase64 was not previously stored, save it for ultra-fast subsequent responses
    if (db && !invoice.thumbnailBase64 && buffer) {
      try {
        const base64String = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        const updatedInvoice = { ...invoice, thumbnailBase64: base64String };
        await db.prepare('UPDATE invoices SET raw_data = ? WHERE id = ?')
          .bind(JSON.stringify(updatedInvoice), invoice.id)
          .run();
      } catch (dbErr) {
        console.warn("[CF Preview Image] Could not cache thumbnail in D1:", dbErr);
      }
    }

    const responseBytes = new Uint8Array(buffer);
    return new Response(responseBytes.buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType || "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
        "ETag": `"${cacheKey}"`,
        "Content-Length": String(responseBytes.length),
      }
    });
  } catch (err: any) {
    console.error("[CF Invoices Preview Image API] Error generating thumbnail:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to generate preview image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

