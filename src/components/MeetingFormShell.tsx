import React from 'react';
import { getRupsLbChairCandidates, resolveRupsLbChairPosition } from '../lib/meetingChairHelper';
import { MeetingAttendanceTable } from './MeetingAttendanceTable';
import { useDocumentRuntime } from '../domain/company/useDocumentRuntime';

interface MeetingFormShellProps {
  meetingType: 'tahunan' | 'luar_biasa';
  isCircular: boolean;
  onAddParticipant?: () => void;
  openShareholderEditor?: (mode: 'lama' | 'baru', shareholder?: any) => void;
  deleteShareholder?: (id: string, mode: 'lama' | 'baru') => void;
}

const AhuLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
  <label className="block text-[13px] font-medium text-slate-700 mb-1">
    {label} {required && <span className="text-red-500">*</span>}
  </label>
);

const AhuInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 ${className}`} 
  />
);

const AhuSelect = ({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 appearance-none ${className}`}
  >
    {children}
  </select>
);

export const MeetingFormShell: React.FC<MeetingFormShellProps> = ({
  meetingType,
  isCircular,
  onAddParticipant,
  openShareholderEditor,
  deleteShareholder,
}) => {
  const { data, mergedData, updateData, setProxyModalOpenId } = useDocumentRuntime();
  const actualData = mergedData || data;
  const chairCandidates = getRupsLbChairCandidates(actualData.shareholders || [], actualData.oldManagementItems || []);

  return (
    <div className="space-y-6">
      {/* 1. Blok Ketua Rapat */}
      {!isCircular && (
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm">
          <h4 className="text-[12px] font-bold text-slate-600 uppercase mb-4 tracking-wider">
            PIMPINAN RAPAT
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AhuLabel label="Pimpinan Rapat" required />
              <AhuSelect 
                value={actualData.meetingChair || ''} 
                onChange={e => {
                  const selectedName = e.target.value;
                  const position = resolveRupsLbChairPosition(selectedName, chairCandidates);
                  updateData({ 
                    meetingChair: selectedName,
                    meetingChairPosition: position
                  });
                }}
              >
                <option value="">-- Pilih Pimpinan Rapat --</option>
                {chairCandidates.map((m: any, idx: number) => (
                  <option key={idx} value={m.name}>{m.name} - {m.position}</option>
                ))}
              </AhuSelect>
            </div>
            <div>
              <AhuLabel label="Jabatan di PT" />
              <AhuInput 
                value={actualData.meetingChairPosition || ''} 
                onChange={e => updateData({ meetingChairPosition: e.target.value })} 
                placeholder="Contoh: Direktur Utama" 
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Blok Kehadiran */}
      <MeetingAttendanceTable 
        sectionTitle={meetingType === 'tahunan' ? "DATA KEHADIRAN (DAFTAR PARA PIHAK)" : "DAFTAR PARA PIHAK"} 
        presentLabel={meetingType === 'luar_biasa' && actualData.documentType === 'CIRCULAR' ? 'Terlibat?' : 'Hadir?'} 
        markAllLabel={`Tandai Semua ${meetingType === 'luar_biasa' && actualData.documentType === 'CIRCULAR' ? 'Terlibat' : 'Hadir'}`} 
        nameColumnLabel={meetingType === 'tahunan' ? "Nama Pemegang Saham" : "Nama Pihak"} 
        showAksiColumn={meetingType === 'luar_biasa'} 
        onAddParticipant={meetingType === 'luar_biasa' ? onAddParticipant : undefined} 
        addParticipantLabel={meetingType === 'luar_biasa' ? (actualData.documentType === 'CIRCULAR' ? 'Tambah Pihak Lain' : 'Tambah Peserta Rapat') : undefined}
        openShareholderEditor={openShareholderEditor}
        deleteShareholder={deleteShareholder}
      />

      {/* 3. Blok Penutup (Selesai + signingPlace) */}
      {!isCircular && (
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm">
          <h4 className="text-[12px] font-bold text-slate-600 uppercase mb-4 tracking-wider">
            PENUTUP RAPAT
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AhuLabel label="Waktu Selesai Rapat" required />
              <AhuInput 
                type="time" 
                value={actualData.meetingEndTime || actualData.rupstMeetingEndTime || ''} 
                onChange={e => updateData({ 
                  meetingEndTime: e.target.value, 
                  rupstMeetingEndTime: e.target.value 
                })} 
              />
            </div>
            <div>
              <AhuLabel label="Tempat Penandatanganan / Penyelenggaraan" required />
              <AhuInput 
                value={actualData.signingPlace || ''} 
                onChange={e => updateData({ signingPlace: e.target.value })} 
                placeholder="Contoh: Jakarta" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingFormShell;
