import React from 'react';
import { CompanyData } from '../types';
import { generateRupstBlocks } from './lib/rupsTahunanContentBlocks';
import { generateSirkulerLaporanBlocks } from './lib/sirkulerLaporanContentBlocks';

interface RUPSTDocumentPreviewProps {
  data: CompanyData;
  zoom?: number;
}

const DashedDivider = ({ text, className = "" }: { text: string, className?: string }) => (
  <div className={`flex w-full items-center overflow-hidden my-4 ${className}`}>
    <div className="flex-1 overflow-hidden select-none font-normal whitespace-nowrap flex justify-end opacity-40">
      <span>{Array(200).fill('-').join('')}</span>
    </div>
    <div className="px-2 font-bold whitespace-nowrap tracking-wider text-xs uppercase text-slate-500">{text}</div>
    <div className="flex-1 overflow-hidden select-none font-normal whitespace-nowrap flex justify-start opacity-40">
      <span>{Array(200).fill('-').join('')}</span>
    </div>
  </div>
);

const renderToken = (t: any, j: number) => {
  const style: React.CSSProperties = {
    fontStyle: t.italic ? 'italic' : 'normal',
    textDecoration: t.underline ? 'underline' : 'none',
    color: t.color ? (t.color.startsWith('#') ? t.color : `#${t.color}`) : 'inherit',
    fontSize: t.size ? `${t.size}pt` : 'inherit',
    backgroundColor: t.highlight === 'yellow' ? '#ffff00' : (t.highlight || 'transparent'),
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

export const RUPSTDocumentPreview: React.FC<RUPSTDocumentPreviewProps> = ({ data, zoom = 1 }) => {
  const isCircular = data.rupstType === 'sirkuler';
  const blocks = isCircular ? generateSirkulerLaporanBlocks(data) : generateRupstBlocks(data);

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-slate-200/50 py-12 px-4 shadow-inner">
      <div 
        className="preview-container bg-white shadow-[0_0_50px_rgba(0,0,0,0.15)] relative print:shadow-none paper-font transition-transform duration-200"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '25.4mm', 
          fontFamily: 'Arial, sans-serif',
          fontSize: '11pt',
          lineHeight: '1.6', 
          color: '#1a1a1a',
          boxSizing: 'border-box',
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          marginBottom: '4rem'
        }}
      >
        {/* Document Header */}
        <div className="text-center font-bold uppercase mb-8 leading-relaxed">
          {isCircular ? 'KEPUTUSAN PARA PEMEGANG SAHAM SEBAGAI PENGGANTI' : 'NOTULEN'}<br />
          RAPAT UMUM PEMEGANG SAHAM TAHUNAN<br />
          <span className="underline">PT {(data.companyName || '').toUpperCase()}</span>
        </div>

        {/* Content Blocks */}
        <div className="space-y-4">
          {blocks.map((block, bIdx) => {
            if (block.type === 'p') {
              const align = block.align || 'left';
              let style: React.CSSProperties = {
                textAlign: align === 'center' ? 'center' : 'justify',
              };

              if (block.indentLeft) {
                // convert standard dxa points to cm for padding
                style.paddingLeft = `${(block.indentLeft / 1440) * 2.54}cm`;
              }

              return (
                <div key={`p-${bIdx}`} className="leading-[1.6]" style={style}>
                  {block.runs.map((t: any, j: number) => renderToken(t, j))}
                </div>
              );
            }

            if (block.type === 'list') {
              const indentLeft = block.indentLeft || 0;
              const indentHanging = block.indentHanging || 0;
              
              const totalPadding = (indentLeft / 1440) * 2.54;
              const hangingOffset = (indentHanging / 1440) * 2.54;
              
              const containerPaddingLeft = `${totalPadding - hangingOffset}cm`;
              const bulletWidth = `${hangingOffset}cm`;

              return (
                <div key={`l-${bIdx}`} className="flex items-start" style={{ paddingLeft: containerPaddingLeft }}>
                  <span className="shrink-0 text-center" style={{ width: bulletWidth }}>{block.bullet}</span>
                  <div className="flex-1 text-justify" style={{ textAlign: 'justify' }}>
                    {block.runs.map((t: any, j: number) => renderToken(t, j))}
                  </div>
                </div>
              );
            }

            if (block.type === 'numbered') {
              const indentLeft = block.indentLeft || 0;
              const indentHanging = block.indentHanging || 0;
              
              // In DOCX numbering, the number is at left - hanging
              const totalPadding = (indentLeft / 1440) * 2.54;
              const hangingOffset = (indentHanging / 1440) * 2.54;
              
              const containerPaddingLeft = `${totalPadding - hangingOffset}cm`;
              const numberWidth = `${hangingOffset}cm`;

              return (
                <div key={`n-${bIdx}`} className="flex items-start" style={{ paddingLeft: containerPaddingLeft }}>
                  <span className="shrink-0 font-bold" style={{ width: numberWidth }}>{block.num}</span>
                  <div className="flex-1 text-justify" style={{ textAlign: 'justify' }}>
                    {block.runs.map((t: any, j: number) => renderToken(t, j))}
                  </div>
                </div>
              );
            }

            if (block.type === 'signatures') {
              const shs = block.shareholders || [];
              return (
                <div key={`sigs-${bIdx}`} className="grid grid-cols-2 gap-y-12 gap-x-8 mt-12 w-full text-center">
                  {shs.map((sh: any, idx: number) => (
                    <div key={sh.id || idx} className="flex flex-col items-center">
                      <div className="h-20" />
                      <span className="font-bold border-b border-black uppercase pb-1 tracking-wide text-xs">
                        {sh.name}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase mt-1">Pemegang Saham</span>
                    </div>
                  ))}
                </div>
              );
            }

            if (block.type === 'participantSigs') {
              const participants = block.participants || [];
              return (
                <div key={`part-sigs-${bIdx}`} className="space-y-4 my-8">
                  {participants.map((sh: any, idx: number) => (
                    <div key={idx} className="flex w-full items-start" style={{ lineHeight: '1.6' }}>
                      <div style={{ width: '65%' }}>
                        {idx + 1}. {sh.isProxy && sh.proxyData && sh.proxyData.name ? `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}` : sh.name.toUpperCase()}
                      </div>
                      <div className="text-slate-400 font-mono tracking-wider" style={{ width: '35%' }}>
                        ........................................................
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            if (block.type === 'divider') {
              return (
                <div key={`d-${bIdx}`} className="py-2">
                  <DashedDivider text={block.text} />
                </div>
              );
            }

            if (block.type === 'pageBreak') {
              return (
                <div key={`pb-${bIdx}`} className="my-8 select-none border-t border-dashed border-slate-300 relative print:break-before-page">
                  <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-slate-100 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded text-slate-400">
                    Batas Halaman (Page Break)
                  </span>
                </div>
              );
            }

            if (block.type === 'br') {
              return <div key={`br-${bIdx}`} className="h-6" />;
            }

            if (block.type === 'table') {
              const headers = block.headers || [];
              const rows = block.rows || [];
              return (
                <div key={`table-${bIdx}`} className="my-8 w-full overflow-x-auto">
                  <table className="min-w-[600px] w-full border-collapse border border-black text-[10pt]">
                    <thead>
                      <tr>
                        {headers.map((h: string, i: number) => (
                          <th key={i} className="border border-black p-2 font-bold text-center bg-slate-50 uppercase text-[11px] tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row: string[], rIdx: number) => (
                        <tr key={rIdx}>
                          {row.map((cell: string, cIdx: number) => (
                            <td 
                              key={cIdx} 
                              className="border border-black p-3 text-center align-middle"
                              style={{ 
                                textAlign: cIdx === 1 ? 'left' : 'center',
                                minHeight: '1.5cm',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {cIdx === 3 ? (
                                <div className="h-16 flex items-center justify-center">
                                  {cell}
                                </div>
                              ) : (
                                cell
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
};
