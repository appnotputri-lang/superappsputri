/**
 * Utility to reliably trigger print in web applications,
 * especially when embedded inside iframes where window.print() might be restricted.
 */
export function printHtmlString(htmlContent: string, documentTitle: string = 'Laporan Notaris') {
  if (!htmlContent) return;

  // Use a hidden iframe in the current document to avoid popup blocking
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeWin = iframe.contentWindow;
    const iframeDoc = iframe.contentDocument || iframeWin?.document;

    if (!iframeDoc || !iframeWin) {
      throw new Error('Cannot access iframe document context');
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    iframeDoc.title = documentTitle;

    setTimeout(() => {
      try {
        iframeWin.focus();
        iframeWin.print();
      } catch (e) {
        console.error('Iframe print error:', e);
        // Fallback to direct window.print
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  } catch (err) {
    console.error('Failed to prepare iframe print:', err);
    // Fallback: popup window
    const printWindow = window.open('', '_blank', 'width=1000,height=900,top=100,left=100');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.document.title = documentTitle;
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    } else {
      window.print();
    }
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

export function printElement(element: HTMLElement | null, documentTitle: string = 'Laporan Notaris') {
  if (!element) {
    try {
      window.print();
    } catch (e) {
      console.error('Direct window.print failed:', e);
    }
    return;
  }

  // Gather all CSS styles from parent document
  const stylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((style) => style.outerHTML)
    .join('\n');

  const content = element.innerHTML;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${documentTitle}</title>
        ${stylesheets}
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0 !important;
            padding: 20px !important;
          }
          .print\\:hidden, .no-print {
            display: none !important;
          }
          @media print {
            body {
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="printable-paper">
          ${content}
        </div>
      </body>
    </html>
  `;

  printHtmlString(fullHtml, documentTitle);
}

