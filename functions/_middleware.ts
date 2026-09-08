interface Env {
  DB: any;
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const RESERVED_SLUGS = new Set([
  'clients', 'profile', 'profile-cv', 'projects', 'projects-detail',
  'invoices', 'invoice', 'quotations', 'quotation', 'deeds', 'private-deeds',
  'incoming-mails', 'surat-masuk', 'outgoing-mails', 'surat-keluar',
  'general-documents', 'surat-jalan', 'tanda-terima', 'receipt',
  'deposit_note', 'deposit-notes', 'deposit_notes', 'products',
  'rupslb', 'pendirian', 'rupst', 'perbaikan', 'draft-akta', 'panduan',
  'sirkuler', 'rupst-public', 'kbli-mapping', 'saran-kbli', 'import-kbli',
  'laporan', 'whatsapp-gateway', 'user-management', 'notary-reports',
  'protest-cheque', 'stamp-settings', 'doc', 'q', 'login', 'beranda'
]);

export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  if (context.request.method !== 'GET') {
    return context.next();
  }

  // Skip static assets and API requests
  if (
    pathname.startsWith('/api/') ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map|json|webp)$/i.test(pathname)
  ) {
    return context.next();
  }

  // Extract public token if applicable
  let token = '';
  if (pathname.startsWith('/invoice/public/')) {
    token = pathname.replace('/invoice/public/', '').split('?')[0].split('/')[0];
  } else if (pathname.startsWith('/invoices/public/')) {
    token = pathname.replace('/invoices/public/', '').split('?')[0].split('/')[0];
  } else if (pathname.startsWith('/inv/')) {
    token = pathname.replace('/inv/', '').split('?')[0].split('/')[0];
  } else {
    const slug = pathname.replace(/^\/+|\/+$/g, '');
    if (!slug.includes('/') && slug.length >= 6 && !RESERVED_SLUGS.has(slug.toLowerCase())) {
      token = slug;
    }
  }

  if (!token || !context.env?.DB) {
    return context.next();
  }

  try {
    const row: any = await context.env.DB.prepare(
      `SELECT * FROM invoices WHERE public_token = ? OR legacy_public_url LIKE ? OR id = ? LIMIT 1`
    ).bind(token, `%${token}%`, token).first();

    if (!row) {
      return context.next();
    }

    const response = await context.next();
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    const isLocal = url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1');
    const origin = isLocal ? url.origin : 'https://app.notarisputri.web.id';
    const publicUrl = `${origin}/${token}`;
    const invoiceNumber = row.invoice_number || 'INV/...';
    const clientName = row.client_name || 'Klien';
    const version = encodeURIComponent(row.updated_at || row.created_at || String(row.total_amount || '1'));
    const previewImageUrl = `${origin}/api/public/invoice/${token}/preview-image.png?v=${version}`;

    const ogTitle = `Invoice ${invoiceNumber}`;
    const ogDesc = clientName ? `Invoice untuk ${clientName}` : 'Invoice Notaris/PPAT Nukantini Putri Parincha';
    const pageTitle = `${ogTitle} - ${clientName}`;

    let html = await response.text();
    const metaTags = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(ogDesc)}" />
    <!-- Open Graph / WhatsApp Preview -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${publicUrl}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDesc)}" />
    <meta property="og:image" content="${previewImageUrl}" />
    <meta property="og:image:secure_url" content="${previewImageUrl}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1190" />
    <meta property="og:image:height" content="1684" />
    <meta property="og:site_name" content="Notaris Putri SuperApp" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${publicUrl}" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
    <meta name="twitter:image" content="${previewImageUrl}" />`;

    html = html.replace(/<title>.*?<\/title>/i, '');
    html = html.replace('</head>', `${metaTags}\n</head>`);

    return new Response(html, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return context.next();
  }
};
