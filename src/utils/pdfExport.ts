import { exportToPDF } from './pdfExportHelper';

export async function downloadElementAsPdf(element: HTMLElement | null, filename: string) {
  if (!element) return;
  await exportToPDF(element, {
    filename,
    margin: [0, 0, 0, 0],
    action: 'save'
  });
}

export async function shareElementAsPdf(element: HTMLElement | null, filename: string, shareTitle: string) {
  if (!element) return;
  await exportToPDF(element, {
    filename,
    margin: [0, 0, 0, 0],
    action: 'share',
    shareTitle
  });
}
