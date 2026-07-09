import fs from 'fs';

let code = fs.readFileSync('App.tsx', 'utf8');

// fix imports
code = code.replace(/CheckCircle2 } from 'lucide-react';/, "CheckCircle2, RefreshCw } from 'lucide-react';");

fs.writeFileSync('App.tsx', code);
console.log('Fixed imports');
