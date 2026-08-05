export interface FieldChange {
  field: string;
  before: any;
  after: any;
}

/**
 * Compares two company/document profile objects and extracts field-level differences.
 * Matches scalar fields (agenda, date, place, chair, quorum) as well as array fields
 * (shareholders, share transfers, directors, commissioners, agenda items).
 */
export function compareCompanyDocumentDiff(oldData: any, newData: any): FieldChange[] {
  if (!oldData || !newData) return [];

  const changes: FieldChange[] = [];

  // Helper to safely format amounts / numbers
  const formatNum = (v: any) => {
    if (v === null || v === undefined || v === '') return '-';
    if (typeof v === 'number') return v.toLocaleString('id-ID');
    return String(v);
  };

  // 1. Scalar Fields

  // a. Agenda / Mata Acara Rapat
  const oldAgenda = String(oldData.meetingAgenda || '').trim();
  const newAgenda = String(newData.meetingAgenda || '').trim();
  if (oldAgenda !== newAgenda && (oldAgenda || newAgenda)) {
    changes.push({
      field: 'Agenda Rapat',
      before: oldAgenda || '-',
      after: newAgenda || '-'
    });
  }

  // b. Tanggal & Waktu Rapat
  const oldDate = oldData.signingDate || oldData.draftAktaRupsDate || '';
  const oldTime = [oldData.meetingStartTime, oldData.meetingEndTime || oldData.rupstMeetingEndTime].filter(Boolean).join(' - ');
  const oldDateStr = [oldDate, oldTime].filter(Boolean).join(' ') || '';

  const newDate = newData.signingDate || newData.draftAktaRupsDate || '';
  const newTime = [newData.meetingStartTime, newData.meetingEndTime || newData.rupstMeetingEndTime].filter(Boolean).join(' - ');
  const newDateStr = [newDate, newTime].filter(Boolean).join(' ') || '';

  if (oldDateStr !== newDateStr && (oldDateStr || newDateStr)) {
    changes.push({
      field: 'Tanggal & Waktu Rapat',
      before: oldDateStr || '-',
      after: newDateStr || '-'
    });
  }

  // c. Tempat / Kedudukan Rapat
  const oldPlace = oldData.signingPlace || oldData.domicile || oldData.kedudukanPT || '';
  const newPlace = newData.signingPlace || newData.domicile || newData.kedudukanPT || '';
  if (oldPlace !== newPlace && (oldPlace || newPlace)) {
    changes.push({
      field: 'Tempat & Kedudukan Rapat',
      before: oldPlace || '-',
      after: newPlace || '-'
    });
  }

  // d. Pimpinan Rapat
  const oldChair = [oldData.meetingChair, oldData.meetingChairPosition ? `(${oldData.meetingChairPosition})` : ''].filter(Boolean).join(' ');
  const newChair = [newData.meetingChair, newData.meetingChairPosition ? `(${newData.meetingChairPosition})` : ''].filter(Boolean).join(' ');
  if (oldChair !== newChair && (oldChair || newChair)) {
    changes.push({
      field: 'Pimpinan Rapat',
      before: oldChair || '-',
      after: newChair || '-'
    });
  }

  // e. Kuorum Kehadiran
  const oldQuorum = oldData.quorum || oldData.rupstQuorumArticle ? `Pasal ${oldData.rupstQuorumArticle}` : '';
  const newQuorum = newData.quorum || newData.rupstQuorumArticle ? `Pasal ${newData.rupstQuorumArticle}` : '';
  if (oldQuorum !== newQuorum && (oldQuorum || newQuorum)) {
    changes.push({
      field: 'Kuorum Kehadiran',
      before: oldQuorum || '-',
      after: newQuorum || '-'
    });
  }

  // f. Nama Perusahaan / Modal
  if (oldData.companyName && newData.companyName && oldData.companyName !== newData.companyName) {
    changes.push({
      field: 'Nama Perusahaan',
      before: oldData.companyName,
      after: newData.companyName
    });
  }

  const oldCapitalBase = oldData.targetCapitalBase ?? oldData.originalCapitalBase;
  const newCapitalBase = newData.targetCapitalBase ?? newData.originalCapitalBase;
  if (oldCapitalBase !== undefined && newCapitalBase !== undefined && String(oldCapitalBase) !== String(newCapitalBase)) {
    changes.push({
      field: 'Modal Dasar',
      before: `Rp ${formatNum(oldCapitalBase)}`,
      after: `Rp ${formatNum(newCapitalBase)}`
    });
  }

  const oldCapitalPaid = oldData.targetCapitalPaid ?? oldData.originalCapitalPaid;
  const newCapitalPaid = newData.targetCapitalPaid ?? newData.originalCapitalPaid;
  if (oldCapitalPaid !== undefined && newCapitalPaid !== undefined && String(oldCapitalPaid) !== String(newCapitalPaid)) {
    changes.push({
      field: 'Modal Disetor',
      before: `Rp ${formatNum(oldCapitalPaid)}`,
      after: `Rp ${formatNum(newCapitalPaid)}`
    });
  }

  // 2. Array Fields

  // Helper key generator for array items
  const getItemKey = (item: any) => {
    if (!item) return '';
    if (item.id) return item.id;
    if (item.nik && item.name) return `${item.name.trim().toLowerCase()}_${item.nik.trim()}`;
    return (item.name || item.namaPt || item.title || '').trim().toLowerCase();
  };

  // a. Shareholders & Final Shareholders
  const oldShs: any[] = oldData.finalShareholders || oldData.shareholders || [];
  const newShs: any[] = newData.finalShareholders || newData.shareholders || [];

  const oldShMap = new Map<string, any>();
  oldShs.forEach(s => {
    const k = getItemKey(s);
    if (k) oldShMap.set(k, s);
  });

  const newShMap = new Map<string, any>();
  newShs.forEach(s => {
    const k = getItemKey(s);
    if (k) newShMap.set(k, s);
  });

  // Check added & updated shareholders
  newShMap.forEach((newSh, key) => {
    const oldSh = oldShMap.get(key);
    if (!oldSh) {
      changes.push({
        field: 'Pemegang Saham Baru',
        before: '-',
        after: `Pemegang saham baru: ${newSh.name || 'Nama Belum Ada'} (${newSh.sharesOwned || 0} lembar)`
      });
    } else {
      if (oldSh.sharesOwned !== newSh.sharesOwned) {
        changes.push({
          field: `Jumlah Saham (${newSh.name || 'Pemegang Saham'})`,
          before: `${newSh.name}: ${oldSh.sharesOwned || 0} lembar`,
          after: `${newSh.name}: ${newSh.sharesOwned || 0} lembar`
        });
      }
    }
  });

  // Check removed shareholders
  oldShMap.forEach((oldSh, key) => {
    if (!newShMap.has(key)) {
      changes.push({
        field: 'Pemegang Saham Dihapus',
        before: `Pemegang saham dihapus: ${oldSh.name || 'Nama Belum Ada'}`,
        after: '-'
      });
    }
  });

  // b. Share Transfers (Peralihan Saham)
  const oldTransfers: any[] = oldData.shareTransfers || [];
  const newTransfers: any[] = newData.shareTransfers || [];

  const getTransferKey = (t: any) => t.id || `${t.fromName || ''}_${t.toName || ''}_${t.sharesTransferred || t.shares || 0}`;

  const oldTransferMap = new Map<string, any>();
  oldTransfers.forEach(t => oldTransferMap.set(getTransferKey(t), t));

  const newTransferMap = new Map<string, any>();
  newTransfers.forEach(t => newTransferMap.set(getTransferKey(t), t));

  newTransferMap.forEach((newT, key) => {
    if (!oldTransferMap.has(key)) {
      const from = newT.fromName || 'Penjual';
      const to = newT.toName || 'Pembeli';
      const count = newT.sharesTransferred || newT.shares || 0;
      changes.push({
        field: 'Peralihan Saham',
        before: '-',
        after: `${from} menjual ${count} lembar ke ${to}`
      });
    }
  });

  oldTransferMap.forEach((oldT, key) => {
    if (!newTransferMap.has(key)) {
      const from = oldT.fromName || 'Penjual';
      const to = oldT.toName || 'Pembeli';
      const count = oldT.sharesTransferred || oldT.shares || 0;
      changes.push({
        field: 'Peralihan Saham Batal',
        before: `Peralihan: ${from} -> ${to} (${count} lembar)`,
        after: '-'
      });
    }
  });

  // c. Susunan Direksi & Komisaris
  const oldMgt: any[] = oldData.newManagementItems || oldData.oldManagementItems || oldData.management || [];
  const newMgt: any[] = newData.newManagementItems || newData.oldManagementItems || newData.management || [];

  const oldMgtMap = new Map<string, any>();
  oldMgt.forEach(m => {
    const k = getItemKey(m);
    if (k) oldMgtMap.set(k, m);
  });

  const newMgtMap = new Map<string, any>();
  newMgt.forEach(m => {
    const k = getItemKey(m);
    if (k) newMgtMap.set(k, m);
  });

  newMgtMap.forEach((newM, key) => {
    const oldM = oldMgtMap.get(key);
    if (!oldM) {
      changes.push({
        field: 'Susunan Direksi/Komisaris',
        before: '-',
        after: `Masuk: ${newM.name || 'Nama'} (${newM.position || 'Pengurus'})`
      });
    } else if (oldM.position !== newM.position) {
      changes.push({
        field: `Jabatan Pengurus (${newM.name})`,
        before: `${oldM.name}: ${oldM.position || '-'}`,
        after: `${newM.name}: ${newM.position || '-'}`
      });
    }
  });

  oldMgtMap.forEach((oldM, key) => {
    if (!newMgtMap.has(key)) {
      changes.push({
        field: 'Susunan Direksi/Komisaris',
        before: `Keluar: ${oldM.name || 'Nama'} (${oldM.position || 'Pengurus'})`,
        after: '-'
      });
    }
  });

  // d. Item Agenda (jika berbentuk array)
  const oldAgendasArr: any[] = Array.isArray(oldData.agendas) ? oldData.agendas : [];
  const newAgendasArr: any[] = Array.isArray(newData.agendas) ? newData.agendas : [];

  if (oldAgendasArr.length > 0 || newAgendasArr.length > 0) {
    if (JSON.stringify(oldAgendasArr) !== JSON.stringify(newAgendasArr)) {
      changes.push({
        field: 'Daftar Item Agenda Rapat',
        before: oldAgendasArr.map((a: any) => a.title || a).join('; ') || '-',
        after: newAgendasArr.map((a: any) => a.title || a).join('; ') || '-'
      });
    }
  }

  return changes;
}

/**
 * Builds a clean, single-line readable summary of field-level changes.
 */
export function formatChangesSummary(changes: FieldChange[]): string {
  if (!changes || changes.length === 0) return '';

  const summaries = changes.map(ch => {
    const fieldLower = ch.field.toLowerCase();
    if (fieldLower.includes('agenda')) {
      return 'Agenda rapat diperbarui';
    }
    if (fieldLower.includes('peralihan')) {
      return `Peralihan saham: ${ch.after !== '-' ? ch.after : ch.before}`;
    }
    if (fieldLower.includes('pemegang saham')) {
      return ch.after !== '-' ? ch.after : ch.before;
    }
    if (fieldLower.includes('direksi') || fieldLower.includes('komisaris') || fieldLower.includes('pengurus') || fieldLower.includes('jabatan')) {
      if (ch.before !== '-' && ch.after !== '-') {
        return `${ch.field} diganti dari ${ch.before} ke ${ch.after}`;
      }
      return ch.after !== '-' ? ch.after : ch.before;
    }
    if (ch.before && ch.before !== '-' && ch.after && ch.after !== '-') {
      return `${ch.field}: ${ch.before} → ${ch.after}`;
    }
    if (ch.after && ch.after !== '-') {
      return `${ch.field}: ${ch.after}`;
    }
    if (ch.before && ch.before !== '-') {
      return `${ch.field} dihapus`;
    }
    return `${ch.field} diubah`;
  });

  return `${changes.length} perubahan: ${summaries.join(' • ')}`;
}
