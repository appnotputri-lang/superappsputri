import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../../../domain/project/Project';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Upload, FileText, Image as FileImage, File, Trash2, Download, RefreshCw, X, Loader2, Eye, Replace, ExternalLink } from 'lucide-react';
import { UserProfile } from '../../../../types';
import { AuthService } from '../../../services/AuthService';

interface ProjectDocumentUploadProps {
  project: Project;
  currentUser: UserProfile | null;
}

interface UploadedDocument {
  id: string;
  companyId: string;
  projectId: string;
  type: 'minutes' | 'deed' | 'sksp' | 'custom';
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  driveFolderId: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
}

const DOCUMENT_TYPES = [
  { value: 'minutes', label: 'Scan Notulen / Keputusan' },
  { value: 'deed', label: 'Scan Akta' },
  { value: 'sksp', label: 'SK / SP' },
  { value: 'custom', label: 'Kustom' },
];

export function ProjectDocumentUpload({ project, currentUser }: ProjectDocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [selectedType, setSelectedType] = useState('minutes');
  const [customTitle, setCustomTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentToReplace, setDocumentToReplace] = useState<UploadedDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'project_uploaded_documents'),
        where('projectId', '==', project.projectId)
      );
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'project_uploaded_documents');
        throw err;
      }
      const docs = snapshot.docs.map(doc => doc.data() as UploadedDocument);
      docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setDocuments(docs);
    } catch (error: any) {
      console.error('Failed to fetch uploaded documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [project.projectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const uploadFile = async (file: File, isReplace = false, replaceDoc?: UploadedDocument) => {
    const driveFolderId = project.metadata?.driveFolderId || (project as any).driveFolderId;
    if (!driveFolderId) {
      alert('Google Drive folder belum disiapkan untuk proyek ini.');
      return;
    }

    if (selectedType === 'custom' && !customTitle.trim()) {
      alert('Nama dokumen wajib diisi untuk jenis kustom.');
      return;
    }

    const builtInTypes = ['minutes', 'deed', 'sksp'];
    if (!isReplace && builtInTypes.includes(selectedType)) {
      const existing = documents.find(d => d.type === selectedType);
      if (existing) {
        setDocumentToReplace(existing);
        setIsReplaceModalOpen(true);
        return;
      }
    }

    setUploading(true);
    try {
      const token = await AuthService.getToken();
      const base64 = await toBase64(file);
      
      const response = await fetch('/api/v2/drive/upload-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          parentFolderId: driveFolderId,
          base64
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const driveFileId = data.file.id;
      
      let title = '';
      if (selectedType === 'custom') {
        title = customTitle;
      } else {
        title = DOCUMENT_TYPES.find(d => d.value === selectedType)?.label || file.name;
      }

      const docId = replaceDoc ? replaceDoc.id : crypto.randomUUID();
      const now = new Date().toISOString();

      const newDoc: UploadedDocument = {
        id: docId,
        companyId: project.clientId,
        projectId: project.projectId,
        type: (replaceDoc ? replaceDoc.type : selectedType) as any,
        title: replaceDoc ? replaceDoc.title : title,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        driveFileId,
        driveFolderId: driveFolderId,
        uploadedBy: currentUser?.name || 'Unknown',
        uploadedAt: now,
        createdAt: replaceDoc ? replaceDoc.createdAt : now
      };

      try {
        await setDoc(doc(db, 'project_uploaded_documents', docId), newDoc);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `project_uploaded_documents/${docId}`);
      }
      
      if (isReplace && replaceDoc) {
        // Optionally delete old file from Drive
        try {
          await fetch(`/api/v2/drive/delete-file/${replaceDoc.driveFileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (e) {
          console.warn("Could not delete old file from drive:", e);
        }
      }

      setIsUploadModalOpen(false);
      setIsReplaceModalOpen(false);
      setSelectedFile(null);
      setCustomTitle('');
      setDocumentToReplace(null);
      fetchDocuments();
      alert('Dokumen berhasil diunggah.');

    } catch (error: any) {
      console.error(error);
      alert('Gagal mengunggah dokumen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Silakan pilih file terlebih dahulu.');
      return;
    }
    uploadFile(selectedFile);
  };

  const handleDelete = async (docObj: UploadedDocument) => {
    if (!confirm(`Hapus dokumen ${docObj.title}?`)) return;
    try {
      const token = await AuthService.getToken();
      await fetch(`/api/v2/drive/delete-file/${docObj.driveFileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      try {
        await deleteDoc(doc(db, 'project_uploaded_documents', docObj.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `project_uploaded_documents/${docObj.id}`);
      }
      fetchDocuments();
    } catch (error: any) {
      console.error(error);
      alert('Gagal menghapus dokumen.');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-4 h-4 text-blue-500" />;
    if (mimeType.includes('word')) return <FileText className="w-4 h-4 text-blue-600" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm mt-6">
      <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 text-[14px] uppercase tracking-wide flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          Upload Dokumen Proyek
        </h2>
        <div className="flex gap-2">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setSelectedType('minutes');
              setCustomTitle('');
              setSelectedFile(null);
              setIsUploadModalOpen(true);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Dokumen</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-[13px]">
            Belum ada dokumen yang diunggah.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {documents.map(docObj => (
              <div key={docObj.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {getFileIcon(docObj.mimeType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-[13px]">{docObj.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{docObj.fileName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(docObj.uploadedAt).toLocaleDateString('id-ID')} • {(docObj.size / 1024 / 1024).toFixed(2)} MB • {docObj.uploadedBy}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {(docObj.mimeType.includes('pdf') || docObj.mimeType.includes('image')) && (
                    <button
                      onClick={() => setPreviewDoc(docObj)}
                      className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  )}
                  <a
                    href={`https://drive.google.com/file/d/${docObj.driveFileId}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Buka di Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Drive</span>
                  </a>
                  <a
                    href={`https://drive.google.com/uc?export=download&id=${docObj.driveFileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => {
                      setDocumentToReplace(docObj);
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-2.5 py-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Ganti File"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti</span>
                  </button>
                  <button
                    onClick={() => handleDelete(docObj)}
                    className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-[15px] truncate">{previewDoc.title}</h3>
                <p className="text-[11px] text-slate-500 truncate">{previewDoc.fileName}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-auto">
              {previewDoc.mimeType.includes('pdf') || previewDoc.mimeType.includes('image') ? (
                <iframe
                  src={`https://drive.google.com/file/d/${previewDoc.driveFileId}/preview`}
                  className="w-full h-full border-0 rounded-lg bg-white shadow-sm"
                  title={previewDoc.title}
                  allow="autoplay"
                />
              ) : (
                <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md animate-in zoom-in-95 duration-200">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-[14px] text-slate-700 font-medium mb-1">Preview Tidak Tersedia</p>
                  <p className="text-xs text-slate-500 mb-4">
                    Dokumen ini tidak mendukung preview langsung. Silakan buka di Google Drive atau unduh file.
                  </p>
                  <div className="flex justify-center gap-2">
                    <a
                      href={`https://drive.google.com/file/d/${previewDoc.driveFileId}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buka Google Drive</span>
                    </a>
                    <a
                      href={`https://drive.google.com/uc?export=download&id=${previewDoc.driveFileId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-[15px]">Upload Dokumen</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Jenis Dokumen</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  {DOCUMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {selectedType === 'custom' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nama Dokumen</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Masukkan nama dokumen"
                    className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pilih File</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full text-[13px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">Support: PDF, DOC, DOCX, JPG, JPEG, PNG</p>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-slate-600 text-[13px] font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 animate-pulse-subtle"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengunggah...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden file input for Replace */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0 && documentToReplace) {
            uploadFile(e.target.files[0], true, documentToReplace);
          }
        }}
      />

      {/* Replace Confirmation Modal */}
      {isReplaceModalOpen && documentToReplace && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
              <Replace className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-bold text-slate-800 text-[16px] mb-2">Dokumen Sudah Ada</h3>
            <p className="text-[13px] text-slate-500 mb-6">
              Dokumen ini sudah ada. Apakah ingin mengganti file yang lama?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setIsReplaceModalOpen(false);
                  setDocumentToReplace(null);
                  setUploading(false);
                }}
                className="px-4 py-2 text-slate-600 text-[13px] font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (selectedFile) {
                    uploadFile(selectedFile, true, documentToReplace);
                  }
                }}
                disabled={uploading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ganti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
