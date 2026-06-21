import React, { useState } from 'react';
import { FormData } from './constants';
import { Printer, Download, Loader2 } from 'lucide-react';
import { generateDocx } from './lib/generateDocxJualBeli';
import { parseTextRuns, FormatToken } from './lib/notaryWrapper';
import { generateBlocks } from './lib/contentBlocks';

interface DocumentPreviewProps {
  data: FormData;
}

const WrappedText = ({ runs, isList = false, indent = false, indentTabs = 0, align = 'left' }: { runs: FormatToken[], isList?: boolean, indent?: boolean, indentTabs?: number, align?: 'left'|'center'|'right'|'right-center' }) => {
  let indentReduction = 0;
  if (isList || indent) indentReduction += 2.2;
  if (indentTabs) indentReduction += indentTabs * 4.4;
  if (align === 'right-center') indentReduction += 21; // basically half the width
  
  const maxLine = 41.5 - indentReduction; 
  const lines = parseTextRuns(runs, maxLine);

  let paddingLeft = '0';
  let marginLeft = '0';
  if (indentTabs) paddingLeft = `${indentTabs * 1.5}cm`;
  if (align === 'right-center') {
    marginLeft = '50%';
    align = 'center';
  }

  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className={`flex relative w-full overflow-hidden leading-[2]`} style={{ textAlign: align as any, justifyContent: (align === 'center' || marginLeft === '50%') ? 'center' : 'flex-start', paddingLeft, marginLeft }}>
           <span className="whitespace-pre-wrap shrink-0 flex">
             {line.map((t, j) => t.bold ? <strong key={j}>{t.text}</strong> : <span key={j}>{t.text}</span>)}
           </span>
           {align !== 'center' && marginLeft !== '50%' && (
             <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
               &nbsp;{Array(150).fill('-').join('')}
             </span>
           )}
        </div>
      ))}
    </>
  );
};

const DashedDivider = ({ text, className = "" }: { text: string, className?: string }) => (
  <div className={`flex w-full items-center overflow-hidden ${className}`}>
    <div className="flex-1 overflow-hidden select-none font-normal whitespace-nowrap flex justify-end opacity-60" style={{ letterSpacing: '0.5px' }}>
      <span>{Array(300).fill('-').join('')}</span>
    </div>
    <div className="px-1 font-bold whitespace-nowrap tracking-wider">{text}</div>
    <div className="flex-1 overflow-hidden select-none font-normal whitespace-nowrap flex justify-start opacity-60" style={{ letterSpacing: '0.5px' }}>
      <span>{Array(300).fill('-').join('')}</span>
    </div>
  </div>
);

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ data }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      await generateDocx(data);
    } catch (err) {
      console.error(err);
      alert('Gagal mendownload DOCX');
    } finally {
      setIsExporting(false);
    }
  };

  const blocks = generateBlocks(data);
  
  // Collect all lines
  const allLines: { element: React.ReactNode }[] = [];

  blocks.forEach((block, bIdx) => {
    if (block.type === 'p') {
      const runs = block.runs;
      const isList = false;
      const indent = block.indent;
      const indentTabs = block.indentTabs || 0;
      const align = block.align || 'left';
      
      let indentReduction = 0;
      if (isList || indent) indentReduction += 2.2;
      if (indentTabs) indentReduction += indentTabs * 4.4;
      if (align === 'right-center') indentReduction += 21;
      
      const maxLine = 41.5 - indentReduction; 
      const lines = parseTextRuns(runs, maxLine);

      let paddingLeft = '0';
      let marginLeft = '0';
      if (indentTabs) paddingLeft = `${indentTabs * 1.5}cm`;
      if (align === 'right-center') {
        marginLeft = '50%';
      }

      lines.forEach((line, lIdx) => {
        allLines.push({
          element: (
            <div key={`p-${bIdx}-${lIdx}`} className="flex relative items-start gap-1" style={{ paddingLeft }}>
               {block.number && align !== 'right-center' && lIdx === 0 && (
                 <span className="w-6 shrink-0 whitespace-nowrap">{block.number}.</span>
               )}
               <div 
                 className={`flex relative w-full overflow-hidden leading-[2] ${block.number && align !== 'right-center' && lIdx > 0 ? 'pl-6' : ''}`} 
                 style={{ 
                   textAlign: (align === 'right-center' ? 'center' : align) as any, justifyContent: (align === 'center' || align === 'right-center') ? 'center' : 'flex-start', 
                   marginLeft 
                 }}
               >
                  <span className="whitespace-pre-wrap shrink-0">
                    {line.map((t, j) => t.bold ? <strong key={j}>{t.text}</strong> : <span key={j}>{t.text}</span>)}
                  </span>
                  {align !== 'center' && align !== 'right-center' && <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
                    &nbsp;{Array(150).fill('-').join('')}
                   </span>}
               </div>
            </div>
          )
        });
      });
    } else if (block.type === 'list') {
      const align: string = 'left';
      const runs = block.runs;
      const indentTabs = block.indentTabs || 0;
      const maxLine = 41.5 - (1.1 + (indentTabs * 2.2));
      const lines = parseTextRuns(runs, maxLine);
      
      const bulletLeft = indentTabs * 0.75;

      lines.forEach((line, lIdx) => {
        allLines.push({
          element: (
            <div key={`l-${bIdx}-${lIdx}`} className="flex relative items-start" style={{ paddingLeft: `${bulletLeft}cm` }}>
              <span className="shrink-0 whitespace-nowrap" style={{ width: '0.75cm' }}>{lIdx === 0 ? block.bullet : ""}</span>
              <div className="flex-1 min-w-0">
                <div className="flex relative w-full overflow-hidden leading-[2]">
                  <span className="whitespace-pre-wrap shrink-0">
                    {line.map((t, j) => t.bold ? <strong key={j}>{t.text}</strong> : <span key={j}>{t.text}</span>)}
                  </span>
                  {align !== 'center' && align !== 'right-center' && <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
                    &nbsp;{Array(150).fill('-').join('')}
                   </span>}
                </div>
              </div>
            </div>
          )
        });
      });
    } else if (block.type === 'divider') {
      allLines.push({
        element: (
          <div key={`d-${bIdx}`} className="py-2">
            <DashedDivider text={block.text} />
          </div>
        )
      });
    }
  });

  // Footer / Notary Name
  allLines.push({
    element: (
      <div key="footer-space" className="h-20"></div>
    )
  });
  allLines.push({
    element: (
      <div key="footer-notary" className="w-1/2 ml-auto text-center font-bold">
        {data.notarisNama.replace(/Sarjana Hukum/gi, 'SH.').replace(/Magister Kenotariatan/gi, 'M.Kn')}
      </div>
    )
  });

  // Chunk lines into pages
  const LINES_PER_PAGE = 44; 
  const pages: React.ReactNode[][] = [];
  for (let i = 0; i < allLines.length; i += LINES_PER_PAGE) {
    pages.push(allLines.slice(i, i + LINES_PER_PAGE).map(l => l.element));
  }

  return (
    <section className="w-full bg-slate-300/50 pt-8 pb-32 px-8 flex flex-col items-center border border-white/30 relative print:bg-white print:p-0 print:border-none print:shadow-none print:rounded-none min-h-max">
      
      {/* Floating Action Buttons */}
      <div className="fixed top-6 right-8 z-50 print:hidden flex gap-3">
        <button 
          onClick={handleDownload}
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 focus:ring-4 focus:ring-blue-300 transition-all font-semibold"
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {isExporting ? 'Mengekspor...' : 'Export ke DOCX'}
        </button>
        <button 
          onClick={handlePrint}
          className="bg-white hover:bg-gray-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 focus:ring-4 focus:ring-slate-100 transition-all font-semibold"
        >
          <Printer size={18} />
          Cetak Dokumen
        </button>
      </div>
      
      {/* MS Word Top Toolbar Mock */}
      <div className="w-[210mm] bg-white/60 backdrop-blur-md border border-white/40 shadow-xl mb-6 p-2 rounded-2xl flex items-center gap-4 text-sm text-slate-700 print:hidden shrink-0 sticky top-0 z-40 select-none">
        <div className="flex bg-white/50 hover:bg-white border border-white/50 shadow-sm transition-colors rounded-xl px-4 py-2 items-center cursor-pointer">
           <span className="font-semibold" style={{fontFamily: "'Century Gothic', 'Tw Cen MT', Arial, sans-serif"}}>Century Gothic</span>
        </div>
        <div className="flex bg-white/50 hover:bg-white border border-white/50 shadow-sm transition-colors rounded-xl px-4 py-2 items-center cursor-pointer">
           <span>10</span>
        </div>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <div className="flex gap-2">
           <span className="bg-blue-100/50 text-blue-700 px-3 py-2 rounded-xl font-medium border border-blue-200" title="Align Left">Align Left</span>
           <span className="bg-blue-100/50 text-blue-700 px-3 py-2 rounded-xl font-medium border border-blue-200" title="Line Spacing">Line Spacing: 1.5</span>
        </div>
      </div>

      <div className="flex flex-col gap-8 print:gap-0">
        {pages.map((pageContent, pIdx) => (
          <div 
            key={pIdx}
            className="bg-white shadow-2xl shrink-0 border border-slate-200 transform origin-top print:shadow-none print:m-0 print:border-none relative"
            style={{
              width: '210mm',
              height: '297mm',
              paddingTop: '2.5cm',
              paddingBottom: '2.5cm',
              paddingLeft: '4cm',
              paddingRight: '2cm',
              boxSizing: 'border-box'
            }}
          >
            {/* Page Number Indicator */}
            <div className="absolute top-4 right-8 text-slate-300 text-xs font-mono select-none print:hidden">
              Page {pIdx + 1}
            </div>

            {/* Margin Line (garis tepi notaris) */}
            <div className="absolute top-0 bottom-0 left-[2cm] w-[1px] bg-red-400 opacity-0 print:opacity-30"></div>
            
            {/* Document Content */}
            <div 
              className="w-full relative z-10 overflow-hidden"
              style={{
                fontFamily: "'Century Gothic', 'Tw Cen MT', 'Arial', sans-serif",
                fontSize: '10pt',
                lineHeight: '2',
                textAlign: 'left'
              }}
            >
              <div className="space-y-0 relative">
                {pageContent}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
