import React, { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, TabStopPosition, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { 
  FileText, Briefcase, User, MapPin, Search, Calendar, Save, Trash2, Plus, ArrowLeft,
  ChevronRight, RefreshCw, FileCode, CheckCircle2, AlertCircle
} from 'lucide-react';

const FONT_NAME = 'Times New Roman';
const FONT_SIZE = 24; // 12pt
const SECTION_MARGIN = { top: 2268, left: 2268, right: 1701, bottom: 1701 }; // 4cm/4cm/3cm/3cm

type Correction = {
  id: string;
  NAMA: string;
  JABATAN_PT: string;
  SAHAM: string;
  HP_LAMA: string;
  HP_BARU: string;
  EMAIL_LAMA: string;
  EMAIL_BARU: string;
};

type FormData = {
  NOMOR_SURAT: string;
  NOMOR_SURAT_KUASA: string;
  TANGGAL_SURAT: string;
  NAMA_PT: string;
  ALAMAT_PT: string;
  NAMA_DIREKTUR: string;
  NIK_DIREKTUR: string;
  JABATAN: string;
  SK: string;
  NOMOR_SK: string;
  TANGGAL_SK: string;
  NOMOR_AKTA: string;
  TANGGAL_AKTA: string;
  NAMA_NOTARIS: string;
  KEDUDUKAN_PT: string;
  KOREKSI: Correction[];
};

const INITIAL_DATA: FormData = {
  NOMOR_SURAT: "",
  NOMOR_SURAT_KUASA: "",
  TANGGAL_SURAT: "Jakarta, " + new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
  NAMA_PT: "",
  ALAMAT_PT: "",
  NAMA_DIREKTUR: "",
  NIK_DIREKTUR: "",
  JABATAN: "Direktur Utama",
  SK: "",
  NOMOR_SK: "",
  TANGGAL_SK: "",
  NOMOR_AKTA: "",
  TANGGAL_AKTA: "",
  NAMA_NOTARIS: "",
  KEDUDUKAN_PT: "",
  KOREKSI: [{
    id: Math.random().toString(36).substr(2, 9),
    NAMA: "",
    JABATAN_PT: "",
    SAHAM: "",
    HP_LAMA: "",
    HP_BARU: "",
    EMAIL_LAMA: "",
    EMAIL_BARU: ""
  }]
};

const SK_OPTIONS = [
  "SK PENGESAHAN PENDIRIAN BADAN HUKUM PERSEROAN TERBATAS",
  "SK Surat Persetujuan Perubahan Anggaran Dasar Perseroan Terbatas",
  "SP Surat Pemberitahuan Perubahan Data Perseroan"
];

const JABATAN_OPTIONS = [
  "Direktur Utama",
  "Direktur"
];

const JABATAN_PT_OPTIONS = [
  "Direktur",
  "Direktur Utama",
  "Komisaris",
  "Komisaris Utama",
  "Badan Hukum",
  "Badan Usaha"
];

const formatDateId = (dateString: string) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const formatDocxText = (text: string) => text ? text : "";

const generatePermohonan = async (data: FormData) => {
  const tanggalSk = formatDateId(data.TANGGAL_SK);
  const tanggalAkta = formatDateId(data.TANGGAL_AKTA);
  const namaPt = data.NAMA_PT.toUpperCase();
  const namaDirektur = data.NAMA_DIREKTUR.toUpperCase();

  const correctionParagraphs: any[] = [];
  
  data.KOREKSI.forEach((k, idx) => {
    [{ label: "Nama", value: k.NAMA.toUpperCase() },
     { label: "Jabatan", value: k.JABATAN_PT },
     { label: "Jumlah saham", value: k.SAHAM }
    ].forEach((m, sIdx) => {
      correctionParagraphs.push(new Paragraph({
        tabStops: [{ type: TabStopType.LEFT, position: 500 }, { type: TabStopType.LEFT, position: 2800 }],
        indent: { left: 2800, hanging: 2800 },
        spacing: { before: sIdx === 0 ? 200 : 0 },
        children: [
          new TextRun({ text: sIdx === 0 ? `${idx + 1}.` : "", font: FONT_NAME, size: FONT_SIZE }),
          new TextRun({ text: "\t", font: FONT_NAME, size: FONT_SIZE }),
          new TextRun({ text: m.label, font: FONT_NAME, size: FONT_SIZE }),
          new TextRun({ text: "\t: ", font: FONT_NAME, size: FONT_SIZE }),
          new TextRun({ text: m.value, font: FONT_NAME, size: FONT_SIZE })
        ]
      }));
    });

    correctionParagraphs.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Keterangan", bold: true, font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Semula", bold: true, font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Menjadi", bold: true, font: FONT_NAME, size: FONT_SIZE })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No. Telp", font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.HP_LAMA, font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.HP_BARU, font: FONT_NAME, size: FONT_SIZE })] })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2", font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Email", font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.EMAIL_LAMA, font: FONT_NAME, size: FONT_SIZE })] })] }),
            new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.EMAIL_BARU, font: FONT_NAME, size: FONT_SIZE })] })] })
          ]
        })
      ]
    }));
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: SECTION_MARGIN }
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "[KOP SURAT PERSEROAN]", bold: true, font: FONT_NAME, size: FONT_SIZE, color: "FF0000" })]
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 400 },
          children: [
            data.TANGGAL_SURAT ? new TextRun({ text: data.TANGGAL_SURAT, font: FONT_NAME, size: FONT_SIZE }) : new TextRun({ text: "MASUKAN KOTA DAN TANGGAL SURAT PERMOHONAN DISINI", font: FONT_NAME, size: FONT_SIZE, color: "FF0000" })
          ]
        }),
        new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 1300 }],
          indent: { left: 1300, hanging: 1300 },
          children: [
            new TextRun({ text: "Nomor", font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: "\t: ", font: FONT_NAME, size: FONT_SIZE }),
            data.NOMOR_SURAT ? new TextRun({ text: data.NOMOR_SURAT, font: FONT_NAME, size: FONT_SIZE }) : new TextRun({ text: "MASUKAN NOMOR SURAT PERMOHONAN DISINI", font: FONT_NAME, size: FONT_SIZE, color: "FF0000" })
          ]
        }),
        new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 1300 }],
          indent: { left: 1300, hanging: 1300 },
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "Hal", font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: "\t: ", font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: `Permohonan Perbaikan Data Email dan Nomor Telepon ${namaPt}`, font: FONT_NAME, size: FONT_SIZE })
          ]
        }),
        new Paragraph({ children: [new TextRun({ text: "Kepada Yth.", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ children: [new TextRun({ text: "Direktur Jenderal Administrasi Hukum Umum", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ children: [new TextRun({ text: "cq. Direktur Badan Usaha", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ children: [new TextRun({ text: "Kementerian Hukum", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ children: [new TextRun({ text: "di Jalan HR. Rasuna Said Kav 6-7", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: "Kuningan, Jakarta Selatan", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ children: [new TextRun({ text: "Dengan Hormat,", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Yang bertanda tangan di bawah ini:", font: FONT_NAME, size: FONT_SIZE })] }),
        ...[
          { label: "Nama", value: namaDirektur },
          { label: "NIK", value: data.NIK_DIREKTUR },
          { label: "Jabatan", value: data.JABATAN }
        ].map(p => new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 2500 }],
          indent: { left: 2500, hanging: 2500 },
          children: [
            new TextRun({ text: p.label, font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: `\t: ${p.value}`, font: FONT_NAME, size: FONT_SIZE })
          ]
        })),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "Bertindak untuk dan atas nama,", font: FONT_NAME, size: FONT_SIZE })] }),
        ...[
          { label: "Nama PT", value: namaPt },
          { label: "Alamat PT", value: data.ALAMAT_PT }
        ].map(p => new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 2500 }],
          indent: { left: 2500, hanging: 2500 },
          children: [
            new TextRun({ text: p.label, font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: `\t: ${p.value}`, font: FONT_NAME, size: FONT_SIZE })
          ]
        })),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 300, after: 300 },
          children: [
            new TextRun({ text: "dengan ini mengajukan permohonan perbaikan data email dan/atau nomor telepon pemegang saham, direksi, dan/atau komisaris pada Sistem Administrasi Badan Hukum, Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum. Data pemegang saham, direksi, dan/atau komisaris yang tercatat dalam transaksi terakhir berdasarkan ", font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: data.SK.toUpperCase(), font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: ` Nomor ${data.NOMOR_SK} Tanggal ${tanggalSk} serta Akta Nomor ${data.NOMOR_AKTA} tanggal ${tanggalAkta} dibuat dan dihadapan Notaris `, font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: data.NAMA_NOTARIS.toUpperCase(), font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: ` berkedudukan di ${data.KEDUDUKAN_PT} dengan susunan sebagai berikut:`, font: FONT_NAME, size: FONT_SIZE })
          ]
        }),
        ...correctionParagraphs,
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 400, after: 300 },
          children: [new TextRun({ text: "Permohonan ini diajukan karena data email dan/atau nomor telepon yang tercatat sebelumnya tidak sesuai / keliru pengisian, sehingga tidak sesuai dengan kondisi yang sebenarnya. Adapun data yang diajukan untuk dilakukan perbaikan merupakan data yang benar, valid, aktif, dan dapat dipertanggungjawabkan, serta digunakan untuk kepentingan administrasi resmi Perseroan.", font: FONT_NAME, size: FONT_SIZE })]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 300 },
          children: [new TextRun({ text: "Sehubungan dengan hal tersebut, kami mohon kiranya Bapak berkenan memproses permohonan perbaikan data dimaksud sesuai ketentuan peraturan perundang-undangan.", font: FONT_NAME, size: FONT_SIZE })]
        }),
        new Paragraph({
          spacing: { after: 600 },
          children: [new TextRun({ text: "Demikian permohonan ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.", font: FONT_NAME, size: FONT_SIZE })]
        }),
        new Paragraph({ children: [new TextRun({ text: `${data.JABATAN},`, font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ children: [new TextRun({ text: namaPt, font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({
          spacing: { before: 800, after: 800 },
          children: [new TextRun({ text: "(Tanda Tangan dan Stempel)", font: FONT_NAME, size: FONT_SIZE, italics: true, color: "999999" })]
        }),
        new Paragraph({ children: [new TextRun({ text: namaDirektur, font: FONT_NAME, size: FONT_SIZE, bold: true, underline: {} })] })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const safeName = namaPt ? namaPt.replace(/PT\.?\s*/i, "").trim() : "Draft";
  saveAs(blob, `Permohonan AHU PT ${safeName}.docx`);
};

const generateKuasa = async (data: FormData) => {
  const tanggalSk = formatDateId(data.TANGGAL_SK);
  const tanggalAkta = formatDateId(data.TANGGAL_AKTA);
  const tglSurat = data.TANGGAL_SURAT.replace(/^.*,\s*/, "");
  const namaPt = data.NAMA_PT.toUpperCase();
  const namaDirektur = data.NAMA_DIREKTUR.toUpperCase();
  const centerPos = Math.floor((11906 - 2268 - 1701) / 2);

  const doc = new Document({
    sections: [{
      properties: { page: { margin: SECTION_MARGIN } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "[GANTI DENGAN KOP SURAT PT]", bold: true, font: FONT_NAME, size: FONT_SIZE, color: "FF0000" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "SURAT PERNYATAAN KUASA", bold: true, font: FONT_NAME, size: FONT_SIZE, underline: {} })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "Nomor ", font: FONT_NAME, size: FONT_SIZE }),
            data.NOMOR_SURAT_KUASA ? new TextRun({ text: data.NOMOR_SURAT_KUASA, font: FONT_NAME, size: FONT_SIZE }) : new TextRun({ text: "MASUKAN NOMOR SURAT KUASA DISINI", font: FONT_NAME, size: FONT_SIZE, color: "FF0000" })
          ]
        }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Yang bertanda tangan di bawah ini:", font: FONT_NAME, size: FONT_SIZE })] }),
        ...[
          { label: "Nama", value: namaDirektur },
          { label: "NIK", value: data.NIK_DIREKTUR },
          { label: "Jabatan", value: data.JABATAN }
        ].map(p => new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 2500 }],
          indent: { left: 2500, hanging: 2500 },
          children: [
            new TextRun({ text: p.label, font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: `\t: ${p.value}`, font: FONT_NAME, size: FONT_SIZE })
          ]
        })),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "Bertindak untuk dan atas nama,", font: FONT_NAME, size: FONT_SIZE })] }),
        ...[
          { label: "Nama PT", value: namaPt },
          { label: "Alamat PT", value: data.ALAMAT_PT }
        ].map(p => new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 2500 }],
          indent: { left: 2500, hanging: 2500 },
          children: [
            new TextRun({ text: p.label, font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: `\t: ${p.value}`, font: FONT_NAME, size: FONT_SIZE })
          ]
        })),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "selanjutnya disebut sebagai PEMBERI KUASA.", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Dengan ini memberikan kuasa kepada:", font: FONT_NAME, size: FONT_SIZE })] }),
        ...[
          { label: "Nama", value: "NUKANTINI PUTRI PARINCHA.,SH.M.Kn" },
          { label: "Jabatan", value: "Notaris" },
          { label: "Kedudukan", value: "Kabupaten Bandung Barat" },
          { label: "Alamat Kantor", value: "Komplek PPR ITB Kav F5 Dago Giri, Desa Mekarwangi, Kecamatan Lembang, Kabupaten Bandung Barat" },
          { label: "Nomor SK/MK", value: "C-309.HT 03.01-Th. 2007, Tanggal 23 Agustus 2007" }
        ].map(p => new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 2500 }],
          indent: { left: 2500, hanging: 2500 },
          children: [
            new TextRun({ text: p.label, font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: `\t: ${p.value}`, font: FONT_NAME, size: FONT_SIZE })
          ]
        })),
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "selanjutnya disebut sebagai PENERIMA KUASA.", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({
          tabStops: [{ type: TabStopType.CENTER, position: centerPos, leader: "hyphen" as any }, { type: TabStopType.RIGHT, position: 11906 - 2268 - 1701, leader: "hyphen" as any }],
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ text: "\tKHUSUS\t", font: FONT_NAME, size: FONT_SIZE, bold: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({ text: "Untuk dan atas nama PEMBERI KUASA melakukan tindakan administratif berupa penginputan dan/atau pengajuan permohonan perbaikan data terkait data email dan/atau nomor telepon pemegang saham, direksi dan/atau dewan komisaris yang tercatat dalam data transaksi terakhir pada Sistem Administrasi Badan Hukum, Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum berdasarkan ", font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: data.SK, font: FONT_NAME, size: FONT_SIZE }),
            new TextRun({ text: ` Nomor ${data.NOMOR_SK} Tanggal ${tanggalSk} serta Akta Nomor ${data.NOMOR_AKTA} tanggal ${tanggalAkta} dibuat dan dihadapan Notaris ${data.NAMA_NOTARIS}. berkedudukan di ${data.KEDUDUKAN_PT} pada Sistem Administrasi Badan Hukum, Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum. Serta berdasarkan Surat Permohonan ${data.JABATAN} ${namaPt} Nomor `, font: FONT_NAME, size: FONT_SIZE }),
            data.NOMOR_SURAT ? new TextRun({ text: data.NOMOR_SURAT, font: FONT_NAME, size: FONT_SIZE }) : new TextRun({ text: "MASUKAN NOMOR SURAT PERMOHONAN DISINI", font: FONT_NAME, size: FONT_SIZE, color: "FF0000" }),
            new TextRun({ text: " tanggal ", font: FONT_NAME, size: FONT_SIZE }),
            tglSurat ? new TextRun({ text: tglSurat, font: FONT_NAME, size: FONT_SIZE }) : new TextRun({ text: "MASUKAN TANGGAL SURAT PERMOHONAN DISINI", font: FONT_NAME, size: FONT_SIZE, color: "FF0000" }),
            new TextRun({ text: ` hal Permohonan Perbaikan Data Email dan Nomor Telepon ${namaPt}.`, font: FONT_NAME, size: FONT_SIZE })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Segala akibat hukum yang timbul sehubungan dengan pelaksanaan kuasa ini sepenuhnya menjadi tanggung jawab PEMBERI KUASA, dan dengan ini PEMBERI KUASA membebaskan PENERIMA KUASA dari segala tuntutan hukum sepanjang PENERIMA KUASA melaksanakan kuasa ini sesuai dengan ketentuan peraturan perundang-undangan.", font: FONT_NAME, size: FONT_SIZE })]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Surat kuasa ini diberikan dengan tanpa hak substitusi dan berlaku sejak tanggal ditandatangani sampai dengan selesainya proses perbaikan data dimaksud.", font: FONT_NAME, size: FONT_SIZE })]
        }),
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya.", font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: data.TANGGAL_SURAT, font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "PEMBERI KUASA", font: FONT_NAME, size: FONT_SIZE, bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: data.JABATAN, font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({ children: [new TextRun({ text: namaPt, font: FONT_NAME, size: FONT_SIZE })] }),
        new Paragraph({
          spacing: { before: 800, after: 800 },
          children: [new TextRun({ text: "(ttd, Materai Rp10.000,- dan cap basah PT)", font: FONT_NAME, size: FONT_SIZE, italics: true, color: "999999" })]
        }),
        new Paragraph({ children: [new TextRun({ text: `(${namaDirektur})`, font: FONT_NAME, size: FONT_SIZE, bold: true })] })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const safeName = namaPt ? namaPt.replace(/PT\.?\s*/i, "").trim() : "Draft";
  saveAs(blob, `Surat Kuasa AHU PT ${safeName}.docx`);
};

export const DataCorrectionLetter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'permohonan' | 'kuasa'>('permohonan');
  const [data, setData] = useState<FormData>(INITIAL_DATA);

  const isNikInvalid = data.NIK_DIREKTUR !== "" && !/^\d{16}$/.test(data.NIK_DIREKTUR);
  const isLocked = activeTab === 'kuasa';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "NIK_DIREKTUR") {
      setData(prev => ({ ...prev, [name]: value.replace(/\D/g, "") }));
      return;
    }
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleCorrectionChange = (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      KOREKSI: prev.KOREKSI.map(k => k.id === id ? { ...k, [name]: value } : k)
    }));
  };

  const addCorrection = () => {
    setData(prev => ({
      ...prev,
      KOREKSI: [...prev.KOREKSI, {
        id: Math.random().toString(36).substr(2, 9),
        NAMA: "", JABATAN_PT: "", SAHAM: "", HP_LAMA: "", HP_BARU: "", EMAIL_LAMA: "", EMAIL_BARU: ""
      }]
    }));
  };

  const removeCorrection = (id: string) => {
    if (data.KOREKSI.length > 1) {
      setData(prev => ({ ...prev, KOREKSI: prev.KOREKSI.filter(k => k.id !== id) }));
    }
  };

  const attemptExport = async () => {
    if (!data.NAMA_PT || !data.NAMA_DIREKTUR || !data.SK) {
      alert("Harap lengkapi setidaknya Nama PT, Nama Direktur, dan Jenis SK.");
      return;
    }
    if (data.NIK_DIREKTUR.length !== 16) {
      alert("NIK harus 16 digit angka. Harap periksa kembali.");
      return;
    }
    try {
      if (activeTab === 'permohonan') {
        await generatePermohonan(data);
      } else {
        await generateKuasa(data);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat membuat dokumen.");
    }
  };

  return (
    <div className="flex-1 bg-white border border-slate-200 mt-4 overflow-hidden rounded-md flex flex-col">
      <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
        <button
          onClick={() => setActiveTab('permohonan')}
          className={`flex-1 py-3 text-[13px] font-bold tracking-tight uppercase ${activeTab === 'permohonan' ? 'bg-[#3b5998] text-white' : 'text-slate-600 hover:bg-slate-200'}`}
        >
          1. Surat Permohonan
        </button>
        <button
          onClick={() => setActiveTab('kuasa')}
          className={`flex-1 py-3 text-[13px] font-bold tracking-tight uppercase border-l border-white/20 ${activeTab === 'kuasa' ? 'bg-[#3b5998] text-white' : 'text-slate-600 hover:bg-slate-200'}`}
        >
          2. Surat Kuasa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#ecf0f5]">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
            <div className="lg:col-span-8 space-y-6">
              
              {isLocked && (
                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-sm">
                  <h3 className="text-[13px] font-bold text-[#3b5998] uppercase tracking-tight mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4"/> Data Khusus Surat Kuasa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-slate-700 mb-1">Nomor Surat Kuasa</label>
                      <input name="NOMOR_SURAT_KUASA" value={data.NOMOR_SURAT_KUASA || ''} onChange={handleChange} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none focus:border-[#66afe9]" placeholder="Contoh: 001/KUASA-PT/X/2023" />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-sm">
                <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-tight mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Informasi Dasar Surat</span>
                  {isLocked && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold tracking-wide">LOCKED</span>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTab === 'permohonan' && (
                    <div>
                      <label className="block text-[12px] font-bold text-slate-700 mb-1">Nomor Surat Permohonan</label>
                      <input name="NOMOR_SURAT" value={data.NOMOR_SURAT || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none focus:border-[#66afe9]" placeholder="010/SK-PT/X/2023" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">Kota & Tanggal</label>
                    <input name="TANGGAL_SURAT" value={data.TANGGAL_SURAT || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none focus:border-[#66afe9]" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-sm">
                <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-tight mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> Identitas Perusahaan</span>
                  {isLocked && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold tracking-wide">LOCKED</span>}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">Nama Lengkap PT</label>
                    <input name="NAMA_PT" value={data.NAMA_PT || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none focus:border-[#66afe9]" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">Alamat Kantor Pusat</label>
                    <input name="ALAMAT_PT" value={data.ALAMAT_PT || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none focus:border-[#66afe9]" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-sm">
                <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-tight mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> Penandatangan / Direktur</span>
                  {isLocked && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold tracking-wide">LOCKED</span>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Nama Lengkap</label><input name="NAMA_DIREKTUR" value={data.NAMA_DIREKTUR || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" /></div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">NIK</label>
                    <input name="NIK_DIREKTUR" maxLength={16} value={data.NIK_DIREKTUR || ''} onChange={handleChange} disabled={isLocked} className={`w-full border rounded-sm px-3 py-2 text-[13px] outline-none ${isNikInvalid ? 'border-red-500' : 'border-[#ccc]'}`} />
                    {isNikInvalid && <p className="text-[10px] text-red-500 mt-1">NIK harus 16 digit</p>}
                  </div>
                  <div className="md:col-span-2"><label className="block text-[12px] font-bold text-slate-700 mb-1">Jabatan</label>
                    <select name="JABATAN" value={data.JABATAN || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none">
                      {JABATAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-sm">
                <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-tight mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Dasar Transaksi Terakhir</span>
                  {isLocked && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold tracking-wide">LOCKED</span>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">Jenis SK</label>
                    <select name="SK" value={data.SK || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none">
                      <option value="">-- Pilih Jenis SK --</option>
                      {SK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Nomor SK</label><input name="NOMOR_SK" value={data.NOMOR_SK || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Tanggal SK</label><input type="date" name="TANGGAL_SK" value={data.TANGGAL_SK || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Nama Notaris</label><input name="NAMA_NOTARIS" value={data.NAMA_NOTARIS || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Kedudukan Notaris</label><input name="KEDUDUKAN_PT" value={data.KEDUDUKAN_PT || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Nomor Akta</label><input type="number" name="NOMOR_AKTA" value={data.NOMOR_AKTA || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Tanggal Akta</label><input type="date" name="TANGGAL_AKTA" value={data.TANGGAL_AKTA || ''} onChange={handleChange} disabled={isLocked} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" /></div>
                </div>
              </div>

              {activeTab === 'permohonan' && (
                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-sm">
                  <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-tight mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="flex items-center gap-2"><FileCode className="w-4 h-4 text-slate-400" /> Data Yang Dikoreksi</span>
                    <button onClick={addCorrection} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-[11px] font-bold hover:bg-blue-100 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Tambah Personil
                    </button>
                  </h3>
                  <div className="space-y-4">
                    {data.KOREKSI.map((k, idx) => (
                      <div key={k.id} className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded relative">
                        {data.KOREKSI.length > 1 && (
                          <button onClick={() => removeCorrection(k.id)} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <h4 className="text-[12px] font-bold text-slate-600 mb-3 border-b border-slate-200 pb-2">Personil {idx + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Nama Subjek</label><input name="NAMA" value={k.NAMA || ''} onChange={(e) => handleCorrectionChange(k.id, e)} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" placeholder="Nama Lengkap"/></div>
                          <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Jabatan</label>
                            <select name="JABATAN_PT" value={k.JABATAN_PT || ''} onChange={(e) => handleCorrectionChange(k.id, e)} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none">
                              <option value="">-- Pilih --</option>
                              {JABATAN_PT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          <div><label className="block text-[12px] font-bold text-slate-700 mb-1">Jumlah Saham</label><input name="SAHAM" value={k.SAHAM || ''} onChange={(e) => handleCorrectionChange(k.id, e)} className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none" placeholder="Misal: 100 Lembar"/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 border border-slate-200 rounded-sm">
                           <div className="space-y-3 border-r border-slate-100 pr-4">
                             <h5 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Status Semula</h5>
                             <div><label className="block text-[11px] font-bold text-slate-700 mb-1">No Telp</label><input name="HP_LAMA" value={k.HP_LAMA || ''} onChange={(e) => handleCorrectionChange(k.id, e)} className="w-full border border-[#ccc] rounded-sm px-2 py-1.5 text-[12px] outline-none" /></div>
                             <div><label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label><input name="EMAIL_LAMA" value={k.EMAIL_LAMA || ''} onChange={(e) => handleCorrectionChange(k.id, e)} className="w-full border border-[#ccc] rounded-sm px-2 py-1.5 text-[12px] outline-none" /></div>
                           </div>
                           <div className="space-y-3 pl-2">
                             <h5 className="text-[10px] font-bold uppercase tracking-wide text-[#3b5998]">Status Menjadi</h5>
                             <div><label className="block text-[11px] font-bold text-slate-700 mb-1">No Telp</label><input name="HP_BARU" value={k.HP_BARU || ''} onChange={(e) => handleCorrectionChange(k.id, e)} className="w-full border border-[#ccc] rounded-sm px-2 py-1.5 text-[12px] outline-none" /></div>
                             <div><label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label><input name="EMAIL_BARU" value={k.EMAIL_BARU || ''} onChange={(e) => handleCorrectionChange(k.id, e)} className="w-full border border-[#ccc] rounded-sm px-2 py-1.5 text-[12px] outline-none" /></div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="bg-[#2c3b41] text-white p-5 rounded shadow-sm sticky top-4 border-t-4 border-[#3b5998]">
                <h3 className="text-[14px] font-bold uppercase tracking-tight mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Eksekusi</h3>
                
                <p className="text-[12px] text-slate-300 mb-6 leading-relaxed">
                  {isLocked 
                    ? "Isi Nomor Surat Kuasa dan pastikan semua data yang ditarik dari Permohonan sudah benar. Klik download untuk mengunduh Surat Kuasa dalam bentuk Word." 
                    : "Isi data awal dan daftar personel yang akan dikoreksi. Setelah semua data terisi, Anda dapat mengunduh Surat Permohonan dalam bentuk Word."}
                </p>

                <button 
                  onClick={attemptExport} 
                  disabled={isNikInvalid}
                  className="w-full py-3 bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-[13px] rounded-sm uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4"/> Download Draft .docx
                </button>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
};
