const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/project-engine/components/ProjectDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const endOfComponentPos = content.lastIndexOf(');');
const modalCode = `
      {syncPreviewState && syncPreviewState.show && (
        <SyncPreviewModal
          isOpen={syncPreviewState.show}
          changes={syncPreviewState.changes}
          warnings={syncPreviewState.warnings}
          isLoading={isSyncing}
          onConfirm={syncPreviewState.onConfirm}
          onCancel={() => setSyncPreviewState(null)}
        />
      )}
`;

// Insert just before the last </div> or similar
// Usually there is a main wrapping div
const lastDiv = content.lastIndexOf('</div>');
if (lastDiv !== -1) {
  content = content.slice(0, lastDiv) + modalCode + content.slice(lastDiv);
  fs.writeFileSync(filePath, content);
  console.log('Successfully injected SyncPreviewModal');
}
