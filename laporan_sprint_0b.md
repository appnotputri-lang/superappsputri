# SPRINT 0B — AUDIT LENGKAP \`updateData\` & \`resetData\`

## AUDIT 1 — IDENTIFIKASI

**1. \`updateData\`**
- **Lokasi File**: \`App.tsx\`
- **Nomor Baris**: 2083
- **Signature**: \`const updateData = (updates: Partial<CompanyData>) => void\`
- **Parameter**: \`updates\` berjenis \`Partial<CompanyData>\`
- **Return Value**: \`void\`

**2. \`resetData\`**
- **Lokasi File**: \`App.tsx\`
- **Nomor Baris**: 2560
- **Signature**: \`const resetData = () => void\`
- **Parameter**: (tidak ada)
- **Return Value**: \`void\`

---

## AUDIT 2 — DEPENDENCY TREE

### Dependency Graph \`updateData\`:
\`\`\`text
updateData
├── memakai setData? Ya (mutator dari useState data)
├── memakai INITIAL_STATE? Tidak
├── memakai helper? Ya (formatFullAddress)
├── memakai formatter? Ya (formatFullAddress)
├── memakai validator? Tidak
├── memakai closure? Ya (menangkap fungsi setData dan state prev)
├── memakai useState? Ya (state data di App.tsx)
├── memakai useRef? Tidak
├── memakai useMemo? Tidak
├── memakai useCallback? Tidak
├── memakai Firestore? Tidak
├── memakai async? Tidak
├── memakai Promise? Tidak
└── dependency lain
    └── Partial<CompanyData> (interface)
\`\`\`

### Dependency Graph \`resetData\`:
\`\`\`text
resetData
├── memakai setData? Ya
├── memakai INITIAL_STATE? Ya
├── memakai helper? Tidak
├── memakai formatter? Tidak
├── memakai validator? Tidak
├── memakai closure? Ya (menangkap INITIAL_STATE, setData, setActiveTab)
├── memakai useState? Ya (setData, setActiveTab)
├── memakai useRef? Tidak
├── memakai useMemo? Tidak
├── memakai useCallback? Tidak
├── memakai Firestore? Tidak
├── memakai async? Tidak
├── memakai Promise? Tidak
└── dependency lain
    ├── localStorage (localStorage.removeItem)
    └── window.confirm
\`\`\`

---

## AUDIT 3 — CALL GRAPH

### Untuk \`updateData\`:
Terdapat **242 lokasi pemanggilan** di seluruh file \`App.tsx\`. Sebagian besar pemanggilan ini digunakan secara *inline* pada event handler elemen DOM, dan di-pass sebagai *props* ke komponen anak.

**Pola Penggunaan:**
1. **DOM Event Handlers (Inline):**
   Ratusan pemanggilan langsung di handler \`onChange\`, \`onClick\`, dll.
   Contoh: \`onChange={(e) => updateData({ companyName: e.target.value })}\`
2. **Prop Drilling ke Child Components:**
   - \`MeetingFormShell\` 
   - \`AhuMasaJabatanSelector\`
3. **Pembungkus/Helper di dalam App.tsx:**
   - \`updateManualRep\`
   - \`handleManualSync\`
   - Fungsi manipulasi data tabel pemegang saham, direksi, komisaris (melalui helper seperti \`deleteShareholder\`, dll).

### Untuk \`resetData\`:
Terdapat **4 lokasi pemanggilan**.
Hanya diikat langsung pada handler \`onClick\` dari tombol bertuliskan "RISET".

---

## AUDIT 4 — DATA FLOW

Aliran data untuk mutasi state sangat tersentralisasi:

\`\`\`text
Input (Event onChange di UI / Interaksi User)
↓
Memanggil updateData({ field: value }) atau komponen meneruskan prop updateData
↓
updateData menghitung logic kalkulasi internal:
  - Kalkulasi ulang modal dasar & disetor jika porsi saham berubah.
  - Formasi string alamat (fullAddress) jika alamat berubah.
↓
setData() dipanggil dengan object state yang baru
↓
React Re-render App.tsx
↓
useMemo() memicu kalkulasi ulang 'mergedData' (penggabungan profil + draft)
↓
Komponen UI menerima mergedData / data terbaru.
\`\`\`

---

## AUDIT 5 — SIDE EFFECT

Apakah \`updateData\` memicu efek samping? **YA.**

1. **Autosave ke localStorage**:
   Perubahan pada state \`data\` otomatis memicu \`useEffect\` pada baris 1745:
   \`localStorage.setItem('legal-draft-data-v25-final', JSON.stringify(data));\`
2. **Autosave ke Firestore**:
   Perubahan pada \`data\` juga memperbarui \`autoSaveStateRef.current\`. \`setInterval\` yang berjalan di \`useEffect\` lain (berjalan independen) secara berkala membaca referensi ini dan melakukan *autosave* ke *backend* Firestore.
3. **Kalkulasi Memoized**:
   Memicu ulang kalkulasi besar \`mergedData\` lewat \`useMemo\`.

---

## AUDIT 6 — PURE FUNCTION TEST

Apakah \`updateData\` dapat dipindahkan menjadi:
**C. Custom Hook / D. Reducer**

**Alasan Teknis:**
Logika inti (yang menghitung nilai baru state) di dalam \`setData(prev => { ... })\` adalah *Pure Function*. Logika tersebut murni hanya menerima *previous state* dan *payload update*, lalu mengembalikan data baru.
Namun, \`updateData\` secara keseluruhan terikat pada fungsi \`setData\` (mutator hook \`useState\`). Oleh karena itu, fungsinya tidak dapat diekstrak menjadi Utility yang berdiri sendiri kecuali diekstrak bersama dengan state \`data\` itu sendiri (misalnya menjadi *Custom Hook* \`useCompanyData\` atau *Reducer* \`useReducer\`).

---

## AUDIT 7 — COHESION

Berdasarkan *source code*, \`updateData\` + \`resetData\` lebih tepat disebut:
**State Manager** (atau bagian dari form engine/state).

**Alasan:**
Kedua fungsi ini merupakan satu-satunya jalur mutasi utama untuk entitas \`data\` di \`App.tsx\`. Mereka bertindak layaknya *reducer* manual. Jika dipertahankan di *Root Component* (App.tsx), mereka menciptakan *prop drilling* yang tinggi dan ketergantungan erat. Karena keduanya sangat *cohesive* dengan *state* \`CompanyData\` dan logika perubahannya, mereka sebaiknya diabstraksikan menjadi satu kesatuan di dalam custom hook (misal: \`useCompanyForm\`).
