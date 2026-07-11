const fs = require('fs');

function addProps(file, propsStr) {
  let content = fs.readFileSync(file, 'utf8');
  // insert into RUPSTPageProps interface
  content = content.replace("AutoSaveIndicatorComponent: React.ComponentType;\n}", "AutoSaveIndicatorComponent: React.ComponentType;\n" + propsStr + "\n}");
  // insert into RUPSTPage: React.FC<RUPSTPageProps> = ({ ...
  const lines = propsStr.split('\n').map(l => l.split(':')[0].trim()).filter(l => l);
  content = content.replace("AutoSaveIndicatorComponent\n})", "AutoSaveIndicatorComponent,\n" + lines.join(',\n') + "\n})");
  fs.writeFileSync(file, content);
}

const rupstProps = `  setProxyModalOpenId: (id: string | null) => void;
  activeProjectJobType: string | null;
  handleFetchLatestNumbers: () => Promise<void>;
  isFetchingNumbers: boolean;
  projects: any[];
  pendirianProjects: any[];
  syncCompanyDataToRupst: () => Promise<boolean>;`;

addProps('src/features/document-generator/pages/RUPSTPage.tsx', rupstProps);
addProps('src/features/document-generator/pages/DocumentGeneratorPage.tsx', rupstProps);
