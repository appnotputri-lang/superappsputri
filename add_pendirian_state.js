const fs = require('fs');

let appContent = fs.readFileSync('App.tsx', 'utf8');

appContent = appContent.replace(
  `const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);`,
  `const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);\n  const [pendirianProjects, setPendirianProjects] = useState<CompanyData[]>([]);`
);

appContent = appContent.replace(
  `let rupstReady = false;`,
  `let rupstReady = false;\n      let pendirianReady = false;`
);

appContent = appContent.replace(
  `if (profilesReady && projectsReady && rupstReady) {`,
  `if (profilesReady && projectsReady && rupstReady && pendirianReady) {`
);

appContent = appContent.replace(
  `const rupstRef = collection(db, 'rupst_projects');`,
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
        handleFirestoreError(error, OperationType.LIST, \`pendirian_projects\`);
        pendirianReady = true;
        checkIfLoaded();
      });

      const rupstRef = collection(db, 'rupst_projects');`
);

appContent = appContent.replace(
  `return () => { unsubProfiles(); unsubProjects(); unsubRupst(); };`,
  `return () => { unsubProfiles(); unsubProjects(); unsubRupst(); unsubPendirian(); };`
);

appContent = appContent.replace(
  `setRupstProjects([]);`,
  `setRupstProjects([]);\n      setPendirianProjects([]);`
);

appContent = appContent.replace(
  `const [editingRupstId, setEditingRupstId] = useState<string | null>(null);`,
  `const [editingRupstId, setEditingRupstId] = useState<string | null>(null);\n  const [editingPendirianId, setEditingPendirianId] = useState<string | null>(null);`
);

fs.writeFileSync('App.tsx', appContent);
