const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// replace "export default App;" with our wrapper
code = code.replace("export default App;", `const App: React.FC = () => {
  return (
    <DocumentRuntimeProvider>
      <AppShell />
    </DocumentRuntimeProvider>
  );
};

export default App;`);

// ensure we import DocumentRuntimeProvider
code = code.replace(
  "import { useDocumentRuntime } from './src/domain/company/useDocumentRuntime';",
  "import { useDocumentRuntime, DocumentRuntimeProvider } from './src/domain/company/useDocumentRuntime';"
);

fs.writeFileSync('App.tsx', code);
console.log("Patched App.tsx end");
