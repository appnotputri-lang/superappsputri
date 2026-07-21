import React, { useState } from 'react';
import { CompanyFormProps } from '../types/company.types';
import { OperationType } from '../../../../src/lib/firebase';
import {
  GeneralInformationSection,
  CompanyIdentitySection,
  LegalInformationSection,
  ContactSection,
  PicSection,
  StatusSection,
  CapitalSection,
  AddressSection,
  ShareholderSection,
  ManagementSection,
} from '../sections';

// Shared UI helper components used across form sections
export const AhuSection = ({ title, children, isOpen = true }: { title: string, children: React.ReactNode, isOpen?: boolean }) => {
  const [open, setOpen] = useState(isOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-sm mb-4 shadow-sm">
      <div 
        onClick={() => setOpen(!open)}
        className="bg-[#f5f5f5] px-4 py-2 flex justify-between items-center cursor-pointer border-b border-slate-200 group"
      >
        <span className="text-[12px] font-bold text-[#333] uppercase">{title}</span>
        <span className="text-slate-400 group-hover:text-slate-600 text-xs">
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

export const AhuLabel = ({ label, required }: { label: string, required?: boolean }) => {
  return (
    <label className="text-[11px] font-bold text-slate-600 block uppercase">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
};

export const AhuInput = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input 
      {...props} 
      className={`w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all ${className}`} 
    />
  );
};

export const AhuSelect = ({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select 
      {...props} 
      className={`w-full text-[12px] border border-slate-300 rounded-sm p-1.5 bg-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all ${className}`}
    >
      {children}
    </select>
  );
};

export const CompanyForm: React.FC<CompanyFormProps> = ({
  data,
  isProfilePreview,
  setIsProfilePreview,
  updateData,
  resetData,
  isSaving,
  setIsSaving,
  saveCompany,
  editingProfileId,
  setEditingProfileId,
  user,
  recordNotification,
  handleFirestoreError,
  isAddKbliModalOpen,
  setIsAddKbliModalOpen,
  openShareholderEditor,
  deleteShareholder,
}) => {
  return (
    <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button 
            onClick={() => {
              resetData();
              setEditingProfileId(null);
            }} 
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md text-[13px] font-bold transition-all hover:bg-slate-300 uppercase shadow-sm"
          >
            Kembali
          </button>
          {!isProfilePreview && (
            <button 
              onClick={() => setIsProfilePreview(true)} 
              className="px-4 py-2 bg-[#222d32] text-white rounded-md text-[13px] font-bold transition-all hover:bg-black uppercase shadow-sm"
            >
              Preview
            </button>
          )}
        </div>
        <button 
          disabled={isSaving}
          onClick={async () => {
            setIsSaving(true);
            try {
                const profileData = {
                  ...data,
                  updatedAt: new Date().toISOString(),
                  updatedBy: user?.email || 'System'
                };
                
                await saveCompany(data.id, profileData, true);
                recordNotification(
                  'Profil Perusahaan Diperbarui', 
                  `Profil ${data.companyName} telah berhasil diperbarui.`, 
                  'info'
                );
                
                setEditingProfileId(null);
                alert('Profil berhasil disimpan!');
            } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, `profiles/${data.id}`);
            } finally {
                setIsSaving(false);
            }
          }} 
          className="px-5 py-2 bg-[#40bdae] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#349c8f] shadow-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'MENYIMPAN...' : 'SIMPAN PROFIL'}
        </button>
      </div>
      
      <fieldset disabled={isProfilePreview} className="space-y-4">
        {/* 1. GENERAL INFORMATION */}
        <GeneralInformationSection data={data} updateData={updateData} />

        {/* PIC SECTION */}
        <PicSection data={data} updateData={updateData} />

        {/* 2. COMPANY IDENTITY */}
        <CompanyIdentitySection data={data} updateData={updateData} />

        {/* 3. LEGAL INFORMATION */}
        <LegalInformationSection 
          data={data} 
          updateData={updateData} 
          setIsAddKbliModalOpen={setIsAddKbliModalOpen} 
        />

        {/* 4. COMPANY CONTACT */}
        <ContactSection />

        {/* 5. COMPANY STATUS */}
        <StatusSection data={data} updateData={updateData} />

        {/* 6. CAPITAL SECTION */}
        <CapitalSection data={data} updateData={updateData} />

        {/* 7. ADDRESS SECTION */}
        <AddressSection data={data} updateData={updateData} />

        {/* 8. SHAREHOLDER SECTION */}
        <ShareholderSection 
          data={data} 
          updateData={updateData} 
          openShareholderEditor={openShareholderEditor} 
          deleteShareholder={deleteShareholder} 
        />

        {/* 9. MANAGEMENT SECTION */}
        <ManagementSection 
          data={data} 
          updateData={updateData} 
          openShareholderEditor={openShareholderEditor} 
          deleteShareholder={deleteShareholder} 
        />
      </fieldset>
    </div>
  );
};

export default CompanyForm;
