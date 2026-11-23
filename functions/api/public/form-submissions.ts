import { DriveFolderService } from '../../../src/services/DriveFolderService';
import { driveRest } from '../../../src/lib/drive-rest';
import {
  collectPublicFormDocumentOwners,
  getFirstBusinessName,
  validatePublicFormPayload,
  type PublicFormPayload
} from '../../../src/domain/publicForm';
import { ensurePublicFormSubmissionsTable, insertPublicFormSubmission } from '../../../src/lib/d1PublicFormRepository';

const MAX_REQUEST_BYTES = 22 * 1024 * 1024;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 60;

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function error(message: string, status = 400): Response {
  return json({ success: false, error: message }, status);
}

function safeName(value: unknown, maxLength = 80): string {
  return String(value || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength) || 'Tanpa Nama';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function matchesFileSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'application/pdf') return new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-';
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  return false;
}

function fileExtension(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  return 'jpg';
}

function requiredHttpStatus(message: string): number {
  return /wajib|valid|minimal|tidak sesuai|PT memerlukan|CV memerlukan|pemegang saham|Yayasan|persetujuan|alamat|kegiatan|alternatif/i.test(message) ? 400 : 422;
}

export const onRequestPost = async ({ request, env }: any) => {
  if (!env?.DB) return error('Penyimpanan formulir sedang tidak tersedia.', 503);
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_REQUEST_BYTES) return error('Ukuran total dokumen maksimal 20 MB.', 413);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error('Data formulir tidak terbaca. Silakan coba kirim kembali.', 400);
  }

  let payload: PublicFormPayload;
  try {
    payload = JSON.parse(String(formData.get('payload') || '')) as PublicFormPayload;
  } catch {
    return error('Data formulir tidak valid.', 400);
  }
  if (!payload || typeof payload !== 'object') return error('Data formulir tidak valid.', 400);

  if (payload.website) {
    const id = crypto.randomUUID();
    return json({ success: true, referenceNo: `FORM-${id.slice(0, 10).toUpperCase()}` }, 201);
  }
  if (!payload.consent) return error('Persetujuan penggunaan data wajib dicentang.', 400);

  let owners: ReturnType<typeof collectPublicFormDocumentOwners>;
  try {
    const validationErrors = validatePublicFormPayload(payload);
    if (validationErrors.length) return error(validationErrors[0], requiredHttpStatus(validationErrors[0]));
    owners = collectPublicFormDocumentOwners(payload);
  } catch {
    return error('Data formulir tidak valid.', 400);
  }
  if (!owners.length || owners.length > 30 || owners.some(owner => owner.name.trim().length < 2)) {
    return error('Lengkapi nama dan data setiap orang yang tercantum dalam formulir.', 400);
  }
  const ownerKeys = new Set(owners.map(owner => owner.key));
  const documentMetadata = Array.isArray(payload.documents) ? payload.documents : [];
  if (!documentMetadata.length) return error('Unggah KTP untuk setiap orang yang tercantum dalam formulir.', 400);
  if (documentMetadata.length > MAX_FILES) return error('Jumlah dokumen yang dapat diunggah maksimal 60 file.', 400);

  const ownerKtp = new Set<string>();
  const ownerNpwp = new Set<string>();
  const seenFieldIndexes = new Set<number>();
  const seenOwnerDocuments = new Set<string>();
  const preparedFiles: Array<{ metadata: any; file: File; bytes: Uint8Array; mimeType: string }> = [];
  let totalBytes = 0;
  for (const metadata of documentMetadata) {
    const index = Number(metadata?.fieldIndex);
    const kind = metadata?.kind === 'NPWP' ? 'NPWP' : metadata?.kind === 'KTP' ? 'KTP' : null;
    if (!kind || !ownerKeys.has(String(metadata?.ownerKey || '')) || !Number.isInteger(index) || index < 0 || index >= MAX_FILES) {
      return error('Data unggahan dokumen tidak sesuai dengan data pemohon.', 400);
    }
    const ownerDocumentKey = `${metadata.ownerKey}:${kind}`;
    if (seenFieldIndexes.has(index) || seenOwnerDocuments.has(ownerDocumentKey)) return error('Data unggahan dokumen duplikat.', 400);
    seenFieldIndexes.add(index);
    seenOwnerDocuments.add(ownerDocumentKey);
    const fileValue = formData.get(`document_${index}`);
    if (!fileValue || typeof fileValue === 'string') return error(`Dokumen ${kind} belum dipilih.`, 400);
    const file = fileValue as File;
    const mimeType = String(file.type || '').toLowerCase();
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
      return error(`Dokumen ${kind} harus berformat PDF, JPG, atau PNG.`, 400);
    }
    if (!file.size || file.size > MAX_FILE_BYTES) return error(`Ukuran setiap dokumen maksimal 5 MB.`, 413);
    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_FILE_BYTES) return error('Ukuran total dokumen maksimal 20 MB.', 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesFileSignature(bytes, mimeType)) return error(`Isi file ${kind} tidak sesuai dengan formatnya.`, 400);
    if (kind === 'KTP') ownerKtp.add(String(metadata.ownerKey));
    if (kind === 'NPWP') ownerNpwp.add(String(metadata.ownerKey));
    preparedFiles.push({ metadata, file, bytes, mimeType });
  }
  if (owners.some(owner => !ownerKtp.has(owner.key))) {
    return error('Unggah KTP untuk setiap orang yang tercantum dalam formulir.', 400);
  }
  if (owners.some(owner => !ownerNpwp.has(owner.key))) {
    return error('Unggah NPWP untuk setiap orang yang tercantum dalam formulir.', 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const datePart = now.slice(0, 10).replace(/-/g, '');
  const referenceNo = `FORM-${datePart}-${id.slice(0, 8).toUpperCase()}`;
  const applicantName = String(payload.applicant.name).trim().slice(0, 120);
  const applicantEmail = String(payload.applicant.email).trim().slice(0, 160);
  const applicantPhone = String(payload.applicant.phone).replace(/[^0-9+]/g, '').slice(0, 32);
  const businessNameFirst = getFirstBusinessName(payload).slice(0, 160);
  const driveRootId = String(env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root');
  let submissionFolderId = '';
  const uploadedFileIds: string[] = [];

  try {
    await ensurePublicFormSubmissionsTable(env.DB);
    const formRootId = await DriveFolderService.getOrCreateFolderByName('Formulir', driveRootId, env);
    const folderName = `${safeName(applicantName)} - ${safeName(businessNameFirst, 100)} - ${referenceNo}`.slice(0, 180);
    submissionFolderId = await DriveFolderService.getOrCreateFolderByName(folderName, formRootId, env);

    const savedDocuments: any[] = [];
    for (const item of preparedFiles) {
      const type = item.metadata.kind as 'KTP' | 'NPWP';
      const ownerName = safeName(item.metadata.ownerName || 'Pemohon');
      const fileName = `${type} - ${ownerName}.${fileExtension(item.mimeType)}`;
      const driveFile = await driveRest.uploadFile(fileName, item.mimeType, submissionFolderId, bytesToBase64(item.bytes), env);
      if (!driveFile?.id) throw new Error('Drive upload did not return a file id');
      uploadedFileIds.push(String(driveFile.id));
      savedDocuments.push({
        kind: type,
        ownerKey: String(item.metadata.ownerKey),
        ownerName: String(item.metadata.ownerName || ''),
        fileName,
        fileId: String(driveFile.id),
        webViewLink: String(driveFile.webViewLink || '')
      });
    }

    await insertPublicFormSubmission(env.DB, {
      id,
      referenceNo,
      applicantName,
      applicantEmail,
      applicantPhone,
      entityType: payload.entityType,
      serviceId: payload.serviceId,
      businessNameFirst,
      payload: { ...payload, website: undefined, documents: undefined },
      documents: savedDocuments,
      driveFolderId: submissionFolderId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${submissionFolderId}`,
      createdAt: now
    });

    return json({ success: true, referenceNo }, 201);
  } catch (caught: any) {
    await Promise.allSettled(uploadedFileIds.map(fileId => driveRest.trashFile(fileId, env)));
    if (submissionFolderId) await driveRest.trashFile(submissionFolderId, env).catch(() => undefined);
    console.error('[PublicForm] Submission storage failed:', caught?.name || 'StorageError');
    return error('Pengajuan belum tersimpan. Penyimpanan dokumen sedang bermasalah; silakan coba lagi beberapa saat.', 503);
  }
};

export const onRequestOptions = async () => new Response(null, { status: 204 });
