import { firestoreRest } from '../../src/lib/firestore-rest';

export async function getFonnteToken(env: any): Promise<string | null> {
  try {
    const doc = await firestoreRest.getDocument('settings', 'whatsapp', env);
    const token = doc?.token;
    if (token && typeof token === 'string' && token.trim()) {
      return token.trim();
    }
  } catch (err) {
    console.warn('[Fonnte] Gagal baca settings/whatsapp dari Firestore:', err);
  }
  // fallback opsional ke env var kalau Firestore kosong/gagal
  return env?.FONNTE_TOKEN || null;
}
