
import React from 'react';
import { CompanyData, Shareholder, Address, ManagementItem } from '../types';
import { 
  formatCurrency, 
  numberToWords, 
  formatDateIndo, 
  getDayNameIndo,
  getDayIndo, 
  getMonthIndo, 
  getYearIndo,
  toTitleCase 
} from '../utils/formatters';

interface Props {
  data: CompanyData;
  showHeader?: boolean;
  zoom?: number;
}

const DocumentPreview: React.FC<Props> = ({ data, showHeader = true, zoom = 1 }) => {
  const isCircular = data.documentType === 'CIRCULAR';
  
  let resolutionCounter = 0;
  const getNextNum = () => ++resolutionCounter;

  const wrapTerbilang = (val: number) => `(${numberToWords(val)})`;
  const formatRpDot = (val: number) => formatCurrency(val).replace('Rp ', 'Rp. ');

  const getResolutionSummary = () => {
    const agendaOrder = [
      'companyNameChange',
      'domicile',
      'address',
      'kbli',
      'capitalBase',
      'capitalPaid',
      'capitalBaseDecrease',
      'capitalPaidDecrease',
      'shareholders',
      'management'
    ];

    const active = agendaOrder
      .filter(k => data.resolutions[k as keyof typeof data.resolutions])
      .map(k => {
        switch(k) {
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
    const items = [...active];
    const last = items.pop();
    return `${items.join(', ')} dan ${last}`;
  };

  const resolutionSummary = getResolutionSummary();

  const preambleDomicile = data.resolutions.domicile 
    ? (data.oldAddress?.city || data.oldDomicile || '................')
    : (data.newAddress?.city || data.domicile || '................');

  const companyName = data.companyName || '................';
  
  const LIST_INDENT = '0.5in'; 
  const PREFIX_POS = '0.25in'; 
  const PARA_SPACING = '6pt';
  const LINE_HEIGHT = '1.15';

  const renderNationalityDescription = (sh: { nationalityType?: string, nationality?: string }) => {
    if (sh.nationalityType === 'WNA') {
      return `Warga Negara ${sh.nationality || '................'}`;
    }
    return sh.nationality || 'WNI';
  };

  const renderIdentificationDescription = (sh: { nationalityType?: string, nik?: string, passportNumber?: string, kitasNumber?: string, kitasType?: string, hasKitas?: boolean }) => {
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
      addr.fullAddress,
      addr.rt && addr.rw ? `RT. ${addr.rt} RW. ${addr.rw}` : '',
      addr.kelurahan ? `${villagePrefix} ${toTitleCase(addr.kelurahan)}` : '',
      addr.kecamatan ? `Kecamatan ${toTitleCase(addr.kecamatan)}` : '',
      addr.city ? toTitleCase(addr.city) : '',
      addr.province ? toTitleCase(addr.province) : ''
    ].filter(Boolean);
    return parts.join(', ');
  };

  const renderAddressDescription = (sh: { address?: Address }) => {
    return `bertempat tinggal di ${formatFullAddressPreview(sh.address)}`;
  };

  const renderOccupationDescription = (sh: { nationalityType?: string, occupation?: string }) => {
    if (sh.nationalityType === 'WNA') return '';
    return `${sh.occupation || '................'}, `;
  };

  let repName = '................';
  let repSuffix = ', tersebut di atas';

  if (data.representativeType === 'EXISTING') {
    const allPotentialReps = [...data.shareholders, ...data.finalShareholders];
    const rep = allPotentialReps.find(s => s.id === data.authorizedRepresentativeId);
    repName = `${rep?.salutation || '................'} ${rep?.name?.toUpperCase() || '................'}`;
    
    const isInPreamble = data.shareholders.some(s => s.id === data.authorizedRepresentativeId);
    repSuffix = isInPreamble ? ', tersebut di atas' : '';
    
    if (!isInPreamble && rep) {
      const birthStr = `lahir di ${rep.birthCity || '................'}, pada tanggal ${getDayIndo(rep.birthDate) || '..'} ${getMonthIndo(rep.birthDate) || '........'} ${getYearIndo(rep.birthDate) || '....'}`;
      repSuffix = `, ${birthStr}, ${renderNationalityDescription(rep)}, ${renderOccupationDescription(rep)}${renderAddressDescription(rep)}, ${renderIdentificationDescription(rep)}`;
    }
  } else {
    const rep = data.manualRepresentative;
    if (rep) {
      repName = `${rep.salutation} ${rep.name.toUpperCase() || '................'}`;
      const birthStr = `lahir di ${rep.birthCity || '................'}, pada tanggal ${getDayIndo(rep.birthDate) || '..'} ${getMonthIndo(rep.birthDate) || '........'} ${getYearIndo(rep.birthDate) || '....'}`;
      repSuffix = `, ${birthStr}, ${renderNationalityDescription(rep)}, ${renderOccupationDescription(rep)}${renderAddressDescription(rep)}, ${renderIdentificationDescription(rep)}`;
    }
  }

  const totalShares = data.shareholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const totalValue = totalShares * (data.originalSharePrice || 0);

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
          // Simulated page breaks every 297mm (A4)
          background: `
            linear-gradient(white 296.8mm, #cbd5e1 296.8mm, #cbd5e1 297mm, #f1f5f9 297mm, #f1f5f9 297.2mm, white 297.2mm) 0 0 / 100% 297.2mm,
            white
          `,
          boxShadow: '0 0 50px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.1)'
        } as React.CSSProperties}
      >
        {/* Sticky Page Numbers */}
        <div className="absolute top-0 right-0 bottom-0 pointer-events-none no-print">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
            <div key={p} className="absolute text-[10px] text-slate-300 font-mono pr-2" style={{ top: `calc(${p} * 297mm - 1.5rem)`, right: '0.5rem' }}>
              PAGE {p}
            </div>
          ))}
        </div>

        {showHeader && (
          <div style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '18pt' }}>
            {isCircular ? 'KEPUTUSAN PARA PEMEGANG SAHAM SEBAGAI PENGGANTI' : 'NOTULEN'}<br />
            RAPAT UMUM PEMEGANG SAHAM LUAR BIASA<br />
            <span style={{ textDecoration: 'underline' }}>PT {companyName}</span>
          </div>
        )}

        <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
          {isCircular ? (
            <>Kami yang bertandatangan dibawah ini, para Pemegang Saham PT {companyName}, berkedudukan di {preambleDomicile} (“Perseroan”), terdiri dari:</>
          ) : (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: PARA_SPACING, textTransform: 'uppercase' }}>I. RAPAT</div>
              <div>Rapat tersebut dihadiri oleh:</div>
            </>
          )}
        </div>

        {data.shareholders.filter(sh => sh.sharesOwned > 0).map((sh, idx) => {
          const currentValue = sh.sharesOwned * (data.originalSharePrice || 0);
          return (
            <div key={sh.id} style={{ marginTop: PARA_SPACING }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: PREFIX_POS }}>
                <div style={{ minWidth: PREFIX_POS }}>{idx + 1}.</div>
                <div style={{ textAlign: 'justify', flex: 1 }}>
                  {sh.salutation} <b>{sh.name || '................'}</b>, lahir di {sh.birthCity || '................'}, pada tanggal {getDayIndo(sh.birthDate) || '..'} {getMonthIndo(sh.birthDate) || '........'} {getYearIndo(sh.birthDate) || '....'}, {renderNationalityDescription(sh)}, {renderOccupationDescription(sh)}{renderAddressDescription(sh)}, {renderIdentificationDescription(sh)};
                </div>
              </div>
              
              <div style={{ marginTop: '2pt' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.5in' }}>
                  <span style={{ minWidth: PREFIX_POS }}>-</span>
                  <span style={{ textAlign: 'justify' }}>dalam hal ini hadir selaku :</span>
                </div>
                
                {sh.isManagement && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.75in' }}>
                    <span style={{ minWidth: PREFIX_POS }}>a.</span>
                    <span style={{ textAlign: 'justify' }}>{sh.managementPosition || 'Direktur'} perseroan; dan</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.75in' }}>
                  <span style={{ minWidth: PREFIX_POS }}>{sh.isManagement ? 'b.' : 'a.'}</span>
                  <span style={{ textAlign: 'justify' }}>
                    Pemilik dan pemegang saham sebanyak <b>{sh.sharesOwned.toLocaleString('id-ID')}</b> ({numberToWords(sh.sharesOwned)}) lembar saham atau senilai <b>{formatRpDot(currentValue)}</b> ({numberToWords(currentValue)} rupiah) berhak mengeluarkan suara <b>{sh.sharesOwned.toLocaleString('id-ID')}</b> ({numberToWords(sh.sharesOwned)}) suara dalam rapat.
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: '12pt', textAlign: 'justify' }}>
          Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak <b>{totalShares.toLocaleString('id-ID')}</b> ({numberToWords(totalShares)}) lembar saham atau senilai <b>{formatRpDot(totalValue)}</b> ({numberToWords(totalValue)} rupiah).
        </div>

        <div style={{ textAlign: 'justify', display: 'flex', alignItems: 'flex-start', marginTop: PARA_SPACING, paddingLeft: '0.5in' }}>
          <span style={{ minWidth: PREFIX_POS }}>-</span>
          <span>Untuk selanjutnya secara bersama-sama disebut sebagai <b>“Para Pemegang Saham”</b></span>
        </div>

        {isCircular ? (
          <>
            <div style={{ textTransform: 'uppercase', fontWeight: 'bold', marginTop: '18pt' }}>
              DENGAN INI MENYATAKAN, bahwa Para Pemegang Saham telah mengetahui mengenai :
            </div>
            
            <div style={{ marginTop: PARA_SPACING }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
                <div style={{ minWidth: PREFIX_POS }}>1.</div>
                <div style={{ textAlign: 'justify', flex: 1 }}>Bahwa sampai saat ini jumlah saham yang telah ditempatkan dan disetor penuh dalam perseroan sebanyak {data.originalTotalShares.toLocaleString('id-ID')} {wrapTerbilang(data.originalTotalShares)} lembar saham;</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
                <div style={{ minWidth: PREFIX_POS }}>2.</div>
                <div style={{ textAlign: 'justify', flex: 1 }}>Bahwa sesuai dengan ketentuan Pasal 91 Undang-Undang No. 40 Tahun 2007 tentang Perseroan Terbatas, pemegang saham dapat mengambil keputusan yang mengikat di luar Rapat Umum Pemegang Saham dengan syarat semua pemegang saham dengan hak suara menyetujui secara tertulis dengan menandatangani usul yang bersangkutan;</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
                <div style={{ minWidth: PREFIX_POS }}>3.</div>
                <div style={{ textAlign: 'justify', flex: 1 }}>Bahwa maksud dari Keputusan Sirkuler Para Pemegang Saham ini adalah untuk {resolutionSummary} Perseroan.</div>
              </div>
            </div>

            <div style={{ textAlign: 'justify', marginTop: '18pt' }}>
              <b>OLEH KARENA ITU,</b> para pemegang saham secara bersama-sama setuju and memutuskan hal-hal sebagai berikut:
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: PARA_SPACING, textTransform: 'uppercase' }}>II. KETUA RAPAT</div>
            <div style={{ textAlign: 'justify' }}>
              Berdasarkan ketentuan pasal 21 ayat (1) anggaran dasar perseroan, maka <b>{data.meetingChair || '................'}</b>, tersebut di atas, bertindak sebagai ketua rapat.
            </div>

            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: PARA_SPACING, textTransform: 'uppercase' }}>III. AGENDA RAPAT</div>
            <div style={{ textAlign: 'justify' }}>
              Rapat ini diadakan dengan agenda rapat sebagai berikut :
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '4pt', paddingLeft: '0.5in' }}>
              <span style={{ minWidth: PREFIX_POS }}>-</span>
              <span>{data.meetingAgenda || 'Perpanjangan pengurus perseroan.'}</span>
            </div>

            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: PARA_SPACING, textTransform: 'uppercase' }}>IV. DETAIL RAPAT DAN AKTA PENDIRIAN/PERUBAHAN</div>
            
            <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
              Rapat ini diselenggarakan berdasarkan Surat Undangan Direksi PT. {companyName} Nomor : <b>{data.invitationNumber || '................'}</b> tanggal <b>{formatDateIndo(data.invitationDate) || '................'}</b>, dan diadakan pada:
            </div>

            <div style={{ paddingLeft: LIST_INDENT, marginBottom: PARA_SPACING }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '1.2in', padding: '1pt 0' }}>Hari/Tanggal</td>
                    <td style={{ width: '0.2in', padding: '1pt 0' }}>:</td>
                    <td style={{ padding: '1pt 0' }}>{getDayNameIndo(data.signingDate)}, {formatDateIndo(data.signingDate) || '................'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '1pt 0' }}>Tempat</td>
                    <td style={{ padding: '1pt 0' }}>:</td>
                    <td style={{ padding: '1pt 0' }}>{data.signingPlace || '................'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '1pt 0' }}>Waktu</td>
                    <td style={{ padding: '1pt 0' }}>:</td>
                    <td style={{ padding: '1pt 0' }}>Pukul {data.meetingStartTime || '..:..'} WIB</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
              Bahwa Perseroan didirikan dengan Akta Pendirian tertanggal <b>{formatDateIndo(data.establishmentDeedDate) || '..........'}</b>, No. <b>{data.establishmentDeedNumber || '..........'}</b>, yang dibuat dihadapan <b>{data.establishmentNotary || '..........'}</b>, Notaris di {data.oldAddress?.city || '..........'} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal <b>{formatDateIndo(data.establishmentSkDate) || '..........'}</b>, Nomor <b>{data.establishmentSkNumber || '..........'}</b>,
              {data.amendmentDeeds && data.amendmentDeeds.length > 0 ? (
                <> beberapa kali telah mengalami perubahan, berdasarkan :</>
              ) : <>.</>}
            </div>

            {data.amendmentDeeds && data.amendmentDeeds.length > 0 && data.amendmentDeeds.map((deed) => (
              <div key={deed.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: '0.5in' }}>
                <div style={{ minWidth: PREFIX_POS, textAlign: 'left' }}>-</div>
                <div style={{ textAlign: 'justify', flex: 1 }}>
                  Akta Pernyataan Keputusan Rapat Umum Para Pemegang Saham Luar Biasa tertanggal <b>{formatDateIndo(deed.date) || '..........'}</b> Nomor <b>{deed.number || '..........'}</b>, yang dibuat di hadapan <b>{deed.notary || '..........'}</b>, Notaris di {data.oldAddress?.city || '..........'}{' '}
                  {deed.skSpDocuments && deed.skSpDocuments.length > 0 && deed.skSpDocuments.map((doc, dIdx) => (
                    <span key={doc.id}>
                      {dIdx === 0 ? 'dan ' : ', serta '}
                      {doc.type === 'SK' 
                        ? 'telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ' 
                        : 'telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal '}
                      <b>{formatDateIndo(doc.date) || '..........'}</b> Nomor <b>{doc.number || '..........'}</b>
                    </span>
                  ))}
                  .
                </div>
              </div>
            ))}

            <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: PARA_SPACING, textTransform: 'uppercase' }}>V. JALANNYA RAPAT</div>
            <div style={{ textAlign: 'justify' }}>
              Ketua rapat membuka dan memimpin rapat dengan terlebih dahulu menjelaskan bahwa para pemegang saham perseroan telah diundang untuk menghadiri rapat melalui surat undangan dan dalam rapat ini telah hadir dan/atau diwakili oleh <b>{totalShares.toLocaleString('id-ID')}</b> ({numberToWords(totalShares)}) Saham perseroan yang telah ditempatkan dan diambil bagian-bagian hingga hari ini, oleh karena itu, sesuai dengan ketentuan yang termaktub dalam pasal 22 ayat (1) Anggaran dasar Perseroan mengenai Kuorum, Rapat ini adalah sah sesuai dengan Kuorum dan berhak mengambil keputusan-keputusan yang sah serta mengikat mengenai hal-hal yang dibicarakan.
            </div>
          </>
        )}

        <div style={{ fontWeight: 'bold', marginTop: '18pt', marginBottom: PARA_SPACING, textTransform: 'uppercase' }}>{isCircular ? '' : 'VI. '}KEPUTUSAN-KEPUTUSAN</div>
        {!isCircular && (
           <div style={{ textAlign: 'justify', marginBottom: PARA_SPACING }}>
            Oleh karena agenda rapat telah diketahui dan dipahami sepenuhnya oleh para hadirin, maka setelah memberikan penjelasan-penjelasan yang diperlukan sehubungan dengan rapat ini, ketua rapat langsung saja mengusulkan kepada rapat untuk mengambil keputusan-keputusan dan selanjutnya, Rapat dengan suara bulat memutuskan dan menetapkan sebagai berikut :
          </div>
        )}

        <div style={{ marginTop: PARA_SPACING }}>
          {data.resolutions.companyNameChange && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                Menyetujui dan memutuskan untuk mengubah nama Perseroan, yang semula bernama : <b>PT {data.companyName}</b> menjadi bernama : <b>PT {data.targetCompanyName || '................'}</b>.
              </div>
            </div>
          )}

          {data.resolutions.domicile && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                Menyetujui dan memutuskan untuk mengubah tempat kedudukan Perseroan, yang semula berkedudukan di <b>{data.oldAddress?.city || data.oldDomicile || '................'}</b> menjadi berkedudukan di <b>{data.newAddress?.city || data.domicile || '................'}</b>.
              </div>
            </div>
          )}

          {data.resolutions.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                Menyetujui dan memutuskan untuk mengubah alamat lengkap Perseroan, yang semula beralamat di <b>{data.oldFullAddress || '................'}</b> menjadi beralamat di <b>{data.fullAddress || '................'}</b>.
              </div>
            </div>
          )}

          {data.resolutions.kbli && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 3 ayat (1) dan ayat (2) Anggaran Dasar Perseroan mengenai Maksud dan Tujuan serta Kegiatan Usaha, sehingga selanjutnya menjadi berbunyi sebagai berikut :
              </div>
            </div>
          )}

          {(data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                Menyetujui untuk {data.resolutions.capitalBaseDecrease ? 'menurunkan' : 'meningkatkan'} Modal Dasar Perseroan, yang semula sebesar Rp. {formatCurrency(data.originalCapitalBase).replace('Rp ', 'Rp. ')},- ({numberToWords(data.originalCapitalBase)} rupiah) terbagi atas {data.originalAuthorizedShares.toLocaleString('id-ID')} ({numberToWords(data.originalAuthorizedShares)}) lembar saham, masing-masing saham bernilai nominal Rp. {formatCurrency(data.originalSharePrice).replace('Rp ', 'Rp. ')},- ({numberToWords(data.originalSharePrice)} rupiah), menjadi sebesar Rp. {formatCurrency(data.targetCapitalBase).replace('Rp ', 'Rp. ')},- ({numberToWords(data.targetCapitalBase)} rupiah) terbagi atas {(data.targetCapitalBase / (data.originalSharePrice || 1)).toLocaleString('id-ID')} ({numberToWords(data.targetCapitalBase / (data.originalSharePrice || 1))}) lembar saham, masing-masing saham bernilai nominal Rp. {formatCurrency(data.originalSharePrice).replace('Rp ', 'Rp. ')},- ({numberToWords(data.originalSharePrice)} rupiah).
              </div>
            </div>
          )}

          {(data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                <div style={{ marginBottom: data.resolutions.capitalPaid ? '12pt' : 0 }}>
                  Menyetujui untuk {data.resolutions.capitalPaidDecrease ? 'menurunkan' : 'meningkatkan'} Modal Ditempatkan dan Disetor dalam Perseroan, yang semula sebesar Rp. {formatCurrency(data.originalCapitalPaid).replace('Rp ', 'Rp. ')},- ({numberToWords(data.originalCapitalPaid)} rupiah) yang terbagi menjadi sejumlah {data.originalTotalShares.toLocaleString('id-ID')} ({numberToWords(data.originalTotalShares)}) lembar saham, menjadi sebesar Rp. {formatCurrency(data.targetCapitalPaid).replace('Rp ', 'Rp. ')},- ({numberToWords(data.targetCapitalPaid)} rupiah) yang terbagi menjadi sejumlah {(data.targetCapitalPaid / (data.originalSharePrice || 1)).toLocaleString('id-ID')} ({numberToWords(data.targetCapitalPaid / (data.originalSharePrice || 1))}) lembar saham. 
                  {data.resolutions.capitalPaid && <div style={{ marginTop: '12pt' }}>Bahwa pengeluaran saham-saham baru tersebut di atas, telah diambil bagian dan disetor penuh secara tunai melalui kas Perseroan oleh masing - masing pemegang saham dengan rincian sebagai berikut :</div>}
                </div>
                {data.resolutions.capitalPaid && (() => {
                  const newDeposits = data.finalShareholders.filter(fs => fs.isNewDeposit && fs.newDepositShares && fs.newDepositShares > 0)
                  .map(fs => {
                    return { ...fs, newlyDepositedShares: fs.newDepositShares! };
                  });

                  return newDeposits.map((dep, idx) => {
                    const val = dep.newlyDepositedShares * (data.originalSharePrice || 0);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.1in', marginBottom: '4pt' }}>
                        <div style={{ minWidth: PREFIX_POS }}>-</div>
                        <div>{dep.name.toUpperCase()} : {dep.newlyDepositedShares.toLocaleString('id-ID')} ({numberToWords(dep.newlyDepositedShares)}) lembar saham atau senilai Rp. {formatCurrency(val).replace('Rp ', 'Rp. ')},- ({numberToWords(val)} rupiah);</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {data.resolutions.shareholders && data.shareTransfers && data.shareTransfers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                <div style={{ marginBottom: '12pt' }}>Menyetujui pengalihan seluruh saham secara hibah/jual beli dengan rincian sebagai berikut :</div>
                {data.shareTransfers.map((t, idx) => {
                  const from = data.shareholders.find(s => s.id === t.fromShareholderId);
                  const to = data.finalShareholders.find(s => s.id === t.toShareholderId);
                  if (!from || !to) return null;
                  const val = t.sharesTransferred * (data.originalSharePrice || 0);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.1in', marginBottom: '4pt' }}>
                      <div style={{ minWidth: PREFIX_POS }}>-</div>
                      <div style={{ flex: 1 }}>{from.name.toUpperCase()} mengalihkan {t.sharesTransferred.toLocaleString('id-ID')} ({numberToWords(t.sharesTransferred)}) lembar saham perseroan atau senilai Rp. {formatCurrency(val).replace('Rp ', 'Rp. ')},- ({numberToWords(val)} rupiah) kepada {to.salutation} {to.name.toUpperCase()}.</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(data.resolutions.management || data.resolutions.reappointment) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                <div style={{ marginBottom: '12pt' }}>Menyetujui untuk memberhentikan dengan hormat seluruh anggota Direksi dan Dewan Komisaris Perseroan yang menjabat saat ini, yaitu :</div>
                
                {(data.oldManagementItems || []).map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.1in', marginBottom: '4pt' }}>
                    <div style={{ minWidth: PREFIX_POS }}>-</div>
                    <div><b>{(m.name || '..........').toUpperCase()}</b>, selaku {m.position} perseroan;</div>
                  </div>
                ))}

                <div style={{ marginTop: '12pt', marginBottom: '12pt', textAlign: 'justify' }}>dengan ucapan terima kasih atas jasa-jasa dan pengabdian yang telah diberikan selama masa jabatannya dalam Perseroan, serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) atas tindakan pengurusan dan pengawasan yang telah dijalankan, sepanjang tindakan-tindakan tersebut tercermin dalam buku-buku serta laporan tahunan Perseroan.</div>
                <div style={{ marginBottom: '12pt' }}>Selanjutnya menyetujui untuk mengangkat nama-nama tersebut di bawah ini sebagai anggota Direksi dan Dewan Komisaris Perseroan yang baru :</div>

                {data.finalShareholders.filter(s => s.isManagement).map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.1in', marginBottom: '4pt' }}>
                    <div style={{ minWidth: PREFIX_POS }}>-</div>
                    <div><b>{(m.name || '..........').toUpperCase()}</b>, sebagai {m.managementPosition || 'Direktur'} perseroan;</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease || data.resolutions.shareholders) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
              <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
              <div style={{ textAlign: 'justify', flex: 1 }}>
                <div style={{ marginBottom: '12pt' }}>Sehingga merubah susunan pemegang saham perseroan menjadi sebagai berikut :</div>
                {data.finalShareholders.filter(fs => fs.sharesOwned > 0).map((fs, idx) => {
                  const val = fs.sharesOwned * (data.originalSharePrice || 0);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '0.1in', marginBottom: '4pt' }}>
                      <div style={{ minWidth: PREFIX_POS }}>-</div>
                      <div>{fs.name.toUpperCase()} : {fs.sharesOwned.toLocaleString('id-ID')} ({numberToWords(fs.sharesOwned)}) lembar saham atau senilai Rp. {formatCurrency(val).replace('Rp ', 'Rp. ')},- ({numberToWords(val)} rupiah);</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: PARA_SPACING, paddingLeft: PREFIX_POS }}>
            <div style={{ minWidth: PREFIX_POS }}>{getNextNum()}.</div>
            <div style={{ textAlign: 'justify', flex: 1 }}>
              Menyetujui dan memutuskan untuk memberikan kuasa dengan hak substitusi kepada <b>{repName}</b>{repSuffix} untuk melakukan tindakan-tindakan yang diperlukan sehubungan dengan keputusan Rapat di atas, termasuk memberi keterangan-keterangan, membuat, minta dibuatkan dan menandatangani segala surat dan akta dihadapan Notaris dan umumnya menjalankan segala tindakan yang dianggap perlu dan berguna, tidak ada tindakan yang dikecualikan.
            </div>
          </div>
        </div>

        <div style={{ fontWeight: 'bold', marginTop: '30pt', marginBottom: PARA_SPACING, textTransform: 'uppercase' }}>{isCircular ? '' : 'VII. '}PENUTUP</div>

        <div style={{ textAlign: 'justify' }}>
          {isCircular ? (
            <>Demikianlah keputusan para pemegang saham di luar rapat ini dibuat berdasarkan ketentuan pasal 91 Undang-Undang nomor 40 tahun 2007 tentang Perseroan Terbatas, mempunyai kekuatan yang sama yang diambil dengan sah dalam RUPS dan ditandatangani dengan sebenar-benarnya pada hari dan tanggal dimaksud pada keputusan diatas.</>
          ) : (
            <>Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam <b>{data.meetingEndTime || '..:..'}</b> WIB.</>
          )}
        </div>

        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginTop: '48pt' }}>TANDA TANGAN PARA PEMEGANG SAHAM,</div>
        <br />

        {data.shareholders.filter(sh => sh.sharesOwned > 0).map((sh, idx) => (
          <div key={sh.id} style={{ marginBottom: '40pt', maxWidth: '3.5in' }}>
            {idx === 0 && (
              <div style={{ color: '#bfbfbf', fontSize: '8pt', textTransform: 'uppercase', marginBottom: '12pt' }}>Meterai 10.000 + Cap</div>
            )}
            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline' }}>{sh.name || '................'}</div>
            <div style={{ fontSize: '10pt' }}>Tanggal : ............................</div>
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
