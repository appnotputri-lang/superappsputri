import React from 'react';
import { AhuSection } from '../components/CompanyForm';

export const ContactSection: React.FC = () => {
  return (
    <AhuSection title="Company Contact">
      <div className="text-slate-400 italic text-[12px] p-2 bg-slate-50 border border-slate-100 rounded-sm">
        Detail kontak dan alamat lengkap akan dimigrasikan pada fase berikutnya.
      </div>
    </AhuSection>
  );
};
