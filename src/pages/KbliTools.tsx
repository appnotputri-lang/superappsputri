import React from 'react';
import KBLIMapping from '../components/KBLIMapping';
import KBLISuggestions from '../components/KBLISuggestions';
import ImportKBLI from '../components/ImportKBLI';

interface KbliToolsProps {
  activeKbliTab: string;
}

export const KbliTools: React.FC<KbliToolsProps> = ({ activeKbliTab }) => {
  switch (activeKbliTab) {
    case 'kbli_mapping':
    case 'mapping':
      return <KBLIMapping />;
    case 'saran_kbli':
    case 'saran':
      return <KBLISuggestions />;
    case 'import_kbli':
    case 'import':
      return <ImportKBLI />;
    default:
      return null;
  }
};
