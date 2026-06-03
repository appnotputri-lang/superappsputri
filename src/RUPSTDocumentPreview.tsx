import React from 'react';
import { CompanyData } from '../types';
import { parseTextRuns } from './lib/notaryWrapper';
import { generateRupstBlocks } from './lib/rupsTahunanContentBlocks';

interface RUPSTDocumentPreviewProps {
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

const renderToken = (t: any, j: number) => {
  const style: React.CSSProperties = {
    fontStyle: t.italic ? 'italic' : 'normal',
    textDecoration: t.underline ? 'underline' : 'none',
    color: t.color ? (t.color.startsWith('#') ? t.color : `#${t.color}`) : 'inherit',
    fontSize: t.size ? `${t.size}pt` : 'inherit',
  };

  if (t.text.includes('\t')) {
    const parts = t.text.split('\t');
    return (
      <span key={j} className="inline-flex w-full" style={style}>
        <span className="shrink-0" style={{ width: '3.5cm' }}>
          {t.bold ? <strong>{parts[0]}</strong> : <span>{parts[0]}</span>}
        </span>
        <span className="flex-1">
          {t.bold ? <strong>{parts.slice(1).join('\t')}</strong> : <span>{parts.slice(1).join('\t')}</span>}
        </span>
      </span>
    );
  }

  return (
    <span key={j} style={style}>
      {t.bold ? <strong>{t.text}</strong> : <span>{t.text}</span>}
    </span>
  );
};

export const RUPSTDocumentPreview: React.FC<RUPSTDocumentPreviewProps> = ({ data }) => {
  const blocks = generateRupstBlocks(data);
  
  const allLines: { element: React.ReactNode }[] = [];
  
  blocks.forEach((block, bIdx) => {
    if (block.type === 'p') {
      const runs = block.runs;
      const align = block.align || 'left';
      
      const maxLine = align === 'center' ? 44 : 41.5; 
      const lines = parseTextRuns(runs, maxLine);

      lines.forEach((line, lIdx) => {
        allLines.push({
          element: (
            <div key={`p-${bIdx}-${lIdx}`} className="flex relative items-start gap-1">
              <div 
                className={`flex relative w-full overflow-hidden leading-[1.8]`} 
                style={{ 
                  textAlign: align === 'center' ? 'center' : 'justify',
                  width: '100%'
                }}
              >
                 <span className={`whitespace-pre-wrap ${align === 'center' ? 'shrink-0' : 'w-full'}`}>
                   {line.map((t, j) => renderToken(t, j))}
                   {align !== 'center' && lIdx < lines.length - 1 && <span className="inline-block w-full" />}
                 </span>
              </div>
            </div>
          )
        });
      });
    } else if (block.type === 'list') {
      const runs = block.runs;
      const indentTabs = block.indentTabs || 0;
      const maxLine = 38 - (indentTabs * 2.2);
      const lines = parseTextRuns(runs, maxLine);
      
      const bulletLeft = indentTabs * 1; 

      lines.forEach((line, lIdx) => {
        allLines.push({
          element: (
            <div key={`l-${bIdx}-${lIdx}`} className="flex relative items-start" style={{ paddingLeft: `${bulletLeft}cm` }}>
              <span className="shrink-0 whitespace-nowrap" style={{ width: '1cm' }}>{lIdx === 0 ? block.bullet : ""}</span>
              <div className="flex-1 min-w-0">
                <div className="flex relative w-full overflow-hidden leading-[1.8]" style={{ textAlign: 'justify' }}>
                  <span className="whitespace-pre-wrap w-full">
                    {line.map((t, j) => renderToken(t, j))}
                    {lIdx < lines.length - 1 && <span className="inline-block w-full" />}
                  </span>
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
    } else if (block.type === 'br') {
      allLines.push({ element: <div key={`br-${bIdx}`} className="h-6"></div> });
    }
  });

  const LINES_PER_PAGE = 46; 
  const pages: React.ReactNode[][] = [];
  for (let i = 0; i < allLines.length; i += LINES_PER_PAGE) {
    pages.push(allLines.slice(i, i + LINES_PER_PAGE).map(l => l.element));
  }

  return (
    <div className="flex flex-col gap-8 print:gap-0 items-center py-8 bg-slate-300/30 min-h-max w-full">
      {pages.map((pageContent, pIdx) => (
        <div 
          key={pIdx}
          className="bg-white shadow-2xl shrink-0 border border-slate-200 transform origin-top print:shadow-none print:m-0 print:border-none relative"
          style={{
            width: '210mm',
            height: '297mm',
            paddingTop: '2.5cm',
            paddingBottom: '2.5cm',
            paddingLeft: '3.5cm',
            paddingRight: '1.5cm',
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
              lineHeight: '1.8',
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
