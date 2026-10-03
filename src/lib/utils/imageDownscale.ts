/**
 * Client-Side Image Downscaling & HEIC Validation Utility
 *
 * Prevents mobile memory crashes from 48MP+ smartphone photos by running
 * an HTML5 Canvas downscaling pass (max 1600x1200 at 0.8 JPEG quality)
 * prior to PDF embedding.
 */

export interface DownscaleDimensions {
  width: number;
  height: number;
  scaled: boolean;
}

export interface DownscaleResult {
  dataUrl: string;
  uint8Array: Uint8Array;
  blob?: Blob;
  originalSizeBytes: number;
  downscaledSizeBytes: number;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
}

/**
 * Calculates target dimensions preserving aspect ratio within bounding box.
 */
export function calculateDownscaleDimensions(
  width: number,
  height: number,
  maxWidth = 1600,
  maxHeight = 1200
): DownscaleDimensions {
  if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`);
  }

  // Handle portrait vs landscape orientation bounding box:
  // If the image is portrait (height > width), orient bounding box vertically (1200x1600)
  const isPortrait = height > width;
  const boundWidth = isPortrait ? Math.min(maxWidth, maxHeight) : Math.max(maxWidth, maxHeight);
  const boundHeight = isPortrait ? Math.max(maxWidth, maxHeight) : Math.min(maxWidth, maxHeight);

  if (width <= boundWidth && height <= boundHeight) {
    return {
      width: Math.round(width),
      height: Math.round(height),
      scaled: false,
    };
  }

  const ratio = Math.min(boundWidth / width, boundHeight / height);
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));

  return {
    width: targetWidth,
    height: targetHeight,
    scaled: true,
  };
}

/**
 * Checks if a file or filename indicates raw Apple HEIC/HEIF format.
 */
export function isHeicFile(file: { name?: string; type?: string }): boolean {
  const name = file.name ? file.name.toLowerCase() : '';
  const type = file.type ? file.type.toLowerCase() : '';

  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    type.includes('heic') ||
    type.includes('heif')
  );
}

/**
 * Converts a base64 string or data URL to Uint8Array.
 * Universal helper compatible with both browser (atob) and Node.js environments.
 */
export function base64ToUint8Array(base64OrDataUrl: string): Uint8Array {
  const rawBase64 = base64OrDataUrl.includes(',')
    ? base64OrDataUrl.split(',')[1]
    : base64OrDataUrl;
  const base64 = rawBase64.replace(/\s+/g, '');

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Performs client-side image downscaling via HTML5 Canvas.
 * Emits optimized JPEG suitable for direct pdf-lib embedding.
 */
export async function downscaleImage(
  fileOrBlob: File | Blob,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.8
): Promise<DownscaleResult> {
  // 1. Guard against un-transcoded HEIC photos
  if (isHeicFile(fileOrBlob)) {
    throw new Error(
      'HEIC format detected. Client-side canvas cannot decode raw HEIC directly. ' +
        'Please select a JPEG or PNG photo, or ensure your iPhone camera is set to "Most Compatible".'
    );
  }

  const originalSizeBytes = fileOrBlob.size;

  // 2. Guard for non-browser / SSR environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('downscaleImage must be executed in a browser environment with Canvas support.');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        const { width: targetWidth, height: targetHeight } = calculateDownscaleDimensions(
          naturalWidth,
          naturalHeight,
          maxWidth,
          maxHeight
        );

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to acquire 2D canvas context for image downscaling.');
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Export as JPEG with specified quality
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const uint8Array = base64ToUint8Array(dataUrl);

        // Cleanup resources
        URL.revokeObjectURL(objectUrl);
        canvas.width = 0;
        canvas.height = 0;

        resolve({
          dataUrl,
          uint8Array,
          originalSizeBytes,
          downscaledSizeBytes: uint8Array.byteLength,
          width: targetWidth,
          height: targetHeight,
          mimeType: 'image/jpeg',
        });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for downscaling. The file may be corrupt or in an unsupported format.'));
    };

    img.src = objectUrl;
  });
}
