import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateTenantStatementPdf,
  sanitizeModernColorFunctions,
  renderWithHtml2CanvasPro,
  fallbackConvertModernColor,
  replaceModernColorsInString,
  isModernColor,
} from '../generateTenantStatementPdf';

// Mock html2pdf.js
const mockOutputPdf = vi.fn().mockResolvedValue('data:application/pdf;base64,JVBERi0xLjQKSm9iRG9uZQ==');
const mockFrom = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnValue({
  from: mockFrom,
  outputPdf: mockOutputPdf,
});

vi.mock('html2pdf.js', () => {
  return {
    default: () => ({
      set: mockSet,
      from: mockFrom,
      outputPdf: mockOutputPdf,
    }),
  };
});

// Mock html2canvas-pro
const mockHtml2CanvasPro = vi.fn().mockImplementation(async () => {
  return {
    width: 1600,
    height: 2400,
    getContext: vi.fn().mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }),
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockImageData'),
  };
});

vi.mock('html2canvas-pro', () => {
  return {
    default: (...args: any[]) => mockHtml2CanvasPro(...args),
  };
});

// Mock jsPDF
const mockPdfOutput = vi.fn().mockReturnValue('data:application/pdf;base64,FALLBACK_PDF_BASE64');
const mockPdfAddPage = vi.fn();
const mockPdfAddImage = vi.fn();

class MockJsPDF {
  addPage = mockPdfAddPage;
  addImage = mockPdfAddImage;
  output = mockPdfOutput;
}

vi.mock('jspdf', () => {
  return {
    jsPDF: MockJsPDF,
  };
});

describe('generateTenantStatementPdf Client-Side PDF Renderer', () => {
  const originalWindow = (global as any).window;
  const originalDocument = (global as any).document;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    (global as any).document = originalDocument;
  });

  it('throws an error if executed in a non-browser environment', async () => {
    delete (global as any).window;

    await expect(generateTenantStatementPdf('tenant-statement-print-root')).rejects.toThrow(
      'generateTenantStatementPdf must be executed in a browser environment'
    );
  });

  it('throws an error if target element is not found in document', async () => {
    (global as any).window = {};
    (global as any).document = {
      getElementById: vi.fn().mockReturnValue(null),
    };

    await expect(generateTenantStatementPdf('missing-element')).rejects.toThrow(
      'Statement root element #missing-element not found in DOM'
    );
  });

  it('correctly clones element, strips .print-hidden-element nodes, unrolls overflow and passes clone to html2pdf', async () => {
    (global as any).window = {};

    // Create a mock DOM node structure
    const hiddenToolbar = {
      className: 'print-hidden-element',
      remove: vi.fn(),
    };
    const hiddenToast = {
      className: 'print-hidden-element',
      remove: vi.fn(),
    };
    const scrollContainer = {
      style: { maxHeight: '400px', height: '400px', overflow: 'auto', flex: '' },
    };

    const mockClone = {
      style: {
        maxHeight: '92vh',
        height: '92vh',
        overflow: 'hidden',
        boxShadow: '0 4px 6px',
        border: '1px solid black',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '100%',
        backgroundColor: '#f0f0f0',
        position: '',
        left: '',
        top: '',
        zIndex: '',
      },
      querySelectorAll: vi.fn().mockImplementation((selector: string) => {
        if (selector === '.print-hidden-element') {
          return [hiddenToolbar, hiddenToast];
        }
        if (selector === '.overflow-y-auto, .overflow-hidden, .overflow-x-auto') {
          return [scrollContainer];
        }
        return [];
      }),
      parentNode: null as any,
    };

    const mockRoot = {
      cloneNode: vi.fn().mockReturnValue(mockClone),
    };

    const mockBody = {
      appendChild: vi.fn((node: any) => {
        node.parentNode = mockBody;
      }),
      removeChild: vi.fn((node: any) => {
        node.parentNode = null;
      }),
    };

    (global as any).document = {
      getElementById: vi.fn().mockImplementation((id: string) => {
        return id === 'tenant-statement-print-root' ? mockRoot : null;
      }),
      body: mockBody,
    };

    const result = await generateTenantStatementPdf('tenant-statement-print-root');

    expect(result.dataUri).toBe('data:application/pdf;base64,JVBERi0xLjQKSm9iRG9uZQ==');
    expect(result.base64).toBe('JVBERi0xLjQKSm9iRG9uZQ==');

    // Cloned node had .print-hidden-element elements removed
    expect(hiddenToolbar.remove).toHaveBeenCalledTimes(1);
    expect(hiddenToast.remove).toHaveBeenCalledTimes(1);

    // Cloned node had bounds reset for A4 print and normal in-flow layout (no -9999px clipping)
    expect(mockClone.style.maxHeight).toBe('none');
    expect(mockClone.style.overflow).toBe('visible');
    expect(mockClone.style.width).toBe('100%');
    expect(mockClone.style.maxWidth).toBe('100%');
    expect(mockClone.style.backgroundColor).toBe('#ffffff');
    expect(mockClone.style.position).toBe('relative');
    expect(mockClone.style.left).toBe('0');
    expect(mockClone.style.top).toBe('0');

    // Child scroll containers unrolled with flex: none
    expect(scrollContainer.style.maxHeight).toBe('none');
    expect(scrollContainer.style.overflow).toBe('visible');
    expect(scrollContainer.style.flex).toBe('none');

    // Cloned node passed to html2pdf
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        margin: 10,
        filename: 'Statement.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        jsPDF: expect.objectContaining({ format: 'a4', orientation: 'portrait' }),
      })
    );
    expect(mockFrom).toHaveBeenCalledWith(mockClone);
    expect(mockOutputPdf).toHaveBeenCalledWith('datauristring');
  });

  describe('Tailwind v4 lab() & oklch() color compatibility and fallback handling', () => {
    it('sanitizes modern lab() and oklch() CSS colors to sRGB format on elements and children', () => {
      const mockCtx = {
        fillStyle: '',
      };
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(mockCtx),
      };

      (global as any).document = {
        createElement: vi.fn().mockImplementation((tag: string) => {
          if (tag === 'canvas') return mockCanvas;
          return { style: {} };
        }),
      };
      (global as any).window = {};

      const childElement = {
        style: {
          color: 'lab(54.29% 34.22 41.31)',
          backgroundColor: '#ffffff',
          borderColor: 'oklch(0.65 0.24 25.3)',
        },
      };

      const parentElement = {
        style: {
          color: 'oklch(0.208 0.042 265.755)',
          backgroundColor: 'rgb(255, 255, 255)',
        },
        querySelectorAll: vi.fn().mockReturnValue([childElement]),
      } as any;

      sanitizeModernColorFunctions(parentElement);

      // Verify lab and oklch styles were converted
      expect(parentElement.style.color).not.toContain('oklch');
      expect(childElement.style.color).not.toContain('lab');
      expect(childElement.style.borderColor).not.toContain('oklch');
      // Verify standard colors were untouched
      expect(parentElement.style.backgroundColor).toBe('rgb(255, 255, 255)');
      expect(childElement.style.backgroundColor).toBe('#ffffff');
    });

    it('falls back to renderWithHtml2CanvasPro when html2pdf throws an unsupported color error', async () => {
      (global as any).window = {};

      const mockBody = {
        appendChild: vi.fn((node: any) => {
          node.parentNode = mockBody;
        }),
        removeChild: vi.fn((node: any) => {
          node.parentNode = null;
        }),
      };

      (global as any).document = {
        getElementById: vi.fn().mockImplementation((id: string) => {
          if (id === 'tenant-statement-print-root') {
            return {
              cloneNode: vi.fn().mockReturnValue({
                style: {
                  width: '100%',
                  maxWidth: '100%',
                  backgroundColor: '#ffffff',
                },
                querySelectorAll: vi.fn().mockReturnValue([]),
                parentNode: null,
              }),
            };
          }
          return null;
        }),
        createElement: vi.fn().mockImplementation((tag: string) => ({
          style: {},
          appendChild: vi.fn(),
          parentNode: null,
          getContext: vi.fn().mockReturnValue({
            fillStyle: '',
            fillRect: vi.fn(),
            drawImage: vi.fn(),
          }),
          toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockImageData'),
        })),
        body: mockBody,
      };

      // Force html2pdf to throw the exact error reported by user
      mockOutputPdf.mockRejectedValueOnce(
        new Error('Attempting to parse an unsupported color function "lab"')
      );

      const result = await generateTenantStatementPdf('tenant-statement-print-root');

      // The fallback renderer html2canvas-pro + jsPDF should catch and resolve successfully
      expect(result.dataUri).toBe('data:application/pdf;base64,FALLBACK_PDF_BASE64');
      expect(result.base64).toBe('FALLBACK_PDF_BASE64');
      expect(mockHtml2CanvasPro).toHaveBeenCalled();
    });

    it('renderWithHtml2CanvasPro directly creates multi-page A4 PDF cleanly', async () => {
      (global as any).window = {};
      const mockBody = {
        appendChild: vi.fn((node: any) => {
          node.parentNode = mockBody;
        }),
        removeChild: vi.fn((node: any) => {
          node.parentNode = null;
        }),
      };
      (global as any).document = {
        createElement: vi.fn().mockImplementation((tag: string) => ({
          style: {},
          appendChild: vi.fn(),
          parentNode: null,
          getContext: vi.fn().mockReturnValue({
            fillStyle: '',
            fillRect: vi.fn(),
            drawImage: vi.fn(),
          }),
          toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,pageImage'),
        })),
        body: mockBody,
      };

      const clone = {
        style: {},
        parentNode: null,
      } as any;

      const result = await renderWithHtml2CanvasPro(clone);

      expect(result.dataUri).toBe('data:application/pdf;base64,FALLBACK_PDF_BASE64');
      expect(result.base64).toBe('FALLBACK_PDF_BASE64');
      expect(mockHtml2CanvasPro).toHaveBeenCalledWith(
        clone,
        expect.objectContaining({
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        })
      );
      expect(mockPdfAddImage).toHaveBeenCalled();
    });

    it('fallbackConvertModernColor accurately converts all CSS Color 4 models (oklch, oklab, lab, lch) including alpha', () => {
      // oklch without alpha
      const oklchRes = fallbackConvertModernColor('oklch(0.65 0.24 25.3)');
      expect(oklchRes).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);

      // oklch with alpha
      const oklchAlpha = fallbackConvertModernColor('oklch(0.65 0.24 25.3 / 0.5)');
      expect(oklchAlpha).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.5\)$/);

      // oklab
      const oklabRes = fallbackConvertModernColor('oklab(0.59 -0.1 0.1)');
      expect(oklabRes).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);

      // lch
      const lchRes = fallbackConvertModernColor('lch(54.29% 53.65 50.36)');
      expect(lchRes).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);

      // lab with alpha
      const labAlpha = fallbackConvertModernColor('lab(54.29% 34.22 41.31 / 0.75)');
      expect(labAlpha).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*0\.75\)$/);
    });

    it('replaceModernColorsInString correctly converts complex CSS expressions with box-shadows and gradients', () => {
      const mockConvert = (color: string) => `rgb(10, 20, 30)`;

      // Box shadow with oklch
      const shadow = '0 4px 6px -1px oklch(0.2 0.05 260 / 0.1), 0 2px 4px -2px oklch(0.2 0.05 260 / 0.06)';
      const sanitizedShadow = replaceModernColorsInString(shadow, mockConvert);
      expect(sanitizedShadow).toBe('0 4px 6px -1px rgb(10, 20, 30), 0 2px 4px -2px rgb(10, 20, 30)');

      // Linear gradient with multiple modern color stops
      const gradient = 'linear-gradient(to right, oklch(0.6 0.2 250), lab(54.29% 34.22 41.31))';
      const sanitizedGradient = replaceModernColorsInString(gradient, mockConvert);
      expect(sanitizedGradient).toBe('linear-gradient(to right, rgb(10, 20, 30), rgb(10, 20, 30))');

      // Nested color-mix expression
      const colorMix = 'color-mix(in srgb, oklch(0.6 0.2 250) 50%, white)';
      const sanitizedMix = replaceModernColorsInString(colorMix, mockConvert);
      expect(sanitizedMix).toBe('rgb(10, 20, 30)');
    });

    it('sanitizeModernColorFunctions sanitizes box-shadow, SVG fill, stroke, and background properties', () => {
      (global as any).document = {
        createElement: vi.fn().mockImplementation(() => ({
          getContext: vi.fn().mockReturnValue(null),
        })),
      };
      (global as any).window = {};

      const svgIcon = {
        style: {
          fill: 'oklch(0.6 0.2 140)',
          stroke: 'lab(50% 20 -30)',
        },
      };

      const card = {
        style: {
          boxShadow: '0 10px 15px -3px oklch(0.15 0.02 240 / 0.1)',
          background: 'linear-gradient(135deg, oklch(0.9 0.05 160), lab(70% 10 20))',
        },
        querySelectorAll: vi.fn().mockReturnValue([svgIcon]),
      } as any;

      sanitizeModernColorFunctions(card);

      expect(card.style.boxShadow).not.toContain('oklch');
      expect(card.style.background).not.toContain('oklch');
      expect(card.style.background).not.toContain('lab');
      expect(svgIcon.style.fill).not.toContain('oklch');
      expect(svgIcon.style.stroke).not.toContain('lab');
    });

    it('cleans up orphaned .html2pdf__overlay elements if html2pdf errors during generation', async () => {
      (global as any).window = {};

      const mockOverlay = {
        remove: vi.fn(),
      };

      const mockBody = {
        appendChild: vi.fn((node: any) => {
          node.parentNode = mockBody;
        }),
        removeChild: vi.fn((node: any) => {
          node.parentNode = null;
        }),
      };

      (global as any).document = {
        getElementById: vi.fn().mockReturnValue({
          cloneNode: vi.fn().mockReturnValue({
            style: { width: '100%', maxWidth: '100%', backgroundColor: '#ffffff' },
            querySelectorAll: vi.fn().mockReturnValue([]),
            parentNode: null,
          }),
        }),
        querySelectorAll: vi.fn().mockImplementation((sel: string) => {
          if (sel === '.html2pdf__overlay') return [mockOverlay];
          return [];
        }),
        createElement: vi.fn().mockImplementation(() => ({
          style: {},
          appendChild: vi.fn(),
          parentNode: null,
          getContext: vi.fn().mockReturnValue({
            fillStyle: '',
            fillRect: vi.fn(),
            drawImage: vi.fn(),
          }),
          toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,pageImage'),
        })),
        body: mockBody,
      };

      mockOutputPdf.mockRejectedValueOnce(new Error('html2pdf crash simulation'));

      const result = await generateTenantStatementPdf('tenant-statement-print-root');

      expect(result.base64).toBe('FALLBACK_PDF_BASE64');
      // Verify orphaned overlay was removed
      expect(mockOverlay.remove).toHaveBeenCalled();
    });
  });
});
