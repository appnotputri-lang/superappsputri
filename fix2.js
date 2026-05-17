import fs from 'fs';

let code = fs.readFileSync('App.tsx', 'utf8');

const imports = `import { Modal } from './components/Modal';
import { ChevronRight, CheckCircle2, RefreshCw } from 'lucide-react';
`;

code = imports + code;

fs.writeFileSync('App.tsx', code);
console.log('Fixed imports manually');
