import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Invoice } from '../../types';
import { getItemSubtotal } from '../../services/taxCalculator';

export function terbilang(n: number): string {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let num = Math.floor(Math.abs(n));
  if (num === 0) return "# Nol Rupiah #";
  
  function konversi(x: number): string {
    if (x < 12) return angka[x];
    else if (x < 20) return konversi(x - 10) + " Belas";
    else if (x < 100) return konversi(Math.floor(x / 10)) + " Puluh " + konversi(x % 10);
    else if (x < 200) return "Seratus " + konversi(x - 100);
    else if (x < 1000) return konversi(Math.floor(x / 100)) + " Ratus " + konversi(x % 100);
    else if (x < 2000) return "Seribu " + konversi(x - 1000);
    else if (x < 1000000) return konversi(Math.floor(x / 1000)) + " Ribu " + konversi(x % 1000);
    else if (x < 1000000000) return konversi(Math.floor(x / 1000000)) + " Juta " + konversi(x % 1000000);
    else if (x < 1000000000000) return konversi(Math.floor(x / 1000000000)) + " Milyar " + konversi(x % 1000000000);
    else if (x < 1000000000000000) return konversi(Math.floor(x / 1000000000000)) + " Triliun " + konversi(x % 1000000000000);
    return "";
  }
  
  const hasil = konversi(num).replace(/\s+/g, ' ').trim();
  return `# ${hasil} Rupiah #`;
}

export function numberToWordsEN(n: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  let num = Math.floor(Math.abs(n));
  if (num === 0) return "# Zero Rupiah #";

  function convert(x: number): string {
    if (x < 20) return units[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? " " + units[x % 10] : "");
    if (x < 1000) return units[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + convert(x % 100) : "");
    if (x < 1000000) return convert(Math.floor(x / 1000)) + " Thousand" + (x % 1000 ? " " + convert(x % 1000) : "");
    if (x < 1000000000) return convert(Math.floor(x / 1000000)) + " Million" + (x % 1000000 ? " " + convert(x % 1000000) : "");
    if (x < 1000000000000) return convert(Math.floor(x / 1000000000)) + " Billion" + (x % 1000000000 ? " " + convert(x % 1000000000) : "");
    return "";
  }

  const result = convert(num).replace(/\s+/g, ' ').trim();
  return `# ${result} Rupiah #`;
}

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  publicUrl?: string;
  lang?: 'id' | 'en';
}

export const InvoicePrintTemplate: React.FC<InvoicePrintTemplateProps> = ({ invoice, publicUrl, lang = 'id' }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const isEn = lang === 'en';

  const token = invoice.publicToken || invoice.id;
  const actualPublicUrl = publicUrl || invoice.legacyPublicUrl || `${window.location.origin}/${token}`;

  useEffect(() => {
    if (actualPublicUrl) {
      QRCode.toDataURL(actualPublicUrl, { width: 240, margin: 1 }, (err, url) => {
        if (!err && url) {
          setQrCodeDataUrl(url);
        }
      });
    }
  }, [actualPublicUrl]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatNum = (val?: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="bg-white p-8 md:p-10 text-slate-800 font-sans max-w-[800px] w-full mx-auto shadow-sm print:shadow-none print:p-0">
      {/* 1. TOP HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-[#2563eb] tracking-tight uppercase leading-tight">
            NOTARIS/PPAT NUKANTINI PUTRI<br />PARINCHA,SH.M.KN
          </h1>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-[#2563eb] tracking-wider uppercase mb-1">
            INVOICE
          </h2>
          <table className="text-xs text-right ml-auto border-collapse">
            <tbody>
              <tr>
                <td className="text-slate-500 font-medium pr-3 py-0.5">{isEn ? 'Invoice No' : 'Nomor'}</td>
                <td className="font-bold text-slate-900 py-0.5">{invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="text-slate-500 font-medium pr-3 py-0.5">{isEn ? 'Date' : 'Tanggal'}</td>
                <td className="font-bold text-slate-900 py-0.5">{formatDate(invoice.issueDate)}</td>
              </tr>
              <tr>
                <td className="text-slate-500 font-medium pr-3 py-0.5">{isEn ? 'Due Date' : 'Jatuh Tempo'}</td>
                <td className="font-bold text-slate-900 py-0.5">{formatDate(invoice.dueDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. DARI & TAGIHAN KEPADA SECTION */}
      <div className="grid grid-cols-2 gap-8 mb-6 text-xs">
        <div>
          <div className="border-b-2 border-slate-800 pb-1 mb-2">
            <span className="font-bold text-slate-900 uppercase">{isEn ? 'From' : 'Dari'}</span>
          </div>
          <p className="font-bold text-[#1d4ed8] text-xs mb-0.5">Notaris/PPAT Nukantini Putri Parincha</p>
          <p className="text-slate-600 leading-snug">Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391</p>
          <p className="text-slate-600 font-medium mt-0.5">08112007061</p>
        </div>

        <div>
          <div className="border-b-2 border-slate-800 pb-1 mb-2">
            <span className="font-bold text-slate-900 uppercase">{isEn ? 'Bill To' : 'Tagihan Kepada'}</span>
          </div>
          <p className="font-bold text-[#1d4ed8] text-xs mb-0.5">{invoice.clientName}</p>
          {invoice.clientAddress && (
            <p className="text-slate-600 leading-snug whitespace-pre-line">{invoice.clientAddress}</p>
          )}
          {invoice.clientPhone && <p className="text-slate-600 mt-0.5">{invoice.clientPhone}</p>}
        </div>
      </div>

      {/* 3. ITEMS TABLE */}
      <div className="mb-6">
        <div className="bg-[#1e293b] text-white px-4 py-2 rounded-t font-bold text-xs flex justify-between uppercase tracking-wider">
          <span>{isEn ? 'DESCRIPTION' : 'DESKRIPSI'}</span>
          <span>{isEn ? 'AMOUNT' : 'JUMLAH'}</span>
        </div>
        <div className="border-b border-slate-200 min-h-[120px]">
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((it, idx) => {
              const lines = it.description.split('\n');
              return (
                <div key={idx} className="flex justify-between px-4 py-3 text-xs border-b border-slate-100 last:border-b-0">
                  <div className="space-y-1 text-slate-800 pr-6">
                    {lines.map((line, lIdx) => {
                      const trimmed = line.trim();
                      const isHeader = /^[0-9]+\./.test(trimmed);
                      return (
                        <p
                          key={lIdx}
                          className={isHeader ? "font-bold text-slate-900 mt-1 first:mt-0" : "text-slate-700 pl-2"}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                  <div className="font-bold text-slate-900 text-right whitespace-nowrap align-top pt-1">
                    {formatNum(getItemSubtotal(it))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-400 italic text-xs">
              {isEn ? 'No line items available.' : 'Tidak ada rincian item.'}
            </div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM SECTION: TERBILANG & BANK (LEFT) VS TOTALS & QR (RIGHT) */}
      <div className="grid grid-cols-12 gap-6 text-xs">
        {/* LEFT COLUMN (7 Cols) */}
        <div className="col-span-7 space-y-4">
          {/* TERBILANG BOX */}
          <div className="bg-slate-100/90 p-3 rounded-lg border border-slate-200/50">
            <p className="text-[10px] text-slate-500 font-semibold mb-0.5">{isEn ? 'Amount in Words' : 'Terbilang'}</p>
            <p className="font-bold text-slate-900 text-xs italic">
              {isEn ? numberToWordsEN(invoice.totalAmount) : terbilang(invoice.totalAmount)}
            </p>
          </div>

          {/* PEMBAYARAN DITRANSFER KE BOX */}
          <div className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl space-y-1">
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1.5">
              {isEn ? 'PAYMENT TRANSFERRED TO:' : 'PEMBAYARAN DITRANSFER KE:'}
            </p>
            <p className="font-bold text-slate-900">{invoice.bankDetails?.bankName || 'BCA Cabang Dago - Bandung'}</p>
            <p className="font-bold text-slate-900">{invoice.bankDetails?.accountNumber || 'Acc. 7770673016'}</p>
            <p className="font-bold text-slate-900">{invoice.bankDetails?.accountHolder || 'A.n Nukantini Putri Parincha'}</p>
            
            <p className="text-slate-700 pt-1">
              {isEn ? 'Tax ID (NPWP) 16 digits :' : 'NPWP 16 digit :'} <span className="font-semibold">{invoice.bankDetails?.npwp || '3217015610760002'}</span>
            </p>
            <p className="text-slate-700">
              {isEn ? 'BCA SWIFT Code :' : 'SWIFT BCA :'} <span className="font-semibold">{invoice.bankDetails?.swiftCode || 'CENAIDJA'}</span>
            </p>

            {invoice.notes && (
              <p className="text-red-600 font-bold text-[10px] pt-2 leading-snug">
                * {invoice.notes}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols) */}
        <div className="col-span-5 space-y-5">
          {/* TOTALS BREAKDOWN */}
          <div className="space-y-1 text-right font-medium">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">{formatNum(invoice.subtotal || invoice.totalAmount)}</span>
            </div>

            {invoice.taxAmount && invoice.taxAmount > 0 ? (
              <div className="flex justify-between text-red-600">
                <span>{isEn ? 'Tax (PPh 21)' : 'Pajak (PPh 21)'}</span>
                <span className="font-bold">({formatNum(invoice.taxAmount)})</span>
              </div>
            ) : null}

            <div className="border-t-2 border-slate-900 mt-4 pt-3 flex justify-between font-black text-sm text-slate-900">
              <span>Total</span>
              <span>Rp {formatNum(invoice.totalAmount)}</span>
            </div>

            <div className="flex justify-between font-black text-sm text-red-600 pt-1.5">
              <span>{isEn ? 'Balance Due' : 'Sisa Tagihan'}</span>
              <span>{formatNum(invoice.balanceDue ?? invoice.totalAmount)}</span>
            </div>
          </div>

          {/* SIGNATURE & QR CODE */}
          <div className="flex flex-col items-center justify-center pt-1 text-center">
            <p className="text-xs font-semibold text-slate-800 mb-1">{isEn ? 'Sincerely,' : 'Hormat Kami,'}</p>
            
            {/* QR CODE DISPLAY */}
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code Link Invoice"
                className="w-24 h-24 my-1 object-contain border border-slate-200 rounded p-1 bg-white shadow-xs"
              />
            ) : (
              <div className="w-24 h-24 my-1 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[9px] text-slate-400">
                Generating QR...
              </div>
            )}

            <p className="font-bold text-slate-900 text-[10px] uppercase tracking-wide mt-1">
              NOTARIS/PPAT NUKANTINI PUTRI PARINCHA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

