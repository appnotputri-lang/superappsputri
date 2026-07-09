# SPRINT 0D — COMPANYDATA DOMAIN DISCOVERY

## AUDIT 1: Pemetaan Domain Bisnis

Antarmuka `CompanyData` berisi ratusan *field* yang dapat dikelompokkan menjadi 12 domain fungsional:

1. **Document Meta / Runtime** (Pengendali Sesi & Tipe)
2. **Company Identity** (Identitas PT)
3. **Resolutions** (Bendera Keputusan/Agenda)
4. **Address & Domicile** (Alamat & Kedudukan)
5. **KBLI** (Maksud dan Tujuan Usaha)
6. **Capital** (Permodalan Saham)
7. **Shareholders** (Pemegang Saham)
8. **Management** (Susunan Pengurus)
9. **Meeting & Execution** (Pelaksanaan Rapat & Kuasa)
10. **Company Legal History** (Riwayat Akta & SK)
11. **Notary & Witnesses** (Data Notaris & Saksi)
12. **RUPST & Sirkuler Khusus** (Keuangan, Dividen, Laporan)

---

## AUDIT 2: Analisis Per Domain

**1. Document Meta / Runtime** (10+ fields)
- *Field*: `id`, `updatedAt`, `documentType`, `selectedProfileId`, `documentStatus`, `rupslbStatus`, `rupstStatus`, dll.
- *Pemakai*: `App.tsx` (untuk merender UI yang sesuai), `ProjectList`, `ProjectDetail`. Lintas modul.

**2. Company Identity** (8 fields)
- *Field*: `companyName`, `companyShortName`, `targetCompanyName`, `targetCompanyShortName`, `companyType`, `npwp`, `duration`, `status`.
- *Pemakai*: `App.tsx`, seluruh Document Generator (`rupsContentBlocks`, `generatePendirianDocx`). Lintas modul.

**3. Resolutions** (1 field - nested `ResolutionFlags`)
- *Field*: `resolutions`
- *Pemakai*: `App.tsx` (menampilkan tab), `CompositionEditor`, `ManagementEditor`, Document Generators. Sangat sentral.

**4. Address & Domicile** (9 fields)
- *Field*: `oldDomicile`, `kedudukanPT`, `domicile`, `domicileStyle`, `oldAddress`, `newAddress`, `oldFullAddress`, `fullAddress`, `domicileArticleNumber`.
- *Pemakai*: `App.tsx` (Address Selector), Document Generators.

**5. KBLI** (1 field)
- *Field*: `kbliItems`
- *Pemakai*: `App.tsx`, `ImportKBLI`, `KBLIMapping`, Document Generators.

**6. Capital** (9 fields)
- *Field*: `originalTotalShares`, `originalAuthorizedShares`, `originalSharePrice`, `originalCapitalBase`, `originalCapitalPaid`, `targetCapitalBase`, `targetCapitalPaid`, `capitalArticleNumber`, `totalShares`.
- *Pemakai*: `App.tsx`, `CompositionEditor`, Document Generators. Digunakan untuk kalkulasi persentase kepemilikan pemegang saham.

**7. Shareholders** (5 fields)
- *Field*: `shareholders`, `finalShareholders`, `shareTransfers`, `shareTransfersNew`, `capitalSubscriptionsNew`.
- *Pemakai*: `App.tsx`, `ShareholderForm`, `CompositionEditor`, `StockTransferEditor`, Document Generators.

**8. Management** (11 fields)
- *Field*: `managementChangeType`, `oldManagementItems`, `newManagementItems`, `managementEffectiveUntil`, `managementDismissals`, `managementAppointments`, dll.
- *Pemakai*: `ManagementEditor`, `App.tsx`, Document Generators.

**9. Meeting & Execution** (15 fields)
- *Field*: `signingPlace`, `signingDate`, `meetingStartTime`, `meetingEndTime`, `meetingChair`, `representativeType`, `authorizedRepresentativeId`, `manualRepresentative`, `guests`, dll.
- *Pemakai*: `MeetingFormShell`, `MeetingAttendanceTable`, Document Generators.

**10. Company Legal History** (13 fields)
- *Field*: `establishmentDeedNumber` s/d `latestAmendmentSkDate`, `amendmentDeeds`.
- *Pemakai*: `App.tsx`, Document Generators.

**11. Notary & Witnesses** (16 fields)
- *Field*: `notaryName`, `draftAktaRupsNumber`, `saksi1Nama`, `saksi2Nama`, dll.
- *Pemakai*: `App.tsx` (Form Notaris/Saksi), Document Generators.

**12. RUPST & Sirkuler Khusus** (40+ fields)
- *Field*: `rupstFiscalYear`, `rupstNetProfit`, `rupstDividends`, `rupstStreet`, `slHari`, dll.
- *Pemakai*: `App.tsx` (Form RUPST), `SirkulerLaporanDocumentPreview`, Generator khusus RUPST.

---

## AUDIT 3: Field yang Saling Bergantung

**Capital Flow:**
`originalSharePrice` & `originalAuthorizedShares` 
&nbsp;&nbsp;↓
`originalCapitalBase` (Derived) 
&nbsp;&nbsp;↓
`targetCapitalBase` (Hanya berubah jika `resolutions.capitalBase` aktif)

`originalSharePrice` & `originalTotalShares`
&nbsp;&nbsp;↓
`originalCapitalPaid` (Derived)
&nbsp;&nbsp;↓
`targetCapitalPaid` (Hanya berubah jika `resolutions.capitalPaid` aktif)

**Address Flow:**
`newAddress` (Object) 
&nbsp;&nbsp;↓
`fullAddress` (Derived String)

`oldAddress` (Object)
&nbsp;&nbsp;↓
`oldFullAddress` (Derived String)

**Shareholder Validation Flow:**
Total Shares dimiliki oleh seluruh entitas dalam `shareholders` wajib sesuai dengan `targetCapitalPaid` / `originalSharePrice`.

---

## AUDIT 4: Dependency Graph Antar Domain

```text
Document Meta (DocumentType)
  │
  ├──► Resolutions (Master Switch untuk Agenda)
  │      │
  │      ├──► Company Identity (Bisa berubah jika companyNameChange)
  │      ├──► Address & Domicile (Bisa berubah jika domicile/address)
  │      ├──► Capital (Bisa berubah jika capitalBase/capitalPaid)
  │      │      │
  │      │      └──► Shareholders (Tergantung total saham dari Capital)
  │      │
  │      ├──► Management (Bisa berubah jika management agenda aktif)
  │      └──► KBLI (Bisa berubah jika kbli agenda aktif)
  │
  ├──► Meeting & Execution (Wajib untuk semua RUPS)
  │      ├──► Meeting Representation (Siapa yang hadir mewakili Shareholder)
  │      └──► Witnesses (Saksi-saksi rapat/akta)
  │
  └──► RUPST Domain (Hanya aktif jika DocumentType = RUPST/Sirkuler Laporan)
         └── Menggunakan Company Identity, tapi bypass sebagian besar Resolutions
```

---

## AUDIT 5: Klasifikasi Domain

Berdasarkan fungsi dan lokasinya, berikut adalah klasifikasi akhir untuk memandu *refactor*:

1. **Core Domain** (Esensi data perseroan murni)
   - Company Identity
   - Resolutions
   - Capital
   - Shareholders
   - Management
   - KBLI

2. **Supporting Domain** (Infrastruktur legal & eksekusi)
   - Meeting & Execution
   - Company Legal History
   - Address & Domicile (Bisa jadi Core, tapi formatnya sangat terkait notarial)
   - Notary & Witnesses

3. **Shared / Meta Domain** (Sistem & Navigasi)
   - Document Meta (`id`, `updatedAt`, `documentType`, `documentStatus`)

4. **UI-only / Raw Input**
   - Field seperti `rupstStreet`, `rupstRt`, `rupstRw`, `rupstKelurahan`, `rupstKecamatan`. Ini sebenarnya tidak perlu masuk ke root `CompanyData` jika hanya untuk di-concat menjadi `fullAddress`.
   - `oldAddress` dan `newAddress` object (karena yang dipakai oleh generator sebenarnya adalah versi string `fullAddress` dan `oldFullAddress`).

5. **Derived Data** (Harusnya tidak ada di dalam state persisten, cukup dikomputasi on-the-fly)
   - `originalCapitalBase`
   - `originalCapitalPaid`
   - `targetCapitalBase` (jika tidak berubah)
   - `targetCapitalPaid` (jika tidak berubah)
   - `fullAddress`
   - `oldFullAddress`
