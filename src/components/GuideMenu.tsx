import React from 'react';
import { 
  Building2, 
  FileText, 
  Database,
  CheckCircle2,
  Printer,
  FileSignature,
  MousePointerClick,
  Users,
  Eye,
  ArrowRight,
  ListPlus,
  Network,
  Banknote,
  Search
} from 'lucide-react';

const GuideMenu = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="bg-white p-8 rounded-sm shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
          <span className="bg-[#3b5998] p-2 rounded text-white"><FileText className="w-6 h-6" /></span>
          Panduan Penggunaan Aplikasi
        </h1>
        <p className="text-slate-600">
          Ikuti langkah-langkah di bawah ini untuk memulai membuat draft Notulen, PKR LB, Peralihan Saham, dan Surat Kuasa dengan sistem yang terotomatisasi.
        </p>
      </div>

      <div className="space-y-12">
        {/* Step 1 */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 font-bold text-xl">1</div>
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Menyusun Profil Perusahaan</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pilih menu <b>Company Profile</b> di sebelah kiri. Di sana, Anda bisa membuat profil perusahaan dasar yang akan menjadi cikal bakal data akta yang akan dibuat. Masukkan Nama PT, Tanggal Pendirian, dan Data Pengurus & Pemegang Saham sebelum perubahan (existing).
              </p>
              
              <div className="bg-slate-50 p-6 rounded border border-slate-200 mt-4 flex items-center justify-center gap-8 shadow-inner">
                {/* Illustration */}
                <div className="w-64 bg-white border border-slate-300 rounded shadow-md overflow-hidden">
                  <div className="bg-[#2c3b41] p-2 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                  <div className="p-3 text-[10px] space-y-2">
                    <div className="font-bold border-b pb-1 mb-2">Tambah Profil</div>
                    <div className="bg-slate-100 h-4 w-full rounded"></div>
                    <div className="bg-slate-100 h-4 w-3/4 rounded"></div>
                    <div className="bg-slate-100 h-4 w-full rounded"></div>
                    <button className="bg-[#3b5998] text-white px-2 py-1 rounded w-full mt-2">Simpan Profil</button>
                  </div>
                </div>
                <ArrowRight className="text-slate-300 w-8 h-8" />
                <div className="w-24 h-24 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center">
                  <Database className="w-10 h-10 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0 font-bold text-xl">2</div>
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Menentukan Jenis Dokumen & Agenda Rapat</h2>
              <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
                <p>
                  Pilih menu <b>Proyek</b> lalu buat proyek baru. Di tab <b>General</b>, hal penting yang pertama kali harus ditentukan adalah:
                </p>
                <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-3">
                  <p><b>A. Jenis Dokumen Dasar (Akta)</b></p>
                  <ul className="list-disc pl-5 space-y-1">
                     <li><b>Pernyataan Keputusan Rapat (PKR)</b> = Berdasar pada Notulen RUPS bawah tangan.</li>
                     <li><b>PKR LB</b> = Jika RUPS dilakukan di hadapan Notaris.</li>
                     <li><b>Jual Beli Saham / Hibah Saham</b> = Akta Peralihan Saham (akan muncul jika Anda mencentang agenda Peralihan Saham).</li>
                     <li><b>Surat Kuasa</b> = Anda bisa men-generate form kuasa secara otomatis dari menu di sebelah Proyek.</li>
                  </ul>
                </div>
                <div className="border border-slate-200 rounded p-4 bg-slate-50 space-y-3">
                  <p><b>B. Agenda Rapat (Sangat Penting!)</b></p>
                  <p>Checklist agenda akan mengatur <b>Tab Apa Saja</b> yang otomatis muncul dan perlu Anda isi.</p>
                  <ul className="list-disc pl-5 space-y-1">
                     <li>Checklist <b>Perubahan Nama</b> → Muncul tab input Nama Baru PT.</li>
                     <li>Checklist <b>Perubahan Domisili</b> → Muncul form input Alamat Lengkap baru. Jika domisilinya berubah ke luar daerah, akta otomatis akan menyesuaikan klausul pemindahan domisili secara keseluruhan.</li>
                     <li>Checklist <b>Perubahan Maksud & Tujuan (KBLI)</b> → Tab KBLI akan muncul.</li>
                     <li>Checklist <b>Peningkatan Modal / Penurunan Modal / Peralihan Saham / Perubahan Board</b> → Tab Shareholder Management akan muncul.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 font-bold text-xl">3</div>
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Data Kehadiran & Detail Rapat</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Jika Anda membuat Akta PKR LB, pastikan mengisi form <b>Detail Rapat</b> (Tanggal RUPS, Waktu, Tempat).<br/>
                Sistem juga otomatis menyediakan input <b>Data Kehadiran (Daftar Hadir)</b> untuk memastikan kuorum RUPS telah terpenuhi. 
                Anda cukup memilih siapa saja pemegang saham yang hadir atau diwakili oleh kuasa.
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center shrink-0 font-bold text-xl">4</div>
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Cara Input Kode KBLI</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pada tab <b>KBLI</b>, kami telah menyediakan pencarian live Kode KBLI 2020. 
                Anda cukup <b>mengetikkan kata kunci</b> (contoh: "perdagangan eceran", "restoran") atau <b>5 digit kodenya</b>. 
                Klik opsi yang muncul untuk menambahkan. Jika terdapat kesalahan, Anda juga bisa mengganti teks deskripsi KBLInya atau menghapusnya.
              </p>
              
              <div className="bg-slate-50 p-4 rounded border border-slate-200 mt-4 flex items-center gap-4 shadow-inner max-w-sm">
                 <Search className="w-5 h-5 text-slate-400" />
                 <div className="flex-1 border-b border-slate-300 pb-1 text-sm font-mono mt-1 text-slate-600">
                   46100 - Perdagangan Besar Atas Balas...
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0 font-bold text-xl">5</div>
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Perubahan Permodalan & Pemegang Saham Baru</h2>
              <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>
                  Sistem sangat mengotomatisasi hitungan modal dasar, ditempatkan, dan disetor. Mari pelajari bagian ini:
                </p>

                <div className="grid grid-cols-1 gap-4">
                   <div className="border border-slate-200 p-4 rounded bg-slate-50 shadow-sm relative">
                     <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-[10px] text-purple-600 border border-purple-200 rounded">Peningkatan Modal</span>
                     <p className="mt-2">Pada tab <b>Modal Dasar & Disetor</b>, masukkan Total Modal Dasar Baru dan Modal Disetor Baru. Sistem akan mengkalkulasi selisih penambahan.</p>
                     <p className="mt-2">Selanjutnya di tab <b>Pemegang Saham</b>, cukup alokasikan saham baru tersebut ke (calon) pemegang saham. Anda juga bisa <b>Menambahkan Pihak Baru</b> di sesi ini.</p>
                   </div>
                   <div className="border border-slate-200 p-4 rounded bg-slate-50 shadow-sm relative">
                     <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-[10px] text-blue-600 border border-blue-200 rounded">Peralihan (Jual Beli / Hibah)</span>
                     <p className="mt-2">Pada list pemegang saham lama, tarik slider atau ketik berapa jumlah lembar yang akan dijual/dihibahkan (Nilai minus merah).</p>
                     <p className="mt-2">Lalu ke pihak penerima (bisa pemegang saham lama/baru), isi lembar saham yang dia peroleh (Nilai plus hijau). <b>Pastikan Total Alokasi Balance (selisih = 0).</b></p>
                   </div>
                </div>

                <p className="p-3 bg-purple-50 text-purple-800 border border-purple-200 rounded">
                  <b>Catatan Penting Akta Jual Beli / Hibah Khusus:</b><br/>
                  Pada form utama proyek (Tab General), jika Anda mengatur <b>"Tipe Akta"</b> menjadi "Jual Beli" atau "Hibah", pastikan Anda mengisi blok input Form Pihak Pertama (Penjual) dan Pihak Kedua (Pembeli). Preview akan otomatis menyesuaikan formatnya menjadi Akta Peralihan Saham tersendiri.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center shrink-0 font-bold text-xl">6</div>
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Mengganti Jabatan Pengurus (Direksi & Komisaris)</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Di tab <b>Data Pengurus Baru</b> (muncul jika mencentang Perubahan Pengurus). Sistem akan melist semua Direktur & Komisaris yang ada.
                Jika seseorang diberhentikan, klik tombol <b>Berhentikan</b> di kartunya. 
                Jika ditambah orang baru, klik <b>+ Tambah Pengurus</b>. Anda wajib menentukan gelar jabatan baru untuk setiap entitas yang aktif (misal: Direktur Utama, Komisaris).
              </p>
            </div>
          </div>
        </div>

        {/* Step 7 */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center shrink-0 font-bold text-xl">7</div>
            <div className="flex-1 space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Pratinjau, Revisi Cepat, dan Export DOCX</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Setiap perubahan yang Anda masukkan akan divalidasi ke dalam <b>Live Preview</b> yang bisa Anda buka melalui tombol <Eye className="w-4 h-4 inline bg-yellow-100 text-black p-0.5 rounded" /> Tampilkan Preview di kanan atas layar.
              </p>

              <div className="bg-slate-50 p-6 rounded border border-slate-200 mt-4 flex justify-center shadow-inner items-center gap-6">
                 <button className="bg-[#40bdae] text-white px-6 py-4 rounded-md shadow-lg font-bold flex items-center gap-2 transform hover:scale-105 transition">
                   <Printer className="w-6 h-6" /> EXPORT KE WORD
                 </button>
                 <ArrowRight className="text-slate-300 w-8 h-8" />
                 <div className="flex flex-col items-center">
                    <FileSignature className="w-12 h-12 text-[#3b5998] mb-1" />
                    <span className="text-sm font-bold text-slate-700">Dokumen.docx</span>
                    <span className="text-xs text-slate-400">Siap dicetak di kop notaris</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer support */}
      <div className="text-center mt-10">
        <p className="text-sm text-slate-500">Mempunyai pertanyaan atau kendala lanjutan? Silakan hubungi pengembang aplikasi atau Admin Notaris.</p>
      </div>
    </div>
  );
};

export default GuideMenu;

