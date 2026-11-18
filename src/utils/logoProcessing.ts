export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  hasContent: boolean;
}

export interface SafeTrimBox {
  x: number;
  y: number;
  width: number;
  height: number;
  isTrimmed: boolean;
}

export interface ScaledDimensions {
  width: number;
  height: number;
}

/**
 * Pure helper: scale source dimensions down so height <= maxHeight while preserving aspect ratio.
 * Never upscales smaller images and always returns positive integers >= 1.
 */
export function computeScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxHeight: number = 140
): ScaledDimensions {
  const safeW = Math.max(1, Math.round(srcWidth || 1));
  const safeH = Math.max(1, Math.round(srcHeight || 1));
  const limitH = Math.max(1, Math.round(maxHeight || 140));

  if (safeH <= limitH) {
    return { width: safeW, height: safeH };
  }

  const ratio = limitH / safeH;
  return {
    width: Math.max(1, Math.round(safeW * ratio)),
    height: limitH,
  };
}

/**
 * Pure helper: validate auto-trim bounding box so output canvas is NEVER 0x0 (which yields `data:,`).
 * If trimWidth <= 0 or trimHeight <= 0, falls back to the full source canvas bounds.
 */
export function computeSafeTrimBox(
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number
): SafeTrimBox {
  const safeCanvasW = Math.max(1, Math.round(canvasWidth || 1));
  const safeCanvasH = Math.max(1, Math.round(canvasHeight || 1));

  if (!bbox.hasContent || bbox.width <= 0 || bbox.height <= 0) {
    return {
      x: 0,
      y: 0,
      width: safeCanvasW,
      height: safeCanvasH,
      isTrimmed: false,
    };
  }

  const x = Math.max(0, Math.min(bbox.minX, safeCanvasW - 1));
  const y = Math.max(0, Math.min(bbox.minY, safeCanvasH - 1));
  const width = Math.min(bbox.width, safeCanvasW - x);
  const height = Math.min(bbox.height, safeCanvasH - y);

  if (width <= 0 || height <= 0) {
    return {
      x: 0,
      y: 0,
      width: safeCanvasW,
      height: safeCanvasH,
      isTrimmed: false,
    };
  }

  return { x, y, width, height, isTrimmed: true };
}

/**
 * Pure function to process logo pixel buffer in-place:
 * 1. Detect if image contains colored/dark pixels (alpha > 25 and not pure white).
 * 2. For every pixel with alpha > 25:
 *    - If the image has colored/dark pixels AND the pixel is solid white
 *      (R > 240 && G > 240 && B > 240): punch out to alpha = 0 to preserve negative space
 *      (e.g. a white tooth inside a blue plus icon).
 *    - Otherwise: convert RGB to pure white (255, 255, 255) while preserving original alpha
 *      for crisp anti-aliased edges.
 * 3. Pixels with alpha <= 25 are cleared to alpha = 0 to remove invisible halo fringes.
 * 4. Computes the tight bounding box around remaining visible pixels.
 */
export function processLogoPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  whiteThreshold: number = 240,
  alphaThreshold: number = 25
): BoundingBox {
  const totalPixels = width * height;
  let coloredOrDarkCount = 0;

  // Pass 1: detect if image has colored / dark pixels (non-white with alpha > alphaThreshold)
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a > alphaThreshold) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r <= whiteThreshold || g <= whiteThreshold || b <= whiteThreshold) {
        coloredOrDarkCount++;
      }
    }
  }

  const hasColoredOrDark = coloredOrDarkCount > 0;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  // Pass 2: process pixels & compute tight bounding box
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];

      if (a <= alphaThreshold) {
        data[idx + 3] = 0;
        continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isSolidWhite = r > whiteThreshold && g > whiteThreshold && b > whiteThreshold;

      if (hasColoredOrDark && isSolidWhite) {
        // Negative space cutout: punch out solid white details inside colored emblems
        data[idx + 3] = 0;
        continue;
      }

      // Turn all remaining visible pixels pure white (#FFFFFF), retaining anti-aliased alpha
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const hasContent = maxX >= minX && maxY >= minY;
  return {
    minX: hasContent ? minX : 0,
    minY: hasContent ? minY : 0,
    maxX: hasContent ? maxX : width - 1,
    maxY: hasContent ? maxY : height - 1,
    width: hasContent ? maxX - minX + 1 : 0,
    height: hasContent ? maxY - minY + 1 : 0,
    hasContent,
  };
}

export interface ProcessedLogoResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeKB: number;
}

/**
 * Reads a File into a DataURL safely using FileReader.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error(`Không thể đọc dữ liệu file: ${file.name}`));
      }
    };
    reader.onerror = () => {
      reject(new Error(`Lỗi đọc file ảnh: ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Loads a DataURL into an HTMLImageElement safely.
 */
function loadImageFromDataUrl(src: string, fileName: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không thể giải mã hình ảnh: ${fileName}`));
    img.src = src;
  });
}

/**
 * Safely serialize canvas to WebP (quality 0.92), falling back to PNG if WebP is unsupported
 * or produces an invalid/empty `data:,` URI.
 */
function serializeCanvasSafely(canvas: HTMLCanvasElement): string {
  if (canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('Kích thước canvas đầu ra không hợp lệ (0x0)');
  }

  let dataUrl = '';
  try {
    dataUrl = canvas.toDataURL('image/webp', 0.92);
  } catch {
    dataUrl = '';
  }

  // Fallback to PNG if browser doesn't support WebP export or returned empty `data:,`
  if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/webp')) {
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch {
      dataUrl = '';
    }
  }

  if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/')) {
    throw new Error('Không thể xuất chuỗi dữ liệu ảnh từ Canvas');
  }

  return dataUrl;
}

/**
 * Browser-side canvas pipeline (Zero-R2 inline WebP DataURL):
 * 1. Reads file via FileReader (`readAsDataURL`) -> loads into `new Image()`.
 * 2. Scales down to maxHeight = 140px on processing `<canvas>` to keep size lightweight (3–8KB).
 * 3. Runs `processLogoPixels`: punches out solid white inside colored logos & turns logo pure white.
 * 4. Auto-trims whitespace safely (never creates 0x0 canvas; preserves original canvas if trim is empty).
 * 5. Exports directly as `image/webp` (0.92) DataURL (fallback `image/png`) for instant 100% render.
 */
export async function convertLogoToWhiteWebP(
  file: File,
  padding: number = 4,
  maxHeight: number = 140
): Promise<ProcessedLogoResult> {
  if (typeof window === 'undefined' || !window.document) {
    throw new Error('convertLogoToWhiteWebP must be executed in a browser environment');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageFromDataUrl(rawDataUrl, file.name);

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  if (!naturalWidth || !naturalHeight) {
    throw new Error(`Kích thước ảnh logo không hợp lệ: ${file.name}`);
  }

  // Step 1: Draw onto scaled processing canvas (max height 140px)
  const scaled = computeScaledDimensions(naturalWidth, naturalHeight, maxHeight);
  const processCanvas = document.createElement('canvas');
  processCanvas.width = scaled.width;
  processCanvas.height = scaled.height;

  const ctx = processCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Không thể khởi tạo Canvas 2D context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, scaled.width, scaled.height);
  ctx.drawImage(img, 0, 0, scaled.width, scaled.height);

  // Step 2: Pixel transformation (negative space punchout + pure white recolor)
  const imageData = ctx.getImageData(0, 0, scaled.width, scaled.height);
  const bbox = processLogoPixels(imageData.data, scaled.width, scaled.height, 240, 25);
  ctx.putImageData(imageData, 0, 0);

  // Step 3: Safe Auto-Trim (never 0x0; falls back to full processing canvas if trim is invalid)
  const trimBox = computeSafeTrimBox(bbox, scaled.width, scaled.height);
  const safePadding = trimBox.isTrimmed ? Math.max(0, Math.round(padding)) : 0;
  const finalW = Math.max(1, trimBox.width + safePadding * 2);
  const finalH = Math.max(1, trimBox.height + safePadding * 2);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = finalW;
  outputCanvas.height = finalH;

  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) {
    throw new Error('Không thể khởi tạo Canvas đầu ra');
  }

  outputCtx.clearRect(0, 0, finalW, finalH);
  outputCtx.drawImage(
    processCanvas,
    trimBox.x,
    trimBox.y,
    trimBox.width,
    trimBox.height,
    safePadding,
    safePadding,
    trimBox.width,
    trimBox.height
  );

  // Step 4: Export directly to lightweight inline WebP DataURL (fallback PNG)
  const dataUrl = serializeCanvasSafely(outputCanvas);
  const approxBytes = Math.round((dataUrl.length * 3) / 4);
  const sizeKB = Math.max(0.1, Number((approxBytes / 1024).toFixed(1)));

  return {
    dataUrl,
    width: finalW,
    height: finalH,
    sizeKB,
  };
}
