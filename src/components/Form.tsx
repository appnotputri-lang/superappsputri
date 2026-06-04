import React from 'react';

export interface FormState {
  hari: string;
  tanggalHuruf: string;
  alasanAudit: {
    a: boolean;
    b: boolean;
    c: boolean;
    d: boolean;
    e: boolean;
    f: boolean;
  };
  laporanNomor: string;
  laporanTanggalHuruf: string;
  tahunBukuAkhirHuruf: string;
}

interface Props {
  data: FormState;
  onChange: (data: FormState) => void;
}

const Form: React.FC<Props> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onChange({
      ...data,
      alasanAudit: {
        ...data.alasanAudit,
        [name as keyof FormState['alasanAudit']]: checked,
      },
    });
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-lg space-y-6 text-slate-800">
      <div>
        <h2 className="text-xl font-bold mb-4 font-serif border-b pb-2">Form Data Keputusan Sirkuler</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hari Keputusan</label>
          <input
            type="text"
            name="hari"
            value={data.hari}
            onChange={handleChange}
            placeholder="Misal: Senin"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Keputusan (Huruf)</label>
          <input
            type="text"
            name="tanggalHuruf"
            value={data.tanggalHuruf}
            onChange={handleChange}
            placeholder="Misal: dua puluh enam Mei dua ribu dua puluh enam (26-05-2026)"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-1">1. Alasan Tidak Wajib Audit</h3>
        <p className="text-xs text-gray-500 mb-2">Pilih salah satu, beberapa atau semuanya</p>
        
        <div className="space-y-2">
          {[
            { id: 'a', label: 'Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.' },
            { id: 'b', label: 'Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.' },
            { id: 'c', label: 'Perseroan tidak merupakan Perseroan Terbuka (Tbk).' },
            { id: 'd', label: 'Perseroan tidak merupakan Persero.' },
            { id: 'e', label: 'Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau' },
            { id: 'f', label: 'Tidak diwajibkan oleh peraturan perundang-undangan.' }
          ].map((item) => (
            <div key={item.id} className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id={`alasan-${item.id}`}
                  name={item.id}
                  type="checkbox"
                  checked={data.alasanAudit[item.id as keyof FormState['alasanAudit']]}
                  onChange={handleCheckboxChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor={`alasan-${item.id}`} className="font-medium text-gray-700">
                  {item.id}. {item.label}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-1">2 & 3. Data Laporan</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Laporan</label>
          <input
            type="text"
            name="laporanNomor"
            value={data.laporanNomor}
            onChange={handleChange}
            placeholder="Nomor SABH AHU..."
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Laporan (Huruf)</label>
          <textarea
            name="laporanTanggalHuruf"
            value={data.laporanTanggalHuruf}
            onChange={handleChange}
            rows={2}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Buku Berakhir (Huruf)</label>
           <textarea
             name="tahunBukuAkhirHuruf"
             value={data.tahunBukuAkhirHuruf}
             onChange={handleChange}
             rows={2}
             className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
           />
        </div>
      </div>
      
      <div className="pt-4 text-xs text-gray-500 bg-gray-50 p-4 rounded border border-gray-200">
        Informasi Pemegang Saham (Rajandran Shunmugam & Leila) sudah disematkan dalam template sesuai dengan dokumen asli.
      </div>
    </div>
  );
};

export default Form;
