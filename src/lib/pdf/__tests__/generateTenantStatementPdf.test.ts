import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTenantStatementPdf } from '../generateTenantStatementPdf';

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
    expect(mockClone.style.width).toBe('800px');
    expect(mockClone.style.maxWidth).toBe('800px');
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
});
