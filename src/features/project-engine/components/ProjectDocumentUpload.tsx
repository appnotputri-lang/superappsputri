import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../../../domain/project/Project';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Upload, FileText, Image as FileImage, File, Trash2, Download, RefreshCw, X, Loader2, Eye, Replace, ExternalLink, MoreVertical } from 'lucide-react';
import { UserProfile } from '../../../../types';
import { AuthService } from '../../../services/AuthService';
import { getApiUrl } from '../../../lib/api';

interface ProjectDocumentUploadProps {
  project: Project;
  currentUser: UserProfile | null;
}

interface UploadedDocument {
  id: string;
  companyId: string;
  projectId: string;
  type?: 'minutes' | 'deed' | 'sksp' | 'custom';
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  driveFolderId: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  documentSource?: 'generated' | 'manual';
  documentCategory?: 'draft_akta' | 'notulen' | 'surat_pernyataan' | 'scan_akta' | 'scan_notulen' | 'sksp' | 'custom';
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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
    let driveFolderId = project.metadata?.driveFolderId || (project as any).driveFolderId;
    
    if (!driveFolderId) {
      setUploading(true);
      try {
        const token = await AuthService.getToken();
        const response = await fetch(getApiUrl('/api/v2/drive/ensure-project-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            project: project
          })
        });

        if (!response.ok) {
          alert('Google Drive folder belum disiapkan untuk proyek ini. Gagal membuat folder otomatis.');
          setUploading(false);
          return;
        }

        // We need to re-fetch or assume it's created and will be available in next render or via the response
        // For simplicity here, we'll try to re-fetch the project or just tell the user to try again if it fails
        const resData = await response.json();
        // The handleNewProject updates Firestore, so we might need a small delay or re-fetch
        // But the most reliable way is to tell the user it's being prepared
        alert('Folder Google Drive sedang disiapkan. Silakan coba upload kembali dalam sekejap.');
        setUploading(false);
        return;
      } catch (err) {
        setUploading(false);
        alert('Gagal menyiapkan folder Google Drive otomatis.');
        return;
      }
    }

    if (selectedType === 'custom' && !customTitle.trim()) {
      alert('Nama dokumen wajib diisi untuk jenis kustom.');
      return;
    }

    const builtInTypes = ['minutes', 'deed', 'sksp'];
    if (!isReplace && builtInTypes.includes(selectedType)) {
      const mapTypeToCategory = (type: string) => {
        switch (type) {
          case 'minutes': return 'scan_notulen';
          case 'deed': return 'scan_akta';
          case 'sksp': return 'sksp';
          default: return 'custom';
        }
      };
      const cat = mapTypeToCategory(selectedType);
      const existing = documents.find(d => d.documentCategory === cat || d.type === selectedType);
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
      
      const response = await fetch(getApiUrl('/api/v2/drive/upload-file'), {
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

      if (!response.ok) {
        let errMsg = 'Gagal mengunggah berkas ke Google Drive.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          try {
            const textMsg = await response.text();
            if (textMsg) errMsg = `${errMsg} Detail: ${textMsg.substring(0, 200)}`;
          } catch (_) {}
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Respons dari Google Drive upload tidak valid (bukan JSON).');
      }

      const driveFileId = data.file?.id;
      if (!driveFileId) {
        throw new Error('Respons dari Google Drive upload tidak menyertakan ID berkas.');
      }
      
      let title = '';
      if (selectedType === 'custom') {
        title = customTitle;
      } else {
        title = DOCUMENT_TYPES.find(d => d.value === selectedType)?.label || file.name;
      }

      const mapTypeToCategory = (type: string) => {
        switch (type) {
          case 'minutes': return 'scan_notulen';
          case 'deed': return 'scan_akta';
          case 'sksp': return 'sksp';
          default: return 'custom';
        }
      };

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
        createdAt: replaceDoc ? replaceDoc.createdAt : now,
        documentSource: 'manual',
        documentCategory: replaceDoc ? (replaceDoc.documentCategory || mapTypeToCategory(replaceDoc.type || 'custom')) : mapTypeToCategory(selectedType)
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

  const getFileIconBgClass = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'bg-rose-50 border-rose-100/50 text-rose-500';
    if (mimeType.includes('image')) return 'bg-violet-50 border-violet-100/50 text-violet-500';
    if (mimeType.includes('word') || mimeType.includes('officedocument')) return 'bg-blue-50 border-blue-100/50 text-blue-500';
    return 'bg-slate-50 border-slate-100 text-slate-500';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-5 h-5 text-violet-500" />;
    if (mimeType.includes('word') || mimeType.includes('officedocument')) return <FileText className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl overflow-visible shadow-xs mt-6">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            Upload Dokumen Proyek
          </h2>
          <p className="text-xs text-slate-400 mt-1">Kelola dan telusuri seluruh berkas atau hasil generate proyek ini</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setSelectedType('minutes');
              setCustomTitle('');
              setSelectedFile(null);
              setIsUploadModalOpen(true);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Dokumen</span>
          </button>
        </div>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium text-slate-400">Memuat berkas...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-[13px] flex flex-col items-center justify-center gap-2">
            <File className="w-10 h-10 text-slate-200" />
            <span>Belum ada dokumen yang diunggah untuk proyek ini.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/70">
            {documents.map(docObj => {
              const isMenuOpen = activeMenuId === docObj.id;
              const canPreview = docObj.mimeType.includes('pdf') || docObj.mimeType.includes('image');

              return (
                <div 
                  key={docObj.id} 
                  className="group relative p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Left: Icon & File Info */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-102 ${getFileIconBgClass(docObj.mimeType)}`}>
                      {getFileIcon(docObj.mimeType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 
                          className="font-bold text-slate-800 text-[13.5px] leading-snug tracking-tight hover:text-blue-600 transition-colors cursor-pointer"
                          onClick={() => canPreview ? setPreviewDoc(docObj) : window.open(`https://drive.google.com/file/d/${docObj.driveFileId}/view`, '_blank')}
                        >
                          {docObj.title}
                        </h4>
                        {docObj.documentSource === 'generated' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50 uppercase tracking-wider">
                            Hasil Generate
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200/30 uppercase tracking-wider">
                            Upload Manual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1 truncate max-w-lg" title={docObj.fileName}>
                        {docObj.fileName}
                      </p>
                      <div className="text-[11px] text-slate-400/90 mt-1.5 flex items-center gap-2 flex-wrap font-medium">
                        <span className="text-slate-500">{(docObj.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span className="text-slate-300">•</span>
                        <span>{new Date(docObj.uploadedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1">
                          Oleh: {docObj.uploadedBy}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    {/* Primary actions visible inline for convenience on hover/focus */}
                    {canPreview && (
                      <button
                        onClick={() => setPreviewDoc(docObj)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg transition-all duration-150"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={`https://drive.google.com/uc?export=download&id=${docObj.driveFileId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80 rounded-lg transition-all duration-150"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    {/* Overflow trigger */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : docObj.id);
                        }}
                        className={`p-2 rounded-lg transition-all duration-150 ${isMenuOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                        title="Menu Aksi"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <>
                          {/* Full page click catcher to close the dropdown menu */}
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }} 
                          />
                          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200/80 shadow-lg ring-1 ring-black/5 z-50 py-1.5 divide-y divide-slate-100 origin-top-right animate-in fade-in duration-100">
                            <div className="py-1">
                              {canPreview && (
                                <button
                                  onClick={() => {
                                    setPreviewDoc(docObj);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-slate-400" />
                                  <span>Preview</span>
                                </button>
                              )}
                              <a
                                href={`https://drive.google.com/file/d/${docObj.driveFileId}/view`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setActiveMenuId(null)}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 text-slate-400" />
                                <span>Buka di Drive</span>
                              </a>
                              <a
                                href={`https://drive.google.com/uc?export=download&id=${docObj.driveFileId}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setActiveMenuId(null)}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Download className="w-4 h-4 text-slate-400" />
                                <span>Unduh Berkas</span>
                              </a>
                              <button
                                onClick={() => {
                                  setDocumentToReplace(docObj);
                                  setActiveMenuId(null);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.click();
                                  }
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4 text-slate-400" />
                                <span>Ganti Berkas</span>
                              </button>
                            </div>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleDelete(docObj);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span>Hapus Dokumen</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
