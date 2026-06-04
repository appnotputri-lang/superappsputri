import React from 'react';
import { CompanyData } from '../types';
import { toTitleCase } from '../utils/formatters';

interface Props {
  data: CompanyData;
}

export const SirkulerLaporanDocumentPreview: React.FC<Props> = ({ data }) => {
  const companyNameText = data.companyName || '';
  const displayCompanyName = companyNameText.toUpperCase().startsWith('PT') || companyNameText.toUpperCase().startsWith('PT.') 
    ? companyNameText.toUpperCase() 
    : `PT ${companyNameText.toUpperCase()}`;
  const finalCompanyName = data.companyName ? displayCompanyName : 'PT. ............................';
  const domicile = data.domicile ? `Kota ${toTitleCase(data.domicile)}` : 'Kota ............................';

  // Getting final shareholders for the list. Or old shareholders if final is empty.
  const shareholders = data.finalShareholders.length > 0 ? data.finalShareholders : data.shareholders;

  return (
    <div className="bg-white shadow-lg mx-auto overflow-hidden relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }} id="sirkuler-document-preview">
      {/* Background shapes mimicking the PDF header/footer */}
      <div className="absolute top-0 left-0 w-full h-32 bg-[#c9ab85] opacity-20 -z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 100%)' }}></div>
      <div className="absolute bottom-0 right-0 w-full h-48 bg-[#c9ab85] opacity-10 -z-10" style={{ clipPath: 'polygon(0 70%, 100% 0, 100% 100%, 0 100%)' }}></div>

      <div className="text-center mb-10 mt-8">
        <h2 className="text-xl font-bold font-serif uppercase mb-8">KOP SURAT PT</h2>
        <h2 className="text-xl font-bold font-serif underline underline-offset-4 mt-8 uppercase">KEPUTUSAN PARA PEMEGANG SAHAM</h2>
        <h2 className="text-xl font-bold font-serif uppercase">{finalCompanyName}</h2>
      </div>

      <div className="text-sm font-sans text-justify leading-relaxed space-y-4">
        <p>
          Pada hari ini, <span className="font-bold border-b border-black inline-block min-w-[100px] text-center">{data.slHari || '..............'}</span>, 
          tanggal <span className="font-bold border-b border-black inline-block min-w-[200px] text-center">{data.slTanggalHuruf || '............................'}</span>.
        </p>

        <p>
          Para Pemegang Saham {finalCompanyName}, berkedudukan di {domicile}, yang anggaran dasarnya dimuat dalam :
          Akta Pendirian tertanggal {data.establishmentDeedDate || '............................'}, No. {data.establishmentDeedNumber || '..........'}, yang dibuat dihadapan 
          {(data.establishmentNotary && data.establishmentNotaryTitle) ? `${data.establishmentNotary}, ${data.establishmentNotaryTitle}` : data.establishmentNotary || '............................'}, {data.establishmentNotaryTitle?.includes('Notaris di') ? '' : 'Notaris di '} {data.establishmentNotaryDomicile ? toTitleCase(data.establishmentNotaryDomicile) : '............................'} dan telah mendapat pengesahan dari Menteri Hukum 
          dan Hak Asasi Manusia Republik Indonesia tertanggal {data.establishmentSkDate || '............................'} 
          Nomor {data.establishmentSkNumber || '............................'}.
        </p>

        {data.amendmentDeeds.length > 0 && (
          <p>
            Akta Perubahan terakhir tertanggal {data.amendmentDeeds[data.amendmentDeeds.length-1].date}, No. {data.amendmentDeeds[data.amendmentDeeds.length-1].number}, yang dibuat dihadapan {(data.amendmentDeeds[data.amendmentDeeds.length-1].notaryTitle && data.amendmentDeeds[data.amendmentDeeds.length-1].notaryTitle?.includes('Notaris di')) ? `${data.amendmentDeeds[data.amendmentDeeds.length-1].notary}, ${data.amendmentDeeds[data.amendmentDeeds.length-1].notaryTitle} ${data.amendmentDeeds[data.amendmentDeeds.length-1].notaryDomicile}` : `${data.amendmentDeeds[data.amendmentDeeds.length-1].notary}, Notaris di ${data.amendmentDeeds[data.amendmentDeeds.length-1].notaryDomicile}`} dan telah mendapat persetujuan Kementerian Hukum dan Hak Asasi Manusia Nomor {data.amendmentDeeds[data.amendmentDeeds.length-1].skSpDocuments[0]?.number || '...........'}.
          </p>
        )}
        
        <ul className="list-none pl-5 space-y-2 mb-4">
          <li className="flex gap-2"><span>-</span> <span>Setelah itu belum lagi mengalami perubahan.</span></li>
          <li className="flex gap-2"><span>-</span> <span>Untuk selanjutnya disebut “Perseroan Terbatas”.</span></li>
          <li className="flex gap-2"><span>-</span> <span>Membuat suatu keputusan yang ditandatangani oleh para pemegang saham yang mewakili sejumlah {data.originalTotalShares.toLocaleString('id-ID')} ({data.originalTotalShares || "..."})
            lembar saham yang merupakan seluruh saham yang dikeluarkan oleh Perseroan sampai dengan 
            hari ini, sehingga dengan demikian sah susunannya dan berhak untuk mengambil keputusan yang mengikat 
            mengenai segala apa yang diputuskan, yang mana berdasarkan ketentuan yang diatur dalam Pasal 91 UU No. 40 
            Tahun 2007 Tentang Perseroan Terbatas, mempunyai kekuatan hukum yang sama dengan Rapat Umum Pemegang Saham.</span>
          </li>
          <li className="flex gap-2 mb-2"><span>-</span> <span>Keputusan tersebut ditandatangani oleh :</span></li>
            <ol className="list-decimal pl-10 space-y-2 font-serif text-[12]px">
              {shareholders.map((sh, index) => (
                <li key={sh.id || index}>
                  {sh.salutation} <strong>{sh.name}</strong>, lahir di {sh.birthCity}, pada tanggal {sh.birthDate}, Warga Negara {sh.nationality === 'WNI' ? 'Indonesia' : sh.nationality}, {sh.occupation}, bertempat tinggal di Kota {toTitleCase(sh.address?.city || '...........')}, {sh.address?.fullAddress}, Rukun Tetangga {sh.address?.rt}, Rukun Warga {sh.address?.rw}, Kelurahan {sh.address?.kelurahan}, Kecamatan {sh.address?.kecamatan}, 
                  {sh.nationality === 'WNA' && sh.passportNumber ? ` pemegang Paspor Nomor ${sh.passportNumber}` : ''}
                  {sh.hasKitas && sh.kitasNumber ? ` pemegang Kitas Nomor ${sh.kitasNumber}, ` : ', '}
                  pemegang Kartu Tanda Penduduk Nomor {sh.nik}.
                  <div className="pl-4 mt-2 font-sans text-[13px]">
                    <div className="mb-1">Dalam hal ini hadir selaku :</div>
                    <div className="flex gap-2 pl-4"><span>-</span> <span>Pemilik dan pemegang saham sebanyak <strong>{sh.sharesOwned.toLocaleString('id-ID')}</strong> ({sh.sharesOwned || "..."}) lembar saham perseroan</span></div>
                    {data.newManagementItems.find(m => m.nik === sh.nik || m.name === sh.name) && (
                      <div className="flex gap-2 pl-4"><span>-</span> <span>{data.newManagementItems.find(m => m.nik === sh.nik || m.name === sh.name)?.position} Perseroan.</span></div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            
          <li className="flex gap-2 mt-4 text-justify"><span>-</span> <span>Bahwa Keputusan Para Pemegang Saham ini adalah menyangkut hal-hal sebagai berikut:</span></li>
            <ol className="list-decimal pl-10 mt-2 space-y-4">
              <li>Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan.</li>
              <li>Pemberitahuan Laporan Tahunan Perseroan.</li>
              <li>Pelunasan dan Pembebasan Tanggung Jawab Direksi dan Komisaris Perseroan.</li>
            </ol>
          <li className="flex gap-2 mt-4 text-justify"><span>-</span> <span>Bahwa segala sesuatu yang diputuskan dalam Keputusan ini telah diketahui sepenuhnya oleh para pemegang saham, maka selanjutnya Para Pemegang Saham dengan suara bulat memutuskan :</span></li>
        </ul>

        <ol className="list-decimal pl-10 space-y-4">
          <li>
            Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan {finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan 
            Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:
            <ol className="list-[lower-alpha] pl-5 mt-2 space-y-1">
              {data.slAlasanAuditA && <li>Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.</li>}
              {data.slAlasanAuditB && <li>Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.</li>}
              {data.slAlasanAuditC && <li>Perseroan tidak merupakan Perseroan Terbuka (Tbk).</li>}
              {data.slAlasanAuditD && <li>Perseroan tidak merupakan Persero.</li>}
              {data.slAlasanAuditE && <li>Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau</li>}
              {data.slAlasanAuditF && <li>Tidak diwajibkan oleh peraturan perundang-undangan.</li>}
            </ol>
          </li>
          
          <li>
            Menyetujui Pemberitahuan Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tertanggal <span className="font-bold">{data.slTahunBukuAkhirHuruf}</span> pada Sistim Administrasi Badan Hukum 
            Administrasi Hukum Umum Kementrian Hukum (SABH AHU Kemenkum), sebagaimana dimuat dalam 
            Laporannya Nomor : <span className="font-bold border-b border-black inline-block min-w-[150px] text-center text-red-600">{data.slLaporanNomor || '................................'}</span> tertanggal <span className="font-bold text-red-600">{data.slLaporanTanggalHuruf}</span>, yang meliputi :
            <div className="flex gap-2 pl-4 mt-2 text-red-600">
               <span>-</span> <span>Laporan Keuangan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.</span>
            </div>
            <div className="mt-2 text-red-600">
              Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas 
              Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada 
              Keputusan Para Pemegang Saham ini.
            </div>
          </li>

          <li>
            Menyetujui Pelunasan dan Pembebasan Tanggung Jawab Direksi dan Komisaris Perseroan sepenuhnya 
            (acquit et de charge) atas tindakan pengurusan yang telah lakukan Direksi Perseroan, dan atas tindakan 
            pengawasan yang telah dilakukan Komisaris Perseroan selama tahun buku yang berakhir tertanggal <span className="font-bold">{data.slTahunBukuAkhirHuruf}</span>, sepanjang tindakan-tindakan tersebut tercermin 
            dalam Laporan Tahunan Perseroan dan Laporan Keuangan Perseroan, dan seluruh Laporan yang tercantum 
            pada Poin (2) diatas, untuk tahun buku yang berakhir tertanggal <span className="font-bold">{data.slTahunBukuAkhirHuruf}</span>.
          </li>
        </ol>

        <ul className="list-none space-y-4 mt-6">
          <li className="flex gap-2"><span>-</span> <span>Akhirnya, para pemegang saham memutuskan dengan suara bulat sehubungan dengan apa yang telah disetujui 
            tersebut di atas, untuk memberi kuasa dengan hak substitusi kepada :</span>
          </li>
          <li className="pl-4">
            {shareholders.length > 0 ? `${shareholders[0].salutation} ${shareholders[0].name}` : '...................................................'}, tersebut diatas.
          </li>
          <li className="flex gap-2"><span>-</span> <span>Untuk mengakte notarialkan Keputusan Para Pemegang Saham Perseroan Terbatas {finalCompanyName} ini 
            dihadapan Notaris.</span>
          </li>
        </ul>

      </div>

      <div className="mt-12 text-center text-sm font-sans break-inside-avoid">
        <h3 className="font-bold mb-4">Yang Membuat Keputusan :</h3>
        <div className="text-red-500 text-xs mb-16">
          Meterai Rp.10.000,- + cap perusahan
        </div>
        
        <div className="flex flex-wrap justify-between px-16 mt-8 gap-y-16">
          {shareholders.map(sh => (
            <div key={sh.id} className="w-1/2 flex flex-col items-center">
              <div className="h-16"></div>
              <div className="font-bold underline uppercase">{sh.name}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
