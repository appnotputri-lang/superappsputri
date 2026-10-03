interface Env {
  GEMINI_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
  API_KEY?: string;
}

interface PagesFunctionContext<E = Env> {
  request: Request;
  env: E;
  next: () => Promise<Response>;
  data: Record<string, any>;
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-goog-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
};

export const onRequestPost = async (context: PagesFunctionContext<Env>) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // 1. Read API key from Cloudflare environment
    let rawApiKey = (context.env.GEMINI_API_KEY || context.env.VITE_GEMINI_API_KEY || context.env.API_KEY || '').trim();
    if ((rawApiKey.startsWith('"') && rawApiKey.endsWith('"')) || (rawApiKey.startsWith("'") && rawApiKey.endsWith("'"))) {
      rawApiKey = rawApiKey.slice(1, -1).trim();
    }

    if (!rawApiKey || rawApiKey === 'dummy' || rawApiKey === 'your_gemini_api_key') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY belum dikonfigurasi pada Cloudflare Environment Variables.',
          diagnostics: {
            apiKeyConfigured: false,
            keyType: 'NONE',
            keyLength: 0,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const apiKey = rawApiKey;
    const keyType = apiKey.startsWith('AQ.') ? 'AQ' : apiKey.startsWith('AIza') ? 'AIza' : 'CUSTOM';
    const keyPrefix = apiKey.length >= 4 ? apiKey.substring(0, 4) + '...' : '***';

    // 2. Parse image payload (multipart/form-data or application/json base64)
    let cleanBase64 = '';
    let cleanMime = 'image/jpeg';
    const contentType = context.request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await context.request.formData();
        const file = formData.get('file') || formData.get('image') || formData.get('ktp');

        if (!file || !(file instanceof File)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'File gambar KTP tidak ditemukan dalam request upload.',
              diagnostics: {
                apiKeyConfigured: true,
                keyType,
                keyPrefix,
                keyLength: apiKey.length,
              },
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        const fileType = file.type || '';
        const fileName = file.name || '';
        const isImage = fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|webp|heic)$/i);

        if (!isImage) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Format file tidak valid. Silakan upload gambar KTP (JPG, PNG, atau WebP).',
              diagnostics: {
                apiKeyConfigured: true,
                keyType,
                keyPrefix,
                keyLength: apiKey.length,
              },
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        if (file.size > 12 * 1024 * 1024) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Ukuran foto KTP terlalu besar (maksimal 12MB).',
              diagnostics: {
                apiKeyConfigured: true,
                keyType,
                keyPrefix,
                keyLength: apiKey.length,
              },
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        cleanMime = fileType || 'image/jpeg';
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < uint8.length; i += chunkSize) {
          const chunk = uint8.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        cleanBase64 = btoa(binary);
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Gagal memproses form data gambar KTP: ' + (err?.message || err),
            diagnostics: {
              apiKeyConfigured: true,
              keyType,
              keyPrefix,
              keyLength: apiKey.length,
            },
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    } else {
      try {
        const body = (await context.request.json()) as any;
        const rawBase64 = body.imageBase64 || body.file || body.image || body.base64;

        if (!rawBase64) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Foto KTP (base64) wajib dikirim dalam request JSON.',
              diagnostics: {
                apiKeyConfigured: true,
                keyType,
                keyPrefix,
                keyLength: apiKey.length,
              },
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        cleanBase64 = rawBase64.replace(/^data:image\/\w+;base64,/, '').trim();
        cleanMime = body.mimeType || 'image/jpeg';
        const mimeMatch = rawBase64.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch && mimeMatch[1]) {
          cleanMime = mimeMatch[1];
        }
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Format request JSON tidak valid: ' + (err?.message || err),
            diagnostics: {
              apiKeyConfigured: true,
              keyType,
              keyPrefix,
              keyLength: apiKey.length,
            },
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    if (!cleanBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Foto KTP kosong atau tidak terbaca.',
          diagnostics: {
            apiKeyConfigured: true,
            keyType,
            keyPrefix,
            keyLength: apiKey.length,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Google Gemini Developer API headers (NO Authorization: Bearer to avoid OAuth2 principal error)
    const geminiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    };

    // Model target: gemini-3.8-flash
    const targetModel = 'gemini-3.8-flash';
    const targetEndpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

    console.log(`[OCR KTP Cloudflare] Model: ${targetModel}`);
    console.log(`[OCR KTP Cloudflare] Endpoint: https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`);

    // =========================================================================
    // STEP 3: TEST GENERATECONTENT TEXT DULU
    // =========================================================================
    try {
      const pingRes = await fetch(targetEndpointUrl, {
        method: 'POST',
        headers: geminiHeaders,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'Reply only with OK' }],
            },
          ],
        }),
      });

      const pingJson = (await pingRes.json()) as any;
      const pingStatus = pingRes.status;

      if (!pingRes.ok) {
        const errObj = pingJson?.error || {};
        const msg = errObj?.message || errObj?.status || JSON.stringify(pingJson);

        console.warn(`[OCR KTP Cloudflare] Text test generateContent returned HTTP ${pingStatus}:`, msg);

        let userError = `Test text generateContent gagal (HTTP ${pingStatus}).`;
        if (pingStatus === 401) {
          userError = `Gemini API menolak API key (HTTP 401 Unauthorized / Key tidak valid). Pesan Google: "${msg}".`;
        } else if (pingStatus === 403) {
          userError = `Gemini API menolak akses (HTTP 403 Forbidden). Pesan Google: "${msg}". Pastikan Generative Language API diaktifkan di Google Cloud Console.`;
        } else if (pingStatus === 404) {
          userError = `Model Gemini "${targetModel}" tidak ditemukan (HTTP 404 Not Found). Pesan Google: "${msg}".`;
        } else if (pingStatus === 429) {
          userError = `Batas kuota Gemini API tercapai (HTTP 429 Quota Exceeded / Rate Limit). Pesan Google: "${msg}".`;
        } else if (pingStatus === 400) {
          userError = `Request text generateContent tidak valid (HTTP 400 Bad Request). Pesan Google: "${msg}".`;
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: userError,
            diagnostics: {
              apiKeyConfigured: true,
              keyType,
              keyPrefix,
              keyLength: apiKey.length,
              model: targetModel,
              status: pingStatus,
              geminiMessage: msg,
              geminiEndpoint: `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`,
            },
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    } catch (pingErr: any) {
      console.warn('[OCR KTP Cloudflare] Exception in text test generateContent:', pingErr?.message || pingErr);
    }

    // =========================================================================
    // STEP 4: EXECUTE OCR WITH IMAGE PAYLOAD (GEMINI 3.8 FLASH)
    // =========================================================================
    const promptText = `Anda adalah sistem OCR cerdas untuk Ekstraksi Kartu Tanda Penduduk (KTP) Indonesia.
Analisis foto KTP yang diberikan dan kembalikan HANYA JSON murni tanpa pembungkus markdown dengan struktur berikut:

{
  "nik": "16 digit angka NIK KTP",
  "name": "NAMA LENGKAP TANPA GELAR",
  "salutation": "Tuan / Nyonya / Nona",
  "birthCity": "KOTA / KABUPATEN LAHIR",
  "birthDate": "YYYY-MM-DD",
  "occupation": "PEKERJAAN",
  "address": {
    "fullAddress": "ALAMAT JALAN / KOMPLEK / NO",
    "rt": "000",
    "rw": "000",
    "kelurahan": "KELURAHAN / DESA",
    "kecamatan": "KECAMATAN",
    "city": "KOTA / KABUPATEN",
    "province": "PROVINSI"
  }
}

Jika ada field yang tidak terbaca atau tidak jelas, kosongkan string-nya ("").`;

    const ocrPayload = {
      contents: [
        {
          parts: [
            {
              text: promptText,
            },
            {
              inline_data: {
                mime_type: cleanMime,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    };

    const ocrRes = await fetch(targetEndpointUrl, {
      method: 'POST',
      headers: geminiHeaders,
      body: JSON.stringify(ocrPayload),
    });

    const ocrJson = (await ocrRes.json()) as any;
    const ocrStatus = ocrRes.status;

    if (!ocrRes.ok) {
      const errObj = ocrJson?.error || {};
      const msg = errObj?.message || errObj?.status || JSON.stringify(ocrJson);

      console.warn(`[OCR KTP Cloudflare] Image OCR request returned HTTP ${ocrStatus}:`, msg);

      let userError = `Pemrosesan gambar KTP gagal (HTTP ${ocrStatus}).`;
      if (ocrStatus === 401) {
        userError = `Gemini API menolak API key (HTTP 401 Unauthorized). Pesan Google: "${msg}".`;
      } else if (ocrStatus === 403) {
        userError = `Gemini API menolak akses (HTTP 403 Forbidden). Pesan Google: "${msg}".`;
      } else if (ocrStatus === 404) {
        userError = `Model atau endpoint tidak ditemukan (HTTP 404 Not Found). Pesan Google: "${msg}".`;
      } else if (ocrStatus === 429) {
        userError = `Batas kuota Gemini API tercapai (HTTP 429 Rate Limit). Pesan Google: "${msg}".`;
      } else if (ocrStatus === 400) {
        userError = `Format gambar atau payload tidak didukung oleh Gemini API (HTTP 400 Bad Request). Pesan Google: "${msg}".`;
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: userError,
          diagnostics: {
            apiKeyConfigured: true,
            keyType,
            keyPrefix,
            keyLength: apiKey.length,
            model: targetModel,
            status: ocrStatus,
            geminiMessage: msg,
            geminiEndpoint: `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    let rawText = ocrJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gemini tidak mengembalikan teks hasil OCR pada gambar KTP.',
          diagnostics: {
            apiKeyConfigured: true,
            keyType,
            keyPrefix,
            keyLength: apiKey.length,
            model: targetModel,
            status: ocrStatus,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    rawText = rawText.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.warn('[OCR KTP Cloudflare] JSON parse error from text:', rawText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Format output dari Gemini tidak valid JSON.',
          diagnostics: {
            apiKeyConfigured: true,
            keyType,
            keyPrefix,
            keyLength: apiKey.length,
            model: targetModel,
            rawPreview: rawText.substring(0, 100),
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Normalize extracted JSON fields for frontend compatibility (ShareholderEditor.tsx)
    const normalized = {
      nik: String(parsedData.nik || parsedData.NIK || '').trim(),
      name: String(parsedData.name || parsedData.nama || parsedData.NAMA || '').toUpperCase().trim(),
      salutation: parsedData.salutation || (String(parsedData.jenis_kelamin || parsedData.gender || '').toUpperCase().includes('PEREMPUAN') ? 'Nyonya' : 'Tuan'),
      birthCity: String(parsedData.birthCity || parsedData.tempat_lahir || parsedData.birth_city || '').toUpperCase().trim(),
      birthDate: String(parsedData.birthDate || parsedData.tanggal_lahir || parsedData.birth_date || '').trim(),
      occupation: String(parsedData.occupation || parsedData.pekerjaan || '').toUpperCase().trim(),
      address: {
        fullAddress: String(parsedData.address?.fullAddress || parsedData.address?.alamat || parsedData.alamat || '').toUpperCase().trim(),
        rt: String(parsedData.address?.rt || parsedData.rt || '').trim(),
        rw: String(parsedData.address?.rw || parsedData.rw || '').trim(),
        kelurahan: String(parsedData.address?.kelurahan || parsedData.kelurahan || '').toUpperCase().trim(),
        kecamatan: String(parsedData.address?.kecamatan || parsedData.kecamatan || '').toUpperCase().trim(),
        city: String(parsedData.address?.city || parsedData.address?.kabupaten_kota || parsedData.kabupaten_kota || parsedData.city || '').toUpperCase().trim(),
        province: String(parsedData.address?.province || parsedData.address?.provinsi || parsedData.provinsi || parsedData.province || '').toUpperCase().trim(),
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: normalized,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (globalErr: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Terjadi kesalahan sistem saat memproses OCR KTP: ' + (globalErr?.message || globalErr),
      }),
      { status: 200, headers: corsHeaders }
    );
  }
};
