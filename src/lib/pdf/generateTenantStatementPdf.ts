'use client';

export interface GeneratePdfResult {
  base64: string;
  dataUri: string;
}

/**
 * Client-side silent PDF generation utility using html2pdf.js.
 * Captures the rendered tenant statement root element, excludes print-hidden
 * controls/bars, unrolls scrollable containers for full A4 multi-page capture,
 * and returns the base64 encoded PDF payload.
 */
export async function generateTenantStatementPdf(
  elementId: string = 'tenant-statement-print-root'
): Promise<GeneratePdfResult> {
  if (typeof window === 'undefined') {
    throw new Error('generateTenantStatementPdf must be executed in a browser environment');
  }

  const rootElement = document.getElementById(elementId);
  if (!rootElement) {
    throw new Error(`Statement root element #${elementId} not found in DOM`);
  }

  // Clone element so screen presentation and landlord interactions are completely unaffected
  const clone = rootElement.cloneNode(true) as HTMLElement;

  // Remove all print-hidden elements (toolbars, close buttons, upload zones, toasts)
  const hiddenElements = clone.querySelectorAll('.print-hidden-element');
  hiddenElements.forEach((el) => el.remove());

  // Reset viewport bounds, shadows, borders and unroll scrolling containers for full multi-page PDF output
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.width = '800px';
  clone.style.maxWidth = '800px';
  clone.style.backgroundColor = '#ffffff';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  const scrollables = clone.querySelectorAll('.overflow-y-auto, .overflow-hidden, .overflow-x-auto');
  scrollables.forEach((el) => {
    (el as HTMLElement).style.maxHeight = 'none';
    (el as HTMLElement).style.height = 'auto';
    (el as HTMLElement).style.overflow = 'visible';
    (el as HTMLElement).style.flex = 'none';
  });

  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || (html2pdfModule as any);

    const opt = {
      margin: 10,
      filename: 'Statement.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait' as const,
      },
    };

    const worker = html2pdf().set(opt).from(clone);
    const dataUri: string = await worker.outputPdf('datauristring');
    const commaIndex = dataUri.indexOf(',');
    const base64 = commaIndex !== -1 ? dataUri.substring(commaIndex + 1) : dataUri;

    return { base64, dataUri };
  } finally {
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}
