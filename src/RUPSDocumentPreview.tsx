import React from 'react';
import { CompanyData } from '../types';
import { parseTextRuns, FormatToken } from './lib/notaryWrapper';
import { generateRupsBlocks } from './lib/rupsContentBlocks';

interface RUPSDocumentPreviewProps {
  data: CompanyData;
}

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

export const RUPSDocumentPreview: React.FC<RUPSDocumentPreviewProps> = ({ data }) => {
  const blocks = generateRupsBlocks(data);
  
  // Collect all lines
  const allLines: { element: React.ReactNode }[] = [];
  
  blocks.forEach((block, bIdx) => {
    if (block.type === 'p') {
      const runs = block.runs;
      const indent = block.indent;
      const indentTabs = block.indentTabs || 0;
      const align = block.align || 'left';
      
      let indentReduction = 0;
      if (indent) indentReduction += 2.2;
      if (indentTabs) indentReduction += indentTabs * 4.4;
      if (align === 'right-center') indentReduction += 21;
      
      const maxLine = 41.5 - indentReduction; 
      const lines = parseTextRuns(runs, maxLine);

      let paddingLeft = '0';
      let marginLeft = '0';
      if (indent) paddingLeft = '0.5cm'; // left=284 DXA ≈ 0.5cm
      if (indentTabs) paddingLeft = `${indentTabs * 1.5}cm`;
      if (align === 'right-center') {
        marginLeft = '50%';
      }

      lines.forEach((line, lIdx) => {
        allLines.push({
          element: (
            <div key={`p-${bIdx}-${lIdx}`} className="flex relative items-start gap-1" style={{ paddingLeft }}>
              {block.number && align !== 'center' && lIdx === 0 && (
                <span className="w-6 shrink-0 whitespace-nowrap">{block.number}.</span>
              )}
              <div 
                className={`flex relative w-full overflow-hidden leading-[2] ${block.number && align !== 'center' && lIdx > 0 ? 'pl-6' : ''}`} 
                style={{ 
                  textAlign: (align === 'right-center' ? 'center' : align) as any, 
                  marginLeft, 
                  justifyContent: align === 'center' ? 'center' : 'flex-start' 
                }}
              >
                 <span className="whitespace-pre-wrap shrink-0">
                   {line.map((t, j) => t.bold ? <strong key={j}>{t.text}</strong> : <span key={j}>{t.text}</span>)}
                 </span>
                  {align !== 'center' && (
                    <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
                      &nbsp;{Array(200).fill('-').join('')}
                    </span>
                  )}
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
      
      // textStart is (indentTabs * 0.75) + 0.75 cm
      // bullet is at indentTabs * 0.75 cm
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
                    &nbsp;{Array(200).fill('-').join('')}
                  </span>}
                </div>
              </div>
            </div>
          )
        });
      });
    } else if (block.type === 'shareholder-list') {
      const align: string = 'left';
      const combinedText = `${block.sharesText} ${block.rpText}`;
      const tokens: FormatToken[] = [{ text: combinedText }];
      const lines = parseTextRuns(tokens, 28);
      
      lines.forEach((line, lIdx) => {
        allLines.push({
          element: (
             <div key={`shl-${bIdx}-${lIdx}`} className="flex relative items-start gap-1">
               <span className="w-[0.75cm] shrink-0 whitespace-nowrap ml-[0.75cm]">{lIdx === 0 ? block.bullet : ""}</span>
               <span className="w-[3.43cm] shrink-0 whitespace-nowrap">{lIdx === 0 ? block.name : ""}</span>
               <div className="flex-1 min-w-0">
                 <div className="flex relative w-full overflow-hidden leading-[2]">
                   <span className="whitespace-pre-wrap shrink-0">
                     {line.map((t, j) => t.bold ? <strong key={j}>{t.text}</strong> : <span key={j}>{t.text}</span>)}
                   </span>
                   {align !== 'center' && align !== 'right-center' && <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
                     &nbsp;{Array(200).fill('-').join('')}
                   </span>}
                 </div>
               </div>
             </div>
          )
        });
      });
    } else if (block.type === 'management-list') {
      const align: string = 'left';
      const tokens: FormatToken[] = [{ text: `: ${block.name};` }];
      const lines = parseTextRuns(tokens, 28);
      
      lines.forEach((line, lIdx) => {
        allLines.push({
          element: (
             <div key={`ml-${bIdx}-${lIdx}`} className="flex relative items-start gap-1">
               <span className="w-[5cm] shrink-0 whitespace-nowrap">{lIdx === 0 ? block.position : ""}</span>
               <div className="flex-1 min-w-0">
                 <div className="flex relative w-full overflow-hidden leading-[2]">
                   <span className="whitespace-pre-wrap shrink-0">
                     {line.map((t, j) => t.bold ? <strong key={j}>{t.text}</strong> : <span key={j}>{t.text}</span>)}
                   </span>
                   {align !== 'center' && align !== 'right-center' && <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style={{ letterSpacing: '0.5px' }}>
                     &nbsp;{Array(200).fill('-').join('')}
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
        NUKANTINI PUTRI PARINCHA, SH., M.Kn
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
    <div className="flex flex-col gap-8 print:gap-0 items-center py-8 bg-slate-300/30 min-h-max w-full">
      <div className="sticky top-0 bg-white/80 backdrop-blur z-10 w-full max-w-[210mm] p-2 mb-4 border border-slate-200 rounded-lg flex justify-center gap-4 text-xs font-mono print:hidden">
         <span>FONT: CENTURY GOTHIC</span>
         <span>SIZE: 10PT</span>
         <span>LINE-HEIGHT: 1.5</span>
      </div>
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
          <div className="absolute top-4 right-8 text-slate-300 text-xs font-mono select-none print:hidden">
            Page {pIdx + 1}
          </div>
          
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
  );
};