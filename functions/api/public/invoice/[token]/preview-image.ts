import { getInvoiceByPublicTokenD1 } from '../../../../../src/lib/d1InvoiceRepository';

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
    const base64Data = invoice.thumbnailBase64 || (invoice as any).previewImage;

    if (base64Data && typeof base64Data === 'string') {
      const pureBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
      const binaryString = atob(pureBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const cacheKey = `${invoice.id}:${invoice.updatedAt || invoice.createdAt || '1'}:${invoice.totalAmount || 0}`;

      return new Response(bytes.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
          'ETag': `"${cacheKey}"`,
          'Content-Length': String(bytes.length),
        }
      });
    }

    // If thumbnail is not yet in D1, but an external origin backend or proxy is configured:
    const backendOrigin = env?.BACKEND_SERVICE_URL || env?.API_ORIGIN;
    if (backendOrigin) {
      try {
        const cleanBackend = backendOrigin.replace(/\/+$/, '');
        const targetUrl = `${cleanBackend}/api/public/invoice/${encodeURIComponent(token)}/preview-image.png`;
        const proxied = await fetch(targetUrl);
        if (proxied.ok) {
          const imageBuffer = await proxied.arrayBuffer();
          // Optionally save to D1 for instant response on next requests
          if (db) {
            try {
              let binary = '';
              const bytes = new Uint8Array(imageBuffer);
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64String = `data:image/png;base64,${btoa(binary)}`;
              const updatedInvoice = { ...invoice, thumbnailBase64: base64String };
              await db.prepare('UPDATE invoices SET raw_data = ? WHERE id = ?')
                .bind(JSON.stringify(updatedInvoice), invoice.id)
                .run();
            } catch (e) {
              console.warn('[CF Preview Image] Could not cache proxied thumbnail:', e);
            }
          }
          return new Response(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
              'Content-Length': String(imageBuffer.byteLength),
            }
          });
        }
      } catch (proxyErr) {
        console.warn('[CF Preview Image] Backend proxy failed:', proxyErr);
      }
    }

    return new Response(JSON.stringify({ error: "Thumbnail not found. Ensure invoice is saved with thumbnail." }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("[CF Invoices Preview Image API] Error retrieving thumbnail:", err);
    return new Response(JSON.stringify({ error: err?.message || "Failed to retrieve preview image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

