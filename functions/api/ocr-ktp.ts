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

    // Candidate models list for automatic fallback (prioritize stable, fast models)
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let ocrRes: Response | null = null;
    let ocrJson: any = null;
    let usedModel = '';
    let lastErrorMsg = '';
    let lastStatus = 500;

    for (const model of candidateModels) {
      try {
        const targetEndpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(targetEndpointUrl, {
          method: 'POST',
          headers: geminiHeaders,
          body: JSON.stringify(ocrPayload),
        });

        const json = (await res.json()) as any;
        if (res.ok && json?.candidates?.[0]?.content?.parts?.[0]?.text) {
          ocrRes = res;
          ocrJson = json;
          usedModel = model;
          console.log(`[OCR KTP Cloudflare] Sukses membaca gambar KTP dengan model: ${model}`);
          break;
        } else {
          lastStatus = res.status;
          const errObj = json?.error || {};
          lastErrorMsg = errObj?.message || errObj?.status || JSON.stringify(json);
          console.warn(`[OCR KTP Cloudflare] Model ${model} returned HTTP ${res.status}:`, lastErrorMsg);
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err);
        console.warn(`[OCR KTP Cloudflare] Model ${model} fetch exception:`, lastErrorMsg);
      }
    }

    if (!ocrRes || !ocrJson) {
      let friendlyError = `Pemrosesan gambar KTP gagal (HTTP ${lastStatus}).`;
      if (lastStatus === 503) {
        friendlyError = `Server AI sedang sibuk sementara (HTTP 503 Service Unavailable). Silakan coba lagi dalam beberapa detik.`;
      } else if (lastStatus === 429) {
        friendlyError = `Batas kuota Gemini API tercapai (HTTP 429 Rate Limit). Silakan coba sesaat lagi.`;
      } else if (lastStatus === 401 || lastStatus === 403) {
        friendlyError = `Gemini API menolak akses (${lastStatus}). Pastikan API Key valid dan aktif.`;
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: friendlyError,
          diagnostics: {
            apiKeyConfigured: true,
            keyType,
            keyPrefix,
            keyLength: apiKey.length,
            attemptedModels: candidateModels,
            status: lastStatus,
            detail: lastErrorMsg,
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
