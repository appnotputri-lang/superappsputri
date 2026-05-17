import React, { useState } from 'react';
import { CompanyProfile, Address, Shareholder, AmendmentDeed } from '../types';
import { Building2, Plus, Edit, Trash2, Save, X, History, MapPin } from 'lucide-react';
import { DomicileSelector } from './AddressFields';

interface CompanyProfileTabProps {
  profiles: CompanyProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<CompanyProfile[]>>;
}

export const CompanyProfileTab: React.FC<CompanyProfileTabProps> = ({ profiles, setProfiles }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-[#3b5998]" />  
        Company Profile
      </h2>
      <p className="text-sm text-slate-600 mb-6">Kelola daftar profil perusahaan untuk digunakan pada draf notulen dan akta.</p>
    </div>
  )
}
