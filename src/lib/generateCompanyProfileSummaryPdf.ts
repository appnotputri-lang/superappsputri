import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyProfile } from '../../types';
import { formatCompanyName, formatNumber, formatDateSimple } from './formatter';

/**
 * Format currency to Rp string
 */
function formatRp(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return 'Rp 0';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(/,/g, '.'));
  if (isNaN(num)) return 'Rp 0';
  return `Rp ${formatNumber(num)}`;
}

/**
 * Format birth date safely
 */
function formatBirthDateStr(dateStr?: string): string {
  if (!dateStr) return '-';
  const formatted = formatDateSimple(dateStr);
  return formatted || dateStr;
}

/**
 * Generate PDF summary for a Company Profile
 */
export function generateCompanyProfileSummaryPdf(profile: CompanyProfile): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let currentY = 15;

  // Helper to ensure enough space before starting a section
  const ensureSpace = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - 20) {
      doc.addPage();
      currentY = 15;
    }
  };

  // Helper for Section Titles
  const renderSectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, currentY + 4.8);
    currentY += 9;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // HEADER
  // ───────────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('RINGKASAN COMPANY PROFILE', margin, currentY);
  currentY += 6;

  const formattedName = formatCompanyName(profile.companyName || 'Nama Perusahaan', profile.clientType);
  const displayName = profile.companyShortName ? `${formattedName} (${profile.companyShortName})` : formattedName;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(displayName, margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Tanggal Cetak: ${todayStr}`, margin, currentY);
  currentY += 4;

  // Decorative header divider line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. IDENTITAS PERUSAHAAN
  // ───────────────────────────────────────────────────────────────────────────
  renderSectionTitle('1. IDENTITAS PERUSAHAAN');

  const fullAddr = profile.fullAddress || (
    profile.newAddress?.fullAddress 
      ? [profile.newAddress.fullAddress, profile.newAddress.kelurahan, profile.newAddress.kecamatan, profile.newAddress.city, profile.newAddress.province].filter(Boolean).join(', ')
      : '-'
  );

  const domicileStr = profile.domicile 
    ? `${profile.domicileStyle ? profile.domicileStyle + ' ' : ''}${profile.domicile}`
    : (profile.kedudukanPT || '-');

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Jenis Badan Usaha', profile.clientType || 'PT'],
      ['Tipe Perseroan', profile.companyType || '-'],
      ['NPWP', profile.npwp || '-'],
      ['Kedudukan', domicileStr],
      ['Alamat Lengkap', fullAddr],
      ['Status Perseroan', profile.status || '-'],
      ['Jangka Waktu Berdiri', profile.duration || '-'],
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // ───────────────────────────────────────────────────────────────────────────
  // 2. LEGALITAS - AKTA PENDIRIAN
  // ───────────────────────────────────────────────────────────────────────────
  renderSectionTitle('2. LEGALITAS - AKTA PENDIRIAN');

  const notaryFull = [profile.establishmentNotary, profile.establishmentNotaryTitle].filter(Boolean).join(' ') || '-';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Nomor Akta Pendirian', profile.establishmentDeedNumber || '-'],
      ['Tanggal Akta Pendirian', profile.establishmentDeedDate || '-'],
      ['Notaris Pendirian', notaryFull],
      ['Kedudukan Notaris', profile.establishmentNotaryDomicile || '-'],
      ['Nomor SK Kemenkumham', profile.establishmentSkNumber || '-'],
      ['Tanggal SK Kemenkumham', profile.establishmentSkDate || '-'],
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // ───────────────────────────────────────────────────────────────────────────
  // 3. LEGALITAS - RIWAYAT AKTA PERUBAHAN
  // ───────────────────────────────────────────────────────────────────────────
  renderSectionTitle('3. LEGALITAS - RIWAYAT AKTA PERUBAHAN');

  const deeds = (profile.amendmentDeeds || []).slice().sort((a, b) => {
    if (!a.date) return -1;
    if (!b.date) return 1;
    return a.date.localeCompare(b.date);
  });

  if (deeds.length === 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { fontSize: 8.5, fontStyle: 'italic', textColor: [100, 116, 139] },
      body: [['Belum ada riwayat akta perubahan.']]
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  } else {
    deeds.forEach((deed, idx) => {
      ensureSpace(20);

      // Subheader for deed item
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`• Akta Perubahan Ke-${idx + 1}`, margin, currentY);
      currentY += 4;

      const deedNotary = [deed.notary, deed.notaryTitle].filter(Boolean).join(' ') || '-';

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.8, textColor: [30, 41, 59], overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] },
          1: { cellWidth: 'auto' }
        },
        body: [
          ['Nomor Akta', deed.number || '-'],
          ['Tanggal Akta', deed.date || '-'],
          ['Notaris', deedNotary],
          ['Kedudukan Notaris', deed.notaryDomicile || '-'],
        ]
      });

      currentY = (doc as any).lastAutoTable.finalY + 3;

      // Sub-table for SK/SP Documents if present
      const skDocs = deed.skSpDocuments || [];
      if (skDocs.length > 0) {
        autoTable(doc, {
          startY: currentY,
          margin: { left: margin + 5, right: margin },
          theme: 'striped',
          styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [51, 65, 85] },
          headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold' },
          head: [['Tipe Dokumen SK/SP', 'Nomor Dokumen', 'Tanggal']],
          body: skDocs.map(d => [d.type || '-', d.number || '-', d.date || '-'])
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;
      } else if (deed.skNumber) {
        autoTable(doc, {
          startY: currentY,
          margin: { left: margin + 5, right: margin },
          theme: 'striped',
          styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [51, 65, 85] },
          headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold' },
          head: [['Tipe Dokumen SK/SP', 'Nomor Dokumen', 'Tanggal']],
          body: [['SK Kemenkumham', deed.skNumber, deed.skDate || '-']]
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;
      } else {
        currentY += 2;
      }
    });

    currentY += 2;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PERMODALAN
  // ───────────────────────────────────────────────────────────────────────────
  renderSectionTitle('4. PERMODALAN');

  const sharePriceStr = formatRp(profile.originalSharePrice);
  const authSharesStr = `${formatNumber(profile.originalAuthorizedShares || 0)} lembar (${formatRp(profile.originalCapitalBase)})`;
  const paidSharesStr = `${formatNumber(profile.originalTotalShares || 0)} lembar (${formatRp(profile.originalCapitalPaid)})`;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Nominal Harga per Saham', sharePriceStr],
      ['Modal Dasar', authSharesStr],
      ['Modal Ditempatkan & Disetor', paidSharesStr],
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PENGURUS & PEMEGANG SAHAM
  // ───────────────────────────────────────────────────────────────────────────
  renderSectionTitle('5. PENGURUS & PEMEGANG SAHAM');

  const shareholders = profile.shareholders || [];

  if (shareholders.length === 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { fontSize: 8.5, fontStyle: 'italic', textColor: [100, 116, 139] },
      body: [['Belum ada data pengurus / pemegang saham.']]
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  } else {
    const sharePrice = profile.originalSharePrice || 0;

    // 5a. Detail Identitas Personil
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('5a. Detail Identitas Personil', margin, currentY);
    currentY += 5;

    shareholders.forEach((sh, idx) => {
      ensureSpace(20);

      const salutationStr = sh.salutation ? `${sh.salutation} ` : '';
      const titleStr = `Personil ${idx + 1}. ${salutationStr}${sh.name || '-'}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(titleStr, margin, currentY);
      currentY += 3.5;

      const shares = sh.sharesOwned || 0;
      const sharesValStr = `${formatNumber(shares)} lembar (${formatRp(shares * sharePrice)})`;
      const positionStr = sh.isManagement && sh.managementPosition ? sh.managementPosition : 'Bukan Pengurus (Pemegang Saham)';

      let bodyRows: [string, string][] = [];

      if (sh.shareholderType === 'BADAN_HUKUM') {
        bodyRows = [
          ['Tipe Badan Hukum', sh.legalEntityType || 'Badan Hukum'],
          ['Nama Badan Hukum', sh.name || '-'],
          ['SK Kemenkumham', sh.skNumber || '-'],
          ['NPWP', sh.npwp || '-'],
          ['Jumlah Saham', sharesValStr],
          ['Jabatan', positionStr],
        ];
      } else {
        const idLabel = sh.nationalityType === 'WNA' ? 'Nomor Paspor' : 'NIK';
        const idValue = (sh.nationalityType === 'WNA' ? sh.passportNumber : sh.nik) || '-';

        const birthDateStr = formatBirthDateStr(sh.birthDate);
        const birthPlaceDate = `${sh.birthCity || '-'}${birthDateStr !== '-' ? `, ${birthDateStr}` : ''}`;

        const nationalityStr = sh.nationalityType === 'WNA' ? (sh.nationality || 'Asing') : 'Warga Negara Indonesia';

        let addressStr = '-';
        if (sh.address) {
          const addrParts: string[] = [];
          if (sh.address.fullAddress) addrParts.push(sh.address.fullAddress);

          const rtRw = [
            sh.address.rt ? `RT ${sh.address.rt}` : '',
            sh.address.rw ? `RW ${sh.address.rw}` : ''
          ].filter(Boolean).join('/');
          if (rtRw) addrParts.push(rtRw);

          if (sh.address.kelurahan) addrParts.push(`Kel. ${sh.address.kelurahan}`);
          if (sh.address.kecamatan) addrParts.push(`Kec. ${sh.address.kecamatan}`);
          if (sh.address.city) addrParts.push(sh.address.city);
          if (sh.address.province && sh.address.province !== sh.address.city) addrParts.push(sh.address.province);

          if (addrParts.length > 0) addressStr = addrParts.join(', ');
        }

        bodyRows = [
          [idLabel, idValue],
        ];

        if (sh.hasKitas && sh.kitasNumber) {
          const kitasTypeStr = (sh.kitasType && sh.kitasType !== 'NONE') ? sh.kitasType : 'KITAS';
          bodyRows.push([kitasTypeStr, sh.kitasNumber]);
        }

        bodyRows.push(
          ['Tempat, Tanggal Lahir', birthPlaceDate],
          ['Kewarganegaraan', nationalityStr],
          ['Pekerjaan', sh.occupation || '-'],
          ['Alamat', addressStr],
          ['Jumlah Saham', sharesValStr],
          ['Jabatan', positionStr]
        );
      }

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] },
          1: { cellWidth: 'auto' }
        },
        body: bodyRows
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;
    });

    currentY += 2;

    // 5b. Tabel Rekap Pengurus & Pemegang Saham
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('5b. Tabel Rekap Pengurus & Pemegang Saham', margin, currentY);
    currentY += 5;

    let totalShares = 0;
    let totalValue = 0;

    const tableRows = shareholders.map(sh => {
      const shares = sh.sharesOwned || 0;
      const value = shares * sharePrice;
      totalShares += shares;
      totalValue += value;

      const position = sh.isManagement && sh.managementPosition ? sh.managementPosition : '-';

      return [
        sh.name || '-',
        formatNumber(shares),
        position,
        formatRp(value)
      ];
    });

    tableRows.push([
      'TOTAL',
      formatNumber(totalShares),
      '-',
      formatRp(totalValue)
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
      head: [['Nama Personil / Pemegang Saham', 'Jumlah Saham', 'Jabatan Pengurus', 'Nilai Saham (Rp)']],
      body: tableRows,
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249]; // Slate-100
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. MAKSUD & TUJUAN (KBLI)
  // ───────────────────────────────────────────────────────────────────────────
  renderSectionTitle('6. MAKSUD & TUJUAN (KBLI)');

  const kbliItems = profile.kbliItems || [];

  if (kbliItems.length === 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { fontSize: 8.5, fontStyle: 'italic', textColor: [100, 116, 139] },
      body: [['Belum ada data KBLI terpilih.']]
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  } else {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, fontStyle: 'bold' },
        2: { cellWidth: 50, fontStyle: 'bold' },
        3: { cellWidth: 'auto' }
      },
      head: [['No', 'Kode', 'Judul KBLI', 'Uraian / Deskripsi']],
      body: kbliItems.map((item, idx) => [
        idx + 1,
        item.code || '-',
        item.name || '-',
        item.uraian || item.description || '-'
      ])
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. PENANGGUNG JAWAB (PIC) - Optional if any field present
  // ───────────────────────────────────────────────────────────────────────────
  if (profile.picName || profile.picPhone || profile.picEmail || profile.picAddress) {
    renderSectionTitle('7. PENANGGUNG JAWAB (PIC)');

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: 'auto' }
      },
      body: [
        ['Nama PIC', profile.picName || '-'],
        ['No. Telepon / WhatsApp', profile.picPhone || '-'],
        ['Email', profile.picEmail || '-'],
        ['Alamat PIC', profile.picAddress || '-'],
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FOOTER & PAGE NUMBERING
  // ───────────────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400

    // Footer text left
    doc.text(
      'Dokumen ini digenerate otomatis dari data profil klien — bukan dokumen legal resmi.',
      margin,
      pageHeight - 8
    );

    // Page number right
    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Save PDF
  const sanitizedName = (profile.companyName || 'Klien')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const dateIso = new Date().toISOString().split('T')[0];
  const filename = `Ringkasan_Company_Profile_${sanitizedName}_${dateIso}.pdf`;

  doc.save(filename);
}
