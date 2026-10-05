interface Env {
  GEMINI_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
  API_KEY?: string;
  DB?: any;
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
    let rawApiKey = (context.env.GEMINI_API_KEY || context.env.VITE_GEMINI_API_KEY || context.env.API_KEY || '').trim();
    if ((rawApiKey.startsWith('"') && rawApiKey.endsWith('"')) || (rawApiKey.startsWith("'") && rawApiKey.endsWith("'"))) {
      rawApiKey = rawApiKey.slice(1, -1).trim();
    }

    if (!rawApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY belum dikonfigurasi pada Cloudflare Environment Variables.',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const body: any = await context.request.json().catch(() => ({}));
    const { messages, model: requestedModel, clientQuery } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Daftar pesan (messages) wajib diisi.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';

    // Search D1 client directory if available
    let d1ClientsFound: any[] = [];
    const db = context.env.DB;
    const searchTarget = clientQuery || (
      lastUserMsg.toLowerCase().includes('klien') || 
      lastUserMsg.toLowerCase().includes('pt ') || 
      lastUserMsg.toLowerCase().includes('cv ') ||
      lastUserMsg.toLowerCase().includes('cari')
        ? lastUserMsg.replace(/^(tolong\s+)?(cari|carikan|siapa|data|klien|profil)\s+/i, '').trim()
        : ''
    );

    if (db && searchTarget && searchTarget.length >= 2) {
      try {
        const words = searchTarget.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        if (words.length > 0) {
          let sql = `SELECT * FROM client_directory WHERE `;
          const conds: string[] = [];
          const p: any[] = [];
          for (const word of words) {
            conds.push(`(LOWER(company_name) LIKE ? OR LOWER(search_name) LIKE ? OR LOWER(client_type) LIKE ?)`);
            p.push(`%${word}%`, `%${word}%`, `%${word}%`);
          }
          sql += conds.join(' OR ') + ` LIMIT 5`;
          const qRes = await db.prepare(sql).bind(...p).all();
          d1ClientsFound = (qRes.results || []).map((r: any) => ({
            id: r.id,
            clientId: r.client_id,
            companyName: r.company_name,
            clientType: r.client_type,
            domicile: r.domicile,
            npwp: r.npwp
          }));
        }
      } catch (d1Err) {
        console.warn("[Cloudflare Chat D1 Search] Error querying D1:", d1Err);
      }
    }

    let clientContextSection = "";
    if (d1ClientsFound.length > 0) {
      clientContextSection = `\n\n[DATA KLIEN DITEMUKAN DARI DATABASE CLOUDFLARE D1]:\n` +
        JSON.stringify(d1ClientsFound, null, 2) +
        `\nInformasikan data klien di atas secara ringkas dan tawarkan untuk membuat Surat Penawaran atau Invoice untuk klien ini.`;
    }

    const SYSTEM_INSTRUCTION = `Anda adalah Asisten Cerdas AI Kantor Notaris & PPAT Putri (SuperApps Putri).
Anda menguasai:
1. PROYEK KERJA NOTARIS & PPAT:
   - Alur pekerjaan akta: Pendirian PT/CV, Perubahan Anggaran Dasar PT (RUPS-LB), RUPS Tahunan (RUPST), Jual Beli Tanah (AJB PPAT), Hibah Hak Cipta, Sewa Menyewa, APHT, Roya, SKMHT, Surat Keputusan Kemenkumham, Legalisasi, dan Waarmerking.
   - Status & tahapan proyek kerja (Draft, Dokumen, Verifikasi, Tanda Tangan Penghadap, Pengesahan AHU/BPN, Selesai).
2. PEMBUATAN INVOICE DAN PENAWARAN (QUOTATION):
   - Memberikan perhitungan akurat dan rincian biaya: Jasa notaris, honorarium, PNBP Kemenkumham/BPN, biaya operasional.
   - Pajak: PPh Pasal 21 atas jasa notaris (tarif efektif 2.5% ber-NPWP / 5% non-NPWP, metode Gross-Up), PPh Final PPAT (2.5% peralihan hak tanah/bangunan), BPHTB (5%), PPN (11%).
   - Membantu menyusun draf rincian penawaran resmi standar Notaris/PPAT Nukantini Putri Parincha, SH., M.Kn.
   - Memberikan petunjuk jelas: pengguna dapat langsung membuat Invoice atau Penawaran dari menu aplikasi atau halaman proyek terkait.
3. DATA KLIEN DATABASE CLOUDFLARE D1:
   - Anda terintegrasi dengan basis data direktori klien Cloudflare D1.
   - Membantu mencari nama PT, CV, perorangan, nomor kontak, domisili, dan NPWP klien.

Tanggapi pertanyaan pengguna dalam Bahasa Indonesia yang formal, solutif, ramah, dan ringkas. Gunakan pemformatan Markdown (poin-poin, bold, tabel jika relevan).` + clientContextSection;

    let candidateModels: string[];
    if (requestedModel === 'gemini-3.1-pro-preview') {
      candidateModels = ['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.5-flash'];
    } else if (requestedModel === 'gemini-3.1-flash-lite') {
      candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];
    } else {
      candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    }

    const formattedContents: any[] = [];
    for (const msg of messages) {
      const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
        formattedContents[formattedContents.length - 1].parts[0].text += `\n\n${msg.content}`;
      } else {
        formattedContents.push({
          role,
          parts: [{ text: msg.content }]
        });
      }
    }

    if (formattedContents.length > 0 && formattedContents[0].role === 'model') {
      formattedContents.shift();
    }

    let responseData: any = null;
    let lastErrorMsg = '';
    let usedModel = candidateModels[0];

    for (const mName of candidateModels) {
      try {
        usedModel = mName;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': rawApiKey,
          },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            }
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          lastErrorMsg = `HTTP ${res.status}: ${errText}`;
          console.warn(`[Cloudflare Chat] Model ${mName} failed:`, lastErrorMsg);
          continue;
        }

        const data: any = await res.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (text) {
          responseData = text;
          break;
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err);
        console.warn(`[Cloudflare Chat] Fetch error for ${mName}:`, lastErrorMsg);
      }
    }

    if (!responseData) {
      throw new Error(lastErrorMsg || "Gagal mendapatkan respons dari model Gemini AI.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply: responseData,
        model: usedModel,
        d1Clients: d1ClientsFound
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[Cloudflare Pages Chat] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || "Terjadi kesalahan pada layanan AI Chatbot."
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
