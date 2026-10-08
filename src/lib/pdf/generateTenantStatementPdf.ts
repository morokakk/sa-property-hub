'use client';

export interface GeneratePdfResult {
  base64: string;
  dataUri: string;
}

/**
 * Checks whether a CSS value contains any modern CSS Color 4 function.
 */
export const isModernColor = (val: unknown): val is string =>
  typeof val === 'string' &&
  (val.includes('oklch(') ||
   val.includes('oklab(') ||
   val.includes('lab(') ||
   val.includes('lch(') ||
   val.includes('color(') ||
   val.includes('color-mix('));

/**
 * Converts modern CSS Color 4 formats (oklch, oklab, lab, lch) to standard sRGB rgb(...)/rgba(...)
 * using W3C Color 4 formulas. Provides full mathematical fallback when running
 * in environments without native Canvas Color 4 serialization.
 */
export function fallbackConvertModernColor(val: string): string {
  // 1. oklch(L C H [/ alpha])
  const oklchMatch = val.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([-\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)%?)?/i);
  if (oklchMatch) {
    let L = parseFloat(oklchMatch[1]);
    if (val.includes('%') && L > 1) L /= 100;
    const C = parseFloat(oklchMatch[2]);
    const H = (parseFloat(oklchMatch[3]) * Math.PI) / 180;
    const a = C * Math.cos(H);
    const b = C * Math.sin(H);
    let alpha = 1;
    if (oklchMatch[4] !== undefined) {
      alpha = parseFloat(oklchMatch[4]);
      if (oklchMatch[0].includes('%') && oklchMatch[0].lastIndexOf('%') > oklchMatch[0].indexOf('/')) {
        alpha /= 100;
      }
    }

    const l_ = Math.max(0, L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m_ = Math.max(0, L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s_ = Math.max(0, L - 0.0894841775 * a - 1.291485548 * b) ** 3;

    const rLinear = +4.0767434092 * l_ - 3.3077115913 * m_ + 0.2309699291 * s_;
    const gLinear = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const bLinear = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

    const toGamma = (c: number) =>
      Math.min(255, Math.max(0, Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055))));

    return alpha < 1
      ? `rgba(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)}, ${alpha})`
      : `rgb(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)})`;
  }

  // 2. oklab(L a b [/ alpha])
  const oklabMatch = val.match(/oklab\(\s*([\d.]+)%?\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+)%?)?/i);
  if (oklabMatch) {
    let L = parseFloat(oklabMatch[1]);
    if (val.includes('%') && L > 1) L /= 100;
    const a = parseFloat(oklabMatch[2]);
    const b = parseFloat(oklabMatch[3]);
    let alpha = 1;
    if (oklabMatch[4] !== undefined) {
      alpha = parseFloat(oklabMatch[4]);
      if (oklabMatch[0].includes('%') && oklabMatch[0].lastIndexOf('%') > oklabMatch[0].indexOf('/')) {
        alpha /= 100;
      }
    }

    const l_ = Math.max(0, L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m_ = Math.max(0, L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s_ = Math.max(0, L - 0.0894841775 * a - 1.291485548 * b) ** 3;

    const rLinear = +4.0767434092 * l_ - 3.3077115913 * m_ + 0.2309699291 * s_;
    const gLinear = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const bLinear = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

    const toGamma = (c: number) =>
      Math.min(255, Math.max(0, Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055))));

    return alpha < 1
      ? `rgba(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)}, ${alpha})`
      : `rgb(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)})`;
  }

  // 3. lch(L C H [/ alpha])
  const lchMatch = val.match(/lch\(\s*([\d.]+)%?\s+([\d.]+)\s+([-\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)%?)?/i);
  if (lchMatch) {
    let L = parseFloat(lchMatch[1]);
    const C = parseFloat(lchMatch[2]);
    const H = (parseFloat(lchMatch[3]) * Math.PI) / 180;
    const a = C * Math.cos(H);
    const b = C * Math.sin(H);
    let alpha = 1;
    if (lchMatch[4] !== undefined) {
      alpha = parseFloat(lchMatch[4]);
      if (lchMatch[0].includes('%') && lchMatch[0].lastIndexOf('%') > lchMatch[0].indexOf('/')) {
        alpha /= 100;
      }
    }

    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;
    const delta = 6 / 29;
    const xn = 0.95047, yn = 1.0, zn = 1.08883;

    const x = (fx > delta ? fx ** 3 : (fx - 16 / 116) * 3 * delta ** 2) * xn;
    const y = (fy > delta ? fy ** 3 : (fy - 16 / 116) * 3 * delta ** 2) * yn;
    const z = (fz > delta ? fz ** 3 : (fz - 16 / 116) * 3 * delta ** 2) * zn;

    const rLinear = 3.2406 * x - 1.5372 * y - 0.4986 * z;
    const gLinear = -0.9689 * x + 1.8758 * y + 0.0415 * z;
    const bLinear = 0.0557 * x - 0.204 * y + 1.057 * z;
    const toGamma = (c: number) =>
      Math.min(255, Math.max(0, Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055))));

    return alpha < 1
      ? `rgba(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)}, ${alpha})`
      : `rgb(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)})`;
  }

  // 4. lab(L a b [/ alpha])
  const labMatch = val.match(/lab\(\s*([\d.]+)%?\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+)%?)?/i);
  if (labMatch) {
    let L = parseFloat(labMatch[1]);
    const a = parseFloat(labMatch[2]);
    const b = parseFloat(labMatch[3]);
    let alpha = 1;
    if (labMatch[4] !== undefined) {
      alpha = parseFloat(labMatch[4]);
      if (labMatch[0].includes('%') && labMatch[0].lastIndexOf('%') > labMatch[0].indexOf('/')) {
        alpha /= 100;
      }
    }

    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;
    const delta = 6 / 29;

    const xn = 0.95047;
    const yn = 1.0;
    const zn = 1.08883;

    const x = (fx > delta ? fx ** 3 : (fx - 16 / 116) * 3 * delta ** 2) * xn;
    const y = (fy > delta ? fy ** 3 : (fy - 16 / 116) * 3 * delta ** 2) * yn;
    const z = (fz > delta ? fz ** 3 : (fz - 16 / 116) * 3 * delta ** 2) * zn;

    const rLinear = 3.2406 * x - 1.5372 * y - 0.4986 * z;
    const gLinear = -0.9689 * x + 1.8758 * y + 0.0415 * z;
    const bLinear = 0.0557 * x - 0.204 * y + 1.057 * z;

    const toGamma = (c: number) =>
      Math.min(255, Math.max(0, Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055))));

    return alpha < 1
      ? `rgba(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)}, ${alpha})`
      : `rgb(${toGamma(rLinear)}, ${toGamma(gLinear)}, ${toGamma(bLinear)})`;
  }

  return 'rgb(30, 41, 59)';
}

/**
 * Replaces all modern CSS Color 4 functions in a CSS string with their converted sRGB representations,
 * correctly handling balanced parentheses in complex expressions (e.g., box-shadow, gradients, color-mix).
 */
export function replaceModernColorsInString(str: string, convertFn: (color: string) => string): string {
  if (!str || typeof str !== 'string' || !isModernColor(str)) return str;

  const keywords = ['color-mix', 'oklch', 'oklab', 'lab', 'lch', 'color'];
  let result = '';
  let i = 0;

  while (i < str.length) {
    let matchedKeyword: string | null = null;
    for (const kw of keywords) {
      if (
        str.startsWith(kw + '(', i) &&
        (i === 0 || /[\s,(:/]/.test(str[i - 1]))
      ) {
        matchedKeyword = kw;
        break;
      }
    }

    if (matchedKeyword) {
      let depth = 0;
      let j = i + matchedKeyword.length;
      let foundEnd = false;
      while (j < str.length) {
        if (str[j] === '(') depth++;
        else if (str[j] === ')') {
          depth--;
          if (depth === 0) {
            foundEnd = true;
            j++;
            break;
          }
        }
        j++;
      }

      if (foundEnd) {
        const colorExpression = str.slice(i, j);
        const converted = convertFn(colorExpression);
        result += converted;
        i = j;
        continue;
      }
    }

    result += str[i];
    i++;
  }

  return result;
}

/**
 * Sanitizes modern CSS color functions (lab, oklch, oklab, lch, color-mix, color) in an element and its subtree.
 * Converts modern color representations to standard sRGB (#hex / rgb / rgba) via an offscreen
 * canvas 2D context with automatic mathematical fallback.
 */
export function sanitizeModernColorFunctions(root: HTMLElement): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement('canvas');
    if (canvas && typeof canvas.getContext === 'function') {
      ctx = canvas.getContext('2d');
    }
  } catch {
    // Canvas context not available
  }

  const colorProperties = [
    'color',
    'backgroundColor',
    'background',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'boxShadow',
    'textShadow',
    'textDecorationColor',
    'accentColor',
    'caretColor',
    'fill',
    'stroke',
  ] as const;

  const convertColor = (val: string): string => {
    if (!isModernColor(val)) return val;
    if (ctx) {
      try {
        ctx.fillStyle = '#000000';
        ctx.fillStyle = val;
        if (ctx.fillStyle && !isModernColor(ctx.fillStyle)) {
          return ctx.fillStyle;
        }
      } catch {
        // Fall through to mathematical conversion
      }
    }
    return fallbackConvertModernColor(val);
  };

  const sanitizeElement = (el: HTMLElement) => {
    if (!el || !el.style) return;

    for (const prop of colorProperties) {
      const val = (el.style as any)[prop];
      if (isModernColor(val)) {
        (el.style as any)[prop] = replaceModernColorsInString(val, convertColor);
      }
    }

    const view = el.ownerDocument?.defaultView || window;
    if (view && typeof view.getComputedStyle === 'function') {
      try {
        const computed = view.getComputedStyle(el);
        if (computed) {
          for (const prop of colorProperties) {
            const computedVal = (computed as any)[prop];
            if (isModernColor(computedVal)) {
              (el.style as any)[prop] = replaceModernColorsInString(computedVal, convertColor);
            }
          }
        }
      } catch {
        // Ignore cross-origin or detached frame errors
      }
    }
  };

  sanitizeElement(root);
  if (typeof root.querySelectorAll === 'function') {
    try {
      const children = root.querySelectorAll('*');
      if (children && children.length) {
        children.forEach((child) => sanitizeElement(child as HTMLElement));
      }
    } catch {
      // Ignore query errors
    }
  }
}

/**
 * Direct client-side PDF renderer using html2canvas-pro and jsPDF.
 * Used as a robust standalone engine or fallback if html2pdf encounters legacy errors.
 */
export async function renderWithHtml2CanvasPro(clone: HTMLElement): Promise<GeneratePdfResult> {
  const [{ default: html2canvasPro }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '718px'; // 190mm at standard 96dpi (A4 printable width with 10mm margins)
  container.style.background = '#ffffff';
  container.style.zIndex = '-99999';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.appendChild(clone);
  document.body.appendChild(container);

  // Sanitize colors on clone after attaching to DOM so computed styles from classes are fully available
  sanitizeModernColorFunctions(clone);

  try {
    const canvas = await (html2canvasPro as any)(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (_clonedDoc: Document, element: HTMLElement) => {
        sanitizeModernColorFunctions(element);
      },
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // A4 printable area: 210mm x 297mm with 10mm margins = 190mm x 277mm
    const pdfInnerWidth = 190;
    const pdfInnerHeight = 277;
    const pageRatio = pdfInnerHeight / pdfInnerWidth;
    const pxPageHeight = Math.floor(canvas.width * pageRatio);
    const nPages = Math.max(1, Math.ceil(canvas.height / pxPageHeight));

    for (let page = 0; page < nPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const sY = page * pxPageHeight;
      const sHeight = Math.min(pxPageHeight, canvas.height - sY);

      if (sHeight > 0) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sHeight;
        const pageCtx = pageCanvas.getContext('2d');
        if (pageCtx) {
          pageCtx.fillStyle = '#ffffff';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0, sY, canvas.width, sHeight,
            0, 0, canvas.width, sHeight
          );
        }

        const mmPageHeight = (sHeight / canvas.width) * pdfInnerWidth;
        const imgData =
          typeof pageCanvas.toDataURL === 'function'
            ? pageCanvas.toDataURL('image/jpeg', 0.98)
            : '';
        if (imgData) {
          pdf.addImage(imgData, 'JPEG', 10, 10, pdfInnerWidth, mmPageHeight);
        }
      }
    }

    const dataUri = pdf.output('datauristring');
    const commaIndex = dataUri.indexOf(',');
    const base64 = commaIndex !== -1 ? dataUri.substring(commaIndex + 1) : dataUri;

    return { base64, dataUri };
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Client-side silent PDF generation utility.
 * Captures the rendered tenant statement root element, excludes print-hidden
 * controls/bars, unrolls scrollable containers for full A4 multi-page capture,
 * sizes to 100% of printable A4 width (190mm) so content never cuts off on the right,
 * sanitizes modern Tailwind v4 color models (lab/oklch), leverages html2canvas-pro
 * for native CSS Color 4 support, and returns the base64 encoded PDF payload.
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

  // Reset viewport bounds, shadows, borders and unroll scrolling containers for full multi-page PDF output.
  // Width is set to 100% to conform exactly to the A4 printable inner width (190mm / ~718px)
  // without clipping or right-edge overflow.
  clone.style.maxHeight = 'none';
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.boxSizing = 'border-box';
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

  // Sanitize any modern CSS color models on clone for compatibility
  sanitizeModernColorFunctions(clone);

  try {
    // Ensure html2canvas-pro is registered globally for html2pdf if needed
    if (typeof window !== 'undefined' && !(window as any).html2canvas) {
      try {
        const h2cPro = await import('html2canvas-pro');
        const resolved = h2cPro.default || h2cPro;
        (window as any).html2canvas = resolved;
        (globalThis as any).html2canvas = resolved;
      } catch {
        // Bundler alias in next.config.mjs will still handle require('html2canvas')
      }
    }

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
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1024,
        onclone: (_clonedDoc: Document, element: HTMLElement) => {
          sanitizeModernColorFunctions(element);
        },
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
  } catch (primaryErr) {
    // Defensive cleanup of any orphaned overlays html2pdf may have created before erroring
    if (typeof document !== 'undefined') {
      try {
        const overlays = document.querySelectorAll('.html2pdf__overlay');
        overlays.forEach((el) => el.remove());
      } catch {}
    }

    // If html2pdf encounters an issue (such as an un-aliased legacy color parser error),
    // fall back directly to html2canvas-pro + jsPDF rendering engine.
    try {
      return await renderWithHtml2CanvasPro(clone);
    } catch (fallbackErr) {
      throw primaryErr || fallbackErr;
    }
  } finally {
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
    if (typeof document !== 'undefined') {
      try {
        const overlays = document.querySelectorAll('.html2pdf__overlay');
        overlays.forEach((el) => el.remove());
      } catch {}
    }
  }
}
