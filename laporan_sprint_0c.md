# SPRINT 0C — REVERSE ENGINEERING DOCUMENT RUNTIME

## 1. PETA LIFECYCLE DOKUMEN

Lifecycle sebuah dokumen berawal dari input pengguna dan berakhir pada wujud file fisik (DOCX) atau cloud storage.

1. **User Input / Interaction**: Pengguna mengisi form, mengubah opsi, atau menambah record.
2. **State Mutation**: Event DOM (`onChange`, `onClick`) memanggil `updateData(updates)`. `updateData` melakukan kalkulasi domain bawaan (menghitung modal disetor, format string alamat), dan mengubah state React `data` via `setData`.
3. **Memoization & Merging**: Perubahan `data` memicu `useMemo` untuk melakukan kalkulasi besar, menggabungkan profil perusahaan utama dan draf pengguna menjadi object `mergedData`.
4. **Preview Pipeline Re-render**: `mergedData` yang reaktif langsung diberikan ke komponen `<DocumentPreview>`, `<DraftAktaApp>`, dan sebagainya, merender dokumen secara *real-time* di layar.
5. **Local Autosave (Fast)**: Setiap kali `data` berubah, `useEffect` langsung menyimpannya ke `localStorage` (`legal-draft-data-v25-final`) agar dokumen tidak hilang saat reload.
6. **Cloud Autosave (Debounced/Interval)**: Referensi mutakhir disimpan di `autoSaveStateRef`. Di latar belakang, loop `setInterval` secara periodik (setiap beberapa detik) mengecek keberadaan sesi (`editingRupstId`, `editingProjectId`) dan mengirim mutasi state asinkron ke **Firestore** (sebagai draf).
7. **Export & Generation**: Ketika pengguna menekan tombol "Download", pipeline export membaca state terbaru (`data` / `mergedData` dan `INITIAL_STATE`), dan menginjeksikannya ke function seperti `generateRUPSTDocx` yang akan menghasilkan dan menyajikan file DOCX via browser.

---

## 2. PENGELOMPOKAN DOMAIN FUNGSIONAL

Seluruh kode dalam `App.tsx` yang menangani form dan data tidak sekadar "form", melainkan terbagi ke dalam sub-domain:

* **State Mutation & Derivation**:
  - `data`, `setData`
  - `updateData` (menghitung derived states)
  - `resetData`
* **Session Management**:
  - `editingProjectId`, `editingRupstId`, `editingPendirianId`
  - `activeProjectJobType`, `presetLoadedForProject`
* **Dirty Tracking / Status**:
  - `isSaving`, `lastAutoSavedAt`, `isAutoSaving`
* **Autosave Engine**:
  - `autoSaveStateRef`
  - `useEffect` berisi `setInterval` (Cloud Autosave)
  - `useEffect` berisi `localStorage.setItem` (Local Autosave)
* **Preview Pipeline**:
  - `mergedData` (hasil komputasi draf + original)
  - `isProfilePreview`, `isRupstPreview`, `showPreview`
  - `DraftAktaApp`, `DocumentPreview`
* **Export Pipeline**:
  - Dynamic imports ke generator: `generateWordDoc()`, `generateRUPSTDocx()`
  - Handler export: `handleDownloadProject`, `handleExportWord`, `handlePendirianExportWord`
* **Synchronization**:
  - `syncCompanyDataToRupst()`
  - `handleManualSync()`
* **Navigation / Shell**:
  - `activeTab`, `activeSidebarTab`

---

## 3. OWNER SEBENARNYA DARI LIFECYCLE INI

Berdasarkan dependency graph dan call graph, owner dari seluruh siklus dokumen saat ini adalah **`App.tsx` (God Component / Root)**. 

`App.tsx` menjadi satu-satunya tempat yang menggabungkan dan menyimpan seluruh referensi mulai dari identitas *user*, interaksi database (Firestore), mesin *state*, mesin sinkronisasi, hingga pengaturan antarmuka dan preview.

---

## 4. KLASIFIKASI `updateData()` DAN `resetData()`

Keduanya, bersama autosave interval dan merge logic, membentuk sebuah **Document Runtime (Document Session Engine)**, dan `updateData` berperan sebagai **Command Dispatcher / Mutator**.

**Alasan Teknis:**
1. **Lebih dari Form Engine**: `updateData` tidak hanya mengikat *value* ke *input*. Ia membawa logika bisnis (seperti aturan jika `originalSharePrice` berubah, maka `targetCapitalBase` dikalkulasi).
2. **Lebih dari Reducer**: Keduanya bekerja beriringan dengan `autoSaveStateRef` dan `setInterval` yang bertindak seolah-olah memiliki "Daemon" (background job) tersendiri untuk mengamankan lifecycle dokumen pengguna di belakang layar (layaknya Google Docs runtime).
3. **Keterikatan dengan Session**: Penggunaan `resetData` dan inisialisasi state sangat bergantung pada jenis sesi (`editingProjectId`, `activeSidebarTab`) yang menandakan konteks *document session* yang sedang aktif.

---

## 5. BATAS ALAMI (NATURAL BOUNDARY) UNTUK PEMISAHAN

Melihat peta di atas, terdapat batas-batas logis yang sangat jelas untuk dipisahkan tanpa merusak logika aplikasi:

1. **Document Session Engine (Hook / Context)**
   Memisahkan `data`, `updateData`, `resetData`, `autoSaveStateRef`, fungsi sinkronisasi (seperti `syncCompanyDataToRupst`), dan interval penyimpanan Cloud/Lokal ke dalam abstraksi seperti `useDocumentSession`. 
2. **Export Pipeline (Service / Helper Module)**
   Fungsi-fungsi yang berisi logika *dynamic import* ke file DOCX Generator. Mereka tidak membutuhkan React state secara reaktif, hanya dipanggil sesekali membawa payload final saat *event* klik.
3. **Application Shell (Layout / Router)**
   Status `activeSidebarTab`, handler *Logout*, list profil, dan navigasi aplikasi murni merupakan infrastruktur *Shell* yang tidak perlu tahu detail perhitungan modal dasar saham.

*Output ini adalah Peta Arsitektur murni hasil analisis terhadap Source Code, tanpa membuat usulan maupun implementasi refactor apa pun.*
