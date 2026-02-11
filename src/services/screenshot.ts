import type { Screenshot, Annotation } from '../models/types';
import { MAX_SCREENSHOT_SIZE_BYTES } from '../utils/constants';

export async function captureScreenshot(): Promise<Screenshot> {
  const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
    format: 'png',
  });

  // Get dimensions from the image
  const { width, height } = await getImageDimensions(dataUrl);

  return {
    originalDataUrl: dataUrl,
    annotatedDataUrl: null,
    width,
    height,
    annotations: [],
  };
}

export async function compressScreenshot(
  screenshot: Screenshot,
  maxSize: number = MAX_SCREENSHOT_SIZE_BYTES,
): Promise<Screenshot> {
  const dataUrl = screenshot.annotatedDataUrl ?? screenshot.originalDataUrl;
  const size = estimateDataUrlSize(dataUrl);

  if (size <= maxSize) {
    return screenshot;
  }

  // Compress by converting to JPEG with reducing quality
  let quality = 0.9;
  let compressed = dataUrl;

  while (estimateDataUrlSize(compressed) > maxSize && quality > 0.1) {
    compressed = await reencodeImage(dataUrl, 'image/jpeg', quality);
    quality -= 0.1;
  }

  return {
    ...screenshot,
    annotatedDataUrl: compressed,
  };
}

export function addAnnotation(
  screenshot: Screenshot,
  annotation: Annotation,
): Screenshot {
  return {
    ...screenshot,
    annotations: [...screenshot.annotations, annotation],
  };
}

export function removeLastAnnotation(screenshot: Screenshot): Screenshot {
  return {
    ...screenshot,
    annotations: screenshot.annotations.slice(0, -1),
  };
}

export function resetAnnotations(screenshot: Screenshot): Screenshot {
  return {
    ...screenshot,
    annotations: [],
    annotatedDataUrl: null,
  };
}

export async function renderAnnotations(
  screenshot: Screenshot,
): Promise<Screenshot> {
  if (screenshot.annotations.length === 0) {
    return { ...screenshot, annotatedDataUrl: null };
  }

  const canvas = new OffscreenCanvas(screenshot.width, screenshot.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw original image
  const img = await createImageBitmap(
    await (await fetch(screenshot.originalDataUrl)).blob(),
  );
  ctx.drawImage(img, 0, 0);

  // Draw annotations
  for (const ann of screenshot.annotations) {
    if (ann.type === 'highlight') {
      ctx.fillStyle = ann.color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
    } else if (ann.type === 'redact') {
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 1.0;
      ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
    }
  }

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const annotatedDataUrl = await blobToDataUrl(blob);

  return {
    ...screenshot,
    annotatedDataUrl,
  };
}

export function exportAnnotatedScreenshot(screenshot: Screenshot): string {
  return screenshot.annotatedDataUrl ?? screenshot.originalDataUrl;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] ?? 'image/png';
  const data = atob(parts[1] ?? '');
  const array = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    array[i] = data.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

// Internal helpers

function estimateDataUrlSize(dataUrl: string): number {
  // Base64 data URL: the actual binary size is ~75% of the base64 string length
  const base64Part = dataUrl.split(',')[1] ?? '';
  return Math.ceil(base64Part.length * 0.75);
}

async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function reencodeImage(
  dataUrl: string,
  mimeType: string,
  quality: number,
): Promise<string> {
  const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(img, 0, 0);
  const blob = await canvas.convertToBlob({ type: mimeType, quality });
  return blobToDataUrl(blob);
}
