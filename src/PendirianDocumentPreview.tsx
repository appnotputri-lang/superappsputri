import React, { useMemo } from 'react';
import { PendirianData } from './DraftAktaPendirian';
import { generatePendirianBlocks } from './lib/pendirianContentBlocks';
import { parseTextRuns, FormatToken } from './lib/notaryWrapper';
import { Download, Loader2 } from 'lucide-react';

interface PendirianDocumentPreviewProps {
  data: PendirianData;
  onExport: () => void;
  onClose: () => void;
  isExporting: boolean;
}

const WrappedText = ({ runs, isList = false, indent = false, indentTabs = 0, align = 'left' }: { runs: FormatToken[], isList?: boolean, indent?: boolean, indentTabs?: number, align?: 'left'|'center'|'right'|'right-center' }) => {
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
    align = 'center';
  }

  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className={`flex relative w-full overflow-hidden leading-[2]`} style={{ textAlign: align as any, justifyContent: (align === 'center' || marginLeft === '50%') ? 'center' : 'flex-start', paddingLeft, marginLeft }}>
           <span className="whitespace-pre-wrap shrink-0 flex">
             {line.map((t, j) => t.bold ? <strong key={j} style={t.style}>{t.text}</strong> : <span key={j} style={t.style}>{t.text}</span>)}
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

export default function PendirianDocumentPreview({ data, onExport, onClose, isExporting }: PendirianDocumentPreviewProps) {
  const blocks = useMemo(() => generatePendirianBlocks(data), [data]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end">
      <div className="w-[800px] bg-white h-full shadow-2xl flex flex-col animate-slide-in">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center shadow-md z-10 shrink-0">
          <h2 className="font-bold flex items-center gap-2">
            Preview Akta Pendirian
          </h2>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onExport}
              disabled={isExporting} 
              className="bg-[#00a65a] hover:bg-[#008d4c] px-4 py-1.5 rounded text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Word
            </button>
            <button className="bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded text-sm transition" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-[#525659] flex flex-col items-center custom-scrollbar gap-8">
          <div className="bg-white w-[210mm] min-h-[297mm] shadow-xl relative shrink-0" style={{ 
              paddingTop: '2.5cm',
              paddingBottom: '2.5cm',
              paddingLeft: '4cm',
              paddingRight: '2cm',
              boxSizing: 'border-box'
            }}>
            {/* Margin Line (garis tepi notaris) */}
            <div className="absolute top-0 bottom-0 left-[2cm] w-[1px] bg-red-400"></div>
            
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
                {blocks.map((block, index) => {
                  if (block.type === 'br') {
                    return <div key={index} className="h-6 leading-[2] w-full flex items-center overflow-hidden"><span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>{Array(150).fill('-').join('')}</span></div>;
                  }
                  
                  if (block.type === 'divider' || block.type === 'pasal-divider') {
                    return (
                      <div key={index} className="w-full relative py-1">
                         <div className="flex items-center w-full overflow-hidden leading-[2]">
                            <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
                              {Array(150).fill('-').join('')}
                            </span>
                            <span className="px-4 font-bold uppercase shrink-0">
                              {block.text}
                            </span>
                            <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
                              {Array(150).fill('-').join('')}
                            </span>
                         </div>
                      </div>
                    );
                  }

                  let runs: any[] = [];
                  let indentTabs = 0;
                  let align: any = 'left';

                  const mapRunsWithTabs = (sourceRuns: any[]) => {
                    return sourceRuns.map(r => ({
                      ...r,
                      text: r.text.replace(/\t/g, '\u00A0\u00A0')
                    }));
                  };

                  if (block.type === 'p') {
                    runs = mapRunsWithTabs(block.runs);
                    indentTabs = block.indentTabs || 0;
                    align = block.align || 'left';
                  } else if (block.type === 'numbered') {
                    runs = [{ text: `${block.num}. `, bold: false }, ...mapRunsWithTabs(block.runs)];
                  } else if (block.type === 'sub-numbered') {
                    runs = [{ text: `${block.num}) `, bold: false }, ...mapRunsWithTabs(block.runs)];
                    indentTabs = block.indentTabs || 1;
                  } else if (block.type === 'list') {
                    const indentTabs = block.indentTabs || 1;
                    const level = indentTabs <= 0.6 ? 0 : (indentTabs <= 1.1 ? 1 : (indentTabs <= 1.6 ? 2 : 3));
                    const textLeft = level === 0 ? 0.75 : (level === 1 ? 1.0 : (level === 2 ? 1.5 : 2.0));
                    const bLeft = level === 0 ? 0 : textLeft - 0.5;
                    const bWidth = level === 0 ? 0.75 : 0.5;
                    return (
                      <div key={index} className="flex relative items-start" style={{ paddingLeft: `${bLeft}cm` }}>
                        <span className="shrink-0 whitespace-nowrap" style={{ width: `${bWidth}cm` }}>{block.bullet}</span>
                        <div className="flex-1 min-w-0">
                          <WrappedText runs={block.runs} align="left" />
                        </div>
                      </div>
                    );
                  } else if (block.type === 'management-role') {
                    runs = [
                      { text: '-\u00A0\u00A0', bold: false },
                      { text: `${block.position}`, bold: false, style: { display: 'inline-block', width: '2.5cm' } },
                      { text: ': ', bold: false },
                      { text: block.salutation ? `${block.salutation} ` : '', bold: false },
                      { text: block.name, bold: true },
                      { text: ', tersebut di atas;', bold: false }
                    ];
                    indentTabs = 1;
                  } else if (block.type === 'shareholder') {
                    runs = [{ text: `- ${block.name} : ${block.sharesText}`, bold: false }];
                  } else if (block.type === 'saksi') {
                    runs = [{ text: `${block.num}. `, bold: false }, ...mapRunsWithTabs(block.runs)];
                  }

                  return (
                    <div key={index} className="w-full relative text-justify">
                       <WrappedText 
                         runs={runs} 
                         indentTabs={indentTabs} 
                         align={align} 
                       />
                    </div>
                  );
                })}
                
                <div key="footer-space" className="h-20"></div>
                <div key="footer-notary" className="w-1/2 ml-auto text-center font-bold">
                  <div className="font-normal text-sm mb-12">
                    Notaris di {data.notarisTempat || "Kabupaten Bandung Barat"};
                  </div>
                  {data.notarisNamaSurat 
                    ? data.notarisNamaSurat
                        .replace(/Sarjana Hukum/gi, 'SH')
                        .replace(/S\.H\./gi, 'SH')
                        .replace(/Magister Kenotariatan/gi, 'M.Kn')
                        .replace(/M\.KN\./gi, 'M.Kn')
                        .replace(/M\.KN/gi, 'M.Kn')
                    : "NUKANTINI PUTRI PARINCHA, SH., M.Kn"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
