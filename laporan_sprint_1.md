# SPRINT 1 — DOCUMENT RUNTIME FOUNDATION (ARCHITECTURE-FIRST IMPLEMENTATION)

## 1. Ringkasan Implementasi
Pada sprint ini, kepemilikan utama (ownership) dari *state* `CompanyData` beserta logika modifikasinya (`updateData` dan `resetData`) telah dipindahkan keluar dari God Component (`App.tsx`). Kami telah membuat *boundary* baru berupa Custom Hook `useDocumentRuntime` yang diletakkan di dalam folder domain (`src/domain/company/useDocumentRuntime.ts`). 

Hook ini berperan sebagai embrio dari **Document Runtime** yang bertugas membungkus mutasi data dasar. `App.tsx` kini hanya bertindak sebagai *consumer* (pengguna) dari runtime ini tanpa memiliki logika internal (kalkulasi saham, manipulasi string alamat, dsb) secara langsung. 

## 2. Daftar File yang Berubah
Hanya **2 file** yang disentuh (jauh di bawah batas anggaran perubahan 5 file):
1. `src/domain/company/useDocumentRuntime.ts` (Dibuat baru, memindahkan logika dari App)
2. `App.tsx` (Dibersihkan dari `useState` data perseroan, `formatFullAddress`, `updateData`, dan `resetData`, kemudian diganti dengan pemanggilan `useDocumentRuntime`)

## 3. Boundary Baru yang Terbentuk
Terbentuk boundary **Document Runtime State** (`useDocumentRuntime`). Hook ini merangkum *business logic* turunan seperti:
- Kalkulasi ulang modal dasar dan disetor ketika harga/jumlah saham berubah.
- Formatting obyek `Address` (`newAddress`, `oldAddress`) menjadi format *string* (`fullAddress`, `oldFullAddress`).
- Formatting data input jalan, RT, RW, Kelurahan dari RUPST menjadi struktur alamat standar.

## 4. Dependency yang Berhasil Diputus
- `App.tsx` tidak lagi bergantung pada logika formatting alamat (*domain formatting*).
- `App.tsx` tidak lagi menangani logika turunan nilai saham perseroan (*domain capital derived calculation*).

## 5. Dependency yang Masih Tersisa
Sebagaimana diamanatkan, bagian di bawah ini **belum** kami ubah karena diluar cakupan sprint ini (sengaja dibiarkan):
- Autosave Lokal (`localStorage`) masih berada di dalam `useDocumentRuntime` (karena *initial value* diambil di dalam state) dan di `App.tsx`.
- Autosave Cloud (Firestore) via `setInterval` masih berpusat di `App.tsx`.
- Pipeline Sinkronisasi (seperti `syncCompanyDataToRupst`) masih berada di `App.tsx` dengan memanggil Public API `updateData` yang terekspos.

## 6. Hasil Verification
- **Dependency Audit**: PASS. Ketergantungan satu arah: `App.tsx` → `useDocumentRuntime` → `formatters`/`types`. Tidak ada *circular dependency*.
- **Semantic Diff**: PASS. Algoritma kalkulasi dan mutasi yang dipindah byte-identik.
- **Behavior Audit**: PASS. *Autosave*, preview *real-time*, dan penanganan *event handler* (`onChange`) tidak terpengaruh, sebab Public API merespons objek `Partial<CompanyData>` dengan cara yang identik 100%.
- **Runtime Risk Audit**: PASS. Kami menggunakan updater function (`prev => ...`) dalam fungsi yang dibungkus dengan `useCallback` sehingga dijamin tidak ada *stale closure*. *Re-render* berjalan secara konstan sebagaimana sebelumnya.
- **Public API Audit**: PASS.
  - `updateData(updates: Partial<CompanyData>): void` (Tetap identik)
  - `resetData(): void` (Tetap identik)

## 7. Status Sprint
**PASS**. Objektif "CompanyData tidak lagi dimiliki langsung oleh App.tsx" telah terpenuhi secara bersih dan presisi tanpa merusak subsystem lain.
