import React, { useState, useMemo, useRef } from 'react';
import { Deed, DeedAppearer, DeedGrantor } from '../types';
import { exportToPDF } from '../utils/pdfExportHelper';
import { printHtmlString } from '../utils/printHelper';
import {
  Printer,
  ArrowLeft,
  Share2,
  Loader2,
  Download,
  Search,
  Check,
  ListOrdered
} from 'lucide-react';

// Mock/Placeholder helpers as requested if not present in workspace
export const getCachedSettings = () => ({
  notaryName: 'NUKANTINI PUTRI PARINCHA,SH.M.KN',
  city: 'Bandung Barat',
  officeAddress: 'Jl. Raya Notaris No. 123, Jawa Barat'
});

export const getSignatureImage = () => null;

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface DeedAlphabeticalReportProps {
  deeds?: Deed[];
  month?: number;
  year?: number;
  signatureDate?: string;
  onBack?: () => void;
}

// Sample dummy data matching the uploaded PDF screenshot exactly
const DUMMY_DEEDS: Deed[] = [
  {
    id: 'd1368',
    orderNumber: '1368',
    number: '1',
    deedNumber: '1',
    date: '2026-07-01',
    deedDate: '2026-07-01',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT VPHAR LABORATORIES INDONESIA',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT VPHAR LABORATORIES INDONESIA',
    appearers: [
      {
        id: 'a1368',
        name: 'ROSLIA CORRY MEDIANA MANASE',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'DICKY PRASETYO' }]
      }
    ]
  },
  {
    id: 'd1369',
    orderNumber: '1369',
    number: '2',
    deedNumber: '2',
    date: '2026-07-02',
    deedDate: '2026-07-02',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT KAIYE TECHNOLOGY INDONESIA',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT KAIYE TECHNOLOGY INDONESIA',
    appearers: [
      {
        id: 'a1369',
        name: 'VINCENT TANTINUS',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'WEI, NAICHENG' }]
      }
    ]
  },
  {
    id: 'd1370',
    orderNumber: '1370',
    number: '3',
    deedNumber: '3',
    date: '2026-07-03',
    deedDate: '2026-07-03',
    title: 'HIBAH MEREK',
    deedTitle: 'HIBAH MEREK',
    appearers: [
      { id: 'a1370-1', name: 'MUHAMAD GHOFUUR', role: 'Self' },
      { id: 'a1370-2', name: 'YOSTRIA', role: 'Self' }
    ]
  },
  {
    id: 'd1371',
    orderNumber: '1371',
    number: '4',
    deedNumber: '4',
    date: '2026-07-06',
    deedDate: '2026-07-06',
    title: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM TAHUNAN PT JUBILEE TOKYO JEWELRY',
    deedTitle: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM TAHUNAN PT JUBILEE TOKYO JEWELRY',
    appearers: [
      {
        id: 'a1371',
        name: 'RAJANDRAN SHUNMUGAM',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'LEILA' }]
      }
    ]
  },
  {
    id: 'd1372',
    orderNumber: '1372',
    number: '5',
    deedNumber: '5',
    date: '2026-07-06',
    deedDate: '2026-07-06',
    title: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT JUBILEE TOKYO JEWELRY',
    deedTitle: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT JUBILEE TOKYO JEWELRY',
    appearers: [
      {
        id: 'a1372',
        name: 'RAJANDRAN SHUNMUGAM',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'LEILA' }]
      }
    ]
  },
  {
    id: 'd1373',
    orderNumber: '1373',
    number: '6',
    deedNumber: '6',
    date: '2026-07-06',
    deedDate: '2026-07-06',
    title: 'HIBAH SAHAM',
    deedTitle: 'HIBAH SAHAM',
    appearers: [
      { id: 'a1373-1', name: 'LEILA', role: 'Self' },
      { id: 'a1373-2', name: 'SYAHRUL GUFRAN', role: 'Self' }
    ]
  },
  {
    id: 'd1374',
    orderNumber: '1374',
    number: '7',
    deedNumber: '7',
    date: '2026-07-07',
    deedDate: '2026-07-07',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT BINA PETROGAS MANDIRI',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT BINA PETROGAS MANDIRI',
    appearers: [
      {
        id: 'a1374',
        name: 'IR NGATIJAN, MT',
        role: 'Proxy',
        grantors: [
          { id: 'g1', name: 'IR INDRA PRASETYO' },
          { id: 'g2', name: 'KOPERASI BINA PETRO MANDIRI (KBPM)' }
        ]
      }
    ]
  },
  {
    id: 'd1375',
    orderNumber: '1375',
    number: '8',
    deedNumber: '8',
    date: '2026-07-10',
    deedDate: '2026-07-10',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM PT ARENBI SUKSES SEJATI',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM PT ARENBI SUKSES SEJATI',
    appearers: [
      {
        id: 'a1375',
        name: 'ANTONIUS JUNIANTO TANIJAYA',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'MELIA SAVITRI' }]
      }
    ]
  },
  {
    id: 'd1376',
    orderNumber: '1376',
    number: '9',
    deedNumber: '9',
    date: '2026-07-10',
    deedDate: '2026-07-10',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT ARENBI SUKSES SEJATI',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT ARENBI SUKSES SEJATI',
    appearers: [
      {
        id: 'a1376',
        name: 'ANTONIUS JUNIANTO',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'MELIA SAVITRI' }]
      }
    ]
  },
  {
    id: 'd1377',
    orderNumber: '1377',
    number: '10',
    deedNumber: '10',
    date: '2026-07-10',
    deedDate: '2026-07-10',
    title: 'PENDIRIAN PERSEROAN TERBATAS PT. KENCANA FORTUNA SENTOSA',
    deedTitle: 'PENDIRIAN PERSEROAN TERBATAS PT. KENCANA FORTUNA SENTOSA',
    appearers: [
      { id: 'a1377-1', name: 'AGUS SALIM', role: 'Self' },
      { id: 'a1377-2', name: 'YENDRIANOF RAMLAN', role: 'Self' }
    ]
  },
  {
    id: 'd1378',
    orderNumber: '1378',
    number: '11',
    deedNumber: '11',
    date: '2026-07-10',
    deedDate: '2026-07-10',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT SHARON SEKAWAN SEJAHTERA',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM YANG DIAMBIL DI LUAR RAPAT SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA PT SHARON SEKAWAN SEJAHTERA',
    appearers: [
      {
        id: 'a1378',
        name: 'FIRMANO SALEH KAMARUDDIN',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'DRG. TJAKRA NARAYANA NARAYANA, MARS' }]
      }
    ]
  },
  {
    id: 'd1379',
    orderNumber: '1379',
    number: '12',
    deedNumber: '12',
    date: '2026-07-10',
    deedDate: '2026-07-10',
    title: 'Akta Hibah Saham',
    deedTitle: 'Akta Hibah Saham',
    appearers: [
      { id: 'a1379-1', name: 'DRG. TJAKRA NARAYANA NARAYANA, MARS', role: 'Self' },
      { id: 'a1379-2', name: 'DIAN NUGROHO', role: 'Self' }
    ]
  },
  {
    id: 'd1380',
    orderNumber: '1380',
    number: '13',
    deedNumber: '13',
    date: '2026-07-10',
    deedDate: '2026-07-10',
    title: 'Akta Hibah Saham',
    deedTitle: 'Akta Hibah Saham',
    appearers: [
      { id: 'a1380-1', name: 'DWI PUSPA, S.KOM', role: 'Self' },
      { id: 'a1380-2', name: 'FIRMANO SALEH KAMARUDDIN', role: 'Self' },
      { id: 'a1380-3', name: 'FACHRURRAZI', role: 'Self' }
    ]
  },
  {
    id: 'd1381',
    orderNumber: '1381',
    number: '14',
    deedNumber: '14',
    date: '2026-07-14',
    deedDate: '2026-07-14',
    title: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM TAHUNAN PT GENTA CIPTA KOMUNIKA',
    deedTitle: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM TAHUNAN PT GENTA CIPTA KOMUNIKA',
    appearers: [
      {
        id: 'a1381',
        name: 'MUHAMMAD IQBAL ARIBASKARA',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'RADEN MOHAMAD GIFNY RICHATA' }]
      }
    ]
  },
  {
    id: 'd1382',
    orderNumber: '1382',
    number: '15',
    deedNumber: '15',
    date: '2026-07-20',
    deedDate: '2026-07-20',
    title: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM TAHUNAN PT VPHAR LAB AND RESEARCH',
    deedTitle: 'PERNYATAAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM TAHUNAN PT VPHAR LAB AND RESEARCH',
    appearers: [
      {
        id: 'a1382',
        name: 'ELDI SORAYA CHOIRUNISSA',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'ROSLIA CORRY MEDIANA MANASE' }]
      }
    ]
  },
  {
    id: 'd1383',
    orderNumber: '1383',
    number: '16',
    deedNumber: '16',
    date: '2026-07-21',
    deedDate: '2026-07-21',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM PT MULIA WAHANA PRIMA',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM PT MULIA WAHANA PRIMA',
    appearers: [
      {
        id: 'a1383',
        name: 'TANAGA TANUWIDJAJA',
        role: 'SelfAndProxy',
        grantors: [{ id: 'g1', name: 'WINARTI SADELI' }]
      }
    ]
  },
  {
    id: 'd1399',
    orderNumber: '1399',
    number: '17',
    deedNumber: '17',
    date: '2026-07-29',
    deedDate: '2026-07-29',
    title: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM PT KEENCONNECT KONSULTAMA INDONESIA',
    deedTitle: 'PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM PT KEENCONNECT KONSULTAMA INDONESIA',
    appearers: [
      {
        id: 'a1399',
        name: 'MUNGKY MEDISA KUSPARAMITA',
        role: 'SelfAndProxy',
        grantors: [
          { id: 'g1', name: 'SERGIO CENCERRADO GAUTAMA' },
          { id: 'g2', name: 'ZULVIE KARISMA HADI' }
        ]
      }
    ]
  }
];

const ALPHABET_LIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const DeedAlphabeticalReport: React.FC<DeedAlphabeticalReportProps> = ({
  deeds = DUMMY_DEEDS,
  month = 7,
  year = 2026,
  signatureDate,
  onBack
}) => {
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  const settings = getCachedSettings();
  const monthName = MONTH_NAMES[month - 1] || 'Juli';
  const displaySigDate = signatureDate || `${settings.city}, 29 ${monthName} ${year}`;

  const sourceDeeds = useMemo(() => {
    return deeds && deeds.length > 0 ? deeds : DUMMY_DEEDS;
  }, [deeds]);

  // Helper to format date string to Indo e.g. "10 Juli 2026"
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const d = parts[2];
      return `${parseInt(d, 10)} ${MONTH_NAMES[m] || ''} ${y}`;
    }
    return dateStr;
  };

  // Helper to format Grantor Name
  const formatGrantorName = (gName: string) => {
    const trimmed = gName.trim().toUpperCase();
    if (trimmed.startsWith('QQ ') || trimmed.startsWith('QQ.')) {
      return trimmed;
    }
    return `QQ ${trimmed}`;
  };

  // Group deeds by alphabet letters A-Z
  const letterSections = useMemo(() => {
    const sections: {
      letter: string;
      deeds: {
        deed: Deed;
        matchingAppearerJSX: React.ReactNode;
        matchingAppearerHTML: string;
      }[];
    }[] = [];

    ALPHABET_LIST.forEach((letter) => {
      const letterDeeds: {
        deed: Deed;
        matchingAppearerJSX: React.ReactNode;
        matchingAppearerHTML: string;
      }[] = [];

      sourceDeeds.forEach((d) => {
        if (!d.appearers || d.appearers.length === 0) return;

        // Check if any appearer or grantor starts with this letter
        const matchingApps = d.appearers.filter((app) => {
          if (!app.name) return false;
          const appNameUpper = app.name.trim().toUpperCase();
          if (appNameUpper.startsWith(letter)) return true;

          // Check grantors
          if (app.grantors && app.grantors.length > 0) {
            return app.grantors.some((g) => g.name && g.name.trim().toUpperCase().startsWith(letter));
          }
          return false;
        });

        if (matchingApps.length > 0) {
          // Build JSX & HTML representation for appearers cell
          const jsxElements: React.ReactNode[] = [];
          const htmlLines: string[] = [];

          matchingApps.forEach((app, appIdx) => {
            const isBoth = app.role === 'Both' || app.role === 'SelfAndProxy';
            const isProxy = app.role === 'Proxy';
            const grantors = app.grantors || [];
            const appNameUpper = app.name?.trim().toUpperCase();

            if (isBoth) {
              jsxElements.push(
                <div key={appIdx} className="space-y-0.5">
                  <div className="font-bold">{appNameUpper}</div>
                  <div className="font-bold">{appNameUpper}</div>
                  {grantors.map((g, gIdx) => (
                    <div key={gIdx} className="font-normal pl-3">
                      {formatGrantorName(g.name)}
                    </div>
                  ))}
                </div>
              );

              let lineHtml = `<div style="font-weight: bold;">${appNameUpper}</div><div style="font-weight: bold;">${appNameUpper}</div>`;
              grantors.forEach((g) => {
                lineHtml += `<div style="padding-left: 12px; font-weight: normal;">${formatGrantorName(g.name)}</div>`;
              });
              htmlLines.push(lineHtml);
            } else if (isProxy) {
              jsxElements.push(
                <div key={appIdx} className="space-y-0.5">
                  <div className="font-bold">{appNameUpper}</div>
                  {grantors.map((g, gIdx) => (
                    <div key={gIdx} className="font-normal pl-3">
                      {formatGrantorName(g.name)}
                    </div>
                  ))}
                </div>
              );

              let lineHtml = `<div style="font-weight: bold;">${appNameUpper}</div>`;
              grantors.forEach((g) => {
                lineHtml += `<div style="padding-left: 12px; font-weight: normal;">${formatGrantorName(g.name)}</div>`;
              });
              htmlLines.push(lineHtml);
            } else {
              jsxElements.push(
                <div key={appIdx} className="font-bold">
                  {appNameUpper}
                </div>
              );
              htmlLines.push(`<div style="font-weight: bold;">${appNameUpper}</div>`);
            }
          });

          letterDeeds.push({
            deed: d,
            matchingAppearerJSX: <div className="space-y-2">{jsxElements}</div>,
            matchingAppearerHTML: htmlLines.join('<div style="height: 6px;"></div>')
          });
        }
      });

      // Sort deeds by orderNumber or deedNumber
      letterDeeds.sort((a, b) => {
        const numA = parseInt(a.deed.orderNumber || a.deed.number || '0', 10);
        const numB = parseInt(b.deed.orderNumber || b.deed.number || '0', 10);
        return numA - numB;
      });

      sections.push({
        letter,
        deeds: letterDeeds
      });
    });

    return sections;
  }, [sourceDeeds]);

  // Alphabet counts for top filter buttons
  const alphabetCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    letterSections.forEach((sec) => {
      counts[sec.letter] = sec.deeds.length;
    });
    return counts;
  }, [letterSections]);

  // Filtered Sections based on selected letter & search term
  const filteredSections = useMemo(() => {
    return letterSections
      .filter((sec) => {
        if (selectedLetter !== 'ALL' && sec.letter !== selectedLetter) {
          return false;
        }
        return true;
      })
      .map((sec) => {
        if (!searchTerm.trim()) return sec;
        const q = searchTerm.toLowerCase();
        const filteredDeeds = sec.deeds.filter((item) => {
          const title = (item.deed.deedTitle || item.deed.title || '').toLowerCase();
          const order = (item.deed.orderNumber || '').toLowerCase();
          const number = (item.deed.deedNumber || item.deed.number || '').toLowerCase();
          const appearersStr = item.deed.appearers
            ? item.deed.appearers.map((a) => a.name).join(' ').toLowerCase()
            : '';
          return title.includes(q) || order.includes(q) || number.includes(q) || appearersStr.includes(q);
        });
        return {
          ...sec,
          deeds: filteredDeeds
        };
      });
  }, [letterSections, selectedLetter, searchTerm]);

  // Generate HTML String for PDF Export
  const generateHTML = () => {
    const headerTitle = `SALINAN DAFTAR AKTA-AKTA NOTARIS ${settings.notaryName.toUpperCase()} BULAN ${monthName.toUpperCase()} ${year}`;

    const sectionsHtml = ALPHABET_LIST.map((letter) => {
      const secData = letterSections.find((s) => s.letter === letter);
      const deedsList = secData ? secData.deeds : [];

      let rowsContent = '';
      if (deedsList.length === 0) {
        rowsContent = `
          <tr style="height: 28px; border-bottom: 1px solid #000; page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1px solid #000; text-align: center; font-weight: bold; width: 8%;">N</td>
            <td style="border: 1px solid #000; text-align: center; font-weight: bold; width: 8%;">I</td>
            <td style="border: 1px solid #000; text-align: center; font-weight: bold; width: 14%;">H</td>
            <td style="border: 1px solid #000; text-align: center; font-weight: bold; width: 38%;">I</td>
            <td style="border: 1px solid #000; text-align: center; font-weight: bold; width: 32%;">L</td>
          </tr>
        `;
      } else {
        rowsContent = deedsList
          .map((item) => {
            const d = item.deed;
            const orderNum = d.orderNumber || d.number || '';
            const deedNum = d.deedNumber || d.number || '';
            const dateStr = formatDateIndo(d.deedDate || d.date || '');
            const titleStr = (d.deedTitle || d.title || '').toUpperCase();

            return `
              <tr style="border-bottom: 1px solid #000; font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
                <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: top; width: 8%; word-break: break-word;">${orderNum}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: top; width: 8%; word-break: break-word;">${deedNum}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: top; width: 14%; word-break: break-word;">${dateStr}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; width: 38%; word-break: break-word;">${titleStr}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; width: 32%; word-break: break-word;">${item.matchingAppearerHTML}</td>
              </tr>
            `;
          })
          .join('');
      }

      return `
        <div style="margin-bottom: 14px; page-break-inside: auto; break-inside: auto;">
          <div style="display: inline-block; border: 1px solid #000; background-color: #F1F5F9; font-weight: bold; padding: 2px 8px; font-size: 11px; margin-bottom: 4px; page-break-after: avoid; break-after: avoid;">
            ${letter}
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-family: Arial, sans-serif; table-layout: fixed; word-wrap: break-word; word-break: break-word;">
            <thead>
              <tr style="background-color: #F1F5F9; font-size: 10px; font-weight: bold; page-break-inside: avoid; break-inside: avoid;">
                <th style="border: 1px solid #000; padding: 5px; width: 8%; text-align: center;">NO.<br/>URUT</th>
                <th style="border: 1px solid #000; padding: 5px; width: 8%; text-align: center;">NO. BLN</th>
                <th style="border: 1px solid #000; padding: 5px; width: 14%; text-align: center;">TANGGAL</th>
                <th style="border: 1px solid #000; padding: 5px; width: 38%; text-align: center;">SIFAT AKTA</th>
                <th style="border: 1px solid #000; padding: 5px; width: 32%; text-align: center;">NAMA PENGHADAP</th>
              </tr>
            </thead>
            <tbody>
              ${rowsContent}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>KLAPPER AKTA - ${monthName} ${year}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          *, *:before, *:after { box-sizing: border-box !important; }
          html, body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; width: 100%; }
          .header-title { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.2px; }
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
          td, th { word-wrap: break-word !important; word-break: break-word !important; }
        </style>
      </head>
      <body>
        <div class="header-title">
          ${headerTitle}
        </div>

        ${sectionsHtml}

        <div style="margin-top: 24px; page-break-inside: avoid; break-inside: avoid; text-align: right; width: 100%;">
          <div style="display: inline-block; text-align: left; max-width: 380px; font-size: 11px; line-height: 1.5;">
            <p style="margin: 0;">Salinan Daftar Klapper dari Akta-Akta yang telah dibuat dihadapan saya, Notaris, selama bulan ${monthName} ${year}.</p>
            <p style="margin: 12px 0 0 0;">${settings.city}, 29 ${monthName} ${year}</p>
            <p style="margin: 50px 0 0 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
              ${settings.notaryName}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Actions
  const handlePrint = () => {
    const htmlString = generateHTML();
    printHtmlString(htmlString, `KLAPPER_AKTA_${monthName}_${year}`);
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      const htmlString = generateHTML();
      await exportToPDF(htmlString, {
        filename: `Salinan_Klapper_Akta_${monthName}_${year}.pdf`,
        margin: [10, 10, 10, 10],
        orientation: 'portrait'
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Gagal mendownload PDF, mengalihkan ke fitur cetak.');
      const htmlString = generateHTML();
      printHtmlString(htmlString, `KLAPPER_AKTA_${monthName}_${year}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Klapper Akta (A-Z) - ${monthName} ${year}`,
      text: `Salinan Daftar Klapper Akta Notaris ${settings.notaryName} Periode ${monthName} ${year}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share dismissed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        alert('Tautan halaman berhasil disalin ke clipboard!');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header Controls (Print / Export / Back) */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ListOrdered className="text-blue-600" size={22} />
              Daftar Klapper Akta (A - Z)
            </h1>
            <p className="text-xs text-slate-500">
              Format resmi Salinan Daftar Klapper Akta Notaris sesuai standar Jabatan Notaris.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleShare}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            title="Bagikan Tautan Laporan"
          >
            {copiedShare ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
            {copiedShare ? 'Tautan Disalin!' : 'Bagikan'}
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isExportingPDF ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <Download size={16} />}
            {isExportingPDF ? 'Membuat PDF...' : 'Download PDF'}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={16} />
            Cetak Klapper
          </button>
        </div>
      </div>

      {/* Alphabet Filter Buttons A-Z */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Filter Abjad Penghadap (A-Z):
          </span>
          <span className="text-xs text-slate-500">
            Total Akta Terdaftar: <strong className="text-blue-600 font-bold">{sourceDeeds.length}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedLetter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedLetter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            SEMUA (A-Z)
          </button>

          {ALPHABET_LIST.map((letter) => {
            const count = alphabetCounts[letter] || 0;
            const isActive = selectedLetter === letter;

            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-600/30 shadow-sm'
                    : count > 0
                    ? 'bg-slate-100 text-slate-900 font-semibold hover:bg-slate-200'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span>{letter}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 font-bold'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 print:hidden">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama penghadap, sifat akta, atau nomor akta..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        {selectedLetter !== 'ALL' && (
          <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg font-medium border border-blue-200 flex items-center gap-2">
            <span>Abjad Terpilih: <strong>{selectedLetter}</strong></span>
            <button
              onClick={() => setSelectedLetter('ALL')}
              className="text-blue-500 hover:text-blue-800 font-bold underline text-[11px] cursor-pointer ml-1"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Printable Klapper Document Area */}
      <div
        ref={printRef}
        className="bg-white p-6 md:p-10 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 font-sans text-slate-900"
      >
        {/* Document Title Header */}
        <div className="text-center mb-8">
          <h1 className="text-base font-bold text-black uppercase tracking-wide">
            SALINAN DAFTAR AKTA-AKTA NOTARIS {settings.notaryName} BULAN {monthName.toUpperCase()} {year}
          </h1>
        </div>

        {/* Alphabet Sections A to Z */}
        <div className="space-y-6">
          {filteredSections.map((sec) => {
            const hasDeeds = sec.deeds.length > 0;

            return (
              <div key={sec.letter} className="space-y-1.5 break-inside-avoid">
                {/* Letter Box Badge */}
                <div className="inline-block border border-black bg-slate-100 font-bold px-3 py-0.5 text-xs text-black">
                  {sec.letter}
                </div>

                {/* Table for this letter */}
                <table className="w-full text-left text-xs border-collapse border border-black">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold uppercase text-[10px]">
                      <th className="border border-black p-1.5 text-center w-16">
                        NO.<br />URUT
                      </th>
                      <th className="border border-black p-1.5 text-center w-16">
                        NO. BLN
                      </th>
                      <th className="border border-black p-1.5 text-center w-24">
                        TANGGAL
                      </th>
                      <th className="border border-black p-1.5 text-center w-72">
                        SIFAT AKTA
                      </th>
                      <th className="border border-black p-1.5 text-center">
                        NAMA PENGHADAP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hasDeeds ? (
                      /* NIHIL Row */
                      <tr className="h-8 uppercase font-bold text-black text-center">
                        <td className="border border-black p-1.5">N</td>
                        <td className="border border-black p-1.5">I</td>
                        <td className="border border-black p-1.5">H</td>
                        <td className="border border-black p-1.5">I</td>
                        <td className="border border-black p-1.5">L</td>
                      </tr>
                    ) : (
                      /* Deeds Rows */
                      sec.deeds.map((item) => {
                        const d = item.deed;
                        const orderNum = d.orderNumber || d.number || '';
                        const deedNum = d.deedNumber || d.number || '';
                        const dateStr = formatDateIndo(d.deedDate || d.date || '');
                        const titleStr = (d.deedTitle || d.title || '').toUpperCase();

                        return (
                          <tr key={d.id} className="border-b border-black text-[11px] align-top">
                            <td className="border border-black p-2 text-center font-normal text-black">
                              {orderNum}
                            </td>
                            <td className="border border-black p-2 text-center font-normal text-black">
                              {deedNum}
                            </td>
                            <td className="border border-black p-2 text-center text-black whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="border border-black p-2 text-left font-normal text-black leading-snug">
                              {titleStr}
                            </td>
                            <td className="border border-black p-2 text-left font-normal text-black leading-snug">
                              {item.matchingAppearerJSX}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Closing Signature Block */}
        <div className="mt-12 pt-6 break-inside-avoid flex justify-end text-xs">
          <div className="max-w-sm text-left space-y-1 text-slate-900 leading-relaxed">
            <p className="text-black">
              Salinan Daftar Klapper dari Akta-Akta yang telah dibuat dihadapan saya, Notaris, selama bulan {monthName} {year}.
            </p>
            <p className="pt-2 text-black">{settings.city}, 29 {monthName} {year}</p>
            <div className="pt-16">
              <p className="font-bold underline uppercase text-black">
                {settings.notaryName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeedAlphabeticalReport;

