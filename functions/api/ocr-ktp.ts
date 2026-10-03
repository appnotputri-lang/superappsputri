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
    const apiKey = context.env.GEMINI_API_KEY || context.env.VITE_GEMINI_API_KEY || context.env.API_KEY;

    if (!apiKey || apiKey === 'dummy' || apiKey === 'your_gemini_api_key') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY belum dikonfigurasi di Cloudflare environment variables.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

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
              error: 'Foto KTP tidak ditemukan dalam request upload.',
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
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        // Limit size to 12MB
        if (file.size > 12 * 1024 * 1024) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Ukuran foto KTP terlalu besar (maksimal 12MB).',
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        cleanMime = fileType || 'image/jpeg';
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        // Convert Uint8Array to base64 chunk-by-chunk for memory safety
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
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    } else {
      // Parse JSON body
      try {
        const body = (await context.request.json()) as any;
        const rawBase64 = body.imageBase64 || body.file || body.image || body.base64;

        if (!rawBase64) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Foto KTP (base64) wajib dikirim dalam request JSON.',
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        cleanBase64 = rawBase64.replace(/^data:image\/\w+;base64,/, '');
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
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const promptText = `Anda adalah sistem OCR cerdas untuk Ekstraksi Kartu Tanda Penduduk (KTP) Indonesia.
Analisis foto KTP yang diberikan dan ekstrak data berikut dengan sangat teliti dan akurat:

1. nik: 16 digit angka NIK KTP.
2. name: Nama lengkap (tanpa gelar), huruf kapital semua.
3. salutation: Jika jenis kelamin LAKI-LAKI gunakan "Tuan". Jika PEREMPUAN, gunakan "Nyonya" atau "Nona".
4. birthCity: Kota/Kabupaten tempat lahir, huruf kapital.
5. birthDate: Tanggal lahir format YYYY-MM-DD.
6. occupation: Pekerjaan sesuai KTP, huruf kapital.
7. address:
   - fullAddress: Alamat jalan/komplek/nomor rumah, huruf kapital.
   - rt: Nomor RT (3 digit, contoh "001").
   - rw: Nomor RW (3 digit, contoh "002").
   - kelurahan: Kelurahan/Desa, huruf kapital.
   - kecamatan: Kecamatan, huruf kapital.
   - city: Kota/Kabupaten, huruf kapital (tanpa kata KOTA atau KABUPATEN jika ada).
   - province: Provinsi, huruf kapital.

Jika ada field yang tidak terbaca atau tidak jelas, kosongkan string-nya ("").`;

    // Candidate Gemini Vision Models per gemini-api skill
    const candidateModels = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let parsedData: any = null;

    for (const modelName of candidateModels) {
      try {
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
            responseSchema: {
              type: 'OBJECT',
              properties: {
                nik: { type: 'STRING' },
                name: { type: 'STRING' },
                salutation: { type: 'STRING' },
                birthCity: { type: 'STRING' },
                birthDate: { type: 'STRING' },
                occupation: { type: 'STRING' },
                address: {
                  type: 'OBJECT',
                  properties: {
                    fullAddress: { type: 'STRING' },
                    rt: { type: 'STRING' },
                    rw: { type: 'STRING' },
                    kelurahan: { type: 'STRING' },
                    kecamatan: { type: 'STRING' },
                    city: { type: 'STRING' },
                    province: { type: 'STRING' },
                  },
                },
              },
            },
          },
        };

        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const resJson = (await geminiRes.json()) as any;

        if (!geminiRes.ok) {
          const apiErrStr = JSON.stringify(resJson?.error || resJson);
          lastError = new Error(`Gemini API HTTP ${geminiRes.status}: ${apiErrStr}`);
          console.warn(`[OCR KTP Cloudflare] Model ${modelName} returned status ${geminiRes.status}:`, apiErrStr);
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
        lastError = err;
        console.warn(`[OCR KTP Cloudflare] Model ${modelName} error:`, err?.message || err);
      }
    }

    if (!parsedData) {
      const errStr = String(lastError?.message || lastError || '');
      let errorMsg = 'Gagal memproses OCR KTP. Silakan isi form KTP secara manual.';

      if (errStr.includes('403') || errStr.includes('PERMISSION_DENIED') || errStr.includes('denied access')) {
        errorMsg = 'Layanan AI Gemini tidak memiliki akses (API Key tidak valid atau terbatas). Silakan periksa environment variable GEMINI_API_KEY di Cloudflare Dashboard.';
      } else if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'Batas kuota Gemini API tercapai (Rate Limit). Silakan coba beberapa saat lagi atau isi form KTP secara manual.';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Normalize output fields for frontend compatibility
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
    console.error('[OCR KTP Cloudflare] Fatal error:', globalErr?.message || globalErr);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Terjadi kesalahan sistem saat memproses OCR KTP. Silakan isi form KTP secara manual.',
      }),
      { status: 200, headers: corsHeaders }
    );
  }
};
