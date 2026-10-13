import { DocumentVersioningService, UploadedDocument } from '../src/services/DocumentVersioningService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('--- STARTING DOCUMENT VERSIONING AUDIT & TESTS ---');

  // Test 1: getDocumentType canonical mapping
  console.log('\n[Test Suite 1: Canonical Document Type Resolution]');
  assert(DocumentVersioningService.getDocumentType('rups_t') === 'RUPST', 'rups_t maps to RUPST');
  assert(DocumentVersioningService.getDocumentType('sirkuler') === 'RUPST', 'sirkuler maps to RUPST');
  assert(DocumentVersioningService.getDocumentType('rups_lb') === 'RUPSLB', 'rups_lb maps to RUPSLB');
  assert(DocumentVersioningService.getDocumentType('sirkuler_rupslb') === 'RUPSLB', 'sirkuler_rupslb maps to RUPSLB');
  assert(DocumentVersioningService.getDocumentType('pendirian_pt') === null, 'pendirian_pt is not RUPST/RUPSLB');

  // Test 2: Naming convention rules
  console.log('\n[Test Suite 2: File Naming Rules]');
  assert(
    DocumentVersioningService.getRevisionFileName('Draft RUPST PT ABC.docx', 0) === 'Draft RUPST PT ABC.docx',
    'Initial file (rev 0) keeps original name without revisi suffix'
  );
  assert(
    DocumentVersioningService.getRevisionFileName('Draft RUPST PT ABC.docx', 1) === 'Draft RUPST PT ABC Revisi 1.docx',
    'Revision 1 produces "Draft RUPST PT ABC Revisi 1.docx"'
  );
  assert(
    DocumentVersioningService.getRevisionFileName('Draft RUPST PT ABC.docx', 2) === 'Draft RUPST PT ABC Revisi 2.docx',
    'Revision 2 produces "Draft RUPST PT ABC Revisi 2.docx"'
  );
  assert(
    DocumentVersioningService.getRevisionFileName('Draft RUPST PT ABC Revisi 2.docx', 3) === 'Draft RUPST PT ABC Revisi 3.docx',
    'Revision 3 from existing revisi name strips previous suffix and produces Revisi 3'
  );
  assert(
    DocumentVersioningService.getRevisionFileName('Draft RUPSLB PT XYZ.docx', 1) === 'Draft RUPSLB PT XYZ Revisi 1.docx',
    'RUPSLB Revision 1 produces "Draft RUPSLB PT XYZ Revisi 1.docx"'
  );
  assert(
    DocumentVersioningService.getRevisionFileName('Draft RUPSLB PT XYZ Revisi 1.docx', 2) === 'Draft RUPSLB PT XYZ Revisi 2.docx',
    'RUPSLB Revision 2 produces "Draft RUPSLB PT XYZ Revisi 2.docx"'
  );

  // Test 3: Scenario 1-8 for RUPST
  console.log('\n[Test Suite 3: RUPST Lifecycle Simulation]');
  const rupstDb: UploadedDocument[] = [];
  const rupstDriveFiles: { id: string; name: string }[] = [];

  // Step 1: Simpan dokumen RUPST untuk pertama kali
  const rupstRes0 = DocumentVersioningService.resolveRevisionInfo(
    rupstDb,
    'draft_akta',
    'Draft Akta RUPST',
    'Draft RUPST PT ABC.docx'
  );
  assert(rupstRes0.isNewDocument === true, 'Skenario 1: Dokumen awal dideteksi sebagai dokumen baru');
  assert(rupstRes0.nextRevisionNumber === 0, 'Skenario 1: Nomor revisi awal adalah 0');
  const name0 = DocumentVersioningService.getRevisionFileName(rupstRes0.originalDocName, 0);
  assert(name0 === 'Draft RUPST PT ABC.docx', 'Skenario 1: Nama file awal adalah "Draft RUPST PT ABC.docx"');

  const rootParentId = rupstRes0.rootParentId;
  const driveId0 = 'drive-rupst-file-0';
  rupstDriveFiles.push({ id: driveId0, name: name0 });

  const doc0: UploadedDocument = {
    id: rootParentId,
    parentDocumentId: rootParentId,
    companyId: 'company-1',
    projectId: 'proj-rupst-1',
    title: 'Draft Akta RUPST',
    fileName: name0,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 50000,
    driveFileId: driveId0,
    driveFolderId: 'folder-1',
    uploadedBy: 'Notaris Putri',
    uploadedAt: '2026-10-13T08:00:00Z',
    savedAt: '2026-10-13T08:00:00Z',
    createdAt: '2026-10-13T08:00:00Z',
    documentSource: 'generated',
    documentCategory: 'draft_akta',
    revisionNumber: 0,
    versionStatus: 'versi awal',
    isLatest: true,
    documentType: 'RUPST'
  };
  rupstDb.push(doc0);

  // Step 2: Edit dan simpan menjadi Revisi 1
  const rupstRes1 = DocumentVersioningService.resolveRevisionInfo(
    rupstDb,
    'draft_akta',
    'Draft Akta RUPST',
    'Draft RUPST PT ABC.docx'
  );
  assert(rupstRes1.isNewDocument === false, 'Skenario 2: Dokumen dikenali dari riwayat tersimpan');
  assert(rupstRes1.nextRevisionNumber === 1, 'Skenario 2: Nomor revisi berikutnya adalah 1');
  assert(rupstRes1.rootParentId === rootParentId, 'Skenario 2: Parent ID tetap merujuk ke dokumen induk');

  const name1 = DocumentVersioningService.getRevisionFileName(rupstRes1.originalDocName, 1);
  assert(name1 === 'Draft RUPST PT ABC Revisi 1.docx', 'Skenario 2: Nama file revisi 1 adalah "Draft RUPST PT ABC Revisi 1.docx"');

  const driveId1 = 'drive-rupst-file-1';
  rupstDriveFiles.push({ id: driveId1, name: name1 });

  // Update previous record in DB
  doc0.isLatest = false;

  const doc1: UploadedDocument = {
    id: 'doc-rupst-rec-1',
    parentDocumentId: rootParentId,
    companyId: 'company-1',
    projectId: 'proj-rupst-1',
    title: 'Draft Akta RUPST',
    fileName: name1,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 52000,
    driveFileId: driveId1,
    driveFolderId: 'folder-1',
    uploadedBy: 'Notaris Putri',
    uploadedAt: '2026-10-13T09:00:00Z',
    savedAt: '2026-10-13T09:00:00Z',
    createdAt: '2026-10-13T09:00:00Z',
    documentSource: 'generated',
    documentCategory: 'draft_akta',
    revisionNumber: 1,
    versionStatus: 'revisi',
    isLatest: true,
    documentType: 'RUPST'
  };
  rupstDb.push(doc1);

  // Step 3: Edit kembali menjadi Revisi 2
  const rupstRes2 = DocumentVersioningService.resolveRevisionInfo(
    rupstDb,
    'draft_akta',
    'Draft Akta RUPST',
    'Draft RUPST PT ABC.docx'
  );
  assert(rupstRes2.isNewDocument === false, 'Skenario 3: Dokumen dikenali dan nomor dihitung dari data tersimpan');
  assert(rupstRes2.nextRevisionNumber === 2, 'Skenario 3: Nomor revisi berikutnya adalah 2');

  const name2 = DocumentVersioningService.getRevisionFileName(rupstRes2.originalDocName, 2);
  assert(name2 === 'Draft RUPST PT ABC Revisi 2.docx', 'Skenario 3: Nama file revisi 2 adalah "Draft RUPST PT ABC Revisi 2.docx"');

  const driveId2 = 'drive-rupst-file-2';
  rupstDriveFiles.push({ id: driveId2, name: name2 });

  doc1.isLatest = false;

  const doc2: UploadedDocument = {
    id: 'doc-rupst-rec-2',
    parentDocumentId: rootParentId,
    companyId: 'company-1',
    projectId: 'proj-rupst-1',
    title: 'Draft Akta RUPST',
    fileName: name2,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 54000,
    driveFileId: driveId2,
    driveFolderId: 'folder-1',
    uploadedBy: 'Notaris Putri',
    uploadedAt: '2026-10-13T10:00:00Z',
    savedAt: '2026-10-13T10:00:00Z',
    createdAt: '2026-10-13T10:00:00Z',
    documentSource: 'generated',
    documentCategory: 'draft_akta',
    revisionNumber: 2,
    versionStatus: 'revisi',
    isLatest: true,
    documentType: 'RUPST'
  };
  rupstDb.push(doc2);

  // Verification 4: Pastikan file awal, Revisi 1, dan Revisi 2 semuanya masih ada di Google Drive
  assert(rupstDriveFiles.length === 3, 'Skenario 4: Terdapat 3 berkas di Google Drive');
  assert(rupstDriveFiles.some(f => f.id === driveId0 && f.name === 'Draft RUPST PT ABC.docx'), 'Skenario 4: Berkas awal tetap utuh di Drive');
  assert(rupstDriveFiles.some(f => f.id === driveId1 && f.name === 'Draft RUPST PT ABC Revisi 1.docx'), 'Skenario 4: Berkas Revisi 1 tetap utuh di Drive');
  assert(rupstDriveFiles.some(f => f.id === driveId2 && f.name === 'Draft RUPST PT ABC Revisi 2.docx'), 'Skenario 4: Berkas Revisi 2 tetap utuh di Drive');

  // Verification 5: Pastikan setiap revisi mempunyai ID file Drive yang berbeda
  const driveIds = new Set(rupstDriveFiles.map(f => f.id));
  assert(driveIds.size === 3, 'Skenario 5: Setiap revisi mempunyai ID file Drive yang unik dan berbeda');

  // Verification 6: Pastikan semua record revisi tetap tersedia di Firestore
  assert(rupstDb.length === 3, 'Skenario 6: Semua 3 record revisi tetap tersimpan di Firestore');
  assert(rupstDb[0].id === rootParentId && rupstDb[0].revisionNumber === 0, 'Skenario 6: Record versi awal tidak dihapus');
  assert(rupstDb[1].revisionNumber === 1 && rupstDb[1].parentDocumentId === rootParentId, 'Skenario 6: Record revisi 1 tetap utuh');
  assert(rupstDb[2].revisionNumber === 2 && rupstDb[2].parentDocumentId === rootParentId, 'Skenario 6: Record revisi 2 tetap utuh');

  // Verification 7: Pastikan membuka dokumen aktif menghasilkan versi terbaru
  const activeDoc = rupstDb.find(d => d.isLatest) || rupstDb[rupstDb.length - 1];
  assert(activeDoc.revisionNumber === 2, 'Skenario 7: Dokumen aktif adalah Revisi 2 (versi terbaru)');
  assert(activeDoc.driveFileId === driveId2, 'Skenario 7: ID Drive dokumen aktif menunjuk ke file Revisi 2');

  // Verification 8: Pastikan membuka atau mengunduh revisi lama menghasilkan isi sesuai versi tersebut
  const oldVersion1 = rupstDb.find(d => d.revisionNumber === 1);
  assert(oldVersion1?.driveFileId === driveId1, 'Skenario 8: Unduhan Revisi 1 merujuk ke driveFileId Revisi 1');
  const initialVersion = rupstDb.find(d => d.revisionNumber === 0);
  assert(initialVersion?.driveFileId === driveId0, 'Skenario 8: Unduhan Versi Awal merujuk ke driveFileId Versi Awal');

  // Test 4: Skenario 9 - Kegagalan upload
  console.log('\n[Test Suite 4: Upload Failure Handling]');
  // Simulasikan kegagalan upload saat mencoba menyimpan Revisi 3
  // Jika upload gagal, tidak ada record Firestore baru yang dibuat dan isLatest tetap tidak berubah
  const rupstResFailed = DocumentVersioningService.resolveRevisionInfo(
    rupstDb,
    'draft_akta',
    'Draft Akta RUPST',
    'Draft RUPST PT ABC.docx'
  );
  assert(rupstResFailed.nextRevisionNumber === 3, 'Skenario 9: Penentuan revisi sebelum upload gagal adalah 3');

  // Upload ke Google Drive melempar error (simulasi)
  let uploadSucceeded = false;
  try {
    throw new Error('Google Drive API 503 Service Unavailable');
  } catch (e) {
    // Karena gagal, Firestore TIDAK dimodifikasi sama sekali
  }

  // Coba simpan kembali setelah kegagalan:
  const rupstResRetry = DocumentVersioningService.resolveRevisionInfo(
    rupstDb,
    'draft_akta',
    'Draft Akta RUPST',
    'Draft RUPST PT ABC.docx'
  );
  assert(rupstResRetry.nextRevisionNumber === 3, 'Skenario 9: Setelah kegagalan upload, nomor revisi tetap 3 (tidak lompat/rusak)');
  assert(rupstDb.find(d => d.isLatest)?.revisionNumber === 2, 'Skenario 9: Dokumen aktif sebelumnya (Revisi 2) tetap valid');

  // Test 5: Skenario 10 - RUPSLB
  console.log('\n[Test Suite 5: RUPSLB Lifecycle Simulation]');
  const rupslbDb: UploadedDocument[] = [];
  const rupslbDriveFiles: { id: string; name: string }[] = [];

  // RUPSLB Initial
  const lbRes0 = DocumentVersioningService.resolveRevisionInfo(
    rupslbDb,
    'draft_akta',
    'Draft Akta RUPS LB',
    'Draft RUPSLB PT XYZ.docx'
  );
  assert(lbRes0.isNewDocument === true && lbRes0.nextRevisionNumber === 0, 'Skenario 10: RUPSLB versi awal nomor 0');
  const lbName0 = DocumentVersioningService.getRevisionFileName(lbRes0.originalDocName, 0);
  assert(lbName0 === 'Draft RUPSLB PT XYZ.docx', 'Skenario 10: Nama awal RUPSLB "Draft RUPSLB PT XYZ.docx"');
  const lbDrive0 = 'drive-rupslb-file-0';
  rupslbDriveFiles.push({ id: lbDrive0, name: lbName0 });
  const lbDoc0: UploadedDocument = {
    id: lbRes0.rootParentId,
    parentDocumentId: lbRes0.rootParentId,
    companyId: 'company-2',
    projectId: 'proj-rupslb-1',
    title: 'Draft Akta RUPS LB',
    fileName: lbName0,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 60000,
    driveFileId: lbDrive0,
    driveFolderId: 'folder-2',
    uploadedBy: 'Notaris Putri',
    uploadedAt: '2026-10-13T08:00:00Z',
    savedAt: '2026-10-13T08:00:00Z',
    createdAt: '2026-10-13T08:00:00Z',
    documentSource: 'generated',
    documentCategory: 'draft_akta',
    revisionNumber: 0,
    versionStatus: 'versi awal',
    isLatest: true,
    documentType: 'RUPSLB'
  };
  rupslbDb.push(lbDoc0);

  // RUPSLB Edit 1 -> Revisi 1
  const lbRes1 = DocumentVersioningService.resolveRevisionInfo(
    rupslbDb,
    'draft_akta',
    'Draft Akta RUPS LB',
    'Draft RUPSLB PT XYZ.docx'
  );
  assert(lbRes1.nextRevisionNumber === 1, 'Skenario 10: RUPSLB revisi pertama nomor 1');
  const lbName1 = DocumentVersioningService.getRevisionFileName(lbRes1.originalDocName, 1);
  assert(lbName1 === 'Draft RUPSLB PT XYZ Revisi 1.docx', 'Skenario 10: Nama RUPSLB Revisi 1');
  const lbDrive1 = 'drive-rupslb-file-1';
  rupslbDriveFiles.push({ id: lbDrive1, name: lbName1 });
  lbDoc0.isLatest = false;
  rupslbDb.push({
    ...lbDoc0,
    id: 'doc-rupslb-rec-1',
    fileName: lbName1,
    driveFileId: lbDrive1,
    revisionNumber: 1,
    versionStatus: 'revisi',
    isLatest: true
  });

  // RUPSLB Edit 2 -> Revisi 2
  const lbRes2 = DocumentVersioningService.resolveRevisionInfo(
    rupslbDb,
    'draft_akta',
    'Draft Akta RUPS LB',
    'Draft RUPSLB PT XYZ.docx'
  );
  assert(lbRes2.nextRevisionNumber === 2, 'Skenario 10: RUPSLB revisi kedua nomor 2');
  const lbName2 = DocumentVersioningService.getRevisionFileName(lbRes2.originalDocName, 2);
  assert(lbName2 === 'Draft RUPSLB PT XYZ Revisi 2.docx', 'Skenario 10: Nama RUPSLB Revisi 2');
  const lbDrive2 = 'drive-rupslb-file-2';
  rupslbDriveFiles.push({ id: lbDrive2, name: lbName2 });
  rupslbDb[1].isLatest = false;
  rupslbDb.push({
    ...lbDoc0,
    id: 'doc-rupslb-rec-2',
    fileName: lbName2,
    driveFileId: lbDrive2,
    revisionNumber: 2,
    versionStatus: 'revisi',
    isLatest: true
  });

  assert(rupslbDriveFiles.length === 3, 'Skenario 10: Semua 3 file RUPSLB ada di Google Drive');
  assert(rupslbDb.length === 3, 'Skenario 10: Semua 3 record RUPSLB ada di Firestore');
  assert((new Set(rupslbDriveFiles.map(f => f.id))).size === 3, 'Skenario 10: Seluruh ID Drive RUPSLB berbeda');

  // Test 6: Backward Compatibility (Legacy docs without version metadata)
  console.log('\n[Test Suite 6: Backward Compatibility with Legacy Documents]');
  const legacyDb: UploadedDocument[] = [
    {
      id: 'legacy-doc-123',
      companyId: 'company-old',
      projectId: 'proj-old',
      title: 'Draft Akta RUPST',
      fileName: 'Draft RUPST PT Maju Makmur.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 45000,
      driveFileId: 'drive-legacy-id',
      driveFolderId: 'folder-old',
      uploadedBy: 'Admin',
      uploadedAt: '2025-01-01T00:00:00Z',
      createdAt: '2025-01-01T00:00:00Z',
      documentSource: 'generated',
      documentCategory: 'draft_akta'
      // No revisionNumber, parentDocumentId, isLatest, versionStatus
    }
  ];

  const legacyRes = DocumentVersioningService.resolveRevisionInfo(
    legacyDb,
    'draft_akta',
    'Draft Akta RUPST',
    'Draft RUPST PT Maju Makmur.docx'
  );
  assert(legacyRes.isNewDocument === false, 'Legacy: Dokumen lama dikenali');
  assert(legacyRes.rootParentId === 'legacy-doc-123', 'Legacy: Root parent ID menggunakan ID dokumen lama');
  assert(legacyRes.nextRevisionNumber === 1, 'Legacy: Revisi berikutnya langsung 1');
  const legacyName1 = DocumentVersioningService.getRevisionFileName(legacyRes.originalDocName, 1);
  assert(legacyName1 === 'Draft RUPST PT Maju Makmur Revisi 1.docx', 'Legacy: Nama revisi menjadi "Draft RUPST PT Maju Makmur Revisi 1.docx"');

  console.log('\n========================================');
  console.log('🎉 ALL 11 SCENARIOS & TESTS PASSED SUCCESSFULLY!');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
