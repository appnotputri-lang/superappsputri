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
          error: 'GEMINI_API_KEY tidak tersedia pada Cloudflare Environment Variables.',
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

    // Google Gemini Developer API headers (DO NOT send Authorization: Bearer to avoid 401 OAuth error)
    const geminiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    };

    // =========================================================================
    // STEP 3: MINIMAL PING TEST CALL TO VERIFY AUTHENTICATION
    // =========================================================================
    const testModel = 'gemini-2.5-flash';
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const testRes = await fetch(testUrl, {
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

      const testJson = (await testRes.json()) as any;
      const testStatus = testRes.status;

      if (!testRes.ok) {
        const errObj = testJson?.error || {};
        const msg = errObj?.message || errObj?.status || JSON.stringify(testJson);

        const diag = {
          apiKeyConfigured: true,
          keyType,
          keyPrefix,
          keyLength: apiKey.length,
          model: testModel,
          status: testStatus,
          geminiMessage: msg,
        };

        let userError = `Autentikasi Gemini API gagal (HTTP ${testStatus}).`;
        if (testStatus === 401) {
          userError = `Gemini API menolak API key (HTTP 401 Unauthorized / Key tidak valid). Pesan Google: "${msg}".`;
        } else if (testStatus === 403) {
          userError = `Gemini API menolak akses (HTTP 403 Forbidden). Pesan Google: "${msg}". Pastikan Generative Language API diaktifkan di Google Cloud Console dan API key tidak memiliki restriction berlebih.`;
        } else if (testStatus === 429) {
          userError = `Batas kuota Gemini API tercapai (HTTP 429 Quota Exceeded / Rate Limit). Pesan Google: "${msg}".`;
        } else if (testStatus === 400) {
          userError = `Request ke Gemini API tidak valid (HTTP 400 Bad Request). Pesan Google: "${msg}".`;
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: userError,
            diagnostics: diag,
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    } catch (testErr: any) {
      console.warn('[OCR KTP Cloudflare] Test ping exception:', testErr?.message || testErr);
      // Proceed to main OCR if test call had network glitch
    }

    // =========================================================================
    // STEP 4: EXECUTE OCR WITH IMAGE PAYLOAD
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

    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastErrorDiagnostics: any = null;
    let parsedData: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const modelName = candidateModels[i];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const payload = {
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      };

      try {
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: geminiHeaders,
          body: JSON.stringify(payload),
        });

        const resJson = (await geminiRes.json()) as any;
        const status = geminiRes.status;

        if (!geminiRes.ok) {
          const apiErrObj = resJson?.error || {};
          const geminiMsg = apiErrObj?.message || apiErrObj?.status || JSON.stringify(resJson);

          lastErrorDiagnostics = {
            apiKeyConfigured: true,
            keyType,
            keyPrefix,
            keyLength: apiKey.length,
            model: modelName,
            status: status,
            geminiMessage: geminiMsg,
          };

          // DO NOT fallback on auth/quota/client errors (401, 403, 429, 400)
          if (status === 401 || status === 403 || status === 429 || status === 400) {
            let msgText = `Gemini API HTTP ${status}: ${geminiMsg}`;
            if (status === 401) {
              msgText = `Gemini API menolak API key (HTTP 401 Unauthorized). Pesan Google: "${geminiMsg}".`;
            } else if (status === 403) {
              msgText = `Gemini API menolak akses (HTTP 403 Forbidden). Pesan Google: "${geminiMsg}".`;
            } else if (status === 429) {
              msgText = `Batas kuota Gemini API tercapai (HTTP 429 Rate Limit). Pesan Google: "${geminiMsg}".`;
            }
            return new Response(
              JSON.stringify({
                success: false,
                error: msgText,
                diagnostics: lastErrorDiagnostics,
              }),
              { status: 200, headers: corsHeaders }
            );
          }

          console.warn(`[OCR KTP Cloudflare] Model ${modelName} returned HTTP ${status}:`, geminiMsg);
          continue;
        }

        let rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText) {
          rawText = rawText.trim();
          if (rawText.startsWith('```')) {
            rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          }
          parsedData = JSON.parse(rawText);
          if (parsedData) break;
        }
      } catch (err: any) {
        console.warn(`[OCR KTP Cloudflare] Exception calling Gemini model ${modelName}:`, err?.message || err);
        lastErrorDiagnostics = {
          apiKeyConfigured: true,
          keyType,
          keyPrefix,
          keyLength: apiKey.length,
          model: modelName,
          status: 'EXCEPTION',
          geminiMessage: err?.message || String(err),
        };
      }
    }

    if (!parsedData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gagal memproses OCR KTP melalui Gemini Vision API.',
          diagnostics: lastErrorDiagnostics || {
            apiKeyConfigured: true,
            keyType,
            keyPrefix,
            keyLength: apiKey.length,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Normalize extracted JSON fields for frontend compatibility
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
