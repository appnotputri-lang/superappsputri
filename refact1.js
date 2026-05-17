const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// 1. Find the start of the `company_profile` condition.
content = content.replace(
  "{activeSidebarTab === 'company_profile' ? (",
  "{activeSidebarTab === 'notulen' ? ("
);

// 2. Change the header text
content = content.replace(
  '<h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><Building2 className="w-5 h-5 text-[#3b5998]" /> Profil Perusahaan</h2>',
  '<h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><FileText className="w-5 h-5 text-[#3b5998]" /> Daftar Proyek</h2>'
);
content = content.replace(
  '<p className="text-[12px] text-slate-500">Kelola daftar profil perusahaan untuk digunakan pada notulen dan akta</p>',
  '<p className="text-[12px] text-slate-500">Kelola daftar proyek Notulen dan Akta RUPS</p>'
);
content = content.replace(
  '<Plus className="w-4 h-4" /> TAMBAH PROFIL',
  '<Plus className="w-4 h-4" /> TAMBAH PROYEK BARU'
);

// 3. Update the empty state text
content = content.replace(
  'Belum ada data profil perusahaan. Klik <strong>"TAMBAH PROFIL"</strong> untuk membuat.',
  'Belum ada data proyek. Klik <strong>"TAMBAH PROYEK BARU"</strong> untuk membuat.'
);

// 4. Update the "DETAIL" button to say "EDIT PROYEK"
content = content.replace(
  '<Edit className="w-3 h-3" /> Detail',
  '<Edit className="w-3 h-3" /> Edit'
);

// 5. Update delete confirm
content = content.replace(
  "confirm('Hapus profil ' + p.companyName + '?')",
  "confirm('Hapus proyek ' + p.companyName + '?')"
);
content = content.replace(
  "alert('Profil berhasil dihapus');",
  "alert('Proyek berhasil dihapus');"
);

fs.writeFileSync('App.tsx', content);
