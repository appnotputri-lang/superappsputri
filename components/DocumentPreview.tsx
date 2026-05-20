import React from 'react';
import { CompanyData, Address } from '../types';
import { 
  formatCurrency, 
  numberToWords, 
  formatDateIndo, 
  getDayNameIndo,
  getDayIndo, 
  getMonthIndo, 
  getYearIndo,
  toTitleCase,
  formatAddress
} from '../utils/formatters';

interface Props {
  data: CompanyData;
  showHeader?: boolean;
  zoom?: number;
}

const DocumentPreview: React.FC<Props> = ({ data, showHeader = true, zoom = 1 }) => {
  const isCircular = data.documentType === 'CIRCULAR';
  const companyName = (data.companyName || '').toUpperCase();

  const formatInputNumber = (val: number) => (val || 0).toLocaleString("id-ID");
  const formatRpDot = (val: number) => formatCurrency(val).replace('Rp ', 'Rp. ');

  const getResolutionSummary = () => {
    const agendaOrder = [
      'companyNameChange', 'domicile', 'address', 'kbli', 'capitalBase', 'capitalPaid',
      'capitalBaseDecrease', 'capitalPaidDecrease', 'shareholders', 'management', 'reappointment',
    ] as const;
    const active = agendaOrder
      .filter((k) => data.resolutions[k as keyof typeof data.resolutions])
      .map((k) => {
        switch (k) {
          case 'companyNameChange': return 'perubahan nama perseroan';
          case 'domicile': return 'perubahan kedudukan';
          case 'address': return 'perubahan alamat';
          case 'kbli': return 'perubahan KBLI';
          case 'capitalBase': return 'peningkatan modal dasar';
          case 'capitalPaid': return 'peningkatan modal disetor';
          case 'capitalBaseDecrease': return 'penurunan modal dasar';
          case 'capitalPaidDecrease': return 'penurunan modal disetor';
          case 'shareholders': return 'perubahan struktur pemegang saham';
          case 'management': return 'perubahan susunan pengurus';
          case 'reappointment': return 'pengangkatan kembali pengurus';
          default: return '';
        }
      }).filter(Boolean);
    if (active.length === 0) return 'perubahan';
    if (active.length === 1) return active[0];
    const last = active.pop();
    return `${active.join(", ")} dan ${last}`;
  };

  const getNationalityStr = (sh: { nationalityType?: string; nationality?: string }) => {
    if (sh.nationalityType === 'WNA') return `Warga Negara ${sh.nationality || '................'}`;
    return sh.nationality || 'WNI';
  };

  const getIdentificationStr = (sh: {
    nationalityType?: string; passportNumber?: string;
    hasKitas?: boolean; kitasNumber?: string; kitasType?: string; nik?: string;
  }) => {
    if (sh.nationalityType === 'WNA') {
      let idStr = `pemegang Passport No ${sh.passportNumber || '................'}`;
      if (sh.hasKitas && sh.kitasNumber) {
        idStr += `, pemegang ${sh.kitasType || 'KITAS/KITAP'} No ${sh.kitasNumber}`;
      }
      return idStr;
    }
    return `pemegang KTP No ${sh.nik || '................'}`;
  };

  const formatFullAddressPreview = (addr?: Address): string => {
    if (!addr || !addr.fullAddress) return '................';
    const isRegency = addr.city?.toLowerCase().includes('kabupaten');
    const villagePrefix = isRegency ? 'Desa' : 'Kelurahan';
    const parts = [
      formatAddress(toTitleCase(addr.fullAddress)),
      addr.rt && addr.rw ? `RT. ${addr.rt} RW. ${addr.rw}` : '',
      addr.kelurahan ? `${villagePrefix} ${toTitleCase(addr.kelurahan)}` : '',
      addr.kecamatan ? `Kecamatan ${toTitleCase(addr.kecamatan)}` : '',
      addr.city ? toTitleCase(addr.city) : '',
      addr.province ? toTitleCase(addr.province) : '',
    ].filter(Boolean);
    return parts.join(', ');
  };

  const getAddressStr = (sh: { address?: Address }) =>
    `bertempat tinggal di ${formatFullAddressPreview(sh.address)}`;

  const getOccupationStr = (sh: { nationalityType?: string; occupation?: string }) => {
    if (sh.nationalityType === 'WNA') return '';
    return `${toTitleCase(sh.occupation || '................')}, `;
  };

  const attendingShareholders = isCircular
    ? data.shareholders.filter((sh) => (sh.sharesOwned || 0) > 0)
    : data.shareholders.filter((sh) => (sh.sharesOwned || 0) > 0 && sh.isPresent);
  const totalIssuedShares = data.shareholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const presentShares = attendingShareholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const attendingPercentage = totalIssuedShares > 0 ? (presentShares / totalIssuedShares) * 100 : 0;

  const totalValue = presentShares * (data.originalSharePrice || 0);

  const PARA_SPACING = '6pt';
  const LINE_HEIGHT = '1.15';

  // State / Index for Resolutions numbering
  let resolutionIdx = 1;
  const renderResolutionTitle = (title: string) => {
    const num = resolutionIdx++;
    return (
      <div style={{ fontWeight: 'bold', display: 'flex', marginTop: '12pt', marginBottom: '6pt', paddingLeft: '0.3in', textIndent: '-0.3in', textAlign: 'justify' }}>
        <span style={{ minWidth: '0.3in', display: 'inline-block' }}>{num}.&nbsp;&nbsp;</span>
        <span style={{ flex: 1 }}>{title}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-slate-200/50 py-12 px-4 shadow-inner">
      <div 
        className="preview-container bg-white shadow-[0_0_50px_rgba(0,0,0,0.15)] relative print:shadow-none paper-font"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '25.4mm', 
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '12pt',
          lineHeight: LINE_HEIGHT, 
          color: '#1a1a1a',
          boxSizing: 'border-box',
          zoom: zoom,
          marginBottom: '4rem',
          background: `
            linear-gradient(white 296.8mm, #cbd5e1 296.8mm, #cbd5e1 297mm, #f1f5f9 297mm, #f1f5f9 297.2mm, white 297.2mm) 0 0 / 100% 297.2mm,
            white
          `,
          boxShadow: '0 0 50px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1)'
        } as React.CSSProperties}
      >
        {/* Page numbers reference */}
        <div className="absolute top-0 right-0 bottom-0 pointer-events-none no-print">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
            <div key={p} className="absolute text-[10px] text-slate-300 font-mono pr-2" style={{ top: `calc(${p} * 297mm - 1.5rem)`, right: '0.5rem' }}>
              PAGE {p}
            </div>
          ))}
        </div>

        {/* ── HEADER ──────────────────────────────────────────────────────────────── */}
        {showHeader && (
          <div style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24pt' }}>
            {isCircular ? 'KEPUTUSAN PARA PEMEGANG SAHAM SEBAGAI PENGGANTI' : 'NOTULEN'}<br />
            RAPAT UMUM PEMEGANG SAHAM LUAR BIASA<br />
            <span style={{ textDecoration: 'underline' }}>PT {companyName}</span>
          </div>
        )}

        {/* ── PREAMBLE FOR CIRCULAR / SECTION I. RAPAT ────────────────────────────── */}
        {isCircular ? (
          <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
            Kami yang bertandatangan dibawah ini, para Pemegang Saham PT {companyName}, berkedudukan di {data.domicile || '................'} (“Perseroan”), terdiri dari:
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '6pt', textTransform: 'uppercase', textAlign: 'left' }}>I. RAPAT</div>
            
            <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
              Rapat Umum Pemegang Saham Luar Biasa “<strong>PT. {companyName}</strong>“ (selanjutnya disebut sebagai “<strong>Rapat</strong>”) perseroan yang berkedudukan di {data.domicile || '................'}, demikian berdasarkan Akta Pendirian tertanggal <strong>{formatDateIndo(data.establishmentDeedDate) || '..........'}</strong>, No. <strong>{data.establishmentDeedNumber || '..........'}</strong>, yang dibuat dihadapan <strong>{data.establishmentNotary || '..........'}{data.establishmentNotaryTitle ? `, ${data.establishmentNotaryTitle}` : ''}</strong>, Notaris di Kabupaten Bandung Barat dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal <strong>{formatDateIndo(data.establishmentSkDate) || '..........'}</strong>, Nomor <strong>{data.establishmentSkNumber || '..........'}</strong>
              {(!data.amendmentDeeds || data.amendmentDeeds.length === 0) ? '.' : (data.amendmentDeeds.length === 1 ? ' telah mengalami perubahan, berdasarkan :' : ' beberapa kali telah mengalami perubahan, berdasarkan :')}
            </div>

            {data.amendmentDeeds && data.amendmentDeeds.length > 0 && data.amendmentDeeds.map((deed, dIdx) => {
              const skSpParts = (deed.skSpDocuments || []).map((doc: any, sIdx: number) =>
                `${sIdx === 0 ? 'dan ' : ', serta '}${doc.type === 'SK' ? 'telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ' : 'telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal '} ${formatDateIndo(doc.date) || '..........'} Nomor ${doc.number || '..........'}`
              ).join('');

              return (
                <div key={dIdx} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.3in', textIndent: '-0.3in', textAlign: 'justify', marginBottom: PARA_SPACING }}>
                  <span style={{ minWidth: '0.3in' }}>-&nbsp;</span>
                  <span style={{ flex: 1 }}>
                    Akta Pernyataan Keputusan Rapat Umum Para Pemegang Saham Luar Biasa tertanggal {formatDateIndo(deed.date) || '..........'} Nomor {deed.number || '..........'}, yang dibuat di hadapan {deed.notary || '..........'}{deed.notaryTitle ? `, ${deed.notaryTitle}` : ''}, Notaris di {deed.notaryDomicile || data.domicile || '..........'} {skSpParts}
                  </span>
                </div>
              );
            })}

            <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
              Rapat ini diselenggarakan berdasarkan Surat Undangan Direksi PT. {companyName} Nomor : {data.invitationNumber || '................'} tanggal {formatDateIndo(data.invitationDate) || '................'}, dan diadakan pada {getDayNameIndo(data.signingDate)} tanggal, {formatDateIndo(data.signingDate) || '................'} bertempat di {data.signingPlace || '................'}, pukul {data.meetingStartTime ? data.meetingStartTime.replace(':', '.') : '09.00'} WIB.
            </div>

            {/* Section II. PESERTA RAPAT */}
            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: '6pt', textTransform: 'uppercase', textAlign: 'left' }}>II. PESERTA RAPAT</div>
            <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
              Rapat tersebut dihadiri oleh:
            </div>
          </>
        )}

        {/* ── ATTENDING SHAREHOLDERS LIST ────────────────────────────────────────── */}
        {(() => {
          return attendingShareholders.map((sh, idx) => {
            let shLetterCode = 97; // 'a' ASCII code for continuous sub bullet numbering in Notulen
            const getNextShLetter = () => {
              const char = String.fromCharCode(shLetterCode);
              shLetterCode++;
              return char;
            };

            const currentValue = sh.sharesOwned * (data.originalSharePrice || 0);

            if (isCircular) {
              return (
                <div key={sh.id} style={{ marginBottom: '12pt' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.3in', textIndent: '-0.3in', textAlign: 'justify' }}>
                    <span style={{ minWidth: '0.3in' }}>-&nbsp;</span>
                    <span style={{ flex: 1 }}>
                      {sh.salutation} <strong>{(sh.name || '................').toUpperCase()}</strong>, lahir di {toTitleCase(sh.birthCity || '................')}, pada tanggal {getDayIndo(sh.birthDate) || '..'} {getMonthIndo(sh.birthDate) || '........'} {getYearIndo(sh.birthDate) || '....'}, {getNationalityStr(sh)}, {getOccupationStr(sh)}{getAddressStr(sh)}, {getIdentificationStr(sh)};
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.5in', textIndent: '-0.2in', marginTop: '2pt', textAlign: 'justify' }}>
                    <span style={{ minWidth: '0.2in' }}>-&nbsp;</span>
                    <span style={{ flex: 1 }}>
                      Selaku pemilik dan pemegang <strong>{sh.sharesOwned.toLocaleString('id-ID')}</strong> ({numberToWords(sh.sharesOwned)}) lembar saham atau senilai <strong>{formatRpDot(currentValue)}</strong> ({numberToWords(currentValue)} rupiah).
                    </span>
                  </div>
                </div>
              );
            } else {
              // Notulen (decimal list with sub-letters)
              return (
                <div key={sh.id} style={{ marginBottom: '12pt' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.3in', textIndent: '-0.3in', textAlign: 'justify' }}>
                    <span style={{ minWidth: '0.3in' }}>{idx + 1}.&nbsp;</span>
                    <span style={{ flex: 1 }}>
                      {sh.salutation} <strong>{(sh.name || '................').toUpperCase()}</strong>, lahir di {toTitleCase(sh.birthCity || '................')}, pada tanggal {getDayIndo(sh.birthDate) || '..'} {getMonthIndo(sh.birthDate) || '........'} {getYearIndo(sh.birthDate) || '....'}, {getNationalityStr(sh)}, {getOccupationStr(sh)}{getAddressStr(sh)}, {getIdentificationStr(sh)};
                    </span>
                  </div>
                  
                  {/* - Dalam hal ini hadir selaku */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.5in', textIndent: '-0.2in', marginTop: '2pt', textAlign: 'justify' }}>
                    <span style={{ minWidth: '0.2in' }}>-&nbsp;</span>
                    <span style={{ flex: 1 }}>Dalam hal ini hadir selaku :</span>
                  </div>

                  {/* Lettered sub items continues */}
                  {sh.isManagement && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.7in', textIndent: '-0.2in', marginTop: '2pt', textAlign: 'justify' }}>
                      <span style={{ minWidth: '0.2in' }}>{getNextShLetter()}.&nbsp;</span>
                      <span style={{ flex: 1 }}>
                        {toTitleCase(sh.managementPosition || "Direktur")} Perseroan; dan
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.7in', textIndent: '-0.2in', marginTop: '2pt', textAlign: 'justify' }}>
                    <span style={{ minWidth: '0.2in' }}>{getNextShLetter()}.&nbsp;</span>
                    <span style={{ flex: 1 }}>
                      Pemilik dan pemegang saham sebanyak <strong>{sh.sharesOwned.toLocaleString('id-ID')}</strong> ({numberToWords(sh.sharesOwned)}) lembar saham atau senilai <strong>{formatRpDot(currentValue)}</strong> ({numberToWords(currentValue)} rupiah) berhak mengeluarkan suara <strong>{sh.sharesOwned.toLocaleString('id-ID')}</strong> ({numberToWords(sh.sharesOwned)}) suara dalam rapat.
                    </span>
                  </div>
                </div>
              );
            }
          });
        })()}

        {/* ── REKAPITULASI SAHAM HADIR ───────────────────────────────────────────── */}
        <div style={{ marginTop: '12pt', textAlign: 'justify', marginBottom: PARA_SPACING }}>
          {isCircular ? (
            <>Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak </>
          ) : (
            <>Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak {totalIssuedShares.toLocaleString('id-ID')} ({numberToWords(totalIssuedShares)}) lembar saham, telah hadir dan/atau diwakili dalam rapat ini sebanyak </>
          )}
          <strong>{presentShares.toLocaleString('id-ID')}</strong> ({numberToWords(presentShares)}) lembar saham atau senilai <strong>{formatRpDot(totalValue)}</strong> ({numberToWords(totalValue)} rupiah)
          {!isCircular && (
            <> atau setara dengan {attendingPercentage === 100 ? '100%' : `${attendingPercentage.toFixed(2)}%`} dari seluruh saham yang telah dikeluarkan oleh Perseroan</>
          )}
          .
        </div>

        {/* ── "Para Pemegang Saham" bullet ───────────────────────────────────────── */}
        <div style={{ textAlign: 'justify', display: 'flex', alignItems: 'flex-start', marginTop: '6pt', paddingLeft: '0.2in', textIndent: '-0.2in', marginBottom: '18pt' }}>
          <span style={{ minWidth: '0.2in' }}>-&nbsp;</span>
          <span style={{ flex: 1 }}>Untuk selanjutnya secara bersama-sama disebut sebagai <strong>“Para Pemegang Saham”</strong></span>
        </div>

        {/* ── CIRCULAR ADDITIONAL PREAMBLE OR NOTULEN SECTIONS ─────────────────── */}
        {isCircular ? (
          <>
            <div style={{ textTransform: 'uppercase', fontWeight: 'bold', marginTop: '12pt', marginBottom: PARA_SPACING }}>
              DENGAN INI MENYATAKAN, bahwa Para Pemegang Saham telah mengetahui mengenai :
            </div>
            
            <div style={{ paddingLeft: '0.3in', textIndent: '-0.3in', textAlign: 'justify', marginBottom: PARA_SPACING }}>
              <span style={{ minWidth: '0.3in', display: 'inline-block' }}>1.&nbsp;&nbsp;</span>
              <span>Bahwa sampai saat ini jumlah saham yang telah ditempatkan dan disetor penuh dalam perseroan sebanyak {data.originalTotalShares.toLocaleString('id-ID')} ({numberToWords(data.originalTotalShares)}) lembar saham;</span>
            </div>
            <div style={{ paddingLeft: '0.3in', textIndent: '-0.3in', textAlign: 'justify', marginBottom: PARA_SPACING }}>
              <span style={{ minWidth: '0.3in', display: 'inline-block' }}>2.&nbsp;&nbsp;</span>
              <span>Bahwa sesuai dengan ketentuan Pasal 91 Undang-Undang No. 40 Tahun 2007 tentang Perseroan Terbatas, pemegang saham dapat mengambil keputusan yang mengikat di luar Rapat Umum Pemegang Saham dengan syarat semua pemegang saham dengan hak suara menyetujui secara tertulis dengan menandatangani usul yang bersangkutan;</span>
            </div>
            <div style={{ paddingLeft: '0.3in', textIndent: '-0.3in', textAlign: 'justify', marginBottom: '18pt' }}>
              <span style={{ minWidth: '0.3in', display: 'inline-block' }}>3.&nbsp;&nbsp;</span>
              <span>Bahwa maksud dari Keputusan Sirkuler Para Pemegang Saham ini adalah untuk {getResolutionSummary()} Perseroan.</span>
            </div>

            <div style={{ textAlign: 'justify', marginTop: '12pt', marginBottom: '12pt' }}>
              <strong>OLEH KARENA ITU,</strong> para pemegang saham secara bersama-sama setuju dan memutuskan hal-hal sebagai berikut:
            </div>
          </>
        ) : (
          <>
            {/* III. KETUA RAPAT */}
            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: '6pt', textTransform: 'uppercase', textAlign: 'left' }}>III. KETUA RAPAT</div>
            <div style={{ textAlign: 'justify', marginBottom: '12pt' }}>
              Berdasarkan ketentuan pasal 21 ayat (1) anggaran dasar perseroan, maka <strong>{(data.meetingChair || '................').toUpperCase()}</strong>, tersebut di atas, bertindak sebagai ketua rapat.
            </div>

            {/* IV. AGENDA RAPAT */}
            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: '6pt', textTransform: 'uppercase', textAlign: 'left' }}>IV. AGENDA RAPAT</div>
            <div style={{ textAlign: 'justify', marginBottom: '6pt' }}>
              Rapat ini diadakan dengan agenda rapat sebagai berikut :
            </div>

            {(() => {
              const agendaOrder = [
                "companyNameChange", "domicile", "address", "kbli",
                "capitalBase", "capitalPaid", "capitalBaseDecrease", "capitalPaidDecrease",
                "shareholders", "management", "reappointment"
              ];
              const agendaItems = agendaOrder
                .filter(k => data.resolutions[k as keyof typeof data.resolutions])
                .map(k => {
                  switch(k) {
                    case "companyNameChange":    return "Persetujuan Perubahan Nama Perseroan;";
                    case "domicile":             return "Persetujuan Perubahan Tempat Kedudukan Perseroan;";
                    case "address":              return "Persetujuan Perubahan Alamat Lengkap Perseroan;";
                    case "kbli":                 return "Persetujuan Perubahan Maksud dan Tujuan (KBLI) Perseroan;";
                    case "capitalBase":          return "Persetujuan Peningkatan Modal Dasar Perseroan;";
                    case "capitalPaid":          return "Persetujuan Peningkatan Modal Ditempatkan dan Disetor Perseroan;";
                    case "capitalBaseDecrease":  return "Persetujuan Penurunan Modal Dasar Perseroan;";
                    case "capitalPaidDecrease":  return "Persetujuan Penurunan Modal Ditempatkan dan Disetor Perseroan;";
                    case "shareholders":         return "Persetujuan Perubahan Susunan Pemegang Saham Perseroan;";
                    case "management":           return "Persetujuan Perubahan Susunan Pengurus Perseroan;";
                    case "reappointment":        return "Persetujuan Pengangkatan Kembali Pengurus Perseroan;";
                    default: return "";
                  }
                })
                .filter(Boolean);

              if (agendaItems.length > 0) {
                return agendaItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.5in', textIndent: '-0.25in', textAlign: 'justify', marginBottom: '4pt' }}>
                    <span style={{ minWidth: '0.25in', fontWeight: 'bold' }}>{idx + 1}.</span>
                    <span style={{ flex: 1 }}>{item}</span>
                  </div>
                ));
              } else {
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.5in', textIndent: '-0.25in', textAlign: 'justify', marginBottom: '4pt' }}>
                    <span style={{ minWidth: '0.25in', fontWeight: 'bold' }}>1.</span>
                    <span style={{ flex: 1 }}>Persetujuan Perubahan Susunan Pengurus Perseroan;</span>
                  </div>
                );
              }
            })()}

            {/* V. JALANNYA RAPAT */}
            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: '6pt', textTransform: 'uppercase', textAlign: 'left' }}>V. JALANNYA RAPAT</div>
            <div style={{ textAlign: 'justify', marginBottom: '6pt' }}>
              Ketua Rapat menyatakan bahwa dalam Rapat ini telah hadir dan/atau diwakili sebanyak {presentShares.toLocaleString("id-ID")} ({numberToWords(presentShares)}) saham yang merupakan {attendingPercentage === 100 ? "seluruh" : `${attendingPercentage.toFixed(2)}%`} dari total seluruh saham yang telah dikeluarkan oleh Perseroan.
            </div>
            <div style={{ textAlign: 'justify', marginBottom: '12pt' }}>
              Oleh karena itu, Ketua Rapat menyatakan Rapat ini sah dan berhak mengambil keputusan yang sah dan mengikat Perseroan mengenai hal-hal yang dibicarakan dalam Rapat.
            </div>
          </>
        )}

        {/* ── VI. KEPUTUSAN-KEPUTUSAN (or KEPUTUSAN-KEPUTUSAN) ───────────────────── */}
        <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: '6pt', textTransform: 'uppercase', textAlign: 'left' }}>
          {isCircular ? 'KEPUTUSAN-KEPUTUSAN' : 'VI. KEPUTUSAN-KEPUTUSAN'}
        </div>
        
        {!isCircular && (
          <div style={{ textAlign: 'justify', marginBottom: '12pt' }}>
            Oleh karena agenda rapat telah diketahui dan dipahami sepenuhnya oleh para hadirin, maka setelah memberikan penjelasan-penjelasan yang diperlukan sehubungan dengan rapat ini, ketua rapat langsung saja mengusulkan kepada rapat untuk mengambil keputusan-keputusan dan selanjutnya, Rapat dengan suara bulat memutuskan dan menetapkan sebagai berikut :
          </div>
        )}

        {/* ── RESOLUTION BODY RENDERING ─────────────────────────────────────────── */}
        <div style={{ marginTop: '12pt' }}>
          
          {/* 1. Perubahan Nama */}
          {data.resolutions.companyNameChange && (
            <>
              {renderResolutionTitle("Persetujuan Perubahan Nama Perseroan")}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                Menyetujui dan memutuskan untuk mengubah nama Perseroan, yang semula bernama : PT {data.companyName.toUpperCase()} menjadi bernama : PT {data.targetCompanyName.toUpperCase()}.
              </div>
            </>
          )}

          {/* 2. Perubahan Kedudukan / Alamat */}
          {(data.resolutions.domicile || data.resolutions.address) && (
            <>
              {renderResolutionTitle("Persetujuan Perubahan Kedudukan/Alamat Perseroan")}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                {data.resolutions.domicile ? (
                  <>Menyetujui dan memutuskan untuk mengubah tempat kedudukan Perseroan, yang semula berkedudukan di {data.oldDomicile || data.domicile || data.oldAddress?.city || ".........."} menjadi berkedudukan di {data.newAddress?.city || "..........."}. </>
                ) : (
                  <>Menyetujui dan memutuskan untuk mengubah alamat lengkap Perseroan, yang semula beralamat di {data.oldAddress?.fullAddress || ".........."} menjadi beralamat di {data.newAddress?.fullAddress || "..........."}.</>
                )}
              </div>
            </>
          )}

          {/* 3. Perubahan KBLI */}
          {data.resolutions.kbli && (
            <>
              {renderResolutionTitle("Persetujuan Perubahan Maksud dan Tujuan Perseroan")}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 3 ayat (1) dan ayat (2) Anggaran Dasar Perseroan mengenai Maksud dan Tujuan serta Kegiatan Usaha, sehingga selanjutnya menjadi berbunyi sebagai berikut :
              </div>

              {/* 1) */}
              <div style={{ textAlign: 'justify', paddingLeft: '0.6in', textIndent: '-0.3in', marginBottom: PARA_SPACING }}>
                <span style={{ fontWeight: 'bold' }}>1)&nbsp;&nbsp;</span>
                <span>Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :</span>
              </div>

              {/* Categories list */}
              {(() => {
                const categories = Array.from(new Set((data.kbliItems || []).map((k: any) => k.categoryName))).filter(Boolean) as string[];
                return categories.map((cat, cIdx) => (
                  <div key={cIdx} style={{ textAlign: 'justify', paddingLeft: '0.8in', textIndent: '-0.2in', marginBottom: '4pt' }}>
                    <span>-&nbsp;&nbsp;</span>
                    <span>{cat.toUpperCase()}</span>
                  </div>
                ));
              })()}

              {/* 2) */}
              <div style={{ textAlign: 'justify', paddingLeft: '0.6in', textIndent: '-0.3in', marginTop: '6pt', marginBottom: PARA_SPACING }}>
                <span style={{ fontWeight: 'bold' }}>2)&nbsp;&nbsp;</span>
                <span>Untuk mencapai maksud dan tujuan tersebut diatas, perseroan dapat melaksanakan kegiatan usaha sebagai berikut :</span>
              </div>

              {/* KBLI items */}
              {(data.kbliItems || []).map((kbli, kIdx) => (
                <div key={kIdx} style={{ marginBottom: PARA_SPACING }}>
                  <div style={{ textAlign: 'justify', paddingLeft: '0.8in', textIndent: '-0.2in', marginBottom: '2pt' }}>
                    <span>-&nbsp;&nbsp;</span>
                    <strong>{kbli.code} - {kbli.name};</strong>
                  </div>
                  {kbli.description && (
                    <div style={{ textAlign: 'justify', paddingLeft: '1.0in', marginBottom: '4pt' }}>
                      {kbli.description}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* 4. Modal Dasar */}
          {(data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) && (
            <>
              {renderResolutionTitle(
                data.resolutions.capitalBaseDecrease ? "Persetujuan Penurunan Modal Dasar Perseroan" : "Persetujuan Peningkatan Modal Dasar Perseroan"
              )}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                Menyetujui untuk {data.resolutions.capitalBaseDecrease ? "menurunkan" : "meningkatkan"} Modal Dasar Perseroan, yang semula sebesar Rp. {formatInputNumber(data.originalCapitalBase)},- ({numberToWords(data.originalCapitalBase)} rupiah) terbagi atas {formatInputNumber(data.originalAuthorizedShares)} ({numberToWords(data.originalAuthorizedShares)}) lembar saham, masing-masing saham bernilai nominal Rp. {formatInputNumber(data.originalSharePrice)},- ({numberToWords(data.originalSharePrice)} rupiah), menjadi sebesar Rp. {formatInputNumber(data.targetCapitalBase)},- ({numberToWords(data.targetCapitalBase)} rupiah) terbagi atas {formatInputNumber(data.targetCapitalBase / (data.originalSharePrice || 1))} ({numberToWords(data.targetCapitalBase / (data.originalSharePrice || 1))}) lembar saham, masing-masing saham bernilai nominal Rp. {formatInputNumber(data.originalSharePrice)},- ({numberToWords(data.originalSharePrice)} rupiah).
              </div>
            </>
          )}

          {/* 5. Modal Ditempatkan & Disetor */}
          {(data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) && (
            <>
              {renderResolutionTitle(
                data.resolutions.capitalPaidDecrease ? "Persetujuan Penurunan Modal Ditempatkan dan Disetor Perseroan" : "Persetujuan Peningkatan Modal Ditempatkan dan Disetor Perseroan"
              )}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                Menyetujui untuk {data.resolutions.capitalPaidDecrease ? "menurunkan" : "meningkatkan"} Modal Ditempatkan dan Disetor dalam Perseroan, yang semula sebesar Rp. {formatInputNumber(data.originalCapitalPaid)},- ({numberToWords(data.originalCapitalPaid)} rupiah) yang terbagi menjadi sejumlah {formatInputNumber(data.originalTotalShares)} ({numberToWords(data.originalTotalShares)}) lembar saham, menjadi sebesar Rp. {formatInputNumber(data.targetCapitalPaid)},- ({numberToWords(data.targetCapitalPaid)} rupiah) yang terbagi menjadi sejumlah {formatInputNumber(data.targetCapitalPaid / (data.originalSharePrice || 1))} ({numberToWords(data.targetCapitalPaid / (data.originalSharePrice || 1))}) lembar saham.
              </div>
              {data.resolutions.capitalPaid && (
                <>
                  <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginTop: '6pt', marginBottom: PARA_SPACING }}>
                    Bahwa pengeluaran saham-saham baru tersebut di atas, telah diambil bagian dan disetor penuh secara tunai melalui kas Perseroan oleh masing - masing pemegang saham dengan rincian sebagai berikut :
                  </div>
                  {data.finalShareholders
                    .filter((fs) => fs.isNewDeposit && fs.newDepositShares && fs.newDepositShares > 0)
                    .map((fs, fIdx) => {
                      const addedShares = fs.newDepositShares!;
                      const addedValue = addedShares * (data.originalSharePrice || 0);
                      return (
                        <div key={fIdx} style={{ textAlign: 'justify', paddingLeft: '0.5in', textIndent: '-0.2in', marginBottom: PARA_SPACING }}>
                          <span>-&nbsp;&nbsp;</span>
                          <strong>{fs.name.toUpperCase()}</strong> : {formatInputNumber(addedShares)} ({numberToWords(addedShares)}) lembar saham atau senilai Rp. {formatInputNumber(addedValue)},- ({numberToWords(addedValue)} rupiah);
                        </div>
                      );
                    })}
                </>
              )}
            </>
          )}

          {/* 6. Hibah / Jual Beli Saham */}
          {data.resolutions.shareholders && data.shareTransfers && data.shareTransfers.length > 0 && (
            <>
              {(() => {
                const isHibahTotal = data.shareTransfers.every((t) => t.type === "Hibah");
                const hasHibah = data.shareTransfers.some((t) => t.type === "Hibah");
                const hasJualBeli = data.shareTransfers.some((t) => t.type === "Jual Beli");
                let resTitle = "Persetujuan Penjualan dan Pengalihan Saham";
                if (isHibahTotal) resTitle = "Persetujuan Hibah Saham";
                else if (hasHibah && hasJualBeli) resTitle = "Persetujuan Hibah dan Penjualan Saham";
                return renderResolutionTitle(resTitle);
              })()}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                Menyetujui pengalihan seluruh saham secara hibah/jual beli dengan rincian sebagai berikut :
              </div>
              {data.shareTransfers.map((t, idx) => {
                const fromSh = data.shareholders.find((s) => s.id === t.fromShareholderId);
                const toSh = data.shareholders.find((s) => s.id === t.toShareholderId) || data.finalShareholders.find((s) => s.id === t.toShareholderId);
                if (fromSh && toSh) {
                  return (
                    <div key={idx} style={{ textAlign: 'justify', paddingLeft: '0.5in', textIndent: '-0.2in', marginBottom: PARA_SPACING }}>
                      <span>-&nbsp;&nbsp;</span>
                      <strong>{fromSh.name.toUpperCase()}</strong> mengalihkan sejumlah {t.sharesTransferred.toLocaleString("id-ID")} ({numberToWords(t.sharesTransferred)}) saham perseroan atau senilai Rp. {formatInputNumber(t.sharesTransferred * data.originalSharePrice)},- ({numberToWords(t.sharesTransferred * data.originalSharePrice)} rupiah) kepada <strong>{toSh.name.toUpperCase()}</strong>;
                    </div>
                  );
                }
                return null;
              })}
            </>
          )}

          {/* 7. Susunan Pemegang Saham */}
          {(data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease || data.resolutions.shareholders) && (
            <>
              {renderResolutionTitle("Persetujuan Susunan Pemegang Saham")}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                Sehingga merubah susunan pemegang saham perseroan menjadi sebagai berikut :
              </div>
              {data.finalShareholders.filter((s) => s.sharesOwned > 0).map((s, idx) => {
                const currentValue = s.sharesOwned * (data.originalSharePrice || 0);
                return (
                  <div key={idx} style={{ textAlign: 'justify', paddingLeft: '0.5in', textIndent: '-0.2in', marginBottom: PARA_SPACING }}>
                    <span>-&nbsp;&nbsp;</span>
                    <strong>{s.name.toUpperCase()}</strong> : {s.sharesOwned.toLocaleString("id-ID")} ({numberToWords(s.sharesOwned)}) lembar saham atau senilai <strong>{formatRpDot(currentValue)}</strong> ({numberToWords(currentValue)} rupiah);
                  </div>
                );
              })}
            </>
          )}

          {/* 8. Perubahan / Pengangkatan Dewan Komisaris & Direksi */}
          {(data.resolutions.management || data.resolutions.reappointment) && (
            <>
              {renderResolutionTitle("Persetujuan Perubahan/Pengangkatan Pengurus")}
              <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                Menyetujui untuk memberhentikan dengan hormat seluruh anggota Direksi dan Dewan Komisaris Perseroan yang menjabat saat ini, yaitu :
              </div>
              {(() => {
                const oldManagers = [
                  ...data.shareholders.filter((s) => s.isManagement).map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
                  ...(data.oldManagementItems || []),
                ];
                const newManagers = [
                  ...(data.finalShareholders && data.finalShareholders.length > 0 ? data.finalShareholders : data.shareholders)
                    .filter((s) => s.isManagement)
                    .map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
                  ...(data.newManagementItems || []),
                ];
                return (
                  <>
                    {oldManagers.map((m, mIdx) => (
                      <div key={mIdx} style={{ textAlign: 'justify', paddingLeft: '0.5in', textIndent: '-0.2in', marginBottom: '2pt' }}>
                        <span>-&nbsp;&nbsp;</span>
                        <strong>{m.name.toUpperCase()}</strong>, selaku {m.position} perseroan;
                      </div>
                    ))}
                    <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginTop: '6pt', marginBottom: PARA_SPACING }}>
                      Dengan ucapan terima kasih atas jasa-jasa dan pengabdian yang telah diberikan selama masa jabatannya dalam Perseroan, serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) atas tindakan pengurusan dan pengawasan yang telah dijalankan, sepanjang tindakan-tindakan tersebut tercermin dalam buku-buku serta laporan tahunan Perseroan.
                    </div>
                    <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginTop: '6pt', marginBottom: PARA_SPACING }}>
                      Selanjutnya menyetujui untuk mengangkat nama-nama tersebut di bawah ini sebagai anggota Direksi dan Dewan Komisaris Perseroan yang baru :
                    </div>
                    {newManagers.map((m, mIdx) => (
                      <div key={mIdx} style={{ textAlign: 'justify', paddingLeft: '0.5in', textIndent: '-0.2in', marginBottom: '2pt' }}>
                        <span>-&nbsp;&nbsp;</span>
                        <strong>{m.name.toUpperCase()}</strong>, sebagai {toTitleCase(m.position)} perseroan;
                      </div>
                    ))}
                  </>
                );
              })()}
            </>
          )}

          {/* 9. Pemberian Kuasa */}
          {(() => {
            let repText = "................";
            if (data.representativeType === "EXISTING") {
              const allReps = [...data.shareholders, ...data.finalShareholders];
              const rep = allReps.find((s) => s.id === data.authorizedRepresentativeId);
              repText = `${rep?.salutation || "................"} ${(rep?.name || "................").toUpperCase()}`;
            } else {
              const rep = data.manualRepresentative;
              if (rep) {
                const birthStr = `lahir di ${toTitleCase(rep.birthCity || "................")}, pada tanggal ${getDayIndo(rep.birthDate) || ".."} ${getMonthIndo(rep.birthDate) || "........"} ${getYearIndo(rep.birthDate) || "...."}`;
                repText = `${rep.salutation} ${rep.name.toUpperCase() || "................"}, ${birthStr}, ${getNationalityStr(rep)}, ${getOccupationStr(rep)}${getAddressStr(rep)}, ${getIdentificationStr(rep)}`;
              }
            }
            return (
              <>
                {renderResolutionTitle("Pemberian Kuasa")}
                <div style={{ textAlign: 'justify', paddingLeft: '0.3in', marginBottom: PARA_SPACING }}>
                  Menyetujui dan memutuskan untuk memberikan kuasa dengan hak substitusi kepada <strong>{repText}</strong>, untuk melakukan tindakan-tindakan yang diperlukan sehubungan dengan keputusan Rapat di atas, termasuk memberi keterangan-keterangan, membuat, minta dibuatkan dan menandatangani segala surat dan akta dihadapan Notaris dan umumnya menjalankan segala tindakan yang dianggap perlu dan berguna, tidak ada tindakan yang dikecualikan.
                </div>
              </>
            );
          })()}

        </div>

        {/* ── PENUTUP ────────────────────────────────────────────────────────────── */}
        <div style={{ fontWeight: 'bold', marginTop: '30pt', marginBottom: '6pt', textTransform: 'uppercase', textAlign: 'left' }}>
          {isCircular ? '' : 'VII. '}PENUTUP
        </div>

        <div style={{ textAlign: 'justify', marginBottom: '30pt' }}>
          {isCircular ? (
            <>Demikianlah keputusan para pemegang saham di luar rapat ini dibuat berdasarkan ketentuan pasal 91 Undang-Undang nomor 40 tahun 2007 tentang Perseroan Terbatas, mempunyai kekuatan yang sama yang diambil dengan sah dalam RUPS dan ditandatangani dengan sebenar-benarnya pada hari dan tanggal dimaksud pada keputusan diatas.</>
          ) : (
            <>Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam <strong>{data.meetingEndTime || '11:00'}</strong> WIB.</>
          )}
        </div>

        {/* ── SIGNATURES ─────────────────────────────────────────────────────────── */}
        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginTop: '48pt', marginBottom: '12pt', textAlign: 'left' }}>
          TANDA TANGAN PARA PEMEGANG SAHAM,
        </div>

        {data.shareholders
          .filter((sh) => sh.sharesOwned > 0)
          .map((sh, idx) => (
            <div key={sh.id} style={{ marginBottom: '24pt', textAlign: 'left' }}>
              {idx === 0 && (
                <div style={{ color: '#bfbfbf', fontSize: '8pt', textTransform: 'uppercase', marginBottom: '12pt' }}>Meterai 10.000 + Cap</div>
              )}
              <div style={{ fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', marginTop: idx > 0 ? '30pt' : '0' }}>
                {(sh.name || "................").toUpperCase()}
              </div>
              <div style={{ fontSize: '10pt', marginTop: '4pt' }}>Tanggal : ............................</div>
            </div>
          ))}

        {/* Footer indication */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-slate-300 text-[8pt] select-none uppercase tracking-widest no-print">
          - Draft Generated via LegalDraft -
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
