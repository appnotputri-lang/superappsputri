import React, { useState, useEffect } from 'react';
import { GeneralDocumentData } from '../../../types';
import { GeneralDocumentService } from '../../services/GeneralDocumentService';
import { printGeneralDocument, downloadGeneralDocumentPdf, getFooterText, formatDateIndonesian } from '../../utils/generalDocumentHtmlGenerator';
import { Printer, Download, RefreshCw, FileX } from 'lucide-react';

export const PublicGeneralDocumentViewer: React.FC = () => {
  const [docData, setDocData] = useState<GeneralDocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      const pathname = window.location.pathname;
      const parts = pathname.split('/').filter(Boolean);
      const token = parts[parts.length - 1];

      if (token) {
        const found = await GeneralDocumentService.getDocumentByPublicToken(token);
        setDocData(found);
      }
      setLoading(false);
    };
    fetchDoc();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center text-slate-500">
          <RefreshCw size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs font-semibold">Memuat dokumen...</p>
        </div>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="min-h-[100dvh] bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
          <FileX size={48} className="mx-auto text-slate-300 mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Dokumen Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mt-1">Tautan dokumen tidak valid atau telah dihapus.</p>
        </div>
      </div>
    );
  }

  const isDelivery = docData.docType === 'DELIVERY';
  const docTitle = isDelivery ? 'SURAT JALAN DOKUMEN' : 'TANDA TERIMA BERKAS';
  const rightBoxLabel = isDelivery ? 'UNTUK' : 'PENERIMA';

  return (
    <div className="min-h-[100dvh] bg-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Control Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            {docTitle} • {docData.referenceNo}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printGeneralDocument(docData)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              <span>Cetak</span>
            </button>
            <button
              onClick={() => downloadGeneralDocumentPdf(docData)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
            >
              <Download size={15} />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>

        {/* Document Paper Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10">
          {/* HEADER */}
          <div className="flex justify-between items-start pb-3 border-b-2 border-slate-900 mb-6 gap-4">
            <div>
              <div className="text-base font-extrabold text-slate-900">
                Notaris/PPAT Nukantini Putri Parincha,SH.M.kn
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391<br />
                Email: notarisppatputri@gmail.com | Telp: 08112007061
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NOMOR</div>
              <div className="text-2xl font-black text-slate-900 leading-none mt-0.5">{docData.referenceNo}</div>
            </div>
          </div>

          {/* TITLE & DATE */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">{docTitle}</h1>
            <p className="text-xs text-slate-500 mt-1">Tanggal: {formatDateIndonesian(docData.date, true)}</p>
          </div>

          {/* BOXES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">PENGIRIM</div>
              <div className="text-xs font-extrabold text-slate-900 leading-snug">
                Notaris/PPAT Nukantini Putri Parincha,SH.M.kn
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{rightBoxLabel}</div>
              <div className="text-xs font-extrabold text-slate-900 uppercase leading-snug">
                {docData.clientPic ? docData.clientPic.toUpperCase() : docData.clientName.toUpperCase()}
              </div>
              {docData.clientPic && docData.clientName && (
                <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">({docData.clientName})</div>
              )}
              {docData.deliveryMethod && (
                <div className="text-xs text-slate-500 mt-1">Via: {docData.deliveryMethod}</div>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold">
                  <th className="py-2.5 px-4 text-center w-12">No</th>
                  <th className="py-2.5 px-4">Deskripsi Berkas / Barang</th>
                  <th className="py-2.5 px-4 text-center w-32">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {docData.items?.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 whitespace-pre-wrap font-medium text-slate-900">{it.description}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-900">{it.type || 'Asli'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DISCLAIMER BOX */}
          <div className="bg-slate-50 p-3.5 rounded-xl text-[10px] text-slate-500 italic leading-relaxed text-justify mb-8">
            {getFooterText(docData)}
          </div>

          {/* SIGNATURES */}
          <div className="grid grid-cols-2 gap-8 text-center pt-2">
            <div>
              <div className="text-xs text-slate-500 mb-14">Diserahkan Oleh,</div>
              <div className="w-3/4 mx-auto border-b border-slate-900 pb-0.5 text-xs font-extrabold text-slate-900 uppercase">
                {docData.officerName || 'SITI NUR AZIZAH'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Tanda Tangan & Nama Terang</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">{formatDateIndonesian(docData.date, false)}</div>
              <div className="text-xs text-slate-500 mb-14">Diterima Oleh,</div>
              <div className="w-3/4 mx-auto border-b border-slate-900 h-4"></div>
              <div className="text-[10px] text-slate-400 mt-1">Tanda Tangan & Stempel</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicGeneralDocumentViewer;
