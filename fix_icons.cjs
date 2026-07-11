const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { History, Archive, Coins, Users, FileSignature, CheckSquare, XCircle, Search, Calendar, Play } from 'lucide-react';", "import { History, Archive, Coins, Users, FileSignature, CheckSquare, XCircle, Search, Calendar, Play, ArrowRightLeft, TrendingUp, MapPin } from 'lucide-react';");
  fs.writeFileSync(file, content);
}

fix('src/features/document-generator/pages/RUPSLBPage.tsx');
fix('src/features/document-generator/pages/RUPSTPage.tsx');
