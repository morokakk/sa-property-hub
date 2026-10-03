import { describe, it, expect } from 'vitest';
import {
  calculateDownscaleDimensions,
  isHeicFile,
  base64ToUint8Array,
} from '../imageDownscale';

describe('imageDownscale Utility', () => {
  describe('calculateDownscaleDimensions', () => {
    it('downscales 48MP landscape photo (8000x6000) to max 1600x1200 maintaining 4:3 aspect ratio', () => {
      const result = calculateDownscaleDimensions(8000, 6000, 1600, 1200);
      expect(result.scaled).toBe(true);
      expect(result.width).toBe(1600);
      expect(result.height).toBe(1200);
      expect(result.width / result.height).toBeCloseTo(8000 / 6000, 2);
    });

    it('downscales portrait photo (3024x4032 iPhone standard) to max 1200x1600 bounding box', () => {
      const result = calculateDownscaleDimensions(3024, 4032, 1600, 1200);
      expect(result.scaled).toBe(true);
      expect(result.width).toBeLessThanOrEqual(1200);
      expect(result.height).toBeLessThanOrEqual(1600);
      expect(result.width / result.height).toBeCloseTo(3024 / 4032, 2);
    });

    it('preserves dimensions without scaling if already within bounds (1280x720)', () => {
      const result = calculateDownscaleDimensions(1280, 720, 1600, 1200);
      expect(result.scaled).toBe(false);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    it('handles square photos (3000x3000) maintaining 1:1 aspect ratio', () => {
      const result = calculateDownscaleDimensions(3000, 3000, 1600, 1200);
      expect(result.scaled).toBe(true);
      expect(result.width).toBe(result.height);
      expect(result.width).toBeLessThanOrEqual(1200);
    });

    it('throws error for invalid dimensions (zero, negative, or NaN)', () => {
      expect(() => calculateDownscaleDimensions(0, 500)).toThrow('Invalid image dimensions');
      expect(() => calculateDownscaleDimensions(-100, 500)).toThrow('Invalid image dimensions');
      expect(() => calculateDownscaleDimensions(NaN, 500)).toThrow('Invalid image dimensions');
    });
  });

  describe('isHeicFile', () => {
    it('detects .heic and .heif extensions regardless of case', () => {
      expect(isHeicFile({ name: 'IMG_4821.HEIC' })).toBe(true);
      expect(isHeicFile({ name: 'photo.heic' })).toBe(true);
      expect(isHeicFile({ name: 'photo.heif' })).toBe(true);
      expect(isHeicFile({ name: 'photo.HEIF' })).toBe(true);
      expect(isHeicFile({ type: 'image/heic' })).toBe(true);
      expect(isHeicFile({ type: 'image/heif' })).toBe(true);
      expect(isHeicFile({ type: 'image/heic-sequence' })).toBe(true);
      expect(isHeicFile({ type: 'image/heif-sequence' })).toBe(true);
    });

    it('returns false for standard web formats (JPEG, PNG, WebP)', () => {
      expect(isHeicFile({ name: 'meter.jpg', type: 'image/jpeg' })).toBe(false);
      expect(isHeicFile({ name: 'meter.jpeg', type: 'image/jpeg' })).toBe(false);
      expect(isHeicFile({ name: 'meter.png', type: 'image/png' })).toBe(false);
      expect(isHeicFile({ name: 'meter.webp', type: 'image/webp' })).toBe(false);
    });
  });

  describe('base64ToUint8Array', () => {
    it('correctly decodes raw base64 and data URLs into byte arrays', () => {
      // "Hello World" in base64 is "SGVsbG8gV29ybGQ="
      const raw = 'SGVsbG8gV29ybGQ=';
      const dataUrl = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ=';

      const bytes1 = base64ToUint8Array(raw);
      const bytes2 = base64ToUint8Array(dataUrl);

      expect(bytes1).toEqual(bytes2);
      expect(Buffer.from(bytes1).toString('utf-8')).toBe('Hello World');
    });

    it('correctly handles base64 with interior newlines or whitespace', () => {
      const formatted = '  SGVsbG8g\n  V29ybGQ=  \n';
      const bytes = base64ToUint8Array(formatted);
      expect(Buffer.from(bytes).toString('utf-8')).toBe('Hello World');
    });
  });
});
