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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const rawApiKey = (context.env.GEMINI_API_KEY || context.env.VITE_GEMINI_API_KEY || context.env.API_KEY || '').trim();

    if (!rawApiKey || rawApiKey === 'dummy' || rawApiKey === 'your_gemini_api_key') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY belum dikonfigurasi pada Cloudflare Environment Variables.',
          diagnostics: {
            apiKeyConfigured: false,
            apiKeyLength: 0,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const apiKey = rawApiKey;

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
                apiKeyLength: apiKey.length,
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
                apiKeyLength: apiKey.length,
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
                apiKeyLength: apiKey.length,
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
              apiKeyLength: apiKey.length,
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
                apiKeyLength: apiKey.length,
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
              apiKeyLength: apiKey.length,
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
            apiKeyLength: apiKey.length,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

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

    // Priority Model Strategy: 'gemini-2.5-flash' first, then 'gemini-flash-latest', then 'gemini-3.1-flash-lite'
    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastErrorDiagnostics: any = null;
    let parsedData: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const modelName = candidateModels[i];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const resJson = (await geminiRes.json()) as any;
        const status = geminiRes.status;

        if (!geminiRes.ok) {
          const apiErrObj = resJson?.error || {};
          const geminiMsg = apiErrObj?.message || apiErrObj?.status || JSON.stringify(resJson);

          lastErrorDiagnostics = {
            apiKeyConfigured: true,
            apiKeyLength: apiKey.length,
            modelTried: modelName,
            geminiStatus: status,
            geminiMessage: geminiMsg,
          };

          // DO NOT fallback on 401, 403, 429, or 400 because changing models will not fix client/auth/payload errors!
          if (status === 401) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Gemini API menolak request (401 Unauthorized / GEMINI_API_KEY tidak valid).',
                diagnostics: lastErrorDiagnostics,
              }),
              { status: 200, headers: corsHeaders }
            );
          }

          if (status === 403) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Gemini API menolak akses (403 Forbidden / API Key tidak memiliki izin atau Generative Language API belum diaktifkan di Google Cloud Console).',
                diagnostics: lastErrorDiagnostics,
              }),
              { status: 200, headers: corsHeaders }
            );
          }

          if (status === 429) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Batas kuota Gemini API tercapai (429 Rate Limit / Resource Exhausted).',
                diagnostics: lastErrorDiagnostics,
              }),
              { status: 200, headers: corsHeaders }
            );
          }

          if (status === 400) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Payload gambar KTP atau request ke Gemini API tidak valid (400 Bad Request).',
                diagnostics: lastErrorDiagnostics,
              }),
              { status: 200, headers: corsHeaders }
            );
          }

          // If 404 (Model not found) or 5xx (Server error), log warning and attempt fallback to next model
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
          apiKeyLength: apiKey.length,
          modelTried: modelName,
          geminiStatus: 'EXCEPTION',
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
            apiKeyLength: apiKey.length,
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
