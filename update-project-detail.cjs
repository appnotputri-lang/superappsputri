const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/project-engine/components/ProjectDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for SyncPreviewModal
const stateHookPos = content.indexOf('const [isMigrating, setIsMigrating] = useState(false);');
if (stateHookPos !== -1) {
  const stateHookCode = `  const [syncPreviewState, setSyncPreviewState] = useState<{
    show: boolean;
    changes: any[];
    warnings: string[];
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
`;
  content = content.slice(0, stateHookPos) + stateHookCode + content.slice(stateHookPos);
}

// 2. Refactor syncDeedInfoAndClientProfile to calculate payload and show modal, returning a promise that resolves when done.
// We'll rename the internal part to calculateSyncPayload and change syncDeedInfoAndClientProfile to wait for modal.
fs.writeFileSync(filePath, content);
console.log('Done state update');
