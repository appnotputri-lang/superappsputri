/**
 * Utility for converting oklch color function strings to standard rgb/rgba
 * using browser Canvas 2D API or pure math fallback.
 */

function parseOklchToRgbMath(oklchStr: string): string {
  try {
    const cleanStr = oklchStr.trim().replace(/^oklch\(/i, '').replace(/\)$/, '').trim();
    const [colorPart, alphaPart] = cleanStr.split('/');
    
    const parts = colorPart.trim().split(/\s+/);
    if (parts.length < 3) return 'rgb(128, 128, 128)';

    let L = parseFloat(parts[0]);
    if (parts[0].endsWith('%')) L /= 100;

    let C = parseFloat(parts[1]);
    if (parts[1].endsWith('%')) C = (parseFloat(parts[1]) / 100) * 0.4;

    let H = parseFloat(parts[2]);
    if (isNaN(H)) H = 0;

    let alpha = 1;
    if (alphaPart) {
      const aStr = alphaPart.trim();
      if (aStr.endsWith('%')) {
        alpha = parseFloat(aStr) / 100;
      } else {
        alpha = parseFloat(aStr);
      }
    }
    if (isNaN(alpha)) alpha = 1;

    // Convert OKLCH to OKLAB
    const hRad = (H * Math.PI) / 180;
    const aLab = C * Math.cos(hRad);
    const bLab = C * Math.sin(hRad);

    // Convert OKLAB to Linear RGB
    const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab;
    const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab;
    const s_ = L - 0.0894841775 * aLab - 1.2914855480 * bLab;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    // Convert Linear RGB to sRGB
    const toSrgb = (c: number) => {
      const abs = Math.max(0, c);
      return abs <= 0.0031308
        ? 12.92 * abs
        : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055;
    };

    const r = Math.min(255, Math.max(0, Math.round(toSrgb(rLin) * 255)));
    const g = Math.min(255, Math.max(0, Math.round(toSrgb(gLin) * 255)));
    const b = Math.min(255, Math.max(0, Math.round(toSrgb(bLin) * 255)));

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  } catch (e) {
    return 'rgb(128, 128, 128)';
  }
}

export function oklchToRgb(colorStr: string): string {
  if (!colorStr || typeof colorStr !== 'string' || !colorStr.toLowerCase().includes('oklch')) {
    return colorStr;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgb(1, 2, 3)';
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (!(r === 1 && g === 2 && b === 3)) {
        if (a < 255) {
          return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
        }
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
  } catch (e) {
    // Fall through to math fallback
  }

  return parseOklchToRgbMath(colorStr);
}

export function convertOklchStringToRgb(fullCssText: string): string {
  if (!fullCssText || typeof fullCssText !== 'string' || !fullCssText.toLowerCase().includes('oklch')) {
    return fullCssText;
  }

  return fullCssText.replace(/oklch\([^;\}]+\)/gi, (match) => {
    const lastParen = match.lastIndexOf(')');
    if (lastParen !== -1) {
      const oklchExpr = match.substring(0, lastParen + 1);
      const rest = match.substring(lastParen + 1);
      return oklchToRgb(oklchExpr) + rest;
    }
    return oklchToRgb(match);
  });
}

/**
 * Sanitizes all oklch colors in a target document before html2canvas rendering.
 */
export function sanitizeOklchInDoc(doc: Document): void {
  try {
    // Convert text in style tags
    const styleTags = Array.from(doc.querySelectorAll('style'));
    styleTags.forEach((styleTag) => {
      if (styleTag.textContent && styleTag.textContent.toLowerCase().includes('oklch')) {
        styleTag.textContent = convertOklchStringToRgb(styleTag.textContent);
      }
    });

    // Convert inline styles and computed styles
    const colorProps = [
      'color',
      'backgroundColor',
      'borderColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'fill',
      'stroke'
    ];

    const allElements = Array.from(doc.querySelectorAll('*'));
    allElements.forEach((node) => {
      const el = node as HTMLElement;
      if (!el.style) return;

      if (el.style.cssText && el.style.cssText.toLowerCase().includes('oklch')) {
        el.style.cssText = convertOklchStringToRgb(el.style.cssText);
      }

      const computed = doc.defaultView?.getComputedStyle(el);
      if (computed) {
        colorProps.forEach((prop) => {
          const cssPropName = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          const val = computed.getPropertyValue(cssPropName);
          if (val && val.toLowerCase().includes('oklch')) {
            const rgbVal = convertOklchStringToRgb(val);
            el.style.setProperty(cssPropName, rgbVal, 'important');
          }
        });
      }
    });
  } catch (err) {
    console.warn('Error sanitizing oklch colors:', err);
  }
}

/**
 * Patches window.getComputedStyle so that ANY property value containing oklch()
 * is transparently converted to rgb/rgba before html2canvas ever sees it.
 * This closes the gap left by sanitizeOklchInDoc's fixed property whitelist -
 * html2canvas (bundled inside html2pdf.js) reads dozens of properties
 * (boxShadow, textShadow, textDecorationColor, accentColor, caretColor, etc.)
 * and any one of them resolving to oklch() will still throw
 * "Attempting to parse an unsupported color function 'oklch'".
 * Returns a restore function that must be called in a finally block.
 */
function patchGetComputedStyleForPdf(win: Window): () => void {
  const original = win.getComputedStyle;

  const patched = ((elt: Element, pseudoElt?: string | null) => {
    const style = original.call(win, elt, pseudoElt as string | undefined);
    if (!style) return style;

    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return (propName: string) => {
            const raw = target.getPropertyValue(propName);
            return raw && typeof raw === 'string' && raw.toLowerCase().includes('oklch')
              ? convertOklchStringToRgb(raw)
              : raw;
          };
        }

        let value: any;
        try {
          value = Reflect.get(target, prop, target);
        } catch {
          value = (target as any)[prop];
        }

        if (typeof value === 'function') {
          return value.bind(target);
        }

        if (typeof value === 'string' && value.toLowerCase().includes('oklch')) {
          return convertOklchStringToRgb(value);
        }

        return value;
      }
    });
  }) as typeof win.getComputedStyle;

  win.getComputedStyle = patched;
  return () => {
    win.getComputedStyle = original;
  };
}

export interface ExportPDFOptions {
  filename: string;
  margin?: number[];
  orientation?: 'portrait' | 'landscape';
  action?: 'save' | 'share';
  shareTitle?: string;
}

/**
 * Export HTML string or DOM element to PDF using html2pdf in an isolated iframe.
 * Using an isolated iframe prevents html2canvas from scanning parent document Tailwind CSS stylesheets containing oklch colors.
 */
export async function exportToPDF(
  source: HTMLElement | string,
  options: ExportPDFOptions
): Promise<void> {
  const orientation = options.orientation || 'portrait';
  const isLandscape = orientation === 'landscape';

  // Standard A4 dimensions in pixels at 96 DPI:
  // Portrait: 794px width x 1123px height
  // Landscape: 1123px width x 794px height
  const iframeWidthPx = isLandscape ? 1123 : 794;
  const iframeHeightPx = isLandscape ? 794 : 1123;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  // IMPORTANT: keep the iframe positioned OFF-SCREEN (not opacity:0 / visibility:hidden).
  // Chromium and other browsers throttle layout/paint for iframes considered
  // "invisible" (opacity 0, visibility hidden, or display none). Off-screen
  // positioning keeps the iframe "visible" from the browser's rendering
  // perspective so its content actually gets laid out and painted before
  // html2canvas reads it - opacity:0 caused html2canvas to capture a blank page.
  iframe.style.top = '0px';
  iframe.style.left = '-99999px';
  iframe.style.width = `${iframeWidthPx}px`;
  iframe.style.height = `${iframeHeightPx}px`;
  iframe.style.border = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframe.contentDocument || iframeWin?.document;
    if (!iframeDoc || !iframeWin) {
      throw new Error('Cannot access iframe document context');
    }

    const defaultStyles = `
      <style>
        *, *:before, *:after {
          box-sizing: border-box !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          font-family: Arial, Helvetica, sans-serif !important;
          overflow: visible !important;
        }
        table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        td, th {
          word-wrap: break-word !important;
          word-break: break-word !important;
        }
      </style>
    `;

    if (typeof source === 'string') {
      const cleanHtml = convertOklchStringToRgb(source);
      iframeDoc.open();
      iframeDoc.write(cleanHtml);
      iframeDoc.close();

      const styleEl = iframeDoc.createElement('style');
      styleEl.textContent = defaultStyles.replace(/<\/?style>/g, '');
      iframeDoc.head?.appendChild(styleEl);
    } else {
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>${defaultStyles}</head><body></body></html>`);
      iframeDoc.close();

      const cloned = source.cloneNode(true) as HTMLElement;
      iframeDoc.body.appendChild(cloned);
    }

    // Sanitize any remaining oklch inside the iframe document
    sanitizeOklchInDoc(iframeDoc);

    const targetElement = iframeDoc.body;

    const opt = {
      margin: options.margin !== undefined ? options.margin : [10, 10, 10, 10],
      filename: options.filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        window: iframeWin,
        onclone: (clonedDoc: Document) => {
          sanitizeOklchInDoc(clonedDoc);
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
    };

    if (typeof (window as any).html2pdf !== 'undefined') {
      const restoreIframe = patchGetComputedStyleForPdf(iframeWin);
      const restoreMain = patchGetComputedStyleForPdf(window);
      try {
        const worker = (window as any).html2pdf().set(opt).from(targetElement);
        if (options.action === 'share') {
          const blob = await worker.toPdf().output('blob');
          const file = new File([blob], options.filename, { type: 'application/pdf' });
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: options.shareTitle || options.filename,
                text: options.shareTitle || options.filename
              });
            } catch (e: any) {
              if (e.name !== 'AbortError') {
                throw e;
              }
            }
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = options.filename;
            a.click();
            URL.revokeObjectURL(url);
            alert('File PDF telah diunduh (Browser tidak mendukung fitur Share).');
          }
        } else {
          await worker.save();
        }
      } finally {
        restoreIframe();
        restoreMain();
      }
    } else {
      console.warn('html2pdf library not loaded, falling back to print dialog');
      iframeWin.focus();
      iframeWin.print();
    }
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}