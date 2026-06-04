import React from 'react';

export interface FormState {
  hari: string;
  tanggalHuruf: string;
  alasanAudit: {
    a: boolean;
    b: boolean;
    c: boolean;
    d: boolean;
    e: boolean;
    f: boolean;
  };
  laporanNomor: string;
  laporanTanggalHuruf: string;
  tahunBukuAkhirHuruf: string;
}

interface Props {
  data: FormState;
}

const DocumentPreview: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white shadow-lg mx-auto overflow-hidden relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }} id="document-preview">
      {/* Background shapes mimicking the PDF header/footer */}
      <div className="absolute top-0 left-0 w-full h-32 bg-[#c9ab85] opacity-20 -z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 100%)' }}></div>
      <div className="absolute bottom-0 right-0 w-full h-48 bg-[#c9ab85] opacity-10 -z-10" style={{ clipPath: 'polygon(0 70%, 100% 0, 100% 100%, 0 100%)' }}></div>

      <div className="text-center mb-10 mt-8">
        {/* Placeholder for Logo */}
        <div className="flex justify-center items-center mb-4">
          <div className="w-12 h-12 border-2 border-slate-800 rotate-45 flex items-center justify-center mr-4">
             <div className="w-8 h-8 bg-slate-800"></div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#232b5e]">PT. JUBILEE TOKYO JEWELRY</h1>
        </div>
        
        <h2 className="text-xl font-bold font-serif underline underline-offset-4 mt-8">KEPUTUSAN PARA PEMEGANG SAHAM</h2>
        <h2 className="text-xl font-bold font-serif">PT. JUBILEE TOKYO JEWELRY</h2>
      </div>

      <div className="text-sm font-sans text-justify leading-relaxed space-y-4">
        <p>
          Pada hari ini, <span className="font-bold border-b border-black inline-block min-w-[100px] text-center">{data.hari || '..............'}</span>, 
          tanggal <span className="font-bold border-b border-black inline-block min-w-[200px] text-center">{data.tanggalHuruf || '............................'}</span>.
        </p>

        <p>
          Para Pemegang Saham PT. JUBILEE TOKYO JEWELRY, berkedudukan di Kota Surabaya, yang anggaran dasarnya dimuat dalam :
          Akta Pendirian tertanggal sebelas September dua ribu dua puluh empat (11-09-2024), No. 12, yang dibuat dihadapan 
          Nukantini Putri Parincha, Notaris di Kabupaten Bandung Barat dan telah mendapat pengesahan dari Menteri Hukum 
          dan Hak Asasi Manusia Republik Indonesia tertanggal tiga belas September dua ribu dua puluh empat (13-09-2024) 
          Nomor AHU-0071719.AH.01.01.Tahunn 2024.
        </p>
        
        <ul className="list-disc pl-5 space-y-2">
          <li>Setelah itu belum lagi mengalami perubahan.</li>
          <li>Untuk selanjutnya disebut “Perseroan Terbatas”.</li>
          <li>Membuat suatu keputusan yang ditandatangani oleh para pemegang saham yang mewakili sejumlah 1.010 
            (seribu sepuluh) lembar saham yang merupakan seluruh saham yang dikeluarkan oleh Perseroan sampai dengan 
            hari ini, sehingga dengan demikian sah susunannya dan berhak untuk mengambil keputusan yang mengikat 
            mengenai segala apa yang diputuskan, yang mana berdasarkan ketentuan yang diatur dalam Pasal 91 UU No. 40 
            Tahun 2007 Tentang Perseroan Terbatas, mempunyai kekuatan hukum yang sama dengan Rapat Umum Pemegang Saham.
          </li>
          <li>Keputusan tersebut ditandatangani oleh :
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>
                Tuan <strong>RAJANDRAN SHUNMUGAM</strong>, lahir di Singapura, pada tanggal 12-06-1966 (dua belas Juni seribu 
                sembilan ratus enam puluh enam), Warga Negara Singapura, Wirsaswasta, bertempat tinggal di Singapura, 
                78 Bayshore Road #25-21, pemegang Paspor Nomor K3990485R, serta pemegang Kitas Nomor 24E28A410488.
                <ul className="list-none pl-5 mt-1 space-y-1">
                  <li>- Dalam hal ini hadir selaku :</li>
                  <li>- Pemilik dan pemegang saham sebanyak <strong>1.009</strong> (seribu sembilan) lembar saham perseroan</li>
                  <li>- Direktur Perseroan.</li>
                </ul>
              </li>
              <li>
                Nyonya <strong>LEILA</strong>, lahir di Bandung, pada tanggal 09-06-1977 (sembilan Juni seribu sembilan ratus tujuh puluh 
                tujuh), Warga Negara Indonesia, Wiraswasta, bertempat tinggal di Kota Bandung, Jalan. Batununggal Abadi 
                II Nomor. 48-B, Rukun Tetangga 002, Rukun Warga 005, Kelurahan Mengger, Kecamatan Bandung Kidul, 
                pemegang Kartu Tanda Penduduk Nomor 3273214906770003.
                <ul className="list-none pl-5 mt-1 space-y-1">
                  <li>- Dalam hal ini hadir selaku :</li>
                  <li>- Pemilik dan pemegang saham sebanyak <strong>1</strong> (satu) lembar saham perseroan</li>
                  <li>- Komisaris Perseroan.</li>
                </ul>
              </li>
            </ol>
          </li>
          <li className="list-none -ml-5 mt-4">
            - Bahwa Keputusan Para Pemegang Saham ini adalah menyangkut hal-hal sebagai berikut:
            <ol className="list-decimal pl-5 mt-2 space-y-4">
              <li>Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan.</li>
              <li>Pemberitahuan Laporan Tahunan Perseroan.</li>
              <li>Pelunasan dan Pembebasan Tanggung Jawab Direksi dan Komisaris Perseroan.</li>
            </ol>
          </li>
        </ul>

        <div className="mt-4 mb-2">
          - Bahwa segala sesuatu yang diputuskan dalam Keputusan ini telah diketahui sepenuhnya oleh para pemegang 
            saham, maka selanjutnya Para Pemegang Saham dengan suara bulat memutuskan :
        </div>

        <ol className="list-decimal pl-5 space-y-4">
          <li>
            Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan PT. JUBILEE 
            TOKYO JEWELRY yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan 
            Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:
            <ol className="list-[lower-alpha] pl-5 mt-2 space-y-1">
              {data.alasanAudit.a && <li>Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.</li>}
              {data.alasanAudit.b && <li>Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.</li>}
              {data.alasanAudit.c && <li>Perseroan tidak merupakan Perseroan Terbuka (Tbk).</li>}
              {data.alasanAudit.d && <li>Perseroan tidak merupakan Persero.</li>}
              {data.alasanAudit.e && <li>Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau</li>}
              {data.alasanAudit.f && <li>Tidak diwajibkan oleh peraturan perundang-undangan.</li>}
              {Object.values(data.alasanAudit).every(v => !v) && (
                <li className="text-red-500 italic">[Pilih minimal satu alasan di form]</li>
              )}
            </ol>
          </li>
          
          <li>
            Menyetujui Pemberitahuan Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tertanggal <span className="font-bold">{data.tahunBukuAkhirHuruf}</span> pada Sistim Administrasi Badan Hukum 
            Administrasi Hukum Umum Kementrian Hukum (SABH AHU Kemenkum), sebagaimana dimuat dalam 
            Laporannya Nomor : <span className="font-bold border-b border-black inline-block min-w-[150px] text-center text-red-600">{data.laporanNomor || '................................'}</span> tertanggal <span className="font-bold text-red-600">{data.laporanTanggalHuruf}</span>, yang meliputi :
            <div className="ml-5 mt-2 text-red-600">
              - Laporan Keuangan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.
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
            pengawasan yang telah dilakukan Komisaris Perseroan selama tahun buku yang berakhir tertanggal <span className="font-bold">{data.tahunBukuAkhirHuruf}</span>, sepanjang tindakan-tindakan tersebut tercermin 
            dalam Laporan Tahunan Perseroan dan Laporan Keuangan Perseroan, dan seluruh Laporan yang tercantum 
            pada Poin (2) diatas, untuk tahun buku yang berakhir tertanggal <span className="font-bold">{data.tahunBukuAkhirHuruf}</span>.
          </li>
        </ol>

        <ul className="list-none space-y-4 mt-6">
          <li>
            - Akhirnya, para pemegang saham memutuskan dengan suara bulat sehubungan dengan apa yang telah disetujui 
            tersebut di atas, untuk memberi kuasa dengan hak substitusi kepada :
          </li>
          <li>
            - Nyonya LEILA, tersebut diatas.
          </li>
          <li>
            - Untuk mengakte notarialkan Keputusan Para Pemegang Saham Perseroan Terbatas PT. JUBILEE TOKYO JEWELRY ini 
            dihadapan Notaris.
          </li>
        </ul>

      </div>

      {/* Signature Section - Kept together on the last page conceptually */}
      <div className="mt-12 text-center text-sm font-sans break-inside-avoid">
        <h3 className="font-bold mb-4">Yang Membuat Keputusan :</h3>
        <div className="text-red-500 text-xs mb-16">
          Meterai Rp.10.000,- + cap perusahan
        </div>
        
        <div className="flex justify-between px-16 mt-8">
          <div className="font-bold underline">RAJANDRAN SHUNMUGAM</div>
          <div className="font-bold underline">LEILA</div>
        </div>
      </div>

    </div>
  );
};

export default DocumentPreview;
