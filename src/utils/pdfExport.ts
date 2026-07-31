export interface ExportPDFOptions {
  filename: string;
  margin?: number[];
  orientation?: 'portrait' | 'landscape';
  returnBlob?: boolean;
}

function oklchToGrayscale(match: string, inner: string): string {
  const parts = inner.trim().split(/\s+/);
  const l = parseFloat(parts[0]);
  if (isNaN(l)) return '#000000';
  // oklch lightness is 0 to 1
  const gray = Math.round(l * 255);
  
  // check for alpha
  const alphaIndex = inner.indexOf('/');
  if (alphaIndex !== -1) {
      const alphaStr = inner.substring(alphaIndex + 1).trim();
      const alpha = parseFloat(alphaStr);
      if (!isNaN(alpha)) {
          return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
      }
  }
  return `rgb(${gray}, ${gray}, ${gray})`;
}

async function sanitizeGlobalStylesheets() {
  const originalStates: any[] = [];
  const styleElements: HTMLStyleElement[] = [];

  // 1. Process inline <style> tags (Vite dev mode)
  document.querySelectorAll('style').forEach(style => {
    if (style.innerHTML.includes('oklch')) {
      originalStates.push({ type: 'style', el: style, content: style.innerHTML });
      style.innerHTML = style.innerHTML.replace(/oklch\(([^)]+)\)/gi, oklchToGrayscale);
    }
  });

  // 2. Process <link rel="stylesheet"> (Vite production mode)
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const link of Array.from(links)) {
    try {
      const href = (link as HTMLLinkElement).href;
      if (href && href.startsWith(window.location.origin)) {
        const response = await fetch(href);
        const cssText = await response.text();
        if (cssText.includes('oklch')) {
          // Disable original link so html2canvas ignores it
          originalStates.push({ type: 'link', el: link, disabled: (link as HTMLLinkElement).disabled });
          (link as HTMLLinkElement).disabled = true;

          // Create replacement <style> tag
          const newCss = cssText.replace(/oklch\(([^)]+)\)/gi, oklchToGrayscale);
          const newStyle = document.createElement('style');
          newStyle.innerHTML = newCss;
          document.head.appendChild(newStyle);
          styleElements.push(newStyle);
        }
      }
    } catch (e) {
      console.warn('Could not fetch stylesheet for sanitization', e);
    }
  }

  return { originalStates, styleElements };
}

function restoreGlobalStylesheets(state: { originalStates: any[], styleElements: HTMLStyleElement[] }) {
  state.originalStates.forEach(item => {
    if (item.type === 'style') {
      item.el.innerHTML = item.content;
    } else if (item.type === 'link') {
      item.el.disabled = item.disabled;
    }
  });
  state.styleElements.forEach(el => el.remove());
}

export async function exportToPDF(
  source: HTMLElement | string,
  options: ExportPDFOptions
): Promise<Blob | void> {
  const orientation = options.orientation || 'portrait';

  const opt = {
    margin: options.margin !== undefined ? options.margin : [10, 10, 10, 10],
    filename: options.filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: orientation },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  let targetElement: HTMLElement;
  let container: HTMLDivElement | null = null;

  if (typeof source === 'string') {
    container = document.createElement('div');
    container.innerHTML = source;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0px';
    document.body.appendChild(container);
    targetElement = container;
  } else {
    targetElement = source;
  }

  // Very fast CSS text replace to prevent html2canvas crashing on oklch()
  const stylesheetState = await sanitizeGlobalStylesheets();

  try {
    if (typeof (window as any).html2pdf !== 'undefined') {
      const worker = (window as any).html2pdf().set(opt).from(targetElement);
      if (options.returnBlob) {
        return await worker.toPdf().output('blob');
      } else {
        await worker.save();
      }
    } else {
      console.warn('html2pdf library not loaded, falling back to window.print()');
      window.print();
    }
  } finally {
    restoreGlobalStylesheets(stylesheetState);
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export async function downloadElementAsPdf(element: HTMLElement | null, filename: string) {
  if (!element) return;
  await exportToPDF(element, {
    filename,
    margin: [0, 0, 0, 0], // parity dengan behavior lama (margin: 0)
  });
}

export async function shareElementAsPdf(element: HTMLElement | null, filename: string, shareTitle: string) {
  if (!element) return;
  const blob = await exportToPDF(element, {
    filename,
    margin: [0, 0, 0, 0], // parity dengan behavior lama
    returnBlob: true,
  }) as Blob;

  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle, text: shareTitle });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        throw e;
      }
    }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    alert('File PDF telah diunduh (Browser tidak mendukung fitur Share).');
  }
}
