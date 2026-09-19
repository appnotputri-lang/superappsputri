import React from 'react';
import { AhuSection } from '../components/CompanyForm';
import { AhuLabel, AhuInput, AhuSelect } from '../components/CompanyForm';

interface PicSectionProps {
  data: any;
  updateData: (updates: any) => void;
}

export const PicSection: React.FC<PicSectionProps> = ({ data, updateData }) => {
  const currentTitle = data.picTitle || (data.picName?.startsWith('Ibu ') ? 'Ibu' : 'Bapak');

  const handleTitleChange = (newTitle: string) => {
    let cleanName = data.picName || '';
    if (cleanName.startsWith('Bapak ')) {
      cleanName = cleanName.replace(/^Bapak\s+/, '');
    } else if (cleanName.startsWith('Ibu ')) {
      cleanName = cleanName.replace(/^Ibu\s+/, '');
    }
    updateData({ 
      picTitle: newTitle,
      picName: cleanName
    });
  };

  const handleNameChange = (val: string) => {
    if (val.startsWith('Ibu ')) {
      updateData({
        picTitle: 'Ibu',
        picName: val.replace(/^Ibu\s+/, '')
      });
    } else if (val.startsWith('Bapak ')) {
      updateData({
        picTitle: 'Bapak',
        picName: val.replace(/^Bapak\s+/, '')
      });
    } else {
      updateData({ picName: val });
    }
  };

  return (
    <AhuSection title="PENANGGUNG JAWAB (PIC)">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Nama PIC" />
          <div className="md:col-span-3 flex items-center gap-2">
            <div className="w-28 shrink-0">
              <AhuSelect 
                value={currentTitle} 
                onChange={e => handleTitleChange(e.target.value)}
                className="font-bold text-slate-700 bg-slate-50 cursor-pointer"
              >
                <option value="Bapak">Bapak</option>
                <option value="Ibu">Ibu</option>
              </AhuSelect>
            </div>
            <div className="flex-1 min-w-0">
              <AhuInput 
                value={data.picName || ''} 
                onChange={e => handleNameChange(e.target.value)} 
                placeholder="Contoh: Budi Santoso" 
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Nomor HP" />
          <div className="md:col-span-3">
            <AhuInput 
              value={data.picPhone || ''} 
              onChange={e => updateData({ picPhone: e.target.value })} 
              placeholder="Contoh: 081234567890" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Alamat Email" />
          <div className="md:col-span-3">
            <AhuInput 
              type="email"
              value={data.picEmail || ''} 
              onChange={e => updateData({ picEmail: e.target.value })} 
              placeholder="Contoh: budi@perusahaan.com" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
          <AhuLabel label="Alamat PIC" />
          <div className="md:col-span-3">
            <textarea 
              value={data.picAddress || ''} 
              onChange={e => updateData({ picAddress: e.target.value })} 
              placeholder="Alamat lengkap PIC"
              rows={3}
              className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800"
            />
          </div>
        </div>
      </div>
    </AhuSection>
  );
};
