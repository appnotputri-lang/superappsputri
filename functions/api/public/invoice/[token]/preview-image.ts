import { getInvoiceByPublicTokenD1 } from '../../../../../src/lib/d1InvoiceRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env?.DB;
  const token = params?.token as string;

  if (!db || !token) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const result = await getInvoiceByPublicTokenD1(db, token);
    if (!result.success || !result.invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const invoice = result.invoice;
    const base64Data = invoice.thumbnailBase64 || (invoice as any).previewImage;

    if (base64Data && typeof base64Data === 'string' && base64Data.includes('base64,')) {
      const pureBase64 = base64Data.split('base64,')[1];
      const binaryString = atob(pureBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Response(bytes.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
          'Content-Length': String(bytes.length),
        }
      });
    }

    // If running in an environment where server.ts is also deployed, forward or return fallback
    return new Response(JSON.stringify({ message: "Thumbnail generated dynamically on server" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Failed to retrieve thumbnail" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
