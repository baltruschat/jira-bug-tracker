import { describe, it, expect } from 'vitest';
import {
  addAnnotation,
  removeLastAnnotation,
  resetAnnotations,
  exportAnnotatedScreenshot,
  dataUrlToBlob,
} from '../../../src/services/screenshot';
import type { Screenshot, Annotation } from '../../../src/models/types';

function makeScreenshot(overrides?: Partial<Screenshot>): Screenshot {
  return {
    originalDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    annotatedDataUrl: null,
    width: 1920,
    height: 1080,
    annotations: [],
    ...overrides,
  };
}

function makeAnnotation(overrides?: Partial<Annotation>): Annotation {
  return {
    type: 'highlight',
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    color: '#ffcc00',
    ...overrides,
  };
}

describe('screenshot service', () => {
  describe('addAnnotation', () => {
    it('should add a highlight annotation to the annotations array', () => {
      const screenshot = makeScreenshot();
      const annotation = makeAnnotation({ type: 'highlight' });

      const result = addAnnotation(screenshot, annotation);

      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].type).toBe('highlight');
      expect(result.annotations[0].x).toBe(10);
      expect(result.annotations[0].y).toBe(20);
    });

    it('should add a redact annotation', () => {
      const screenshot = makeScreenshot();
      const annotation = makeAnnotation({ type: 'redact', color: '#000000' });

      const result = addAnnotation(screenshot, annotation);

      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].type).toBe('redact');
    });

    it('should append to existing annotations', () => {
      const screenshot = makeScreenshot({
        annotations: [makeAnnotation()],
      });

      const result = addAnnotation(screenshot, makeAnnotation({ x: 200, y: 300 }));

      expect(result.annotations).toHaveLength(2);
      expect(result.annotations[1].x).toBe(200);
    });

    it('should not mutate the original screenshot', () => {
      const screenshot = makeScreenshot();
      const result = addAnnotation(screenshot, makeAnnotation());

      expect(screenshot.annotations).toHaveLength(0);
      expect(result.annotations).toHaveLength(1);
    });
  });

  describe('removeLastAnnotation', () => {
    it('should remove the last annotation', () => {
      const screenshot = makeScreenshot({
        annotations: [
          makeAnnotation({ x: 10 }),
          makeAnnotation({ x: 20 }),
          makeAnnotation({ x: 30 }),
        ],
      });

      const result = removeLastAnnotation(screenshot);

      expect(result.annotations).toHaveLength(2);
      expect(result.annotations[1].x).toBe(20);
    });

    it('should return empty annotations when removing from single-annotation screenshot', () => {
      const screenshot = makeScreenshot({
        annotations: [makeAnnotation()],
      });

      const result = removeLastAnnotation(screenshot);

      expect(result.annotations).toHaveLength(0);
    });

    it('should handle empty annotations array', () => {
      const screenshot = makeScreenshot();
      const result = removeLastAnnotation(screenshot);

      expect(result.annotations).toHaveLength(0);
    });

    it('should not mutate the original screenshot', () => {
      const screenshot = makeScreenshot({
        annotations: [makeAnnotation(), makeAnnotation()],
      });

      const result = removeLastAnnotation(screenshot);

      expect(screenshot.annotations).toHaveLength(2);
      expect(result.annotations).toHaveLength(1);
    });
  });

  describe('resetAnnotations', () => {
    it('should clear all annotations', () => {
      const screenshot = makeScreenshot({
        annotations: [makeAnnotation(), makeAnnotation(), makeAnnotation()],
        annotatedDataUrl: 'data:image/png;base64,annotated',
      });

      const result = resetAnnotations(screenshot);

      expect(result.annotations).toHaveLength(0);
    });

    it('should clear annotatedDataUrl', () => {
      const screenshot = makeScreenshot({
        annotations: [makeAnnotation()],
        annotatedDataUrl: 'data:image/png;base64,annotated',
      });

      const result = resetAnnotations(screenshot);

      expect(result.annotatedDataUrl).toBeNull();
    });

    it('should preserve original data URL', () => {
      const screenshot = makeScreenshot({
        annotations: [makeAnnotation()],
        annotatedDataUrl: 'data:image/png;base64,annotated',
      });

      const result = resetAnnotations(screenshot);

      expect(result.originalDataUrl).toBe(screenshot.originalDataUrl);
    });
  });

  describe('exportAnnotatedScreenshot', () => {
    it('should return annotatedDataUrl when available', () => {
      const screenshot = makeScreenshot({
        annotatedDataUrl: 'data:image/png;base64,annotated-version',
      });

      expect(exportAnnotatedScreenshot(screenshot)).toBe('data:image/png;base64,annotated-version');
    });

    it('should fall back to originalDataUrl when no annotation', () => {
      const screenshot = makeScreenshot({ annotatedDataUrl: null });

      expect(exportAnnotatedScreenshot(screenshot)).toBe(screenshot.originalDataUrl);
    });
  });

  describe('dataUrlToBlob', () => {
    it('should convert a PNG data URL to a Blob', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const blob = dataUrlToBlob(dataUrl);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });

    it('should convert a JPEG data URL to a Blob', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ';
      const blob = dataUrlToBlob(dataUrl);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/jpeg');
    });

    it('should produce a Blob with correct byte size', () => {
      // 4 base64 chars = 3 bytes
      const dataUrl = 'data:image/png;base64,AAAA';
      const blob = dataUrlToBlob(dataUrl);

      expect(blob.size).toBe(3);
    });
  });
});
