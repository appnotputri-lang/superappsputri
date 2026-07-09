const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// 1. Add `pendirianProjects` state right after `rupstProjects`
if (!content.includes('const [pendirianProjects')) {
  content = content.replace(
    'const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);',
    'const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);\n  const [pendirianProjects, setPendirianProjects] = useState<CompanyData[]>([]);'
  );
}

// Add pendirianReady
if (!content.includes('let pendirianReady = false;')) {
  content = content.replace(
    'let rupstReady = false;',
    'let rupstReady = false;\n      let pendirianReady = false;'
  );
  content = content.replace(
    'if (profilesReady && projectsReady && rupstReady) {',
    'if (profilesReady && projectsReady && rupstReady && pendirianReady) {'
  );
}

// Add unsubPendirian
if (!content.includes('const pendirianRef = collection(db, \\\'pendirian_projects\\\');')) {
  content = content.replace(
    'const rupstRef = collection(db, \'rupst_projects\');',
    `const pendirianRef = collection(db, 'pendirian_projects');
      const unsubPendirian = onSnapshot(pendirianRef, (snapshot) => {
        const loaded: CompanyData[] = [];
        snapshot.forEach(doc => {
          loaded.push(doc.data() as CompanyData);
        });
        setPendirianProjects(loaded);
        pendirianReady = true;
        checkIfLoaded();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pendirian_projects');
        pendirianReady = true;
        checkIfLoaded();
      });

      const rupstRef = collection(db, 'rupst_projects');`
  );
  content = content.replace(
    'return () => { unsubProfiles(); unsubProjects(); unsubRupst(); };',
    'return () => { unsubProfiles(); unsubProjects(); unsubRupst(); unsubPendirian(); };'
  );
  content = content.replace(
    'setRupstProjects([]);',
    'setRupstProjects([]);\n      setPendirianProjects([]);'
  );
}

// Add editingPendirianId state
if (!content.includes('const [editingPendirianId')) {
  content = content.replace(
    'const [editingRupstId, setEditingRupstId] = useState<string | null>(null);',
    'const [editingRupstId, setEditingRupstId] = useState<string | null>(null);\n  const [editingPendirianId, setEditingPendirianId] = useState<string | null>(null);'
  );
}

// Dashboard statistics blocks
// Find the RUPST dashboard stat and duplicate it for Pendirian PT
const rupstStatRegex = /<div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm flex items-center justify-between hover:shadow transition-shadow">[\s\S]*?<History className="w-6 h-6" \/>\s*<\/div>\s*<\/div>/;
if (!content.includes('Draft Pendirian PT')) {
  const matchStat = content.match(rupstStatRegex);
  if (matchStat) {
    const pendirianStat = matchStat[0]
      .replace('Draft RUPS Tahunan', 'Draft Pendirian PT')
      .replace('{rupstProjects.length}', '{pendirianProjects.length}')
      .replace('Pertanggungjawaban tahun buku', 'Draft akta pendirian')
      .replace('History', 'FileCode');
    
    // Modify grid cols from 3 to 4
    content = content.replace('grid-cols-1 md:grid-cols-3 gap-4', 'grid-cols-1 md:grid-cols-4 gap-4');
    
    content = content.replace(matchStat[0], matchStat[0] + '\n\n' + pendirianStat);
  }
}

// Dashboard "Recent Drafts" grids
const rupstRecentRegex = /{\/\* Recent RUPS Tahunan \(RUPST\) Drafts \*\/}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
if (!content.includes('Recent Pendirian PT Drafts')) {
  const matchRecent = content.match(rupstRecentRegex);
  if (matchRecent) {
    const rupstRecentBlock = matchRecent[0];
    const pendirianRecentBlock = rupstRecentBlock
      .replace('Recent RUPS Tahunan (RUPST) Drafts', 'Recent Pendirian PT Drafts')
      .replace('RUPS Tahunan Terbaru', 'Pendirian PT Terbaru')
      .replace('setActiveSidebarTab(\'rupst\')', 'setActiveSidebarTab(\'pendirian\')')
      .replace('Semua RUPST', 'Semua Pendirian')
      .replace('rupstProjects', 'pendirianProjects')
      .replace('rupstProjects', 'pendirianProjects')
      .replace('rupstProjects', 'pendirianProjects')
      .replace('rupstProjects', 'pendirianProjects') // multiple replacements
      .replace('History', 'FileCode')
      .replace('Belum ada draft RUPS Tahunan di sistem', 'Belum ada draft Pendirian PT di sistem')
      .replace('emerald-500', 'teal-500')
      .replace('emerald-600', 'teal-600')
      .replace('emerald-50', 'teal-50')
      .replace('emerald-300', 'teal-300')
      .replace('p.rupstFiscalYear', 'p.companyName') // fallback
      .replace('Tahun Buku', 'Draft')
      .replace('setEditingRupstId', 'setEditingPendirianId')
      .replace('activeSidebarTab === \'rupst\'', 'activeSidebarTab === \'pendirian\'');

    // Change grid from 2 to 3
    content = content.replace('grid-cols-1 lg:grid-cols-2 gap-6', 'grid-cols-1 lg:grid-cols-3 gap-6');
    // Careful with regex match replacing too much, so we replace only the exact string.
    content = content.replace(rupstRecentBlock, rupstRecentBlock.replace('</div>\n              </div>', '</div>\n\n' + pendirianRecentBlock));
  }
}

// Find the RUPST tab block and replace the Pendirian PT tab block
const rupstTabRegex = /(\) : activeSidebarTab === 'rupst' \? \([\s\S]*?)(\n\s*\) : activeSidebarTab === 'sirkuler_laporan' \? \()/;
const pendirianTabRegex = /(\) : activeSidebarTab === 'pendirian' \? \([\s\S]*?)(\n\s*\) : activeSidebarTab === 'perbaikan' \? \()/;

const rupstMatch = content.match(rupstTabRegex);
const pendirianMatch = content.match(pendirianTabRegex);

if (rupstMatch && pendirianMatch) {
  let pendirianBlock = rupstMatch[1]
    .replace(") : activeSidebarTab === 'rupst' ? (", ") : activeSidebarTab === 'pendirian' ? (");

  // Rename all references of RUPST to Pendirian PT
  pendirianBlock = pendirianBlock
    .replace(/RUPS Tahunan \(RUPST\)/g, 'Pendirian PT')
    .replace(/RUPS Tahunan/g, 'Pendirian PT')
    .replace(/RUPST/g, 'Pendirian PT')
    .replace(/rupst/g, 'pendirian')
    .replace(/History/g, 'FileCode')
    .replace(/setEditingRupstId/g, 'setEditingPendirianId')
    .replace(/editingRupstId/g, 'editingPendirianId')
    .replace(/rupst_projects/g, 'pendirian_projects');

  content = content.replace(pendirianMatch[1], pendirianBlock);
}

fs.writeFileSync('App.tsx', content);

